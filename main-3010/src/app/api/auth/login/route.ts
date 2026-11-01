import { NextResponse } from "next/server";
import { SESSION_COOKIE, signSession } from "@/lib/auth";
import { verifyUser } from "@/lib/users";
import { duocVaoAgent } from "@/lib/quyen";
import { cauChanNhaThau } from "@/lib/chan-nha-thau";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/auth/login — xác thực qua user store data/users.json (users.ts).
// Giữ nguyên contract: body {email,password} → 200 {ok:true, role} + cookie
// sci_session | 401 {ok:false, message}
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    email?: string;
    password?: string;
  } | null;

  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";

  const user = verifyUser(email, password);
  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Email hoặc mật khẩu không đúng" },
      { status: 401 },
    );
  }

  // ⭐ 18/10/2026: tài khoản Nhà thầu không vào Main — nói thẳng đăng nhập ở đâu, không cấp phiên
  if (!duocVaoAgent(user.role, "main")) {
    return NextResponse.json({ ok: false, message: cauChanNhaThau(req.headers.get("host")) }, { status: 403 });
  }

  const token = await signSession(user);
  const res = NextResponse.json({ ok: true, role: user.role });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 8 * 60 * 60, // 8 giờ (giây)
  });
  return res;
}
