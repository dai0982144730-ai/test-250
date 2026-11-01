// Trang /chat — TRỢ LÝ DOCFLOW dạng CỬA SỔ RIÊNG (lấy nguyên từ agent tiến độ).
//
// Mở bằng window.open("/chat?session=<id>") từ nút "Mở cửa sổ riêng" trong
// khung chat nổi: người dùng kéo cửa sổ này sang màn hình thứ 2.
// Server component: chỉ đọc searchParams rồi chuyển tiếp cho <ChatPanel standalone>.
// Đăng nhập do middleware lo (chưa đăng nhập → /login).

import type { Metadata } from "next";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

export const metadata: Metadata = {
  title: "Trợ lý SCI công việc — SCI công việc",
  description: "Cửa sổ Trợ lý SCI công việc: hỏi về tài liệu, sổ cái, lịch sử",
};

// Phiên chat đọc từ file theo người dùng → không cache trang này
export const dynamic = "force-dynamic";

export default function ChatWindowPage({ searchParams }: { searchParams?: { session?: string | string[] } }) {
  const raw = searchParams?.session;
  const sessionId = Array.isArray(raw) ? raw[0] : raw;
  return (
    <div className="flex h-screen min-h-0 w-full flex-col overflow-hidden bg-bg">
      <KhaiHuongDan ma="tro-ly-chat" uuTien={1} />
      <KhaiHuongDan ma="tro-ly-chat-xuat" uuTien={0} />
      <ChatPanel initialSessionId={sessionId} standalone />
    </div>
  );
}
