// Bản Word đánh dấu lỗi (kiem-tra/danh-dau-loi.ts): tô đúng ô sai + ghi chú Word, file vẫn đọc lại được.
import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { csdlMoi, nguoi } from "../helpers/csdl";
import type { Q } from "@/lib/db";
import { kiemTraDayDu } from "@/lib/kiem-tra/kiem-tra";
import { docWord } from "@/lib/kiem-tra/doc-word";
import { thuNhanMauGoc } from "@/lib/kiem-tra/nhan-mau-goc";
import { danhDauLoi } from "@/lib/kiem-tra/danh-dau-loi";

const mau = (...p: string[]) => fs.readFileSync(path.join(process.cwd(), "mau-word", ...p));

async function ghiChu(buf: Buffer): Promise<string[]> {
  const zip = await JSZip.loadAsync(buf);
  const x = (await zip.file("word/comments.xml")?.async("string")) ?? "";
  return Array.from(x.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)).map((m) => m[1]);
}

describe("bản Word đánh dấu lỗi", () => {
  let q: Q;
  beforeAll(async () => {
    q = await csdlMoi();
  });

  it("file gốc Form 5 chưa tích kỳ báo cáo: tô đỏ ô Kỳ báo cáo, ghi chú nói cần tích", async () => {
    const nd = await nguoi("gd.pmc@scigroup.vn");
    const tep = "OK_Form5_SCI_PMC_Sua lan 2.docx";
    // mẫu bản 6 bỏ ô Người lập: dùng ô bắt buộc còn lại — Kỳ báo cáo bỏ tích, chưa ghi số tuần
    const zGoc = await JSZip.loadAsync(mau("goc", tep));
    const xGoc = await zGoc.file("word/document.xml")!.async("string");
    const xSua = xGoc.replace("<w:t>☒ Tuần 29/2026</w:t>", "<w:t>☐ Tuần ......./2026</w:t>");
    expect(xSua).not.toBe(xGoc);
    zGoc.file("word/document.xml", xSua);
    const buf = await zGoc.generateAsync({ type: "nodebuffer" });
    const kq = await kiemTraDayDu(q, nd, buf, tep, { bo_qua_so_cai: true });
    const goc = await thuNhanMauGoc(buf, tep, await docWord(buf));
    const ra = await danhDauLoi(goc!.buf, kq.loi);
    expect(ra.so_cho).toBeGreaterThanOrEqual(1);
    const gc = await ghiChu(ra.buf);
    expect(gc.some((t) => t.startsWith("[CHẶN GỬI]") && t.includes("ky_bao_cao") && /Chưa (tích|ghi số tuần)/.test(t))).toBe(true);
    const zip = await JSZip.loadAsync(ra.buf);
    const xml = await zip.file("word/document.xml")!.async("string");
    expect(xml).toContain('w:highlight w:val="red"');
    expect(xml).toMatch(/commentRangeStart w:id="\d+"/);
    expect(await zip.file("[Content_Types].xml")!.async("string")).toContain("/word/comments.xml");
    expect(await zip.file("word/_rels/document.xml.rels")!.async("string")).toContain("comments.xml");
    // Vẫn là file Word đọc lại được, nội dung giữ nguyên
    const doc = await docWord(ra.buf);
    expect(doc.mau_ma).toBe("form-5");
  });

  it("báo cáo có lỗi trong bảng: đánh dấu đúng ô của dòng", async () => {
    const nd = await nguoi("nv.bqlda@scigroup.vn");
    const buf = mau("vi-du", "BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx");
    const kq = await kiemTraDayDu(q, nd, buf, "ban2.docx", { bo_qua_so_cai: true });
    const loiBang = kq.loi.filter((l) => l.vi_tri?.bang && l.vi_tri.dong && (l.muc === "chan" || l.muc === "canh_bao"));
    expect(loiBang.length).toBeGreaterThan(0);
    const ra = await danhDauLoi(buf, loiBang);
    expect(ra.so_cho).toBe(loiBang.length);
    const gc = await ghiChu(ra.buf);
    expect(gc).toHaveLength(loiBang.length);
    expect(gc.some((t) => t.includes("TREO"))).toBe(true);
    const zip = await JSZip.loadAsync(ra.buf);
    expect(await zip.file("word/document.xml")!.async("string")).toContain('w:fill="FFF2A8"'); // ô cảnh báo tô vàng
  });

  it("Mr. Đại 28/09: chặn + cảnh báo cùng dòng ra ĐỎ; ghi chú neo trong dòng lỗi; đánh dấu lại bản đã đánh dấu không nhân đôi ghi chú", async () => {
    const buf = mau("vi-du", "BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx");
    const nd = await nguoi("nv.bqlda@scigroup.vn");
    const kq = await kiemTraDayDu(q, nd, buf, "ban2.docx", { bo_qua_so_cai: true });
    const l0 = kq.loi.find((l) => l.vi_tri?.bang && l.vi_tri.dong)!;
    const vt = { bang: l0.vi_tri!.bang, dong: l0.vi_tri!.dong };
    // cột không có trong bảng → cả dòng; cảnh báo đứng SAU chặn trong danh sách vẫn không đè màu đỏ
    const loi = [
      // mẫu phiên bản 4: bảng việc Form 7 không có cột phụ trách → lỗi cột đó tô cả dòng
      { muc: "chan", ma: "thu", thong_diep: "chưa có hạn", vi_tri: { ...vt, cot: "phu_trach" } },
      { muc: "canh_bao", ma: "thu", thong_diep: "có vẻ trùng", vi_tri: vt },
    ] as never[];
    const lan1 = await danhDauLoi(buf, loi);
    const xml = await (await JSZip.loadAsync(lan1.buf)).file("word/document.xml")!.async("string");
    expect(xml).toContain('w:highlight w:val="red"');
    expect(xml).toContain('w:fill="FF8A80"');
    expect(xml).not.toContain('w:highlight w:val="yellow"');
    // ghi chú nằm TRONG bảng (giữa <w:tbl> … </w:tbl>), không dồn lên đoạn trước bảng
    const ids = Array.from(xml.matchAll(/commentRangeStart w:id="(\d+)"/g)).map((m) => m[1]);
    expect(ids).toHaveLength(2);
    for (const id of ids) {
      const i = xml.indexOf(`commentRangeStart w:id="${id}"`);
      expect(xml.lastIndexOf("<w:tbl>", i) > xml.lastIndexOf("</w:tbl>", i)).toBe(true);
    }
    expect(await ghiChu(lan1.buf)).toContain("[CHẶN GỬI] Bảng “" + (await ghiChu(lan1.buf))[0].split("“")[1].split("”")[0] + "”, dòng " + vt.dong + ", cột “người phụ trách” (ô tô đỏ): chưa có hạn");
    const lan2 = await danhDauLoi(lan1.buf, loi);
    expect(await ghiChu(lan2.buf)).toHaveLength(2);
    // lần kiểm sau hết lỗi (đã sửa) → màu cũ máy tô cũng hết, không sót đỏ/vàng
    const lan3 = await danhDauLoi(lan1.buf, []);
    const xml3 = await (await JSZip.loadAsync(lan3.buf)).file("word/document.xml")!.async("string");
    expect(xml3).not.toContain('w:fill="FF8A80"');
    expect(xml3).not.toContain('w:highlight w:val="red"');
  });
});
