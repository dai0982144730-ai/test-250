// GET /api/cai-dat/danh-muc — danh mục để chọn trong biểu mẫu cài đặt: đơn vị, vai trò, mẫu Word.
import { layQ } from "@/lib/db";
import { batBuocDangNhap, xuLy } from "@/lib/phien";

export const dynamic = "force-dynamic";

export async function GET() {
  return xuLy(async () => {
    await batBuocDangNhap();
    const q = await layQ();
    const dv = await q.query<{ id: string; ten: string; ten_ngan: string; cap: number; cha_id: string | null; active: boolean }>(
      "SELECT id, ten, ten_ngan, cap, cha_id, active FROM identity.don_vi ORDER BY thu_tu, ten",
    );
    const vt = await q.query<{ id: string; ten: string }>("SELECT id, ten FROM identity.vai_tro ORDER BY he_thong DESC, ten");
    const ng = await q.query<{ id: string; ten: string; don_vi: string | null }>(
      "SELECT n.id, n.ten, d.ten_ngan AS don_vi FROM identity.nguoi_dung n LEFT JOIN identity.don_vi d ON d.id = n.don_vi_id WHERE n.active ORDER BY n.ten",
    );
    const mau = await q.query<{ ma: string; ten: string }>("SELECT ma, ten FROM docflow.mau_word ORDER BY ma");
    return { don_vi: dv.rows, vai_tro: vt.rows, nguoi: ng.rows, mau: mau.rows };
  });
}
