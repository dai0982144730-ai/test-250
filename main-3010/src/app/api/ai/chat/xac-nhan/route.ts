// ============================================================
// POST /api/ai/chat/xac-nhan — bấm ✅ Làm / ❌ Bỏ một công cụ GHI của trợ lý
// đang chờ trong khung chat web (Mr. Đại chốt 25/09/2026).
//   body { id, hanhDong: "lam" | "bo" }
//   → { ok, trangThai, cau, action?, uiActions, choDuyet }
// MỘT bộ chạy chung với nút Telegram (lib/ai/cho-duyet-kho.ts → xuLyViecCho):
// đúng chủ · còn chờ · chưa quá 24 giờ · chạy qua runTool nên cổng quyền
// kiemCongCu xét lại theo loại tài khoản HIỆN TẠI trong cookie.
// ============================================================

import { NextResponse } from "next/server";
import { docViecCho, viecChoCuaPhien, xuLyViecCho } from "@/lib/ai/cho-duyet-kho";
import { canAccessProjectByEmail } from "@/lib/projects";
import { LY_DO_TRO_LY } from "@/lib/quyen";
import { requireRole } from "@/lib/route-auth";
import { bocRouteTrang } from "@/lib/nhat-ky/so";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MA_HTTP: Record<string, number> = {
  "khong-thay": 404,
  "xong-truoc": 409,
  "tu-choi": 403,
  "qua-han": 410,
  "da-bo": 200,
  "da-lam": 200,
};

async function xuLyPOST(req: Request): Promise<NextResponse> {
  // Người xem KHÔNG dùng trợ lý AI trong mọi tình huống (Mr. Đại chốt 04/10 — tốn chi phí công ty)
  const auth = await requireRole("ghi", LY_DO_TRO_LY);
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown> = {};
  try {
    const p: unknown = await req.json();
    if (p !== null && typeof p === "object" && !Array.isArray(p)) body = p as Record<string, unknown>;
  } catch {
    /* body hỏng → kiểm bên dưới */
  }
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const hanhDong = body.hanhDong === "lam" || body.hanhDong === "bo" ? body.hanhDong : null;
  if (!/^[a-f0-9]{12}$/.test(id) || !hanhDong) {
    return NextResponse.json(
      { ok: false, message: 'Body phải là JSON { id, hanhDong: "lam" | "bo" }.' },
      { status: 400 },
    );
  }

  // Dự án của việc chờ phải còn trong quyền của người bấm
  const v = docViecCho().find((x) => x.id === id);
  if (v && !canAccessProjectByEmail(auth.session.email, auth.session.role, v.projectId)) {
    return NextResponse.json({ ok: false, message: "Bạn không có quyền truy cập dự án này." }, { status: 403 });
  }

  const kq = await xuLyViecCho({
    id,
    hanhDong,
    kenh: "web",
    nguoi: { email: auth.session.email, loai: auth.session.role },
  });
  const status = MA_HTTP[kq.trangThai] ?? 200;
  return NextResponse.json(
    {
      ok: status === 200,
      trangThai: kq.trangThai,
      cau: kq.cau,
      message: status === 200 ? undefined : kq.cau,
      action: kq.action,
      uiActions: kq.uiAction ? [kq.uiAction] : [],
      choDuyet: kq.viec ? viecChoCuaPhien(kq.viec.projectId, kq.viec.sessionId, auth.session.email, "web") : [],
    },
    { status },
  );
}

// ⭐ Khuôn sổ bản 2 (7.1): một lần gọi = MỘT chuỗi — mọi lượt hỏi agent khác chung mã chuỗi
export const POST = bocRouteTrang("/api/ai/chat/xac-nhan", xuLyPOST);
