// POST /api/tro-ly/xuat — xuất một câu trả lời trợ lý ra file. body { dinhDang: "md|html|docx|xlsx", noiDung }
// → trả THẲNG bytes (Content-Disposition attachment). Chỉ đọc, không ghi dữ liệu nghiệp vụ.
import { batBuocDangNhap, LoiHttp, xuLy } from "@/lib/phien";
import { DINH_DANG_XUAT, xuatTraLoi, type DinhDangXuat } from "@/lib/tro-ly/xuat-chat";
import { docJson } from "@/lib/ai/route-chung";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  return xuLy(async () => {
    await batBuocDangNhap();
    const body = await docJson(req);
    const dinhDang = typeof body.dinhDang === "string" ? body.dinhDang : "";
    const noiDung = typeof body.noiDung === "string" ? body.noiDung : "";
    if (!DINH_DANG_XUAT.some((d) => d.ma === dinhDang)) throw new LoiHttp(400, `Định dạng "${dinhDang}" chưa hỗ trợ.`);
    if (noiDung.trim() === "" || noiDung.length > 200_000) throw new LoiHttp(400, "Nội dung rỗng hoặc quá 200KB — không xuất.");
    const f = await xuatTraLoi(dinhDang as DinhDangXuat, noiDung);
    return new Response(new Uint8Array(f.buffer), {
      headers: {
        "Content-Type": f.mime,
        // RFC 5987 — giữ được tên file tiếng Việt
        "Content-Disposition": "attachment; filename*=UTF-8''" + encodeURIComponent(f.tenFile),
        "Cache-Control": "no-store",
      },
    });
  });
}
