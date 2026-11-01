// /api/gop-y/[id] — PUT {trang_thai, tra_loi}: quản trị đặt trạng thái + trả lời (người góp ý nhận chuông). DELETE: xoá
// (người gửi: của mình khi còn "Mới"; quản trị: mọi góp ý).
import { tx } from "@/lib/db";
import { batBuocDangNhap, xuLy } from "@/lib/phien";
import { docJson } from "@/lib/gui/api";
import { traLoiGopY, xoaGopY } from "@/lib/gop-y/dich-vu";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const v = await docJson<{ trang_thai: string; tra_loi?: string | null }>(req);
    await tx((q) => traLoiGopY(q, nd, params.id, v));
    return { ok: true };
  });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    await tx((q) => xoaGopY(q, nd, params.id));
    return { ok: true };
  });
}
