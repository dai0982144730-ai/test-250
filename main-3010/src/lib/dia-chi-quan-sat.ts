// ============================================================
// ĐỊA CHỈ AGENT QUAN SÁT — server-only (đọc danh bạ trên đĩa)
//
// Mr. Đại chốt 26/09/2026: mọi thứ "xem nhật ký hỏi–đáp / sức khoẻ agent" gom
// về MỘT nơi là Agent quan sát (mã `quansat`). Các màn cũ ở đây chỉ còn một
// dòng dẫn sang đó. Địa chỉ lấy từ DANH BẠ AGENT (Main → Cài đặt → Danh bạ
// agent), KHÔNG gắn cứng — lên máy chủ đổi địa chỉ ở danh bạ là đủ.
// ============================================================

import { docDanhBaAgent } from "@/lib/cai-dat-base";
import { timAgent } from "@/lib/danh-ba-agent";

export const MA_QUAN_SAT = "quansat";

/** Câu dẫn duy nhất — màn cũ, menu, trợ lý đều dùng đúng câu này */
export const CAU_DAN_QUAN_SAT = "Nhật ký hỏi–đáp và sức khoẻ các agent nay xem ở Agent quan sát";

export type DiaChiQuanSat = { ok: true; diaChi: string; ten: string } | { ok: false; lyDo: string };

export function diaChiQuanSat(): DiaChiQuanSat {
  let a;
  try {
    a = timAgent(docDanhBaAgent(), MA_QUAN_SAT);
  } catch (e) {
    return { ok: false, lyDo: `Không đọc được danh bạ agent: ${e instanceof Error ? e.message : String(e)}` };
  }
  if (!a) return { ok: false, lyDo: "Danh bạ agent chưa khai Agent quan sát (mã quansat) — khai ở Cài đặt → Danh bạ agent." };
  if (!a.dangBat) return { ok: false, lyDo: `${a.ten} đang TẮT trong danh bạ agent.` };
  if (a.diaChi === "") return { ok: false, lyDo: `${a.ten} chưa khai địa chỉ trong danh bạ agent.` };
  return { ok: true, diaChi: a.diaChi, ten: a.ten };
}
