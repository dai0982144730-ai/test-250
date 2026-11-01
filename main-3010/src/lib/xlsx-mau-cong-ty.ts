// ============================================================
// BỘ DỰNG FILE EXCEL THEO MẪU «Báo cáo hợp nhất trình TGĐ (Form 0) — mẫu báo cáo.xlsx» (Mr. Đại 28/10/2026)
//
// Chỉ lấy ĐỊNH DẠNG của mẫu (nội dung từng báo cáo giữ nguyên của báo cáo đó):
//   · Một sheet, lưới cột đều, gộp ô theo cột báo cáo; ẩn đường lưới; A4 dọc, vừa bề ngang, lề 0,4 / 0,5 inch
//   · Đầu trang: «CÔNG TY CỔ PHẦN SCI» (đậm 13, xanh đậm 1F3864) trái · tên báo cáo (đậm 15, đỏ C00000) phải · «Gửi: …» xám 9
//   · Hàng «Kỳ báo cáo» nhãn xanh 1F4E9A, ô giá trị nền D6E6FA chữ đậm 1F3864
//   · Tên mục: đậm 12, đỏ C00000 · ghi chú mục: xám 6B7280 cỡ 9
//   · Đầu bảng nền xanh đậm 1F3864 chữ trắng đậm căn giữa · thân bảng chữ 374151 cỡ 10 · hàng nhóm đậm 1F3864 · viền mảnh BFBFBF
//   · Số căn phải; hàng cao tự ước theo độ dài chữ (Excel không tự giãn ô gộp)
// Dưới cùng: «NGƯỜI LẬP» và «NGƯỜI KÝ» để trống chỗ ký — KHÔNG ghi tên, KHÔNG ghi chức danh (Mr. Đại).
//
// ⛔ Hai app (Main 3010 · Tiến độ 3003) dùng CHUNG nội dung tệp này — sửa một nơi phải sửa nơi kia (cùng tên tệp).
// ============================================================

import ExcelJS from "exceljs";

export const LUOI = 60;
const BE_RONG_CAN = 2.2;

const FONT = "Calibri";
const XANH_DAM = "FF1F3864";
const XANH_NHAN = "FF1F4E9A";
const XANH_NHAT = "FFD6E6FA";
const DO = "FFC00000";
const XAM = "FF6B7280";
const CHU_THAN = "FF374151";
const VIEN = "FFBFBFBF";

export type KieuCot = "stt" | "so" | "tien" | "phan_tram" | "ngay" | "chu";

export interface CotXlsx {
  ten: string;
  /** Trọng số bề rộng (cột lớn thì rộng hơn) */
  trongSo: number;
  kieu: KieuCot;
}

export interface HangXlsx {
  /** thuong = hàng dữ liệu · nhom = hàng tên dự án/nhóm (đậm xanh) · tong = hàng tổng · chu = một câu gộp cả hàng */
  kieu: "thuong" | "nhom" | "tong" | "chu";
  /** Chữ từng ô theo thứ tự cột. Hàng nhom/tong: o[0] là chữ gộp `soCotNhan` cột đầu, các ô sau là số cộng của nhóm */
  o: string[];
  soCotNhan?: number;
}

export interface BangXlsx {
  loai: "bang";
  tieuDe?: string;
  cot: CotXlsx[];
  hang: HangXlsx[];
  ghiChu?: string[];
}
export interface MucXlsx {
  loai: "muc";
  tieuDe: string;
  ghiChu?: string;
}
export interface ChuXlsx {
  loai: "chu";
  text: string;
  xam?: boolean;
}
/** Khối «cặp nhãn – giá trị» (chương I Form 7): mỗi hàng tối đa hai cặp; máy nhận ô theo CHỮ nhãn, giá trị ở ô ngay bên phải */
export interface CapXlsx {
  loai: "cap";
  /** Dải tên nền xanh đậm phía trên (vd «THÔNG TIN DỰ ÁN») */
  dai?: string;
  hang: { nhan: string; giaTri: string }[][];
}
export type KhoiXlsx = BangXlsx | MucXlsx | ChuXlsx | CapXlsx;

export interface TaiLieuXlsx {
  tenSheet: string;
  tenBaoCao: string;
  /** Dòng thứ hai bên phải (vd «TRÌNH TỔNG GIÁM ĐỐC») */
  tieuDePhu?: string;
  gui: string;
  /** «Tháng 09/2026 (01/09/2026 – 30/09/2026 · 30 ngày)» */
  ky: string;
  /** Nhãn ô kỳ — Form 7 là «Kỳ báo cáo *» (dấu * = bắt buộc), Form 0 là «Kỳ báo cáo» */
  kyNhan?: string;
  /** Form 7 (mẫu dùng chung nhiều đơn vị): tên đơn vị lập, ô «Đơn vị lập *» — ghi sai thì ghi đè báo cáo đơn vị khác */
  donViLap?: string;
  /** Dòng «Mã mẫu: form-N» — máy 3004 nhận mẫu bằng dòng này */
  maMau?: string;
  /** false = không vẽ khối Người lập · Người ký ở cuối (mặc định có) */
  chuKy?: boolean;
  khoi: KhoiXlsx[];
}

const vien = (): Partial<ExcelJS.Borders> => {
  const m = { style: "thin" as const, color: { argb: VIEN } };
  return { top: m, left: m, bottom: m, right: m };
};

/** Chia LUOI cột lưới cho các cột bảng: mỗi cột có mức tối thiểu theo kiểu, phần dư chia theo trọng số */
export function chiaCot(cot: CotXlsx[]): number[] {
  const toiThieu = cot.map((c) =>
    c.kieu === "stt" ? 3 : c.kieu === "tien" ? 7 : c.kieu === "ngay" ? 5 : c.kieu === "so" || c.kieu === "phan_tram" ? 4 : 5,
  );
  const tongMin = toiThieu.reduce((a, b) => a + b, 0);
  if (tongMin >= LUOI) return toiThieu.map((n) => Math.max(1, Math.floor((n * LUOI) / tongMin)));
  const du = LUOI - tongMin;
  const tongTs = cot.reduce((a, c) => a + Math.max(0.1, c.trongSo), 0);
  const phan = cot.map((c) => (Math.max(0.1, c.trongSo) / tongTs) * du);
  const nguyen = phan.map((x) => Math.floor(x));
  let thua = du - nguyen.reduce((a, b) => a + b, 0);
  const thuTu = phan.map((x, i) => ({ i, le: x - Math.floor(x) })).sort((a, b) => b.le - a.le);
  for (let k = 0; thua > 0; k = (k + 1) % thuTu.length, thua--) nguyen[thuTu[k]!.i]! += 1;
  return toiThieu.map((n, i) => n + nguyen[i]!);
}

/** Số dòng chữ ước tính của một đoạn trong ô rộng `soCot` cột lưới (Excel không tự giãn ô gộp) */
function soDong(chu: string, soCot: number, co = 10): number {
  const kyTuMoiDong = Math.max(3, Math.floor(soCot * BE_RONG_CAN * (10 / co) * 1.05));
  let n = 0;
  for (const doan of chu.split("\n")) n += Math.max(1, Math.ceil(doan.length / kyTuMoiDong));
  return n;
}
const cao = (dong: number, co = 10): number => Math.max(20, Math.round(dong * (co * 1.35) + 6));

export async function dungXlsx(td: TaiLieuXlsx): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "SCI — Main Agent";
  const ws = wb.addWorksheet(td.tenSheet.replace(/[*?:\\/\[\]]/g, "-").slice(0, 31), {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9,
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    },
  });
  ws.columns = Array.from({ length: LUOI }, () => ({ width: BE_RONG_CAN }));

  let r = 1;
  /** Ghi một ô gộp từ cột c0 tới c1 (1-based, gồm cả hai) */
  const o = (hang: number, c0: number, c1: number, chu: string, kieu: Partial<ExcelJS.Style> & { dinhDang?: string } = {}) => {
    if (c1 > c0) ws.mergeCells(hang, c0, hang, c1);
    const cell = ws.getCell(hang, c0);
    cell.value = chu;
    cell.font = { name: FONT, size: 10, color: { argb: CHU_THAN }, ...(kieu.font ?? {}) };
    cell.alignment = { vertical: "middle", wrapText: true, ...(kieu.alignment ?? {}) };
    if (kieu.fill) cell.fill = kieu.fill;
    if (kieu.border) {
      for (let c = c0; c <= c1; c++) ws.getCell(hang, c).border = kieu.border;
    }
    return cell;
  };

  // ===== Đầu trang =====
  const nua = 36;
  o(r, 1, nua, "CÔNG TY CỔ PHẦN SCI", { font: { name: FONT, size: 13, bold: true, color: { argb: XANH_DAM } } });
  o(r, nua + 1, LUOI, td.tenBaoCao, { font: { name: FONT, size: 15, bold: true, color: { argb: DO } }, alignment: { horizontal: "right", vertical: "middle", wrapText: true } });
  ws.getRow(r).height = cao(soDong(td.tenBaoCao, LUOI - nua, 15), 15);
  r++;
  o(r, 1, nua, `Gửi: ${td.gui}`, { font: { name: FONT, size: 9, color: { argb: XAM } } });
  if (td.tieuDePhu) o(r, nua + 1, LUOI, td.tieuDePhu, { font: { name: FONT, size: 10, bold: true, color: { argb: DO } }, alignment: { horizontal: "right", vertical: "middle", wrapText: true } });
  ws.getRow(r).height = 20;
  if (td.donViLap !== undefined) {
    o(r, nua + 1, nua + 8, "Đơn vị lập *", { font: { name: FONT, size: 9, color: { argb: XAM } }, alignment: { horizontal: "right", vertical: "middle", wrapText: true } });
    o(r, nua + 9, LUOI, td.donViLap, {
      font: { name: FONT, size: 10, bold: true, color: { argb: XANH_DAM } },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: XANH_NHAT } },
      border: vien(),
    });
    ws.getRow(r).height = 20;
  }
  r += 2;

  // ===== Kỳ báo cáo =====
  o(r, 1, 10, td.kyNhan ?? "Kỳ báo cáo", { font: { name: FONT, size: 10, bold: true, color: { argb: XANH_NHAN } }, border: vien() });
  o(r, 11, LUOI, td.ky, {
    font: { name: FONT, size: 10, bold: true, color: { argb: XANH_DAM } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: XANH_NHAT } },
    border: vien(),
  });
  ws.getRow(r).height = cao(soDong(td.ky, LUOI - 10));
  r++;
  if (td.maMau) {
    o(r, 1, 12, `Mã mẫu: ${td.maMau}`, { font: { name: FONT, size: 9, bold: true, color: { argb: DO } } });
    o(r, 13, LUOI, "Máy nhận mẫu bằng dòng này — không sửa, không xoá.", { font: { name: FONT, size: 9, color: { argb: XAM } } });
    ws.getRow(r).height = 16;
    r++;
  }
  r++;

  // ===== Thân =====
  for (const k of td.khoi) {
    if (k.loai === "muc") {
      o(r, 1, LUOI, k.tieuDe, { font: { name: FONT, size: 12, bold: true, color: { argb: DO } } });
      ws.getRow(r).height = cao(soDong(k.tieuDe, LUOI, 12), 12);
      r++;
      if (k.ghiChu) {
        o(r, 1, LUOI, k.ghiChu, { font: { name: FONT, size: 9, color: { argb: XAM } } });
        ws.getRow(r).height = cao(soDong(k.ghiChu, LUOI, 9), 9);
        r++;
      }
      continue;
    }
    if (k.loai === "cap") {
      if (k.dai) {
        o(r, 1, LUOI, k.dai, {
          font: { name: FONT, size: 10, bold: true, color: { argb: "FFFFFFFF" } },
          fill: { type: "pattern", pattern: "solid", fgColor: { argb: XANH_DAM } },
          border: vien(),
        });
        ws.getRow(r).height = 20;
        r++;
      }
      for (const h of k.hang) {
        let can = 1;
        h.forEach((p, i) => {
          const c0 = 1 + i * 30;
          o(r, c0, c0 + 9, p.nhan, { font: { name: FONT, size: 10, bold: true, color: { argb: XANH_DAM } }, border: vien() });
          o(r, c0 + 10, c0 + 29, p.giaTri, { font: { name: FONT, size: 10, color: { argb: CHU_THAN } }, border: vien() });
          can = Math.max(can, soDong(p.giaTri, 20));
        });
        ws.getRow(r).height = cao(can);
        r++;
      }
      r++;
      continue;
    }
    if (k.loai === "chu") {
      o(r, 1, LUOI, k.text, { font: { name: FONT, size: k.xam ? 9 : 10, color: { argb: k.xam ? XAM : CHU_THAN } } });
      ws.getRow(r).height = cao(soDong(k.text, LUOI, k.xam ? 9 : 10), k.xam ? 9 : 10);
      r += 2 - (k.xam ? 1 : 0);
      continue;
    }
    // ----- bảng -----
    if (k.tieuDe) {
      o(r, 1, LUOI, k.tieuDe, { font: { name: FONT, size: 10, bold: true, color: { argb: XANH_DAM } } });
      ws.getRow(r).height = 20;
      r++;
    }
    const rong = chiaCot(k.cot);
    // Cột lưới bắt đầu của từng cột bảng (1-based)
    const bat: number[] = rong.map((_, i) => 1 + rong.slice(0, i).reduce((a, n) => a + n, 0));
    const veHang = (hang: HangXlsx) => {
      if (hang.kieu === "chu") {
        const t = hang.o[0] ?? "";
        o(r, 1, LUOI, t, { font: { name: FONT, size: 10, color: { argb: XAM } }, border: vien() });
        ws.getRow(r).height = cao(soDong(t, LUOI));
        r++;
        return;
      }
      const lamNhom = hang.kieu === "nhom" || hang.kieu === "tong";
      const n = lamNhom ? Math.max(1, hang.soCotNhan ?? 1) : 0;
      let can = 1;
      if (lamNhom) {
        const c1 = bat[n - 1]! + rong[n - 1]! - 1;
        o(r, 1, c1, hang.o[0] ?? "", {
          font: { name: FONT, size: 10, bold: true, color: { argb: XANH_DAM } },
          fill: hang.kieu === "tong" ? { type: "pattern", pattern: "solid", fgColor: { argb: XANH_NHAT } } : undefined,
          border: vien(),
        });
        can = Math.max(can, soDong(hang.o[0] ?? "", c1));
      }
      for (let i = n; i < k.cot.length; i++) {
        const c0 = bat[i]!;
        const c1 = c0 + rong[i]! - 1;
        const t = hang.o[i] ?? "";
        const kieu = k.cot[i]!.kieu;
        o(r, c0, c1, t, {
          font: { name: FONT, size: 10, bold: lamNhom, color: { argb: lamNhom ? XANH_DAM : CHU_THAN } },
          alignment: {
            vertical: "middle",
            wrapText: true,
            horizontal: kieu === "so" || kieu === "tien" || kieu === "phan_tram" ? "right" : kieu === "stt" || kieu === "ngay" ? "center" : "left",
          },
          fill: hang.kieu === "tong" ? { type: "pattern", pattern: "solid", fgColor: { argb: XANH_NHAT } } : undefined,
          border: vien(),
        });
        can = Math.max(can, soDong(t, rong[i]!));
      }
      ws.getRow(r).height = cao(can);
      r++;
    };

    // Đầu bảng
    let caoDau = 1;
    k.cot.forEach((c, i) => {
      o(r, bat[i]!, bat[i]! + rong[i]! - 1, c.ten, {
        font: { name: FONT, size: 10, bold: true, color: { argb: "FFFFFFFF" } },
        alignment: { horizontal: "center", vertical: "middle", wrapText: true },
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: XANH_DAM } },
        border: vien(),
      });
      caoDau = Math.max(caoDau, soDong(c.ten, rong[i]!));
    });
    ws.getRow(r).height = cao(caoDau);
    r++;
    for (const h of k.hang) veHang(h);
    for (const g of k.ghiChu ?? []) {
      o(r, 1, LUOI, g, { font: { name: FONT, size: 9, color: { argb: XAM } } });
      ws.getRow(r).height = cao(soDong(g, LUOI, 9), 9);
      r++;
    }
    r++;
  }

  // ===== Người lập · Người ký — để trống chỗ ký, không ghi tên, không ghi chức danh =====
  if (td.chuKy === false) {
    ws.pageSetup.printArea = `A1:${ws.getColumn(LUOI).letter}${r}`;
    return Buffer.from((await wb.xlsx.writeBuffer()) as ArrayBuffer);
  }
  r++;
  const giua = { horizontal: "center" as const, vertical: "middle" as const };
  o(r, 3, 24, "NGƯỜI LẬP", { font: { name: FONT, size: 10, bold: true, color: { argb: XANH_DAM } }, alignment: giua });
  o(r, 37, 58, "NGƯỜI KÝ", { font: { name: FONT, size: 10, bold: true, color: { argb: XANH_DAM } }, alignment: giua });
  ws.getRow(r).height = 22;
  for (let i = 1; i <= 4; i++) ws.getRow(r + i).height = 22;

  ws.pageSetup.printArea = `A1:${ws.getColumn(LUOI).letter}${r + 4}`;
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf as ArrayBuffer);
}
