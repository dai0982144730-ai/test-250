// ============================================================
// luat/ai/kiem.ts — KIỂM LUẬT AI trên một báo cáo: dựng yêu cầu (một lượt cho nhiều luật), đọc câu trả lời.
// Dùng chung phần chữ báo cáo với góp ý AI (dungNoiDungBaoCao). Có bản GỘP góp ý + luật trong một lượt.
// ============================================================
import { createHash } from "node:crypto";
import type { MauWord } from "@/lib/types";
import type { NoiDungWord } from "@/lib/kiem-tra/doc-word";
import { runAIGan } from "@/lib/ai/providers";
import { coHan, docDeXuat, thayMaBangTen, dungNoiDungBaoCao, dungYeuCauGopY, ganViTri, GIOI_HAN_CHU, layJson, choCaHang } from "@/lib/kiem-tra/gop-y-ai";
import type { DanhBa } from "@/lib/kiem-tra/phan-giai";
import type { DuLieuBaoCao, KetQuaLuatAi, LuatKiemTra } from "../types";

/** Thời gian chờ mặc định cho một lượt kiểm luật AI. */
export const THOI_GIAN_CHO_LUAT_AI_MS = 60_000;
/** Độ dài tối đa hướng dẫn của một luật đưa cho AI. */
const GIOI_HAN_HUONG_DAN = 800;

export { thayMaBangTen };

export type BaoCaoAi = DuLieuBaoCao & { van_ban: string };

/** Luật cần AI kiểm: cach_kiem 'ai' | 'ca_hai', đang bật, chưa xóa, có câu / hướng dẫn. */
export function laLuatAi(l: LuatKiemTra): boolean {
  return (l.cach_kiem === "ai" || l.cach_kiem === "ca_hai") && l.bat && !l.da_xoa && !l.he_thong && !!(l.huong_dan_ai || l.cau_luat || "").trim();
}

/** Dấu phiên bản của bộ luật AI: đổi nội dung / thêm / bớt luật → dấu khác → kiểm lại. Đổi mức không cần kiểm lại. */
export function dauLuat(luat: LuatKiemTra[]): string {
  const goc = luat
    .map((l) => [l.id, (l.huong_dan_ai || "").trim(), (l.cau_luat || "").trim()])
    .sort((a, b) => a[0].localeCompare(b[0]));
  return createHash("sha256").update(JSON.stringify(goc)).digest("hex").slice(0, 32);
}

/** Mã ngắn cho AI (L1, L2…) — tránh AI chép sai id dài. */
const maNgan = (i: number) => `L${i + 1}`;

export const HUONG_DAN_LUAT = `Mỗi LUẬT là một yêu cầu về nội dung báo cáo. Với TỪNG luật, phán:
- "dat": true nếu báo cáo thỏa luật; false nếu vi phạm; null nếu nội dung được đưa không đủ để kết luận (nói rõ vì sao).
  Luật áp cho nhiều dòng: chỉ cần MỘT dòng vi phạm là false, và "thong_diep" phải nói ĐÚNG dòng vi phạm — không kể dòng đạt.
- "thong_diep": vi phạm → nêu rõ chỗ sai và nên sửa gì; đạt → một câu ngắn xác nhận. Tiếng Việt, ngày dd/mm/yyyy, tối đa 200 ký tự.
  Gọi bảng / cột / ô bằng TÊN hiện trên báo cáo (vd bảng "Sự cố & bất thường", cột "KL thiết kế"), KHÔNG viết mã máy (bang_…, kl_…).
- "vi_tri": một mã trong VỊ TRÍ HỢP LỆ chỉ tới chỗ vi phạm (bỏ trống nếu không chỉ được). Vi phạm nằm ở một ô thì ghi đủ ô
  ("o:<mã ô>" hoặc "bang:<mã bảng>:<dòng>:<cột>").
- "sua" (chỉ khi dat=false và vi_tri là một ô): TOÀN BỘ chữ mới nên thay cho cả ô để thỏa luật. Không bịa số liệu, tên,
  ngày không có trong báo cáo — không viết được thì bỏ trường "sua".
Chỉ dựa vào nội dung được đưa, không bịa. Trả lời ĐỦ mọi luật, đúng "id" (L1, L2…).`;

export const HE_THONG_LUAT = `Bạn là người KIỂM LUẬT báo cáo của SCI công việc, chạy TỰ ĐỘNG sau khi người dùng tải báo cáo lên.
${HUONG_DAN_LUAT}
ĐẦU RA: CHỈ MỘT đối tượng JSON, không markdown, không chữ nào khác:
{"luat":[{"id":"L1","dat":true|false|null,"thong_diep":"...","vi_tri":"...","sua":"..."}]}`;

function dongLuat(luat: LuatKiemTra[]): string {
  return luat
    .map((l, i) => {
      const hd = (l.huong_dan_ai || l.cau_luat).trim().replace(/\s+/g, " ");
      return `- id=${maNgan(i)} (${l.ten}): ${hd.length > GIOI_HAN_HUONG_DAN ? `${hd.slice(0, GIOI_HAN_HUONG_DAN)}…` : hd}`;
    })
    .join("\n");
}

/** Yêu cầu CHỈ kiểm luật (không góp ý). */
export function dungYeuCauLuat(luat: LuatKiemTra[], bc: BaoCaoAi, mau: MauWord): { system: string; prompt: string } {
  const { viTri, khoi } = dungNoiDungBaoCao(bc, mau);
  const noiDung = [`MẪU: ${mau.ten || mau.ma || "(không rõ)"}${mau.ma ? ` (mã ${mau.ma})` : ""}`, `VỊ TRÍ HỢP LỆ (vi_tri phải là một trong các mã này):\n${viTri.join("\n") || "(không có)"}`, ...khoi].join("\n\n");
  const prompt = [
    noiDung.length > GIOI_HAN_CHU.tong ? `${noiDung.slice(0, GIOI_HAN_CHU.tong)}…(đã cắt)` : noiDung,
    `=== LUẬT CẦN KIỂM ===\n${dongLuat(luat)}`,
    `Trả về JSON {"luat":[...]} như hướng dẫn.`,
  ].join("\n\n");
  return { system: HE_THONG_LUAT, prompt };
}

/** Yêu cầu GỘP: góp ý nội dung (như cũ) + kiểm luật AI — một lượt AI cho mỗi file. */
export function dungYeuCauGop(luat: LuatKiemTra[], noiDung: NoiDungWord, mau: MauWord, danhBa?: DanhBa | null): { system: string; prompt: string } {
  const g = dungYeuCauGopY(noiDung, mau, danhBa);
  const system = `${g.system}

=== VIỆC THỨ HAI TRONG CÙNG LƯỢT: KIỂM LUẬT CỦA ĐƠN VỊ ===
${HUONG_DAN_LUAT}
ĐẦU RA GỘP (thay cho đầu ra ở trên): CHỈ MỘT đối tượng JSON, không markdown:
{"gop_y":[...như trên...],"luat":[{"id":"L1","dat":true|false|null,"thong_diep":"...","vi_tri":"...","sua":"..."}]}`;
  const prompt = `${g.prompt}\n\n=== LUẬT CẦN KIỂM (trả trong mảng "luat") ===\n${dongLuat(luat)}\n\nTrả về JSON {"gop_y":[...],"luat":[...]} như hướng dẫn.`;
  return { system, prompt };
}

/** Mọi luật không kết luận được (AI lỗi / quá giờ / JSON hỏng). */
export function tatCaKhongRo(luat: LuatKiemTra[], thongDiep: string): KetQuaLuatAi[] {
  return luat.map((l) => ({ luat_id: l.id, dat: null, thong_diep: thongDiep }));
}

/** Câu AI khẳng định luật được thỏa ("đạt yêu cầu", "không vi phạm", "khớp luật", "thực ra đạt", "… — đạt.", luật không áp cho dòng này). */
const CAU_KHANG_DINH_DAT = /đạt yêu cầu|không vi phạm|khớp luật|thực ra đạt|đạt luật|thỏa luật|không thuộc phạm vi (của )?luật|[—:–-]\s*đạt\s*\.?\s*$/i;
/** Câu nêu chỗ sai — có thì giữ nguyên kết luận không đạt. */
const CAU_NEU_SAI = /không đạt|chưa đạt|vi phạm ở|nhưng dòng|riêng dòng [^,.;]* (thiếu|sai|chưa)|cần (bổ sung|sửa)|nên (sửa|bổ sung)/i;

/** Đọc câu trả lời → kết quả từng luật. JSON hỏng / thiếu mảng "luat" → ném lỗi. Luật AI bỏ sót → dat null. */
export function phanTichLuatAi(text: string, luat: LuatKiemTra[], bc: BaoCaoAi, mau: MauWord): KetQuaLuatAi[] {
  const j = layJson(text);
  const ds = Array.isArray(j) ? j : j && typeof j === "object" && Array.isArray((j as { luat?: unknown }).luat) ? (j as { luat: unknown[] }).luat : null;
  if (!ds) throw new Error('AI trả lời JSON thiếu mảng "luat"');
  const theoId = new Map<string, Record<string, unknown>>();
  for (const x of ds) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const id = String(o.id ?? o.luat_id ?? "").trim();
    if (id && !theoId.has(id)) theoId.set(id, o);
  }
  const nd = { mau_ma: mau.ma || null, ...bc } as NoiDungWord;
  return luat.map((l, i) => {
    const o = theoId.get(maNgan(i)) ?? theoId.get(maNgan(i).toLowerCase()) ?? theoId.get(l.id) ?? theoId.get(l.ma);
    if (!o) return { luat_id: l.id, dat: null, thong_diep: "AI không trả lời cho luật này" };
    let dat = typeof o.dat === "boolean" ? o.dat : o.dat === "true" ? true : o.dat === "false" ? false : null;
    const td = [o.thong_diep, o.ly_do, o.message].find((v) => typeof v === "string" && v.trim()) as string | undefined;
    // AI tự mâu thuẫn (đo 30/09: 2/5 báo cáo): dat=false nhưng câu giải thích khẳng định đạt, không nêu chỗ sai → coi là đạt
    if (dat === false && td && CAU_KHANG_DINH_DAT.test(td) && !CAU_NEU_SAI.test(td)) dat = true;
    const thongDiep = thayMaBangTen((td ?? (dat === true ? "Đạt" : dat === false ? "Không đạt" : "AI không kết luận được")).trim().replace(/\s+/g, " "), mau).slice(0, 500);
    const viTri = ganViTri(o.vi_tri, nd, mau);
    const deXuat = dat === false ? docDeXuat(o, viTri) : undefined;
    return { luat_id: l.id, dat, thong_diep: thongDiep, ...(viTri ? { vi_tri: viTri } : {}), ...(deXuat ? { de_xuat: deXuat } : {}) };
  });
}

// ---------------- Gọi AI ----------------

export interface TuyChonKiemLuat {
  model?: string;
  thoiGianChoMs?: number;
}

/** Một lượt AI cho nhiều luật. Không ném: AI lỗi / quá giờ / JSON hỏng → mọi luật dat null, `loi` ghi lý do. */
export async function kiemLuatAiDayDu(luat: LuatKiemTra[], bc: BaoCaoAi, mau: MauWord, tuy: TuyChonKiemLuat = {}): Promise<{ ket_qua: KetQuaLuatAi[]; loi: string | null }> {
  if (!luat.length) return { ket_qua: [], loi: null };
  const ms = tuy.thoiGianChoMs ?? THOI_GIAN_CHO_LUAT_AI_MS;
  try {
    const { system, prompt } = dungYeuCauLuat(luat, bc, mau);
    const text = await coHan(runAIGan("lib/luat/ai/kiem", prompt, system, undefined, tuy.model, ms, true), choCaHang(ms), `AI không trả lời sau ${Math.round((choCaHang(ms)) / 1000)} giây`);
    return { ket_qua: phanTichLuatAi(text, luat, bc, mau), loi: null };
  } catch (e) {
    const ly = (e instanceof Error ? e.message : String(e)).slice(0, 300);
    return { ket_qua: tatCaKhongRo(luat, `AI không kiểm được luật này: ${ly}`), loi: ly };
  }
}
