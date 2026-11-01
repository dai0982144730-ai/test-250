// POST /api/cai-dat/:khoa/quay-lai { phien_ban } — quay lại bản cũ (tạo phiên bản mới mang giá trị cũ; 0 = mặc định).
import { NextResponse, type NextRequest } from "next/server";
import { tx } from "@/lib/db";
import { LoiHttp, batBuocDangNhap, thietBi, xuLy } from "@/lib/phien";
import { quayLaiPhienBan, LoiCauHinh, type KetQuaGhiThem } from "@/lib/cau-hinh/ghi";
import { khoaHopLe } from "../../_chung";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { khoa: string } }) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const khoa = khoaHopLe(params.khoa);
    const body = (await req.json().catch(() => null)) as { phien_ban?: number } | null;
    const pb = Number(body?.phien_ban);
    if (!Number.isInteger(pb) || pb < 0) throw new LoiHttp(400, "Thiếu số phiên bản cần quay lại");
    const tb = thietBi();
    try {
      const ra: KetQuaGhiThem = {};
      const phienBan = await tx((q) => quayLaiPhienBan(q, nd, khoa, pb, tb, ra));
      return { ok: true, phien_ban: phienBan, so_viec_ap_dung_lai: ra.so_viec_ap_dung_lai ?? 0 };
    } catch (e) {
      if (e instanceof LoiCauHinh)
        return NextResponse.json(
          { loi: "Bản cũ không còn hợp lệ với dữ liệu hiện tại: " + e.danhSach.join("; "), danh_sach_loi: e.danhSach },
          { status: 400 },
        );
      throw e;
    }
  });
}
