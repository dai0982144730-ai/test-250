// GET /api/auth/dang-nhap-hien — công khai, chỉ trả { hien }: app khác đọc để biết có hiện danh sách tài khoản ở màn đăng nhập không.
// POST { hien } — bật/tắt (cửa «caidat»: PM, Admin). Mr. Đại chốt 25/10/2026: hết giai đoạn test thì tắt.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
import { docHienDanhSach, ghiHienDanhSach } from "@/lib/dang-nhap-bam-chon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ hien: docHienDanhSach() });
}

export async function POST(req: Request) {
  const g = await requireRole("caidat");
  if (!g.ok) return g.response;
  const b = (await req.json().catch(() => null)) as { hien?: unknown } | null;
  if (typeof b?.hien !== "boolean") return NextResponse.json({ ok: false, message: "Thiếu giá trị bật/tắt" }, { status: 400 });
  ghiHienDanhSach(b.hien);
  return NextResponse.json({ ok: true, hien: b.hien });
}
