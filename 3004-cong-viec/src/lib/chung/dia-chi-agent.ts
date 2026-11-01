// ============================================================
// ĐỊA CHỈ CÁC AGENT KHÁC — MỘT CHỖ DUY NHẤT (Agent Công việc, 03/10/2026)
//
// Agent Base đọc địa chỉ từ DANH BẠ AGENT (khai ở Cài đặt, kéo từ Main). Agent
// Công việc CHƯA có danh bạ và CHƯA kéo cấu hình từ Main, nên tạm thời:
//   biến môi trường URL_AGENT_TIEN_DO  →  mặc định http://127.0.0.1:3003
//
// ⚠ Cố ý dùng 127.0.0.1 thay "localhost" (giữ như Base): trên Windows "localhost"
//   có thể phân giải ra ::1 trước, cổng Next chỉ nghe IPv4 thì lời gọi chờ vô ích.
//
// Giữ đúng khuôn trả về của Base (`diaChi` · `duongDan` · `loi`) để sau này thay
// bằng đọc danh bạ Main chỉ sửa MỘT hàm này — `nguon-tien-do.ts` không phải đụng.
//
// File THUẦN — không node:fs, không mạng (luật 10).
// ============================================================

/** Mã chuẩn (A04) của agent Tiến độ */
export const MA_AGENT_TIEN_DO = "tiendo";

/** Địa chỉ mặc định của agent Tiến độ khi không đặt biến môi trường */
export const DIA_CHI_TIEN_DO_MAC_DINH = "http://127.0.0.1:3003";

/** Đường dẫn cổng MCP của agent Tiến độ */
export const DUONG_DAN_MCP_TIEN_DO = "/api/mcp/tiendo";

export interface NoiGoiAgent {
  /** Gốc địa chỉ, không có "/" cuối — vd "http://127.0.0.1:3003" */
  diaChi: string;
  /** Đường dẫn cổng MCP — vd "/api/mcp/tiendo" */
  duongDan: string;
  /** Câu tiếng Việt khi KHÔNG được gọi (agent tắt / chưa khai); null = gọi được */
  loi: string | null;
}

/** Địa chỉ mặc định của agent Main khi không đặt biến môi trường URL_AGENT_MAIN */
export const DIA_CHI_MAIN_MAC_DINH = "http://127.0.0.1:3010";

/** Gốc địa chỉ agent Main (không "/" cuối) — cổng MCP Main ở `/api/mcp/main` */
export function diaChiMain(): string {
  return (process.env.URL_AGENT_MAIN ?? "").trim().replace(/\/+$/, "") || DIA_CHI_MAIN_MAC_DINH;
}

/**
 * Nơi gọi agent Tiến độ. Đọc biến môi trường MỖI LẦN GỌI (không nhớ cấp module)
 * để test đổi được địa chỉ giữa chừng.
 */
export function noiGoiTienDo(): NoiGoiAgent {
  const tuEnv = process.env.URL_AGENT_TIEN_DO?.trim().replace(/\/+$/, "");
  return {
    diaChi: tuEnv || DIA_CHI_TIEN_DO_MAC_DINH,
    duongDan: DUONG_DAN_MCP_TIEN_DO,
    loi: null,
  };
}

/** Biến môi trường + địa chỉ mặc định cổng MCP từng agent khác (Luật 33 hỏi trùng gọi cả 4) */
const CONG_MCP: Record<string, { bien: string; macDinh: string }> = {
  tiendo: { bien: "URL_AGENT_TIEN_DO", macDinh: DIA_CHI_TIEN_DO_MAC_DINH },
  hopdong: { bien: "URL_AGENT_HOP_DONG", macDinh: "http://127.0.0.1:3012" },
  phaply: { bien: "URL_AGENT_PHAP_LY", macDinh: "http://127.0.0.1:3013" },
  main: { bien: "URL_AGENT_MAIN", macDinh: DIA_CHI_MAIN_MAC_DINH },
  // 20/10 (Mr. Đại gật cổng 4 trạng thái + hỏi trùng): Nghiệm thu trả lời hỏi trùng — thiếu dòng này 3004 coi Nghiệm thu «không thưa»
  nghiemthu: { bien: "URL_AGENT_NGHIEM_THU", macDinh: "http://127.0.0.1:3015" },
};

/** Đường đầy đủ tới cổng MCP của một agent (`…/api/mcp/<mã>`); mã lạ → null */
export function diaChiCongMcp(ma: string): string | null {
  const c = CONG_MCP[ma];
  if (!c) return null;
  const goc = (process.env[c.bien] ?? "").trim().replace(/\/+$/, "") || c.macDinh;
  return `${goc}/api/mcp/${ma}`;
}
