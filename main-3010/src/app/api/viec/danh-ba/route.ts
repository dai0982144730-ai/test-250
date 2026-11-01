// DANH BẠ NGƯỜI BASE — gõ "@..." tra realtime (VIEC-CUA-TOI-v2.0 mục 3.4, 4.3)
// GET /api/viec/danh-ba?q=thi&limit=200 → người khớp (username + họ tên nếu có)
//
// SỬA 05/09 (Mr. Đại bắt: "danh bạ của tôi có độ hơn chục người, thiếu người"):
// route cũ gọi timNguoi(q) không truyền hạn → rơi về MẶC ĐỊNH 8 NGƯỜI, trong
// khi kho có 140. Hạn 8 chỉ hợp cho ô gõ "@..." (danh sách xổ dưới con trỏ),
// KHÔNG hợp cho màn xem cả danh bạ. Nay: gõ @ thì client tự gửi limit nhỏ,
// mặc định trả tối đa 200.

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
import {
  keoDanhBaNenTuDong,
  timNguoi,
  tongDanhBa,
} from "@/lib/chung/danh-ba";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireRole("xem");
  if (!auth.ok) return auth.response;
  // J15 (22/09): danh bạ cũ quá 24 giờ thì kéo nền từ Agent Base — không chờ
  keoDanhBaNenTuDong();
  const sp = new URL(request.url).searchParams;
  const q = sp.get("q") ?? "";
  const raw = Number(sp.get("limit"));
  const limit = Number.isFinite(raw) && raw > 0 ? Math.min(Math.floor(raw), 500) : 200;
  const nguoi = timNguoi(q.slice(0, 64), limit);
  return NextResponse.json({ ok: true, nguoi, tong: tongDanhBa() });
}

/**
 * POST (quét toàn công ty / kéo danh bạ từ Base) — ĐÃ ĐÓNG 04/10 tối (kiểm độc lập lần 5 🟡5, Mr. Đại duyệt dọn vết Base):
 * nhánh cũ gọi thẳng API Base.vn (`quetToanCongTy` → `goiBase`). Không màn nào còn gọi cửa này; trả 410 kèm câu chỉ đường.
 */
export async function POST() {
  const auth = await requireRole("ghi");
  if (!auth.ok) return auth.response;
  return NextResponse.json({ ok: false, message: "Đã gỡ: Base.vn hết hợp đồng — không còn quét / kéo danh bạ người từ Base. Người dùng và tổ chức lấy từ Main; việc và người nhận việc ở agent Công việc." }, { status: 410 });
}
