// GET /api/dinh-kem/[id]?tai=1 — tải file đính kèm về máy; không có tai=1 thì mở trực tiếp (PDF / ảnh trong cửa sổ xem).
// Ai đăng nhập và xem được sổ cái thì mở được (mọi việc đều hiện trên sơ đồ cho mọi người).
import { layQ } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { coQuyen } from "@sci/identity";
import { docNoiDungDinhKem, layTepDinhKem } from "@/lib/dinh-kem/kho";
import { hienTrucTiepDuoc } from "@/lib/thu-muc/xem-truoc";

export const dynamic = "force-dynamic";

function tenAscii(ten: string): string {
  return ten.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    if (!coQuyen(nd, "so_cai.xem")) throw new LoiHttp(403, "Bạn không có quyền xem sổ cái nên không mở được file đính kèm");
    const t = await layTepDinhKem(await layQ(), params.id);
    if (!t) throw new LoiHttp(404, "Không có file đính kèm này");
    if (t.xoa_luc) throw new LoiHttp(410, `File "${t.ten_tep}" đã bị xóa do hết thời hạn lưu trữ`);
    const buf = docNoiDungDinhKem(t.id);
    const tai = new URL(req.url).searchParams.get("tai") === "1";
    const tenTai = `filename="${tenAscii(t.ten_tep)}"; filename*=UTF-8''${encodeURIComponent(t.ten_tep)}`;
    const chung = { "X-Content-Type-Options": "nosniff", "Cache-Control": "private, max-age=0, must-revalidate" };
    if (!tai && hienTrucTiepDuoc(t.ten_tep, t.mime)) {
      const mime = t.ten_tep.toLowerCase().endsWith(".pdf") ? "application/pdf" : t.mime;
      return new Response(new Uint8Array(buf), {
        headers: { ...chung, "Content-Type": mime, "Content-Disposition": `inline; ${tenTai}`, "Content-Security-Policy": "sandbox" },
      });
    }
    return new Response(new Uint8Array(buf), {
      headers: { ...chung, "Content-Type": "application/octet-stream", "Content-Disposition": `attachment; ${tenTai}` },
    });
  });
}
