// POST /api/luat/:id/quay-lai { phien_ban } → { luat: LuatKiemTra } (lưu thành phiên bản MỚI mang nội dung bản cũ)
//      Bản cũ không còn hợp lệ → 400 { loi, danh_sach_loi }.
import type { NextRequest } from "next/server";
import { tx } from "@/lib/db";
import { LoiHttp, batBuocDangNhap, xuLy } from "@/lib/phien";
import { quayLaiLuat } from "@/lib/luat/kho-luat";
import { traLoiLuat } from "../../_chung";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const body = (await req.json().catch(() => null)) as { phien_ban?: number } | null;
    const pb = Number(body?.phien_ban);
    if (!Number.isInteger(pb) || pb < 1) throw new LoiHttp(400, "Thiếu số phiên bản cần quay lại");
    return traLoiLuat(async () => ({ luat: await tx((q) => quayLaiLuat(q, nd, params.id, pb)) }));
  });
}
