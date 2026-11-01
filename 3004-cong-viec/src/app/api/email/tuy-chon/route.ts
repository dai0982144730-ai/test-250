// GET /api/email/tuy-chon                 — tùy chọn email của tôi: { nhan_email, email }.
// PUT /api/email/tuy-chon { nhan_email }  — bật/tắt nhận email thông báo (ghi lịch sử). POST cũng được.
import type { NextRequest } from "next/server";
import { layQ, tx } from "@/lib/db";
import { LoiHttp, batBuocDangNhap, xuLy } from "@/lib/phien";
import { datNhanEmail, layNhanEmail } from "@/lib/email/hang-doi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    return { nhan_email: await layNhanEmail(await layQ(), nd.id), email: nd.email };
  });
}

export async function PUT(req: NextRequest) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const body = (await req.json().catch(() => null)) as { nhan_email?: unknown } | null;
    if (typeof body?.nhan_email !== "boolean") throw new LoiHttp(400, "Cần { nhan_email: true | false }");
    const v = body.nhan_email;
    return { ok: true, nhan_email: await tx((q) => datNhanEmail(q, nd, v)) };
  });
}

export const POST = PUT;
