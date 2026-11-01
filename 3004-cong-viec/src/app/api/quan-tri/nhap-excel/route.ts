// POST /api/quan-tri/nhap-excel (multipart: tep, thu=1 xem trước, mat_khau_ban_dau, cap_nhat=0|1)
// Xem trước: trả từng dòng kèm lỗi, không ghi. Nhập: ghi dòng hợp lệ, trả kết quả + mật khẩu tạm của người mới.
import type { NextRequest } from "next/server";
import { tx } from "@/lib/db";
import { dongBoChucDanh } from "@/lib/to-chuc";
import { LoiHttp } from "@/lib/phien";
import { kiemTraNhap, nhapNguoiDungExcel, laQuanTriToanBo } from "@sci/identity/server";
import { xuLyIdentity } from "@/lib/cau-hinh/cau-noi-identity";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { batBuocQuanTri } from "../_chung";

export const dynamic = "force-dynamic";

const TOI_DA = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  return xuLyIdentity(async () => {
    const p = await batBuocQuanTri();
    // Nhập hàng loạt đụng mọi đơn vị và gán vai trò → chỉ người quản lý toàn bộ
    if (!laQuanTriToanBo(p.nd)) throw new LoiHttp(403, "Chỉ người quản lý toàn bộ người dùng mới nhập được từ Excel");
    const form = await req.formData().catch(() => null);
    const tep = form?.get("tep");
    if (!form || !tep || typeof tep === "string") throw new LoiHttp(400, "Chưa chọn file Excel");
    if (tep.size > TOI_DA) throw new LoiHttp(400, "File quá lớn (tối đa 5 MB)");
    const duLieu = new Uint8Array(await tep.arrayBuffer());
    const tk = await layCauHinh(p.q, "tai_khoan");
    const matKhau = String(form.get("mat_khau_ban_dau") ?? "");
    if (matKhau && matKhau.length < tk.do_dai_mat_khau_toi_thieu)
      throw new LoiHttp(400, `Mật khẩu ban đầu phải có ít nhất ${tk.do_dai_mat_khau_toi_thieu} ký tự`);
    const tuyChon = {
      cap_nhat_nguoi_da_co: form.get("cap_nhat") !== "0",
      mat_khau_ban_dau: matKhau || undefined,
      vai_tro_mac_dinh: tk.vai_tro_mac_dinh,
      do_dai_mat_khau: tk.do_dai_mat_khau_toi_thieu,
    };
    if (form.get("thu") === "1") return { xem_truoc: true, dong: await kiemTraNhap(p.q, duLieu, tuyChon) };
    return { xem_truoc: false, ...(await tx(async (q) => {
      const kq = await nhapNguoiDungExcel(q, p.ng, duLieu, tuyChon);
      await dongBoChucDanh(q);
      return kq;
    })) };
  });
}
