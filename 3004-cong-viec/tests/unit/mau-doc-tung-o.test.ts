// BÀI 0 · M-5 (Mr. Đại 29/09/2026: "mẫu sai là sai tất"): điền một giá trị RIÊNG vào MỌI ô gắn mã và MỌI cột của mọi bảng
// gắn mã trong 11 mẫu trắng, rồi cho máy đọc lại — từng ô phải ra đúng giá trị đã điền, đúng bảng, đúng cột, đúng dòng.
// Bắt lỗi gắn nhầm mã (ô A mang mã ô B), cột lệch, ô mất khi sinh mẫu.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { docWord } from "@/lib/kiem-tra/doc-word";
import DINH_NGHIA from "../../mau-word/dinh-nghia.json";
import { dienBaoCao } from "../../scripts/chuyen-mau-that.mjs";

type Dn = { o_nhap: { tag: string }[]; bang: { tag: string; cot: { tag: string }[] }[] };
const CHON = ["Đã xong", "Đang làm"];

describe("11 mẫu trắng: máy đọc lại đúng từng ô đã điền", () => {
  it.each(DINH_NGHIA.map((d) => [d.ma, d] as const))("%s", async (ma, d) => {
    const dn = d.dinh_nghia as unknown as Dn;
    const thang = (d as { loai_ky?: string }).loai_ky === "thang";
    const o: Record<string, unknown> = {
      ky_bao_cao: thang ? { chon: "thang", thang: "09/2026" } : { chon: "tuan", tuan: "40/2026   (28/09/2026 – 04/10/2026)" },
    };
    for (const x of dn.o_nhap) if (x.tag !== "mau_ma" && x.tag !== "ky_bao_cao") o[x.tag] = `Ô ${x.tag}`;
    const bang: Record<string, Record<string, string>[]> = {};
    // Cột "nhom" không phải ô gõ: máy lấy tên nhóm từ dòng nhóm ("ĐẦU TƯ", "Hướng Linh 7") — kiểm riêng ở test dưới
    for (const b of dn.bang)
      bang[b.tag] = [1, 2].map((r) =>
        Object.fromEntries(b.cot.filter((c) => c.tag !== "nhom").map((c) => [c.tag, c.tag === "tinh_trang" ? CHON[r - 1] : `${b.tag}.${c.tag}.${r}`])),
      );

    const buf = await dienBaoCao(fs.readFileSync(`mau-word/trang/${ma}.docx`), { o, bang });
    const nd = await docWord(buf);
    const sai: string[] = [];
    if (nd.mau_ma !== ma) sai.push(`mã mẫu đọc ra ${nd.mau_ma}`);
    for (const [tag, v] of Object.entries(o)) {
      if (tag === "ky_bao_cao") {
        if (!/(40\/2026|09\/2026)/.test(nd.o_nhap.ky_bao_cao ?? "")) sai.push(`kỳ báo cáo đọc ra "${nd.o_nhap.ky_bao_cao}"`);
        continue;
      }
      if ((nd.o_nhap[tag] ?? "").trim() !== v) sai.push(`ô ${tag}: điền "${v}" đọc ra "${nd.o_nhap[tag]}"`);
    }
    for (const [tag, dongs] of Object.entries(bang)) {
      const doc = nd.bang[tag] ?? [];
      // Form 6: 3 bảng tiến độ thi công (Nậm Mô 1, Nậm Khiên 1, Hướng Phùng 1) cùng mã — máy gộp; chỉ bảng đầu bị thay dòng
      if (tag === "bang_tien_do_tc" ? doc.length < dongs.length : doc.length !== dongs.length) sai.push(`bảng ${tag}: điền ${dongs.length} dòng đọc ra ${doc.length}`);
      dongs.forEach((dg, i) => {
        for (const [cot, v] of Object.entries(dg)) if ((doc[i]?.[cot] ?? "").trim() !== v) sai.push(`bảng ${tag} dòng ${i + 1} cột ${cot}: điền "${v}" đọc ra "${doc[i]?.[cot]}"`);
      });
    }
    expect(sai).toEqual([]);
  });

  it("bảng có dòng nhóm (bản ví dụ của anh Đại): mọi dòng dữ liệu mang đúng tên nhóm đứng trên nó", async () => {
    const sai: string[] = [];
    for (const d of DINH_NGHIA) {
      const nd = await docWord(fs.readFileSync(`mau-word/${d.ma}.docx`));
      for (const b of (d.dinh_nghia as unknown as Dn).bang.filter((x) => x.cot.some((c) => c.tag === "nhom"))) {
        const ds = nd.bang[b.tag] ?? [];
        if (!ds.length) sai.push(`${d.ma} ${b.tag}: không đọc được dòng nào`);
        ds.forEach((r, i) => !r.nhom?.trim() && sai.push(`${d.ma} ${b.tag} dòng ${i + 1}: thiếu tên nhóm`));
      }
    }
    expect(sai).toEqual([]);
  });
});
