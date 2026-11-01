// ============================================================
// kiem-tra/doc-bao-cao.ts — ĐỌC MỘT BÁO CÁO ĐÃ LƯU, Word hay Excel đều ra NoiDungWord (22/10/2026).
// Báo cáo nộp từ 22/10 là .xlsx; báo cáo Word nộp trước đó vẫn đọc lại được (sổ cái, chuỗi việc kỳ trước, AI, luật chạy thử).
// Nhận theo NỘI DUNG tệp (gói Excel có xl/workbook.xml), không theo đuôi tên.
// ============================================================
import { docWord, type NoiDungWord } from "./doc-word";
import { docExcel, laGoiExcel } from "@/lib/mau-excel/doc-excel";

export async function docBaoCao(buf: Buffer): Promise<NoiDungWord> {
  if (!laGoiExcel(buf)) return docWord(buf);
  return docExcel(buf, async () => {
    // Chỉ cần khi tệp mất tờ ẩn _may: lấy định nghĩa mẫu để nhận cột theo tên
    const [{ layQ }, { danhSachMau }] = await Promise.all([import("@/lib/db"), import("./kiem-tra")]);
    return (await danhSachMau(await layQ())).filter((m) => m.active);
  });
}

/** Tệp là báo cáo đọc được (Word theo mẫu cũ hoặc Excel theo mẫu mới) — nhìn đuôi tên / kiểu tệp. */
export function laTepBaoCao(tenTep: string, mime = ""): boolean {
  return /\.(docx|docm|xlsx)$/i.test(tenTep) || mime.includes("wordprocessingml") || mime.includes("spreadsheetml");
}
