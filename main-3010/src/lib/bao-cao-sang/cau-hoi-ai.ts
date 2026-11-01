// ============================================================
// 🤖 CÂU HỎI QUYẾT ĐỊNH CHO TỪNG DÒNG BÁO CÁO SÁNG  (server-only — gọi LLM)
// MD: PLAN-MAIN-AGENT mục 6.3 (sửa 25/09) · phân vai LLM ↔ code (chốt 06/09)
//
// LLM làm vai ② "đọc số → viết tiếng người": code đưa vào đúng dòng vấn đề +
// số ảnh hưởng + dòng đầu dự án; LLM viết MỘT câu hỏi "→ …?" để Giám đốc quyết.
//
// ⛔ Cấm bịa số ngoài khung: câu nào có con số không nằm trong khung code đưa vào
//    thì BỎ câu đó (`cauHoiHopLe`). Bỏ câu chứ không bỏ dòng — phần số vẫn gửi.
// ⛔ LLM lỗi / hết hạn mức / quá giờ → không có câu hỏi, báo cáo VẪN GỬI.
// ⛔ Luật 29: đi qua `goiCoGhi` — sổ nhật ký có vết lượt gọi LLM.
// 💰 MỘT lượt gọi cho cả bản báo cáo, không gọi từng dòng.
// ============================================================

import { runAI } from "@/lib/ai/providers";
import { goiCoGhi } from "@/lib/nhat-ky/so";
import type { DuongGoi } from "@/lib/nhat-ky/model";
import { cauHoiHopLe, ganTenCauHoi, khungSoCua, type DauDuAn, type VanDeSang } from "./luat-cod";
import { ghepHeTheoKhung, ghepSoVoiChoQuaHan, quaLuoiLuat36 } from "./khoi";
import { LUAT_MA_KEM_TEN } from "@/lib/chung/ma-kem-ten";
import { LUAT_NHANH_CHAM_THEO_NGAY } from "@/lib/chung/luat-nhanh-cham";

const HAN_CHO_MS = 120_000;

const HE_THONG =
  "Bạn là trợ lý của Giám đốc Ban quản lý dự án điện gió/thủy điện. Với MỖI vấn đề " +
  "làm chậm mốc COD tôi đưa, viết MỘT câu hỏi ngắn để Giám đốc quyết ngay (chọn phương án, " +
  "giao ai, có chấp nhận không). " +
  "⛔ CHỈ dùng con số có trong dòng dữ liệu của chính vấn đề đó; không thêm số, ngày, hạn, " +
  "tỷ lệ nào khác; không có số cũng được. Không giải thích, không chào. " +
  "Dòng có HAI số khác nghĩa (vd số ngày VIỆC chậm và số ngày COD của DỰ ÁN lùi) thì nói rõ mỗi số là của cái gì, không gộp, không gán số của dự án cho việc. " +
  "⛔ KHÔNG đặt thời hạn xử lý («trong 7 ngày», «trước ngày …», «ngay hôm nay» có số): đó là số không có trong dữ liệu nên câu bị bỏ. " +
  "Mỗi câu ≤ 25 từ, tiếng Việt, kết thúc bằng dấu '?'. " +
  "Trả về đúng mỗi vấn đề một dòng theo khuôn: <số thứ tự>|<câu hỏi>. " +
  LUAT_MA_KEM_TEN +
  " " +
  LUAT_NHANH_CHAM_THEO_NGAY;

/**
 * Khung một vấn đề = khung số của luat-cod + TÊN việc của mã WBS (26/09 — mã kèm
 * tên). Tên vào cả khung soát số: tên việc có chữ số ("Móng trụ T12") thì câu
 * hỏi nhắc lại tên không bị loại oan vì "số ngoài khung".
 */
function khungCua(v: VanDeSang, dau: DauDuAn | undefined): string {
  const k = khungSoCua(v, dau);
  return v.wbs && v.tenWbs ? `${k} | tên việc ${v.wbs}: ${v.tenWbs}` : k;
}

export interface KetQuaCauHoi {
  /** Số câu gắn được vào dòng */
  soCau: number;
  /** Số câu LLM viết mà bị loại vì có số ngoài khung / sai khuôn */
  soBiLoai: number;
  /** null = chạy được; chuỗi = vì sao không có câu hỏi (LLM lỗi, hết hạn mức…) */
  loi: string | null;
}

function dungPrompt(ds: readonly VanDeSang[], dauCua: (ma: string) => DauDuAn | undefined): string {
  const d = ds.map((v, i) => `${i + 1}. ${khungCua(v, dauCua(v.maDuAn))}`);
  return "Các vấn đề làm chậm COD sáng nay (mỗi dòng: vấn đề | số ảnh hưởng | dòng đầu dự án):\n" + d.join("\n");
}

/**
 * Gắn `cauHoi` vào từng vấn đề (sửa TẠI CHỖ). Không bao giờ ném lỗi.
 */
export async function ganCauHoi(
  ds: VanDeSang[],
  duAn: readonly DauDuAn[],
  duong: DuongGoi,
  ngay: string,
): Promise<KetQuaCauHoi> {
  if (ds.length === 0) return { soCau: 0, soBiLoai: 0, loi: null };
  const dauCua = (ma: string) => duAn.find((x) => x.maDuAn === ma);
  let raw = "";
  try {
    raw = String(
      await goiCoGhi(
        {
          agentHoi: "main",
          agentTraLoi: "llm",
          congCu: "bao_cao_sang.cau_hoi_quyet",
          thamSo: { ngay, soVanDe: ds.length },
          lyDoGoi: `báo cáo sáng ${ngay}: viết câu hỏi quyết định 🤖 cho ${ds.length} việc làm chậm COD (luật 25/09)`,
          duong,
        },
        () =>
          Promise.race([
            // 26/10/2026: tắt «nghĩ ngầm» của CLI — đo sổ dùng AI 25/10: 4 dòng trả lời mà token ra 5.700–11.000, chạy 89–179 giây (3/6 lượt quá 120 giây → 0 câu 🤖)
            runAI(dungPrompt(ds, dauCua), HE_THONG, undefined, { tokenNghi: 0 }),
            new Promise<string>((_, tuChoi) =>
              setTimeout(() => tuChoi(new Error(`LLM không trả lời trong ${HAN_CHO_MS / 1000} giây`)), HAN_CHO_MS),
            ),
          ]),
        (kq) => ({ traLoiGon: `${String(kq).split("\n").filter((x) => x.includes("|")).length} câu hỏi` }),
      ),
    );
  } catch (e) {
    return { soCau: 0, soBiLoai: 0, loi: e instanceof Error ? e.message : "LLM lỗi không rõ" };
  }

  let soCau = 0;
  let soBiLoai = 0;
  for (const dong of raw.split("\n")) {
    const m = /^\s*(\d+)\s*[|.:)]\s*(.+)$/.exec(dong);
    if (!m) continue;
    const i = Number(m[1]) - 1;
    const v = ds[i];
    if (!v) continue;
    // «quá hạn N ngày» thiếu «so với …» → code ghép «so với hạn đã đặt» (Mr. Đại đồng ý 26/10); chậm/trễ không rõ hệ vẫn bị lưới bỏ
    // 28/10/2026 (anh duyệt A): «chậm / lùi N ngày» thiếu «so với …» thì ghép hệ LẤY TỪ KHUNG của chính dòng (đúng con số N, một hệ duy nhất)
    const cau = ghepHeTheoKhung(
      ghepSoVoiChoQuaHan(m[2].trim().replace(/^→\s*/, "").replace(/^["“]|["”]$/g, "").trim()),
      khungCua(v, dauCua(v.maDuAn)),
    );
    // ⭐ 17/10/2026 (KE-HOACH/23 mục 8, Main việc 4): câu nói «chậm / dời / trễ N ngày» mà thiếu «so với …» cũng bị loại (luật 36)
    if (cauHoiHopLe(cau, khungCua(v, dauCua(v.maDuAn))) && quaLuoiLuat36(cau)) {
      // Lưới an toàn "mã kèm tên" (26/09): LLM vẫn viết mã trơn thì code chèn tên việc;
      // LLM đã tự viết tên sau mã thì để nguyên (kiểm độc lập 04/10 ⚪6 — chống lặp tên)
      v.cauHoi = ganTenCauHoi(cau, v.wbs, v.tenWbs);
      soCau += 1;
    } else soBiLoai += 1;
  }
  return { soCau, soBiLoai, loi: soCau === 0 && soBiLoai === 0 ? "LLM trả lời không đúng khuôn — bỏ câu hỏi" : null };
}
