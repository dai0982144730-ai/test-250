// /api/phong/giai-doan
//   PUT  { cong_viec_id, giai_doan } — người sửa giai đoạn PMP của một việc (chọn là áp dụng; AI không xếp đè lại)
//   POST — 🤖 xếp ngay một lượt các việc chưa có giai đoạn (quản trị; bình thường máy tự xếp nền mỗi 2 phút)
import { tx } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { coQuyen } from "@sci/identity";
import { suaGiaiDoan, xepGiaiDoanNen } from "@/lib/phong/giai-doan";

export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    if (!coQuyen(nd, "so_cai.xem")) throw new LoiHttp(403, "Bạn không có quyền xem sổ cái");
    const b = (await req.json().catch(() => null)) as { cong_viec_id?: string; giai_doan?: string } | null;
    if (!b?.cong_viec_id || !b.giai_doan) throw new LoiHttp(400, "Thiếu việc hoặc giai đoạn");
    await tx((q) => suaGiaiDoan(q, nd, b.cong_viec_id!, b.giai_doan!));
    return { ok: true };
  });
}

export async function POST() {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    if (!nd.la_quan_tri) throw new LoiHttp(403, "Chỉ quản trị bấm xếp lại");
    try {
      return { da_xep: await xepGiaiDoanNen() };
    } catch (e) {
      throw new LoiHttp(502, `🤖 AI chưa xếp được: ${e instanceof Error ? e.message : String(e)}`);
    }
  });
}
