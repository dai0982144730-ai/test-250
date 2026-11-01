// ============================================================
// moi-truong.ts — web chủ "cắm" vào sci-identity: ai đang thao tác, ghi lịch sử ở đâu, báo quản trị thế nào.
// Gói không tự biết bảng lịch sử hay thông báo của từng web, nên nhận qua NguCanh (tùy chọn).
// ============================================================
import type { Q } from "@/lib/db";

export type LoaiSuKienIdentity = "nguoi_dung" | "don_vi" | "vai_tro";

/** Một thay đổi trong identity — web chủ ghi vào lịch sử của mình. */
export interface SuKienIdentity {
  loai: LoaiSuKienIdentity;
  id: string;
  thao_tac: string; // 'them' | 'sua' | 'khoa' | 'mo_khoa' | 'dat_lai_mat_khau' | 'doi_mat_khau' | 'gan_vai_tro' | 'kiem_nhiem' | 'ngung' | 'dat_quyen' | 'xoa' | 'nhap_excel'
  chi_tiet?: Record<string, unknown>;
}

export interface NguoiChuaGan {
  id: string;
  email: string;
  ten: string;
}

/** Ngữ cảnh thao tác: truyền vào mọi hàm GHI của gói. */
export interface NguCanh {
  nguoi: string; // id người thao tác ('he-thong' nếu tự động)
  ghiNhatKy?: (q: Q, e: SuKienIdentity) => Promise<void>;
  /** Có người dùng chưa gán đơn vị (tạo mới, nhập Excel, bỏ đơn vị) → báo quản trị viên */
  baoChuaGanDonVi?: (q: Q, ds: NguoiChuaGan[]) => Promise<void>;
}

/** Lỗi nghiệp vụ của gói (status kiểu HTTP: 400 dữ liệu sai, 404 không có, 409 xung đột). */
export class LoiIdentity extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "LoiIdentity";
  }
}

export async function ghi(q: Q, ng: NguCanh, e: SuKienIdentity): Promise<void> {
  if (ng.ghiNhatKy) await ng.ghiNhatKy(q, e);
}

/** Chỉ giữ các trường thay đổi: { truoc: {...}, sau: {...} } */
export function khacNhau(truoc: Record<string, unknown>, sau: Record<string, unknown>): { truoc: Record<string, unknown>; sau: Record<string, unknown> } {
  const a: Record<string, unknown> = {};
  const b: Record<string, unknown> = {};
  for (const k of Object.keys(sau)) {
    if (JSON.stringify(truoc[k] ?? null) !== JSON.stringify(sau[k] ?? null)) {
      a[k] = truoc[k] ?? null;
      b[k] = sau[k] ?? null;
    }
  }
  return { truoc: a, sau: b };
}
