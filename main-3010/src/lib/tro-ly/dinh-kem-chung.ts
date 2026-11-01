// ============================================================
// dinh-kem-chung.ts — PHẦN THUẦN của bộ đính kèm file vào chat (B1)
//
// Luật 10: lib server đụng node:fs/Buffer phải tách file thuần; client chỉ
// import file này. Ruột đọc file nằm ở `dinh-kem.ts` (server-only).
// ============================================================

/** Đuôi file trợ lý đọc được chữ (ảnh chưa hỗ trợ — nói thẳng thay vì im lặng) */
export const DUOI_DINH_KEM = [
  ".pdf",
  ".xlsx",
  ".xls",
  ".csv",
  ".docx",
  ".txt",
  ".md",
  ".json",
  ".pptx",
] as const;

/** Trần chữ mỗi file đưa vào ngữ cảnh AI — cắt để khỏi đốt token vô ích */
export const TRAN_CHU_TEP = 20_000;
/** Trần dung lượng nhận (20MB, bằng mức đính kèm dòng WBS) */
export const TRAN_BYTE_TEP = 20 * 1024 * 1024;
/** Số file đính kèm mỗi lượt hỏi */
export const TRAN_SO_TEP = 3;

/** Một file đã bóc chữ, sẵn sàng gửi kèm câu hỏi */
export interface TepDinhKem {
  ten: string;
  /** Dung lượng thật (byte) */
  co: number;
  /** Chữ bóc được, đã cắt theo TRAN_CHU_TEP */
  chu: string;
  /** true = đã bị cắt bớt, phải nói cho người dùng biết */
  biCat: boolean;
  ghiChu?: string;
}

export function duoiCuaTen(ten: string): string {
  const i = ten.lastIndexOf(".");
  return i < 0 ? "" : ten.slice(i).toLowerCase();
}

export function doDuocDuoi(ten: string): boolean {
  return (DUOI_DINH_KEM as readonly string[]).includes(duoiCuaTen(ten));
}

/**
 * Ghép các file đính kèm thành một khối chữ cho AI đọc.
 * Rỗng → chuỗi rỗng (không chèn khối thừa vào prompt).
 */
export function khoiChuDinhKem(tep: TepDinhKem[]): string {
  if (tep.length === 0) return "";
  const than = tep
    .map(
      (t) =>
        `--- FILE: ${t.ten} (${(t.co / 1024).toFixed(0)} KB)${t.biCat ? " — ĐÃ CẮT BỚT, chỉ có phần đầu" : ""} ---\n${t.chu}`
    )
    .join("\n\n");
  return (
    `\n\n=== NGƯỜI DÙNG ĐÍNH KÈM ${tep.length} FILE — đọc để trả lời ===\n` +
    `Chỉ dùng nội dung dưới đây làm căn cứ cho phần liên quan tới file; ` +
    `số nào không có trong file thì ghi "chưa có trong file", TUYỆT ĐỐI không ước.\n\n` +
    than +
    `\n=== HẾT FILE ĐÍNH KÈM ===`
  );
}
