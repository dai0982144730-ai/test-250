// /api/cong-viec/nhan-chuyen-tiep — GET: những người mà người đang đăng nhập GIAO CHUYỂN TIẾP được (ô "Giao cho…" trong thẻ việc),
// xếp nhóm theo đơn vị đúng thứ tự cây. Luật: lib/so-cai/dich-vu.ts coThePhanCong (Mr. Đại chốt 09/10/2026).
import { layQ } from "@/lib/db";
import { batBuocDangNhap, xuLy } from "@/lib/phien";
import { DON_VI_HO_TRO_BLD, nguoiNhanChuyenTiep } from "@/lib/so-cai/dich-vu";
import { layCayDonVi } from "@sci/identity/don-vi";

export const dynamic = "force-dynamic";

export async function GET() {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const q = await layQ();
    const nhan = await nguoiNhanChuyenTiep(q, nd);
    if (!nhan.size) return { nhom: [] };
    const { rows } = await q.query<{ id: string; ten: string }>("SELECT id, ten FROM identity.nguoi_dung WHERE id = ANY($1::text[]) ORDER BY ten", [
      Array.from(nhan.keys()),
    ]);
    const cay = await layCayDonVi(q, true);
    const nhom = [{ id: DON_VI_HO_TRO_BLD, ten: "Hỗ trợ Ban lãnh đạo" }, ...cay]
      .map((d) => ({ don_vi: d.ten, nguoi: rows.filter((r) => nhan.get(r.id) === d.id) }))
      .filter((g) => g.nguoi.length);
    return { nhom };
  });
}
