// Kiểu + nhãn của GÓP Ý, PHẢN ÁNH — file THUẦN (không đụng node:fs), client import thẳng được (luật 10).
// Khuôn theo trang /gop-y của agent Công việc 3004 (Mr. Đại chốt 03/10/2026: mọi agent đều có mục Góp ý).
export type TrangThai = "moi" | "da_tiep_nhan" | "da_sua" | "khong_lam";
export const NHAN_TT: Record<TrangThai, string> = { moi: "Mới", da_tiep_nhan: "Đã tiếp nhận", da_sua: "Đã sửa", khong_lam: "Không làm" };
export const CAC_TT = Object.keys(NHAN_TT) as TrangThai[];
export const TOI_DA_ANH = 6;

export interface GopY {
  id: string;
  tieu_de: string;
  noi_dung: string;
  trang: string | null; // màn đang mở lúc bấm Góp ý
  anh: { ten: string; kich_thuoc: number; loai?: string }[];
  nguoi: string; // email
  ten_nguoi: string;
  trang_thai: TrangThai;
  tra_loi: string | null;
  ten_tra_loi: string | null;
  tra_loi_luc: string | null;
  tao_luc: string;
}
