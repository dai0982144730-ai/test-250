// ============================================================
// ai/loi-cli.ts — BẮT CÂU LỖI mà Claude CLI in ra NHƯ MỘT CÂU TRẢ LỜI. Thuần — không import gì của server.
// Nhân bản từ agent Công việc (04/10/2026, Quản lý token AI — Đợt 2).
//
// Claude CLI khi trục trặc thường KHÔNG trả mã lỗi mà in nguyên câu tiếng Anh ra kết quả ("Not logged in · Please run /login",
// "Claude AI usage limit reached|…"). Không bắt thì câu đó lọt vào làm nội dung trả lời, và hết hạn mức không được nhận ra để
// chuyển sang tài khoản kia. Mỗi mẫu dưới đây là câu đo được thật (HptStart 08/2026, agent Công việc 04/10).
// ============================================================

const CHO_SUA = "Cài đặt → 🔌 Kết nối → thẻ Tài khoản Claude";

/** Chuỗi ngắn (dưới 400 ký tự) khớp một lỗi đã biết → câu tiếng Việt; không phải lỗi → null. */
export function dichLoiCli(text: unknown): string | null {
  const s = String(text ?? "").trim();
  if (s === "" || s.length >= 400) return null;
  // Không bắt chữ "/login" trơn: app có trang /login, câu trả lời thật hay nhắc tới nó.
  if (/not logged in|please run \/login/i.test(s)) {
    return `Chưa đăng nhập tài khoản Claude trên máy chủ. Vào ${CHO_SUA}, bấm "Đăng nhập Claude" rồi thử lại.`;
  }
  // 06/10/2026 (đo ở agent Công việc — câu tiếng Anh lọt ra màn): "You've hit your monthly spend limit · raise it at
  // claude.ai/settings/usage" — hạn mức của THÁNG, khác "usage limit" của chu kỳ 5 giờ.
  if (/spend limit|monthly limit/i.test(s)) {
    return `Tài khoản Claude đã hết hạn mức của tháng. Báo người quản lý tài khoản nâng hạn mức, hoặc chuyển sang tài khoản dự phòng ở ${CHO_SUA}.`;
  }
  if (/usage limit|rate limit|quota exceeded|limit reached/i.test(s)) {
    return "Tài khoản Claude đã dùng hết lượt cho giờ này. Chờ một lát rồi thử lại.";
  }
  if (/failed to authenticate|oauth.*(expired|revoked|invalid)|session expired/i.test(s)) {
    return `Phiên đăng nhập Claude đã hết hạn. Vào ${CHO_SUA} để đăng nhập lại, rồi chạy lại.`;
  }
  if (/organization has disabled|subscription access|use an anthropic api key instead/i.test(s)) {
    return (
      "Tổ chức quản lý tài khoản Claude này đã TẮT quyền dùng gói thuê bao cho Claude Code, nên phần mềm không gọi được bằng " +
      `tài khoản đó. Cách 1: vào ${CHO_SUA} → Đăng xuất → Đăng nhập lại bằng tài khoản Claude không thuộc tổ chức nào. ` +
      'Cách 2: chuyển sang chế độ "API mô hình khác" ở Kết nối AI. Cách 3: nhờ quản trị viên tổ chức bật lại quyền Claude Code.'
    );
  }
  return null;
}

/** Tên gói hiển thị từ `claude auth status --json` (subscriptionType / authMethod). */
export function tenGoiClaude(subscriptionType?: string, authMethod?: string): string | undefined {
  const sub = String(subscriptionType ?? "").toLowerCase();
  if (sub === "max") return "Claude Max";
  if (sub === "pro") return "Claude Pro";
  if (sub === "team") return "Claude Team";
  if (sub === "enterprise") return "Claude Enterprise";
  if (sub) return sub;
  if (authMethod === "claude.ai") return "Claude (thuê bao)";
  return authMethod || undefined;
}
