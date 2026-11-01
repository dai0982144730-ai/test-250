// Hướng dẫn bản 2 (tab) — menu tên người ở góc phải thanh trên (MÃ menu-ten-nguoi, dùng chung mọi agent). Khuôn gốc: agent Hợp đồng; bản này đồng bộ cho agent Main 20/10/2026.
// Đối chiếu code: components/layout/UserMenu.tsx (có thêm «Nối Telegram» dưới dãy agent) · DayAgent.tsx · lib/lien-ket-agent.ts (DAY_AGENT = 7 agent) · lib/quyen.ts. RIÊNG Main: mục «Nối Telegram»; «Cài đặt» của Main là nơi gốc khai dự án, người dùng, kết nối.
// Chỗ AI: không có (mục «Tài khoản Claude cá nhân» mở màn có nút gọi AI thử — hướng dẫn riêng).
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Menu tên người — cài đặt cá nhân, tài khoản và chuyển sang agent khác",
  ai: "Mọi tài khoản đăng nhập. Chỉ «Cài đặt» có thể hiện mờ (loại tài khoản không phải PM hay Admin; rê chuột thấy lý do «Cài đặt chỉ PM và Admin được làm.»).",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Menu này là gì?",
          doan: ["Bấm vào tên anh chị ở góc phải thanh trên (có chữ cái đầu trong vòng tròn, mũi tên ▾) để mở menu. Gồm các lựa chọn dùng riêng cho người đăng nhập và đường sang các agent khác."],
        },
        {
          tieuDe: "Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Chặng", "Làm gì"],
            ["Bất cứ lúc nào", "Mở menu để đổi giao diện, vào Cài đặt, đổi mật khẩu, đăng xuất hoặc sang agent khác"],
          ],
        },
        {
          tieuDe: "Các mục từ trên xuống",
          bang: [
            ["Mục", "Để làm gì"],
            ["Dòng chữ xám đầu menu", "Đơn vị và chức vụ của anh chị (chưa khai thì hiện email)"],
            ["«Giao diện 3D» · «Giao diện 2D»", "Đổi kiểu giao diện, áp dụng ngay không tải lại trang, nhớ 400 ngày trên trình duyệt này"],
            ["«Cài đặt»", "Cài đặt của Main (PM, Admin) — nơi gốc khai dự án, người dùng, kết nối"],
            ["«Skill AI của tôi»", "Kho kỹ năng cho trợ lý AI — xem hướng dẫn «Skill AI của tôi»"],
            ["«Tài khoản Claude cá nhân»", "Nối tài khoản Claude riêng làm dự phòng — xem hướng dẫn «Tài khoản Claude cá nhân»"],
            ["«Đổi mật khẩu»", "Mở khung đổi mật khẩu — xem hướng dẫn «Đổi mật khẩu»"],
            ["«Đăng xuất»", "Thoát phiên đăng nhập"],
            ["Dãy agent: Agent Quan sát · Agent Main · Agent Công việc · Agent Tiến độ · Agent Hợp đồng · Agent Pháp lý · Agent Nghiệm thu", "Bấm sang agent khác (mở tab mới). Agent đang mở ghi «đang ở đây»; agent chưa bật ghi «chưa đưa lên hoạt động»; agent mật mà anh chị không thuộc dự án thì hiện lý do khoá"],
            ["«Nối Telegram» (cuối menu, riêng Main)", "Nối Telegram của anh chị với trợ lý Main — bấm «? Hướng dẫn» ngay bên phải để xem bài hướng dẫn từng bước có hình"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì"],
            ["NGƯỜI", "Chọn mục cần dùng"],
            ["MÁY", "Hiện đúng mục theo loại tài khoản, dò xem agent nào đang chạy, nhớ kiểu giao diện"],
            ["🤖 AI", "Menu không dùng AI"],
          ],
        },
        {
          tieuDe: "Quy trình người ↔ AI",
          doan: ["Menu này không dùng AI. Hai mục mở ra màn có hướng dẫn riêng về phần liên quan đến AI là «Skill AI của tôi» và «Tài khoản Claude cá nhân»."],
        },
      ],
    },
    {
      ten: "① Dùng menu",
      khoi: [
        {
          tieuDe: "Bấm gì",
          bam: [
            "Bấm tên ở góc phải để mở; bấm ra ngoài hoặc phím Esc để đóng.",
            "Chọn «Giao diện 3D» hoặc «Giao diện 2D» — màn đổi ngay.",
            "Chọn mục cần vào; menu đóng khi sang trang khác.",
            "Muốn sang agent khác bấm tên agent trong dãy — mở ở tab mới, đăng nhập một lần dùng chung.",
          ],
          viDu: ["Tình huống: đang ở Bảng điều hành của Main thấy một dự án có việc găng chậm, muốn xem từng việc ở agent Tiến độ → mở menu tên, bấm «Agent Tiến độ ↗»."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["«Cài đặt» mờ", "Tài khoản là Người dùng hoặc Người xem; cần PM hoặc Admin (rê chuột thấy lý do «Cài đặt chỉ PM và Admin được làm.»)"],
            ["Agent khác ghi «chưa đưa lên hoạt động»", "Agent đó chưa bật hoặc chưa khai địa chỉ"],
            ["Agent khác hiện lý do khoá", "Agent mật: chỉ người thuộc dự án mới vào; nhờ quản trị thêm vào dự án"],
            ["Đổi sang 2D rồi lần sau lại thấy 3D", "Kiểu giao diện nhớ theo trình duyệt; cookie bị xoá hoặc dùng máy khác thì quay về 3D"],
            ["Không thấy «Nối Telegram»", "Mục này chỉ có ở Main, nằm dưới cùng menu, sau dãy agent"],
          ],
        },
      ],
    },
  ],
  canCu: "Mr. Đại chốt 25/09/2026 (menu tên người, dãy agent) · 03/10 và 04/10/2026 (gom về một menu) · luật 17 (nút bị chặn hiện mờ).",
};
