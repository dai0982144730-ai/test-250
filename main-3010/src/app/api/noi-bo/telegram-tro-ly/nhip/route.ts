// ============================================================
// POST /api/noi-bo/telegram-tro-ly/nhip — MỘT nhịp nhận tin Telegram.
// Chỉ vòng nền của chính Main gọi (vong-nhan.ts): khoá nội bộ x-sci-noi-bo
// (sha256 "noi-bo:"+AUTH_SECRET) + Host máy này. Middleware bỏ qua /api/noi-bo
// nên route TỰ chặn ở đây. Logic nằm ở lib/telegram-tro-ly/nhan.ts.
// ============================================================

import { NextResponse } from "next/server";
import { khoaNoiBo } from "@/lib/day-sang-agent";
import { chayMotNhip } from "@/lib/telegram-tro-ly/nhan";
import { laMayNay } from "@/lib/telegram-tro-ly/cua-noi-bo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<NextResponse> {
  if (!laMayNay(req) || req.headers.get("x-sci-noi-bo") !== khoaNoiBo()) {
    return NextResponse.json({ ok: false, message: "Chỉ Main gọi nội bộ." }, { status: 403 });
  }
  const kq = await chayMotNhip();
  return NextResponse.json({ ok: true, ...kq });
}
