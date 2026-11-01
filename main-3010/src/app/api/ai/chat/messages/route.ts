// ============================================================
// GET /api/ai/chat/messages?id=<sid> — TOÀN BỘ tin nhắn của 1 phiên chat
// → { ok, session: ChatSession, choDuyet: ViecChoGon[] } (mọi loại tài khoản).
// HỢP ĐỒNG: xem comment đầu src/lib/ai/chat-types.ts.
// ĐA DỰ ÁN: ?project= đè cookie sci_project.
// ============================================================

import { NextResponse } from "next/server";
import { getSessionCuaNguoi, isValidSessionId } from "@/lib/ai/chat-store";
import { viecChoCuaPhien } from "@/lib/ai/cho-duyet-kho";
import { canAccessProjectByEmail, resolveProjectId } from "@/lib/projects";
import { LY_DO_TRO_LY } from "@/lib/quyen";
import { requireRole } from "@/lib/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
  // Người xem KHÔNG dùng trợ lý AI trong mọi tình huống (Mr. Đại chốt 04/10 — tốn chi phí công ty)
  const auth = await requireRole("ghi", LY_DO_TRO_LY);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const projectId = resolveProjectId(url.searchParams.get("project"));
  if (!canAccessProjectByEmail(auth.session.email, auth.session.role, projectId)) {
    return NextResponse.json(
      { ok: false, message: "Bạn không có quyền truy cập dự án này." },
      { status: 403 }
    );
  }

  const id = url.searchParams.get("id") ?? "";
  if (!isValidSessionId(id)) {
    return NextResponse.json({ ok: false, message: "Thiếu hoặc sai id phiên." }, { status: 400 });
  }
  // Chỉ phiên CHÍNH người này (chốt 04/10) — phiên người khác trả 404 như không có
  const session = getSessionCuaNguoi(projectId, id, auth.session.email);
  if (!session) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy phiên chat." }, { status: 404 });
  }
  // Nút ✅ Làm / ❌ Bỏ còn chờ của CHÍNH người này trong phiên — tải lại trang vẫn bấm được
  return NextResponse.json({
    ok: true,
    session,
    choDuyet: viecChoCuaPhien(projectId, id, auth.session.email, "web"),
  });
}
