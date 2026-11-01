// GET /api/dinh-kem/dung-luong — dung lượng kho file đính kèm + chỗ trống ổ đĩa (Cài đặt → Tệp đính kèm việc).
import { layQ } from "@/lib/db";
import { batBuocDangNhap, xuLy } from "@/lib/phien";
import { dungLuongDinhKem } from "@/lib/dinh-kem/kho";

export const dynamic = "force-dynamic";

export async function GET() {
  return xuLy(async () => {
    await batBuocDangNhap();
    return dungLuongDinhKem(await layQ());
  });
}
