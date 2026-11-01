// GET /api/phong/so-do?ngay=yyyy-mm-dd — dữ liệu sơ đồ tổ chức (giao diện căn phòng) cho tuần chứa `ngay`
// (mặc định tuần hôm nay): ô + ô cha theo luồng báo cáo, báo cáo tuần đã nộp, sổ nhắc nộp, người → đơn vị.
import { layQ } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { duLieuSoDo } from "@/lib/phong/so-do";
import { cacTuanGanDay } from "@/lib/phong/tuan";
import { homNayVN } from "@/lib/so-cai/tien-ich";
import { phamViGiao } from "@/lib/so-cai/dich-vu";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const ngay = new URL(req.url).searchParams.get("ngay") || homNayVN();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ngay)) throw new LoiHttp(400, "Ngày phải dạng yyyy-mm-dd");
    const homNay = homNayVN();
    const q = await layQ();
    // giao_duoc: đơn vị người này được giao việc CHỦ TRÌ tới — màn ẩn nút + / nơi nhận ngoài phạm vi. Đơn vị ngoài SCI (PMC, E&C) VẪN
    // giao được cho cả đơn vị (Mr. Đại sửa lại 10/10 chiều) — chỉ không giao đích danh cá nhân của họ (máy chủ kiểm ở batBuocTrongPhamVi).
    // giao_duoc_bao_cao: giữ tên cũ cho màn Báo cáo tuần, nay bằng giao_duoc.
    const pv = await phamViGiao(q, nd);
    return { ...(await duLieuSoDo(q, ngay)), hom_nay: homNay, cac_tuan: cacTuanGanDay(homNay, 8), giao_duoc: pv, giao_duoc_bao_cao: pv };
  });
}
