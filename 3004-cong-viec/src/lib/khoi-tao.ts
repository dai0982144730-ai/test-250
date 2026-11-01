// ============================================================
// khoi-tao.ts — GIEO DỮ LIỆU MẶC ĐỊNH lúc mở CSDL (idempotent: chạy lại không nhân đôi).
// Thứ tự: đơn vị → vai trò/quyền → người dùng mẫu → (từng module) thư mục, mẫu Word...
// Module nào cần gieo thêm: viết hàm hatGiong(q) trong file hat-giong.ts của module và
// gọi ở cuối gieoDuLieu() — mỗi module MỘT dòng, không sửa phần của module khác.
// ============================================================

import type { Q } from "@/lib/db";
import { bamMatKhau, dungMatKhau, taoSalt } from "@sci/identity/mat-khau";
import type { PhamVi, Quyen } from "@/lib/types";
import { hatGiong as hatGiongThuMuc } from "@/lib/thu-muc/hat-giong";
import { hatGiong as hatGiongMau } from "@/lib/kiem-tra/hat-giong";
import { napChucNangMacDinh } from "@/lib/chuc-nang-don-vi";
import { goLuaChonAi } from "@/lib/so-cai/lanh-dao-phoi-hop";

/** 9 đơn vị theo bộ mẫu báo cáo anh Đại gửi 23/09/2026. */
export const DON_VI_MAC_DINH = [
  { id: "ban-tgd", ten: "Ban Tổng giám đốc", ten_ngan: "Ban TGĐ", cap: 1, cha_id: null, loai: "ban_tgd", mau_ma: "form-0", thu_tu: 0 },
  { id: "p-dtpc", ten: "Phòng Đầu tư và Pháp chế", ten_ngan: "P.ĐT&PC", cap: 2, cha_id: "ban-tgd", loai: "phong", mau_ma: "form-1", thu_tu: 1 },
  { id: "p-ktvh", ten: "Phòng Kinh tế và Vận hành", ten_ngan: "P.KT&VH", cap: 2, cha_id: "ban-tgd", loai: "phong", mau_ma: "form-2", thu_tu: 2 },
  { id: "p-hcth", ten: "Phòng Hành chính Tổng hợp", ten_ngan: "P.HCTH", cap: 2, cha_id: "ban-tgd", loai: "phong", mau_ma: "form-3", thu_tu: 3 },
  { id: "p-tckt", ten: "Phòng Tài chính Kế toán", ten_ngan: "P.TCKT", cap: 2, cha_id: "ban-tgd", loai: "phong", mau_ma: "form-4", thu_tu: 4 },
  // Phòng Cơ điện (thêm 26/09/2026, mẫu báo cáo tuần SCI-160 = Form 9)
  { id: "p-cd", ten: "Phòng Cơ điện", ten_ngan: "P.CĐ", cap: 2, cha_id: "ban-tgd", loai: "phong", mau_ma: "form-9", thu_tu: 4 },
  { id: "sci-pmc", ten: "SCI PMC", ten_ngan: "SCI PMC", cap: 3, cha_id: "p-dtpc", loai: "don_vi", mau_ma: "form-5", thu_tu: 5 },
  { id: "sci-enc", ten: "SCI E&C", ten_ngan: "SCI E&C", cap: 3, cha_id: "p-dtpc", loai: "don_vi", mau_ma: "form-6", thu_tu: 6 },
  { id: "bqlda-qt", ten: "BQLDA Quảng Trị", ten_ngan: "BQLDA QT", cap: 3, cha_id: "p-dtpc", loai: "don_vi", mau_ma: "form-7", thu_tu: 7 },
  // BQLDA Lào (thêm 27/09/2026 — Mr. Đại): ban quản lý cụm thủy điện tại Lào (Nam Khian 1, 2, 3 · Nam Neun hạ lưu · Nam Lan 1, 2),
  // cùng chỗ và cùng mẫu Form 7 với BQLDA Quảng Trị.
  { id: "bqlda-lao", ten: "BQLDA Lào", ten_ngan: "BQLDA Lào", cap: 3, cha_id: "p-dtpc", loai: "don_vi", mau_ma: "form-7", thu_tu: 7 },
  { id: "nm-namxe", ten: "Nhà máy thủy điện Nậm Xe", ten_ngan: "NM Nậm Xe", cap: 3, cha_id: "p-ktvh", loai: "don_vi", mau_ma: "form-8", thu_tu: 8 },
  // Các nhà máy khác của khối thủy điện / điện gió: cùng chỗ và cùng mẫu báo cáo (Form 8) với Nậm Xe
  { id: "nm-cannan1", ten: "Nhà máy thủy điện Ca Nan 1", ten_ngan: "NM Ca Nan 1", cap: 3, cha_id: "p-ktvh", loai: "don_vi", mau_ma: "form-8", thu_tu: 9 },
  { id: "nm-cannan2", ten: "Nhà máy thủy điện Ca Nan 2", ten_ngan: "NM Ca Nan 2", cap: 3, cha_id: "p-ktvh", loai: "don_vi", mau_ma: "form-8", thu_tu: 10 },
  { id: "nm-namlum1", ten: "Nhà máy thủy điện Nậm Lụm 1", ten_ngan: "NM Nậm Lụm 1", cap: 3, cha_id: "p-ktvh", loai: "don_vi", mau_ma: "form-8", thu_tu: 11 },
  { id: "nm-namlum2", ten: "Nhà máy thủy điện Nậm Lụm 2", ten_ngan: "NM Nậm Lụm 2", cap: 3, cha_id: "p-ktvh", loai: "don_vi", mau_ma: "form-8", thu_tu: 12 },
  { id: "nm-huonglinh7", ten: "Nhà máy điện gió Hướng Linh 7", ten_ngan: "NM Hướng Linh 7", cap: 3, cha_id: "p-ktvh", loai: "don_vi", mau_ma: "form-8", thu_tu: 13 },
  { id: "nm-huonglinh8", ten: "Nhà máy điện gió Hướng Linh 8", ten_ngan: "NM Hướng Linh 8", cap: 3, cha_id: "p-ktvh", loai: "don_vi", mau_ma: "form-8", thu_tu: 14 },
  // Cấp 4 (27/09/2026 — Mr. Đại): Ban điều hành của TỔNG THẦU THI CÔNG từng dự án SCI đầu tư, dưới BQLDA quản lý dự án đó.
  // Tổng thầu lập báo cáo (Form 10), không phải BQLDA; báo cáo gửi lên BQLDA theo luồng báo cáo.
  { id: "bdh-huongviet", ten: "Ban điều hành tổng thầu dự án Hướng Việt", ten_ngan: "BĐH Hướng Việt", cap: 4, cha_id: "bqlda-qt", loai: "don_vi", mau_ma: "form-10", thu_tu: 15 },
  { id: "bdh-tanthanh", ten: "Ban điều hành tổng thầu dự án Tân Thành", ten_ngan: "BĐH Tân Thành", cap: 4, cha_id: "bqlda-qt", loai: "don_vi", mau_ma: "form-10", thu_tu: 16 },
  { id: "bdh-batang1", ten: "Ban điều hành tổng thầu dự án Ba Tầng 1", ten_ngan: "BĐH Ba Tầng 1", cap: 4, cha_id: "bqlda-qt", loai: "don_vi", mau_ma: "form-10", thu_tu: 17 },
  { id: "bdh-namkhian1", ten: "Ban điều hành tổng thầu dự án Nam Khian 1", ten_ngan: "BĐH Nam Khian 1", cap: 4, cha_id: "bqlda-lao", loai: "don_vi", mau_ma: "form-10", thu_tu: 18 },
  { id: "bdh-namkhian2", ten: "Ban điều hành tổng thầu dự án Nam Khian 2", ten_ngan: "BĐH Nam Khian 2", cap: 4, cha_id: "bqlda-lao", loai: "don_vi", mau_ma: "form-10", thu_tu: 19 },
  { id: "bdh-namkhian3", ten: "Ban điều hành tổng thầu dự án Nam Khian 3", ten_ngan: "BĐH Nam Khian 3", cap: 4, cha_id: "bqlda-lao", loai: "don_vi", mau_ma: "form-10", thu_tu: 20 },
  { id: "bdh-namneun", ten: "Ban điều hành tổng thầu dự án Nam Neun hạ lưu", ten_ngan: "BĐH Nam Neun hạ lưu", cap: 4, cha_id: "bqlda-lao", loai: "don_vi", mau_ma: "form-10", thu_tu: 21 },
  { id: "bdh-namlan1", ten: "Ban điều hành tổng thầu dự án Nam Lan 1", ten_ngan: "BĐH Nam Lan 1", cap: 4, cha_id: "bqlda-lao", loai: "don_vi", mau_ma: "form-10", thu_tu: 22 },
  { id: "bdh-namlan2", ten: "Ban điều hành tổng thầu dự án Nam Lan 2", ten_ngan: "BĐH Nam Lan 2", cap: 4, cha_id: "bqlda-lao", loai: "don_vi", mau_ma: "form-10", thu_tu: 23 },
] as const;

const TAT_CA: Quyen[] = [
  "tai_lieu.xem", "tai_lieu.tai_len", "tai_lieu.xoa", "tai_lieu.khoi_phuc", "tai_lieu.gui", "tai_lieu.kiem_soat",
  "van_thu.nhap_den", "cong_viec.giao", "cong_viec.sua", "cong_viec.sua_viec", "cong_viec.tag_ten", "so_cai.xem", "wbs.duyet", "lich_su.xem", "mau.quan_ly", "ky_nang.them_chung",
  "agent.cap_khoa", "nguoi_dung.quan_ly", "cau_hinh.sua",
];

/** Vai trò cài sẵn. Tải thẳng lên thư mục (tai_lieu.tai_len) KHÔNG cấp sẵn — quản trị cấp riêng cho ai cần. Quyền xóa mặc định (đề xuất trong kế hoạch): người tải lên, trưởng đơn vị của thư mục, quản trị viên. */
export const VAI_TRO_MAC_DINH: { id: string; ten: string; mo_ta: string; quyen: [Quyen, PhamVi][] }[] = [
  { id: "quan-tri", ten: "Quản trị viên", mo_ta: "Toàn quyền hệ thống", quyen: TAT_CA.map((q) => [q, "toan_bo"]) },
  {
    id: "lanh-dao",
    ten: "Lãnh đạo (TGĐ, Phó TGĐ)",
    mo_ta: "Xem toàn bộ, kiểm soát và giao việc mọi đơn vị",
    quyen: [
      ["tai_lieu.xem", "toan_bo"], ["tai_lieu.xoa", "cua_minh"], ["tai_lieu.khoi_phuc", "cua_minh"],
      ["tai_lieu.gui", "toan_bo"], ["tai_lieu.kiem_soat", "toan_bo"], ["cong_viec.giao", "toan_bo"], ["cong_viec.sua", "toan_bo"], ["cong_viec.sua_viec", "toan_bo"], ["cong_viec.tag_ten", "toan_bo"],
      ["so_cai.xem", "toan_bo"], ["wbs.duyet", "toan_bo"], ["lich_su.xem", "toan_bo"],
    ],
  },
  {
    id: "truong-don-vi",
    ten: "Trưởng phòng / GĐ đơn vị",
    mo_ta: "Kiểm soát báo cáo, xóa trong thư mục đơn vị mình",
    quyen: [
      ["tai_lieu.xem", "toan_bo"], ["tai_lieu.xoa", "don_vi"], ["tai_lieu.khoi_phuc", "don_vi"],
      ["tai_lieu.gui", "don_vi"], ["tai_lieu.kiem_soat", "don_vi_va_cap_duoi"], ["cong_viec.giao", "don_vi_va_cap_duoi"], ["cong_viec.sua", "cua_minh"], ["cong_viec.sua_viec", "cua_minh"], ["cong_viec.tag_ten", "toan_bo"],
      ["so_cai.xem", "toan_bo"], ["wbs.duyet", "don_vi_va_cap_duoi"], ["lich_su.xem", "don_vi_va_cap_duoi"],
    ],
  },
  {
    id: "nhan-vien",
    ten: "Nhân viên",
    mo_ta: "Soạn và gửi; chỉ xóa file mình tải lên",
    quyen: [
      ["tai_lieu.xem", "toan_bo"], ["tai_lieu.xoa", "cua_minh"], ["tai_lieu.khoi_phuc", "cua_minh"],
      ["tai_lieu.gui", "don_vi"], ["cong_viec.sua", "cua_minh"], ["cong_viec.sua_viec", "cua_minh"], ["cong_viec.tag_ten", "don_vi_va_cap_duoi"], ["so_cai.xem", "toan_bo"], ["lich_su.xem", "cua_minh"],
    ],
  },
  {
    id: "van-thu",
    ten: "Văn thư",
    mo_ta: "Vào sổ văn bản đến thay người ngoài công ty",
    quyen: [["van_thu.nhap_den", "toan_bo"], ["tai_lieu.gui", "toan_bo"], ["tai_lieu.tai_len", "toan_bo"], ["cong_viec.tag_ten", "toan_bo"]],
  },
  {
    id: "tai-len-thu-muc",
    ten: "Tải thẳng lên thư mục",
    mo_ta: "Gắn thêm cho người được phép tải tài liệu vào thư mục đơn vị mình mà không qua Soạn và gửi",
    quyen: [["tai_lieu.tai_len", "don_vi"]],
  },
];

/**
 * Mật khẩu chung CŨ của giai đoạn chạy thử. Từ 02/10/2026 (Mr. Đại chốt K13) mật khẩu lần đầu = chính email (matKhauDau) —
 * hằng này chỉ còn để nhận ra tài khoản chưa đổi mật khẩu và chuyển sang email (doiMatKhauMauSangEmail). Cấm hiện ra ngoài.
 */
export const MAT_KHAU_MAU = "Sci@2026";

/** Quyền thêm sau lần gieo vai trò đầu tiên — gieo một lần cho CSDL đang chạy (xem gieoIdentity). */
const QUYEN_THEM_SAU: Quyen[] = ["cong_viec.sua", "cong_viec.sua_viec", "cong_viec.tag_ten", "wbs.duyet"];

/** Người dùng mẫu để chạy thử (dữ liệu minh họa — thay bằng danh sách thật nhập từ Excel). */
export const NGUOI_DUNG_MAU: { email: string; ten: string; don_vi_id: string | null; chuc_vu: string; vai_tro: string[]; cap_chuc_vu?: number; la_quan_tri?: boolean }[] = [
  { email: "quantri@scigroup.vn", ten: "Quản trị viên", don_vi_id: "p-hcth", chuc_vu: "Quản trị hệ thống", vai_tro: ["quan-tri"], la_quan_tri: true },
  { email: "tgd@scigroup.vn", ten: "Tổng Giám đốc", don_vi_id: "ban-tgd", chuc_vu: "Tổng Giám đốc", vai_tro: ["lanh-dao"] },
  { email: "photgd@scigroup.vn", ten: "Phó TGĐ phụ trách", don_vi_id: "ban-tgd", chuc_vu: "Phó Tổng Giám đốc", vai_tro: ["lanh-dao"] },
  { email: "truong.dtpc@scigroup.vn", ten: "Lê Minh Tuấn", don_vi_id: "p-dtpc", chuc_vu: "Trưởng phòng", vai_tro: ["truong-don-vi"] },
  { email: "nv.dtpc@scigroup.vn", ten: "Phạm Thu Hà", don_vi_id: "p-dtpc", chuc_vu: "Nhân viên", vai_tro: ["nhan-vien"] },
  { email: "truong.ktvh@scigroup.vn", ten: "Đỗ Quang Vinh", don_vi_id: "p-ktvh", chuc_vu: "Trưởng phòng", vai_tro: ["truong-don-vi"] },
  { email: "hung.tv@scigroup.vn", ten: "Trần Văn Hùng", don_vi_id: "p-ktvh", chuc_vu: "Nhân viên", vai_tro: ["nhan-vien"] },
  { email: "truong.hcth@scigroup.vn", ten: "Nguyễn Thị Lan", don_vi_id: "p-hcth", chuc_vu: "Trưởng phòng", vai_tro: ["truong-don-vi"] },
  { email: "vanthu@scigroup.vn", ten: "Hoàng Thị Mai", don_vi_id: "p-hcth", chuc_vu: "Văn thư", vai_tro: ["nhan-vien", "van-thu"] },
  { email: "truong.tckt@scigroup.vn", ten: "Vũ Đức Anh", don_vi_id: "p-tckt", chuc_vu: "Kế toán trưởng", vai_tro: ["truong-don-vi"] },
  { email: "truong.cd@scigroup.vn", ten: "Bùi Quế Lâm", don_vi_id: "p-cd", chuc_vu: "Trưởng phòng", vai_tro: ["truong-don-vi"] },
  { email: "nv.cd@scigroup.vn", ten: "Nhân viên Phòng Cơ điện", don_vi_id: "p-cd", chuc_vu: "Nhân viên", vai_tro: ["nhan-vien"] },
  { email: "gd.pmc@scigroup.vn", ten: "Ngô Văn Bình", don_vi_id: "sci-pmc", chuc_vu: "Giám đốc", vai_tro: ["truong-don-vi"] },
  { email: "gd.enc@scigroup.vn", ten: "Bùi Văn Cường", don_vi_id: "sci-enc", chuc_vu: "Giám đốc", vai_tro: ["truong-don-vi"] },
  { email: "nv.enc@scigroup.vn", ten: "Đặng Thị Hoa", don_vi_id: "sci-enc", chuc_vu: "Nhân viên", vai_tro: ["nhan-vien"] },
  { email: "gd.bqlda@scigroup.vn", ten: "Trịnh Văn Dũng", don_vi_id: "bqlda-qt", chuc_vu: "Giám đốc BQLDA", vai_tro: ["truong-don-vi"] },
  { email: "nv.bqlda@scigroup.vn", ten: "Lý Thị Nga", don_vi_id: "bqlda-qt", chuc_vu: "Nhân viên", vai_tro: ["nhan-vien"] },
  { email: "gd.namxe@scigroup.vn", ten: "Mai Văn Sơn", don_vi_id: "nm-namxe", chuc_vu: "Giám đốc nhà máy", vai_tro: ["truong-don-vi"] },
  { email: "nguoimoi@scigroup.vn", ten: "Người mới (chưa gán đơn vị)", don_vi_id: null, chuc_vu: "Nhân viên", vai_tro: ["nhan-vien"] },
];

async function gieoIdentity(q: Q): Promise<void> {
  for (const d of DON_VI_MAC_DINH) {
    await q.query(
      `INSERT INTO identity.don_vi (id, ten, ten_ngan, cap, cha_id, loai, mau_ma, thu_tu)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
      [d.id, d.ten, d.ten_ngan, d.cap, d.cha_id, d.loai, d.mau_ma, d.thu_tu],
    );
    // Đơn vị ngoài SCI (db/85, Mr. Đại chốt 09/10): SCI PMC, SCI E&C (công ty SCI có cổ phần) + ban điều hành tổng thầu (Form 10).
    // Chỉ điền ô CHƯA KHAI — quản trị đã sửa ở Cài đặt thì giữ.
    await q.query("UPDATE identity.don_vi SET ngoai_sci = $2 WHERE id = $1 AND ngoai_sci IS NULL", [
      d.id,
      d.id === "sci-pmc" || d.id === "sci-enc" || d.mau_ma === "form-10",
    ]);
  }
  for (const v of VAI_TRO_MAC_DINH) {
    const { rows } = await q.query(
      `INSERT INTO identity.vai_tro (id, ten, mo_ta, he_thong) VALUES ($1,$2,$3,true)
       ON CONFLICT (id) DO NOTHING RETURNING id`,
      [v.id, v.ten, v.mo_ta],
    );
    // Chỉ gieo quyền khi vai trò mới tạo — quản trị viên đã chỉnh thì không ghi đè
    if (rows.length > 0) {
      for (const [quyen, pv] of v.quyen) {
        await q.query(
          `INSERT INTO identity.quyen_vai_tro (vai_tro_id, quyen, pham_vi) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
          [v.id, quyen, pv],
        );
      }
    }
  }
  // Quyền thêm SAU khi vai trò đã gieo (vd cong_viec.sua 29/09/2026): gieo MỘT lần cho vai trò hệ thống đang có — ghi dấu
  // để quản trị bỏ/đổi trong ma trận quyền thì lần khởi động sau không gieo lại.
  for (const quyen of QUYEN_THEM_SAU) {
    const khoa = `quyen_them_sau:${quyen}`;
    const da = await q.query("SELECT 1 FROM docflow.luat_danh_dau WHERE khoa = $1", [khoa]);
    if (da.rows.length) continue;
    for (const v of VAI_TRO_MAC_DINH) {
      const pv = v.quyen.find(([x]) => x === quyen)?.[1];
      if (!pv) continue;
      await q.query(
        `INSERT INTO identity.quyen_vai_tro (vai_tro_id, quyen, pham_vi)
         SELECT $1, $2, $3 WHERE EXISTS (SELECT 1 FROM identity.vai_tro WHERE id = $1) ON CONFLICT DO NOTHING`,
        [v.id, quyen, pv],
      );
    }
    await q.query(
      `INSERT INTO docflow.luat_danh_dau (khoa, gia_tri, luc) VALUES ($1, 'true'::jsonb, now()) ON CONFLICT (khoa) DO NOTHING`,
      [khoa],
    );
  }
  const { rows: coNguoi } = await q.query<{ n: number }>("SELECT count(*)::int AS n FROM identity.nguoi_dung");
  if (coNguoi[0].n === 0 && process.env.DOCFLOW_KHONG_GIEO_NGUOI_MAU !== "1") {
    for (const u of NGUOI_DUNG_MAU) {
      const salt = taoSalt();
      await q.query(
        `INSERT INTO identity.nguoi_dung (id, email, ten, mat_khau_hash, salt, don_vi_id, chuc_vu, cap_chuc_vu, la_quan_tri)
         VALUES ($1,$1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
        [u.email, u.ten, bamMatKhau(salt, matKhauDau(u.email)), salt, u.don_vi_id, u.chuc_vu, u.cap_chuc_vu ?? null, u.la_quan_tri ?? false],
      );
      for (const vt of u.vai_tro) {
        await q.query(`INSERT INTO identity.gan_vai_tro (nguoi_dung_id, vai_tro_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [u.email, vt]);
      }
    }
    // CSDL mới gieo đã dùng mật khẩu = email → khỏi dò chuyển đổi (đỡ ~20 lần băm mỗi CSDL thử)
    await q.query(`INSERT INTO docflow.luat_danh_dau (khoa, gia_tri, luc) VALUES ('mat_khau_dau_la_email', '{"so_tai_khoan":0}'::jsonb, now()) ON CONFLICT (khoa) DO NOTHING`);
  }
}

/** Mật khẩu lần đầu = chính email (Mr. Đại chốt K13 02/10/2026) — trùng với matKhauDau của @sci/identity. */
export const matKhauDau = (email: string) => email.trim().toLowerCase();

/**
 * Chuyển MỘT LẦN mọi tài khoản còn mật khẩu chung cũ sang mật khẩu = email của họ (đo 02/10: 37/37 tài khoản chưa ai đổi).
 * Tài khoản đã tự đổi mật khẩu giữ nguyên. Đánh dấu ở luat_danh_dau để không chạy lại.
 */
async function doiMatKhauMauSangEmail(q: Q): Promise<void> {
  const khoa = "mat_khau_dau_la_email";
  if ((await q.query("SELECT 1 FROM docflow.luat_danh_dau WHERE khoa = $1", [khoa])).rows.length) return;
  const { rows } = await q.query<{ id: string; email: string; salt: string; mat_khau_hash: string }>("SELECT id, email, salt, mat_khau_hash FROM identity.nguoi_dung");
  let n = 0;
  for (const r of rows) {
    if (!dungMatKhau(r.salt, r.mat_khau_hash, MAT_KHAU_MAU)) continue;
    const salt = taoSalt();
    await q.query("UPDATE identity.nguoi_dung SET mat_khau_hash = $2, salt = $3 WHERE id = $1", [r.id, bamMatKhau(salt, matKhauDau(r.email)), salt]);
    n++;
  }
  await q.query("INSERT INTO docflow.luat_danh_dau (khoa, gia_tri, luc) VALUES ($1, $2::jsonb, now()) ON CONFLICT (khoa) DO NOTHING", [khoa, JSON.stringify({ so_tai_khoan: n })]);
}

/**
 * GẮN WBS (Mr. Đại chốt 03/10/2026): dự án Hướng Việt là cây WBS thật duy nhất bên agent Tiến độ. Danh mục dự án đã lưu trong
 * CSDL (sửa ở Cài đặt) thì mặc định mới không tự vào — điền "Mã bên Tiến độ" cho da-hv MỘT lần nếu đang trống, ghi dấu để
 * quản trị xoá đi thì lần khởi động sau không điền lại.
 */
async function ganMaTienDoHuongViet(q: Q): Promise<void> {
  const khoa = "ma_tien_do_da_hv";
  if ((await q.query("SELECT 1 FROM docflow.luat_danh_dau WHERE khoa = $1", [khoa])).rows.length) return;
  const { rows } = await q.query<{ gia_tri: { id: string; ma_tien_do?: string | null }[] }>("SELECT gia_tri FROM docflow.cau_hinh WHERE khoa = 'du_an'");
  let doi = false;
  if (rows[0] && Array.isArray(rows[0].gia_tri)) {
    const ds = rows[0].gia_tri.map((d) => (d.id === "da-hv" && !d.ma_tien_do ? ((doi = true), { ...d, ma_tien_do: "dien-gio-huong-viet-hv-du-lieu" }) : d));
    if (doi) await q.query("UPDATE docflow.cau_hinh SET gia_tri = $1::jsonb WHERE khoa = 'du_an'", [JSON.stringify(ds)]);
  }
  await q.query("INSERT INTO docflow.luat_danh_dau (khoa, gia_tri, luc) VALUES ($1, $2::jsonb, now()) ON CONFLICT (khoa) DO NOTHING", [khoa, JSON.stringify({ da_dien: doi })]);
}

/**
 * GỘP "Nậm Khiên 1" VÀO "Nam Khian 1" (Mr. Đại chốt 03/10/2026: một dự án, tên đúng là Nam Khian). Danh mục dự án đã lưu trong CSDL
 * thì mặc định mới không tự vào — làm MỘT lần: tên + tên khác của dòng cũ chuyển vào tên gọi khác của Nam Khian 1 (việc cũ vẫn khớp),
 * đơn vị làm (PMC, E&C) nối sau Ban QLDA, rồi bỏ dòng cũ.
 */
async function gopNamKhian1(q: Q): Promise<void> {
  const khoa = "gop_nam_khian_1_0310";
  if ((await q.query("SELECT 1 FROM docflow.luat_danh_dau WHERE khoa = $1", [khoa])).rows.length) return;
  type Da = { id: string; ten: string; don_vi: string[]; ten_khac: string[] };
  const { rows } = await q.query<{ gia_tri: Da[] }>("SELECT gia_tri FROM docflow.cau_hinh WHERE khoa = 'du_an'");
  let doi = false;
  const ds = rows[0]?.gia_tri;
  if (Array.isArray(ds)) {
    const cu = ds.find((d) => d.id === "da-nkh1" || d.ten?.trim() === "Nậm Khiên 1");
    const dich = ds.find((d) => d.id === "da-nk1");
    if (cu && dich && cu !== dich) {
      const moi = ds
        .filter((d) => d !== cu)
        .map((d) =>
          d === dich
            ? {
                ...d,
                don_vi: [...new Set([...(d.don_vi ?? []), ...(cu.don_vi ?? [])])],
                ten_khac: [...new Set([...(d.ten_khac ?? []), cu.ten, ...(cu.ten_khac ?? [])].filter((x) => x && x !== d.ten))],
              }
            : d,
        );
      await q.query("UPDATE docflow.cau_hinh SET gia_tri = $1::jsonb WHERE khoa = 'du_an'", [JSON.stringify(moi)]);
      doi = true;
    }
  }
  await q.query("INSERT INTO docflow.luat_danh_dau (khoa, gia_tri, luc) VALUES ($1, $2::jsonb, now()) ON CONFLICT (khoa) DO NOTHING", [khoa, JSON.stringify({ da_gop: doi })]);
}

/**
 * ĐỔI MÃ DỰ ÁN TỰ ĐẶT (da-hv…) SANG MÃ NGẮN MAIN (HV…) — LOI-DUNG-CHUNG 6g.6 Đợt 1, Mr. Đại chốt 03/10/2026. Làm MỘT lần:
 * Cài đặt "du_an" (mã + ô Mã bên Tiến độ thành mã ngắn), bảng gắn WBS, tên file sổ issue. Sau đó lượt kéo từ Main
 * (lib/du-an-main.ts) điền tên · tên gọi khác · nhóm theo Main. Lịch sử / nhật ký phiên bản cũ giữ nguyên (chỉ ghi thêm).
 */
async function doiMaDuAnSangMaNgan(q: Q): Promise<void> {
  const khoa = "doi_ma_du_an_ma_ngan_0310";
  if ((await q.query("SELECT 1 FROM docflow.luat_danh_dau WHERE khoa = $1", [khoa])).rows.length) return;
  const { MA_CU } = await import("@/lib/du-an-main-thuan");
  const { rows } = await q.query<{ gia_tri: { id: string; ma_tien_do?: string | null }[] }>("SELECT gia_tri FROM docflow.cau_hinh WHERE khoa = 'du_an'");
  const doi: Record<string, string> = {};
  if (rows[0] && Array.isArray(rows[0].gia_tri)) {
    const ds = rows[0].gia_tri.map((d) => {
      const moi = MA_CU[d.id];
      if (!moi) return d;
      doi[d.id] = moi;
      const { ma_tien_do, ...con } = d;
      return { ...con, id: moi, ...(ma_tien_do ? { ma_tien_do: moi } : {}) };
    });
    if (Object.keys(doi).length) await q.query("UPDATE docflow.cau_hinh SET gia_tri = $1::jsonb WHERE khoa = 'du_an'", [JSON.stringify(ds)]);
  }
  for (const [cu, moi] of Object.entries(MA_CU)) await q.query("UPDATE docflow.wbs_viec SET du_an_id = $2 WHERE du_an_id = $1", [cu, moi]);
  // Sổ issue theo dự án: data/cay-viec/issue/<mã>.json + <mã>-da-bac.jsonl
  try {
    const fs = await import("node:fs");
    const { thuMucDuLieu } = await import("@/lib/ai/duong-dan");
    for (const [cu, moi] of Object.entries(MA_CU))
      for (const duoi of [".json", "-da-bac.jsonl"]) {
        const a = thuMucDuLieu("cay-viec", "issue", `${cu}${duoi}`);
        const b = thuMucDuLieu("cay-viec", "issue", `${moi}${duoi}`);
        if (fs.existsSync(a) && !fs.existsSync(b)) fs.renameSync(a, b);
      }
  } catch (e) {
    console.error("[khoi-tao] đổi tên sổ issue lỗi:", e instanceof Error ? e.message : e);
  }
  await q.query("INSERT INTO docflow.luat_danh_dau (khoa, gia_tri, luc) VALUES ($1, $2::jsonb, now()) ON CONFLICT (khoa) DO NOTHING", [khoa, JSON.stringify({ da_doi: doi })]);
}

export async function gieoDuLieu(q: Q): Promise<void> {
  await gieoIdentity(q);
  await doiMatKhauMauSangEmail(q);
  await ganMaTienDoHuongViet(q);
  await gopNamKhian1(q); // một dự án một tên (chốt 03/10)
  await doiMaDuAnSangMaNgan(q); // mã dự án = mã ngắn Main (6g.6 Đợt 1) — sau gopNamKhian1
  await napChucNangMacDinh(q); // chức năng nhiệm vụ đơn vị (db/81, chốt 03/10)
  await goLuaChonAi(q, "lanh_dao_chay_lai_prompt_2_0310"); // prompt bản 1 sai 11/72 — Mr. Đại cho chạy lại 03/10
  await goLuaChonAi(q, "lanh_dao_chay_lai_prompt_3_0310"); // bản 2 còn sai 6/72 — dò dự án trong tên việc + bật nghĩ, chạy lại
  await hatGiongThuMuc(q); // thư mục Đến/Đi/Dự án/Thùng rác cho từng đơn vị (module thu-muc)
  await hatGiongMau(q); // 9 mẫu Form 0–8 (module kiem-tra)
}
