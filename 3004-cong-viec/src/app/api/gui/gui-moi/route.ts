// /api/gui/gui-moi — gửi tài liệu mới hoàn toàn (hành trình mới), gắn "liên quan đến" tài liệu gốc.
// POST {tai_lieu_id, den: string[], lien_quan_den_tai_lieu?, tu_buoc_id?, xac_nhan_trung?}
import { tx } from "@/lib/db";
import { batBuocDangNhap, xuLy } from "@/lib/phien";
import { guiMoi } from "@/lib/gui/dich-vu";
import { docJson } from "@/lib/gui/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const v = await docJson<{
      tai_lieu_id: string;
      den?: string[];
      lien_quan_den_tai_lieu?: string | null;
      tu_buoc_id?: string | null;
      xac_nhan_trung?: Record<number, string>;
    }>(req);
    return tx((q) =>
      guiMoi(q, nd, {
        tai_lieu_id: String(v.tai_lieu_id ?? ""),
        den: v.den ?? [],
        lien_quan_den_tai_lieu: v.lien_quan_den_tai_lieu ?? null,
        tu_buoc_id: v.tu_buoc_id ?? null,
        xac_nhan_trung: v.xac_nhan_trung,
      }),
    );
  });
}
