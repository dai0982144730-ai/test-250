// ============================================================
// tim-web-chung.ts — FILE THUẦN (luật 10): không fs, không gọi mạng.
// Client và server cùng dùng để hiểu kiểu dữ liệu và các hằng số.
//
// TÌM KIẾM WEB cho trợ lý AI — chuyển thể từ agent pháp lý
// (`SCIPhaply-github/phaply/lib/web-search.ts`, đo 06/09).
//
// ⭐ Vì sao B3 hết bị chặn: bản pháp lý xếp ba nhà cung cấp theo thứ tự, và
//    HAI nhà cuối KHÔNG cần khoá API. Nên tính năng chạy được ngay bây giờ,
//    có khoá Brave thì tốt hơn chứ không bắt buộc.
// ============================================================

/** Một kết quả tìm được trên internet */
export interface KetQuaWeb {
  tieuDe: string;
  link: string;
  moTa: string;
}

/** Nhà cung cấp đã trả về kết quả — hiện cho người dùng biết số đến từ đâu */
export type NhaTimKiem = "brave" | "searxng" | "duckduckgo" | "khong-co";

export interface KetQuaTimWeb {
  nha: NhaTimKiem;
  ketQua: KetQuaWeb[];
  /** Câu tiếng Việt giải thích khi không tìm được gì */
  loi?: string;
}

/** Số kết quả lấy về mặc định — đủ để trả lời, không làm phình ngữ cảnh */
export const SO_KET_QUA_MAC_DINH = 5;

/** Các máy chủ SearXNG công cộng thử lần lượt (không cần khoá) */
export const MAY_SEARXNG = [
  "https://searx.be",
  "https://search.bus-hit.me",
  "https://searxng.site",
];

/** Hạn chờ từng nhà cung cấp (ms) — không để một nhà chết làm treo cả lượt chat */
export const HAN_CHO = { brave: 10_000, searxng: 8_000, duckduckgo: 12_000 } as const;

/** Tên nhà cung cấp hiện cho người đọc */
export function tenNha(nha: NhaTimKiem): string {
  if (nha === "brave") return "Brave Search";
  if (nha === "searxng") return "SearXNG";
  if (nha === "duckduckgo") return "DuckDuckGo";
  return "không có nguồn nào trả lời";
}

/**
 * Xếp kết quả thành đoạn chữ cho mô hình đọc. Luôn kèm địa chỉ trang để câu
 * trả lời của AI dẫn được nguồn — đúng nếp "mọi con số truy vết được".
 */
export function xepKetQua(kq: KetQuaWeb[]): string {
  if (kq.length === 0) return "Không tìm thấy kết quả nào trên internet cho truy vấn này.";
  return kq
    .map((k, i) => `[${i + 1}] ${k.tieuDe}\n    Địa chỉ: ${k.link}\n    ${k.moTa}`)
    .join("\n\n");
}

/** Gỡ thẻ HTML và ký tự thực thể, trả về chữ thường đọc được */
export function goHtml(s: string): string {
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
