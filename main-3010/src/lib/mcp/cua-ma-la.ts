// ============================================================
// CỬA MÃ LẠ Ở CỔNG MAIN — phần THUẦN (Mr. Đại chốt sáng 04/10/2026, trả lời phiên "0 Kiểm tra độc lập":
// "cổng Main xử mã lạ NHƯ AGENT CON").
//
// Chép LUẬT MÃ LẠ của agent con (`src/lib/mcp/cua-ma-tran.ts` ở 5-Agent-tien-do · 6-Agent-cong-viec, chốt 24/09):
// "kiem-doc-lap", "do-kiem", "man-hinh-do"… là nhãn bài đo nội bộ, KHÔNG phải agent, nên không có hàng nào
// trong Danh bạ / ma trận:
//   · có khoá nội bộ hợp lệ (header x-sci-noi-bo = sha256("noi-bo:"+AUTH_SECRET)) → CHO QUA kèm cảnh báo,
//     sổ ghi `agent_goi` ĐÚNG NHƯ GỬI (không quy về mã agent nào);
//   · không có khoá → CHẶN như trước, câu dặn gửi khoá.
// Mã của agent trong hệ hoặc đã khai Danh bạ → trả null: đi tiếp ma trận `duocGoiKhong` như cũ.
// Trước 04/10 Main chặn MỌI mã chưa khai Danh bạ kể cả có khoá → bài đo của phiên kiểm phải giả danh agent thật.
// ============================================================

import { MA_AGENT_CHUAN, chuanHoaMaAgent } from "@/lib/chung/ma-agent";
import { timAgent, type KhaiAgent } from "@/lib/danh-ba-agent";
import { NHAN_CHO_CHAN } from "@/lib/ma-tran-goi/model";

export type KetQuaMaLa = null | { duoc: true; canhBao: string } | { duoc: false; lyDo: string };

/** null = không phải mã lạ (xét ma trận như thường) */
export function xetMaLa(agentGoi: string, coKhoaNoiBo: boolean, danhBa: KhaiAgent[]): KetQuaMaLa {
  const goi = chuanHoaMaAgent(agentGoi);
  if (goi === "") return null;
  if ((MA_AGENT_CHUAN as readonly string[]).includes(goi) || timAgent(danhBa, goi)) return null;
  if (coKhoaNoiBo) {
    return {
      duoc: true,
      canhBao: `Mã gọi "${agentGoi}" không phải agent trong ma trận — cho qua vì có khoá nội bộ (bài đo), sổ ghi đúng mã đã gửi.`,
    };
  }
  return {
    duoc: false,
    lyDo: `Mã gọi "${agentGoi}" không phải agent nào trong ma trận — ${NHAN_CHO_CHAN}. Bài đo nội bộ phải gửi kèm khoá nội bộ (header x-sci-noi-bo).`,
  };
}
