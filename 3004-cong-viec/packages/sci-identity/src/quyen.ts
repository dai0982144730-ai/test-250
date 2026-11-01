// ============================================================
// quyen.ts — TÍNH QUYỀN (thuần, không đụng CSDL — dùng được mọi nơi, dễ test).
// Phạm vi: cua_minh ⊂ don_vi ⊂ don_vi_va_cap_duoi ⊂ toan_bo.
// ============================================================
import type { DonVi, NguoiDungPhien, PhamVi, Quyen } from "@/lib/types";

export const THU_TU_PHAM_VI: PhamVi[] = ["cua_minh", "don_vi", "don_vi_va_cap_duoi", "toan_bo"];

export function phamViRongHon(a: PhamVi | undefined, b: PhamVi | undefined): PhamVi | undefined {
  if (!a) return b;
  if (!b) return a;
  return THU_TU_PHAM_VI.indexOf(a) >= THU_TU_PHAM_VI.indexOf(b) ? a : b;
}

/** Đối tượng đang xét quyền: của ai, thuộc đơn vị nào. */
export interface DoiTuongQuyen {
  chu_so_huu?: string | null; // nguoi_dung.id người tạo/tải lên
  don_vi_id?: string | null; // đơn vị sở hữu (vd thư mục của đơn vị nào)
}

/** Các đơn vị con cháu (kể cả chính nó). */
export function donViVaCapDuoi(cay: Pick<DonVi, "id" | "cha_id">[], goc: string): Set<string> {
  const kq = new Set<string>([goc]);
  let them = true;
  while (them) {
    them = false;
    for (const d of cay) {
      if (d.cha_id && kq.has(d.cha_id) && !kq.has(d.id)) {
        kq.add(d.id);
        them = true;
      }
    }
  }
  return kq;
}

/**
 * Người dùng có quyền `quyen` trên đối tượng không.
 * Không truyền doiTuong = hỏi "có quyền này ở phạm vi nào đó không".
 */
export function coQuyen(
  nd: NguoiDungPhien,
  quyen: Quyen,
  doiTuong?: DoiTuongQuyen,
  cay: Pick<DonVi, "id" | "cha_id">[] = [],
): boolean {
  if (nd.la_quan_tri) return true;
  const pv = nd.quyen[quyen];
  if (!pv) return false;
  if (!doiTuong || pv === "toan_bo") return true;
  if (doiTuong.chu_so_huu && doiTuong.chu_so_huu === nd.id) return true;
  const dv = doiTuong.don_vi_id;
  if (!dv) return false;
  const trongPhamVi = (p: PhamVi | undefined, donVi: string[]): boolean =>
    p === "toan_bo" ||
    (p === "don_vi" && donVi.includes(dv)) ||
    (p === "don_vi_va_cap_duoi" && donVi.some((g) => donViVaCapDuoi(cay, g).has(dv)));
  // ⭐ Trưởng chính (03/10/2026): quyền của vai Trưởng chỉ áp ở đơn vị người này GIỮ quyền trưởng (don_vi_truong);
  // quyền các vai trò khác áp trên mọi đơn vị của người đó như cũ. `quyen` vẫn là trần (nơi khác thu hẹp quyền thì vẫn hiệu lực).
  // Chỉ có khi người đó không giữ quyền trưởng ở ít nhất một đơn vị của mình (lib/phien.ts — từ 08/10 chỉ còn trưởng chính không
  // mang vai Trưởng mà thuộc thêm đơn vị khác; trưởng phụ giữ đủ quyền trưởng) — còn lại tính như trước.
  if (nd.don_vi_truong && nd.quyen_thanh_vien) {
    const tran = (p: PhamVi | undefined) => (phamViKhongRongHon(p, pv) ? p : pv);
    return trongPhamVi(tran(nd.quyen_thanh_vien[quyen]), nd.don_vi_ids) || trongPhamVi(tran(nd.quyen_truong?.[quyen]), nd.don_vi_truong);
  }
  return trongPhamVi(pv, nd.don_vi_ids);
}

// ---------------- Tiện ích cho trang quản trị (thuần) ----------------

export const PHAM_VI_NHAN: Record<PhamVi, string> = {
  cua_minh: "Của mình",
  don_vi: "Đơn vị mình",
  don_vi_va_cap_duoi: "Mình + cấp dưới",
  toan_bo: "Toàn bộ",
};

/** Bấm ô trong ma trận quyền: không có → của mình → đơn vị → đơn vị và cấp dưới → toàn bộ → không có. */
export function phamViTiep(pv: PhamVi | null | undefined): PhamVi | null {
  if (!pv) return THU_TU_PHAM_VI[0];
  const i = THU_TU_PHAM_VI.indexOf(pv);
  return i >= THU_TU_PHAM_VI.length - 1 ? null : THU_TU_PHAM_VI[i + 1];
}

/** a hẹp hơn hoặc bằng b (undefined = không có quyền, hẹp nhất). */
export function phamViKhongRongHon(a: PhamVi | null | undefined, b: PhamVi | null | undefined): boolean {
  if (!a) return true;
  if (!b) return false;
  return THU_TU_PHAM_VI.indexOf(a) <= THU_TU_PHAM_VI.indexOf(b);
}

/** Quản trị toàn bộ người dùng (quản trị viên hoặc nguoi_dung.quan_ly phạm vi toàn bộ). */
export function laQuanTriToanBo(nd: NguoiDungPhien): boolean {
  return nd.la_quan_tri || nd.quyen["nguoi_dung.quan_ly"] === "toan_bo";
}

/**
 * Được quản lý một người dùng thuộc đơn vị `donViId` không (null = người chưa gán đơn vị → chỉ quản trị toàn bộ).
 * Phạm vi 'cua_minh' của nguoi_dung.quan_ly nghĩa là chỉ sửa được chính mình.
 */
export function duocQuanLyNguoi(
  nd: NguoiDungPhien,
  nguoi: { id?: string; don_vi_id: string | null },
  cay: Pick<DonVi, "id" | "cha_id">[] = [],
): boolean {
  return coQuyen(nd, "nguoi_dung.quan_ly", { chu_so_huu: nguoi.id ?? null, don_vi_id: nguoi.don_vi_id }, cay);
}

/**
 * Được gán vai trò có bộ quyền `quyenVaiTro` cho người khác không: không ai trao được quyền rộng hơn quyền mình đang có
 * (quản trị viên thì được tất cả).
 */
export function duocTraoVaiTro(nd: NguoiDungPhien, quyenVaiTro: Partial<Record<Quyen, PhamVi>>): boolean {
  if (nd.la_quan_tri) return true;
  return (Object.entries(quyenVaiTro) as [Quyen, PhamVi][]).every(([k, pv]) => phamViKhongRongHon(pv, nd.quyen[k]));
}
