// Hướng dẫn bản 2 (tab) — khung sửa thông tin một mẫu báo cáo (bấm «Sửa» / «Xem» ở trang Mẫu báo cáoord). Viết 20/10/2026.
// Nhãn chép từ components/mau-word/SuaMau.tsx và app/mau-word/page.tsx. Không dùng AI. Nút «Xoá mẫu» chỉ hiện khi mẫu chưa có báo cáo nào gửi theo (luật 17 ngoại lệ: không bấm được thì ẩn).
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Sửa thông tin một mẫu báo cáo (tên, kỳ, đơn vị, ngừng dùng, xoá)",
  ai: "Người có quyền «Quản lý mẫu Word» sửa được. Người khác mở bằng nút «Xem»: các ô bị khoá, không có nút «Lưu» và «Xoá mẫu», chỉ còn dòng «Chỉ người có quyền Quản lý mẫu Word mới sửa được. Bạn vẫn xem và tải mẫu.»",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Khung này là gì",
          doan: [
            "Khung hiện bên trái khi bạn bấm «Sửa» (hoặc «Xem») ở dòng một mẫu. Đây là nơi sửa THÔNG TIN của mẫu: tên, kỳ, đơn vị lập, nơi nhận mặc định, đang dùng hay ngừng, và xoá mẫu chưa dùng.",
            "Khung này KHÔNG sửa cấu trúc mẫu (chương, bảng, cột). Muốn đổi cấu trúc, dùng nút «Cập nhật» ở dòng mẫu (hướng dẫn «Thêm hoặc cập nhật mẫu bằng tệp Word»). Hai đường khai song song sẽ lệch nhau nên chỉ giữ một.",
          ],
        },
        {
          tieuDe: "② Vì sao cần",
          ds: [
            "Đổi tên hiển thị, đổi kỳ, đổi nơi nhận mặc định khi tổ chức đổi, mà không đụng tới tệp mẫu.",
            "Ngừng dùng một mẫu khi không còn đơn vị nào dùng, mà vẫn giữ nguyên báo cáo cũ.",
            "Dọn mẫu tạo nhầm trước khi có ai dùng.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Chặng", "Làm gì"],
            ["Trước", "Mẫu đã được tạo qua «Thêm mẫu mới»"],
            ["Khung này", "Chỉnh thông tin, ngừng dùng hoặc xoá"],
            ["Sau", "Thay đổi áp dụng ngay cho màn Báo cáo: đơn vị lập quyết định ai thấy mẫu, nơi nhận mặc định quyết định báo cáo đi đâu khi tệp không ghi dòng «Gửi:»"],
          ],
        },
        {
          tieuDe: "④ Các khối trong khung",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Ô «Tên mẫu», «Loại kỳ», «Đơn vị lập», «Nơi nhận mặc định»", "Thông tin mẫu", "① Sửa thông tin"],
            ["Ô tích «Đang dùng»", "Ngừng hoặc dùng lại mẫu", "② Ngừng dùng"],
            ["Nút «Lưu»", "Ghi thay đổi", "① Sửa thông tin"],
            ["Nút «Xoá mẫu»", "Xoá hẳn mẫu chưa có báo cáo", "③ Xoá mẫu"],
            ["Cột phải: «Các phiên bản mẫu», «Lịch sử mẫu»", "Xem tệp các bản, lịch sử thay đổi", "Hướng dẫn trang «Mẫu báo cáo»"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì"],
            ["Người", "Sửa các ô, bấm «Lưu», ngừng dùng hoặc xoá."],
            ["Máy", "Lưu thông tin, ghi lịch sử, đếm số báo cáo đã gửi theo mẫu để quyết định có cho xoá không, khi xoá thì xử lý bản nháp và luật kiểm tra liên quan."],
            ["🤖 AI", "— Khung này không dùng AI."],
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          doan: ["Khung này không dùng AI: người sửa, máy lưu và ghi lịch sử."],
        },
      ],
    },
    {
      ten: "① Sửa thông tin",
      khoi: [
        {
          bang: [
            ["Ô", "Tác dụng", "Các giá trị"],
            ["«Tên mẫu»", "Tên hiển thị ở danh sách và màn Báo cáo", "Gõ tự do"],
            ["«Loại kỳ»", "Chu kỳ nộp", "Tuần · Tháng · Quý · Tự do"],
            ["«Đơn vị lập»", "Đơn vị dùng mẫu", "Chọn một đơn vị, hoặc «Mẫu chung»"],
            ["«Nơi nhận mặc định (khi file không ghi dòng …)»", "Báo cáo đi đâu khi tệp không có dòng Gửi", "Chọn đơn vị, hoặc «Theo luồng báo cáo»"],
          ],
        },
        {
          bam: [
            "Bấm «Sửa» ở cuối dòng mẫu (bấm lần nữa để đóng khung).",
            "Sửa các ô cần đổi.",
            "Bấm «Lưu».",
          ],
        },
        {
          ketQua: ["Thông báo xanh «Đã lưu mẫu …»; dòng mẫu ở danh sách cập nhật; lịch sử mẫu thêm một dòng."],
        },
        {
          viDu: [
            "Tình huống: phòng đổi tên thành «Phòng Kỹ thuật và Vận hành». Bạn mở «Sửa» ở mẫu của phòng, đổi «Tên mẫu», bấm «Lưu». Tên mới hiện ở danh sách và màn Báo cáo; tệp mẫu và các báo cáo cũ không đổi.",
          ],
        },
        {
          luuY: ["Đổi «Đơn vị lập» hay «Nơi nhận mặc định» ảnh hưởng ngay việc báo cáo đi đâu; kiểm tra luồng báo cáo ở Cài đặt nếu không chắc."],
        },
      ],
    },
    {
      ten: "② Ngừng dùng",
      khoi: [
        {
          doan: ["Ô tích «Đang dùng» ghi: bỏ tích là ngừng dùng — không ai nộp được báo cáo theo mẫu này, báo cáo cũ vẫn đọc được."],
        },
        {
          bam: [
            "Bỏ tích «Đang dùng», bấm «Lưu».",
            "Dòng thông báo ghi «… đang ngừng dùng, không ai nộp được báo cáo theo mẫu này».",
            "Muốn dùng lại: tích lại «Đang dùng», bấm «Lưu».",
          ],
        },
        {
          viDu: ["Tình huống: mẫu của một ban đã giải thể. Ngừng dùng để người dùng khỏi nhầm, thay vì xoá vì mẫu đã có báo cáo gửi theo."],
        },
        {
          luuY: ["Mẫu ngừng dùng chuyển vào dòng co lại «Mẫu ngừng dùng (N)» ở cuối danh sách."],
        },
      ],
    },
    {
      ten: "③ Xoá mẫu",
      khoi: [
        {
          doan: [
            "Xoá hẳn chỉ làm được với mẫu CHƯA có báo cáo nào gửi theo. Khi đã có báo cáo, màn hiện câu «Đã có N báo cáo gửi theo mẫu này — không xoá được, chỉ ngừng dùng.» và không có nút «Xoá mẫu».",
          ],
        },
        {
          bam: [
            "Bấm «Xoá mẫu» (chỉ hiện với mẫu chưa dùng).",
            "Đọc câu hỏi «Xoá hẳn mẫu …?» kèm lời báo không lấy lại được.",
            "Bấm «Xoá hẳn» để xoá, hoặc «Thôi».",
          ],
        },
        {
          ketQua: [
            "Mẫu biến khỏi danh sách. Thông báo cho biết bao nhiêu bản nháp theo mẫu này đã thành tệp thường và bao nhiêu luật kiểm tra đã được xử lý.",
          ],
        },
        {
          viDu: ["Tình huống: bạn tạo nhầm một mẫu thử, chưa ai gửi báo cáo theo nó. Mở «Sửa», bấm «Xoá mẫu» rồi «Xoá hẳn»."],
        },
        {
          luuY: ["Không lấy lại được. Mẫu thật, đã dùng thì chọn ngừng dùng."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Các ô bị mờ, không có nút «Lưu»", "Bạn chưa có quyền «Quản lý mẫu Word»."],
            ["Không có nút «Xoá mẫu»", "Mẫu đã có báo cáo gửi theo, hoặc số báo cáo đang tải; chờ một chút hoặc dùng ngừng dùng."],
            ["Muốn đổi chương, bảng, cột", "Dùng nút «Cập nhật» ở dòng mẫu, không phải khung này."],
            ["Lưu xong nhưng người dùng vẫn nộp được", "Mẫu còn tích «Đang dùng»; kiểm lại ô tích."],
          ],
        },
      ],
    },
  ],
  canCu: "Quyền «Quản lý mẫu Word»; mẫu đã có báo cáo gửi theo thì không xoá, chỉ ngừng dùng; cấu trúc mẫu chỉ khai qua «Cập nhật» (chốt 01/10/2026).",
};
