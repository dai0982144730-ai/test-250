// /api/mau-word — GET: danh sách mẫu (ai cũng xem; co_tep = có mẫu trắng để tải, co_vi_du = có bản có ví dụ). POST {ma, ten, don_vi_lap?, gui_den_mac_dinh?, loai_ky?, dinh_nghia?}: thêm mẫu mới (quyền mau.quan_ly).
import { layQ, tx } from "@/lib/db";
import { batBuocDangNhap, xuLy } from "@/lib/phien";
import { coQuyen } from "@sci/identity";
import { danhSachMau } from "@/lib/kiem-tra/kiem-tra";
import { dinhNghiaKhung, maCoBanViDu, themMau } from "@/lib/kiem-tra/quan-ly-mau";
import { docJson } from "@/lib/gui/api";
import type { MauWord } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const q = await layQ();
    const ds = await danhSachMau(q);
    const { rows } = await q.query<{ ma: string; co_tep: boolean }>("SELECT ma, khoa_luu IS NOT NULL AS co_tep FROM docflow.mau_word");
    const coTep = new Map(rows.map((r) => [r.ma, r.co_tep]));
    const coViDu = await maCoBanViDu(q);
    const dv = await q.query<{ id: string; ten: string; ten_ngan: string }>("SELECT id, ten, ten_ngan FROM identity.don_vi WHERE active ORDER BY thu_tu, ten");
    return {
      mau: ds.map((m) => ({ ...m, co_tep: coTep.get(m.ma) ?? false, co_vi_du: coViDu.has(m.ma) })),
      don_vi: dv.rows,
      duoc_sua: coQuyen(nd, "mau.quan_ly"),
      khung: dinhNghiaKhung(),
    };
  });
}

export async function POST(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const v = await docJson<{ ma: string; ten: string; don_vi_lap?: string | null; gui_den_mac_dinh?: string | null; loai_ky?: MauWord["loai_ky"]; dinh_nghia?: unknown }>(req);
    return tx((q) => themMau(q, nd, v));
  });
}
