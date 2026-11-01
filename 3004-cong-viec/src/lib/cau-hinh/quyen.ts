// cau-hinh/quyen.ts — ai được sửa nhóm cài đặt nào (thuần, dùng được client lẫn server).
// Quy tắc: quản trị viên hoặc có quyền `cau_hinh.sua` → mọi nhóm; ngoài ra theo cấu hình `phan_quyen_cau_hinh`.
import type { NguoiDungPhien } from "@/lib/types";
import type { CauHinh, KhoaCauHinh } from "./mac-dinh";
import { NHOM_CAU_HINH } from "./mac-dinh";

export function suaDuocMoiNhom(nd: NguoiDungPhien): boolean {
  return nd.la_quan_tri || !!nd.quyen["cau_hinh.sua"];
}

export function duocSuaNhom(nd: NguoiDungPhien, khoa: KhoaCauHinh, pq: CauHinh["phan_quyen_cau_hinh"]): boolean {
  // Bảo mật báo cáo tài chính (Mr. Đại chốt 07/10/2026): CHỈ quản trị viên — quyền cau_hinh.sua hay phân quyền nhóm đều không đủ
  if (khoa === "bao_mat") return nd.la_quan_tri;
  if (suaDuocMoiNhom(nd)) return true;
  if (khoa === "phan_quyen_cau_hinh") return false;
  const r = pq?.nhom?.[khoa];
  if (!r || (r.don_vi.length === 0 && r.vai_tro.length === 0)) return false;
  const vaiKhop = r.vai_tro.filter((v) => nd.vai_tro.includes(v));
  const hopVaiTro = r.vai_tro.length === 0 || vaiKhop.length > 0;
  // Trưởng chính (03/10/2026, soát vòng 2): khớp quy tắc CHỈ nhờ vai Trưởng thì đơn vị xét là nơi người đó GIỮ quyền trưởng
  const chiNhoTruong = vaiKhop.length > 0 && vaiKhop.every((v) => v === "truong-don-vi");
  const donViXet = chiNhoTruong && nd.don_vi_truong ? nd.don_vi_truong : nd.don_vi_ids;
  const hopDonVi = r.don_vi.length === 0 || r.don_vi.some((d) => donViXet.includes(d));
  return hopDonVi && hopVaiTro;
}

/** Các nhóm người này sửa được. */
export function nhomDuocSua(nd: NguoiDungPhien, pq: CauHinh["phan_quyen_cau_hinh"]): KhoaCauHinh[] {
  return NHOM_CAU_HINH.map((n) => n.khoa).filter((k) => duocSuaNhom(nd, k, pq));
}
