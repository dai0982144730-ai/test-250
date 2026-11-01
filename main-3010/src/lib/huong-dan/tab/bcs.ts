// Hướng dẫn bản 2 (tab) — Báo cáo → tab «Báo cáo sáng». Viết 20/10/2026 theo mẫu Nghiệm thu + luật chữ AI (Mr. Đại).
// Viết lại 26/10/2026 theo màn mới: 3 tab ① Báo cáo sáng của tôi · ② Người nhận; tin Telegram dạng bảng/chữ đậm;
// «Kịch bản định kỳ» và «Chưa hỏi được» đã chuyển sang Cài đặt → 🔔; «Lịch sử báo cáo» đã bỏ.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Báo cáo sáng",
  ai: "Mọi tài khoản xem được. «Dựng lại» và nút «Gửi» (cả hai mục trong menu) cần quyền ghi (PM, Admin, Người dùng); Người xem thấy nút mờ, rê chuột có lý do. Đổi mẫu cho người nhận cần quyền Cài đặt (PM, Admin).",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Báo cáo sáng là gì?",
          doan: [
            "Mỗi sáng 07:00 Main gửi qua Telegram cho từng lãnh đạo MỘT bản tình hình dự án, vừa với việc của người đó: Chủ tịch xem tổng quát, Tổng giám đốc xem việc kéo chậm COD, Giám đốc dự án xem việc đỏ phải xử hôm nay. Màn này là nơi dựng bản, xem trước đúng như điện thoại sẽ nhận, chỉnh khối, chọn người nhận rồi gửi.",
            "Bản gồm các KHỐI số lấy từ bốn agent (Tiến độ, Hợp đồng, Pháp lý, Công việc). Mỗi khối dạng bảng ngắn hoặc chữ đậm vừa màn điện thoại. Main không tự tính số; agent nào chưa trả lời thì ghi rõ «Chưa hỏi được» và báo cáo VẪN gửi.",
          ],
        },
        {
          tieuDe: "Vì sao cần?",
          ds: ["Lãnh đạo nhận đúng thứ mình cần ngay đầu ngày, không phải mở phần mềm.", "Mỗi người một bản nên không bị ngập trong số của người khác.", "Mọi luật theo dõi đều xem và xoá được trên màn — không có luật ẩn."],
        },
        {
          tieuDe: "Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Bước trước", "Màn này", "Bước sau"],
            ["Các agent cập nhật số; 06:30 máy tự dựng bản", "Xem, chỉnh khối / người nhận / luật; dựng lại, gửi", "07:00 Telegram gửi tới từng người; vấn đề cần xử chuyển sang màn Cảnh báo, Việc của tôi"],
          ],
        },
        {
          tieuDe: "Các phần trên màn, từ trên xuống",
          bang: [
            ["Phần", "Để làm gì", "Xem"],
            ["Hàng nút: ngày · «Dựng lại» · «Gửi ▾»", "Dựng và gửi bản của một ngày", "① Dựng và gửi"],
            ["Tab «① Báo cáo sáng của tôi»", "Ba cột vừa một màn hình: Thư viện khối · Báo cáo của tôi · Màn điện thoại. Có «Luật động» ở đầu tab, thường co lại", "② Ba tab; hướng dẫn «Bộ khối» và «Luật động»"],
            ["Tab «② Người nhận»", "Chọn ai nhận mẫu nào, xem trước đúng chữ họ sẽ nhận, gửi thử", "Hướng dẫn «Người nhận»"],
            ["Cài đặt → 🔔 Cảnh báo & ngưỡng", "«Kịch bản định kỳ» (bốn nhịp tự chạy, nút «Chạy ngay») và «⚠️ Chưa hỏi được» — đã chuyển khỏi màn này", "Hướng dẫn Cài đặt"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · AI",
          bang: [
            ["Người", "Máy", "🤖 AI"],
            ["Chọn ngày, bấm dựng / gửi, kéo khối, chọn người nhận, dặn luật", "Hỏi các agent, ghép số, xếp dòng, vẽ bảng và ảnh biểu đồ, lọc theo quyền xem dự án, gửi Telegram, chạy các nhịp theo giờ, đọc luật động bằng code", "🤖 Viết MỘT câu hỏi ngắn cho mỗi việc làm chậm COD để Giám đốc quyết, và một câu tóm tắt mỗi dự án. Chỉ dùng số máy đưa"],
          ],
        },
        {
          tieuDe: "Quy trình người ↔ AI",
          ds: [
            "Máy hỏi các agent, dựng các dòng và số. Chưa có AI nào chạy ở bước này.",
            "🤖 AI chỉ nhận đúng dòng vấn đề và số ảnh hưởng máy đưa, rồi viết câu hỏi quyết. Câu nào chứa con số không có trong khung máy đưa, hoặc nói chậm / sớm mà thiếu «so với Tiến độ mục tiêu / Baseline», thì bị BỎ; phần số vẫn gửi.",
            "Người đọc bản xem trước trên màn điện thoại rồi mới gửi (hoặc để 07:00 tự gửi). AI lỗi hay hết hạn mức thì bản vẫn gửi, chỉ thiếu câu hỏi.",
          ],
        },
      ],
    },
    {
      ten: "① Dựng và gửi",
      khoi: [
        {
          tieuDe: "Vì sao / khi nào",
          doan: ["Bình thường không cần làm gì: 06:30 máy dựng, 07:00 máy gửi. Chỉ bấm khi vừa sửa số liệu ở agent khác, hoặc muốn gửi sớm."],
        },
        {
          bam: [
            "Chọn ngày ở ô ngày (dd/mm/yyyy).",
            "Bấm «Dựng lại» — nút đổi thành «Đang dựng… N giây» (thường 90–110 giây), đừng bấm lần hai.",
            "Đọc dòng xanh báo kết quả; xem bản mới ở màn điện thoại (tab ①) .",
            "«Gửi ▾» → «Gửi cho N người chưa nhận»: gửi cho người CHƯA nhận bản ngày này, bỏ qua người đã nhận để không gửi trùng lên lãnh đạo.",
            "«Gửi ▾» → «Gửi lại cho cả N người»: gửi cả người đã nhận — dùng khi dựng lại bản sau khi sửa số. Mục này mờ nếu chưa ai nhận. Bấm một mục là chạy và đóng menu luôn.",
          ],
        },
        {
          ketQua: ["Bản của ngày được lưu; Telegram chưa nối thì hộp «📮 Telegram chưa cấu hình» báo rõ đây không phải lỗi — bản vẫn dựng và lưu. Lần 07:00 hỏng thì dòng đỏ «⚠ Lần gửi báo cáo sáng … hỏng: …» hiện ở đầu."],
        },
        {
          ai: ["🤖 Khi dựng, AI viết MỘT lượt cho cả bản các câu hỏi quyết định và câu tóm tắt từng dự án (thường chưa tới 15 giây).", "AI chỉ dùng số trong khung máy đưa, không thêm số, ngày, hạn; câu sai khung bị bỏ.", "Người kiểm ở bản xem trước; mất AI thì bản vẫn gửi với phần số."],
        },
        {
          viDu: ["Hôm nay 26/10/2026 bấm «Gửi Telegram ngay» chỉ gửi những người chưa nhận hôm nay. Dựng lại xong thấy 3/4 việc làm chậm COD có câu 🤖 (phần AI mất chừng 10 giây)."],
        },
        {
          luuY: ["Bản chữ nội dung theo quyền xem dự án của từng người nhận — người ngoài dự án thấy dòng «ẩn».", "Tin Telegram: bảng nằm trong khung đơn cách (không tô màu được), màu chỉ bằng emoji 🔴🟡🟢; tối đa 4.096 ký tự mỗi tin; ảnh biểu đồ 720×480, gửi thành một album."],
        },
      ],
    },
    {
      ten: "② Ba tab của màn",
      khoi: [
        {
          bang: [
            ["Tab", "Vào đây để làm gì", "Ghi chú"],
            ["① Báo cáo sáng của tôi", "Xem và chỉnh báo cáo của CHÍNH MÌNH: kéo khối từ thư viện, nhìn ngay trên màn điện thoại", "Ba cột bằng nhau, cố định vừa màn, cột nào dài thì có thanh trượt riêng"],
            ["② Người nhận", "Chọn mẫu cho từng người, xem trước bản của họ, gửi thử cho mình", "Số vàng nếu chưa có người nhận nào"],
          ],
        },
        {
          bam: ["Đọc bản của mình ở khung điện thoại (tab ①), mục từ trên xuống.", "Dòng có 🤖 là chữ AI viết; dòng không có là máy ghép từ số.", "Muốn xem đúng chữ từng người sẽ nhận thì dùng tab ② (xem trước theo mẫu của họ)."],
        },
        {
          luuY: ["Chưa dựng bản ngày đó thì màn điện thoại ghi «Chưa có bản báo cáo của ngày này» — bấm «Dựng lại» hoặc để 06:30 sáng mai máy tự dựng.", "Bốn nhịp tự chạy (06:30 dựng · 07:00 gửi · Thứ Hai 14:00 nhắc báo cáo tuần · ngày 1 hằng tháng 08:00 nháp báo cáo tháng) xem và «Chạy ngay» ở Cài đặt → 🔔 Cảnh báo & ngưỡng."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Mục «Gửi lại» trong menu «Gửi» mờ", "Hôm nay chưa ai nhận bản — dùng «Gửi cho người chưa nhận»."],
            ["Người nhận báo «chưa gửi được»", "Họ chưa nối Telegram (mỗi người tự nối ở menu tên người → «Nối Telegram»)."],
            ["Dòng «Chưa hỏi được: …» cuối tin", "Agent tương ứng đang tắt hoặc chưa trả lời. Bật lại rồi «Dựng lại»; lý do xem ở Cài đặt → 🔔."],
            ["Bản gửi thiếu câu hỏi 🤖", "AI lỗi, hết hạn mức hoặc câu bị loại vì sai khung — bản vẫn đủ số, không phải hỏng."],
            ["Người xem bản khác bản của tôi", "Mỗi người một mẫu và một bộ khối; xem trước theo từng người ở tab ②."],
            ["Muốn xem lịch sử các ngày trước", "Màn không còn mục «Lịch sử báo cáo»; chọn ngày khác ở ô ngày để mở bản ngày đó."],
          ],
        },
      ],
    },
  ],
  canCu: "PLAN-MAIN-AGENT mục 6 (báo cáo sáng) và mục 7 (nhịp định kỳ); KE-HOACH/23 (bộ khối), KE-HOACH/30, 31 (thiết kế lại khối, Mr. Đại chốt 25/10/2026); phân vai Code ↔ AI chốt 06/09/2026.",
};
