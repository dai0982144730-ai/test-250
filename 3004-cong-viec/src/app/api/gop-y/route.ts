// /api/gop-y — GÓP Ý, PHẢN ÁNH (Mr. Đại chốt 01/10/2026). GET: mọi góp ý (ai đăng nhập cũng xem được).
// POST multipart {tieu_de, noi_dung, trang, anh (nhiều file ảnh)}: gửi góp ý → chuông cho quản trị.
import { layQ, tx } from "@/lib/db";
import { batBuocDangNhap, xuLy } from "@/lib/phien";
import { danhSachGopY, guiGopY } from "@/lib/gop-y/dich-vu";

export const dynamic = "force-dynamic";

export async function GET() {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    return { gop_y: await danhSachGopY(await layQ()), toi: nd.id, la_quan_tri: !!nd.la_quan_tri };
  });
}

export async function POST(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const fd = await req.formData();
    const anh = await Promise.all(
      fd
        .getAll("anh")
        .filter((f): f is File => typeof f !== "string")
        .map(async (f) => ({ ten: f.name || "anh.png", loai: f.type || "application/octet-stream", noi_dung: Buffer.from(await f.arrayBuffer()) })),
    );
    return tx((q) => guiGopY(q, nd, { tieu_de: String(fd.get("tieu_de") ?? ""), noi_dung: String(fd.get("noi_dung") ?? ""), trang: String(fd.get("trang") ?? "") || null, anh }));
  });
}
