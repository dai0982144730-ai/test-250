// POST /api/so-cai/xem-truoc — body DauVaoSoCai: dự đoán từng dòng (tạo mới / đè / không dùng / đóng / gợi ý trùng). Không ghi.
import { layQ } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { xemTruocVaoSoCai } from "@/lib/so-cai/dich-vu";
import type { DauVaoSoCai } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return xuLy(async () => {
    await batBuocDangNhap();
    const dv = (await req.json().catch(() => null)) as DauVaoSoCai | null;
    if (!dv || !Array.isArray(dv.cong_viec)) throw new LoiHttp(400, "Thiếu danh sách công việc");
    return { du_doan: await xemTruocVaoSoCai(await layQ(), dv) };
  });
}
