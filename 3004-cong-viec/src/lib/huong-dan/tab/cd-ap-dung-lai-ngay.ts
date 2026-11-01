// Hướng dẫn bản 2 (tab) — hộp «Áp dụng lại quy tắc đè cho việc đang mở» (nút «Áp dụng lại ngay» ở Cài đặt › Quy tắc đè). Viết 20/10/2026.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Hộp «Áp dụng lại quy tắc đè»",
  ai: "Người sửa được mục «Quy tắc đè, việc thiếu hạn» (quyền «cau_hinh.sua» hoặc được phân quyền). Người khác không thấy nút mở hộp này.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        { tieuDe: "① Hộp này là gì", doan: ["Hộp cho bạn xem trước, rồi bấm một lần để máy tính lại mọi việc đang mở theo quy tắc đè ĐANG LƯU: bản nào là bản chuẩn, hạn là ngày nào, việc nào được ghi nhận «đã xong»."] },
        { tieuDe: "② Vì sao cần", doan: ["Khi bạn đã đổi quy tắc từ trước mà công tắc «Áp dụng lại cho việc đang mở khi đổi cài đặt» đang tắt, các việc cũ vẫn mang kết quả theo quy tắc cũ. Hộp này sửa cho khớp quy tắc hiện hành mà không phải đổi cài đặt lần nữa."] },
        { tieuDe: "③ Nằm ở đâu trong vòng làm việc", doan: ["Trước: bạn đã lưu quy tắc mới ở mục «Quy tắc đè, việc thiếu hạn». Hộp này: xem danh sách việc sẽ đổi rồi áp dụng. Sau: Sơ đồ tổ chức, Việc của tôi và chuông 🔔 hiện theo kết quả mới; mỗi việc đổi được ghi vào lịch sử."] },
        {
          tieuDe: "④ Các khối trong hộp",
          bang: [
            ["Khối", "Để làm gì"],
            ["Dòng giải thích", "Nhắc rằng tính theo quy tắc đang lưu và mỗi việc đổi được ghi lịch sử."],
            ["Bảng Mã việc · Nguồn cũ → mới · Hạn cũ → mới · Lý do", "Danh sách việc sẽ đổi. Bấm mã việc để mở việc đó ở Sơ đồ tổ chức (thẻ mới)."],
            ["Nút «Hủy» và «Áp dụng cho N việc»", "Đóng không làm gì, hoặc chạy thật."],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì"],
            ["Người", "Đọc bảng, quyết bấm «Áp dụng cho N việc» hay «Hủy»."],
            ["Máy", "Tính danh sách việc sẽ đổi và áp dụng. Không có bước nào gọi AI."],
            ["🤖 AI", "— Hộp này không dùng AI."],
          ],
        },
        { tieuDe: "⑥ Quy trình người ↔ AI", doan: ["Màn này không dùng AI."] },
      ],
    },
    {
      ten: "① Xem và áp dụng",
      khoi: [
        { doan: ["Hộp mở ra là máy tính ngay danh sách (chữ «Đang tính…»). Bảng trống thì hiện «Không việc đang mở nào đổi nguồn hay hạn theo quy tắc mới.» và nút áp dụng mờ."] },
        { bam: ["Ở mục «Quy tắc đè, việc thiếu hạn» bấm «Áp dụng lại ngay».", "Đọc bảng: cột «Nguồn cũ → mới» (nguồn cũ gạch ngang, nguồn mới đậm), cột «Hạn cũ → mới», cột «Lý do». Dòng xanh «Ghi nhận đã xong» là việc được đóng vì người phụ trách báo xong.", "Hài lòng thì bấm «Áp dụng cho N việc»; muốn thôi bấm «Hủy»."] },
        {
          viDu: [
            "Bảng có 3 dòng. Dòng «Lắp trụ turbine số 5»: nguồn «Ban điều hành» → «Phòng Đầu tư và Pháp chế», hạn 30/10/2026 → 05/11/2026, lý do «cấp cao hơn». Bấm «Áp dụng cho 3 việc» → toast «Đã áp dụng lại quy tắc đè cho 3 việc đang mở».",
          ],
        },
        { ketQua: ["Mỗi việc đổi có một dòng trong Lịch sử. Hộp đóng và danh sách làm mới."] },
        { luuY: ["Áp dụng là hành động ghi thật vào sổ cái (không có nút hoàn tác từng việc); muốn chắc, đọc kỹ bảng trước."] },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Nút «Áp dụng cho 0 việc» mờ", "Không việc nào đổi theo quy tắc hiện hành — không cần áp dụng."],
            ["Hộp báo lỗi", "Có thể mất quyền hoặc máy chủ bận; đóng hộp, thử lại sau ít phút."],
            ["Không thấy nút «Áp dụng lại ngay»", "Bạn chỉ có quyền xem mục này, hoặc đang có thay đổi nháp chưa lưu — lưu hoặc bỏ thay đổi trước."],
          ],
        },
      ],
    },
  ],
  canCu: "Phần áp dụng lại quy tắc đè của sổ cái; mục Cài đặt › Quy tắc đè, việc thiếu hạn.",
};
