// Hướng dẫn bản 2 (tab) — chuông 🔔 ở thanh trên (MÃ CỐ ĐỊNH chuong-bao, dùng chung mọi agent). Khuôn gốc: agent Hợp đồng; bản này đồng bộ cho agent Main 20/10/2026.
// Chuông là khung nhúng (iframe) của agent Công việc (components/layout/ChuongCongViec.tsx ở mỗi agent); nội dung bên trong do agent Công việc quyết.
// Đối chiếu code agent Công việc 20/10/2026: components/phong/KhungPhong.tsx hàm Chuong (con số «8+5», dấu «!», «Đánh dấu đã đọc hết», «Xem tin đã đọc (N) ▸» 7 ngày, ô «Không nhận thông báo xong việc của Nhân viên») · components/phong/ChuongNhung.tsx (chưa đăng nhập → chuông mờ, đọc lại mỗi 60 giây).
// Chỗ AI: không có.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Chuông 🔔 — thông báo việc từ agent Công việc",
  ai: "Mọi tài khoản đăng nhập thấy chuông. Người nhận thông báo là người được giao việc, được nhắc tên hoặc có việc sắp tới hạn — theo agent Công việc quyết định. Ô «Không nhận thông báo xong việc của Nhân viên» chỉ hiện với người có nhận loại tin «cấp dưới xong việc».",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Chuông là gì?",
          doan: [
            "Chuông 🔔 ở thanh trên cho biết có việc mới, ý kiến mới hoặc việc sắp tới hạn liên quan tới anh chị. Thông báo do agent Công việc quản lý; chuông ở agent Main chỉ là cửa sổ nhìn sang, nên ở agent nào anh chị cũng thấy cùng con số, cùng danh sách.",
          ],
        },
        {
          tieuDe: "Vì sao cần?",
          ds: [
            "Việc anh chị giao ở các agent sẽ do người khác làm; chuông cho biết họ đã báo xong hay đã hỏi gì mà không cần mở agent Công việc.",
            "Một chuông chung cho mọi agent, thông báo không bị phân tán.",
          ],
        },
        {
          tieuDe: "Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Chặng", "Làm gì"],
            ["Bước trước", "Việc được giao, được nhắc, đổi hạn hoặc có ý kiến ở agent Công việc"],
            ["Chuông", "Hiện thông báo"],
            ["Bước sau", "Bấm thông báo để mở việc tương ứng"],
          ],
        },
        {
          tieuDe: "Các trạng thái của chuông",
          bang: [
            ["Trên màn", "Nghĩa"],
            ["🔔 sáng kèm con số, bấm mở khung thông báo rộng", "Agent Công việc đang chạy; con số là số tin chưa đọc"],
            ["🔔 mờ, rê chuột ghi «Agent Công việc (cổng 3004) đang tắt — chưa đọc được thông báo. Máy dò lại mỗi phút.»", "Agent Công việc đang tắt; máy dò lại mỗi phút, bật lại là chuông tự sáng"],
            ["🔔 mờ, rê chuột ghi «Chưa đăng nhập agent Công việc — bấm để đăng nhập (thẻ mới), rồi tải lại trang này»", "Phiên đăng nhập bên agent Công việc chưa có; bấm để mở trang đăng nhập ở thẻ mới"],
            ["Ô trống thay chuông", "Đang dò xem agent Công việc có chạy không"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì"],
            ["NGƯỜI", "Bấm chuông, đọc, bấm thông báo để mở việc, bấm «Đánh dấu đã đọc hết» khi muốn dọn"],
            ["MÁY", "Dò agent Công việc mỗi phút, đẩy thông báo mới vào chuông, gộp tin giống nhau, đếm tin chưa đọc và tin mới, xoá tin đã đọc quá 7 ngày"],
            ["🤖 AI", "Chuông không dùng AI"],
          ],
        },
        {
          tieuDe: "Quy trình người ↔ AI",
          doan: ["Màn này không dùng AI. Thông báo do máy ghép từ sự kiện thật (giao việc, nhắc, báo xong…); người chỉ đọc và bấm."],
        },
      ],
    },
    {
      ten: "① Dùng chuông",
      khoi: [
        {
          tieuDe: "Con số trên chuông",
          bang: [
            ["Hiện", "Nghĩa"],
            ["Một số, ví dụ «8»", "8 tin chưa đọc, anh chị đã nhìn thấy ở lần mở trước"],
            ["Dạng «8+5»", "8 tin chưa đọc cũ và 5 tin MỚI đến sau lần mở trước; con số phát sáng khi có tin mới"],
            ["Dạng «+5»", "Chỉ có tin mới"],
            ["Số lớn hơn 99", "Hiện «99+»"],
          ],
        },
        {
          tieuDe: "Bấm gì",
          bam: [
            "Bấm 🔔 ở thanh trên — khung thông báo mở rộng.",
            "Bấm một thông báo: tin được đánh dấu đã đọc và việc tương ứng mở ở thẻ trình duyệt mới của agent Công việc. Tin có tệp kèm thì có nút «Xem» (cửa sổ nổi giữa màn) và «Tải về».",
            "Bấm «Đánh dấu đã đọc hết» để dọn một lần.",
            "Bấm ra ngoài khung để đóng.",
          ],
          ketQua: ["Tin đã đọc rời khỏi chuông ngay. Cuối khung có dòng «Xem tin đã đọc (N) ▸» để xem lại tin đã đọc trong 7 ngày, quá 7 ngày máy xoá hẳn; bấm «◂ Quay lại tin chưa đọc …» để trở về."],
          luuY: [
            "Dấu «!» đỏ trước nội dung là tin mới từ lần mở chuông trước. Mở chuông xong rồi đóng thì số «mới» về 0.",
            "Tin giống hệt nhau được gộp còn một dòng, cuối dòng ghi «cùng nội dung N lần → gộp còn 1».",
            "Nếu anh chị là người nhận tin «cấp dưới xong việc», đầu khung có ô «Không nhận thông báo xong việc của Nhân viên»: bấm một lần là bật, bấm lại là tắt; chỉ áp cho việc do Trợ lý AI lọc ra từ báo cáo, việc anh chị tự giao vẫn báo đủ.",
          ],
          viDu: ["Tình huống: ở màn «Việc của tôi» anh chị giao nháp «Làm hồ sơ pháp lý: Hồ sơ đăng ký danh mục công trình, dự án cần thu hồi đất (TT-AI-17)» cho phòng pháp chế; hôm sau người nhận hỏi lại một ý, chuông của anh chị có thông báo mới. Bấm vào là mở thẳng việc đó ở agent Công việc."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Chuông mờ", "Rê chuột đọc lý do: agent Công việc đang tắt (chờ bật lại hoặc báo người quản trị máy) hoặc chưa đăng nhập bên agent Công việc (bấm để đăng nhập)"],
            ["Không có chuông", "Máy chưa biết địa chỉ agent Công việc hoặc đang dò; chờ vài giây"],
            ["Khung thông báo không đóng", "Bấm ra ngoài khung, hoặc tải lại trang"],
            ["Con số không khớp", "Chuông đọc lại mỗi 60 giây; mở chuông để cập nhật ngay"],
            ["Tin biến mất khỏi chuông", "Tin đã đọc rời chuông ngay; bấm «Xem tin đã đọc (N) ▸» để tìm lại trong 7 ngày"],
          ],
        },
      ],
    },
  ],
  canCu: "Mr. Đại chốt 04/10/2026 (thông báo việc ở agent Công việc, nhúng sang các agent) · 29/09 (chuông «8+5», dấu !) · 07/10 (dùng chung chuông) · 10/10/2026 (tin đã đọc rời ngay, xem lại 7 ngày) · 20/10/2026 (menu dùng chung thì hướng dẫn giống nhau).",
};
