// Hướng dẫn bản 2 (tab) — trang «Tài khoản Claude cá nhân» (/tai-khoan-claude). Viết 20/10/2026. Nhãn chép từ components/ai/TaiKhoanClaudeCuaToi.tsx và TheTaiKhoanClaude.tsx.
// Đối chiếu code 20/10: ai đăng nhập cũng nối được, chỉ đọc và sửa được tài khoản CỦA MÌNH (api/ai/tai-khoan-ca-nhan); tài khoản này chỉ chạy khi CẢ HAI tài khoản công ty hết hạn mức và chỉ cho câu hỏi của chính người đó (việc nền không bao giờ dùng).
// Chỗ AI thật: nút «Thử trợ lý AI» (lib/ai/providers.ts, hàm thuTaiKhoan, dòng 1106). «Kiểm tra nhanh…» là máy kiểm đăng nhập, không hỏi AI. Thẻ công ty ở Cài đặt › AI đã có hướng dẫn cd-ai.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Tài khoản Claude cá nhân — dự phòng khi tài khoản công ty hết hạn mức",
  ai: "Ai đăng nhập cũng dùng được và chỉ thấy, chỉ sửa được tài khoản của chính mình. Cần một tài khoản Claude trả phí của cá nhân (gói Pro hoặc Max). Trang không có nút nào bị ẩn theo quyền khác.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Trang này là gì",
          doan: [
            "Công ty có hai tài khoản Claude chung để chạy trợ lý AI. Mỗi tài khoản có hạn mức dùng theo chu kỳ; khi cả hai hết, trợ lý ngừng. Trang này cho bạn nối thêm tài khoản Claude CỦA RIÊNG BẠN làm dự phòng: lúc đó câu hỏi của chính bạn vẫn được trả lời, bạn không phải chờ hạn mức công ty hồi lại.",
          ],
        },
        {
          tieuDe: "② Vì sao cần",
          ds: [
            "Việc gấp (nộp báo cáo, họp) không phải dừng vì hạn mức chung.",
            "Chỉ dùng cho câu hỏi của chính bạn. Việc máy tự chạy (ban đêm, chạy nền) không bao giờ dùng tài khoản cá nhân của bạn.",
            "Chỉ dùng khi cả hai tài khoản công ty đều hết hạn mức; công ty còn tài khoản dùng được thì trợ lý chưa đụng tới tài khoản của bạn.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Chặng", "Làm gì", "Vai trò của trang"],
            ["Trước", "Quản trị đã nối hai tài khoản công ty ở Cài đặt › AI", "Là tuyến chính"],
            ["Trang này", "Bạn nối tài khoản riêng một lần", "Tuyến dự phòng của bạn"],
            ["Sau", "Khi cả hai tài khoản công ty hết hạn mức, trợ lý tự chạy bằng tài khoản của bạn cho câu hỏi của bạn", "Bạn làm tiếp"],
          ],
        },
        {
          tieuDe: "④ Các khối trên màn",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Đầu thẻ «Tài khoản Claude cá nhân» + chữ «dự phòng» + «Đang dùng»", "Cho biết thẻ nào, đang được trợ lý dùng thật hay chưa", "① Đọc trạng thái"],
            ["Hộp trạng thái", "Đã đăng nhập chưa, email, gói; hết hạn mức tới mấy giờ; mất đăng nhập; số lượt 7 ngày", "① Đọc trạng thái"],
            ["Nút «Đăng nhập Claude» / «Đăng nhập lại»", "Nối tài khoản", "② Đăng nhập"],
            ["Nút «Thử trợ lý AI», «Kiểm tra nhanh…»", "Thử tài khoản", "③ Thử và kiểm tra"],
            ["Nút «Đăng xuất»", "Gỡ tài khoản", "④ Đăng xuất"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì"],
            ["Người", "Bấm đăng nhập, đăng nhập trên trang Claude, chép mã dán lại, thử, đăng xuất."],
            ["Máy", "Mở trang đăng nhập, xác nhận mã, cất thông tin đăng nhập riêng cho từng người (không bao giờ gửi mã ngược về trình duyệt), theo dõi hạn mức và trạng thái, chọn tài khoản khi trợ lý chạy, thống kê số lượt 7 ngày."],
            ["🤖 AI", "🤖 Chỉ khi bạn bấm «Thử trợ lý AI»: hỏi AI một câu rất ngắn bằng đúng tài khoản này. Còn lại là máy quản lý tài khoản."],
          ],
          ai: [
            "🤖 AI nhận: một câu hỏi thử rất ngắn. AI làm: trả lời một câu. Mất vài giây, kết quả ghi số giây.",
            "🤖 Không thay đổi dữ liệu nào của bạn hay của công ty. Lỗi (hết hạn mức, mất đăng nhập) hiện trong khung đỏ.",
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          bam: [
            "NGƯỜI: bấm «Đăng nhập Claude», đăng nhập ở trang mới mở, chép mã dán lại.",
            "MÁY: xác nhận mã, lưu đăng nhập riêng cho bạn.",
            "NGƯỜI: bấm «Thử trợ lý AI» để chắc chạy được; 🤖 AI trả lời một câu.",
            "Về sau, khi cả hai tài khoản công ty hết hạn mức: MÁY tự chuyển câu hỏi của bạn sang tài khoản này; 🤖 AI trả lời như thường.",
          ],
        },
      ],
    },
    {
      ten: "① Đọc trạng thái",
      khoi: [
        {
          doan: ["Mở trang là thấy hộp trạng thái. Đầu thẻ có chữ xanh «Đang dùng» khi trợ lý đang chạy bằng tài khoản của bạn."],
        },
        {
          bang: [
            ["Dòng trong hộp", "Nghĩa"],
            ["«Chưa đăng nhập.» + hướng dẫn", "Bạn chưa nối tài khoản"],
            ["«Đã đăng nhập: email · gói»", "Đã nối; ghi email và gói thuê bao"],
            ["«Hết hạn mức — dùng lại khoảng giờ:phút»", "Tài khoản của bạn tạm hết hạn mức, tới giờ đó dùng lại được"],
            ["«Mất đăng nhập … bấm Đăng nhập lại»", "Đăng nhập hết hạn hoặc bị thu hồi; đăng nhập lại"],
            ["Dòng xám về tài khoản công ty", "Cho biết tài khoản công ty còn dùng được (trợ lý chưa cần tới tài khoản của bạn) hay đã hết"],
            ["Dòng xám «7 ngày qua đã dùng … lượt …»", "Mức bạn đã dùng tài khoản cá nhân trong 7 ngày"],
          ],
        },
        {
          viDu: ["Tình huống: sáng thứ hai hộp ghi «Đã đăng nhập: <email của bạn> · Max» và dòng xám «Tài khoản Claude của công ty đang dùng được — trợ lý chưa cần tới tài khoản này.» Nghĩa là bạn đã nối xong, chưa phải dùng tới."],
        },
      ],
    },
    {
      ten: "② Đăng nhập",
      khoi: [
        {
          doan: ["Đăng nhập theo kiểu «mở link, lấy mã, dán lại»: không cần cài gì trên máy bạn, làm được cả trên điện thoại."],
        },
        {
          bam: [
            "Bấm «Đăng nhập Claude» (hoặc «Đăng nhập lại» nếu mất đăng nhập). Một tab mới mở trang đăng nhập Claude; nếu trình duyệt chặn tab, dùng đường «Mở trang đăng nhập Claude ↗» trong khung.",
            "Đăng nhập bằng tài khoản Claude của CHÍNH BẠN.",
            "Trang Claude hiện một mã: bấm nút chép mã (Copy Code).",
            "Quay lại và dán mã vào ô «Dán mã trang Claude hiện ra». Dán xong là tự gửi; hoặc bấm «Xong».",
            "Muốn bỏ giữa chừng: bấm «Huỷ».",
          ],
        },
        {
          ketQua: ["Thành công: thông báo «Đã đăng nhập tài khoản Claude cá nhân: email · gói», hộp trạng thái đổi sang «Đã đăng nhập». Mã sai: khung đỏ ghi lý do; lấy lại link và làm lại."],
        },
        {
          viDu: ["Tình huống: bạn đang cầm điện thoại. Bấm «Đăng nhập Claude», trình duyệt mở trang Claude, bạn đăng nhập bằng tài khoản của mình, chép mã, quay lại trang này, dán vào ô. Sau vài giây trang báo đã đăng nhập kèm email."],
        },
        {
          luuY: [
            "Link dùng được 15 phút; mỗi mã chỉ dùng một lần.",
            "Cần tài khoản Claude trả phí (gói Pro hoặc Max). Tài khoản miễn phí không dùng được.",
            "Mã đăng nhập chỉ bạn thấy; hệ thống không gửi ngược mã về trình duyệt.",
          ],
        },
      ],
    },
    {
      ten: "③ Thử và kiểm tra",
      khoi: [
        {
          doan: ["Hai nút này chỉ hiện sau khi đã đăng nhập."],
        },
        {
          bang: [
            ["Nút", "Làm gì"],
            ["«Thử trợ lý AI»", "🤖 Hỏi AI một câu rất ngắn bằng đúng tài khoản này, đo số giây. Chắc chắn nhất."],
            ["«Kiểm tra nhanh…»", "Chỉ xem đăng nhập còn hiệu lực không, không hỏi AI; gần như tức thì."],
          ],
        },
        {
          bam: [
            "Bấm «Kiểm tra nhanh…» để thấy đã đăng nhập và email gói.",
            "Muốn chắc trả lời được thật: bấm «Thử trợ lý AI».",
            "Đọc khung kết quả: xanh «Tài khoản Claude cá nhân trả lời được (N giây)», hoặc đỏ kèm lý do.",
          ],
        },
        {
          viDu: ["Tình huống: bạn nối tài khoản xong. Bấm «Thử trợ lý AI», sau vài giây khung xanh ghi trả lời được kèm số giây. Từ nay bạn yên tâm khi hạn mức công ty hết."],
        },
        {
          luuY: ["«Thử trợ lý AI» tính vào hạn mức tài khoản của bạn, rất nhỏ; đừng bấm liên tục."],
        },
      ],
    },
    {
      ten: "④ Đăng xuất",
      khoi: [
        {
          bam: [
            "Bấm «Đăng xuất» (chỉ hiện khi đã đăng nhập).",
            "Hộp hỏi «Đăng xuất tài khoản Claude cá nhân của anh/chị?» — xác nhận.",
          ],
        },
        {
          ketQua: ["Thông tin đăng nhập của bạn bị xoá khỏi máy chủ; trạng thái về «Chưa đăng nhập». Trợ lý không còn dùng tài khoản của bạn. Muốn nối lại thì đăng nhập lại."],
        },
        {
          viDu: ["Tình huống: bạn đổi tài khoản Claude cá nhân. Bấm «Đăng xuất», rồi «Đăng nhập Claude» và đăng nhập bằng tài khoản mới."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Bấm «Đăng nhập Claude» mà không thấy tab mới", "Trình duyệt chặn cửa sổ mới; dùng đường «Mở trang đăng nhập Claude ↗» trong khung."],
            ["Dán mã xong báo sai", "Mã đã dùng, hết hạn hoặc chép thiếu; bấm «Huỷ», lấy link mới."],
            ["Hộp ghi «Mất đăng nhập»", "Phiên Claude của bạn hết hạn; bấm «Đăng nhập lại»."],
            ["Nối rồi mà trợ lý vẫn dùng tài khoản công ty", "Đúng thiết kế: chỉ khi cả hai tài khoản công ty hết hạn mức mới dùng tài khoản của bạn."],
            ["Việc nền ban đêm không chạy bằng tài khoản tôi", "Cũng đúng thiết kế: việc máy tự chạy không bao giờ dùng tài khoản cá nhân."],
            ["«Thử trợ lý AI» báo hết hạn mức", "Tài khoản cá nhân của bạn cũng hết hạn mức; chờ tới giờ ghi trong hộp trạng thái."],
          ],
        },
      ],
    },
  ],
  canCu: "Quản lý tài khoản AI (duyệt 04/10/2026): tài khoản cá nhân chỉ chạy khi cả hai tài khoản công ty hết hạn mức, chỉ cho câu hỏi của chính người đó; cùng khuôn thẻ với Tài khoản 1 và 2 ở Cài đặt › AI.",
};
