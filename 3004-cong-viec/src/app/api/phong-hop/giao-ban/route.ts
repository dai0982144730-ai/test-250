// /api/phong-hop/giao-ban — cấu hình họp giao ban hằng tuần (Mr. Đại chốt 25/10/2026, câu chốt A).
//   GET → cấu hình + buổi kế tiếp · PUT → lưu · POST → lưu + đặt phòng cho buổi kế tiếp + báo thành phần (dòng chữ đỏ ở thanh trên).
//   Sửa / gửi: Ban lãnh đạo, trưởng các phòng, quản trị.
import { layQ, tx } from "@/lib/db";
import { batBuocDangNhap, xuLy } from "@/lib/phien";
import { duocLapGiaoBan, guiGiaoBan, layGiaoBan, luuGiaoBan } from "@/lib/phong-hop/dich-vu";
import { ngayGiaoBanKeTiep } from "@/lib/phong-hop/thuan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const q = await layQ();
    const g = await layGiaoBan(q);
    return { giao_ban: g, buoi_ke_tiep: ngayGiaoBanKeTiep(g.thu, g.tu), duoc_sua: await duocLapGiaoBan(q, nd) };
  });
}

export async function PUT(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    return { giao_ban: await tx((q) => luuGiaoBan(q, nd, b)) };
  });
}

export async function POST(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    return await tx((q) => guiGiaoBan(q, nd, b));
  });
}
