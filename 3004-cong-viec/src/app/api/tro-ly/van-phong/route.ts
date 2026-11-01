// /api/tro-ly/van-phong — VĂN PHONG trợ lý (lấy từ agent tiến độ). GET: ai đăng nhập cũng xem được.
// POST { noiDung } | { veMacDinh: true }: quyền cau_hinh.sua (áp dụng cho MỌI người). Ghi lịch sử sua_cau_hinh.
import { batBuocDangNhap, LoiHttp, thietBi, xuLy } from "@/lib/phien";
import { tx } from "@/lib/db";
import { ghiLichSu } from "@/lib/lich-su/ghi";
import { VAN_PHONG_MAC_DINH } from "@/lib/ai/van-phong";
import { docVanPhong, luuVanPhong, xoaVanPhong } from "@/lib/ai/van-phong-luu";
import { batBuocQuyen, docJson } from "@/lib/ai/route-chung";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return xuLy(async () => {
    await batBuocDangNhap();
    const hienTai = docVanPhong();
    return { ok: true, noiDung: hienTai.noiDung, laMacDinh: hienTai.laMacDinh, macDinh: VAN_PHONG_MAC_DINH };
  });
}

export async function POST(req: Request): Promise<Response> {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    batBuocQuyen(nd, "cau_hinh.sua", "Chỉ người có quyền sửa cài đặt mới đổi được văn phong trợ lý.");
    const body = await docJson(req);
    const tb = thietBi();
    const ghi = (chiTiet: Record<string, unknown>) =>
      tx((q) =>
        ghiLichSu(q, {
          nguoi: nd.id,
          doi_tuong_loai: "cau_hinh",
          doi_tuong_id: "ai_van_phong",
          hanh_dong: "sua_cau_hinh",
          don_vi_id: nd.don_vi_id,
          thiet_bi: tb,
          chi_tiet: chiTiet,
        }),
      );
    if (body.veMacDinh === true) {
      xoaVanPhong();
      await ghi({ ve_mac_dinh: true });
      return { ok: true, message: "Đã về văn phong mặc định — áp dụng từ câu chat sau.", noiDung: VAN_PHONG_MAC_DINH, laMacDinh: true };
    }
    const noiDung = String(body.noiDung ?? "");
    const r = luuVanPhong(noiDung, nd.id);
    if (!r.ok) throw new LoiHttp(400, r.loi);
    await ghi({ so_ky_tu: noiDung.length });
    return { ok: true, message: "Đã lưu văn phong — trợ lý dùng ngay từ câu chat sau.", laMacDinh: false };
  });
}
