// Kiểu phụ dùng chung của bộ luật (tách để tránh vòng import).
export type { DinhNghiaLoaiLuat } from "./types";

/** Định nghĩa mẫu rút gọn mà bộ luật cần: ô nhập + bảng có cột (lấy từ mau_word.dinh_nghia). */
export interface DinhNghiaMauRutGon {
  ma: string;
  ten: string;
  o_nhap: { tag: string; nhan: string; kieu?: string }[];
  bang: { tag: string; nhan: string; cot: { tag: string; nhan: string }[] }[];
  muc_bat_buoc: string[];
}
