// Hướng dẫn bản 2 (tab) — xuất câu trả lời của Trợ lý thành tệp: dải nút định dạng dưới ô nhập, dải «Xuất:» dưới mỗi câu trả lời, bước duyệt kế hoạch. Viết 20/10/2026 (nhóm A3).
// Căn cứ code: components/chat/DaiNutXuat.tsx (6 định dạng: docx, xlsx, pdf, md, html, pptx) · XuatTraLoi.tsx (5 định dạng: DOCX, XLSX chỉ khi có bảng, PDF, MD, HTML) · ChatPanel.tsx (khung kế hoạch chờ duyệt: «✅ Duyệt & tạo file …», «✏️ Sửa kế hoạch», «↩ Bỏ sửa», «✕ Bỏ»)
// · lib/tro-ly/xuat-theo-yeu-cau.ts:195,225 (AI lập kế hoạch và soạn nội dung tệp; dựng hỏng thì AI sửa tối đa 2 lần) · tệp xuất nằm thư mục riêng của người yêu cầu. Không ghi số của dự án thật.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Xuất tệp từ Trợ lý",
  ai: "Mọi người đã đăng nhập dùng được. Tệp xuất nằm trong thư mục riêng của người yêu cầu; người khác có đường dẫn cũng không tải được.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Xuất tệp là gì?",
          doan: [
            "Câu trả lời của Trợ lý nằm trong khung chat. Muốn đem đi dùng (gửi lãnh đạo, in, sửa tiếp) thì cần thành một tệp: Word, Excel, PDF, Markdown, HTML hoặc PowerPoint. Có hai cách có tệp: chọn định dạng TRƯỚC khi hỏi (dải nút dưới ô nhập), hoặc xuất SAU từ một câu trả lời đã có (dải «Xuất:» dưới câu trả lời).",
            "Với yêu cầu tạo tệp dài, Trợ lý có thể đưa KẾ HOẠCH trước (sẽ làm những gì) để bạn duyệt, rồi mới soạn tệp.",
          ],
        },
        {
          tieuDe: "② Vì sao phải có?",
          ds: [
            "Tệp là thứ bạn gửi, in, ký được; chữ trong khung chat thì không.",
            "Bước duyệt kế hoạch giúp bạn chặn sớm nếu AI hiểu sai ý, đỡ tốn công đọc cả tệp rồi mới thấy sai.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Bước", "Việc gì", "Vai trò của xuất tệp"],
            ["Trước", "Bạn hỏi và nhận câu trả lời, hoặc yêu cầu tạo tệp", "Cho ra nội dung"],
            ["Xuất tệp", "Chọn định dạng → (duyệt kế hoạch) → tải tệp", "Bạn đang xem"],
            ["Sau", "Đọc lại tệp, sửa tay nếu cần, rồi mới gửi đi", "Ngoài ứng dụng (Word, Excel…)"],
          ],
        },
        {
          tieuDe: "④ Có những phần nào?",
          bang: [
            ["Phần", "Ở đâu", "Làm gì"],
            ["Dải nút DOCX · XLSX · PDF · MD · HTML · PPTX", "Ngay dưới ô nhập", "Chọn định dạng cho câu hỏi KẾ TIẾP; bấm lần nữa để bỏ chọn"],
            ["Dải «Xuất:» DOCX · XLSX · PDF · MD · HTML", "Dưới mỗi câu trả lời", "Xuất đúng câu trả lời đó. XLSX chỉ hiện khi câu trả lời có bảng"],
            ["Khung kế hoạch chờ duyệt", "Dưới ô nhập, khi AI đưa kế hoạch", "Duyệt, sửa hoặc bỏ kế hoạch"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Chọn định dạng · đọc, sửa, duyệt kế hoạch · tải tệp · đọc lại tệp trước khi gửi đi", "Người quyết"],
            ["MÁY", "Dựng tệp thật (Word, Excel, PowerPoint…) từ nội dung · lưu vào thư mục riêng · đặt tên tệp theo ngày dd-mm-yyyy · xuất MD, HTML, DOCX, XLSX ngay từ câu trả lời có sẵn mà không cần AI", "Tệp mở được và đúng nội dung đã có"],
            ["🤖 AI", "🤖 Với yêu cầu tạo tệp mới: lập kế hoạch, rồi soạn nội dung tệp theo kế hoạch đã duyệt; nếu dựng hỏng thì sửa lại tối đa 2 lần", "🤖 Có thể thiếu hoặc sai; số liệu chỉ lấy từ hội thoại, thiếu thì ghi «Chưa có thông tin»"],
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          bam: [
            "Người chọn định dạng (hoặc nêu rõ trong câu hỏi, ví dụ «xuất ra Word»).",
            "🤖 AI hiểu yêu cầu; nếu phức tạp thì chỉ đưa kế hoạch, chưa soạn tệp.",
            "Người đọc kế hoạch, bấm «✅ Duyệt & tạo file …» (hoặc «✏️ Sửa kế hoạch» rồi duyệt, hoặc «✕ Bỏ»).",
            "🤖 AI soạn nội dung tệp theo kế hoạch đã duyệt; máy dựng tệp thật.",
            "Người tải tệp, đọc lại, rồi mới dùng.",
          ],
          ai: [
            "🤖 AI chỉ soạn nội dung dựa trên hội thoại và yêu cầu; không đi tìm tệp trên máy, không nói chuyện quyền truy cập.",
            "Thiếu số liệu cho mục nào thì ghi «Chưa có thông tin» ở mục đó, không bịa.",
            "Mất kết nối AI hoặc dựng hỏng 3 lần: Trợ lý báo không dựng được và nhờ bạn nói rõ hơn hoặc chọn định dạng khác.",
          ],
        },
      ],
    },
    {
      ten: "① Chọn định dạng trước",
      khoi: [
        {
          tieuDe: "Dải nút dưới ô nhập",
          bang: [
            ["Nút", "Cho ra"],
            ["DOCX", "Word — báo cáo, công văn, phiếu giao việc; sửa tiếp và trình ký"],
            ["XLSX", "Excel — bảng việc, số liệu, có màu và gộp ô"],
            ["PDF", "Bản in cố định. Máy chủ chưa có bộ in PDF thì ra trang in: nhấn Ctrl+P rồi chọn «Lưu dưới dạng PDF»"],
            ["MD", "Markdown — văn bản thuần, dán lại vào chat hay ghi chú"],
            ["HTML", "Trang web tự chạy, mở bằng trình duyệt, in được"],
            ["PPTX", "PowerPoint — slide giao ban, báo cáo lãnh đạo"],
          ],
          bam: [
            "Bấm một nút định dạng (nút sáng lên, bên cạnh hiện «→ câu hỏi tiếp theo sẽ xuất file …»).",
            "Gõ câu hỏi rồi gửi.",
          ],
          ketQua: ["Câu trả lời kèm đường tải tệp. Sau khi gửi, nút định dạng được bỏ chọn."],
          luuY: ["Không chọn nút nào thì AI vẫn tự hiểu nếu câu hỏi nói rõ («xuất ra Word», «làm tệp Excel»)."],
          viDu: ["Tình huống minh hoạ: bạn bấm nút XLSX rồi gõ «liệt kê các việc quá hạn của Phòng ĐT&PC, cột: mã việc, tên việc, người làm, hạn». Trợ lý trả tệp Excel có bảng đúng các cột đó."],
        },
      ],
    },
    {
      ten: "② Xuất sau từ câu trả lời",
      khoi: [
        {
          bam: [
            "Dưới câu trả lời tìm dòng «Xuất:».",
            "Bấm định dạng muốn (XLSX chỉ có khi câu trả lời có bảng).",
          ],
          ketQua: [
            "DOCX, XLSX, MD, HTML: trình duyệt tải về tệp tên theo ngày. Nút ghi «…» trong lúc làm.",
            "PDF: mở một cửa sổ trang in, bạn chọn «Lưu dưới dạng PDF». Nếu trình duyệt chặn cửa sổ, cho phép cửa sổ bật lên rồi bấm lại.",
          ],
          luuY: ["Cách này xuất đúng chữ của câu trả lời, không gọi AI viết lại."],
          viDu: ["Tình huống minh hoạ: Trợ lý vừa trả bảng tóm tắt báo cáo tuần. Bạn bấm «DOCX» ở dải «Xuất:» để gửi lãnh đạo, mở Word chỉnh lại vài câu rồi gửi."],
        },
      ],
    },
    {
      ten: "③ Duyệt kế hoạch",
      khoi: [
        {
          bam: [
            "Khi AI đưa kế hoạch, dưới ô nhập hiện khung với ba nút: «✅ Duyệt & tạo file …», «✏️ Sửa kế hoạch», «✕ Bỏ».",
            "Muốn chỉnh thì bấm «✏️ Sửa kế hoạch»: ô soạn hiện ra, sửa chữ rồi bấm «✅ Duyệt & tạo file …». Đổi ý thì «↩ Bỏ sửa».",
            "Bấm «✅ Duyệt & tạo file …» là chạy ngay, không có thêm bước xác nhận.",
          ],
          ketQua: ["AI soạn nội dung tệp theo kế hoạch đã duyệt và máy dựng tệp. Bấm «✕ Bỏ» thì không làm gì."],
          luuY: ["Tệp bạn kẹp (📎) vẫn được giữ trong lúc chờ duyệt kế hoạch."],
          viDu: ["Tình huống minh hoạ: bạn nhờ «làm slide giao ban tuần». AI đưa kế hoạch 5 slide. Bạn sửa kế hoạch thêm một slide «Rủi ro cần quyết» rồi duyệt. Tệp PPTX ra đúng 6 slide như kế hoạch đã sửa."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Không thấy nút XLSX ở dải «Xuất:»", "Câu trả lời không có bảng. Dùng dải nút dưới ô nhập và nhờ làm bảng."],
            ["PDF không tải về", "Đó là trang in. Nhấn Ctrl+P rồi «Lưu dưới dạng PDF». Cho phép trình duyệt mở cửa sổ mới."],
            ["Trợ lý báo không dựng được tệp", "Sau 3 lần thử vẫn lỗi. Nói rõ hơn nội dung cần xuất hoặc chọn định dạng khác."],
            ["Tệp hết hạn không tải được", "Tệp xuất chỉ giữ một thời gian. Bảo Trợ lý làm lại."],
            ["Người khác không mở được đường tải của tôi", "Đúng: tệp nằm trong thư mục riêng của người yêu cầu. Tải về rồi gửi tệp cho họ."],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt của Mr. Đại 05/09/2026 (dải nút định dạng xuất; kế hoạch chờ duyệt một bấm là chạy) · phân vai AI: AI soạn, người duyệt.",
};
