// POST /api/projects/select — chọn dự án đang làm việc (set cookie sci_project).
// HỢP ĐỒNG: xem comment đầu src/lib/projects.ts.
//
// - Mọi role đã đăng nhập; body { id }.
// - Kiểm: dự án tồn tại (404), chưa lưu trữ + có quyền truy cập (403).
// - Thành công → { ok: true } + Set-Cookie sci_project (httpOnly, lax, 1 năm).

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
import {
  PROJECT_COOKIE,
  canAccessProjectByEmail,
  getProject,
  sanitizeProjectId,
} from "@/lib/projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function POST(req: Request): Promise<NextResponse> {
  const auth = await requireRole("xem");
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
  const id = sanitizeProjectId(body?.id);
  if (!id) {
    return NextResponse.json(
      { ok: false, message: "Thiếu hoặc sai id dự án cần chọn." },
      { status: 400 }
    );
  }

  const project = getProject(id);
  if (!project) {
    return NextResponse.json(
      { ok: false, message: `Không tìm thấy dự án "${id}".` },
      { status: 404 }
    );
  }
  if (project.archived === true) {
    return NextResponse.json(
      { ok: false, message: "Dự án đã được lưu trữ — bỏ lưu trữ trước khi chọn." },
      { status: 403 }
    );
  }
  if (!canAccessProjectByEmail(auth.session.email, auth.session.role, id)) {
    return NextResponse.json(
      { ok: false, message: "Bạn không có quyền truy cập dự án này." },
      { status: 403 }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(PROJECT_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });
  return res;
}
