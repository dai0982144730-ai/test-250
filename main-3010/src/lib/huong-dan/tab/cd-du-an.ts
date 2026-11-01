// Hướng dẫn bản 2 (tab) — Cài đặt → tab «📁 Quản lý dự án». Viết 20/10/2026 theo mẫu Nghiệm thu + luật chữ AI (Mr. Đại).
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Cài đặt — Quản lý dự án",
  ai: "PM và Admin (quyền Cài đặt). Người dùng và Người xem không vào được Cài đặt.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Tab này là gì?",
          doan: ["Đây là NƠI GỐC khai danh sách dự án của cả hệ. Mỗi dự án có tên, mã ngắn, đơn vị làm, công suất, địa điểm, giai đoạn, Giám đốc dự án, ngày khởi công. Bốn agent kia (Tiến độ, Hợp đồng, Pháp lý, Công việc) kéo danh sách này về và chỉ đọc, nên sửa ở đây là cả hệ đổi theo. Sau mỗi lần ghi, Main tự đẩy sang các agent và hiện một dòng cho biết agent nào đã nhận."],
        },
        {
          tieuDe: "Vì sao cần?",
          ds: ["Mã ngắn (ví dụ HV, N3A) là khoá nối năm agent — thiếu mã thì các agent kia không nối được dự án.", "Giám đốc dự án (email) quyết định ai thấy nút «Ký hồ sơ» bên Agent Hợp đồng.", "Toạ độ công trường để Agent Tiến độ lấy dự báo thời tiết cho đúng nơi.", "Từ điển ngữ cảnh để AI của mọi agent hiểu tên viết tắt của công ty."],
        },
        {
          tieuDe: "Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Bước trước", "Tab này", "Bước sau"],
            ["Có dự án mới", "Khai dự án, toạ độ, từ điển", "Các agent kéo về; Bảng điều hành, Báo cáo, Issue có dự án mới"],
          ],
        },
        {
          tieuDe: "Ba thẻ trong tab",
          bang: [
            ["Thẻ", "Để làm gì", "Xem tab"],
            ["Quản lý dự án (bảng)", "Tạo, đổi tên, sửa thông tin, lưu trữ, xoá", "① Tạo và sửa dự án"],
            ["📍 Toạ độ công trường", "Vĩ độ, kinh độ mỗi dự án", "② Toạ độ công trường"],
            ["Sơ đồ tổ chức và dự án — từ điển ngữ cảnh", "Chữ dặn AI dùng chung", "③ Từ điển ngữ cảnh"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · AI",
          bang: [
            ["Người", "Máy", "🤖 AI"],
            ["Nhập, sửa, lưu trữ, xoá, gõ từ điển", "Lưu, kiểm mã trùng, đẩy sang bốn agent, ghép phần dự án và sơ đồ tổ chức vào từ điển, chuyển dự án xoá vào thùng rác", "Tab này không gọi AI; từ điển được các AI của mọi agent đọc khi gặp tên viết tắt lạ"],
          ],
        },
        {
          tieuDe: "Quy trình người ↔ AI",
          ds: ["Tab không dùng AI để làm việc. Chữ anh/chị gõ ở từ điển là thứ AI của các agent đọc: gõ rõ thì AI hiểu đúng tên."],
        },
      ],
    },
    {
      ten: "① Tạo và sửa dự án",
      khoi: [
        {
          bam: [
            "Bấm «+ Tạo dự án» (đổi thành «Đóng form») để mở form «Tạo dự án mới»: gõ «Tên dự án», chọn ngày khởi công (tuỳ chọn), «Mã ngắn dùng chung cả hệ» (2–6 ký tự chữ / số, ví dụ HV, N3A), «Email Giám đốc dự án», nhóm («SCI đầu tư» hoặc «Loại khác»), «Tên gọi khác» cách nhau dấu «;». Cuối cùng bấm «Tạo dự án».",
            "Trong bảng (các cột Tên dự án · Mã ngắn · Nhóm · Đơn vị · Tên gọi khác · Công suất · Loại hình · Địa điểm · Giai đoạn · Giám đốc dự án · Ngày khởi công · Ngày tạo · Trạng thái · Hành động) bấm sửa ở dòng để đổi; «Lưu» hoặc «Hủy». Ô «Đơn vị» chọn là lưu luôn.",
            "«Lưu trữ» / «Bỏ lưu trữ» để ẩn dự án đã xong mà không mất dữ liệu.",
            "«Xóa»: hỏi lại, bấm «Xác nhận xóa» — dữ liệu chuyển vào thùng rác, không mất vĩnh viễn. «Hủy» để thôi.",
          ],
        },
        {
          ketQua: ["Dòng chữ nhỏ báo «Đã đẩy sang N agent» hoặc agent nào chưa nhận kèm lý do. Dự án gốc không lưu trữ, không xoá được (nút mờ có chú thích)."],
        },
        {
          viDu: ["Hệ hiện có 16 dự án (0 đã lưu trữ), ví dụ «Điện gió Hướng Việt» mã HV, 30 MW, giai đoạn «Đang thi công»; «Nậm săm 3A» mã N3A, 156 MW; «Tân Thành» mã TT, 48 MW, «Chuẩn bị đầu tư». Giai đoạn chọn trong ba giá trị: «Chuẩn bị đầu tư», «Đang thi công», «Vận hành»."],
        },
        {
          luuY: ["Dòng không có mã hiện chữ đỏ «chưa có mã — 4 agent kia không nối được».", "Email Giám đốc dự án phải khớp một tài khoản có thật ở tab 👥; không khớp có dòng đỏ nhắc."],
        },
      ],
    },
    {
      ten: "② Toạ độ công trường",
      khoi: [
        {
          doan: ["Mỗi dự án một toạ độ riêng — Agent Tiến độ kéo về để lấy dự báo thời tiết đúng chỗ. Chỉ khai ở Main."],
        },
        {
          bam: ["Ở thẻ «📍 Toạ độ công trường» nhập «Vĩ độ (−90…90)» và «Kinh độ (−180…180)» cho từng dòng dự án rồi lưu ở dòng đó.", "Dòng chưa có dự án thì thẻ ghi «Chưa có dự án nào — khai ở bảng Dự án phía trên»."],
        },
        {
          viDu: ["Điện gió ở Quảng Trị có thể nhập vĩ độ 16.75 và kinh độ 106.60 (đúng như ô gợi ý trên màn). Nhập sai dấu thì dự báo thời tiết sẽ lấy sai nơi."],
        },
      ],
    },
    {
      ten: "③ Từ điển ngữ cảnh",
      khoi: [
        {
          doan: ["Là đoạn chữ mô tả công ty để AI các agent hiểu tên viết tắt lạ. Phần dự án, sơ đồ tổ chức, chức năng nhiệm vụ do máy tự ghép từ dữ liệu gốc; anh/chị chỉ gõ HAI ô."],
        },
        {
          bam: ["Gõ ô «A. Tập đoàn và các công ty thành viên» (tên công ty, viết tắt hay gặp, lĩnh vực…).", "Gõ ô «D. Chỗ bổ sung» (tên gọi khác, ghi chú thêm cho AI…).", "Bấm «Lưu hai ô»; chữ «Có thay đổi chưa lưu» nhắc nếu quên.", "Bấm «Xem bản các agent đọc» để thấy bản đầy đủ máy ghép (chỉ đọc)."],
        },
        {
          ai: ["🤖 AI của các agent đọc từ điển này mỗi khi gặp tên viết tắt hay tên lạ trong báo cáo, issue, hợp đồng.", "AI chỉ dùng từ điển để hiểu tên, không được lấy số từ đó.", "Người kiểm bằng cách mở «Xem bản các agent đọc»; từ điển sai thì AI hiểu sai tên."],
        },
        {
          viDu: ["Gõ «TS = Tổng thầu», «HP1 = Hướng Phùng 1»; sau đó báo cáo sáng ghi «tuần này theo dõi sát nhà thầu TS» sẽ được AI hiểu đúng."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["«Đẩy sang agent: x/y nhận»", "Có agent đang tắt; khi bật lại vào Cài đặt agent đó bấm «↻ Kéo lại từ Main»."],
            ["Không xoá / lưu trữ được dự án", "Đó là dự án gốc."],
            ["Mã ngắn bị từ chối", "Mã phải 2–6 ký tự chữ / số và không trùng dự án khác."],
            ["Nút mờ", "Cần quyền Cài đặt (PM, Admin)."],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt Mr. Đại 11/09/2026 (Main là bản gốc Dự án · Người dùng · Kết nối); 04/10/2026 (từ điển ngữ cảnh tự ghép).",
};
