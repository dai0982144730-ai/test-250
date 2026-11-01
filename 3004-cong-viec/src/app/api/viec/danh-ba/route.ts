// ============================================================
// GET /api/viec/danh-ba — cửa DANH BẠ của mã "base" (agent Tiến độ kéo mỗi 24 giờ, kèm cookie sci_session)
//
// 04/10/2026 TẠM ĐÓNG (lý do một chỗ: LY_DO_DONG_DANH_BA ở lib/mcp/cong-base-thuan.ts): Tiến độ đổ kết quả vào kho
// `data/viec/danh-ba-base.json` đang phục vụ "Việc của tôi" và ô chọn @ — hai thứ gọi thẳng Base.vn bằng tên tài khoản
// Base.vn; mã người agent Công việc đổ vào sẽ làm sai. Tiến độ gặp `ok:false` thì giữ bản đang có
// (5-Agent-tien-do/src/lib/chung/danh-ba-tu-base.ts). Vẫn kiểm đăng nhập trước như khuôn Base:
// phiên agent Công việc HOẶC cookie sci_session (khoá chung) của người đang hoạt động ở đây.
// Middleware bỏ qua đường này (agent khác gọi không mang cookie agent Công việc).
// ============================================================
import { NextResponse } from "next/server";
import { layNguoiDung } from "@/lib/phien";
import { kiemPhienChung } from "@/lib/mcp/khoa-chung";
import { docNguoiHoatDong } from "@/lib/mcp/cong-base";
import { LY_DO_DONG_DANH_BA } from "@/lib/mcp/cong-base-thuan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  let duoc = (await layNguoiDung().catch(() => null)) !== null;
  if (!duoc) {
    const tho = (req.headers.get("cookie") ?? "").split(/;\s*/).find((c) => c.startsWith("sci_session="));
    const p = kiemPhienChung(tho ? decodeURIComponent(tho.slice("sci_session=".length)) : null);
    duoc = p !== null && (await docNguoiHoatDong()).some((n) => n.email.toLowerCase() === p.email);
  }
  if (!duoc) {
    return NextResponse.json(
      { ok: false, message: "Chưa đăng nhập, phiên hết hạn, hoặc người này không có tài khoản đang hoạt động ở agent Công việc." },
      { status: 401 },
    );
  }
  // ma_loi: bên gọi phân biệt "câu trả lời thật: không có dữ liệu" (hẹn 24 giờ) với lỗi kết nối (thử lại ngay)
  return NextResponse.json({ ok: false, ma_loi: "KHONG_CO_DU_LIEU", message: LY_DO_DONG_DANH_BA });
}
