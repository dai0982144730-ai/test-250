// Hướng dẫn bản 2 (tab) — khối bình luận ở cuối thẻ việc. Viết 20/10/2026 theo mẫu agent Nghiệm thu + luật chữ AI.
// Căn cứ code: components/phong/BinhLuanViec.tsx (ô viết, gợi ý @ và @@, «Sẽ báo cho», nút Gửi) · lib/phong/binh-luan.ts (coTheBinhLuan, nguoiTagDuoc) · lib/types.ts (nhãn quyền «Giao việc», «Tag tên»).
// Không ghi số của dự án thật.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Bình luận trong việc — trao đổi, gõ @ gọi người, kẹp tệp",
  ai: "Mọi người mở được thẻ đều đọc được bình luận. Ô viết chỉ hiện với người liên quan việc (người giao, người làm, đơn vị đang làm, người được @) và người có quyền «Giao việc» trong phạm vi của việc; ngoài ra chỉ đọc. Việc đã xong chỉ đọc.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Khối bình luận là gì?",
          doan: [
            "Ở cuối thẻ việc có chỗ trao đổi riêng của việc đó: ai nói gì, lúc nào. Mỗi dòng ghi tên người, giờ (hôm nay hh:mm, hoặc dd/mm hh:mm) rồi nội dung. Tên được @ tô màu cam.",
            "Nếu việc có tệp kèm khi giao hoặc khi báo xong, tệp hiện ở phía trên danh sách ý kiến, dưới tên «File kèm khi giao việc» và «File kèm khi báo xong», kèm nút xem và tải về.",
          ],
        },
        {
          tieuDe: "Vì sao cần?",
          ds: [
            "Hỏi đáp về việc nằm đúng trong việc, không lạc vào thư riêng. Người vào sau đọc là hiểu.",
            "Gõ @ tên ai thì người đó có chuông ngay, khỏi gọi điện nhắc.",
          ],
        },
        {
          tieuDe: "Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Bước", "Làm gì", "Nơi"],
            ["Trước", "Việc được giao, người làm gặp vướng", "Thẻ việc"],
            ["Bước này", "Hỏi, trả lời, đính kèm tài liệu", "Khối bình luận"],
            ["Sau", "Người được báo mở chuông, bấm vào là tới đúng việc; chuông của việc đó thành đã đọc", "Chuông"],
          ],
        },
        {
          tieuDe: "Khối có những phần nào?",
          bang: [
            ["Phần", "Để làm gì", "Xem tab"],
            ["Tệp kèm khi giao việc / khi báo xong", "Xem tài liệu đã kèm", "① Đọc"],
            ["Danh sách ý kiến", "Đọc trao đổi", "① Đọc"],
            ["Ô viết «Viết ý kiến… gõ @ gọi người liên quan, @@ tìm thêm người», nút 📎, nút «Gửi»", "Viết ý kiến", "② Viết và gửi"],
            ["Danh sách tên hiện khi gõ @ hay @@", "Chọn người để gọi", "② Viết và gửi"],
            ["Dòng «Sẽ báo cho: …»", "Biết ai sẽ nhận chuông", "② Viết và gửi"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì"],
            ["NGƯỜI", "Viết ý kiến, chọn người được @, kẹp tệp, bấm «Gửi»"],
            ["MÁY", "Gợi ý tên khi gõ @ / @@, tính ai sẽ được báo (người làm, người giao, người đã bình luận, người được @), lưu ý kiến, gửi chuông, giữ tệp theo thời hạn Quản trị đặt"],
            ["🤖 AI", "Màn này không dùng AI"],
          ],
        },
        {
          tieuDe: "Quy trình người ↔ AI",
          doan: ["Khối bình luận không dùng AI. Người viết, máy gợi tên và gửi chuông."],
        },
      ],
    },
    {
      ten: "① Đọc",
      khoi: [
        {
          ds: [
            "Mỗi dòng ý kiến: tên đậm, giờ mờ, nội dung.",
            "Ý kiến có tệp thì tệp hiện ngay dưới dòng đó.",
            "Việc đã xong: khối chỉ đọc, không có ô viết.",
            "Mở thẻ đầy đủ cũng làm chuông của việc này (các tin về việc đó) thành đã đọc, số trên chuông giảm ngay.",
          ],
        },
        {
          tieuDe: "Ví dụ",
          viDu: ["Chị A mở thẻ việc «Hoàn thiện hồ sơ xin phép» và thấy ba ý kiến: anh B hỏi thiếu giấy gì, chị C trả lời, anh B cảm ơn. Ở dưới mục «File kèm khi báo xong» có bản scan giấy xác nhận; chị bấm xem ngay trong cửa sổ nổi."],
        },
      ],
    },
    {
      ten: "② Viết và gửi",
      khoi: [
        {
          bam: [
            "Bấm vào ô viết và gõ ý kiến.",
            "Muốn gọi người: gõ «@» rồi vài chữ tên (không dấu cũng ra). Danh sách hiện tên người liên quan việc, mỗi dòng kèm «trong việc», chức vụ, đơn vị. Bấm một dòng là chèn tên màu cam vào chữ.",
            "Muốn gọi người ngoài việc: gõ «@@». Danh sách mở rộng theo quyền «Tag tên» của bạn; không có quyền thì không hiện ai.",
            "Có tài liệu: bấm 📎 và chọn tệp (số tệp, dung lượng, thời gian lưu do Quản trị đặt).",
            "Nhìn dòng «Sẽ báo cho: …» để biết ai sẽ nhận chuông, mỗi người kèm lý do trong ngoặc («được @»…). Chưa ai thì ghi «Chưa có ai để báo».",
            "Bấm «Gửi» (hoặc Ctrl+Enter). Nhấn Esc để đóng danh sách tên.",
          ],
          ketQua: ["Dòng báo «Đã báo N người: tên, tên» hoặc «Đã lưu bình luận». Ô viết trống lại, ý kiến vừa gửi hiện trong danh sách."],
          luuY: [
            "Bạn không tự @ chính mình.",
            "Dòng «Sẽ báo cho» chỉ tính người có tên @ còn nguyên trong chữ; xoá chữ «@tên» thì tên đó biến khỏi dòng này.",
            "Chỉ tag NGƯỜI, không tag đơn vị.",
          ],
        },
        {
          tieuDe: "Ví dụ",
          viDu: [
            "Anh B cần chị A duyệt. Anh gõ «@» và «chi», danh sách hiện chị A đứng đầu (vì chị là người trong việc), bấm tên. Anh viết tiếp «xem giúp bản vẽ trước thứ Sáu», kẹp bản vẽ bằng 📎, dòng «Sẽ báo cho» ghi chị A kèm lý do. Anh bấm «Gửi». Chị A có chuông ngay.",
            "Anh B muốn hỏi thêm anh D ở phòng khác chưa liên quan việc: gõ «@@» và tên anh D. Nếu anh B không có quyền «Tag tên» thì danh sách trống; anh nhờ chị A thêm anh D vào phối hợp.",
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
            ["Không có ô viết", "Bạn không liên quan việc và không có quyền «Giao việc» trong phạm vi của việc này, hoặc việc đã xong. Bạn chỉ đọc được."],
            ["Gõ @ không ra tên cần tìm", "@ chỉ ra người liên quan việc. Thử «@@» (cần quyền «Tag tên»), hoặc thêm người đó vào phối hợp."],
            ["Không có nút 📎", "Quản trị tắt kẹp tệp cho bình luận ở Cài đặt, Tệp đính kèm việc."],
            ["Gửi rồi không ai nhận chuông", "Xem dòng «Sẽ báo cho» trước khi gửi: nếu ghi «Chưa có ai để báo» thì ý kiến chỉ lưu lại."],
            ["Viết nhầm", "Khối này không có nút sửa hay xoá ý kiến; viết thêm một dòng đính chính."],
          ],
        },
      ],
    },
  ],
  canCu: "Quyền «Giao việc» (bình luận được việc trong phạm vi, người liên quan luôn bình luận được) và «Tag tên» (gõ @@) khai ở Cài đặt, Vai trò và quyền · chốt 29/09/2026 (bình luận cùng cấu hình với Giao việc) · Cài đặt, Tệp đính kèm việc.",
};
