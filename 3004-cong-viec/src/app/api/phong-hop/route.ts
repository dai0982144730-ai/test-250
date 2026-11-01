// /api/phong-hop — Phòng họp (Mr. Đại chốt 25/10/2026). Ai đăng nhập cũng xem và đặt được (không có lễ tân).
//   GET ?ngay=YYYY-MM-DD[&den=YYYY-MM-DD] → cuộc họp các ngày đó + danh mục mời + bây giờ (giờ VN) + quyền lập giao ban
//   POST { phong, ngay, tu, den, noi_dung, ghi_chu?, khach_ngoai?, duong_dan?, moi: [{loai,id}] } → đặt; trùng phòng → 409 kèm tên người đặt
import { layQ, tx } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { cuocTheoNgay, danhMucMoi, datHop, duocLapGiaoBan, type DatHopBody } from "@/lib/phong-hop/dich-vu";
import { bayGioVN, laNgayThat, locChiTietCuoc } from "@/lib/phong-hop/thuan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const u = new URL(req.url).searchParams;
    const bay = bayGioVN();
    const ngay = u.get("ngay") || bay.ngay;
    const den = u.get("den") || ngay;
    if (!laNgayThat(ngay) || !laNgayThat(den) || den < ngay) throw new LoiHttp(400, "Ngày không hợp lệ (ngày không có trên lịch, hoặc ngày cuối trước ngày đầu)");
    const q = await layQ();
    return {
      bay,
      ngay,
      // Ghi chú · đường dẫn · khách ngoài chỉ người đặt / được mời / quản trị (26/10/2026)
      cuoc: (await cuocTheoNgay(q, ngay, den)).map((c) => locChiTietCuoc(c, nd)),
      danh_muc: u.get("danh_muc") === "0" ? null : await danhMucMoi(q),
      toi: { id: nd.id, ten: nd.ten, la_quan_tri: nd.la_quan_tri },
      lap_giao_ban: await duocLapGiaoBan(q, nd),
    };
  });
}

export async function POST(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const b = (await req.json().catch(() => ({}))) as DatHopBody;
    return { cuoc: await tx((q) => datHop(q, nd, b)) };
  });
}
