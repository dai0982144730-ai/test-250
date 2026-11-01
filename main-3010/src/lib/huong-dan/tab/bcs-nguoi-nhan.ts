// Hướng dẫn bản 2 (tab) — Báo cáo sáng, tab «② Người nhận». Viết 20/10/2026; cập nhật 26/10/2026 (tin Telegram dạng bảng, tên tab).
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Báo cáo sáng — Người nhận",
  ai: "Mọi tài khoản xem được. Đổi mẫu và chọn dự án cần quyền Cài đặt (PM, Admin); «Gửi thử cho tôi» cần quyền ghi. Người xem thấy ô mờ.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Tab này là gì, vì sao cần?",
          doan: ["Mỗi người nhận báo cáo sáng một bản theo MẪU của mình. Khối này là nơi chọn ai nhận mẫu nào, xem trước ĐÚNG chữ họ sẽ nhận (dựng bằng cùng hàm với lúc gửi, nên thấy gì gửi nấy) và gửi thử về Telegram của chính anh/chị."],
        },
        {
          tieuDe: "Ba mẫu",
          bang: [
            ["Mẫu", "Công dụng"],
            ["Tổng quát", "Mỗi dự án một dòng COD — biết dự án nào xấu đi (Chủ tịch)"],
            ["Điều hành", "Việc làm chậm COD của mọi dự án + câu hỏi cần quyết (Tổng giám đốc)"],
            ["Dự án", "Chỉ các dự án chọn riêng cho người này: việc làm chậm COD + việc đỏ phải xử lý hôm nay (PM)"],
          ],
        },
        {
          tieuDe: "Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Bước trước", "Khối này", "Bước sau"],
            ["Người dùng được khai ở Cài đặt → 👥; mỗi người tự nối Telegram", "Chọn mẫu cho từng người", "07:00 gửi theo mẫu; «Xem · sửa khối» để chỉnh riêng"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · AI",
          bang: [
            ["Người", "Máy", "🤖 AI"],
            ["Chọn mẫu, chọn dự án, bấm «Gửi thử cho tôi», xem trước", "Mặc định mẫu theo chức vụ, lưu ngay khi chọn, dựng xem trước, gửi Telegram", "Khối này không tự dùng AI; bản xem trước có các câu 🤖 nếu bản ngày đã có"],
          ],
        },
        {
          tieuDe: "Quy trình người ↔ AI",
          ds: ["Người chọn mẫu → máy lưu ngay (không nút xác nhận) → máy dựng xem trước → người đọc.", "Câu 🤖 trong bản xem trước do AI viết lúc «Dựng lại»; khối này không gọi AI mới."],
        },
      ],
    },
    {
      ten: "① Chọn mẫu và dự án",
      khoi: [
        {
          bam: [
            "Hàng «Xem mẫu:» bấm «Tổng quát» / «Điều hành» / «Dự án» để xem trước mẫu đó ngay.",
            "Ở bảng (cột Người · Telegram · Mẫu báo cáo · Gửi gần nhất) chọn mẫu cho mỗi người ở ô thả xuống: «Không nhận», «Tổng quát», «Điều hành», «Dự án». Chọn là lưu luôn.",
            "Mẫu «Dự án», hoặc bộ có khối «Dự án tôi chọn»: bấm «Chọn dự án (n/m)», rồi bấm tên dự án để chọn / bỏ — lưu ngay, chọn được nhiều dự án.",
            "Bấm «Hiện cả N người khác (chọn mẫu trước khi họ nối Telegram)» để thấy người chưa có mẫu.",
          ],
        },
        {
          ketQua: ["Dưới ô mẫu có ghi chú: «mặc định theo chức vụ», «toàn công ty», số khối («n khối mặc định của mẫu» hay «bộ riêng n khối»), «đã sửa N lần». Cảnh báo vàng «chưa chọn dự án — 07:00 chỉ nhận lời nhắc chọn dự án» nếu mẫu Dự án chưa chọn dự án nào."],
        },
        {
          viDu: ["Giám đốc dự án HV được chọn mẫu «Dự án» và dự án «Điện gió Hướng Việt»: 07:00 chỉ nhận việc làm chậm COD và việc đỏ của dự án đó, không nhận số các dự án khác."],
        },
        {
          luuY: ["Người chưa nối Telegram vẫn có thể được chọn mẫu trước; họ nhận từ khi nối. Dòng «chưa gửi được — …» cho biết lý do."],
        },
      ],
    },
    {
      ten: "② Xem trước và gửi thử",
      khoi: [
        {
          bam: [
            "Ở dòng người đã có mẫu bấm «Xem · sửa khối» — phía dưới hiện bộ khối của người đó (xem hướng dẫn «Bộ khối») và bản xem trước.",
            "Bản xem trước nằm ở CỘT PHẢI (đứng yên khi cuộn danh sách), mặc định là khung điện thoại — đúng chữ và ảnh người nhận thấy. Nút nhỏ «Xem bản web đầy đủ» đổi sang bảng web (mọi dòng, mọi ảnh), bấm «Về khung điện thoại» để quay lại.",
            "Bấm «Gửi thử cho tôi» để gửi bản của người đó về Telegram của chính anh/chị.",
          ],
        },
        {
          luuY: ["Chưa có bản báo cáo ngày đó thì ghi «Chưa có bản báo cáo của ngày này để xem trước — bấm Dựng lại ở trên». «Gửi thử» mờ khi thiếu bản."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Ô mẫu mờ", "Cần quyền Cài đặt (PM, Admin)."],
            ["Người nhận không thấy Telegram", "Họ chưa nối: menu tên người → «Nối Telegram»."],
            ["Xem trước ghi «ẩn»", "Người đó không thuộc dự án nên không được thấy số hợp đồng / pháp lý của dự án."],
          ],
        },
      ],
    },
  ],
  canCu: "PLAN-MAIN-AGENT mục 6.6; chốt Mr. Đại 04/10/2026 (mỗi người một mẫu).",
};
