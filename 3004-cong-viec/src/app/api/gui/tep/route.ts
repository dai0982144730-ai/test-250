// /api/gui/tep — người CHƯA GÁN ĐƠN VỊ gửi thẳng một file (khi cấu hình nguoi_ngoai.chua_gan_don_vi = 'cho_gui_cap_thap_nhat').
// POST multipart {tep, den (JSON mảng), xac_nhan_trung?}. Tài liệu tạo trong Đến của nơi nhận đầu tiên.
import { layQ, tx } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { gui } from "@/lib/gui/dich-vu";
import { taoTaiLieuChoNguoiChuaGan } from "@/lib/gui/tai-len";
import { baoChuaGanDonVi, kiemNguoiChuaGanDonVi, phanTichNoiNhan } from "@/lib/gui/chung";
import { dsTuForm, tepTuForm, xacNhanTuForm } from "@/lib/gui/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    if (nd.don_vi_id) throw new LoiHttp(400, "Bạn đã có đơn vị: tải lên ở màn Soạn và gửi rồi bấm Gửi");
    await baoChuaGanDonVi(await layQ(), nd);
    const fd = await req.formData();
    const tep = (await tepTuForm(fd))!;
    const den = dsTuForm(fd, "den");
    return tx(async (q) => {
      await kiemNguoiChuaGanDonVi(q, nd);
      const nn = await phanTichNoiNhan(q, den);
      if (nn.length === 0) throw new LoiHttp(400, "Chưa chọn nơi nhận");
      const id = await taoTaiLieuChoNguoiChuaGan(q, nd, { tep, don_vi_nhan: nn[0].don_vi_id });
      return { tai_lieu_id: id, ...(await gui(q, nd, { tai_lieu_id: id, den, xac_nhan_trung: xacNhanTuForm(fd) })) };
    });
  });
}
