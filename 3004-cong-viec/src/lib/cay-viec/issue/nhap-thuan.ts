// ============================================================
// cay-viec/issue/nhap-thuan.ts — BẢN NHÁP GIAO VIỆC MẶC ĐỊNH của một thẻ issue (đợt ⑤, 06/10/2026).
// MỘT chỗ cho cả khối giao việc dưới thẻ (màn) lẫn cửa base.viec_cho_duyet (máy chủ, bảng tổng ở Main) — luật 7.
// Trước 06/10 khối dưới thẻ tự ghép nháp ở trình duyệt → Main không đọc được (THIET-KE-VIEC-CHO-DUYET-CHUNG mục 5 đợt ⑤).
//
// Q4 (Mr. Đại chốt 04/10 23:00): thẻ NHẮC (gom theo người: "nhắc đóng việc" · "tồn việc quá hạn") KHÔNG sinh việc mới —
// thay khối giao việc bằng "Mở việc cũ" + "Nhắc người giữ việc" (chuông + lịch sử việc, chốt 06/10).
// File THUẦN (luật 10) — client import được.
// ============================================================
import { dangBoQua, type DauViecNho, type TheCanhBao } from "@/lib/cay-viec/issue/model";
import { ketQuaMacDinhGang } from "@/lib/cay-viec/thuan";

/** Người trong khoá gom ("người:<mã>" · "xong-giấy:<mã>" · "chưa-đóng:<mã>") */
export function nguoiTrongKhoa(wbs?: string): string | null {
  const m = /^(?:người|xong-giấy|chưa-đóng):(.+)$/.exec(wbs ?? "");
  return m && m[1] !== "chưa-giao" ? m[1] : null;
}

/** Thẻ NHẮC — gom theo người (nhắc đóng việc · tồn việc quá hạn): việc cũ đã có, không giao việc mới (Q4) */
export const laTheNhac = (t: Pick<TheCanhBao, "wbs">) => /^(?:người|xong-giấy|chưa-đóng):/.test(t.wbs ?? "");

/** Mã việc cũ thẻ nhắc trỏ tới — máy ghi trong phần phân tích ("• CV-2026-0030 …") */
export function viecCuCuaThe(t: Pick<TheCanhBao, "phanTich">): string[] {
  return Array.from(new Set((t.phanTich ?? "").match(/CV-\d{4}-\d+/g) ?? []));
}

export const laNutGang = (t: Pick<TheCanhBao, "nguon" | "wbs">) => t.nguon === "gang" && /^\d+(?:\.\d+)*$/.test(t.wbs ?? "");

export function tenWbsCua(t: Pick<TheCanhBao, "nguon" | "wbs" | "tieuDe">, dauViec?: Record<string, DauViecNho>): string {
  return (laNutGang(t) ? dauViec?.[t.wbs!]?.ten : undefined) ?? t.tieuDe.replace(/^WBS\s+\S+\s+/, "").replace(/\s+—.*$/, "");
}

const congNgay = (iso: string, n: number) => new Date(Date.parse(iso + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);

export interface NhapMacDinh {
  ten: string;
  /** yyyy-mm-dd */
  han: string;
  kq: string;
}

/** Nháp mặc định (máy, 0 token): tên · hạn (hạn xử lý của thẻ, đã qua thì hôm nay + 7) · kết quả cần có */
export function nhapMacDinh(t: TheCanhBao, ctx: { duAnTen: string; homNay: string; dauViec?: Record<string, DauViecNho> }): NhapMacDinh {
  const tenWbs = tenWbsCua(t, ctx.dauViec);
  return {
    ten: laNutGang(t) ? `[${ctx.duAnTen}] Xử lý ${t.wbs} — ${tenWbs}` : `Xử lý issue ${t.id}: ${t.tieuDe}`.slice(0, 140),
    han: t.hanXuLy && t.hanXuLy >= ctx.homNay ? t.hanXuLy : congNgay(ctx.homNay, 7),
    // Issue găng: đúng câu máy ghi khi giao từ Cây việc (đề xuất của thẻ là câu hướng dẫn bấm, không phải kết quả — đo 04/10)
    kq: laNutGang(t) ? ketQuaMacDinhGang(t.wbs!, tenWbs) : t.deXuat,
  };
}

/** Thẻ có khối giao việc (chưa xét quyền người xem): không phải đề xuất 🤖, của agent này, chưa đóng, chưa giao, chưa "không cần giao" */
// 07/10 (khuôn Issue hai loại, đợt 2): thẻ 🤖 AI đề xuất cũng có khối giao việc (bỏ Duyệt/Bác bỏ) → cũng là việc chờ giao
export function canGiaoViec(t: TheCanhBao, chanGhi: string | null): boolean {
  return !chanGhi && t.xuLy !== "da-giao-viec" && !dangBoQua(t) && t.dieuKien !== "da-dong";
}

/** Nguồn của một việc chờ giao — "Việc chờ tôi giao" ghi rõ từng nguồn (Mr. Đại chốt 07/10): nút găng ở Cây việc, còn lại Issue */
export type NguonViecCho = "cay-viec" | "issue";
export const nguonViecCua = (t: Pick<TheCanhBao, "nguon" | "wbs">): NguonViecCho => (laNutGang(t) ? "cay-viec" : "issue");
