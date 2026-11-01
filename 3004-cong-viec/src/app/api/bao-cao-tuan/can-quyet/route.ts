// /api/bao-cao-tuan/can-quyet — tab "Cần ra quyết định" (Mr. Đại chốt 02/10/2026, lib/bao-cao-tuan/can-quyet.ts).
//   GET  ?tu=yyyy-mm-dd&den=yyyy-mm-dd — dòng kiến nghị + quyết định Form 0 của tuần, mỗi dòng kèm việc trên sổ cái (nếu có)
//   POST { khoa, cong_viec_id } — ghi việc vừa giao từ một dòng (chỉ người vừa giao việc đó)
import { tx, layQ } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { coQuyen } from "@sci/identity";
import { dongCanQuyet, ghiGiaoTuKienNghi, locChoBld } from "@/lib/bao-cao-tuan/can-quyet";
import { xetNenBangAi } from "@/lib/bao-cao-tuan/can-quyet-ai";
import { ganNhom, xepNhomNenBangAi } from "@/lib/bao-cao-tuan/can-quyet-nhom-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NGAY = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    if (!coQuyen(nd, "so_cai.xem")) throw new LoiHttp(403, "Bạn không có quyền xem sổ cái");
    const u = new URL(req.url).searchParams;
    const tu = u.get("tu") ?? "";
    const den = u.get("den") ?? "";
    if (!NGAY.test(tu) || !NGAY.test(den)) throw new LoiHttp(400, "Thiếu tuần (từ ngày – đến ngày)");
    // Đã lọc cho BLĐ đọc (bỏ việc đã xong, việc dễ / rất dễ) + mã điểm nóng dễ cần ẩn — ?nong=CV-…,CV-…
    const nong = (u.get("nong") ?? "").split(",").map((x) => x.trim()).filter((x) => /^CV-\d{4}-\d{4}$/.test(x));
    const q = await layQ();
    const kq = await locChoBld(q, await dongCanQuyet(q, { tu, den }), nong);
    // 🤖 Dòng luật code chưa chắc → AI đọc như người, chạy nền; trang hỏi lại sau ít giây (chốt 02/10)
    const choAi = kq.dong.filter((d) => !d.viec && d.ung_vien?.length);
    xetNenBangAi(choAi);
    // 4 nhóm Trước khởi công · Thực thi, kiểm soát · ENC đề xuất · Nhóm khác (20/10/2026): code xếp, dòng chưa chắc 🤖 AI xếp nền
    const nh = await ganNhom(q, kq.dong);
    xepNhomNenBangAi(nh.cho_ai, nh.dl);
    return { ...kq, dong: nh.dong, dang_xet_ai: choAi.length + nh.cho_ai.length };
  });
}

export async function POST(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const b = (await req.json().catch(() => ({}))) as { khoa?: unknown; cong_viec_id?: unknown };
    const khoa = typeof b.khoa === "string" ? b.khoa.trim() : "";
    const ma = typeof b.cong_viec_id === "string" ? b.cong_viec_id.trim() : "";
    if (!khoa || !ma) throw new LoiHttp(400, "Thiếu dòng kiến nghị hoặc mã việc");
    return tx(async (q) => {
      const r = await q.query<{ giao_boi: string | null }>("SELECT giao_boi FROM docflow.cong_viec WHERE id = $1", [ma]);
      if (!r.rows.length) throw new LoiHttp(404, `Không có việc ${ma}`);
      if (r.rows[0].giao_boi !== nd.id && !nd.la_quan_tri) throw new LoiHttp(403, "Chỉ người giao việc này mới gắn được vào dòng kiến nghị");
      await ghiGiaoTuKienNghi(q, khoa, ma, nd.id);
      return { ok: true };
    });
  });
}
