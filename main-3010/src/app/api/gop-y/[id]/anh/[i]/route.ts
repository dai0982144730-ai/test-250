// /api/gop-y/[id]/anh/[i] — ảnh đính kèm góp ý (ai đăng nhập cũng xem được, như danh sách góp ý)
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
import { docAnhGopY } from "@/lib/gop-y/luu";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string; i: string } }) {
  const auth = await requireRole("xem");
  if (!auth.ok) return auth.response;
  const a = docAnhGopY(params.id, Number(params.i));
  if (!a) return NextResponse.json({ ok: false, message: "Không có ảnh này." }, { status: 404 });
  return new Response(new Uint8Array(a.noiDung), { headers: { "content-type": a.loai, "x-content-type-options": "nosniff", "cache-control": "private, max-age=3600" } });
}
