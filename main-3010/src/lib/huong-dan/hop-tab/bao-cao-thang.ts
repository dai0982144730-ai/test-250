// Hộp «Hướng dẫn tab này» — màn Báo cáo tháng, 3 tab theo khuôn trang in A4 (Mr. Đại chốt 28/10/2026). File THUẦN — chỉ chữ.
// Nguồn đã đọc: components/tabs/bao-cao-thang/BaoCaoThangView.tsx · lib/bao-cao-thang/model.ts (6 mục · 11 bảng).
import type { NoiDungHopTab } from "@/components/common/HopHuongDanTab";

export type MaTabBaoCaoThang = "tong-quan" | "chi-tiet" | "kien-nghi";

const NUT: NoiDungHopTab["nut"] = [
  { ten: "Làm lại báo cáo", tacDung: "Hỏi lại mọi agent rồi soạn lại phần 🤖. Chữ anh/chị đã sửa tay KHÔNG bị đè." },
  { ten: "✎ Sửa", tacDung: "Sửa lời văn 🤖 tại chỗ, rời ô là lưu. Ô số do agent trả về không sửa được." },
  { ten: "⬇ Xuất Excel", tacDung: "Tải file Excel theo mẫu công ty, đúng chữ đang thấy trên màn (kể cả chữ đã sửa)." },
];

export const HUONG_DAN_BAO_CAO_THANG: Record<MaTabBaoCaoThang, NoiDungHopTab> = {
  "tong-quan": {
    ma: "tong-quan",
    tomTat: "đầu báo cáo, bảng 1–3 (mục I Tổng quan các dự án)",
    mucDich: "Nhìn một lượt: ai lập, kỳ nào, mỗi dự án đang ở đâu. Số do máy gom từ các agent, mỗi ô rê chuột thấy nguồn.",
    cot: [
      { ten: "Bảng 1–2 · Đầu báo cáo", noiLen: "Đơn vị lập, nơi nhận, người ký, kỳ báo cáo", docDe: "Kiểm ba ô đầu đã khai chưa" },
      { ten: "Bảng 3 · Tổng quan các dự án", noiLen: "Mỗi dự án một dòng: công suất, địa điểm, giai đoạn, tiến độ", docDe: "Dự án nào ô trống thì đi khai ở Cài đặt → Dự án" },
    ],
    nut: NUT,
  },
  "chi-tiet": {
    ma: "chi-tiet",
    tomTat: "mục II tiến độ · III pháp lý & GPMB · IV hợp đồng, thanh toán & nguồn lực (bảng 4–9)",
    mucDich: "Số chi tiết từng dự án. Bảng dài chỉ hiện 5 dòng (toàn công ty) hoặc 10 dòng (một dự án); bấm «Xem thêm» để bung. Hàng tổng nằm trên cùng.",
    cot: [
      { ten: "Mục II", noiLen: "Tiến độ từng dự án, việc găng, khối lượng", docDe: "Câu nhanh/chậm luôn ghi số ngày và so với hệ nào" },
      { ten: "Mục III–IV", noiLen: "Hồ sơ pháp lý, GPMB, hợp đồng, thanh toán, nguồn lực", docDe: "Người xem không thấy phần hợp đồng và giá tiền" },
    ],
    nut: NUT,
  },
  "kien-nghi": {
    ma: "kien-nghi",
    tomTat: "mục V vấn đề nổi bật & kiến nghị · VI kế hoạch tháng tới (bảng 10–11)",
    mucDich: "Phần lãnh đạo cần quyết. Cột 🤖 (đánh giá, kiến nghị, kết quả cần có) do AI soạn — người ký duyệt và sửa tại chỗ trước khi xuất.",
    cot: [
      { ten: "Mục V · Bảng 10", noiLen: "Rủi ro, mức độ, số ngày ảnh hưởng, kiến nghị", docDe: "Kiến nghị nào cần lãnh đạo quyết" },
      { ten: "Mục VI · Bảng 11", noiLen: "Việc tháng tới, hạn, kết quả cần có", docDe: "Đủ cụ thể và có hạn chưa" },
    ],
    nut: NUT,
  },
};
