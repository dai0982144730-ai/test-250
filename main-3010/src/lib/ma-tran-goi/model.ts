// ============================================================
// MA TRẬN "AI ĐƯỢC GỌI AI" — hàng = agent GỌI, cột = agent ĐƯỢC GỌI
//
// Yêu cầu gốc của Mr. Thịnh: *"và lựa chọn Agent giao tiếp với nhau thể theo
// dõi"* — chọn được con nào gọi được con nào, chọn xong theo dõi được.
//
// ⛔ SỐ AGENT KHÔNG GẮN CỨNG. Kích thước ma trận = số dòng trong Danh bạ
// agent (`lib/danh-ba-agent`). Khai 2 con → 2×2, khai 6 con → 6×6, không sửa
// một dòng code nào. Đây là luật người dùng nhấn mạnh nhất.
//
// MA TRẬN CÓ HIỆU LỰC THẬT, không phải bảng trang trí: `duocGoiKhong()` là
// hàm cổng MCP `/api/mcp/main` gọi để TỪ CHỐI lời gọi bị cấm.
//
// File này THUẦN — không đụng node:fs, màn hình client import được (luật 10).
// ============================================================

import { cacAgentDangBat, timAgent, type KhaiAgent } from "@/lib/danh-ba-agent";
import { chuanHoaMaAgent } from "@/lib/chung/ma-agent";

/** Câu nhận dạng chỗ chặn — cả cổng MCP lẫn màn hình dùng chung một chuỗi */
export const NHAN_CHO_CHAN = "bị chặn ở màn Ai được gọi ai";

export interface MaTranGoi {
  /**
   * Ô đã khai tay: khoá `"<agentGoi>><agentDuocGoi>"` → bật/tắt.
   * Ô KHÔNG có mặt trong bảng này = chưa ai đụng tới, theo `macDinhChoGoi`.
   * Lưu thưa như vậy để thêm agent mới không phải sinh lại cả bảng.
   */
  o: Record<string, boolean>;
  /**
   * Ô chưa khai thì cho gọi hay cấm gọi. Mặc định CHO — giai đoạn này
   * HOP-DONG-KET-NOI mục 10 nói xác thực *"mở hoàn toàn"*; siết sẵn sẽ làm
   * cả hệ đứng mà không ai hiểu vì sao.
   */
  macDinhChoGoi: boolean;
}

export const MA_TRAN_RONG: MaTranGoi = { o: {}, macDinhChoGoi: true };

// ─────────────────────────────────────────────────────────────
// Chuẩn hoá mã agent — định nghĩa DUY NHẤT ở lib/chung/ma-agent.ts (A04 22/09)
// ─────────────────────────────────────────────────────────────

export { chuanHoaMaAgent };

/** Khoá một ô. Dùng ở mọi nơi để không có hai cách đánh khoá lệch nhau. */
export function khoaO(agentGoi: string, agentDuocGoi: string): string {
  return `${chuanHoaMaAgent(agentGoi)}>${chuanHoaMaAgent(agentDuocGoi)}`;
}

// ─────────────────────────────────────────────────────────────
// Cửa chặn — thứ làm ma trận có hiệu lực thật
// ─────────────────────────────────────────────────────────────

export interface KetQuaChan {
  duoc: boolean;
  /** Câu tiếng Việt hiện thẳng cho bên gọi — không để ai ngồi đoán vì sao bị từ chối */
  lyDo: string;
}

/**
 * MỘT AGENT CÓ ĐƯỢC GỌI AGENT KIA KHÔNG.
 *
 * Thứ tự xét cố ý như sau, từ lý do RÕ NHẤT tới lý do chung nhất:
 *   ① tự gọi chính mình → cấm, đây là vòng A→A (HOP-DONG-KET-NOI 6.2)
 *   ② có danh bạ mà bên nào đó không có trong đó → cấm, nói rõ thiếu ai
 *   ③ ô đã khai tay → theo đúng ô
 *   ④ còn lại → theo `macDinhChoGoi`
 *
 * `danhBa` để trống thì bỏ qua bước ②: cổng MCP luôn truyền vào, còn test và
 * các chỗ chỉ quan tâm tới ô thì không cần dựng cả danh bạ.
 */
export function duocGoiKhong(
  agentGoi: string,
  agentDuocGoi: string,
  maTran: MaTranGoi = MA_TRAN_RONG,
  danhBa?: KhaiAgent[]
): KetQuaChan {
  const goi = chuanHoaMaAgent(agentGoi);
  const nhan = chuanHoaMaAgent(agentDuocGoi);

  if (goi === "" || nhan === "") {
    return {
      duoc: false,
      lyDo: `Thiếu tên agent gọi hoặc agent được gọi — ${NHAN_CHO_CHAN}.`,
    };
  }

  if (goi === nhan) {
    return {
      duoc: false,
      lyDo: `Agent "${goi}" tự gọi chính nó — đây là vòng gọi A→A, ${NHAN_CHO_CHAN}.`,
    };
  }

  if (danhBa) {
    const aGoi = timAgent(danhBa, goi);
    const aNhan = timAgent(danhBa, nhan);
    if (!aGoi) {
      return {
        duoc: false,
        lyDo: `Chưa khai agent "${goi}" trong Danh bạ agent nên không có hàng nào cho nó — ${NHAN_CHO_CHAN}.`,
      };
    }
    if (!aNhan) {
      return {
        duoc: false,
        lyDo: `Chưa khai agent "${nhan}" trong Danh bạ agent nên không có cột nào cho nó — ${NHAN_CHO_CHAN}.`,
      };
    }
    if (!aNhan.dangBat) {
      return {
        duoc: false,
        lyDo: `Agent "${aNhan.ten}" đang TẮT trong Danh bạ agent nên không có cột trong ma trận — ${NHAN_CHO_CHAN}.`,
      };
    }
    if (!aGoi.dangBat) {
      return {
        duoc: false,
        lyDo: `Agent "${aGoi.ten}" đang TẮT trong Danh bạ agent nên không có hàng trong ma trận — ${NHAN_CHO_CHAN}.`,
      };
    }
  }

  const k = khoaO(goi, nhan);
  const daKhai = Object.prototype.hasOwnProperty.call(maTran.o, k);
  const bat = daKhai ? maTran.o[k] === true : maTran.macDinhChoGoi;

  if (!bat) {
    return {
      duoc: false,
      lyDo: daKhai
        ? `Ô "${goi} → ${nhan}" đang TẮT, ${NHAN_CHO_CHAN}. Muốn cho gọi thì mở màn Ai được gọi ai và tích ô đó.`
        : `Ô "${goi} → ${nhan}" chưa khai và ma trận đang đặt mặc định CẤM, ${NHAN_CHO_CHAN}.`,
    };
  }
  return { duoc: true, lyDo: `Ô "${goi} → ${nhan}" đang bật.` };
}

// ─────────────────────────────────────────────────────────────
// Dựng bảng cho màn hình
// ─────────────────────────────────────────────────────────────

export interface OMaTran {
  agentGoi: string;
  tenGoi: string;
  agentDuocGoi: string;
  tenDuocGoi: string;
  /** Đường chéo — một agent với chính nó, không có ô tích */
  duongCheo: boolean;
  bat: boolean;
  /** false = đang theo mặc định, chưa ai khai tay ô này */
  daKhai: boolean;
  // 26/09 (Mr. Đại chốt): BỎ số lượt gọi đọc từ sổ (soLuot · soLoi · lượt gần
  // nhất) — số liệu quan sát thuộc Agent quan sát. Màn này chỉ còn là CẤU HÌNH.
}

export interface BangMaTran {
  /** Các agent làm nên hàng và cột — bao nhiêu con là do Danh bạ quyết */
  agent: KhaiAgent[];
  /** hang[i][j] — i là agent gọi, j là agent được gọi */
  hang: OMaTran[][];
  /** Kích thước cạnh, để màn hình và test khỏi tự đếm */
  canh: number;
  soODangBat: number;
}

/**
 * Dựng bảng ma trận. Hàng/cột lấy từ Danh bạ agent ĐANG BẬT — agent tắt thì
 * bỏ qua và nói rõ, không gọi rồi ngồi chờ hết hạn (HOP-DONG-KET-NOI 8.1 điều 5).
 */
export function dungMaTran(
  danhBa: KhaiAgent[],
  maTran: MaTranGoi
): BangMaTran {
  const agent = cacAgentDangBat(danhBa);
  let soODangBat = 0;

  const hang: OMaTran[][] = agent.map((g) =>
    agent.map((n) => {
      const duongCheo = g.ma === n.ma;
      const k = khoaO(g.ma, n.ma);
      const daKhai = Object.prototype.hasOwnProperty.call(maTran.o, k);
      const bat = duongCheo ? false : daKhai ? maTran.o[k] === true : maTran.macDinhChoGoi;
      if (bat) soODangBat += 1;

      return {
        agentGoi: g.ma,
        tenGoi: g.ten,
        agentDuocGoi: n.ma,
        tenDuocGoi: n.ten,
        duongCheo,
        bat,
        daKhai,
      };
    })
  );

  return { agent, hang, canh: agent.length, soODangBat };
}

/** Nhận một ô người dùng vừa tích, trả về ma trận mới — không sửa bản cũ tại chỗ */
export function datO(
  maTran: MaTranGoi,
  agentGoi: string,
  agentDuocGoi: string,
  bat: boolean
): MaTranGoi {
  const goi = chuanHoaMaAgent(agentGoi);
  const nhan = chuanHoaMaAgent(agentDuocGoi);
  // Đường chéo không có ô tích — nhận vào thì lặng lẽ bỏ qua, đỡ phải bắt lỗi
  // ở cả màn hình lẫn route.
  if (goi === "" || nhan === "" || goi === nhan) return maTran;
  return { ...maTran, o: { ...maTran.o, [khoaO(goi, nhan)]: bat } };
}
