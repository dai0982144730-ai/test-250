// Hướng dẫn bản 2 (tab) — Kịch bản test (/kich-ban-test). Viết 20/10/2026 từ agent Main theo mẫu Nghiệm thu + luật chữ AI (Mr. Đại).
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Kịch bản test",
  ai: "Mọi tài khoản mở được; chấm và lưu kết quả cần quyền ghi (PM, Admin, Người dùng).",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Màn này là gì, vì sao cần?",
          doan: ["Bộ bài test để người dùng thật tự kiểm Main: mỗi bài là một việc cụ thể (bấm gì, mong đợi thấy gì). Anh/chị làm theo từng bước rồi chấm «Đạt» hoặc «Không đạt». Kết quả lưu thành tệp trên máy chủ, để người sửa phần mềm đọc ngay báo cáo test mà không cần anh/chị kể lại."],
        },
        {
          tieuDe: "Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Bước trước", "Màn này", "Bước sau"],
            ["Có phiên bản mới của Main hoặc muốn kiểm một tính năng", "Làm bài, chấm Đạt / Không đạt, ghi lý do và dán ảnh", "Người sửa phần mềm đọc kết quả lưu và sửa"],
          ],
        },
        {
          tieuDe: "Các khối",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Hàng tab có số đếm (ví dụ 1/6) — nhóm Main và nhóm chung 5 agent", "Chọn nhóm bài", "① Làm một bài"],
            ["Thanh tiến độ «n/m đạt»", "Biết đã xong bao nhiêu", "① Làm một bài"],
            ["Mỗi bài: mã · tiêu đề · các bước · «Mong đợi:» · nút Đạt / Không đạt", "Làm và chấm", "① Làm một bài"],
            ["Tab «Vấn đề phát sinh»", "Ghi chuyện ngoài kịch bản", "② Vấn đề phát sinh"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · AI",
          bang: [
            ["Người", "Máy", "🤖 AI"],
            ["Làm theo bước, chấm, ghi lý do, dán ảnh, bấm lưu", "Đếm đạt / không đạt, lưu kết quả và ảnh ra tệp, dựng báo cáo test", "Màn này không dùng AI; chỗ gõ «Câu lệnh nhờ AI sửa» là chữ anh/chị dặn người sửa phần mềm hoặc trợ lý AI đọc sau"],
          ],
        },
        {
          tieuDe: "Quy trình người ↔ AI",
          ds: ["Người test và ghi lại. Sau đó người sửa phần mềm (hoặc AI lập trình) đọc báo cáo test và sửa — việc sửa nằm ngoài màn này."],
        },
      ],
    },
    {
      ten: "① Làm một bài",
      khoi: [
        {
          bam: [
            "Chọn một tab ở hàng trên (số đếm trên tên tab cho biết bao nhiêu bài).",
            "Đọc các bước đánh số và dòng «Mong đợi:». Bài có tệp mẫu thì tệp nằm trong thư mục mẫu test của Main (tên ghi trên bài).",
            "Làm đúng các bước trên Main rồi bấm «Đạt» hoặc «Không đạt».",
            "«Không đạt» thì bung ô mô tả: viết bạn làm gì, phần mềm phản hồi gì, khác mong đợi ở đâu; dán ảnh chụp bằng Ctrl+V (ở bất kỳ đâu trong khung); có thể viết thêm ô «Câu lệnh nhờ AI sửa».",
            "Bấm «💾 Lưu» ở hàng trên để ghi ra tệp. Bấm «Sửa» để mở lại bài đã chấm.",
          ],
        },
        {
          ketQua: ["Mỗi bài ghi «Đã lưu lúc …». Kết quả nằm trong thư mục kiểm thử của máy chủ; tệp báo cáo test là tệp để người sửa phần mềm đọc."],
        },
        {
          viDu: ["Tình huống: ở nhóm «Báo cáo sáng & luật động», nếu bài yêu cầu gõ luật «tuần này theo dõi sát nhà thầu TS»: sau bước nhấn «Nhắn cho Main Agent» thấy luật hiện trong danh sách thì bấm «Đạt»; không thấy thì «Không đạt» kèm ảnh khối «Luật động»."],
        },
        {
          luuY: ["Quên bấm «💾 Lưu» thì kết quả chưa ghi ra tệp.", "Chấm «Đạt» rồi vẫn sửa lại được."],
        },
      ],
    },
    {
      ten: "② Vấn đề phát sinh",
      khoi: [
        {
          bam: ["Bấm tab «Vấn đề phát sinh».", "Gõ «Tên vấn đề — ngắn gọn, sau còn tìm lại» và «Mô tả vấn đề và viết luôn câu lệnh nhờ AI sửa…», dán ảnh.", "Lưu."],
        },
        {
          viDu: ["Đang test Báo cáo tháng mà thấy chữ lệch ở cột Nơi nhận — không có trong kịch bản — ghi vào đây kèm ảnh."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Chấm xong không thấy báo cáo", "Chưa bấm «💾 Lưu»."],
            ["Dán ảnh không được", "Dán khi đang ở trong khung của bài đang sửa; Ctrl+V."],
            ["Nút chấm mờ", "Anh/chị là Người xem."],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt Mr. Đại 06/09/2026 (khuôn màn Test lấy từ agent Pháp lý; kết quả lưu ra tệp để AI đọc).",
};
