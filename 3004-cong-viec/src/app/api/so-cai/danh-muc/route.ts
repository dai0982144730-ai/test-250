// GET /api/so-cai/danh-muc — đơn vị, người dùng, dự án cho bộ lọc và ô chọn người phụ trách.
import { layQ } from "@/lib/db";
import { batBuocDangNhap, xuLy } from "@/lib/phien";
import { danhMuc } from "@/lib/so-cai/doc-them";

export const dynamic = "force-dynamic";

export async function GET() {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    return {
      ...(await danhMuc(await layQ())),
      toi: { id: nd.id, ten: nd.ten, don_vi_ids: nd.don_vi_ids, co_the_giao: nd.la_quan_tri || !!nd.quyen["cong_viec.giao"] },
    };
  });
}
