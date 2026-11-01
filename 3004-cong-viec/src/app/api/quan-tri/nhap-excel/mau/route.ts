// GET /api/quan-tri/nhap-excel/mau — tải file Excel mẫu (kèm trang danh mục mã đơn vị, vai trò).
import { danhSachVaiTro, taoFileExcelMau } from "@sci/identity/server";
import { xuLyIdentity } from "@/lib/cau-hinh/cau-noi-identity";
import { batBuocQuanTri } from "../../_chung";

export const dynamic = "force-dynamic";

export async function GET() {
  return xuLyIdentity(async () => {
    const p = await batBuocQuanTri();
    const tep = taoFileExcelMau(p.cay.filter((d) => d.active), await danhSachVaiTro(p.q));
    const ten = encodeURIComponent("Mẫu nhập người dùng.xlsx");
    return new Response(tep, {
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="mau-nhap-nguoi-dung.xlsx"; filename*=UTF-8''${ten}`,
      },
    });
  });
}
