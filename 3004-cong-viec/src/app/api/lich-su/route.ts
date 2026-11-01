// /api/lich-su — tìm trong lịch sử theo thời gian, người, đơn vị, loại đối tượng, hành động, từ khóa (lọc theo quyền lich_su.xem)
import { layQ } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { timLichSuTheoTrang } from "@/lib/lich-su/doc";
import { tenChoLichSu } from "@/lib/lich-su/ten";
import type { LoaiDoiTuong } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const pham_vi = nd.la_quan_tri ? "toan_bo" : nd.quyen["lich_su.xem"];
    if (!pham_vi) throw new LoiHttp(403, "Bạn chưa được cấp quyền xem lịch sử");
    const u = new URL(req.url).searchParams;
    const lay = (k: string) => u.get(k)?.trim() || undefined;
    const q = await layQ();
    // Chia trang 30 dòng ở máy chủ (E40 — Mr. Đại 04/10): ?trang=1.. · trả kèm tổng để màn hiện "Trang x/y"
    const MOI_TRANG = 30;
    const trang = Math.max(1, Math.floor(Number(u.get("trang")) || 1));
    const { dong, tong } = await timLichSuTheoTrang(
      q,
      nd,
      {
        tu: lay("tu"),
        den: lay("den"),
        nguoi: lay("nguoi"),
        don_vi_id: lay("don_vi_id"),
        doi_tuong_loai: lay("doi_tuong_loai") as LoaiDoiTuong | undefined,
        hanh_dong: lay("hanh_dong"),
        tu_khoa: lay("tu_khoa"),
      },
      { bo: (trang - 1) * MOI_TRANG, lay: MOI_TRANG },
    );
    return { dong, tong, trang, moi_trang: MOI_TRANG, ten: await tenChoLichSu(q, dong), pham_vi };
  });
}
