// GET /api/agent-quan-sat — mục menu "Agent quan sát ↗" bấm vào đây rồi được
// chuyển thẳng tới địa chỉ Agent quan sát trong DANH BẠ AGENT (không gắn cứng).
// Danh bạ chưa khai / đang tắt → về /nhat-ky, nơi ghi rõ lý do bằng một dòng.
// Mr. Đại chốt 26/09/2026: nhật ký hỏi–đáp và sức khoẻ agent chỉ xem ở một nơi.

import { NextResponse } from "next/server";
import { diaChiQuanSat } from "@/lib/dia-chi-quan-sat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: Request): NextResponse {
  const kq = diaChiQuanSat();
  return NextResponse.redirect(kq.ok ? kq.diaChi : new URL("/nhat-ky", req.url), 307);
}
