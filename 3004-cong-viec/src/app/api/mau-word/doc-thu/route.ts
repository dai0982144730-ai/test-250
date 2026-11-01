// /api/mau-word/doc-thu — đọc thử một file Word: ô gắn mã, bảng gắn mã, tiêu đề mục (gợi ý khai báo định nghĩa mẫu). POST multipart {tep}
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { docThuMau } from "@/lib/kiem-tra/quan-ly-mau";
import { tepTuForm } from "@/lib/gui/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return xuLy(async () => {
    await batBuocDangNhap();
    const fd = await req.formData();
    const tep = (await tepTuForm(fd))!;
    try {
      const r = await docThuMau(tep.noi_dung);
      return { mau_ma: r.noi_dung.mau_ma, o_nhap: r.noi_dung.o_nhap, bang: r.noi_dung.bang, goi_y: r.goi_y };
    } catch (e) {
      throw new LoiHttp(400, e instanceof Error ? e.message : "Không đọc được file");
    }
  });
}
