// /api/bao-cao-sang/khoi — THƯ VIỆN KHỐI BÁO CÁO SÁNG (KE-HOACH/23, Mr. Đại chốt 17/10/2026)
//
// GET  ?ma=TQ-2&ngay=yyyy-mm-dd : bấm một khối → «số thật hôm nay» của khối đó cho TOÀN CÔNG TY. Số của ngày đã có thì dùng
//        lại; chưa ai dùng khối này (chưa gom) thì gom bổ sung đúng khối đó rồi lưu vào số của ngày. Trả số đã lọc agent mật
//        theo người xem. Câu 🤖 TQ-5: chỉ tài khoản qua cửa «ghi» mới được gọi AI viết câu mới (Người xem chỉ thấy câu đã có).
// POST { dacTa } : vẽ MỘT ảnh biểu đồ (đặc tả do màn hình dựng bằng CÙNG hàm với lúc gửi) → PNG — bản web hiện đúng ảnh
//        Telegram sẽ nhận. Bộ vẽ không tính số nào (ve-anh.ts).

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
import { duocGhi } from "@/lib/quyen";
import { gioVn } from "@/lib/gio-vn";
import { boLocMatCuaNguoi } from "@/lib/agent-mat-tren-main";
import { locDuLieuKhoi } from "@/lib/agent-mat-loc";
import { docBaoCaoNgay, docKhoi } from "@/lib/bao-cao-sang/kho";
import { damBaoKhoi } from "@/lib/bao-cao-sang/dung";
import { laMaKhoi } from "@/lib/bao-cao-sang/khoi";
import { veAnh } from "@/lib/bao-cao-sang/ve-anh";
import type { DacTaAnh } from "@/lib/bao-cao-sang/anh-kieu";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
  const auth = await requireRole("xem");
  if (!auth.ok) return auth.response;
  const q = new URL(req.url).searchParams;
  const ma = q.get("ma");
  if (!laMaKhoi(ma)) return NextResponse.json({ ok: false, message: "Mã khối không có trong thư viện." }, { status: 400 });
  const ngayTho = q.get("ngay");
  const ngay = ngayTho && /^\d{4}-\d{2}-\d{2}$/.test(ngayTho) ? ngayTho : gioVn(new Date()).ngay;
  const bc = docBaoCaoNgay(ngay);
  if (!bc || !bc.duAn) {
    return NextResponse.json({ ok: false, message: "Chưa có bản báo cáo của ngày này — bấm Dựng lại trước." }, { status: 404 });
  }
  const khoi =
    (await damBaoKhoi(bc, [{ boKhoi: [{ ma, phamVi: "cong-ty" }], duAnChon: null }], false, duocGhi(auth.session.role))) ?? docKhoi(ngay);
  const loc = boLocMatCuaNguoi(auth.session.email, auth.session.role);
  return NextResponse.json({ ok: true, ngay, khoi: khoi ? locDuLieuKhoi(khoi, loc) : null });
}

export async function POST(req: Request): Promise<NextResponse | Response> {
  const auth = await requireRole("xem");
  if (!auth.ok) return auth.response;
  let body: { dacTa?: DacTaAnh };
  try {
    body = (await req.json()) as { dacTa?: DacTaAnh };
  } catch {
    return NextResponse.json({ ok: false, message: "Dữ liệu gửi lên không đọc được." }, { status: 400 });
  }
  const d = body.dacTa;
  if (!d || (d.kieu !== "duong-ngay" && d.kieu !== "s-curve" && d.kieu !== "thanh-ngang" && d.kieu !== "duong-so" && d.kieu !== "thanh-hai-chieu")) {
    return NextResponse.json({ ok: false, message: "Thiếu đặc tả ảnh hoặc sai kiểu biểu đồ." }, { status: 400 });
  }
  try {
    const png = veAnh(d);
    return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[bao-cao-sang] vẽ ảnh hỏng:", e);
    return NextResponse.json({ ok: false, message: "Không vẽ được ảnh biểu đồ — xem nhật ký máy chủ." }, { status: 500 });
  }
}
