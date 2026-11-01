// ============================================================
// xem-tep.ts — MỞ FILE TRỰC TIẾP TRONG APP (lệnh Mr. Đại 07/09 điểm 1)
//
// Một bộ đọc DÙNG CHUNG (luật 7) cho mọi chỗ cần xem file: Hồ sơ dự án,
// popup dẫn nguồn, về sau cả file đính kèm việc Base.
//
// Loại hỗ trợ: pdf (trình duyệt tự vẽ) · xlsx/xls (SheetJS → bảng từng
// sheet, nhảy được tới ĐÚNG sheet) · docx (mammoth → HTML giữ định dạng) ·
// txt/md (chữ) · pptx (bóc chữ từng slide — nói rõ là bản xem chữ).
// Server-only (Buffer + thư viện node).
// ============================================================

import * as XLSX from "xlsx";
import AdmZip from "adm-zip";
import { DUOI_ANH, duoiTep, type KetQuaXem, type SheetBang } from "./xem-tep-chung";
import { oSoRaChuVN } from "@/lib/chung/o-so-excel";

export { duoiTep, DUOI_XEM_DUOC } from "./xem-tep-chung";
export type { KetQuaXem, SheetBang } from "./xem-tep-chung";

const HANG_TOI_DA = 300;
const COT_TOI_DA = 30;

function boDau(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

/** Bảng từ workbook — mỗi sheet cắt còn 300×30, đánh dấu bị cắt */
export function bocBangXlsx(buf: Buffer): SheetBang[] {
  const wb = XLSX.read(buf, { type: "buffer" });
  return wb.SheetNames.map((ten) => {
    const ws = wb.Sheets[ten];
    oSoRaChuVN(ws); // chốt 130: khung xem tệp hiện ô số theo chuẩn Việt Nam («49.105.229.400»), không phải kiểu Anh của thư viện
    const tho = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, defval: "" });
    const biCat = tho.length > HANG_TOI_DA || tho.some((r) => r.length > COT_TOI_DA);
    const hang = tho
      .slice(0, HANG_TOI_DA)
      .map((r) => r.slice(0, COT_TOI_DA).map((c) => String(c ?? "")));
    return { ten, hang, biCat };
  });
}

/** Bóc chữ pptx: mỗi slide một khối (ppt/slides/slideN.xml → mọi <a:t>) */
export function bocChuPptx(buf: Buffer): string {
  const zip = new AdmZip(buf);
  const slides = zip
    .getEntries()
    .filter((e) => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName))
    .sort((a, b) => {
      const na = Number(/slide(\d+)/.exec(a.entryName)?.[1] ?? 0);
      const nb = Number(/slide(\d+)/.exec(b.entryName)?.[1] ?? 0);
      return na - nb;
    });
  const khoi: string[] = [];
  slides.forEach((e, i) => {
    const xml = e.getData().toString("utf8");
    const chu = Array.from(xml.matchAll(/<a:t>([^<]*)<\/a:t>/g))
      .map((m) => m[1])
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    khoi.push(`— Slide ${i + 1} —\n${chu || "(slide không có chữ)"}`);
  });
  return khoi.join("\n\n");
}

/** Tìm tên sheet khớp yêu cầu (không dấu, chứa nhau là được) */
export function timSheet(sheet: SheetBang[], muon?: string): string | undefined {
  if (!muon) return undefined;
  const q = boDau(muon);
  const khop = sheet.find((s) => boDau(s.ten) === q) ?? sheet.find((s) => boDau(s.ten).includes(q) || q.includes(boDau(s.ten)));
  return khop?.ten;
}

/** Đọc 1 file thành nội dung xem được — KHÔNG throw, lỗi trả khong-ho-tro kèm ghi chú */
export async function docNoiDungTep(ten: string, buf: Buffer, sheetUuTien?: string): Promise<KetQuaXem> {
  const duoi = duoiTep(ten);
  try {
    if (duoi === ".pdf") return { loai: "pdf", ten };

    // Ảnh: không bóc chữ, màn hình vẽ thẳng bằng thẻ <img> lấy từ ?raw=1
    if (DUOI_ANH.has(duoi)) return { loai: "anh", ten };

    if (duoi === ".xlsx" || duoi === ".xls" || duoi === ".csv") {
      const sheet = bocBangXlsx(buf);
      return { loai: "bang", ten, sheet, sheetMo: timSheet(sheet, sheetUuTien) ?? sheet[0]?.ten };
    }

    if (duoi === ".docx") {
      const mammoth = await import("mammoth");
      const kq = await mammoth.convertToHtml({ buffer: buf });
      // mammoth chỉ sinh thẻ trình bày; vẫn gạt mọi thẻ script cho chắc
      const html = kq.value.replace(/<script[\s\S]*?<\/script>/gi, "");
      return { loai: "html", ten, html };
    }

    if (duoi === ".txt" || duoi === ".md" || duoi === ".json") {
      return { loai: "chu", ten, chu: buf.toString("utf8").slice(0, 200000) };
    }

    if (duoi === ".pptx") {
      return {
        loai: "chu",
        ten,
        chu: bocChuPptx(buf),
        ghiChu: "Bản xem CHỮ của slide — hình/biểu đồ không hiện được, mở PowerPoint để xem đầy đủ.",
      };
    }

    return { loai: "khong-ho-tro", ten, ghiChu: `Chưa hỗ trợ xem đuôi ${duoi || "(không rõ)"} trong app — dùng nút Tải về.` };
  } catch (err) {
    return {
      loai: "khong-ho-tro",
      ten,
      ghiChu: `Không đọc được file: ${err instanceof Error ? err.message.slice(0, 120) : "lỗi không rõ"}.`,
    };
  }
}
