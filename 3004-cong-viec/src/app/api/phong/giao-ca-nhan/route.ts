// GET /api/phong/giao-ca-nhan — hộp «Giao cho cá nhân» ở màn giao việc (Sơ đồ tổ chức + Dự án; Mr. Đại chốt 29/10/2026).
// Người mà người đang đăng nhập giao ĐÍCH DANH được (cùng luật batBuocTrongPhamVi / dsNoiNhan), xếp theo đơn vị; Ban lãnh đạo giao lẫn nhau.
// Chỉ đọc. Quyền "Giao việc".
import { tx } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { dsNoiNhan } from "@/lib/cay-viec/noi-nhan";
import { nhomCaNhanTheoDonVi } from "@/lib/cay-viec/noi-nhan-thuan";

export const dynamic = "force-dynamic";

export async function GET() {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    if (!nd.la_quan_tri && !nd.quyen["cong_viec.giao"]) throw new LoiHttp(403, "Bạn không có quyền giao việc");
    const d = await tx((q) => dsNoiNhan(q, nd));
    return { nhom: nhomCaNhanTheoDonVi(d.don_vi, d.nguoi, d.nhom.ca_nhan, nd.id) };
  });
}
