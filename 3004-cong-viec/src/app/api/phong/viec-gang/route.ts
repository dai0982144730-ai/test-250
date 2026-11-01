// /api/phong/viec-gang — mã các việc sổ cái đang gắn (đã duyệt) vào một đầu việc GĂNG, mọi dự án có cây WBS.
// Màn Dự án dùng để hiện dấu "!" đỏ trước tên việc chưa xong nằm trên đường găng (Mr. Đại chốt 05/10/2026).
// Cách tính ở lib/phong/viec-gang.ts (dùng chung với cửa base.viec_cua_toi — Việc của tôi ở agent khác, 07/10).
import { tx } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { coQuyen } from "@sci/identity";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { idsViecGang } from "@/lib/phong/viec-gang";

export const dynamic = "force-dynamic";

export async function GET() {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    if (!coQuyen(nd, "so_cai.xem")) throw new LoiHttp(403, "Bạn không có quyền xem sổ cái");
    const dsDuAn = await tx((q) => layCauHinh(q, "du_an"));
    const { ids, thieu } = await idsViecGang(dsDuAn, nd, (ten) => `màn Dự án — đánh dấu "!" việc nằm trên đường găng (dự án ${ten})`);
    return { ids: [...ids], thieu };
  });
}
