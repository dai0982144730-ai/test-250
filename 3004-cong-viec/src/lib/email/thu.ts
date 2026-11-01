// email/thu.ts — gửi thư thử tới chính mình (quản trị kiểm tra SMTP). CHỈ SERVER.
import type { Q } from "@/lib/db";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { laEmail, tinhCauHinhGuiThu, trangThaiHienThi } from "./cau-hinh";
import { soanThu } from "./soan-thu";
import { xepThu } from "./hang-doi";
import { guiHangDoi, type BoChuyen } from "./bo-gui";

export async function guiThuThu(
  q: Q,
  nd: { id: string; email: string; ten: string },
  tc: { den?: string; chuyen?: BoChuyen } = {},
): Promise<{ ok: boolean; trang_thai: ReturnType<typeof trangThaiHienThi>; thu_id: number | null; den: string; loi: string | null }> {
  const c = tinhCauHinhGuiThu(await layCauHinh(q, "thong_bao"));
  const trang_thai = trangThaiHienThi(c);
  const den = (tc.den ?? nd.email).trim();
  if (!laEmail(den)) return { ok: false, trang_thai, thu_id: null, den, loi: `"${den}" không phải email hợp lệ` };
  if (c.che_do === "chua_cau_hinh" && !tc.chuyen) return { ok: false, trang_thai, thu_id: null, den, loi: c.mo_ta };
  const app = (await layCauHinh(q, "giao_dien")).ten_ung_dung;
  const thu = soanThu({
    ten_ung_dung: app,
    ten_nguoi_nhan: nd.ten,
    tieu_de_mau: "Thư thử gửi email — tiếng Việt có dấu",
    noi_dung: `Đây là thư thử từ ${app}. Nếu anh/chị đọc được thư này thì hộp thư gửi đã cấu hình đúng.\n${trang_thai.mo_ta}`,
    lien_ket: "/cai-dat",
  });
  const id = await xepThu(q, { den, nguoi_nhan: nd.id, loai: "thu", ...thu });
  const kq = await guiHangDoi(q, { chi_id: id, chuyen: tc.chuyen });
  return { ok: kq.da_gui === 1, trang_thai, thu_id: id, den, loi: kq.da_gui === 1 ? null : kq.loi_cuoi ?? kq.mo_ta };
}
