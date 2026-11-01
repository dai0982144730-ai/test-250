// Hướng dẫn bản 2 (tab) — hai khối thêm kỹ năng trên trang Skill AI của tôi: «Nạp kỹ năng từ file .skill» và «Viết hướng dẫn ngay trên web / nhờ AI sắp lại». Viết 20/10/2026.
// Nhãn chép từ components/ky-nang/SkillView.tsx. Chỗ AI thật: nút «🤖 Nhờ AI sắp lại» (api/skill/route.ts dòng 126). Mã hướng dẫn: ky-nang-them.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Thêm kỹ năng: nạp tệp .skill hoặc viết trên web",
  ai: "Ai đăng nhập cũng thêm được kỹ năng vào kho riêng. Thêm vào kho chung cần quyền «Thêm kỹ năng AI vào kho chung»; không có quyền thì nút «chung — cả công ty» bị mờ và rê chuột báo cần quyền, còn máy chủ cũng từ chối.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Hai khối này là gì",
          doan: [
            "Cùng một việc, hai cách làm: ĐÃ CÓ kỹ năng đóng gói thì nạp tệp; CHƯA CÓ thì tự viết hướng dẫn trên web (có thể nhờ AI sắp chữ thô cho đúng khuôn). Kỹ năng thêm xong dùng được ngay trong khung chat.",
          ],
        },
        {
          tieuDe: "② Vì sao cần",
          ds: [
            "Người dùng tự mở rộng việc trợ lý làm được mà không cần ai sửa phần mềm.",
            "Tệp .skill là gói để chia sẻ giữa người với người, giữa các máy chủ.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Chặng", "Làm gì"],
            ["Trước", "Bạn xác định việc cần AI làm lặp lại; có thể đã có sẵn gói hoặc chỉ có ý trong đầu"],
            ["Hai khối này", "Đưa hướng dẫn vào kho riêng hoặc chung"],
            ["Sau", "Gõ / trong khung chat để dùng; bảng «Kỹ năng đang có» liệt kê, xem, tải, xoá"],
          ],
        },
        {
          tieuDe: "④ Các khối",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["«Nạp kỹ năng từ file .skill»: ô chọn tệp, hai nút chọn kho", "Nạp gói .skill hoặc .zip", "① Nạp tệp"],
            ["«Viết hướng dẫn ngay trên web / nhờ AI sắp lại»: ô viết, «Lưu kỹ năng», «🤖 Nhờ AI sắp lại», hai nút chọn kho", "Tự viết hoặc nhờ AI sắp", "② Viết trên web · ③ Nhờ AI sắp lại"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì"],
            ["Người", "Chọn kho, chọn tệp hoặc viết nội dung, đọc kết quả AI sắp, bấm lưu."],
            ["Máy", "Giải nén và kiểm tệp (chặn tệp nén phình bất thường và đường dẫn thoát ra ngoài), kiểm khuôn có tên và mô tả, kiểm quyền kho chung, lưu, ghi Lịch sử."],
            ["🤖 AI", "🤖 Chỉ khi bấm «🤖 Nhờ AI sắp lại»: sắp chữ thô thành khuôn kỹ năng chuẩn. Nạp tệp và lưu không dùng AI."],
          ],
          ai: [
            "🤖 AI nhận: chữ thô bạn dán (10 đến 30.000 ký tự). AI làm: viết lại thành khuôn kỹ năng, giữ đúng ý, tiếng Việt, không bịa chuyên môn.",
            "🤖 AI KHÔNG tự lưu. Kết quả hiện lại trong ô viết, bạn đọc và sửa rồi mới bấm «Lưu kỹ năng».",
            "🤖 Mất vài giây đến vài chục giây; nút ghi «Đang xử lý…» trong lúc chờ. AI lỗi: có dòng đỏ «Gọi AI thất bại …» hoặc «AI trả về chưa đúng khuôn …»; bạn thử lại hoặc tự viết khuôn bằng tay.",
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          bam: [
            "NGƯỜI: dán chữ thô vào ô viết.",
            "🤖 AI: bấm «🤖 Nhờ AI sắp lại», AI trả về bản đúng khuôn.",
            "NGƯỜI: đọc, sửa tay chỗ chưa đúng ý, chọn kho.",
            "MÁY: bấm «Lưu kỹ năng», máy kiểm khuôn rồi lưu và ghi Lịch sử.",
          ],
        },
      ],
    },
    {
      ten: "① Nạp tệp",
      khoi: [
        {
          doan: ["Tệp .skill là một tệp nén (ZIP) có một thư mục gốc chứa tệp SKILL.md. Trong SKILL.md phải khai tên (name) và mô tả (description). Tối đa 20 MB và 200 tệp bên trong."],
        },
        {
          bam: [
            "Ở khối «Nạp kỹ năng từ file .skill», chọn kho: «riêng — của tôi» (mặc định) hoặc «chung — cả công ty».",
            "Bấm nút chọn tệp, chọn tệp .skill hoặc .zip. Chọn xong là máy nạp ngay, không có nút xác nhận.",
            "Chờ dòng xanh «Đã nạp kỹ năng …» kèm dung lượng.",
          ],
        },
        {
          ketQua: ["Kỹ năng xuất hiện trong bảng «Kỹ năng đang có». Cùng tên với kỹ năng đã có trong cùng kho thì GHI ĐÈ."],
        },
        {
          viDu: ["Tình huống: đồng nghiệp gửi bạn tệp soat-nghiem-thu.skill. Bạn chọn kho «riêng — của tôi», chọn tệp, thấy dòng xanh nạp xong, rồi vào khung chat gõ / và chọn kỹ năng mới để thử trước khi báo trưởng phòng cho vào kho chung."],
        },
        {
          luuY: ["Cùng tên là ghi đè: nạp nhầm tên trùng sẽ thay kỹ năng cũ của chính kho đó."],
        },
      ],
    },
    {
      ten: "② Viết trên web",
      khoi: [
        {
          doan: ["Ô viết nhận trực tiếp nội dung SKILL.md. Khuôn chuẩn: đầu có khối khai tên (không dấu, nối bằng gạch ngang) và mô tả vài dòng nói kỹ năng làm gì, khi nào nên dùng; sau đó là phần hướng dẫn chia mục. Tối đa 200 KB."],
        },
        {
          bam: [
            "Gõ hoặc dán nội dung vào ô viết (ô có chữ mẫu gợi ý khuôn).",
            "Chọn kho: «riêng — của tôi» hoặc «chung — cả công ty».",
            "Bấm «Lưu kỹ năng».",
            "Chờ dòng xanh «Đã lưu kỹ năng … — gõ / … trong khung chat để dùng.»",
          ],
        },
        {
          viDu: ["Tình huống: bạn viết khuôn với tên bao-cao-nhanh-phong-ky-thuat và mô tả «Tóm tắt tình hình việc của Phòng Kỹ thuật cuối tuần, khi người dùng hỏi tình hình tuần». Lưu vào kho riêng; trong chat gõ /bao-cao-nhanh-phong-ky-thuat để dùng."],
        },
        {
          luuY: ["Thiếu tên hoặc mô tả thì máy báo đỏ và không lưu; hoặc dùng bước ③ để AI dựng khuôn."],
        },
      ],
    },
    {
      ten: "③ Nhờ AI sắp lại",
      khoi: [
        {
          doan: ["Khi bạn chỉ có chữ thô (quy trình gõ trong Word, ghi chú họp…), nút «🤖 Nhờ AI sắp lại» chuyển nó thành khuôn kỹ năng chuẩn để bạn xem rồi lưu."],
        },
        {
          bam: [
            "Dán chữ thô vào ô viết (ít nhất 10 ký tự).",
            "Bấm «🤖 Nhờ AI sắp lại». Nút đổi thành «Đang xử lý…».",
            "🤖 Khi xong, ô viết được thay bằng bản AI sắp, kèm dòng xanh «AI đã sắp lại — xem rồi bấm Lưu kỹ năng.»",
            "Đọc kỹ, sửa nếu AI hiểu sai ý, rồi bấm «Lưu kỹ năng».",
          ],
        },
        {
          ai: [
            "🤖 AI chỉ SẮP LẠI chữ của bạn, không thêm kiến thức mới. Bản thay vào ô viết CHƯA lưu cho tới khi bạn bấm «Lưu kỹ năng».",
            "🤖 Nếu chữ quá dài (trên 30.000 ký tự) hoặc quá ngắn, máy báo đỏ và không gọi AI.",
          ],
        },
        {
          viDu: ["Tình huống: bạn dán ba dòng «kiểm hồ sơ nghiệm thu: xem đủ biên bản, đối chiếu khối lượng, nhắc thiếu gì». AI trả về bản có tên, mô tả hai dòng và ba mục hướng dẫn. Bạn thêm một dòng riêng của phòng rồi lưu."],
        },
        {
          luuY: ["Đừng lưu khi chưa đọc: AI có thể diễn đạt khác ý bạn. Người chịu trách nhiệm nội dung kỹ năng là người bấm lưu."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Nút «chung — cả công ty» mờ", "Thiếu quyền «Thêm kỹ năng AI vào kho chung»; dùng kho riêng hoặc nhờ người có quyền."],
            ["Nạp tệp báo đỏ", "Tệp hỏng, không có thư mục gốc chứa SKILL.md, thiếu tên hoặc mô tả, vượt 20 MB hoặc 200 tệp. Đọc câu đỏ để biết lỗi nào."],
            ["Lưu báo nội dung quá dài", "Trần là 200 KB; rút gọn."],
            ["Nhờ AI báo «Gọi AI thất bại»", "AI đang hết hạn mức hoặc mất kết nối; thử lại sau, hoặc tự viết khuôn."],
            ["Kỹ năng vừa lưu không thấy", "Tên trùng với kỹ năng đã có trong cùng kho thì ghi đè nên bảng không thêm dòng; nhìn cột «Phạm vi» và «Mô tả» ở bảng «Kỹ năng đang có» để chắc."],
          ],
        },
      ],
    },
  ],
  canCu: "Nạp tệp .skill tối đa 20 MB và 200 tệp, chặn tệp nén phình và đường dẫn thoát ra ngoài; AI chỉ sắp lại và người xem rồi mới lưu; mỗi lần thêm ghi Lịch sử (loại «Kỹ năng AI»).",
};
