// ============================================================
// TRỢ LÝ DOCFLOW — MODEL & HỢP ĐỒNG API (nguồn sự thật chung)
//
// LẤY NGUYÊN khung từ agent tiến độ (chat-types.ts), chỉ đổi TÊN AGENT và BỘ
// CÔNG CỤ (quy tắc LOI-DUNG-CHUNG-v1.0): một khung chat NỔI trên mọi trang,
// người dùng hỏi tiếng Việt, trợ lý tra thư mục · sổ cái · lịch sử · mẫu Word
// rồi trả lời. Mỗi cuộc trò chuyện là 1 PHIÊN được lưu lại.
//
// HỢP ĐỒNG API:
//   GET    /api/ai/chat/sessions                 → { ok, sessions: ChatSessionMeta[] }
//   POST   /api/ai/chat/sessions  { title? }     → { ok, session }
//   PATCH  /api/ai/chat/sessions  { id, title }  → { ok, session }
//   DELETE /api/ai/chat/sessions?id=<sid>        → { ok }
//   GET    /api/ai/chat/messages?id=<sid>        → { ok, session: ChatSession }
//   POST   /api/ai/chat  { sessionId, message, dinhKem?, dinhDangXuat?, timWebBat? }
//          → { ok, reply, actions, uiActions, session }
//   Lỗi: { loi: "…" } (quy ước SCI công việc — xuLy() của phien.ts)
//
// LƯU TRỮ: data/chat/<người dùng>/<sessionId>.json — phiên là của RIÊNG từng
//          người (kết quả công cụ đã lọc theo quyền người hỏi, không chia sẻ).
// QUYỀN:   mọi người đã đăng nhập. Công cụ chỉ ĐỌC đúng phần người hỏi có quyền
//          (chat-tools.ts kiểm từng công cụ).
// ============================================================

export type ChatRole = "user" | "assistant";

/** Một hành động AI đã thực thi trong lượt trả lời (hiện dạng "chip" dưới tin nhắn) */
export interface ExecutedAction {
  name: string;
  args: Record<string, unknown>;
  ok: boolean;
  /** Câu tóm tắt tiếng Việt để hiện cho người dùng: "Đọc sổ cái: 3 việc đang mở" */
  summary: string;
}

/**
 * Việc client phải làm sau khi nhận trả lời (server không tự điều hướng được).
 * - navigate: đổi trang (router.push) — dùng cho "mở sổ cái"
 * - refresh: router.refresh()
 * (Bỏ "thaoTac", "danToiKetQua", "switchProject" của agent tiến độ — SCI công việc
 *  không có sổ lệnh giao diện và không có khái niệm dự án đang mở.)
 */
export type UiAction = { type: "navigate"; path: string } | { type: "refresh" };

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  at: string; // ISO
  /** Chỉ có ở tin nhắn assistant — các hành động đã chạy trong lượt đó */
  actions?: ExecutedAction[];
}

export interface ChatSession {
  id: string;
  /** Tự đặt từ câu hỏi đầu tiên (cắt 60 ký tự), người dùng đổi được */
  title: string;
  /** Chủ phiên = id người dùng (email chuẩn hóa) */
  owner: string;
  createdBy: string; // email
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

/** Bản rút gọn cho danh sách phiên (không kèm messages) */
export interface ChatSessionMeta {
  id: string;
  title: string;
  owner: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

// ===== BỘ CÔNG CỤ AI ĐƯỢC PHÉP GỌI =====
//
// Giao thức (giữ nguyên bản gốc): mô hình PHẢI trả về DUY NHẤT một JSON
//   { "reply": "câu trả lời tiếng Việt", "actions": [ { "name": "socai.danh_sach_viec", "args": {} } ] }
// Server thực thi actions (theo whitelist dưới đây), nhét kết quả vào hội thoại
// rồi hỏi lại mô hình — TỐI ĐA CHAT_MAX_ROUNDS vòng, sau đó buộc trả lời chốt.
// Tên lạ / tham số sai → ExecutedAction.ok=false (không throw).

export const CHAT_MAX_ROUNDS = 3;

export interface ToolSpec {
  name: string;
  /** Mô tả đưa vào system prompt — viết cho mô hình đọc */
  description: string;
  /** Mô tả tham số dạng text ngắn */
  args: string;
  /** true = có GHI dữ liệu (UI hiện chip màu cam). Bộ công cụ SCI công việc hiện CHỈ ĐỌC. */
  writes?: boolean;
}

export const TOOL_SPECS: ToolSpec[] = [
  // ----- THƯ MỤC (lớp 1) -----
  {
    name: "thumuc.cay",
    description:
      "Cây 9 đơn vị (Ban TGĐ › 4 phòng › 4 đơn vị, kèm cấp và mẫu báo cáo Form 0–8) và các thư mục của từng đơn vị (Đến, Đi, Dự án, Thùng rác) kèm số tài liệu. Ai cũng xem được cấu trúc.",
    args: "don_vi (tên/mã đơn vị, tùy chọn — bỏ trống = cả cây)",
  },
  {
    name: "thumuc.liet_ke",
    description:
      "Liệt kê tài liệu trong thư mục của một đơn vị hoặc tìm theo tên/mẫu: tên, mẫu Form, kỳ báo cáo, trạng thái, phiên bản, người tải, ngày. Dùng khi hỏi 'báo cáo tuần 29 của SCI E&C đâu', 'P.ĐT&PC nhận gì hôm nay'.",
    args: 'don_vi (tên/mã, tùy chọn), loai ("den"|"di"|"du_an"|"thung_rac"|"tat_ca", mặc định "tat_ca"), tu_khoa (tùy chọn), mau (vd "form-7", tùy chọn), gioi_han (mặc định 20, tối đa 50)',
  },
  {
    name: "thumuc.doc",
    description:
      "Đọc NỘI DUNG CHỮ của một tài liệu Word (phiên bản hiện tại hoặc bản chỉ định) kèm các ô nhập gắn mã và bảng Công việc. Chỉ đọc được khi người hỏi có quyền xem tài liệu. Dùng cho tóm tắt, trích công việc, góp ý.",
    args: "tai_lieu_id (bắt buộc — lấy từ thumuc.liet_ke), phien_ban (số, tùy chọn)",
  },
  // ----- SỔ CÁI (lớp 2) -----
  {
    name: "socai.danh_sach_viec",
    description:
      "Việc ĐANG MỞ trong sổ cái: mã việc, tên, dự án, phụ trách và từng phần việc, hạn, tiến độ (1/2), cảnh báo quá hạn/sắp đến hạn, luôn mở, nguồn hiện hành, ngày vào sổ. Dùng khi hỏi 'việc nào sắp trễ', 'còn mấy việc mở'. " +
      "Hỏi 'hôm nay / tuần này X có gì MỚI' → gọi với moi_tu (ngày bắt đầu), kèm lichsu.tra_cuu_viec (việc đã xong cùng khoảng) và baocao.tinh_hinh_nop (báo cáo vừa nộp).",
    args: 'don_vi (tên/mã, tùy chọn — vd "SCI E&C"), nguoi (tên/email, tùy chọn), du_an (tùy chọn), luon_mo (true|false, tùy chọn), canh_bao ("qua_han"|"sap_den_han", tùy chọn), tu_khoa (tùy chọn), moi_tu (yyyy-mm-dd, tùy chọn — chỉ việc vào sổ từ ngày này), gioi_han (mặc định 30, tối đa 100)',
  },
  {
    name: "socai.chi_tiet_viec",
    description:
      "Chi tiết MỘT việc (đang mở hoặc đã xong): các phần việc, người, ngày, nguồn hiện hành, các bản đã bị đè và quá trình. Dùng khi hỏi 'CV-2026-0412 đang vướng ở đâu'.",
    args: "ma_viec (bắt buộc, vd CV-2026-0412)",
  },
  {
    name: "socai.viec_cua_don_vi",
    description: "Việc đang mở của MỘT đơn vị hoặc MỘT người (gồm phần việc giao cho cả đơn vị). Dùng khi hỏi 'Phòng ĐT&PC còn mấy việc mở', 'việc của tôi'.",
    args: 'don_vi (tên/mã) HOẶC nguoi (tên/email, "toi" = chính người hỏi)',
  },
  // ----- LỊCH SỬ (lớp 3) -----
  {
    name: "lichsu.tra_cuu_viec",
    description:
      "Việc ĐÃ XONG (đã rời sổ cái: hoàn thành hoặc đóng) trong khoảng ngày. Dùng khi hỏi 'tuần trước xong những việc gì', " +
      "'X làm được gì / đã xong gì trong tuần N' (tu = thứ Hai, den = Chủ nhật của tuần N; kèm don_vi). Việc MỚI vào sổ cái không phải việc làm được.",
    args: "tu (yyyy-mm-dd, tùy chọn), den (yyyy-mm-dd, tùy chọn), don_vi (tùy chọn), du_an (tùy chọn), tu_khoa (tùy chọn)",
  },
  {
    name: "lichsu.doi_tuong",
    description: "Dòng thời gian đầy đủ của MỘT tài liệu hoặc MỘT công việc: tải lên, kiểm tra, gửi, nhận, vào sổ cái, bị đè, gia hạn, kết thúc…",
    args: 'loai ("tai_lieu"|"cong_viec"), id (mã tài liệu hoặc mã việc)',
  },
  {
    name: "lichsu.tim",
    description: "Tìm trong lịch sử thao tác theo người, đơn vị, hành động, khoảng ngày (chỉ phần người hỏi được xem).",
    args: "tu, den (yyyy-mm-dd), nguoi (tên/email), don_vi, hanh_dong (vd gui|nhan|vao_so_cai|ket_thuc_phan_viec), tu_khoa, gioi_han (mặc định 30) — đều tùy chọn",
  },
  // ----- NỘP BÁO CÁO TUẦN (test đêm 01/10: hỏi "nhà máy nào chưa nộp tuần 40" AI chỉ dò được từng đơn vị) -----
  {
    name: "baocao.tinh_hinh_nop",
    description:
      "Tình hình NỘP BÁO CÁO của một tuần, đúng như Sơ đồ tổ chức: đơn vị nào ĐÃ nộp (ngày, người nộp, bản đang dùng + link file, đúng hạn hay trễ) và CHƯA nộp (hạn, đã quá hạn chưa). " +
      "Dùng cho: 'ai/nhà máy nào chưa nộp tuần N', 'X có nộp đúng hạn không', 'tóm tắt báo cáo tuần N của X' (lấy tai_lieu_id bản đang dùng rồi đọc bằng thumuc.doc), 'tình hình <đơn vị/vùng>'.",
    args: "tuan (số tuần, vd 40 hoặc \"40/2026\"; bỏ trống = tuần này), don_vi (tùy chọn — tên/viết tắt; lấy cả các đơn vị gửi báo cáo lên đơn vị đó), chi_chua_nop (true = chỉ đơn vị chưa nộp)",
  },
  // ----- MẪU WORD -----
  {
    name: "mau.danh_sach",
    description: "Danh sách mẫu Word (Form 0–8 và mẫu thêm sau): đơn vị lập, nơi nhận mặc định, kỳ, ô nhập bắt buộc, bảng sinh việc.",
    args: "không có",
  },
  {
    name: "mau.kiem_tra",
    description:
      "Kiểm tra MỘT tài liệu trong thư mục theo mẫu (đúng mẫu, kỳ, người lập/kiểm soát, nơi nhận, bảng Công việc, ngày…) — trả lỗi chặn gửi, cảnh báo, gợi ý. File người dùng vừa kẹp vào chat đã được kiểm sẵn (xem khối file đính kèm).",
    args: "tai_lieu_id (bắt buộc), phien_ban (tùy chọn)",
  },
  // ----- ĐIỀU HƯỚNG + INTERNET (giữ từ khung gốc) -----
  {
    name: "mo_trang",
    description:
      'Mở một màn của SCI công việc cho người dùng: "/so-do" (Sơ đồ tổ chức), "/so-do?viec=<mã việc>" (mở một việc), "/du-an", "/cay-viec" (Cây việc & đường găng), "/bao-cao-tuan", "/gui-bao-cao", "/gop-y", "/mau-word", "/ky-nang". Đường dẫn khác bị từ chối.',
    args: "path (string)",
  },
  {
    // Đợt 5 (KE-HOACH/31, Mr. Đại duyệt 26/10/2026): agent con KHÔNG hỏi thẳng agent khác — hỏi Main, Main chọn agent liên quan rồi trả lời
    name: "hoi_main",
    description:
      "HỎI MAIN khi câu hỏi cần dữ liệu của agent KHÁC (tiến độ, hợp đồng, pháp lý, nghiệm thu, báo cáo toàn công ty…) mà công cụ của SCI công việc không có. " +
      "Main tự chọn agent liên quan và trả MỘT câu (mất ~1–2 phút). Viết câu hỏi đầy đủ, tự đứng được. Giữ 🤖 đầu câu khi đọc lại cho người dùng. " +
      "NHANH: nếu đã biết đúng công cụ đọc của agent khác (vd hopdong_toan_canh, phaply_han_giay_phep, nghiemthu_lich_nghiem_thu, base_lich_hop) thì điền thêm cong_cu + tham_so — Main chạy ngay bằng code, vài giây, không dùng AI; tên lạ thì Main trả danh sách tên hợp lệ.",
    args: "cau_hoi (string, đầy đủ ý, tự đứng được), cong_cu? (tên công cụ đã biết), tham_so? (object tham số của công cụ đó)",
  },
  {
    name: "tim_kiem_web",
    description:
      "Tìm thông tin TRÊN INTERNET. Chỉ dùng khi người dùng đã bật nút 🌐 và câu hỏi cần thứ KHÔNG có trong SCI công việc (quy định mới, văn bản pháp luật, tin tức). TUYỆT ĐỐI không dùng để tra tài liệu, sổ cái, lịch sử. Khi trả lời phải dẫn địa chỉ trang.",
    args: "query (chuỗi từ khoá, nên viết tiếng Việt)",
  },
];

/** Cắt tiêu đề phiên từ câu hỏi đầu tiên */
export function titleFromMessage(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t === "") return "Phiên mới";
  return t.length <= 60 ? t : t.slice(0, 57) + "…";
}
