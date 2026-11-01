// /api/van-thu — SỔ VĂN BẢN ĐẾN. GET ?nam=&tu_khoa=: danh sách (ai đăng nhập cũng xem, như cấu trúc thư mục).
// POST multipart {tep, noi_gui, so_ky_hieu?, ngay_van_ban?, hinh_thuc, email_gui?, trich_yeu, don_vi_xu_ly?}: vào sổ (quyền van_thu.nhap_den).
import { layQ, tx } from "@/lib/db";
import { batBuocDangNhap, xuLy } from "@/lib/phien";
import { coQuyen } from "@sci/identity";
import { danhSachSoDen, nhapVanBanDen } from "@/lib/van-thu/dich-vu";
import { tepTuForm } from "@/lib/gui/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const laVanThu = coQuyen(nd, "van_thu.nhap_den");
    const u = new URL(req.url).searchParams;
    const nam = u.get("nam") ? Number(u.get("nam")) : undefined;
    const q = await layQ();
    const dv = await q.query<{ id: string; ten: string }>("SELECT id, ten FROM identity.don_vi WHERE active ORDER BY thu_tu, ten");
    return {
      so: await danhSachSoDen(q, { nam, tu_khoa: u.get("tu_khoa") ?? undefined }),
      la_van_thu: laVanThu,
      don_vi: dv.rows,
      don_vi_van_thu: nd.don_vi_id,
    };
  });
}

export async function POST(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const fd = await req.formData();
    const tep = (await tepTuForm(fd))!;
    const s = (k: string) => {
      const v = fd.get(k);
      return typeof v === "string" ? v : "";
    };
    const hinhThuc = s("hinh_thuc") === "email" ? "email" : "giay";
    return tx((q) =>
      nhapVanBanDen(q, nd, {
        noi_gui: s("noi_gui"),
        so_ky_hieu: s("so_ky_hieu") || null,
        ngay_van_ban: s("ngay_van_ban") || null,
        hinh_thuc: hinhThuc,
        email_gui: s("email_gui") || null,
        trich_yeu: s("trich_yeu"),
        tep,
        don_vi_xu_ly: s("don_vi_xu_ly") || null,
      }),
    );
  });
}
