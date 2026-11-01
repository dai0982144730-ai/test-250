// ============================================================
// giao-dien-agent.ts — KIỂU GIAO DIỆN của agent (Mr. Đại chốt 03/10/2026). File THUẦN (luật 10) — client lẫn server import được.
//
//   "3d" = bộ giao diện MỚI. Điểm xuất phát GIỐNG HỆT bản hiện nay; từ đây mọi chỉnh sửa giao diện chỉ viết dưới
//          html[data-giao-dien="3d"] (globals.css) và chỉnh từng agent, từng menu, từng màn theo lệnh Mr. Đại.
//   "2d" = bản hiện nay, ĐÓNG BĂNG: luật gốc trong globals.css giữ nguyên, không ai sửa theo hướng 3D.
//
// Mặc định "3d". Lưu ở cookie (cùng trình duyệt nhớ), máy chủ đọc ở layout.tsx để lần tải đầu không nháy.
// Tên cookie khác với cookie `sci_kieu_ve` của app Công việc (bên đó 3D/2D mang nghĩa khác).
// ============================================================
export type KieuGiaoDien = "3d" | "2d";

export const COOKIE_GIAO_DIEN = "sci_gd_agent";
export const KIEU_MAC_DINH: KieuGiaoDien = "3d";

export const laKieuGiaoDien = (v: unknown): v is KieuGiaoDien => v === "3d" || v === "2d";

/** Giá trị cookie → kiểu hợp lệ (lạ/thiếu thì về mặc định). */
export const kieuTuCookie = (v: string | undefined): KieuGiaoDien => (laKieuGiaoDien(v) ? v : KIEU_MAC_DINH);
