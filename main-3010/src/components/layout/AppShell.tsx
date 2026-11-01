"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";

/**
 * Khung app: /login và /chat (cửa sổ popup trợ lý AI) render full-screen
 * không Sidebar, mọi trang khác render Sidebar + main như cũ.
 *
 * Khi trợ lý AI ở chế độ NEO, ChatWidget ghi 2 biến CSS lên <html>:
 * `--chat-dock-l` (neo mép TRÁI) và `--chat-dock-r` (neo mép PHẢI); bên
 * không neo = 0px, float/đóng/popout = cả hai 0px. Lớp bọc dưới đây biến
 * chúng thành padding-left / padding-right nên toàn bộ nội dung (kể cả
 * Sidebar) bị ĐẨY sang bên còn lại thay vì bị khung chat che.
 * `--chat-dock-anim` = 0ms lúc đang kéo thanh resize để app bám tay,
 * 150ms lúc đóng/mở/đổi chế độ. Hai trang full-screen KHÔNG áp padding.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login" || pathname === "/chat") {
    return <>{children}</>;
  }

  return (
    <div
      style={{
        paddingLeft: "var(--chat-dock-l, 0px)",
        paddingRight: "var(--chat-dock-r, 0px)",
        transition:
          "padding-left var(--chat-dock-anim, 150ms) ease, padding-right var(--chat-dock-anim, 150ms) ease",
      }}
    >
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
