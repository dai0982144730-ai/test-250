// PUT /api/cai-dat/:khoa { gia_tri } — kiểm tra, lưu, tăng phiên bản. Sai → 400 { loi, danh_sach_loi }.
// POST /api/cai-dat/:khoa { gia_tri } — chỉ kiểm tra (không lưu), trả { danh_sach_loi }.
import { NextResponse, type NextRequest } from "next/server";
import { layQ, tx } from "@/lib/db";
import { LoiHttp, batBuocDangNhap, thietBi, xuLy } from "@/lib/phien";
import { ghiCauHinh, kiemTraCauHinh, LoiCauHinh, type KetQuaGhiThem } from "@/lib/cau-hinh/ghi";
import { raSoatNen } from "@/lib/so-cai/hen-gio";
import type { CauHinh } from "@/lib/cau-hinh/mac-dinh";
import { khoaHopLe } from "../_chung";

export const dynamic = "force-dynamic";

type Ts = { params: { khoa: string } };

export async function PUT(req: NextRequest, { params }: Ts) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const khoa = khoaHopLe(params.khoa);
    const body = (await req.json().catch(() => null)) as { gia_tri?: unknown } | null;
    if (!body || body.gia_tri === undefined) throw new LoiHttp(400, "Thiếu giá trị cài đặt");
    const tb = thietBi();
    try {
      const ra: KetQuaGhiThem = {};
      const phienBan = await tx((q) => ghiCauHinh(q, nd, khoa, body.gia_tri as CauHinh[typeof khoa], tb, ra));
      // so_viec_ap_dung_lai: số việc đang mở đã tính lại theo quy tắc đè mới (chỉ khi bật "áp dụng lại khi đổi")
      // Cài đặt đổi (quy tắc kiểm tra, mẫu, đơn vị…) có thể làm báo cáo đã gửi có thêm việc → rà soát + tự bổ sung ngay
      raSoatNen("Sau khi đổi cài đặt");
      return { ok: true, phien_ban: phienBan, so_viec_ap_dung_lai: ra.so_viec_ap_dung_lai ?? 0 };
    } catch (e) {
      if (e instanceof LoiCauHinh) return NextResponse.json({ loi: e.message, danh_sach_loi: e.danhSach }, { status: 400 });
      throw e;
    }
  });
}

export async function POST(req: NextRequest, { params }: Ts) {
  return xuLy(async () => {
    await batBuocDangNhap();
    const khoa = khoaHopLe(params.khoa);
    const body = (await req.json().catch(() => null)) as { gia_tri?: unknown } | null;
    if (!body || body.gia_tri === undefined) throw new LoiHttp(400, "Thiếu giá trị cài đặt");
    return { danh_sach_loi: await kiemTraCauHinh(await layQ(), khoa, body.gia_tri as CauHinh[typeof khoa]) };
  });
}
