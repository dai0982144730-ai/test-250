// Hướng dẫn bản 2 (tab) — ô xổ «Kỹ năng gọi đích danh» khi gõ / ở ô nhập của Trợ lý. Viết 20/10/2026 (nhóm A3).
// Căn cứ code: components/chat/ChatPanel.tsx (goiYSkill: gõ / ở ĐẦU ô, chưa có dấu cách; dungSkill; ↑↓ Enter Tab Esc; /chat?skill=<mã> điền sẵn) · skills-he-thong/*/SKILL.md (6 kỹ năng hệ thống)
// · app/api/skill (chung + kỹ năng riêng của người dùng) · AI chạy qua lib/ai/chat-agent.ts:424 và lib/tro-ly/lam-bao-cao.ts:712. Không ghi số của dự án thật.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Gọi kỹ năng bằng dấu /",
  ai: "Mọi người đã đăng nhập dùng được kỹ năng chung của hệ thống và kỹ năng riêng của chính mình. Kỹ năng cũng chỉ đọc, không ghi vào sổ.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Kỹ năng là gì?",
          doan: [
            "Kỹ năng là một bộ chỉ dẫn viết sẵn để Trợ lý làm tốt một loại việc: hỏi sổ cái, tóm tắt báo cáo, kiểm mẫu, làm báo cáo… Thay vì tả dài, bạn gõ dấu / ở đầu ô nhập; một ô xổ «Kỹ năng gọi đích danh — chọn rồi gõ tiếp câu hỏi» hiện ra liệt kê các kỹ năng, bạn chọn một cái.",
            "Hình dung: kỹ năng như những nút tắt kèm cẩm nang. Chọn /tom-tat thì Trợ lý biết ngay phải làm theo cẩm nang tóm tắt.",
          ],
        },
        {
          tieuDe: "② Vì sao phải có?",
          ds: [
            "Bạn không phải nhớ cách hỏi đúng; chọn kỹ năng là Trợ lý biết cách làm.",
            "Cùng một việc, mọi người dùng cùng một cẩm nang nên kết quả đồng đều.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Bước", "Việc gì", "Vai trò của kỹ năng"],
            ["Trước", "Bạn mở khung chat, có câu hỏi hoặc tệp cần xử lý", "—"],
            ["Kỹ năng", "Gõ / → chọn → gõ tiếp câu hỏi → gửi", "Ô xổ bạn đang xem"],
            ["Sau", "Nhận câu trả lời hoặc tệp (báo cáo Word…), đối chiếu, dùng", "Màn Gửi báo cáo, Sơ đồ tổ chức…"],
          ],
        },
        {
          tieuDe: "④ Ô xổ có gì?",
          bang: [
            ["Phần", "Nghĩa"],
            ["Dòng đầu «Kỹ năng gọi đích danh — chọn rồi gõ tiếp câu hỏi»", "Tiêu đề ô xổ"],
            ["Mỗi dòng", "/mã-kỹ-năng (đậm) và mô tả ngắn bên dưới; tối đa 8 dòng"],
            ["Dòng đang tô nền", "Dòng sẽ chọn nếu bạn nhấn Enter hoặc Tab"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Gõ /, chọn kỹ năng, gõ câu hỏi, kẹp tệp nếu cần, gửi", "Người quyết hỏi gì"],
            ["MÁY", "Liệt kê kỹ năng, lọc theo chữ bạn gõ · điền sẵn «/mã-kỹ-năng » vào ô nhập · nạp cẩm nang kỹ năng cho lượt hỏi · tra dữ liệu bằng công cụ chỉ đọc", "Chính xác như đã lưu"],
            ["🤖 AI", "🤖 Làm theo cẩm nang của kỹ năng: tra, tóm tắt, kiểm, viết lời, soạn báo cáo", "🤖 Có thể sai; đối chiếu nguồn"],
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          bam: [
            "Người gõ / ở đầu ô nhập; máy xổ danh sách kỹ năng và lọc theo chữ gõ tiếp.",
            "Người chọn một kỹ năng (bấm, hoặc ↑↓ rồi Enter hoặc Tab). Ô nhập điền «/mã-kỹ-năng » và đưa chuột về cuối.",
            "Người gõ câu hỏi, kẹp tệp nếu kỹ năng cần, bấm gửi.",
            "🤖 AI làm theo cẩm nang của kỹ năng đó, dùng công cụ chỉ đọc để tra dữ liệu thật, rồi trả lời.",
            "Người đối chiếu và dùng kết quả.",
          ],
          ai: ["🤖 AI chỉ đọc và viết. Kỹ năng không có quyền ghi vào sổ cái."],
        },
      ],
    },
    {
      ten: "① Chọn kỹ năng",
      khoi: [
        {
          bam: [
            "Gõ / ở ĐẦU ô nhập (chưa có dấu cách). Ví dụ gõ /tom thì chỉ còn kỹ năng có «tom» trong mã hoặc tên.",
            "Bấm một dòng, hoặc dùng ↑ ↓ để di chuyển rồi nhấn Enter hoặc Tab. Nhấn Esc để xoá ô nhập.",
            "Ô nhập hiện «/mã-kỹ-năng » kèm dấu cách; gõ tiếp câu hỏi rồi gửi.",
          ],
          ketQua: ["Chọn là điền ngay, ô xổ đóng. Không có nút xác nhận."],
          luuY: [
            "Ô xổ chỉ hiện khi dấu / đứng ĐẦU ô và chưa có dấu cách. Gõ / ở giữa câu thì không xổ.",
            "Không có kỹ năng nào xổ ra: có thể hệ thống chưa nạp được danh sách; Trợ lý vẫn trả lời câu hỏi thường.",
            "Từ màn «Skill AI của tôi» (menu tên người), nút ▶ Chạy mở khung chat và điền sẵn đúng kỹ năng đó.",
          ],
          viDu: ["Tình huống minh hoạ: bạn gõ /ki. Ô xổ còn /kiem-tra-mau. Bạn nhấn Enter, ô nhập thành «/kiem-tra-mau », bấm 📎 kẹp báo cáo Word, gõ «tệp này gửi được chưa?» rồi gửi."],
        },
      ],
    },
    {
      ten: "② Sáu kỹ năng hệ thống",
      khoi: [
        {
          bang: [
            ["Lệnh", "Dùng để", "Cách dùng"],
            ["/hoi-so-cai", "Hỏi đáp về sổ cái công việc: việc sắp trễ, số việc mở của đơn vị, một việc đang vướng ở đâu, tuần trước xong gì", "«/hoi-so-cai Phòng ĐT&PC còn mấy việc mở?»"],
            ["/tom-tat", "Tóm tắt một báo cáo hoặc cả một thư mục: ý chính, số liệu quan trọng, rủi ro, kiến nghị, việc giao", "«/tom-tat báo cáo tuần mới nhất của SCI E&C»"],
            ["/kiem-tra-mau", "Góp ý nội dung báo cáo Word trước khi gửi: mục trống, ô còn dấu chấm, số liệu mâu thuẫn, ngày sai, thiếu kết quả cần có, sai tên", "Kẹp tệp Word bằng 📎 rồi hỏi «tệp này gửi được chưa?»"],
            ["/lam-bao-cao", "Làm báo cáo tuần hoặc tháng thành tệp Word đúng mẫu để nộp", "Xem hướng dẫn «Trợ lý SCI công việc», tab «④ Làm báo cáo»"],
            ["/tong-hop-bao-cao", "Gộp báo cáo của các đơn vị cấp dưới thành báo cáo cấp trên hoặc báo cáo hợp nhất", "«/tong-hop-bao-cao tuần này cho Phòng ĐT&PC»"],
            ["/trich-cong-viec", "Đọc một báo cáo hoặc tờ trình và trích bảng công việc chuẩn (công việc, dự án, bắt đầu, kết thúc, kết quả cần có, tình trạng)", "Kẹp tệp rồi «/trich-cong-viec»"],
          ],
          luuY: [
            "Kỹ năng riêng của bạn (menu tên người, «Skill AI của tôi») cũng xổ ra ở đây và gọi bằng /tên-kỹ-năng.",
            "«/trich-cong-viec» chỉ trích ra để bạn xác nhận; không đưa việc vào sổ cái.",
          ],
          viDu: ["Tình huống minh hoạ: bạn nhận một tờ trình có mục «Nội dung cần TGĐ quyết định» nhưng không có bảng công việc. Bạn kẹp tệp và gõ /trich-cong-viec. Trợ lý trả bảng công việc chuẩn; bạn đọc, thấy thiếu hạn của hai dòng thì tự bổ sung khi nhập sổ."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Gõ / mà không xổ gì", "Dấu / phải đứng đầu ô và chưa có dấu cách; hoặc chưa nạp được danh sách kỹ năng. Thử mở lại khung chat."],
            ["Chọn rồi mà Trợ lý trả lời lạc đề", "Gõ thêm câu hỏi cụ thể sau tên kỹ năng, và kẹp tệp nếu kỹ năng cần tệp."],
            ["Muốn thêm kỹ năng riêng", "Vào «Skill AI của tôi» ở menu tên người."],
          ],
        },
      ],
    },
  ],
  canCu: "Mr. Đại chốt 01/10/2026 (menu «Skill AI của tôi»: kỹ năng chung xem và chạy, kỹ năng riêng thêm, sửa, xoá) · kỹ năng hệ thống nằm trong thư mục skills-he-thong · phân vai AI: AI chỉ đọc và viết, người bấm mới có hiệu lực.",
};
