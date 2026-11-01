// /api/phong-hop/<id> — sửa (PUT, cùng thân như đặt) / huỷ (DELETE) — chỉ khi chưa họp · POST = kết thúc sớm cuộc đang họp. Chỉ người đặt hoặc quản trị. Đổi giờ, huỷ → chuông báo người dự.
import { tx } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { huyHop, ketThucSom, suaHop, type DatHopBody } from "@/lib/phong-hop/dich-vu";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const docId = (s: string) => {
  const id = Number(s);
  if (!Number.isInteger(id) || id <= 0) throw new LoiHttp(400, "Mã cuộc họp không hợp lệ");
  return id;
};

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const b = (await req.json().catch(() => ({}))) as DatHopBody;
    return { cuoc: await tx((q) => suaHop(q, nd, docId(params.id), b)) };
  });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    await tx((q) => huyHop(q, nd, docId(params.id)));
    return { ok: true };
  });
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    return { cuoc: await tx((q) => ketThucSom(q, nd, docId(params.id))) };
  });
}
