// GET/PATCH /api/quan-tri/nguoi-dung/:id — xem, sửa (tên, đơn vị, chức vụ, cấp, vai trò, kiêm nhiệm, khóa/mở).
import type { NextRequest } from "next/server";
import { tx } from "@/lib/db";
import { dongBoChucDanh } from "@/lib/to-chuc";
import { LoiHttp } from "@/lib/phien";
import { layNguoiDungQuanTri, suaNguoiDung, type SuaNguoiDung } from "@sci/identity/server";
import { xuLyIdentity } from "@/lib/cau-hinh/cau-noi-identity";
import { batBuocQuanTri, kiemQuanLyDonVi, kiemTraoVaiTro } from "../../_chung";

export const dynamic = "force-dynamic";

type Ts = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ts) {
  return xuLyIdentity(async () => {
    const p = await batBuocQuanTri();
    const n = await layNguoiDungQuanTri(p.q, decodeURIComponent(params.id));
    if (!n) throw new LoiHttp(404, "Không có người dùng này");
    return { nguoi_dung: n };
  });
}

export async function PATCH(req: NextRequest, { params }: Ts) {
  return xuLyIdentity(async () => {
    const p = await batBuocQuanTri();
    const id = decodeURIComponent(params.id);
    const v = (await req.json().catch(() => null)) as (SuaNguoiDung & { truong_tai?: string[] }) | null;
    if (!v) throw new LoiHttp(400, "Thiếu dữ liệu");
    const cu = await layNguoiDungQuanTri(p.q, id);
    if (!cu) throw new LoiHttp(404, "Không có người dùng này");
    kiemQuanLyDonVi(p, cu.don_vi_id, "sửa người dùng này");
    if (v.don_vi_id !== undefined && v.don_vi_id !== cu.don_vi_id) kiemQuanLyDonVi(p, v.don_vi_id ?? null, "chuyển người sang đơn vị này");
    for (const k of v.kiem_nhiem ?? [])
      if (!cu.kiem_nhiem.some((x) => x.don_vi_id === k.don_vi_id)) kiemQuanLyDonVi(p, k.don_vi_id, "gán kiêm nhiệm ở đơn vị này");
    if (v.la_quan_tri !== undefined && v.la_quan_tri !== cu.la_quan_tri && !p.nd.la_quan_tri)
      throw new LoiHttp(403, "Chỉ quản trị viên mới đổi được cờ quản trị viên");
    if (cu.la_quan_tri && !p.nd.la_quan_tri) throw new LoiHttp(403, "Chỉ quản trị viên mới sửa được tài khoản quản trị viên");
    if (v.vai_tro) await kiemTraoVaiTro(p.q, p.nd, v.vai_tro.filter((x) => !cu.vai_tro.includes(x)));
    return {
      nguoi_dung: await tx(async (q) => {
        const { truong_tai, ...sua } = v;
        const n = await suaNguoiDung(q, p.ng, id, sua);
        // "Làm trưởng ở" (db/86, chốt 10/10): chỉ giữ đơn vị người này đang thuộc; danh sách rỗng = trưởng ở mọi đơn vị của mình
        if (truong_tai) {
          const cua = [n.don_vi_id, ...n.kiem_nhiem.map((k) => k.don_vi_id)].filter(Boolean) as string[];
          const moi = Array.from(new Set(truong_tai.filter((d) => cua.includes(d))));
          const truoc = (await q.query<{ d: string }>("SELECT don_vi_id AS d FROM identity.truong_tai WHERE nguoi_dung_id = $1 ORDER BY 1", [id])).rows.map((r) => r.d);
          await q.query("DELETE FROM identity.truong_tai WHERE nguoi_dung_id = $1", [id]);
          for (const d of moi) await q.query("INSERT INTO identity.truong_tai (nguoi_dung_id, don_vi_id) VALUES ($1, $2)", [id, d]);
          if (truoc.join() !== [...moi].sort().join())
            await p.ng.ghiNhatKy?.(q, { loai: "nguoi_dung", id, thao_tac: "truong_tai", chi_tiet: { truoc: { truong_tai: truoc }, sau: { truong_tai: moi } } });
        }
        // Đổi tên / chuyển đơn vị / khóa người giữ chức danh → tên đơn vị chức danh tự ghép lại
        return (await dongBoChucDanh(q)) ? ((await layNguoiDungQuanTri(q, id)) ?? n) : n;
      }),
    };
  });
}
