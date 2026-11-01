// Hướng dẫn bản 2 (tab) — trang «Mẫu báo cáo» (/mau-word). Viết lại 22/10/2026 khi báo cáo tuần chuyển sang nộp bằng Excel
// (Mr. Đại chốt: tệp .xlsx ba tờ Mẫu trắng · Hướng dẫn · Ví dụ đã điền; bỏ «Tải mẫu có ví dụ»). Nhãn chép từ app/mau-word/page.tsx,
// components/mau-word/NutTaiMau.tsx và tệp Excel do lib/mau-excel/dung-excel.ts dựng.
// Đối chiếu code 22/10: ai đăng nhập cũng xem và tải mẫu; quyền «mau.quan_ly» mới thấy «Thêm mẫu mới», «Cập nhật», «Word gốc» và sửa được.
// Hai khung con có hướng dẫn riêng: mau-word-khai-bao (thêm mới / cập nhật, có AI), mau-word-sua (sửa thông tin mẫu).
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Mẫu báo cáo — tải tệp Excel, điền, nộp",
  ai: "Ai đăng nhập cũng xem danh sách và tải mẫu. Chỉ người có quyền «Quản lý mẫu báo cáo» (quản trị viên có sẵn) thấy nút «Thêm mẫu mới», «Cập nhật», đường «Word gốc» và sửa được thông tin mẫu; người không có quyền thấy nút «Xem» thay cho «Sửa».",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Màn này là gì",
          doan: [
            "Đây là nơi lấy mẫu báo cáo tuần của từng đơn vị (Form 0 đến Form 11). Bấm «Tải mẫu» là nhận MỘT tệp Excel (.xlsx) có ba tờ: «Mẫu trắng» để điền, «Hướng dẫn» ghi từng ô phải ghi gì, «Ví dụ đã điền» để xem cách ghi.",
            "Từ ngày 22/10/2026 báo cáo nộp bằng tệp Excel này. Tệp Word không còn nộp được; báo cáo Word đã nộp trước đó vẫn mở và đọc lại bình thường.",
          ],
        },
        {
          tieuDe: "② Vì sao cần",
          ds: [
            "Excel dễ thao tác hơn Word: chèn dòng, chép dòng, kéo thả, lọc đều quen tay; không lo làm vỡ ô gắn mã như bản Word.",
            "Máy đọc báo cáo theo CHỮ của tên chương, tên cột và nhãn ô. Điền đúng tờ «Mẫu trắng» thì máy hiểu được, gửi được và tách được việc vào sổ cái.",
            "Mẫu đổi khuôn không phải sửa phần mềm: người quản lý mẫu cập nhật, mọi người tải lại là có tệp mới.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Chặng", "Làm gì", "Vai trò của màn này"],
            ["Trước", "Quản trị khai đơn vị, nơi nhận, kỳ báo cáo", "Mẫu gắn với đơn vị lập và nơi nhận"],
            ["Màn này", "Tải tệp Excel của đơn vị", "Nguồn của mọi báo cáo tuần"],
            ["Sau", "Điền tờ «Mẫu trắng», nộp ở menu «Báo cáo»; máy kiểm từng ô, tách việc vào sổ cái", "Máy đối chiếu theo đúng mẫu"],
          ],
        },
        {
          tieuDe: "④ Các khối trên màn",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Bảng mẫu: «Mẫu», «Đơn vị lập», «Gửi đến mặc định», «Kỳ», «Ô nhập», «Bảng sinh việc», «Phiên bản»", "Tìm mẫu của đơn vị mình", "① Tải và điền mẫu"],
            ["Cuối mỗi dòng: «Tải mẫu» · «Sửa» hoặc «Xem» · «Cập nhật» (người quản lý mẫu)", "Thao tác với từng mẫu", "①, ③, ④"],
            ["Nút «Thêm mẫu mới» (góc phải tiêu đề, người quản lý mẫu)", "Tạo mẫu mới", "③ Thêm và cập nhật mẫu"],
            ["Khung mở khi bấm «Sửa» / «Xem»: thông tin mẫu, «Các phiên bản mẫu», «Lịch sử mẫu»", "Xem, sửa thông tin; tải phiên bản cũ", "④ Sửa thông tin và phiên bản"],
            ["Dòng co lại «Mẫu ngừng dùng (N)»", "Mẫu đã ngừng, ẩn cho gọn", "⑤ Mẫu ngừng dùng"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì"],
            ["Người", "Tải mẫu, điền tờ «Mẫu trắng», nộp. Người quản lý mẫu: cập nhật khuôn mẫu, sửa thông tin, ngừng dùng hoặc xoá mẫu."],
            ["Máy", "Dựng tệp Excel ba tờ mỗi lần bấm «Tải mẫu» (luôn theo mẫu mới nhất). Lúc nộp: tìm tên chương, tên cột, nhãn ô; đọc từng dòng; báo đúng ô sai; tách việc vào sổ cái. Cùng tệp thì luôn ra cùng kết quả."],
            ["🤖 AI", "🤖 Lúc nộp: AI soát nội dung (mục còn trống, câu chưa rõ) và chỉ đề xuất — người duyệt. 🤖 Lúc người quản lý cập nhật mẫu: AI đọc khuôn mới và đề xuất chương nào sinh việc; người duyệt."],
          ],
        },
      ],
    },
    {
      ten: "① Tải và điền mẫu",
      khoi: [
        {
          doan: ["Việc dành cho mọi người lập báo cáo tuần."],
        },
        {
          bam: [
            "Mở menu «Mẫu báo cáo» (hoặc bấm «Tải mẫu báo cáo» ở góc màn Báo cáo).",
            "Tìm dòng mẫu của đơn vị bạn (cột «Mẫu», «Đơn vị lập»), bấm «Tải mẫu».",
            "Mở tệp bằng Excel. Đọc tờ «Hướng dẫn» một lần; mở tờ «Ví dụ đã điền» nếu chưa rõ cách ghi.",
            "Điền vào tờ «Mẫu trắng»: soát «Kỳ báo cáo» (máy đã ghi sẵn tuần lúc tải mẫu), ghi đủ các bảng, mỗi dòng của bảng «Kết quả và kế hoạch việc» là MỘT việc. Rê chuột vào ô nào cũng hiện lời hướng dẫn của ô đó.",
            "Lưu tệp, giữ đuôi .xlsx. Vào «Báo cáo», kéo thả tệp vào khung; máy kiểm ngay, báo ô nào sai. In ra thì vừa khổ A4 dọc (Form 4 Phòng TCKT: A4 ngang) như bản Word cũ.",
          ],
        },
        {
          bang: [
            ["Màu trên tờ «Mẫu trắng» (trình bày như bản Word cũ, luật màu ô như biểu mẫu agent Tiến độ)", "Nghĩa"],
            ["Ô nền đỏ (Dự án, Kết thúc, Tình trạng… của bảng việc)", "Ghi sai thì máy hiểu sai việc — ghi đúng dạng như lời nhắc"],
            ["Ô nền xanh (Kỳ báo cáo; Đơn vị lập của mẫu dùng chung)", "Ghi theo kỳ — ghi sai thì ghi đè báo cáo đã nộp hoặc vào nhầm đơn vị"],
            ["Chữ đỏ · chữ xanh in đậm («Mã mẫu: form-N», tên chương, nhãn ô)", "Máy in sẵn — không sửa, không xoá"],
            ["Hàng tên cột nền xanh đậm chữ trắng", "Máy in sẵn — máy nhận cột theo đúng chữ này"],
            ["Dấu * · ô trắng có khung", "Phải ghi · ghi tự do"],
          ],
        },
        {
          viDu: [
            "Tình huống: chị phụ trách báo cáo tuần 43 của Phòng Đầu tư và Pháp chế bấm «Tải mẫu» ở dòng Form 1. Chị sửa «Kỳ báo cáo» thành «Tuần 43/2026 (19/10/2026 – 25/10/2026)», ghi 5 việc vào bảng «Kết quả và kế hoạch việc tuần tới», cột «Kết thúc» ghi 30/10/2026 cho việc thứ nhất và «5 ngày sau khi xong Trình hồ sơ xin cấp giấy phép xây dựng» cho việc thứ hai. Chị lưu tệp, kéo vào màn Báo cáo: máy đọc ra đủ 5 việc, không lỗi chặn, chị bấm Gửi.",
          ],
        },
        {
          luuY: [
            "Cần thêm dòng: chèn dòng ngay trong bảng (chuột phải → Insert). Bảng việc có sẵn 30 dòng trống; quá 30 việc vẫn chèn thêm được, máy đọc hết.",
            "Chèn thêm cột, đổi thứ tự cột vẫn đọc đúng — máy nhận cột theo chữ ở hàng tên cột, không theo vị trí.",
            "Ngày ghi đủ dd/mm/yyyy. Ô ngày của bảng việc để dạng chữ nên Excel không tự đổi 05/08 thành ngày kiểu Mỹ.",
          ],
        },
      ],
    },
    {
      ten: "② Ba tờ trong tệp",
      khoi: [
        {
          bang: [
            ["Tờ", "Có gì", "Máy có đọc không"],
            ["«Mẫu trắng» (tờ đầu)", "Đầu báo cáo (Gửi, Đơn vị lập, Kỳ báo cáo) rồi các chương xếp từ trên xuống, mỗi chương một bảng như bản Word cũ", "CÓ — tờ duy nhất máy đọc"],
            ["«Hướng dẫn»", "Ba điều cần nhớ · ý nghĩa màu · bảng từng ô, từng cột: ghi gì, máy dùng làm gì, ví dụ, ghi sai thì sao · cách nộp", "Không"],
            ["«Ví dụ đã điền»", "Cùng khuôn với tờ Mẫu trắng, có số liệu minh hoạ và chú thích cam «← …» bên phải dòng ví dụ", "Không"],
          ],
        },
        {
          luuY: [
            "Đừng điền vào tờ «Ví dụ đã điền»: máy không đọc tờ này. Tờ «Mẫu trắng» để trống thì máy chặn và nhắc chép sang.",
            "Đừng chép nguyên số liệu ví dụ sang tờ «Mẫu trắng»: máy nhận ra và chặn, vì đó không phải báo cáo thật.",
            "Đổi tên tờ «Mẫu trắng» vẫn đọc được, nhưng đừng xoá tờ đó và đừng chép bảng sang tệp khác.",
          ],
        },
      ],
    },
    {
      ten: "③ Thêm và cập nhật mẫu",
      khoi: [
        {
          doan: [
            "Dành cho người có quyền «Quản lý mẫu báo cáo». Khuôn của mỗi mẫu vẫn giữ ở một file Word gốc (đường «Word gốc» trong khung phiên bản): máy dựng tệp Excel từ file đó. «Cập nhật» thay file Word gốc bằng bản mới → từ lúc đó ai bấm «Tải mẫu» cũng nhận tệp Excel theo khuôn mới.",
            "Các bước chi tiết nằm ở hướng dẫn «Thêm hoặc cập nhật mẫu bằng tệp Word (AI đọc, người duyệt)».",
          ],
        },
        {
          bam: [
            "Mẫu có sẵn: mở «Sửa», bấm «Word gốc» ở bản mới nhất để lấy file gốc; sửa khuôn trong Word.",
            "Bấm «Cập nhật» ở dòng mẫu đó, chọn file Word vừa sửa, làm theo các bước trong khung (🤖 AI đọc → duyệt → kiểm tra → lưu).",
            "Bấm «Tải mẫu» thử: mở tệp Excel, soát tờ «Mẫu trắng» có đủ chương, cột mới.",
          ],
        },
        {
          luuY: ["Mẫu mới chưa có file Word gốc vẫn tải được tệp Excel: máy dựng theo định nghĩa mẫu (ô nhập + các bảng), tờ ví dụ ghi «chưa có bản ví dụ»."],
        },
      ],
    },
    {
      ten: "④ Sửa thông tin và phiên bản",
      khoi: [
        {
          doan: ["Bấm «Sửa» (người quản lý mẫu) hoặc «Xem» (người khác) ở cuối dòng để mở khung; bấm lần nữa để đóng."],
        },
        {
          bang: [
            ["Phần", "Nội dung", "Ai thấy"],
            ["Thông tin mẫu", "Tên, kỳ, đơn vị lập, nơi nhận mặc định, đang dùng; nút «Lưu», «Xoá mẫu»", "Mọi người xem; người quản lý sửa"],
            ["«Các phiên bản mẫu»", "Mỗi phiên bản: «Bản N · tải Excel» (tệp Excel dựng từ phiên bản đó) kèm giờ; người quản lý thấy thêm «Word gốc»", "Mọi người"],
            ["«Lịch sử mẫu»", "Dòng thời gian mọi thay đổi của mẫu", "Chỉ người quản lý mẫu"],
          ],
        },
        {
          viDu: ["Tình huống: cần đối chiếu báo cáo nộp theo bản 2 khi mẫu đã lên bản 3. Mở «Xem», bấm «Bản 2 · tải Excel» để lấy đúng khuôn cũ."],
        },
      ],
    },
    {
      ten: "⑤ Mẫu ngừng dùng",
      khoi: [
        {
          doan: ["Mẫu bỏ tích «Đang dùng» thành mẫu ngừng: không nộp được báo cáo theo mẫu đó, báo cáo cũ vẫn đọc được. Các mẫu này gom vào dòng «Mẫu ngừng dùng (N)» cuối bảng; bấm để mở hoặc co lại."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Nộp tệp Word bị chặn", "Từ 22/10/2026 chỉ nhận Excel. Tải mẫu Excel ở đây, chép nội dung sang tờ «Mẫu trắng», nộp lại."],
            ["Máy báo «không thấy cột …»", "Chữ ở hàng tên cột đã bị sửa hoặc xoá. Chép lại đúng chữ (xem tờ Hướng dẫn) hoặc tải mẫu mới rồi chép nội dung sang."],
            ["Máy báo «Tờ Mẫu trắng chưa ghi gì»", "Bạn điền vào tờ «Ví dụ đã điền». Chép sang tờ «Mẫu trắng»."],
            ["Máy báo «không còn dòng Mã mẫu»", "Dòng chữ đỏ «Mã mẫu: form-N» đầu tờ đã bị xoá; máy vẫn đoán mẫu theo tên chương. Lần sau tải lại mẫu."],
            ["Ô báo «Ngày chưa đúng dạng» khi gõ", "Ô ngày cần đủ 10 ký tự dd/mm/yyyy, vd 05/08/2026. Bấm «Có» vẫn giữ được chữ đã gõ, nhưng máy có thể đọc lệch."],
            ["Máy báo «ô công thức không còn kết quả»", "Tệp lưu từ phần mềm khác (Google Sheets, LibreOffice). Mở bằng Excel, lưu lại rồi nộp."],
            ["Một ô có nhiều việc", "Mỗi dòng bảng việc là MỘT việc; tách thành nhiều dòng."],
            ["Không thấy «Thêm mẫu mới», «Cập nhật»", "Bạn chưa có quyền «Quản lý mẫu báo cáo»; nút ẩn với người không có quyền."],
            ["Tệp .xls hoặc .csv không nộp được", "Mở bằng Excel, «Lưu thành» Excel Workbook (.xlsx)."],
          ],
        },
      ],
    },
  ],
  canCu: "Mr. Đại chốt 22/10/2026: báo cáo tuần nộp bằng .xlsx, mẫu ba tờ như biểu mẫu của agent Tiến độ, một tờ xếp dọc, bỏ «Tải mẫu có ví dụ»; báo cáo Word đã nộp vẫn đọc lại. Quyền «Quản lý mẫu báo cáo»; mỗi phiên bản mẫu được giữ lại.",
};
