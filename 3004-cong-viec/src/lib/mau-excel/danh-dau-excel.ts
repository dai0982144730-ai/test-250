// ============================================================
// mau-excel/danh-dau-excel.ts — BẢN EXCEL ĐÁNH DẤU LỖI (đợt 2, Mr. Đại duyệt 22/10/2026). Cùng luật với bản Word (danh-dau-loi.ts):
//   · NỀN ĐỎ = lỗi chặn gửi, NỀN VÀNG = cảnh báo; chỗ vừa chặn vừa cảnh báo luôn ra ĐỎ (tô vàng trước, đỏ sau);
//   · lỗi chỉ ra dòng (không có cột) → tô cả dòng của bảng; ghi chú (note Excel) neo ĐÚNG ô lỗi;
//   · lỗi không gắn được vào ô nào (thiếu mục, mất bảng…) → chỉ nằm ở tờ «Lỗi cần sửa» (đặt CUỐI tệp, máy không đọc tờ này);
//   · tải lên lại chính bản đã đánh dấu rồi đánh dấu lần nữa → bỏ màu + ghi chú cũ của máy trước (không nhân đôi, dòng đã sửa hết đỏ).
// File gốc không đổi; trả tệp mới. Người dùng sửa ngay trên tệp này rồi «Tải lên bản đã sửa».
// ============================================================
import ExcelJS from "exceljs";
import type { LoiKiemTra, MauWord } from "@/lib/types";
import { nhanViTri } from "@/lib/kiem-tra/danh-dau-loi";
import { docExcel, type NoiDungExcel } from "./doc-excel";
import { TO_LOI, TO_MAY } from "./dung-excel";

export const MAU_LOI = { chan: { nen: "FFFF8A80", nhan: "CHẶN GỬI", chu: "đỏ" }, canh_bao: { nen: "FFFFF2A8", nhan: "CẢNH BÁO", chu: "vàng" } } as const;
/** Nền ô để điền của mẫu cũ (tải trước 22/10 chiều) — tệp không có sổ «nen_goc» thì ô nhập trả lại nền này */
export const NEN_DIEN = "FFFFF9E0";
const DAU_GHI_CHU = /^\[(CHẶN GỬI|CẢNH BÁO)\]/;

type O = { hang: number; cot: number };

/**
 * Đặt nền cho ĐÚNG một ô. exceljs mở tệp xong cho các ô cùng kiểu dùng CHUNG một đối tượng style — gán `c.fill` thẳng là tô lan
 * sang mọi ô cùng kiểu (đo 22/10: tô 1 ô việc, cả bảng đỏ). Tạo style mới cho riêng ô này.
 */
/**
 * Gỡ ghi chú của một ô. exceljs không có lệnh gỡ, và giữ ghi chú ở HAI chỗ: `_comment` và bản mô tả của giá trị đọc từ tệp
 * (ghi lại tệp là chép ra từ đó) — gán lại giá trị để dựng mới bản mô tả, rồi bỏ `_comment`.
 */
export function boGhiChu(c: ExcelJS.Cell): void {
  const v = c.value;
  (c as unknown as { _comment?: unknown })._comment = undefined;
  c.value = v;
}

export function datNen(c: ExcelJS.Cell, fill: ExcelJS.Fill): void {
  c.style = { ...c.style, fill };
}

/** Ô (hoặc các ô) mà một lỗi chỉ tới. */
export function oCuaLoi(l: LoiKiemTra, nd: NoiDungExcel): O[] {
  const v = l.vi_tri;
  const vt = nd.vi_tri_excel;
  if (!v || !vt) return [];
  if (v.bang && v.dong) {
    const hang = nd.hang_excel?.[v.bang]?.[v.dong - 1];
    const cot = vt.bang[v.bang];
    if (!hang || !cot) return [];
    if (v.cot && cot[v.cot]) return [{ hang, cot: cot[v.cot] }];
    return Object.values(cot).map((c) => ({ hang, cot: c }));
  }
  if (v.tag && !v.tag.startsWith("muc:")) {
    const o = vt.o[v.tag];
    return o ? [o] : [];
  }
  return [];
}

const argbNen = (c: ExcelJS.Cell): string => {
  const f = c.fill as ExcelJS.FillPattern | undefined;
  return f?.pattern === "solid" ? ((f.fgColor as { argb?: string } | undefined)?.argb?.toUpperCase() ?? "") : "";
};
const laNenMay = (c: ExcelJS.Cell) => {
  const argb = argbNen(c);
  return argb === MAU_LOI.chan.nen || argb === MAU_LOI.canh_bao.nen;
};

/**
 * Nền GỐC của ô bị máy tô lỗi (nền đỏ / xanh / trắng của mẫu — kieu-o.ts), ghi ở tờ ẩn _may hàng «nen_goc · địa chỉ · màu».
 * Gỡ dấu lỗi hay sửa vào ô thì trả lại đúng nền này, không làm mất màu quy ước của mẫu.
 */
export function docNenGoc(wb: ExcelJS.Workbook): Map<string, string> {
  const m = new Map<string, string>();
  wb.getWorksheet(TO_MAY)?.eachRow((r) => {
    if (String(r.getCell(1).value ?? "") === "nen_goc") m.set(String(r.getCell(2).value ?? ""), String(r.getCell(3).value ?? ""));
  });
  return m;
}
export function ghiNenGoc(wb: ExcelJS.Workbook, m: Map<string, string>): void {
  const ws = wb.getWorksheet(TO_MAY);
  if (!ws) return;
  for (let r = ws.rowCount; r >= 1; r--) if (String(ws.getRow(r).getCell(1).value ?? "") === "nen_goc") ws.spliceRows(r, 1);
  for (const [dc, argb] of m) ws.addRow(["nen_goc", dc, argb]);
}
/** Trả ô về nền gốc (không có trong sổ → `macDinh`, hoặc bỏ nền) */
export function traNenGoc(c: ExcelJS.Cell, goc: Map<string, string>, macDinh = ""): void {
  const argb = goc.get(c.address) ?? macDinh;
  datNen(c, argb ? { type: "pattern", pattern: "solid", fgColor: { argb } } : { type: "pattern", pattern: "none" });
}

/** Bỏ dấu vết đánh dấu lần trước: tờ «Lỗi cần sửa», ghi chú của máy, nền đỏ / vàng của máy. */
export function boDauCu(wb: ExcelJS.Workbook, ws: ExcelJS.Worksheet, oNhap: Set<string>): void {
  const cu = wb.getWorksheet(TO_LOI);
  if (cu) wb.removeWorksheet(cu.id);
  const goc = docNenGoc(wb);
  ws.eachRow((row) =>
    row.eachCell({ includeEmpty: true }, (c) => {
      const note = c.note;
      const chu = typeof note === "string" ? note : (note?.texts ?? []).map((t) => t.text).join("");
      if (chu && DAU_GHI_CHU.test(chu)) boGhiChu(c);
      if (laNenMay(c)) traNenGoc(c, goc, oNhap.has(c.address) && !goc.size ? NEN_DIEN : "");
    }),
  );
  ghiNenGoc(wb, new Map());
}

/** Bản Excel đánh dấu lỗi chặn gửi + cảnh báo. */
export async function danhDauLoiExcel(buf: Buffer, loi: LoiKiemTra[], mau?: MauWord | null): Promise<{ buf: Buffer; so_cho: number }> {
  const nd = await docExcel(buf);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  const ws = wb.getWorksheet(nd.vi_tri_excel?.to ?? "") ?? null;
  if (!ws) throw new Error("Không thấy tờ báo cáo trong tệp Excel");
  const oNhap = new Set(Object.values(nd.vi_tri_excel?.o ?? {}).map((o) => ws.getCell(o.hang, o.cot).address));
  boDauCu(wb, ws, oNhap);

  const canDanh = loi.filter((l): l is LoiKiemTra & { muc: "chan" | "canh_bao" } => l.muc === "chan" || l.muc === "canh_bao");
  const muc = new Map<string, "chan" | "canh_bao">();
  const ghi = new Map<string, string[]>();
  let soCho = 0;
  const goc = new Map<string, string>();
  // Tô: cảnh báo trước, chặn sau — ô vừa chặn vừa cảnh báo ra ĐỎ
  for (const l of [...canDanh.filter((x) => x.muc === "canh_bao"), ...canDanh.filter((x) => x.muc === "chan")]) {
    const ds = oCuaLoi(l, nd);
    if (ds.length) soCho++;
    ds.forEach((o, i) => {
      const c = ws.getCell(o.hang, o.cot);
      if (!goc.has(c.address)) goc.set(c.address, argbNen(c));
      datNen(c, { type: "pattern", pattern: "solid", fgColor: { argb: MAU_LOI[l.muc].nen } });
      muc.set(c.address, l.muc);
      // ghi chú chỉ neo ô đầu của lỗi (lỗi cả dòng: ô đầu dòng)
      if (i === 0) ghi.set(c.address, [...(ghi.get(c.address) ?? []), `[${MAU_LOI[l.muc].nhan}] ${l.thong_diep}`]);
    });
  }
  for (const [dc, ds] of ghi) ws.getCell(dc).note = ds.join("\n\n");
  ghiNenGoc(wb, goc);

  // Tờ «Lỗi cần sửa» — đủ mọi lỗi, kể cả lỗi không gắn được vào ô nào
  const t = wb.addWorksheet(TO_LOI);
  t.columns = [{ width: 12 }, { width: 44 }, { width: 12 }, { width: 90 }];
  t.addRow(["Mức", "Chỗ", "Ô Excel", "Cần sửa gì"]).font = { bold: true };
  for (const l of [...canDanh.filter((x) => x.muc === "chan"), ...canDanh.filter((x) => x.muc === "canh_bao")]) {
    const ds = oCuaLoi(l, nd);
    const dc = ds[0] ? ws.getCell(ds[0].hang, ds[0].cot).address : "";
    const r = t.addRow([MAU_LOI[l.muc].nhan, nhanViTri(l.vi_tri, mau) || "Chung cả báo cáo", dc ? `${dc} (tô ${MAU_LOI[muc.get(dc) ?? l.muc].chu})` : "—", l.thong_diep]);
    r.alignment = { wrapText: true, vertical: "top" };
    r.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: MAU_LOI[l.muc].nen } };
  }
  t.addRow([]);
  t.addRow(["", "Sửa ở tờ «" + ws.name + "» (ô tô màu, rê chuột xem ghi chú), lưu tệp rồi bấm «Tải lên bản đã sửa». Máy không đọc tờ này."]);
  return { buf: Buffer.from(await wb.xlsx.writeBuffer()), so_cho: soCho };
}
