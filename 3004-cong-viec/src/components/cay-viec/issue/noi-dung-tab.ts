// Nội dung hộp «Hướng dẫn tab này» của 4 tab màn Cảnh báo agent Công việc (Mr. Đại 25/10/2026 — đồng bộ 4 agent theo màn Cảnh báo của Tiến độ).
// File THUẦN — chỉ chữ. Nguồn đã đọc: IssueView.tsx (nguongDangDung, CAC_TAB_MAN_ISSUE) · lib/cay-viec/issue/model.ts (nhanTab, demTheoTab).
import type { NoiDungHopTab } from "@/components/common/HopHuongDanTab";
import type { NguonIssue } from "@/lib/cay-viec/issue/model";

const NUT_CHUNG = [
  { ten: "Giao việc · Sửa · Bỏ qua (dưới mỗi thẻ)", tacDung: "Soạn việc giao ngay dưới thẻ (máy hỏi trùng các agent khác trước); Sửa mở ô giao ở cột phải; Bỏ qua ẩn thẻ 30 ngày. Không có quyền thì nút ẩn." },
  { ten: "Hiện lại bỏ qua", tacDung: "Xem các thẻ đang bỏ qua (30 ngày gần nhất) của mọi tab; bấm «Hiện lại» để đưa thẻ về chỗ cũ." },
  { ten: "Phạm vi", tacDung: "Chỉ cảnh báo của agent Công việc, hoặc xem lại cảnh báo đã đóng (chỉ đọc)." },
];

export const HUONG_DAN_TAB_CANH_BAO: Partial<Record<NguonIssue, NoiDungHopTab>> = {
  "nang-suat": {
    ma: "nang-suat",
    tomTat: "người đang tồn việc quá hạn lâu — mỗi người một thẻ",
    mucDich:
      "Máy xét từng việc đang mở có mã WBS đã duyệt, quá hạn từ N ngày trở lên (N khai ở «Sửa ngưỡng của tab này»), rồi GOM THEO NGƯỜI chủ trì: mỗi người một thẻ, kể hết việc trễ của người đó. Việc không ai chủ trì gom một thẻ riêng. Chưa có mã WBS đã duyệt thì máy không sinh thẻ.",
    cot: [
      { ten: "Tên thẻ", noiLen: "Người chủ trì và số việc quá hạn của người đó", docDe: "Biết ai đang tồn việc" },
      { ten: "Dòng chi tiết", noiLen: "Từng việc: mã + tên, quá hạn bao nhiêu ngày so với hạn đã giao", docDe: "Hỏi đúng việc, đúng người" },
    ],
    nut: NUT_CHUNG,
  },
  "xong-giay": {
    ma: "xong-giay",
    tomTat: "việc báo xong trên sổ mà công trường không ai báo có làm",
    mucDich:
      "Việc trong sổ báo HOÀN THÀNH, nhưng ở agent Tiến độ đầu việc WBS tương ứng vẫn 0% và không có báo cáo ngày nào ghi khối lượng trong ±K ngày quanh ngày xong. Máy gom theo người đã báo xong, kê các việc và mã WBS còn thiếu báo cáo khối lượng. Chiều ngược (WBS 100% mà việc còn mở) thì nhắc đóng việc.",
    cot: [
      { ten: "Tên thẻ", noiLen: "Người báo xong và số việc nghi «xong trên giấy»", docDe: "Biết ai cần hỏi" },
      { ten: "Dòng chi tiết", noiLen: "Việc, mã WBS thiếu báo cáo khối lượng, ngày báo xong", docDe: "Đối chiếu với báo cáo ngày" },
    ],
    nut: NUT_CHUNG,
  },
  nguoi: {
    ma: "nguoi",
    tomTat: "vấn đề người tự ghi vào sổ",
    mucDich:
      "Người dùng thấy vấn đề máy chưa bắt được thì thêm bằng nút «+ Thêm issue» (ghi thẳng vào sổ, có hiệu lực ngay). Đã giao việc thì việc xong là máy tự đóng thẻ. Tab này không có ngưỡng.",
    cot: [
      { ten: "Tên thẻ", noiLen: "Vấn đề do người ghi", docDe: "Biết cần xem gì" },
      { ten: "Người thêm · ngày", noiLen: "Ai ghi và khi nào", docDe: "Hỏi lại đúng người" },
    ],
    nut: [{ ten: "+ Thêm issue", tacDung: "Mở form ghi vấn đề mới ở cột phải." }, ...NUT_CHUNG],
  },
  ai: {
    ma: "ai",
    tomTat: "🤖 vấn đề AI đọc từ báo cáo đã nộp, chờ người duyệt",
    mucDich:
      "🤖 AI đọc bảng Sự cố · Cảnh báo của báo cáo tuần/tháng đã nộp, đề xuất vấn đề và bắt buộc trích nguyên văn câu chữ nguồn. Chỉ chạy khi người bấm «🤖 Chạy AI đề xuất» (tốn token). Đáng làm thì Giao việc, không thì Bỏ qua.",
    cot: [
      { ten: "🤖 Tên thẻ", noiLen: "Vấn đề AI đề xuất (chữ do AI viết)", docDe: "Quyết định có đáng xử lý không" },
      { ten: "Trích nguồn", noiLen: "Câu chữ nguyên văn trong báo cáo mà AI dựa vào", docDe: "Kiểm AI có đọc đúng không" },
    ],
    nut: [{ ten: "🤖 Chạy AI đề xuất", tacDung: "AI đọc báo cáo đã nộp rồi đề xuất thẻ; kết quả hiện ở cột phải. Chỉ người có quyền duyệt thấy nút." }, ...NUT_CHUNG],
  },
};
