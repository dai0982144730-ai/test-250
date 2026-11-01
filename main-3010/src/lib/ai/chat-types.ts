// ============================================================
// TRỢ LÝ AI ĐIỀU KHIỂN ỨNG DỤNG — MODEL & HỢP ĐỒNG API (nguồn sự thật chung)
//
// Ý tưởng: một khung chat NỔI trên mọi tab. Người dùng gõ tiếng Việt, AI vừa
// trả lời vừa THỰC THI hành động trong ứng dụng (đi hỏi 4 agent qua cổng, giao
// việc Base, mở tab, đổi dự án...). Mỗi cuộc trò chuyện là 1 PHIÊN được
// lưu lại để mở đọc lại sau.
//
// HỢP ĐỒNG API (các agent triển khai đúng theo đây):
//   GET    /api/ai/chat/sessions?project=<id>   (pm|engineer)
//          → { ok, sessions: ChatSessionMeta[] }  — mới nhất trước
//   POST   /api/ai/chat/sessions  body { title? } (+?project=)
//          → { ok, session: ChatSessionMeta }     — tạo phiên mới
//   PATCH  /api/ai/chat/sessions  body { id, title }
//          → { ok, session: ChatSessionMeta }     — đổi tên phiên
//   DELETE /api/ai/chat/sessions?id=<sid>
//          → { ok }                               — xóa phiên (chính chủ hoặc pm)
//   GET    /api/ai/chat/messages?id=<sid>
//          → { ok, session: ChatSession }         — toàn bộ tin nhắn của phiên
//   POST   /api/ai/chat  body { sessionId, message } (+?project=)
//          → { ok, reply, actions: ExecutedAction[], uiActions: UiAction[],
//              choDuyet: ViecChoGon[], session: ChatSessionMeta }
//          → 400 { ok:false, message } khi CHƯA cấu hình AI (aiMode="off")
//   POST   /api/ai/chat/xac-nhan  body { id, hanhDong: "lam" | "bo" }  (25/09)
//          → { ok, trangThai, cau, action?, uiActions, choDuyet }
//          — bấm ✅ Làm / ❌ Bỏ một công cụ GHI đang chờ (lib/ai/cho-duyet*.ts)
//
// LƯU TRỮ: data/projects/<id>/chat/<sessionId>.json (dự án "default" → data/chat/)
//          — dùng projectDataDir() của src/lib/projects.ts, KHÔNG tự ghép "data".
// QUYỀN:   mọi loại tài khoản chat được (cửa "xem"); MỖI công cụ khai `cua`
//          (xem · ghi · caidat · pheduyet) và bị cổng kiemCongCu chặn theo
//          ma trận quyen.ts. Công cụ GHI không chạy ngay — chờ bấm ✅ Làm.
// ============================================================

import type { BuocGiaoDien } from "@/lib/lenh/mo-hinh";
import type { Cua } from "@/lib/quyen";

export type ChatRole = "user" | "assistant";

/** Một hành động AI đã thực thi trong lượt trả lời (hiện dạng "chip" dưới tin nhắn) */
export interface ExecutedAction {
  name: string;
  args: Record<string, unknown>;
  ok: boolean;
  /** Câu tóm tắt tiếng Việt để hiện cho người dùng: "Đã cập nhật % WBS 4.2.1 → 46%" */
  summary: string;
}

/**
 * Việc client phải làm sau khi nhận trả lời (server không tự điều hướng được).
 * - navigate: đổi trang (router.push) — dùng cho "mở tab Gantt"
 * - switchProject: gọi POST /api/projects/select rồi reload
 * - refresh: router.refresh() để tải lại dữ liệu trang hiện tại
 */
export type UiAction =
  | { type: "navigate"; path: string }
  /** Trợ lý TỰ THAO TÁC giao diện (chốt 06/09) — client chạy dãy bước bằng
      sổ lệnh `lib/lenh/danh-muc.ts`, có con trỏ ảo cho người nhìn thấy */
  | { type: "thaoTac"; buoc: BuocGiaoDien[] }
  /**
   * LÀM & DUYỆT (Mr. Đại chốt 06/09): công cụ nặng chạy xong thì TỰ dẫn người
   * dùng tới màn kết quả và tô sáng chỗ cần xem. Do CODE gắn vào kết quả công
   * cụ, không phải trợ lý nhớ gọi — nhờ vậy chỉ tốn MỘT vòng LLM.
   */
  | {
      type: "danToiKetQua";
      trang: string;
      /** Chỗ cần xem: data-wbs + một dòng nói vì sao đáng xem */
      toSang?: { wbs: string; vi?: string }[];
      /** Câu nhắc hiện trên thanh khi tới nơi */
      nhac?: string;
    }
  | { type: "switchProject"; projectId: string }
  | { type: "refresh" };

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
  /** Phiên gắn với 1 dự án — mở dự án khác sẽ thấy danh sách phiên khác */
  projectId: string;
  createdBy: string; // email
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

/** Bản rút gọn cho danh sách phiên (không kèm messages) */
export interface ChatSessionMeta {
  id: string;
  title: string;
  projectId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

// ===== BỘ CÔNG CỤ AI ĐƯỢC PHÉP GỌI =====
//
// Giao thức: mô hình PHẢI trả về DUY NHẤT một JSON dạng
//   { "reply": "câu trả lời tiếng Việt cho người dùng",
//     "actions": [ { "name": "duong_gang", "args": {} } ] }
// Server thực thi actions (theo whitelist dưới đây), nhét kết quả vào hội thoại
// rồi hỏi lại mô hình — TỐI ĐA CHAT_MAX_ROUNDS vòng, sau đó buộc trả lời chốt.
// Mọi tên/tham số lạ đều bị BỎ QUA kèm ExecutedAction.ok=false (không throw).

export const CHAT_MAX_ROUNDS = 3;

export interface ToolSpec {
  name: string;
  /** Mô tả đưa vào system prompt — viết cho mô hình đọc */
  description: string;
  /** Mô tả tham số dạng text ngắn: 'wbs (string), pct (0-100)' */
  args: string;
  /**
   * CỬA QUYỀN của công cụ (Mr. Đại chốt 25/09 — ma trận ở src/lib/quyen.ts):
   * xem = mọi loại (kể cả Người xem) · ghi = Người dùng trở lên ·
   * caidat = PM/Admin · pheduyet = chỉ PM. BẮT BUỘC khai — cổng `kiemCongCu`
   * (chat-tools.ts) hỏi `duocQuaCua(loại tài khoản, cua)` trước khi chạy,
   * dùng chung cho trợ lý web và Telegram.
   */
  cua: Cua;
  /** true = có GHI dữ liệu (UI hiện chip màu cam để người dùng biết) */
  writes?: boolean;
}

export const TOOL_SPECS: ToolSpec[] = [
  // ===== Việc của CHÍNH Main (dự án, điều hướng, bấm hộ, Base, sổ, web) =====
  {
    name: "list_projects",
    description: "Liệt kê các dự án trong hệ thống kèm dự án đang mở.",
    args: "không có",
    cua: "xem",
  },
  {
    name: "switch_project",
    description: "Chuyển sang dự án khác (lấy id từ list_projects).",
    args: "projectId (string)",
    cua: "xem",
  },
  {
    name: "open_tab",
    description:
      'Mở một màn CỦA MAIN cho người dùng. Đường dẫn hợp lệ: "/bang-dieu-hanh" (Bảng điều hành), ' +
      '"/bao-cao?tab=sang" (Báo cáo sáng), "/bao-cao?tab=thang" (Báo cáo tháng), ' +
      '"/viec-cua-toi", "/alerts" (Issue), "/skill", ' +
      '"/settings", "/settings?tab=ket-noi" (Kết nối — Ai được gọi ai), ' +
      '"/gioi-thieu", "/kich-ban-test". ' +
      "Main KHÔNG có màn nghiệp vụ của bốn agent kia (không Gantt, không Lập tiến độ, " +
      "không Hồ sơ dự án, không Năng suất) — cần số thì gọi công cụ đi hỏi, đừng mở tab.",
    args: "path (string)",
    cua: "xem",
  },
  {
    // Trợ lý TỰ THAO TÁC giao diện (Mr. Đại chốt 06/09) — chỉ trên màn CỦA MAIN
    name: "dieu_khien_giao_dien",
    description:
      "Tự thao tác trên màn hình CỦA MAIN thay người dùng: bấm nút, điền ô, chọn giá trị, cuộn tới dòng. " +
      "CHỈ gọi khi người dùng bảo LÀM/BẤM hộ, KHÔNG gọi khi người dùng chỉ HỎI số liệu. " +
      "Mỗi bước dùng đúng một mã lệnh trong sổ lệnh; gọi liet_ke_lenh trước nếu chưa chắc mã nào. " +
      "Bước điền/chọn phải có giaTri. Tối đa 24 bước, hỏng bước nào dừng ngay bước đó.",
    args:
      'buoc (mảng, mỗi phần tử { lenh: "mã trong sổ", giaTri?: "…", moTa: "câu tiếng Việt tả bước này" })',
    writes: true,
    cua: "ghi",
  },
  {
    name: "liet_ke_lenh",
    description:
      "Danh sách lệnh giao diện trợ lý bấm được trên các màn của Main (mã · tên · trang · kiểu · có ghi dữ liệu không).",
    args: 'trang? ("/alerts" | "/viec-cua-toi" | "/settings" | "*" …)',
    cua: "xem",
  },
  {
    // 04/10/2026: đọc việc ở AGENT CÔNG VIỆC (mã nội bộ "base") — Base.vn đã bỏ (Mr. Đại chốt)
    name: "viec_base",
    description:
      "Đọc việc THẬT của người dùng ở agent Công việc (nơi công ty giao và theo dõi việc) theo 3 nút: việc tôi nhận · việc tôi giao · việc cần phối hợp — việc đang mở, mọi dự án. Dùng khi hỏi về việc của tôi.",
    args: 'bang ("nhan"|"giao"|"phoi_hop"|"ca-ba", mặc định "ca-ba"), limit (số, mặc định 15), nguoi? (tên hoặc email người khác — chỉ PM/Admin xem được; bỏ trống = việc của người đang hỏi)',
    cua: "xem",
  },
  {
    name: "tao_viec_base",
    description:
      "GIAO một việc mới THẲNG sang agent Công việc (chạy sau khi người dùng bấm ✅ Làm). Chỉ dùng khi người dùng yêu cầu rõ ràng. Hạn theo dd/mm/yyyy. Không nói rõ giao cho ai thì giao cho chính người dùng. Dự án không bắt buộc.",
    args: "ten (bắt buộc), giaoCho (mã người/đơn vị lấy từ danh_ba_base, tùy chọn), han (dd/mm/yyyy, tùy chọn), moTa (kết quả cần có, tùy chọn), duAn (mã ngắn dự án vd HV, tùy chọn — bỏ trống = không thuộc dự án nào), vanSoan (true CHỈ khi lần trước máy báo trùng và người dùng xác nhận là việc khác — Luật 33)",
    writes: true,
    cua: "ghi",
  },
  {
    name: "danh_ba_base",
    description: "Tra danh bạ người và đơn vị của agent Công việc theo tên / đơn vị — trả mã để giao việc. Danh bạ đã có họ tên đầy đủ.",
    args: "q (chuỗi tìm)",
    cua: "xem",
  },
  {
    // 05/09 — giao việc BẰNG CÂU NÓI, đường NHÁP (chưa giao)
    name: "soan_viec_giao",
    description:
      "SOẠN NHÁP một việc để giao (CHƯA giao) — việc hiện ở màn «Việc của tôi» khối «Việc AI soạn chờ duyệt»; người dùng bấm «Gửi» (hoặc «Sửa» để chỉnh) thì thành việc ở agent Công việc. Dùng khi người dùng muốn XEM LẠI/DUYỆT TRÊN MÀN HÌNH trước khi giao. Muốn giao thẳng thì dùng tao_viec_base.",
    args: "ten (bắt buộc), giaoCho (mã người/đơn vị — tra bằng danh_ba_base trước, tùy chọn), moTa (tùy chọn), han (dd/mm/yyyy, tùy chọn), vanSoan (true CHỈ khi lần trước máy báo trùng và người dùng xác nhận là việc khác — Luật 33)",
    writes: true,
    cua: "ghi",
  },
  {
    name: "tim_kiem_web",
    description:
      "Tìm thông tin TRÊN INTERNET. Chỉ dùng khi người dùng đã bật nút 🌐 và câu hỏi cần thứ KHÔNG có trong dữ liệu dự án: giá vật tư ngoài thị trường, quy định/thông tư mới, thông số thiết bị của hãng, tin thời sự. TUYỆT ĐỐI không dùng để tra số liệu tiến độ, khối lượng, nhân sự — những thứ đó đã có công cụ riêng. Khi trả lời phải dẫn địa chỉ trang lấy được.",
    args: "query (chuỗi từ khoá, nên viết tiếng Việt)",
    cua: "xem",
  },
  // ===== ĐI HỎI AGENT TIẾN ĐỘ qua cổng 3003 (Mr. Đại chốt 24/09) =====
  // Main KHÔNG tự tính số tiến độ: mỗi công cụ dưới đây là MỘT lời gọi
  // hoiAgent("tiendo", "tiendo.<tên>", …) có ghi sổ nhật ký (luật 29). Dự án
  // đang mở tự đi kèm thành `ma_du_an` — mô hình không phải truyền. ⭐ 25/09: mọi
  // công cụ HỎI AGENT nhận thêm `du_an` (mã ngắn HV/N3A/TT/BT hoặc tên) để hỏi vắt
  // ngang một dự án không đang mở — code tra bằng timDuAn (projects.ts), kiểm quyền.
  {
    name: "tom_tat_du_an",
    description:
      "HỎI AGENT TIẾN ĐỘ: % tổng thể · COD dự báo · COD Tiến độ mục tiêu · COD Baseline · chậm bao nhiêu ngày so với Tiến độ mục tiêu và so với Baseline · số việc găng · số việc găng dự báo chậm so với Baseline · ngày cắt dữ liệu.",
    args: "du_an?",
    cua: "xem",
  },
  {
    name: "duong_gang",
    description:
      "HỎI AGENT TIẾN ĐỘ: chuỗi đầu việc găng chốt COD, mỗi mắt xích kèm % đã làm · số ngày ảnh hưởng COD so với Baseline, xếp CHẬM NHẤT LÊN ĐẦU (theo số ngày) + hạng mục găng tự làm COD chậm bao nhiêu ngày. Dùng khi hỏi việc găng nào đang chậm, vì sao COD rơi vào ngày đó.",
    args: "du_an?",
    cua: "xem",
  },
  {
    name: "du_bao",
    description:
      "HỎI AGENT TIẾN ĐỘ: COD dự báo theo năng suất thực tế + COD kế hoạch nội bộ + ngày cắt dữ liệu + CĂN CỨ TÍNH (vì sao ra ngày đó).",
    args: "du_an?",
    cua: "xem",
  },
  {
    name: "lich_su_du_bao",
    description: "HỎI AGENT TIẾN ĐỘ: chuỗi mốc COD dự báo theo thời gian — COD lùi/tiến thế nào.",
    args: "so_thang (số, tùy chọn), du_an?",
    cua: "xem",
  },
  {
    name: "nang_suat",
    description:
      "HỎI AGENT TIẾN ĐỘ: năng suất baseline · thực tế · tỷ lệ, lọc được theo WBS hoặc thầu phụ. Dùng khi hỏi nhà thầu làm nhanh chậm.",
    args: "ma_wbs (tùy chọn), thau_phu (tùy chọn), du_an?",
    cua: "xem",
  },
  {
    name: "s_curve",
    description:
      "HỎI AGENT TIẾN ĐỘ: S-Curve (mục tiêu CĐT · Baseline · thực tế · dự báo) — ngày từng đường đạt 100%, số ngày chậm/sớm so với Tiến độ mục tiêu, ghi chú.",
    args: "du_an?",
    cua: "xem",
  },
  {
    name: "so_tuan",
    description:
      "HỎI AGENT TIẾN ĐỘ: so 2 tuần báo cáo gần nhất — từng thước đo trước/nay và mức đổi. Dùng khi hỏi 'tuần này khác gì tuần trước'.",
    args: "du_an?",
    cua: "xem",
  },
  {
    name: "tim_dau_viec",
    description:
      "HỎI AGENT TIẾN ĐỘ: tìm đầu việc theo từ khóa trong tên hoặc theo mã WBS.",
    args: "tu_khoa (chuỗi) HOẶC ma_wbs (chuỗi), du_an?",
    cua: "xem",
  },
  {
    name: "chi_tiet_dau_viec",
    description:
      "HỎI AGENT TIẾN ĐỘ: chi tiết một đầu việc — start/end = lịch KẾ HOẠCH; baseline_* ; DỰ BÁO ở du_bao_xong + so_ngay_tre + gang_toi_cod · % · float tới COD.",
    args: "ma_wbs (bắt buộc), du_an?",
    cua: "xem",
  },
  {
    // ⭐ 26/09 (Mr. Đại chốt): phép tính giả định COD là việc của CODE agent tiến độ
    name: "gia_dinh_cod",
    description:
      "HỎI AGENT TIẾN ĐỘ — GIẢ ĐỊNH: nếu việc X xong sớm/muộn N ngày, bắt đầu ngày D, hay đổi thời lượng thì COD dự báo đổi thế nào. " +
      "Code chạy lại đúng bộ dự báo COD trên bản sao, trả cod_truoc/cod_sau, chenh_ngay, chậm mục tiêu trước/sau, " +
      "đường găng có chuyển không, việc vào/ra găng, lý do khi COD không đổi, giai_thich. Không ghi dữ liệu. " +
      "Câu \"nếu … thì COD …\" BẮT BUỘC gọi công cụ này — CẤM tự cộng trừ ngày.",
    args:
      'thay_doi (mảng ≤20, mỗi phần tử { wbs: "6.1.4", loai: "xong_som"|"xong_muon"|"bat_dau_ngay"|"thoi_luong", soNgay?: 10, ngay?: "2027-01-15" }; mỗi WBS một thay đổi), du_an?',
    cua: "xem",
  },
  {
    name: "khoi_luong_hang_muc",
    description:
      "HỎI AGENT TIẾN ĐỘ: khối lượng từng dòng theo WBS × thầu phụ trong kỳ, kèm nguồn báo cáo. Dùng khi hỏi công trường/nhà thầu làm được bao nhiêu.",
    args: "thau_phu (tùy chọn), ma_wbs (tùy chọn), tu_ngay (yyyy-mm-dd, tùy chọn), den_ngay (yyyy-mm-dd, tùy chọn), du_an?",
    cua: "xem",
  },
  {
    name: "nguon_luc_huy_dong",
    description:
      "HỎI AGENT TIẾN ĐỘ: nhân lực + máy chính THỰC TẾ bình quân trong kỳ, theo thầu phụ.",
    args: "tu_ngay (yyyy-mm-dd, bắt buộc), den_ngay (yyyy-mm-dd, bắt buộc), thau_phu (tùy chọn), du_an?",
    cua: "xem",
  },
  {
    name: "thau_phu",
    description:
      "HỎI AGENT TIẾN ĐỘ: hồ sơ một thầu phụ (nhận mã, tên hay bí danh) và phần việc nó đang làm.",
    args: "ma_thau_phu (tùy chọn), ma_wbs (tùy chọn), du_an?",
    cua: "xem",
  },
  {
    name: "soat_quy_tac",
    description:
      "HỎI AGENT TIẾN ĐỘ: chỗ vi phạm bảng quy tắc P01–P10 của dự án.",
    args: "du_an?",
    cua: "xem",
  },
  {
    name: "boq_theo_hang_muc",
    description:
      "HỎI AGENT TIẾN ĐỘ: KHỐI LƯỢNG BOQ THIẾT KẾ chi tiết theo HẠNG MỤC (vd «DZ 110KV», «Tuabin TB2», «Đường»): từng dòng BOQ — nội dung, đơn vị, khối lượng thiết kế, việc WBS và ngày thi công, hợp đồng, thầu phụ, khối lượng đã thi công lũy kế và % đạt. " +
      "Dùng khi hỏi khối lượng BOQ / khối lượng thiết kế của một hạng mục, đường dây, tuabin, móng, cột. Không truyền gì thì trả danh sách hạng mục kèm số dòng.",
    args: "hang_muc (mã HM-… hoặc tên hạng mục, tùy chọn), tu_khoa (chữ trong tên dòng BOQ, tùy chọn), vi_tri (số, tùy chọn), du_an?",
    cua: "xem",
  },
  {
    name: "bao_cao_ngay_boq",
    description:
      "HỎI AGENT TIẾN ĐỘ: khối lượng NHÀ THẦU báo cáo hằng ngày theo MÃ BOQ (chi tiết từng ngày, từng dòng BOQ). Dùng khi hỏi nhà thầu báo làm được bao nhiêu của một mã BOQ cụ thể.",
    args: "ma_boq (tùy chọn), tu_ngay (yyyy-mm-dd, tùy chọn), vi_tri (số, tùy chọn), du_an?",
    cua: "xem",
  },
  {
    name: "hop_dong_nha_thau",
    description:
      "HỎI AGENT TIẾN ĐỘ: HỢP ĐỒNG NHÀ THẦU CHÍNH của dự án — nhà thầu, gói, phạm vi; truyền ma_hop_dong để lấy từng mã BOQ hợp đồng nhận kèm KHỐI LƯỢNG HỢP ĐỒNG, khối lượng đã thi công. Dùng khi hỏi nhà thầu nhận khối lượng nào, khối lượng chi tiết của nhà thầu.",
    args: "ma_hop_dong (tùy chọn), ma_nha_thau (tùy chọn), ma_boq (tùy chọn, nhiều mã cách phẩy), tu (số, tùy chọn), du_an?",
    cua: "xem",
  },
  {
    name: "ho_so_thiet_ke",
    description:
      "HỎI AGENT TIẾN ĐỘ: HỒ SƠ THIẾT KẾ theo hạng mục (màn Theo dõi thiết kế): bộ hồ sơ nào CHƯA CÓ, ngày PHẢI CÓ (lùi từ ngày thi công), ai làm, kế hoạch xong, chậm bao nhiêu ngày. " +
      "Dùng khi hỏi hồ sơ thiết kế / bản vẽ nào PMC chưa làm mà sắp cần để thi công. Mặc định chỉ trả bộ chưa có hồ sơ, sắp cần nhất lên đầu.",
    args: "ca_da_co (true/false, tùy chọn), gioi_han (số, tùy chọn), du_an?",
    cua: "xem",
  },
  {
    name: "danh_sach_issue",
    description:
      "HỎI AGENT TIẾN ĐỘ: sổ Issue/cảnh báo của agent tiến độ cho dự án đang mở.",
    args: "chi_dang_mo (true/false, mặc định true), gioi_han (số, tùy chọn), du_an?",
    cua: "xem",
  },
  // ===== ĐI HỎI PHÁP LÝ · HỢP ĐỒNG · BASE (Mr. Đại chốt 25/09 — bỏ màn "Hỏi
  // vắt ngang các ban", dồn vào trợ lý chat). Tên thật đo bằng nang_luc() 25/09;
  // ánh xạ CONG_AGENT_KHAC trong chat-tools.ts. Chỉ ĐỌC, cửa Xem. =====
  {
    name: "phaply_ho_so_thieu",
    description: "HỎI AGENT PHÁP LÝ: dự án đang THIẾU hồ sơ pháp lý nào · quá hạn bao nhiêu ngày · cơ quan nào đang giữ. Dùng khi hỏi hồ sơ/giấy phép đang chặn, vì sao chậm do thủ tục.",
    args: "du_an?, gom_nghi_ngo (true/false, tùy chọn), gioi_han (số, tùy chọn)",
    cua: "xem",
  },
  {
    name: "phaply_han_chu_truong",
    description: "HỎI AGENT PHÁP LÝ: hạn đưa dự án vào vận hành theo quyết định chủ trương đầu tư + văn bản · Điều/khoản · độ chắc.",
    args: "du_an?",
    cua: "xem",
  },
  {
    name: "phaply_ho_so_cua_wbs",
    description: "HỎI AGENT PHÁP LÝ: một đầu việc (mã WBS) cần hồ sơ gì · đã có chưa · số hiệu · ngày. Dùng khi việc găng đang trễ để xem có vướng hồ sơ không.",
    args: "ma_wbs (bắt buộc), du_an?, gioi_han?",
    cua: "xem",
  },
  {
    name: "phaply_danh_sach_issue",
    description: "HỎI AGENT PHÁP LÝ: sổ Issue (vướng mắc) pháp lý của dự án.",
    args: "du_an?, ca_da_dong (true/false, tùy chọn), gioi_han?",
    cua: "xem",
  },
  {
    name: "hopdong_phieu_gia_dang_cho",
    description: "HỎI AGENT HỢP ĐỒNG: phiếu giá nào đang chờ duyệt, chờ bao nhiêu ngày, quá hạn chưa.",
    args: "du_an?, gioi_han?",
    cua: "xem",
  },
  {
    name: "hopdong_gia_tri_luy_ke",
    description: "HỎI AGENT HỢP ĐỒNG: dự án đã thanh toán bao nhiêu, còn lại bao nhiêu.",
    args: "du_an?",
    cua: "xem",
  },
  {
    name: "hopdong_toan_canh",
    description: "HỎI AGENT HỢP ĐỒNG: bốn vùng tiền của hợp đồng/dự án (giá trị · đã thanh toán · đã nghiệm thu · đã thi công chưa nghiệm thu · chưa làm) + phạt treo · tạm ứng chưa thu hồi · bảo lãnh sắp hết.",
    args: "ma_hop_dong (tùy chọn) HOẶC du_an?",
    cua: "xem",
  },
  {
    name: "nghiemthu_da_nghiem_thu_chua",
    description: "HỎI AGENT NGHIỆM THU: việc (mã WBS, gồm việc con) đã nghiệm thu chưa — đã nghiệm thu · có hợp đồng chưa nghiệm thu xong (đã ký x/y biên bản) · chưa thấy hợp đồng · chưa tra được (kèm lý do).",
    args: "ma_wbs (bắt buộc), du_an?",
    cua: "xem",
  },
  {
    name: "nghiemthu_so_lieu_sang",
    description: "HỎI AGENT NGHIỆM THU: BA SỐ nghiệm thu của dự án — dòng BOQ thi công rồi quá ngày chưa nghiệm thu · phiếu chờ BQL ký quá giờ · biên bản kịch bản đã ký / cần (%). Lần đầu có thể trả «đang tính, hỏi lại sau một phút».",
    args: "du_an?",
    cua: "xem",
  },
  {
    name: "nghiemthu_ho_so_hoan_thanh",
    description: "HỎI AGENT NGHIỆM THU: hồ sơ hoàn thành công trình (Phụ lục VII, 31 mục) — bao nhiêu mục đủ, % đủ, còn thiếu mục nào và vì sao.",
    args: "du_an?",
    cua: "xem",
  },
  {
    name: "nghiemthu_khoi_luong_da_nghiem_thu",
    description: "HỎI AGENT NGHIỆM THU: khối lượng ĐÃ NGHIỆM THU (cộng biên bản đã ký) theo mã BOQ kèm khối lượng BOQ và mã WBS. Biên bản nghiệm thu theo sự việc không ghi khối lượng.",
    args: "du_an?, ma_boq?, ma_wbs?, gioi_han?",
    cua: "xem",
  },
  {
    name: "nghiemthu_luat_logic",
    description: "HỎI AGENT NGHIỆM THU: luật logic của thư viện nghiệm thu (việc nào phải có việc/hồ sơ nào trước, mức Chặn hay Cảnh báo).",
    args: "ma_luat?, ap_cho?",
    cua: "xem",
  },
  {
    name: "nghiemthu_danh_sach_issue",
    description: "HỎI AGENT NGHIỆM THU: sổ Issue nghiệm thu đang mở cho dự án — phiếu chờ BQL ký quá hạn · dòng BOQ thi công rồi quá ngày chưa nghiệm thu · biên bản lập cuối chờ ký quá hạn. Lần đầu có thể trả «đang tính, hỏi lại sau một phút».",
    args: "du_an?, ca_da_dong (true/false, tùy chọn), gioi_han?",
    cua: "xem",
  },
  {
    name: "hopdong_moc_hop_dong",
    description: "HỎI AGENT HỢP ĐỒNG: mốc tiến độ ghi trong HỢP ĐỒNG theo WBS — hạng mục · ngày phải xong · Điều/phụ lục · nhà thầu.",
    args: "du_an?, ma_wbs (tùy chọn), ten_hang_muc (tùy chọn)",
    cua: "xem",
  },
  {
    name: "hopdong_danh_sach_issue",
    description: "HỎI AGENT HỢP ĐỒNG: sổ Issue (vướng mắc) hợp đồng/thanh toán của dự án.",
    args: "du_an?, ca_da_dong (true/false, tùy chọn), gioi_han?",
    cua: "xem",
  },
  {
    name: "base_viec_qua_han",
    description: "HỎI AGENT CÔNG VIỆC: việc QUÁ HẠN trong sổ việc của dự án (lọc được theo người).",
    args: "du_an?, nguoi (mã người hoặc tên, tùy chọn), gioi_han?",
    cua: "xem",
  },
  {
    name: "base_tai_viec_theo_nguoi",
    description: "HỎI AGENT CÔNG VIỆC: tải việc từng người trong dự án — đang mở · quá hạn · sắp hạn · việc găng, người nặng nhất lên đầu. Mỗi dòng có `loai` (nguoi · phong · don_vi · chuc_danh_lanh_dao): hỏi «phòng nào» chỉ xét loai = phong, hỏi «ai/người nào» chỉ xét loai = nguoi; KHÔNG gọi đơn vị là phòng. Tên việc dùng `ten_gon`, chép nguyên văn không sửa.",
    args: "du_an?, nguoi (tùy chọn), gioi_han?",
    cua: "xem",
  },
  {
    name: "base_co_viec_cho_ma_khong",
    description: "HỎI AGENT CÔNG VIỆC: một mã (WBS, hồ sơ PL-, phiếu giá PG-…) đã có ai được giao việc chưa (sổ việc agent Công việc).",
    args: "ma_he_thong (bắt buộc), du_an?",
    cua: "xem",
  },
  {
    name: "base_lich_hop",
    description:
      "HỎI AGENT CÔNG VIỆC: lịch họp CỦA CHÍNH người đang hỏi (sổ Phòng họp; chỉ xem được lịch của mình) — cuộc chưa kết thúc từ bây giờ tới N ngày tới, gần nhất lên đầu: ngày · giờ · phòng · nội dung · người đặt · thành phần.",
    args: "so_ngay? (mặc định 14)",
    cua: "xem",
  },
  {
    name: "luy_ke_boq",
    description:
      "HỎI AGENT TIẾN ĐỘ: KHỐI LƯỢNG ĐÃ THI CÔNG LŨY KẾ theo mã BOQ (số đầu kỳ + báo cáo tuần + báo cáo ngày): mỗi dòng mã BOQ · đơn vị · khối lượng BOQ · đã thi công. Dùng khi hỏi «lũy kế khối lượng», «đã làm được bao nhiêu» của một hạng mục BOQ.",
    args: "ma_boq (tùy chọn), vi_tri (số, tùy chọn), du_an?",
    cua: "xem",
  },
  {
    name: "san_luong_hop_dong",
    description:
      "HỎI AGENT TIẾN ĐỘ: SẢN LƯỢNG (TIỀN) theo THÁNG của từng hợp đồng nhà thầu chính — số của tab «Sản lượng – Chi phí tháng». Dùng khi hỏi hợp đồng làm được bao nhiêu tiền, sản lượng tháng.",
    args: "ma_hop_dong (tùy chọn), du_an?",
    cua: "xem",
  },
  {
    name: "nhat_ky_thi_cong",
    description:
      "HỎI AGENT TIẾN ĐỘ: NHẬT KÝ THI CÔNG từng ngày từ báo cáo ngày — nhà thầu, thời tiết, nhân lực, máy, việc đã làm. Dùng khi hỏi «hôm qua công trường làm gì», «tuần này bao nhiêu người». Bỏ trống ngày = 7 ngày gần nhất.",
    args: "tu_ngay (yyyy-mm-dd, tùy chọn), den_ngay (yyyy-mm-dd, tùy chọn, tối đa 62 ngày), du_an?",
    cua: "xem",
  },
  {
    name: "viec_trong_khoang",
    description:
      "HỎI AGENT TIẾN ĐỘ: VIỆC / MỐC có bắt đầu hoặc kết thúc rơi vào một khoảng ngày (không chỉ việc găng). Dùng khi hỏi «tuần sau phải bắt đầu việc gì», «tháng này phải xong việc gì». Bỏ trống = 8 ngày từ hôm nay.",
    args: "tu_ngay (yyyy-mm-dd, tùy chọn), den_ngay (yyyy-mm-dd, tùy chọn), gioi_han?, vi_tri?, du_an?",
    cua: "xem",
  },
  {
    name: "bang_gantt",
    description:
      "HỎI AGENT TIẾN ĐỘ: BẢNG GANTT CẤP 1–3 (như nút «C3» trên màn Gantt): mỗi hạng mục mã · tên · ngày kế hoạch / thực tế · % · chậm so với hệ nào. Dùng khi hỏi «tiến độ các hạng mục chính».",
    args: "vi_tri (số, tùy chọn), du_an?",
    cua: "xem",
  },
  {
    name: "nha_thau",
    description:
      "HỎI AGENT TIẾN ĐỘ: SỔ NHÀ THẦU CHÍNH (mã NT-…, ký với BQL) — tên, hợp đồng, hạng mục đang làm. Khác thau_phu (thầu phụ) và hop_dong_nha_thau (phạm vi khối lượng một hợp đồng).",
    args: "ten (tên hoặc mã NT-, tùy chọn)",
    cua: "xem",
  },
  {
    name: "hopdong_dieu_khoan",
    description:
      "HỎI AGENT HỢP ĐỒNG: hợp đồng QUY ĐỊNH GÌ về một chủ đề (phạt chậm, tạm ứng, bảo hành, thanh toán, giấy phép…) kèm NGUYÊN VĂN và số Điều.",
    args: "chu_de (bắt buộc), ma_hop_dong (tùy chọn, vd HD-548), gioi_han?, du_an?",
    cua: "xem",
  },
  {
    name: "hopdong_chi_phi_theo_hop_dong",
    description:
      "HỎI AGENT HỢP ĐỒNG: CHI PHÍ LŨY KẾ từng hợp đồng đã ký = giá trị thực hiện đã lên phiếu giá (đợt mới nhất).",
    args: "ma_hop_dong (tùy chọn), du_an?",
    cua: "xem",
  },
  {
    name: "hopdong_phieu_gia_so_san_luong",
    description:
      "HỎI AGENT HỢP ĐỒNG: PHIẾU GIÁ ĐANG CHỜ SO VỚI SẢN LƯỢNG — mỗi hợp đồng: phiếu đang chờ, lũy kế phiếu, sản lượng, CHÊNH (agent Hợp đồng tính).",
    args: "du_an?",
    cua: "xem",
  },
  {
    name: "hopdong_cam_ket_nha_thau",
    description:
      "HỎI AGENT HỢP ĐỒNG: nhà thầu CAM KẾT bao nhiêu người, bao nhiêu máy theo hợp đồng (đếm cùng cách với nguon_luc_huy_dong để so thực tế).",
    args: "ma_hop_dong (tùy chọn), du_an?",
    cua: "xem",
  },
  {
    name: "hopdong_ket_qua_soat",
    description:
      "HỎI AGENT HỢP ĐỒNG: kết quả soát MỘT phiếu giá — lệch những khẳng định nào, thiếu căn cứ nào.",
    args: "ma_phieu_gia (bắt buộc, vd PG-548.02), gioi_han?",
    cua: "xem",
  },
  {
    name: "hopdong_co_hop_dong_chua",
    description:
      "HỎI AGENT HỢP ĐỒNG: hạng mục WBS đã có HỢP ĐỒNG nhận chưa (chỉ vế hợp đồng; vế nghiệm thu hỏi nghiemthu_da_nghiem_thu_chua).",
    args: "ma_wbs (bắt buộc), du_an?",
    cua: "xem",
  },
  {
    name: "phaply_tra_van_ban",
    description:
      "HỎI AGENT PHÁP LÝ: TRA VĂN BẢN luật / nghị định / thông tư theo số hiệu hoặc từ khoá — tóm lược + link mở.",
    args: "so_hieu (tùy chọn), tu_khoa (tùy chọn — cần một trong hai), gioi_han?",
    cua: "xem",
  },
  {
    name: "phaply_can_cu_phap_ly",
    description:
      "HỎI AGENT PHÁP LÝ: việc này CĂN CỨ Điều nào của văn bản nào, kèm nguyên văn điều đó.",
    args: "tu_khoa (bắt buộc), so_hieu (tùy chọn), gioi_han?",
    cua: "xem",
  },
  {
    name: "phaply_van_ban_con_hieu_luc",
    description:
      "HỎI AGENT PHÁP LÝ: văn bản CÒN HIỆU LỰC không, bị thay thế bởi văn bản nào.",
    args: "so_hieu (bắt buộc)",
    cua: "xem",
  },
  {
    name: "phaply_han_giay_phep",
    description:
      "HỎI AGENT PHÁP LÝ: giấy phép HẾT HẠN ngày nào — có ma_wbs: giấy phép của hồ sơ gắn WBS đó; bỏ trống: mọi giấy phép đã có của dự án sắp hết / đã hết hiệu lực trong so_ngay (mặc định 30), kèm số giấy phép không ghi hạn.",
    args: "ma_wbs?, so_ngay?, gioi_han?, du_an?",
    cua: "xem",
  },
  {
    name: "phaply_doi_ngay_nen_bat_dau",
    description:
      "HỎI AGENT PHÁP LÝ: hồ sơ nào NÊN BẮT ĐẦU LÀM khi nào (lượt 🤖 AI tối Chủ nhật quyết), các hồ sơ bị dời > 30 ngày, kèm lý do. Dùng khi hỏi «hồ sơ nào phải làm ngay».",
    args: "tat_ca (true = mọi hồ sơ, tùy chọn), gioi_han?, du_an?",
    cua: "xem",
  },
  {
    name: "nghiemthu_lich_nghiem_thu",
    description:
      "HỎI AGENT NGHIỆM THU: LỊCH NGHIỆM THU — nhà thầu nào mời nghiệm thu gì, mấy giờ, ở đâu, phiếu chờ ký hay đã ký. Bỏ trống = hôm nay + ngày mai; hỏi «tuần này / tuần sau» thì truyền tu_ngay, den_ngay đúng mốc tuần ở BỐI CẢNH.",
    args: "tu_ngay (yyyy-mm-dd, tùy chọn), den_ngay (yyyy-mm-dd, tùy chọn, tối đa 92 ngày), du_an?",
    cua: "xem",
  },
  {
    name: "base_trang_thai_cong_viec",
    description:
      "HỎI AGENT CÔNG VIỆC: trạng thái MỘT việc (mã CV-…) — hạn, quá hạn, nằm im bao nhiêu ngày. Chưa biết mã thì tra trước bằng viec_base hoặc base_nguoi_phu_trach.",
    args: "ma_viec_base (bắt buộc, CV-…), du_an?",
    cua: "xem",
  },
  {
    name: "base_nguoi_phu_trach",
    description:
      "HỎI AGENT CÔNG VIỆC: AI đang chủ trì việc có tên chứa từ khoá (hoặc gắn một mã hệ thống).",
    args: "tu_khoa (tên việc) hoặc ma_he_thong, du_an?",
    cua: "xem",
  },
  {
    name: "base_viec_co_han_trong_khoang",
    description:
      "HỎI AGENT CÔNG VIỆC: việc CÓ HẠN trong một khoảng ngày (sắp đến hạn) — MỌI dự án người hỏi được xem; lọc theo người hoặc đơn vị. Bỏ trống ngày = 8 ngày từ hôm nay. Công cụ không lọc theo dự án: mỗi dòng có trường du_an — người hỏi nêu MỘT dự án thì chỉ giữ dòng có du_an đó và nói rõ đã lọc.",
    args: "tu_ngay (yyyy-mm-dd, tùy chọn), den_ngay (yyyy-mm-dd, tùy chọn), nguoi (mã/tên, tùy chọn), don_vi (tên phòng, tùy chọn)",
    cua: "xem",
  },
  // ⭐ ĐỢT 3 (KE-HOACH/31, 27/10/2026) — công cụ cổng MỚI của 5 agent
  {
    name: "base_bao_cao_da_nop",
    description:
      "HỎI AGENT CÔNG VIỆC: BÁO CÁO TUẦN của các phòng / đơn vị ĐÃ NỘP CHƯA — ai đã nộp (lúc nào, đúng hạn hay trễ), ai chưa nộp (hạn nộp, quá hạn bao lâu). Câu «phòng X nộp báo cáo chưa», «ai chưa nộp báo cáo».",
    args: "tuan (số tuần, tùy chọn = tuần này), ngay?, nam?, don_vi (tên phòng, tùy chọn), nguoi?",
    cua: "xem",
  },
  {
    name: "base_kien_nghi_can_quyet",
    description:
      "HỎI AGENT CÔNG VIỆC: KIẾN NGHỊ trong báo cáo tuần đang CHỜ LÃNH ĐẠO QUYẾT (chưa thành việc) — nội dung, đề nghị, mức độ, đơn vị nêu. Câu «có kiến nghị gì cần lãnh đạo quyết».",
    args: "tuan?, ngay?, nam?, don_vi?, gioi_han?",
    cua: "xem",
  },
  {
    name: "base_bao_cao_tuan",
    description:
      "HỎI AGENT CÔNG VIỆC: NỘI DUNG báo cáo tuần chung của CÔNG TY (bản tổng hợp các phòng): số việc quá hạn / xong / mới / đang mở theo dự án và theo đơn vị, kèm nhận định 🤖. KHÁC bao_cao_tuan (báo cáo tuần của NHÀ THẦU ở công trường).",
    args: "tuan?, ngay?, nam?, don_vi?, du_an?",
    cua: "xem",
  },
  {
    name: "base_lich_phong",
    description:
      "HỎI AGENT CÔNG VIỆC: LỊCH MỘT PHÒNG HỌP — mọi cuộc họp đặt phòng đó và GIỜ TRỐNG từng buổi. Câu «phòng họp 01 chiều nay có trống không».",
    args: "phong (bắt buộc: 01 / 03 / 09 hoặc tên phòng), ngay (yyyy-mm-dd, tùy chọn = hôm nay), tu_ngay?, den_ngay? (tối đa 14 ngày), buoi (sang / chieu, tùy chọn)",
    cua: "xem",
  },
  {
    name: "base_viec_da_xong",
    description:
      "HỎI AGENT CÔNG VIỆC: việc ĐÃ XONG trong một khoảng ngày — theo đơn vị / người, mỗi việc kèm ngày xong, hạn, xong sớm hay trễ so với hạn. Câu «tháng 10 phòng X xong những việc gì». Không lọc theo dự án: hỏi riêng một dự án thì chỉ giữ dòng có đúng dự án đó.",
    args: "tu_ngay (yyyy-mm-dd), den_ngay (yyyy-mm-dd) — bỏ trống = 30 ngày qua, don_vi?, nguoi?, gioi_han?",
    cua: "xem",
  },
  {
    name: "base_thong_bao_cua_toi",
    description: "HỎI AGENT CÔNG VIỆC: THÔNG BÁO CHƯA ĐỌC (chuông) của CHÍNH người đang hỏi — giờ, loại, nội dung. Không xem được chuông người khác.",
    args: "gioi_han?",
    cua: "xem",
  },
  {
    name: "bao_cao_tuan",
    description:
      "HỎI AGENT TIẾN ĐỘ: BÁO CÁO TUẦN của NHÀ THẦU ở công trường — tuần N đã nộp chưa, nộp lúc nào, ai tải lên; nội dung: khối lượng, công việc, vướng mắc, thời tiết (mỗi dòng dẫn nguồn sheet/dòng). Câu «báo cáo tuần 43 đã nộp chưa», «báo cáo tuần nói gì».",
    args: "tuan (2026-W43 · W43 · 43, tùy chọn = tuần mới nhất đã nộp), gioi_han?, du_an?",
    cua: "xem",
  },
  {
    name: "thoi_tiet",
    description:
      "HỎI AGENT TIẾN ĐỘ: THỜI TIẾT ảnh hưởng thi công — ngày mưa / dừng thi công theo báo cáo ngày và báo cáo tuần, và số ngày bộ dự báo COD cộng thêm vì thời tiết cho từng việc (KHÔNG phải số ngày COD lùi).",
    args: "tu_ngay?, den_ngay? (tối đa 92 ngày) hoặc tuan?, gioi_han?, du_an?",
    cua: "xem",
  },
  {
    name: "phaply_lich_ho_so",
    description:
      "HỎI AGENT PHÁP LÝ: LỊCH HỒ SƠ của dự án — hồ sơ nào phải bắt đầu / phải có trong khoảng ngày (mặc định 30 ngày tới), kèm 4 ô đếm của màn (phải có · đã xong · quá hạn · tới lúc làm). loc = qua_han / toi_luc / chua_co.",
    args: "tu_ngay?, den_ngay?, so_ngay?, loc?, gioi_han?, du_an?",
    cua: "xem",
  },
  {
    name: "phaply_khung_thu_tuc",
    description:
      "HỎI AGENT PHÁP LÝ: KHUNG THỦ TỤC theo loại dự án — tên thủ tục, giai đoạn, cơ quan, căn cứ, số ngày xử lý, thủ tục phải xong trước. Câu «thủ tục giao đất», «trình tự chấp thuận chủ trương». (Không có bước con bên trong một thủ tục.)",
    args: "tu_khoa?, giai_doan?, loai_du_an?, gioi_han?, du_an?",
    cua: "xem",
  },
  {
    name: "phaply_tong_quan",
    description:
      "HỎI AGENT PHÁP LÝ: TỔNG QUAN pháp lý một dự án — đã xong / phải có, từng giai đoạn, issue đang hiện, việc kế tiếp, chuỗi đang tắc, công văn gần đây (đúng số màn Tổng quan).",
    args: "du_an?",
    cua: "xem",
  },
  {
    name: "phaply_van_ban_theo_nhom",
    description:
      "HỎI AGENT PHÁP LÝ: LIỆT KÊ văn bản theo NHÓM / LOẠI trong kho (vd nhóm «Luật Lào», «Lào/Điện lực»; loại luật / nghị định / thông tư), lọc từ khoá, trạng thái hiệu lực. Muốn nội dung một văn bản thì gọi tiếp phaply_can_cu_phap_ly với số hiệu.",
    args: "nhom?, loai?, tu_khoa?, trang_thai?, gioi_han?",
    cua: "xem",
  },
  {
    name: "hopdong_danh_sach_hop_dong",
    description:
      "HỎI AGENT HỢP ĐỒNG: DANH SÁCH MỌI HỢP ĐỒNG của dự án — hàng tổng (số hợp đồng, tổng giá trị) trước, rồi từng hợp đồng: số hiệu, tên, nhà thầu, giá trị, ngày ký, trạng thái, phiếu giá đã ký / đang chờ; kèm dự thảo chưa ký. Câu «dự án có mấy hợp đồng, tổng bao nhiêu».",
    args: "tu_khoa?, gioi_han?, du_an?",
    cua: "xem",
  },
  {
    name: "hopdong_bao_lanh_tam_ung",
    description:
      "HỎI AGENT HỢP ĐỒNG: BẢO LÃNH (loại, giá trị, ngày hết hạn, còn bao nhiêu ngày) và TẠM ỨNG (đã ứng, đã thu hồi, còn lại, hợp đồng quy định). Câu «bảo lãnh nào sắp hết hạn», «tạm ứng còn bao nhiêu chưa thu hồi».",
    args: "ma_hop_dong?, tu_khoa?, phan (bao_lanh / tam_ung, tùy chọn), gioi_han?, du_an?",
    cua: "xem",
  },
  {
    name: "hopdong_moc_thanh_toan",
    description:
      "HỎI AGENT HỢP ĐỒNG: MỐC / ĐỢT THANH TOÁN — đợt tiếp theo, điều kiện từng đợt (trích nguyên văn), tỷ lệ thanh toán, giữ lại, thu hồi tạm ứng, bảng mốc + % nghiệm thu. KHÁC hopdong_moc_hop_dong (mốc TIẾN ĐỘ theo WBS).",
    args: "ma_hop_dong?, tu_khoa (vd «tư vấn giám sát»), gioi_han?, du_an?",
    cua: "xem",
  },
  {
    name: "hopdong_gia_qua_khu",
    description:
      "HỎI AGENT HỢP ĐỒNG: ĐƠN GIÁ QUÁ KHỨ trong thư viện giá — giá bình quân, thấp – cao, số mẫu, năm, hợp đồng góp giá (giá năm gốc, chưa quy đổi trượt giá).",
    args: "cong_viec (vd «bê tông RCC»), vung (vn / lao, tùy chọn), gioi_han?",
    cua: "xem",
  },
  {
    name: "hopdong_du_thao_dang_soat",
    description: "HỎI AGENT HỢP ĐỒNG: DỰ THẢO hợp đồng ĐANG SOÁT — nạp lúc, bao nhiêu ngày, số vấn đề chờ quyết / đã đồng ý / bỏ qua, so đơn giá.",
    args: "gioi_han?, du_an?",
    cua: "xem",
  },
  {
    name: "nghiemthu_danh_sach_phieu",
    description:
      "HỎI AGENT NGHIỆM THU: PHIẾU YÊU CẦU NGHIỆM THU — đang chờ ký / bị trả lại / đã ký: biên bản, nhà thầu, người nộp, hạn ký, quá hạn bao nhiêu giờ. Câu «phiếu nghiệm thu nào đang chờ».",
    args: "trang_thai (dang_cho mặc định / cho_ky / tra_lai / da_ky / tat_ca), chi_qua_han?, gioi_han?, du_an?",
    cua: "xem",
  },
  {
    name: "nghiemthu_bien_ban",
    description:
      "HỎI AGENT NGHIỆM THU: tra BIÊN BẢN NGHIỆM THU theo hạng mục / WBS / từ khoá / mã — tình trạng, đã ký / chờ ký / chưa lập, ngày ký. khop_du=false nghĩa là CHƯA CÓ biên bản đúng hạng mục hỏi. Câu «biên bản nghiệm thu móng turbine số 3 có chưa».",
    args: "tu_khoa?, hang_muc? (vd «TB3»), ma_wbs?, ma_bien_ban? — cần ít nhất một; gioi_han?, du_an?",
    cua: "xem",
  },
  {
    name: "nghiemthu_thi_nghiem",
    description: "HỎI AGENT NGHIỆM THU: KẾT QUẢ THÍ NGHIỆM — tổ mẫu bê tông (đạt / chờ / không đạt / chờ R28), độ chặt, lô vật liệu.",
    args: "tu_khoa?, loai (be_tong / do_chat / vat_lieu, tùy chọn), gioi_han?, du_an?",
    cua: "xem",
  },
  {
    name: "nghiemthu_doi_chieu_khoi_luong",
    description:
      "HỎI AGENT NGHIỆM THU: ĐỐI CHIẾU KHỐI LƯỢNG thi công / đã nghiệm thu với BOQ hợp đồng — % thi công, % nghiệm thu, dòng bằng / dưới / vượt BOQ, còn nợ, bản vẽ hoàn công từng hạng mục. Lần hỏi đầu có thể báo «đang lấy số» → hỏi lại sau.",
    args: "hang_muc?, ma_boq?, loc (co_so_lieu mặc định / tat_ca / con_no / vuot_boq / chua_nghiem_thu), gioi_han?, du_an?",
    cua: "xem",
  },
  {
    name: "tra_ma",
    description:
      "TRA MỘT MÃ bất kỳ — code tự chọn agent theo dạng mã: CV-… (Công việc) · HD-/PG-/NT- (Hợp đồng) · mã WBS 6.1.4 (Tiến độ) · K-09, số hiệu văn bản (Pháp lý). Dùng khi người dùng hỏi «X là gì / đến đâu rồi» kèm một mã.",
    args: "ma (bắt buộc), du_an?",
    cua: "xem",
  },
  {
    name: "base_danh_sach_issue",
    description: "HỎI AGENT CÔNG VIỆC: sổ Issue của agent Công việc (việc chậm, tắc) cho dự án.",
    args: "du_an?, ca_da_dong (true/false, tùy chọn), gioi_han?",
    cua: "xem",
  },
];

/**
 * Đường dẫn tab hợp lệ cho open_tab — chặn điều hướng bậy.
 *
 * ⭐ SỬA 07/09/2026: danh sách cũ kê 20 đường dẫn kế thừa của Agent Tiến độ
 * ("/planning", "/gantt", "/detail", "/tuan-truoc", "/crosscheck",
 * "/thiet-ke", "/docs", "/soat-so-lieu", "/report-field", "/report-mgmt",
 * "/contractors", "/weather", "/photos", "/productivity") — 13 trong số đó
 * KHÔNG TỒN TẠI trong Main, nên trợ lý mở ra là người dùng nhận trang trắng.
 * "/" cũng bỏ: nó không còn là màn, chỉ đá sang Báo cáo sáng.
 *
 * Danh sách này = đúng các màn Main có thật (10 màn menu trái + 2 màn
 * topmenu). Thêm màn mới thì thêm ở đây — bài canh
 * tests/unit/man-cua-main.test.ts so nó với cây route thật.
 */
export const ALLOWED_TAB_PATHS: string[] = [
  // ⭐ 26/09 gọn menu (cdd6471): Báo cáo sáng/tháng gộp /bao-cao?tab=… · Quan sát →
  // /nhat-ky?tab=suc-khoe · Ma trận gọi → /settings?tab=ket-noi · Khai một lần đã gỡ.
  // 26/09 (sau): Nhật ký & sức khoẻ agent BỎ hẳn — xem ở Agent quan sát (/nhat-ky chỉ còn một dòng dẫn).
  // Kê ĐƯỜNG GỐC; open_tab nhận thêm phần ?tab=… (chat-tools.ts toolOpenTab).
  "/bang-dieu-hanh",
  "/bao-cao",
  "/viec-cua-toi",
  "/alerts",
  "/skill",
  "/settings",
  "/gioi-thieu",
  "/kich-ban-test",
];

/** Cắt tiêu đề phiên từ câu hỏi đầu tiên */
export function titleFromMessage(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t === "") return "Phiên mới";
  return t.length <= 60 ? t : t.slice(0, 57) + "…";
}
