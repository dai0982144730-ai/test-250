// Hướng dẫn bản 2 (tab) — chip chọn bản AI và vòng tròn ngữ cảnh trên thanh tiêu đề của Trợ lý. Viết 20/10/2026 (nhóm A3).
// Căn cứ code: components/chat (chip tên bản AI, danh sách xổ, VongNguCanh: xanh, vàng ≥ 60%, đỏ ≥ 85%, trần 200.000) · ChatPanel.tsx (trần ngữ cảnh 200.000 ký hiệu, ước độ dài phiên)
// · app/api/tro-ly (đường chọn bản AI, chọn RIÊNG cho từng người; dò thật từng bản bằng Claude CLI). Khung này KHÔNG gọi AI để trả lời (dò bản chỉ thử chạy). Không ghi số của dự án thật.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Chọn bản AI và vòng ngữ cảnh",
  ai: "Mọi người đã đăng nhập đều bấm đổi được. Bản AI bạn chọn là của RIÊNG bạn (người khác không bị đổi theo). Chưa chọn thì dùng bản mặc định của công ty (khai ở Cài đặt).",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Hai thứ này là gì?",
          doan: [
            "Trên thanh tiêu đề của khung chat có hai thứ nhỏ. Vòng tròn: cho biết cuộc trò chuyện đã dài đến đâu so với sức nhớ của Trợ lý. Chip có chữ (tên bản AI, ví dụ tên một bản của Claude): bản AI đang trả lời bạn; bấm vào để đổi sang bản khác.",
            "Hình dung: bản AI như người trợ lý bạn chọn, mỗi bản mạnh yếu và nhanh chậm khác nhau. Vòng ngữ cảnh như thước đo «bàn làm việc của trợ lý còn bao nhiêu chỗ».",
          ],
        },
        {
          tieuDe: "② Vì sao phải có?",
          ds: [
            "Việc nhẹ (tra nhanh) chọn bản nhanh; việc nặng (soạn báo cáo dài) chọn bản mạnh hơn. Bạn chọn theo nhu cầu.",
            "Phiên quá dài thì Trợ lý quên đầu quên đuôi, trả lời kém dần. Vòng đổi màu để bạn biết lúc nên mở cuộc trò chuyện mới.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Bước", "Việc gì", "Vai trò"],
            ["Trước", "Bạn bắt đầu hoặc đang giữa một phiên chat", "—"],
            ["Chip và vòng", "Chọn bản AI, theo dõi độ dài phiên", "Bạn đang xem"],
            ["Sau", "Câu hỏi KẾ TIẾP dùng bản vừa chọn; phiên quá dài thì mở «Cuộc trò chuyện mới»", "Khung chat"],
          ],
        },
        {
          tieuDe: "④ Gồm những gì?",
          bang: [
            ["Phần", "Nghĩa"],
            ["Vòng tròn ngữ cảnh", "Xanh: bình thường · Vàng: từ 60%, phiên đang dài · Đỏ: từ 85%, nên mở phiên mới. Rê chuột xem số ước"],
            ["Chip tên bản AI (có mũi tên ▾)", "Bản đang dùng; bấm để mở danh sách"],
            ["Danh sách xổ", "Các bản chạy được; dấu ✓ ở bản đang chọn"],
            ["«Model khác…»", "Tự gõ mã một bản không có trong danh sách"],
            ["«↻ Dò lại model thật»", "Chạy thử lại từng bản để cập nhật danh sách"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Bấm chip, chọn bản · bấm «Dò lại model thật» khi hãng ra bản mới · mở phiên mới khi vòng đỏ", "Người quyết"],
            ["MÁY", "Lưu bản bạn chọn theo tài khoản · ước độ dài phiên theo số ký tự chia 4 trên trần 200.000 · chạy thử thật từng bản để biết bản nào dùng được", "Con số ngữ cảnh là ƯỚC, tooltip nói rõ"],
            ["🤖 AI", "Khung KHÔNG dùng AI để quyết. Chỉ khi «Dò lại» thì máy cho từng bản chạy thử một câu ngắn để xem chạy được không", "Không áp dụng"],
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          doan: ["Không có bước AI viết nội dung. Người chọn bản; máy lưu. Từ câu hỏi kế tiếp, 🤖 AI trả lời bằng bản bạn chọn."],
        },
      ],
    },
    {
      ten: "① Đổi bản AI",
      khoi: [
        {
          bam: [
            "Bấm chip ở thanh tiêu đề (chữ có mũi tên ▾).",
            "Bấm một dòng trong danh sách: chọn là áp dụng và đóng ngay.",
            "Nếu bản bạn cần không có: bấm «Model khác…», gõ mã bản vào ô nhập hiện ra, xác nhận.",
          ],
          ketQua: ["Chip đổi tên. Từ câu hỏi kế tiếp, Trợ lý dùng bản mới. Câu đang chạy không bị ảnh hưởng."],
          luuY: [
            "Bản không chạy được trên máy chủ sẽ bị ẩn khỏi danh sách; sau khi cập nhật Claude hoặc hãng ra bản mới, bấm «↻ Dò lại model thật» (mất khoảng 1 phút, màn ghi «Đang dò model thật…»).",
            "Không thấy chip: chưa đọc được cấu hình; mở lại khung chat.",
          ],
          viDu: ["Tình huống minh hoạ: bạn cần soạn báo cáo tuần dài và chính xác. Bạn bấm chip, chọn bản mạnh nhất trong danh sách rồi gõ /lam-bao-cao. Làm xong, việc tra cứu nhanh hằng ngày bạn quay về bản mặc định."],
        },
      ],
    },
    {
      ten: "② Vòng ngữ cảnh",
      khoi: [
        {
          bang: [
            ["Màu", "Từ mức", "Nên làm gì"],
            ["Xanh", "Dưới 60%", "Cứ hỏi tiếp"],
            ["Vàng", "Từ 60%", "Phiên đang dài; sắp nên mở phiên mới"],
            ["Đỏ", "Từ 85%", "Phiên rất dài; mở «Cuộc trò chuyện mới» kẻo Trợ lý quên đầu quên đuôi"],
          ],
          luuY: ["Phần trăm là ƯỚC theo số ký tự trong phiên, không đo chính xác. Rê chuột lên vòng để thấy số ước."],
          viDu: ["Tình huống minh hoạ: sau cả buổi hỏi đáp vòng chuyển vàng. Bạn đang cần bản tổng hợp, nên xuất câu trả lời quan trọng ra tệp (dải «Xuất:») rồi bấm «Cuộc trò chuyện mới» để chuyện mới không bị lẫn."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Danh sách thiếu bản mới", "Bấm «↻ Dò lại model thật» sau khi cập nhật Claude."],
            ["Danh sách có ít bản hơn trước", "Máy ẩn bản chưa chạy được; ghi chú cuối danh sách nói bản nào. Cập nhật Claude rồi dò lại."],
            ["Đổi bản rồi nhưng câu trước vẫn bản cũ", "Bản mới chỉ áp dụng từ câu hỏi kế tiếp."],
            ["Vòng ngữ cảnh chỉ là ước", "Đúng. Số được ước từ số ký tự, không phải số đo chính xác."],
          ],
        },
      ],
    },
  ],
  canCu: "Mr. Đại 05/09/2026 (chip chọn bản AI và vòng ngữ cảnh, mẫu «Fable 5 · Medium · ○») · ở agent Công việc bản AI chọn là của riêng từng người, mặc định theo cấu hình của công ty.",
};
