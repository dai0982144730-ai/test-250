// ============================================================
// /api/quan-tri/khoa-agent — CẤP / THU HỒI KHÓA cho agent khác đọc sổ cái (quyền agent.cap_khoa).
//   GET                          → { ok, khoa: KhoaAgentHienThi[], cong_cu: [...] }
//   POST { ten, cong_cu[] }      → { ok, id, khoa }  — khóa GỐC chỉ trả MỘT lần này
//   DELETE ?id=<id>&ly_do=       → { ok }            — thu hồi (không xóa dòng, lịch sử còn đủ)
// Lịch sử: cap_khoa_agent / thu_hoi_khoa_agent.
// ============================================================

import { batBuocDangNhap, LoiHttp, thietBi, xuLy } from "@/lib/phien";
import { layQ, tx } from "@/lib/db";
import { batBuocQuyen, docJson } from "@/lib/ai/route-chung";
import { capKhoa, danhSachKhoa, MAU_CONG_CU, thuHoiKhoa } from "@/lib/mcp/khoa-agent";
import { DANH_MUC_CONG_CU } from "@/lib/mcp/cong-socai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const THONG_BAO = "Chỉ người có quyền «Cấp khóa cho agent đọc sổ cái» mới vào được đây.";

export async function GET(): Promise<Response> {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    batBuocQuyen(nd, "agent.cap_khoa", THONG_BAO);
    const moTa = Object.fromEntries(DANH_MUC_CONG_CU.map((c) => [c.ten, c.mo_ta]));
    return {
      ok: true,
      khoa: await danhSachKhoa(await layQ()),
      cong_cu: MAU_CONG_CU.map((ma) => ({
        ma,
        mo_ta: ma.endsWith(".*") ? `Mọi công cụ nhóm ${ma.slice(0, -2)} (kể cả công cụ thêm sau)` : moTa[ma] ?? ma,
      })),
    };
  });
}

export async function POST(req: Request): Promise<Response> {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    batBuocQuyen(nd, "agent.cap_khoa", THONG_BAO);
    const b = await docJson(req);
    const tb = thietBi();
    try {
      const kq = await tx((q) => capKhoa(q, nd, { ten: String(b.ten ?? ""), cong_cu: b.cong_cu }, tb));
      return { ok: true, ...kq, message: "Đã cấp khóa. Chép khóa ngay — khóa gốc chỉ hiện MỘT lần này." };
    } catch (e) {
      throw new LoiHttp(400, e instanceof Error ? e.message : "Không cấp được khóa.");
    }
  });
}

export async function DELETE(req: Request): Promise<Response> {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    batBuocQuyen(nd, "agent.cap_khoa", THONG_BAO);
    const sp = new URL(req.url).searchParams;
    const id = sp.get("id") ?? "";
    if (!/^[a-z0-9-]{3,64}$/.test(id)) throw new LoiHttp(400, "Thiếu hoặc sai mã khóa.");
    const lyDo = (sp.get("ly_do") ?? "").slice(0, 300) || null;
    const tb = thietBi();
    try {
      await tx((q) => thuHoiKhoa(q, nd, id, lyDo, tb));
    } catch (e) {
      throw new LoiHttp(400, e instanceof Error ? e.message : "Không thu hồi được khóa.");
    }
    return { ok: true, message: "Đã thu hồi khóa — agent dùng khóa này sẽ bị từ chối ngay." };
  });
}
