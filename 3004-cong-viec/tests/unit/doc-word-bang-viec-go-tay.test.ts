// Bảng việc người lập GÕ TAY / CHÉP–DÁN (đo 10/10/2026 trên Báo cáo tuần 41 Phòng Đầu tư và Pháp chế — 28 lỗi chặn oan, 11 việc rơi):
//   · một ô cột Kết thúc mang nhãn "bat_dau" (chép ô Bắt đầu dán sang) KHÔNG được kéo cả cột Kết thúc thành Bắt đầu;
//   · dòng việc gõ tay đứng TRƯỚC dòng gắn mã đầu tiên vẫn là việc (chỉ dòng tiêu đề cùng nền mới bị bỏ);
//   · cột không còn ô gắn mã nào (Tình trạng, hoặc cả bảng gõ tay) đọc theo chữ tiêu đề cột;
//   · dòng tên nhóm ("SCI QUẢNG TRỊ", "KHÁC" — chỉ ô đầu có chữ) không phải việc (Mr. Đại chốt 10/10/2026).
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { docWord } from "@/lib/kiem-tra/doc-word";

const TRANG = path.join(process.cwd(), "mau-word", "trang", "form-1.docx");

const o = (chu: string, tag?: string) => {
  const p = `<w:p><w:r><w:t>${chu}</w:t></w:r></w:p>`;
  return `<w:tc><w:tcPr><w:tcW w:w="1000" w:type="dxa"/></w:tcPr>${tag ? `<w:sdt><w:sdtPr><w:tag w:val="${tag}"/></w:sdtPr><w:sdtContent>${p}</w:sdtContent></w:sdt>` : p}</w:tc>`;
};
/** Một dòng 6 ô theo thứ tự cột của Form 1: Công việc · Dự án · Bắt đầu · Kết thúc · Kết quả cần có · Tình trạng */
const dong = (...cac: (string | [string, string])[]) => `<w:tr>${cac.map((c) => (typeof c === "string" ? o(c) : o(c[0], c[1]))).join("")}</w:tr>`;

/** Thay các dòng dữ liệu của bảng việc trong mẫu trắng Form 1 (giữ dòng tiêu đề thật của mẫu). */
async function bangViec(cacDong: string[]): Promise<Buffer> {
  const zip = await JSZip.loadAsync(fs.readFileSync(TRANG));
  const x = await zip.file("word/document.xml")!.async("string");
  const a = x.lastIndexOf("<w:tbl>", x.indexOf('<w:tblCaption w:val="bang_cong_viec"'));
  const b = x.indexOf("</w:tbl>", a);
  const tbl = x.slice(a, b);
  const tieuDe = /<w:tr[ >][\s\S]*?<\/w:tr>/.exec(tbl)!;
  const moi = tbl.slice(0, tieuDe.index + tieuDe[0].length) + cacDong.join("");
  zip.file("word/document.xml", x.slice(0, a) + moi + x.slice(b));
  return zip.generateAsync({ type: "nodebuffer" });
}

describe("bảng việc gõ tay / chép–dán", () => {
  it("ô Kết thúc mang nhãn bat_dau không làm hỏng cả cột; dòng gõ tay trên cùng vẫn là việc; dòng tên nhóm không phải việc", async () => {
    const buf = await bangViec([
      dong("ỨNG DỤNG CÔNG NGHỆ", "", "", "", "", ""),
      dong("Việc gõ tay trên cùng", "AI Agents", "", "05/10/2026", "Bộ code", "Đã xong"),
      dong("SCI QUẢNG TRỊ", "", "", "", "", ""),
      dong(["Việc đủ nhãn", "ten"], ["Hướng Việt", "du_an"], ["07/09/2026", "bat_dau"], ["25/10/2026", "ket_thuc"], ["Thỏa thuận", "ket_qua_can_co"], "Đang làm"),
      dong("Việc có ô dán nhầm", "Hướng Việt", "05/10/2026", ["12/10/2026", "bat_dau"], "Quyết định", "Đang làm"),
      dong("Việc gõ tay ở giữa", "", "12/10/2026", "24/10/2026", "Phương án", "Chưa làm"),
      dong("KHÁC", "", "", "", "", ""),
      dong("Việc chỉ có hạn", "", "", "16/10/2026", "Trình duyệt", "Đang làm"),
      dong("", "", "", "", "", ""),
    ]);
    const nd = await docWord(buf);
    const viec = nd.bang.bang_cong_viec.filter((r) => r.ten);
    expect(viec.map((r) => [r.ten, r.bat_dau, r.ket_thuc, r.tinh_trang])).toEqual([
      ["Việc gõ tay trên cùng", "", "05/10/2026", "Đã xong"],
      ["Việc đủ nhãn", "07/09/2026", "25/10/2026", "Đang làm"],
      ["Việc có ô dán nhầm", "05/10/2026", "12/10/2026", "Đang làm"],
      ["Việc gõ tay ở giữa", "12/10/2026", "24/10/2026", "Chưa làm"],
      ["Việc chỉ có hạn", "", "16/10/2026", "Đang làm"],
    ]);
    expect(nd.dong_nhom?.bang_cong_viec).toEqual(["ỨNG DỤNG CÔNG NGHỆ", "SCI QUẢNG TRỊ", "KHÁC"]);
  });

  it("cả bảng gõ tay (không còn ô gắn mã nào): đọc theo chữ tiêu đề cột", async () => {
    const nd = await docWord(await bangViec([dong("Việc A", "Hướng Việt", "05/10/2026", "12/10/2026", "Kết quả A", "Đang làm"), dong("Việc B", "", "", "14/10/2026", "", "Chưa làm")]));
    expect(nd.bang.bang_cong_viec).toEqual([
      { ten: "Việc A", du_an: "Hướng Việt", bat_dau: "05/10/2026", ket_thuc: "12/10/2026", ket_qua_can_co: "Kết quả A", tinh_trang: "Đang làm" },
      { ten: "Việc B", du_an: "", bat_dau: "", ket_thuc: "14/10/2026", ket_qua_can_co: "", tinh_trang: "Chưa làm" },
    ]);
  });

  it("mẫu trắng không đổi: các dòng trống của mẫu vẫn là dòng trống, không có dòng nhóm", async () => {
    const nd = await docWord(fs.readFileSync(TRANG));
    expect(nd.bang.bang_cong_viec.every((r) => !r.ten)).toBe(true);
    expect(nd.dong_nhom?.bang_cong_viec).toBeUndefined();
  });
});
