// ============================================================
// POST /api/mcp/dong-bo-tu-main — Main ĐẨY "kéo lại ngay" sang agent Công việc (04/10/2026, nhận vai agent Base)
//
// Main (4-agent-main/src/lib/day-sang-agent.ts) gọi đường này của mọi agent con ngay khi vừa ghi dự án / người dùng,
// kèm đầu thư x-sci-noi-bo (khoá CHUNG). Agent Công việc chỉ kéo danh mục DỰ ÁN (keoDuAnTuMain — LOI-DUNG-CHUNG 6g.6);
// người dùng vẫn giữ tại chỗ cho tới Đợt 3. Trả khuôn Main đọc: { ok, vet: { tomTat, loi } }.
// Middleware bỏ qua /api/mcp/* nên không cần cookie; chỉ nhận lời gọi mạng nội bộ.
// ============================================================
import { NextResponse } from "next/server";
import { coKhoaNoiBo } from "@/lib/mcp/khoa-chung";
import { keoDuAnTuMain } from "@/lib/du-an-main";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const host = (req.headers.get("host") ?? "").toLowerCase();
  if (!(host.startsWith("localhost") || host.startsWith("127.") || host.startsWith("[::1]"))) {
    return NextResponse.json({ ok: false, loi: "Chỉ nhận lời gọi trên mạng nội bộ." }, { status: 403 });
  }
  if (!coKhoaNoiBo(req)) {
    return NextResponse.json({ ok: false, loi: "Thiếu hoặc sai khoá nội bộ (x-sci-noi-bo) — chỉ Main được đẩy đồng bộ." }, { status: 401 });
  }
  const b = (await req.json().catch(() => ({}))) as { ly_do?: unknown };
  const lyDo = typeof b.ly_do === "string" && b.ly_do.trim() ? b.ly_do.trim().slice(0, 200) : "Main vừa ghi dữ liệu dùng chung";
  const vet = await keoDuAnTuMain(`Main đẩy sang: ${lyDo} — kéo lại danh mục dự án`, true);
  const tomTat = vet.ok
    ? `đã kéo ${vet.so_main} dự án từ Main${vet.co_thay_doi ? `, ghi ${vet.so_ghi} thay đổi` : ", không có gì đổi"} (agent Công việc chỉ kéo dự án; người dùng chờ Đợt 3)`
    : `chưa kéo được: ${vet.loi ?? "không rõ"}`;
  return NextResponse.json({ ok: vet.ok, vet: { tomTat, loi: vet.ok ? null : vet.loi } });
}
