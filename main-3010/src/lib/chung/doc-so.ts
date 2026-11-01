// ĐỌC SỐ THEO CHUẨN VIỆT NAM — MỘT bộ đọc cho mọi chữ số đi vào agent: tệp người điền tay (báo cáo ngày, báo cáo tuần, số đầu kỳ,
// BOQ, hợp đồng, bảng tiến độ), ô gõ trên màn, chữ dán từ Excel, và chữ AI trả về. Cửa chặn lớp 0 và các bộ đọc PHẢI hiểu một ô
// theo cùng một cách — trước 11/10/2026 mỗi nơi một kiểu. Tệp THUẦN (luật 10).
//
// ⭐ Mr. Đại chốt 12/10/2026 (KE-HOACH/10 chốt 130, bản rà KE-HOACH/14): «con số thập phân là "," — ngăn cách giữa 3 ký tự nếu có
// là "." — theo chuẩn của Việt Nam». Áp cho số NHẬP VÀO lẫn số HIỆN RA (hiện ra: lib/format).
//
// Ô SỐ của Excel (kiểu number) giữ nguyên — Excel đã giữ sẵn giá trị. Luật dưới đây chỉ cho CHỮ:
//
//   ĐÚNG CHUẨN   «1.234,5» = 1234,5 · «1.200.000» = 1200000 · «0,5» = 0,5 · «1200» = 1200 · «1 200,5» = 1200,5
//   DỄ NHẦM      đúng MỘT dấu ngăn kèm đúng BA chữ số — máy vẫn đọc THEO CHUẨN, nhưng báo để người biết (không chặn):
//                  «1,200» = 1,2      (người quen kiểu Anh gõ thế để chỉ một nghìn hai trăm)
//                  «1.200» = 1200     (người quen kiểu Anh gõ thế để chỉ một phẩy hai)
//   SAI CHUẨN    gõ kiểu Anh, chỉ có MỘT cách hiểu → máy đọc theo cách đó, báo để người sửa (không chặn):
//                  «1.5» = 1,5 · «1234.5» = 1234,5 · «1,234.5» = 1234,5 · «1,200,000» = 1200000 · «0.500» = 0,5
//   KHÔNG PHẢI SỐ → null:  «1.2.3» · «1,2,3» · «12 m3» · «-» · trống
//
// Kiểm tra độc lập lần 3 (11/10/2026) đo trên mẫu thật: bộ đọc cũ xoá hết dấu phẩy rồi mới đổi ra số, nên ô CHỮ «0,5» thành 5 ·
// «1,5» thành 15 — sai lặng 10 tới 1.000 lần. Ô SỐ của Excel không dính.

/** Số nguyên không dấu ngăn, hoặc thập phân dấu phẩy không nhóm: «1200» · «0,5» · «1234,567» */
const VN_TRON = /^-?\d+(,\d+)?$/;
/** Có nhóm ba chữ số bằng dấu chấm, thập phân (nếu có) bằng dấu phẩy: «1.200» · «1.234.567,89» */
const VN_NHOM = /^-?[1-9]\d{0,2}(\.\d{3})+(,\d+)?$/;
/** Kiểu Anh có nhóm bằng dấu phẩy: «1,200,000» · «1,234.5» («1,200» một nhóm không thập phân đã khớp VN_TRON ở trên) */
const ANH_NHOM = /^-?[1-9]\d{0,2}(,\d{3})+(\.\d+)?$/;
/** Kiểu Anh thập phân dấu chấm: «1.5» · «1234.5» · «0.500» («1.200» đã khớp VN_NHOM ở trên) */
const ANH_THAP_PHAN = /^-?\d+\.\d+$/;
/** Một dấu ngăn kèm đúng ba chữ số: «1.200» · «1,200» · «12,345» */
const DE_NHAM = /^-?[1-9]\d{0,2}[.,]\d{3}$/;

const gon = (v: string): string => v.replace(/[\s ]/g, "");

export type KieuLechChuan = "de-nham" | "sai-chuan";

/** Kết quả đọc một CHỮ: số máy lấy, và (nếu có) vì sao phải báo cho người */
export interface SoChu {
  so: number;
  /** Bỏ trống = đúng chuẩn, không có gì phải báo */
  lech?: KieuLechChuan;
  /** Chỉ có ở «de-nham»: con số theo cách hiểu kia (kiểu Anh) */
  cachKia?: number;
}

/** Đọc một CHỮ theo chuẩn Việt Nam. Không phải số → null */
export function docSoChu(chu: string): SoChu | null {
  const s = gon(chu);
  if (s === "" || !/\d/.test(s)) return null;
  if (VN_TRON.test(s) || VN_NHOM.test(s)) {
    const so = Number(s.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(so)) return null;
    if (!DE_NHAM.test(s)) return { so };
    // «1,200» máy đọc 1,2 — cách kia 1200 · «1.200» máy đọc 1200 — cách kia 1,2
    const cachKia = s.includes(",") ? Number(s.replace(",", "")) : Number(s);
    return { so, lech: "de-nham", cachKia };
  }
  if (ANH_NHOM.test(s) || ANH_THAP_PHAN.test(s)) {
    const so = Number(s.replace(/,/g, ""));
    return Number.isFinite(so) ? { so, lech: "sai-chuan" } : null;
  }
  return null;
}

/** Ô số của Excel trả nguyên; ô chữ đọc theo chuẩn Việt Nam (luật ở đầu tệp); trống / không phải số → null */
export function docSoNguoiGo(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  return docSoChu(v)?.so ?? null;
}

/**
 * Chữ do MÁY / AI viết trong JSON (tham số công cụ của trợ lý, bản tả tệp xuất): viết đúng cú pháp số của máy («1234.5», «106.587»)
 * thì lấy theo cú pháp máy; còn lại là chữ viết cho người đọc → đọc theo chuẩn Việt Nam («1.234,5», «1,5»).
 * KHÁC `docSoNguoiGo` đúng một chỗ: «106.587» ở đây là 106,587 (toạ độ, kích thước AI ghi dạng chữ), còn ở tệp người gõ là 106587.
 */
export function docSoMay(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const s = gon(v);
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return docSoChu(s)?.so ?? null;
}

/** Một ô chữ phải báo cho người: chữ gốc, số máy đã đọc, và cách hiểu kia (nếu là ô dễ nhầm) */
export interface LechChuan {
  kieu: KieuLechChuan;
  chu: string;
  mayDoc: number;
  cachKia: number | null;
}

/** Ô CHỮ là số nhưng dễ nhầm hoặc gõ sai chuẩn → trả thứ cần báo; ô số của Excel, chữ đúng chuẩn, chữ không phải số → null */
export function soLechChuan(v: unknown): LechChuan | null {
  if (typeof v !== "string") return null;
  const d = docSoChu(v);
  if (!d || !d.lech) return null;
  return { kieu: d.lech, chu: v.trim(), mayDoc: d.so, cachKia: d.cachKia ?? null };
}

/** Số viết theo chuẩn Việt Nam để ghép vào câu báo: 1200 → «1.200» · 1.2 → «1,2» (giữ tới 6 số lẻ, không thêm số 0) */
export function vietSoVN(n: number): string {
  return n.toLocaleString("vi-VN", { maximumFractionDigits: 6 });
}

/**
 * Câu báo cho một ô lệch chuẩn — `dau` là phần mở đầu do nơi gọi ghép (vd «Dòng 19 (mã BOQ …): khối lượng»).
 * Nơi có nút sửa trên màn thì truyền `coNut = true` để câu chỉ người bấm nút; nơi không có nút thì bảo sửa trong Excel.
 */
export function cauLechChuan(dau: string, l: LechChuan, coNut: boolean): string {
  const mo = `${dau} «${l.chu}» là ô CHỮ`;
  if (l.kieu === "de-nham") {
    const kia = l.cachKia === null ? "" : vietSoVN(l.cachKia);
    return `${mo} — theo chuẩn số Việt Nam máy đọc là ${vietSoVN(l.mayDoc)}. Nếu ý là ${kia} thì ${coNut ? "bấm nút bên dưới, máy sửa vào tệp" : "sửa ô đó thành số trong Excel rồi nạp lại"}.`;
  }
  return `${mo} gõ sai chuẩn số Việt Nam (thập phân dùng dấu phẩy, nhóm ba chữ số dùng dấu chấm) — máy đọc là ${vietSoVN(l.mayDoc)}.${coNut ? " Bấm nút bên dưới để máy sửa ô đó thành số." : ""}`;
}
