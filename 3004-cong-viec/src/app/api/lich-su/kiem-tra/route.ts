// /api/lich-su/kiem-tra — kiểm lại toàn bộ chuỗi băm lịch sử (sửa lén một dòng là gãy chuỗi)
import { layQ } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { coQuyen } from "@sci/identity";
import { kiemTraChuoi } from "@/lib/lich-su/ghi";

export const dynamic = "force-dynamic";

export async function GET() {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    if (!coQuyen(nd, "lich_su.xem") && !coQuyen(nd, "tai_lieu.xem")) throw new LoiHttp(403, "Bạn không có quyền kiểm tra lịch sử");
    const q = await layQ();
    const batDau = Date.now();
    const gay = await kiemTraChuoi(q);
    const { rows } = await q.query<{ n: number | string }>("SELECT count(*) AS n FROM docflow.lich_su");
    return { nguyen_ven: gay === null, dong_gay: gay, tong_so: Number(rows[0].n), mat_ms: Date.now() - batDau, luc: new Date().toISOString() };
  });
}
