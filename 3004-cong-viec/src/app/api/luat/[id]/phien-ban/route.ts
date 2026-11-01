// GET /api/luat/:id/phien-ban → { phien_ban: { phien_ban, gia_tri: LuatKiemTra, boi, luc, ghi_chu? }[] } (mới nhất trước)
import { layQ } from "@/lib/db";
import { LoiHttp, batBuocDangNhap, xuLy } from "@/lib/phien";
import { layLuat, phienBanLuat } from "@/lib/luat/kho-luat";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return xuLy(async () => {
    await batBuocDangNhap();
    const q = await layQ();
    if (!(await layLuat(q, params.id))) throw new LoiHttp(404, "Không tìm thấy luật");
    return { phien_ban: await phienBanLuat(q, params.id) };
  });
}
