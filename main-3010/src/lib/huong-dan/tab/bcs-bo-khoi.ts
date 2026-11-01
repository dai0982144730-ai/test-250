// Hướng dẫn bản 2 (tab) — Báo cáo sáng, tab ① «Báo cáo sáng của tôi»: bộ khối kéo thả + màn điện thoại. Viết 20/10/2026; viết lại 26/10/2026 theo ba cột bằng nhau.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Báo cáo sáng — Bộ khối kéo thả",
  ai: "Người có quyền Cài đặt (PM, Admin) sửa cho bất kỳ ai; mỗi người sửa được bộ của chính mình. Người khác thấy các nút mờ kèm lý do.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Bộ khối là gì, vì sao cần?",
          doan: [
            "Báo cáo sáng của mỗi người ghép từ các KHỐI. Thư viện có 21 khối (bảng COD các dự án kèm bảng «Vì sao chậm», hạng mục tự làm COD chậm, hồ sơ pháp lý quá hạn, S-Curve, lịch nhà thầu mời nghiệm thu, phiếu nghiệm thu chờ ký quá hạn, việc đã làm chưa nghiệm thu, nhân lực · máy ngoài công trường, báo cáo ngày công trường, việc sắp đến lúc làm, hồ sơ pháp lý sắp đến hạn…), mỗi khối là bảng ngắn hoặc chữ đậm, một số kèm ảnh biểu đồ. Mặc định mỗi mẫu có sẵn một bộ; muốn khác thì kéo khối vào báo cáo của người đó.",
            "Bên phải là MÀN ĐIỆN THOẠI giả lập: thấy gì ở đó là Telegram nhận đúng như vậy (cùng một hàm dựng với lúc gửi).",
          ],
        },
        {
          tieuDe: "Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Bước trước", "Màn này", "Bước sau"],
            ["Chọn mẫu cho người ở tab «② Người nhận»", "Chỉnh khối cho riêng người đó và nhìn ngay trên điện thoại", "07:00 gửi đúng bộ khối này"],
          ],
        },
        {
          tieuDe: "Ba cột bằng nhau, cố định vừa màn hình",
          bang: [
            ["Cột", "Để làm gì"],
            ["Trái: «Thư viện khối» (3 tab: Tổng quát · Ra quyết định · Đi sâu)", "Chọn khối. Rê chuột vào một khối thì hiện thẻ «Để làm gì · Lấy ở đâu · Công thức» (ngoài màn điện thoại). Số «0/5» trên tab là số khối đã có trong báo cáo / số khối của kệ"],
            ["Giữa: «Báo cáo sáng của …»", "Các khối đã chọn, kéo đổi thứ tự, chọn phạm vi và số dòng"],
            ["Phải: màn điện thoại «Main Agent»", "Bản Telegram của người này. Hai nút trên thanh «Main Agent»: «Cả báo cáo» và «Khối …» (khối đang chọn)"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · AI",
          bang: [
            ["Người", "Máy", "🤖 AI"],
            ["Kéo khối vào, đổi thứ tự, chọn phạm vi và số dòng, bỏ khối, bấm xem từng khối", "Lưu ngay mỗi thao tác, tính số thật cho khối, dựng màn điện thoại, vẽ ảnh biểu đồ", "🤖 Khối kiểu «chữ 🤖» (như «🤖 Một câu mỗi dự án», «Việc làm chậm COD + 🤖 câu hỏi quyết») mang câu do AI viết lúc «Dựng lại»; khối khác không dùng AI"],
          ],
        },
        {
          tieuDe: "Quy trình người ↔ AI",
          ds: ["Người kéo khối; máy lưu ngay và dựng lại màn điện thoại.", "Khối chữ 🤖 chỉ có câu AI khi bản ngày đã được dựng (AI viết lúc «Dựng lại»); chưa có thì ghi «chưa có câu hôm nay».", "Người đọc màn điện thoại rồi mới tin."],
        },
      ],
    },
    {
      ten: "① Kéo và chỉnh khối",
      khoi: [
        {
          bam: [
            "Ở thư viện bấm «＋» để thêm khối vào cuối báo cáo, hoặc kéo thả vào đúng chỗ muốn. Khối đã có thì dấu «✓» và mờ.",
            "Ở cột giữa kéo biểu tượng «⋮⋮» (title «Kéo để đổi thứ tự») để đổi thứ tự; bấm «✕» để bỏ khối.",
            "Dưới mỗi khối chọn phạm vi: «Toàn công ty» hoặc «Dự án tôi chọn». Bấm «Dự án tôi chọn» là ô chọn dự án bung ngay dưới khối — bấm tên để chọn / bỏ, lưu ngay, bấm ra ngoài thì gập. Danh sách dự án dùng chung cho mọi khối «Dự án tôi chọn»; sửa ở dòng «Dự án tôi chọn: … ✎ Sửa» đầu cột cũng được.",
            "Khối có danh sách dòng thì chọn số dòng: mặc định, 1, 3, 5, 10, 20 hoặc tất cả.",
            "Khối «Việc làm chậm COD + 🤖 câu hỏi quyết» có thêm nút «Nặng nhất cả công ty» (lấy N việc nặng nhất cả công ty thay vì mỗi dự án N việc).",
            "Bấm «Về bộ mặc định» để bỏ bộ riêng, quay về bộ của mẫu.",
          ],
        },
        {
          ketQua: ["Mọi thao tác lưu NGAY, không có nút xác nhận. Tiêu đề ghi «bộ riêng · N khối» hoặc «bộ mặc định của mẫu …»."],
        },
        {
          viDu: ["Bộ mặc định mẫu «Điều hành» chỉ có khối «Việc làm chậm COD + 🤖 câu hỏi quyết» lấy 5 dòng. Thêm «Hạng mục tự làm COD chậm» (RQ-2) từ tab «Ra quyết định», đặt lên đầu: sáng mai người đó nhận hạng mục kéo COD trước, rồi mới tới việc làm chậm."],
        },
        {
          luuY: ["Telegram gửi mọi ảnh có nội dung thành MỘT album (tối đa 10 ảnh một lượt), theo thứ tự khối. Khối biểu đồ chỉ ra ảnh khi có gì để so — dự án chưa có số thì không vẽ.", "Tin Telegram có trần 4.096 ký tự mỗi tin."],
        },
      ],
    },
    {
      ten: "② Xem khối trên điện thoại",
      khoi: [
        {
          bam: [
            "Bấm TÊN một khối (ở thư viện hoặc ở danh sách giữa): màn điện thoại chỉ hiện riêng khối đó — kể cả khối chưa có trong báo cáo, để xem thử trước khi thêm.",
            "Bấm «Cả báo cáo» trên thanh «Main Agent» của điện thoại: xem toàn bộ bản; nếu đang chọn một khối có trong bản thì màn tự cuộn tới khối đó và nháy viền.",
            "Bấm «Khối …» (tên khối đang chọn) để quay lại xem riêng khối đó. Chưa chọn khối nào thì nút mờ.",
            "Màn điện thoại có thanh trượt riêng; tin dài tới đâu cũng trượt trong khung, không kéo cả trang.",
          ],
        },
        {
          ketQua: ["Màn điện thoại hiện bảng đơn cách (như trên Telegram), chữ đậm, emoji 🔴🟡🟢 và ảnh biểu đồ. Muốn đọc «Để làm gì · Lấy ở đâu · Công thức» thì rê chuột vào khối ở thư viện — thẻ hiện ngoài điện thoại."],
        },
        {
          luuY: ["Chưa có bản báo cáo của ngày đang chọn thì màn điện thoại ghi «Chưa có bản báo cáo của ngày này» — bấm «Dựng lại» ở hàng nút phía trên.", "Quá hạn 7–29 ngày hiện 🟡, từ 30 ngày hiện 🔴 (khối «Hồ sơ pháp lý quá hạn» và «Việc quá hạn theo người»); khối tiền không tô màu vì chưa có ngưỡng."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Không kéo được", "Anh/chị không có quyền sửa bộ của người này (chỉ PM, Admin hoặc chính người đó)."],
            ["Câu 🤖 ghi «chưa có câu hôm nay»", "Chưa dựng bản ngày, hoặc AI chưa trả lời kịp; bấm «Dựng lại» ở đầu trang."],
            ["Bấm tên khối mà điện thoại không đổi", "Màn đang chờ bản ngày; bấm «Dựng lại» rồi bấm lại."],
            ["Muốn quay lại như ban đầu", "Bấm «Về bộ mặc định»."],
            ["Chữ trong ảnh nhỏ", "Ảnh 720×480 vẽ chữ cỡ 22 để đọc được trên điện thoại; chú thích dài nằm ở lời kèm ảnh, không trong ảnh."],
          ],
        },
      ],
    },
  ],
  canCu: "KE-HOACH/23 (kéo thả khối báo cáo sáng, Mr. Đại chốt 17/10/2026); KE-HOACH/31 (thiết kế lại 16 khối, 25/10/2026).",
};
