// CHUẨN SỐ VIỆT NAM — Mr. Đại chốt 12/10/2026 (KE-HOACH/10 chốt 130): thập phân dấu phẩy, nhóm ba chữ số dấu chấm.
// BẢNG VÍ DỤ CHUNG: gõ gì → máy lấy số nào → có phải báo cho người không. Agent nào chép bộ đọc này cũng chạy đúng bảng này.
// (Trước đó, kiểm tra độc lập lần 3 — 11/10/2026 — đo trên mẫu thật: ô chữ «0,5» bị lưu thành 5, «1.234,5» thành 1,2345.)
import { describe, expect, it } from "vitest";
import { cauLechChuan, docSoChu, docSoMay, docSoNguoiGo, soLechChuan, vietSoVN } from "@/lib/chung/doc-so";

/** [chữ người gõ, số máy lấy, phải báo gì, cách hiểu kia] */
const BANG: Array<[string, number, "dung" | "de-nham" | "sai-chuan", number?]> = [
  // ── đúng chuẩn Việt Nam ──
  ["0", 0, "dung"],
  ["1200", 1200, "dung"],
  ["-5", -5, "dung"],
  ["0,5", 0.5, "dung"],
  ["1,5", 1.5, "dung"],
  ["12,75", 12.75, "dung"],
  ["41,5", 41.5, "dung"],
  ["0,500", 0.5, "dung"], // bắt đầu bằng 0 → không thể là nhóm nghìn
  ["1234,567", 1234.567, "dung"], // bốn chữ số trước dấu phẩy → không thể là nhóm nghìn kiểu Anh
  ["1,2345", 1.2345, "dung"],
  ["1.234,5", 1234.5, "dung"],
  ["-1.200,5", -1200.5, "dung"],
  ["1.200.000", 1200000, "dung"],
  ["166.000.000.000", 166000000000, "dung"],
  ["1.234.567,89", 1234567.89, "dung"],
  [" 1 200 ", 1200, "dung"], // khoảng trắng ngăn nhóm: vô hại
  ["1 200,5", 1200.5, "dung"],
  // ── dễ nhầm: một dấu ngăn kèm đúng ba chữ số — máy đọc THEO CHUẨN, báo để người biết ──
  ["1,200", 1.2, "de-nham", 1200],
  ["12,345", 12.345, "de-nham", 12345],
  ["1.200", 1200, "de-nham", 1.2],
  ["69.812", 69812, "de-nham", 69.812],
  ["-1,200", -1.2, "de-nham", -1200],
  // ── sai chuẩn (gõ kiểu Anh), chỉ một cách hiểu ──
  ["1.5", 1.5, "sai-chuan"],
  ["1234.5", 1234.5, "sai-chuan"],
  ["1.25", 1.25, "sai-chuan"],
  ["0.500", 0.5, "sai-chuan"],
  ["1.2345", 1.2345, "sai-chuan"],
  ["1,033.25", 1033.25, "sai-chuan"],
  ["1,234.5", 1234.5, "sai-chuan"],
  ["1,200,000", 1200000, "sai-chuan"],
];

describe("chuẩn số Việt Nam — bảng ví dụ chung", () => {
  it.each(BANG)("«%s» → %s (%s)", (chu, so, kieu, cachKia) => {
    expect(docSoNguoiGo(chu)).toBe(so);
    const d = docSoChu(chu)!;
    expect(d.lech ?? "dung").toBe(kieu);
    expect(d.cachKia).toBe(cachKia);
    const l = soLechChuan(chu);
    if (kieu === "dung") expect(l).toBeNull();
    else expect(l).toEqual({ kieu, chu: chu.trim(), mayDoc: so, cachKia: cachKia ?? null });
  });

  it("ô số của Excel giữ nguyên, không bao giờ bị báo", () => {
    expect(docSoNguoiGo(1200)).toBe(1200);
    expect(docSoNguoiGo(0.5)).toBe(0.5);
    expect(docSoNguoiGo(0)).toBe(0);
    expect(docSoNguoiGo(Number.NaN)).toBeNull();
    for (const v of [1200, 1.2, 0]) expect(soLechChuan(v)).toBeNull();
  });

  it("không phải số → null, không đoán", () => {
    for (const v of ["", "  ", "abc", "12 m3", "1,2,3", "1.2.3", "1.234.5", "-", ".", ",", "5.", ".5", "1e3", null, undefined, true, new Date(0)]) {
      expect(docSoNguoiGo(v)).toBeNull();
      expect(soLechChuan(v)).toBeNull();
    }
  });
});

describe("docSoMay — chữ do MÁY / AI viết trong JSON", () => {
  it("đúng cú pháp số của máy thì lấy theo máy; còn lại theo chuẩn Việt Nam", () => {
    expect(docSoMay(1234.5)).toBe(1234.5);
    expect(docSoMay("1234.5")).toBe(1234.5);
    expect(docSoMay("106.587")).toBe(106.587); // toạ độ AI ghi dạng chữ — KHÁC tệp người gõ (106587)
    expect(docSoMay("1.200")).toBe(1.2);
    expect(docSoMay("1,5")).toBe(1.5); // bản cũ của bộ xuất báo cáo: 15
    expect(docSoMay("1.234,5")).toBe(1234.5); // bản cũ: 12345
    expect(docSoMay("1,234.5")).toBe(1234.5);
    expect(docSoMay("1,200,000")).toBe(1200000);
    expect(docSoMay("-12")).toBe(-12);
    for (const v of ["", "abc", "1.2.3", null, undefined, Number.NaN]) expect(docSoMay(v)).toBeNull();
  });
});

describe("câu báo ô số lệch chuẩn", () => {
  it("viết số theo chuẩn Việt Nam", () => {
    expect(vietSoVN(1200)).toBe("1.200");
    expect(vietSoVN(1.2)).toBe("1,2");
    expect(vietSoVN(1234567.89)).toBe("1.234.567,89");
  });
  it("ô dễ nhầm: nói máy đọc ra số nào và cách đổi; ô sai chuẩn: nói luật", () => {
    expect(cauLechChuan("Dòng 19 (mã BOQ A.1-02 Đào san nền): khối lượng", soLechChuan("1,200")!, true)).toBe(
      "Dòng 19 (mã BOQ A.1-02 Đào san nền): khối lượng «1,200» là ô CHỮ — theo chuẩn số Việt Nam máy đọc là 1,2. Nếu ý là 1.200 thì bấm nút bên dưới, máy sửa vào tệp."
    );
    expect(cauLechChuan("Dòng 7: «Đã làm»", soLechChuan("1.200")!, false)).toBe(
      "Dòng 7: «Đã làm» «1.200» là ô CHỮ — theo chuẩn số Việt Nam máy đọc là 1.200. Nếu ý là 1,2 thì sửa ô đó thành số trong Excel rồi nạp lại."
    );
    expect(cauLechChuan("Dòng 7: khối lượng", soLechChuan("1.5")!, true)).toBe(
      "Dòng 7: khối lượng «1.5» là ô CHỮ gõ sai chuẩn số Việt Nam (thập phân dùng dấu phẩy, nhóm ba chữ số dùng dấu chấm) — máy đọc là 1,5. Bấm nút bên dưới để máy sửa ô đó thành số."
    );
  });
});
