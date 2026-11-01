// ============================================================
// TELEGRAM DẠNG HTML — hàm THUẦN (luật 10), không đụng mạng, không đụng đĩa
// Mr. Đại chốt 25/10/2026: bật HTML cho tin báo cáo để có CHỮ ĐẬM và bảng canh cột trong <pre>,
// KÈM đường lùi về chữ thuần nếu Telegram từ chối (telegram.ts gọi lại bằng bản chữ thuần).
//
// Vì sao chọn HTML mà không chọn Markdown: ở HTML chỉ ba ký tự < > & cần thoát, còn mã hồ sơ có `_` `*` `[`
// (ISS_PL_0115, [x]) KHÔNG làm hỏng tin — đúng nỗi lo cũ ghi ở telegram.ts. Telegram HTML chỉ nhận
// <b> <i> <u> <s> <code> <pre> <a href> và KHÔNG có màu chữ → màu dùng emoji 🔴🟡🟢.
// ============================================================

/** Thoát ba ký tự đặc biệt của HTML. Mọi chữ lấy từ dữ liệu (tên dự án, tiêu đề issue, câu AI) PHẢI qua hàm này. */
export function thoatHtml(chu: string): string {
  return chu.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Chữ đậm — nội dung tự thoát */
export const dam = (chu: string): string => `<b>${thoatHtml(chu)}</b>`;
/** Chữ nghiêng */
export const nghieng = (chu: string): string => `<i>${thoatHtml(chu)}</i>`;

/** Rộng tối đa của một dòng trong <pre> để không bị bẻ dòng trên điện thoại dọc (đo ước lượng, chờ thử trên máy thật) */
export const RONG_PRE = 34;

/**
 * Khối <pre> canh cột: mỗi dòng là một mảng ô, ô cuối canh phải nếu `canPhai` có chỉ số tương ứng.
 * Ô dài hơn cột bị cắt bằng «…» — bảng KHÔNG bao giờ rộng quá RONG_PRE ký tự.
 * `rong` = độ rộng từng cột (tổng + khoảng cách ≤ RONG_PRE do người gọi giữ).
 */
export function bangChu(dong: readonly (readonly string[])[], rong: readonly number[], canPhai: readonly number[] = []): string {
  const cat = (s: string, n: number): string => (s.length <= n ? s : `${s.slice(0, Math.max(0, n - 1))}…`);
  const dinh = (s: string, n: number, phai: boolean): string => (phai ? cat(s, n).padStart(n) : cat(s, n).padEnd(n));
  return dong
    .map((d) =>
      d
        .map((o, i) => dinh(o, rong[i] ?? 8, canPhai.includes(i)))
        .join(" ")
        .trimEnd(),
    )
    .join("\n");
}

/** Khối <pre> — bản HTML của bangChu (nội dung tự thoát) */
export function bangPre(dong: readonly (readonly string[])[], rong: readonly number[], canPhai: readonly number[] = []): string {
  return `<pre>${thoatHtml(bangChu(dong, rong, canPhai))}</pre>`;
}

/** Thanh chữ █░ dài `n` ô, đầy theo tỉ lệ `phan` trên `tong` (chỉ để TRÌNH BÀY — không tính số nào) */
export function thanhChu(phan: number, tong: number, n = 10): string {
  if (!(tong > 0) || !(phan >= 0)) return "░".repeat(n);
  const day = Math.max(0, Math.min(n, Math.round((phan / tong) * n)));
  return "█".repeat(day) + "░".repeat(n - day);
}

/** Bản CHỮ THUẦN của một tin HTML — dùng khi Telegram từ chối bản HTML: bỏ thẻ, trả lại &lt; &gt; &amp; */
export function htmlRaChuThuan(html: string): string {
  return html
    .replace(/<\/?(?:b|i|u|s|code|pre|a|blockquote)(?:\s[^>]*)?>/gi, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** Telegram báo lỗi do không đọc được thẻ HTML (khác lỗi mạng/chat id) → được phép gửi lại bằng chữ thuần */
export function laLoiDocHtml(moTa: string | undefined): boolean {
  return /can'?t parse|parse entities|unsupported start tag|can'?t find end tag|unclosed|entit/i.test(moTa ?? "");
}
