// GET /api/viec/goc — địa chỉ agent Công việc để TRÌNH DUYỆT mở (chuông nhúng ở thanh trên — Mr. Đại chốt 07/10/2026).
// Chỉ trả địa chỉ (trong danh bạ), không trả dữ liệu; chưa đăng nhập vẫn đọc được để chuông hiện dạng mờ.
import { NextResponse } from "next/server";
import { gocCongViec } from "@/lib/chung/viec-cong-viec";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, goc: await gocCongViec() });
}
