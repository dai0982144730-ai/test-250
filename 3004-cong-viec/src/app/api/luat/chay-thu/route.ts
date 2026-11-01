// POST /api/luat/chay-thu { luat: LuatNhap, gioi_han?: number, gioi_han_ai?: number } → KetQuaChayThu
// Chạy thử một luật (chưa lưu cũng được) trên phiên bản hiện tại của các tài liệu đã có. Chỉ người sửa được luật.
import type { NextRequest } from "next/server";
import { layQ } from "@/lib/db";
import { LoiHttp, batBuocDangNhap, xuLy } from "@/lib/phien";
import { duocSuaLuat } from "@/lib/luat/kho-luat";
import { chayThuLuat } from "@/lib/luat/chay-luat";
import type { LuatNhap } from "@/lib/luat/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const q = await layQ();
    if (!(await duocSuaLuat(q, nd))) throw new LoiHttp(403, "Bạn không có quyền chạy thử luật kiểm tra");
    const body = (await req.json().catch(() => null)) as { luat?: LuatNhap; gioi_han?: number; gioi_han_ai?: number } | null;
    if (!body?.luat || typeof body.luat !== "object") throw new LoiHttp(400, "Thiếu luật để chạy thử");
    return chayThuLuat(q, body.luat, { gioi_han: body.gioi_han, gioi_han_ai: body.gioi_han_ai });
  });
}
