// Khai báo kiểu cho scripts/tao-bao-cao-kich-ban.mjs (bộ báo cáo hợp lệ 9 đơn vị theo ngày hôm nay).
import type { GiaTriBaoCao } from "./chuyen-mau-that.mjs";

export interface BaoCaoKichBan {
  ma: string;
  tep: string;
  nguoi_gui: string;
  den: string[];
  g: GiaTriBaoCao;
}
export interface KichBan {
  tuan: number;
  nam: number;
  ngay_lap: string;
  /** Ngày hôm nay + n ngày, dạng dd/mm/yyyy. */
  h: (n: number) => string;
  baoCao: BaoCaoKichBan[];
  banPhu: { bqldaThieuNguoiLap: { ma: string; tep: string; g: GiaTriBaoCao }; encBan2: { ma: string; tep: string; g: GiaTriBaoCao } };
}
export function homNayVN(luc?: Date): Date;
export function tuanISO(d: Date): { so: number; nam: number; tu: Date; den: Date };
export function kichBan(luc?: Date): KichBan;
export function taoBoBaoCao(thuMuc?: string, luc?: Date): Promise<{ thuMuc: string; kb: KichBan }>;
