// ============================================================
// DANH BẠ AGENT — khai bằng CẤU HÌNH, không gắn cứng trong code
//
// ⛔ LUẬT: KHÔNG được viết cứng "4 agent" hay "5 agent" ở bất kỳ đâu.
//    Người điều khiển tự khai muốn nối mấy con, con nào, ở địa chỉ nào,
//    và bật hay tắt từng con. Hôm nay 5 con, mai thêm con quan sát thành 6,
//    mốt bớt còn 2 — code KHÔNG phải sửa dòng nào.
//
// Khuôn này lấy đúng theo `core.nang_luc_agent` của PLAN-TONG-THE mục 6.5:
//    ma_agent · dang_bat · … và luật "agent nào dang_bat = false thì BỎ QUA
//    và NÓI RÕ, không gọi rồi ngồi chờ hết hạn" (HOP-DONG-KET-NOI 8.1 điều 5).
//
// Về sau kho chung PostgreSQL dựng xong thì bảng này đọc thẳng từ
// `core.nang_luc_agent` — chỉ đổi hàm docDanhBa(), phần còn lại giữ nguyên.
//
// File THUẦN — không đụng node:fs, màn hình import được (luật 10).
// ============================================================

/** Một dòng khai agent trong danh bạ */
export interface KhaiAgent {
  /** Mã ngắn, trùng với tên schema: tiendo · phaply · hopdong · base · main… */
  ma: string;
  /** Tên hiện ra màn hình */
  ten: string;
  /** Địa chỉ gốc, ví dụ http://127.0.0.1:3003 hoặc https://tiendo.scigroup.vn */
  diaChi: string;
  /** Đường dẫn cổng MCP của agent đó */
  duongDanMcp: string;
  /**
   * Bật/tắt. Tắt thì BỎ QUA và nói rõ — không gọi rồi ngồi chờ hết hạn.
   * Đây là chỗ người điều khiển quyết nối mấy con.
   */
  dangBat: boolean;
  /**
   * ⭐ Thư mục code của agent — để CON QUAN SÁT chạy bộ test cho nó.
   * Để trống thì chỉ quan sát được qua mạng (sức khoẻ, nhật ký), không
   * chạy test được. Cũng khai bằng cấu hình, không gắn cứng.
   */
  thuMucCode?: string;

  /** Ghi chú của người khai — ví dụ "chưa dựng", "đang bảo trì" */
  ghiChu?: string;
}

/**
 * Danh bạ MẶC ĐỊNH — chỉ là điểm khởi đầu để màn Cài đặt có gì mà sửa.
 * Người dùng thêm/bớt/tắt tuỳ ý; code không phụ thuộc vào danh sách này.
 *
 * Năm dòng dưới đây lấy từ HOP-DONG-KET-NOI mục 1 (bản đồ agent). Cổng
 * localhost dùng cho giai đoạn chạy trên máy; lên máy chủ thì sửa cột địa chỉ
 * thành tên miền con, KHÔNG phải sửa code.
 */
/**
 * ⚠ CỐ Ý dùng 127.0.0.1 chứ KHÔNG dùng localhost — đo thật 06/09/2026:
 *
 *   fetch("http://localhost:3013")  → ECONNREFUSED
 *   fetch("http://127.0.0.1:3013")  → OK
 *
 * Node phân giải `localhost` ra IPv6 (`::1`) TRƯỚC. Agent chạy chế độ sản
 * phẩm với HOSTNAME=0.0.0.0 chỉ nghe IPv4 nên từ chối. Chạy `next dev` thì
 * nghe cả hai stack nên KHÔNG AI THẤY — lỗi chỉ nổ khi lên máy chủ thật, và
 * không bộ test nào bắt được vì test cũng chạy ở chế độ dev.
 *
 * Lên tên miền thì đổi cột Địa chỉ thành https://... , lúc đó IPv6 không sao.
 */
export const DANH_BA_MAC_DINH: KhaiAgent[] = [
  {
    ma: "base",
    ten: "Agent Công việc",
    diaChi: "http://127.0.0.1:3004",
    duongDanMcp: "/api/mcp/base",
    dangBat: true,
    thuMucCode: "D:/3 SETUP/1 AI/SCI Tiến độ/SCI-AI-AGENT/6-Agent-cong-viec/CodeSCICongViec",
    ghiChu: "Từ 04/10/2026 agent Công việc (cổng 3004) nhận vai agent Base — giữ mã base và /api/mcp/base; nguồn việc = sổ cái agent Công việc",
  },
  {
    ma: "tiendo",
    ten: "Agent Tiến độ",
    diaChi: "http://127.0.0.1:3003",
    duongDanMcp: "/api/mcp/tiendo",
    dangBat: true,
    ghiChu:
      "Nguồn số liệu thi công — WBS, đường găng, khối lượng. Code con này KHÔNG nằm trong thư mục SCI-AI-AGENT; muốn con quan sát chạy được bộ test của nó thì tự điền cột Thư mục code.",
  },
  {
    ma: "phaply",
    ten: "Agent Pháp lý",
    diaChi: "http://127.0.0.1:3013",
    duongDanMcp: "/api/mcp/phaply",
    dangBat: false,
    thuMucCode: "D:/SCI-AI-AGENT/3-agent-phap-ly-code",
    ghiChu: "Bật khi bản nâng cấp chạy ở cổng 3013",
  },
  {
    ma: "hopdong",
    ten: "Agent Hợp đồng",
    diaChi: "http://127.0.0.1:3012",
    duongDanMcp: "/api/mcp/hopdong",
    dangBat: false,
    thuMucCode: "D:/SCI-AI-AGENT/2-agent-hop-dong",
    ghiChu: "Bật khi Agent Hợp đồng chạy ở cổng 3012",
  },
  {
    // CHÍNH app này. Có mặt trong danh bạ để con quan sát soi được cả bản thân
    // nó — bộ test của Main cũng phải nằm trong bảng, không tự miễn trừ.
    // (Trước 07/09/2026 dòng "Chính app đang chạy màn này" nằm nhầm ở mục
    //  Agent Base — di sản lúc fork từ bộ Base.)
    ma: "main",
    ten: "Main Agent",
    diaChi: "http://127.0.0.1:3010",
    duongDanMcp: "/api/mcp/main",
    dangBat: true,
    thuMucCode: "D:/SCI-AI-AGENT/4-agent-main",
    ghiChu:
      "Chính app đang chạy màn này. Main KHÔNG mở công cụ nghiệp vụ — chỉ nang_luc/suc_khoe + ba công cụ hạ tầng (cấu hình chung · ma trận gọi · danh bạ).",
  },
  {
    // 26/09/2026: agent thứ sáu — quan sát trực quan 5 agent phối hợp. CHỈ ĐỌC.
    ma: "quansat",
    ten: "Agent quan sát",
    diaChi: "http://localhost:3014",
    duongDanMcp: "/api/mcp/quansat",
    dangBat: true,
    ghiChu:
      "Quan sát cả hệ: gọi 3 cửa nhật ký + suc_khoe + nang_luc của mọi agent, không gọi công cụ ghi. Không giữ dữ liệu nghiệp vụ.",
  },
  {
    // 20/10/2026: agent thứ bảy — nghiệm thu (cổng 3015). Máy đã khai sẵn ở data/cai-dat-base.json; có mặt ở đây để máy mới dựng cũng có.
    ma: "nghiemthu",
    ten: "Agent Nghiệm thu",
    diaChi: "http://127.0.0.1:3015",
    duongDanMcp: "/api/mcp/nghiemthu",
    dangBat: true,
    ghiChu: "Kịch bản nghiệm thu lập trước thi công. Main gom đề xuất giao việc (issue chưa thành việc) qua 3 cửa viec_cho_duyet.",
  },
];

/** Chuẩn hoá một dòng khai — chịu được dữ liệu cũ hoặc thiếu trường */
export function chuanHoaKhai(v: Partial<KhaiAgent>): KhaiAgent | null {
  const ma = (v.ma ?? "").trim();
  if (ma === "") return null;
  const diaChi = (v.diaChi ?? "").trim().replace(/\/+$/, "");
  let duongDan = (v.duongDanMcp ?? "").trim();
  if (duongDan === "") duongDan = `/api/mcp/${ma}`;
  if (!duongDan.startsWith("/")) duongDan = "/" + duongDan;
  return {
    ma,
    ten: (v.ten ?? "").trim() || ma,
    diaChi,
    duongDanMcp: duongDan,
    dangBat: v.dangBat !== false,
    thuMucCode: (v.thuMucCode ?? "").trim() || undefined,
    ghiChu: (v.ghiChu ?? "").trim() || undefined,
  };
}

/** Lọc ra những agent ĐANG BẬT và có địa chỉ — số lượng bao nhiêu là tuỳ khai */
export function cacAgentDangBat(danhBa: KhaiAgent[]): KhaiAgent[] {
  return danhBa.filter((a) => a.dangBat && a.diaChi !== "");
}

/** Tra một agent theo mã. Không có trong danh bạ = coi như không tồn tại */
export function timAgent(danhBa: KhaiAgent[], ma: string): KhaiAgent | undefined {
  const t = ma.trim().toLowerCase();
  return danhBa.find((a) => a.ma.toLowerCase() === t);
}

/**
 * Vì sao một agent không gọi được — trả về câu tiếng Việt để hiện thẳng
 * lên màn hình, thay vì để người dùng đoán.
 */
export function lyDoKhongGoiDuoc(danhBa: KhaiAgent[], ma: string): string | null {
  const a = timAgent(danhBa, ma);
  if (!a) {
    return `Chưa khai agent "${ma}" trong Danh bạ agent (Cài đặt). Thêm một dòng rồi bật lên.`;
  }
  if (!a.dangBat) {
    return `Agent "${a.ten}" đang TẮT trong Danh bạ agent${a.ghiChu ? ` — ${a.ghiChu}` : ""}.`;
  }
  if (a.diaChi === "") {
    return `Agent "${a.ten}" chưa khai địa chỉ trong Danh bạ agent.`;
  }
  return null;
}

