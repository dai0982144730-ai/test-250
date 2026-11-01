// Hướng dẫn bản 2 (tab) — Cài đặt › AI. Viết 20/10/2026. Nhãn chép từ components/ai/KetNoiAI.tsx (thẻ «Kết nối AI») và lib/cau-hinh/bieu-mau.ts (nhóm ai).
// Đối chiếu code 20/10: các ô bản AI, hai tài khoản, mồi phiên, bản bổ sung, góp ý, câu gợi ý đều có chỗ đọc. Chỗ AI thật: nút «Thử trợ lý AI» (cổng thử AI).
import type { HuongDanTab } from "../kieu";
import { huongDanMucCaiDat } from "../khuon-cai-dat";

export const HD: HuongDanTab = huongDanMucCaiDat({
  tieuDe: "AI",
  tab: "🔌 Kết nối",
  ai: "Người có quyền «cau_hinh.sua» hoặc quản trị viên mới đổi được kết nối AI; người khác chỉ thấy trạng thái. Nút không có quyền bấm thì ẩn.",
  laGi: [
    "Mọi chỗ trong ứng dụng có AI (trợ lý chat, báo cáo tuần, gắn việc vào mã WBS, kiểm tra nội dung báo cáo, soạn việc hàng loạt…) đều đi qua MỘT cửa chung. Mục này là cái cửa đó: AI lấy sức từ đâu, dùng bản nào, có đủ tài khoản dự phòng không.",
    "Có hai nguồn: «Gói thuê bao (Claude Pro/Max)» chạy phần mềm Claude cài trên máy chủ bằng các tài khoản Claude của công ty, hoặc «API key» của một hãng AI.",
  ],
  vaoSao: [
    "Nếu cửa này hỏng hoặc hết hạn mức thì cả trợ lý chat lẫn báo cáo tuần ngừng. Vì vậy cần: thấy ngay AI đang chạy bằng gì, thử được trong một cú bấm, và có tài khoản thứ hai đỡ khi tài khoản chính hết hạn mức.",
    "Chọn đúng bản AI (mạnh hay nhanh) cho đúng việc: trợ lý trả lời cần chất lượng, vòng tra cứu đầu cần nhanh.",
  ],
  vongLam: [
    "Bước trước: máy chủ đã cài sẵn phần mềm Claude hoặc bạn có API key của hãng.",
    "Mục này: chọn nguồn, đăng nhập tài khoản, chọn bản AI mặc định, thử cho chắc.",
    "Bước sau: trợ lý chat, báo cáo tuần, gắn mã WBS, kiểm tra nội dung báo cáo… dùng cấu hình này; Thống kê dùng AI (mục kế bên) cho biết ai đã dùng bao nhiêu.",
  ],
  cacKhoi: [
    ["Thanh «Đang dùng: …» + «Tắt AI» + «Làm mới»", "Cho biết nguồn đang chạy; tắt AI toàn hệ thống.", "Nguồn và trạng thái"],
    ["Chế độ hoạt động (hai thẻ)", "Gói thuê bao hay API key.", "Nguồn và trạng thái"],
    ["Panel Gói thuê bao + «Tài khoản Claude của công ty»", "Cài Claude trên máy chủ, đăng nhập Tài khoản 1 / 2.", "Gói thuê bao, 2 tài khoản"],
    ["Panel API key", "Nhà cung cấp, khoá, bản AI, địa chỉ máy chủ.", "API key"],
    ["Nút «Thử trợ lý AI» và «Kiểm tra nhanh…»", "Thử thật hoặc chỉ kiểm tra đăng nhập / khoá.", "Thử AI"],
    ["Các ô cài đặt bên dưới («Model mặc định», trợ lý, góp ý, câu gợi ý…)", "Chọn bản AI cho từng việc.", "Bản AI và gợi ý"],
  ],
  nguoi: "Quản trị chọn nguồn, đăng nhập tài khoản, chọn bản AI, bấm thử, bấm «Lưu».",
  may: "Chọn tài khoản chính hay phụ theo hạn mức, đảo vai mỗi 24 giờ nếu bật, đếm lượt dùng hôm nay, báo khi tài khoản mất đăng nhập hoặc hết hạn mức.",
  aiLam: "🤖 Chỉ khi bạn bấm «Thử trợ lý AI»: AI trả lời một câu rất ngắn để chứng tỏ cửa còn thông. Việc còn lại ở mục này là cấu hình, không phải AI làm.",
  quyTrinhAI: [
    "Người bấm «Thử trợ lý AI».",
    "🤖 AI trả lời một câu ngắn qua nguồn đang chọn.",
    "Máy hiện khung «Hoạt động bình thường · N giây» kèm câu trả lời, hoặc «Chưa gọi được» kèm lý do.",
    "Người đọc kết quả và quyết sửa cấu hình hay không. Máy không tự đổi nguồn vì một lần thử lỗi.",
  ],
  buoc: [
    {
      ten: "① Nguồn và trạng thái",
      khoi: [
        { doan: ["Đầu thẻ «Kết nối AI» có một thanh cho biết hệ thống đang chạy bằng gì, và bên dưới là hai thẻ chọn nguồn."] },
        {
          bang: [
            ["Phần", "Ý nghĩa"],
            ["«Đang dùng: …»", "Nguồn đang chạy thật, kèm email và tên gói tài khoản. Chữ vàng «chưa đăng nhập» hoặc «máy chủ chưa có Claude CLI» nghĩa là chưa dùng được."],
            ["«Tắt AI»", "Ngừng AI cho toàn hệ thống (hỏi xác nhận). Muốn bật lại phải chọn nguồn và bấm «Dùng cái này» hoặc «Lưu»."],
            ["«Làm mới»", "Đọc lại trạng thái."],
            ["Thẻ «Gói thuê bao (Claude Pro/Max)»", "Dùng phiên đăng nhập Claude trên máy chủ. Khuyến nghị."],
            ["Thẻ «API key»", "Dùng khoá của Anthropic, OpenAI, Gemini, Grok, DeepSeek hoặc máy chủ tuỳ chỉnh."],
          ],
        },
        { bam: ["Mở Cài đặt → tab «🔌 Kết nối» → mục «AI».", "Nhìn thanh «Đang dùng».", "Bấm thẻ nguồn muốn xem hoặc đổi — chỉ hiện panel của thẻ đang chọn (đổi thẻ chưa đổi nguồn đang chạy)."] },
        { viDu: ["Thanh ghi «Đang dùng: Claude CLI · quantri@… · Max». Bạn bấm thẻ «API key» để xem cấu hình khoá; hệ thống vẫn chạy bằng gói thuê bao cho tới khi bạn bấm «Lưu và dùng cái này» ở panel API key."] },
        { luuY: ["Nhãn «đang dùng» trên thẻ mới là nguồn thực tế đang chạy; thẻ có viền chỉ là thẻ bạn đang xem."] },
      ],
    },
    {
      ten: "② Gói thuê bao, 2 tài khoản",
      khoi: [
        { doan: ["Claude là phần mềm AI chạy ngay trên máy chủ công ty. Mỗi tài khoản Claude có hạn mức dùng theo chu kỳ; có hai tài khoản thì tài khoản thứ hai đỡ khi tài khoản chính hết hạn mức hoặc đang bận."] },
        {
          tieuDe: "Bước 1 — cài phần mềm Claude lên máy chủ",
          bam: [
            "Hộp trạng thái ghi «Máy chủ chưa có Claude CLI.» thì bấm «Cài Claude ngay» (1–3 phút, có «Nhật ký cài trên máy chủ» bên dưới).",
            "Đã có thì hộp ghi «Đã có Claude CLI — <phiên bản>». Nút «Cài lại» chỉ dùng khi Claude trên máy chủ bị lỗi.",
          ],
        },
        {
          tieuDe: "Bước 2 — đăng nhập từng tài khoản",
          bam: [
            "Ở mục «Tài khoản Claude của công ty» có hai thẻ «Tài khoản 1» (chính) và «Tài khoản 2» (phụ).",
            "Làm theo nút trong thẻ: lấy đường dẫn đăng nhập, đăng nhập Claude, dán mã nhận được vào thẻ. Thẻ báo email và gói khi thành công.",
            "Bấm «Làm mới» để thấy hôm nay mỗi tài khoản chạy bao nhiêu lượt và đang chạy bao nhiêu việc.",
          ],
        },
        {
          tieuDe: "Bước 3 — chọn bản AI mặc định và bấm dùng",
          bam: ["Chọn «Model mặc định» trong danh sách.", "Bấm «Dùng cái này» (hoặc «Cập nhật model» nếu thẻ này đang chạy)."],
        },
        {
          viDu: [
            "Công ty có hai tài khoản Max. Bạn đăng nhập Tài khoản 1 (hiện email chính) và Tài khoản 2. Bật công tắc «Dùng 2 tài khoản Claude» ở các ô bên dưới rồi «Lưu».",
            "Một sáng Tài khoản 1 báo «hết hạn mức»: trợ lý tự chuyển sang Tài khoản 2, thanh «Đang dùng» đổi sang email của tài khoản 2 và chuông 🔔 có tin «Tài khoản Claude hết hạn mức (chuyển tài khoản)».",
          ],
        },
        { luuY: ["Hết cả hai tài khoản thì người đã nối «Tài khoản Claude cá nhân» (menu tên người) vẫn hỏi được bằng tài khoản của mình.", "Tài khoản mất đăng nhập: thẻ báo, trợ lý tạm bỏ qua tài khoản đó cho tới khi đăng nhập lại."] },
      ],
    },
    {
      ten: "③ API key",
      khoi: [
        { doan: ["Dùng khi công ty có khoá của một hãng AI thay vì tài khoản Claude. Khoá là chuỗi bí mật; nhập xong ứng dụng chỉ hiển thị dạng che (sk-…abcd), không bao giờ gửi ngược về trình duyệt."] },
        { bam: ["Bấm thẻ «API key».", "Chọn «Nhà cung cấp».", "Dán khoá vào ô (nút mắt để hiện hoặc ẩn khoá).", "Bấm «Lưu và dùng cái này» (hoặc «Lưu» nếu hãng này đang chạy). Ứng dụng hỏi thẳng hãng để lấy đúng danh sách bản AI.", "Chọn bản AI trong danh sách; nhà cung cấp tuỳ chỉnh thì nhập «Base URL (chuẩn OpenAI)».", "Muốn bỏ khoá: nút xoá khoá ở cạnh."] },
        { viDu: ["Chọn nhà cung cấp OpenAI, dán khoá, «Lưu và dùng cái này». Thanh «Đang dùng» đổi thành tên hãng và bản AI vừa chọn. Bấm «Thử trợ lý AI» để chắc."] },
        { luuY: ["Với API key, kỹ năng AI không tự kích hoạt như gói thuê bao: gõ đích danh /tên-kỹ-năng trong khung chat thì vẫn chạy."] },
      ],
    },
    {
      ten: "④ Thử AI",
      khoi: [
        { doan: ["Hai nút thử nằm cạnh các nút lưu của panel. Dùng ngay sau khi đổi nguồn hoặc khi người dùng báo trợ lý không trả lời."] },
        {
          bang: [
            ["Nút", "Làm gì"],
            ["«Thử trợ lý AI»", "🤖 Hỏi AI một câu rất ngắn, đo số giây. Phát hiện được cả lỗi kiểu tổ chức chặn gói thuê bao."],
            ["«Kiểm tra nhanh…»", "Chỉ kiểm tra đăng nhập hoặc khoá, không hỏi AI."],
          ],
        },
        { ketQua: ["Khung xanh «Hoạt động bình thường · N giây» kèm câu AI trả lời, hoặc khung đỏ «Chưa gọi được» kèm lý do (ví dụ hết hạn mức, khoá sai)."] },
        { viDu: ["Bạn bấm «Thử trợ lý AI»: sau 6,2 giây hiện «Hoạt động bình thường · 6,2 giây» cùng một câu chào ngắn. Nếu hiện «Chưa gọi được» kèm «hết hạn mức», kiểm tra thẻ Tài khoản và bật tài khoản thứ hai."] },
        { luuY: ["«Thử trợ lý AI» hỏi AI thật nên mất vài giây; «Kiểm tra nhanh…» gần như tức thì."] },
      ],
    },
    {
      ten: "⑤ Bản AI và gợi ý",
      khoi: [
        { doan: ["Dưới thẻ «Kết nối AI» là các ô cài đặt thường (Lưu như mọi mục). Nhãn ô đúng như trên màn:"] },
        {
          bang: [
            ["Ô", "Mặc định", "Tác dụng"],
            ["«Model mặc định»", "claude-sonnet-5", "Bản AI cho kiểm tra lúc nộp báo cáo, báo cáo tuần, chấm độ khó, soạn giao việc."],
            ["Model của trợ lý chat", "claude-opus-5", "Bản AI cho khung chat. Mỗi người vẫn đổi riêng được ở chip chọn bản trong khung chat. Trống = theo «Model mặc định»."],
            ["Model ở vòng tra cứu của trợ lý", "claude-sonnet-5", "Vòng đầu trợ lý chỉ đọc câu hỏi và chọn công cụ tra sổ cái nên dùng bản nhanh; câu trả lời cuối do «Model của trợ lý chat» viết."],
            ["Dùng 2 tài khoản Claude", "Tắt", "Bật: tài khoản 2 vào thay khi tài khoản chính hết hạn mức và đỡ khi bận."],
            ["Đảo vai chính / phụ mỗi 24 giờ", "Tắt", "Bật: ngày chẵn tài khoản 1 chính, ngày lẻ tài khoản 2 chính (giờ Việt Nam)."],
            ["Tự mồi phiên làm việc mỗi sáng", "Tắt", "Tới «Giờ mồi phiên» (07:00), máy gửi một câu ngắn vào tài khoản chính để chu kỳ hạn mức bắt đầu từ giờ đó."],
            ["«Model bổ sung»", "Trống", "Mã bản AI mới (mỗi dòng một mã) hiện thêm trong khung chọn bản, khỏi sửa phần mềm."],
            ["AI góp ý nội dung khi kiểm tra trước khi gửi", "Bật", "🤖 Bật: AI đọc nội dung báo cáo và góp ý mục trống, số liệu mâu thuẫn; góp ý chỉ ở mức gợi ý."],
            ["Câu gợi ý trong khung chat", "4 câu", "Các câu mẫu hiện trong khung chat để bấm cho nhanh."],
          ],
        },
        {
          viDu: [
            "Bạn muốn trợ lý nhanh hơn: đổi «Model ở vòng tra cứu của trợ lý» sang bản nhanh hơn; câu trả lời cuối vẫn do bản mạnh viết.",
            "Thêm câu gợi ý «Việc nào của Phòng Đầu tư và Pháp chế sắp trễ hạn?» vào «Câu gợi ý trong khung chat» → khung chat hiện thêm câu này.",
          ],
        },
        { luuY: ["Mã bản AI phải đúng mã hãng; gõ sai thì khi dùng sẽ báo lỗi ở bước «Thử trợ lý AI»."] },
      ],
    },
  ],
  viDuLuu: ["Đổi «Model ở vòng tra cứu của trợ lý» và bấm «Lưu» → nhật ký ghi từ giá trị cũ sang giá trị mới; câu hỏi kế tiếp của trợ lý dùng bản mới."],
  vuong: [
    ["«Máy chủ chưa có Claude CLI»", "Bấm «Cài Claude ngay» và chờ 1–3 phút; xem «Nhật ký cài trên máy chủ» nếu báo lỗi."],
    ["Đăng nhập xong thẻ vẫn báo chưa đăng nhập", "Mã dán chưa đúng hoặc đã hết hạn; lấy đường dẫn mới và làm lại."],
    ["«Chưa gọi được» khi thử", "Đọc lý do trong khung đỏ: hết hạn mức → bật tài khoản 2; khoá sai → nhập lại khoá."],
    ["Trợ lý chat trả lời chậm", "Xem «Model của trợ lý chat» đang là bản mạnh nhưng chậm; có thể đổi sang bản nhanh hơn."],
    ["Không thấy nút đổi nguồn", "Bạn chỉ có quyền xem; nút ẩn với người không có quyền sửa cài đặt."],
  ],
  canCu: "Nhóm «ai» trong cài đặt; thẻ Kết nối AI; cách chọn tài khoản Claude chính / phụ của máy chủ.",
});
