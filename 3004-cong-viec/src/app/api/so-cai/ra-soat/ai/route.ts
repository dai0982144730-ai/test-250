// POST /api/so-cai/ra-soat/ai { tai_lieu_id, viec: ThemViecAi[] } | { tai_lieu_id, phien_ban, bo_qua: câu gốc[] }
// — ghi vào sổ cái các việc "AI đọc báo cáo" tìm thấy
// ngoài bảng của một báo cáo ĐÃ GỬI (quản trị chọn trong Rà soát sổ cái), theo ngày gửi gốc. Quyền: quản trị hoặc cau_hinh.sua.
import { tx } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { suaDuocMoiNhom } from "@/lib/cau-hinh/quyen";
import { themViecAiChoBanDaGui } from "@/lib/so-cai/ra-soat";
import { boQuaViecAi, type ThemViecAi } from "@/lib/so-cai/ai-doc-bao-cao";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    if (!suaDuocMoiNhom(nd)) throw new LoiHttp(403, "Chỉ quản trị viên hoặc người có quyền sửa cài đặt mới bổ sung sổ cái");
    const v = (await req.json().catch(() => null)) as { tai_lieu_id?: string; phien_ban?: number; viec?: ThemViecAi[]; bo_qua?: string[] } | null;
    if (!v?.tai_lieu_id) throw new LoiHttp(400, "Thiếu tài liệu");
    // Bỏ qua: việc AI tìm thấy mà quản trị quyết "không phải việc"
    if (Array.isArray(v.bo_qua) && v.bo_qua.length) {
      if (!v.phien_ban) throw new LoiHttp(400, "Thiếu phiên bản");
      await tx((q) => boQuaViecAi(q, v.tai_lieu_id!, v.phien_ban!, v.bo_qua!.slice(0, 50)));
      return { bo_qua: v.bo_qua.length };
    }
    if (!Array.isArray(v.viec) || !v.viec.length) throw new LoiHttp(400, "Chưa chọn việc nào");
    const so_cai = await tx((q) => themViecAiChoBanDaGui(q, v.tai_lieu_id!, v.viec!.slice(0, 50)));
    return { so_cai };
  });
}
