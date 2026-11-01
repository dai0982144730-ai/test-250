// Khai báo kiểu cho scripts/tao-mau-word.mjs (test dùng để dựng biến thể báo cáo từ mẫu thật đã chuyển).
import type { GiaTriBaoCao } from "./chuyen-mau-that.mjs";
export type { GiaTriBaoCao };
type BaoCao = GiaTriBaoCao & { o: Record<string, any>; bang: Record<string, Record<string, string>[]> };
export function taoBaoCao(ma: string, g?: GiaTriBaoCao): Promise<Buffer>;
export function dongGoiDocx(bodyXml: string, title?: string): Promise<Buffer>;
export function taoViDu(thuMuc?: string): Promise<void>;
export function taoTatCa(thuMuc?: string): Promise<{ thuMuc: string; so_mau: number; bao: string[] }>;
export const VI_DU: {
  bqlda: (tuan: number, nguoiLap: string) => BaoCao;
  sciEnc: (ban: number) => BaoCao;
  DTPC_T29: BaoCao;
  NAMXE_T29: BaoCao;
  TGD_T30: GiaTriBaoCao & { bang: Record<string, Record<string, string>[]> };
};
