// /api/gop-y — GÓP Ý, PHẢN ÁNH (Mr. Đại chốt 03/10/2026). GET: mọi góp ý (ai đăng nhập cũng xem được).
// POST multipart {tieu_de, noi_dung, trang, anh (nhiều file ảnh)}: gửi góp ý.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
import { duocQuaCua } from "@/lib/quyen";
import { danhSachGopY, guiGopY, LoiGopY } from "@/lib/gop-y/luu";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireRole("xem");
  if (!auth.ok) return auth.response;
  return NextResponse.json({ ok: true, gop_y: danhSachGopY(), toi: auth.session.email, la_quan_tri: duocQuaCua(auth.session.role, "caidat") });
}

export async function POST(req: Request) {
  const auth = await requireRole("xem");
  if (!auth.ok) return auth.response;
  try {
    const fd = await req.formData();
    const anh = await Promise.all(
      fd
        .getAll("anh")
        .filter((f): f is File => typeof f !== "string")
        .map(async (f) => ({ ten: f.name || "anh.png", loai: f.type || "application/octet-stream", noiDung: Buffer.from(await f.arrayBuffer()) })),
    );
    const r = guiGopY(
      { email: auth.session.email, name: auth.session.name, quanTri: duocQuaCua(auth.session.role, "caidat") },
      { tieu_de: String(fd.get("tieu_de") ?? ""), noi_dung: String(fd.get("noi_dung") ?? ""), trang: String(fd.get("trang") ?? "") || null, anh },
    );
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    const loi = e instanceof LoiGopY ? e : new LoiGopY(e instanceof Error ? e.message : String(e), 500);
    return NextResponse.json({ ok: false, message: loi.message }, { status: loi.status });
  }
}
