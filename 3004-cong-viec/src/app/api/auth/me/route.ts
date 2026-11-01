// GET /api/auth/me — người đang đăng nhập (đã tính quyền). 401 nếu chưa đăng nhập.
import { batBuocDangNhap, xuLy } from "@/lib/phien";

export const dynamic = "force-dynamic";

export async function GET() {
  return xuLy(async () => ({ nguoi_dung: await batBuocDangNhap() }));
}
