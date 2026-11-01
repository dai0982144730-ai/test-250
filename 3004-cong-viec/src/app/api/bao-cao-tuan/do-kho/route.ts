// PUT /api/bao-cao-tuan/do-kho { cong_viec_id, diem } — Ban lãnh đạo sửa độ khó (chọn là áp dụng; người sửa thắng AI).
import { tx } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { suaDoKho } from "@/lib/bao-cao-tuan/do-kho";

export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const b = (await req.json().catch(() => null)) as { cong_viec_id?: string; diem?: number } | null;
    if (!b?.cong_viec_id || b.diem == null) throw new LoiHttp(400, "Thiếu việc hoặc điểm");
    await tx((q) => suaDoKho(q, nd, b.cong_viec_id!, Number(b.diem)));
    return { ok: true };
  });
}
