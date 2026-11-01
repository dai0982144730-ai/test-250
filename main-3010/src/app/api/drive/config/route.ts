// /api/drive/config — nạp/xóa KHÓA OAuth client (CHỈ PM).
// POST body { credentialsJson } (nội dung tệp kéo vào) HOẶC { clientId, clientSecret }
// DELETE — xóa khóa + token + cache cây ("Xóa khóa & gỡ kết nối")

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
import { bocCredentialsJson, capNhatDrive, ghiDrive, xoaDrive } from "@/lib/drive/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<NextResponse> {
  const auth = await requireRole("caidat");
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Body không phải JSON hợp lệ." }, { status: 400 });
  }
  const b = body as { credentialsJson?: string; clientId?: string; clientSecret?: string };

  if (typeof b.credentialsJson === "string" && b.credentialsJson.trim() !== "") {
    const client = bocCredentialsJson(b.credentialsJson);
    if (!client) {
      return NextResponse.json(
        { ok: false, message: 'Tệp không đúng định dạng credentials.json (thiếu khối "web" hoặc "installed" chứa client_id/client_secret).' },
        { status: 400 }
      );
    }
    capNhatDrive({ client, token: undefined, email: undefined, cay: undefined });
    return NextResponse.json({ ok: true, loai: client.loai });
  }

  if (
    typeof b.clientId === "string" &&
    b.clientId.trim() !== "" &&
    typeof b.clientSecret === "string" &&
    b.clientSecret.trim() !== ""
  ) {
    capNhatDrive({
      client: { clientId: b.clientId.trim(), clientSecret: b.clientSecret.trim(), loai: "web", nguon: "tay" },
      token: undefined,
      email: undefined,
      cay: undefined,
    });
    return NextResponse.json({ ok: true, loai: "web" });
  }

  return NextResponse.json(
    { ok: false, message: "Cần credentialsJson (kéo tệp) hoặc cặp clientId + clientSecret (nhập tay)." },
    { status: 400 }
  );
}

export async function DELETE(): Promise<NextResponse> {
  const auth = await requireRole("caidat");
  if (!auth.ok) return auth.response;
  xoaDrive();
  // ghi lại file rỗng mã hóa để lần đọc sau không lẫn file cũ
  ghiDrive({});
  return NextResponse.json({ ok: true });
}
