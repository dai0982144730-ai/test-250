// /api/thu-muc — GET: cây thư mục mọi đơn vị · GET ?id=: nội dung một thư mục · POST {cha_id, ten}: tạo thư mục con (Dự án)
import { layQ, tx } from "@/lib/db";
import { batBuocDangNhap, thietBi, xuLy, LoiHttp } from "@/lib/phien";
import { cayThuMuc, noiDungThuMuc, taoThuMucCon } from "@/lib/thu-muc/truy-van";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const id = new URL(req.url).searchParams.get("id");
    const q = await layQ();
    if (id) return noiDungThuMuc(q, nd, id);
    const cay = await cayThuMuc(q, nd);
    return {
      ...cay,
      toi: { id: nd.id, ten: nd.ten, don_vi_id: nd.don_vi_id, chuc_vu: nd.chuc_vu, la_quan_tri: nd.la_quan_tri },
    };
  });
}

export async function POST(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const b = (await req.json().catch(() => null)) as { cha_id?: string; ten?: string } | null;
    if (!b?.cha_id || typeof b.ten !== "string") throw new LoiHttp(400, "Thiếu thư mục cha hoặc tên");
    const tb = thietBi();
    const id = await tx((q) => taoThuMucCon(q, nd, b.cha_id as string, b.ten as string, tb));
    return { id };
  });
}
