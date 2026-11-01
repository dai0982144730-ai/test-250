// ============================================================
// /api/telegram-tro-ly/noi — NỐI TÀI KHOẢN TELEGRAM (Mr. Đại chốt 25/09)
//   GET    (cửa xem)  → { ok, daNoi, duocDung, lyDo? } của CHÍNH người đăng nhập
//   POST   (cửa ghi)  → { ok, ma, hetHan, bot } — mã 6 số sống 10 phút; nhắn
//                       `/noi <mã>` cho bot là nối. Người xem bị chặn (không
//                       dùng trợ lý qua Telegram).
//   DELETE            → gỡ nối của chính mình; `?email=` gỡ của người khác
//                       (cửa quanlynguoidung — màn Người dùng, Admin)
// ============================================================

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
import { getUserByEmail, goNoiTelegram, normalizeEmail } from "@/lib/users";
import { duocGhi, duocQuanLyNguoiDung } from "@/lib/quyen";
import { taoMaNoi } from "@/lib/telegram-tro-ly/noi-tai-khoan";
import { TEN_BOT } from "@/lib/telegram-tro-ly/thuan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CAU_NGUOI_XEM = "Tài khoản Người xem không dùng trợ lý qua Telegram — cần Người dùng trở lên.";

export async function GET(): Promise<NextResponse> {
  const auth = await requireRole("xem");
  if (!auth.ok) return auth.response;
  const u = getUserByEmail(auth.session.email);
  const duocDung = duocGhi(auth.session.role);
  return NextResponse.json({
    ok: true,
    daNoi: !!u?.telegramChatId,
    duocDung,
    ...(duocDung ? {} : { lyDo: CAU_NGUOI_XEM }),
    bot: TEN_BOT,
  });
}

export async function POST(): Promise<NextResponse> {
  const auth = await requireRole("ghi", CAU_NGUOI_XEM);
  if (!auth.ok) return auth.response;
  if (!getUserByEmail(auth.session.email)) {
    return NextResponse.json({ ok: false, message: "Tài khoản không còn trên Main." }, { status: 404 });
  }
  const { ma, hetHan } = taoMaNoi(auth.session.email);
  return NextResponse.json({ ok: true, ma, hetHan: new Date(hetHan).toISOString(), bot: TEN_BOT });
}

export async function DELETE(req: Request): Promise<NextResponse> {
  const auth = await requireRole("xem");
  if (!auth.ok) return auth.response;
  const emailThamSo = new URL(req.url).searchParams.get("email");
  const email = emailThamSo ? normalizeEmail(emailThamSo) : auth.session.email;
  if (email !== auth.session.email && !duocQuanLyNguoiDung(auth.session.role)) {
    return NextResponse.json({ ok: false, message: "Gỡ nối Telegram của người khác chỉ Admin được làm." }, { status: 403 });
  }
  try {
    goNoiTelegram(email);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
