// Hướng dẫn bản 2 (tab) — Cài đặt → tab «📊 Thống kê dùng AI». Viết 20/10/2026 theo mẫu Nghiệm thu + luật chữ AI (Mr. Đại).
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Cài đặt — Thống kê dùng AI",
  ai: "PM và Admin (quyền Cài đặt). Người khác thấy câu báo «Thống kê dùng AI chỉ PM và Admin xem được».",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Tab này là gì?",
          doan: ["Cho biết hệ đã dùng AI bao nhiêu: bao nhiêu lượt hỏi, tài khoản nào gánh, AI chạy hay phải ngừng vì hết hạn mức, ai dùng nhiều và tính năng nào dùng nhiều. Mọi số do máy đếm từ sổ dùng AI; màn chỉ vẽ."],
        },
        {
          tieuDe: "Vì sao cần?",
          ds: ["Tài khoản Claude có hạn mức theo chu kỳ 5 giờ và theo tuần; biết dùng nhiều ở giờ nào, của ai để chia lại việc.", "Thấy lúc AI phải ngừng (hết hạn mức) để biết có nên nối thêm tài khoản.", "Biết tính năng nào dùng AI nhiều nhất để cân nhắc việc nào nên để máy tự làm."],
        },
        {
          tieuDe: "Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Bước trước", "Tab này", "Bước sau"],
            ["Trợ lý, báo cáo, issue… gọi AI; mỗi lượt được ghi sổ", "Xem thống kê theo Ngày / Tuần / Tháng", "Quyết định nối thêm tài khoản ở tab «🔌 Kết nối», hoặc đổi cách dùng"],
          ],
        },
        {
          tieuDe: "Các khối trên màn",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Hàng nút «Ngày» · «Tuần» · «Tháng», nút kỳ trước / kỳ sau, ô chọn ngày, «Hôm nay», làm mới", "Chọn kỳ xem", "① Chọn kỳ và đọc đồ thị"],
            ["Đồ thị «① Token (vào + ra) theo tài khoản»", "Lượng dùng theo bốn nguồn tài khoản", "① Chọn kỳ và đọc đồ thị"],
            ["Đồ thị «② Thời gian»", "AI chạy, ngừng, rảnh", "① Chọn kỳ và đọc đồ thị"],
            ["«Bảng số chi tiết theo giờ / ngày»", "Con số từng mốc", "② Bảng số và xếp hạng"],
            ["«Ai dùng nhiều nhất» · «Tính năng tốn token nhất»", "Năm người và năm tính năng đứng đầu", "② Bảng số và xếp hạng"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · AI",
          bang: [
            ["Người", "Máy", "🤖 AI"],
            ["Chọn kỳ, bấm mốc để xem sâu, đọc", "Ghi sổ mỗi lượt gọi AI, cộng theo kỳ, chia theo tài khoản, đo phút chạy và phút ngừng, xếp hạng", "Tab này không dùng AI; nó chỉ đếm các lượt AI của chỗ khác"],
          ],
        },
        {
          tieuDe: "Quy trình người ↔ AI",
          ds: ["Tab này không dùng AI. Mọi con số do máy cộng từ sổ, cùng đầu vào ra cùng kết quả."],
        },
      ],
    },
    {
      ten: "① Chọn kỳ và đọc đồ thị",
      khoi: [
        {
          bam: [
            "Bấm «Ngày», «Tuần» hoặc «Tháng».",
            "Bấm mũi tên trái / phải để lùi hoặc tiến một kỳ, hoặc chọn ngày ở ô «Chọn ngày» (dd/mm/yyyy); «Hôm nay» để quay về ngày hiện tại.",
            "Đồ thị ①: bốn đường mềm theo bốn nguồn — tài khoản 1 (cam), tài khoản 2 (xanh dương), tài khoản cá nhân (xanh lá), khoá API (xám). Chế độ Ngày mỗi đường 100 nghìn đơn vị, Tuần và Tháng 1 triệu.",
            "Đồ thị ②: một vệt dài suốt kỳ — xanh lúc AI đang chạy, vàng lúc AI ngừng vì hết hạn mức, xám lúc rảnh.",
            "Ở Tuần hoặc Tháng bấm vào một mốc trên đồ thị để mở đúng Ngày đó theo từng giờ.",
          ],
        },
        {
          viDu: ["Hôm nay 20/10/2026 tính theo giờ từ 0h đến 23h: mốc nào cũng 0 lượt, 0 lỗi, 0 phút chạy — chưa có lượt AI nào được ghi trong ngày."],
        },
        {
          luuY: ["Phần của tương lai chưa tới mốc thì để trống, không phải 0 lượt."],
        },
      ],
    },
    {
      ten: "② Bảng số và xếp hạng",
      khoi: [
        {
          bam: [
            "Bấm «Bảng số chi tiết theo giờ» (hoặc «theo ngày») để mở; mặc định đóng. Các cột «Lượt» · «Token vào» · «Token ra» · «TK1 / TK2 / cá nhân» · «AI chạy» · «Ngừng» · «Hết hạn mức / lỗi»; dòng cuối «Tổng cả kỳ». Bảng chia 15 dòng một trang.",
            "Đọc «Ai dùng nhiều nhất» (cột Người) và «Tính năng tốn token nhất» (cột Tính năng): năm đầu bảng, có thanh tỉ lệ.",
          ],
        },
        {
          luuY: ["Các lượt ghi trước khi sổ có cột người hoặc tính năng thành ghi chú xám «chưa ghi người» / «chưa ghi tính năng», không xếp hạng.", "Tên tính năng là tên tiếng Việt (ví dụ «Trợ lý chat», «Bảng điều hành: tóm tắt AI», «Báo cáo tháng: nhận xét AI»)."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Màn chỉ ghi câu báo, không có số", "Anh/chị không phải PM hoặc Admin."],
            ["Mọi ô bằng 0", "Chưa có lượt AI nào trong kỳ đó (hoặc sổ chưa ghi). Chọn kỳ khác."],
            ["Nhiều phút vàng «ngừng»", "Tài khoản hết hạn mức. Nối thêm tài khoản ở tab «🔌 Kết nối» → «Tài khoản Claude của công ty»."],
            ["Muốn biết ai dùng nhiều", "Xem bảng «Ai dùng nhiều nhất»."],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt Mr. Đại 04/10/2026 (quản lý lượng dùng AI; thống kê là tab riêng trong Cài đặt).",
};
