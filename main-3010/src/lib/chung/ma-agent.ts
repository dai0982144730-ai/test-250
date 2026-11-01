// ============================================================
// MÃ AGENT CHUẨN — MỘT ĐỊNH NGHĨA CHO CẢ HỆ (Mr. Đại chốt A04, 22/09/2026)
//
// Mã chuẩn = TÊN CỔNG MCP, KHÔNG GẠCH: tiendo · hopdong · base · phaply · main.
// Trước 22/09 sổ nhật ký ghi một con bằng hai tên ("tien-do"/"tiendo",
// "base-agent"/"base"…) nên đếm theo agent nào cũng lệch. Từ nay:
//   · MỌI chỗ ghi sổ và gửi `agent_goi` đi qua `chuanHoaMaAgent`
//   · Đọc sổ cũ vẫn gộp đúng nhờ chuẩn hoá lúc đọc — KHÔNG sửa file sổ cũ
//
// File này THUẦN (không node:fs) — màn hình client import được (luật 10).
// Bản giống hệt nằm ở 5 bộ code; sửa một nơi thì chép sang nơi kia.
// ============================================================

// 26/09/2026: thêm `quansat` — Agent quan sát (cổng 3014), agent thứ sáu của hệ
export const MA_AGENT_CHUAN = ["tiendo", "hopdong", "base", "phaply", "main", "quansat"] as const;
export type MaAgentChuan = (typeof MA_AGENT_CHUAN)[number];

/** Bí danh gặp trong sổ cũ / danh bạ cũ → mã chuẩn (khoá đã bỏ hết ký tự không phải chữ-số) */
const BI_DANH: Record<string, MaAgentChuan> = {
  baseagent: "base",
  agentbase: "base",
  agenttiendo: "tiendo",
  agentphaply: "phaply",
  agenthopdong: "hopdong",
  agentmain: "main",
  mainagent: "main",
  agentquansat: "quansat",
  conquansat: "quansat",
};

/** Bỏ dấu nối/gạch dưới/khoảng trắng, hạ chữ thường, rồi tra bí danh. `"tien-do"` → `"tiendo"`. */
export function chuanHoaMaAgent(tho: string): string {
  const s = (tho ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return BI_DANH[s] ?? s;
}

/**
 * Agent KHÔNG giữ dữ liệu nghiệp vụ — chỉ quan sát cả hệ (26/09/2026). Main
 * không gom issue / báo cáo từ những con này; đo sức khoẻ và ma trận vẫn có.
 */
export const MA_AGENT_KHONG_NGHIEP_VU: readonly string[] = ["quansat"];

export function laAgentNghiepVu(ma: string): boolean {
  return !MA_AGENT_KHONG_NGHIEP_VU.includes(chuanHoaMaAgent(ma));
}

export function laMaAgentChuan(s: string): s is MaAgentChuan {
  return (MA_AGENT_CHUAN as readonly string[]).includes(s);
}

/**
 * Chuẩn hoá cột "ai hỏi" của sổ: bốn bí danh cũ quy về mã chuẩn, còn tên lạ
 * (kiem-thu, man-hinh-do, do-22-09…) GIỮ NGUYÊN — đó là nhãn người đặt khi đo,
 * không phải agent, bóp thành "kiemthu" là mất nghĩa.
 */
export function chuanHoaAgentHoi(tho: string): string {
  const c = chuanHoaMaAgent(tho);
  return laMaAgentChuan(c) ? c : (tho ?? "").trim();
}
