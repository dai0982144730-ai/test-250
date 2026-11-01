import { describe, expect, it } from "vitest";
import { dungTuanKhac, thuHaiTuanIso } from "@/lib/bang-dieu-hanh/tuan-khac";
import type { SCurvePoint } from "@/lib/scurve-kieu";

// Số thật Hướng Việt đo 27/10/2026 (tiendo.s_curve, nguon_luc_huy_dong, so_tuan)
const diem: SCurvePoint[] = [
  { week: "W39", ngay: "2026-09-21", ngayDauTuan: "2026-09-21", target: 10.5, baseline: 7.9, actual: 1.7, lechNgay: { baseline: -7, thucTe: -35 } },
  { week: "W40", ngay: "2026-09-28", ngayDauTuan: "2026-09-28", target: 12.8, baseline: 10, actual: 2.6, lechNgay: { baseline: -7, thucTe: -35 } },
  { week: "W41", ngay: "2026-10-05", ngayDauTuan: "2026-10-05", target: 15, baseline: 12.8, actual: 3.4, lechNgay: { baseline: -7, thucTe: -36 } },
  { week: "W41", ngay: "2026-10-11", ngayDauTuan: "2026-10-05", nhan: "ngày cắt dữ liệu", target: 17.3, baseline: 15.7, actual: 4.6, lechNgay: { baseline: -5, thucTe: -39 } },
  { week: "W43", ngay: "2026-10-19", ngayDauTuan: "2026-10-19", target: 19.6, baseline: 18.7, forecast: 5.6 },
];

const thuocDo = [
  { ten: "Tiến độ thực tế lũy kế", truoc: "1,0%", nay: "1,3%", ghiChu: "✅ 0 việc xong · 🆕 0 việc bắt đầu" },
  { ten: "COD dự báo", truoc: "—", nay: "—", ghiChu: "Chưa tính được: chưa lưu đủ COD hai tuần này" },
  { ten: "Cảnh báo", truoc: "—", nay: "—", ghiChu: "Chưa tính được: cần chạy bộ cảnh báo của cả hai tuần" },
];

const nguonLuc = {
  truoc: [
    { thauPhu: "Điện 8", nhanCong: 8, may: 2 },
    { thauPhu: "TS", nhanCong: 30, may: 7 },
  ],
  nay: [
    { thauPhu: "Điện 8", nhanCong: 8, may: 2 },
    { thauPhu: "SNP", nhanCong: 10, may: 2 },
    { thauPhu: "TS", nhanCong: 25.7, may: 6 },
  ],
  loi: null,
};

describe("«Tuần này khác tuần trước» (Bảng điều hành)", () => {
  it("tuần ISO → thứ Hai", () => {
    expect(thuHaiTuanIso("2026-W41")).toBe("2026-10-05");
    expect(thuHaiTuanIso("2026-W01")).toBe("2025-12-29");
  });

  const m = dungTuanKhac({ tuanTruoc: "2026-W40", tuanNay: "2026-W41", thuocDo, diem, nguonLuc })!;

  it("dùng số S-Curve (3,4% → 4,6%), không dùng số so_tuan (1,0% → 1,3%)", () => {
    const h = m.bang.find((x) => x.ten === "Khối lượng thực tế lũy kế")!;
    expect(h.truoc).toBe("3,4%");
    expect(h.nay).toBe("4,6%");
    expect(h.doi).toBe("+1,2 điểm");
  });

  it("chậm so Tiến độ mục tiêu 36 → 39 ngày; so Baseline = lệch Baseline − lệch thực tế (29 → 34 ngày)", () => {
    const a = m.bang.find((x) => x.ten === "Chậm so với Tiến độ mục tiêu")!;
    expect([a.truoc, a.nay, a.doi]).toEqual(["36 ngày", "39 ngày", "+3 ngày"]);
    const b = m.bang.find((x) => x.ten === "Chậm so với Baseline")!;
    expect([b.truoc, b.nay, b.doi]).toEqual(["29 ngày", "34 ngày", "+5 ngày"]);
  });

  it("nhân công, máy cộng theo thầu phụ; thầu phụ mới có báo cáo được nêu tên", () => {
    const nc = m.bang.find((x) => x.ten === "Nhân công bình quân")!;
    expect([nc.truoc, nc.nay, nc.doi]).toEqual(["38 người", "43,7 người", "+5,7 người"]);
    expect(nc.soVoi).toContain("SNP");
    expect(m.bang.find((x) => x.ten === "Máy chính bình quân")!.nay).toBe("10");
  });

  it("thước đo chưa tính được gom MỘT dòng", () => {
    expect(m.chuaTinh).toContain("Chưa tính được 2 thước đo");
    expect(m.bang.some((x) => x.truoc === "—" && x.nay === "—")).toBe(false);
  });

  it("6 cột, hai tuần đang so được tô vai trò", () => {
    expect(m.cot).toHaveLength(6);
    expect(m.cot[4]!.vaiTro).toBe("truoc");
    expect(m.cot[5]!.vaiTro).toBe("nay");
    expect(m.cot[5]!.lamThem).toBeCloseTo(1.2, 5);
    expect(m.cot[4]!.lamThem).toBeCloseTo(0.8, 5);
  });

  it("kết luận nói rõ so với hệ nào, không dùng %", () => {
    const cau = m.ketLuan.join("\n");
    expect(cau).toContain("So với Tiến độ mục tiêu");
    expect(cau).toContain("so với Baseline");
    expect(cau).toContain("SNP");
  });

  it("không có điểm S-Curve → không dựng (không đoán)", () => {
    expect(dungTuanKhac({ tuanTruoc: "2026-W40", tuanNay: "2026-W41", thuocDo, diem: [], nguonLuc })).toBeNull();
  });
});
