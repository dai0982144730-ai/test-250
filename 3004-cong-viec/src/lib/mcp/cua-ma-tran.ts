// ============================================================
// CỬA CHẶN "AI ĐƯỢC GỌI AI" Ở CỔNG CỦA AGENT CON — phần THUẦN (lô sửa 24/09/2026)
//
// VÌ SAO (đo 24/09 khi viết file hiện trạng): ma trận ở màn "Ai được gọi ai"
// của Main chỉ MAIN thi hành. Cổng tiến độ và cổng Base vẫn trả lời công cụ
// nghiệp vụ cho mã lạ `do-kiem` và cho ô đã bị tắt — tích ô ở Main không có
// tác dụng gì với hai cổng này.
//
// Cách làm: cổng kéo CỘT của chính nó từ Main (`main.ma_tran_goi` → `goi_toi`:
// ai được gọi tới mình, kèm câu lý do do Main tính bằng `duocGoiKhong` — một
// định nghĩa, không chép luật sang đây), nhớ tạm 10 phút; Main tắt thì dùng
// bản nhớ gần nhất; chưa từng kéo được thì CHO QUA và ghi cảnh báo (agent
// phải sống được khi Main tắt). Phần kéo/nhớ nằm ở `ma-tran-cong.ts`.
//
// ⭐ LUẬT MÃ LẠ (Mr. Đại chốt trong lô 24/09) — "do-kiem", "kiem-thu",
//    "do-22-09"… là nhãn bài đo nội bộ, KHÔNG phải agent, nên không có hàng
//    nào trong ma trận:
//      · có khoá nội bộ hợp lệ (header x-sci-noi-bo = sha256("noi-bo:"+AUTH_SECRET))
//        → VẪN CHO QUA để bài đo không hỏng, và sổ ghi `agent_goi` ĐÚNG NHƯ GỬI
//        (không quy về mã agent nào);
//      · không có khoá → CHẶN, câu "bị chặn ở màn Ai được gọi ai của Main".
//
// Hai công cụ bắt buộc `suc_khoe` · `nang_luc` (HOP-DONG-KET-NOI mục 4) không đi
// qua ma trận — giống cổng Main (KHONG_QUA_MA_TRAN).
//
// Bản giống hệt ở 1-agent-base và 5-Agent-tien-do (chỉ khác dòng import mã agent). Agent Công việc chép nguyên
// 04/10/2026 khi nhận vai agent Base (cổng /api/mcp/base, mã "base").
// ============================================================

import { chuanHoaMaAgent } from "@/lib/chung/ma-agent";
import { xetLuatQuanSat } from "@/lib/nhat-ky/cua-quan-sat";

export const NHAN_CHO_CHAN = "bị chặn ở màn Ai được gọi ai của Main";
/** Câu Main dùng trong `ly_do` — thiếu chữ "của Main" nên bổ sung khi chuyển tiếp */
const NHAN_CUA_MAIN = "bị chặn ở màn Ai được gọi ai";

export const CONG_CU_KHONG_QUA_MA_TRAN: readonly string[] = ["suc_khoe", "nang_luc"];

/** Năm mã agent chuẩn của hệ — mã ngoài danh sách này và ngoài cột Main giao là MÃ LẠ */
// 26/09/2026: thêm `quansat` — Agent quan sát (cổng 3014), chỉ được gọi công cụ đọc (xetLuatQuanSat)
const MA_AGENT_HE: readonly string[] = ["tiendo", "hopdong", "base", "phaply", "main", "quansat"];

/** Một ô của CỘT "ai được gọi tới agent này" do Main giao */
export interface OGoiToi {
  ma: string;
  duoc: boolean;
  lyDo: string;
}

export interface BanMaTran {
  /** ms — lúc kéo thành công */
  luc: number;
  goiToi: OGoiToi[];
}

export type KetQuaXet =
  | { duoc: true; laMaLa: boolean; canhBao: string | null }
  | { duoc: false; lyDo: string };

export interface DauVaoXet {
  agentGoi: string;
  /** mã chuẩn của CHÍNH cổng này: "base" · "tiendo" */
  maNay: string;
  congCu: string;
  coKhoaNoiBo: boolean;
  ban: BanMaTran | null;
  /** true = Main không thưa lần gần nhất, `ban` là bản nhớ cũ hơn 10 phút */
  banCu: boolean;
}

function kemCuaMain(lyDo: string): string {
  if (lyDo.includes(NHAN_CHO_CHAN)) return lyDo;
  if (lyDo.includes(NHAN_CUA_MAIN)) return lyDo.replace(NHAN_CUA_MAIN, NHAN_CHO_CHAN);
  return `${lyDo} — ${NHAN_CHO_CHAN}.`;
}

function gioPhut(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function xetQuyenGoi(v: DauVaoXet): KetQuaXet {
  if (CONG_CU_KHONG_QUA_MA_TRAN.includes(v.congCu)) return { duoc: true, laMaLa: false, canhBao: null };

  const goi = chuanHoaMaAgent(v.agentGoi);
  // ⭐ 26/09: luật theo CÔNG CỤ — quansat chỉ đọc; hội thoại chỉ quansat đọc (ma trận theo cặp không diễn đạt được)
  const luatQs = xetLuatQuanSat(goi, v.congCu, `agent "${v.maNay}"`, v.coKhoaNoiBo);
  if (!luatQs.duoc) return { duoc: false, lyDo: luatQs.lyDo };
  const maCot = new Set((v.ban?.goiToi ?? []).map((o) => chuanHoaMaAgent(o.ma)));
  const laMaHe = MA_AGENT_HE.includes(goi) || maCot.has(goi) || goi === v.maNay;

  // ── Mã lạ: nhãn bài đo nội bộ ──
  if (!laMaHe) {
    if (v.coKhoaNoiBo) {
      return {
        duoc: true,
        laMaLa: true,
        canhBao: `Mã gọi "${v.agentGoi}" không phải agent trong ma trận — cho qua vì có khoá nội bộ (bài đo), sổ ghi đúng mã đã gửi.`,
      };
    }
    return {
      duoc: false,
      lyDo:
        `Mã gọi "${v.agentGoi}" không phải agent nào trong ma trận — ${NHAN_CHO_CHAN}. ` +
        `Bài đo nội bộ phải gửi kèm khoá nội bộ (header x-sci-noi-bo).`,
    };
  }

  if (goi === v.maNay) {
    return { duoc: false, lyDo: `Agent "${goi}" tự gọi chính nó — vòng gọi A→A, ${NHAN_CHO_CHAN}.` };
  }

  // ── Chưa từng kéo được ma trận: cho qua, nói rõ ──
  if (v.ban === null) {
    return {
      duoc: true,
      laMaLa: false,
      canhBao: "Chưa từng kéo được ma trận Ai được gọi ai từ Main (Main tắt?) — tạm cho qua, chưa soát quyền.",
    };
  }

  const o = v.ban.goiToi.find((x) => chuanHoaMaAgent(x.ma) === goi);
  if (!o) {
    return {
      duoc: false,
      lyDo: `Agent "${goi}" chưa khai trong Danh bạ agent của Main nên không có hàng nào trong ma trận — ${NHAN_CHO_CHAN}.`,
    };
  }
  if (!o.duoc) return { duoc: false, lyDo: kemCuaMain(o.lyDo || `Ô "${goi} → ${v.maNay}" đang tắt`) };
  return {
    duoc: true,
    laMaLa: false,
    canhBao: v.banCu ? `Main không thưa — đang soát quyền bằng bản ma trận nhớ lúc ${gioPhut(v.ban.luc)}.` : null,
  };
}

/** Bóc `goi_toi` trong câu trả lời `main.ma_tran_goi`. Main cũ chưa giao cột → null */
export function bocGoiToi(duLieu: unknown): OGoiToi[] | null {
  if (!duLieu || typeof duLieu !== "object") return null;
  const ds = (duLieu as { goi_toi?: unknown }).goi_toi;
  if (!Array.isArray(ds)) return null;
  const ra: OGoiToi[] = [];
  for (const x of ds) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const ma = String(o.ma ?? "").trim();
    if (ma === "") continue;
    ra.push({ ma, duoc: o.duoc === true, lyDo: typeof o.ly_do === "string" ? o.ly_do : "" });
  }
  return ra;
}
