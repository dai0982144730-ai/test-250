// ============================================================
// GET /api/v1/so-cai — API REST CHỈ ĐỌC cho agent khác: việc đang mở trong sổ cái.
//   ?don_vi=&du_an=&nguoi=&luon_mo=true|false&canh_bao=qua_han|sap_den_han&tu_khoa=&gioi_han=
//   header Authorization: Bearer <khóa agent> (công cụ socai.danh_sach_viec)
// → cùng khuôn với cổng MCP: { ok, du_lieu: { tong, viec: DongSoCaiAgent[] }, nguon, ... }
// ============================================================

import { NextResponse } from "next/server";
import { chayVoiNguCanh, thietBiTuHeaders } from "@/lib/ngu-canh";
import { layQ } from "@/lib/db";
import { chayChoKhoa, xacThucRest } from "@/lib/mcp/cua-vao";
import { thatBai } from "@/lib/mcp/khuon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  // Ngữ cảnh yêu cầu: lịch sử agent_doc ghi được thiết bị của agent gọi
  return chayVoiNguCanh({ thiet_bi: thietBiTuHeaders(req.headers) }, () => chayGET(req));
}

async function chayGET(req: Request): Promise<Response> {
  try {
    const q = await layQ();
    const xt = await xacThucRest(q, req.headers, "socai.danh_sach_viec");
    if (!xt.ok) return NextResponse.json({ loi: xt.loi }, { status: xt.status });
    const sp = new URL(req.url).searchParams;
    const tham: Record<string, unknown> = {};
    for (const k of ["don_vi", "du_an", "nguoi", "canh_bao", "tu_khoa", "gioi_han"]) {
      const v = sp.get(k);
      if (v !== null && v.trim() !== "") tham[k] = v.trim();
    }
    const lm = sp.get("luon_mo");
    if (lm === "true" || lm === "false") tham.luon_mo = lm === "true";
    const kq = await chayChoKhoa(q, xt.khoa, "socai.danh_sach_viec", tham);
    return NextResponse.json(kq, { status: kq.ok ? 200 : kq.ma_loi === "KHONG_HIEU_YEU_CAU" ? 400 : kq.ma_loi === "KHONG_CO_DU_LIEU" ? 404 : 503 });
  } catch (e) {
    return NextResponse.json(thatBai("LOI_NOI_BO", e instanceof Error ? e.message : "Lỗi không rõ."), { status: 500 });
  }
}
