// GET  /api/email/hang-doi?trang_thai=cho|dang_gui|da_gui|loi&gioi_han=100 — (quản trị) thư chờ / lỗi / đã gửi + số đếm.
// POST /api/email/hang-doi { thu_lai: number[] | "tat_ca_loi" } — đưa thư lỗi về hàng chờ;
//                          { gui_ngay: true } — chạy bộ gửi ngay một lượt.
import type { NextRequest } from "next/server";
import { layQ } from "@/lib/db";
import { LoiHttp, xuLy } from "@/lib/phien";
import { layCauHinhGuiThu, trangThaiHienThi } from "@/lib/email/cau-hinh";
import { danhSachHangDoi, thuLaiThu } from "@/lib/email/hang-doi";
import { guiHangDoi } from "@/lib/email/bo-gui";
import { batBuocQuanTriEmail } from "../_chung";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TRANG_THAI = ["cho", "dang_gui", "da_gui", "loi"];

export async function GET(req: NextRequest) {
  return xuLy(async () => {
    await batBuocQuanTriEmail();
    const q = await layQ();
    const sp = req.nextUrl.searchParams;
    const tt = sp.get("trang_thai");
    if (tt && !TRANG_THAI.includes(tt)) throw new LoiHttp(400, `Trạng thái "${tt}" không hợp lệ (${TRANG_THAI.join(", ")})`);
    const ds = await danhSachHangDoi(q, { trang_thai: tt, gioi_han: Number(sp.get("gioi_han")) || 100 });
    return { ...ds, trang_thai: trangThaiHienThi(await layCauHinhGuiThu(q)) };
  });
}

export async function POST(req: NextRequest) {
  return xuLy(async () => {
    await batBuocQuanTriEmail();
    const body = (await req.json().catch(() => null)) as { thu_lai?: number[] | "tat_ca_loi"; gui_ngay?: boolean } | null;
    const q = await layQ();
    if (body?.thu_lai !== undefined) {
      if (body.thu_lai !== "tat_ca_loi" && !Array.isArray(body.thu_lai)) throw new LoiHttp(400, "thu_lai phải là danh sách id hoặc \"tat_ca_loi\"");
      return { ok: true, da_dua_ve_hang_cho: await thuLaiThu(q, body.thu_lai) };
    }
    if (body?.gui_ngay) return { ok: true, ket_qua: await guiHangDoi(q, { gioi_han: 50 }) };
    throw new LoiHttp(400, "Cần { thu_lai } hoặc { gui_ngay: true }");
  });
}
