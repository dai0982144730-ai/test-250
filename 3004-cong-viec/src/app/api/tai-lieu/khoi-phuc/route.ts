// /api/tai-lieu/khoi-phuc — POST {vi_tri_id}: đưa tài liệu từ Thùng rác về thư mục cũ theo quyền tai_lieu.khoi_phuc
import { tx } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { khoiPhucViTri } from "@/lib/thu-muc/dich-vu";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const b = (await req.json().catch(() => null)) as { vi_tri_id?: string } | null;
    if (!b?.vi_tri_id) throw new LoiHttp(400, "Thiếu vị trí tài liệu");
    await tx((q) => khoiPhucViTri(q, nd, b.vi_tri_id as string));
    return { ok: true };
  });
}
