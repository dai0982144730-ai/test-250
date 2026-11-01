// ============================================================
// cau-noi-identity.ts — CẦU NỐI sci-identity ↔ SCI công việc (CHỈ SERVER).
// Gói sci-identity không biết lịch sử / thông báo / cấu hình của SCI công việc; file này cắm chúng vào:
//   - mọi thay đổi người dùng, đơn vị → lịch sử 'sua_nguoi_dung'; vai trò/quyền → 'sua_cau_hinh'
//   - người chưa gán đơn vị → báo quản trị viên theo mẫu thong_bao.mau.chua_gan_don_vi
//   - đăng nhập (xác thực + lịch sử 'dang_nhap')
// ============================================================
import type { Q } from "@/lib/db";
import type { NguoiDungPhien } from "@/lib/types";
import { ghiLichSu } from "@/lib/lich-su/ghi";
import { LoiHttp, napNguoiDung, xuLy } from "@/lib/phien";
import { baoQuanTri, dienMau } from "@/lib/thong-bao";
import { LoiIdentity, xacThuc, type NguCanh, type NguoiChuaGan, type SuKienIdentity } from "@sci/identity/server";
import { layCauHinh } from "./doc";

export async function ghiSuKienIdentity(q: Q, nguoi: string, donViId: string | null, thietBi: string | null, e: SuKienIdentity): Promise<void> {
  const chiTiet = { thao_tac: e.thao_tac, ...(e.chi_tiet ?? {}) };
  if (e.loai === "vai_tro") {
    await ghiLichSu(q, { nguoi, don_vi_id: donViId, thiet_bi: thietBi, doi_tuong_loai: "cau_hinh", doi_tuong_id: `vai_tro:${e.id}`, hanh_dong: "sua_cau_hinh", chi_tiet: { ...chiTiet, vai_tro: e.id } });
    return;
  }
  await ghiLichSu(q, { nguoi, don_vi_id: donViId, thiet_bi: thietBi, doi_tuong_loai: e.loai, doi_tuong_id: e.id, hanh_dong: "sua_nguoi_dung", chi_tiet: chiTiet });
}

/** Báo quản trị viên có người chưa được gán đơn vị (theo cấu hình tai_khoan + thong_bao). */
export async function baoChuaGanDonVi(q: Q, ds: NguoiChuaGan[]): Promise<void> {
  if (ds.length === 0) return;
  const tk = await layCauHinh(q, "tai_khoan");
  if (!tk.bao_quan_tri_chua_gan_don_vi) return;
  const tb = await layCauHinh(q, "thong_bao");
  const ten = ds.length <= 5 ? ds.map((d) => `${d.ten} (${d.email})`).join(", ") : `${ds.slice(0, 5).map((d) => d.ten).join(", ")} và ${ds.length - 5} người khác`;
  await baoQuanTri(q, {
    loai: "chua_gan_don_vi",
    noi_dung: dienMau(tb.mau.chua_gan_don_vi ?? "Có người dùng chưa được gán đơn vị: {ten}", { ten, so: ds.length }),
    lien_ket: "/quan-tri?tab=nguoi-dung&don_vi=chua_gan",
  });
}

/** Ngữ cảnh thao tác cho các hàm ghi của sci-identity. */
export function nguCanh(nd: Pick<NguoiDungPhien, "id" | "don_vi_id">, thietBi: string | null = null): NguCanh {
  return {
    nguoi: nd.id,
    ghiNhatKy: (q, e) => ghiSuKienIdentity(q, nd.id, nd.don_vi_id, thietBi, e),
    baoChuaGanDonVi: (q, ds) => baoChuaGanDonVi(q, ds),
  };
}

/** Như xuLy() nhưng đổi LoiIdentity (lỗi nghiệp vụ của gói) thành LoiHttp cùng mã. */
export function xuLyIdentity(fn: () => Promise<Response | unknown>): Promise<Response> {
  return xuLy(async () => {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof LoiIdentity) throw new LoiHttp(e.status, e.message);
      throw e;
    }
  });
}

/**
 * Đăng nhập (hàm lõi, không đụng cookie): đúng email + mật khẩu và tài khoản còn hoạt động → người dùng đã tính quyền.
 * Ghi lịch sử 'dang_nhap' cả khi thành công lẫn khi sai mật khẩu của một tài khoản có thật.
 */
export async function dangNhap(
  q: Q,
  email: string,
  matKhau: string,
  thietBi: string | null = null,
): Promise<{ ok: true; nguoi_dung: NguoiDungPhien } | { ok: false; loi: string }> {
  const kq = await xacThuc(q, email, matKhau);
  if (!kq.ok) {
    if (kq.id) {
      await ghiLichSu(q, {
        nguoi: kq.id,
        thiet_bi: thietBi,
        doi_tuong_loai: "nguoi_dung",
        doi_tuong_id: kq.id,
        hanh_dong: "dang_nhap",
        chi_tiet: { thanh_cong: false, ly_do: kq.ly_do === "bi_khoa" ? "tài khoản bị khóa" : "sai mật khẩu" },
      });
    }
    return { ok: false, loi: kq.ly_do === "bi_khoa" ? "Tài khoản đã bị khóa, liên hệ quản trị viên" : "Email hoặc mật khẩu không đúng" };
  }
  const nd = await napNguoiDung(q, kq.id);
  if (!nd) return { ok: false, loi: "Tài khoản không còn hoạt động" };
  await ghiLichSu(q, {
    nguoi: nd.id,
    don_vi_id: nd.don_vi_id,
    thiet_bi: thietBi,
    doi_tuong_loai: "nguoi_dung",
    doi_tuong_id: nd.id,
    hanh_dong: "dang_nhap",
    chi_tiet: { thanh_cong: true },
  });
  return { ok: true, nguoi_dung: nd };
}
