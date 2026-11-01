// /api/gui/hoan-thanh — nhận, lưu, hoàn thành: nhánh hành trình dừng tại đây. POST {buoc_id}
import { tx } from "@/lib/db";
import { batBuocDangNhap, xuLy } from "@/lib/phien";
import { hoanThanh } from "@/lib/gui/dich-vu";
import { docJson } from "@/lib/gui/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const v = await docJson<{ buoc_id: string }>(req);
    await tx((q) => hoanThanh(q, nd, String(v.buoc_id ?? "")));
    return { ok: true };
  });
}
