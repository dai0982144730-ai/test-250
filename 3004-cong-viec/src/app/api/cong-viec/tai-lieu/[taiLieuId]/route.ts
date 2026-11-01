// GET /api/cong-viec/tai-lieu/[taiLieuId] — các việc trong sổ cái sinh từ một tài liệu (mọi phiên bản).
import { layQ } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { coQuyen } from "@sci/identity";
import { viecCuaTaiLieu } from "@/lib/so-cai/doc-them";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { taiLieuId: string } }) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    if (!coQuyen(nd, "so_cai.xem")) throw new LoiHttp(403, "Bạn không có quyền xem sổ cái");
    return { viec: await viecCuaTaiLieu(await layQ(), nd, decodeURIComponent(params.taiLieuId)) };
  });
}
