// POST /api/quan-tri/nguoi-dung/:id/dat-lai-mat-khau { mat_khau? } — trống = về mật khẩu lần đầu = chính email (chốt 02/10).
import type { NextRequest } from "next/server";
import { tx } from "@/lib/db";
import { LoiHttp } from "@/lib/phien";
import { datLaiMatKhau, layNguoiDungQuanTri } from "@sci/identity/server";
import { xuLyIdentity } from "@/lib/cau-hinh/cau-noi-identity";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { batBuocQuanTri, kiemQuanLyDonVi } from "../../../_chung";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return xuLyIdentity(async () => {
    const p = await batBuocQuanTri();
    const id = decodeURIComponent(params.id);
    const cu = await layNguoiDungQuanTri(p.q, id);
    if (!cu) throw new LoiHttp(404, "Không có người dùng này");
    kiemQuanLyDonVi(p, cu.don_vi_id, "đặt lại mật khẩu người này");
    if (cu.la_quan_tri && !p.nd.la_quan_tri) throw new LoiHttp(403, "Chỉ quản trị viên mới đặt lại mật khẩu quản trị viên");
    const body = (await req.json().catch(() => ({}))) as { mat_khau?: string };
    const mk = await tx(async (q) => {
      const tk = await layCauHinh(q, "tai_khoan");
      return datLaiMatKhau(q, p.ng, id, body.mat_khau || undefined, tk.do_dai_mat_khau_toi_thieu);
    });
    return { ok: true, mat_khau: mk };
  });
}
