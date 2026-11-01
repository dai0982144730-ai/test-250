// ============================================================
// /api/khuon-danh-sach — cài đặt KHUÔN DANH SÁCH của trợ lý chat (Mr. Đại chốt 28/10/2026)
//   GET  (cửa xem)    → { ok, caiDat, nhan }
//   PUT  (cửa caidat) body { caiDat } hoặc { nhom, thayDoi } → { ok, caiDat }
// Có hiệu lực ngay ở lượt hỏi kế tiếp — lib/ai/khuon-danh-sach-cai-dat.ts đọc tệp mỗi lượt.
// ============================================================
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
import { docCaiDatKhuon, ghiCaiDatKhuon } from "@/lib/ai/khuon-danh-sach-cai-dat";
import { NHAN_NHOM, type MaNhom } from "@/lib/ai/khuon-danh-sach-thuan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const auth = await requireRole("xem");
  if (!auth.ok) return auth.response;
  return NextResponse.json({ ok: true, caiDat: docCaiDatKhuon(), nhan: NHAN_NHOM });
}

export async function PUT(req: Request): Promise<NextResponse> {
  const auth = await requireRole("caidat");
  if (!auth.ok) return auth.response;
  const body = (await req.json().catch(() => null)) as { caiDat?: unknown; nhom?: string; thayDoi?: Record<string, unknown> } | null;
  if (!body) return NextResponse.json({ ok: false, message: "Body phải là JSON." }, { status: 400 });
  const hienTai = docCaiDatKhuon();
  if (body.nhom !== undefined) {
    if (!(body.nhom in NHAN_NHOM) || !body.thayDoi || typeof body.thayDoi !== "object") {
      return NextResponse.json({ ok: false, message: "Nhóm không có hoặc thiếu thayDoi." }, { status: 400 });
    }
    const k = body.nhom as MaNhom;
    return NextResponse.json({ ok: true, caiDat: ghiCaiDatKhuon({ ...hienTai, [k]: { ...hienTai[k], ...body.thayDoi } }) });
  }
  if (body.caiDat === undefined) return NextResponse.json({ ok: false, message: "Thiếu caiDat hoặc nhom." }, { status: 400 });
  return NextResponse.json({ ok: true, caiDat: ghiCaiDatKhuon(body.caiDat) });
}
