// ============================================================
// ai/nhac-xoa-phien.ts — NHẮC XOÁ BỚT PHIÊN TRÒ CHUYỆN (Mr. Đại chốt 18/10/2026).
//
// Trước 18/10 máy TỰ XOÁ phiên cũ nhất khi một người vượt 100 phiên — trái chốt 08/10 «người tự xoá». Nay máy KHÔNG xoá
// phiên nào; quá 100 phiên thì danh sách phiên hiện MỘT dòng chữ nhắc, không chặn tạo phiên mới.
// Đo 17/10: nhiều nhất 40 phiên (Tiến độ, dự án Hướng Việt) — chưa ai chạm ngưỡng.
// Tệp THUẦN (không node:fs) — khung chat phía trình duyệt import được (luật 10). Cùng một tệp ở Main · Tiến độ · Hợp đồng ·
// Công việc; Pháp lý giữ bản cùng nội dung ở lib/nhac-xoa-phien.ts.
// ============================================================

/** Quá bấy nhiêu phiên của MỘT người thì danh sách phiên hiện dòng nhắc (không xoá, không chặn) */
export const NGUONG_NHAC_XOA_PHIEN = 100;

/** Dòng nhắc cho danh sách phiên; chưa quá ngưỡng → null (không hiện gì) */
export function cauNhacXoaPhien(soPhien: number): string | null {
  if (!Number.isFinite(soPhien) || soPhien <= NGUONG_NHAC_XOA_PHIEN) return null;
  return `Anh/chị đang có ${Math.floor(soPhien).toLocaleString("vi-VN")} phiên trò chuyện — xoá bớt phiên cũ cho gọn`;
}
