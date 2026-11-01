// GET    /api/luat/:id → { luat: LuatKiemTra }
// DELETE /api/luat/:id → { ok: true } (xóa mềm; luật hệ thống → 409; không có quyền → 403)
import { layQ, tx } from "@/lib/db";
import { LoiHttp, batBuocDangNhap, xuLy } from "@/lib/phien";
import { layLuat, xoaLuat } from "@/lib/luat/kho-luat";

export const dynamic = "force-dynamic";

type Ts = { params: { id: string } };

export async function GET(_req: Request, { params }: Ts) {
  return xuLy(async () => {
    await batBuocDangNhap();
    const l = await layLuat(await layQ(), params.id);
    if (!l) throw new LoiHttp(404, "Không tìm thấy luật");
    return { luat: l };
  });
}

export async function DELETE(_req: Request, { params }: Ts) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    await tx((q) => xoaLuat(q, nd, params.id));
    return { ok: true };
  });
}
