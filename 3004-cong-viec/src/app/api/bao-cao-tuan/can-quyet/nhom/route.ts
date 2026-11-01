// /api/bao-cao-tuan/can-quyet/nhom — người chuyển một dòng "Cần BLĐ ra quyết định" sang nhóm khác (Mr. Đại chốt 20/10/2026, mục 6).
//   POST { khoa, nhom } — nhom: truoc_khoi_cong | thuc_thi | enc | khac. Người sửa THẮNG 🤖 AI (lib/bao-cao-tuan/can-quyet-nhom-ai.ts).
//   Ai được chuyển: người có quyền giao việc (cùng nhóm người bấm Giao việc ở tab này) hoặc quản trị.
import { tx } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { coQuyen } from "@sci/identity";
import { laNhomCanQuyet } from "@/lib/bao-cao-tuan/can-quyet-nhom";
import { ghiNhomNguoi } from "@/lib/bao-cao-tuan/can-quyet-nhom-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    if (!coQuyen(nd, "cong_viec.giao") && !nd.la_quan_tri) throw new LoiHttp(403, "Bạn không có quyền xếp nhóm kiến nghị");
    const b = (await req.json().catch(() => ({}))) as { khoa?: unknown; nhom?: unknown };
    const khoa = typeof b.khoa === "string" ? b.khoa.trim() : "";
    if (!khoa) throw new LoiHttp(400, "Thiếu dòng kiến nghị");
    if (!laNhomCanQuyet(b.nhom)) throw new LoiHttp(400, "Nhóm không hợp lệ");
    const nhom = b.nhom;
    await tx((q) => ghiNhomNguoi(q, khoa, nhom, nd.id));
    return { ok: true };
  });
}
