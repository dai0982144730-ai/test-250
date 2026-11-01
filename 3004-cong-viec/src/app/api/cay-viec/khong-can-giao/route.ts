// POST /api/cay-viec/khong-can-giao — đánh dấu một mã WBS "Việc này không cần giao trong agent Công việc" (chép route ngoai-base
// của agent Base, Mr. Đại chốt 10/09). { du_an, wbs, bo?: true, ly_do? } — bo = gỡ đánh dấu. Quyền "Giao việc". Người bấm mới ghi.
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { boDanhDauKhongCanGiao, danhDauKhongCanGiao } from "@/lib/cay-viec/khong-can-giao";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    if (!nd.la_quan_tri && !nd.quyen["cong_viec.giao"]) throw new LoiHttp(403, "Bạn không có quyền giao việc");
    const b = (await req.json().catch(() => null)) as { du_an?: string; wbs?: string; bo?: boolean; ly_do?: string } | null;
    const wbs = String(b?.wbs ?? "").trim();
    const duAn = String(b?.du_an ?? "").trim();
    if (!wbs || !duAn) throw new LoiHttp(400, "Thiếu mã WBS hoặc dự án");
    if (b?.bo) {
      boDanhDauKhongCanGiao(duAn, wbs);
      return { ok: true, danh_dau: false, thong_diep: `Đã bỏ đánh dấu ${wbs} — nút này trở lại diện phải giao.` };
    }
    danhDauKhongCanGiao(duAn, wbs, nd.id, String(b?.ly_do ?? "").trim());
    return { ok: true, danh_dau: true, thong_diep: `${wbs} đã đánh dấu không cần giao trong agent Công việc — thôi không tính vào "nút găng chưa ai giao".` };
  });
}
