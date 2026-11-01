// Khai báo kiểu cho scripts/chuyen-mau-that.mjs.
export interface GiaTriBaoCao {
  o?: Record<string, any>; // ky_bao_cao: { chon: 'tuan'|'thang'|'quy', tuan?: string, thang?: string }
  bang?: Record<string, Record<string, string>[]>;
  bang_them?: Record<string, Record<string, string>[]>;
  thay?: [string, string][];
  bo_muc?: string[];
  bo_o?: string[];
}
export const PHIEN_BAN_MAU: number;
/** Đặc tả bảng số liệu gắn mã theo mẫu (phiên bản mẫu 3). */
export interface DacTaBangSoLieu {
  muc: string;
  so?: number[];
  cot_dau: string;
  tag: string;
  dau: number;
  nhom?: boolean;
  cot: [string, string][];
}
export const BANG_SO_LIEU: Record<string, DacTaBangSoLieu[]>;
export const TAG_BANG_SO_LIEU: Set<string>;
export const TAG_NHOM: string;
export const MO_TA_SO_LIEU: string;
export const MAU_THAT: { ma: string; so: number; tep: string; ten: string; don_vi_lap: string; gui_den_mac_dinh: string; loai_ky: string; sua_tay?: boolean }[];
export function tagCot(nhan: string, bang?: string): string;
export function chuyenMau(buf: Buffer, m: (typeof MAU_THAT)[number]): Promise<{ buf: Buffer; dinh_nghia: any; bao_cao: string[]; muc: string[] }>;
export function dienBaoCao(bufMau: Buffer, g?: GiaTriBaoCao): Promise<Buffer>;
export function chuyenTatCa(thuMuc?: string): Promise<string[]>;

// Hàm nhỏ dùng lại cho bộ gắn nhãn tổng quát (src/lib/kiem-tra/gan-nhan.ts — Khai báo mẫu Đợt B, 01/10/2026). Nút DOM xmldom: any.
export const W: string;
export function khongDau(s: unknown): string;
export function conPT(n: any): any[];
export function ten(n: any): string;
export function tatCa(n: any, t: string): any[];
export function conTen(n: any, t: string): any;
export function chu(n: any): string;
export function taoPT(doc: any, t: string, attrs?: Record<string, unknown>): any;
export function boc(doc: any, nodes: any[], tag: string, alias: string, o?: Record<string, unknown>): any;
export function bocO(doc: any, tc: any, tag: string, alias: string): any;
export function tachRun(doc: any, r: any, viTri: number): [any, any];
export const cells: (tr: any) => any[];
export const rows: (tbl: any) => any[];
export function laTieuDe(p: any): boolean;
export function boSo(t: string): string;
export function themCaption(doc: any, tbl: any, tag: string): void;
export function datThuocTinhMau(zip: any, ma: string): Promise<void>;
/** Bản 9: tuần ISO số `so` năm `nam` → ["dd/mm/yyyy" thứ Hai, "dd/mm/yyyy" Chủ nhật] */
export function tuanIso(so: number, nam: number): [string, string];
export const MAU_DUNG_CHUNG: string[];
export const CONG_TY_TU_GHI: string[];
export const DAU_BAN_9: Record<string, { cong_ty?: string; gui: string; tieu_de: string; don_vi_trang?: string; vd_don_vi?: string; goi_y_cong_ty?: string; goi_y_don_vi?: string }>;
