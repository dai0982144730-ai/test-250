// ============================================================
// /api/ai/chat/sessions — PHIÊN CHAT của Trợ lý SCI công việc (của RIÊNG người đang đăng nhập).
//   GET                        → { ok, sessions: ChatSessionMeta[] } (mới nhất trước)
//   POST   body { title? }     → { ok, session } — tạo phiên mới
//   PATCH  body { id, title }  → { ok, session } — đổi tên
//   DELETE ?id=<sid>           → { ok } — chính chủ
// ============================================================

import { batBuocDangNhap, LoiHttp, xuLy } from "@/lib/phien";
import { createSession, deleteSession, isValidSessionId, listSessions, renameSession, toMeta } from "@/lib/ai/chat-store";
import { docJson } from "@/lib/ai/route-chung";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    return { ok: true, sessions: listSessions(nd.id) };
  });
}

export async function POST(req: Request): Promise<Response> {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const body = await docJson(req, false); // body rỗng cũng hợp lệ (title tùy chọn)
    const title = typeof body.title === "string" ? body.title : undefined;
    return { ok: true, session: toMeta(createSession(nd.id, nd.email, title)) };
  });
}

export async function PATCH(req: Request): Promise<Response> {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const body = await docJson(req);
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!isValidSessionId(id)) throw new LoiHttp(400, "Thiếu hoặc sai id phiên.");
    if (title === "") throw new LoiHttp(400, "Tên phiên không được để trống.");
    const session = renameSession(nd.id, id, title);
    if (!session) throw new LoiHttp(404, "Không tìm thấy phiên chat.");
    return { ok: true, session: toMeta(session) };
  });
}

export async function DELETE(req: Request): Promise<Response> {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const id = new URL(req.url).searchParams.get("id") ?? "";
    if (!isValidSessionId(id)) throw new LoiHttp(400, "Thiếu hoặc sai id phiên.");
    const res = deleteSession(nd.id, id);
    if (!res.ok) throw new LoiHttp(res.status, res.error);
    return { ok: true };
  });
}
