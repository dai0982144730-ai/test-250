// DẪN NGUỒN + XEM FILE (lệnh Mr. Đại 07/09) — parser thuần + bộ đọc file với
// file tự sinh trong bài kiểm.
import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import AdmZip from "adm-zip";
import { docMotMoc, tachDanNguon, taBcNgay, taBcTuan, taMan } from "@/lib/nguon/phan-tich";
import { bocBangXlsx, bocChuPptx, docNoiDungTep, timSheet } from "@/lib/xem-tep";

describe("phan-tich — nhận dạng chuỗi nguồn (khuôn sinh-nhom5 đang ghi)", () => {
  it("BC ngày một ngày + khoảng ngày", () => {
    const m1 = docMotMoc("BC ngày 2026-08-29 — TS");
    expect(m1.loai).toBe("bc-ngay");
    expect(m1.tuNgay).toBe("2026-08-29");
    expect(m1.nhaThau).toBe("TS");
    const m2 = docMotMoc("BC ngày 2026-08-27 → 2026-08-28 (2 báo cáo) — Điện 8");
    expect(m2.denNgay).toBe("2026-08-28");
    expect(m2.nhaThau).toBe("Điện 8");
  });
  it("BC tuần + sheet + dòng; đoạn lạ → chu", () => {
    const m = docMotMoc("BC tuần 2026-W35 — sheet Vấn đề dòng 2");
    expect(m.loai).toBe("bc-tuan");
    expect(m.tuan).toBe("2026-W35");
    expect(m.sheet).toBe("Vấn đề");
    expect(m.dong).toBe(2);
    expect(docMotMoc("người nhập tay (nguồn 4) — Mr. Đại").loai).toBe("chu");
  });
  it("chuỗi ghép ' · ' tách đúng số mốc", () => {
    const ds = tachDanNguon("BC ngày 2026-08-29 — TS · BC tuần 2026-W35 — sheet Vấn đề dòng 1");
    expect(ds.map((m) => m.loai)).toEqual(["bc-ngay", "bc-tuan"]);
  });
  it("khuôn mở rộng 02/09: khoảng không cần đếm, 'tất cả nhà thầu' = không lọc, màn trong app", () => {
    const m1 = docMotMoc("BC ngày 2026-08-31 → 2026-09-06 — Điện 8");
    expect(m1.loai).toBe("bc-ngay");
    expect(m1.denNgay).toBe("2026-09-06");
    const m2 = docMotMoc("BC ngày 2026-09-01 — tất cả nhà thầu");
    expect(m2.loai).toBe("bc-ngay");
    expect(m2.nhaThau).toBeUndefined();
    const m3 = docMotMoc("màn Theo dõi thiết kế (/thiet-ke)");
    expect(m3.loai).toBe("man");
    expect(m3.duongDan).toBe("/thiet-ke");
  });
  it("hàm ghi taBcNgay/taBcTuan/taMan ra đúng chuỗi mà docMotMoc đọc lại được", () => {
    const a = taBcNgay("2026-08-27", { den: "2026-08-28", soBc: 2, nhaThau: "Điện 8" });
    expect(a).toBe("BC ngày 2026-08-27 → 2026-08-28 (2 báo cáo) — Điện 8");
    expect(docMotMoc(a).loai).toBe("bc-ngay");
    const b = taBcTuan("2026-W35", "Vấn đề", 2);
    expect(docMotMoc(b)).toMatchObject({ loai: "bc-tuan", tuan: "2026-W35", dong: 2 });
    expect(docMotMoc(taBcNgay("2026-09-01")).nhaThau).toBeUndefined();
    expect(docMotMoc(taMan("Soát số liệu", "/soat-so-lieu")).duongDan).toBe("/soat-so-lieu");
  });
});

// ⭐ 24/09: bỏ khối "tra-nguon trên dữ liệu HV thật" — tra-nguon mở nguồn trên
// bản CHÉP dữ liệu tiến độ, đã gỡ khỏi Main (chốt Mr. Đại 24/09).

describe("xem-tep — bộ đọc file (file tự sinh)", () => {
  it("xlsx: đọc đủ sheet, tìm sheet không dấu, cắt 300 hàng", async () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["A", "B"], ["1", "x"]]), "Khối lượng");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Vấn đề"], ["thiếu đá"]]), "Vấn đề");
    const buf = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer);
    const sheet = bocBangXlsx(buf);
    expect(sheet.map((s) => s.ten)).toEqual(["Khối lượng", "Vấn đề"]);
    expect(timSheet(sheet, "van de")).toBe("Vấn đề");
    const kq = await docNoiDungTep("bc.xlsx", buf, "Vấn đề");
    expect(kq.loai).toBe("bang");
    expect(kq.sheetMo).toBe("Vấn đề");
  });
  it("pptx: bóc chữ từng slide", () => {
    const z = new AdmZip();
    z.addFile("ppt/slides/slide1.xml", Buffer.from('<p:sld><a:t>Xin chào</a:t><a:t>SCI</a:t></p:sld>', "utf8"));
    z.addFile("ppt/slides/slide2.xml", Buffer.from("<p:sld></p:sld>", "utf8"));
    const chu = bocChuPptx(z.toBuffer());
    expect(chu).toContain("— Slide 1 —");
    expect(chu).toContain("Xin chào SCI");
    expect(chu).toContain("(slide không có chữ)");
  });
  it("txt đọc chữ; đuôi lạ → khong-ho-tro có ghi chú; file hỏng KHÔNG nổ", async () => {
    expect((await docNoiDungTep("a.txt", Buffer.from("nội dung", "utf8"))).chu).toBe("nội dung");
    expect((await docNoiDungTep("a.zip", Buffer.from("x"))).loai).toBe("khong-ho-tro");
    // ĐO: SheetJS tự đọc buffer chữ như CSV — không nổ là được, loai nào cũng chấp nhận
    const la = await docNoiDungTep("a.xlsx", Buffer.from("khong phai xlsx"));
    expect(["bang", "khong-ho-tro"]).toContain(la.loai);
  });
});
