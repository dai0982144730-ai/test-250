// POST /api/ai/test — chạy test kết nối AI theo cấu hình hiện tại (CHỈ pm).
// KHÔNG tốn token (claude-cli → auth status; api → GET /models).
// KHÔNG BAO GIỜ 500 — mọi lỗi đều bắt về { ok: false, message }.

import { NextResponse } from "next/server";
import { testConnection } from "@/lib/ai/providers";
import { requireRole } from "@/lib/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse> {
  const auth = await requireRole("caidat");
  if (!auth.ok) return auth.response;

  try {
    const result = await testConnection();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({
      ok: false,
      message: `Test kết nối thất bại: ${e instanceof Error ? e.message : String(e)}`,
    });
  }
}
