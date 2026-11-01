// phong/keo-giua.ts — phép tính của vạch kéo giữa hai khung (hàm thuần, test được; giao diện ở KeoGiua.tsx).
export const TOI_DA = 0.5; // +50%
export const RONG_VACH = 10;
const PHAI_TOI_THIEU = 380;

/** Bề rộng khung phải mặc định: như lưới cũ 1,5fr : 1fr, tối thiểu 380 px. */
export function rongPhaiMacDinh(rongKhung: number): number {
  return Math.max(PHAI_TOI_THIEU, (rongKhung - RONG_VACH) / 2.5);
}

/** Độ nới (0…0,5) từ vị trí chuột: bề rộng phải mới / mặc định − 1, kẹp trong khoảng cho phép. */
export function doNoiTuChuot(phaiKhung: number, chuotX: number, rongKhung: number): number {
  const moi = phaiKhung - chuotX - RONG_VACH / 2;
  return Math.min(TOI_DA, Math.max(0, moi / rongPhaiMacDinh(rongKhung) - 1));
}

