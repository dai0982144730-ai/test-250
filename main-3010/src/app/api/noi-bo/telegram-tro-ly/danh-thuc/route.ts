// ============================================================
// GET /api/noi-bo/telegram-tro-ly/danh-thuc — bật vòng nhận Telegram nếu
// chưa chạy (idempotent: đang chạy thì thôi). Middleware gõ tối đa 1 lần/phút
// → máy chủ khởi động lại là vòng tự lên khi có request đầu tiên (script gác
// ping "/" mỗi 60 giây). Chỉ nhận từ chính máy này.
// ============================================================

import { NextResponse } from "next/server";
import { khoiDongVongNhan, vongDangSong } from "@/lib/telegram-tro-ly/vong-nhan";
import { laMayNay } from "@/lib/telegram-tro-ly/cua-noi-bo";
import { khoiDongNhipBaoCaoSang } from "@/lib/bao-cao-sang/dung";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
  if (!laMayNay(req)) {
    return NextResponse.json({ ok: false, message: "Chỉ Main gọi nội bộ." }, { status: 403 });
  }
  // ⭐ 04/10 — đánh thức CẢ nhịp báo cáo sáng (06:30 dựng · 07:00 gửi). Trước đây nhịp này chỉ
  // bật khi có người mở trang Báo cáo: máy chủ tự khởi động lại ban đêm mà sáng không ai mở
  // thì 07:00 im lặng. Hàm idempotent — đang chạy thì thôi.
  khoiDongNhipBaoCaoSang();
  const moiBat = khoiDongVongNhan(new URL(req.url).port || undefined);
  return NextResponse.json({ ok: true, moiBat, dangSong: vongDangSong() });
}
