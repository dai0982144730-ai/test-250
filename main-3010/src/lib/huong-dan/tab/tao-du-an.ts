// Hướng dẫn bản 2 (tab) — khung «Tạo dự án mới» (nút dự án ở thanh trên). Viết 20/10/2026.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Tạo dự án mới",
  ai: "PM và Admin (quyền Cài đặt). Người khác thấy nút «Tạo dự án mới» mờ, rê chuột có lý do.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Khung này là gì, vì sao cần?",
          doan: ["Nút dự án ở thanh trên là nơi chọn dự án đang làm việc (bấm một dòng là đổi luôn, tất cả màn đổi theo). Cuối danh sách có «Tạo dự án mới» để khai một dự án mới: tên và ngày khởi công. Main là nơi gốc khai dự án; bốn agent kia kéo về."],
        },
        {
          tieuDe: "Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Bước trước", "Khung này", "Bước sau"],
            ["Có dự án mới cần theo dõi", "Tạo dự án (tên, ngày khởi công)", "Cài đặt → 📁 Quản lý dự án để khai thêm: toạ độ công trường, đơn vị…; các agent kéo dự án về"],
          ],
        },
        {
          tieuDe: "Các ô",
          bang: [
            ["Ô", "Để làm gì"],
            ["Tên dự án (bắt buộc)", "Ví dụ: Điện gió Hướng Phùng 2"],
            ["Ngày khởi công", "Không bắt buộc, dd/mm/yyyy"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · AI",
          bang: [
            ["Người", "Máy", "🤖 AI"],
            ["Gõ tên, chọn ngày, bấm tạo", "Tạo dự án, tự chọn dự án mới làm dự án đang làm việc", "Khung này không dùng AI"],
          ],
        },
        {
          tieuDe: "Quy trình người ↔ AI",
          ds: ["Màn này không dùng AI."],
        },
      ],
    },
    {
      ten: "① Tạo dự án",
      khoi: [
        {
          bam: ["Bấm nút tên dự án ở thanh trên, kéo xuống bấm «Tạo dự án mới».", "Gõ tên dự án (dấu * là bắt buộc).", "Chọn ngày khởi công nếu có.", "Bấm «Tạo dự án» (mờ khi chưa gõ tên). «Hủy», bấm ra ngoài hoặc ESC để huỷ."],
        },
        {
          ketQua: ["Dự án mới được tạo và chọn làm dự án đang làm việc; máy chuyển về trang chủ Main của dự án đó."],
        },
        {
          viDu: ["Tên «Điện gió Hướng Phùng 2» với ngày khởi công 01/03/2027: dự án xuất hiện trong danh sách nút dự án, chưa có số tiến độ cho tới khi agent Tiến độ nạp dữ liệu."],
        },
        {
          luuY: ["Tên trùng hoặc để trống sẽ báo lỗi ngay trong khung.", "Dự án mới chưa có dữ liệu — các khối ở Bảng điều hành ghi «Chưa lấy được» là bình thường."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Nút «Tạo dự án mới» mờ", "Cần quyền Cài đặt (PM hoặc Admin)."],
            ["Tạo xong không thấy ở agent khác", "Agent kia kéo dự án từ Main; vào Cài đặt của agent đó bấm «↻ Kéo lại từ Main»."],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt Mr. Đại 11/09/2026 (Main là bản gốc khai dự án).",
};
