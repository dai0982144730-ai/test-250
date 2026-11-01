// Hàm phụ cho bài kiểm tệp Excel (22/10/2026): tờ «Mẫu trắng» GỘP ô theo độ dài nội dung (đồng bộ mẫu agent Tiến độ) —
// không còn «cột 4 = Kết thúc»; tìm cột theo chữ ở hàng tên cột, tìm ô giá trị ngay sau vùng gộp của nhãn.
import type ExcelJS from "exceljs";

/** Chữ một ô, bỏ dấu « *» (ô phải ghi) và dấu «:» cuối */
export const chuCua = (c: ExcelJS.Cell) =>
  String(c.value ?? "")
    .trim()
    .replace(/\s*\*$/, "")
    .replace(/\s*:$/, "");

const laOPhu = (c: ExcelJS.Cell) => c.isMerged && !!c.master && c.master.address !== c.address;

/** Hàng đầu tiên (hoặc cuối cùng) có chữ đúng bằng `chu` ở cột `cot` */
export function hangCo(ws: ExcelJS.Worksheet, chu: string, cot = 1, cuoi = false): number {
  let kq = -1;
  for (let r = 1; r <= ws.rowCount; r++)
    if (chuCua(ws.getCell(r, cot)) === chu) {
      kq = r;
      if (!cuoi) return r;
    }
  return kq;
}

/** Cột (ô chính) có chữ `chu` ở hàng `r` */
export function cotCo(ws: ExcelJS.Worksheet, r: number, chu: string): number {
  for (let c = 1; c <= 60; c++) if (!laOPhu(ws.getCell(r, c)) && chuCua(ws.getCell(r, c)) === chu) return c;
  return -1;
}

/** Các cột (ô chính) có chữ ở hàng tên cột `r`, trái → phải */
export function cotBang(ws: ExcelJS.Worksheet, r: number): number[] {
  const kq: number[] = [];
  for (let c = 1; c <= 60; c++) if (!laOPhu(ws.getCell(r, c)) && chuCua(ws.getCell(r, c))) kq.push(c);
  return kq;
}

/** Ô GIÁ TRỊ của ô nhập có nhãn `nhan` ở bất kỳ cột nào (ô ngay sau vùng gộp của nhãn) — «Đơn vị lập» nằm nửa phải khung đầu */
export function oGiaTri(ws: ExcelJS.Worksheet, nhan: string): ExcelJS.Cell {
  for (let r = 1; r <= ws.rowCount; r++)
    for (let c0 = 1; c0 <= 60; c0++) {
      const goc = ws.getCell(r, c0);
      if (laOPhu(goc) || chuCua(goc) !== nhan) continue;
      let c = c0 + 1;
      while (laOPhu(ws.getCell(r, c)) && ws.getCell(r, c).master.address === goc.address) c++;
      return ws.getCell(r, c);
    }
  throw new Error(`không thấy nhãn ${nhan}`);
}

/** Màu nền của ô (argb), không nền → undefined */
export const nenCua = (c: ExcelJS.Cell) => {
  const f = c.fill as ExcelJS.FillPattern | undefined;
  return f?.pattern === "solid" ? (f.fgColor as { argb?: string } | undefined)?.argb : undefined;
};
