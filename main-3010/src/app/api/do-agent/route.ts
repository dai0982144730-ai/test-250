// ============================================================
// /api/do-agent — gọi thử một agent bất kỳ trong danh bạ
//
// Dùng cho nút "Gọi thử các con đang bật" ở màn Danh bạ agent.
// Gọi công cụ `suc_khoe` — công cụ mà MỌI agent bắt buộc phải có
// (HOP-DONG-KET-NOI mục 4), nên dùng được với agent nào cũng được,
// kể cả agent chưa tồn tại lúc viết dòng code này.
//
// Chạy phía máy chủ vì cổng MCP chỉ nghe mạng nội bộ — gọi từ trình
// duyệt sẽ bị chặn khác nguồn (CORS).
// ============================================================

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
// Ở MAIN: tự xưng "main" khi đi đo sức khoẻ agent khác (sửa 08/09 khi nhận màn Quan sát)
import { MA_MAIN as TEN_AGENT } from "@/lib/issue-main/model";
import { headerChuoi } from "@/lib/nhat-ky/chuoi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Hạn chờ kiểm sức khỏe — 3 giây theo HOP-DONG-KET-NOI mục 6.1 */
const HAN_CHO_MS = 3000;

export async function POST(req: Request) {
  const auth = await requireRole("xem");
  if (!auth.ok) return auth.response;

  let body: { diaChi?: string; duongDanMcp?: string; ma?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ song: false, chiTiet: "Body phải là JSON." });
  }

  const diaChi = (body.diaChi ?? "").trim().replace(/\/+$/, "");
  const ma = (body.ma ?? "").trim();
  let duongDan = (body.duongDanMcp ?? "").trim();
  if (duongDan === "") duongDan = `/api/mcp/${ma}`;
  if (!duongDan.startsWith("/")) duongDan = "/" + duongDan;

  if (diaChi === "") {
    return NextResponse.json({ song: false, chiTiet: "Chưa khai địa chỉ." });
  }

  const bd = Date.now();
  try {
    const res = await fetch(`${diaChi}${duongDan}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headerChuoi() },
      body: JSON.stringify({
        cong_cu: "suc_khoe",
        agent_goi: TEN_AGENT,
        ly_do_goi: "màn Danh bạ agent — gọi thử xem con này còn sống không",
      }),
      signal: AbortSignal.timeout(HAN_CHO_MS),
      cache: "no-store",
    });

    const mgy = Date.now() - bd;
    const than = (await res.json().catch(() => null)) as { ok?: boolean } | null;

    if (than && typeof than.ok === "boolean") {
      return NextResponse.json({
        song: true,
        chiTiet: `Trả lời sau ${mgy.toLocaleString("vi-VN")}ms, đúng khuôn hợp đồng kết nối.`,
      });
    }
    return NextResponse.json({
      song: false,
      chiTiet: `Có trả lời (${mgy.toLocaleString("vi-VN")}ms) nhưng KHÔNG đúng khuôn — thiếu trường "ok".`,
    });
  } catch (e) {
    const laHetGio = e instanceof Error && /timeout|abort/i.test(e.message + e.name);
    return NextResponse.json({
      song: false,
      chiTiet: laHetGio
        ? `Quá ${HAN_CHO_MS / 1000} giây không trả lời — agent chưa bật, hoặc sai địa chỉ.`
        : `Không nối được tới ${diaChi}${duongDan} — kiểm lại địa chỉ và cổng.`,
    });
  }
}
