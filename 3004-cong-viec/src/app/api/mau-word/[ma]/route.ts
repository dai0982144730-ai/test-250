// /api/mau-word/[ma] — GET: một mẫu + các phiên bản file + số báo cáo đã gửi. PUT: sửa tên, đơn vị lập, nơi nhận mặc định, kỳ, bật/tắt.
// DELETE: xoá hẳn mẫu chưa có báo cáo gửi theo (quyền mau.quan_ly; Mr. Đại chốt 01/10).
import { layQ, tx } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { layMau } from "@/lib/kiem-tra/kiem-tra";
import { lichSuPhienBanMau, soBaoCaoDaGui, suaMau, xoaMau, type SuaMau } from "@/lib/kiem-tra/quan-ly-mau";
import { docJson } from "@/lib/gui/api";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { ma: string } }) {
  return xuLy(async () => {
    await batBuocDangNhap();
    const q = await layQ();
    const mau = await layMau(q, params.ma);
    if (!mau) throw new LoiHttp(404, "Không có mẫu này");
    return { mau, phien_ban_tep: await lichSuPhienBanMau(q, params.ma), so_bao_cao_da_gui: await soBaoCaoDaGui(q, params.ma) };
  });
}

export async function PUT(req: Request, { params }: { params: { ma: string } }) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const v = await docJson<SuaMau>(req);
    return tx((q) => suaMau(q, nd, params.ma, v));
  });
}

export async function DELETE(_req: Request, { params }: { params: { ma: string } }) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    return tx((q) => xoaMau(q, nd, params.ma));
  });
}
