// GET /api/dinh-kem/[id]/xem — bản xem nhanh cho cửa sổ nổi: docx / xlsx → HTML đã làm sạch; pdf / ảnh → màn mở thẳng
// /api/dinh-kem/[id]. Dùng lại bộ đọc của Thư mục (thu-muc/xem-truoc). Không qua AI.
import { layQ } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { coQuyen } from "@sci/identity";
import { docNoiDungDinhKem, layTepDinhKem } from "@/lib/dinh-kem/kho";
import { taoBanXem } from "@/lib/thu-muc/xem-truoc";
import { bamSha256 } from "@/lib/luu-tru/kho";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    if (!coQuyen(nd, "so_cai.xem")) throw new LoiHttp(403, "Bạn không có quyền xem sổ cái nên không mở được file đính kèm");
    const t = await layTepDinhKem(await layQ(), params.id);
    if (!t) throw new LoiHttp(404, "Không có file đính kèm này");
    if (t.xoa_luc) throw new LoiHttp(410, `File "${t.ten_tep}" đã bị xóa do hết thời hạn lưu trữ`);
    const buf = docNoiDungDinhKem(t.id);
    const ban = await taoBanXem(t.ten_tep, t.mime, buf, bamSha256(buf));
    return { ten_tep: t.ten_tep, kich_thuoc: t.kich_thuoc, ...ban };
  });
}
