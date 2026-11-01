// POST /api/phong/nhac-nop { don_vi_id, ngay } — nhắc đơn vị nộp báo cáo tuần chứa `ngay` (tin đỏ ở chuông người nhận).
import { layQ, tx } from "@/lib/db";
import { phamViGiao } from "@/lib/so-cai/dich-vu";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { nhacNop } from "@/lib/phong/so-do";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const b = (await req.json().catch(() => null)) as { don_vi_id?: string; ngay?: string } | null;
    if (!b?.don_vi_id || !b.ngay) throw new LoiHttp(400, "Thiếu đơn vị hoặc tuần");
    // Chỉ nhắc được đơn vị nằm trong phạm vi quyền «Giao việc» của mình (cùng phạm vi màn dùng để hiện nút «Nhắc nộp báo cáo»)
    const pv = await phamViGiao(await layQ(), nd);
    if (pv !== "tat_ca" && !pv.includes(b.don_vi_id)) throw new LoiHttp(403, "Bạn không có quyền nhắc đơn vị này nộp báo cáo (ngoài phạm vi quyền Giao việc của bạn)");
    return tx((q) => nhacNop(q, nd, b.don_vi_id!, b.ngay!));
  });
}
