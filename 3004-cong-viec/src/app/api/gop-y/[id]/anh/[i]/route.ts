// /api/gop-y/[id]/anh/[i] — ảnh thứ i của một góp ý (xem tại chỗ trong trình duyệt).
import { layQ } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { docTep } from "@/lib/luu-tru/kho";
import { anhGopY } from "@/lib/gop-y/dich-vu";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string; i: string } }) {
  return xuLy(async () => {
    await batBuocDangNhap();
    const a = await anhGopY(await layQ(), params.id, Number(params.i));
    if (!a) throw new LoiHttp(404, "Không có ảnh này");
    return new Response(new Uint8Array(await docTep(a.khoa)), { headers: { "Content-Type": a.loai, "Cache-Control": "private, max-age=86400" } });
  });
}
