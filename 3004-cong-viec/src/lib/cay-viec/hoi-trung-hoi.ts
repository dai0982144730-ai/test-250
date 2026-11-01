// ============================================================
// LUẬT 33 — HỎI TRÙNG TRƯỚC KHI SOẠN VIỆC, phần HỎI của agent Công việc (Mr. Đại chốt 04/10/2026)
//
// Trước khi 🤖 soạn giao một nút găng (Cây việc ⭕ · khối giao dưới thẻ Issue — cùng cửa /api/cay-viec/soan-giao), gọi cửa
// `<agent>.hoi_trung_viec` của 4 agent kia song song, chờ 15 giây/lần, gọi lại ngay · 1 phút · 3 phút (bộ điều phối ở
// chung/hoi-trung-kieu.ts). Người đang chờ ("nguoi"): trả sau lần 1, agent chưa thưa thì hỏi ngầm 2 lần còn lại.
// Luật 29: lời gọi thật `goiHoiTrungTho` KHÔNG export — chỉ đi qua `goiCoGhi` (có vết sổ). Server-only.
// ============================================================

import { goiCoGhi } from "@/lib/nhat-ky/so";
import { headerChuoi } from "@/lib/nhat-ky/chuoi";
import { dauThuNoiBo } from "@/lib/mcp/khoa-chung";
import type { BenDuocHoi, DuongGoi } from "@/lib/nhat-ky/model";
import { diaChiCongMcp } from "@/lib/chung/dia-chi-agent";
import { TEN_AGENT_NAY } from "@/lib/nguon-tien-do";
import {
  AGENT_HOI_TRUNG,
  DUOI_CONG_CU_HOI_TRUNG,
  HAN_CHO_MS,
  MA_LOI_TU_CHOI_HOI_TRUNG,
  dieuPhoiHoiTrung,
  rutGonHoiTrung,
  type CauHoiTrung,
  type GoiHoiTrung,
  type KetQuaHoiTrung,
  type TraLoiTrung,
} from "@/lib/chung/hoi-trung-kieu";

type TraVeCong = { ok: true; du_lieu?: unknown } | { ok: false; ma_loi: string; thong_diep: string };

/** ⛔ Gọi thật ra ngoài — không export; đi qua goiHoiTrungQuaSo để có vết sổ (luật 29) */
async function goiHoiTrungTho(url: string, congCu: string, thamSo: Record<string, unknown>, lyDo: string): Promise<TraVeCong> {
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headerChuoi(), ...dauThuNoiBo() }, // khoá nội bộ mọi lượt máy–máy (17/10)
      body: JSON.stringify({ cong_cu: congCu, tham_so: thamSo, agent_goi: TEN_AGENT_NAY, ly_do_goi: lyDo }),
      signal: AbortSignal.timeout(HAN_CHO_MS),
      cache: "no-store",
    });
    const j = (await r.json().catch(() => null)) as { ok?: unknown; du_lieu?: unknown; ma_loi?: unknown; thong_diep?: unknown; loi?: unknown } | null;
    if (j?.ok === true) return { ok: true, du_lieu: j.du_lieu };
    const loi = j?.loi as { ma_loi?: unknown; thong_diep?: unknown } | string | undefined;
    const ma = typeof j?.ma_loi === "string" ? j.ma_loi : typeof loi === "object" && typeof loi?.ma_loi === "string" ? loi.ma_loi : "LOI_NOI_BO";
    const tl = typeof j?.thong_diep === "string" ? j.thong_diep : typeof loi === "string" ? loi : typeof loi?.thong_diep === "string" ? loi.thong_diep : `HTTP ${r.status}`;
    return { ok: false, ma_loi: ma, thong_diep: tl };
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    return /abort|timeout/i.test(m)
      ? { ok: false, ma_loi: "HET_HAN_CHO", thong_diep: `Không thưa trong ${HAN_CHO_MS / 1000} giây` }
      : { ok: false, ma_loi: "AGENT_KHONG_SAN_SANG", thong_diep: `Không nối được (${m})` };
  }
}

function laTraLoiTrung(x: unknown): x is TraLoiTrung {
  return typeof x === "object" && x !== null && typeof (x as { trung?: unknown }).trung === "boolean";
}

/** Lời gọi một agent (đã ghi sổ) — sai khuôn / ok:false = không thưa (null); bên kia từ chối hẳn = "tu_choi" */
export function goiHoiTrungQuaSo(cau: CauHoiTrung, nc: { duong: DuongGoi; duAn?: string; nguoi?: string }): GoiHoiTrung {
  return async (ma, lan) => {
    const url = diaChiCongMcp(ma);
    if (!url) return null;
    const congCu = `${ma}.${DUOI_CONG_CU_HOI_TRUNG}`;
    const thamSo = { ...cau, agent_hoi: TEN_AGENT_NAY } as Record<string, unknown>;
    const lyDo = `Luật 33 — hỏi trùng trước khi soạn việc (lần ${lan + 1}/3): định giao "${rutGonHoiTrung(cau.noi_dung)}" vì "${rutGonHoiTrung(cau.ly_do, 80)}"`;
    const kq = await goiCoGhi(
      { agentTraLoi: ma as BenDuocHoi, congCu, thamSo, lyDoGoi: lyDo, duong: nc.duong, duAn: nc.duAn, nguoi: nc.nguoi },
      () => goiHoiTrungTho(url, congCu, thamSo, lyDo),
      (k) => ({
        traLoiGon: k.ok
          ? laTraLoiTrung(k.du_lieu)
            ? k.du_lieu.trung
              ? `trùng ${k.du_lieu.viec?.ma ?? "?"}`
              : `không trùng (${k.du_lieu.so_ung_vien} ứng viên)`
            : "khuôn lạ"
          : `lỗi ${k.ma_loi}: ${k.thong_diep}`.slice(0, 200),
      }),
    );
    if (!kq.ok && MA_LOI_TU_CHOI_HOI_TRUNG.includes(kq.ma_loi)) return "tu_choi";
    return kq.ok && laTraLoiTrung(kq.du_lieu) ? kq.du_lieu : null;
  };
}

/** Hỏi 4 agent kia (trừ chính mình — mã "base") trước khi soạn */
export function hoiTrungTruocKhiSoan(
  cau: CauHoiTrung,
  tuyChon: { cho: "nen" | "nguoi"; duong: DuongGoi; duAn?: string; nguoi?: string; sauKhiHoiNot?: (kq: KetQuaHoiTrung) => void },
): Promise<KetQuaHoiTrung> {
  const dsAgent = AGENT_HOI_TRUNG.filter((a) => a !== TEN_AGENT_NAY);
  return dieuPhoiHoiTrung(dsAgent, goiHoiTrungQuaSo(cau, tuyChon), { cho: tuyChon.cho, sauKhiHoiNot: tuyChon.sauKhiHoiNot });
}

// ── Nhớ kết quả 10 phút theo (dự án · mã WBS / issue) ──────────────────────────────────────────────────────────────────
// Một nút găng đi qua 2 bước: 🤖 soạn (hỏi trùng ở đây) → người bấm Giao việc. Bước Giao dùng lại kết quả đã hỏi, KHÔNG
// hỏi lại (đỡ một lượt 🤖 phán ở mỗi agent kia); agent chưa thưa ở lần 1 được hỏi ngầm tiếp — thấy trùng muộn thì bản nhớ
// đổi sang trùng, bước Giao chặn lại kèm câu "đã được agent … soạn". Quá 10 phút hoặc chưa từng hỏi → hỏi mới.
const NHO_MS = 10 * 60_000;
interface NhoHoi {
  kq: KetQuaHoiTrung;
  luc: number;
}
const KHOA_NHO = "__sci_cv_nho_hoi_trung__";
const nho = (): Map<string, NhoHoi> => {
  const g = globalThis as unknown as Record<string, Map<string, NhoHoi>>;
  return (g[KHOA_NHO] ??= new Map());
};

/** Khoá nhớ: nút găng theo mã WBS (Cây việc và thẻ Issue găng dùng chung), issue khác theo mã issue */
export function khoaHoiTrung(maDuAn: string, o: { maWbs?: string | null; maIssue?: string | null }): string {
  return o.maWbs ? `${maDuAn}|wbs:${o.maWbs}` : `${maDuAn}|issue:${o.maIssue ?? ""}`;
}

/** Hỏi trùng cho người đang chờ — có nhớ 10 phút (xem trên) */
export async function hoiTrungCoNho(
  khoa: string,
  cau: CauHoiTrung,
  tuyChon: { duong: DuongGoi; duAn?: string; nguoi?: string },
  bayGio: () => number = Date.now,
): Promise<KetQuaHoiTrung> {
  const cu = nho().get(khoa);
  if (cu && bayGio() - cu.luc < NHO_MS) return cu.kq;
  const kq = await hoiTrungTruocKhiSoan(cau, { cho: "nguoi", ...tuyChon, sauKhiHoiNot: (k) => nho().set(khoa, { kq: k, luc: bayGio() }) });
  nho().set(khoa, { kq, luc: bayGio() });
  return kq;
}

/** Đã giao xong → quên, lần sau (nếu có) hỏi mới */
export function quenHoiTrung(khoa: string): void {
  nho().delete(khoa);
}
