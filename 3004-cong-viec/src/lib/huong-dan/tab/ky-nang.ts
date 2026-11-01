// Hướng dẫn bản 2 (tab) — trang «Skill AI của tôi» (/ky-nang). Viết 20/10/2026. Nhãn chép từ app/ky-nang/page.tsx và components/ky-nang/SkillView.tsx.
// Đối chiếu code 20/10: ai đăng nhập cũng thêm được kỹ năng RIÊNG; kho CHUNG cần quyền «ky_nang.them_chung» (nút «chung — cả công ty» bị mờ khi thiếu quyền, đúng ý: người dùng thấy đường nhưng chưa bấm được);
// nút «Xoá» ẩn với kỹ năng hệ thống và với kỹ năng chung khi không có quyền; thẻ kết nối AI chỉ người có «cau_hinh.sua»; nút «Khóa cho agent đọc sổ cái» chỉ người có «agent.cap_khoa».
// Không có nút «Sửa» riêng: muốn sửa thì «Xem» → chép nội dung → dán vào ô viết → lưu cùng tên (cùng tên = ghi đè). Chỗ AI thật: nút «🤖 Nhờ AI sắp lại» (api/skill/route.ts dòng 126).
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Skill AI của tôi — dạy trợ lý thêm việc mới",
  ai: "Ai đăng nhập cũng xem kỹ năng và thêm, xoá kỹ năng RIÊNG của mình. Kho CHUNG cần quyền «Thêm kỹ năng AI vào kho chung»: người không có quyền thấy nút «chung — cả công ty» bị mờ khi chọn kho, và không thấy nút «Xoá» ở kỹ năng chung. Khối kết nối AI ở cuối trang chỉ người có quyền sửa cài đặt thấy; nút «Khóa cho agent đọc sổ cái» ở đầu trang chỉ người có quyền cấp khoá thấy.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Màn này là gì",
          doan: [
            "Mỗi việc Trợ lý AI làm được là một «kỹ năng» (skill): một bản hướng dẫn viết sẵn nói rõ làm việc gì, đọc dữ liệu nào, trả lời theo khuôn nào. Gọi kỹ năng thì AI làm đúng việc đó, không phải đoán ý.",
            "Trang này là nơi xem các kỹ năng đang có, thêm kỹ năng mới (nạp tệp .skill hoặc tự viết) và xoá kỹ năng của mình. Có ba kho: HỆ THỐNG (cài sẵn, không xoá được), CHUNG (cả công ty dùng, cần quyền để thêm), RIÊNG (chỉ mình bạn thấy).",
          ],
        },
        {
          tieuDe: "② Vì sao cần",
          ds: [
            "Việc lặp đi lặp lại (tóm tắt một báo cáo, soát một tệp Word, hỏi sổ cái theo cách riêng của phòng) viết một lần thành kỹ năng, lần sau chỉ gõ tên.",
            "Kỹ năng riêng cho phép mỗi người tự chế công cụ mà không ảnh hưởng ai; kỹ năng chung là cách chia sẻ cách làm tốt cho cả công ty.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Chặng", "Làm gì", "Vai trò của trang"],
            ["Trước", "Bạn thấy mình hay nhờ AI cùng một việc", "Ý tưởng cho kỹ năng"],
            ["Trang này", "Thêm hoặc chọn kỹ năng", "Nơi quản lý"],
            ["Sau", "Mở khung chat (nút ✨ góc dưới), gõ / rồi chọn tên kỹ năng, hoặc bấm «▶ Chạy» ở dòng kỹ năng", "AI làm theo đúng kỹ năng"],
          ],
        },
        {
          tieuDe: "④ Các khối trên màn",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Khung viền cam «Cách dùng kỹ năng trong khung chat»", "Dạy cách gọi kỹ năng và liệt kê sáu kỹ năng hệ thống", "① Dùng kỹ năng"],
            ["Nút «Khóa cho agent đọc sổ cái» (đầu trang)", "Sang trang cấp khoá cho agent khác", "Hướng dẫn «Khóa cho agent»"],
            ["Khối «Nạp kỹ năng từ file .skill» và khối «Viết hướng dẫn ngay trên web / nhờ AI sắp lại»", "Thêm kỹ năng mới", "② Thêm kỹ năng · hướng dẫn riêng"],
            ["Bảng «Kỹ năng đang có» (cột «Kỹ năng», «Phạm vi», «Mô tả»)", "Danh sách, chạy, xem, tải, xoá", "③ Bảng kỹ năng"],
            ["Khối «📐 Nguyên tắc kỹ năng»", "Ghi chú kỹ thuật", "—"],
            ["Thẻ «Kết nối AI» và «Văn phong trả lời» (cuối trang)", "Cấu hình AI chung cho cả công ty", "Hướng dẫn «Kết nối AI và văn phong»"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì ở trang này"],
            ["Người", "Chọn kho, nạp tệp hoặc viết nội dung, lưu, xem, tải, xoá."],
            ["Máy", "Kiểm tệp nạp lên (khoảng tối đa 20 MB, 200 tệp, chặn đường dẫn thoát ra ngoài), kiểm khuôn kỹ năng có tên và mô tả, lưu, ghi lịch sử, phân quyền kho."],
            ["🤖 AI", "🤖 Khi bạn bấm «🤖 Nhờ AI sắp lại»: AI sắp chữ thô thành khuôn kỹ năng chuẩn. Khi gọi kỹ năng trong khung chat: AI làm theo hướng dẫn kỹ năng."],
          ],
          ai: [
            "🤖 AI nhận: đoạn chữ thô bạn dán (từ 10 đến 30.000 ký tự).",
            "🤖 AI làm: viết lại thành khuôn có tên không dấu nối bằng gạch ngang, mô tả 2–4 dòng và nội dung chia mục; giữ đúng ý bạn, tiếng Việt.",
            "🤖 AI KHÔNG được: bịa thông tin chuyên môn; tự lưu.",
            "🤖 Người kiểm: kết quả hiện lại trong ô viết, bạn đọc, sửa, rồi mới bấm «Lưu kỹ năng». AI lỗi hoặc trả sai khuôn thì có dòng đỏ, ô viết giữ nguyên chữ của bạn; bạn tự viết khuôn bằng tay.",
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          bam: [
            "NGƯỜI: dán chữ thô vào ô viết, bấm «🤖 Nhờ AI sắp lại».",
            "🤖 AI: trả về bản đã sắp theo khuôn.",
            "NGƯỜI: đọc, sửa, chọn kho, bấm «Lưu kỹ năng».",
            "MÁY: kiểm khuôn, lưu, ghi lịch sử, kỹ năng dùng được ngay.",
            "NGƯỜI: gõ / trong khung chat để gọi; 🤖 AI làm theo hướng dẫn kỹ năng.",
          ],
        },
        {
          tieuDe: "Các hướng dẫn riêng cho khối nhỏ",
          ds: [
            "Hai khối thêm kỹ năng: «Thêm kỹ năng: nạp tệp .skill hoặc viết trên web».",
            "Thẻ cấu hình AI cuối trang: «Kết nối AI và văn phong trả lời trên trang Skill».",
          ],
        },
      ],
    },
    {
      ten: "① Dùng kỹ năng",
      khoi: [
        {
          doan: ["Có hai cách gọi: gõ đích danh, hoặc để trợ lý tự chọn."],
        },
        {
          bam: [
            "Mở khung chat (nút ✨ góc dưới màn).",
            "Gõ / rồi tên kỹ năng, một khoảng trắng, rồi câu hỏi. Chỉ gõ / là hiện danh sách để chọn.",
            "Hoặc ở bảng «Kỹ năng đang có», bấm «▶ Chạy»: khung chat mở sẵn với tên kỹ năng điền vào.",
            "Không gõ lệnh thì trợ lý tự chọn kỹ năng hợp với câu hỏi theo phần mô tả; gõ đích danh là ÉP dùng đúng kỹ năng đó.",
          ],
        },
        {
          tieuDe: "Sáu kỹ năng hệ thống",
          bang: [
            ["Kỹ năng", "Làm gì"],
            ["/lam-bao-cao", "Làm báo cáo tuần hoặc tháng của đơn vị mình từ báo cáo kỳ trước, hỏi chỗ thiếu, ra tệp Word đúng mẫu kèm nút Nộp"],
            ["/tong-hop-bao-cao", "Như trên nhưng gộp thêm báo cáo các đơn vị dưới đã nộp"],
            ["/hoi-so-cai", "Hỏi việc trong sổ cái"],
            ["/tom-tat", "Tóm tắt một báo cáo (kẹp tệp hoặc nói tên)"],
            ["/trich-cong-viec", "Trích bảng việc từ một báo cáo"],
            ["/kiem-tra-mau", "Soát một tệp Word như lúc nộp, chỉ lỗi và cách sửa"],
          ],
        },
        {
          viDu: [
            "Tình huống: bạn gõ «/hoi-so-cai việc nào của phòng mình sắp trễ?» vào khung chat. 🤖 AI tra sổ cái bằng công cụ có sẵn rồi trả lời kèm mã và tên việc.",
            "Tình huống: bạn kẹp một tệp Word vào ô chat và gõ «/kiem-tra-mau». 🤖 AI soát tệp như lúc nộp và liệt kê chỗ sai.",
          ],
        },
        {
          luuY: [
            "Gõ có dấu hay không dấu đều được; chỗ nào AI không chắc thì nó hỏi lại một câu.",
            "Muốn có tệp Excel, Word hay slide: thêm chữ «ra excel / ra word / làm slide» vào câu hỏi; AI tra số liệu thật trước rồi dựng tệp, đường tải nằm trong câu trả lời.",
            "Khi hệ thống dùng khoá API thay vì gói thuê bao, kỹ năng không tự kích hoạt: phải gõ đích danh /tên-kỹ-năng.",
          ],
        },
      ],
    },
    {
      ten: "② Thêm kỹ năng",
      khoi: [
        {
          doan: [
            "Có hai khối cạnh nhau (xếp dọc trên màn hẹp): nạp tệp có sẵn, hoặc tự viết. Cả hai có hai nút chọn kho: «riêng — của tôi» và «chung — cả công ty». Chọn «chung» cần quyền; nếu không có, nút này mờ và rê chuột báo cần quyền «Thêm kỹ năng AI vào kho chung».",
            "Chi tiết từng cách nằm ở hướng dẫn «Thêm kỹ năng: nạp tệp .skill hoặc viết trên web» (bấm «? Hướng dẫn» khi đang ở khối đó, hoặc chọn ở hàng chọn đầu khung hướng dẫn).",
          ],
        },
        {
          bang: [
            ["Cách", "Khi nào dùng"],
            ["Nạp tệp .skill / .zip", "Đã có sẵn kỹ năng đóng gói (do đồng nghiệp hay nơi khác soạn)"],
            ["Viết trên web", "Tự soạn, hoặc dán chữ thô"],
            ["🤖 Nhờ AI sắp lại", "Có chữ thô chưa đúng khuôn"],
          ],
        },
        {
          viDu: ["Tình huống: trưởng phòng có sẵn quy trình soát hồ sơ nghiệm thu viết trong Word. Dán vào ô viết, bấm «🤖 Nhờ AI sắp lại», đọc, chọn kho «riêng — của tôi», bấm «Lưu kỹ năng». Thấy chạy tốt mới đề nghị người có quyền đưa vào kho chung."],
        },
      ],
    },
    {
      ten: "③ Bảng kỹ năng",
      khoi: [
        {
          doan: ["Bảng «Kỹ năng đang có» ghi số kỹ năng bạn thấy (hệ thống + chung + riêng của bạn), 30 dòng một trang."],
        },
        {
          bang: [
            ["Phần", "Nghĩa"],
            ["Cột «Kỹ năng»", "Tên gọi dạng /tên; kỹ năng hệ thống ghi thêm «hệ thống — không xoá được»"],
            ["Cột «Phạm vi»", "hệ thống · chung — cả công ty · riêng — của tôi"],
            ["Cột «Mô tả»", "Một đoạn nói kỹ năng làm gì, khi nào nên dùng"],
            ["«▶ Chạy»", "Mở khung chat với kỹ năng điền sẵn"],
            ["«Xem» / «Thu»", "Mở hoặc thu gọn nguyên văn hướng dẫn của kỹ năng ngay dưới dòng"],
            ["«⬇ .skill»", "Tải kỹ năng về thành tệp .skill để chia sẻ hoặc sao lưu"],
            ["«Xoá»", "Xoá kỹ năng. Chỉ hiện với kỹ năng riêng của bạn, và kỹ năng chung nếu bạn có quyền thêm kỹ năng chung; kỹ năng hệ thống không có nút này"],
          ],
        },
        {
          tieuDe: "Sửa một kỹ năng",
          bam: [
            "Bấm «Xem» ở dòng kỹ năng để thấy nguyên văn.",
            "Chọn và chép nội dung, dán vào ô viết ở khối «Viết hướng dẫn ngay trên web».",
            "Sửa, chọn đúng kho (riêng hay chung), bấm «Lưu kỹ năng». Cùng tên thì ghi đè kỹ năng cũ.",
          ],
        },
        {
          viDu: ["Tình huống: bạn muốn kỹ năng /tom-tat trả lời ngắn hơn. Kỹ năng hệ thống không sửa trực tiếp được; bạn «Xem», chép, đổi tên thành /tom-tat-ngan, sửa nội dung, lưu vào kho riêng. Kỹ năng mới chỉ mình bạn dùng."],
        },
        {
          luuY: [
            "Mỗi lần thêm hoặc xoá kỹ năng đều được ghi vào Lịch sử (loại «Kỹ năng AI»).",
            "Không xoá được kỹ năng hệ thống; kỹ năng chung chỉ xoá được khi có quyền.",
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
            ["Nút «chung — cả công ty» mờ", "Bạn chưa có quyền «Thêm kỹ năng AI vào kho chung»; thêm vào kho riêng, hoặc nhờ người có quyền."],
            ["Không thấy nút «Xoá» ở một dòng", "Kỹ năng hệ thống không xoá được; kỹ năng chung thì cần quyền kho chung."],
            ["Báo chưa chọn tệp hoặc tệp quá lớn", "Chọn tệp .skill hoặc .zip, tối đa khoảng 20 MB."],
            ["Báo thiếu khai báo name hoặc description", "Đầu nội dung phải có khối khai báo tên và mô tả; dùng «🤖 Nhờ AI sắp lại» để dựng khuôn."],
            ["Gõ /tên mà trợ lý không chạy kỹ năng", "Kiểm tên đúng chưa (bấm / để hiện danh sách) và kỹ năng có ở bảng không."],
            ["Bảng trống, ghi kỹ năng hệ thống sẽ tự cài", "Máy chủ chưa đọc được thư mục kỹ năng hệ thống; báo người phụ trách hệ thống."],
            ["Không thấy thẻ «Kết nối AI»", "Thẻ đó chỉ người có quyền sửa cài đặt thấy."],
          ],
        },
      ],
    },
  ],
  canCu: "Màn Skill AI dùng chung với các agent SCI; ba kho hệ thống, chung, riêng; kho chung cần quyền «Thêm kỹ năng AI vào kho chung»; nạp tệp có giới hạn 20 MB và 200 tệp; mỗi lần thêm hoặc xoá đều ghi lịch sử.",
};
