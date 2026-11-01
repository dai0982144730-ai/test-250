// ============================================================
// CỬA CHUYỂN CÔNG CỤ QUA MAIN — `main.chuyen_cong_cu` (KE-HOACH/31 đợt 5, đường «lai» Mr. Đại chốt 28/10/2026)
//
// Câu có công cụ rõ («đường găng», «hồ sơ K-09 đã giao ai chưa»): trợ lý agent con đã hiểu câu, biết cần công cụ nào + tham số gì →
// gửi cho Main; Main KIỂM QUYỀN theo người hỏi, chạy công cụ bằng CODE (không gọi AI), ghi sổ (luật 29), trả nguyên kết quả.
// Câu tự do / ghép nhiều agent vẫn đi `main.tra_loi_cau_hoi` (có AI của Main).
//
// Đo 28/10 (tk2, 5 câu): qua Main-AI 24–67 giây, 43–164 nghìn token; gọi thẳng cổng 0,1–2,4 giây, 0 token AI.
// Chỉ công cụ ĐỌC trong bảng cổng + vài công cụ đọc của Tiến độ; công cụ ghi / tìm web / AI viết không qua đường này.
// Kết quả đã qua khuôn danh sách (khuon-danh-sach-thuan.ts) như chat Main — nhờ chạy bằng `runTool`.
// ============================================================

import { CONG_AGENT_KHAC, CONG_TIEN_DO, runTool, type ToolContext } from "@/lib/ai/chat-tools";
import { giaiNguoiVaDuAn } from "@/lib/mcp/cua-hoi-cheo";
import { duocCaiDat } from "@/lib/quyen";
import { thanhCong, thatBai, type KhuonTra } from "@/lib/mcp/khuon";

/** Công cụ đọc khác của Tiến độ (làm trong Main, không nằm trong hai bảng cổng) */
const DOC_NOI_BO = ["find_tasks", "list_alerts", "project_summary"] as const;

/** Tên công cụ được chuyển — suy từ hai bảng cổng, không khai tay (luật 7) */
export function congCuChuyenDuoc(): string[] {
  return Array.from(new Set([...Object.keys(CONG_TIEN_DO), ...Object.keys(CONG_AGENT_KHAC), ...DOC_NOI_BO])).sort();
}

export const MO_TA_CHUYEN_CONG_CU = {
  ten: "main.chuyen_cong_cu",
  mo_ta:
    "Trợ lý agent con xin Main chạy MỘT công cụ đọc của agent khác. Main kiểm quyền theo người hỏi, chạy bằng code (không AI), trả nguyên kết quả " +
    "(đã qua khuôn danh sách). Công cụ lạ → trả danh sách tên hợp lệ. Dùng khi đã biết công cụ nào; câu tự do dùng main.tra_loi_cau_hoi.",
  tham_so: "cong_cu, tham_so?, nguoi_hoi (email), ma_du_an?, cau_goc? (câu người dùng gõ, để nhận «xem hết»)",
  san_sang: true,
} as const;

export async function chuyenCongCu(thamSo: Record<string, unknown>, agentGoi: string): Promise<KhuonTra> {
  const ten = typeof thamSo.cong_cu === "string" ? thamSo.cong_cu.trim() : "";
  const hopLe = congCuChuyenDuoc();
  if (ten === "" || !hopLe.includes(ten)) {
    return thatBai(
      "KHONG_HIEU_YEU_CAU",
      `${ten === "" ? "Thiếu `cong_cu`." : `Công cụ «${ten}» không có trong danh sách được chuyển.`} Công cụ hợp lệ: ${hopLe.join(", ")}.`,
    );
  }
  const nd = giaiNguoiVaDuAn(thamSo, "chạy công cụ thay họ");
  if (!nd.ok) return nd.kq;
  const args = thamSo.tham_so !== null && typeof thamSo.tham_so === "object" && !Array.isArray(thamSo.tham_so) ? (thamSo.tham_so as Record<string, unknown>) : {};
  const ctx: ToolContext = {
    projectId: nd.duAn.id,
    email: nd.email,
    role: duocCaiDat(nd.nguoi.role) ? "pm" : "engineer",
    loai: nd.nguoi.role,
    userMessage: typeof thamSo.cau_goc === "string" ? thamSo.cau_goc : "",
    timWebBat: false,
  };
  const bd = Date.now();
  let r: Awaited<ReturnType<typeof runTool>>;
  try {
    r = await runTool(ten, args, ctx);
  } catch (e) {
    return thatBai("LOI_NOI_BO", `Main không chạy được ${ten}: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!r.ok) return thatBai("KHONG_CO_DU_LIEU", r.summary);
  return thanhCong(
    { cong_cu: ten, ket_qua: r.summary, du_lieu: r.data ?? null, mat_ms: Date.now() - bd },
    [{ loai: "main-chuyen-cong-cu", ma: `${agentGoi}>${ten}`, file_goc: `công cụ ${ten} của Main (chạy bằng code)`, thoi_diem_trich: new Date().toISOString() }],
    nd.canhBao,
  );
}
