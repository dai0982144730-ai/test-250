// /api/tai-lieu/[id]/xem-truoc?phien_ban= — bản xem trước (Word → HTML đã làm sạch, PDF/ảnh, chữ). Ghi lịch sử 'mo_xem'.
import { layQ, tx } from "@/lib/db";
import { batBuocDangNhap, thietBi, xuLy, LoiHttp } from "@/lib/phien";
import { docPhienBan } from "@/lib/thu-muc/dich-vu";
import { duocXemNoiDung, ghiXemTaiVe, tenNguoiDung } from "@/lib/thu-muc/truy-van";
import { taoBanXem } from "@/lib/thu-muc/xem-truoc";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const s = new URL(req.url).searchParams.get("phien_ban");
    const pbSo = s ? Number(s) : undefined;
    if (pbSo !== undefined && (!Number.isInteger(pbSo) || pbSo < 1)) throw new LoiHttp(400, "Phiên bản không hợp lệ");
    const q = await layQ();
    if (!(await duocXemNoiDung(q, nd, params.id))) throw new LoiHttp(403, "Bạn không có quyền mở nội dung tài liệu của đơn vị này");
    // Báo cáo mẫu mật: người không có tên trong danh sách nhận bản đã cắt chương mật (bao-mat/loc.ts)
    const { thong_tin, noi_dung } = await docPhienBan(q, params.id, pbSo, nd);
    const ban = await taoBanXem(thong_tin.ten_tep, thong_tin.mime, noi_dung, thong_tin.sha256);
    const tb = thietBi();
    await tx((t) => ghiXemTaiVe(t, nd, { tai_lieu_id: params.id, phien_ban: thong_tin.phien_ban, hanh_dong: "mo_xem", thiet_bi: tb }));
    const { khoa_luu: _bo, ...tt } = thong_tin;
    const ten = await tenNguoiDung(q, [tt.tai_len_boi]);
    return { thong_tin: { ...tt, tai_len_boi_ten: ten[tt.tai_len_boi] ?? tt.tai_len_boi }, ...ban };
  });
}
