// Hướng dẫn bản 2 (tab) — Báo cáo sáng, khối «Luật động». Viết 20/10/2026; cập nhật 26/10/2026 (vị trí ở đầu tab ①, khớp theo tên dự án).
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Báo cáo sáng — Luật động",
  ai: "Mọi tài khoản xem được. Nhắn luật và «Xoá» cần quyền ghi (PM, Admin, Người dùng).",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Luật động là gì, vì sao cần?",
          doan: ["Luật động là lời dặn ngắn cho báo cáo sáng, ví dụ «tuần này theo dõi sát nhà thầu TS» hay «sáng mai báo kỹ về HP1». Có luật, báo cáo sáng sẽ chú ý thêm đúng việc đó trong thời gian luật còn hiệu lực. Mọi luật đều xem và xoá được trên màn — không có luật ẩn."],
        },
        {
          tieuDe: "Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Bước trước", "Khối này", "Bước sau"],
            ["Lãnh đạo muốn theo dõi sát một việc", "Gõ câu dặn", "Bản báo cáo sáng các ngày còn hiệu lực chú ý thêm việc đó; hết hạn thì luật tự rụng"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · AI",
          bang: [
            ["Người", "Máy", "🤖 AI"],
            ["Gõ câu, xoá luật", "Đọc câu bằng code (không dùng AI), tính hiệu lực, áp luật vào bản báo cáo, tự cho luật hết hạn rụng", "Khối này không dùng AI"],
          ],
        },
        {
          tieuDe: "Quy trình người ↔ AI",
          ds: ["Màn này không dùng AI: câu dặn được máy đọc bằng luật cố định, cùng câu ra cùng kết quả."],
        },
      ],
    },
    {
      ten: "① Thêm và xoá luật",
      khoi: [
        {
          bam: [
            "Khối «Luật động (N đang bật)» nằm ở ĐẦU tab «① Báo cáo sáng của tôi» và thường co lại — bấm «Mở» để xổ ra, bấm lại để co.",
            "Đọc khung «⭐ Cách tính hiệu lực» để biết luật sống bao lâu.",
            "Gõ câu vào ô (ví dụ «tuần này theo dõi sát nhà thầu TS») hoặc bấm một câu ví dụ bên dưới để điền sẵn, rồi bấm «Nhắn cho Main Agent» (hoặc Enter).",
            "Đọc dòng xanh Main trả lời — nó nói luật đã hiểu thế nào.",
            "Mỗi luật hiện trong danh sách kèm phạm vi: «Một ngày», «Tuần này» hoặc «Không hạn». Bấm «Xoá» ở dòng luật để bỏ.",
            "Bấm «Xem N luật đã hết hạn» để xem luật đã tự rụng (hiện mờ).",
          ],
        },
        {
          ketQua: ["Luật đang bật được đếm ở tiêu đề «Luật động (N đang bật)». Chưa có luật nào thì ghi «Đang không có luật nào — báo cáo sáng chạy theo khung mặc định» (bình thường, không phải hỏng)."],
        },
        {
          viDu: ["Hôm nay 20/10/2026 có 0 luật đang bật và 1 luật đã hết hạn. Gõ «tuần này theo dõi sát nhà thầu TS» → luật phạm vi «Tuần này», sáng nào trong tuần cũng được chú ý thêm nhà thầu TS."],
        },
        {
          luuY: ["Câu nhắn cùng một khuôn với câu nhắn qua Telegram cho Main Agent.", "Luật khớp cả theo TÊN DỰ ÁN (tên, mã ngắn, tên gọi khác): «từ nay báo kỹ về Nậm săm 3A» đẩy việc của dự án đó lên đầu danh sách (đã thử 26/10/2026)."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Nút «Nhắn cho Main Agent» mờ", "Anh/chị là Người xem."],
            ["Luật biến mất", "Hết hạn thì tự rụng; xem ở «Xem N luật đã hết hạn»."],
            ["Câu dặn không được hiểu", "Viết gần với các câu ví dụ hơn, gồm đối tượng (nhà thầu, dự án) và thời hạn (sáng mai, tuần này)."],
          ],
        },
      ],
    },
  ],
  canCu: "PLAN-MAIN-AGENT mục 6.2 (luật động xem và xoá được, không có luật ẩn).",
};
