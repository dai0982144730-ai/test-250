// GET /api/drive — trạng thái kết nối Google Drive (mọi user đã đăng nhập).
// → { ok, coKhoa, loaiKhoa, nguonKhoa, clientIdRutGon, daKetNoi, email, dungLuong }
// KHÔNG BAO GIỜ trả client_secret hay token.

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
import { thongTinTaiKhoan } from "@/lib/drive/api";
import { docDrive } from "@/lib/drive/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const auth = await requireRole("xem");
  if (!auth.ok) return auth.response;

  const s = docDrive();
  const coKhoa = Boolean(s.client);
  const daKetNoi = Boolean(s.token);
  let email = s.email ?? null;
  let dungLuong: string | null = null;
  // 21/09: "có khoá lưu" KHÔNG phải "đang nối được" — khoá bị Google huỷ mà thẻ vẫn hiện ✓ xanh, không có nút nối lại.
  let loiKetNoi: string | null = null;
  if (daKetNoi) {
    try {
      const tt = await thongTinTaiKhoan();
      email = tt.email;
      dungLuong = tt.dungLuong;
    } catch (err) {
      // token hỏng — vẫn trả trạng thái, client hiện nút Kết nối lại
      loiKetNoi = err instanceof Error ? err.message : "Không gọi được Google Drive.";
    }
  }
  return NextResponse.json({
    ok: true,
    coKhoa,
    loaiKhoa: s.client?.loai ?? null,
    nguonKhoa: s.client?.nguon ?? null,
    clientIdRutGon: s.client ? s.client.clientId.slice(0, 20) + "…" : null,
    daKetNoi,
    email,
    dungLuong,
    loiKetNoi,
    capLuc: s.token?.capLuc ?? null,
  });
}
