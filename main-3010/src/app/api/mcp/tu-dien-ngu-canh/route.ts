// /api/mcp/tu-dien-ngu-canh — 4 agent kia đọc từ điển ngữ cảnh «Cơ cấu tổ chức và danh mục
// dự án». ⭐ Mr. Đại chốt 11/09/2026: bản sửa duy nhất ở MAIN (Cài đặt → 📁), thay chốt BF (Base).
// Cùng hình dạng JSON với route cũ của Base để agent gọi chỉ đổi địa chỉ.
import { NextResponse } from "next/server";
import { tuDienDayDu } from "@/lib/tu-dien-ngu-canh";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    tu_dien: tuDienDayDu(),
    nguon: "Main Agent — tự ghép từ danh mục dự án + sơ đồ tổ chức, kèm hai ô gõ tay ở Cài đặt (chốt 04/10)",
    thoi_diem: new Date().toISOString(),
  });
}
