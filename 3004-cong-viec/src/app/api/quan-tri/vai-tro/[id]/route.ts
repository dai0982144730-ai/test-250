// PATCH /api/quan-tri/vai-tro/:id { ten?, mo_ta?, quyen?: {quyen: phạm_vi | null} } — sửa, bật tắt quyền.
// DELETE — xóa vai trò tự tạo (vai trò hệ thống không xóa được).
import type { NextRequest } from "next/server";
import { tx } from "@/lib/db";
import type { PhamVi, Quyen } from "@/lib/types";
import { LoiHttp } from "@/lib/phien";
import { datQuyenVaiTro, suaVaiTro, xoaVaiTro, layVaiTro } from "@sci/identity/server";
import { xuLyIdentity } from "@/lib/cau-hinh/cau-noi-identity";
import { batBuocQuanTri, kiemSuaVaiTro } from "../../_chung";

export const dynamic = "force-dynamic";

type Ts = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Ts) {
  return xuLyIdentity(async () => {
    const p = await batBuocQuanTri();
    const id = decodeURIComponent(params.id);
    const v = (await req.json().catch(() => null)) as { ten?: string; mo_ta?: string | null; quyen?: Partial<Record<Quyen, PhamVi | null>> } | null;
    if (!v) throw new LoiHttp(400, "Thiếu dữ liệu");
    kiemSuaVaiTro(p.nd, v.quyen);
    return {
      vai_tro: await tx(async (q) => {
        if (v.ten !== undefined || v.mo_ta !== undefined) await suaVaiTro(q, p.ng, id, { ten: v.ten, mo_ta: v.mo_ta });
        if (v.quyen) await datQuyenVaiTro(q, p.ng, id, v.quyen);
        return layVaiTro(q, id);
      }),
    };
  });
}

export async function DELETE(_req: NextRequest, { params }: Ts) {
  return xuLyIdentity(async () => {
    const p = await batBuocQuanTri();
    kiemSuaVaiTro(p.nd);
    await tx((q) => xoaVaiTro(q, p.ng, decodeURIComponent(params.id)));
    return { ok: true };
  });
}
