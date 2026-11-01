# sci-identity

Đăng nhập, cây đơn vị có cấp, người dùng (kiêm nhiệm), vai trò và phân quyền có phạm vi, nhập người dùng từ Excel.
Viết một lần, dùng lại cho mọi web SCI (Next.js 14 + PostgreSQL/PGlite). SCI công việc là web đầu tiên dùng gói này.

## Có gì

| File | Nội dung | Chạy ở |
|---|---|---|
| `src/quyen.ts` | `coQuyen`, `donViVaCapDuoi`, `phamViRongHon`, `phamViTiep`, `duocQuanLyNguoi`, `duocTraoVaiTro`, `laQuanTriToanBo` | mọi nơi (thuần) |
| `src/chu.ts` | `boDau`, `taoMaTuTen`, `chuanHoaEmail`, `laEmail` | mọi nơi |
| `src/don-vi.ts` | `layCayDonVi`, `layDonVi`, `dungCay`, `taoVong`, `themDonVi`, `suaDonVi`, `ngungDonVi`, `LOAI_DON_VI` | server (trừ `dungCay`, `taoVong`) |
| `src/nguoi-dung.ts` | `danhSachNguoiDung`, `layNguoiDungQuanTri`, `themNguoiDung`, `suaNguoiDung`, `khoaNguoiDung`, `ganVaiTro`, `datKiemNhiem`, `datLaiMatKhau`, `doiMatKhau`, `xacThuc`, `taoMatKhauTam` | server |
| `src/vai-tro.ts` | `danhSachVaiTro`, `layVaiTro`, `taoVaiTro`, `suaVaiTro`, `datQuyenVaiTro`, `xoaVaiTro` | server |
| `src/nhap-excel.ts` | `docFileExcel`, `kiemTraNhap` (xem trước, lỗi từng dòng), `nhapNguoiDungExcel`, `taoFileExcelMau` | server (thư viện `xlsx`) |
| `src/phien.ts` | `napNguoiDungPhien` — người dùng đã tính quyền | server |
| `src/token.ts` | `kyToken`, `kiemToken` — cookie phiên `sci_session` (HMAC-SHA256) | server + middleware (edge) |
| `src/mat-khau.ts` | `bamMatKhau`, `dungMatKhau`, `taoSalt` (scrypt) | server |
| `src/moi-truong.ts` | `NguCanh` (ai thao tác, ghi lịch sử ở đâu, báo quản trị thế nào), `LoiIdentity` | mọi nơi |
| `sql/identity.sql` | Lược đồ schema `identity` (idempotent) | CSDL |

Điểm vào:
- `@sci/identity` — chỉ phần thuần (dùng được trong component client).
- `@sci/identity/server` — tất cả (đụng CSDL, mật khẩu, Excel).

## Khái niệm

- **Đơn vị** có `cap` (0 = trên Ban TGĐ, 1 = Ban TGĐ, 2 = phòng, 3 = đơn vị, 9 = bên ngoài; số nhỏ là cấp cao) và `cha_id`
  tạo thành cây. Thêm, sửa, ngừng đơn vị là dữ liệu — không sửa code. Ngừng (không xóa) bị chặn khi còn đơn vị con hoặc người.
- **Người dùng**: `id` = email chữ thường. `don_vi_id = null` là người mới chưa gán đơn vị (đăng nhập được, quyền tối thiểu).
  Kiêm nhiệm: thuộc thêm đơn vị khác, quyền theo đơn vị áp dụng cho cả hai nơi. `cap_chuc_vu` (nếu có) ưu tiên hơn cấp đơn vị.
- **Vai trò** bật từng quyền với **phạm vi**: `cua_minh` ⊂ `don_vi` ⊂ `don_vi_va_cap_duoi` ⊂ `toan_bo`.
  Người có nhiều vai trò lấy phạm vi rộng nhất. Cờ `la_quan_tri` = mọi quyền. Vai trò hệ thống (`he_thong`) không xóa được.
- **Danh mục quyền** là của từng web (`DANH_MUC_QUYEN` trong `@/lib/types`). Quyền quản trị gói dùng: `nguoi_dung.quan_ly`.

```ts
coQuyen(nd, "tai_lieu.xoa", { chu_so_huu: tl.nguoi_tao, don_vi_id: thuMuc.don_vi_id }, cayDonVi);
// cua_minh: chỉ khi chu_so_huu là mình · don_vi: đơn vị thuộc nd.don_vi_ids
// don_vi_va_cap_duoi: đơn vị là con cháu của đơn vị mình (cần truyền cây) · toan_bo: mọi đối tượng
```

## Dùng cho một web trống — 6 bước

Thử nghiệm đúng các bước này: `tests/unit/identity-web-trong.test.ts`.

**1. Chép thư mục** `packages/sci-identity/` sang web mới, cài `xlsx` (nhập Excel) và `pg` hoặc `@electric-sql/pglite`.
Khai đường dẫn trong `tsconfig.json` (và `vitest.config.ts` nếu có test):

```json
"paths": {
  "@/*": ["./src/*"],
  "@sci/identity": ["./packages/sci-identity/src/index.ts"],
  "@sci/identity/*": ["./packages/sci-identity/src/*"]
}
```

**2. Hai file nhỏ web chủ phải có** (gói import kiểu từ đây):

```ts
// src/lib/db.ts — chỉ cần kiểu Q (một hàm query) và một cách lấy q
export interface Q { query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }> }

// src/lib/types.ts — kiểu dùng chung + danh mục quyền CỦA WEB NÀY
export type PhamVi = "cua_minh" | "don_vi" | "don_vi_va_cap_duoi" | "toan_bo";
export const DANH_MUC_QUYEN = { "nguoi_dung.quan_ly": "Quản lý người dùng", "hop_dong.xem": "Xem hợp đồng" } as const;
export type Quyen = keyof typeof DANH_MUC_QUYEN;
export interface DonVi { id: string; ten: string; ten_ngan: string; cap: number; cha_id: string | null;
  loai: "ban_tgd" | "phong" | "don_vi" | "rieng" | "ca_nhan" | "ben_ngoai"; mau_ma: string | null; thu_tu: number; active: boolean }
export interface NguoiDungPhien { id: string; email: string; ten: string; don_vi_id: string | null; don_vi_ids: string[];
  chuc_vu: string | null; cap: number; la_quan_tri: boolean; vai_tro: string[]; quyen: Partial<Record<Quyen, PhamVi>> }
```

(Chép nguyên từ `src/lib/types.ts` của SCI công việc cũng được.)

**3. Lược đồ**: lúc khởi động chạy `packages/sci-identity/sql/identity.sql` (chạy lại nhiều lần không sao), rồi gieo
đơn vị gốc, vai trò quản trị và một tài khoản quản trị:

```ts
import { themDonVi, taoVaiTro, themNguoiDung, type NguCanh } from "@sci/identity/server";
const ng: NguCanh = { nguoi: "he-thong" };
await themDonVi(q, ng, { id: "ban-tgd", ten: "Ban Tổng giám đốc", ten_ngan: "Ban TGĐ", cap: 1, loai: "ban_tgd" });
await taoVaiTro(q, ng, { id: "quan-tri", ten: "Quản trị viên", quyen: { "nguoi_dung.quan_ly": "toan_bo" } });
await themNguoiDung(q, ng, { email: "quantri@scigroup.vn", ten: "Quản trị viên", la_quan_tri: true, mat_khau: "…" });
```

**4. Đăng nhập** (`app/api/auth/login/route.ts`) và **middleware**:

```ts
import { xacThuc, kyToken } from "@sci/identity/server";
const kq = await xacThuc(q, email, matKhau);          // { ok, id, ten } | { ok:false, ly_do:'sai'|'bi_khoa' }
if (!kq.ok) return NextResponse.json({ loi: "Email hoặc mật khẩu không đúng" }, { status: 401 });
const res = NextResponse.json({ ok: true });
res.cookies.set("sci_session", await kyToken({ id: kq.id, ten: kq.ten }, process.env.AUTH_SECRET!), { httpOnly: true, sameSite: "lax", path: "/" });

// middleware.ts (edge): chỉ kiểm chữ ký
import { kiemToken } from "@sci/identity/token";
if (!(await kiemToken(req.cookies.get("sci_session")?.value, process.env.AUTH_SECRET!))) return NextResponse.redirect(new URL("/login", req.url));
```

**5. Người đang đăng nhập + kiểm quyền** trong mọi API:

```ts
import { cookies } from "next/headers";
import { kiemToken, napNguoiDungPhien, coQuyen, layCayDonVi } from "@sci/identity/server";
const p = await kiemToken(cookies().get("sci_session")?.value, process.env.AUTH_SECRET!);
const nd = p && (await napNguoiDungPhien(q, p.id, { cap_thap_nhat: 3 }));
if (!nd || !coQuyen(nd, "hop_dong.xem", { don_vi_id: hd.don_vi_id }, await layCayDonVi(q))) return 403;
```

**6. Trang quản trị**: gọi các hàm ghi với một `NguCanh` để có lịch sử và nhắc quản trị viên:

```ts
const ng: NguCanh = {
  nguoi: nd.id,
  ghiNhatKy: async (q, e) => { /* ghi vào bảng lịch sử của web: e.loai, e.id, e.thao_tac, e.chi_tiet (truoc/sau) */ },
  baoChuaGanDonVi: async (q, ds) => { /* báo quản trị viên: "có người chưa được gán đơn vị" */ },
};
await themNguoiDung(q, ng, { email, ten, don_vi_id, vai_tro: ["nhan-vien"] });   // trống mật khẩu → trả mật khẩu tạm
await suaNguoiDung(q, ng, id, { don_vi_id: "p-kt", kiem_nhiem: [{ don_vi_id: "p-tc" }] });
await datQuyenVaiTro(q, ng, "truong-phong", { "hop_dong.xem": "don_vi_va_cap_duoi", "nguoi_dung.quan_ly": null });
const xem = await kiemTraNhap(q, bufferExcel);                 // từng dòng: loi[], canh_bao[], hanh_dong
const kq = await nhapNguoiDungExcel(q, ng, bufferExcel, { vai_tro_mac_dinh: ["nhan-vien"] });
```

Hàm ghi **không tự kiểm quyền người thao tác** — web chủ kiểm trước bằng `duocQuanLyNguoi(nd, nguoiDich, cay)`
(theo phạm vi của `nguoi_dung.quan_ly`) và `duocTraoVaiTro(nd, quyenCuaVaiTro)` (không ai trao được quyền rộng hơn
quyền mình đang có). Lỗi nghiệp vụ ném `LoiIdentity` có `status` kiểu HTTP (400/404/409) và thông điệp tiếng Việt.
Nên chạy các thao tác nhiều bước trong một giao dịch.

## File Excel nhập người dùng

Trang tính đầu tiên; dòng tiêu đề là dòng đầu có cột **Email** (có thể có dòng tiêu đề phụ phía trên). Cột nhận
(không phân biệt dấu, hoa thường): **Họ tên**, **Email**, **Mã đơn vị hoặc tên đơn vị** (hoặc "Đơn vị": ghi mã, tên hay tên ngắn),
**Chức vụ**, **Vai trò** (mã hoặc tên, nhiều vai trò cách nhau dấu phẩy). Email đã có thì cập nhật (tùy chọn), dòng lỗi bỏ qua và
báo đúng số dòng. `taoFileExcelMau(donVi, vaiTro)` sinh file mẫu kèm trang "Danh mục" liệt kê mã đơn vị, mã vai trò.

## Trong SCI công việc

- Cầu nối lịch sử / thông báo / cấu hình: `src/lib/cau-hinh/cau-noi-identity.ts` (`nguCanh(nd)`, `dangNhap`, `xuLyIdentity`).
- API: `/api/auth/*`, `/api/toi`, `/api/quan-tri/{nguoi-dung,don-vi,vai-tro,nhap-excel}`. Trang: `/login`, `/quan-tri`.
- Test: `tests/unit/identity-*.test.ts`.
