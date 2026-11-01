// GET /api/tro-ly/xuat/tai?ma=... — tải file AI đã sinh từ chat. Chỉ tải được file của CHÍNH mình.
import fs from "node:fs";
import { batBuocDangNhap, xuLy } from "@/lib/phien";
import { timFileDaXuat } from "@/lib/tro-ly/xuat-theo-yeu-cau";
import { trangTepKhongCon } from "@/lib/tro-ly/trang-tep-khong-con";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  html: "text/html; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  svg: "image/svg+xml",
  mmd: "text/plain; charset=utf-8",
  dot: "text/plain; charset=utf-8",
  kml: "application/vnd.google-earth.kml+xml",
  dxf: "application/dxf",
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

export async function GET(req: Request): Promise<Response> {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const ma = new URL(req.url).searchParams.get("ma") ?? "";
    const f = timFileDaXuat(ma, nd.id);
    // Người bấm link trong chat được trình duyệt mở thẳng → trả trang HTML tiếng Việt, không trả JSON trần (kiểm độc lập lần 7,
    // 17/10/2026). Nút «📤 Nộp báo cáo này» (KhungSoanGui) chỉ xét r.ok nên không vướng.
    if (!f) return trangTepKhongCon();
    const duoi = f.tenFile.split(".").pop() ?? "";
    return new Response(new Uint8Array(fs.readFileSync(f.duongDan)), {
      headers: {
        "Content-Type": MIME[duoi] ?? "application/octet-stream",
        "Content-Disposition": "attachment; filename*=UTF-8''" + encodeURIComponent(f.tenFile),
        "Cache-Control": "no-store",
      },
    });
  });
}
