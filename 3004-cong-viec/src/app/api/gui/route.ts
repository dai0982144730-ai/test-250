// /api/gui — GỬI tài liệu đã đạt kiểm tra đến một hoặc nhiều nơi. POST {tai_lieu_id, den: string[], xac_nhan_trung?, doi_ten?, them_viec?}
// them_viec: việc "AI đọc báo cáo" tìm thấy ngoài bảng mà người gửi đã tích chọn (tên, người làm, hạn, câu gốc, gộp vào mã việc).
// den: mã đơn vị, hoặc "nguoi:<email>" để gửi thẳng một người (vd Phó TGĐ phụ trách).
import { layQ, tx } from "@/lib/db";
import { batBuocDangNhap, xuLy } from "@/lib/phien";
import { gui } from "@/lib/gui/dich-vu";
import { baoChuaGanDonVi } from "@/lib/gui/chung";
import { docJson } from "@/lib/gui/api";
import { docBaoCaoBangAi, layKetQuaAi, type ThemViecAi } from "@/lib/so-cai/ai-doc-bao-cao";
import { runAIGan } from "@/lib/ai/providers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const v = await docJson<{
      tai_lieu_id: string;
      den?: string[];
      xac_nhan_trung?: Record<number, string>;
      doi_ten?: Record<number, string>;
      them_viec?: ThemViecAi[];
      bo_qua_ai?: string[];
      bo_viec?: number[];
      thay_bld?: Record<number, string>;
    }>(req);
    if (!nd.don_vi_id) await baoChuaGanDonVi(await layQ(), nd);
    const themViec = Array.isArray(v.them_viec) ? v.them_viec.slice(0, 50) : undefined;
    // Việc vào sổ cái LUÔN có AI rà (Mr. Đại chốt 02/10/2026): bản này chưa có lượt "AI đọc báo cáo" (người nộp bỏ qua bước 4,
    // gửi bằng công cụ khác…) → chạy ngay, NGOÀI giao dịch (không giữ khóa CSDL lúc chờ AI). AI lỗi thì đã lưu lỗi, vẫn gửi được.
    const id = String(v.tai_lieu_id ?? "");
    if (id) {
      const q0 = await layQ();
      const pb = (await q0.query<{ p: number }>("SELECT phien_ban_hien_tai AS p FROM docflow.tai_lieu WHERE id = $1", [id])).rows[0]?.p;
      if (pb && !(await layKetQuaAi(q0, id, pb))) await docBaoCaoBangAi(q0, id, pb, (prompt, system) => runAIGan("app/api/gui/route", prompt, system, undefined, undefined, 240_000));
    }
    return tx((q) => gui(q, nd, { tai_lieu_id: String(v.tai_lieu_id ?? ""), den: v.den ?? [], xac_nhan_trung: v.xac_nhan_trung, doi_ten: v.doi_ten, them_viec: themViec, bo_qua_ai: Array.isArray(v.bo_qua_ai) ? v.bo_qua_ai.slice(0, 50) : undefined, bo_viec: Array.isArray(v.bo_viec) ? v.bo_viec.map(Number).slice(0, 500) : undefined, thay_bld: v.thay_bld && typeof v.thay_bld === "object" ? v.thay_bld : undefined }));
  });
}
