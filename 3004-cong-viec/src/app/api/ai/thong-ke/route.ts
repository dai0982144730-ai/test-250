// /api/ai/thong-ke — THỐNG KÊ DÙNG AI (Mr. Đại chốt 04/10/2026, Cài đặt → Kết nối → mục riêng "Thống kê dùng AI").
//   GET ?che_do=ngay|tuan|thang&ngay=YYYY-MM-DD → số theo múi (giờ / ngày), tổng, 5 người + 5 tính năng tốn token nhất.
//   Quyền cau_hinh.sua (người sửa được cài đặt) — số dùng AI của từng người là thông tin quản trị.
//   Số tính bằng code (lib/ai/thong-ke-ai.ts), đọc sổ data/ai-so-dung.jsonl + ai-ngung.jsonl (+ sổ cũ ai-do-thoi-gian.jsonl).
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { layQ } from "@/lib/db";
import { batBuocQuyen } from "@/lib/ai/route-chung";
import { docLuot, docNgung } from "@/lib/ai/so-dung-ai";
import { cacMui, ngayHopLe, ngayVN, tenNguoiLuot, tenTinhNang, tinhThongKe, type CheDo } from "@/lib/ai/thong-ke-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    batBuocQuyen(nd, "cau_hinh.sua", "Chỉ người sửa được cài đặt mới xem thống kê dùng AI.");
    const u = new URL(req.url).searchParams;
    const cd = u.get("che_do");
    const cheDo: CheDo = cd === "tuan" || cd === "thang" ? cd : "ngay";
    const bayGio = Date.now();
    // Có ghi ngày mà sai (vd 2026-13-45) → báo, không lặng lẽ đổi sang hôm nay (kiểm độc lập 04/10 #6)
    const ngayHoi = u.get("ngay");
    if (ngayHoi && !ngayHopLe(ngayHoi)) throw new LoiHttp(400, `Ngày "${String(ngayHoi).slice(0, 20)}" không có thật — ghi dạng năm-tháng-ngày, ví dụ 2026-10-04.`);
    const ngay = ngayHoi || ngayVN(bayGio);
    const mui = cacMui(cheDo, ngay);
    const tu = mui[0].tuMs;
    const den = mui[mui.length - 1].denMs;
    const { luot, coSoCu } = docLuot(tu, den);
    const tk = tinhThongKe({ luot, ngung: docNgung(tu, den), cheDo, ngay, bayGio, coSoCu });

    // Tên người cho 5 dòng đầu (luật 30: không để mã trần)
    const ids = tk.topNguoi.map((r) => r.ma).filter((m) => m !== "" && m !== "?");
    const bang: Record<string, string> = {};
    if (ids.length) {
      try {
        const q = await layQ();
        const r = await q.query<{ id: string; ten: string }>("SELECT id, ten FROM identity.nguoi_dung WHERE id = ANY($1)", [ids]);
        for (const x of r.rows) bang[x.id] = x.ten;
      } catch {
        /* thiếu tên thì hiện mã — không hỏng cả màn */
      }
    }
    return {
      ok: true,
      ...tk,
      homNay: ngayVN(bayGio),
      topNguoi: tk.topNguoi.map((r) => ({ ...r, ten: tenNguoiLuot(r.ma, bang) })),
      topTinhNang: tk.topTinhNang.map((r) => ({ ...r, ten: tenTinhNang(r.ma) })),
    };
  });
}
