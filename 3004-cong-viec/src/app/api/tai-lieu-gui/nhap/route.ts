// /api/tai-lieu-gui/nhap — tài liệu nháp (chưa gửi) của tôi.
import { layQ } from "@/lib/db";
import { batBuocDangNhap, xuLy } from "@/lib/phien";
import { taiLieuNhapCuaToi } from "@/lib/gui/doc";

export const dynamic = "force-dynamic";

export async function GET() {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    return { tai_lieu: await taiLieuNhapCuaToi(await layQ(), nd) };
  });
}
