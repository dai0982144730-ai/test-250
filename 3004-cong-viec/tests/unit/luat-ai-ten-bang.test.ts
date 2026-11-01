// Luật 30 ("không bao giờ chỉ viết mã"): câu AI kiểm luật viết mã máy của bảng / cột → hiện tên trên báo cáo (soát 29/09).
import { describe, it, expect } from "vitest";
import { thayMaBangTen } from "@/lib/luat/ai/kiem";
import DINH_NGHIA from "../../mau-word/dinh-nghia.json";
import type { MauWord } from "@/lib/types";

const mau = (ma: string) => DINH_NGHIA.find((d) => d.ma === ma) as unknown as MauWord;

describe("thayMaBangTen", () => {
  it("câu thật từ bước 3 (Form 8, Form 2): mã bảng / cột → tên trên báo cáo", () => {
    const f8 = thayMaBangTen("Bảng bang_su_co (mục II) không có dòng dữ liệu nào", mau("form-8"));
    expect(f8).not.toMatch(/bang_su_co/);
    expect(f8).toMatch(/Bảng "[^"]+" \(mục II\)/);
    const f2 = thayMaBangTen("Cột mat_agc_tuan ở cả 8 dòng bảng KPI đều trống", mau("form-2"));
    expect(f2).not.toMatch(/mat_agc_tuan/);
  });
  it("không đụng chữ thường, số liệu, ngày", () => {
    const s = "Tuần 40: 12,5 tỷ — hạn 03/10/2026, ten, loai";
    expect(thayMaBangTen(s, mau("form-7"))).toBe(s);
  });
});

describe("góp ý AI — mã trần và câu 'không cần sửa' (soát 30/09, Form 6 SCI E&C)", () => {
  it('"du_an=\\"NM 2\\"" → tên cột + chữ ghi', async () => {
    const { thayMaBangTen: thay } = await import("@/lib/kiem-tra/gop-y-ai");
    const s = thay('Kiến nghị dòng 2 ghi du_an="NM 2" không khớp tên dự án chuẩn', mau("form-6"));
    expect(s).not.toMatch(/du_an/);
    expect(s).toMatch(/"[^"]+" ghi "NM 2"/);
  });
  it("câu AI tự kết luận 'khớp, không có gì cần sửa' bị bỏ", async () => {
    const { phanTichGopY } = await import("@/lib/kiem-tra/gop-y-ai");
    const text = JSON.stringify({ gop_y: [
      { loai: "mau_thuan", thong_diep: "Phải thu quá hạn ghi 12,5 tỷ, bảng kiến nghị cũng nêu đúng số này — khớp, không có gì cần sửa" },
      { loai: "muc_trong", thong_diep: "Mục tiến độ thu vốn còn trống" },
    ] });
    const kq = phanTichGopY(text, { o: {}, bang: {}, muc: [] } as never, mau("form-6"));
    expect(kq.map((g) => g.thong_diep)).toEqual(["Mục tiến độ thu vốn còn trống"]);
  });
});

describe("luật AI tự mâu thuẫn (đo 30/09: Form 0, Form 3)", () => {
  const L = (id: string) => ({ id, ma: id, cau: "x", cach_kiem: "ai", muc: "goi_y", bat: true }) as never;
  const chay = async (dat: boolean, thong_diep: string) => {
    const { phanTichLuatAi } = await import("@/lib/luat/ai/kiem");
    return phanTichLuatAi(JSON.stringify({ luat: [{ id: "L1", dat, thong_diep }] }), [L("a")], { o_nhap: {}, bang: {}, muc: [], van_ban: "" } as never, mau("form-3"))[0];
  };
  it("dat=false mà câu nói 'đạt yêu cầu, không vi phạm' → đạt; 'muc_do=Cần quyết định' → tên cột", async () => {
    const k = await chay(false, "Dòng 1 (muc_do=Cần quyết định): kiến nghị đã nêu rõ đề nghị TGĐ gia hạn 1 năm — đạt yêu cầu, không vi phạm.");
    expect(k.dat).toBe(true);
    expect(k.thong_diep).not.toMatch(/muc_do/);
  });
  it("câu nêu chỗ sai thì giữ không đạt", async () => {
    expect((await chay(false, "Dòng 2: kiến nghị chỉ nêu chung chung, chưa nêu nội dung công văn yêu cầu gì cụ thể")).dat).toBe(false);
    expect((await chay(false, "Dòng 1 đạt yêu cầu nhưng dòng 3 chưa nêu ai quyết")).dat).toBe(false);
  });
});

describe("luật AI tự mâu thuẫn — câu thật P.TCKT 30/09", () => {
  const L = { id: "a", ma: "a", cau: "x", cach_kiem: "ai", muc: "goi_y", bat: true } as never;
  const chay = async (thong_diep: string) => {
    const { phanTichLuatAi } = await import("@/lib/luat/ai/kiem");
    return phanTichLuatAi(JSON.stringify({ luat: [{ id: "L1", dat: false, thong_diep }] }), [L], { o_nhap: {}, bang: {}, muc: [], van_ban: "" } as never, mau("form-4"))[0].dat;
  };
  it("'… (lệch 1, trong ngưỡng ±2) — đạt.' và 'không thuộc phạm vi luật' → đạt", async () => {
    expect(await chay("Cột SCI Quảng Trị: Cân đối nguồn ghi 585.008 — số ghi khớp, không lệch. Kiểm lại cột SCI: ghi 3.323 (lệch 1, trong ngưỡng ±2) — đạt.")).toBe(true);
    expect(await chay('Dòng 2 kiến nghị mức "Cần theo dõi" nên không thuộc phạm vi luật — không đánh giá.')).toBe(true);
  });
});
