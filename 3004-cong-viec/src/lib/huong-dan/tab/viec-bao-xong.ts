// Hướng dẫn bản 2 (tab) — khung «Xong việc» trong thẻ việc. Viết 20/10/2026 theo mẫu agent Nghiệm thu + luật chữ AI.
// Căn cứ code: components/phong/SoDoPhong.tsx (DongViec: xongPhanCuaToi, form thao === "xong", tên hàm không ghi ở đây) · components/dinh-kem/DinhKem.tsx (nút 📎).
// Không ghi số của dự án thật.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Báo xong việc — ô báo kết quả khi bấm «Xong việc»",
  ai: "Chỉ người (hoặc bộ phận) đang được giao phần việc chưa xong mới thấy nút «Xong việc»: bộ phận chủ trì hoặc bên phối hợp. Người không được giao sẽ không thấy nút.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Khung này là gì?",
          doan: [
            "Bấm «Xong việc» trong thẻ việc thì dưới hàng nút hiện một ô nhỏ: một dòng gõ lời báo kết quả (không bắt buộc), nút 📎 để kẹp tệp kết quả và nút «Xong việc» để chốt.",
            "Người đang làm tự báo là xong; người giao không phải đoán.",
          ],
        },
        {
          tieuDe: "Vì sao cần?",
          ds: [
            "Người giao biết việc đã xong và xong ra sao, không phải hỏi lại.",
            "Tệp kết quả (tờ trình, biên bản, bản vẽ…) đi cùng lời báo, người giao mở xem ngay từ chuông.",
            "Phân biệt «xong phần của mình» (bên phối hợp) với «việc hoàn thành» (bộ phận chủ trì xong).",
          ],
        },
        {
          tieuDe: "Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Bước", "Làm gì", "Nơi"],
            ["Trước", "Người nhận làm việc", "Ngoài hệ thống"],
            ["Bước này", "Người nhận bấm «Xong việc», báo kết quả", "Khung báo xong"],
            ["Sau", "Người giao nhận chuông kèm «Xem» / «Tải về» tệp kết quả; việc sang khối «Việc làm xong»", "Chuông, thẻ việc"],
          ],
        },
        {
          tieuDe: "Khung có những phần nào?",
          bang: [
            ["Phần", "Để làm gì", "Xem tab"],
            ["Dòng gõ «Báo kết quả bằng lời (không bắt buộc) — Enter để xong»", "Lời báo ngắn gửi người giao", "① Báo xong"],
            ["Nút 📎", "Kẹp tệp kết quả", "① Báo xong"],
            ["Nút «Xong việc»", "Chốt", "① Báo xong"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì"],
            ["NGƯỜI", "Gõ lời báo, kẹp tệp, bấm «Xong việc»"],
            ["MÁY", "Ghi phần việc đã xong, kiểm việc đã hoàn thành chưa, đóng bên phối hợp nếu bộ phận chủ trì xong, gửi chuông, giữ tệp kèm theo thời hạn Quản trị đặt"],
            ["🤖 AI", "Màn này không dùng AI"],
          ],
        },
        {
          tieuDe: "Quy trình người ↔ AI",
          doan: ["Màn này không dùng AI. Người báo, máy ghi và gửi tin."],
        },
      ],
    },
    {
      ten: "① Báo xong",
      khoi: [
        {
          tieuDe: "Các bước",
          bam: [
            "Mở thẻ việc, bấm «Xong việc» ở hàng nút.",
            "Gõ lời báo kết quả (bỏ trống cũng được).",
            "Nếu có tài liệu kết quả, bấm 📎 và chọn tệp; có thể chọn nhiều tệp một lần, mỗi tệp được tải lên ngay.",
            "Bấm «Xong việc» (hoặc nhấn Enter ở dòng gõ). Nút mờ khi tệp còn đang tải.",
          ],
          ketQua: [
            "Nếu bạn là bộ phận CHỦ TRÌ: việc hoàn thành, bên phối hợp tự đóng và được báo, dòng báo ghi «Việc … đã hoàn thành — bên phối hợp đã được báo».",
            "Nếu bạn chỉ là bên PHỐI HỢP: chỉ xong phần của bạn, việc vẫn mở đến khi bên chủ trì xong, dòng báo ghi «Đã xong phần của bạn trong việc …».",
            "Rê chuột vào nút «Xong việc» ở hàng nút để đọc đúng câu giải thích cho vai của bạn.",
          ],
          luuY: ["Báo xong là thật và gửi chuông cho người giao. Nếu bấm nhầm, người giao hoặc lãnh đạo dùng nút «Mở lại» (có ghi lý do) để đưa việc về đang làm."],
        },
        {
          tieuDe: "Ví dụ",
          viDu: [
            "Anh B được giao «Soạn biên bản nghiệm thu đợt 2». Anh làm xong, mở thẻ, bấm «Xong việc», gõ «Đã ký đủ bốn bên», kẹp bản scan biên bản bằng 📎 và bấm «Xong việc». Chị A (người giao) có chuông kèm tệp, bấm «Xem» là đọc ngay.",
            "Phòng Tài chính chỉ phối hợp việc ấy: người của phòng bấm «Xong việc» thì chỉ phần của phòng xong, việc vẫn mở. Khi anh B (bộ phận chủ trì) xong, việc hoàn thành và phòng Tài chính được báo.",
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
            ["Không thấy nút «Xong việc»", "Bạn không đứng tên phần việc nào chưa xong ở việc này. Nhờ người giao thêm bạn vào, hoặc nhờ trưởng đơn vị."],
            ["Nút 📎 không hiện", "Quản trị tắt kẹp tệp cho khâu báo xong ở Cài đặt, Tệp đính kèm việc."],
            ["Tải tệp báo lỗi vượt dung lượng", "Chọn tệp nhẹ hơn hoặc nhờ Quản trị tăng mức ở Cài đặt, Tệp đính kèm việc."],
            ["Bấm nhầm «Xong việc»", "Người giao hoặc lãnh đạo bấm «Mở lại», ghi lý do."],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt 28/09/2026 tách «Xong việc» (người làm báo phần mình) khỏi «Hủy việc» (người giao, có lý do) · Cài đặt, Tệp đính kèm việc (số tệp, dung lượng, thời gian lưu) · luật 17 riêng 3004.",
};
