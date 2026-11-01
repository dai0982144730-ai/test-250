// Trang /chat — TRỢ LÝ AI dạng CỬA SỔ RIÊNG.
//
// Mở bằng window.open("/chat?session=<id>") từ nút "Mở cửa sổ riêng" trong
// khung chat nổi: người dùng kéo cửa sổ này sang màn hình thứ 2, vừa xem
// dashboard vừa hỏi trợ lý.
//
// Server component: chỉ đọc searchParams rồi chuyển tiếp cho <ChatPanel>
// (client component, do agent khác sở hữu — hợp đồng props:
//  { initialSessionId?: string; standalone?: boolean }).
// Quyền: cả bốn loại đều chat được (quyen.ts cửa "xem"); Người xem hỏi được
// nhưng công cụ GHI của trợ lý bị chặn ở chat-tools.ts.

import type { Metadata } from "next";
import { ChatPanel } from "@/components/chat/ChatPanel";

export const metadata: Metadata = {
  title: "Trợ lý AI — Main Agent",
  description: "Cửa sổ trợ lý AI của Main Agent — hỏi 4 agent kia rồi tổng hợp",
};

// Phiên chat đọc từ file theo cookie dự án → không cache trang này
export const dynamic = "force-dynamic";

export default function ChatWindowPage({
  searchParams,
}: {
  searchParams?: { session?: string | string[] };
}) {
  const raw = searchParams?.session;
  const sessionId = Array.isArray(raw) ? raw[0] : raw;

  return (
    <div className="flex h-screen w-full min-h-0 flex-col overflow-hidden bg-[#0a0a0a]">
      <ChatPanel initialSessionId={sessionId} standalone />
    </div>
  );
}
