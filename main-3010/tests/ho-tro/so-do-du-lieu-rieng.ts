// ============================================================
// Thư mục dữ liệu RIÊNG cho bài test loại tài khoản theo sơ đồ (6g.6.13) — import ĐẦU TIÊN (trước users.ts / projects.ts).
// Dựng một sơ đồ nhỏ giống thật: Ban TGĐ → P.ĐT&PC → Ban QLDA QT → BĐH HV · P.KT&VH → nhà máy Ca Nan 1; dự án HV (gắn BQLDA QT + BĐH HV)
// và IAD1 (gắn P.ĐT&PC). to-chuc.json KHÔNG ghi sẵn — bài test tự ghi khi cần thử "đã có tổ chức".
// ============================================================
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { bamMatKhauMoi } from "@/lib/mat-khau-bam";

export const THU_MUC_SO_DO_TEST = path.join(os.tmpdir(), "sci-so-do-test", `${process.pid}-${Date.now()}`);
fs.mkdirSync(THU_MUC_SO_DO_TEST, { recursive: true });
process.env.THU_MUC_DU_LIEU = THU_MUC_SO_DO_TEST;

const luc = new Date().toISOString();
const DV = (id: string, ten: string, cap: number, cha_id: string | null, them: Record<string, unknown> = {}) => ({
  id,
  ten,
  ten_ngan: ten,
  cap,
  cha_id,
  loai: "don_vi",
  thu_tu: 0,
  active: true,
  chuc_danh: null,
  chuc_danh_ngan: null,
  chuc_nang: null,
  uy_quyen_truong: null as string | null,
  ...them,
});
export const TO_CHUC_THU = {
  cap_nhat: luc,
  don_vi: [
    DV("ban-tgd", "Ban Tổng giám đốc", 1, null, { loai: "ban_tgd" }),
    DV("p-dtpc", "Phòng Đầu tư và Pháp chế", 2, "ban-tgd", { loai: "phong" }),
    DV("p-ktvh", "Phòng Kỹ thuật và Vận hành", 2, "ban-tgd", { loai: "phong" }),
    DV("bqlda-qt", "Ban QLDA Quảng Trị", 3, "p-dtpc", { uy_quyen_truong: "u-truong2" }),
    DV("bdh-hv", "Ban điều hành Hướng Việt", 4, "bqlda-qt"),
    DV("nm-cannan1", "Nhà máy thủy điện Ca Nan 1", 3, "p-ktvh"),
  ],
  kiem_nhiem: [{ nguoi_id: "u-kiem", don_vi_id: "bdh-hv", chuc_vu: "Kỹ sư" }],
  uy_quyen_ky: [],
};
const nguoi = (id: string, email: string, role: string, donViId: string | null, vaiCongViec: string[]) => ({
  id,
  email,
  name: email.split("@")[0],
  role,
  ...bamMatKhauMoi("Thu@2026"),
  active: true,
  createdAt: luc,
  donViId,
  vaiCongViec,
});
fs.writeFileSync(
  path.join(THU_MUC_SO_DO_TEST, "users.json"),
  JSON.stringify(
    [
      nguoi("quantri@scigroup.vn", "quantri@scigroup.vn", "admin", "ban-tgd", ["quan-tri"]),
      nguoi("u-pm", "dainc@scigroup.vn", "pm", "ban-tgd", ["lanh-dao"]),
      nguoi("u-tgd", "tgd@scigroup.vn", "engineer", "ban-tgd", ["lanh-dao"]),
      nguoi("u-tp", "tp.dtpc@scigroup.vn", "viewer", "p-dtpc", ["truong-don-vi"]), // trưởng phòng — cấp trên của BQLDA QT
      nguoi("u-truong1", "pho.qt@scigroup.vn", "engineer", "bqlda-qt", ["truong-don-vi"]), // vai trưởng nhưng đơn vị đã có trưởng chính khác
      nguoi("u-truong2", "truong.qt@scigroup.vn", "engineer", "bqlda-qt", ["nhan-vien"]), // trưởng chính
      nguoi("u-nv", "nv.bdh@scigroup.vn", "engineer", "bdh-hv", ["nhan-vien"]),
      nguoi("u-kiem", "kiem@scigroup.vn", "engineer", "p-ktvh", ["nhan-vien"]), // kiêm nhiệm BĐH HV
      nguoi("u-gdnm", "gd.nm@scigroup.vn", "engineer", "nm-cannan1", ["truong-don-vi"]), // GĐ nhà máy
      nguoi("u-nvnm", "nv.nm@scigroup.vn", "engineer", "nm-cannan1", ["nhan-vien"]),
    ],
    null,
    2,
  ),
  "utf8",
);
fs.writeFileSync(
  path.join(THU_MUC_SO_DO_TEST, "projects.json"),
  JSON.stringify({
    projects: [
      { id: "huong-viet", name: "Hướng Việt", ma: "HV", nhom: "sci", donVi: ["bqlda-qt"], banDieuHanh: "bdh-hv", createdAt: luc, createdBy: "test" },
      { id: "ia-dreng-1", name: "IA Dreng 1", ma: "IAD1", nhom: "khac", donVi: ["p-dtpc"], createdAt: luc, createdBy: "test" },
    ],
  }),
  "utf8",
);
