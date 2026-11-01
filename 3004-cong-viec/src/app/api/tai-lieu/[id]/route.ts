// /api/tai-lieu/[id] — thông tin tài liệu: mọi phiên bản (kể cả khi đã xóa khỏi thư mục) + mọi vị trí
import { layQ } from "@/lib/db";
import { batBuocDangNhap, xuLy } from "@/lib/phien";
import { thongTinTaiLieu } from "@/lib/thu-muc/truy-van";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    return thongTinTaiLieu(await layQ(), nd, params.id);
  });
}
