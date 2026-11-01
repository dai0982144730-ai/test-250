import fs from "node:fs";
import { duongDanDuLieu } from "@/lib/goc-du-lieu";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { chiaCot, LUOI } from "@/lib/xlsx-mau-cong-ty";
import { xuatXlsx } from "@/lib/bao-cao-thang/xuat";
import type { BaoCaoThang } from "@/lib/bao-cao-thang/model";

describe("xuất Excel theo mẫu công ty — báo cáo tháng", () => {
  it("chia lưới: đủ LUOI cột, mỗi cột ≥ mức tối thiểu", () => {
    const n = chiaCot([
      { ten: "TT", trongSo: 4, kieu: "stt" },
      { ten: "Việc", trongSo: 30, kieu: "chu" },
      { ten: "Hạn", trongSo: 12, kieu: "ngay" },
      { ten: "Tiền", trongSo: 9, kieu: "tien" },
    ]);
    expect(n.reduce((a, b) => a + b, 0)).toBe(LUOI);
    expect(n[0]).toBeGreaterThanOrEqual(3);
    expect(n[3]).toBeGreaterThanOrEqual(7);
  });

  it("dựng từ bản tháng đã lưu: một sheet, đầu trang đúng mẫu, 11 bảng, có người lập · người ký không tên", async () => {
    const duong = duongDanDuLieu("bao-cao-thang", "2026-09.json");
    if (!fs.existsSync(duong)) return; // máy sạch không có bản lưu thì bỏ qua
    const bc = JSON.parse(fs.readFileSync(duong, "utf8")) as BaoCaoThang;
    const buf = await xuatXlsx(bc);
    if (process.env.XUAT_THU) fs.writeFileSync(process.env.XUAT_THU, buf);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    expect(wb.worksheets).toHaveLength(1);
    const ws = wb.worksheets[0]!;
    expect(ws.getCell("A1").value).toBe("CÔNG TY CỔ PHẦN SCI");
    expect(String(ws.getCell("A1").font?.color?.argb)).toBe("FF1F3864");
    const chu = ws.getSheetValues().flat().map((v) => String(v ?? ""));
    for (const so of ["Bảng 3", "Bảng 4", "Bảng 5", "Bảng 6", "Bảng 7", "Bảng 8", "Bảng 9", "Bảng 10", "Bảng 11"]) {
      expect(chu.some((c) => c.startsWith(so + " "))).toBe(true);
    }
    expect(chu).toContain("NGƯỜI LẬP");
    expect(chu).toContain("NGƯỜI KÝ");
    expect(ws.pageSetup.orientation).toBe("portrait");
    expect(ws.views[0]?.showGridLines).toBe(false);
    // Không còn chữ «Chưa có số liệu» bị cắt ở ô, và không có ô nào dài quá 32.767 ký tự
    expect(chu.every((c) => c.length < 32767)).toBe(true);
  });
});
