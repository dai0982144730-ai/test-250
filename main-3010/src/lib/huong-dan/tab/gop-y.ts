// VIẾT TỪ AGENT MAIN (20/10/2026) — bản chung mã gop-y; agent khác chép về, chỉ đổi tên agent và số liệu ví dụ (mỗi agent một sổ góp ý riêng).
// Hướng dẫn bản 2 (tab) — Góp ý, phản ánh (nút «Góp ý» ở thanh trên, /gop-y). Chỗ AI: không có.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Góp ý, phản ánh",
  ai: "Mọi tài khoản đăng nhập gửi được góp ý và xem được MỌI góp ý. Chỉ quản trị (PM, Admin) đặt trạng thái và trả lời.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Màn này là gì, vì sao cần?",
          doan: ["Chỗ gửi bất cập anh/chị gặp hoặc đề xuất cho phần mềm tốt hơn. Mọi người cùng đọc được nên không ai gửi trùng, và quản trị trả lời ngay dưới góp ý. Bấm «Góp ý» từ màn nào thì hệ ghi kèm màn đó, để biết góp ý cho chỗ nào."],
        },
        {
          tieuDe: "Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Bước trước", "Màn này", "Bước sau"],
            ["Gặp chỗ khó dùng hoặc có ý hay khi đang làm việc", "Viết góp ý, dán ảnh chụp màn hình", "Quản trị đặt trạng thái và trả lời; người sửa phần mềm đọc để sửa"],
          ],
        },
        {
          tieuDe: "Các khối",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Ô viết góp ý: tên, mô tả, ảnh, «Gửi góp ý», «Bỏ»", "Gửi một góp ý", "① Gửi góp ý"],
            ["«Các góp ý (N)» với bộ lọc trạng thái", "Đọc và theo dõi", "② Đọc và trả lời"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · AI",
          bang: [
            ["Người", "Máy", "🤖 AI"],
            ["Viết, gửi, đọc; quản trị đặt trạng thái và trả lời", "Lưu góp ý kèm ảnh và màn đang mở, đếm theo trạng thái, chia trang", "Màn này không dùng AI"],
          ],
        },
        {
          tieuDe: "Quy trình người ↔ AI",
          ds: ["Màn này không dùng AI. Mỗi agent có một sổ góp ý riêng."],
        },
      ],
    },
    {
      ten: "① Gửi góp ý",
      khoi: [
        {
          bam: [
            "Gõ tên góp ý ngắn gọn («Tên góp ý — ngắn gọn, sau còn tìm lại»).",
            "Mô tả: đang làm gì, ở màn nào, thấy gì, mong muốn thế nào.",
            "Dán ảnh chụp màn hình bằng Ctrl+V ở bất kỳ đâu trong khung (hoặc bấm chọn tệp ảnh); tối đa 6 ảnh.",
            "Bấm «Gửi góp ý» (mờ khi chưa có tên). «Bỏ» để xoá bản đang viết.",
          ],
        },
        {
          ketQua: ["Dòng xanh «Đã gửi góp ý … Cảm ơn bạn — người quản trị sẽ trả lời ở đây.» và góp ý mở sẵn trong danh sách."],
        },
        {
          viDu: ["Từ Bảng điều hành bấm «Góp ý» (đường có ?tu=/bang-dieu-hanh): tên «Ô Tiền ghi chưa có số mà không rõ vì sao», dán ảnh ô đó, mô tả hợp đồng nào chưa khai số thanh toán."],
        },
        {
          luuY: ["Góp ý có tên rõ thì sau còn tìm lại được.", "Ảnh nhạy cảm đừng dán — mọi người đều xem được góp ý."],
        },
      ],
    },
    {
      ten: "② Đọc và trả lời",
      khoi: [
        {
          bam: [
            "Lọc: bấm «Tất cả» hoặc một trạng thái — «Mới», «Đã tiếp nhận», «Đã sửa», «Không làm» (số cạnh tên là số góp ý).",
            "Bấm một góp ý để mở xem mô tả, ảnh và câu trả lời.",
            "Quản trị: chọn trạng thái ở ô chọn (chọn là lưu ngay), gõ «Câu trả lời cho người góp ý (không bắt buộc)» rồi bấm «Gửi trả lời».",
          ],
        },
        {
          luuY: ["Góp ý mới được trả lời thì tự thành «Đã tiếp nhận».", "Mỗi trang 30 góp ý."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Nút «Gửi góp ý» mờ", "Chưa gõ tên góp ý."],
            ["Không thấy ô trạng thái", "Chỉ quản trị mới đặt được."],
            ["Dán ảnh không được", "Chỉ nhận ảnh; thử chọn tệp ảnh bằng nút trong khung."],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt Mr. Đại 03/10/2026 (mọi agent đều có Góp ý, giống agent Công việc); chia trang 30 dòng.",
};
