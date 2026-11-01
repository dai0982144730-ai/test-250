// POST /api/auth/change-password — user ĐANG đăng nhập (mọi vai trò) tự đổi
// mật khẩu của chính mình. Body {oldPassword, newPassword}; newPassword ≥ 6 ký tự.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";
import { changePassword } from "@/lib/users";
import { dayChoCacAgent } from "@/lib/day-sang-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<NextResponse> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Chưa đăng nhập hoặc phiên đã hết hạn." },
      { status: 401 },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    oldPassword?: unknown;
    newPassword?: unknown;
  } | null;

  if (!body || typeof body.oldPassword !== "string" || typeof body.newPassword !== "string") {
    return NextResponse.json(
      { ok: false, message: "Thiếu dữ liệu: cần oldPassword và newPassword." },
      { status: 400 },
    );
  }
  if (body.newPassword.length < 6) {
    return NextResponse.json(
      { ok: false, message: "Mật khẩu mới phải có ít nhất 6 ký tự." },
      { status: 400 },
    );
  }

  try {
    changePassword(session.email, body.oldPassword, body.newPassword);
    // Soát 03/10 điểm 4 (6g.6 luật A3): đổi mật khẩu ở Main phải ĐẨY sang agent con — trước đây chỉ Admin đặt lại mới đẩy,
    // tự đổi thì Tiến độ/Base/Hợp đồng/Pháp lý vẫn nhận mật khẩu CŨ tới lần Main ghi người dùng kế tiếp.
    const dayChoAgent = await dayChoCacAgent("Main ghi người dùng — người dùng tự đổi mật khẩu");
    return NextResponse.json({ ok: true, dayChoAgent });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "Đổi mật khẩu thất bại." },
      { status: 400 },
    );
  }
}
