// Hướng dẫn bản 2 (tab) — Cài đặt › Email, thông báo. Viết 20/10/2026. Nhãn chép từ components/cai-dat/nhom.tsx (NhomThongBao) và email.tsx (KhungEmail).
import type { HuongDanTab } from "../kieu";
import { huongDanMucCaiDat } from "../khuon-cai-dat";

export const HD: HuongDanTab = huongDanMucCaiDat({
  tieuDe: "Email, thông báo",
  tab: "🔌 Kết nối",
  ai: "Người có quyền «cau_hinh.sua» hoặc quản trị viên (sửa và dùng khung «Gửi email»); người khác được phân quyền nhóm này chỉ sửa ô nhập, khung «Gửi email» ẩn với họ.",
  laGi: [
    "Mỗi khi có chuyện cần báo (được giao việc, tài liệu bị trả lại, việc quá hạn…) máy tạo một thông báo: hiện ở chuông 🔔 trong ứng dụng và, nếu bạn bật, gửi thêm một email.",
    "Mục này quyết định: thư gửi từ hộp thư nào, qua máy chủ thư nào, loại thông báo nào gửi email, tiêu đề thư là gì và câu chữ mẫu từng loại.",
  ],
  vaoSao: [
    "Không phải ai cũng mở ứng dụng mỗi giờ. Việc quan trọng (giao việc, trả lại, đóng việc) gửi thêm email thì người nhận không bỏ lỡ; còn tin vụn (đã nhận tài liệu) chỉ ở chuông cho đỡ ngập hộp thư.",
    "Câu chữ mẫu đặt ở một nơi, nên cả công ty nhận cùng một cách diễn đạt.",
  ],
  vongLam: [
    "Bước trước: có sự kiện (giao việc, báo xong, trả lại, quá hạn…) từ các màn khác.",
    "Mục này: máy tạo thông báo theo loại, điền câu mẫu, chọn kênh trong app / email.",
    "Bước sau: người nhận thấy tin ở chuông 🔔; email vào hàng đợi thư và được bộ gửi gửi đi (khung «Gửi email» ở đầu mục cho xem hàng đợi).",
  ],
  cacKhoi: [
    ["Khung «Gửi email» (đầu mục)", "Xem đang gửi thật hay chế độ thử, gửi thư thử, xem và gửi lại hàng đợi thư.", "Gửi thử và hàng đợi"],
    ["Hộp thư gửi", "Địa chỉ gửi và tên người gửi.", "Hộp thư và máy chủ"],
    ["Máy chủ gửi thư (SMTP)", "Máy chủ, cổng, bảo mật, tài khoản.", "Hộp thư và máy chủ"],
    ["Kênh theo loại thông báo", "Bảng mỗi loại: Trong app · Email · Tiêu đề thư.", "Kênh và tiêu đề"],
    ["Nội dung mẫu từng loại thông báo", "Câu chữ có biến như {ten_tai_lieu}.", "Nội dung mẫu"],
  ],
  nguoi: "Quản trị khai hộp thư, chọn kênh, chỉnh câu mẫu, gửi thư thử, gửi lại thư lỗi. Người nhận đọc tin ở chuông hoặc hộp thư.",
  may: "Điền biến vào câu mẫu, chọn kênh theo bảng, đưa thư vào hàng đợi và gửi đi; thư lỗi được giữ lại để thử lại.",
  aiLam: "— Mục này không dùng AI.",
  quyTrinhAI: null,
  buoc: [
    {
      ten: "① Hộp thư và máy chủ",
      khoi: [
        { doan: ["Muốn gửi được email thật, phải có một hộp thư và máy chủ gửi thư (gọi là SMTP) để máy đăng nhập vào. Chưa khai thì hệ thống chỉ báo trong ứng dụng."] },
        {
          bang: [
            ["Ô", "Nghĩa", "Ví dụ"],
            ["Địa chỉ gửi thông báo", "Hộp thư làm người gửi. Để trống = chỉ thông báo trong ứng dụng.", "docflow@scigroup.vn"],
            ["Tên người gửi", "Tên hiện trong hộp thư người nhận (mặc định «SCI công việc»).", "SCI công việc"],
            ["Máy chủ", "Địa chỉ máy chủ thư.", "smtp.gmail.com"],
            ["Cổng", "587 (STARTTLS) hoặc 465 (SSL); từ 1 đến 65535.", "587"],
            ["Bảo mật", "STARTTLS · SSL/TLS · Không mã hóa (chỉ mạng nội bộ).", "STARTTLS"],
            ["Tài khoản đăng nhập", "Tài khoản vào máy chủ thư; để trống nếu máy chủ không cần.", "docflow@scigroup.vn"],
          ],
        },
        {
          bam: [
            "Mở Cài đặt → tab «🔌 Kết nối» → mục «Email, thông báo».",
            "Điền các ô ở «Hộp thư gửi» và «Máy chủ gửi thư (SMTP)».",
            "Bấm «Lưu».",
            "Nhờ người quản lý máy chủ đặt mật khẩu hộp thư ở nơi bí mật của máy chủ (biến SMTP_PASS) — mật khẩu KHÔNG nhập ở màn này.",
          ],
        },
        { viDu: ["Công ty dùng hộp thư docflow@scigroup.vn, máy chủ smtp.gmail.com, cổng 587, bảo mật STARTTLS. Điền đủ rồi «Lưu». Khung «Gửi email» đổi từ «Chưa cấu hình email» (đỏ) sang «Đang gửi thật qua SMTP» (xanh) khi mật khẩu đã được đặt."] },
        { luuY: ["Máy chủ có biến riêng (SMTP_HOST, SMTP_PORT, SMTP_USER…) thì biến đó đè các ô ở đây.", "Khung sẽ ghi «Mật khẩu SMTP: CHƯA đặt» nếu thiếu mật khẩu."] },
      ],
    },
    {
      ten: "② Kênh và tiêu đề",
      khoi: [
        { doan: ["Bảng «Kênh theo loại thông báo» có mỗi loại một hàng. Hai công tắc: «Trong app» (hiện ở chuông) và «Email». Cột «Tiêu đề thư» là tiêu đề email, {noi_dung} được thay bằng nội dung thông báo."] },
        {
          tieuDe: "Mặc định một số loại",
          bang: [
            ["Loại", "Trong app", "Email"],
            ["Tài liệu mới đến", "Có", "Có"],
            ["Được giao việc", "Có", "Có"],
            ["Tài liệu bị trả lại", "Có", "Có"],
            ["Việc đã đóng", "Có", "Có"],
            ["Sổ cái thiếu việc", "Có", "Có"],
            ["Tài liệu đã được nhận", "Có", "Không"],
            ["Việc bị đè", "Có", "Không"],
            ["Loại khác (mọi loại chưa có dòng riêng)", "Có", "Không"],
          ],
        },
        { bam: ["Tìm hàng của loại thông báo.", "Bật hoặc tắt công tắc «Trong app» / «Email».", "Sửa «Tiêu đề thư» nếu muốn.", "Bấm «Lưu»."] },
        {
          viDu: [
            "Muốn người phụ trách nhận email khi việc được gia hạn: ở hàng «Việc được gia hạn» để «Email» là bật (mặc định đã bật).",
            "Muốn thôi email khi tài liệu được nhận: giữ «Email» tắt ở hàng «Tài liệu đã được nhận».",
          ],
        },
        { luuY: ["Hai loại «Việc quá hạn» và «Việc sắp đến hạn» không có công tắc ở đây: kênh của chúng theo «Sổ cái, nhắc việc › Kênh nhắc» (ô ghi rõ như vậy). Ở đây chỉ chỉnh tiêu đề thư của chúng."] },
      ],
    },
    {
      ten: "③ Nội dung mẫu",
      khoi: [
        { doan: ["Mỗi loại có một câu mẫu. Chỗ trong ngoặc nhọn là biến, máy thay giá trị thật lúc gửi."] },
        {
          bang: [
            ["Biến", "Được thay bằng"],
            ["{nguoi_gui}", "Tên người gửi tài liệu"],
            ["{ten_tai_lieu}", "Tên tài liệu"],
            ["{don_vi}", "Đơn vị nhận"],
            ["{ma_viec}", "Mã việc"],
            ["{han}", "Hạn kết thúc"],
            ["{ly_do}", "Lý do trả lại hoặc không dùng"],
            ["{ten}", "Tên người dùng"],
          ],
        },
        { bam: ["Tìm dòng loại thông báo ở «Nội dung mẫu từng loại thông báo».", "Sửa câu trong ô, giữ nguyên các biến trong ngoặc nhọn.", "Bấm «Lưu»."] },
        { viDu: ["Mẫu «Tài liệu bị trả lại»: «{ten_tai_lieu} bị trả lại: {ly_do}». Khi gửi thật sẽ thành «Báo cáo tuần 42 của SCI E&C bị trả lại: thiếu người kiểm soát»."] },
        { luuY: ["Viết sai tên biến (ví dụ {tenTaiLieu}) thì chữ trong ngoặc nhọn hiện nguyên văn trong thư."] },
      ],
    },
    {
      ten: "④ Gửi thử và hàng đợi",
      khoi: [
        { doan: ["Khung «Gửi email» ở đầu mục cho biết máy đang ở chế độ nào và cho xem các thư đã vào hàng đợi. Khung này ẩn với người không có quyền (máy chủ trả từ chối thì cả khung biến mất)."] },
        {
          tieuDe: "Ba chế độ",
          bang: [
            ["Chữ trên khung", "Nghĩa"],
            ["Đang gửi thật qua SMTP", "Đã khai đủ; thư đi ra ngoài thật."],
            ["Chế độ thử (không gửi thật)", "Thư chỉ được ghi ra một thư mục thử trên máy chủ."],
            ["Chưa cấu hình email", "Thiếu thông tin; thư không đi."],
          ],
        },
        {
          bam: [
            "Bấm «Gửi thư thử tới tôi» (mờ nếu chưa cấu hình) để thử: máy gửi một thư tới email của bạn.",
            "Dòng «Hàng đợi thư» cho biết chờ · đang gửi · lỗi · đã gửi. Chọn bộ lọc «Chờ và lỗi», «Chỉ thư lỗi», «Đã gửi» hoặc «Tất cả».",
            "Thư lỗi: bấm «Thử lại» ở hàng đó, hoặc «Thử lại mọi thư lỗi». Thư đang chờ: bấm «Gửi ngay».",
          ],
        },
        { viDu: ["Sau khi điền SMTP bạn bấm «Gửi thư thử tới tôi». Toast «Đã gửi thư thử tới …» kèm email của bạn. Không thấy thư tới → xem bảng hàng đợi: nếu thư hiện «Lỗi» kèm lý do màu đỏ (vd sai mật khẩu), sửa rồi bấm «Thử lại»."] },
        { luuY: ["Bạn đang sửa nháp chưa lưu thì khung ghi «Bạn đang có thay đổi chưa lưu — trạng thái trên là theo cấu hình đã lưu»."] },
      ],
    },
  ],
  viDuLuu: ["Đổi «Tên người gửi» từ «SCI công việc» sang «SCI Ban QLDA» và bấm «Lưu» → nhật ký ghi «Tên người gửi: SCI công việc → SCI Ban QLDA»; thư gửi sau đó hiện tên mới."],
  vuong: [
    ["Khung hiện «Chưa cấu hình email»", "Thiếu máy chủ / hộp thư / tài khoản; điền ở tab ① rồi «Lưu»."],
    ["«Mật khẩu SMTP: CHƯA đặt»", "Nhờ người quản lý máy chủ đặt biến SMTP_PASS rồi khởi động lại dịch vụ."],
    ["Thư thử báo lỗi", "Đọc dòng lý do đỏ trong bảng hàng đợi (sai mật khẩu, cổng, bảo mật); sửa rồi «Thử lại»."],
    ["Không thấy khung «Gửi email»", "Bạn không có quyền xem khung này; chỉ người sửa được mọi nhóm thấy."],
    ["Chuông có tin mà email không tới", "Hàng loại thông báo đó để «Email» tắt, hoặc loại quá hạn / sắp đến hạn đang theo «Kênh nhắc» ở mục sổ cái."],
  ],
  canCu: "Nhóm «thong_bao» trong cài đặt; hàng đợi thư của hệ thống; kênh nhắc ở mục «Hạn việc, quá hạn, nhắc việc».",
});
