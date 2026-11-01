// /api/cong-viec/noi-phoi-hop — GET: nơi người đang đăng nhập MỜI PHỐI HỢP được (ô "Phối hợp" ở thẻ việc + form Sửa việc), xếp nhóm
// theo đơn vị đúng thứ tự cây — trình bày giống ô "Giao cho…" (giao chuyển tiếp). Luật: lib/so-cai/dich-vu.ts noiPhoiHop
// (Mr. Đại chốt 10/10/2026 tối: người / đơn vị ngang cấp và cấp dưới; SCI PMC, SCI E&C chỉ mời cả đơn vị).
import { layQ } from "@/lib/db";
import { batBuocDangNhap, xuLy } from "@/lib/phien";
import { noiPhoiHop } from "@/lib/so-cai/dich-vu";
import { layCayDonVi } from "@sci/identity/don-vi";

export const dynamic = "force-dynamic";

type Muc = { loai: "don_vi" | "nguoi"; id: string; ten: string };

export async function GET() {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const q = await layQ();
    const np = await noiPhoiHop(q, nd);
    const cay = await layCayDonVi(q);
    const { rows } = await q.query<{ id: string; ten: string }>("SELECT id, ten FROM identity.nguoi_dung WHERE id = ANY($1::text[]) ORDER BY ten", [
      Array.from(np.nguoi.keys()),
    ]);
    const nhom: { don_vi: string; lanh_dao?: boolean; muc: Muc[] }[] = [];
    const ld = cay.filter((d) => np.lanh_dao.has(d.id));
    if (ld.length) nhom.push({ don_vi: "Ban lãnh đạo", lanh_dao: true, muc: ld.map((d) => ({ loai: "don_vi", id: d.id, ten: d.ten })) });
    const dvCoNguoi = new Set(np.nguoi.values());
    for (const d of cay.filter((x) => np.don_vi.has(x.id) || dvCoNguoi.has(x.id)))
      nhom.push({
        don_vi: d.ten,
        muc: [
          ...(np.don_vi.has(d.id) ? [{ loai: "don_vi" as const, id: d.id, ten: `Cả ${d.ten_ngan || d.ten}` }] : []),
          ...rows.filter((r) => np.nguoi.get(r.id) === d.id).map((r) => ({ loai: "nguoi" as const, id: r.id, ten: r.ten })),
        ],
      });
    return { nhom };
  });
}
