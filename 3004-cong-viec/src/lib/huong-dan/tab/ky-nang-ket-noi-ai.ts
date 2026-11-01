// Hướng dẫn bản 2 (tab) — hai thẻ cuối trang Skill AI của tôi: «Kết nối AI» (dùng chung với Cài đặt › AI) và «Văn phong trả lời». Viết 20/10/2026.
// Nhãn chép từ components/ky-nang/KetNoiAI.tsx. Chỉ người có «cau_hinh.sua» thấy khối này (trang kiểm quyền ở máy chủ); văn phong cũng kiểm quyền ở máy chủ khi lưu.
// Thẻ «Kết nối AI» đã có hướng dẫn chi tiết ở mục Cài đặt › AI (mã cd-ai) nên chỉ trỏ qua. Văn phong KHÔNG phải chỗ gọi AI: chỉ lưu văn bản mà trợ lý đọc ở mỗi câu trả lời.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Kết nối AI và văn phong trả lời trên trang Skill",
  ai: "Chỉ người có quyền sửa cài đặt (và quản trị viên) thấy hai thẻ này; người khác không thấy gì ở cuối trang. Văn phong áp dụng cho MỌI người dùng trợ lý.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Khối này là gì",
          doan: [
            "Cuối trang Skill AI của tôi, người quản lý thấy thêm hai thẻ: «Kết nối AI» (AI của công ty chạy bằng gì, tài khoản nào, thử chạy) và «Văn phong trả lời» (cách Trợ lý SCI công việc xưng hô, độ dài, định dạng khi trả lời).",
          ],
        },
        {
          tieuDe: "② Vì sao cần",
          ds: [
            "Quản lý kỹ năng và quản lý AI thường làm cùng lúc: thêm kỹ năng xong muốn thử ngay, thấy AI lỗi thì sửa kết nối ngay tại đó.",
            "Văn phong thống nhất giúp mọi câu trả lời của trợ lý nghe cùng một giọng của công ty.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Chặng", "Làm gì"],
            ["Trước", "Người dùng thêm kỹ năng, dùng trợ lý"],
            ["Khối này", "Người quản lý chỉnh AI chạy bằng gì và giọng trả lời"],
            ["Sau", "Mọi câu trả lời của trợ lý từ câu hỏi kế tiếp theo văn phong mới"],
          ],
        },
        {
          tieuDe: "④ Các khối",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Thẻ «Kết nối AI»", "Giống hệt thẻ ở Cài đặt › AI", "① Kết nối AI"],
            ["Thẻ «Văn phong trả lời»: nút «Văn phong trả lời…» / «Đóng văn phong», ô chữ, «Lưu văn phong», «Về mặc định»", "Xem, sửa văn phong", "② Văn phong trả lời"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì"],
            ["Người", "Quản lý chọn nguồn AI, thử, viết và lưu văn phong."],
            ["Máy", "Lưu văn phong, ghi Lịch sử mỗi lần lưu hoặc về mặc định, nạp văn phong vào mỗi câu trợ lý trả lời."],
            ["🤖 AI", "🤖 Nút «Thử trợ lý AI» trong thẻ «Kết nối AI» hỏi AI một câu ngắn để thử. Văn phong chỉ là chữ máy đưa kèm; không gọi AI khi bạn lưu."],
          ],
          ai: ["🤖 Chi tiết nút thử AI (mất bao lâu, báo lỗi gì, làm gì khi lỗi): xem hướng dẫn Cài đặt › AI, tab «④ Thử AI»."],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          bam: [
            "NGƯỜI: đổi nguồn AI hoặc tài khoản ở thẻ «Kết nối AI», bấm «Thử trợ lý AI».",
            "🤖 AI: trả lời một câu ngắn để chứng tỏ chạy được.",
            "NGƯỜI: viết văn phong, bấm «Lưu văn phong».",
            "MÁY: từ câu hỏi sau, văn phong mới đi kèm mọi câu trợ lý; 🤖 AI trả lời theo văn phong đó.",
          ],
        },
      ],
    },
    {
      ten: "① Kết nối AI",
      khoi: [
        {
          doan: [
            "Thẻ này là cùng một thẻ với mục «AI» của Cài đặt (tab «🔌 Kết nối»), không có bản thứ hai. Sửa ở đây hay ở đó là như nhau. Cách cài tài khoản Claude của công ty, cách nhập khoá, các nút «Đăng nhập Claude», «Thử trợ lý AI» đều viết kỹ ở hướng dẫn Cài đặt › AI.",
          ],
        },
        {
          bam: [
            "Cuộn xuống cuối trang Skill AI của tôi, tìm thẻ «Kết nối AI».",
            "Bấm «? Hướng dẫn» khi đang ở đầu thẻ hoặc vào Cài đặt › AI để đọc hướng dẫn đầy đủ.",
          ],
        },
        {
          viDu: ["Tình huống: bạn vừa thêm một kỹ năng dùng chung, thử trong chat thì trợ lý báo lỗi. Bạn cuộn xuống thẻ «Kết nối AI», bấm «Thử trợ lý AI» và thấy khung đỏ «Chưa gọi được» kèm lý do hết hạn mức; bật tài khoản thứ hai theo hướng dẫn Cài đặt › AI."],
        },
        {
          luuY: ["Tài khoản Claude cá nhân của từng người (dự phòng) không ở đây: mỗi người tự nối ở trang «Tài khoản Claude cá nhân»."],
        },
      ],
    },
    {
      ten: "② Văn phong trả lời",
      khoi: [
        {
          doan: ["Văn phong là một đoạn hướng dẫn về GIỌNG trợ lý: xưng hô thế nào, dài ngắn ra sao, dùng bảng hay gạch đầu dòng."],
        },
        {
          bam: [
            "Bấm «Văn phong trả lời…». Ô chữ mở ra, hiện văn phong hiện hành (nút đổi thành «Đóng văn phong»).",
            "Sửa chữ trong ô.",
            "Bấm «Lưu văn phong». Thông báo xanh «Đã lưu văn phong — trợ lý dùng ngay từ câu chat sau.»",
            "Muốn bỏ bản đã sửa: bấm «Về mặc định», ô trả về văn phong gốc và thông báo «Đã về văn phong mặc định …».",
          ],
        },
        {
          ketQua: ["Văn phong áp dụng cho MỌI người dùng trợ lý, từ câu chat kế tiếp. Mỗi lần lưu hoặc về mặc định ghi một dòng Lịch sử (loại «Cài đặt»)."],
        },
        {
          viDu: ["Tình huống: lãnh đạo muốn câu trả lời gọn. Bạn mở văn phong, thêm một dòng «Trả lời tối đa năm dòng, ưu tiên bảng ngắn», lưu. Từ câu hỏi sau, trợ lý trả lời gọn hơn."],
        },
        {
          luuY: [
            "Đổi văn phong là đổi cho cả công ty; nên thử bằng vài câu hỏi rồi mới giữ.",
            "Chữ quá dài hoặc sai dạng thì máy báo đỏ và không lưu.",
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
            ["Không thấy hai thẻ này", "Bạn chưa có quyền sửa cài đặt; thẻ ẩn với người không có quyền."],
            ["Lưu văn phong báo lỗi quyền", "Máy chủ chỉ cho người có quyền sửa cài đặt đổi văn phong."],
            ["Đã đổi văn phong mà câu trả lời chưa đổi", "Văn phong áp dụng từ câu chat kế tiếp; mở câu hỏi mới."],
            ["Lỡ sửa hỏng văn phong", "Bấm «Về mặc định», sau đó viết lại."],
          ],
        },
      ],
    },
  ],
  canCu: "Thẻ «Kết nối AI» dùng chung với Cài đặt › AI; văn phong lưu một bản cho cả công ty, đổi cần quyền sửa cài đặt và ghi Lịch sử.",
};
