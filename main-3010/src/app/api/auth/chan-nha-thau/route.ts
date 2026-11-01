// GET /api/auth/chan-nha-thau — trang chặn hiện THAY mọi trang Main khi phiên là tài khoản Nhà thầu (Mr. Đại chốt 18/10/2026).
// Middleware (edge, không đọc được tệp) viết lại địa chỉ sang đây; cửa này đọc danh bạ agent để dựng link Tiến độ · Nghiệm thu.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { laNhaThau } from "@/lib/quyen";
import { trangChanNhaThau } from "@/lib/chan-nha-thau";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
  const phien = await verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (!phien || !laNhaThau(phien.role)) return NextResponse.redirect(new URL("/", req.url));
  return new NextResponse(trangChanNhaThau(req.headers.get("host"), phien.name || phien.email), {
    status: 403,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
