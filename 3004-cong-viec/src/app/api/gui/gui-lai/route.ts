// /api/gui/gui-lai — gửi lại bản đã sửa sau khi bị trả lại (cùng hành trình). POST multipart {buoc_tra_lai_id, tep, xac_nhan_trung?}
import { tx } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { guiLai } from "@/lib/gui/dich-vu";
import { tepTuForm, xacNhanTuForm } from "@/lib/gui/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const fd = await req.formData();
    const buoc = String(fd.get("buoc_tra_lai_id") ?? "");
    if (!buoc) throw new LoiHttp(400, "Thiếu bước trả lại");
    const tep = (await tepTuForm(fd))!;
    return tx((q) => guiLai(q, nd, { buoc_tra_lai_id: buoc, tep, xac_nhan_trung: xacNhanTuForm(fd) }));
  });
}
