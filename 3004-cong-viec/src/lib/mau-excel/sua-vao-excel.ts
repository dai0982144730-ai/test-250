// ============================================================
// mau-excel/sua-vao-excel.ts — GHI CHỮ SỬA THẲNG VÀO Ô EXCEL (đợt 2, 22/10/2026; cùng hợp đồng với kiem-tra/sua-vao-file.ts của Word).
// Người nộp bấm «Sửa vào file» trên đề xuất 🤖 «Cũ → Mới» (sửa được chữ mới trước khi bấm) → máy thay giá trị của ĐÚNG MỘT ô:
// ô bảng (bảng · dòng · cột) hoặc ô nhập (giá trị bên phải nhãn). Giữ định dạng ô; bỏ nền đỏ / vàng + ghi chú lỗi máy để lại ở ô đó.
// Không đụng chỗ nào khác. Kết quả là tệp MỚI → lưu thành phiên bản mới rồi kiểm tra lại từ đầu.
// Chỗ nào không tìm thấy → ném lỗi, không ghi nửa chừng.
// ============================================================
import ExcelJS from "exceljs";
import type { SuaMotCho } from "@/lib/kiem-tra/sua-vao-file";
import { docExcel } from "./doc-excel";
import { boGhiChu, docNenGoc, ghiNenGoc, MAU_LOI, NEN_DIEN, traNenGoc } from "./danh-dau-excel";

export async function ghiSuaVaoExcel(buf: Buffer, sua: SuaMotCho[]): Promise<Buffer> {
  const nd = await docExcel(buf);
  const vt = nd.vi_tri_excel;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  const ws = vt ? wb.getWorksheet(vt.to) : undefined;
  if (!ws || !vt) throw new Error("Không thấy tờ báo cáo trong tệp Excel");
  const o: ExcelJS.Cell[] = [];
  for (const s of sua) {
    const v = s.vi_tri;
    let cell: ExcelJS.Cell | undefined;
    if (v.bang && v.dong && v.cot) {
      const hang = nd.hang_excel?.[v.bang]?.[v.dong - 1];
      const cot = vt.bang[v.bang]?.[v.cot];
      if (hang && cot) cell = ws.getCell(hang, cot);
    } else if (v.tag && vt.o[v.tag]) cell = ws.getCell(vt.o[v.tag].hang, vt.o[v.tag].cot);
    if (!cell) throw new Error(`Không tìm thấy chỗ cần sửa trong tệp (${v.bang ? `bảng ${v.bang}, dòng ${v.dong}, cột ${v.cot}` : `ô ${v.tag}`})`);
    o.push(cell.isMerged && cell.master ? cell.master : cell);
  }
  const goc = docNenGoc(wb);
  sua.forEach((s, i) => {
    const c = o[i];
    c.value = s.moi.replace(/\r\n?/g, "\n");
    if (s.moi.includes("\n")) c.style = { ...c.style, alignment: { ...(c.alignment ?? {}), wrapText: true } };
    const argb = ((c.fill as ExcelJS.FillPattern | undefined)?.fgColor as { argb?: string } | undefined)?.argb?.toUpperCase();
    // trả lại nền gốc của mẫu (đỏ / xanh / trắng — máy ghi lúc tô lỗi); tệp cũ không có sổ: ô nhập nền vàng «chỗ để điền»
    if (argb === MAU_LOI.chan.nen || argb === MAU_LOI.canh_bao.nen) traNenGoc(c, goc, sua[i].vi_tri.tag && !goc.size ? NEN_DIEN : "");
    goc.delete(c.address);
    boGhiChu(c);
  });
  ghiNenGoc(wb, goc);
  return Buffer.from(await wb.xlsx.writeBuffer());
}
