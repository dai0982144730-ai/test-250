// ============================================================
// CÂU BÁO KHI MỘT AGENT KHÔNG THƯA — MỘT CHỖ cho hoi-agent.ts và nguon-tien-do.ts (luật 7).
// Mr. Đại chốt 26/10/2026: câu phải nói rõ «đang tắt / đang khởi động lại» để người hỏi biết chờ rồi hỏi lại.
// Kiểm độc lập lần 8 (MC-01): chỉ nói «đang tắt» khi đúng là KHÔNG NỐI ĐƯỢC; agent chậm thì nói chậm, trả lỗi thì nói lỗi.
// MC-03: không in địa chỉ máy (http://127.0.0.1:…) và không hỏi «Đã bật chưa?» ra màn người dùng.
// File THUẦN — bài kiểm gọi thẳng (MC-08).
// ============================================================

/** Lý do hỏng gần nhất của một agent — để câu ngắt mạch nói đúng nguyên nhân */
export type LyDoHong = "khong_noi_duoc" | "cham" | "loi";

export function lyDoTuMaLoi(maLoi: string): LyDoHong {
  if (maLoi === "AGENT_KHONG_SAN_SANG") return "khong_noi_duoc";
  if (maLoi === "HET_HAN_CHO") return "cham";
  return "loi";
}

/** Không nối được tới cổng (ECONNREFUSED…) */
export const cauKhongNoiDuoc = (ten: string) =>
  `Không nối được tới ${ten} — agent đang tắt hoặc đang được khởi động lại (thường vài phút). Tắt lâu thì báo quản trị kiểm Danh bạ agent.`;

/** Mạch đang nghỉ 10 phút sau N lần hỏng liền */
export function cauNgatMach(ten: string, lyDo: LyDoHong, soLan: number, moLaiLuc: number): string {
  const gio = new Date(moLaiLuc).toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" });
  const vi =
    lyDo === "khong_noi_duoc"
      ? `${ten} đang tắt hoặc đang được khởi động lại (không nối được ${soLan} lần liên tiếp)`
      : lyDo === "cham"
        ? `${ten} không trả lời kịp ${soLan} lần liên tiếp (đang bận tính, đang khởi động lại hoặc quá tải)`
        : `${ten} trả lỗi ${soLan} lần liên tiếp`;
  return `${vi}. Máy tự thử lại sau ${gio} — hỏi lại sau giờ đó.`;
}
