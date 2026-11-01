// phong/tuan.ts — tuần báo cáo (thứ Hai → Chủ nhật, đánh số ISO) và khoảng ngày kèm số ngày (luật 31).
// File THUẦN (không đụng node:fs) — trang client import thẳng được (luật 10).

export interface TuanBaoCao {
  so: number;
  nam: number;
  tu: string; // yyyy-mm-dd thứ Hai
  den: string; // yyyy-mm-dd Chủ nhật
}

const ms = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

export const cachNgay = (a: string, b: string) => Math.round((ms(b) - ms(a)) / 864e5);
export const congNgay = (a: string, n: number) => iso(ms(a) + n * 864e5);

/** Tuần chứa ngày `ngay` (yyyy-mm-dd). */
export function tuanCua(ngay: string): TuanBaoCao {
  const t = ms(ngay);
  const thu = (new Date(t).getUTCDay() + 6) % 7; // 0 = thứ Hai
  const tu = iso(t - thu * 864e5);
  const thuNam = ms(tu) + 3 * 864e5; // thứ Năm quyết định năm ISO
  const nam = new Date(thuNam).getUTCFullYear();
  const so = 1 + Math.floor(Math.round((thuNam - Date.UTC(nam, 0, 1)) / 864e5) / 7);
  return { so, nam, tu, den: congNgay(tu, 6) };
}

/**
 * Chữ tuần gọn cho ô chọn tuần: "7 ngày · 28/09–04/10/2026" (nơi gọi ghép "Tuần 40 · " phía trước). Mr. Đại chốt 10/10/2026: nhãn
 * tuần cũng theo luật 31 — kèm số ngày (đảo chốt 30/09 "riêng ô tuần, không kèm số ngày"); cùng khuôn thanh trên Main/TĐ/HĐ.
 */
export function nhanTuanGon(tu: string, den: string): string {
  const d = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;
  return `${d(tu)}–${d(den)}/${den.slice(0, 4)}`; // Mr. Đại 26/10/2026: bỏ chữ «7 ngày» — «Tuần 44 · 26/10–01/11/2026»
}

/** n tuần gần nhất, tuần chứa `homNay` đứng đầu. */
export function cacTuanGanDay(homNay: string, n = 8): TuanBaoCao[] {
  const dau = tuanCua(homNay);
  return Array.from({ length: n }, (_, i) => tuanCua(congNgay(dau.tu, -7 * i)));
}

/**
 * Hạn nộp báo cáo của một tuần (Mr. Đại chốt 29/09): ngày `thu` của CHÍNH TUẦN ĐÓ, giờ `gio` — Cài đặt "Hạn nộp báo cáo
 * tuần" thứ Bảy 10:00 (thu=6) → báo cáo tuần 40 (28/09 – 04/10) hạn 03/10 10:00. Trả "yyyy-mm-ddTHH:MM" giờ Việt Nam.
 */
/** Hạn nộp báo cáo tuần của một cấp đơn vị (Cài đặt → Kỳ báo cáo → Hạn nộp theo cấp; chốt 30/09). */
export function hanNopTheoCap(
  tuan: TuanBaoCao,
  cap: number,
  theoCap: Record<string, { tuan: "nay" | "sau"; thu: number; gio: string }>,
  ngayNghi: string[] = [],
): string {
  const h = theoCap[`cap${Math.min(4, Math.max(1, cap || 4))}`] ?? { tuan: "nay" as const, thu: 6, gio: "10:00" };
  return hanNopTuan(h.tuan === "sau" ? { ...tuan, tu: congNgay(tuan.tu, 7), den: congNgay(tuan.den, 7) } : tuan, h.thu, h.gio, ngayNghi);
}

export function hanNopTuan(tuan: TuanBaoCao, thu: number, gio: string, ngayNghi: string[] = []): string {
  // Hạn rơi vào ngày nghỉ / lễ (Cài đặt → Ngày nghỉ) → dời sang ngày làm việc kế tiếp, bỏ qua cả Chủ nhật (chốt 29/09).
  // Cài đặt chọn hạn Chủ nhật thì giữ Chủ nhật — chỉ dời khi rơi vào ngày nghỉ.
  const nghi = new Set(ngayNghi.map((d) => d.slice(0, 10)));
  let ngay = congNgay(tuan.tu, Math.min(7, Math.max(1, thu)) - 1);
  if (nghi.has(ngay))
    for (let i = 0; i < 30 && (nghi.has(ngay) || new Date(`${ngay}T00:00:00Z`).getUTCDay() === 0); i++) ngay = congNgay(ngay, 1);
  return `${ngay}T${gio}`;
}

/** Bây giờ theo giờ Việt Nam, dạng "yyyy-mm-ddTHH:MM" — so với hanNopTuan. */
export function bayGioVN(luc: Date = new Date()): string {
  return new Date(luc.getTime() + 7 * 3600e3).toISOString().slice(0, 16);
}

export const ngayVN = (s: string | null | undefined) => {
  if (!s) return "";
  const [y, m, d] = s.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

/** Luật 31: "10 ngày · 22/05/2027 – 31/05/2027" (tính cả ngày đầu và cuối). */
export function khoangNgay(a: string | null | undefined, b: string | null | undefined): string {
  if (!a && !b) return "chưa có ngày";
  if (!b) return `từ ${ngayVN(a)} · chưa có hạn`;
  if (!a) return `hạn ${ngayVN(b)}`;
  const n = cachNgay(a, b) + 1;
  if (n < 1) return `⚠ hạn ${ngayVN(b)} nằm TRƯỚC ngày bắt đầu ${ngayVN(a)} (lệch ${-n + 1} ngày)`;
  return `${n} ngày · ${ngayVN(a)} – ${ngayVN(b)}`;
}
