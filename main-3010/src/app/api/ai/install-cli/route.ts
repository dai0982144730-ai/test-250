// POST /api/ai/install-cli — bắt đầu cài Claude CLI tự động (CHỈ pm).
// GET  /api/ai/install-cli — poll trạng thái + log để UI hiển thị tiến trình.
//
// BẢO MẬT: lệnh cài (`npm install -g @anthropic-ai/claude-code`) là HẰNG SỐ
// nằm trong src/lib/ai/cli-setup.ts. Route này KHÔNG đọc body/query và KHÔNG
// truyền bất kỳ tham số nào xuống tầng spawn — chống command injection.
//
// KHÔNG BAO GIỜ 500 — mọi lỗi đều bắt về { ok: false, message } tiếng Việt.

import { NextResponse } from "next/server";
import { getInstallState, startInstall } from "@/lib/ai/cli-setup";
import { requireRole } from "@/lib/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse> {
  const auth = await requireRole("caidat");
  if (!auth.ok) return auth.response;

  try {
    // Không nhận tham số nào từ client — startInstall() chạy lệnh hằng số
    const res = startInstall();
    return NextResponse.json({
      ok: true,
      started: res.started,
      message: res.message ?? "Đã bắt đầu cài Claude CLI — theo dõi log bên dưới.",
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      started: false,
      message: `Không bắt đầu được việc cài đặt: ${e instanceof Error ? e.message : String(e)}`,
    });
  }
}

export async function GET(): Promise<NextResponse> {
  const auth = await requireRole("xem");
  if (!auth.ok) return auth.response;

  try {
    const st = getInstallState();
    return NextResponse.json({
      ok: true,
      running: st.running,
      done: st.done,
      success: st.ok,
      log: st.log,
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      running: false,
      done: false,
      success: null,
      log: [],
      message: `Không đọc được trạng thái cài đặt: ${e instanceof Error ? e.message : String(e)}`,
    });
  }
}
