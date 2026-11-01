// phong/giao-dien.ts — kiểu vẽ 3D / 2D của khung căn phòng. File thuần.
// (Giao diện cổ điển — thanh bên + Kho thư mục — đã xoá hẳn 29/09/2026.)
/** Giao diện 3D (khối cam, nền phòng tối) / 2D (phẳng, nền trắng, tông xanh) — Mr. Đại chốt 29/09, nhớ theo tài khoản */
export const KIEU_VE = ["3d", "2d"] as const;
export type KieuVe = (typeof KIEU_VE)[number];
export const COOKIE_KIEU_VE = "sci_kieu_ve";
