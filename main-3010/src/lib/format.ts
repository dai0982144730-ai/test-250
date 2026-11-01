// Tiện ích định dạng dùng chung — số theo chuẩn Việt Nam, ngày dd/mm/yyyy, xử lý ô trống "—"

export const DASH = "—";

// ⭐ CHUẨN SỐ VIỆT NAM — Mr. Đại chốt 12/10/2026 (KE-HOACH/10 chốt 130): thập phân dấu PHẨY, nhóm ba chữ số dấu CHẤM.
// MỌI con số hiện ra cho người đọc đi qua các hàm dưới đây (hoặc `toLocaleString("vi-VN")`). CẤM hiện thẳng `x.toFixed(n)` (ra
// dấu chấm thập phân) và cấm `"en-US"`. Số ĐỌC VÀO: lib/chung/doc-so. Bản mẫu ở agent Tiến độ — chép 12/10/2026.

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

/** Cỡ tệp: «820 KB» · «1,5 MB» · «2,3 GB» */
export function fmtCoTep(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return DASH;
  if (bytes < 1024) return `${fmtNum(bytes)} B`;
  if (bytes < 1024 ** 2) return `${fmtNum(Math.max(1, Math.round(bytes / 1024)))} KB`;
  if (bytes < 1024 ** 3) return `${fmtNum(bytes / 1024 ** 2, 1)} MB`;
  return `${fmtNum(bytes / 1024 ** 3, 1)} GB`;
}

/**
 * ISO yyyy-mm-dd -> dd/mm/yyyy
 *
 * GD-8 (Mr. Đại chốt 05/09): MỌI ngày hiện ra cho người dùng đều đủ
 * ngày/tháng/năm. Trước đây hàm này bỏ năm (dd/mm) — đọc bảng nhiều năm
 * thì không biết là năm nào. Đây là ĐỊNH NGHĨA DUY NHẤT (luật 7).
 */
export function fmtDate(iso: string | undefined | null): string {
  if (!iso) return DASH;
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Bí danh của fmtDate — giữ để 18 chỗ gọi cũ không phải sửa (GD-8) */
export function fmtDateFull(iso: string | undefined | null): string {
  if (!iso) return DASH;
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function daysBetween(fromISO: string, toISO: string): number {
  return Math.round(
    (parseISO(toISO).getTime() - parseISO(fromISO).getTime()) / 86400000
  );
}

/** Số ngày của khoảng a–b, tính CẢ ngày đầu và ngày cuối, theo lịch (22/05–31/05 = 10) */
export function soNgayKhoang(tuISO: string, denISO: string): number {
  return daysBetween(tuISO, denISO) + 1;
}

/**
 * KHOẢNG NGÀY — "10 ngày · 22/05/2027 – 31/05/2027" (Mr. Đại 27/09/2026: CẤM hiện
 * "ngày a – ngày b" mà không kèm số ngày — người đọc phải trừ nhẩm). Số ngày tính cả
 * ngày đầu và ngày cuối, theo lịch. MỘT định nghĩa cho mọi chỗ hiện khoảng ngày
 * của app này (luật 7; bản mẫu ở agent Tiến độ — chép 04/10/2026). Đầu vào ISO yyyy-mm-dd.
 * Thiếu ngày cuối: `thieuCuoi` ("đang làm"…); có `tinhDen` thì kèm số ngày tới mốc đó.
 */
export function khoangNgay(
  tuISO: string | null | undefined,
  denISO: string | null | undefined,
  tuy: { thieuCuoi?: string; tinhDen?: string | null } = {}
): string {
  if (!tuISO) return denISO ? `${DASH} – ${fmtDate(denISO)}` : DASH;
  if (!denISO) {
    const chu = tuy.thieuCuoi ?? DASH;
    if (tuy.tinhDen && tuy.tinhDen >= tuISO) {
      return `${soNgayKhoang(tuISO, tuy.tinhDen)} ngày tới ${fmtDate(tuy.tinhDen)} · ${fmtDate(tuISO)} – ${chu}`;
    }
    return `${fmtDate(tuISO)} – ${chu}`;
  }
  if (denISO < tuISO) return `${fmtDate(tuISO)} – ${fmtDate(denISO)}`;
  return `${soNgayKhoang(tuISO, denISO)} ngày · ${fmtDate(tuISO)} – ${fmtDate(denISO)}`;
}

export function addDays(iso: string, days: number): string {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
