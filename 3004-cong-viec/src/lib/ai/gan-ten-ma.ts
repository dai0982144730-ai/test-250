// gan-ten-ma.ts — LƯỚI LUẬT 30 (Mr. Đại chốt 26/09: "Tuyệt đối không viết chỉ có mã"): chữ AI trả về đi qua đây trước khi
// hiện/gửi. Mã việc CV-yyyy-nnnn đứng trần (không có tên theo sau, không nằm trong ngoặc ngay sau tên) → gắn tên ngắn ≤ 8 chữ.
// Chỉ gắn cho mã CÓ trong từ điển (sổ cái thật) — mã lạ để nguyên; không đụng số tiền, ngày, tỷ lệ. Dòng bảng (| … |) bỏ qua:
// tên nằm ở cột bên cạnh. Test đêm 01/10: "nên xử lý sớm CV-2026-0053 và CV-2026-0051 vì…" (câu 1, Sonnet 5).
import type { Q } from "@/lib/db";

const MA = /\[(CV-\d{4}-\d{4})\]\([^)\s]*\)|(?<![\w/=(?-])(CV-\d{4}-\d{4})(?![\w-])/gu;
/** Sau mã là tên (chữ HOA, có thể qua dấu · : — – - hoặc **) → đã đủ */
const CO_TEN_SAU = /^\**\s*[·:—–(-]?\s*\**\s*["“]?[A-ZĐÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ]/u;

export function tenNgan(ten: string, toiDa = 8): string {
  const tu = ten.replace(/\s+/g, " ").trim().split(" ");
  return tu.length <= toiDa ? tu.join(" ") : `${tu.slice(0, toiDa).join(" ")}…`;
}

/** Bản thuần (test được): gắn tên cho mã trần theo từ điển mã → tên. */
export function ganTenChoMa(text: string, tuDien: Record<string, string>): string {
  return text
    .split("\n")
    .map((dong) => {
      if (dong.trim().startsWith("|")) return dong;
      let ra = "";
      let truoc = 0;
      for (const m of dong.matchAll(MA)) {
        const ma = m[1] ?? m[2];
        const cuoi = (m.index ?? 0) + m[0].length;
        const ten = tuDien[ma];
        const sau = dong.slice(cuoi);
        const ngayTruoc = dong.slice(0, m.index).trimEnd();
        if (!ten || CO_TEN_SAU.test(sau) || ngayTruoc.endsWith("(")) continue;
        // "**CV-…**" → gắn sau dấu đóng đậm
        const dong2 = /^\*\*/.test(sau) ? 2 : 0;
        ra += dong.slice(truoc, cuoi + dong2) + ` ${tenNgan(ten)}`;
        truoc = cuoi + dong2;
      }
      return ra + dong.slice(truoc);
    })
    .join("\n");
}

/**
 * LƯỚI LUẬT 31 (chốt 27/09: khoảng ngày luôn kèm số ngày): "21/09 – 27/09/2026" → "7 ngày · 21/09 – 27/09/2026".
 * Ngày đầu thiếu năm thì lấy năm của ngày cuối (lùi một năm nếu tháng đầu lớn hơn). Đã có "N ngày ·" đứng trước thì để nguyên.
 * Test đêm 01/10 câu 6: lời dặn có luật mà Sonnet 5 vẫn viết khoảng trơn.
 */
export function ganSoNgay(text: string): string {
  return text.replace(/(\b\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?(\s*[–-]\s*)(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g, (tat, d1, m1, y1, gach, d2, m2, y2, viTri: number, goc: string) => {
    if (/\d+\s*ngày\s*[·:,(]?\s*$/.test(goc.slice(Math.max(0, viTri - 16), viTri))) return tat;
    const nam2 = Number(y2);
    const nam1 = y1 ? Number(y1) : Number(m1) > Number(m2) ? nam2 - 1 : nam2;
    const a = Date.UTC(nam1, Number(m1) - 1, Number(d1));
    const b = Date.UTC(nam2, Number(m2) - 1, Number(d2));
    const n = Math.round((b - a) / 864e5) + 1;
    if (!(n >= 1 && n <= 3660)) return tat;
    return `${n} ngày · ${d1}/${m1}${y1 ? `/${y1}` : ""}${gach}${d2}/${m2}/${y2}`;
  });
}

/**
 * Mã máy của ô / bảng / cột mẫu Word ("Ô `don_vi_lap`", "`bang_cong_viec` dòng 1") → tên hiện trên báo cáo. Test đêm 02/10 X-7:
 * /kiem-tra-mau trả lời lộ nguyên mã. Thuần (test được): `ten` = mã → nhãn. Chỉ mã có dấu gạch dưới, không đụng chữ thường.
 */
export function thayMaMau(text: string, ten: Map<string, string>): string {
  const ma = [...ten.keys()].filter((k) => /^[a-z0-9]+(?:_[a-z0-9]+)+$/.test(k)).sort((a, b) => b.length - a.length);
  if (!ma.length) return text;
  const re = new RegExp("`?(?<![A-Za-z0-9_/=?])(" + ma.join("|") + ")(?![A-Za-z0-9_])`?", "g");
  return text.replace(re, (_, k: string) => `"${ten.get(k)}"`);
}

let nhanMauNho: { luc: number; ten: Map<string, string> } | null = null;
async function nhanMau(q: Q): Promise<Map<string, string>> {
  if (nhanMauNho && Date.now() - nhanMauNho.luc < 5 * 60_000) return nhanMauNho.ten;
  const ten = new Map<string, string>();
  const { rows } = await q.query<{ dinh_nghia: { o_nhap?: { tag: string; nhan: string }[]; bang?: { tag: string; nhan: string; cot?: { tag: string; nhan: string }[] }[] } | null }>(
    "SELECT dinh_nghia FROM docflow.mau_word WHERE active",
  );
  for (const r of rows) {
    for (const b of r.dinh_nghia?.bang ?? []) {
      if (!ten.has(b.tag)) ten.set(b.tag, b.nhan);
      for (const c of b.cot ?? []) if (!ten.has(c.tag)) ten.set(c.tag, c.nhan);
    }
    for (const o of r.dinh_nghia?.o_nhap ?? []) if (!ten.has(o.tag)) ten.set(o.tag, o.nhan);
  }
  nhanMauNho = { luc: Date.now(), ten };
  return ten;
}

/** Bản dùng ở route: tra tên các mã xuất hiện trong chữ rồi gắn. */
export async function ganTenChoMaViec(q: Q, text: string): Promise<string> {
  text = ganSoNgay(text);
  if (/[a-z0-9]_[a-z0-9]/.test(text)) text = thayMaMau(text, await nhanMau(q).catch(() => new Map<string, string>()));
  const ma = [...new Set([...text.matchAll(/CV-\d{4}-\d{4}/g)].map((m) => m[0]))];
  if (!ma.length) return text;
  const { rows } = await q.query<{ id: string; ten: string }>("SELECT id, ten FROM docflow.cong_viec WHERE id = ANY($1)", [ma]);
  return ganTenChoMa(text, Object.fromEntries(rows.map((r) => [r.id, r.ten])));
}
