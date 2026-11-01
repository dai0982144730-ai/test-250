// Hướng dẫn bản 2 (tab) — Cài đặt → tab «🔔 Cảnh báo & ngưỡng». Viết 20/10/2026.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Cài đặt — Cảnh báo & ngưỡng",
  ai: "PM và Admin (quyền Cài đặt).",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Tab này là gì, vì sao chỉ có một dòng chỉ đường?",
          doan: ["Cả năm agent đều có tab «🔔 Cảnh báo & ngưỡng» cho đồng bộ. Riêng Main không có ngưỡng cảnh báo riêng — số và ngưỡng nằm ở bốn agent kia. Thứ Main tự nhắc là BÁO CÁO SÁNG: nhịp định kỳ (07:00 hằng ngày, ngày 1 hằng tháng…) và luật động kiểu «tuần này theo dõi sát nhà thầu TS». Hai thứ đó chỉ xem, thêm, xoá ở màn Báo cáo → tab Sáng — một vấn đề một nơi, nên tab này chỉ có nút dẫn đường."],
        },
        {
          tieuDe: "Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Bước trước", "Tab này", "Bước sau"],
            ["Muốn đổi cách Main nhắc chủ động", "Bấm nút «Mở Báo cáo → tab Sáng»", "Sửa luật động, chạy nhịp ở màn Báo cáo"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · AI",
          bang: [
            ["Người", "Máy", "🤖 AI"],
            ["Bấm nút dẫn đường", "Chuyển trang", "Tab này không dùng AI"],
          ],
        },
        {
          tieuDe: "Quy trình người ↔ AI",
          ds: ["Màn này không dùng AI."],
        },
      ],
    },
    {
      ten: "① Đi tới chỗ sửa",
      khoi: [
        {
          bam: ["Bấm «Mở Báo cáo → tab Sáng». Ở đó: khối «Luật động» (đầu tab ①) để dặn theo dõi sát. «Kịch bản định kỳ» để xem hoặc chạy nhịp tay nằm ngay trên màn Cài đặt này, tab 🔔."],
        },
        {
          viDu: ["Muốn dặn «tuần này theo dõi sát nhà thầu TS» thì không tìm ở Cài đặt mà đi nút này sang Báo cáo sáng."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Tôi tìm ngưỡng cảnh báo tiến độ ở đâu", "Ở Cài đặt của Agent Tiến độ; Main không giữ ngưỡng."],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt Mr. Đại 26/09/2026 (một vấn đề một nơi; nhịp và luật động chỉ ở Báo cáo → tab Sáng).",
};
