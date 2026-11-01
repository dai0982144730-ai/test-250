// /api/gui/tra-lai — trả lại người gửi, BẮT BUỘC lý do. POST {buoc_id, ly_do}
import { tx } from "@/lib/db";
import { batBuocDangNhap, xuLy } from "@/lib/phien";
import { traLai } from "@/lib/gui/dich-vu";
import { docJson } from "@/lib/gui/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const v = await docJson<{ buoc_id: string; ly_do: string }>(req);
    const buoc_id = await tx((q) => traLai(q, nd, { buoc_id: String(v.buoc_id ?? ""), ly_do: String(v.ly_do ?? "") }));
    return { buoc_id };
  });
}
