// /api/phong/du-an-co-cay — dự án có cây WBS bên agent Tiến độ ("Mã bên Tiến độ" ở Cài đặt › Sơ đồ tổ chức dự án).
// Hộp chọn dự án trên thanh trên cùng khi đang ở Cây việc & đường găng (Mr. Đại chốt 03/10/2026: mọi dự án, cả SCI đầu tư
// lẫn Loại khác, miễn là có cây).
import { tx } from "@/lib/db";
import { batBuocDangNhap, xuLy } from "@/lib/phien";
import { layCauHinh } from "@/lib/cau-hinh/doc";

export const dynamic = "force-dynamic";

export async function GET() {
  return xuLy(async () => {
    await batBuocDangNhap();
    const ds = await tx((q) => layCauHinh(q, "du_an"));
    return { du_an: ds.filter((d) => d.ma_tien_do).map((d) => ({ id: d.id, ten: d.ten, loai: d.loai })) };
  });
}
