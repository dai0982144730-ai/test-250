import { describe, expect, it } from "vitest";
import {
  TRAN_SO_TEP,
  doDuocDuoi,
  duoiCuaTen,
  khoiChuDinhKem,
  type TepDinhKem,
} from "@/lib/tro-ly/dinh-kem-chung";

function tep(ten: string, chu: string, biCat = false): TepDinhKem {
  return { ten, co: chu.length, chu, biCat };
}

describe("đính kèm file vào chat — phần thuần", () => {
  it("nhận đúng đuôi đọc được, chặn đuôi chưa hỗ trợ", () => {
    expect(duoiCuaTen("BC tuần W35.xlsx")).toBe(".xlsx");
    expect(doDuocDuoi("bao-cao.PDF")).toBe(true);
    expect(doDuocDuoi("anh-hien-truong.jpg")).toBe(false);
    expect(doDuocDuoi("khong-co-duoi")).toBe(false);
  });

  it("không có file thì không chèn khối nào vào prompt", () => {
    expect(khoiChuDinhKem([])).toBe("");
  });

  it("khối chữ nêu đủ tên file, câu cấm ước số, và dấu đã cắt", () => {
    const k = khoiChuDinhKem([tep("a.md", "nội dung A"), tep("b.txt", "nội dung B", true)]);
    expect(k).toContain("ĐÍNH KÈM 2 FILE");
    expect(k).toContain("FILE: a.md");
    expect(k).toContain("nội dung B");
    expect(k).toContain("ĐÃ CẮT BỚT");
    expect(k).toContain("TUYỆT ĐỐI không ước");
  });

  it("trần số file là 3 — đủ cho một lượt hỏi, không đốt ngữ cảnh", () => {
    expect(TRAN_SO_TEP).toBe(3);
  });
});
