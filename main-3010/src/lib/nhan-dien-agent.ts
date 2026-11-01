// ============================================================
// NHẬN DIỆN AGENT — MỘT ĐỊNH NGHĨA DUY NHẤT
//
// Vì sao có file này: bộ code này fork từ Agent tiến độ rồi qua Agent Base,
// nên tên "SCI Tiến độ" / "Agent tiến độ" / "Agent Base.vn" còn vương khắp
// nơi — tiêu đề thẻ trình duyệt, trang đăng nhập, và NGHIÊM TRỌNG NHẤT là
// chữ ký cuối mô tả việc ghi LÊN BASE THẬT: việc do Main tạo lại đóng dấu
// "qua Agent Base.vn".
//
// ⭐ SỬA 07/09/2026 — bộ code này là MAIN AGENT (cổng 3010), không phải
// Agent Base (cổng 3011). `MA_AGENT`/`TEN_AGENT` còn ghi "base" là di sản
// lúc fork; chữ ký giao hộ vì thế ghi sai tên agent vào dữ liệu THẬT trên
// Base — sai là sai vĩnh viễn trên bản ghi bên đó.
//
// Từ nay mọi chỗ hiện tên agent đọc từ đây. Sang agent khác chỉ sửa một file.
//
// ⚠ File THUẦN — không đụng node:fs, cả server lẫn màn hình đều import được.
// ============================================================

/** Mã agent dùng trong cổng MCP và sổ nhật ký (HOP-DONG-KET-NOI mục 3) */
export const MA_AGENT = "main";

/** Tên đầy đủ — hiện ở thanh bên, trang đăng nhập */
export const TEN_AGENT = "Main Agent";

/** Một câu tả đúng bản chất con này — Main KHÔNG giữ dữ liệu nghiệp vụ */
// ⚠ Chữ "con" là CỐ Ý, đừng đổi thành "agent". Bài test lái trình duyệt và
// cả hai bản hướng dẫn (BAI-TEST-NGUOI-DUNG.md, HUONG-DAN-VA-BAI-TEST.html)
// đều chốt đúng câu này. Đổi một chữ ở đây là ba chỗ kia sai theo — đã dính
// thật 07/09/2026.
export const MOT_CAU_TA = "Hỏi 4 con kia rồi tổng hợp";

/** Ban phụ trách — PLAN-MAIN-AGENT, đầu file */
export const BAN_PHU_TRACH = "Ban Quản lý dự án";

/**
 * MÀN ĐÁP XUỐNG sau khi đăng nhập.
 *
 * Trước 07/09/2026 chỗ này là `/` — và `/` render nguyên "Tổng quan dự án"
 * kế thừa của Agent Tiến độ (S-Curve 4 đường · hạng mục đường găng · KPI
 * %TT/%KH), đọc thẳng `data/schedule.json` tại chỗ. Đó là vi phạm luật lõi
 * (KE-HOACH/06 — "Main KHÔNG giữ dữ liệu nghiệp vụ… cần số thì ĐI HỎI").
 *
 * Báo cáo sáng là màn CHÍNH của Main theo PLAN-MAIN-AGENT mục 6/7: nó đi
 * hỏi 4 con kia qua `hoiAgent()` rồi tổng hợp — đúng bản chất Main, và là
 * mục đầu tiên của nhóm menu đầu tiên.
 */
// Chốt AX + BH (08/09): màn mặc định là BẢNG ĐIỀU HÀNH (demo navitem active).
export const TRANG_CHU_MAIN = "/bang-dieu-hanh";

/** Hậu tố tiêu đề thẻ trình duyệt: "Việc của tôi — Main Agent" */
export const HAU_TO_TIEU_DE = TEN_AGENT;

/**
 * Chữ ký giao hộ, nối vào cuối mô tả việc ghi lên Base.
 *
 * Vá lỗi đo 05/09/2026: khoá API đứng tên @thinhhp nên Base ghi người tạo
 * LUÔN là @thinhhp, bất kể ai bấm. Dòng chữ ký này là chỗ duy nhất người
 * đọc trên Base biết ai thật sự giao việc.
 *
 * Đây là chữ ghi vào dữ liệu THẬT trên Base, không phải chữ trên màn hình,
 * nên tên agent sai là sai vĩnh viễn trên bản ghi Base.
 */
export function chuKyGiaoHo(nguoiTao: string): string {
  return `— Giao bởi @${nguoiTao} qua ${TEN_AGENT}`;
}

/** Tiêu đề trang: "Báo cáo sáng — Main Agent" */
export function tieuDeTrang(ten: string): string {
  return `${ten} — ${HAU_TO_TIEU_DE}`;
}
