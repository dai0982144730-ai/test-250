import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { canAccessPath, SESSION_COOKIE, TRANG_NHA, verifySession } from "@/lib/auth";
import { layKhoaAuth } from "@/lib/khoa-auth";
import { CAU_CHAN_NHA_THAU, duocVaoAgent } from "@/lib/quyen";

// Middleware chạy trên EDGE runtime — chỉ dùng Web Crypto (auth.ts đã đảm bảo,
// không import node:crypto). Bảo vệ mọi trang trừ /login, /api/auth, static.
/**
 * Đánh thức vòng nhận Telegram của trợ lý (25/09) — tối đa 1 lần/phút, chỉ
 * với request từ chính máy này (script gác ping "/" mỗi 60 giây). Route đích
 * idempotent: vòng đang chạy thì không làm gì. Lỗi bỏ qua, không chặn trang.
 */
let lanDanhThuc = 0;
function danhThucTelegram(req: NextRequest, ev: NextFetchEvent): void {
  const { hostname, port, protocol } = req.nextUrl;
  if (hostname !== "127.0.0.1" && hostname !== "localhost") return;
  const bay = Date.now();
  if (bay - lanDanhThuc < 60_000) return;
  lanDanhThuc = bay;
  ev.waitUntil(
    fetch(`${protocol}//127.0.0.1:${port || "3010"}/api/noi-bo/telegram-tro-ly/danh-thuc`, { cache: "no-store" })
      .then(() => undefined)
      .catch(() => undefined),
  );
}

export async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const { pathname } = req.nextUrl;
  danhThucTelegram(req, ev);

  // J01 (24/09): thiếu AUTH_SECRET là DỪNG ngay tại cửa, báo câu tiếng Việt —
  // không có chuyện chạy tiếp bằng khoá dự phòng ai cũng biết.
  try {
    layKhoaAuth();
  } catch (e) {
    return new NextResponse(e instanceof Error ? e.message : "Thiếu AUTH_SECRET", {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  // Chưa đăng nhập / token hỏng / hết hạn → về trang login
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // ⭐ 18/10/2026 (Mr. Đại chốt): tài khoản Nhà thầu chỉ dùng agent Tiến độ + Nghiệm thu. Phiên nhà thầu (đăng nhập ở hai agent đó —
  // cookie chung) mở Main: API trả 403, trang hiện câu chặn + link sang hai agent (cửa /api/auth/chan-nha-thau đọc danh bạ).
  if (!duocVaoAgent(session.role, "main")) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ ok: false, message: CAU_CHAN_NHA_THAU }, { status: 403 });
    return NextResponse.rewrite(new URL("/api/auth/chan-nha-thau", req.url));
  }

  // Đã đăng nhập nhưng mở trang cần cửa mình không có (vd Người dùng mở
  // /settings — cửa "caidat") → về trang nhà. Bảng cửa theo trang: quyen.ts.
  if (!canAccessPath(session.role, pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = TRANG_NHA;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Bỏ qua: /login, /api/auth/*, /api/mcp/* (cổng agent hỏi agent — bên gọi là
  // MÁY CHỦ agent khác, không có cookie phiên người; route tự chặn theo Host
  // nội bộ, HOP-DONG-KET-NOI mục 10), /api/noi-bo/* (Main tự gọi chính mình —
  // vòng nhận Telegram 25/09; route tự chặn bằng Host + khoá nội bộ), /_next/*, /favicon.ico và file tĩnh
  matcher: ["/((?!login|api/auth|api/mcp|api/noi-bo|_next|favicon\\.ico|.*\\..*).*)"],
};
