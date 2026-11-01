// ============================================================
// LUẬT 35 + 36 (Mr. Đại chốt 14/10/2026 — MỌI agent): nhanh / chậm tính bằng NGÀY, cấm dùng %; câu nào cũng ghi rõ
// so với hệ nào — «so với Tiến độ mục tiêu» hoặc «so với Baseline». Bản gốc của câu luật: agent Tiến độ
// `src/lib/cham-ngay.ts` (LUAT_NHANH_CHAM_THEO_NGAY) — giữ cùng chữ. Main chỉ ánh xạ số ngày agent Tiến độ đã tính.
// Thuần — client import được.
// ============================================================

import { daysBetween, fmtSo } from "@/lib/format";

export const LUAT_NHANH_CHAM_THEO_NGAY =
  "LUẬT NHANH/CHẬM (luật 35 + 36): đánh giá nhanh/chậm/trễ/sớm/đúng tiến độ CHỈ bằng SỐ NGÀY, tuyệt đối không dùng chênh lệch % " +
  "(% chỉ để nói đã làm được bao nhiêu). Mỗi câu nhanh/chậm phải ghi rõ so với hệ nào: «so với Tiến độ mục tiêu» hoặc «so với Baseline» " +
  "(cần cả hai thì ghi cả hai). Cấm viết «chậm N ngày» trơn hay «so với kế hoạch» không nói kế hoạch nào.";

// ------------------------------------------------------------
// HÀM CHUNG ghép chữ nhanh / chậm (luật 35 + 36) — bản mẫu: agent Tiến độ `src/lib/cham-ngay.ts` (chuNgay, chamMotNgay,
// TEN_HE). MỌI chỗ ở Main nói nhanh/chậm đi qua các hàm dưới, cấm tự ghép «chậm ${n} ngày» lẻ.
// Quy ước số: DƯƠNG = chậm, ÂM = sớm, 0 = đúng hạn; null = hệ đó chưa có ngày (Baseline chưa duyệt…).
// ------------------------------------------------------------


export type HeSoSanh = "muc-tieu" | "baseline";

export const TEN_HE: Record<HeSoSanh, string> = {
  "muc-tieu": "Tiến độ mục tiêu",
  baseline: "Baseline",
};

/** Câu khi hệ không có ngày để so */
export const CHU_THIEU_HE: Record<HeSoSanh, string> = {
  "muc-tieu": "chưa có ngày Tiến độ mục tiêu",
  baseline: "chưa có Baseline đã duyệt",
};

/** Tên nói thẳng khi agent Tiến độ phải tạm so với bảng đang lập vì chưa có Baseline đã duyệt (không được gọi là «Baseline») */
export const TEN_DANG_LAP = "tiến độ đang lập (chưa duyệt Baseline)";

/** «chậm 5 ngày» · «sớm 3 ngày» · «đúng hạn» */
export function chuNgay(n: number): string {
  return n > 0 ? `chậm ${fmtSo(n)} ngày` : n < 0 ? `sớm ${fmtSo(-n)} ngày` : "đúng hạn";
}

/** «chậm 5 ngày so với Baseline» · null → «chưa có Baseline đã duyệt» */
export function cauChamHe(n: number | null | undefined, he: HeSoSanh): string {
  if (n === null || n === undefined || Number.isNaN(n)) return CHU_THIEU_HE[he];
  return `${chuNgay(n)} so với ${TEN_HE[he]}`;
}

/**
 * Câu ghép CẢ HAI hệ: «chậm 86 ngày so với Tiến độ mục tiêu · chậm 44 ngày so với Baseline».
 * Hệ nào thiếu số thì ghi câu «chưa có …» của hệ đó — không bỏ vế, để người đọc biết vì sao không có số.
 */
export function cauChamHaiHe(soMucTieu: number | null | undefined, soBaseline: number | null | undefined): string {
  return `${cauChamHe(soMucTieu, "muc-tieu")} · ${cauChamHe(soBaseline, "baseline")}`;
}

/** Một NGÀY (COD, mốc) so với ngày của một hệ — dương = chậm. Thiếu ngày → null */
export function soNgayCham(ngay: string | null | undefined, ngayHe: string | null | undefined): number | null {
  if (!ngay || !ngayHe) return null;
  return daysBetween(ngayHe, ngay);
}
