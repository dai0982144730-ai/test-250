// Khai báo kiểu cho scripts/tao-mau-trang.mjs (sinh 9 mẫu Word trắng từ mẫu đã chuyển).
import type { GiaTriBaoCao } from "./chuyen-mau-that.mjs";

export interface DacTaBang {
  cot_dau: string;
  loai: "danh_muc" | "tu_do" | "nhom";
  dau: number;
  giu?: number[];
  so_dong?: number;
  thay?: [RegExp, string][];
}
export const CHUA_DIEN: string;
export const KY_TUAN_TRANG: string[];
export const KY_THANG_TRANG: string;
export const NGAY_KY_TRANG: string;
export const NHAC_BIEU_DO: string;
export const SO_DONG_TRONG: number;
export const BANG_THEO_MAU: Record<string, DacTaBang[]>;
export const DOAN_THEO_MAU: Record<string, [string, string][]>;
export function taoMauTrang(bufDaChuyen: Buffer, ma: string): Promise<{ buf: Buffer; bao_cao: string[] }>;
/** Điền các ô bắt buộc (kỳ, người lập, ngày lập, người kiểm soát, ngày ký) của mẫu trắng. */
export function dienOBatBuoc(bufTrang: Buffer, ma: string, g?: GiaTriBaoCao): Promise<Buffer>;
export function taoTatCaMauTrang(thuMuc?: string): Promise<string[]>;
