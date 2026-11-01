// Dạng luật tính toán (src/lib/luat/loai/tinh-toan.ts): tinh_toan (kết quả = A − B, A + B…, A ÷ B × 100, so ≥ / ≤)
// và dong_tong (dòng TỔNG = tổng các dòng). Ca đạt / không đạt, làm tròn, %, số Việt Nam, ô trống / "—" / "......",
// dòng nhóm, kiemThamSo, docThanhLoi; và chạy các luật mẫu đã chuyển AI → code trên file ví dụ thật.
import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { LOAI_LUAT, kiemThamSo, docThanhLoi } from "@/lib/luat/loai-luat";
import { chuanPhepTinh, docOSo, hienSo, soChuSoLe } from "@/lib/luat/loai/tinh-toan";
import { LUAT_MAU } from "@/lib/luat/luat-mau";
import type { DuLieuBaoCao, NguCanhKiem } from "@/lib/luat/types";
import type { DinhNghiaMauRutGon } from "@/lib/luat/types-them";
import { docWord, type NoiDungWord } from "@/lib/kiem-tra/doc-word";
import { docKyBaoCao } from "@/lib/kiem-tra/chuan-hoa";
import { MAC_DINH } from "@/lib/cau-hinh/mac-dinh";
import DINH_NGHIA from "../../mau-word/dinh-nghia.json";

const MAU: DinhNghiaMauRutGon = {
  ma: "form-thu",
  ten: "Mẫu thử",
  o_nhap: [
    { tag: "tong_von", nhan: "Tổng vốn" },
    { tag: "von_a", nhan: "Vốn A" },
    { tag: "von_b", nhan: "Vốn B" },
  ],
  bang: [
    {
      tag: "bang_tien_do",
      nhan: "Tiến độ tổng thể",
      cot: [
        { tag: "hang_muc", nhan: "Hạng mục" },
        { tag: "kh", nhan: "KH" },
        { tag: "th", nhan: "TH" },
        { tag: "lech", nhan: "Lệch" },
        { tag: "pt", nhan: "% đạt" },
      ],
    },
    {
      tag: "bang_cong_no",
      nhan: "Công nợ",
      cot: [
        { tag: "stt", nhan: "STT" },
        { tag: "du_an", nhan: "Dự án" },
        { tag: "gia_tri_hd", nhan: "Giá trị hợp đồng" },
        { tag: "da_xuat", nhan: "Đã xuất" },
        { tag: "con_lai", nhan: "Còn lại" },
      ],
    },
    { tag: "bang_khac", nhan: "Bảng khác", cot: [{ tag: "x", nhan: "X" }] },
  ],
  muc_bat_buoc: [],
};

const ctx: NguCanhKiem = { mau_ma: "form-thu", gia_tri_chua_dien: ["......", "…"], dinh_nghia_mau: MAU };

const bc = (bang: DuLieuBaoCao["bang"], o_nhap: Record<string, string> = {}): DuLieuBaoCao => ({ o_nhap, bang, tieu_de: [] });

const tienDo = (...dong: [string, string, string, string][]) =>
  bc({ bang_tien_do: dong.map(([hang_muc, kh, th, lech]) => ({ hang_muc, kh, th, lech })) });

const LECH = { ket_qua: { bang: "bang_tien_do", cot: "lech" }, phep_tinh: "hieu", a: { bang: "bang_tien_do", cot: "th" }, b: { bang: "bang_tien_do", cot: "kh" } };

const kiem = (loai: string, du: DuLieuBaoCao, ts: Record<string, unknown>, c: NguCanhKiem = ctx) => {
  expect(kiemThamSo(loai, ts, c.dinh_nghia_mau ?? null), `${loai} ${JSON.stringify(ts)}`).toEqual([]);
  return LOAI_LUAT[loai].kiem(du, ts, c);
};
const thongDiep = (loai: string, du: DuLieuBaoCao, ts: Record<string, unknown>) => kiem(loai, du, ts).map((l) => l.thong_diep);

describe("tiện ích đọc số", () => {
  it("docOSo: số / trống / — / chưa điền / chữ", () => {
    expect(docOSo("−2,7%", ["......"])).toMatchObject({ loai: "so", so: -2.7 });
    expect(docOSo("+3%", ["......"])).toMatchObject({ loai: "so", so: 3 });
    expect(docOSo("1.421,5", ["......"])).toMatchObject({ loai: "so", so: 1421.5 });
    expect(docOSo("1 sự kiện", ["......"])).toMatchObject({ loai: "so", so: 1 });
    expect(docOSo("1 (cảnh báo)", ["......"])).toMatchObject({ loai: "so", so: 1 });
    for (const v of ["", "  ", "—", "–", "-", "N/A", undefined]) expect(docOSo(v, ["......"]).loai, String(v)).toBe("trong");
    for (const v of ["......", "…", "[điền]"]) expect(docOSo(v, ["......", "…", "[điền]"]).loai, v).toBe("chua_dien");
    expect(docOSo("Đạt", ["......"])).toEqual({ loai: "chu", tho: "Đạt" });
  });
  it("soChuSoLe theo đúng cách đọc dấu chấm / phẩy kiểu Việt Nam", () => {
    expect(soChuSoLe("98,4%")).toBe(1);
    expect(soChuSoLe("51%")).toBe(0);
    expect(soChuSoLe("1.240")).toBe(0);
    expect(soChuSoLe("1.421,5")).toBe(1);
    expect(soChuSoLe("0,823")).toBe(3);
    expect(soChuSoLe("3.5")).toBe(1);
    expect(soChuSoLe("−0,12")).toBe(2);
    // chốt 130 (12/10/2026): cùng bộ đọc với docSo — «1,240» là 1,24 (3 số lẻ); gõ kiểu Anh một cách hiểu thì lẻ đứng sau dấu chấm
    expect(soChuSoLe("1,240")).toBe(3);
    expect(soChuSoLe("1,234.5")).toBe(1);
    expect(soChuSoLe("1,200,000")).toBe(0);
    expect(soChuSoLe("0.500")).toBe(3);
  });
  it("hienSo: dấu trừ thật, ngăn nghìn bằng chấm, thập phân bằng phẩy", () => {
    expect(hienSo(-2.7, { pt: true })).toBe("−2,7%");
    expect(hienSo(3, { pt: true, dau: true })).toBe("+3%");
    expect(hienSo(1596)).toBe("1.596");
    expect(hienSo(98.4375, { pt: true })).toBe("98,44%");
    expect(hienSo(100)).toBe("100");
    expect(hienSo(0, { dau: true })).toBe("0");
  });
  it("chuanPhepTinh hiểu chữ có dấu và ký hiệu", () => {
    expect(chuanPhepTinh("hiệu")).toBe("hieu");
    expect(chuanPhepTinh("−")).toBe("hieu");
    expect(chuanPhepTinh("Tổng")).toBe("tong");
    expect(chuanPhepTinh("×")).toBe("tich");
    expect(chuanPhepTinh("÷")).toBe("thuong");
    expect(chuanPhepTinh("phần trăm")).toBe("phan_tram");
    expect(chuanPhepTinh("%")).toBe("phan_tram");
    expect(chuanPhepTinh("chi_a")).toBe("chi_a");
    expect(chuanPhepTinh("lũy thừa")).toBeNull();
  });
});

describe("tinh_toan: hiệu theo từng dòng", () => {
  it("đạt khi đúng (số VN, %, +3%, −2,7%); không đạt báo đúng dòng, đúng lời", () => {
    const du = tienDo(["Tổng", "44,2%", "41,5%", "-2,7%"], ["Đường", "65%", "68%", "+3%"], ["Móng", "44,2%", "41,5%", "−1%"], ["Cáp", "10%", "8%", "−2%"]);
    const loi = kiem("tinh_toan", du, LECH);
    expect(loi).toEqual([
      {
        thong_diep: 'Dòng 3 bảng "Tiến độ tổng thể": cột "Lệch" = −1%, nhưng TH − KH = −2,7%',
        vi_tri: { bang: "bang_tien_do", dong: 3, cot: "lech" },
      },
    ]);
  });

  it("dấu + khi vượt kế hoạch; ghi sai dấu thì bắt", () => {
    expect(thongDiep("tinh_toan", tienDo(["Đường", "65%", "68%", "-3%"]), LECH)).toEqual(['Dòng 1 bảng "Tiến độ tổng thể": cột "Lệch" = −3%, nhưng TH − KH = +3%']);
  });

  it("ô trống, “—”, “......” ở kết quả hay ở A/B → bỏ qua; trong_la_0 thì “—” ở A/B tính là 0", () => {
    const du = tienDo(["a", "10%", "8%", ""], ["b", "10%", "8%", "—"], ["c", "10%", "8%", "......"], ["d", "—", "8%", "-2%"], ["e", "......", "8%", "5%"], ["f", "", "8%", "8%"]);
    expect(kiem("tinh_toan", du, LECH)).toEqual([]);
    // trong_la_0: "—"/trống = 0 → dòng d: 8 − 0 = 8 ≠ −2 (báo); dòng f: 8 − 0 = 8 (đạt); "......" vẫn bỏ qua
    expect(kiem("tinh_toan", du, { ...LECH, trong_la_0: true }).map((l) => l.vi_tri?.dong)).toEqual([4]);
  });

  it("kết quả ghi chữ: báo không phải số, trừ chữ được bỏ qua (vd “Đạt”)", () => {
    const du = tienDo(["a", "100%", "100%", "Đạt"], ["b", "80%", "70%", "chậm"]);
    expect(thongDiep("tinh_toan", du, LECH)).toEqual([
      'Dòng 1 bảng "Tiến độ tổng thể": cột "Lệch" = "Đạt" không phải số, chưa so được với TH − KH',
      'Dòng 2 bảng "Tiến độ tổng thể": cột "Lệch" = "chậm" không phải số, chưa so được với TH − KH',
    ]);
    expect(kiem("tinh_toan", du, { ...LECH, chu_bo_qua: ["đạt"] }).map((l) => l.vi_tri?.dong)).toEqual([2]);
  });

  it("sai số tuyệt đối: lệch trong ngưỡng thì đạt, ngoài thì báo kèm ngưỡng", () => {
    const du = tienDo(["a", "82%", "78%", "-4,4%"]);
    expect(thongDiep("tinh_toan", du, LECH)).toEqual(['Dòng 1 bảng "Tiến độ tổng thể": cột "Lệch" = −4,4%, nhưng TH − KH = −4%']);
    expect(kiem("tinh_toan", du, { ...LECH, sai_so: 0.5 })).toEqual([]);
    expect(thongDiep("tinh_toan", du, { ...LECH, sai_so: 0.3 })).toEqual(['Dòng 1 bảng "Tiến độ tổng thể": cột "Lệch" = −4,4%, nhưng TH − KH = −4% (cho lệch ±0,3)']);
  });
});

describe("tinh_toan: phần trăm, làm tròn", () => {
  const PT = { ket_qua: { bang: "bang_tien_do", cot: "pt" }, phep_tinh: "phan_tram", a: { bang: "bang_tien_do", cot: "th" }, b: { bang: "bang_tien_do", cot: "kh" } };
  const du = (th: string, kh: string, pt: string) => bc({ bang_tien_do: [{ hang_muc: "x", th, kh, pt }] });

  it("cho lệch làm tròn theo số chữ số đã ghi: 3.150 ÷ 3.200 = 98,4375 → “98,4%” đạt, “98%” đạt, “98,5%” không", () => {
    expect(kiem("tinh_toan", du("3.150", "3.200", "98,4%"), PT)).toEqual([]);
    expect(kiem("tinh_toan", du("3.150", "3.200", "98%"), PT)).toEqual([]);
    expect(thongDiep("tinh_toan", du("3.150", "3.200", "98,5%"), PT)).toEqual([
      'Dòng 1 bảng "Tiến độ tổng thể": cột "% đạt" = 98,5%, nhưng TH ÷ KH × 100 = 98,44%',
    ]);
  });

  it("so chính xác (khong_lam_tron) thì 98,4% cũng bị báo; sai số % của giá trị tính ra", () => {
    expect(kiem("tinh_toan", du("3.150", "3.200", "98,4%"), { ...PT, khong_lam_tron: true })).toHaveLength(1);
    // lệch 0,5 trên 98,44 ≈ 0,51% → sai_so_phan_tram 1 thì đạt
    expect(kiem("tinh_toan", du("3.150", "3.200", "99%"), { ...PT, khong_lam_tron: true, sai_so_phan_tram: 1 })).toEqual([]);
    expect(kiem("tinh_toan", du("3.150", "3.200", "99%"), { ...PT, khong_lam_tron: true, sai_so_phan_tram: 0.2 })).toHaveLength(1);
  });

  it("mẫu làm tròn đến 1%: 42.378 ÷ 82.316 = 51,48 → 51% đạt; 52% cần sai số 1", () => {
    expect(kiem("tinh_toan", du("42.378", "82.316", "51%"), PT)).toEqual([]);
    expect(kiem("tinh_toan", du("42.378", "82.316", "52%"), PT)).toHaveLength(1);
    expect(kiem("tinh_toan", du("42.378", "82.316", "52%"), { ...PT, sai_so: 1 })).toEqual([]);
  });

  it("chia cho 0 thì không kết luận; thương và tích", () => {
    expect(kiem("tinh_toan", du("5", "0", "10%"), PT)).toEqual([]);
    expect(kiem("tinh_toan", du("1.421,5", "1.850,0", "0,77"), { ...PT, phep_tinh: "thuong" })).toEqual([]);
    expect(kiem("tinh_toan", du("2,5", "4", "10"), { ...PT, phep_tinh: "tich" })).toEqual([]);
    expect(thongDiep("tinh_toan", du("2,5", "4", "12"), { ...PT, phep_tinh: "×" })).toEqual(['Dòng 1 bảng "Tiến độ tổng thể": cột "% đạt" = 12, nhưng TH × KH = 10']);
  });
});

describe("tinh_toan: tổng nhiều cột, so ≥ / ≤, hằng số, cấp tài liệu", () => {
  const CN = (...dong: Record<string, string>[]) => bc({ bang_cong_no: dong });

  it("tổng A + B + cột cộng thêm (theo tag hoặc tên cột); “—” = 0 khi chọn", () => {
    const ts = { ket_qua: { bang: "bang_cong_no", cot: "gia_tri_hd" }, phep_tinh: "tong", a: { bang: "bang_cong_no", cot: "da_xuat" }, b: { bang: "bang_cong_no", cot: "con_lai" }, them: ["STT"], trong_la_0: true };
    const du = CN({ stt: "1", du_an: "A", gia_tri_hd: "10", da_xuat: "5", con_lai: "4" }, { stt: "—", du_an: "B", gia_tri_hd: "9", da_xuat: "5", con_lai: "4" }, { stt: "2", du_an: "C", gia_tri_hd: "9", da_xuat: "5", con_lai: "4" });
    expect(thongDiep("tinh_toan", du, ts)).toEqual(['Dòng 3 bảng "Công nợ": cột "Giá trị hợp đồng" = 9, nhưng Đã xuất + Còn lại + STT = 11']);
  });

  it("so ≥ với chính A (lũy kế không nhỏ hơn kỳ); so ≤ (giải ngân không vượt hợp đồng)", () => {
    const ge = { ket_qua: { bang: "bang_cong_no", cot: "da_xuat" }, so_sanh: ">=", phep_tinh: "chi_a", a: { bang: "bang_cong_no", cot: "con_lai" } };
    const du = CN({ du_an: "A", da_xuat: "5", con_lai: "4" }, { du_an: "B", da_xuat: "3", con_lai: "4" }, { du_an: "C", da_xuat: "4", con_lai: "4" });
    expect(thongDiep("tinh_toan", du, ge)).toEqual(['Dòng 2 bảng "Công nợ": cột "Đã xuất" = 3, phải không nhỏ hơn Còn lại (= 4)']);
    expect(kiem("tinh_toan", du, { ...ge, so_sanh: "<=" }).map((l) => l.vi_tri?.dong)).toEqual([1]);
  });

  it("A hoặc B là hằng số", () => {
    const ts = { ket_qua: { bang: "bang_cong_no", cot: "con_lai" }, phep_tinh: "hieu", a_so: 100, b: { bang: "bang_cong_no", cot: "da_xuat" } };
    expect(thongDiep("tinh_toan", CN({ du_an: "A", da_xuat: "30", con_lai: "70" }, { du_an: "B", da_xuat: "30", con_lai: "60" }), ts)).toEqual([
      'Dòng 2 bảng "Công nợ": cột "Còn lại" = 60, nhưng 100 − Đã xuất = 70',
    ]);
  });

  it("toàn ô → kiểm một lần cho cả báo cáo, vi_tri là tag ô", () => {
    const ts = { ket_qua: { o: "tong_von" }, phep_tinh: "tong", a: { o: "von_a" }, b: { o: "von_b" } };
    expect(kiem("tinh_toan", bc({}, { tong_von: "1.250", von_a: "1.000", von_b: "250" }), ts)).toEqual([]);
    expect(kiem("tinh_toan", bc({}, { tong_von: "1.200", von_a: "1.000", von_b: "250" }), ts)).toEqual([
      { thong_diep: 'Ô "Tổng vốn" = 1.200, nhưng Vốn A + Vốn B = 1.250', vi_tri: { tag: "tong_von" } },
    ]);
    expect(kiem("tinh_toan", bc({}, { tong_von: "......", von_a: "1.000", von_b: "250" }), ts)).toEqual([]);
  });

  it("ô dùng chung cho mọi dòng của bảng", () => {
    const ts = { ket_qua: { bang: "bang_cong_no", cot: "con_lai" }, phep_tinh: "hieu", a: { o: "tong_von" }, b: { bang: "bang_cong_no", cot: "da_xuat" } };
    const du = bc({ bang_cong_no: [{ du_an: "A", da_xuat: "30", con_lai: "70" }, { du_an: "B", da_xuat: "40", con_lai: "70" }] }, { tong_von: "100" });
    expect(kiem("tinh_toan", du, ts).map((l) => l.vi_tri)).toEqual([{ bang: "bang_cong_no", dong: 2, cot: "con_lai" }]);
  });
});

describe("tinh_toan: kiemThamSo", () => {
  const k = (ts: Record<string, unknown>) => kiemThamSo("tinh_toan", ts, MAU);
  it("thiếu / thừa vế, phép lạ, cộng thêm sai chỗ, hai bảng, sai số âm, chia 0", () => {
    expect(k(LECH)).toEqual([]);
    expect(k({ ket_qua: LECH.ket_qua, phep_tinh: "hieu", a: LECH.a })).toEqual(["Thiếu B: chọn một ô / cột hoặc nhập một số"]);
    expect(k({ ...LECH, a_so: 5 })).toEqual(["A chỉ được là một: ô / cột hoặc số"]);
    expect(k({ ...LECH, phep_tinh: "lũy thừa" })[0]).toMatch(/không nhận ra/);
    expect(k({ ...LECH, them: ["kh"] })).toEqual(["Cộng thêm chỉ dùng với phép tổng"]);
    expect(k({ ...LECH, phep_tinh: "tong", them: ["khong_co"] })).toEqual(['"Cộng thêm": bảng "Tiến độ tổng thể" không có cột "khong_co"']);
    expect(k({ ...LECH, b: { bang: "bang_khac", cot: "x" } })[0]).toMatch(/hai bảng khác nhau/);
    expect(k({ ...LECH, sai_so: -1 })[0]).toMatch(/không được âm/);
    expect(k({ ket_qua: LECH.ket_qua, phep_tinh: "phan_tram", a: LECH.a, b_so: 0 })).toEqual(["B bằng 0 — không chia được"]);
    expect(k({ ket_qua: LECH.ket_qua, phep_tinh: "chi_a", a: LECH.a, so_sanh: ">=" })).toEqual([]);
    expect(k({ ...LECH, ket_qua: { bang: "bang_tien_do", cot: "khong_co" } })[0]).toMatch(/không có cột "khong_co"/);
    expect(k({ ...LECH, a: { ky: "tu" } })[0]).toMatch(/không trỏ tới kỳ báo cáo/);
    expect(kiemThamSo("tinh_toan", {}, MAU)).toEqual(['Thiếu tham số "Ô hoặc cột kết quả" (ket_qua)', 'Thiếu tham số "Phép tính" (phep_tinh)']);
  });
});

// ---------------- dong_tong ----------------

const CONG_NO = ["gia_tri_hd", "da_xuat", "con_lai"];
const DT = { bang: "bang_cong_no", cot: CONG_NO };
const dongCN = (du_an: string, gia_tri_hd: string, da_xuat: string, con_lai: string, stt = "") => ({ stt, du_an, gia_tri_hd, da_xuat, con_lai });

describe("dong_tong", () => {
  it("đạt khi dòng TỔNG khớp; sai thì báo đúng dòng + cột + số", () => {
    const du = bc({ bang_cong_no: [dongCN("Nậm Sam", "1.850", "1.650", "200", "1"), dongCN("Nậm Khiên", "425", "263", "162", "2"), dongCN("Hướng Việt", "180", "90", "90", "3"), dongCN("TỔNG", "2.455", "2.003", "450")] });
    expect(kiem("dong_tong", du, DT)).toEqual([
      { thong_diep: 'Dòng 4 bảng "Công nợ": cột "Còn lại" = 450, nhưng tổng dòng 1–3 = 452', vi_tri: { bang: "bang_cong_no", dong: 4, cot: "con_lai" } },
    ]);
    expect(kiem("dong_tong", du, { ...DT, sai_so: 2 })).toEqual([]);
  });

  it("dòng nhóm (không có số) không tính; “—” ở dòng thành phần = 0; dòng TỔNG ghi “—” thì bỏ qua cột đó", () => {
    const du = bc({
      bang_cong_no: [
        dongCN("THI CÔNG", "", "", ""),
        dongCN("A", "100", "—", "100"),
        dongCN("B", "50", "20", "30"),
        dongCN("TỔNG CỘNG", "150", "20", "—"),
      ],
    });
    expect(kiem("dong_tong", du, DT)).toEqual([]);
    const sai = structuredClone(du);
    sai.bang.bang_cong_no[3].gia_tri_hd = "140";
    // dòng 1 (nhóm) không nằm trong danh sách dòng được cộng
    expect(thongDiep("dong_tong", sai, DT)).toEqual(['Dòng 4 bảng "Công nợ": cột "Giá trị hợp đồng" = 140, nhưng tổng dòng 2–3 = 150']);
  });

  it("dòng thành phần còn “......” → chưa kết luận cột đó; trống cả bảng → không báo", () => {
    const du = bc({ bang_cong_no: [dongCN("A", "100", "......", "100"), dongCN("B", "50", "20", "30"), dongCN("TỔNG", "150", "99", "130")] });
    expect(kiem("dong_tong", du, DT)).toEqual([]);
    expect(kiem("dong_tong", bc({ bang_cong_no: [dongCN("A", "", "", ""), dongCN("TỔNG", "", "", "")] }), DT)).toEqual([]);
    expect(kiem("dong_tong", bc({}), DT)).toEqual([]);
  });

  it("nhãn khớp đầu chữ (“TỔNG TRẠNG THÁI TUẦN NÀY”), không khớp giữa chữ (“TỔNGHỢP”); nhãn tự đặt; cột theo tên thật", () => {
    const du = bc({ bang_cong_no: [dongCN("A", "1", "1", "1"), dongCN("B", "2", "2", "2"), dongCN("Tổng trạng thái tuần này", "3", "3", "4")] });
    expect(kiem("dong_tong", du, DT).map((l) => l.vi_tri?.cot)).toEqual(["con_lai"]);
    const khongKhop = bc({ bang_cong_no: [dongCN("A", "1", "1", "1"), dongCN("TỔNGHỢP", "9", "9", "9")] });
    expect(kiem("dong_tong", khongKhop, DT)).toEqual([]);
    const congLai = bc({ bang_cong_no: [dongCN("A", "1", "1", "1"), dongCN("B", "2", "2", "2"), dongCN("Cộng", "3", "3", "5")] });
    expect(kiem("dong_tong", congLai, { ...DT, nhan: ["Cộng"], cot: ["Giá trị hợp đồng", "Còn lại"] }).map((l) => l.vi_tri?.cot)).toEqual(["con_lai"]);
  });

  it("cột nhãn mặc định là cột đầu (bỏ STT); chọn cột nhãn khác được", () => {
    // STT ghi "TỔNG" không được hiểu là dòng tổng khi không chọn cột nhãn
    const du = bc({ bang_cong_no: [dongCN("A", "1", "1", "1", "1"), dongCN("B", "5", "5", "5", "TỔNG")] });
    expect(kiem("dong_tong", du, DT)).toEqual([]);
    expect(kiem("dong_tong", du, { ...DT, cot_nhan: "stt" })).toHaveLength(3);
  });

  it("dòng tổng đứng đầu bảng cộng các dòng phía dưới; nhiều bảng cùng mã mỗi bảng một dòng tổng", () => {
    const dau = bc({ bang_cong_no: [dongCN("TỔNG", "30", "3", "27"), dongCN("A", "10", "1", "9"), dongCN("B", "20", "2", "18")] });
    expect(kiem("dong_tong", dau, DT)).toEqual([]);
    const hai = bc({
      bang_cong_no: [dongCN("A", "10", "1", "9"), dongCN("B", "20", "2", "18"), dongCN("TỔNG", "30", "3", "27"), dongCN("C", "5", "1", "4"), dongCN("TỔNG", "5", "1", "5")],
    });
    expect(thongDiep("dong_tong", hai, DT)).toEqual(['Dòng 5 bảng "Công nợ": cột "Còn lại" = 5, nhưng tổng dòng 4 = 4']);
  });

  it("kiemThamSo: thiếu cột, cột không có, cột nhãn trùng cột cộng, sai số âm", () => {
    expect(kiemThamSo("dong_tong", DT, MAU)).toEqual([]);
    expect(kiemThamSo("dong_tong", { bang: "bang_cong_no", cot: [] }, MAU)).toEqual(["Chưa chọn cột nào để cộng"]);
    expect(kiemThamSo("dong_tong", { bang: "bang_cong_no", cot: ["khong_co"] }, MAU)).toEqual(['"Các cột phải cộng khớp": bảng "Công nợ" không có cột "khong_co"']);
    expect(kiemThamSo("dong_tong", { ...DT, cot_nhan: "con_lai" }, MAU)).toEqual(["Cột ghi nhãn dòng tổng không được là cột đang cộng"]);
    expect(kiemThamSo("dong_tong", { ...DT, sai_so: -1 }, MAU)[0]).toMatch(/không được âm/);
    expect(kiemThamSo("dong_tong", { cot: CONG_NO }, MAU)).toEqual(['Thiếu tham số "Bảng" (bang)']);
    expect(kiemThamSo("dong_tong", { bang: "bang_x", cot: CONG_NO }, MAU)[0]).toMatch(/không có trong mẫu/);
  });
});

describe("docThanhLoi", () => {
  it("đọc tham số thành câu có nhãn thật", () => {
    expect(docThanhLoi("tinh_toan", { ...LECH, sai_so: 0.1 }, MAU)).toBe('Ở mỗi dòng bảng "Tiến độ tổng thể": cột "Lệch" phải bằng TH − KH (cho lệch ±0,1)');
    expect(docThanhLoi("tinh_toan", { ket_qua: { bang: "bang_tien_do", cot: "pt" }, phep_tinh: "phan_tram", a: LECH.a, b: LECH.b, chu_bo_qua: ["Đạt"] }, MAU)).toBe(
      'Ở mỗi dòng bảng "Tiến độ tổng thể": cột "% đạt" phải bằng TH ÷ KH × 100 (được ghi "Đạt")',
    );
    expect(docThanhLoi("tinh_toan", { ket_qua: { o: "tong_von" }, phep_tinh: "tong", a: { o: "von_a" }, b_so: 5 }, MAU)).toBe('Ô "Tổng vốn" phải bằng Vốn A + 5');
    expect(docThanhLoi("tinh_toan", { ket_qua: LECH.ket_qua, so_sanh: ">=", phep_tinh: "chi_a", a: LECH.a, trong_la_0: true }, MAU)).toBe(
      'Ở mỗi dòng bảng "Tiến độ tổng thể": cột "Lệch" phải không nhỏ hơn TH (ô trống hoặc "—" tính là 0)',
    );
    expect(docThanhLoi("dong_tong", { ...DT, sai_so: 1 }, MAU)).toBe(
      'Dòng "TỔNG" / "TỔNG CỘNG" của bảng "Công nợ" phải bằng tổng các dòng còn lại ở các cột "Giá trị hợp đồng", "Đã xuất", "Còn lại" (cho lệch ±1)',
    );
    expect(docThanhLoi("tinh_toan", {}, null)).toMatch(/chưa đủ tham số/);
    expect(docThanhLoi("dong_tong", {}, null)).toMatch(/chưa đủ tham số/);
  });
});

// ---------------- Luật mẫu đã chuyển AI → code, trên file ví dụ thật ----------------

type MauJson = { ma: string; ten: string; dinh_nghia: { o_nhap: DinhNghiaMauRutGon["o_nhap"]; bang: DinhNghiaMauRutGon["bang"]; muc_bat_buoc: string[] } };
const mauThat = (ma: string): DinhNghiaMauRutGon => {
  const m = (DINH_NGHIA as unknown as MauJson[]).find((x) => x.ma === ma)!;
  return { ma: m.ma, ten: m.ten, o_nhap: m.dinh_nghia.o_nhap, bang: m.dinh_nghia.bang, muc_bat_buoc: m.dinh_nghia.muc_bat_buoc };
};
const GOC = path.join(process.cwd(), "mau-word");
const tep: Record<string, NoiDungWord> = {};
beforeAll(async () => {
  for (const f of ["form-0.docx", "form-3.docx", "form-4.docx", "form-6.docx", "form-8.docx", "vi-du/BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx", "vi-du/BaoCao_Thang7_SCI_ENC.docx"]) {
    tep[f] = await docWord(fs.readFileSync(path.join(GOC, f)));
  }
});

function chayLuat(nd: NoiDungWord, ma: string) {
  const l = LUAT_MAU.find((x) => x.ma === ma)!;
  expect(l, ma).toBeTruthy();
  const ky = docKyBaoCao(nd.o_nhap.ky_bao_cao ?? "");
  const c: NguCanhKiem = { mau_ma: nd.mau_ma, ky_bao_cao: { tu: ky.tu, den: ky.den }, gia_tri_chua_dien: MAC_DINH.luat_kiem_tra.gia_tri_chua_dien, dinh_nghia_mau: mauThat(nd.mau_ma!) };
  return LOAI_LUAT[l.loai!].kiem(nd, l.tham_so!, c);
}

describe("luật mẫu tính toán trên báo cáo thật", () => {
  it("Form 7: Lệch = TH − KH — đạt trên file thật; sửa lệch dòng TỔNG thành −1% thì bắt đúng dòng", () => {
    const nd = tep["vi-du/BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx"];
    expect(chayLuat(nd, "f7-lech")).toEqual([]);
    const sai = structuredClone(nd);
    sai.bang.bang_tien_do[0].lech = "-1%";
    expect(chayLuat(sai, "f7-lech")).toEqual([
      {
        thong_diep: 'Dòng 1 bảng "TIẾN ĐỘ TỔNG THỂ": cột "Lệch" = −1%, nhưng TH lũy kế − KH lũy kế = −2,7% (cho lệch ±0,1)',
        vi_tri: { bang: "bang_tien_do", dong: 1, cot: "lech" },
      },
    ]);
    expect(chayLuat(nd, "f7-kl-pt-dat")).toEqual([]);
  });

  it("Form 0: công nợ còn lại + dòng TỔNG; an toàn dòng tổng “1 sự kiện”", () => {
    const nd = tep["form-0.docx"];
    for (const ma of ["f0-cong-no-con-lai", "f0-cong-no-dong-tong", "chung-an-toan-dong-tong", "chung-an-toan-luy-ke-tu-tuan"]) expect(chayLuat(nd, ma), ma).toEqual([]);
    const sai = structuredClone(nd);
    const tong = sai.bang.bang_cong_no.findIndex((d) => d.du_an === "TỔNG");
    sai.bang.bang_cong_no[tong].gia_tri_hd = "2.500";
    expect(chayLuat(sai, "f0-cong-no-dong-tong").map((l) => l.thong_diep)).toEqual([
      `Dòng ${tong + 1} bảng "CÔNG NỢ PHẢI THU (Chỉ báo tháng là có)": cột "Giá trị hợp đồng" = 2.500, nhưng tổng dòng 1–${tong} = 2.455 (cho lệch ±1)`,
    ]);
    // dòng TỔNG đổi hợp đồng → còn lại của dòng TỔNG cũng không khớp phép trừ
    expect(chayLuat(sai, "f0-cong-no-con-lai").map((l) => l.vi_tri)).toEqual([{ bang: "bang_cong_no", dong: tong + 1, cot: "con_lai" }]);
    const at = structuredClone(nd);
    const t = at.bang.bang_an_toan.findIndex((d) => /^TỔNG/.test(d.chi_tieu));
    at.bang.bang_an_toan[t].tuan_nay = "2 sự kiện";
    expect(chayLuat(at, "chung-an-toan-dong-tong").map((l) => l.vi_tri)).toEqual([{ bang: "bang_an_toan", dong: t + 1, cot: "tuan_nay" }]);
  });

  it("Form 3, 4, 8: biến động, tổng cộng, % hoàn thành làm tròn 1%, % KH — đạt trên mẫu; sửa số thì bắt", () => {
    for (const ma of ["f3-bien-dong", "f3-tong-cong"]) expect(chayLuat(tep["form-3.docx"], ma), ma).toEqual([]);
    for (const ma of ["f4-chi-phi-pt-ht", "f4-chi-phi-luy-ke-tu-thang"]) expect(chayLuat(tep["form-4.docx"], ma), ma).toEqual([]);
    for (const ma of ["f8-pt-kh-tuan", "f8-pt-kh-thang", "f8-nam-lk-tu-thang", "f8-thang-lk-tu-tuan"]) expect(chayLuat(tep["form-8.docx"], ma), ma).toEqual([]);
    const f3 = structuredClone(tep["form-3.docx"]);
    f3.bang.bang_nhan_su[1].bien_dong = "+2";
    expect(chayLuat(f3, "f3-bien-dong").map((l) => l.thong_diep)).toEqual(['Dòng 2 bảng "NHÂN SỰ": cột "Biến động" = +2, nhưng Cuối tuần − Đầu tuần = +1']);
    // biến động dòng 2 sai → dòng TỔNG CỘNG (+1) không còn bằng tổng (+2)
    expect(chayLuat(f3, "f3-tong-cong").map((l) => l.vi_tri?.cot)).toEqual(["bien_dong"]);
    const f8 = structuredClone(tep["form-8.docx"]);
    f8.bang.bang_san_luong[1].tuan_pt_kh = "97,8%";
    expect(chayLuat(f8, "f8-pt-kh-tuan").map((l) => l.thong_diep)).toEqual([
      'Dòng 2 bảng "SẢN LƯỢNG & VẬN HÀNH": cột "Tuần — % KH" = 97,8%, nhưng Tuần — T/H ÷ Tuần — KH × 100 = 94,78% (cho lệch ±0,2)',
    ]);
  });

  it("Form 6 báo cáo tuần 3 chương (20/10/2026): luật tiến độ thi công · thu vốn · nhân lực đã bỏ khỏi bộ luật mẫu", () => {
    const ma = LUAT_MAU.map((l) => l.ma);
    for (const m of ["f6-lech-tien-do", "f6-pt-gia-tri-hd", "f6-giai-ngan-khong-vuot-hd", "f6-nhan-luc-tong", "f6-nhan-luc-dong-tong", "f6-thu-von-giai-ngan", "f6-ai-tnld-kien-nghi", "f5-giai-doan-danh-muc"])
      expect(ma, m).not.toContain(m);
    expect(tep["form-6.docx"].bang.bang_tien_do_tc).toBeUndefined();
    // Form 11 dùng chung luật Form 10
    const f10 = LUAT_MAU.filter((l) => Array.isArray(l.ap_dung) && l.ap_dung.includes("form-10"));
    expect(f10.length).toBeGreaterThan(5);
    expect(f10.every((l) => (l.ap_dung as string[]).includes("form-11"))).toBe(true);
  });
});
