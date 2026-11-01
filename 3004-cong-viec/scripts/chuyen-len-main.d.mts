// Khai báo kiểu cho scripts/chuyen-len-main.mjs (bộ chuyển người + tổ chức lên Main — 6g.6 Đợt 2).
export const TAI_KHOAN_MAU: string[];
export const EMAIL_ADMIN: string;
export const EMAIL_PM: string;
export const BI_DANH: { email_cu: string; email_moi: string; cach: "gop" | "chuyen_chu"; ly_do: string }[];

export interface HangNguoi {
  id: string;
  email: string;
  ten: string;
  mat_khau_hash: string;
  salt: string;
  don_vi_id: string | null;
  chuc_vu: string | null;
  cap_chuc_vu: number | null;
  la_quan_tri: boolean;
  active: boolean;
  tao_luc: string | Date;
}
export interface NguoiMain {
  id?: string;
  email: string;
  name: string;
  role: "pm" | "admin" | "engineer" | "viewer";
  passwordHash: string;
  salt: string;
  active: boolean;
  createdAt: string;
  projectIds?: string[];
  baseUsername?: string;
  telegramChatId?: string;
  donViId?: string | null;
  chucVu?: string | null;
  capChucVu?: number | null;
  vaiCongViec?: string[];
}
export interface KetQuaChuyen {
  users: NguoiMain[];
  toChuc: { cap_nhat: null; don_vi: Record<string, unknown>[]; kiem_nhiem: { nguoi_id: string; don_vi_id: string; chuc_vu: string | null }[]; uy_quyen_ky: [] };
  biDanh: typeof BI_DANH;
  projects: { projects: Record<string, unknown>[] } | null;
  phienTelegram: Record<string, unknown> | null;
  bang: Record<string, any>;
  canhBao: string[];
}
export function dungBanMain(
  nguon: {
    nguoi: HangNguoi[];
    donVi: Record<string, any>[];
    kiemNhiem: { nguoi_dung_id: string; don_vi_id: string; chuc_vu: string | null }[];
    vai?: { nguoi_dung_id: string; vai_tro_id: string }[];
    duAn?: { id: string; don_vi?: string[]; ban_dieu_hanh?: string | null }[];
  },
  main: { users: unknown; projects: unknown; phienTelegram: unknown },
): KetQuaChuyen;
export function inBang(kq: KetQuaChuyen, chiTiet?: boolean): string;
