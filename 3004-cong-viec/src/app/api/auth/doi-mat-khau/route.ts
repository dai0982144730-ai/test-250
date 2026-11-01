// POST /api/auth/doi-mat-khau — { mat_khau_cu, mat_khau_moi }: người dùng tự đổi mật khẩu.
import type { NextRequest } from "next/server";
import { tx } from "@/lib/db";
import { LoiHttp, batBuocDangNhap, thietBi } from "@/lib/phien";
import { doiMatKhau } from "@sci/identity/server";
import { nguCanh, xuLyIdentity } from "@/lib/cau-hinh/cau-noi-identity";
import { layCauHinh } from "@/lib/cau-hinh/doc";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return xuLyIdentity(async () => {
    const nd = await batBuocDangNhap();
    const body = (await req.json().catch(() => null)) as { mat_khau_cu?: string; mat_khau_moi?: string } | null;
    if (!body?.mat_khau_cu || !body?.mat_khau_moi) throw new LoiHttp(400, "Nhập mật khẩu cũ và mật khẩu mới");
    const tb = thietBi();
    await tx(async (q) => {
      const tk = await layCauHinh(q, "tai_khoan");
      await doiMatKhau(q, nguCanh(nd, tb), nd.id, body.mat_khau_cu!, body.mat_khau_moi!, tk.do_dai_mat_khau_toi_thieu);
    });
    return { ok: true };
  });
}
