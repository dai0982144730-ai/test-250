// Ma trận quy tắc đè (thuần, không CSDL) + hàm tiện ích.
import { describe, it, expect } from "vitest";
import { soSanhNguon, type NguonSoSanh } from "@/lib/so-cai/quy-tac-de";
import { MAC_DINH, type ThuTuUuTien } from "@/lib/cau-hinh/mac-dinh";
import { chuanHoa, doGiongViec, dinhDangMaViec, tinhCanhBao } from "@/lib/so-cai/tien-ich";

const ch = (thu_tu: ThuTuUuTien, ngay: "ky_bao_cao" | "ngay_gui" = "ky_bao_cao") => ({
  ...MAC_DINH.quy_tac_de,
  thu_tu,
  ngay_sau_tinh_theo: ngay,
});

// Ví dụ kế hoạch: BQLDA tuần 28 → tuần 29 → P.ĐT&PC tuần 29
const bqT28: NguonSoSanh = { cap: 3, ky_bao_cao: "2026-07-13", ngay_gui: "2026-07-14T02:00:00Z" };
const bqT29: NguonSoSanh = { cap: 3, ky_bao_cao: "2026-07-20", ngay_gui: "2026-07-21T03:05:00Z" };
const dtpcT29: NguonSoSanh = { cap: 2, ky_bao_cao: "2026-07-20", ngay_gui: "2026-07-22T02:00:00Z" };
// Đơn vị cấp thấp gửi sau (tuần 30)
const bqT30: NguonSoSanh = { cap: 3, ky_bao_cao: "2026-07-27", ngay_gui: "2026-07-28T02:00:00Z" };
// Kỳ cũ nhưng bấm gửi muộn
const bqT28Muon: NguonSoSanh = { cap: 3, ky_bao_cao: "2026-07-13", ngay_gui: "2026-07-25T02:00:00Z" };
const tgdQd: NguonSoSanh = { cap: 1, ky_bao_cao: "2026-07-27", ngay_gui: "2026-07-28T09:30:00Z", la_quyet_dinh: true };
const benNgoai: NguonSoSanh = { cap: 9, ky_bao_cao: null, ngay_gui: "2026-07-30T02:00:00Z" };

describe("soSanhNguon · cấp trước (mặc định)", () => {
  const c = ch("cap_truoc");
  it("cùng cấp, ngày sau đè", () => {
    const k = soSanhNguon(bqT28, bqT29, c);
    expect(k.thang).toBe("moi");
    expect(k.ly_do).toContain("ngày sau đè");
  });
  it("cấp cao hơn đè", () => {
    const k = soSanhNguon(bqT29, dtpcT29, c);
    expect(k.thang).toBe("moi");
    expect(k.ly_do).toBe("cấp cao hơn đè");
  });
  it("cấp thấp gửi sau không đè được cấp cao", () => {
    const k = soSanhNguon(dtpcT29, bqT30, c);
    expect(k.thang).toBe("cu");
    expect(k.ly_do).toBe("thua cấp");
  });
  it("cùng cấp, kỳ cũ hơn thì thua ngày", () => {
    const k = soSanhNguon(bqT29, bqT28, c);
    expect(k.thang).toBe("cu");
    expect(k.ly_do).toContain("thua ngày");
  });
});

describe("soSanhNguon · ngày trước, cùng kỳ so cấp", () => {
  const c = ch("ngay_truoc");
  it("báo cáo mới hơn thắng kể cả cấp thấp", () => {
    const k = soSanhNguon(dtpcT29, bqT30, c);
    expect(k.thang).toBe("moi");
    expect(k.ly_do).toContain("ngày sau đè");
  });
  it("cùng kỳ thì cấp cao thắng", () => {
    expect(soSanhNguon(bqT29, dtpcT29, c)).toEqual({ thang: "moi", ly_do: "cùng kỳ, cấp cao hơn đè" });
    expect(soSanhNguon(dtpcT29, bqT29, c).thang).toBe("cu");
    expect(soSanhNguon(dtpcT29, bqT29, c).ly_do).toContain("thua cấp");
  });
  it("cũ hơn thì thua ngày dù cấp cao", () => {
    const k = soSanhNguon(bqT30, dtpcT29, c);
    expect(k.thang).toBe("cu");
    expect(k.ly_do).toContain("thua ngày");
  });
});

describe("soSanhNguon · chỉ theo cấp", () => {
  const c = ch("chi_cap");
  it("cấp cao đè, cấp thấp thua", () => {
    expect(soSanhNguon(bqT29, dtpcT29, c).thang).toBe("moi");
    expect(soSanhNguon(dtpcT29, bqT30, c).thang).toBe("cu");
  });
  it("cùng cấp giữ bản đến trước", () => {
    const k = soSanhNguon(bqT28, bqT29, c);
    expect(k.thang).toBe("cu");
    expect(k.ly_do).toContain("giữ bản đến trước");
  });
});

describe("soSanhNguon · chỉ theo ngày", () => {
  const c = ch("chi_ngay");
  it("bản mới nhất luôn thắng, không xét cấp", () => {
    expect(soSanhNguon(dtpcT29, bqT30, c).thang).toBe("moi");
    expect(soSanhNguon(bqT30, dtpcT29, c).thang).toBe("cu");
  });
});

describe("soSanhNguon · 'ngày sau' theo kỳ báo cáo hay ngày gửi", () => {
  it("theo kỳ: bản kỳ 28 gửi muộn vẫn thua bản kỳ 29", () => {
    const k = soSanhNguon(bqT29, bqT28Muon, ch("cap_truoc", "ky_bao_cao"));
    expect(k.thang).toBe("cu");
    expect(k.ly_do).toContain("kỳ");
  });
  it("theo ngày gửi: bản gửi muộn hơn thắng", () => {
    const k = soSanhNguon(bqT29, bqT28Muon, ch("cap_truoc", "ngay_gui"));
    expect(k.thang).toBe("moi");
    expect(k.ly_do).toContain("ngày gửi");
  });
  it("cùng kỳ: bản gửi sau đè (gửi lại bản sửa)", () => {
    const a: NguonSoSanh = { cap: 3, ky_bao_cao: "2026-07-20", ngay_gui: "2026-07-21T02:40:00Z" };
    const b: NguonSoSanh = { cap: 3, ky_bao_cao: "2026-07-20", ngay_gui: "2026-07-21T03:05:00Z" };
    expect(soSanhNguon(a, b, ch("cap_truoc")).thang).toBe("moi");
    expect(soSanhNguon(b, a, ch("cap_truoc")).thang).toBe("cu");
  });
  it("thiếu kỳ ở một bên thì so ngày gửi", () => {
    const a: NguonSoSanh = { cap: 3, ky_bao_cao: null, ngay_gui: "2026-07-21T02:40:00Z" };
    expect(soSanhNguon(a, bqT30, ch("cap_truoc")).thang).toBe("moi");
  });
});

describe("soSanhNguon · quyết định TGĐ và bên ngoài", () => {
  it("quyết định TGĐ đè tất cả, ở mọi thứ tự", () => {
    for (const t of ["cap_truoc", "ngay_truoc", "chi_cap", "chi_ngay"] as ThuTuUuTien[]) {
      const cuMoiHon: NguonSoSanh = { cap: 2, ky_bao_cao: "2026-08-31", ngay_gui: "2026-09-01T00:00:00Z" };
      const k = soSanhNguon(cuMoiHon, tgdQd, ch(t));
      expect(k.thang).toBe("moi");
      expect(k.ly_do).toContain("quyết định của Tổng Giám đốc");
    }
  });
  it("quyết định TGĐ đứng trên cấp: báo cáo Form 0 cùng cấp 1 gửi sau không đè được (cấp trước)", () => {
    const form0Sau: NguonSoSanh = { cap: 1, ky_bao_cao: "2026-08-03", ngay_gui: "2026-08-04T00:00:00Z" };
    const k = soSanhNguon(tgdQd, form0Sau, ch("cap_truoc"));
    expect(k.thang).toBe("cu");
    expect(k.ly_do).toContain("thua cấp");
  });
  it("chỉ theo ngày: bản mới hơn thắng cả quyết định cũ (như hình cài đặt)", () => {
    expect(soSanhNguon(tgdQd, { cap: 3, ky_bao_cao: "2026-08-03", ngay_gui: "2026-08-04T00:00:00Z" }, ch("chi_ngay")).thang).toBe("moi");
  });
  it("bên ngoài không đè được việc trong công ty", () => {
    for (const t of ["cap_truoc", "ngay_truoc", "chi_cap", "chi_ngay"] as ThuTuUuTien[]) {
      const k = soSanhNguon(bqT29, benNgoai, ch(t));
      expect(k.thang).toBe("cu");
      expect(k.ly_do).toContain("bên ngoài");
    }
  });
});

describe("tiện ích", () => {
  it("chuẩn hóa tiếng Việt bỏ dấu", () => {
    expect(chuanHoa("Chi trả GPMB Trụ T11 · ĐG Hướng Việt")).toBe("chi tra gpmb tru t11 dg huong viet");
  });
  it("độ giống: cùng việc viết khác vs việc khác", () => {
    const a = { ten: "GPMB Trụ T11 (3 hộ khiếu nại đơn giá)", du_an: "ĐG Hướng Việt" };
    const b = { ten: "GPMB trụ T11", du_an: "DG Huong Viet" };
    const c = { ten: "Thi công móng trụ T5–T8", du_an: "ĐG Hướng Việt" };
    expect(doGiongViec(a, b)).toBeGreaterThanOrEqual(0.6);
    expect(doGiongViec(a, c)).toBeLessThan(0.6);
  });
  it("K10 (chốt 02/10): khác dự án thì không gợi ý trùng; một bên không ghi dự án vẫn gợi ý", () => {
    const id = (s: string) => ({ "Nam Khiên 1": "nk1", "NK1": "nk1", "Hướng Linh 7": "hl7" })[s] ?? null;
    const a = { ten: "Rà soát HĐ EPC", du_an: "Nam Khiên 1" };
    expect(doGiongViec(a, { ten: "Rà soát HĐ EPC", du_an: "Hướng Linh 7" }, undefined, id)).toBe(0);
    expect(doGiongViec(a, { ten: "Rà soát HĐ EPC", du_an: "NK1" }, undefined, id)).toBeGreaterThanOrEqual(0.9); // tên gọi khác cùng dự án
    expect(doGiongViec(a, { ten: "Rà soát HĐ EPC" }, undefined, id)).toBeGreaterThanOrEqual(0.9);
    expect(doGiongViec({ ten: "Rà soát HĐ EPC", du_an: "TĐ Nam Khiên 1" }, { ten: "Rà soát HĐ EPC", du_an: "TĐ Nam Khiên 2" })).toBe(0);
  });
  it("mã việc theo mẫu cấu hình", () => {
    expect(dinhDangMaViec("CV-{nam}-{so:4}", 2026, 412)).toBe("CV-2026-0412");
  });
  it("việc luôn mở không bao giờ cảnh báo", () => {
    expect(tinhCanhBao({ trang_thai: "dang_mo", luon_mo: true }, [{ trang_thai: "dang_lam", ket_thuc: null }], "2030-01-01", 3)).toBeNull();
    expect(tinhCanhBao({ trang_thai: "dang_mo", luon_mo: false }, [{ trang_thai: "dang_lam", ket_thuc: "2026-08-05" }], "2026-08-06", 3)).toBe("qua_han");
    expect(tinhCanhBao({ trang_thai: "dang_mo", luon_mo: false }, [{ trang_thai: "dang_lam", ket_thuc: "2026-08-05" }], "2026-08-03", 3)).toBe("sap_den_han");
    expect(tinhCanhBao({ trang_thai: "dang_mo", luon_mo: false }, [{ trang_thai: "da_ket_thuc", ket_thuc: "2026-08-05" }], "2026-08-10", 3)).toBeNull();
  });
});
