// GET /api/ai/chat/messages?id=<sid> — toàn bộ tin nhắn của 1 phiên (của chính người hỏi)
// → { ok, session: ChatSession }
import { batBuocDangNhap, LoiHttp, xuLy } from "@/lib/phien";
import { getSession, isValidSessionId } from "@/lib/ai/chat-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const id = new URL(req.url).searchParams.get("id") ?? "";
    if (!isValidSessionId(id)) throw new LoiHttp(400, "Thiếu hoặc sai id phiên.");
    const session = getSession(nd.id, id);
    if (!session) throw new LoiHttp(404, "Không tìm thấy phiên chat.");
    return { ok: true, session };
  });
}
