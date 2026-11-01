// Trả ảnh đã dán trong màn Kịch bản test.
// GET /api/kiem-thu/anh?ten=<tên file>

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
import { resolveProjectId } from "@/lib/projects";
import { docAnh } from "@/lib/kiem-thu/so-ket-qua";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(req: Request): Promise<NextResponse> {
  const auth = await requireRole("xem");
  if (!auth.ok) return auth.response;

  const ten = new URL(req.url).searchParams.get("ten") ?? "";
  const buf = docAnh(resolveProjectId(null), ten);
  if (!buf) return NextResponse.json({ ok: false, message: "Không tìm thấy ảnh." }, { status: 404 });

  const duoi = ten.split(".").pop()?.toLowerCase() ?? "png";
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": MIME[duoi] ?? "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
