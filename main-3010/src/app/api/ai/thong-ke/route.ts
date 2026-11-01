// /api/ai/thong-ke — THỐNG KÊ DÙNG AI (Mr. Đại chốt 04/10/2026 — Đợt 2 nhân bản từ agent Công việc; Cài đặt → tab riêng
// "📊 Thống kê dùng AI").
//   GET ?che_do=ngay|tuan|thang&ngay=YYYY-MM-DD → số theo múi (giờ / ngày), tổng, 5 người + 5 tính năng tốn token nhất.
//   Cửa Cài đặt (PM + Admin) — số dùng AI của từng người là thông tin quản trị.
//   Số tính bằng code (lib/ai/thong-ke-ai.ts), đọc sổ data/ai-so-dung.jsonl + ai-ngung.jsonl.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
import { tenNguoiAi } from "@/lib/ai/moi-truong-ai";
import { docLuot, docNgung } from "@/lib/ai/so-dung-ai";
import { cacMui, ngayHopLe, ngayVN, tenNguoiLuot, tenTinhNang, tinhThongKe, type CheDo } from "@/lib/ai/thong-ke-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
  const auth = await requireRole("caidat", "Chỉ PM và Admin xem thống kê dùng AI.");
  if (!auth.ok) return auth.response;
  const u = new URL(req.url).searchParams;
  const cd = u.get("che_do");
  const cheDo: CheDo = cd === "tuan" || cd === "thang" ? cd : "ngay";
  const bayGio = Date.now();
  // Có ghi ngày mà sai (vd 2026-13-45) → báo, không lặng lẽ đổi sang hôm nay
  const ngayHoi = u.get("ngay");
  if (ngayHoi && !ngayHopLe(ngayHoi)) {
    return NextResponse.json(
      { ok: false, message: `Ngày "${String(ngayHoi).slice(0, 20)}" không có thật — ghi dạng năm-tháng-ngày, ví dụ 2026-10-04.` },
      { status: 400 },
    );
  }
  const ngay = ngayHoi || ngayVN(bayGio);
  const mui = cacMui(cheDo, ngay);
  const tu = mui[0].tuMs;
  const den = mui[mui.length - 1].denMs;
  const { luot, coSoCu } = docLuot(tu, den);
  const tk = tinhThongKe({ luot, ngung: docNgung(tu, den), cheDo, ngay, bayGio, coSoCu });

  // Tên người cho 5 dòng đầu (luật 30: không để mã trần)
  const bang: Record<string, string> = {};
  for (const r of tk.topNguoi) {
    if (r.ma === "" || r.ma === "?") continue;
    const ten = tenNguoiAi(r.ma);
    if (ten) bang[r.ma] = ten;
  }
  return NextResponse.json({
    ok: true,
    ...tk,
    homNay: ngayVN(bayGio),
    topNguoi: tk.topNguoi.map((r) => ({ ...r, ten: tenNguoiLuot(r.ma, bang) })),
    topTinhNang: tk.topTinhNang.map((r) => ({ ...r, ten: tenTinhNang(r.ma) })),
  });
}
