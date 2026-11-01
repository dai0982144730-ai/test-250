import { NextResponse } from "next/server";
import { docPhienCucBo } from "@/lib/route-auth";
import { getUserByEmail } from "@/lib/users";
import { docToChuc } from "@/lib/to-chuc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Dòng đầu menu tên người: "đơn vị · chức vụ" như agent Công việc (Mr. Đại 04/10/2026). Ô Ban lãnh đạo đặt tên
 * "<chức vụ> · <tên>" nên tên đơn vị đã chứa chức vụ thì không ghép thêm ("hiển thị 2 lần phó tổng giám đốc là thừa").
 */
function dongDauCua(email: string): string | undefined {
  try {
    const u = getUserByEmail(email);
    if (!u) return undefined;
    const cv = (u.chucVu ?? "").trim();
    const dv = u.donViId ? (docToChuc().toChuc.don_vi.find((d) => d.id === u.donViId)?.ten ?? "").trim() : "";
    if (dv && cv && !dv.toLowerCase().includes(cv.toLowerCase())) return `${dv} · ${cv}`;
    return dv || cv || undefined;
  } catch {
    return undefined;
  }
}

// GET /api/auth/me — người đang đăng nhập (cho Sidebar/Header/nút mờ).
// Loại + tên tra lại ở sổ CỤC BỘ (route-auth.ts) — cookie chung chỉ mang danh
// tính; cookie cũ mang `field` ra `engineer` (quyen.ts chuanHoaLoai).
export async function GET() {
  const p = await docPhienCucBo();
  if (!p.ok) {
    return NextResponse.json({ ok: false, message: p.message }, { status: p.status });
  }
  return NextResponse.json({
    ok: true,
    role: p.session.role,
    name: p.session.name,
    email: p.session.email,
    dongDau: dongDauCua(p.session.email),
  });
}
