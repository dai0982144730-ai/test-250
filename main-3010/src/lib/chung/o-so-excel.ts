// ============================================================
// Ô SỐ CỦA EXCEL → CHỮ THEO CHUẨN SỐ VIỆT NAM (Mr. Đại chốt 12/10/2026 — KE-HOACH/10 chốt 130)
//
// Thư viện đọc Excel (SheetJS: `sheet_to_json({ raw: false })`, `format_cell`) viết ô SỐ ra chữ theo KIỂU ANH:
//   49105229400 → «49,105,229,400» · 1234.5 → «1,234.50» · 0.055 → «5.5%»
// Đo 12/10/2026 trên phiếu giá thật «1.PGTT đợt 1 Việt Lào.xlsx»: 588 / 1.134 ô số ra chữ có dấu phẩy nhóm nghìn.
// Chữ kiểu Anh đó (a) hiện ở khung xem tệp là trái chuẩn; (b) đưa vào bộ đọc số chuẩn Việt Nam (lib/chung/doc-so) thì
// «1,200» — một nghìn hai trăm — bị đọc thành 1,2. Vì vậy phải đổi NGAY TẠI NGUỒN: gọi `oSoRaChuVN(ws)` TRƯỚC `sheet_to_json`.
//
// Chỉ đổi ô SỐ (kiểu "n") mà chữ thư viện viết ra ĐÚNG LÀ CHÍNH CON SỐ của ô, viết kiểu Anh («1,234.50», «5.5%», «(25.01)»). Ô chữ
// người gõ giữ nguyên — đọc bằng `docSoNguoiGo`. Ô ngày, giờ giữ nguyên: «12.10.2026» không phải một con số; «12.10» (ngày.tháng)
// trông như số nhưng KHÔNG bằng giá trị của ô (ô ngày chứa số thứ tự ngày) nên cũng không bị đổi.
// Tệp không đụng node:fs (luật 10) — chạy được ở cả máy chủ lẫn bài kiểm.
// ============================================================
import * as XLSX from "xlsx";

/** Chữ số máy viết kiểu Anh → cùng chữ đó theo chuẩn Việt Nam: đổi chéo dấu phẩy ↔ dấu chấm. «49,105,229,400» → «49.105.229.400» · «1,234.50» → «1.234,50» · «5.5%» → «5,5%» */
export function chuSoAnhSangVN(w: string): string {
  return w.replace(/[.,]/g, (m) => (m === "," ? "." : ","));
}

/** Chữ thư viện viết ra là MỘT con số kiểu Anh: nhóm nghìn bằng dấu phẩy (nếu có), tối đa một dấu chấm thập phân; có thể kèm %, dấu ngoặc số âm, ký hiệu tiền */
const SO_KIEU_ANH = /^[\s($€£₫-]*(\d{1,3}(,\d{3})+|\d+)(\.\d+)?(E[+-]?\d+)?[\s%)₫đ]*$/i;

/**
 * Chữ `w` có đúng là con số `v` của ô viết ra không (cho phép làm tròn theo số chữ số lẻ đang hiện; ô phần trăm hiện gấp 100).
 * Chốt chặn cho ô NGÀY hiện kiểu «12.10»: thư viện không phải lúc nào cũng cho biết định dạng ô, nên so thẳng với giá trị.
 */
function laChuCuaChinhSo(w: string, v: number): boolean {
  if (!SO_KIEU_ANH.test(w)) return false;
  const chu = w.replace(/,/g, "").replace(/[^\d.eE+-]/g, "").replace(/^[+-]+/, "");
  const a = Math.abs(Number(chu));
  if (!Number.isFinite(a)) return false;
  const b = Math.abs(v);
  if (/e/i.test(chu)) return Math.abs(a - b) <= Math.max(b, 1e-12) * 0.01; // dạng khoa học «1.2E+10»: chỉ còn vài chữ số có nghĩa
  const le = (/\.(\d+)/.exec(chu)?.[1] ?? "").length;
  const sai = 0.5 * 10 ** -le * 1.000001 + 1e-9 * Math.max(1, b);
  return Math.abs(a - b) <= sai || (w.includes("%") && Math.abs(a - b * 100) <= sai);
}

/** Ghi sẵn chữ chuẩn Việt Nam vào từng ô SỐ của tờ (trường `w` — `sheet_to_json({ raw: false })` lấy đúng chữ này). Sửa TẠI CHỖ. */
export function oSoRaChuVN(ws: XLSX.WorkSheet | undefined): void {
  const ref = ws?.["!ref"];
  if (!ws || !ref) return;
  const r = XLSX.utils.decode_range(ref);
  for (let R = r.s.r; R <= r.e.r; R++) {
    for (let C = r.s.c; C <= r.e.c; C++) {
      const o = ws[XLSX.utils.encode_cell({ r: R, c: C })] as XLSX.CellObject | undefined;
      if (!o || o.t !== "n") continue;
      if (o.z !== undefined && XLSX.SSF.is_date(String(o.z))) continue; // số mang định dạng NGÀY — không phải con số để đọc
      const w = o.w ?? XLSX.utils.format_cell(o);
      if (typeof o.v === "number" && laChuCuaChinhSo(w, o.v)) o.w = chuSoAnhSangVN(w); // ngày, giờ («12.10.2026», «12.10», «14:30») giữ nguyên
    }
  }
}
