// ============================================================
// /api/ai/chat/sessions — QUẢN LÝ PHIÊN CHAT của TRỢ LÝ AI (pm | engineer).
//   GET    ?project=<id>        → { ok, sessions: ChatSessionMeta[] } (mới nhất trước)
//          CHỈ phiên của chính người đăng nhập (Mr. Đại chốt 04/10 — lịch sử theo tài khoản)
//   POST   body { title? }      → { ok, session } — tạo phiên mới
//   PATCH  body { id, title }   → { ok, session } — đổi tên
//   DELETE ?id=<sid>            → { ok } — chỉ chính chủ (phiên người khác = 404 như không có)
// HỢP ĐỒNG: xem comment đầu src/lib/ai/chat-types.ts.
// ĐA DỰ ÁN: ?project= đè cookie sci_project (như các route dữ liệu khác).
// ============================================================

import { NextResponse } from "next/server";
import {
  createSession,
  deleteSession,
  isValidSessionId,
  listSessions,
  renameSession,
  toMeta,
} from "@/lib/ai/chat-store";
import { canAccessProjectByEmail, resolveProjectId } from "@/lib/projects";
import { requireRole } from "@/lib/route-auth";
import { LY_DO_TRO_LY, type Role } from "@/lib/quyen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Guard =
  | { ok: true; email: string; role: Role; projectId: string }
  | { ok: false; response: NextResponse };

/** Đăng nhập + role + quyền truy cập dự án (dùng chung cho 4 method) */
async function guard(req: Request): Promise<Guard> {
  // Người xem KHÔNG dùng trợ lý AI trong mọi tình huống (Mr. Đại chốt 04/10 — tốn chi phí công ty)
  const auth = await requireRole("ghi", LY_DO_TRO_LY);
  if (!auth.ok) return { ok: false, response: auth.response };
  const projectId = resolveProjectId(new URL(req.url).searchParams.get("project"));
  if (!canAccessProjectByEmail(auth.session.email, auth.session.role, projectId)) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, message: "Bạn không có quyền truy cập dự án này." },
        { status: 403 }
      ),
    };
  }
  return {
    ok: true,
    email: auth.session.email,
    role: auth.session.role,
    projectId,
  };
}

async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await req.json();
    if (body === null || typeof body !== "object" || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function GET(req: Request): Promise<NextResponse> {
  const g = await guard(req);
  if (!g.ok) return g.response;
  return NextResponse.json({ ok: true, sessions: listSessions(g.projectId, g.email) });
}

export async function POST(req: Request): Promise<NextResponse> {
  const g = await guard(req);
  if (!g.ok) return g.response;
  const body = await readJson(req); // body rỗng cũng hợp lệ (title tùy chọn)
  const title = typeof body?.title === "string" ? body.title : undefined;
  try {
    const session = createSession(g.projectId, g.email, title);
    return NextResponse.json({ ok: true, session: toMeta(session) });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        message: `Không tạo được phiên chat: ${e instanceof Error ? e.message : String(e)}`,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request): Promise<NextResponse> {
  const g = await guard(req);
  if (!g.ok) return g.response;
  const body = await readJson(req);
  if (!body) {
    return NextResponse.json(
      { ok: false, message: "Body phải là JSON { id, title }." },
      { status: 400 }
    );
  }
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!isValidSessionId(id)) {
    return NextResponse.json({ ok: false, message: "Thiếu hoặc sai id phiên." }, { status: 400 });
  }
  if (title === "") {
    return NextResponse.json(
      { ok: false, message: "Tên phiên không được để trống." },
      { status: 400 }
    );
  }
  try {
    const session = renameSession(g.projectId, id, title, g.email);
    if (!session) {
      return NextResponse.json(
        { ok: false, message: "Không tìm thấy phiên chat." },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, session: toMeta(session) });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        message: `Không đổi tên được phiên: ${e instanceof Error ? e.message : String(e)}`,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request): Promise<NextResponse> {
  const g = await guard(req);
  if (!g.ok) return g.response;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!isValidSessionId(id)) {
    return NextResponse.json({ ok: false, message: "Thiếu hoặc sai id phiên." }, { status: 400 });
  }
  const res = deleteSession(g.projectId, id, g.email);
  if (!res.ok) {
    return NextResponse.json({ ok: false, message: res.error }, { status: res.status });
  }
  return NextResponse.json({ ok: true });
}
