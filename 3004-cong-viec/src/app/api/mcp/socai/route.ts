// ============================================================
// /api/mcp/socai — CỔNG cho agent khác (tiến độ, main, báo cáo…) ĐỌC SỔ CÁI SCI công việc.
//
// Như /api/mcp/tiendo của agent tiến độ, nhưng xác thực bằng KHÓA RIÊNG:
//   header `Authorization: Bearer <khóa>` (quản trị cấp ở /quan-tri/khoa-agent).
// Hai kiểu gọi (lib/mcp/cua-vao.ts):
//   • Kiểu SCI:   POST { cong_cu, tham_so?, agent_goi?, ly_do_goi? } → khuôn HOP-DONG-KET-NOI mục 3
//   • MCP chuẩn:  POST JSON-RPC 2.0 { method: initialize | tools/list | tools/call | ping }
// Middleware bỏ qua /api/mcp/* (không cần cookie đăng nhập). Tài liệu: docs/SO-CAI-CHO-AGENT.md.
// ============================================================

import { NextResponse } from "next/server";
import { chayVoiNguCanh, thietBiTuHeaders } from "@/lib/ngu-canh";
import { layQ } from "@/lib/db";
import { xuLyYeuCauMcp } from "@/lib/mcp/cua-vao";
import { thatBai } from "@/lib/mcp/khuon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  // Ngữ cảnh yêu cầu: lịch sử agent_doc ghi được thiết bị của agent gọi
  return chayVoiNguCanh({ thiet_bi: thietBiTuHeaders(req.headers) }, () => chayPOST(req));
}

async function chayPOST(req: Request): Promise<Response> {
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  try {
    const kq = await xuLyYeuCauMcp(await layQ(), req.headers, body);
    if (kq.status === 202) return new Response(null, { status: 202 });
    return NextResponse.json(kq.body, { status: kq.status });
  } catch (e) {
    // Không bao giờ ném ngoại lệ ra ngoài biên MCP
    return NextResponse.json(thatBai("LOI_NOI_BO", e instanceof Error ? e.message : "Lỗi không rõ."), { status: 500 });
  }
}

/** GET: mô tả ngắn để người mở trình duyệt biết đây là gì (không lộ dữ liệu) */
export async function GET(): Promise<Response> {
  return NextResponse.json({
    ten: "Cổng MCP sổ cái SCI công việc",
    cach_goi: "POST JSON kèm header Authorization: Bearer <khóa agent>",
    tai_lieu: "docs/SO-CAI-CHO-AGENT.md",
  });
}
