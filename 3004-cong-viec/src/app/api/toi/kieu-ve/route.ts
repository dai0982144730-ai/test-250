// PUT /api/toi/kieu-ve { kieu_ve: '3d' | '2d' } — Giao diện 3D / 2D của chính mình (Mr. Đại chốt 29/09/2026).
// Lưu CSDL (đổi máy vẫn giữ) + cookie sci_kieu_ve để máy chủ vẽ đúng ngay lần tải đầu, không nháy.
import { NextResponse } from "next/server";
import { tx } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { COOKIE_KIEU_VE, KIEU_VE, type KieuVe } from "@/lib/phong/giao-dien";

export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const b = (await req.json().catch(() => null)) as { kieu_ve?: string } | null;
    const kv = b?.kieu_ve as KieuVe;
    if (!KIEU_VE.includes(kv)) throw new LoiHttp(400, "Giao diện phải là 3D hoặc 2D");
    await tx((q) =>
      q.query(
        `INSERT INTO docflow.tuy_chon_giao_dien (nguoi_dung_id, giao_dien, kieu_ve) VALUES ($1, 'can_phong', $2)
         ON CONFLICT (nguoi_dung_id) DO UPDATE SET kieu_ve = EXCLUDED.kieu_ve, cap_nhat_luc = now()`,
        [nd.id, kv],
      ),
    );
    const res = NextResponse.json({ kieu_ve: kv });
    res.cookies.set(COOKIE_KIEU_VE, kv, { path: "/", maxAge: 400 * 86400, sameSite: "lax" });
    return res;
  });
}
