// Từ điển ngữ cảnh Main tự ghép (CHOT LOI-DUNG-CHUNG 6g.7 mục 5 — Mr. Đại chốt 04/10/2026)
import { describe, it, expect } from "vitest";
import { ghepTuDien, tachTuDienCu } from "@/lib/tu-dien-ghep";
import type { DonViToChuc } from "@/lib/to-chuc-kieu";

const CU = [
  "CƠ CẤU TỔ CHỨC",
  "1. File này để làm gì",
  "Nạp vào Agent Base…",
  "2. Tập đoàn và các công ty thành viên",
  "CÔNG TY CỔ PHẦN SCI — mã S99",
  "SCI QT · QT",
  "3. GIẢI MÃ TIỀN TỐ KHÔNG GIAN TRÊN BASE.VN",
  "QT = SCI Quảng Trị",
  "4. Ba dự án Ban QLDA đang quản",
  "HV · TT · BT",
  "5. Danh mục dự án SCI Group đã và đang triển khai",
  "Thủy điện Sơn La — 2.400 MW",
  "6. Chỗ để bổ sung",
  "Phần dưới để trống cho Mr. Đại điền thêm. Sửa xong thì nạp lại — AI đọc bản mới nhất.",
  "VL — Công ty Việt Lào",
].join("\n");

const dv = (x: Partial<DonViToChuc>): DonViToChuc => ({
  id: "x",
  ten: "X",
  ten_ngan: "X",
  cap: 2,
  cha_id: null,
  loai: "phong",
  thu_tu: 0,
  active: true,
  chuc_danh: null,
  chuc_danh_ngan: null,
  chuc_nang: null,
  uy_quyen_truong: null,
  ...x,
});

describe("tách ô gõ tay cũ", () => {
  it("A = thân mục 2; D = mục 5 (năng lực tập đoàn) + thân mục 6; bỏ mục 1, 3 (tiền tố Base.vn), 4", () => {
    const t = tachTuDienCu(CU);
    expect(t.congTy).toBe("CÔNG TY CỔ PHẦN SCI — mã S99\nSCI QT · QT");
    expect(t.boSung).toContain("5. Danh mục dự án SCI Group đã và đang triển khai");
    expect(t.boSung).toContain("Thủy điện Sơn La — 2.400 MW");
    expect(t.boSung).toContain("VL — Công ty Việt Lào");
    expect(t.boSung).not.toContain("Phần dưới để trống");
    expect(t.congTy + t.boSung).not.toMatch(/BASE\.VN|Ba dự án Ban QLDA|Nạp vào Agent Base/);
  });

  it("không nhận ra khuôn → không mất chữ: dồn hết vào Chỗ bổ sung", () => {
    expect(tachTuDienCu("ghi chú tự do")).toEqual({ congTy: "", boSung: "ghi chú tự do" });
  });
});

describe("ghép từ điển", () => {
  const ra = ghepTuDien({
    congTy: "SCI — công ty mẹ",
    boSung: "VL — Việt Lào",
    duAn: [
      { name: "Dự án demo" },
      { ma: "HV", name: "Điện gió Hướng Việt", tenKhac: ["ĐG HV"], nhom: "sci", donVi: ["bqlda-qt", "sci-pmc"], banDieuHanh: "bdh-hv" },
      { ma: "N3A", name: "Nậm Sam 3A", nhom: "khac", donVi: ["sci-enc"] },
    ],
    donVi: [
      dv({ id: "ban-tgd", ten: "Ban Tổng giám đốc", ten_ngan: "Ban TGĐ", cap: 1 }),
      dv({ id: "bqlda-qt", ten: "Ban Quản lý dự án Quảng Trị", ten_ngan: "BQLDA QT", cha_id: "ban-tgd", chuc_nang: "Quản lý dự án điện gió\nở Quảng Trị", uy_quyen_truong: "a@sci" }),
      dv({ id: "sci-pmc", ten: "SCI PMC", ten_ngan: "SCI PMC", cha_id: "ban-tgd", thu_tu: 1 }),
      dv({ id: "cu", ten: "Phòng đã giải thể", active: false }),
    ],
    kiemNhiem: [{ nguoi_id: "b@sci", don_vi_id: "sci-pmc", chuc_vu: "Phó GĐ" }],
    nguoi: [
      { id: "a@sci", name: "Nguyễn A", donViId: "bqlda-qt", vaiCongViec: ["truong-don-vi"] },
      { id: "b@sci", name: "Trần B", donViId: "bqlda-qt" },
      { id: "c@sci", name: "Lê C", donViId: "sci-pmc", vaiCongViec: ["truong-don-vi"] },
    ],
    luc: "04/10/2026 12:00",
  });

  it("đủ 4 phần theo thứ tự A → B → C → D", () => {
    const i = ["A. TẬP ĐOÀN", "B. DỰ ÁN", "C. SƠ ĐỒ TỔ CHỨC", "D. BỔ SUNG"].map((k) => ra.indexOf(k));
    expect(i.every((x) => x >= 0)).toBe(true);
    expect([...i].sort((a, b) => a - b)).toEqual(i);
    expect(ra).toContain("SCI — công ty mẹ");
    expect(ra).toContain("VL — Việt Lào");
  });

  it("B: chỉ dự án có mã ngắn; SCI đầu tư ghi Ban QLDA = đơn vị đầu, đơn vị làm, Ban điều hành; tên đơn vị thay mã", () => {
    expect(ra).toContain("(2 dự án)");
    expect(ra).not.toContain("Dự án demo");
    expect(ra).toContain("- HV — Điện gió Hướng Việt · tên khác: ĐG HV · SCI đầu tư · Ban QLDA: BQLDA QT (Ban Quản lý dự án Quảng Trị) · đơn vị làm: SCI PMC · Ban điều hành: bdh-hv");
    expect(ra).toContain("- N3A — Nậm Sam 3A · Loại khác · đơn vị làm: sci-enc");
  });

  it("C: cây theo cấp, người đứng đầu (trưởng chính trước), chức năng nhiệm vụ một dòng, bỏ đơn vị ngừng, kiêm nhiệm", () => {
    expect(ra).toContain("(3 đơn vị)");
    expect(ra).toContain("- Ban Tổng giám đốc (Ban TGĐ)");
    expect(ra).toContain("  - Ban Quản lý dự án Quảng Trị (BQLDA QT) — đứng đầu: Nguyễn A");
    expect(ra).toContain("    Chức năng nhiệm vụ: Quản lý dự án điện gió ở Quảng Trị");
    expect(ra).toContain("  - SCI PMC — đứng đầu: Lê C");
    expect(ra).not.toContain("Phòng đã giải thể");
    expect(ra).toContain("- Trần B — Phó GĐ — SCI PMC");
  });
});
