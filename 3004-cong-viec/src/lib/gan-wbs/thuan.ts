// ============================================================
// gan-wbs/thuan.ts — GẮN VIỆC VÀO CÂY WBS (Mr. Đại chốt 03/10/2026 — agent Công việc thay vai agent Base). File THUẦN:
// client import được (luật 10), test được không cần CSDL.
//   · Mã WBS ghi sẵn trong tên việc ("… (7.2.3)") CHỈ LÀ GỢI Ý cho AI — đo 03/10: báo cáo đánh số riêng, CV-2026-0074 ghi
//     7.2.3 nhưng 7.2.3 của cây Tiến độ là "Thi công san nền". Máy không tự gắn theo mã trong tên.
//   · 🤖 AI đề xuất kèm lý do + độ chắc (0–1). Cài đặt › Gắn việc vào WBS: người duyệt hay AI tự duyệt.
//   · Người sửa / duyệt thì người thắng — AI không gắn đè dòng đã có.
// Gốc khuôn: agent Base `src/lib/gan-wbs/gan-wbs.ts` (prompt, độ chắc, ngưỡng nghi 0,7 — F03 22/09).
// ============================================================

import { docSoMay } from "@/lib/chung/doc-so";

/** 'ten_viec' chỉ còn ở dữ liệu cũ (trước khi bỏ luật máy gắn theo mã trong tên, 03/10) */
export type NguonGan = "ten_viec" | "ai" | "nguoi";
export type TrangThaiGan = "cho_duyet" | "da_duyet";

export interface WbsViec {
  cong_viec_id: string;
  du_an_id: string;
  ma_wbs: string | null;
  ten_wbs: string | null;
  ly_do: string | null;
  do_chac: number | null;
  nguon: NguonGan;
  trang_thai: TrangThaiGan;
  nguoi_duyet: string | null;
  luc_duyet: string | null;
  luc: string;
}

export interface DauViecWbs {
  wbs: string;
  name: string;
  critical?: boolean;
}

/** Ngưỡng "nghi" — dưới mức này màn hiện chữ "nghi" (giữ đúng số của agent Base, F03) */
export const NGUONG_NGHI = 0.7;

/** Mã WBS: ít nhất 2 dấu chấm (7.2.3) — "7.5" dễ là số thập phân/ngày nên không nhận (agent Base đo 05/09: MAU_WBS) */
const MA_TRONG_TEN = /(?<![\d.])(\d{1,3}(?:\.\d{1,3}){2,})(?![\d.])/g;

/**
 * Mã WBS ghi sẵn trong tên việc, chỉ nhận khi mã CÓ trong cây. Nhiều mã khác nhau cùng có trong cây → không nhận (để AI/người
 * quyết, máy không đoán). Trả null khi không có.
 */
export function maTrongTen(ten: string, maCo: Set<string>): string | null {
  const thay = new Set<string>();
  for (const m of ten.matchAll(MA_TRONG_TEN)) if (maCo.has(m[1])) thay.add(m[1]);
  return thay.size === 1 ? [...thay][0] : null;
}

/** Đọc độ chắc mô hình trả: số 0–1 (chịu cả "0,8" và "80"). Không đọc được → null = "chưa đo", KHÔNG mặc định 1. */
export function docDoChac(v: unknown): number | null {
  // chữ AI viết trong JSON → lib/chung/doc-so (chốt 130): đúng cú pháp số của máy thì theo máy, không thì chuẩn số Việt Nam.
  // Chuỗi rỗng nay là "chưa đo" (bản cũ Number("") = 0 thành độ chắc 0).
  let n = docSoMay(v) ?? NaN;
  if (!Number.isFinite(n)) return null;
  if (n > 1 && n <= 100) n = n / 100;
  if (n < 0 || n > 1) return null;
  return Math.round(n * 100) / 100;
}

/**
 * Đề xuất của AI có hiệu lực ngay không (Cài đặt › Gắn việc vào WBS). Người duyệt → luôn chờ. AI tự duyệt → chỉ khi độ chắc
 * đo được và ≥ ngưỡng; "không thuộc đầu việc nào" (mã null) cũng theo ngưỡng.
 */
export function aiTuDuyet(cheDo: "nguoi_duyet" | "ai_tu_duyet", nguong: number, doChac: number | null): boolean {
  return cheDo === "ai_tu_duyet" && doChac !== null && doChac >= nguong;
}

/** Luật 30 cho mã WBS: mã trần có trong cây mà chưa có tên theo sau → gắn tên ngắn. Không đụng số không có trong cây. */
export function ganTenWbs(text: string, tenTheoMa: Map<string, string>): string {
  return text.replace(MA_TRONG_TEN, (ma, _g, viTri: number, chu: string) => {
    const ten = tenTheoMa.get(ma);
    if (!ten) return ma;
    const sau = chu.slice(viTri + ma.length, viTri + ma.length + 40).replace(/^[\s·:—–-]+/, "");
    const tenNgan = ten.split(/\s+/).slice(0, 8).join(" ");
    if (sau.toLowerCase().startsWith(tenNgan.slice(0, 12).toLowerCase())) return ma;
    return `${ma} ${tenNgan}`;
  });
}

/** "7.2.3 Họp dân chi trả đền bù" — luật 30: không bao giờ chỉ viết mã */
export function nhanWbs(ma: string | null, ten: string | null): string {
  if (!ma) return "Không thuộc đầu việc nào";
  return ten ? `${ma} ${ten}` : ma;
}

/** Chữ ngắn cho nguồn gắn — hiện cạnh mã */
export function nhanNguon(w: Pick<WbsViec, "nguon" | "trang_thai" | "nguoi_duyet">): string {
  if (w.nguon === "ten_viec") return "mã ghi trong tên việc";
  if (w.nguon === "nguoi") return "người gắn";
  if (w.trang_thai === "cho_duyet") return "🤖 AI đề xuất — chờ duyệt";
  return w.nguoi_duyet ? "🤖 AI đề xuất — đã duyệt" : "🤖 AI tự duyệt";
}
