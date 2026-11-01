// CHÉP TỪ BẢN CHUNG huong-dan-chung/doi-mat-khau.ts (viết từ agent Hợp đồng) — đã đổi sang agent Main 20/10/2026.
// Hướng dẫn bản 2 (tab) — khung «Đổi mật khẩu» (MÃ doi-mat-khau, dùng chung mọi agent). Viết từ agent Hợp đồng 20/10/2026.
// Agent khác chép về: đổi tên agent. Máy chủ: app/api/auth/change-password/route.ts — đổi ở Main rồi Main đẩy sang các agent (Mr. Đại chốt 04/10).
// Chỗ AI: không có.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Đổi mật khẩu — một mật khẩu dùng chung cho mọi agent",
  ai: "Mọi tài khoản đăng nhập đổi được mật khẩu của chính mình.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Khung này là gì?",
          doan: ["Đổi mật khẩu đăng nhập của chính anh chị. Main là nơi giữ danh sách người dùng gốc: mật khẩu đổi thẳng tại đây rồi Main đẩy sang các agent, nên đổi ở Main là dùng được mật khẩu mới ở mọi agent."],
        },
        {
          tieuDe: "Nằm ở đâu?",
          bang: [
            ["Chặng", "Làm gì"],
            ["Bước trước", "Menu tên người → «Đổi mật khẩu»"],
            ["Khung này", "Nhập mật khẩu cũ và mới"],
            ["Bước sau", "Lần đăng nhập sau, ở agent nào cũng dùng mật khẩu mới"],
          ],
        },
        {
          tieuDe: "Các ô",
          bang: [
            ["Ô / nút", "Nhập gì"],
            ["«Mật khẩu cũ»", "Mật khẩu đang dùng"],
            ["«Mật khẩu mới (≥ 6 ký tự)»", "Mật khẩu mới, từ 6 ký tự trở lên"],
            ["«Đổi mật khẩu» · «Hủy»", "Lưu hoặc thôi. Nút «Đổi mật khẩu» mờ khi một trong hai ô còn trống"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì"],
            ["NGƯỜI", "Nhập hai mật khẩu, bấm «Đổi mật khẩu»"],
            ["MÁY", "Kiểm mật khẩu cũ, ghi mật khẩu mới rồi đẩy sang các agent"],
            ["🤖 AI", "Khung không dùng AI"],
          ],
        },
      ],
    },
    {
      ten: "① Đổi mật khẩu",
      khoi: [
        {
          tieuDe: "Bấm gì",
          bam: [
            "Mở menu tên người → «Đổi mật khẩu».",
            "Gõ «Mật khẩu cũ» và «Mật khẩu mới (≥ 6 ký tự)».",
            "Bấm «Đổi mật khẩu».",
          ],
          ketQua: ["Thành công: thông báo xanh «✓ Đã đổi mật khẩu thành công», khung đóng. Thất bại: khung đỏ nêu lý do."],
          viDu: ["Ví dụ báo lỗi: gõ mật khẩu mới 4 ký tự → «Mật khẩu mới phải có ít nhất 6 ký tự.»"],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Báo mật khẩu cũ sai", "Gõ lại cẩn thận; nếu quên, nhờ Admin đặt lại ở Main"],
            ["Báo không đổi được", "Mật khẩu mới không hợp lệ hoặc máy chủ Main gặp lỗi; đọc dòng đỏ trong khung rồi thử lại"],
            ["Đổi xong agent khác vẫn đòi mật khẩu cũ", "Main đẩy sang agent mất ít phút; thử lại sau"],
          ],
        },
      ],
    },
  ],
  canCu: "Mr. Đại chốt 04/10/2026 (đổi mật khẩu ở mọi agent đi qua Main).",
};
