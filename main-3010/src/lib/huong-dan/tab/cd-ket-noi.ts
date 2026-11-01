// Hướng dẫn bản 2 (tab) — Cài đặt → tab «🔌 Kết nối». Viết 20/10/2026 theo mẫu Nghiệm thu + luật chữ AI (Mr. Đại).
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Cài đặt — Kết nối",
  ai: "PM và Admin (quyền Cài đặt). Người dùng và Người xem không vào được Cài đặt.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Tab này là gì?",
          doan: [
            "Nơi nối hệ với bên ngoài và nối các agent với nhau: kho Google Drive, AI, hai tài khoản Claude của công ty, bot Telegram, danh bạ agent, bảng «Ai được gọi ai», và thời gian giữ sổ hỏi–đáp. Main là bản gốc; bốn agent kia kéo các khai báo này về và chỉ đọc.",
            "Nếu tab này hỏng thì AI, tài liệu trên Drive hoặc việc agent này hỏi agent kia đều hỏng theo — nên chỉ PM và Admin sửa.",
          ],
        },
        {
          tieuDe: "Vì sao cần?",
          ds: ["Khai một lần ở Main, cả hệ dùng — không phải khai năm lần.", "Hệ không gắn cứng số agent: thêm hay bớt agent chỉ cần sửa danh bạ, không sửa code.", "Mọi lần agent hỏi agent đều có vết trong sổ hỏi–đáp (xem ở Agent quan sát); hai mốc giữ sổ quyết định sổ giữ bao lâu."],
        },
        {
          tieuDe: "Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Bước trước", "Tab này", "Bước sau"],
            ["Cài hệ lần đầu hoặc thêm agent", "Nối Drive, AI, Telegram; khai danh bạ; chỉnh ma trận", "Trợ lý chat, báo cáo sáng, Telegram, hỏi–đáp giữa agent chạy được"],
          ],
        },
        {
          tieuDe: "Các thẻ trong tab, từ trên xuống",
          bang: [
            ["Thẻ", "Để làm gì", "Xem tab"],
            ["Kho Google Drive", "Nối kho tài liệu của hệ", "① Kho Google Drive"],
            ["🤖 Kết nối AI", "Chọn cách chạy AI", "② Kết nối AI"],
            ["Tài khoản Claude của công ty", "Hai tài khoản, tự chuyển khi hết hạn mức", "③ Tài khoản Claude công ty"],
            ["Trợ lý qua Telegram", "Bật nhắn bot hỏi trợ lý Main", "④ Trợ lý qua Telegram"],
            ["Danh bạ agent", "Khai các agent", "⑤ Danh bạ agent"],
            ["Ai được gọi ai", "Ma trận cho phép", "⑥ Ai được gọi ai"],
            ["Giữ sổ hỏi–đáp giữa các agent", "Hai mốc ngày giữ sổ", "⑦ Giữ sổ hỏi–đáp"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · AI",
          bang: [
            ["Người", "Máy", "🤖 AI"],
            ["Đăng nhập Google và Claude, dán mã, chọn chế độ, khai danh bạ, tick ma trận, đặt số ngày", "Lưu khoá mã hoá, kiểm tra CLI, tự chuyển tài khoản khi hết hạn mức, đảo vai 24 giờ, mồi phiên, dọn sổ 03:30 mỗi đêm", "🤖 Chỉ nút «Thử trợ lý AI» gọi AI thật một câu rất ngắn để thử tài khoản; trợ lý Telegram trả lời bằng AI sau khi được bật"],
          ],
        },
        {
          tieuDe: "Quy trình người ↔ AI",
          ds: ["Người chọn chế độ AI và đăng nhập tài khoản; máy kiểm tra có chạy được không.", "🤖 AI chỉ làm việc khi có người hỏi (trợ lý chat, Telegram) hoặc khi chạy nhịp; tab này chỉ cấp quyền cho AI chạy.", "Người bấm «Thử trợ lý AI» để chắc tài khoản dùng được."],
        },
      ],
    },
    {
      ten: "① Kho Google Drive",
      khoi: [
        {
          tieuDe: "Vì sao / khi nào",
          doan: ["Kho dùng MỘT tài khoản Google duy nhất; hệ tự dựng cây thư mục SCI-AI-AGENT. Làm khi cài lần đầu hoặc khi đổi tài khoản kho."],
        },
        {
          bam: [
            "Có sẵn khoá: bấm «🔗 Kết nối Drive», chọn tài khoản Google của kho. Đã nối mà mất quyền: «🔗 Kết nối lại». Muốn thôi: «Ngắt kết nối».",
            "Chưa có khoá: ở khối «Dùng OAuth Client riêng» kéo tệp credentials.json vào ô «Kéo tệp credentials.json vào đây» (hoặc bấm để chọn), hoặc gõ tay Client ID và Client Secret.",
            "Bấm «Xem hướng dẫn từng bước» — khung 6 bước: Tạo dự án mới · Bật Google Drive API · Khai báo màn hình đồng ý (Branding) · Thêm Test user · Tạo OAuth Client (kiểu Web) và khai địa chỉ quay về · Tải credentials.json.",
          ],
        },
        {
          ketQua: ["Thẻ hiện email tài khoản và dung lượng. Khoá và mã đăng nhập được mã hoá trên máy chủ; trình duyệt không bao giờ nhận lại khoá, chỉ nhận trạng thái."],
        },
        {
          viDu: ["Quay về từ trang Google (đường có ?drive=…) thì màn tự mở tab 🔌 này vì thẻ Drive nằm ở đây — thẻ hiện email vừa nối."],
        },
        {
          luuY: ["Chọn kiểu «External» ở màn hình đồng ý thì phải thêm Test user, nếu không Google từ chối."],
        },
      ],
    },
    {
      ten: "② Kết nối AI",
      khoi: [
        {
          bang: [
            ["Chế độ", "Nghĩa là gì"],
            ["Tắt", "Không chạy phân tích AI"],
            ["Gói Claude Pro/Max (khuyên dùng)", "Dùng Claude Code đăng nhập tài khoản Pro/Max trên máy chủ"],
            ["API mô hình khác", "Gọi nhà cung cấp bên ngoài: Claude API (Anthropic), OpenAI GPT, Google Gemini, xAI Grok, DeepSeek hoặc «Tùy chỉnh (OpenAI-compatible)»"],
          ],
        },
        {
          bam: [
            "Chọn một trong ba chế độ.",
            "Chế độ Gói Claude: nhìn nhãn trạng thái («AI đang tắt», «CLI chưa cài», «Chưa đăng nhập»…). Chưa cài thì bấm «Cài đặt tự động»; xong bấm «🔄 Kiểm tra lại», rồi đăng nhập ở thẻ «Tài khoản Claude của công ty».",
            "Chế độ API: chọn «Nhà cung cấp», dán «API key», điền «Model» (mô hình) và địa chỉ endpoint nếu chọn tùy chỉnh. Bấm «💾 Lưu» rồi «⚡ Kiểm tra kết nối».",
          ],
        },
        {
          ai: ["🤖 Khung này chọn con đường để các AI của hệ chạy (trợ lý chat, câu tóm tắt, nhận xét báo cáo, phân loại issue…); chính nó không gọi AI.", "AI không tự đổi chế độ; chỉ người bấm lưu.", "Người kiểm bằng «⚡ Kiểm tra kết nối» hoặc «Thử trợ lý AI» ở tab ③."],
        },
        {
          viDu: ["Hiện chế độ là Gói Claude, CLI đã cài (phiên bản 2.1.220), đã đăng nhập, gói Max."],
        },
      ],
    },
    {
      ten: "③ Tài khoản Claude công ty",
      khoi: [
        {
          tieuDe: "Vì sao / khi nào",
          doan: ["Gói Claude có hạn mức theo chu kỳ 5 giờ và theo tuần. Khai hai tài khoản để khi một tài khoản hết hạn mức, trợ lý tự chuyển sang tài khoản kia. Hết cả hai thì người đã nối «Tài khoản Claude cá nhân» vẫn hỏi được bằng tài khoản của mình. Chỉ dùng khi «Kết nối AI» ở chế độ Gói Claude."],
        },
        {
          bam: [
            "Mỗi tài khoản một thẻ: bấm nút đăng nhập, mở link Claude, đăng nhập, chép mã trang Claude hiện ra rồi dán vào ô «Dán mã trang Claude hiện ra» — dán xong tự gửi. Link dùng 15 phút, mỗi mã dùng một lần.",
            "Ba ô cấu hình, bấm là lưu ngay: «Dùng 2 tài khoản Claude» · «Đảo vai chính / phụ mỗi 24 giờ» · «Tự mồi phiên mỗi sáng lúc» (chọn giờ — máy gửi một câu ngắn vào tài khoản chính để chu kỳ 5 giờ bắt đầu từ giờ này).",
            "«Kiểm tra nhanh (không tốn token)» chỉ kiểm tra đăng nhập. «Thử trợ lý AI» hỏi Claude một câu rất ngắn bằng đúng tài khoản này.",
            "«Đăng xuất» để bỏ tài khoản; «Làm mới» để đọc lại tình trạng.",
          ],
        },
        {
          ai: ["🤖 Nút «Thử trợ lý AI» gọi AI thật một lượt ngắn để biết tài khoản còn chạy; lượt này vào Thống kê dùng AI.", "AI chỉ trả lời một câu thử, không đụng dữ liệu nào.", "Người kiểm: thẻ báo xanh hoặc đỏ kèm lý do. Hết hạn mức thì máy tự chuyển tài khoản, không cần AI."],
        },
        {
          viDu: ["Hiện đang bật dùng một tài khoản nên ô «Đảo vai chính / phụ mỗi 24 giờ» bị mờ: chỉ bật được khi «Dùng 2 tài khoản Claude» được bật."],
        },
        {
          luuY: ["Thẻ ghi «Đang mượn tài khoản Claude chung của máy» nghĩa là chưa có đăng nhập riêng; hết hạn mức thì mọi agent đang mượn cùng dừng — nên đăng nhập riêng."],
        },
      ],
    },
    {
      ten: "④ Trợ lý qua Telegram",
      khoi: [
        {
          doan: ["Cho phép nhắn bot Telegram để hỏi trợ lý Main; câu trả lời gửi lại Telegram và lịch sử nằm ở phiên «Telegram» của trợ lý trên web. Chỉ PM, Admin, Người dùng dùng được; việc có ghi dữ liệu chỉ chạy khi người nhắn bấm «✅ Làm»."],
        },
        {
          bam: ["Đọc dòng «Nhận tin từ Telegram: đang chạy / đang tắt / chưa khai TELEGRAM_BOT_TOKEN · tin cuối lúc … · N tin hôm nay · M người đã nối».", "Bấm «Bật nhận tin» hoặc «Tắt nhận tin». Nút mờ khi chưa khai khoá bot (khai trong tệp cấu hình máy chủ rồi khởi động lại Main).", "Mỗi người tự nối tài khoản của mình ở menu tên người → «Nối Telegram»."],
        },
        {
          ai: ["🤖 Câu trả lời trên Telegram do trợ lý chat (AI) viết, dùng cùng công cụ hỏi các agent như trên web.", "AI không tự ghi dữ liệu: việc ghi chỉ chạy sau khi người nhắn bấm «✅ Làm».", "Người kiểm câu trả lời ngay trên Telegram; có vết trong sổ hỏi–đáp."],
        },
        {
          viDu: ["Hiện bot @SCI_Main_agent_bot đang chạy, bật nhận tin, 1 người đã nối tài khoản; tin cuối nhận ngày 26/09/2026, hôm nay 0 tin."],
        },
        {
          luuY: ["«Lỗi gần nhất: …» màu đỏ hiện khi bot gặp lỗi."],
        },
      ],
    },
    {
      ten: "⑤ Danh bạ agent",
      khoi: [
        {
          doan: ["Danh bạ là bảng người điều khiển TỰ khai nối những agent nào. Code không biết hệ có mấy agent: hôm nay 7 dòng (Công việc, Tiến độ, Pháp lý, Hợp đồng, Main, Agent quan sát, Nghiệm thu), mai thêm hay bớt chỉ sửa ở đây. Đây là BẢN CHÍNH — bốn agent kia kéo về qua công cụ danh bạ."],
        },
        {
          bang: [
            ["Cột", "Ý nghĩa"],
            ["Bật", "«Kể từ giờ hỏi con này». Tắt thì các agent bỏ qua con đó và nói rõ"],
            ["Mã · Tên hiện ra", "Mã ngắn và tên cho người đọc"],
            ["Địa chỉ · Đường dẫn MCP", "Nơi agent đó lắng nghe; lên máy chủ thật chỉ đổi phần địa chỉ từ localhost sang tên miền"],
            ["Thư mục code · Ghi chú", "Để nút Chạy / Dừng bật được app trên máy này"],
            ["Chạy app", "«Chạy / Dừng» là chạy app lên — khác hẳn ô tick «Bật»"],
          ],
        },
        {
          bam: ["Sửa ô cần đổi; muốn thêm agent dùng ô «Thêm agent» (khai mã, địa chỉ rồi bật).", "Bấm biểu tượng bỏ ở cuối dòng để bỏ khỏi danh bạ."],
        },
        {
          luuY: ["Hai chữ «bật» khác nhau: tick «Bật» là có hỏi con đó không; «Chạy / Dừng» là cho app của nó chạy hay không."],
        },
      ],
    },
    {
      ten: "⑥ Ai được gọi ai",
      khoi: [
        {
          doan: ["Ma trận: HÀNG là agent gọi, CỘT là agent được gọi. Ô tắt nghĩa là cổng của Main chặn lượt gọi đó. Số agent theo danh bạ nên bảng tự to nhỏ theo. Số lượt gọi không còn ở đây — xem ở Agent quan sát."],
        },
        {
          bam: ["Bấm một ô để bật hoặc tắt cặp (gọi → được gọi); ô theo mặc định có chú thích «(theo mặc định)»."],
        },
        {
          luuY: ["Ô tắt là lựa chọn của người dùng, không phải sự cố, nên không tô đỏ (màu đỏ dành cho Issue)."],
        },
      ],
    },
    {
      ten: "⑦ Giữ sổ hỏi–đáp",
      khoi: [
        {
          doan: ["Mỗi lần agent hỏi agent đều ghi vào sổ. Hai mốc quyết định giữ bao lâu: «Giữ sổ hỏi–đáp đầy đủ» (để tra ngược báo cáo tuần) và «Giữ bản gọn tới» (để tra ngược báo cáo tháng, bỏ nội dung trả lời dài). Bốn agent kéo về và tự dọn sổ của mình lúc 03:30 mỗi đêm."],
        },
        {
          bam: ["Đổi số ngày ở hai ô rồi lưu."],
        },
        {
          viDu: ["Hiện giữ đầy đủ 10 ngày và bản gọn 35 ngày. Báo cáo tháng 09/2026 tra ngược về tối đa 35 ngày trước thì còn bản gọn, quá nữa thì sổ đã dọn."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Trợ lý báo chưa đăng nhập Claude", "Vào ③ đăng nhập; kiểm tra ở ② chế độ là Gói Claude."],
            ["«Hết hạn mức»", "Tài khoản hết hạn mức chu kỳ 5 giờ hoặc tuần; máy tự chuyển tài khoản kia. Chờ giờ mở lại hoặc nối thêm tài khoản."],
            ["Một agent không trả lời", "Kiểm tick «Bật» và «Chạy app» ở ⑤; kiểm ô ở ⑥ có cho phép."],
            ["Dán mã mà không vào", "Mã chỉ dùng một lần và link 15 phút; lấy link mới."],
            ["Drive báo chưa sẵn sàng", "Chưa có khoá OAuth: làm theo hướng dẫn 6 bước ở ①."],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt Mr. Đại 11/09/2026 (Main là bản gốc Kết nối); 26/09/2026 (Ai được gọi ai chuyển vào đây; hai mốc giữ sổ — HOP-DONG-KET-NOI 7.1); 04/10/2026 (hai tài khoản Claude công ty).",
};
