// Người + đơn vị nhận việc, danh mục dự án và cài đặt kẹp tệp của agent Công việc — cho ô giao việc
// (Việc của tôi · Bảng điều hành). 04/10/2026 — CHOT LOI-DUNG-CHUNG 6g.7 mục 3. Bên kia kiểm quyền Giao việc của người bấm.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
import { dsNguoiNhanCV } from "@/lib/chung/viec-cong-viec";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireRole("xem");
  if (!auth.ok) return auth.response;
  const kq = await dsNguoiNhanCV(auth.session.email);
  return NextResponse.json(kq.ok ? { ok: true, ds: kq.ds } : { ok: false, message: kq.loi });
}
