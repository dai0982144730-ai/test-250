// /api/gui/chuyen-tiep — chuyển tiếp nguyên văn, hoặc kèm tài liệu khác.
// POST {buoc_id, den: string[], tep_kem?: tai_lieu_id[], xac_nhan_trung?}
import { tx } from "@/lib/db";
import { batBuocDangNhap, xuLy } from "@/lib/phien";
import { chuyenTiep } from "@/lib/gui/dich-vu";
import { docJson } from "@/lib/gui/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const v = await docJson<{ buoc_id: string; den?: string[]; tep_kem?: string[]; xac_nhan_trung?: Record<number, string> }>(req);
    return tx((q) =>
      chuyenTiep(q, nd, { buoc_id: String(v.buoc_id ?? ""), den: v.den ?? [], tep_kem: v.tep_kem ?? [], xac_nhan_trung: v.xac_nhan_trung }),
    );
  });
}
