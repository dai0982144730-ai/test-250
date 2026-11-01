// /api/mcp/don-so — CHẠY TAY lượt dọn sổ hỏi–đáp theo tuổi (HOP-DONG-KET-NOI 7.1, 26/09/2026)
// để kiểm; vòng tự động 03:30 không cần cửa này. Đặt dưới /api/mcp vì middleware chừa
// cụm đó cho lời gọi máy-máy; route tự chặn bằng khoá nội bộ
// x-sci-noi-bo = sha256("noi-bo:" + AUTH_SECRET).
//   GET  → trạng thái lần dọn gần nhất
//   POST → dọn ngay một lượt (nhãn "tay" — không chặn vòng đêm cùng ngày)
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { khoaNoiBo } from "@/lib/day-sang-agent";
import { docTrangThaiDonSo, donSo, giuSoChoSucKhoe } from "@/lib/nhat-ky/don-so";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dungKhoa(req: Request): boolean {
  const gui = req.headers.get("x-sci-noi-bo") ?? "";
  try {
    const dung = khoaNoiBo();
    return gui.length === dung.length && crypto.timingSafeEqual(Buffer.from(gui), Buffer.from(dung));
  } catch {
    return false;
  }
}

const TU_CHOI = { ok: false, loi: "Thiếu hoặc sai khoá nội bộ (x-sci-noi-bo)." };

export async function GET(req: Request) {
  if (!dungKhoa(req)) return NextResponse.json(TU_CHOI, { status: 401 });
  return NextResponse.json({ ok: true, giu_so: giuSoChoSucKhoe(), trang_thai: docTrangThaiDonSo() });
}

export async function POST(req: Request) {
  if (!dungKhoa(req)) return NextResponse.json(TU_CHOI, { status: 401 });
  const kq = donSo({ boi: "tay" });
  return NextResponse.json({ ok: !kq.loi, ket_qua: kq });
}
