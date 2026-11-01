// Câu báo lỗi tiếng Việt khi API không trả lời được bằng câu của chính nó (file thuần — client dùng được).
// Đo 28/09: bấm "Sửa 9 chỗ vào file" đúng lúc máy chủ khởi động lại → màn hiện trơn "Lỗi 502".

/** Máy chủ trả mã lỗi mà không kèm câu `loi` */
export function loiTheoMa(ma: number): string {
  if (ma === 502 || ma === 503 || ma === 504)
    return "Máy chủ tạm thời không trả lời (đang khởi động lại hoặc mất kết nối) — đợi 1–2 phút rồi bấm lại. Chưa có gì bị thay đổi.";
  if (ma === 401) return "Phiên đăng nhập đã hết — tải lại trang để đăng nhập lại.";
  if (ma === 403) return "Tài khoản của bạn không có quyền làm việc này.";
  if (ma === 404) return "Không tìm thấy dữ liệu cần làm — có thể đã bị xoá hoặc đổi phiên bản, tải lại trang.";
  if (ma === 413) return "File quá lớn, máy chủ không nhận.";
  return `Máy chủ báo lỗi (mã ${ma}) — thử lại; lặp lại thì báo quản trị.`;
}

/** fetch ném lỗi trước khi có phản hồi (mất mạng, máy chủ tắt) → câu tiếng Việt */
export async function fetchCoLoiViet(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new Error("Không kết nối được máy chủ (mất mạng hoặc máy chủ đang khởi động lại) — kiểm tra mạng rồi bấm lại.");
  }
}
