// GET /api/dinh-kem/cai-dat — bật/tắt kẹp file từng chỗ + giới hạn (cho nút 📎 ở màn; ai đăng nhập cũng đọc được).
import { layQ } from "@/lib/db";
import { batBuocDangNhap, xuLy } from "@/lib/phien";
import { layCauHinh } from "@/lib/cau-hinh/doc";

export const dynamic = "force-dynamic";

export async function GET() {
  return xuLy(async () => {
    await batBuocDangNhap();
    return layCauHinh(await layQ(), "dinh_kem");
  });
}
