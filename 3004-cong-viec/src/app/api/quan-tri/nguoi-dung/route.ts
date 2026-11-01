// GET /api/quan-tri/nguoi-dung?don_vi=&tim=&ca_bi_khoa=1 — danh sách người dùng (kèm cờ sua_duoc).
// POST — thêm người dùng { email, ten, don_vi_id, chuc_vu, cap_chuc_vu, vai_tro[], kiem_nhiem[], mat_khau? }.
import type { NextRequest } from "next/server";
import { tx } from "@/lib/db";
import { dongBoChucDanh } from "@/lib/to-chuc";
import { LoiHttp } from "@/lib/phien";
import { danhSachNguoiDung, duocQuanLyNguoi, themNguoiDung, type DauVaoNguoiDung } from "@sci/identity/server";
import { xuLyIdentity } from "@/lib/cau-hinh/cau-noi-identity";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { batBuocQuanTri, kiemQuanLyDonVi, kiemTraoVaiTro } from "../_chung";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return xuLyIdentity(async () => {
    const p = await batBuocQuanTri();
    const sp = req.nextUrl.searchParams;
    const ds = await danhSachNguoiDung(p.q, {
      don_vi_id: sp.get("don_vi") || undefined,
      tim: sp.get("tim") || undefined,
      ca_bi_khoa: sp.get("ca_bi_khoa") === "1",
    });
    // "Làm trưởng ở" (db/86): đơn vị người này thật sự làm trưởng — rỗng = mọi đơn vị của mình
    const tt = await p.q.query<{ nguoi_dung_id: string; don_vi_id: string }>("SELECT nguoi_dung_id, don_vi_id FROM identity.truong_tai");
    return {
      nguoi_dung: ds.map((n) => ({
        ...n,
        truong_tai: tt.rows.filter((r) => r.nguoi_dung_id === n.id).map((r) => r.don_vi_id),
        sua_duoc: duocQuanLyNguoi(p.nd, n, p.cay),
      })),
    };
  });
}

export async function POST(req: NextRequest) {
  return xuLyIdentity(async () => {
    const p = await batBuocQuanTri();
    const v = (await req.json().catch(() => null)) as DauVaoNguoiDung | null;
    if (!v) throw new LoiHttp(400, "Thiếu dữ liệu người dùng");
    kiemQuanLyDonVi(p, v.don_vi_id ?? null, "thêm người vào đơn vị này");
    for (const k of v.kiem_nhiem ?? []) kiemQuanLyDonVi(p, k.don_vi_id, "gán kiêm nhiệm ở đơn vị này");
    if (v.la_quan_tri && !p.nd.la_quan_tri) throw new LoiHttp(403, "Chỉ quản trị viên mới tạo được quản trị viên");
    return tx(async (q) => {
      const tk = await layCauHinh(q, "tai_khoan");
      const vaiTro = v.vai_tro?.length ? v.vai_tro : tk.vai_tro_mac_dinh;
      await kiemTraoVaiTro(q, p.nd, vaiTro);
      const kq = await themNguoiDung(q, p.ng, { ...v, vai_tro: vaiTro }, { do_dai_mat_khau: tk.do_dai_mat_khau_toi_thieu });
      await dongBoChucDanh(q); // người mới vào đơn vị chức danh → tên đơn vị + chức vụ tự ghép
      return { nguoi_dung: kq.nguoi_dung, mat_khau: kq.mat_khau_tu_sinh ? kq.mat_khau : undefined };
    });
  });
}
