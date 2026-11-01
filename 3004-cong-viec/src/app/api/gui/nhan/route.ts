// /api/gui/nhan — nơi nhận bấm Nhận. POST {buoc_id}
import { tx } from "@/lib/db";
import { batBuocDangNhap, xuLy } from "@/lib/phien";
import { nhan } from "@/lib/gui/dich-vu";
import { docJson } from "@/lib/gui/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const v = await docJson<{ buoc_id: string }>(req);
    await tx((q) => nhan(q, nd, String(v.buoc_id ?? "")));
    return { ok: true };
  });
}
