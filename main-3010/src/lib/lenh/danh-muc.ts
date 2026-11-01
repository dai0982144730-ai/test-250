// ============================================================
// danh-muc.ts — SỔ LỆNH GIAO DIỆN (Mr. Đại chốt 06/09/2026)
//
// MỘT CHỖ ĐỊNH NGHĨA DUY NHẤT (luật 7) những gì trợ lý AI được bấm trong app.
// Trợ lý KHÔNG nhìn ảnh, KHÔNG mò toạ độ chuột: nó gọi `moc` — chuỗi khai
// trong `data-lenh` gắn trên chính nút/ô đó. Đổi giao diện, đổi màu, xem trên
// điện thoại đều không vỡ, vì bám TÊN chứ không bám vị trí.
//
// Danh sách này quét từ mã nguồn 06/09 (247 thao tác thật → 111 lệnh), Mr. Đại
// tick chọn 92. 19 lệnh bị loại có ghi ở cuối file để sau khỏi hỏi lại.
//
// ⭐ 24/09 — GỠ 61 LỆNH trỏ trang Main không còn (/planning · /docs · /detail ·
// /productivity · /thiet-ke · /report-mgmt · /report-field): các trang tiến độ đó
// đã gỡ khỏi Main (việc của Agent tiến độ, cổng 3003), nên móc `data-lenh` không
// còn phần tử nào để bấm — trợ lý gọi tới chỉ trượt. Còn 31 lệnh; danh sách mã
// đã gỡ ở LENH_GO_24_09 cuối file. Test so-lenh canh: mọi lệnh phải trỏ trang có thật.
//
// QUYỀN BẤM: ⭐ 25/09 (Mr. Đại chốt, THAY nếp 06/09 "lệnh ghi bấm LUÔN") — dãy
// bước có lệnh `ghi: true` KHÔNG chạy ngay: trợ lý hiện nút ✅ Làm / ❌ Bỏ trong
// khung chat, người bấm Làm mới chạy (lib/ai/cho-duyet.ts). Bước không ghi (mở
// trang, lọc, cuộn) vẫn chạy ngay. WRITE_INTENT trong chat-tools.ts vẫn kiểm câu
// người dùng trước, và mọi lần ghi đều vào sổ nhật ký.
//
// ⭐ 24/09 (lượt 2) — GỠ 9 LỆNH KHÔNG CÒN NÚT: /alerts và /settings của Main là màn
// RIÊNG của Main (IssueMainView · CaiDatMainView), không còn các nút của bản fork
// Agent Base mà G2–G6, N2–N5 trỏ tới. G1 · G7 · G8 gắn móc vào đúng nút đang có.
// Còn 22 lệnh. Test so-lenh canh: mọi lệnh phải có `data-lenh` trên trang của nó.
//
// File THUẦN — không đụng fs, client import được.
// ============================================================

import { MOI_NHOM, NHAN_NHOM } from "@/lib/issue-main/model";

/** Cách trợ lý tác động lên một điểm giao diện */
export type KieuLenh =
  | "mo-trang" // điều hướng sang trang khác
  | "bam" // bấm một nút
  | "dien" // gõ chữ/số vào một ô
  | "chon" // chọn một giá trị trong danh sách xổ / radio / checkbox
  | "cuon"; // cuộn tới một dòng, không đụng gì

export interface LenhGiaoDien {
  /** Mã Mr. Đại dùng khi chốt danh sách — giữ nguyên, đừng đánh số lại */
  ma: string;
  ten: string;
  /** Trang chứa lệnh; "*" = dùng được ở mọi trang */
  trang: string;
  kieu: KieuLenh;
  /** true = đổi dữ liệu thật trên máy chủ */
  ghi: boolean;
  /** Chỉ vai này bấm được; bỏ trống = pm và kỹ sư đều được */
  vai?: "pm";
  /** Chuỗi khai trong `data-lenh` của phần tử; "" = chưa gắn nhãn */
  moc: string;
  ghiChu?: string;
  /**
   * Tập giá trị hợp lệ, NGUYÊN VĂN như trên màn hình. Bắt buộc khai với lệnh
   * chọn/bấm có nhiều lựa chọn — thiếu thì trợ lý tự đoán chữ và trượt
   * (đo 06/09: AI đoán "Găng nội bộ" trong khi ô ghi "Chỉ đường găng (nội bộ)").
   */
  giaTriHopLe?: string[];
  /** Đợt làm: 1 = làm trước (việc hằng ngày), 2, 3 = sau */
  dot: 1 | 2 | 3;
}

export const DANH_MUC_LENH: LenhGiaoDien[] = [
  // ===== A — đi lại trong app =====
  { ma: "A1", ten: "Mở một trong 20 trang", trang: "*", kieu: "mo-trang", ghi: false, moc: "chung.mo-trang", dot: 1 },
  { ma: "A2", ten: "Đổi dự án đang mở", trang: "*", kieu: "chon", ghi: false, moc: "chung.doi-du-an", dot: 1 },
  { ma: "A7", ten: "Cuộn tới đúng dòng / đúng mục", trang: "*", kieu: "cuon", ghi: false, moc: "chung.cuon-toi", ghiChu: "nền của mọi lệnh sửa dòng", dot: 1 },

  // ===== G — cảnh báo =====
  // ⭐ 24/09: màn Cảnh báo của Main (IssueMainView) — G1 · G7 · G8 gắn móc thật; G2–G6 gỡ (xem LENH_GO_KHONG_CON_NUT)
  // 01/11/2026: 11 tab thành chip CHỦ ĐỀ (chữ trơn, không emoji) — giaTri là tên chủ đề như trên chip
  { ma: "G1", ten: "Lọc màn Cảnh báo theo chủ đề", trang: "/alerts", kieu: "bam", ghi: false, moc: "alerts.chu-de", giaTriHopLe: ["Tất cả", ...MOI_NHOM.map((n) => NHAN_NHOM[n].slice(NHAN_NHOM[n].indexOf(" ") + 1).trim())], dot: 2 },
  { ma: "G7", ten: "Duyệt đề xuất AI vào sổ", trang: "/alerts", kieu: "bam", ghi: true, moc: "alerts.duyet-ai", ghiChu: "wbs = mã thẻ DX-… (chỉ thẻ đề xuất Main giữ sổ)", dot: 2 },
  { ma: "G8", ten: "Bác bỏ đề xuất AI kèm lý do", trang: "/alerts", kieu: "bam", ghi: true, moc: "alerts.bac-bo-ai", ghiChu: "wbs = mã thẻ DX-… · giaTri = lý do bác bỏ (bắt buộc) — bộ chạy điền ô lý do rồi mới bấm", dot: 2 },
  { ma: "G9", ten: "Mở popup dữ liệu gốc của một câu", trang: "*", kieu: "bam", ghi: false, moc: "chung.dan-nguon", dot: 2 },

  // ===== I — việc của tôi (04/10/2026: đọc/giao qua agent Công việc, bỏ Base.vn — CHOT 6g.7 mục 3) =====
  // I1 · I2 · I3 · I6 · I9 gỡ (xem LENH_GO_KHONG_CON_NUT); I4 đổi nghĩa: Gửi nháp sang agent Công việc
  { ma: "I4", ten: "Gửi một nháp AI sang agent Công việc", trang: "/viec-cua-toi", kieu: "bam", ghi: true, moc: "viec.gui-nhap", ghiChu: "phải chọn người/đơn vị nhận trước — nút mờ khi chưa chọn", dot: 3 },
  { ma: "I5", ten: "Bỏ một nháp AI", trang: "/viec-cua-toi", kieu: "bam", ghi: true, moc: "viec.bo-nhap", dot: 3 },
  { ma: "I8", ten: "Lọc: việc tôi giao / việc tôi nhận / việc cần phối hợp", trang: "/viec-cua-toi", kieu: "bam", ghi: false, moc: "viec.loc", giaTriHopLe: ["Việc tôi giao", "Việc tôi nhận", "Việc cần phối hợp"], dot: 3 },

  // ===== M — trợ lý & skill =====
  { ma: "M1", ten: "Chọn định dạng file muốn xuất", trang: "*", kieu: "bam", ghi: false, moc: "chat.dinh-dang-xuat", ghiChu: "11 nút dưới ô nhập", dot: 3 },
  { ma: "M2", ten: "Kẹp file cho trợ lý đọc", trang: "*", kieu: "bam", ghi: false, moc: "chat.kep-file", dot: 3 },
  { ma: "M3", ten: "Gọi một skill đích danh", trang: "*", kieu: "dien", ghi: false, moc: "chat.goi-skill", dot: 3 },
  { ma: "M4", ten: "Xuất một câu trả lời ra file", trang: "*", kieu: "bam", ghi: false, moc: "chat.xuat-tra-loi", dot: 3 },
  { ma: "M5", ten: "Đổi model đang dùng", trang: "*", kieu: "chon", ghi: true, moc: "chat.doi-model", dot: 3 },
  { ma: "M6", ten: "Mở phiên mới / đổi tên / xoá phiên", trang: "*", kieu: "bam", ghi: true, moc: "chat.phien", dot: 3 },
  { ma: "M7", ten: "Nạp, lưu, xoá skill", trang: "/skill", kieu: "bam", ghi: true, moc: "skill.quan-ly", dot: 3 },

  // ===== N — cài đặt =====
  // 24/09: N2–N5 gỡ hết — Cài đặt Main (CaiDatMainView) không còn ô/nút nào cho bốn việc đó (xem LENH_GO_KHONG_CON_NUT)
];

/**
 * Hai bước NGẦM — không phải lệnh người gọi, trợ lý tự làm khi cần:
 * • nạp lại trang sau khi ghi xong (A4 Mr. Đại bỏ, nhưng thiếu thì màn hình
 *   vẫn hiện số cũ sau khi lưu)
 * (bước "mở tab Cài đặt trước N2–N5" bỏ 24/09 cùng N2–N5)
 */
export const BUOC_NGAM = [
  // 24/09: bỏ "alerts.ghi-vao-so" (đi cùng G3) và "settings.mo-tab" (đi cùng N2–N5) — hai lệnh đó đã gỡ
  "chung.nap-lai",
  "chung.doi-du-an.mo", // mở danh sách dự án trước khi chọn (A2)
  // 24/09: bỏ "planning.luu.xac-nhan" · "planning.luu.mo-hop" — hộp Lưu của /planning đã gỡ khỏi Main
] as const;

/** 19 lệnh Mr. Đại LOẠI 06/09 — ghi lại để sau khỏi hỏi lại */
export const LENH_BI_LOAI = [
  "A3 tạo dự án mới",
  "A4 nạp lại trang (thành bước ngầm)",
  "A5 mở/thu/đóng khung trợ lý",
  "A6 mở trợ lý thành cửa sổ riêng",
  "B12 mở nhật ký thay đổi tiến độ",
  "D5 duyệt baseline người khác trình",
  "D6 bỏ đề nghị baseline",
  "D9 chạy AI đề xuất lịch khi nạp tổng thể",
  "E2 nạp tổng thể — đè & khởi động lại",
  "E4 xuất ảnh PNG Gantt",
  "F4 đính file vào dòng WBS",
  "I7 quét danh bạ toàn công ty",
  "J7 xoá file trên Drive",
  "N1 mở tab cài đặt (thành bước ngầm)",
  "N6 kiểm tra cổng MCP",
  "N7 quản lý dự án",
  "N8 quản lý người dùng",
  "N9 kết nối AI",
  "N10 kết nối Google Drive",
] as const;

/**
 * 61 lệnh GỠ 24/09 — trỏ trang tiến độ đã rời Main (xem đầu file). Ghi lại mã để
 * sau khỏi hỏi lại; trang nào quay về Main thì khôi phục từ git (commit trước 24/09).
 */
export const LENH_GO_24_09 = {
  "/planning": ["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9", "B10", "B11", "C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10", "C11", "C12", "D1", "D2", "D3", "D4", "D7", "D8", "E1", "E3", "E5", "F1", "F2", "F3"],
  "/docs": ["E6", "J1", "J2", "J3", "J4", "J5", "J6", "J8"],
  "/detail": ["H1", "H2", "H3", "H4", "H5"],
  "/productivity": ["H6", "H7", "H8"],
  "/thiet-ke": ["K1", "K2", "K3", "K4", "K5", "K6"],
  "/report-mgmt": ["L1", "L2", "L3"],
  "/report-field": ["L4"],
} as const;

/**
 * 9 lệnh GỠ 24/09 (lượt 2) — trang còn, nhưng NÚT không còn. Ghi lý do từng lệnh
 * để sau khỏi hỏi lại. Nút nào quay lại thì khôi phục từ git (commit trước 24/09).
 */
export const LENH_GO_KHONG_CON_NUT: Record<string, string> = {
  G2: "Chạy AI đề xuất issue mới — Main không có tab máy sinh/AI đề xuất (mục 8b.1); hai nút LLM của màn Cảnh báo Main là «Chạy phân loại lại» và «Chọn lại 5 việc», việc khác hẳn",
  G3: "Thêm issue do người nêu — màn Cảnh báo Main chỉ GOM issue từ agent chủ, không có biểu mẫu thêm issue",
  G4: "Ghi nhận đã xử lý — không có nút; ghi nhận xử lý làm ở agent chủ (chốt BC — sửa ở agent chủ)",
  G5: "Đóng một issue — Main không đóng issue của agent khác; nút đang có là 🙈 Ẩn / 🗑 Xoá (issue SAI), khác nghĩa «đóng»",
  G6: "Nhờ AI soạn việc giao từ issue — màn Cảnh báo Main không có nút soạn việc (nút giao việc nằm ở Bảng điều hành)",
  N2: "Sửa và lưu 5 bộ ngưỡng cảnh báo — Cài đặt Main tab 🔔 chỉ XEM nhịp định kỳ + luật động, không có ô ngưỡng",
  N3: "Sửa và lưu bảng quy tắc P01–P10 — Cài đặt Main không có bảng quy tắc P (5 tab: 🔔 · 📁 · 🔌 · 👥 · 🧩)",
  N4: "Chạy ngay một kịch bản hẹn giờ — nhịp định kỳ ở Cài đặt Main chỉ xem, không có nút chạy ngay",
  N5: "Sửa văn phong trợ lý — Cài đặt Main không có ô văn phong",
  // 04/10/2026 — Việc của tôi bỏ Base.vn (CHOT 6g.7 mục 3): giao việc mới làm ở agent Công việc
  I1: "Mở form giao việc — màn Việc của tôi bỏ form giao kiểu Base.vn (04/10); giao việc mới làm ở agent Công việc",
  I2: "Điền form giao việc — form giao kiểu Base.vn đã gỡ cùng I1 (04/10)",
  I3: "Bấm tạo việc lên Base — Main không ghi lên Base.vn nữa; việc AI soạn gửi bằng I4 sang agent Công việc",
  I6: "Quét lại việc từ Base — danh sách đọc thẳng agent Công việc mỗi lần mở màn, không còn bản quét Base.vn",
  I9: "Sửa mô tả một việc — bấm việc mở ở agent Công việc, sửa ở đó (04/10)",
};

/**
 * Ba lệnh CHỈ DÙNG CHO NÚT "▶ Xem thử con trỏ" trong Cài đặt — bấm chính ba
 * nút lọc của thẻ đó. Tách khỏi danh mục 92 để không lẫn vào việc thật, nhưng
 * `timTheoMoc` vẫn tra được để bộ chạy nhận ra.
 */
export const LENH_THU: LenhGiaoDien[] = [
  { ma: "T1", ten: "(xem thử) lọc Đợt 1", trang: "/settings", kieu: "bam", ghi: false, moc: "settings.thu.dot1", dot: 1 },
  { ma: "T2", ten: "(xem thử) Chỉ lệnh ghi dữ liệu", trang: "/settings", kieu: "bam", ghi: false, moc: "settings.thu.ghi", dot: 1 },
  { ma: "T3", ten: "(xem thử) về Tất cả", trang: "/settings", kieu: "bam", ghi: false, moc: "settings.thu.tatca", dot: 1 },
];

export function timLenh(ma: string): LenhGiaoDien | undefined {
  return DANH_MUC_LENH.find((l) => l.ma === ma.toUpperCase());
}

export function timTheoMoc(moc: string): LenhGiaoDien | undefined {
  return DANH_MUC_LENH.find((l) => l.moc === moc) ?? LENH_THU.find((l) => l.moc === moc);
}

/** Lệnh vai trò này được bấm */
export function lenhTheoVai(vai: "pm" | "engineer"): LenhGiaoDien[] {
  return DANH_MUC_LENH.filter((l) => !l.vai || l.vai === vai);
}

/** Đã gắn nhãn `data-lenh` vào giao diện chưa — cập nhật khi gắn xong từng đợt */
export const DOT_DA_GAN: Array<1 | 2 | 3> = [1, 2, 3];

export function daGan(l: LenhGiaoDien): boolean {
  return DOT_DA_GAN.includes(l.dot);
}
