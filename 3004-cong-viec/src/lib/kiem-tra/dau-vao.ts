// ============================================================
// kiem-tra/dau-vao.ts — dựng DauVaoSoCai từ kết quả kiểm tra (dùng chung cho kiểm tra xem trước và gửi).
// ============================================================
import type { DauVaoSoCai, DinhNghiaMau, KetQuaKiemTra, KyBaoCao, MauWord } from "@/lib/types";

export function nhanKy(ky?: KyBaoCao | null): string {
  if (!ky) return "";
  const so = ky.so ?? "";
  if (ky.loai === "tuan") return `tuần ${so}`;
  if (ky.loai === "thang") return `tháng ${so}`;
  if (ky.loai === "quy") return `quý ${so}`;
  return ky.den ?? "";
}

export function nhanMau(ma: string | null): string {
  if (!ma) return "Tài liệu";
  const m = /^form-(\d+)$/.exec(ma);
  return m ? `Form ${m[1]}` : ma;
}

/** Tag các bảng quyết định (Form 0): không vào sổ cái lúc gửi — TGĐ quyết định rồi giao việc (QuyetDinhGiaoViec). */
export function bangQuyetDinh(dn: DinhNghiaMau | null | undefined): Set<string> {
  return new Set((dn?.bang_cong_viec ?? []).filter((b) => b.la_quyet_dinh).map((b) => b.tag));
}

/** Chỉ số các dòng việc (trong kq.cong_viec) sẽ vào sổ cái lúc gửi. */
export function chiSoVaoSoCai(kq: KetQuaKiemTra, mau: MauWord | null): number[] {
  const qd = bangQuyetDinh(mau?.dinh_nghia);
  return kq.cong_viec.map((c, i) => (qd.has(c.nguon_bang) ? -1 : i)).filter((i) => i >= 0);
}

export function dungDauVao(v: {
  kq: KetQuaKiemTra;
  mau: MauWord | null;
  tai_lieu_id: string | null;
  phien_ban: number | null;
  ten_don_vi: string;
  don_vi_id: string | null;
  cap: number;
  nguoi_gui: string;
  ngay_gui?: string;
  xac_nhan_trung?: Record<number, string>;
}): { dau_vao: DauVaoSoCai; chi_so: number[] } {
  const chi_so = chiSoVaoSoCai(v.kq, v.mau);
  const ky = nhanKy(v.kq.ky_bao_cao);
  return {
    chi_so,
    dau_vao: {
      tai_lieu_id: v.tai_lieu_id,
      phien_ban: v.phien_ban,
      mau_ma: v.kq.mau_ma,
      nhan: [v.ten_don_vi, nhanMau(v.kq.mau_ma), ky].filter(Boolean).join(" · "),
      don_vi_id: v.don_vi_id,
      cap: v.cap,
      nguoi_gui: v.nguoi_gui,
      ky_bao_cao_den: v.kq.ky_bao_cao?.den ?? null,
      ngay_gui: v.ngay_gui ?? new Date().toISOString(),
      cong_viec: chi_so.map((i) => v.kq.cong_viec[i]),
      ...(v.xac_nhan_trung ? { xac_nhan_trung: v.xac_nhan_trung } : {}),
    },
  };
}
