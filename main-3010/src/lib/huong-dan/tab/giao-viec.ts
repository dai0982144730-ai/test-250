// Hướng dẫn bản 2 (tab) — khung «Giao việc» (nút «Giao việc» / «Nhắc» ở Bảng điều hành; nút «Sửa» ở Việc của tôi). Viết 20/10/2026.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Khung giao việc",
  ai: "Người có quyền ghi (PM, Admin, Người dùng). Người xem mở được khung nhưng nút «Giao việc» mờ, rê chuột có lý do.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Khung giao việc là gì?",
          doan: ["Một khung nhỏ để giao MỘT việc sang agent Công việc. Giống ô «+» giao việc bên agent Công việc: giao cho ai, thuộc dự án nào, nội dung, kết quả cần có, hạn. Việc tạo ra từ đây nằm ở sổ việc của agent Công việc, Main không giữ sổ riêng."],
        },
        {
          tieuDe: "Vì sao cần?",
          ds: ["Thấy vấn đề ở màn nào cũng giao ngay được, nội dung đã điền sẵn nên người nhận khỏi hỏi lại.", "Một đường duy nhất để tạo việc, nên việc không lệch giữa các agent."],
        },
        {
          tieuDe: "Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Bước trước", "Khung này", "Bước sau"],
            ["Bảng điều hành (nút «Giao việc», «Nhắc») hoặc Việc của tôi (nút «Sửa» trên nháp)", "Điền / sửa rồi bấm «Giao việc»", "Việc xuất hiện ở agent Công việc của người nhận; Việc của tôi cập nhật"],
          ],
        },
        {
          tieuDe: "Các ô trong khung",
          bang: [
            ["Ô", "Để làm gì"],
            ["Giao cho", "Người hoặc đơn vị nhận"],
            ["Thuộc dự án", "Không bắt buộc; «— Không thuộc dự án nào —» nếu việc chung"],
            ["Nội dung việc (và nút 📎)", "Việc cần làm; 📎 kẹp tệp đính kèm"],
            ["Kết quả cần có", "Người nhận phải nộp gì thì coi là xong"],
            ["Hạn", "Ngày dd/mm/yyyy, không chọn ngày đã qua"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · AI",
          bang: [
            ["Người", "Máy", "🤖 AI"],
            ["Chọn người nhận, sửa chữ, chọn hạn, bấm «Giao việc»", "Điền sẵn từ dòng vừa bấm; lấy danh sách người, đơn vị, dự án theo quyền; tạo việc; đếm số ngày từ hôm nay tới hạn", "🤖 Chỉ khi khung mở từ nháp do AI soạn (nút «Sửa» ở Việc của tôi): chữ điền sẵn là của AI, có dòng «🤖 AI đã điền sẵn — sửa chỗ chưa đúng rồi bấm Giao việc». Khung mở từ Bảng điều hành không dùng AI"],
          ],
        },
        {
          tieuDe: "Quy trình người ↔ AI",
          ds: ["Có AI chỉ khi nháp do AI soạn: AI điền, người sửa và quyết.", "Từ Bảng điều hành khung do máy điền sẵn từ số liệu của dòng, không có AI.", "Người luôn là bên bấm «Giao việc»; AI không bao giờ tự giao."],
        },
      ],
    },
    {
      ten: "① Điền và giao",
      khoi: [
        {
          bam: [
            "«Giao cho»: bấm ô — hiện Ban lãnh đạo rồi các đơn vị theo sơ đồ, thụt lề theo cấp; gõ chữ để lọc; gõ «@» ra tên người (không dấu vẫn khớp). Bấm một dòng là chọn xong và đóng. Danh sách chỉ có nơi anh/chị giao được.",
            "«Thuộc dự án»: chọn trong danh sách hoặc để «— Không thuộc dự án nào —».",
            "«Nội dung việc»: sửa cho rõ; muốn kẹp tệp bấm 📎 (mờ nếu agent Công việc tắt kẹp tệp; giới hạn số tệp, dung lượng, thời gian lưu hiện trong lời rê chuột).",
            "«Kết quả cần có»: ví dụ «tờ trình gửi TGĐ».",
            "«Hạn»: gõ hoặc chọn dd/mm/yyyy; bên dưới hiện số ngày từ hôm nay tới hạn.",
            "Bấm «Giao việc». Cạnh nút có dòng lý do khi chưa đủ điều kiện.",
          ],
        },
        {
          ketQua: ["Khung đóng, dòng xanh «✓ Đã giao cho … — việc … ở agent Công việc». Lỗi thì dòng đỏ ngay trong khung, nội dung vẫn giữ để thử lại."],
        },
        {
          viDu: ["Từ Bảng điều hành, hồ sơ HV-08-02 Hợp đồng tư vấn giám sát thi công đang thiếu: tên việc điền sẵn «Hoàn thiện hồ sơ HV-08-02 — Hợp đồng tư vấn giám sát thi công», mô tả ghi cơ quan giữ hồ sơ và số ngày quá hạn. Anh/chị chỉ cần chọn người nhận và hạn."],
        },
        {
          luuY: ["Chưa đủ thông tin thì nút «Giao việc» mờ — đọc chữ lý do bên cạnh.", "Hạn trong quá khứ không được chọn."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Danh sách «Giao cho» trống hoặc báo lỗi", "Agent Công việc đang tắt hoặc anh/chị chưa có quyền giao; đợi bật lại, hoặc nhờ quản trị."],
            ["Nút 📎 mờ", "Kẹp tệp đang tắt trong Cài đặt của agent Công việc, hoặc anh/chị là Người xem."],
            ["Giao xong không thấy trong «Việc của tôi»", "Việc nằm ở sổ của người nhận. Giao cho người khác thì thấy ở «Việc tôi giao» sau khi bấm «Tải lại»."],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt Mr. Đại 04/10/2026 (ô giao việc giống ô «+» của agent Công việc; ô Giao cho 2 trong 1); luật 31 (khoảng ngày kèm số ngày).",
};
