// ============================================================
// dinh-kem.ts — BÓC CHỮ FILE ĐÍNH KÈM TRONG CHAT (B1, S8 tầng 2)
//
// Người dùng kẹp file vào ô chat → server bóc chữ → chữ đi kèm câu hỏi cho AI.
// Dùng lại ruột sẵn có (luật 7): bảng xlsx từ `xem-tep.ts`, pptx cũng vậy,
// pdf qua `pdf-parse` như bộ đọc BC ngày, docx qua mammoth.
//
// Server-only (Buffer + thư viện node). Phần dùng chung với client ở
// `dinh-kem-chung.ts`.
// ============================================================

import { bocBangXlsx, bocChuPptx } from "@/lib/xem-tep";
import {
  TRAN_CHU_TEP,
  duoiCuaTen,
  type TepDinhKem,
} from "./dinh-kem-chung";

/** Bảng xlsx → chữ: mỗi sheet một khối, ô ngăn bằng " | " */
function bangSangChu(buf: Buffer): string {
  return bocBangXlsx(buf)
    .map((s) => {
      const hang = s.hang
        .filter((r) => r.some((c) => c.trim() !== ""))
        .map((r) => r.join(" | "))
        .join("\n");
      return `— Sheet: ${s.ten}${s.biCat ? " (đã cắt còn 300 dòng × 30 cột)" : ""} —\n${hang || "(sheet trống)"}`;
    })
    .join("\n\n");
}

async function chuPdf(buf: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  const parsed = await parser.getText();
  // pdf-parse chèn nhãn "-- 3 of 22 --" mỗi trang; bản SCAN chỉ còn toàn nhãn
  // này → bỏ nhãn đi để phát hiện đúng "không có lớp chữ" (đo 06/09 trên file
  // 22 trang: bỏ nhãn xong còn 0 ký tự).
  return (parsed.text ?? "").replace(/--\s*\d+\s*of\s*\d+\s*--/g, "");
}

async function chuDocx(buf: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const kq = await mammoth.extractRawText({ buffer: buf });
  return kq.value;
}

/**
 * Bóc chữ một file. KHÔNG throw — hỏng thì trả chữ rỗng kèm ghi chú tiếng Việt
 * để người dùng biết vì sao trợ lý không đọc được.
 */
export async function bocChuTep(ten: string, buf: Buffer): Promise<{ chu: string; ghiChu?: string }> {
  const duoi = duoiCuaTen(ten);
  try {
    if (duoi === ".pdf") {
      const chu = await chuPdf(buf);
      return chu.trim() === ""
        ? { chu: "", ghiChu: "PDF này không có lớp chữ (chắc là bản chụp/scan) — trợ lý chưa đọc ảnh được." }
        : { chu };
    }
    if (duoi === ".xlsx" || duoi === ".xls" || duoi === ".csv") return { chu: bangSangChu(buf) };
    if (duoi === ".docx") return { chu: await chuDocx(buf) };
    if (duoi === ".pptx") {
      return { chu: bocChuPptx(buf), ghiChu: "Chỉ bóc được CHỮ trên slide — hình và biểu đồ không đọc được." };
    }
    if (duoi === ".txt" || duoi === ".md" || duoi === ".json") return { chu: buf.toString("utf8") };
    return { chu: "", ghiChu: `Chưa đọc được đuôi ${duoi || "(không rõ)"} — dùng file pdf/xlsx/docx/txt/md/json/pptx.` };
  } catch (err) {
    return {
      chu: "",
      ghiChu: `Không đọc được file: ${err instanceof Error ? err.message.slice(0, 140) : "lỗi không rõ"}.`,
    };
  }
}

/**
 * Bóc + cắt — một file thành một `TepDinhKem` hoàn chỉnh.
 * ⭐ 24/09: bỏ bước gợi ý "đây là BC ngày/tuần Lớp 0, nộp qua Hồ sơ dự án" —
 * bộ nhận dạng Lớp 0 (drive/lop0 + schedule/import-xlsx) là của Agent tiến độ,
 * chép trong Main; nộp báo cáo làm ở Agent tiến độ (localhost:3003/docs).
 */
export async function chuanBiTep(ten: string, buf: Buffer, tenDuAn: string): Promise<TepDinhKem> {
  const { chu, ghiChu } = await bocChuTep(ten, buf);
  const gon = chu.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const biCat = gon.length > TRAN_CHU_TEP;
  return {
    ten,
    co: buf.length,
    chu: biCat ? gon.slice(0, TRAN_CHU_TEP) : gon,
    biCat,
    ghiChu,
  };
}
