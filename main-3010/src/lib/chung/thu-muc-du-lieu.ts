// ============================================================
// MỘT CỬA DUY NHẤT tới thư mục dữ liệu.
//
// VÌ SAO CÓ FILE NÀY (bài học 31/08 và 07/09/2026):
// Trước đây mỗi lib tự ghép gốc repo với thư mục data. Hơn 20 chỗ như
// vậy nghĩa là bộ test KHÔNG có cách nào trỏ đi nơi khác — mọi bài kiểm ghi
// thẳng vào cơ sở dữ liệu thật rồi "khôi phục" ở afterAll. Đó là đặt cược vào
// một lần khôi phục: đứt giữa chừng (Ctrl+C, treo máy, một bài khác ném lỗi,
// hai file test chạy song song ghi chồng nhau) là dữ liệu thật hỏng thật.
// Một bộ test cũ đã từng xoá mất 5.670 dòng schedule.json của cả 4 agent.
//
// CÁCH DÙNG: mọi nơi cần đường dẫn dữ liệu đều gọi thuMucDuLieu(), KHÔNG tự
// ghép process.cwd() + "data" nữa. Với dữ liệu theo dự án thì đi tiếp qua
// projectDataDir() trong lib/projects.ts.
//
// Khi chạy thật: không đặt biến môi trường → vẫn là <gốc repo>/data như cũ,
// ứng dụng không đổi hành vi một chút nào.
// Khi chạy test: tests/thiet-lap/du-lieu-thu.ts đặt THU_MUC_DU_LIEU trỏ vào
// một bản sao dùng một lần trong thư mục tạm của máy.
// ============================================================

// ⭐ 23/09: file này từng là CỬA THỨ HAI (tự ghép process.cwd() + "data") song
// song với src/lib/goc-du-lieu.ts — hai cửa là hai chỗ phải sửa. Nay chỉ còn
// là tên gọi khác của gocDuLieu() để chỗ đang import không gãy.
import { gocDuLieu } from "@/lib/goc-du-lieu";

/** Tên biến môi trường để ĐÈ thư mục dữ liệu (chỉ bộ test dùng). */
export const BIEN_THU_MUC_DU_LIEU = "THU_MUC_DU_LIEU";

/** Thư mục gốc chứa dữ liệu ứng dụng — y hệt gocDuLieu(). */
export function thuMucDuLieu(): string {
  return gocDuLieu();
}
