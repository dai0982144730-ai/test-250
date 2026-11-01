// /api/van-thu/[id]/chuyen — chuyển văn bản đã vào sổ cho đơn vị xử lý (chuyển tiếp nguyên văn). POST {don_vi}
import { tx } from "@/lib/db";
import { batBuocDangNhap, xuLy } from "@/lib/phien";
import { chuyenXuLy } from "@/lib/van-thu/dich-vu";
import { docJson } from "@/lib/gui/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const v = await docJson<{ don_vi: string }>(req);
    const buoc_id = await tx((q) => chuyenXuLy(q, nd, params.id, String(v.don_vi ?? "")));
    return { buoc_id };
  });
}
