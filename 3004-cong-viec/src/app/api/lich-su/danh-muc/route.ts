// /api/lich-su/danh-muc — danh sách đơn vị, người dùng cho bộ lọc trang Lịch sử
import { layQ } from "@/lib/db";
import { batBuocDangNhap, xuLy } from "@/lib/phien";
import { layCayDonVi } from "@sci/identity/don-vi";

export const dynamic = "force-dynamic";

export async function GET() {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const q = await layQ();
    const don_vi = (await layCayDonVi(q, true)).map((d) => ({ id: d.id, ten: d.ten, ten_ngan: d.ten_ngan }));
    const { rows } = await q.query<{ id: string; ten: string; don_vi_id: string | null }>(
      "SELECT id, ten, don_vi_id FROM identity.nguoi_dung ORDER BY ten",
    );
    return {
      don_vi,
      nguoi: rows,
      pham_vi: nd.la_quan_tri ? "toan_bo" : (nd.quyen["lich_su.xem"] ?? null),
      toi: { id: nd.id, ten: nd.ten },
    };
  });
}
