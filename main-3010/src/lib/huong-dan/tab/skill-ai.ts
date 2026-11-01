// Hướng dẫn bản 2 (tab) — menu tên người → «Skill AI của tôi» (/skill). Viết 20/10/2026 từ agent Main theo mẫu Nghiệm thu + luật chữ AI (Mr. Đại).
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Skill AI của tôi",
  ai: "PM, Admin, Người dùng nạp, soạn và xoá skill của mình. Người xem vào xem được kho nhưng khối nạp / soạn hiện mờ kèm lý do.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Skill là gì?",
          doan: ["Skill là một bộ chỉ dẫn viết sẵn để trợ lý chat làm đúng một loại việc theo cách của công ty, ví dụ «soát tiến độ điện gió theo quy tắc P01–P10», «xuất báo cáo Word». Mỗi skill là một tệp SKILL.md (có thể kèm thư mục tài liệu), gói thành tệp .skill hoặc .zip."],
        },
        {
          tieuDe: "Vì sao cần?",
          ds: ["Dạy trợ lý một quy trình riêng mà không cần lập trình.", "Skill CHỈ chạy khi anh/chị gọi đích danh bằng cách gõ /tên-skill rồi câu hỏi — trợ lý không tự chọn skill, nên không bị chen ngang.", "Skill phạm vi «chung — 5 agent» thì cả năm agent dùng; «riêng agent này» thì chỉ Main."],
        },
        {
          tieuDe: "Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Bước trước", "Màn này", "Bước sau"],
            ["Có một quy trình hay lặp lại", "Nạp hoặc soạn skill", "Trong trợ lý chat gõ /tên-skill + câu hỏi (hoặc bấm «▶ Chạy» ở bảng skill)"],
          ],
        },
        {
          tieuDe: "Các khối trên màn, từ trên xuống",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Khung «Cách dùng skill trong chat»", "Nhắc cách gọi", "① Dùng một skill"],
            ["«Nạp skill từ file .skill»", "Đưa skill có sẵn vào", "② Nạp hoặc soạn skill"],
            ["«Tự soạn / nhờ AI viết»", "Dán nội dung, nhờ AI sắp lại", "② Nạp hoặc soạn skill"],
            ["«Skill đang có»", "Danh sách (Skill · Phạm vi · Mô tả), «▶ Chạy», «Xoá»", "① Dùng một skill"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · AI",
          bang: [
            ["Người", "Máy", "🤖 AI"],
            ["Nạp tệp, dán nội dung, chọn phạm vi, bấm «Lưu skill», gọi skill", "Giải nén skill (chặn gói quá 20 MB hoặc 200 tệp), kiểm khai báo name và description, lưu, liệt kê", "🤖 Chỉ nút «🤖 Nhờ AI sắp lại»: AI sắp chữ thô thành skill chuẩn; sau đó lúc chạy skill, AI trợ lý làm việc theo skill"],
          ],
        },
        {
          tieuDe: "Quy trình người ↔ AI",
          ds: ["Người dán chữ thô → 🤖 AI chỉ SẮP LẠI (không thêm ý) → người xem trong ô rồi mới bấm «Lưu skill».", "Khi chạy skill, trợ lý (AI) làm theo chỉ dẫn trong skill và người đọc kết quả như mọi câu trả lời khác."],
        },
      ],
    },
    {
      ten: "① Dùng một skill",
      khoi: [
        {
          bam: [
            "Trong trợ lý chat gõ /tên-skill, một khoảng trắng, rồi câu hỏi. Ví dụ: /soat-tien-do-dien-gio tuần này vi phạm P04 không?",
            "Hoặc ở bảng «Skill đang có» bấm «▶ Chạy» để mở trợ lý với skill đó điền sẵn.",
            "Bấm «Xoá» ở skill của mình để bỏ (skill hệ thống ghi «hệ thống — không xoá được»).",
          ],
        },
        {
          viDu: ["Hiện có 5 skill chung: soat-tien-do-dien-gio (soát tiến độ theo bảng quy tắc P01–P10), ve-mat-bang-dxf, viet-bao-cao-tuan, xuat-bao-cao-docx, xuat-tien-do-xlsx."],
        },
        {
          luuY: ["Quên gõ dấu gạch chéo đầu thì trợ lý coi là câu hỏi thường và không áp skill."],
        },
      ],
    },
    {
      ten: "② Nạp hoặc soạn skill",
      khoi: [
        {
          bam: [
            "Nạp: ở «Nạp skill từ file .skill» chọn tệp .skill hoặc .zip (một thư mục gốc chứa SKILL.md khai name: và description:, tối đa 20 MB). Cùng tên thì ghi đè. Chọn phạm vi «riêng agent này» hoặc «chung — 5 agent».",
            "Soạn: ở «Tự soạn / nhờ AI viết» dán nội dung. Thiếu khai báo thì bấm «🤖 Nhờ AI sắp lại», xem kết quả trong ô, sửa rồi bấm «Lưu skill».",
          ],
        },
        {
          ai: ["🤖 AI nhận chữ thô anh/chị dán; làm: sắp thành SKILL.md chuẩn (có name, description, hướng dẫn).", "AI chỉ sắp lại, KHÔNG được thêm yêu cầu mới; nó không tự lưu.", "Người đọc kết quả trong ô, sửa, bấm «Lưu skill» mới có hiệu lực. Mất kết nối AI thì tự viết theo mẫu trong ô."],
        },
        {
          viDu: ["Dán ba dòng «Khi soát tiến độ, kiểm bê tông móng chờ 28 ngày rồi mới dựng tháp» → bấm «🤖 Nhờ AI sắp lại» → AI thêm khai báo name và description, giữ nguyên ý → anh/chị bấm «Lưu skill»."],
        },
        {
          luuY: ["Tệp quá 20 MB hoặc quá 200 tệp bị chặn (chống gói nén độc hại).", "Mỗi tài khoản một kho skill riêng; skill «chung» thì cả năm agent của anh/chị thấy."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Khối nạp mờ", "Anh/chị là Người xem — không có quyền ghi."],
            ["Nạp báo thiếu SKILL.md", "Tệp phải có đúng một thư mục gốc chứa SKILL.md."],
            ["Skill không chạy khi hỏi", "Phải gõ /tên-skill đúng tên; trợ lý không tự chọn skill."],
            ["Nhờ AI sắp lại không ra", "AI hết hạn mức hoặc lỗi; tự viết theo mẫu trong ô."],
          ],
        },
      ],
    },
  ],
  canCu: "LOI-DUNG-CHUNG mục 5 (skill: một cấu trúc, hai phạm vi); chốt Mr. Đại 03/10/2026 (Skill AI của tôi chuyển vào menu tên người).",
};
