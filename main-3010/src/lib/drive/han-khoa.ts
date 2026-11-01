// HẠN KHOÁ GOOGLE DRIVE — file THUẦN (luật 10): client import được, không fs, không mạng.
//
// Đo 21/09 trên Google Cloud Console dự án sci-qlda: màn xin phép OAuth đang ở chế độ "Testing" → Google tự huỷ
// khoá làm mới (refresh token) đúng 7 ngày sau khi cấp; nút Publish app còn mờ vì trang Branding chưa đủ (chưa có
// trang chủ + chính sách quyền riêng tư trên tên miền thật). Mr. Đại chọn 21/09: chấp nhận nối lại 7 ngày một lần,
// app BÁO TRƯỚC thay vì để đang dùng thì chết. Khi app chuyển "In production" thì đổi HAN_KHOA_NGAY = 0 (tắt báo).

/** Số ngày Google cho một khoá làm mới sống ở chế độ Testing. 0 = không giới hạn (tắt báo trước). */
export const HAN_KHOA_NGAY = 7;
/** Còn từ bấy nhiêu ngày trở xuống thì báo trước */
export const BAO_TRUOC_NGAY = 2;

export type MucHanKhoa = "khong-ro" | "con-han" | "sap-het" | "het-han";

export interface HanKhoa {
  muc: MucHanKhoa;
  /** Số ngày còn lại, làm tròn XUỐNG (còn 1,9 ngày ghi 1) — thà báo sớm; null khi không rõ ngày cấp */
  conNgay: number | null;
  /** Ngày khoá chết, ISO yyyy-mm-dd; null khi không rõ */
  hetNgay: string | null;
}

/** capLuc = epoch ms lúc Google cấp khoá làm mới (lúc bấm Kết nối). Khoá nối trước 21/09 không có → "khong-ro". */
export function tinhHanKhoa(capLuc: number | null | undefined, bayGio: number): HanKhoa {
  if (!capLuc || HAN_KHOA_NGAY <= 0) return { muc: "khong-ro", conNgay: null, hetNgay: null };
  const het = capLuc + HAN_KHOA_NGAY * 86_400_000;
  const conNgay = Math.floor((het - bayGio) / 86_400_000);
  const hetNgay = new Date(het).toISOString().slice(0, 10);
  if (het <= bayGio) return { muc: "het-han", conNgay: 0, hetNgay };
  return { muc: conNgay <= BAO_TRUOC_NGAY ? "sap-het" : "con-han", conNgay, hetNgay };
}

/** Câu tiếng Việt cho người dùng; "" khi không có gì đáng nói */
export function cauHanKhoa(h: HanKhoa): string {
  if (h.muc === "het-han") return `Khoá Google Drive đã quá hạn 7 ngày của Google (hết ${h.hetNgay}) — cần Kết nối lại ở Main.`;
  if (h.muc === "sap-het")
    return `Khoá Google Drive còn ${h.conNgay} ngày (Google tự huỷ ngày ${h.hetNgay}) — Kết nối lại ở Main trước ngày đó để không gián đoạn.`;
  if (h.muc === "con-han") return `Khoá còn ${h.conNgay} ngày (tới ${h.hetNgay}).`;
  return "";
}
