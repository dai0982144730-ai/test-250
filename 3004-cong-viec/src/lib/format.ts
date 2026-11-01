// Tiện ích HIỆN SỐ dùng chung — file THUẦN (client dùng được, luật 10).
//
// ⭐ CHUẨN SỐ VIỆT NAM — Mr. Đại chốt 12/10/2026 (KE-HOACH/10 chốt 130): thập phân dấu PHẨY, nhóm ba chữ số dấu CHẤM.
// MỌI con số hiện ra cho người đọc đi qua các hàm dưới đây (hoặc `toLocaleString("vi-VN")`). CẤM hiện thẳng `x.toFixed(n)` (ra
// dấu chấm thập phân) và cấm `"en-US"`. Số ĐỌC VÀO: lib/chung/doc-so. Cùng tên, cùng nghĩa với lib/format của agent Tiến độ.
// Cỡ tệp: đã có `coTep` (lib/dinh-kem/chung) và `kichThuoc` (components/thu-muc/tien-ich) — hai hàm đó gọi về `fmtNum` ở đây.

export const DASH = "—";

/** Số với ĐÚNG `digits` chữ số lẻ: fmtNum(1234.5, 1) = «1.234,5» · fmtNum(1234.5) = «1.235» */
export function fmtNum(n: number | undefined | null, digits = 0): string {
  if (n === undefined || n === null || Number.isNaN(n)) return DASH;
  return n.toLocaleString("vi-VN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Phần trăm: fmtPct(41.5) = «41,5%» */
export function fmtPct(n: number | undefined | null, digits = 1): string {
  if (n === undefined || n === null || Number.isNaN(n)) return DASH;
  return `${fmtNum(n, digits)}%`;
}

/** Số giữ tới `toiDa` chữ số lẻ, KHÔNG thêm số 0 thừa — cho số chèn vào câu: fmtSo(1234.5) = «1.234,5» · fmtSo(12) = «12» */
export function fmtSo(n: number | undefined | null, toiDa = 3): string {
  if (n === undefined || n === null || Number.isNaN(n)) return DASH;
  return n.toLocaleString("vi-VN", { maximumFractionDigits: toiDa });
}
