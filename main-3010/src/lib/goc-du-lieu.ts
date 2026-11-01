// ============================================================
// MỘT CỬA DUY NHẤT RA THƯ MỤC DỮ LIỆU
//
// VÌ SAO CÓ FILE NÀY:
// Trước đây mỗi lib tự viết `path.join(process.cwd(), "data", ...)`. Hệ quả:
// bộ test muốn chạy trên dữ liệu riêng thì không có chỗ nào để đổi — nên nó
// ghi thẳng vào `data/` thật rồi cược vào một lần khôi phục ở afterAll. Đứt
// giữa chừng (Ctrl+C, máy treo, bài khác ném lỗi trước) là dữ liệu thật nằm
// dở. Đã có lần bộ test cũ xoá mất 5.670 dòng schedule.json của cả 4 agent.
//
// TỪ NAY: MỌI đường dẫn đọc-ghi dưới `data/` phải đi qua gocDuLieu().
// Đặt biến môi trường THU_MUC_DU_LIEU là cả hệ quay sang thư mục khác —
// bộ test dùng đúng cửa này (xem tests/ho-tro/khoi-tao-du-lieu.ts).
//
// LƯU Ý: chạy thật (next dev / next start) KHÔNG đặt biến này → y hệt cũ.
// ============================================================

import path from "node:path";

/** Gốc thư mục dữ liệu. Mặc định `<gốc repo>/data`; đổi được bằng THU_MUC_DU_LIEU. */
export function gocDuLieu(): string {
  const rieng = process.env.THU_MUC_DU_LIEU;
  if (typeof rieng === "string" && rieng.trim() !== "") return path.resolve(rieng.trim());
  return path.join(process.cwd(), "data");
}

/** Ghép đường dẫn con dưới gốc dữ liệu — `duongDanDuLieu("viec", "danh-ba-base.json")`. */
export function duongDanDuLieu(...phan: string[]): string {
  return path.join(gocDuLieu(), ...phan);
}
