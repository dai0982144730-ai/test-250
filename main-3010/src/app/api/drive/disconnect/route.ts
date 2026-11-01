// POST /api/drive/disconnect — ngắt kết nối (CHỈ PM): bỏ token + email,
// GIỮ khóa client để bấm Kết nối lại không phải nạp lại credentials.

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
import { capNhatDrive } from "@/lib/drive/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse> {
  const auth = await requireRole("caidat");
  if (!auth.ok) return auth.response;
  capNhatDrive({ token: undefined, email: undefined, cay: undefined });
  return NextResponse.json({ ok: true });
}
