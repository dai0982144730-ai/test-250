// GET /api/drive/callback — Google chuyển hướng về đây kèm ?code&state.
// Đổi code lấy token → lưu mã hóa → hỏi email tài khoản → dựng gốc kho
// SCI-AI-AGENT/00-HE-THONG (cây từng dự án dựng LƯỜI khi mở khu Drive).
// Xong quay về /settings?drive=ok (hoặc kèm thông báo lỗi tiếng Việt).

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
import { doiCodeLayToken } from "@/lib/drive/oauth";
import { taoGocKho, thongTinTaiKhoan } from "@/lib/drive/api";
import { capNhatDrive } from "@/lib/drive/store";
import { dayChoCacAgent } from "@/lib/day-sang-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
  const auth = await requireRole("caidat");
  if (!auth.ok) return auth.response;

  const u = new URL(req.url);
  const origin = u.origin;
  const ve = (thongBao: string): NextResponse =>
    NextResponse.redirect(`${origin}/settings?drive=${encodeURIComponent(thongBao)}`);

  const loiGoogle = u.searchParams.get("error");
  if (loiGoogle) return ve(`Google báo lỗi: ${loiGoogle}`);
  const code = u.searchParams.get("code");
  const state = u.searchParams.get("state");
  if (!code || !state) return ve("Thiếu mã ủy quyền — bấm Kết nối lại.");

  const kq = await doiCodeLayToken(code, state, `${origin}/api/drive/callback`);
  if (!kq.ok) return ve(kq.loi);

  try {
    const tt = await thongTinTaiKhoan();
    capNhatDrive({ email: tt.email });
    await taoGocKho();
  } catch (err) {
    return ve(
      `Kết nối được nhưng dựng kho lỗi: ${err instanceof Error ? err.message : "không rõ"}`
    );
  }
  // 21/09: khoá Drive cũ bị Google thu hồi → tiến độ/hợp đồng giữ bản kéo cũ, báo "invalid_grant" dù Main đã nối lại.
  // Nối lại xong thì ĐẨY ngay khoá mới xuống các agent (như khi sửa dự án/người dùng); đẩy hỏng không chặn việc nối.
  await dayChoCacAgent("kết nối lại Google Drive").catch(() => []);
  return ve("ok");
}
