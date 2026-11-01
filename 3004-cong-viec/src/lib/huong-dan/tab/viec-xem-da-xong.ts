// Hướng dẫn bản 2 (tab) — chế độ xem việc ĐÃ XONG (nút «Tuần N: …» và «30 ngày: …») ở Sơ đồ tổ chức và Dự án. Viết 20/10/2026 theo mẫu agent Nghiệm thu + luật chữ AI.
// Căn cứ code: components/phong/SoDoPhong.tsx (xem, demNut, NUT_XONG, ô «Xong a · Mới b») · components/phong/DuAnPhong.tsx · components/phong/viec.ts (nutXong, khoangXongCua, moiTrongKhoang).
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Xem việc đã xong — nút «Tuần N» và «30 ngày»",
  ai: "Mọi người đăng nhập đều xem. Chỉ xem, không thao tác hàng loạt. Nút «Mở lại» trong từng việc chỉ hiện với người giao và lãnh đạo.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Chế độ này là gì?",
          doan: [
            "Hàng nút trên đầu sân có hai nút ghi «Tuần N: xong … · mới …» và «30 ngày: xong … · mới …». Bấm một nút, cả màn chuyển sang xem VIỆC ĐÃ HOÀN THÀNH trong khoảng đó thay vì việc đang làm: mỗi ô ghi «Xong a · Mới b», cột phải liệt kê các việc đã xong.",
            "«Xong» là số việc hoàn thành trong khoảng; «Mới» là số việc phát sinh (vào sổ) trong cùng khoảng, cùng đếm cho ô đang chọn và các ô bên dưới.",
          ],
        },
        {
          tieuDe: "Vì sao cần?",
          ds: [
            "Họp giao ban hỏi «tuần qua làm xong gì»: câu trả lời nằm trong một cú bấm.",
            "Việc đã xong rời danh sách đang làm; muốn đọc lại bình luận hay tệp kết quả thì vào đây.",
            "So số việc xong với số việc mới để biết đơn vị đang trả nợ hay đang dồn thêm.",
          ],
        },
        {
          tieuDe: "Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Bước", "Làm gì", "Nơi"],
            ["Trước", "Người làm báo «Xong việc»", "Thẻ việc"],
            ["Bước này", "Lãnh đạo, trưởng đơn vị xem lại việc đã xong", "Hai nút «Tuần N», «30 ngày»"],
            ["Sau", "Việc báo xong nhầm thì «Mở lại»; việc đúng thì thôi", "Thẻ việc"],
          ],
        },
        {
          tieuDe: "Màn có những khối nào khi bật chế độ này?",
          bang: [
            ["Khối", "Nghĩa"],
            ["Nút đang bật (sáng)", "Bấm lần nữa để tắt, trở về việc đang làm"],
            ["Ô trên sơ đồ: «Xong a · Mới b»", "Số việc xong và số việc mới của ô và các ô bên dưới"],
            ["Tiêu đề cột phải: «Việc xong tuần N · tên ô»", "Cho biết đang xem khoảng nào"],
            ["Danh sách việc: dòng ghi «Xong ngày dd/mm/yyyy» chữ xanh lá", "Các việc đã xong"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì"],
            ["NGƯỜI", "Bấm nút, đọc, mở việc xem chi tiết, «Mở lại» nếu báo xong nhầm"],
            ["MÁY", "Tính khoảng ngày của tuần và 30 ngày (tính cả hôm nay), đếm xong và mới theo ô, lọc theo ba nút «Tôi giao» / «Tôi nhận» / «Cần phối hợp» nếu đang bật"],
            ["🤖 AI", "Màn này không dùng AI"],
          ],
        },
        {
          tieuDe: "Quy trình người ↔ AI",
          doan: ["Chế độ xem này không dùng AI. Máy đếm, người đọc và quyết."],
        },
      ],
    },
    {
      ten: "① Cách dùng",
      khoi: [
        {
          bam: [
            "Rê chuột vào nút để đọc khoảng ngày chính xác (kèm số ngày).",
            "Bấm «Tuần N: …» hoặc «30 ngày: …». Nút mờ nghĩa là trong ô đang chọn chưa có việc nào xong.",
            "Bấm ô trên sơ đồ để đổi nơi xem; số «Xong a · Mới b» và cột phải đổi theo.",
            "Bấm tên một việc để mở: đọc bình luận, xem tệp kết quả. Việc đã xong không có «Xong việc», «Gia hạn»; chỉ người giao và lãnh đạo có «Mở lại».",
            "Muốn thoát, bấm lại nút đang sáng.",
          ],
          luuY: [
            "Bật chế độ này thì nút «Quá hạn» tắt (hai chế độ không chạy cùng lúc).",
            "Việc đã xong lâu hơn thời hạn lưu của hệ thống thì không còn ở đây; tìm bằng mã việc ở ô tìm với phạm vi «Việc toàn công ty».",
          ],
        },
        {
          tieuDe: "Ví dụ",
          viDu: [
            "Sáng thứ Hai họp giao ban. Anh B (trưởng phòng) bấm «Tuần N: xong … · mới …» ở ô phòng mình. Danh sách liệt kê các việc phòng đã xong trong tuần, mỗi việc ghi ngày xong. Anh thấy một việc ghi xong nhưng chưa có biên bản: mở việc, đọc bình luận, nhắn người làm bổ sung.",
            "Chị A bật thêm «Tôi giao» để chỉ xem những việc xong mà chính chị đã giao, kiểm xem người nhận có báo kết quả đủ không.",
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
            ["Nút «Tuần N» / «30 ngày» bị mờ", "Trong ô đang chọn và các ô bên dưới chưa có việc nào xong trong khoảng đó."],
            ["Số «Xong» ở ô khác số trong danh sách", "Số đếm theo ô đang chọn cộng các ô bên dưới và nút «Tôi giao / Tôi nhận / Cần phối hợp» đang bật; kiểm xem có nút lọc nào đang sáng không."],
            ["Không thấy việc xong tháng trước", "Nút chỉ phủ tuần đang chọn và 30 ngày gần nhất. Việc cũ hơn tìm bằng mã ở ô tìm."],
            ["Báo xong nhầm", "Mở việc, bấm «Mở lại» (người giao hoặc lãnh đạo), ghi lý do."],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt 30/09/2026 (hai nút việc đã hoàn thành: tuần đang chọn và 30 ngày, chỉ xem) · chốt 01/10/2026 (việc đã xong hiện «Xong ngày dd/mm/yyyy») · luật 31 (khoảng ngày kèm số ngày).",
};
