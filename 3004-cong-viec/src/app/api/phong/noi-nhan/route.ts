// GET /api/phong/noi-nhan — danh sách cho ô "Giao cho" ở khung giao việc màn Dự án (Mr. Đại chốt 04/10/2026 tối: "cũng hoạt động tương tự")
// Cùng một hàm với ô ở Cây việc / màn Issue (lib/cay-viec/noi-nhan.ts): Ban lãnh đạo (trừ trợ lý) + cây đơn vị + người giao đích danh
// được — chỉ nơi người bấm giao được. Quyền "Giao việc". Chỉ đọc.
import { tx } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { dsNoiNhan } from "@/lib/cay-viec/noi-nhan";

export const dynamic = "force-dynamic";

export async function GET() {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    if (!nd.la_quan_tri && !nd.quyen["cong_viec.giao"]) throw new LoiHttp(403, "Bạn không có quyền giao việc");
    return tx((q) => dsNoiNhan(q, nd));
  });
}
