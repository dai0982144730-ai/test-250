// /api/gui/noi-nhan — nơi nhận có thể chọn (đơn vị + người) và nơi nhận theo luồng báo cáo của người đang đăng nhập.
import { layQ } from "@/lib/db";
import { batBuocDangNhap, xuLy } from "@/lib/phien";
import { danhSachNoiNhan } from "@/lib/gui/doc";
import { layCauHinh } from "@/lib/cau-hinh/doc";

export const dynamic = "force-dynamic";

export async function GET() {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const q = await layQ();
    const ds = await danhSachNoiNhan(q);
    const luong = await layCauHinh(q, "luong_bao_cao");
    const ngoai = await layCauHinh(q, "nguoi_ngoai");
    return {
      ...ds,
      theo_luong: nd.don_vi_id ? luong.filter((l) => l.tu === nd.don_vi_id).map((l) => l.den) : [],
      toi: {
        id: nd.id,
        ten: nd.ten,
        don_vi_id: nd.don_vi_id,
        cap: nd.cap,
        quyen_gui: nd.la_quan_tri || !!nd.quyen["tai_lieu.gui"],
        chua_gan_don_vi: nd.don_vi_id ? null : ngoai.chua_gan_don_vi,
      },
    };
  });
}
