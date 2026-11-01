// ============================================================
// mau-excel/tep-mau.ts — TỆP MẪU EXCEL của một mẫu báo cáo (22/10/2026). Server-only.
// Nguồn: file Word mẫu đang lưu trong kho (bản trắng = bản chính hoặc một phiên bản; bản ví dụ = phiên bản 0) + định nghĩa mẫu.
// Mẫu chưa có file Word (khai mới bằng định nghĩa) → bố cục dựng từ định nghĩa, tờ ví dụ ghi «chưa có».
// Dựng lại mỗi lần tải (đo 22/10: 12 mẫu, mỗi tệp dưới 1 giây) — sửa định nghĩa / tải Word mới là tệp Excel đổi theo ngay.
// ============================================================
import type { Q } from "@/lib/db";
import { layMau } from "@/lib/kiem-tra/kiem-tra";
import { docTepMau } from "@/lib/kiem-tra/quan-ly-mau";
import { boCucTuDinhNghia, boCucTuWord, type BoCuc, type DinhNghiaCoBang } from "./bo-cuc";
import { dungTepExcel, dungTepExcelTuBaoCao, type MauCanVe } from "./dung-excel";

async function mauCanVe(q: Q, ma: string, phienBan?: number): Promise<MauCanVe | null> {
  const mau = await layMau(q, ma);
  if (!mau) return null;
  const dn = mau.dinh_nghia as DinhNghiaCoBang;
  const trangTep = await docTepMau(q, ma, phienBan, "trang");
  if (phienBan !== undefined && !trangTep) return null;
  const viDuTep = await docTepMau(q, ma, undefined, "vi_du");
  const trang: BoCuc = trangTep ? await boCucTuWord(trangTep.noi_dung, dn) : boCucTuDinhNghia({ ma, ten: mau.ten, dinh_nghia: dn });
  trang.mau_ma ??= ma;
  const viDu = viDuTep ? await boCucTuWord(viDuTep.noi_dung, dn).catch(() => null) : null;
  return { mau: { ma, ten: mau.ten, phien_ban: phienBan ?? mau.phien_ban, dinh_nghia: dn }, trang, vi_du: viDu };
}

/** Tên tệp tải về tiếng Việt: "<tên mẫu> - mẫu báo cáo.xlsx" */
export function tenTepMauExcel(ten: string, phienBan?: number): string {
  return `${ten.replace(/[\\/:*?"<>|]/g, "-")} - mẫu báo cáo${phienBan !== undefined ? ` phiên bản ${phienBan}` : ""}.xlsx`;
}

/** Tệp .xlsx ba tờ (Mẫu trắng · Hướng dẫn · Ví dụ đã điền) của mẫu hiện hành, hoặc của một phiên bản cũ. */
export async function tepExcelCuaMau(q: Q, ma: string, phienBan?: number): Promise<{ ten_tep: string; noi_dung: Buffer } | null> {
  const m = await mauCanVe(q, ma, phienBan);
  if (!m) return null;
  return { ten_tep: tenTepMauExcel(m.mau.ten, phienBan), noi_dung: await dungTepExcel(m) };
}

/** Báo cáo Word đã điền (trợ lý «Làm báo cáo») → tệp Excel theo mẫu hiện hành, số liệu nằm ở tờ «Mẫu trắng». */
export async function excelTuBaoCaoWord(q: Q, ma: string, word: Buffer): Promise<Buffer> {
  const m = await mauCanVe(q, ma);
  if (!m) throw new Error(`Không có mẫu ${ma}`);
  const daDien = await boCucTuWord(word, m.mau.dinh_nghia);
  daDien.mau_ma ??= ma;
  return dungTepExcelTuBaoCao(m, daDien);
}
