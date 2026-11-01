// GET  /api/email/thu            — (quản trị) trạng thái gửi thư: SMTP / chế độ thử / chưa cấu hình (không lộ mật khẩu).
// POST /api/email/thu { den? }   — (quản trị) gửi ngay một thư thử tới chính mình (hoặc địa chỉ `den`), trả kết quả.
import type { NextRequest } from "next/server";
import { layQ } from "@/lib/db";
import { xuLy } from "@/lib/phien";
import { layCauHinhGuiThu, trangThaiHienThi } from "@/lib/email/cau-hinh";
import { guiThuThu } from "@/lib/email/thu";
import { batBuocQuanTriEmail } from "../_chung";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return xuLy(async () => {
    await batBuocQuanTriEmail();
    return { trang_thai: trangThaiHienThi(await layCauHinhGuiThu(await layQ())) };
  });
}

export async function POST(req: NextRequest) {
  return xuLy(async () => {
    const nd = await batBuocQuanTriEmail();
    const body = (await req.json().catch(() => null)) as { den?: string } | null;
    const den = typeof body?.den === "string" && body.den.trim() ? body.den.trim() : undefined;
    return guiThuThu(await layQ(), nd, { den });
  });
}
