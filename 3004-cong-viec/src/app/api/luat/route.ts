// GET  /api/luat?mau=form-7[&ca_da_xoa=1] → { luat: LuatKiemTra[], duoc_sua: boolean }
// POST /api/luat  body LuatNhap (hoặc { luat: LuatNhap }); id rỗng = tạo mới → { luat: LuatKiemTra }
//      Sai → 400 { loi, danh_sach_loi }; không có quyền → 403.
import type { NextRequest } from "next/server";
import { layQ, tx } from "@/lib/db";
import { LoiHttp, batBuocDangNhap, xuLy } from "@/lib/phien";
import { danhSachLuat, duocSuaLuat, luuLuat } from "@/lib/luat/kho-luat";
import type { LuatNhap } from "@/lib/luat/types";
import { traLoiLuat } from "./_chung";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const q = await layQ();
    const mau = req.nextUrl.searchParams.get("mau")?.trim() || undefined;
    const caDaXoa = req.nextUrl.searchParams.get("ca_da_xoa") === "1";
    return { luat: await danhSachLuat(q, { mau_ma: mau, ca_da_xoa: caDaXoa }), duoc_sua: await duocSuaLuat(q, nd) };
  });
}

export async function POST(req: NextRequest) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const body = (await req.json().catch(() => null)) as (LuatNhap & { luat?: LuatNhap }) | null;
    const v = body?.luat ?? body;
    if (!v || typeof v !== "object") throw new LoiHttp(400, "Thiếu dữ liệu luật");
    return traLoiLuat(async () => ({ luat: await tx((q) => luuLuat(q, nd, v)) }));
  });
}
