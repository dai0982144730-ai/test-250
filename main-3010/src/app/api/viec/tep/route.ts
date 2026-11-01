// POST /api/viec/tep (form: tep) — 📎 kẹp tệp ở ô giao việc của Main: nhận tệp rồi chuyển sang kho đính kèm agent Công việc
// (Mr. Đại chốt 04/10/2026 chiều — ô giao "giống ô +" phải gửi được tệp). Trả { ok, tep: { id, ten, kich_thuoc } }.
// Giới hạn dung lượng / tắt-mở kẹp tệp do agent Công việc quyết (Cài đặt › Tệp đính kèm việc bên đó).
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
import { duocGhi, LY_DO_CHAN } from "@/lib/quyen";
import { taiTepSangCongViec } from "@/lib/chung/viec-cong-viec";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireRole("xem");
  if (!auth.ok) return auth.response;
  if (!duocGhi(auth.session.role)) return NextResponse.json({ ok: false, message: LY_DO_CHAN.ghi }, { status: 403 });
  const form = await request.formData().catch(() => null);
  const f = form?.get("tep");
  if (!f || typeof f !== "object" || !("arrayBuffer" in f)) {
    return NextResponse.json({ ok: false, message: "Chưa chọn file." }, { status: 400 });
  }
  const kq = await taiTepSangCongViec(auth.session.email, f as File);
  return NextResponse.json(kq.ok ? { ok: true, tep: kq.tep } : { ok: false, message: kq.loi }, { status: kq.ok ? 200 : 400 });
}
