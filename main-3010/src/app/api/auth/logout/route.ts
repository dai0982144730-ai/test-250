import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

// POST /api/auth/logout — xóa cookie phiên
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  // Đăng nhập một lần ở Main (25/10/2026): đăng xuất cũng xoá phiên riêng của agent Công việc và Pháp lý, nếu không hai nơi này còn giữ người cũ
  for (const ten of ["sci_congviec_session", "sci_phaply_session"]) {
    res.cookies.set(ten, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  }
  return res;
}
