// GET /api/luat/loai → { loai: { ma, ten, mo_ta, vi_du, tham_so: ThamSoDinhNghia[] }[] } — 11 dạng luật code (không trả hàm kiem)
import { batBuocDangNhap, xuLy } from "@/lib/phien";
import { LOAI_LUAT } from "@/lib/luat/loai-luat";

export const dynamic = "force-dynamic";

export async function GET() {
  return xuLy(async () => {
    await batBuocDangNhap();
    return {
      loai: Object.values(LOAI_LUAT).map(({ ma, ten, mo_ta, vi_du, tham_so }) => ({ ma, ten, mo_ta, vi_du, tham_so })),
    };
  });
}
