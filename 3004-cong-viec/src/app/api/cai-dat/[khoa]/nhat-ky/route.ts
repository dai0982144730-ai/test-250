// GET /api/cai-dat/:khoa/nhat-ky — các phiên bản đã lưu: ai, lúc nào, từ gì sang gì (mới nhất trước).
import { layQ } from "@/lib/db";
import { batBuocDangNhap, xuLy } from "@/lib/phien";
import { nhatKyCauHinh } from "@/lib/cau-hinh/ghi";
import { khoaHopLe } from "../../_chung";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { khoa: string } }) {
  return xuLy(async () => {
    await batBuocDangNhap();
    return { nhat_ky: await nhatKyCauHinh(await layQ(), khoaHopLe(params.khoa)) };
  });
}
