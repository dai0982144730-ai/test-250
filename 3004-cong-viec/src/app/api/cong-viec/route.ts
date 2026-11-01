// POST /api/cong-viec — giao việc tay (DauVaoGiaoViec). Trả { ma_viec }.
import { tx } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { giaoViec, type DauVaoGiaoViec } from "@/lib/so-cai/dich-vu";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const v = (await req.json().catch(() => null)) as DauVaoGiaoViec | null;
    if (!v) throw new LoiHttp(400, "Thiếu nội dung");
    // Giao tay không tự nhận là quyết định TGĐ — quyết định đi qua /api/cong-viec/quyet-dinh
    return { ma_viec: await tx((q) => giaoViec(q, nd, { ...v, la_quyet_dinh: false, tu_tai_lieu: null })) };
  });
}
