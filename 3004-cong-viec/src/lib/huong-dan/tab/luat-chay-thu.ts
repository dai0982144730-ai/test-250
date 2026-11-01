// Hướng dẫn bản 2 (tab) — Bước «Chạy thử trên báo cáo đã có» của ngăn kéo luật. Viết 20/10/2026 (nhóm B3).
// Căn cứ code: components/luat/KhungChayThu.tsx (nút, thanh tóm tắt, danh sách không đạt, 4 lỗi mỗi báo cáo, mở báo cáo khoanh chỗ lỗi)
// · lib/luat/chay-luat.ts (chayThuLuat: tối đa 200 báo cáo mới nhất, luật AI chỉ 5 báo cáo, báo cáo đọc qua bản đã cắt chương mật) · app/api/luat/chay-thu/route.ts (chỉ người sửa được luật).
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Chạy thử luật trên báo cáo đã có",
  ai: "Chỉ người sửa được luật kiểm tra (quản trị viên, người có quyền «cau_hinh.sua», hoặc người được mục «Phân quyền cài đặt» cho phép). Người khác bấm nút sẽ nhận thông báo «Bạn không có quyền chạy thử luật kiểm tra».",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Chạy thử là gì",
          doan: [
            "Trước khi lưu một luật mới, bạn muốn biết nó sẽ bắt những báo cáo nào. Chạy thử là cho luật chạy thật trên các báo cáo ĐÃ có trong hệ thống nhưng không lưu gì và không làm phiền ai: không đổi báo cáo, không báo lỗi cho người nộp, không tạo phiên bản luật.",
            "Luật chưa lưu cũng chạy thử được. Chạy thử dùng đúng những gì bạn đang chỉnh trong ngăn kéo, kể cả chỉnh dở.",
          ],
        },
        {
          tieuDe: "② Vì sao cần",
          ds: [
            "Một luật viết sai có thể bắt nhầm hàng chục báo cáo hoặc không bắt được gì. Chạy thử cho thấy ngay trước khi nó chạm vào người nộp.",
            "Đặc biệt với luật «Chặn gửi»: nếu bắt nhầm, người nộp bị khóa nút Gửi mà không có lỗi thật.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Chặng", "Làm gì"],
            ["Trước", "Viết luật, chọn cách chạy, tham số, mức (bước 1 đến 4 của ngăn kéo)"],
            ["Bước này", "Bước 5: chạy thử, đọc kết quả"],
            ["Sau", "Chỉnh luật nếu bắt sai, rồi bấm «Lưu luật» hoặc «Lưu thay đổi»"],
          ],
        },
        {
          tieuDe: "④ Các khối",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Nút «Chạy thử trên báo cáo đã có»", "Bắt đầu; đổi thành «Chạy thử lại» sau lần đầu", "① Chạy và đọc tóm tắt"],
            ["Thanh tóm tắt (số báo cáo · đạt · không đạt · bỏ qua)", "Nhìn một cái biết kết quả", "① Chạy và đọc tóm tắt"],
            ["Danh sách báo cáo không đạt", "Từng báo cáo bị lỗi, lỗi gì, ở đâu", "② Đọc danh sách lỗi"],
            ["Dòng «Xem N báo cáo đạt»", "Mở danh sách báo cáo đạt", "② Đọc danh sách lỗi"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì"],
            ["Người", "Bấm chạy thử, đọc kết quả, mở báo cáo xem chỗ lỗi, quyết định lưu hay chỉnh."],
            ["Máy", "Lấy các báo cáo mới nhất, đọc từng báo cáo, chạy luật Code trên từng báo cáo, đếm đạt, không đạt, bỏ qua."],
            ["🤖 AI", "🤖 Nếu luật có phần AI: đọc hiểu nội dung các báo cáo mẫu (tối đa 5 báo cáo) và kết luận đạt hay không đạt cho từng báo cáo."],
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          bam: [
            "Người bấm «Chạy thử trên báo cáo đã có».",
            "Máy chạy luật Code (nếu có) trên tối đa 200 báo cáo mới nhất thuộc đúng mẫu áp dụng.",
            "🤖 Với luật AI hoặc Code + AI, AI đọc tối đa 5 báo cáo đầu tiên tìm được; báo cáo thứ 6 trở đi không được AI đọc.",
            "Máy gom kết quả, hiện thanh tóm tắt và danh sách lỗi.",
            "Người đọc, mở báo cáo kiểm chứng, rồi quyết định lưu hay chỉnh luật. Kết quả chạy thử không tự lưu hay tự sửa gì.",
          ],
        },
      ],
    },
    {
      ten: "① Chạy và đọc tóm tắt",
      khoi: [
        { doan: ["Nút chạy thử mờ nếu ngăn kéo còn thiếu thông tin; rê chuột vào nút để thấy thiếu gì (ví dụ «Điền đủ Tên luật, Dạng luật code trước khi chạy thử»)."] },
        {
          bam: [
            "Điền đủ các ô bắt buộc của luật.",
            "Bấm «Chạy thử trên báo cáo đã có». Nút đổi thành «Đang chạy thử…» và quay.",
            "Đợi kết quả. Luật Code xong sau vài giây; luật có AI lâu hơn.",
            "Đọc thanh tóm tắt: «N báo cáo · n đạt · n không đạt · n bỏ qua» và thanh màu: xanh (đạt), đỏ (không đạt), xám (bỏ qua).",
          ],
        },
        {
          bang: [
            ["Kết quả", "Nghĩa"],
            ["đạt", "Báo cáo thỏa luật"],
            ["không đạt", "Báo cáo vi phạm luật ít nhất một chỗ"],
            ["bỏ qua", "Báo cáo không thuộc mẫu áp dụng của luật, hoặc không đọc được (chỉ đọc tệp Word .docx, .docm), hoặc luật AI chưa kết luận được"],
          ],
        },
        {
          viDu: [
            "Luật Code «Báo cáo phải có ít nhất 1 việc trong bảng Công việc» áp cho mọi mẫu. Giả sử kết quả là phần lớn báo cáo đạt, vài báo cáo không đạt và một báo cáo bỏ qua vì là tệp PDF, không đọc được: thanh tóm tắt cho thấy ba con số đó và thanh màu chia ba đoạn.",
            "Luật AI «Ghi chú sự cố phải nêu nguyên nhân» chạy thử: dù hệ thống có hàng chục báo cáo, chỉ tối đa 5 báo cáo được AI đọc; các báo cáo còn lại tính «bỏ qua». Dòng nhỏ cạnh nút nhắc điều này.",
          ],
        },
        {
          ai: [
            "AI nhận: nội dung chữ của báo cáo và hướng dẫn của luật đang chỉnh.",
            "AI làm: kết luận đạt, không đạt hoặc chưa đủ dữ kiện, kèm câu nêu đúng chỗ vi phạm.",
            "AI KHÔNG làm: không sửa báo cáo, không lưu luật.",
            "Thời gian: luật AI có thể mất cả phút vì AI đọc từng báo cáo; kiên nhẫn đợi, nút giữ trạng thái «Đang chạy thử…».",
            "Người kiểm: mở báo cáo AI nói không đạt, xem có thật vi phạm. AI có thể sai.",
            "Mất kết nối AI: báo cáo đó tính «bỏ qua» với luật AI (luật Code + AI thì còn phần Code), bạn không bị kẹt; làm lại khi AI chạy được.",
          ],
        },
        { luuY: ["Luật chỉnh dở (thiếu ô bắt buộc) máy từ chối chạy thử. Luật chỉnh tiếp sau lần chạy thử thì có ghi chú vàng «Luật đã đổi sau lần chạy thử này — bấm “Chạy thử lại” để xem kết quả mới.»"] },
      ],
    },
    {
      ten: "② Đọc danh sách lỗi",
      khoi: [
        { doan: ["Dưới thanh tóm tắt là các báo cáo không đạt. Mỗi báo cáo một khung, gồm tên báo cáo, nhãn mẫu (ví dụ «Form 7») và tối đa 4 lỗi đầu; lỗi thứ 5 trở đi gộp thành «… và N lỗi khác»."] },
        {
          tieuDe: "Mỗi lỗi gồm",
          bang: [
            ["Phần", "Nghĩa"],
            ["Huy hiệu mức", "Lỗi này sẽ chặn, cảnh báo hay chỉ gợi ý nếu luật được lưu với mức đang chọn"],
            ["Câu thông báo", "Nội dung lỗi, đúng như người nộp sẽ đọc"],
            ["Chữ nhỏ cuối dòng", "Vị trí: bảng nào, dòng mấy, cột nào, hoặc ô nào, hoặc mục nào"],
          ],
        },
        {
          bam: [
            "Bấm tên báo cáo để mở báo cáo trong khung xem của ứng dụng; chỗ bị lỗi được khoanh màu để bạn thấy ngay.",
            "Bấm dòng «Xem N báo cáo đạt» để mở danh sách các báo cáo đạt (bấm tên cũng mở được báo cáo). Bấm lần nữa để «Ẩn».",
          ],
        },
        {
          viDu: [
            "Giả sử chạy thử luật «Dòng TỔNG bằng tổng các dòng» và một báo cáo không đạt, kèm vị trí kiểu «Bảng Công nợ phải thu, dòng N, cột …». Quản trị bấm tên báo cáo, thấy dòng TỔNG là số nhập tay lệch với các dòng cộng lại: luật bắt đúng.",
            "Nếu gần như mọi báo cáo đều không đạt một luật mà ai cũng biết là đạt: luật viết sai. Quay lại bước 3, kiểm dòng «Code sẽ kiểm: …».",
          ],
        },
        {
          luuY: [
            "Khi hệ thống chưa có báo cáo nào, khung báo «Chưa có báo cáo nào trong hệ thống để chạy thử» và có đường dẫn «Báo cáo» để tải một báo cáo lên. Luật vẫn lưu được bình thường.",
            "Khi mọi báo cáo đều đạt, màn báo «Mọi báo cáo đều đạt luật này.» Với luật cần bắt lỗi, hãy tự kiểm xem có đúng là không có lỗi, hay luật chưa bắt được gì.",
          ],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Nút chạy thử mờ", "Còn thiếu thông tin của luật. Rê chuột vào nút để xem thiếu gì."],
            ["Báo «Bạn không có quyền chạy thử luật kiểm tra»", "Chỉ người sửa được luật mới chạy thử. Nhờ quản trị cấp quyền."],
            ["Mọi báo cáo «bỏ qua»", "Mẫu áp dụng của luật không trùng mẫu của các báo cáo có sẵn; hoặc báo cáo không phải tệp Word. Chọn lại mẫu ở bước 1."],
            ["Luật AI chỉ đọc vài báo cáo", "Đúng thiết kế: chạy thử luật AI giới hạn 5 báo cáo mỗi lần."],
            ["Chạy thử mãi không xong", "Luật AI đọc chậm hoặc AI trục trặc. Chờ thêm; không được thì đóng ngăn kéo và thử lại sau (không mất gì vì chưa lưu)."],
            ["Chạy thử luật hệ thống ra toàn «đạt»", "Cách kiểm luật gốc nằm trong chương trình, không chạy qua nút này. Kết quả đó không phản ánh lỗi thật."],
          ],
        },
      ],
    },
  ],
  canCu: "Chạy thử luật trong bộ luật kiểm tra: giới hạn 200 báo cáo mới nhất, luật AI giới hạn 5 báo cáo; quyền chạy thử theo quyền sửa luật.",
};
