// /api/gop-y/[id] — PUT {trang_thai, tra_loi}: quản trị đặt trạng thái + trả lời. DELETE: xoá
// (người gửi: của mình khi còn "Mới"; quản trị: mọi góp ý).
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
import { duocQuaCua } from "@/lib/quyen";
import { LoiGopY, traLoiGopY, xoaGopY } from "@/lib/gop-y/luu";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function chay(lam: (nd: { email: string; name: string; quanTri: boolean }) => void) {
  const auth = await requireRole("xem");
  if (!auth.ok) return auth.response;
  try {
    lam({ email: auth.session.email, name: auth.session.name, quanTri: duocQuaCua(auth.session.role, "caidat") });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const loi = e instanceof LoiGopY ? e : new LoiGopY(e instanceof Error ? e.message : String(e), 500);
    return NextResponse.json({ ok: false, message: loi.message }, { status: loi.status });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const v = (await req.json().catch(() => ({}))) as { trang_thai?: string; tra_loi?: string | null };
  return chay((nd) => traLoiGopY(nd, params.id, { trang_thai: String(v.trang_thai ?? ""), tra_loi: v.tra_loi }));
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  return chay((nd) => xoaGopY(nd, params.id));
}
