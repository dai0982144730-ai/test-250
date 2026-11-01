// ============================================================
// LUẬT 33 — HỎI TRÙNG TRƯỚC KHI SOẠN VIỆC, phần HỎI của Main (Mr. Đại chốt 04/10/2026)
//
// ② HỎI: trước khi soạn một việc giao, gọi cửa `<agent>.hoi_trung_viec` của 4 agent kia song song qua `hoiAgent` (luật 29:
//    có vết sổ), chờ 15 giây/lần, KHÔNG để hoiAgent tự thử lại — lịch gọi lại ngay · 1 phút · 3 phút ở bộ điều phối
//    (hoi-trung-kieu.ts). Cùng khuôn với bản Tiến độ — khác phần vận chuyển. Server-only.
// ============================================================

import { hoiAgent, TEN_AGENT_NAY } from "@/lib/nguon/hoi-agent";
import type { DuongGoi } from "@/lib/nhat-ky/model";
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

function laTraLoiTrung(x: unknown): x is TraLoiTrung {
  return typeof x === "object" && x !== null && typeof (x as { trung?: unknown }).trung === "boolean";
}

/** Lời gọi một agent (đã ghi sổ trong hoiAgent) — trả lời sai khuôn / ok:false = không thưa (null) */
export function goiHoiTrungQuaSo(cau: CauHoiTrung, nc: { nguoi?: string }): GoiHoiTrung {
  return async (ma, lan) => {
    const kq = await hoiAgent(
      ma,
      `${ma}.${DUOI_CONG_CU_HOI_TRUNG}`,
      `Luật 33 — hỏi trùng trước khi soạn việc (lần ${lan + 1}/3): định giao "${rutGonHoiTrung(cau.noi_dung)}" vì "${rutGonHoiTrung(cau.ly_do, 80)}"`,
      { tham_so: { ...cau, agent_hoi: TEN_AGENT_NAY }, ma_nguoi_dung: nc.nguoi, hanChoMs: HAN_CHO_MS, khongThuLai: true },
    );
    if (!kq.ok && MA_LOI_TU_CHOI_HOI_TRUNG.includes(kq.ma_loi)) return "tu_choi";
    return kq.ok && laTraLoiTrung(kq.du_lieu) ? kq.du_lieu : null;
  };
}

/**
 * Hỏi 4 agent kia trước khi soạn.
 * - cho "nguoi" (người đang chờ: trợ lý chat): trả sau lần 1; agent chưa thưa thì hỏi ngầm 2 lần còn lại → `sauKhiHoiNot`.
 * - cho "nen" (máy soạn không ai chờ): đủ 3 lần rồi mới trả.
 * `duong` giữ cùng chữ ký với bản Tiến độ / Hợp đồng — hoiAgent của Main tự ghi đường "A".
 */
export function hoiTrungTruocKhiSoan(
  cau: CauHoiTrung,
  tuyChon: { cho: "nen" | "nguoi"; duong: DuongGoi; duAn?: string; nguoi?: string; sauKhiHoiNot?: (kq: KetQuaHoiTrung) => void },
): Promise<KetQuaHoiTrung> {
  const dsAgent = AGENT_HOI_TRUNG.filter((a) => a !== TEN_AGENT_NAY);
  return dieuPhoiHoiTrung(dsAgent, goiHoiTrungQuaSo(cau, tuyChon), { cho: tuyChon.cho, sauKhiHoiNot: tuyChon.sauKhiHoiNot });
}
