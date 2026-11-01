// ============================================================
// lich-su/ghi-chuan.ts — ghi lịch sử với chi_tiet đã XẾP KHÓA theo đúng thứ tự jsonb lưu.
// Lý do: jsonb tự sắp lại khóa (ngắn trước, cùng độ dài thì so byte), còn ghi.ts băm JSON.stringify
// theo thứ tự khóa lúc ghi → đọc ra băm lại thì lệch, kiemTraChuoi báo gãy với chi_tiet nhiều khóa.
// Xếp sẵn khóa như jsonb thì băm lúc ghi = băm lúc kiểm. (Đã báo nền sửa tận gốc trong ghi.ts.)
// ============================================================
import type { Q } from "@/lib/db";
import { ghiLichSu, type SuKienLichSu } from "./ghi";

function soKhoa(a: string, b: string): number {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length !== y.length ? x.length - y.length : Buffer.compare(x, y);
}

/** Sao giá trị với mọi object con xếp khóa theo thứ tự jsonb; bỏ undefined như JSON. */
export function xepKhoaJsonb<T>(v: T): T {
  if (Array.isArray(v)) return v.map((x) => (x === undefined ? null : xepKhoaJsonb(x))) as T;
  if (v && typeof v === "object" && !(v instanceof Date)) {
    const ra: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort(soKhoa)) {
      const x = (v as Record<string, unknown>)[k];
      if (x !== undefined) ra[k] = xepKhoaJsonb(x);
    }
    return ra as T;
  }
  return v;
}

/** Như ghiLichSu nhưng chi_tiet xếp khóa trước (chuỗi băm kiểm lại được). */
export function ghiLichSuChuan(q: Q, s: SuKienLichSu): Promise<number> {
  return ghiLichSu(q, { ...s, chi_tiet: xepKhoaJsonb(s.chi_tiet ?? {}) });
}
