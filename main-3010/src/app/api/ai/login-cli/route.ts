// POST /api/ai/login-cli — ĐÃ ĐÓNG 04/10/2026 (Quản lý token AI — Đợt 2, theo agent Công việc).
// Trước đây: "login" mở cửa sổ dòng lệnh TRÊN MÁY CHỦ (người ở máy khác / điện thoại không thấy), "logout" xoá tệp đăng nhập
// của tài khoản Claude MẶC ĐỊNH của máy — tức đăng xuất luôn Claude Code của người cài máy.
// Nay mọi tài khoản Claude đăng nhập MỘT cách: thẻ Tài khoản 1 / 2 ở Cài đặt → 🔌 Kết nối (link + dán mã) — /api/ai/tai-khoan.
// Trả 410 kèm câu chỉ đường, không chạy gì.

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
import { CAU_CUA_DANG_NHAP_CU } from "@/lib/ai/dang-nhap-link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse> {
  const auth = await requireRole("caidat");
  if (!auth.ok) return auth.response;
  return NextResponse.json({ ok: false, message: CAU_CUA_DANG_NHAP_CU }, { status: 410 });
}
