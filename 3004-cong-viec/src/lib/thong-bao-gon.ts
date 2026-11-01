// ============================================================
// thong-bao-gon.ts — CHUÔNG TỰ GỌN THEO LOGIC (Mr. Đại duyệt bảng B 08/10/2026). Định nghĩa MỘT chỗ — nơi khác import.
// Đo 07/10 (bản sao CSDL, 11 ngày test, 41 người): 1.864 chuông, 83% chưa đọc; 771 chuông "quá hạn" chưa đọc chỉ ứng 135 cặp
// người–việc (mỗi việc trễ nhắc ~5,7 lần cùng một người); 342 chuông chưa đọc của việc đã xong/đã đóng.
//   3a · Gộp chuông nhắc của MÁY: cùng người + cùng loại + cùng liên kết mà còn chuông CHƯA ĐỌC → thay bằng chuông mới (một dòng).
//   3b · Việc xong / đóng: chuông vô nghĩa của việc đó thành ĐÃ ĐỌC cho mọi người; chuông báo kết quả cho người giao GIỮ.
//   3c · Mở thẻ việc: chuông về việc đó của CHÍNH người mở thành đã đọc (người khác không đụng).
//   3d · Việc hết hạn lưu bị xoá → xoá kèm chuông của việc. Sổ lịch sử KHÔNG xoá: có trigger chặn + chuỗi băm chống sửa lén.
// "Tắt" = đánh dấu đã đọc, không xoá — vẫn xem lại được trong chuông.
// ============================================================

/** 3a — chuông nhắc do MÁY phát lặp theo nhịp (nhắc của người — nhac_viec, duoc_nhac — không gộp: mỗi lời nhắc có nội dung riêng) */
export const LOAI_CHUONG_GOP = ["qua_han", "sap_den_han", "nhac_nop", "nhac_dong_viec"] as const;

/**
 * 3b — chuông hết nghĩa khi việc đã xong / đã đóng → tự thành đã đọc cho mọi người nhận.
 * KHÔNG có ở đây (giữ chưa đọc — người giao cần biết kết quả): cong_viec_hoan_thanh · dong_viec_cap_duoi · ket_thuc_phan_viec ·
 * dong_viec · mo_lai_viec, và mọi loại khác chưa xếp (không chắc thì giữ).
 */
export const LOAI_CHUONG_TAT_KHI_VIEC_XONG = [
  "qua_han",
  "sap_den_han",
  "nhac_viec",
  "nhac_dong_viec",
  "duoc_nhac",
  "giao_viec",
  "gia_han",
  "sua_viec",
  "binh_luan",
  "bi_de",
  "ban_khong_dung",
] as const;

/** Khuôn liên kết chuông của một việc — mọi chỗ phát chuông việc đều ghi `/cong-viec/<mã>` (đo 08/10: 34 chỗ, một khuôn) */
export function lienKetViec(ma: string): string {
  return `/cong-viec/${ma}`;
}

export function laLoaiGop(loai: string): boolean {
  return (LOAI_CHUONG_GOP as readonly string[]).includes(loai);
}
