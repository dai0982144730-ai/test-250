// Hướng dẫn bản 2 (tab) — khung phải «Ngưỡng bộ sinh issue» (nút «Sửa ngưỡng của tab này →» / «Xem ngưỡng và vết sửa →»). Viết 20/10/2026 (nhóm A3).
// Căn cứ code: components/cay-viec/issue/PhaiIssue.tsx (KhungNguong: bảng N · M · K, «Lưu và chạy lại bộ sinh», «Vết sửa ngưỡng») · lib/cay-viec/issue/nguong.ts (NGUONG_MAC_DINH, NHAN_NGUONG)
// · quyen.ts (duyet = wbs.duyet). Khung này KHÔNG dùng AI. Không ghi số của dự án thật.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Ngưỡng của bộ sinh issue",
  ai: "Mọi người xem được ngưỡng và vết sửa. Chỉ người có quyền «Duyệt gắn WBS» (và quản trị) sửa được; người khác thấy con số chỉ để đọc, không có ô nhập và không có nút «Lưu và chạy lại bộ sinh».",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Ngưỡng là gì?",
          doan: [
            "Bộ sinh issue là phần máy tự soi sổ việc để tạo thẻ. Muốn biết «trễ bao nhiêu thì đáng làm thẻ» thì cần một con số, gọi là NGƯỠNG. Có ba ngưỡng: N cho thẻ quá hạn, M cho đề xuất tắc (agent Công việc chưa có nguồn này nên chưa dùng), K cho thẻ xong trên giấy.",
            "Ba ngưỡng dùng chung mọi dự án. Mỗi lần sửa được ghi vết: ai sửa, lúc nào, từ mấy sang mấy.",
          ],
        },
        {
          tieuDe: "② Vì sao phải có?",
          ds: ["Mỗi công trình có nhịp khác nhau: có nơi trễ 3 ngày đã đáng lo, có nơi trễ cả tuần vẫn bình thường. Ngưỡng cho phép chỉnh độ nhạy.", "Ghi vết để biết ai đổi ngưỡng khi số thẻ đột nhiên đổi."],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Bước", "Việc gì", "Vai trò của khung"],
            ["Trước", "Bạn thấy thẻ quá nhiều hoặc quá ít", "Lý do muốn chỉnh"],
            ["Khung này", "Xem hoặc sửa N · M · K", "Màn bạn đang xem"],
            ["Sau", "Máy chạy lại bộ sinh; số thẻ và tên tab đổi theo", "Màn Cảnh báo"],
          ],
        },
        {
          tieuDe: "④ Khung có gì?",
          bang: [
            ["Phần", "Nghĩa"],
            ["Tiêu đề: «Ngưỡng bộ sinh issue · dùng chung mọi dự án» và tên tab", "Đang mở từ tab nào"],
            ["Bảng ba dòng N · M · K (dòng của tab hiện tại có chữ «← tab này»)", "Giá trị ngưỡng bằng ngày"],
            ["Nút «Lưu và chạy lại bộ sinh»", "Chỉ hiện với người sửa được"],
            ["«Vết sửa ngưỡng»", "Tối đa 20 lần sửa gần nhất: giờ, người, trường, từ → sang"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Có quyền thì gõ số mới và bấm «Lưu và chạy lại bộ sinh»", "Người quyết độ nhạy"],
            ["MÁY", "Kiểm số hợp lệ · lưu · so bản cũ với bản mới để ghi vết (không tin chữ gửi lên) · chạy lại bộ sinh ngay", "Cùng ngưỡng thì cùng thẻ"],
            ["🤖 AI", "Khung KHÔNG dùng AI", "Không áp dụng"],
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          doan: ["Không có bước AI. Người đặt số; máy lưu, ghi vết và chạy lại."],
        },
      ],
    },
    {
      ten: "① Xem và sửa",
      khoi: [
        {
          bang: [
            ["Ngưỡng", "Nghĩa", "Mặc định"],
            ["N — ⏰ quá hạn ≥ N ngày thì sinh issue", "Thẻ ở tab «Quá hạn»", "7 ngày"],
            ["M — 🧱 đề xuất dừng ≥ M ngày (chưa có nguồn)", "Chưa dùng ở agent Công việc", "5 ngày"],
            ["K — 📄 ±K ngày quanh ngày xong không có BC ngày", "Thẻ ở tab «Xong trên giấy»", "7 ngày"],
          ],
          bam: [
            "Ở dòng ngưỡng nhỏ dưới hàng đếm bấm «Sửa ngưỡng của tab này →» (người không có quyền thấy «Xem ngưỡng và vết sửa →»).",
            "Gõ số mới vào ô của dòng cần đổi (có thể gõ dạng số Việt Nam).",
            "Bấm «Lưu và chạy lại bộ sinh».",
          ],
          ketQua: [
            "Khung ghi «Đang lưu và chạy lại bộ sinh…» rồi báo kết quả. Số thẻ, tên tab («⏰ Quá hạn ≥ N ngày») đổi theo.",
            "Một dòng mới hiện ở «Vết sửa ngưỡng» với tên người sửa, giờ, và «N: 7 → 3 ngày».",
          ],
          luuY: ["Ngưỡng đổi cho CẢ dự án khác nữa vì dùng chung. Nếu số không hợp lệ (không phải số, âm…), máy từ chối và ghi lý do dưới nút."],
          viDu: ["Tình huống minh hoạ: dự án đang vào giai đoạn gấp, bạn đổi N từ 7 xuống 3 để bắt sớm việc trễ. Sau khi lưu, tab đổi tên thành «⏰ Quá hạn ≥ 3 ngày» và có thêm thẻ cho những người đang trễ từ 3 ngày. Vết sửa ghi tên bạn và «N: 7 → 3 ngày»."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Chỉ thấy số, không có ô nhập", "Bạn thiếu quyền «Duyệt gắn WBS». Nhờ người có quyền sửa."],
            ["Sửa mà số thẻ không đổi", "Máy chạy lại ngay nhưng có thể không có thêm việc nào vượt ngưỡng mới. Mở lại màn để chắc."],
            ["Muốn biết ai đã đổi ngưỡng", "Xem «Vết sửa ngưỡng» ở cuối khung."],
            ["Tab «Do người thêm» và «Đề xuất chờ duyệt» không có ngưỡng", "Hai tab này không dựa trên ngưỡng ngày; chọn tab ⏰ hoặc 📄 để sửa."],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt của Mr. Đại 03/10/2026 (ngưỡng sửa ngay trên màn Cảnh báo, có ghi vết; không thêm vào trang Cài đặt) · mặc định N 7 · M 5 · K 7 theo khuôn agent Base.",
};
