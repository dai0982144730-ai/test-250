// ============================================================
// KHOÁ AUTH_SECRET — MỘT CHỖ ĐỌC DUY NHẤT (J01, Mr. Đại chốt 22/09/2026)
//
// Trước 23/09 ba chỗ (auth.ts · drive/store.ts · api/dong-bo-tu-main) đều tự
// đọc `process.env.AUTH_SECRET ?? "sci-dev-secret-2026"`. Chuỗi dự phòng đó
// nghĩa là: quên đặt biến thì 5 app vẫn chạy, cookie ký bằng khoá ai cũng
// biết, khoá Drive mã hoá bằng khoá ai cũng biết. Bỏ hẳn: thiếu biến là DỪNG,
// báo câu tiếng Việt rõ ràng — không lặng lẽ chạy bằng khoá công khai.
//
// File THUẦN, edge-safe (middleware import được): không node:fs, không crypto.
// ============================================================

export const THONG_DIEP_THIEU_KHOA =
  "Thiếu AUTH_SECRET trong .env.local — 5 app dùng chung một khoá";

/** Khoá ký cookie / dẫn xuất khoá Drive / khoá nội bộ Main→agent. Thiếu → ném. */
export function layKhoaAuth(): string {
  const k = (process.env.AUTH_SECRET ?? "").trim();
  if (k === "") throw new Error(THONG_DIEP_THIEU_KHOA);
  return k;
}
