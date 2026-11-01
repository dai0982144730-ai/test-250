// Đọc ô ngày dạng chữ "theo việc khác" (so-cai/moc-viec.ts) + dạng mã việc theo cài đặt.
import { describe, it, expect } from "vitest";
import { diemKhopTen, docMocViec, NGUONG_KHOP_MOC } from "@/lib/so-cai/moc-viec";
import { dinhDangMaViec, maDuAn } from "@/lib/so-cai/tien-ich";

describe("docMocViec", () => {
  it("bắt đầu sau khi xong 2 việc (tên)", () => {
    const m = docMocViec("Sau khi làm xong 2 việc làm ván khuôn và làm cốt pha");
    expect(m?.so_ngay).toBe(0);
    expect(m?.viec.map((v) => v.ten)).toEqual(["làm ván khuôn", "làm cốt pha"]);
  });

  it("theo mã việc", () => {
    const m = docMocViec("Sau CV-2026-0012, cv-2026-0013");
    expect(m?.viec).toEqual([
      { ma: "CV-2026-0012", ten: "CV-2026-0012" },
      { ma: "CV-2026-0013", ten: "CV-2026-0013" },
    ]);
  });

  it("kết thúc N ngày tính từ khi (sự kiện)", () => {
    const m = docMocViec("Kết thúc làm hồ sơ sau 2 ngày tính từ khi làm việc với đối tác MAC");
    expect(m?.so_ngay).toBe(2);
    expect(m?.viec.map((v) => v.ten)).toEqual(["làm việc với đối tác MAC"]);
  });

  it("N ngày sau khi xong X / X + N ngày", () => {
    expect(docMocViec("3 ngày sau khi xong đổ bê tông")).toMatchObject({ so_ngay: 3, viec: [{ ten: "đổ bê tông" }] });
    expect(docMocViec("CV-2026-0012 + 5 ngày")).toMatchObject({ so_ngay: 5, viec: [{ ma: "CV-2026-0012" }] });
    // Tên việc có tên thiết bị dạng mã (HL-07) vẫn là TÊN, không phải mã việc (Mr. Đại test 29/09)
    const hl = docMocViec("Sau khi xong Kiểm tra chuyên sâu inverter tuabin HL-07");
    expect(hl?.viec).toEqual([{ ten: "Kiểm tra chuyên sâu inverter tuabin HL-07" }]);
  });

  it("tên việc có chữ 'sâu' không bị hiểu nhầm là từ khóa", () => {
    expect(docMocViec("Sau khi xong đào móng sâu")?.viec.map((v) => v.ten)).toEqual(["đào móng sâu"]);
  });

  it("không có từ khóa → null (vẫn báo sai dạng ngày)", () => {
    expect(docMocViec("tuần sau")).toBeNull();
    expect(docMocViec("15/13/2026")).toBeNull();
    expect(docMocViec("")).toBeNull();
  });

  it("khớp tên mốc với tên việc", () => {
    expect(diemKhopTen("ván khuôn", "Làm ván khuôn tầng 3")).toBeGreaterThanOrEqual(NGUONG_KHOP_MOC);
    expect(diemKhopTen("làm ván khuôn", "Ván khuôn tầng 3")).toBeGreaterThanOrEqual(NGUONG_KHOP_MOC);
    expect(diemKhopTen("cốt pha", "Đổ bê tông móng M1")).toBeLessThan(NGUONG_KHOP_MOC);
  });
});

describe("dạng mã việc", () => {
  it("giữ đúng dạng cũ", () => {
    expect(dinhDangMaViec("CV-{nam}-{so:4}", 2026, 412)).toBe("CV-2026-0412");
  });
  it("theo tháng, đơn vị, dự án", () => {
    const ct = { thang: 9, don_vi: "bqlda-qt", du_an: "Điện gió Hướng Việt" };
    expect(dinhDangMaViec("CV-{nam}{thang}-{so:3}", 2026, 12, ct)).toBe("CV-202609-012");
    expect(dinhDangMaViec("{don_vi}-{nam}-{so:4}", 2026, 12, ct)).toBe("BQLDA-QT-2026-0012");
    expect(dinhDangMaViec("{du_an}-{so:4}", 2026, 12, ct)).toBe("DGHV-0012");
  });
  it("mã dự án", () => {
    expect(maDuAn("Điện gió Hướng Việt")).toBe("DGHV");
    expect(maDuAn("Nậm Xe")).toBe("NX");
    expect(maDuAn("HuongViet")).toBe("HUON");
    expect(maDuAn(null)).toBe("CHUNG");
  });
});
