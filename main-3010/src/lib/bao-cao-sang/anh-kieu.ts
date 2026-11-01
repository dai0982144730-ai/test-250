// ============================================================
// ĐẶC TẢ ẢNH BIỂU ĐỒ CỦA BÁO CÁO SÁNG  (file THUẦN — luật 10, màn hình import được)
// KE-HOACH/23 (Mr. Đại chốt 17/10/2026): khối biểu đồ gửi kèm ảnh qua Telegram (tối đa 2 ảnh mỗi sáng, theo thứ tự khối);
// bản web hiện CÙNG ảnh (một chỗ vẽ — ve-anh.ts, phía máy chủ).
//
// Đặc tả = số đã có sẵn (CODE tính ở agent chủ) + chữ nhãn. Bộ vẽ KHÔNG tính số nào, chỉ đặt lên giấy.
// Ngày luôn ISO "yyyy-mm-dd" trong đặc tả; bộ vẽ in ra dd/mm/yyyy (luật E32). Số in theo chuẩn Việt Nam (thập phân «,»).
// Màu phải có định nghĩa (luật 18): mỗi đường / đoạn mang `nhan` hiện ở chú giải — không có màu nào không tên.
// ============================================================

/** Bốn đường của S-Curve và hai vạch mốc — màu cố định một chỗ, bản web và ảnh dùng chung */
export const MAU_DUONG = {
  "muc-tieu": "#7c3aed", // Tiến độ mục tiêu
  baseline: "#2563eb", // Baseline
  "thuc-te": "#16a34a", // Thực tế
  "du-bao": "#ea580c", // Dự báo
  "phu": "#78716c", // đoạn phụ (vd phần do thời tiết)
} as const;

export type MaMauDuong = keyof typeof MAU_DUONG;

/**
 * TQ-2 Xu thế COD dự báo: đường BẬC THANG — trục ngang là ngày ghi sổ, trục đứng là NGÀY COD dự báo.
 * Vạch ngang: Tiến độ mục tiêu · Baseline (ngày COD của từng hệ). Điểm lạ đã bị code bỏ trước khi vào đây.
 */
export interface AnhDuongNgay {
  kieu: "duong-ngay";
  tieuDe: string;
  /** Mỗi ngày một điểm (điểm cuối ngày giờ VN) */
  diem: { ngay: string; giaTri: string }[];
  vachNgang: { nhan: string; ngay: string; mau: MaMauDuong }[];
  /** Tên + màu của đường chính ở chú giải — không khai thì «COD dự báo», màu Dự báo (ve-anh.ts) */
  nhanDuong?: string;
  mauDuong?: MaMauDuong;
  /** Một dòng chữ dưới biểu đồ (vd «bỏ 1 điểm lạ 10/10/2026 — lượt tính lỗi») */
  chuThich?: string;
}

/** DA-3 S-Curve: tới 4 đường % khối lượng theo ngày, trục ngang ngày; vạch đứng «ngày cắt dữ liệu» */
export interface AnhSCurve {
  kieu: "s-curve";
  tieuDe: string;
  duong: { nhan: string; mau: MaMauDuong; diem: { ngay: string; pct: number }[] }[];
  /** Vạch đứng ngày cắt dữ liệu (đường Dự báo bắt đầu từ đây) */
  ngayCat?: string | null;
  chuThich?: string;
}

/**
 * RQ-2 Hạng mục tự làm COD chậm · TQ-3 Vì sao chậm: THANH NGANG, mỗi thanh một hoặc nhiều đoạn chồng nối nhau.
 * Giá trị đơn vị `donVi` (vd «ngày»); thanh 0 vẫn vẽ nhãn «0 ngày». Không có trục âm.
 */
export interface AnhThanhNgang {
  kieu: "thanh-ngang";
  tieuDe: string;
  donVi: string;
  thanh: { nhan: string; doan: { nhan: string; giaTri: number; mau: MaMauDuong }[] }[];
  chuThich?: string;
}

/**
 * TQ-2 (bản 27/10/2026, KE-HOACH/33 mục 3): MỘT ảnh cho cả công ty — mỗi dự án một đường bậc thang, trục đứng là SỐ NGÀY
 * COD dự báo đã đổi so với ngày đầu kỳ (mọi đường bắt đầu từ 0; dương = lùi, âm = sớm). Tên dự án ghi ngay cuối đường.
 * Màu: đường có đổi = «du-bao» (cam), đường đứng yên = «phu» (xám) — không thêm bảng màu theo dự án (luật 18).
 */
export interface AnhDuongSo {
  kieu: "duong-so";
  tieuDe: string;
  donVi: string;
  duong: { nhan: string; mau: MaMauDuong; diem: { ngay: string; giaTri: number }[] }[];
  /** Tên mục chú giải cho hai màu (vd «COD lùi / sớm», «đứng yên») */
  chuGiai?: { nhan: string; mau: MaMauDuong }[];
  chuThich?: string;
}

/**
 * DA-4 (27/10/2026, KE-HOACH/33 mục 4): thanh HAI CHIỀU quanh vạch 0 — dương = chậm (sang phải, màu «du-bao»), âm = sớm (sang trái, màu «phu»).
 * Mỗi thanh một giá trị có dấu; thanh đúng 0 vẫn vẽ nhãn «0 ngày». `nhanDuong` / `nhanAm` là tên hai màu ở chú giải (luật 18).
 */
export interface AnhThanhHaiChieu {
  kieu: "thanh-hai-chieu";
  tieuDe: string;
  donVi: string;
  thanh: { nhan: string; giaTri: number }[];
  nhanDuong: string;
  nhanAm: string;
  chuThich?: string;
}

export type DacTaAnh = AnhDuongNgay | AnhSCurve | AnhThanhNgang | AnhDuongSo | AnhThanhHaiChieu;

/** Cỡ ảnh gửi Telegram — ngang đủ đọc trên điện thoại, không quá nặng */
export const CO_ANH = { rong: 720, cao: 480 } as const;
