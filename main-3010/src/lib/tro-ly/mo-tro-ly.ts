// ============================================================
// MỞ TRỢ LÝ CHAT KÈM CÂU HỎI ĐIỀN SẴN (25/09 — thay màn "Hỏi vắt ngang các ban")
//
// Nút ở màn khác (vd "Hỏi nhanh" ở Bảng điều hành) gọi moTroLy(câu):
//   · khung chat nổi (ChatWidget) nghe sự kiện → mở ra
//   · ChatPanel nghe sự kiện (hoặc lúc vừa mount) → điền câu vào ô nhập
// Câu được giữ tạm trên window để khung chat mount SAU sự kiện vẫn lấy được.
// Chỉ ĐIỀN, không tự gửi — người đọc lại rồi Enter.
// File THUẦN phía client — không đụng fs.
// ============================================================

export const SU_KIEN_MO_TRO_LY = "sci-mo-tro-ly";

declare global {
  interface Window {
    __sciCauHoiCho?: string;
  }
}

/** Mở khung trợ lý, điền sẵn câu hỏi */
export function moTroLy(cau?: string): void {
  if (typeof window === "undefined") return;
  if (cau && cau.trim() !== "") window.__sciCauHoiCho = cau.trim();
  window.dispatchEvent(new CustomEvent(SU_KIEN_MO_TRO_LY));
}

/** Lấy (và xoá) câu hỏi đang chờ điền — null nếu không có */
export function layCauHoiCho(): string | null {
  if (typeof window === "undefined") return null;
  const c = window.__sciCauHoiCho ?? null;
  window.__sciCauHoiCho = undefined;
  return c;
}
