// Kiểu điểm S-Curve — file THUẦN (luật 10): SCurve.tsx (client) và
// lib/du-bao/s-curve*.ts (server) cùng import.
// ⚠ Bản sao y hệt ở repo Main (4-agent-main/src/lib/scurve-kieu.ts) — Main chỉ
// ánh xạ số của cổng `tiendo.s_curve`, sửa kiểu thì sửa cả hai.

/**
 * Lệch so đường Mục tiêu (Mr. Đại chốt 24/09, 6a): N = (ngày đường Mục tiêu
 * LẦN ĐẦU đạt x%) − (ngày CHÍNH đường đó LẦN ĐẦU đạt x%), nội suy theo ngày.
 * Âm = chậm. "vuot" = x vượt mức cao nhất đường Mục tiêu đạt được. null =
 * không tính (x = 0 hoặc không có Mục tiêu).
 */
export type LechNgay = number | "vuot" | null;

export interface SCurvePoint {
  /** Nhãn tuần ngắn của NGÀY điểm: "W39" · sang năm khác "W5·27" */
  week: string;
  /** Thứ Hai đầu tuần chứa điểm (ISO) */
  ngayDauTuan?: string;
  /** Ngày của điểm (ISO): thứ Hai với điểm tuần; chính ngày đó với điểm ngày cắt / đạt 100% */
  ngay?: string;
  /** Vị trí trục X = số ngày kể từ thứ Hai đầu tiên (điểm tuần và điểm đặc biệt cùng thước) */
  x?: number;
  /** Nhãn điểm đặc biệt: "ngày cắt dữ liệu 24/09/2026" · "Baseline đạt 100% ngày …" */
  nhan?: string;
  target?: number;
  baseline?: number;
  actual?: number;
  forecast?: number;
  /** Lệch ngày của từng đường so Mục tiêu tại điểm này (6a) — CODE tính sẵn */
  lechNgay?: { baseline?: LechNgay; thucTe?: LechNgay; duBao?: LechNgay };
}

/** Một đường đạt 100%: ngày thật + việc cuối cùng làm nó đạt 100% */
export interface Dat100 {
  ngayDat100: string;
  viecCuoi: { wbs: string; ten: string };
  /** Vd "kỳ vọng lấy theo nhóm 7.1" */
  ghiChu?: string;
}

/** Kết quả đầy đủ của S-Curve — cổng `tiendo.s_curve` trả nguyên khối này */
export interface SCurveDayDu {
  diem: SCurvePoint[];
  /** Ngày cắt dữ liệu — đường Dự báo bắt đầu từ đây tại mức thực tế */
  ngayCatDuLieu: string | null;
  nguonNgayCat: string;
  codMucTieu: string | null;
  codKeHoach: string | null;
  codDuBao: string | null;
  /** Ngày từng đường đạt 100% (theo ngày) — giữ cho chỗ đọc cũ; đủ hơn ở `dat100` */
  ngay100: { mucTieu: string | null; baseline: string | null; duBao: string | null };
  /** Mỗi đường: ngày đạt 100% + việc cuối — khung rê chuột sau điểm đó ghi "đã xong 100% ngày …" */
  dat100: { mucTieu: Dat100 | null; baseline: Dat100 | null; thucTe: Dat100 | null; duBao: Dat100 | null };
  /**
   * Tập việc vẽ (Mr. Đại chốt 24/09 tối): việc lá TIỀN NHIỆM BẮC CẦU của mốc
   * COD theo liên kết + chính mốc. Việc không nối tới mốc COD không tính.
   */
  soViecTrongTap: number;
  /** Việc lá có thời lượng không nối tới mốc COD và kế hoạch xong SAU COD */
  soViecSauCod: number;
  /** Mốc COD tập việc nối tới (null = chưa có mốc) — cổng cũ chưa có trường */
  mocCod?: { wbs: string; ten: string } | null;
  /** Câu ghi dưới S-Curve: "tính trên N việc nối tới mốc COD 7.1.12 …" */
  cauTapViec?: string;
  /** Việc lá kế hoạch xong TRƯỚC COD nhưng KHÔNG nối quan hệ tới mốc COD — khối cảnh báo riêng */
  viecKhongNoi?: { wbs: string; ten: string; ketThuc: string }[];
  /** Các câu ghi chú dưới biểu đồ (kỳ vọng mâu thuẫn, dự báo sau COD…) — CODE sinh */
  ghiChu: string[];
}
