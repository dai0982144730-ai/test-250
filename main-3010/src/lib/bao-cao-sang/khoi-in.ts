// ============================================================
// MÔ HÌNH IN CỦA MỘT KHỐI BÁO CÁO SÁNG — hàm THUẦN (luật 10), MỘT chỗ định nghĩa (luật 7)
// Mr. Đại chốt 25/10/2026 (KE-HOACH/31 phần chung P1+P2): khối trả CẤU TRÚC rồi ba bộ in lấy ra từ đó —
//   · inChuThuan  — chữ thuần (đường lùi của Telegram, và dòng đầu vào kiểm thử)
//   · inHtml      — Telegram HTML (đậm, nghiêng, <blockquote>, bảng trong <pre> ≤ 34 ký tự)
//   · web         — KhoiInWeb đọc thẳng cấu trúc này để dựng bảng thật
//
// ⭐ 27/10/2026 — «KHUÔN BÁO CÁO SÁNG» (KE-HOACH/33 mục 2, anh duyệt A). Khối KHÔNG tự ghép kiểu chữ; dùng các kiểu dưới đây:
//   T1  tên khối IN HOA, đậm, mở đầu ▍                                    → inHtml / dauChuThuan tự làm
//   T3  tên dự án đậm, đầu dòng «• »                                      → duAn(...)
//   T4  chỉ hai cấp đầu dòng: «• » cấp 1, «  – » cấp 2                    → duAn(...) · cap2(...)
//   T5  lời AI: 🤖 + nghiêng + khung trích (Telegram <blockquote>)       → { k: "ai" } — CHỈ AI mới nghiêng
//   T6  chú giải / công thức: «ⓘ », chữ thường, cuối khối                → { k: "chuGiai" }
//   T8  ✓ sạch · ⚠ chưa có số                                            → sach(...) · { k: "thieu" }
//   T9  thiếu số: một kiểu, gom cuối khối                                 → { k: "thieu" }
//   T10 không cắt danh sách, không bảo «xem ở Main» (chốt Mr. Đại 27/10, KE-HOACH/31-DOT-2 N7)
// Thứ tự trong khối do `xepPhan` quyết: thân → thiếu số → chú giải.
// ============================================================

import { bangChu, bangPre, thoatHtml } from "./telegram-html";

/** Một đoạn chữ: chữ thường hoặc chữ ĐẬM `{ d }` */
export type Doan = string | { d: string };
export type DongIn = readonly Doan[];

export interface CotIn {
  ten: string;
  /** Độ rộng cột trong <pre> Telegram; tổng + khoảng cách phải ≤ 34 */
  rong: number;
  phai?: boolean;
  /** Chỉ hiện trên web (Telegram bỏ cột này cho vừa khổ điện thoại) */
  chiWeb?: boolean;
}

export interface BangIn {
  cot: CotIn[];
  /** Hàng TỔNG đứng đầu (luật 34). Có đủ ô cho cả cột chỉ-web */
  tong?: string[];
  hang: string[][];
}

export type PhanIn =
  | { k: "chu"; dong: DongIn }
  /** Lời AI viết (T5) — nguyên câu, không kèm 🤖 (bộ in tự thêm) */
  | { k: "ai"; chu: string }
  /** Chú giải / công thức / luật xếp (T6) — bộ in thêm «ⓘ » */
  | { k: "chuGiai"; chu: string }
  /** Dự án chưa có số (T9) — bộ in: «⚠ <b>tên</b>: lý do» */
  | { k: "thieu"; ten: string; lyDo: string }
  | { k: "bang"; bang: BangIn }
  /**
   * G1 «thẻ việc» (28/10, KE-HOACH/35): khối có TÊN VIỆC DÀI không nhét vào bảng 34 ký tự (bảng cắt «Cung cấp H…»).
   * Dòng 1 ĐẬM = tên đầy đủ (không cắt «…»); dòng 2 = số kèm đơn vị bằng lời. `them` chỉ hiện ở web (nguồn, lý do, việc kèm).
   */
  | { k: "the"; ten: string; so: string; them?: string };

export interface KhoiIn {
  /** Phần chữ nối ngay sau tên khối ở dòng đầu, ví dụ « (tỷ đồng) — Làm: sản lượng tới 11/10/2026» */
  dauDong?: DongIn;
  phan: PhanIn[];
}

export const dam = (d: string): Doan => ({ d });

// ── Trợ giúp dựng dòng theo khuôn (khối dùng các hàm này, không tự gõ ký hiệu) ──

/** T3 + T4 cấp 1: «• <b>tên dự án</b>…» */
export const duAn = (ten: string, ...sau: Doan[]): PhanIn => ({ k: "chu", dong: ["• ", { d: ten }, ...sau] });
/** T4 cấp 2: «  – …» */
export const cap2 = (...dong: Doan[]): PhanIn => ({ k: "chu", dong: ["  – ", ...dong] });
/** T8: «✓ <b>A</b>, <b>B</b>: không có …» — dự án sạch gộp một dòng */
export const sach = (ten: readonly string[], cau: string): PhanIn => ({
  k: "chu",
  dong: ["✓ ", ...ten.flatMap((t, i): Doan[] => (i === 0 ? [{ d: t }] : [", ", { d: t }])), `: ${cau}`],
});
export const thieu = (ten: string, lyDo: string): PhanIn => ({ k: "thieu", ten, lyDo });
/** G1: thẻ việc — tên đầy đủ đậm, dưới là số bằng lời */
export const the = (ten: string, so: string, them?: string): PhanIn => ({ k: "the", ten, so, ...(them ? { them } : {}) });
export const chuGiai = (chu: string): PhanIn => ({ k: "chuGiai", chu });
export const ai = (chu: string): PhanIn => ({ k: "ai", chu: chu.replace(/^\s*🤖\s*/, "") });

/** Thứ tự trong khối: thân (giữ nguyên thứ tự) → thiếu số → chú giải */
export function xepPhan(k: KhoiIn): KhoiIn {
  const hang = (p: PhanIn): number => (p.k === "thieu" ? 1 : p.k === "chuGiai" ? 2 : 0);
  return { ...k, phan: k.phan.map((p, i) => ({ p, i })).sort((a, b) => hang(a.p) - hang(b.p) || a.i - b.i).map((x) => x.p) };
}

/** T1: tên khối in hoa (giữ phần ngoặc «(dự án tôi chọn)» thường) */
export const tenKhoiIn = (ten: string): string => {
  const m = /^(.*?)(\s*\(.*\))?$/.exec(ten);
  return `${(m?.[1] ?? ten).toLocaleUpperCase("vi-VN")}${m?.[2] ?? ""}`;
};

const chuCuaDong = (d: DongIn): string => d.map((x) => (typeof x === "string" ? x : x.d)).join("");
/** G2/G9 (28/10): câu kết luận của khối = dòng chữ đầu tiên KHÔNG phải tên dự án («• …») hay dòng sạch («✓ …») — null nếu khối không có */
export function cauKetLuan(k: KhoiIn): string | null {
  for (const p of k.phan) {
    if (p.k !== "chu") continue;
    const c = chuCuaDong(p.dong);
    if (c.startsWith("• ") || c.startsWith("✓ ") || c.startsWith("  –")) continue;
    return c;
  }
  return null;
}

const htmlCuaDong = (d: DongIn): string => d.map((x) => (typeof x === "string" ? thoatHtml(x) : `<b>${thoatHtml(x.d)}</b>`)).join("");

function cotTelegram(b: BangIn): { dong: string[][]; rong: number[]; phai: number[] } {
  const giu = b.cot.map((c, i) => ({ c, i })).filter((x) => !x.c.chiWeb);
  const lay = (h: readonly string[]) => giu.map((x) => h[x.i] ?? "");
  const dong = [lay(b.cot.map((c) => c.ten)), ...(b.tong ? [lay(b.tong)] : []), ...b.hang.map(lay)];
  return { dong, rong: giu.map((x) => x.c.rong), phai: giu.flatMap((x, j) => (x.c.phai ? [j] : [])) };
}

/** Chữ thuần của MỘT phần (có thể nhiều dòng) */
function chuCuaPhan(p: PhanIn): string[] {
  if (p.k === "chu") return [chuCuaDong(p.dong)];
  if (p.k === "ai") return [`🤖 ${p.chu}`];
  if (p.k === "chuGiai") return [`ⓘ ${p.chu}`];
  if (p.k === "thieu") return [`⚠ ${p.ten}: ${p.lyDo}`];
  if (p.k === "the") return [p.ten, `  ${p.so}`];
  const t = cotTelegram(p.bang);
  return bangChu(t.dong, t.rong, t.phai).split("\n");
}

/** Các dòng chữ thuần của phần thân (không gồm dòng tên khối) */
export function phanChuThuan(k: KhoiIn): string[] {
  return xepPhan(k).phan.flatMap(chuCuaPhan);
}

/** Dòng đầu: «▍TÊN KHỐI (dự án tôi chọn)» + phần nối */
export const dauChuThuan = (tenDay: string, k: KhoiIn): string => `▍${tenKhoiIn(tenDay)}${k.dauDong ? chuCuaDong(k.dauDong) : ""}`;

/** HTML Telegram của MỘT phần — mỗi phần đóng đủ thẻ, nên cắt tin giữa hai phần không bao giờ làm hở thẻ */
export function htmlCuaPhan(p: PhanIn): string {
  if (p.k === "chu") return htmlCuaDong(p.dong);
  if (p.k === "ai") return `<blockquote><i>🤖 ${thoatHtml(p.chu)}</i></blockquote>`;
  if (p.k === "chuGiai") return `ⓘ ${thoatHtml(p.chu)}`;
  if (p.k === "thieu") return `⚠ <b>${thoatHtml(p.ten)}</b>: ${thoatHtml(p.lyDo)}`;
  if (p.k === "the") return `<b>${thoatHtml(p.ten)}</b>\n  ${thoatHtml(p.so)}`;
  const t = cotTelegram(p.bang);
  return bangPre(t.dong, t.rong, t.phai);
}

/** Dòng tên khối bản HTML */
export const htmlDau = (tenDay: string, k: KhoiIn): string => `<b>▍${thoatHtml(tenKhoiIn(tenDay))}</b>${k.dauDong ? htmlCuaDong(k.dauDong) : ""}`;

/** Các mảnh HTML của khối: [dòng tên khối, phần 1, phần 2, …] — bộ đóng gói tin xếp theo mảnh, không cắt giữa mảnh */
export function manhHtml(tenDay: string, k: KhoiIn): string[] {
  return [htmlDau(tenDay, k), ...xepPhan(k).phan.map(htmlCuaPhan)];
}

/** Bản Telegram HTML của cả khối — tên khối ĐẬM IN HOA, bảng trong <pre>, lời AI trong <blockquote> */
export function inHtml(tenDay: string, k: KhoiIn): string {
  return manhHtml(tenDay, k).join("\n");
}

/** Độ rộng lớn nhất của một dòng trong mọi bảng Telegram của khối (bài kiểm: ≤ 34) */
export function rongBangToiDa(k: KhoiIn): number {
  return Math.max(
    0,
    ...k.phan.flatMap((p) => (p.k === "bang" ? (() => { const t = cotTelegram(p.bang); return bangChu(t.dong, t.rong, t.phai).split("\n").map((d) => d.length); })() : [])),
  );
}
