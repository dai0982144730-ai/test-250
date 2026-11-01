// GET /api/so-cai — việc đang mở trong sổ cái (lọc ?don_vi_id=&nguoi=&du_an=&luon_mo=&canh_bao=&tu_khoa=)
// kèm việc vừa rời sổ cái (mục "Vừa chuyển vào lịch sử") và phần việc người đang xem bấm Kết thúc được.
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { layQ } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { coQuyen } from "@sci/identity";
import { danhSachSoCai, viecDaXong, type LocSoCai } from "@/lib/so-cai/dich-vu";
import { themQuyenKetThuc, themQuyenSua } from "@/lib/so-cai/doc-them";
import { congNgay, homNayVN } from "@/lib/so-cai/tien-ich";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    if (!coQuyen(nd, "so_cai.xem")) throw new LoiHttp(403, "Bạn không có quyền xem sổ cái");
    const u = new URL(req.url).searchParams;
    const loc: LocSoCai = {};
    if (u.get("don_vi_id")) loc.don_vi_id = u.get("don_vi_id")!;
    if (u.get("nguoi")) loc.nguoi = u.get("nguoi")!;
    if (u.get("du_an")) loc.du_an = u.get("du_an")!;
    if (u.get("luon_mo") === "1" || u.get("luon_mo") === "true") loc.luon_mo = true;
    if (u.get("luon_mo") === "0" || u.get("luon_mo") === "false") loc.luon_mo = false;
    if (u.get("treo") === "1" || u.get("treo") === "true") loc.treo = true;
    const cb = u.get("canh_bao");
    if (cb === "qua_han" || cb === "sap_den_han") loc.canh_bao = cb;
    if (u.get("tu_khoa")) loc.tu_khoa = u.get("tu_khoa")!;
    const q = await layQ();
    const viec = await themQuyenSua(q, nd, themQuyenKetThuc(nd, await danhSachSoCai(q, loc)));
    const locXong: LocSoCai = { don_vi_id: loc.don_vi_id, nguoi: loc.nguoi, du_an: loc.du_an, tu_khoa: loc.tu_khoa };
    const vuaXong = (await viecDaXong(q, { ...locXong, tu: congNgay(homNayVN(), -30) })).slice(0, 10);
    const chSc = await layCauHinh(q, "so_cai");
    return { viec, vua_xong: vuaXong, hom_nay: homNayVN(), nguong: { qua_han_vang_ngay: chSc.qua_han_vang_ngay ?? 3, sap_den_han_ngay: chSc.sap_den_han_ngay } };
  });
}
