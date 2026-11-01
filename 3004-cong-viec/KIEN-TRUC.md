# SCI công việc — Kiến trúc và hợp đồng giữa các module

Nguồn: kế hoạch v2 `docs/SCI-CongViec-KeHoach-v2.html` (24/09/2026). Khung chat lấy nguyên từ `../5-Agent-tien-do`.

## Công nghệ (đồng bộ các agent SCI)
Next.js 14.2.5 App Router · React 18.3.1 · Tailwind 3.4.7 · TypeScript 5.5 · Node 22.
CSDL: PostgreSQL (có `DATABASE_URL`) hoặc **PGlite** (Postgres nhúng, `data/pgdata`) khi chưa khai — cùng một SQL.
Kho file: `src/lib/luu-tru/kho.ts` (đĩa `data/files`, sau thay Garage S3 cùng giao diện). Cổng 3004, pm2 `scidocflow`.

## Ba lớp dữ liệu
| Lớp | Bảng | Xóa |
|---|---|---|
| Thư mục | `docflow.thu_muc`, `tai_lieu`, `phien_ban_tep`, `vi_tri` | Theo quyền, chỉ đánh dấu `vi_tri.da_xoa` (thùng rác) |
| Sổ cái | view `docflow.so_cai` trên `cong_viec` + `phan_viec` + `nguon_cong_viec` | Tự rời khi việc xong/đóng |
| Lịch sử | `docflow.lich_su` (trigger chặn UPDATE/DELETE, chuỗi băm) | Không ai xóa được |

Lược đồ: `db/01-nen.sql` (của nền — KHÔNG sửa). Module cần bảng thêm: tạo `db/<số>-<module>.sql` idempotent
(identity-cau-hinh = 10–19, thu-muc = 20–29, kiem-tra/gui = 30–39, so-cai = 40–49, ai = 50–59).

## Quy ước chung (BẮT BUỘC)
- Tên hàm/biến/file tiếng Việt không dấu kiểu camelCase/kebab như code agent tiến độ; chú thích tiếng Việt có dấu, ngắn.
- Server: `import { query, tx, layQ, type Q } from "@/lib/db"`. Thao tác nhiều bước chạy trong `tx(async (q) => …)`.
- Mọi hàm dịch vụ nhận `q: Q` đầu tiên (để gọi được trong giao dịch của module khác).
- **Mọi thao tác ghi lịch sử** qua `ghiLichSu(q, {...})` (`src/lib/lich-su/ghi.ts`), mã hành động trong `HANH_DONG_LICH_SU` (`src/lib/types.ts`). Lịch sử luôn ghi người thật; văn thư nhập thay người ngoài thì `thay_cho`.
- API route: `export const dynamic = "force-dynamic"`; bọc bằng `xuLy(async () => {...})`; lấy người dùng `await batBuocDangNhap()`; lỗi nghiệp vụ `throw new LoiHttp(403, "…")` (`src/lib/phien.ts`). Trả JSON; lỗi `{ loi: "…" }`.
- Quyền: `coQuyen(nd, "tai_lieu.xoa", { chu_so_huu, don_vi_id }, cayDonVi)` từ `@sci/identity`. Danh mục quyền: `DANH_MUC_QUYEN` (types.ts).
- Cấu hình: đọc `layCauHinh(q, "quy_tac_de")` (`src/lib/cau-hinh/doc.ts`); mặc định + kiểu trong `src/lib/cau-hinh/mac-dinh.ts`. **Không viết cứng** thứ có thể đổi.
- Mã: `taoMa("tl")`, bộ đếm `demTiep(q, "cong_viec:2026")` (`src/lib/ma.ts`). Thông báo: `taoThongBao`, `thongBaoDonVi` (`src/lib/thong-bao.ts`).
- Giao diện: tông tối, biến màu trong `src/app/globals.css` (lớp Tailwind `bg-bg`, `bg-surface`, `text-text`, `text-text-secondary`, `text-text-muted`, `border-border`, `text-accent`, `text-green/red/yellow/blue`). Icon `lucide-react@0.427`. Không thêm thư viện UI.
- Trang mới: thêm đúng một dòng vào `src/lib/dieu-huong.ts` nếu cần hiện trên thanh bên (các trang chính đã có sẵn).
- **Không sửa file của module khác.** Không sửa `package.json` (cần thư viện mới → ghi vào báo cáo cuối). Không sửa file nền (`db.ts`, `types.ts`, `db/01-nen.sql`, `lich-su/ghi.ts`, `phien.ts`, `khoi-tao.ts`) — cần đổi hợp đồng thì ghi vào báo cáo cuối, nền sẽ xử lý. Riêng `khoi-tao.ts` đã gọi sẵn `hatGiong` của thu-muc và kiem-tra.
- Test: vitest `tests/unit/<module>-*.test.ts`, dùng `csdlMoi()`/`nguoi(email)` trong `tests/helpers/csdl.ts` (CSDL RAM mới mỗi file). Chạy: `npx vitest run tests/unit/<module>` và `npx tsc --noEmit` (chỉ sửa lỗi trong file của mình).
- Không chạy `next build` vào `.next` (dùng `DIST_DIR=.next-kiem-<module> npx next build` nếu cần kiểm build). Không bật dev server cổng 3004 (dành cho nền); cần chạy thử thì dùng cổng riêng của module.

## Hợp đồng dịch vụ (chữ ký cố định — file đã có sẵn, chủ module thay thân hàm)
| File | Chủ | Hàm |
|---|---|---|
| `src/lib/thu-muc/dich-vu.ts` | thu-muc | `thuMucCuaDonVi` `taoTaiLieu` `themPhienBan` `datVaoThuMuc` `ganNhan` `xoaViTri` `khoiPhucViTri` `docPhienBan` |
| `src/lib/lich-su/doc.ts` | thu-muc | `lichSuDoiTuong` `timLichSu` |
| `src/lib/kiem-tra/doc-word.ts` | kiem-tra-gui | `docWord` |
| `src/lib/kiem-tra/kiem-tra.ts` | kiem-tra-gui | `kiemTraTaiLieu` `danhSachMau` `layMau` |
| `src/lib/gui/dich-vu.ts` | kiem-tra-gui | `gui` `nhan` `chuyenTiep` `traLai` `guiLai` `guiMoi` `hoanThanh` `cayHanhTrinh` |
| `src/lib/so-cai/quy-tac-de.ts` | so-cai | `soSanhNguon` (thuần) |
| `src/lib/so-cai/dich-vu.ts` | so-cai | `xemTruocVaoSoCai` `ghiVaoSoCai` `danhDauChoSua` `giaoViec` `ketThucPhanViec` `giaHan` `doiNguoi` `themPhanViec` `botPhanViec` `dongViec` `danhSachSoCai` `chiTietViec` `viecDaXong` `quetHan` |
| `src/lib/so-cai/dinh-dang-agent.ts` | so-cai | `dongChoAgent` (JSON cho agent, tên trường cố định) |
| `src/lib/cau-hinh/ghi.ts` | identity-cau-hinh | `kiemTraCauHinh` `ghiCauHinh` `quayLaiPhienBan` `xuatCauHinh` `nhapCauHinh` |
| `packages/sci-identity/src/*` | identity-cau-hinh | `coQuyen` `donViVaCapDuoi` `layCayDonVi` `layDonVi` `bamMatKhau`… |

Hàm chưa làm ném `Error("Chưa làm")`. Module gọi hàm của module khác cứ gọi đúng chữ ký; test của mình nếu phụ thuộc hàm chưa có thì ghi rõ trong báo cáo.

## Dữ liệu gieo (src/lib/khoi-tao.ts)
9 đơn vị: `ban-tgd`(cấp 1, Form 0) · `p-dtpc`(2, Form 1) · `p-ktvh`(2, Form 2) · `p-hcth`(2, Form 3) · `p-tckt`(2, Form 4) ·
`sci-pmc`(3, Form 5→P.ĐT&PC) · `sci-enc`(3, Form 6→P.ĐT&PC) · `bqlda-qt`(3, Form 7→P.ĐT&PC) · `nm-namxe`(3, Form 8→P.KT&VH).
Vai trò: `quan-tri` `lanh-dao` `truong-don-vi` `nhan-vien` `van-thu`. Người dùng mẫu (mật khẩu `Sci@2026`), vd
`hung.tv@scigroup.vn` (Trần Văn Hùng, P.KT&VH, nhân viên), `gd.bqlda@scigroup.vn`, `truong.dtpc@scigroup.vn`, `tgd@scigroup.vn`, `photgd@scigroup.vn`, `vanthu@scigroup.vn`, `quantri@scigroup.vn`, `nguoimoi@scigroup.vn` (chưa gán đơn vị).

## Trang và API theo module
| Module | Trang | API |
|---|---|---|
| identity-cau-hinh | `/login` `/quan-tri` (người dùng, đơn vị, vai trò và quyền, nhập Excel) `/cai-dat` `/` (tổng quan) `/thong-bao` | `/api/auth/*` `/api/quan-tri/*` `/api/cai-dat/*` `/api/thong-bao` `/api/toi` |
| ai | `/chat` `/ky-nang` `/quan-tri/khoa-agent` | `/api/ai/*` `/api/tro-ly/*` `/api/skill` `/api/mcp/socai` `/api/v1/*` `/api/quan-tri/khoa-agent` |
| thu-muc | `/thu-muc` `/lich-su` | `/api/thu-muc/*` `/api/tai-lieu/*` (tải lên, phiên bản, tải về, xem trước, xóa, khôi phục) `/api/lich-su/*` |
| kiem-tra-gui | `/soan-gui` `/tai-lieu/[id]` (hộp xử lý + cây hành trình) `/mau-word` `/van-thu` | `/api/kiem-tra` `/api/gui/*` `/api/mau-word/*` `/api/van-thu/*` |
| so-cai | `/so-cai` `/cong-viec/[id]` | `/api/so-cai/*` `/api/cong-viec/*` |

Thành phần dùng chéo (module chủ viết, module khác nhúng): `src/components/thu-muc/XemTruocTaiLieu.tsx` (thu-muc),
`src/components/thu-muc/DongThoiGian.tsx` (thu-muc, nhận `doi_tuong_loai` + `doi_tuong_id`),
`src/components/so-cai/QuyetDinhGiaoViec.tsx` (so-cai, nhúng ở `/tai-lieu/[id]` khi tài liệu là Form 0),
`src/components/so-cai/BangViecTaiLieu.tsx` (so-cai, liệt kê việc sinh từ một tài liệu).

## Báo cáo tuần do AI viết (30/09/2026 — thước: `0 Tài liệu thiết kế/demo-bao-cao-tuan-3004.html`)

| Phần | File | Việc |
|---|---|---|
| Bảng | `db/75-bao-cao-tuan.sql` | `do_kho_viec` (1·2·4·8·13, nguồn ai/nguoi) · `bao_cao_tuan` (id = thứ Hai) · `bao_cao_tuan_thao_tac` (giao/nhắc, bấm 1 lần) |
| Chấm độ khó | `src/lib/bao-cao-tuan/do-kho.ts` | Nền 2 phút/lượt 25 việc; BLĐ sửa tay thì thắng AI; chỉ BLĐ xem |
| Tính số | `src/lib/bao-cao-tuan/tinh.ts` | Hàm thuần — mọi con số (tải/người, vùng, nợ quá hạn, nộp báo cáo) |
| Viết chữ | `src/lib/bao-cao-tuan/viet.ts` | Prompt văn phong không khen chê; lưới code: liên kết, tên người, số lạ, ngày dd/mm/yyyy, dấu phẩy |
| Hẹn giờ | `src/lib/bao-cao-tuan/nen.ts` | 5 phút/lần: cấp 1 nộp hoặc 12:00 thứ Hai → viết; lỗi thử lại sau 30 phút |
| Giao diện | `src/components/phong/BaoCaoTuanPhong.tsx` | 4 tab bên trái, danh sách/chi tiết bên phải |

Mô hình: Cài đặt → Báo cáo tuần (AI). Dùng bí danh CLI (`fable`, `opus`) — mã đầy đủ `claude-*-5-5` lỗi trên CLI 2.1.220.
