// Hướng dẫn bản 2 (tab) — «Nối Telegram với trợ lý Main» (menu tên người → «Nối Telegram», hoặc «? Hướng dẫn» ngay bên phải mục đó).
// Viết 20/10/2026 từ agent Main; viết lại 28/10/2026 (Mr. Đại): để NGƯỜI DÙNG KHÁC TỰ NỐI ĐƯỢC — mỗi bước một tab, có hình minh họa,
// chỗ cần Quản trị cấp quyền / bật bot thì ghi «liên hệ Quản trị». Đối chiếu code: telegram-tro-ly/noi-tai-khoan.ts (mã 6 số sống 10 phút,
// gõ sai 5 lần khoá 10 phút, một chat chỉ nối một tài khoản) · api/telegram-tro-ly/noi (Người xem không lấy mã).
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Nối Telegram với trợ lý Main",
  ai: "PM, Admin, Người dùng — mỗi người tự nối tài khoản của mình, làm một lần, khoảng 1 phút. Người xem thấy lý do không dùng được và nút «Lấy mã nối» mờ.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Khung này là gì, vì sao cần?",
          doan: ["Nối Telegram của anh/chị với tài khoản đăng nhập để nhắn bot hỏi trợ lý Main ngay trên điện thoại, và để nhận báo cáo sáng 07:00 qua Telegram theo mẫu của anh/chị. Mỗi người tự nối tài khoản của mình."],
        },
        {
          tieuDe: "Trước khi bắt đầu, anh/chị cần có",
          ds: [
            "Tài khoản đăng nhập website Main, vai Người dùng trở lên. Tài khoản «Người xem» không nối được — liên hệ Quản trị nếu cần nâng vai.",
            "Ứng dụng Telegram trên điện thoại, đã đăng nhập.",
            "Bot đang chạy. Nếu làm đúng các bước mà bot im lặng thì liên hệ Quản trị để bật.",
          ],
        },
        {
          tieuDe: "Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Bước trước", "Khung này", "Bước sau"],
            ["Quản trị bật nhận tin ở Cài đặt → Kết nối; PM / Quản trị chọn mẫu báo cáo cho anh/chị", "Nối bằng mã 6 số", "Nhắn bot hỏi trợ lý; 07:00 nhận báo cáo sáng"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · AI",
          bang: [
            ["Người", "Máy", "🤖 AI"],
            ["Lấy mã, mở Telegram nhắn mã cho bot, hoặc gỡ nối", "Tạo mã có hạn, ghép tài khoản với chat Telegram, gửi báo cáo", "🤖 Sau khi nối, câu nhắn cho bot được trợ lý (AI) trả lời; việc ghi dữ liệu chỉ chạy khi anh/chị bấm «✅ Làm» trên Telegram"],
          ],
        },
        {
          tieuDe: "Quy trình người ↔ AI",
          ds: ["Người lấy mã → bấm link hoặc nhắn mã cho bot → máy ghép → từ đó người nhắn, 🤖 AI trả lời và người duyệt việc ghi."],
        },
      ],
    },
    {
      ten: "① Mở hộp «Nối Telegram»",
      khoi: [
        {
          bam: [
            "Đăng nhập website Main.",
            "Bấm tên của anh/chị ở góc trên bên phải.",
            "Kéo xuống dòng cuối cùng của menu, bấm «✈ Nối Telegram». Muốn xem lại bài này thì bấm «? Hướng dẫn» ngay bên phải dòng đó.",
          ],
          hinh: { kieu: "menu-ten-nguoi", chuThich: "menu tên người, mục «Nối Telegram» nằm dưới cùng" },
        },
        {
          ketQua: ["Hộp «Nối Telegram với trợ lý Main» mở ra, ghi trạng thái «chưa nối» hoặc «đã nối»."],
        },
        {
          luuY: [
            "Không thấy mục «Nối Telegram»: mục này chỉ có ở website Main (không có ở các agent khác), nằm dưới cùng menu, sau dãy agent.",
            "Tài khoản «Người xem» mở được hộp nhưng nút «Lấy mã nối» mờ — liên hệ Quản trị để được cấp vai Người dùng.",
          ],
        },
      ],
    },
    {
      ten: "② Lấy mã 6 số",
      khoi: [
        {
          bam: [
            "Hộp mở ra là có mã luôn (chưa nối thì máy tự lấy). Đọc giờ «hết hạn lúc …» ghi trên mã.",
            "Mã hết hạn hoặc lỡ tay đóng hộp: bấm «Lấy mã nối» để lấy mã mới. Đã nối rồi mà muốn đổi sang Telegram khác thì nút là «Nối sang chat Telegram khác».",
          ],
          hinh: { kieu: "hop-ma", chuThich: "hộp hiện mã 6 số (mã 123456 chỉ để minh họa, dùng mã trên màn của anh/chị)" },
        },
        {
          ketQua: ["Mã 6 số sống 10 phút, dùng một lần. Lấy mã mới thì mã cũ của anh/chị mất hiệu lực."],
        },
        {
          luuY: ["Nút «Lấy mã nối» mờ kèm dòng lý do: tài khoản chưa được cấp quyền dùng — liên hệ Quản trị."],
        },
      ],
    },
    {
      ten: "③ Đưa mã cho bot",
      khoi: [
        {
          tieuDe: "Cách A — trên điện thoại (nhanh nhất)",
          bam: ["Mở website Main trên điện thoại, lấy mã như bước ②.", "Bấm chữ «bấm vào đây» trong hộp — Telegram tự mở chat với bot.", "Bấm nút BẮT ĐẦU trong Telegram. Không phải gõ gì."],
          hinh: { kieu: "chat-link", chuThich: "chat với bot, bấm BẮT ĐẦU" },
        },
        {
          tieuDe: "Cách B — gõ tay (khi mở website trên máy tính, Telegram trên điện thoại)",
          bam: ["Mở Telegram, tìm bot @SCI_Main_agent_bot rồi mở chat với bot.", "Nhắn đúng dạng «/noi» + cách một chữ + mã 6 số, ví dụ /noi 123456, rồi gửi."],
          hinh: { kieu: "chat-lenh", chuThich: "gõ lệnh /noi kèm mã" },
        },
        {
          luuY: ["Không tìm thấy bot hoặc bot không trả lời gì: bot có thể đang tắt — liên hệ Quản trị để bật (Cài đặt → Kết nối → «Bật nhận tin»)."],
        },
      ],
    },
    {
      ten: "④ Kiểm tra đã nối",
      khoi: [
        {
          ketQua: [
            "Bot trả lời «✅ Đã nối chat này với … (email, vai trò)». Quay lại website, hộp «Nối Telegram» ghi «đã nối».",
            "Từ giờ nhắn câu hỏi vào chat này để hỏi trợ lý Main bằng đúng tài khoản của anh/chị.",
          ],
          hinh: { kieu: "chat-xong", chuThich: "bot báo đã nối thành công" },
        },
        {
          ai: ["🤖 Sau khi nối, câu anh/chị nhắn cho bot do trợ lý (AI) trả lời; trợ lý có thể sai, người kiểm. Việc có ghi dữ liệu chỉ chạy khi anh/chị bấm «✅ Làm» trên Telegram."],
        },
        {
          luuY: ["Muốn nhận báo cáo sáng 07:00: nối xong vẫn cần được đưa vào danh sách người nhận — liên hệ Quản trị (anh/chị không tự thêm mình được)."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Bot báo «Mã không đúng. Nhắn đúng dạng /noi 123456»", "Gõ thiếu mã hoặc chỉ nhắn /start. Gõ lại /noi + mã 6 số. Riêng khi đã thấy ✅ rồi mà nhắn thêm /start thì báo câu này là bình thường — đã nối rồi, không cần làm gì."],
            ["Bot báo «Mã đã hết hạn»", "Mã chỉ sống 10 phút. Quay lại website bấm «Lấy mã nối» lấy mã mới."],
            ["Gõ sai mã nhiều lần", "Sai 5 lần thì bot khoá chat đó 10 phút (chống đoán mã). Chờ hết 10 phút rồi lấy mã mới."],
            ["Bot báo tài khoản đang bị khoá", "Tài khoản Main bị khoá — liên hệ Quản trị mở khoá rồi nối lại."],
            ["Nút «Lấy mã nối» mờ", "Tài khoản là Người xem — liên hệ Quản trị cấp vai Người dùng."],
            ["Hai người dùng chung một Telegram", "Một Telegram chỉ nối với MỘT tài khoản: người nối sau làm người trước bị gỡ nối. Mỗi người dùng Telegram của chính mình."],
            ["Muốn đổi sang Telegram khác / thôi nối", "Mở lại hộp: «Nối sang chat Telegram khác» rồi làm lại từ bước ③; hoặc «Gỡ nối» để thôi."],
            ["Đã nối mà sáng không nhận báo cáo 07:00", "Chưa được đưa vào danh sách người nhận (Báo cáo → Báo cáo sáng → ② Người nhận) — liên hệ Quản trị."],
          ],
        },
        {
          tieuDe: "Câu bot báo khi nhắn /start không kèm mã",
          doan: ["Đây là câu bình thường nếu anh/chị đã nối xong; chưa nối thì làm lại bước ③ với mã mới."],
          hinh: { kieu: "chat-loi", chuThich: "câu bot báo khi nhắn /start không kèm mã" },
        },
        {
          tieuDe: "Việc cần liên hệ Quản trị (anh/chị không tự làm được)",
          bang: [
            ["Việc", "Quản trị làm ở đâu"],
            ["Bật bot nhận tin", "Cài đặt → Kết nối → «Bật nhận tin»"],
            ["Cấp vai Người dùng (thay Người xem)", "Cài đặt → Người dùng"],
            ["Mở khoá tài khoản", "Cài đặt → Người dùng"],
            ["Đưa vào danh sách người nhận báo cáo sáng 07:00", "Báo cáo → Báo cáo sáng → ② Người nhận"],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt Mr. Đại 25/09/2026 (trợ lý Main qua Telegram); viết lại 28/10/2026 cho người dùng khác tự nối.",
};
