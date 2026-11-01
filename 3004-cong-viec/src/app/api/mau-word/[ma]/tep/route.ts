// /api/mau-word/[ma]/tep — GET: tải mẫu báo cáo (ai cũng tải được).
//   Mặc định: tệp Excel .xlsx ba tờ — Mẫu trắng · Hướng dẫn · Ví dụ đã điền (Mr. Đại chốt 22/10/2026, báo cáo nộp bằng Excel).
//   ?phien_ban=N — tệp Excel dựng từ một phiên bản cũ của mẫu.
//   ?word=1 — file Word mẫu gốc (nguồn dựng tệp Excel; quản trị mẫu dùng). ?ban=vi_du (link cũ) → cùng tệp Excel, ví dụ đã nằm trong.
// POST multipart {tep}: tải lên phiên bản mẫu Word mới (quyền mau.quan_ly).
import { layQ, tx } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { docTepMau, taiLenTepMau } from "@/lib/kiem-tra/quan-ly-mau";
import { taiVe, tepTuForm } from "@/lib/gui/api";
import { layMau } from "@/lib/kiem-tra/kiem-tra";
import { tepExcelCuaMau } from "@/lib/mau-excel/tep-mau";

export const dynamic = "force-dynamic";
const MIME_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function GET(req: Request, { params }: { params: { ma: string } }) {
  return xuLy(async () => {
    await batBuocDangNhap();
    const sp = new URL(req.url).searchParams;
    const pbV = sp.get("phien_ban");
    const pb = pbV ? Number(pbV) : undefined;
    if (pb !== undefined && (!Number.isInteger(pb) || pb < 1)) throw new LoiHttp(400, "Phiên bản không hợp lệ");
    const q = await layQ();
    if (sp.get("word") === "1") {
      const tep = await docTepMau(q, params.ma, pb, "trang");
      if (!tep) throw new LoiHttp(404, "Mẫu này chưa có file Word gốc");
      const ten = (await layMau(q, params.ma))?.ten?.replace(/[\/:*?"<>|]/g, "-");
      return taiVe(ten ? `${ten} - bản Word gốc${pb !== undefined ? ` phiên bản ${pb}` : ""}.docx` : tep.ten_tep, tep.noi_dung);
    }
    const tep = await tepExcelCuaMau(q, params.ma, pb);
    if (!tep) throw new LoiHttp(404, pb !== undefined ? `Mẫu này không có phiên bản ${pb}` : "Không có mẫu này");
    return taiVe(tep.ten_tep, tep.noi_dung, MIME_XLSX);
  });
}

export async function POST(req: Request, { params }: { params: { ma: string } }) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const fd = await req.formData();
    const tep = (await tepTuForm(fd))!;
    return tx((q) => taiLenTepMau(q, nd, params.ma, tep));
  });
}
