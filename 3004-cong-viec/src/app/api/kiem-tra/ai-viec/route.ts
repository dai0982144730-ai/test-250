// /api/kiem-tra/ai-viec — "AI ĐỌC BÁO CÁO" cho một bản tài liệu (so-cai/ai-ra-viec.ts, so-cai/ai-doc-bao-cao.ts):
// việc viết NGOÀI bảng (kèm câu gốc), tên việc gợi ý, việc trùng theo nghĩa trong sổ cái. Chỉ gợi ý — người gửi chọn mới áp dụng.
// GET  ?tai_lieu_id=&phien_ban=  → kết quả đã lưu { ket_qua, loi, luc } hoặc null (chưa đọc)
// POST { tai_lieu_id, phien_ban? } → cho AI đọc (lại), lưu và trả kết quả. AI lỗi → trả { loi } (không phải lỗi HTTP: không chặn gửi).
import { layQ } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { duocXemNoiDung } from "@/lib/thu-muc/truy-van";
import { runAIGan } from "@/lib/ai/providers";
import { docBaoCaoBangAi, layKetQuaAi } from "@/lib/so-cai/ai-doc-bao-cao";

export const dynamic = "force-dynamic";

async function banCanDoc(taiLieuId: string, phienBan?: number | null): Promise<number> {
  const q = await layQ();
  if (phienBan) return phienBan;
  const r = await q.query<{ p: number }>("SELECT phien_ban_hien_tai AS p FROM docflow.tai_lieu WHERE id = $1", [taiLieuId]);
  if (!r.rows[0]) throw new LoiHttp(404, "Không tìm thấy tài liệu");
  return r.rows[0].p;
}

export async function GET(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const u = new URL(req.url).searchParams;
    const id = u.get("tai_lieu_id");
    if (!id) throw new LoiHttp(400, "Thiếu tài liệu");
    const q = await layQ();
    if (!(await duocXemNoiDung(q, nd, id))) throw new LoiHttp(403, "Bạn không có quyền mở tài liệu này");
    return { ket_qua_ai: await layKetQuaAi(q, id, await banCanDoc(id, Number(u.get("phien_ban")) || null)) };
  });
}

export async function POST(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const v = (await req.json().catch(() => null)) as { tai_lieu_id?: string; phien_ban?: number } | null;
    if (!v?.tai_lieu_id) throw new LoiHttp(400, "Thiếu tài liệu");
    if (!(await duocXemNoiDung(await layQ(), nd, v.tai_lieu_id))) throw new LoiHttp(403, "Bạn không có quyền mở tài liệu này");
    const pb = await banCanDoc(v.tai_lieu_id, v.phien_ban);
    // Không bọc giao dịch: lượt AI có thể mất vài phút, không giữ khóa CSDL trong lúc chờ (chỉ đọc + một lệnh ghi kết quả)
    const kq = await docBaoCaoBangAi(await layQ(), v.tai_lieu_id, pb, (prompt, system) => runAIGan("app/api/kiem-tra/ai-viec/route", prompt, system, undefined, undefined, 240_000));
    return { ket_qua_ai: kq };
  });
}
