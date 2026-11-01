// ============================================================
// luat/kiem-ai.ts — PHẦN AI của bộ luật. Chủ: agent luat-ai.
// Gọi runAI (src/lib/ai/providers.ts). Không bao giờ để lỗi AI làm hỏng kiểm tra.
// - dichCauLuat: câu tiếng Việt → DeXuatLuat (ưu tiên dạng luật code; chi tiết ở ai/dich.ts).
// - kiemLuatAi: một lượt AI cho nhiều luật AI (ai/kiem.ts).
// - batDauKiemAi / ketQuaKiemAi: chạy nền + lưu (bảng docflow.luat_ai_ket_qua, db/37-luat-ai.sql) theo
//   (tài liệu, phiên bản, sha256 file, dấu bộ luật AI); gộp với góp ý AI trong một lượt (ai/luot.ts).
// ============================================================
import type { Q } from "@/lib/db";
import { LoiHttp } from "@/lib/phien";
import { getAIConfig } from "@/lib/ai/providers";
import { lyDoTatGopY } from "@/lib/kiem-tra/gop-y-luu";
import type { DeXuatLuat, DuLieuBaoCao, KetQuaLuatAi, LuatKiemTra, TrangThaiLuatAi } from "./types";
import type { DinhNghiaMauRutGon } from "./types-them";
import { dichCau } from "./ai/dich";
import { dauLuat, kiemLuatAiDayDu, laLuatAi, tatCaKhongRo } from "./ai/kiem";
import { khoaLuatAi, khoiDongLuotAi, luatAiApDung, viecLuat } from "./ai/luot";
import { mauGia } from "./ai/mau";

export { choLuotAiXong } from "./ai/luot";

/** Dịch câu luật tiếng Việt → đề xuất (ưu tiên dạng code; không được mới là AI). Đã kiểm tham số với mẫu. */
export async function dichCauLuat(q: Q, cau: string, apDung: string[] | "tat_ca"): Promise<DeXuatLuat> {
  return dichCau(q, cau, apDung);
}

/**
 * Kiểm các luật AI trên một báo cáo (một lượt gọi AI cho nhiều luật). Không ném:
 * AI lỗi / quá giờ / JSON hỏng → mọi luật dat null kèm thông điệp lỗi.
 * `tuyChon.mau` (tùy chọn): định nghĩa mẫu rút gọn để AI thấy nhãn ô/bảng.
 */
export async function kiemLuatAi(
  luat: LuatKiemTra[],
  bc: DuLieuBaoCao & { van_ban: string },
  mauMa: string | null,
  tuyChon?: { thoiGianChoMs?: number; model?: string; mau?: DinhNghiaMauRutGon | null },
): Promise<KetQuaLuatAi[]> {
  const ds = luat.filter((l) => l.cach_kiem === "ai" || l.cach_kiem === "ca_hai");
  if (!ds.length) return [];
  if (getAIConfig().mode === "off") return tatCaKhongRo(ds, "Kết nối AI đang tắt — chưa kiểm được luật AI");
  const r = await kiemLuatAiDayDu(ds, { ...bc, van_ban: bc.van_ban ?? "" }, mauGia(tuyChon?.mau, mauMa), tuyChon);
  return r.ket_qua;
}

// ---------------- Chạy nền + lưu ----------------

export type KetQuaLuatAiDayDu = KetQuaLuatAi & { muc: LuatKiemTra["muc"]; khi_ai_loi: LuatKiemTra["khi_ai_loi"]; ten: string };

interface HangLuatAi {
  tai_lieu_id: string;
  phien_ban: number;
  sha256: string;
  dau_luat: string;
  trang_thai: "dang_kiem" | "xong" | "loi";
  ket_qua: KetQuaLuatAi[] | string;
  loi: string | null;
  model: string | null;
}

const dsKetQua = (r: HangLuatAi): KetQuaLuatAi[] => (typeof r.ket_qua === "string" ? (JSON.parse(r.ket_qua) as KetQuaLuatAi[]) : (r.ket_qua ?? []));

/** Gắn mức / tên / khi_ai_loi HIỆN TẠI của luật vào kết quả đã lưu (đổi mức không cần kiểm lại). */
function ganLuat(kq: KetQuaLuatAi[], luat: LuatKiemTra[]): KetQuaLuatAiDayDu[] {
  const theoId = new Map(luat.map((l) => [l.id, l]));
  const ra: KetQuaLuatAiDayDu[] = [];
  for (const k of kq) {
    const l = theoId.get(k.luat_id);
    if (l) ra.push({ ...k, muc: l.muc, khi_ai_loi: l.khi_ai_loi, ten: l.ten });
  }
  return ra;
}

/** Góp ý AI có nên chạy chung lượt không: được góp ý và file chưa có góp ý xong / lỗi. */
async function canGopYDiKem(q: Q, sha256: string, mauMa: string | null): Promise<boolean> {
  try {
    if (await lyDoTatGopY(q, mauMa)) return false;
    const { rows } = await q.query("SELECT 1 FROM docflow.gop_y_ai WHERE sha256 = $1 AND trang_thai IN ('xong', 'loi') LIMIT 1", [sha256]);
    return !rows.length;
  } catch {
    return false;
  }
}

interface TuyChonNen {
  thu_lai?: boolean;
  thoiGianChoMs?: number;
}

async function xuLyKiemAi(
  q: Q,
  taiLieuId: string,
  phienBan: number,
  tuy: TuyChonNen,
): Promise<{ trang_thai: TrangThaiLuatAi; ket_qua: KetQuaLuatAiDayDu[]; loi?: string | null; model?: string | null }> {
  const { rows: pbs } = await q.query<{ phien_ban: number; sha256: string; ten_tep: string; mau_ma: string | null }>(
    `SELECT p.phien_ban, p.sha256, p.ten_tep, t.mau_ma FROM docflow.phien_ban_tep p JOIN docflow.tai_lieu t ON t.id = p.tai_lieu_id
     WHERE p.tai_lieu_id = $1 AND p.phien_ban = $2`,
    [taiLieuId, phienBan],
  );
  const pb = pbs[0];
  if (!pb) throw new LoiHttp(404, `Không có bản ${phienBan} của tài liệu này`);
  const khongCo = { trang_thai: "khong_co" as const, ket_qua: [] };
  if (!/\.(docx|docm|xlsx)$/i.test(pb.ten_tep)) return khongCo; // báo cáo Excel từ 22/10/2026
  const luat = (await luatAiApDung(q, pb.mau_ma)).filter(laLuatAi);
  if (!luat.length) return khongCo; // không có luật AI nào áp dụng → không gọi AI
  if (getAIConfig().mode === "off") {
    return { trang_thai: "loi", ket_qua: ganLuat(tatCaKhongRo(luat, "Kết nối AI đang tắt — chưa kiểm được luật AI"), luat), loi: "Kết nối AI đang tắt" };
  }
  const dau = dauLuat(luat);
  const ra = (r: HangLuatAi) => ({
    trang_thai: r.trang_thai,
    ket_qua: r.trang_thai === "dang_kiem" ? [] : ganLuat(dsKetQua(r), luat),
    loi: r.loi,
    model: r.model,
  });

  const { rows } = await q.query<HangLuatAi>("SELECT * FROM docflow.luat_ai_ket_qua WHERE tai_lieu_id = $1 AND phien_ban = $2", [taiLieuId, phienBan]);
  const cu = rows[0];
  if (cu && cu.sha256 === pb.sha256 && cu.dau_luat === dau) {
    if (cu.trang_thai === "xong") return ra(cu);
    if (cu.trang_thai === "loi" && !tuy.thu_lai) return ra(cu);
    if (cu.trang_thai === "dang_kiem" && viecLuat().has(khoaLuatAi(pb.sha256, dau))) return ra(cu);
    // lỗi + thử lại, hoặc đang chờ mà việc nền đã mất (máy chủ khởi động lại) → chạy lại
  }

  // Cùng file + cùng bộ luật đã kiểm xong ở tài liệu / phiên bản khác → dùng lại
  const { rows: daCo } = await q.query<HangLuatAi>(
    "SELECT * FROM docflow.luat_ai_ket_qua WHERE sha256 = $1 AND dau_luat = $2 AND trang_thai = 'xong' ORDER BY xong_luc DESC LIMIT 1",
    [pb.sha256, dau],
  );
  const giu = daCo[0];
  const { rows: moi } = await q.query<HangLuatAi>(
    `INSERT INTO docflow.luat_ai_ket_qua (tai_lieu_id, phien_ban, sha256, dau_luat, trang_thai, ket_qua, loi, model, bat_dau_luc, xong_luc)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, NULL, $7, now(), $8)
     ON CONFLICT (tai_lieu_id, phien_ban) DO UPDATE SET sha256 = EXCLUDED.sha256, dau_luat = EXCLUDED.dau_luat, trang_thai = EXCLUDED.trang_thai,
       ket_qua = EXCLUDED.ket_qua, loi = NULL, model = EXCLUDED.model, bat_dau_luc = now(), xong_luc = EXCLUDED.xong_luc
     RETURNING *`,
    [taiLieuId, phienBan, pb.sha256, dau, giu ? "xong" : "dang_kiem", JSON.stringify(giu ? dsKetQua(giu) : []), giu?.model ?? null, giu ? new Date().toISOString() : null],
  );
  if (!giu) {
    const gopY = await canGopYDiKem(q, pb.sha256, pb.mau_ma);
    khoiDongLuotAi({ sha256: pb.sha256, taiLieuId, phienBan, gopY, luat: { ds: luat, dau }, thoiGianChoMs: tuy.thoiGianChoMs });
  }
  return ra(moi[0]);
}

/** Chạy nền kiểm luật AI (lỗi cũ thì chạy lại; đã xong / đang chạy thì thôi). Không có luật AI → không làm gì. */
export async function batDauKiemAi(q: Q, taiLieuId: string, phienBan: number, tuy?: { thoiGianChoMs?: number }): Promise<void> {
  await xuLyKiemAi(q, taiLieuId, phienBan, { thu_lai: true, thoiGianChoMs: tuy?.thoiGianChoMs });
}

/**
 * Trạng thái + kết quả luật AI của một phiên bản. Lần hỏi đầu tự khởi động (trả 'dang_kiem', ket_qua rỗng).
 * 'khong_co' = không có luật AI áp dụng (không gọi AI). 'loi' = AI lỗi: ket_qua vẫn đủ từng luật với dat null
 * (nơi gọi áp khi_ai_loi). Lỗi không tự gọi lại — `thu_lai` (hoặc batDauKiemAi) để chạy lại.
 */
export async function ketQuaKiemAi(
  q: Q,
  taiLieuId: string,
  phienBan: number,
  tuy?: TuyChonNen,
): Promise<{ trang_thai: TrangThaiLuatAi; ket_qua: KetQuaLuatAiDayDu[]; loi?: string | null; model?: string | null }> {
  return xuLyKiemAi(q, taiLieuId, phienBan, tuy ?? {});
}
