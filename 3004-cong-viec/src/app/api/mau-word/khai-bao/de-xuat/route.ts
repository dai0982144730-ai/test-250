// /api/mau-word/khai-bao/de-xuat — POST multipart {tep, ma?}: 🤖 đọc file Word, đề xuất nghĩa chương/bảng/cột (quyền mau.quan_ly).
// ma = cập nhật mẫu đó (phiên bản trước giữ tag cũ); không có ma = mẫu mới. Không ghi gì.
import { layQ } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { tepTuForm } from "@/lib/gui/api";
import { deXuatChoMau } from "@/lib/kiem-tra/khai-bao-mau";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const fd = await req.formData();
    const tep = (await tepTuForm(fd))!;
    if (!/\.docx$/i.test(tep.ten_tep)) throw new LoiHttp(400, "File mẫu phải là Word .docx");
    return deXuatChoMau(await layQ(), nd, { buf: tep.noi_dung, ma: String(fd.get("ma") ?? "") || null });
  });
}
