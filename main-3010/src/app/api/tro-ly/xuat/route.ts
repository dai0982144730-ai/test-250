// POST /api/tro-ly/xuat — xuất một câu trả lời trợ lý ra file (S8 tầng 2 ⑤)
// body { dinhDang: "md|html|docx|xlsx|dxf", noiDung: "<markdown>" }
// → trả THẲNG bytes (Content-Disposition attachment, tên file tiếng Việt)
// Mọi vai đã đăng nhập đều xuất được — chỉ đọc, không ghi dữ liệu nghiệp vụ.

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
import { xuatTraLoi, type DinhDangXuat } from "@/lib/tro-ly/xuat-chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOP_LE = ["md", "html", "docx", "xlsx", "dxf"];

export async function POST(req: Request): Promise<NextResponse | Response> {
  const auth = await requireRole("xem");
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Body không phải JSON." }, { status: 400 });
  }
  const dinhDang = typeof body.dinhDang === "string" ? body.dinhDang : "";
  const noiDung = typeof body.noiDung === "string" ? body.noiDung : "";
  if (!HOP_LE.includes(dinhDang)) {
    return NextResponse.json({ ok: false, message: `Định dạng "${dinhDang}" chưa hỗ trợ.` }, { status: 400 });
  }
  if (noiDung.trim() === "" || noiDung.length > 200_000) {
    return NextResponse.json(
      { ok: false, message: "Nội dung rỗng hoặc quá 200KB — không xuất." },
      { status: 400 }
    );
  }

  try {
    const f = await xuatTraLoi(dinhDang as DinhDangXuat, noiDung);
    return new Response(new Uint8Array(f.buffer), {
      headers: {
        "Content-Type": f.mime,
        // RFC 5987 — giữ được tên file TIẾNG VIỆT có dấu
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(f.tenFile)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "Xuất file thất bại." },
      { status: 500 }
    );
  }
}
