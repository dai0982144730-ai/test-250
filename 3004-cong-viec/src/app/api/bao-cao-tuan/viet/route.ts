// POST /api/bao-cao-tuan/viet { tuan: yyyy-mm-dd, model? } — 🤖 viết lại báo cáo tuần (Ban lãnh đạo / quản trị).
// Chạy nền (AI viết mất vài phút): trả ngay, trang tự tải lại khi bản chuyển sang "xong".
import { layQ } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { vietBaoCaoTuan } from "@/lib/bao-cao-tuan/viet";
import { laBanLanhDao } from "@/lib/bao-cao-tuan/do-kho";
import { goiAiBaoCao } from "@/lib/bao-cao-tuan/nen";
import { layCauHinh } from "@/lib/cau-hinh/doc";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const q = await layQ();
    if (!nd.la_quan_tri && !(await laBanLanhDao(q, nd))) throw new LoiHttp(403, "Chỉ Ban lãnh đạo hoặc quản trị được yêu cầu viết lại");
    const b = (await req.json().catch(() => null)) as { tuan?: string; model?: string } | null;
    if (!b?.tuan || !/^\d{4}-\d{2}-\d{2}$/.test(b.tuan)) throw new LoiHttp(400, "Thiếu tuần cần viết");
    const model = (b.model || (await layCauHinh(q, "bao_cao_tuan")).model || "").trim() || undefined;
    void vietBaoCaoTuan(q, b.tuan, "viet_lai", goiAiBaoCao, model).catch((e) => console.error("[bao-cao-tuan] viết lại lỗi:", e instanceof Error ? e.message : e));
    return { dang_viet: true, model: model ?? "theo AI → Model mặc định" };
  });
}
