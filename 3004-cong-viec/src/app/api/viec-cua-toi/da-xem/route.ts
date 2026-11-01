// POST /api/viec-cua-toi/da-xem — người mở màn Việc của tôi (ở agent Công việc, hoặc màn Việc của tôi ở agent khác báo qua chuông
// nhúng) → dời mốc "việc mới" về bây giờ: nút Việc của tôi hết phát sáng (Mr. Đại chốt 08/10/2026). Trả số việc mới còn lại (0).
import { tx } from "@/lib/db";
import { batBuocDangNhap, xuLy } from "@/lib/phien";
import { daXemViecMoi } from "@/lib/viec-moi";

export const dynamic = "force-dynamic";

export async function POST() {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    await tx((q) => daXemViecMoi(q, nd.id));
    return { ok: true, so_viec_moi: 0 };
  });
}
