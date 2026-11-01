// /api/tai-lieu-gui/[id] — dữ liệu trang /tai-lieu/[id]: thông tin, hộp xử lý (nút hợp lệ theo bước + quyền), cây hành trình.
import { layQ } from "@/lib/db";
import { batBuocDangNhap, xuLy } from "@/lib/phien";
import { thongTinTaiLieuGui } from "@/lib/gui/doc";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    return thongTinTaiLieuGui(await layQ(), nd, params.id);
  });
}
