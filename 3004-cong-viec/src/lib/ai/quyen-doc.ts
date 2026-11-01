// ============================================================
// quyen-doc.ts — TRỢ LÝ CHỈ ĐỌC ĐÚNG PHẦN NGƯỜI HỎI CÓ QUYỀN (thuần, không đụng CSDL — dễ test).
// Dùng coQuyen của @sci/identity; phạm vi: của mình ⊂ đơn vị ⊂ đơn vị và cấp dưới ⊂ toàn bộ.
// ============================================================

import { coQuyen } from "@sci/identity";
import type { DonVi, DongLichSu, NguoiDungPhien } from "@/lib/types";
import type { DongSoCai } from "@/lib/so-cai/dich-vu";

type Cay = Pick<DonVi, "id" | "cha_id">[];

/** Người hỏi có thấy việc này trong sổ cái không (quyền so_cai.xem theo phạm vi). */
export function thayViec(nd: NguoiDungPhien, cay: Cay, v: Pick<DongSoCai, "giao_boi" | "don_vi_giao" | "phan_viec">): boolean {
  if (nd.la_quan_tri) return true;
  const pv = nd.quyen["so_cai.xem"];
  if (!pv) return false;
  if (pv === "toan_bo") return true;
  // Việc mình giao hoặc mình phụ trách một phần → luôn thấy
  if (v.giao_boi === nd.id) return true;
  const phan = v.phan_viec ?? [];
  if (phan.some((p) => p.phu_trach_loai === "nguoi" && p.phu_trach_id === nd.id)) return true;
  if (pv === "cua_minh") return false;
  const donVi = new Set<string>();
  for (const p of phan) if (p.phu_trach_loai === "don_vi") donVi.add(p.phu_trach_id);
  if (v.don_vi_giao) donVi.add(v.don_vi_giao);
  return Array.from(donVi).some((d) => coQuyen(nd, "so_cai.xem", { don_vi_id: d }, cay));
}

/** Người hỏi có thấy dòng lịch sử này không (quyền lich_su.xem theo phạm vi). */
export function thayLichSu(nd: NguoiDungPhien, cay: Cay, d: Pick<DongLichSu, "nguoi" | "don_vi_id">): boolean {
  return coQuyen(nd, "lich_su.xem", { chu_so_huu: d.nguoi, don_vi_id: d.don_vi_id }, cay);
}

/**
 * Mở xem NỘI DUNG tài liệu. Cấu trúc thư mục thì ai cũng thấy; nội dung theo
 * cấu hình thu_muc.xem_noi_dung_phong_khac: "tat_ca" = ai có quyền tai_lieu.xem
 * (ở bất kỳ phạm vi nào) đều mở được; "theo_quyen" = xét phạm vi trên đơn vị
 * chứa tài liệu (đơn vị lập + mọi đơn vị có tài liệu trong thư mục).
 */
export function xemDuocNoiDung(
  nd: NguoiDungPhien,
  cay: Cay,
  tl: { nguoi_tao: string; don_vi: string[] },
  cheDo: "tat_ca" | "theo_quyen",
): boolean {
  if (nd.la_quan_tri) return true;
  if (tl.nguoi_tao === nd.id) return true;
  if (!nd.quyen["tai_lieu.xem"]) return false;
  if (cheDo === "tat_ca") return true;
  if (tl.don_vi.length === 0) return coQuyen(nd, "tai_lieu.xem", { chu_so_huu: tl.nguoi_tao }, cay);
  return tl.don_vi.some((d) => coQuyen(nd, "tai_lieu.xem", { chu_so_huu: tl.nguoi_tao, don_vi_id: d }, cay));
}

/** Thấy thùng rác của đơn vị (tài liệu đã xóa) khi có quyền khôi phục ở đơn vị đó. */
export function thayThungRac(nd: NguoiDungPhien, cay: Cay, donViId: string): boolean {
  return coQuyen(nd, "tai_lieu.khoi_phuc", { don_vi_id: donViId }, cay);
}
