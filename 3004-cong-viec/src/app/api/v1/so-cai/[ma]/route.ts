// GET /api/v1/so-cai/<mã việc> — API REST CHỈ ĐỌC: một việc (đang mở hoặc đã xong) kèm quá trình.
// header Authorization: Bearer <khóa agent> (công cụ socai.chi_tiet_viec). Khuôn như cổng MCP.
import { NextResponse } from "next/server";
import { chayVoiNguCanh, thietBiTuHeaders } from "@/lib/ngu-canh";
import { layQ } from "@/lib/db";
import { chayChoKhoa, xacThucRest } from "@/lib/mcp/cua-vao";
import { thatBai } from "@/lib/mcp/khuon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { ma: string } }): Promise<Response> {
  // Ngữ cảnh yêu cầu: lịch sử agent_doc ghi được thiết bị của agent gọi
  return chayVoiNguCanh({ thiet_bi: thietBiTuHeaders(req.headers) }, () => chayGET(req, { params }));
}

async function chayGET(req: Request, { params }: { params: { ma: string } }): Promise<Response> {
  try {
    const q = await layQ();
    const xt = await xacThucRest(q, req.headers, "socai.chi_tiet_viec");
    if (!xt.ok) return NextResponse.json({ loi: xt.loi }, { status: xt.status });
    const kq = await chayChoKhoa(q, xt.khoa, "socai.chi_tiet_viec", { ma_viec: decodeURIComponent(params.ma) });
    return NextResponse.json(kq, { status: kq.ok ? 200 : kq.ma_loi === "KHONG_HIEU_YEU_CAU" ? 400 : kq.ma_loi === "KHONG_CO_DU_LIEU" ? 404 : 503 });
  } catch (e) {
    return NextResponse.json(thatBai("LOI_NOI_BO", e instanceof Error ? e.message : "Lỗi không rõ."), { status: 500 });
  }
}
