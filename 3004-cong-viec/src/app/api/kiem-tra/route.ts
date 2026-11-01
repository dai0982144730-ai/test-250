// /api/kiem-tra — KIỂM TRA TRƯỚC KHI GỬI.
// POST multipart {tep, tai_lieu_id?, luu?}: tải file lên (bản 1, hoặc "Tải lại bản đã sửa" = phiên bản mới) + kiểm tra.
//   luu=0: chỉ kiểm tra, không lưu (vd xem trước bản sửa trước khi gửi lại).
// GET ?tai_lieu_id=: kiểm tra lại bản hiện tại của một tài liệu (kèm dự đoán vào sổ cái).
import { layQ, tx } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import type { NguoiDungPhien } from "@/lib/types";
import { taiLenVaKiemTra, boNoiDung } from "@/lib/gui/tai-len";
import { tepTuForm } from "@/lib/gui/api";
import { baoChuaGanDonVi, layTaiLieu } from "@/lib/gui/chung";
import { kiemTraDayDu } from "@/lib/kiem-tra/kiem-tra";
import { docPhienBanDu } from "@/lib/thu-muc/dich-vu";
import { layCauHinh } from "@/lib/cau-hinh/doc";

export const dynamic = "force-dynamic";

/** Người chưa gán đơn vị: báo quản trị (ngoài giao dịch) và trả chế độ theo cấu hình. */
async function cheDoChuaGan(nd: NguoiDungPhien): Promise<string | null> {
  if (nd.don_vi_id) return null;
  const q = await layQ();
  await baoChuaGanDonVi(q, nd);
  return (await layCauHinh(q, "nguoi_ngoai")).chua_gan_don_vi;
}

export async function POST(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const fd = await req.formData();
    const tep = (await tepTuForm(fd))!;
    const taiLieuId = (fd.get("tai_lieu_id") as string | null) || null;
    const luu = fd.get("luu") !== "0";
    const cheDo = await cheDoChuaGan(nd);
    const kq = await tx((q) => taiLenVaKiemTra(q, nd, { tep, tai_lieu_id: taiLieuId, luu }));
    return {
      tai_lieu_id: kq.tai_lieu_id,
      phien_ban: kq.phien_ban,
      ten_tep: tep.ten_tep,
      ket_qua: boNoiDung(kq.ket_qua),
      chua_gan_don_vi: cheDo, // null = đã có đơn vị; 'chan_gui' | 'cho_gui_cap_thap_nhat'
    };
  });
}

export async function GET(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const id = new URL(req.url).searchParams.get("tai_lieu_id");
    if (!id) throw new LoiHttp(400, "Thiếu tai_lieu_id");
    const q = await layQ();
    const tl = await layTaiLieu(q, id);
    const { thong_tin, noi_dung } = await docPhienBanDu(q, id, undefined, nd);
    const kq = await kiemTraDayDu(q, nd, noi_dung, thong_tin.ten_tep, {
      don_vi_lap: tl.don_vi_lap,
      tai_lieu_id: id,
      phien_ban: thong_tin.phien_ban,
      nguoi_gui_that: tl.nguoi_gui_that,
      ngay_nop: thong_tin.tai_len_luc,
    });
    return {
      tai_lieu_id: id,
      phien_ban: thong_tin.phien_ban,
      ten_tep: thong_tin.ten_tep,
      trang_thai: tl.trang_thai,
      ket_qua: boNoiDung(kq),
      chua_gan_don_vi: await cheDoChuaGan(nd),
    };
  });
}
