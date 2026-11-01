// POST /api/auth/login — { email, mat_khau } → đặt cookie phiên (SESSION_COOKIE, lib/auth-token.ts). Ghi lịch sử 'dang_nhap'.
import { NextResponse, type NextRequest } from "next/server";
import { tx } from "@/lib/db";
import { SESSION_COOKIE, SESSION_TTL_MS, kyPhien } from "@/lib/auth-token";
import { LoiHttp, thietBi, xuLy } from "@/lib/phien";
import { dangNhap } from "@/lib/cau-hinh/cau-noi-identity";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return xuLy(async () => {
    const body = (await req.json().catch(() => null)) as { email?: string; mat_khau?: string; password?: string } | null;
    const email = body?.email?.trim() ?? "";
    const matKhau = body?.mat_khau ?? body?.password ?? "";
    if (!email || !matKhau) throw new LoiHttp(400, "Nhập email và mật khẩu");
    const kq = await tx((q) => dangNhap(q, email, matKhau, thietBi()));
    if (!kq.ok) throw new LoiHttp(401, kq.loi);
    const token = await kyPhien({ id: kq.nguoi_dung.id, ten: kq.nguoi_dung.ten });
    const res = NextResponse.json({ ok: true, nguoi_dung: kq.nguoi_dung });
    // Đăng nhập ở đây là chọn người mới: bỏ phiên chung cũ của Main (nếu không nó đè lên người vừa đăng nhập)
    res.cookies.set("sci_session", "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https",
      path: "/",
      maxAge: Math.floor(SESSION_TTL_MS / 1000),
    });
    return res;
  });
}
