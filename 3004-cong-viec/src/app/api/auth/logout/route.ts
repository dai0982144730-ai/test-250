// POST /api/auth/logout — xóa cookie phiên. Bọc xuLy() để chạy trong ngữ cảnh yêu cầu như mọi route khác.
import { NextResponse } from "next/server";
import { COOKIE_CHUNG, SESSION_COOKIE } from "@/lib/auth-token";
import { xuLy } from "@/lib/phien";

export const dynamic = "force-dynamic";

export async function POST() {
  return xuLy(async () => {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
    // Đăng xuất cũng xoá phiên chung (nếu không, phiên Main vẫn mở lại được ngay)
    res.cookies.set(COOKIE_CHUNG, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
    return res;
  });
}
