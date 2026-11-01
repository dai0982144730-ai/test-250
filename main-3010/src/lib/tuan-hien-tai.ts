// Tuần hiện tại (thứ Hai → Chủ nhật, đánh số ISO) cho ô tuần ở thanh trên — cùng khuôn ô tuần agent Công việc 3004
// ("Tuần 40 · 28/09–04/10/2026", lib/phong/tuan.ts). File THUẦN (không đụng node:fs) — client import thẳng được (luật 10).

const ms = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

/** Ngày hôm nay theo giờ Việt Nam (yyyy-mm-dd) */
export const homNayVN = (bayGio = Date.now()) => new Date(bayGio + 7 * 3600e3).toISOString().slice(0, 10);

/** Tuần chứa ngày `ngay` */
export function tuanCua(ngay: string): { so: number; tu: string; den: string } {
  const t = ms(ngay);
  const thu = (new Date(t).getUTCDay() + 6) % 7; // 0 = thứ Hai
  const tu = iso(t - thu * 864e5);
  const thuNam = ms(tu) + 3 * 864e5; // thứ Năm quyết định năm ISO
  const nam = new Date(thuNam).getUTCFullYear();
  const so = 1 + Math.floor(Math.round((thuNam - Date.UTC(nam, 0, 1)) / 864e5) / 7);
  return { so, tu, den: iso(ms(tu) + 6 * 864e5) };
}

/** "Tuần 44 · 26/10–01/11/2026" — Mr. Đại 26/10/2026: nhãn tuần ở thanh trên BỎ chữ «7 ngày» (đảo chốt 10/10) */
export function nhanTuanHienTai(homNay = homNayVN()): string {
  const t = tuanCua(homNay);
  const d = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;
  return `Tuần ${t.so} · ${d(t.tu)}–${d(t.den)}/${t.den.slice(0, 4)}`;
}
