// GET /api/drive/connect — mở trang đồng ý Google (CHỈ PM; điều hướng cả trang).
// Người dùng gõ mật khẩu TRÊN TRANG GOOGLE, app không bao giờ thấy mật khẩu.

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
import { taoAuthUrl } from "@/lib/drive/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
  const auth = await requireRole("caidat");
  if (!auth.ok) return auth.response;

  const origin = new URL(req.url).origin;
  const kq = taoAuthUrl(`${origin}/api/drive/callback`);
  if ("loi" in kq) {
    return NextResponse.redirect(`${origin}/settings?drive=${encodeURIComponent(kq.loi)}`);
  }
  return NextResponse.redirect(kq.url);
}
