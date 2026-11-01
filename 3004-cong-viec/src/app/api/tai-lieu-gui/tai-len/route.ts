// /api/tai-lieu-gui/tai-len — tải file kèm / tài liệu mới (bản nháp, thư mục gốc của đơn vị) + kiểm tra nếu theo mẫu.
// POST multipart {tep}. Dùng ở hộp xử lý: "Chuyển tiếp + gửi kèm", "Gửi tài liệu mới".
import { tx } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { taiLenVaKiemTra, boNoiDung } from "@/lib/gui/tai-len";
import { tepTuForm } from "@/lib/gui/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    if (!nd.don_vi_id) throw new LoiHttp(403, "Bạn chưa được gán đơn vị nên chưa tải file lên được");
    const fd = await req.formData();
    const tep = (await tepTuForm(fd))!;
    const kq = await tx((q) => taiLenVaKiemTra(q, nd, { tep }));
    return { tai_lieu_id: kq.tai_lieu_id, phien_ban: kq.phien_ban, ten: tep.ten_tep, ket_qua: boNoiDung(kq.ket_qua) };
  });
}
