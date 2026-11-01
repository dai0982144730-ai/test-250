import fs from "node:fs";
import { duongDanDuLieu } from "@/lib/goc-du-lieu";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { xuatXlsx } from "@/lib/bao-cao-thang/xuat";
import { moiBang, type BaoCaoThang } from "@/lib/bao-cao-thang/model";
import { apDungSuaTay, khoaNhanXet, khoaO, kiemKhoaSua } from "@/lib/bao-cao-thang/sua-tay";

function docBan(): BaoCaoThang | null {
  const duong = duongDanDuLieu("bao-cao-thang", "2026-09.json");
  return fs.existsSync(duong) ? (JSON.parse(fs.readFileSync(duong, "utf8")) as BaoCaoThang) : null;
}

describe("chữ người sửa tay — báo cáo tháng", () => {
  it("chỉ nhận khoá lời văn 🤖; chặn ô số và khoá bịa", () => {
    const bc = docBan();
    if (!bc) return;
    expect(kiemKhoaSua(bc, "nx:II")).toBeNull();
    expect(kiemKhoaSua(bc, "nx:IX")).not.toBeNull();
    expect(kiemKhoaSua(bc, "bậy bạ")).not.toBeNull();
    const b = moiBang(bc).find((x) => x.cot.some((c) => !c.laLlm && c.kieu === "so") && x.dong.length > 0)!;
    const cotSo = b.cot.find((c) => !c.laLlm && c.kieu === "so")!;
    expect(kiemKhoaSua(bc, khoaO(b.ma, b.dong[0]!.khoa, cotSo.khoa))).toMatch(/không sửa tay/);
  });

  it("nhận xét đầu mục đã sửa nằm trong file Excel; bản gốc không bị đổi", async () => {
    const bc = docBan();
    if (!bc) return;
    const goc = JSON.stringify(bc);
    bc.suaTay = { [khoaNhanXet("II")]: "Chữ thử do người viết lại ZZTEST" };
    const ap = apDungSuaTay(bc);
    expect(ap.muc.find((m) => m.ma === "II")!.nhanXet).toBe("Chữ thử do người viết lại ZZTEST");
    expect(JSON.stringify({ ...bc, suaTay: undefined })).toBe(JSON.stringify({ ...JSON.parse(goc), suaTay: undefined }));
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await xuatXlsx(ap)) as unknown as ArrayBuffer);
    const chu = wb.worksheets[0]!.getSheetValues().flat().map((v) => String(v ?? ""));
    expect(chu.some((c) => c.includes("ZZTEST"))).toBe(true);
  });
});
