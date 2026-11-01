// Hướng dẫn bản 2 (tab) — Trợ lý SCI công việc (khung chat nổi + cửa sổ riêng /chat). Viết lại 20/10/2026 (nhóm A3) theo mẫu agent Nghiệm thu + luật chữ AI.
// Căn cứ code: components/chat/ChatWidget.tsx (bong bóng, neo/nổi, Ctrl+K; mặc định neo mép TRÁI) · ChatPanel.tsx (cột phiên, ô nhập, 📎, 🌐, kế hoạch duyệt, dải xuất) · chip chọn bản AI · DaiNutXuat.tsx · XuatTraLoi.tsx
// · lib/ai/chat-agent.ts:424 (AI trả lời, tối đa CHAT_MAX_ROUNDS = 3 vòng, 270 giây) · lib/ai/chat-types.ts (14 công cụ chỉ đọc) · lib/tro-ly/xuat-theo-yeu-cau.ts:195,225 (AI soạn tệp)
// · lib/tro-ly/lam-bao-cao.ts:293,712 (AI chọn đơn vị, AI đọc lời kể) · lib/tro-ly/dinh-kem-chung.ts (TRAN_SO_TEP = 3). Cửa sổ /chat toàn màn hình không có thanh trên.
// Hướng dẫn con: tro-ly-chat-ky-nang · tro-ly-chat-ban-ai · tro-ly-chat-xuat. Không ghi số của dự án thật.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Trợ lý SCI công việc — hỏi đáp, soạn báo cáo, xuất tệp",
  ai: "Mọi người đã đăng nhập agent Công việc đều dùng được (kể cả vai Người xem). Trợ lý chỉ thấy dữ liệu bạn được xem và chỉ ĐỌC, không ghi gì vào sổ.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Trợ lý là gì?",
          doan: [
            "🤖 Trợ lý SCI công việc là một AI trò chuyện bằng tiếng Việt. Bạn gõ câu hỏi thường như nhắn tin; AI tra sổ cái công việc, thư mục tài liệu, lịch sử, tình hình nộp báo cáo rồi trả lời. Nó còn làm được: soạn báo cáo tuần đúng mẫu Word, tóm tắt tài liệu, kiểm tra báo cáo trước khi nộp, xuất câu trả lời thành tệp.",
            "Mọi chữ trong câu trả lời là chữ do AI viết. AI có thể nhầm: câu trả lời về việc nào luôn nên đối chiếu bằng cách mở việc đó ở Sơ đồ tổ chức.",
          ],
        },
        {
          tieuDe: "② Vì sao dùng?",
          ds: [
            "Hỏi nhanh thay vì đi tìm: «Việc nào sắp trễ hạn?», «Phòng ĐT&PC còn mấy việc mở?», «Hướng Việt đang vướng ở đâu?» (đây cũng là các câu gợi ý mặc định).",
            "Làm báo cáo tuần không phải gõ lại từ đầu: AI lấy báo cáo kỳ trước của đơn vị, mang việc chưa xong sang, bạn chỉ kể kỳ này làm gì.",
            "Kiểm báo cáo trước khi nộp: AI chỉ ra mục trống, số liệu mâu thuẫn, thiếu hạn.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Bước", "Việc gì", "Vai trò của Trợ lý"],
            ["Trước", "Dữ liệu đã nằm trong sổ cái, thư mục tài liệu, lịch sử", "Nguồn để AI tra"],
            ["Trợ lý", "Hỏi đáp · làm báo cáo · kiểm mẫu · xuất tệp", "Khung chat bạn đang xem"],
            ["Sau", "Bạn dùng câu trả lời để mở việc ở Sơ đồ tổ chức, nộp báo cáo ở «Báo cáo» (nút «Nộp báo cáo này»), hoặc gửi tệp xuất cho người khác", "Các màn làm việc thường"],
          ],
        },
        {
          tieuDe: "④ Khung chat có những khối nào?",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Bong bóng góc phải dưới; thanh tiêu đề với các nút vị trí khung", "Mở, đóng, đổi chỗ khung", "① Mở và bố trí khung"],
            ["Ô nhập, nút «Gửi (Enter)», 📎 «Kẹp file», 🌐 «Tìm trên internet»", "Hỏi, kẹp tệp, cho ra internet", "② Hỏi và đọc trả lời"],
            ["Cột trái «Phiên làm việc»", "Xem lại các cuộc trò chuyện cũ", "⑤ Phiên làm việc"],
            ["Chip tên bản AI và vòng tròn ngữ cảnh trên thanh tiêu đề", "Chọn bản AI, biết phiên dài đến đâu", "Hướng dẫn «Chọn bản AI và vòng ngữ cảnh»"],
            ["Ô xổ khi gõ /", "Gọi kỹ năng đích danh", "Hướng dẫn «Gọi kỹ năng bằng dấu /»"],
            ["Dải nút DOCX · XLSX · PDF · MD · HTML · PPTX và «Xuất:» dưới câu trả lời", "Xuất thành tệp", "Hướng dẫn «Xuất tệp từ Trợ lý»"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Gõ câu hỏi · kẹp tệp · bật 🌐 khi cần · chọn định dạng xuất · duyệt kế hoạch tạo tệp · bấm tải tệp · quyết dùng câu trả lời vào việc gì", "Người quyết"],
            ["MÁY", "Tra dữ liệu thật bằng 14 công cụ chỉ đọc (thư mục, sổ cái, lịch sử, tình hình nộp báo cáo, mẫu Word, mở trang) · đọc nội dung tệp kẹp · kiểm mẫu Word · dựng tệp Word, Excel, PowerPoint… · lưu phiên · chặn mọi thao tác ghi", "Số liệu trong câu trả lời đi từ công cụ, không bịa"],
            ["🤖 AI", "🤖 Hiểu câu hỏi, chọn công cụ tra, đọc kết quả, viết câu trả lời; soạn nội dung tệp xuất; đọc lời kể để cập nhật báo cáo", "🤖 Có thể sai hoặc hiểu nhầm; luôn đối chiếu nguồn khi việc quan trọng"],
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          bam: [
            "Người gõ câu hỏi (hoặc bấm một câu gợi ý) và bấm gửi.",
            "🤖 AI đọc câu hỏi, chọn công cụ cần tra (tối đa 5 công cụ một vòng, tối đa 3 vòng).",
            "Máy chạy công cụ chỉ đọc và trả dữ liệu thật về cho AI.",
            "🤖 AI viết câu trả lời dựa trên dữ liệu đó. Dưới câu trả lời hiện các chip công cụ đã dùng (✓ hoặc ✗) và dải «Xuất:».",
            "Người đối chiếu nguồn nếu việc quan trọng, rồi dùng câu trả lời hoặc xuất ra tệp.",
          ],
          ai: [
            "🤖 Mỗi lượt tối đa khoảng 270 giây; quá thì dừng và báo.",
            "🤖 AI KHÔNG tự giao việc, không tự sửa việc, không tự nộp báo cáo. Công cụ của trợ lý chỉ đọc và mở trang.",
            "🤖 Câu trả lời tuân theo quy tắc bảo mật của công ty: thông tin nào bạn không được xem thì AI cũng không đưa.",
            "Mất kết nối AI: khung báo lỗi ngay trong cuộc trò chuyện; thử lại sau ít phút hoặc làm tay ở các màn thường.",
          ],
        },
      ],
    },
    {
      ten: "① Mở và bố trí khung",
      khoi: [
        {
          tieuDe: "Mở trợ lý",
          bang: [
            ["Cách", "Làm gì"],
            ["Bong bóng góc phải dưới", "Bấm «Mở Trợ lý SCI công việc» (hoặc bấm Ctrl+K). Bấm Ctrl+K lần nữa để tắt"],
            ["Nút «Thu gọn» / «Đóng» trên thanh tiêu đề", "Thu nhỏ hoặc đóng khung, về lại bong bóng. Thu gọn khi đang neo thì còn dải mảnh dính mép, bấm để bung lại"],
            ["Nút mở cửa sổ riêng", "Tách trợ lý thành cửa sổ riêng, kéo sang màn hình thứ hai. Muốn quay lại bấm «Đưa về ứng dụng»"],
            ["Ba nút vị trí: «Neo cột trái (chia đôi màn hình)», «Khung nổi tự do (kéo thả được)», «Neo cột phải»", "Chọn cách đặt khung"],
            ["Nút «Về khung nhỏ góc phải dưới (mặc định)»", "Ép về khung nổi nhỏ góc phải dưới"],
          ],
          luuY: [
            "Lần đầu mở, khung neo ở mép TRÁI chia đôi màn hình (rộng khoảng 420 điểm ảnh, có thể kéo mép để đổi). Sau đó máy nhớ cách bạn đặt.",
            "Khung nổi kéo bằng thanh tiêu đề; kéo vào sát mép trái hoặc phải thì khung tự neo; kéo ra khỏi mép thì tự gỡ neo. Kéo bốn mép, bốn góc để đổi kích thước.",
            "Màn hình hẹp (điện thoại): khung gọn lại và cột phiên ẩn vào nút ở đầu thanh tiêu đề.",
          ],
          viDu: ["Tình huống minh hoạ: bạn đang xem Sơ đồ tổ chức và cần hỏi nhanh. Bấm Ctrl+K, khung hiện bên trái chia đôi màn hình. Hỏi xong bấm Ctrl+K để tắt, màn Sơ đồ trở lại đầy đủ."],
        },
        {
          tieuDe: "Cửa sổ riêng (trang /chat)",
          doan: ["Cùng Trợ lý nhưng toàn màn hình, không có thanh trên. Nút «Đưa về ứng dụng» ở thanh tiêu đề đóng cửa sổ này và mở lại khung ngay trong ứng dụng, đúng cuộc trò chuyện đang xem."],
        },
      ],
    },
    {
      ten: "② Hỏi và đọc trả lời",
      khoi: [
        {
          tieuDe: "Hỏi",
          bam: [
            "Gõ câu hỏi vào ô nhập («Hỏi về tài liệu, sổ cái… gõ / để gọi kỹ năng») hoặc bấm một câu gợi ý ở màn trống.",
            "Bấm nút gửi hoặc Enter. Xuống dòng bằng Shift+Enter.",
            "Chờ AI trả lời: màn ghi «Đang xử lý… (đọc tài liệu, sổ cái có thể mất một lúc)».",
            "Đọc câu trả lời. Chip dưới câu trả lời cho biết AI đã dùng công cụ nào (✓ chạy được, ✗ lỗi). Nếu có chip «→ mở trang …» thì bấm để sang đúng màn.",
          ],
          ketQua: ["Câu trả lời hiện kèm giờ. Mỗi câu trả lời có dải «Xuất:» để lưu thành tệp (hướng dẫn «Xuất tệp từ Trợ lý»)."],
          luuY: ["Hỏi hẹp (nêu tên đơn vị, tên dự án, khoảng tuần) thì nhanh và đúng hơn hỏi chung chung."],
          viDu: ["Tình huống minh hoạ: bạn gõ «Việc nào sắp trễ hạn của Phòng ĐT&PC?». AI tra danh sách việc của đơn vị rồi liệt kê, ghi mã kèm tên việc. Bạn bấm chip «→ mở trang Sơ đồ tổ chức» để xem tận nơi."],
        },
        {
          tieuDe: "Hai nút ngay cạnh ô nhập",
          bang: [
            ["Nút", "Làm gì"],
            ["📎 «Kẹp file»", "Kẹp tối đa 3 tệp (docx, xlsx, xls, csv, txt, md, json, pptx) cho trợ lý đọc. Mỗi tệp hiện một dòng: tên, «đọc được N ký tự», có bị cắt cuối không; tệp Word theo mẫu thì có kết quả «đạt kiểm tra» hoặc số lỗi chặn gửi. Tệp chỉ dùng cho MỘT lượt hỏi và KHÔNG lưu vào thư mục. Kẹp mà chưa gõ gì thì gửi được: trợ lý tự tóm tắt và liệt kê việc"],
            ["🌐 «Tìm trên internet»", "MẶC ĐỊNH TẮT (xám): trợ lý chỉ dùng dữ liệu trong hệ thống. Bấm bật (cam) thì được ra ngoài tra quy định mới, văn bản pháp luật, tin tức; câu trả lời luôn kèm địa chỉ trang. Bấm lần nữa để tắt"],
          ],
          luuY: ["Nội dung ngoài internet không nên lẫn vào số liệu dự án, nên chỉ bật khi bạn thật sự cần tra ngoài."],
        },
      ],
    },
    {
      ten: "③ Hỏi gì được",
      khoi: [
        {
          tieuDe: "Công cụ trợ lý dùng (chỉ đọc)",
          bang: [
            ["Nhóm", "Trợ lý tra được", "Ví dụ câu hỏi"],
            ["Sổ cái việc", "Danh sách việc, việc của một đơn vị hoặc một người, chi tiết một việc", "«Việc nào sắp trễ hạn?», «Việc của tôi?»"],
            ["Lịch sử", "Việc đã xong, dòng thời gian của một đối tượng, tìm trong lịch sử", "«Tuần trước đơn vị X xong những gì?»"],
            ["Thư mục tài liệu", "Cây thư mục, liệt kê, đọc nội dung tài liệu", "«Tóm tắt báo cáo tuần mới nhất của SCI E&C»"],
            ["Báo cáo", "Tình hình nộp báo cáo tuần của các đơn vị", "«Đơn vị nào chưa nộp báo cáo tuần này?»"],
            ["Mẫu báo cáo", "Danh sách mẫu Form 0–11, kiểm tra một tệp theo mẫu", "«Tệp này gửi được chưa?»"],
            ["Mở trang", "Mở đúng màn trong phần mềm", "«Cho tôi xem Sơ đồ tổ chức»"],
            ["Internet", "Chỉ khi bạn bật 🌐 «Tìm trên internet»", "«Nghị định mới nhất về …»"],
          ],
          luuY: [
            "Trợ lý không có công cụ ghi: nói «tạo việc này giúp tôi» thì nó trả lời sẽ KHÔNG tự chạy và chỉ đường để bạn làm ở màn tương ứng.",
            "Kỹ năng gõ / xem hướng dẫn «Gọi kỹ năng bằng dấu /».",
          ],
          viDu: ["Tình huống minh hoạ: bạn gõ «tạo giúp tôi việc nộp hồ sơ cho Phòng Kỹ thuật». Trợ lý trả lời là nó chỉ đọc, không tự tạo việc, và chỉ bạn cách vào Sơ đồ tổ chức bấm dấu ＋ ở ô Phòng Kỹ thuật để giao. Còn câu «Phòng Kỹ thuật đang có mấy việc mở?» thì nó trả lời được ngay bằng cách tra sổ cái."],
        },
      ],
    },
    {
      ten: "④ Làm báo cáo",
      khoi: [
        {
          tieuDe: "Luồng /lam-bao-cao",
          bam: [
            "Gõ «/lam-bao-cao» hoặc «làm báo cáo tuần này giúp tôi».",
            "MÁY biết đơn vị của bạn, mẫu Word của đơn vị và kỳ báo cáo; tự lấy báo cáo kỳ trước đơn vị đã nộp. Bảng «Kết quả và kế hoạch việc» kỳ trước thành việc kỳ này (bỏ việc đã xong); các bảng khác chép nguyên.",
            "Bạn kể bằng lời kỳ này làm được gì, tình hình ra sao, có việc mới nào.",
            "MÁY soát đủ thông tin; thiếu thì trợ lý hỏi lại (ví dụ ngày kết thúc, kết quả cần có).",
            "Đủ thì trợ lý điền mẫu Word hiện hành, chạy đúng bộ kiểm tra lúc nộp (không ghi gì) và trả tệp .docx kèm nút «Nộp báo cáo này».",
            "Bấm «Nộp báo cáo này»: màn Báo cáo mở và nạp sẵn tệp, bạn đi tiếp 5 bước như thường.",
          ],
          ai: [
            "🤖 AI chọn đơn vị mà câu của bạn nhắc tới khi máy không tự khớp được (ví dụ gọi tắt, gọi theo tên nhà máy), rồi đọc lời kể của bạn và cập nhật từng dòng việc kèm lý do. AI không đặt ngày, dự án hay kết quả mà bạn chưa nói; thiếu thì máy hỏi.",
            "Người kiểm: đọc tệp Word trước khi nộp. Tệp Trợ lý làm chỉ giữ 7 ngày.",
          ],
          luuY: ["Trợ lý KHÔNG tự nộp. Chỉ cú bấm «Gửi» của bạn ở màn Báo cáo mới gửi."],
          viDu: ["Tình huống minh hoạ: bạn gõ «/lam-bao-cao». Trợ lý báo «đơn vị của bạn là Phòng Kỹ thuật, kỳ tuần này», đưa danh sách việc mang sang từ báo cáo kỳ trước. Bạn kể: «Hạng mục móng đã đổ xong phần A, phần B dời sang tuần sau vì mưa». Trợ lý hỏi lại ngày kết thúc phần B. Bạn trả lời, nhận tệp .docx và bấm «Nộp báo cáo này»."],
        },
      ],
    },
    {
      ten: "⑤ Phiên làm việc",
      khoi: [
        {
          tieuDe: "Cột trái «Phiên làm việc»",
          bang: [
            ["Thao tác", "Làm gì"],
            ["«Cuộc trò chuyện mới»", "Dọn màn hình để hỏi chuyện khác. Phiên chỉ được lưu khi bạn gửi tin đầu tiên"],
            ["Bấm tên một phiên", "Mở lại cuộc trò chuyện cũ (nhóm theo ngày)"],
            ["Dấu ⋯ «Tùy chọn phiên» → «Đổi tên» / «Xóa»", "Đổi tên (hoặc bấm đúp tên phiên trên thanh tiêu đề). Xóa thì hiện «Xóa phiên này?» với dấu ✓ «Xác nhận xóa phiên» và ✗ «Hủy»"],
            ["Nút ẩn/hiện danh sách phiên ở đầu thanh tiêu đề", "Gọn khung chat khi cần chỗ"],
          ],
          luuY: [
            "Phiên chỉ của riêng bạn; người khác không thấy.",
            "Quá 100 phiên thì màn chỉ NHẮC nên dọn bớt, máy không tự xoá phiên nào.",
            "Phiên càng dài, vòng ngữ cảnh càng gần đỏ: nên mở cuộc trò chuyện mới (hướng dẫn «Chọn bản AI và vòng ngữ cảnh»).",
          ],
          viDu: ["Tình huống minh hoạ: tuần trước bạn nhờ tóm tắt một báo cáo. Hôm nay mở bong bóng, tìm phiên trong nhóm ngày hôm đó, bấm vào là đọc lại được toàn bộ câu trả lời, vẫn xuất được thành tệp."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Trợ lý trả lời chậm", "Mỗi câu có thể mất từ vài giây tới vài phút khi cần tra nhiều chỗ. Giới hạn khoảng 270 giây; hỏi hẹp lại sẽ nhanh hơn."],
            ["Trợ lý nói sẽ KHÔNG tự chạy việc ghi", "Công cụ ghi dữ liệu luôn bị chặn. Làm việc đó ở màn tương ứng bằng tay."],
            ["Câu trả lời sai hoặc thiếu", "AI có thể nhầm. Mở việc hoặc tài liệu nguồn để đối chiếu, rồi hỏi lại cụ thể hơn."],
            ["Không có thông tin mới nhất ngoài hệ thống", "Bật 🌐 «Tìm trên internet» (mặc định tắt)."],
            ["Tệp Trợ lý làm đã hết hạn", "Chỉ giữ 7 ngày. Gõ «làm lại giúp tôi tệp báo cáo» trong phiên chat."],
            ["Không thấy khung chat", "Bấm Ctrl+K, hoặc bấm bong bóng góc phải dưới. Ở trang đăng nhập và trang /chat toàn màn hình thì không có bong bóng."],
            ["Kẹp được ít tệp hơn muốn", "Mỗi lượt tối đa 3 tệp; tệp quá lớn hoặc quá dài bị cắt cuối (màn ghi rõ)."],
          ],
        },
      ],
    },
  ],
  canCu: "Phân vai AI của dự án: AI chỉ đọc chữ để phân loại hoặc viết lời từ số liệu, không ước số; mọi thao tác ghi do người bấm · luật 19 (🤖 đứng trước nội dung do AI sinh ra) · luật 30 (mã kèm tên) · chốt 18/10/2026 (nhắc dọn phiên khi quá 100).",
};
