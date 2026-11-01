// phong/giai-doan-thuan.ts — 6 giai đoạn quản lý dự án (PMP + Thiết kế, Mr. Đại thêm 01/10/2026). File thuần — client import được (luật 10).
export const GIAI_DOAN = [
  ["khoi-tao", "Khởi tạo"],
  ["thiet-ke", "Thiết kế"],
  ["ke-hoach", "Lập kế hoạch"],
  ["thuc-thi", "Thực thi"],
  ["giam-sat", "Giám sát & Kiểm soát"],
  ["ket-thuc", "Kết thúc"],
] as const;
export type GiaiDoan = (typeof GIAI_DOAN)[number][0];
export const MA_GIAI_DOAN = new Set<string>(GIAI_DOAN.map((g) => g[0]));
export const TEN_GIAI_DOAN = Object.fromEntries(GIAI_DOAN) as Record<GiaiDoan, string>;

export interface GiaiDoanViec {
  giai_doan: GiaiDoan;
  ly_do: string | null;
  nguon: "ai" | "nguoi";
  nguoi_sua: string | null;
}
