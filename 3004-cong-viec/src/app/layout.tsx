import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import "./phong.css";
// Thang chữ +2px chỉ trong khung .thang-chu (Việc của tôi · Gửi báo cáo · Cài đặt) — GIAO-DIEN-CHUNG 3.5, 09/10
import "./thang-chu.css";
import { AppShell } from "@/components/layout/AppShell";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { khoiDongHenGio } from "@/lib/so-cai/hen-gio";
import { COOKIE_KIEU_VE } from "@/lib/phong/giao-dien";
import BoiKhongBam from "@/components/layout/BoiKhongBam";

// Bộ hẹn giờ nhắc hạn: bật một lần cùng tiến trình server (hàm tự chống bật trùng)
khoiDongHenGio();

export const metadata: Metadata = {
  title: "SCI công việc",
  description: "Giao việc bằng tài liệu. Sổ cái biết việc nào đang chạy — docflow.scigroup.vn",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Giao diện 2D (Mr. Đại chốt 29/09): cookie sci_kieu_ve → máy chủ gắn sẵn data-giao-dien, lần tải đầu không nháy 3D
  const la2d = cookies().get(COOKIE_KIEU_VE)?.value === "2d";
  return (
    // data-theme: sáng/tối (Mr. Đại 26/10/2026) — mặc định TỐI; script trong <head> gắn lựa chọn đã nhớ trước khi vẽ, không nháy
    <html lang="vi" data-theme="dark" data-giao-dien={la2d ? "2d" : "3d"} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t;}catch(e){}" }} />
      </head>
      <body className="font-sans antialiased">
        <AppShell>{children}</AppShell>
        {/* Khung chat nổi trợ lý AI — hiện trên mọi trang (tự ẩn ở /login, /chat) */}
        <ChatWidget />
        {/* Kéo chuột bôi chữ trong nút / link thì không tính là bấm (E45 — Mr. Đại 11/10) */}
        <BoiKhongBam />
      </body>
    </html>
  );
}
