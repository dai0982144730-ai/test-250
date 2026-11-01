// Hướng dẫn bản 2 (tab) — Cài đặt → tab «👥 Người dùng & phân quyền». Viết 20/10/2026 theo mẫu Nghiệm thu + luật chữ AI (Mr. Đại).
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Cài đặt — Người dùng & phân quyền",
  ai: "Chỉ Admin thêm, sửa, khoá, xoá, đổi email, đặt lại mật khẩu (mọi loại, kể cả PM). PM và Admin vào được tab; PM thấy danh sách với nút mờ kèm lý do. Nút «Kéo sơ đồ ngay» ai vào được Cài đặt cũng bấm được.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Tab này là gì?",
          doan: ["Nơi quản lý tài khoản đăng nhập của cả hệ: ai vào được, thuộc loại nào, được thấy dự án nào, và ma trận quyền của từng loại. Main là bản gốc; bốn agent kia kéo về, sau mỗi lần ghi Main tự đẩy sang các agent."],
        },
        {
          tieuDe: "Vì sao cần?",
          ds: ["Một nơi cấp quyền nên không có tài khoản lệch nhau giữa các agent.", "Quyền theo LOẠI tài khoản và theo DỰ ÁN: người ngoài dự án không thấy tiền hợp đồng và hồ sơ pháp lý của dự án đó.", "Sơ đồ tổ chức tự kéo từ agent Công việc nên người mới vào sơ đồ là có sẵn gợi ý tạo tài khoản."],
        },
        {
          tieuDe: "Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Bước trước", "Tab này", "Bước sau"],
            ["Có người mới, đổi chức vụ, đổi email", "Tạo / sửa tài khoản, chọn loại và dự án", "Người đó đăng nhập, thấy đúng màn và dự án; báo cáo sáng gửi đúng người"],
          ],
        },
        {
          tieuDe: "Bốn loại tài khoản (và Nhà thầu)",
          bang: [
            ["Loại", "Xem", "Ghi · nạp · sửa · duyệt · trợ lý AI", "Cài đặt", "Quản lý người dùng", "Phê duyệt (ký phiếu giá)"],
            ["PM", "Có", "Có", "Có", "Không", "Có"],
            ["Admin", "Có", "Có", "Có", "Có", "Không"],
            ["Người dùng", "Có", "Có", "Không", "Không", "Không"],
            ["Người xem", "Có", "Không", "Không", "Không", "Không"],
            ["Nhà thầu", "Có", "Không", "Không", "Không", "Không"],
          ],
        },
        {
          tieuDe: "Các khối trên màn",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Sơ đồ tổ chức — tự kéo từ agent Công việc", "Biết sơ đồ đã khớp chưa; tạo tài khoản người mới", "① Sơ đồ tổ chức"],
            ["«+ Thêm người dùng»", "Tạo tay một tài khoản", "② Thêm người dùng"],
            ["Bảng người dùng (Email · Tên · Vai trò · Dự án được truy cập · Trạng thái · Telegram · Hành động)", "Sửa, khoá, đặt lại mật khẩu, xoá", "③ Sửa và quản lý"],
            ["Ma trận quyền", "Xem loại nào làm được gì", "④ Ma trận quyền"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · AI",
          bang: [
            ["Người", "Máy", "🤖 AI"],
            ["Admin tạo, sửa, khoá, đặt mật khẩu, chọn dự án", "Lưu, kiểm email trùng, kéo sơ đồ mỗi 30 phút, đẩy sang bốn agent, vẽ ma trận trực tiếp từ bảng quyền thật, chặn tự khoá / tự xoá", "Tab này không dùng AI"],
          ],
        },
        {
          tieuDe: "Quy trình người ↔ AI",
          ds: ["Tab này không dùng AI. Quyền được kiểm bằng luật cố định ở máy chủ, không phụ thuộc giao diện."],
        },
      ],
    },
    {
      ten: "① Sơ đồ tổ chức",
      khoi: [
        {
          doan: ["Sơ đồ tổ chức gốc nằm ở agent Công việc. Main tự kéo về mỗi 30 phút; khối này cho biết đã khớp chưa và lần ghi gần nhất đổi gì."],
        },
        {
          bam: ["Đọc dòng trạng thái: lần kéo gần nhất, tự động hay do ai, kết quả.", "Vừa sửa kiêm nhiệm bên agent Công việc mà không muốn chờ 30 phút: bấm «Kéo sơ đồ ngay».", "Nếu có dòng «N người có ở agent Công việc nhưng chưa có tài khoản ở Main»: bấm «Tạo N tài khoản» (Admin).", "Bấm «chi tiết» để mở phần giải thích dài, «ẩn» để thu."],
        },
        {
          viDu: ["Lần kéo gần nhất 20/10/2026 tự động: «Sơ đồ ở Main đang khớp agent Công việc — không có gì đổi» (34 đơn vị, 11 kiêm nhiệm, 52 người). Lần ghi gần nhất 13/10/2026: thêm kiêm nhiệm Nguyễn Chính Đại → BQLDA QT (Giám đốc BQL)."],
        },
        {
          luuY: ["Tạo tài khoản mới đặt mật khẩu lần đầu bằng chính email của người đó; nên nhắc đổi mật khẩu."],
        },
      ],
    },
    {
      ten: "② Thêm người dùng",
      khoi: [
        {
          bam: [
            "Bấm «+ Thêm người dùng» (đổi thành «Đóng form»).",
            "Nhập «Email (vd: ten@sci.vn)» và «Tên hiển thị».",
            "Chọn vai trò (PM, Admin, Người dùng, Người xem, Nhà thầu).",
            "«Mật khẩu tạm (≥ 6 ký tự) — để trống = email». Để trống thì mật khẩu lần đầu là chính email.",
            "Chọn «Dự án được truy cập»: «Theo sơ đồ tổ chức» (người thuộc dự án trong sơ đồ là Người dùng, không thuộc là Người xem), hoặc «Tất cả dự án» / chọn từng dự án. Nhà thầu phải chọn ít nhất một dự án và chọn đơn vị nhà thầu («— Chọn đơn vị (nhà thầu / thầu phụ) —»).",
            "Bấm «Tạo tài khoản».",
          ],
        },
        {
          viDu: ["Hệ hiện có 54 tài khoản: 1 Admin, 1 PM, 15 Người dùng, 35 Người xem, 2 Nhà thầu; không tài khoản nào bị khoá."],
        },
        {
          luuY: ["PM và Admin luôn truy cập tất cả dự án, không giới hạn được.", "Email phải khớp tài khoản đã khai ở ô Giám đốc dự án của dự án thì người đó mới thấy nút «Ký hồ sơ»."],
        },
      ],
    },
    {
      ten: "③ Sửa và quản lý",
      khoi: [
        {
          bam: [
            "Ở cột «Hành động» của dòng người dùng: sửa tên, vai trò, dự án rồi lưu.",
            "Đổi email: mở ô email khi bấm sửa, nhập email mới — mã người giữ nguyên, mật khẩu đổi thành email mới.",
            "«Reset mật khẩu»: gõ «Mật khẩu mới (≥ 6)» rồi bấm lưu.",
            "«Khóa» / «Mở khóa»: chặn hoặc cho lại đăng nhập, không mất dữ liệu.",
            "«Xóa»: xoá tài khoản.",
          ],
        },
        {
          ketQua: ["Cột «Telegram» ghi «đã nối» hoặc «chưa nối». Sau khi ghi, dòng chữ nhỏ báo đã đẩy sang mấy agent."],
        },
        {
          luuY: ["Không tự khoá hay tự xoá được tài khoản đang đăng nhập (nút mờ có chú thích).", "Người dùng tự đổi mật khẩu ở menu tên người → «Đổi mật khẩu»."],
        },
      ],
    },
    {
      ten: "④ Ma trận quyền",
      khoi: [
        {
          doan: ["Bảng vẽ thẳng từ định nghĩa quyền thật của hệ (không chép tay), nên luôn đúng với những gì máy chủ cho phép. Cột là năm cửa: Xem · Ghi · nạp · sửa · duyệt · trợ lý AI · Cài đặt · Quản lý người dùng · Phê duyệt. Bên dưới có bảng «Theo từng agent»: loại Người xem và Người dùng làm được gì ở từng agent."],
        },
        {
          viDu: ["Người xem có dấu ✓ ở «Xem» và ✗ ở «Ghi · nạp · sửa · duyệt · trợ lý AI», nên không dùng được trợ lý chat và mọi nút ghi hiện mờ."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Nút thêm / sửa mờ", "Anh/chị không phải Admin. Nhờ Admin."],
            ["Người mới không thấy dự án", "Chưa chọn dự án cho tài khoản, hoặc sơ đồ chưa có người đó — bấm «Kéo sơ đồ ngay» rồi kiểm cột «Dự án được truy cập»."],
            ["Email lệch giữa các agent", "Đổi email chỉ làm ở Main (đổi ở bên kia sẽ bị ghi đè)."],
            ["Không đăng nhập được", "Kiểm trạng thái «Khóa»; đặt lại mật khẩu bằng «Reset mật khẩu»."],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt Mr. Đại 25/09/2026 (bảng quyền duy nhất) và 12/10/2026 (sơ đồ tổ chức tự kéo, phân quyền theo dự án).",
};
