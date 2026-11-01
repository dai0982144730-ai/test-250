// ============================================================
// /api/telegram-tro-ly — TRẠNG THÁI + BẬT/TẮT vòng nhận tin Telegram của
// trợ lý Main (Mr. Đại chốt 25/09). Khối hiện ở Cài đặt → 🔌 Kết nối.
//   GET  (cửa xem)    → { ok, trangThai: { bat, dangChay, tinCuoiLuc, soTinHomNay,
//                         loiCuoi, soNguoiDaNoi, daKhaiToken, bot } }
//   POST (cửa caidat) body { bat: boolean } → như GET
// Mỗi lần gọi cũng đánh thức vòng nhận nếu chưa chạy.
// ============================================================

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
import { listUsers } from "@/lib/users";
import { gioVn } from "@/lib/gio-vn";
import { docTrangThai, suaTrangThai } from "@/lib/telegram-tro-ly/kho";
import { dangChay, TEN_BOT } from "@/lib/telegram-tro-ly/thuan";
import { khoiDongVongNhan } from "@/lib/telegram-tro-ly/vong-nhan";
import { tokenBot } from "@/lib/telegram-tro-ly/api-tg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function trangThai() {
  const tt = docTrangThai();
  const homNay = gioVn(new Date()).ngay;
  return {
    bat: tt.bat,
    dangChay: dangChay(tt, Date.now()),
    tinCuoiLuc: tt.tinCuoiLuc,
    soTinHomNay: tt.demNgay.ngay === homNay ? tt.demNgay.so : 0,
    loiCuoi: tt.loiCuoi,
    soNguoiDaNoi: listUsers().filter((u) => u.telegramChatId).length,
    daKhaiToken: tokenBot() !== "",
    bot: TEN_BOT,
  };
}

export async function GET(req: Request): Promise<NextResponse> {
  const auth = await requireRole("xem");
  if (!auth.ok) return auth.response;
  khoiDongVongNhan(new URL(req.url).port || undefined);
  return NextResponse.json({ ok: true, trangThai: trangThai() });
}

export async function POST(req: Request): Promise<NextResponse> {
  const auth = await requireRole("caidat");
  if (!auth.ok) return auth.response;
  const body = (await req.json().catch(() => null)) as { bat?: unknown } | null;
  if (!body || typeof body.bat !== "boolean") {
    return NextResponse.json({ ok: false, message: "Body phải là { bat: true | false }." }, { status: 400 });
  }
  const bat = body.bat;
  suaTrangThai((t) => ({ ...t, bat }));
  khoiDongVongNhan(new URL(req.url).port || undefined);
  return NextResponse.json({ ok: true, trangThai: trangThai() });
}
