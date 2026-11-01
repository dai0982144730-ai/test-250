// ============================================================
// /api/ma-tran-goi — màn "Ai được gọi ai"
//
// GET  → bảng ma trận (kích thước = số agent ĐANG BẬT trong Danh bạ) kèm số
//        liệu theo dõi thật đọc từ `data/nhat-ky-hoi-agent.jsonl`
// PUT  → tích/bỏ tích một ô, hoặc đổi luật mặc định. Cửa "caidat" (PM, Admin).
//
// Không route nào ở đây gắn cứng số agent: mọi thứ đi qua `bangHienTai()`,
// hàm đó lấy hàng/cột từ Danh bạ agent.
// ============================================================

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
import { duocCaiDat } from "@/lib/quyen";
import { bangHienTai, docMaTran, ghiMaTran } from "@/lib/ma-tran-goi/kho";
import { datO, duocGoiKhong } from "@/lib/ma-tran-goi/model";
import { docDanhBaAgent } from "@/lib/cai-dat-base";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  // Ai đăng nhập cũng XEM được — đây là bảng theo dõi, không chứa bí mật.
  const q = await requireRole("xem");
  if (!q.ok) return q.response;

  const mt = docMaTran();
  return NextResponse.json({
    ok: true,
    bang: bangHienTai(),
    macDinhChoGoi: mt.macDinhChoGoi,
    // Sửa ma trận = Cài đặt (PM, Admin) — quyen.ts
    duocSua: duocCaiDat(q.session.role),
  });
}

export async function PUT(req: Request): Promise<NextResponse> {
  const q = await requireRole("caidat");
  if (!q.ok) return q.response;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Body phải là JSON." }, { status: 400 });
  }

  let mt = docMaTran();

  if (typeof body.macDinhChoGoi === "boolean") {
    mt = { ...mt, macDinhChoGoi: body.macDinhChoGoi };
  }
  if (typeof body.agentGoi === "string" && typeof body.agentDuocGoi === "string") {
    mt = datO(mt, body.agentGoi, body.agentDuocGoi, body.bat === true);
  }

  ghiMaTran(mt);
  return NextResponse.json({ ok: true, bang: bangHienTai(), macDinhChoGoi: mt.macDinhChoGoi });
}

/**
 * POST — THỬ một cặp mà không sửa gì: "con này gọi con kia được không, vì sao".
 * Có cửa này thì người dùng kiểm chứng được ma trận đang có hiệu lực thật,
 * thay vì phải đi dựng một lời gọi MCP để xem nó có bị chặn không.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const q = await requireRole("xem");
  if (!q.ok) return q.response;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Body phải là JSON." }, { status: 400 });
  }

  const goi = typeof body.agentGoi === "string" ? body.agentGoi : "";
  const nhan = typeof body.agentDuocGoi === "string" ? body.agentDuocGoi : "";
  const kq = duocGoiKhong(goi, nhan, docMaTran(), docDanhBaAgent());
  return NextResponse.json({ ok: true, ketQua: kq });
}
