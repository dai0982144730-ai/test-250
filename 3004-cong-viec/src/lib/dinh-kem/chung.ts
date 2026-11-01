// ============================================================
// dinh-kem/chung.ts — TỆP ĐÍNH KÈM VIỆC: kiểu + hàm thuần (client dùng được — luật 10: không đụng node:fs ở đây).
// Kho + CSDL ở dinh-kem/kho.ts (chỉ server).
// ============================================================
import { fmtNum } from "@/lib/format";

export type NoiDinhKem = "giao_viec" | "bao_xong" | "binh_luan";

export interface TepDinhKem {
  id: string;
  ten_tep: string;
  mime: string;
  kich_thuoc: number;
  noi: NoiDinhKem;
  tai_len_boi: string;
  luc: string;
  phan_viec_id: string | null;
  binh_luan_id: number | null;
  /** Đã xóa nội dung do hết hạn lưu (ISO) — tên vẫn hiện */
  xoa_luc: string | null;
}

export const TEN_NOI: Record<NoiDinhKem, string> = { giao_viec: "giao việc", bao_xong: "báo xong việc", binh_luan: "bình luận" };

/** Đuôi xem trực tiếp được trong cửa sổ nổi (docx, xlsx, pdf + ảnh) */
const DUOI_XEM = /\.(docx|docm|xlsx|xls|csv|pdf|png|jpe?g|gif|webp)$/i;
export const xemDuoc = (ten: string) => DUOI_XEM.test(ten);

/** 1234567 → "1,2 MB" — số theo chuẩn Việt Nam qua lib/format (chốt 130): «1.023,9 MB», không tự thay dấu sau toFixed */
export function coTep(byte: number): string {
  if (byte < 1024) return `${byte} B`;
  if (byte < 1024 * 1024) return `${fmtNum(byte / 1024)} KB`;
  if (byte < 1024 ** 3) return `${fmtNum(byte / 1024 / 1024, 1)} MB`;
  return `${fmtNum(byte / 1024 ** 3, 2)} GB`;
}

export const duongTai = (id: string) => `/api/dinh-kem/${encodeURIComponent(id)}?tai=1`;
