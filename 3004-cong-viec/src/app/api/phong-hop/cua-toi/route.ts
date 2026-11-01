// /api/phong-hop/cua-toi — cuộc họp tôi được mời còn chưa kết thúc (dòng chữ đỏ ở thanh trên, cả chuông nhúng ở agent khác).
//   GET → { hop: HopCuaToi[], bay } · POST { ids } → đánh dấu đã xem (thôi nhấp nháy tới 15 phút trước giờ họp)
import { layQ, tx } from "@/lib/db";
import { batBuocDangNhap, xuLy } from "@/lib/phien";
import { daXemHop, hopCuaToi } from "@/lib/phong-hop/dich-vu";
import { bayGioVN } from "@/lib/phong-hop/thuan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    return { hop: await hopCuaToi(await layQ(), nd.id), bay: bayGioVN() };
  });
}

export async function POST(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const b = (await req.json().catch(() => ({}))) as { ids?: unknown };
    const ids = Array.isArray(b.ids) ? b.ids.map(Number).filter((x) => Number.isInteger(x) && x > 0) : [];
    await tx((q) => daXemHop(q, nd.id, ids));
    return { ok: true };
  });
}
