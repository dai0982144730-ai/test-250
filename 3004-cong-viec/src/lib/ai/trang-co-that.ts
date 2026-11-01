// ============================================================
// LINK ĐƯỢC DÙNG TRONG CÂU TRẢ LỜI CỦA TRỢ LÝ — MỘT CHỖ DUY NHẤT (luật 7). File THUẦN (luật 10): khung chat import được.
// Mr. Đại chốt 01/10/2026: "loại bỏ hoàn toàn các link lạ … liệt kê hết các link được dùng". Link lạ = màn của giao diện
// cổ điển không có trên menu (/so-cai, /thu-muc, /lich-su, /tai-lieu/…, /cong-viec/…) — AI học từ lời dặn cũ.
// Dùng ở 4 nơi: lời dặn AI (danh sách dưới đây), công cụ AI trả link, bộ lọc câu trả lời phía máy chủ (locLinkTraLoi),
// khung chat vẽ link (chuanHoaLink). Link không nằm trong danh sách → BỎ LINK, GIỮ CHỮ.
// ============================================================

/** Các màn trên menu + link tải — AI CHỈ được dùng đúng những dạng này */
export const LINK_DUOC_DUNG: readonly { mau: string; ten: string }[] = [
  { mau: "/so-do?viec=<mã việc>", ten: "mở một việc (Sơ đồ tổ chức, việc bung sẵn)" },
  { mau: "/api/tai-lieu/<mã tài liệu>/tep", ten: "mở xem một báo cáo / tài liệu (cửa sổ xem, có nút Tải về)" },
  {
    mau: "/api/tai-lieu/<mã tài liệu>/tep?tim=<vài chữ đầu của dòng đang nói tới, mã hoá URL: khoảng trắng = %20>",
    ten: "mở báo cáo và KHOANH CAM đúng dòng đang dẫn — dùng khi câu trả lời dẫn một dòng cụ thể của báo cáo",
  },
  { mau: "/api/tro-ly/xuat/tai?ma=<mã>", ten: "tải file trợ lý vừa xuất" },
  { mau: "/so-do", ten: "Sơ đồ" },
  { mau: "/du-an", ten: "Dự án" },
  { mau: "/cay-viec", ten: "Cây việc & đường găng" },
  { mau: "/bao-cao-tuan", ten: "Báo cáo tuần" },
  { mau: "/gui-bao-cao", ten: "Báo cáo" },
  { mau: "/gop-y", ten: "Góp ý" },
  { mau: "/mau-word", ten: "Mẫu báo cáo" },
  { mau: "/ky-nang", ten: "Skill AI của tôi" },
  { mau: "/tai-khoan-claude", ten: "Tài khoản Claude cá nhân (nối tài khoản Claude cá nhân dự phòng khi tài khoản công ty hết hạn mức)" },
];

const MAN_MENU = new Set(["so-do", "du-an", "cay-viec", "bao-cao-tuan", "gui-bao-cao", "gop-y", "mau-word", "ky-nang", "tai-khoan-claude", "cai-dat"]);
const MA = "[A-Za-z0-9_-]{1,64}";

/**
 * Đường dẫn AI viết → đường dẫn được dùng, hoặc null (bỏ link, giữ chữ). Đổi dạng cũ sang dạng mới:
 * /cong-viec/X → /so-do?viec=X · /tai-lieu/X → /api/tai-lieu/X/tep · /so-cai → /so-do.
 * http(s): tên miền của app → đường nội bộ. Tên miền LẠ mà đuôi là đường riêng của app (/so-do?viec=, /api/…, /cong-viec/…)
 * = AI bịa tên miền (test đêm 01/10, Haiku viết https://you-domain.com/so-do?viec=…) → đổi về đường nội bộ. Tên miền giả
 * (example, your-domain…) → bỏ. Link ngoài thật: giữ khi `choNgoai` (kết quả tìm web), không thì bỏ.
 */
const MIEN_APP = /^https?:\/\/[^/]*(trycloudflare\.com|localhost|127\.0\.0\.1|scigroup\.vn)(:\d+)?(\/|$)/i;
const MIEN_GIA = /^https?:\/\/[^/]*(example\.|your-?domain|you-?domain|ten-?mien|domain\.(com|vn)|my-?app|app-?url|sci-?app|placeholder)/i;
const DUONG_RIENG_APP = /^\/(so-do\?viec=|api\/|cong-viec\/|tai-lieu\/|so-cai(\?|$)|gui-bao-cao\?tu-chat=|qua-han\?tab=)/;
export function chuanHoaLink(lk: string | null | undefined, choNgoai = true): string | null {
  if (!lk) return null;
  const s = lk.trim();
  if (/^https?:\/\//i.test(s)) {
    const duong = s.replace(/^https?:\/\/[^/]+/i, "") || "/";
    if (MIEN_APP.test(s) || DUONG_RIENG_APP.test(duong)) return chuanHoaLink(duong);
    if (MIEN_GIA.test(s)) return null;
    return choNgoai ? s : null;
  }
  if (!s.startsWith("/")) return null;
  let m: RegExpExecArray | null;
  if ((m = new RegExp(`^/cong-viec/(${MA})$`).exec(s))) return `/so-do?viec=${m[1]}`;
  if ((m = new RegExp(`^/so-do\\?viec=(${MA})$`).exec(s))) return s;
  if ((m = new RegExp(`^/tai-lieu/(${MA})$`).exec(s))) return `/api/tai-lieu/${m[1]}/tep`;
  // ?tim=<chữ của dòng cần xem> — khung chat mở cửa sổ xem và khoanh cam đúng dòng (Mr. Đại chốt 02/10)
  if (new RegExp(`^/api/tai-lieu/${MA}/tep(\\?tim=[^\\s#&]{1,400})?$`).test(s)) return s;
  if (/^\/api\/tro-ly\/xuat\/tai\?ma=[a-z0-9]{6,20}$/.test(s)) return s;
  if (/^\/so-cai(\?.*)?$/.test(s)) return "/so-do";
  if (/^\/gui-bao-cao\?tu-chat=[a-z0-9]{6,20}$/.test(s)) return s;
  // Màn Quá hạn đã xoá 02/10 (trùng Sơ đồ) — link cũ AI còn nhớ → Sơ đồ
  if (/^\/(qua-han|issue)(\?.*)?$/.test(s)) return "/so-do";
  const dau = s.slice(1).split(/[/?#]/)[0] ?? "";
  return MAN_MENU.has(dau) && !/[/?#]/.test(s.slice(1 + dau.length)) ? s : null;
}

/** Link báo cáo trong câu trả lời → { mã tài liệu, chữ cần khoanh } để khung chat mở cửa sổ xem thay vì tải file về. */
export function linkTaiLieu(lk: string): { id: string; tim: string | null } | null {
  const m = new RegExp(`^/api/tai-lieu/(${MA})/tep(?:\\?tim=([^\\s#&]+))?$`).exec(lk);
  if (!m) return null;
  let tim: string | null = null;
  try {
    tim = m[2] ? decodeURIComponent(m[2].replace(/\+/g, " ")) : null;
  } catch {
    tim = m[2] ?? null;
  }
  return { id: m[1], tim };
}

/** Link việc (/cong-viec/X) → /so-do?viec=X; chuông + khung chat dùng chung. Không phải link việc thì trả nguyên. */
export function linkPhong(lk: string | null): string | null {
  const m = lk ? /^\/cong-viec\/([^/?#]+)/.exec(lk) : null;
  return m ? `/so-do?viec=${m[1]}` : lk;
}

/**
 * Lọc câu trả lời phía máy chủ trước khi lưu / gửi: mọi [chữ](đường dẫn) đổi sang dạng được dùng, không được dùng thì
 * còn [chữ] trơn → chữ. Đường dẫn trần trỏ về chính app (https://…/so-cai) cũng bị gỡ. Trả kèm số link đã bỏ (để đo).
 */
export function locLinkTraLoi(text: string, choNgoai = true): { text: string; bo: number } {
  let bo = 0;
  let ra = text.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (_, chu: string, lk: string) => {
    const moi = chuanHoaLink(lk, choNgoai);
    if (moi) return `[${chu}](${moi})`;
    bo++;
    return chu;
  });
  // giữ dấu câu đứng ngay sau link trần ("… tại https://…/so-cai." → "… tại .")
  ra = ra.replace(/https?:\/\/[^\s)]*(trycloudflare\.com|localhost:\d+|127\.0\.0\.1:\d+)[^\s)]*/gi, (m) => (bo++, /[.,;:!?]+$/.exec(m)?.[0] ?? ""));
  // đường trần ngoài app: tên miền giả, đuôi đường riêng của app, hoặc (khi không tìm web) mọi tên miền lạ → gỡ, giữ dấu câu
  ra = ra.replace(/(?<!\]\()https?:\/\/[^\s)\]]+/gi, (m) => {
    const goc = m.replace(/[.,;:!?]+$/, "");
    if (chuanHoaLink(goc, choNgoai) === goc) return m;
    bo++;
    return /[.,;:!?]+$/.exec(m)?.[0] ?? "";
  });
  return { text: ra, bo };
}

/** Dòng mô tả danh sách link cho lời dặn AI — sinh từ LINK_DUOC_DUNG, không chép tay */
export const MO_TA_LINK = LINK_DUOC_DUNG.map((l) => `${l.mau} (${l.ten})`).join(" · ");
