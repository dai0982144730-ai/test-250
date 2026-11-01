// GET /api/luat/mau → { mau: DinhNghiaMauRutGon[] } — ô nhập, bảng + cột, mục bắt buộc của mọi mẫu (giao diện chọn ô/bảng/cột)
import { layQ } from "@/lib/db";
import { batBuocDangNhap, xuLy } from "@/lib/phien";
import { dinhNghiaCacMau } from "@/lib/luat/kho-luat";

export const dynamic = "force-dynamic";

export async function GET() {
  return xuLy(async () => {
    await batBuocDangNhap();
    return { mau: await dinhNghiaCacMau(await layQ()) };
  });
}
