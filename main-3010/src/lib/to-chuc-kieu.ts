// ============================================================
// to-chuc-kieu.ts — KHUÔN TỔ CHỨC Main giữ làm gốc (LOI-DUNG-CHUNG 6g.6 A9 · A12, Đợt 2 — 03/10/2026). File THUẦN (luật 10).
//   · Cây đơn vị · kiêm nhiệm · bảng ủy quyền ký nghiệm thu (A12 — để trống, chừa khuôn).
//   · Tên trường giữ y như bảng identity.* của agent Công việc — Đợt 3 agent đó kéo về chép thẳng.
//   · Đơn vị chính + chức vụ của từng người nằm trong users.json (donViId · chucVu · capChucVu).
//   · Mẫu báo cáo của đơn vị (`mau_ma`) là nghiệp vụ riêng agent Công việc — KHÔNG đưa lên Main (6g.6.1).
// ============================================================

export interface DonViToChuc {
  id: string;
  ten: string;
  ten_ngan: string;
  cap: number;
  cha_id: string | null;
  /** ban_tgd · chuc_danh · phong · don_vi · ca_nhan · ben_ngoai … (giữ nguyên chữ của agent Công việc) */
  loai: string;
  thu_tu: number;
  active: boolean;
  /** Đơn vị chức danh (Phó TGĐ…): tên chức danh — tên đơn vị "<chức danh> · <người giữ>" do agent Công việc tự ghép (A7) */
  chuc_danh: string | null;
  chuc_danh_ngan: string | null;
  /** Chức năng nhiệm vụ (chữ tự do) */
  chuc_nang: string | null;
  /** TRƯỞNG CHÍNH (chốt 03/10/2026 — tên cột cũ "ủy quyền trưởng"): mã người */
  uy_quyen_truong: string | null;
}

export interface KiemNhiemToChuc {
  /** Mã người (id bất biến — A1), KHÔNG phải email */
  nguoi_id: string;
  don_vi_id: string;
  chuc_vu: string | null;
}

/** A12 — ủy quyền ký nghiệm thu "ai ký cái gì". Chưa dùng: thiết kế riêng khi làm nghiệm thu */
export interface UyQuyenKy {
  nguoi_id: string;
  loai_van_ban: string;
  pham_vi: string;
  tu_ngay: string;
  den_ngay: string | null;
  nguoi_uy_quyen: string;
  con_hieu_luc: boolean;
}

export interface ToChuc {
  cap_nhat: string | null;
  don_vi: DonViToChuc[];
  kiem_nhiem: KiemNhiemToChuc[];
  uy_quyen_ky: UyQuyenKy[];
}

export const TO_CHUC_RONG: ToChuc = { cap_nhat: null, don_vi: [], kiem_nhiem: [], uy_quyen_ky: [] };

const chuoi = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);

/**
 * Đọc khuôn tổ chức từ dữ liệu thô: giữ dòng đúng khuôn, bỏ dòng sai và kê lý do (tiếng Việt).
 * Kiểm cả ràng buộc chéo: đơn vị cha phải có, kiêm nhiệm phải trỏ đơn vị có, id đơn vị không trùng.
 */
export function chuanHoaToChuc(v: unknown): { toChuc: ToChuc; loi: string[] } {
  const loi: string[] = [];
  if (v === null || typeof v !== "object" || Array.isArray(v)) return { toChuc: { ...TO_CHUC_RONG }, loi: ["to-chuc.json không phải một đối tượng"] };
  const o = v as Record<string, unknown>;
  const donVi: DonViToChuc[] = [];
  const daCo = new Set<string>();
  const dsDonVi: unknown[] = Array.isArray(o.don_vi) ? o.don_vi : [];
  for (let i = 0; i < dsDonVi.length; i++) {
    const d = (dsDonVi[i] ?? {}) as Record<string, unknown>;
    const id = chuoi(d.id);
    const ten = chuoi(d.ten);
    if (!id || !ten || typeof d.cap !== "number" || !chuoi(d.loai)) {
      loi.push(`đơn vị dòng ${i + 1}: thiếu mã / tên / cấp / loại — bỏ`);
      continue;
    }
    if (daCo.has(id)) {
      loi.push(`đơn vị ${id}: trùng mã — bỏ dòng sau`);
      continue;
    }
    daCo.add(id);
    donVi.push({
      id,
      ten,
      ten_ngan: chuoi(d.ten_ngan) ?? ten,
      cap: d.cap,
      cha_id: chuoi(d.cha_id),
      loai: chuoi(d.loai)!,
      thu_tu: typeof d.thu_tu === "number" ? d.thu_tu : 0,
      active: d.active !== false,
      chuc_danh: chuoi(d.chuc_danh),
      chuc_danh_ngan: chuoi(d.chuc_danh_ngan),
      chuc_nang: chuoi(d.chuc_nang),
      uy_quyen_truong: chuoi(d.uy_quyen_truong),
    });
  }
  for (const d of donVi) if (d.cha_id && !daCo.has(d.cha_id)) loi.push(`đơn vị ${d.id}: đơn vị cha ${d.cha_id} không có trong danh sách`);
  const kiemNhiem: KiemNhiemToChuc[] = [];
  const dsKiem: unknown[] = Array.isArray(o.kiem_nhiem) ? o.kiem_nhiem : [];
  for (let i = 0; i < dsKiem.length; i++) {
    const k = (dsKiem[i] ?? {}) as Record<string, unknown>;
    const nguoi = chuoi(k.nguoi_id);
    const dv = chuoi(k.don_vi_id);
    if (!nguoi || !dv || !daCo.has(dv)) {
      loi.push(`kiêm nhiệm dòng ${i + 1}: thiếu mã người hoặc đơn vị không có — bỏ`);
      continue;
    }
    kiemNhiem.push({ nguoi_id: nguoi, don_vi_id: dv, chuc_vu: chuoi(k.chuc_vu) });
  }
  const uyQuyenKy = (Array.isArray(o.uy_quyen_ky) ? o.uy_quyen_ky : []) as UyQuyenKy[];
  return { toChuc: { cap_nhat: chuoi(o.cap_nhat), don_vi: donVi, kiem_nhiem: kiemNhiem, uy_quyen_ky: uyQuyenKy }, loi };
}
