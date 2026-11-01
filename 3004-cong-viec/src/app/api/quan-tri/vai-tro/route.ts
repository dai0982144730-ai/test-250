// GET /api/quan-tri/vai-tro — vai trò + quyền (ma trận) + danh mục quyền.
// POST — tạo vai trò { id?, ten, mo_ta, quyen }.
import type { NextRequest } from "next/server";
import { tx } from "@/lib/db";
import { DANH_MUC_QUYEN, type PhamVi, type Quyen } from "@/lib/types";
import { LoiHttp } from "@/lib/phien";
import { danhSachVaiTro, laQuanTriToanBo, taoVaiTro } from "@sci/identity/server";
import { xuLyIdentity } from "@/lib/cau-hinh/cau-noi-identity";
import { batBuocQuanTri, kiemSuaVaiTro } from "../_chung";

export const dynamic = "force-dynamic";

export async function GET() {
  return xuLyIdentity(async () => {
    const p = await batBuocQuanTri();
    return {
      vai_tro: await danhSachVaiTro(p.q),
      danh_muc_quyen: DANH_MUC_QUYEN,
      sua_duoc: laQuanTriToanBo(p.nd),
      quyen_cua_toi: p.nd.la_quan_tri ? null : p.nd.quyen,
    };
  });
}

export async function POST(req: NextRequest) {
  return xuLyIdentity(async () => {
    const p = await batBuocQuanTri();
    const v = (await req.json().catch(() => null)) as { id?: string; ten: string; mo_ta?: string; quyen?: Partial<Record<Quyen, PhamVi>> } | null;
    if (!v) throw new LoiHttp(400, "Thiếu dữ liệu vai trò");
    kiemSuaVaiTro(p.nd, v.quyen);
    // Vai trò tạo trên web luôn là vai trò thường (xóa được) — không nhận cờ he_thong từ ngoài
    return { vai_tro: await tx((q) => taoVaiTro(q, p.ng, { id: v.id, ten: v.ten, mo_ta: v.mo_ta, quyen: v.quyen })) };
  });
}
