import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_CHUNG, SESSION_COOKIE, kiemPhien, kiemPhienChungEdge } from "@/lib/auth-token";

// EDGE runtime: chỉ kiểm chữ ký phiên. Quyền chi tiết kiểm ở từng API (lib/phien.ts + @sci/identity).
export async function middleware(req: NextRequest) {
  let phien;
  try {
    phien = await kiemPhien(req.cookies.get(SESSION_COOKIE)?.value);
    // Chưa đăng nhập ở đây thì nhận phiên chung do Main cấp (25/10/2026: đăng nhập một lần ở Main)
    if (!phien) phien = await kiemPhienChungEdge(req.cookies.get(COOKIE_CHUNG)?.value);
  } catch (e) {
    return new NextResponse(e instanceof Error ? e.message : "Thiếu AUTH_SECRET", {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  if (!phien) {
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ loi: "Chưa đăng nhập hoặc phiên đã hết hạn" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = req.nextUrl.pathname === "/" ? "" : `?tiep=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Bỏ qua: /login, /nhung/chuong (chuông nhúng ở agent khác — tự xử lý chưa đăng nhập, 07/10), /api/auth/*, /api/mcp/* và /api/v1/* (agent khác gọi bằng khóa riêng), file tĩnh.
  // /api/viec/danh-ba: agent Tiến độ kéo danh bạ bằng cookie chung sci_session — route tự kiểm (04/10/2026, vai agent Base).
  // /api/cay-viec/soan-giao: agent khác gửi việc người đã duyệt (khoá nội bộ + email người bấm) — route tự kiểm (CHOT 6g.7 mục 2).
  // Dấu chấm phải viết "\\." — "\." trong chuỗi JS chỉ là "." nên ".*..*" khớp MỌI đường dẫn (middleware không chạy).
  matcher: ["/((?!login|nhung/chuong|api/auth|api/mcp|api/v1|api/viec/danh-ba|api/cay-viec/soan-giao|_next|favicon\\.ico|.*\\..*).*)"],
};
