// Báo cáo tuần — CODE TÍNH SỐ (Mr. Đại duyệt demo 30/09/2026). Hàm thuần: cùng đầu vào → cùng đáp số.
import { describe, it, expect } from "vitest";
import { tinhBaoCaoTuan, heSoTre, hanViec, type DauVaoTinh, type ViecTinh } from "@/lib/bao-cao-tuan/tinh";

const CH = { don_vi_danh_gia: ["p-dtpc", "p-tckt", "bqlda-lao"], nguong_qua_tai: 20, nguong_can_bang: 8, nguong_tre: 25, tre_muc_1: 7, tre_muc_2: 30 };
const v = (ma: string, x: Partial<ViecTinh> & { ct: string; loai?: "nguoi" | "don_vi"; ph?: string[] }): ViecTinh => ({
  ma, ten: x.ten ?? `Việc ${ma}`, du_an: x.du_an ?? null, trang_thai: x.trang_thai ?? "dang_mo", ket_thuc: x.ket_thuc ?? null, bat_dau: null,
  luon_mo: false, tao_ngay: x.tao_ngay ?? "2026-09-01", xong_ngay: x.xong_ngay ?? null, nguon: null, diem: x.diem === undefined ? 4 : x.diem,
  pt: [{ loai: x.loai ?? "don_vi", id: x.ct, vai: "chu_tri", xong: x.trang_thai === "hoan_thanh", ket_thuc: x.ket_thuc ?? null },
    ...(x.ph ?? []).map((id) => ({ loai: "don_vi" as const, id, vai: "phoi_hop" as const, xong: false, ket_thuc: null }))],
});
const dauVao = (viec: ViecTinh[]): DauVaoTinh => ({
  tuan: { so: 40, tu: "2026-09-28", den: "2026-10-04" },
  hom_nay: "2026-09-30",
  viec,
  don_vi: [
    { id: "ban-tgd", ten: "Ban TGĐ", ten_ngan: "Ban TGĐ", loai: "ban_tgd", cap: 1 },
    { id: "bld-ptgd", ten: "PTGĐ", ten_ngan: "PTGĐ", loai: "chuc_danh", cap: 1 },
    { id: "p-dtpc", ten: "Phòng ĐT&PC", ten_ngan: "P.ĐT&PC", loai: "phong", cap: 2 },
    { id: "p-tckt", ten: "Phòng TCKT", ten_ngan: "P.TCKT", loai: "phong", cap: 2 },
    { id: "bqlda-lao", ten: "BQLDA Lào", ten_ngan: "BQLDA Lào", loai: "don_vi", cap: 3 },
    { id: "sci-pmc", ten: "SCI PMC", ten_ngan: "SCI PMC", loai: "don_vi", cap: 3 },
  ],
  nguoi: [
    { id: "a", don_vi_id: "p-dtpc", don_vi_ids: ["p-dtpc"] },
    { id: "b", don_vi_id: "p-dtpc", don_vi_ids: ["p-dtpc"] },
    { id: "c", don_vi_id: "p-tckt", don_vi_ids: ["p-tckt", "p-dtpc"] }, // kiêm nhiệm P.ĐT&PC
    { id: "d", don_vi_id: "bld-ptgd", don_vi_ids: ["bld-ptgd"] },
  ],
  nop: [{ don_vi_id: "p-dtpc", luc: "2026-09-29T23:00", so_lan: 2, tai_lieu_id: "tl1" }],
  han_nop: { "ban-tgd": "2026-10-05T10:00", "p-dtpc": "2026-10-03T10:00", "p-tckt": "2026-10-03T10:00", "bqlda-lao": "2026-10-03T08:00", "sci-pmc": "2026-10-03T08:00" },
  ch: CH,
});

describe("báo cáo tuần — code tính số", () => {
  const kq = tinhBaoCaoTuan(dauVao([
    v("V1", { ct: "p-dtpc", diem: 13, ket_thuc: "2026-07-28" }), // trễ 64 ngày → ×3 = 39
    v("V2", { ct: "p-dtpc", diem: 8, ket_thuc: "2026-10-20" }),
    v("V3", { ct: "a", loai: "nguoi", diem: 4, ket_thuc: "2026-09-25" }), // giao đích danh → về P.ĐT&PC; trễ 5 ngày ×1
    v("V4", { ct: "p-tckt", diem: 4, trang_thai: "hoan_thanh", ket_thuc: "2026-10-03", xong_ngay: "2026-09-29", tao_ngay: "2026-09-28" }),
    v("V5", { ct: "p-tckt", diem: 8, trang_thai: "hoan_thanh", ket_thuc: "2026-09-27", xong_ngay: "2026-09-29" }), // xong trễ
    v("V6", { ct: "bld-ptgd", diem: 2, ket_thuc: "2026-10-10", ph: ["p-tckt"] }),
    v("V7", { ct: "p-dtpc", ten: "Test giao PMC", diem: 1, ket_thuc: "2026-01-01" }), // việc thử: không vào điểm
    v("V8", { ct: "sci-pmc", diem: 8, ket_thuc: "2026-08-01", ten: "Trình TGĐ phê duyệt TKCS" }),
    v("V9", { ct: "p-dtpc", diem: null, ket_thuc: "2026-11-01", tao_ngay: "2026-09-30" }), // chưa chấm → tạm 2
  ]));
  const dong = (id: string) => kq.don_vi.find((r) => r.ma === id)!;
  it("nhân sự thật = tài khoản kể cả kiêm nhiệm; BLĐ tính tập thể", () => {
    expect(dong("p-dtpc").nhan_su).toBe(3);
    expect(dong("p-tckt").nhan_su).toBe(1);
    expect(dong("bld").nhan_su).toBe(1);
  });
  it("tải, tải/người, nợ quá hạn theo điểm × hệ số trễ; việc giao đích danh về đơn vị người đó; việc thử không tính", () => {
    const r = dong("p-dtpc");
    expect(r.tai).toBe(13 + 8 + 4 + 2);
    expect(r.so_mo).toBe(4);
    expect(r.tai_nguoi).toBe(9);
    expect(r.no).toBe(13 * 3 + 4 * 1);
    expect(r.so_qua_han).toBe(2);
    expect(r.vung).toBe("can_bang");
    expect(r.moi).toBe(1);
  });
  it("xong tuần + đúng hạn theo điểm; phối hợp đếm riêng", () => {
    const r = dong("p-tckt");
    expect(r.san_luong).toBe(12);
    expect(r.so_xong).toBe(2);
    expect(r.dung_han).toBe(33); // 4 / 12
    expect(r.phoi_hop).toBe(1);
    expect(dong("bld").vung).toBe("tap_the");
    expect(dong("bqlda-lao").vung).toBe("chua_du");
  });
  it("4 ô số toàn công ty tính cả việc thử và đơn vị không đánh giá", () => {
    expect(kq.the).toMatchObject({ dang_mo: 7, qua_han: 4, xong: 2, moi: 2, nop: 1, tong_don_vi: 5 }); // Ban TGĐ + 2 phòng + 2 đơn vị cấp 3
    expect(kq.chua_cham).toBe(1);
  });
  it("điểm nóng xếp theo nợ; ứng viên cần quyết lọc theo chữ + việc nặng trễ lâu", () => {
    expect(kq.nong.map((x) => x.ma)).toEqual(["V1", "V8", "V3"]);
    expect(kq.ung_vien_quyet).toEqual(expect.arrayContaining(["V1", "V8"]));
    expect(kq.nong.some((x) => x.ma === "V7")).toBe(false);
  });
  it("nộp báo cáo theo cấp: giờ nộp so với hạn", () => {
    const c2 = kq.nop.find((c) => c.cap === 2)!;
    expect(c2.don_vi.find((d) => d.id === "p-dtpc")!.truoc_han_gio).toBe(83);
    expect(c2.don_vi.find((d) => d.id === "p-tckt")!.nop).toBeNull();
  });
  it("hệ số trễ và hạn việc", () => {
    expect([0, 1, 7, 8, 30, 31].map((t) => heSoTre(t, CH))).toEqual([0, 1, 1, 2, 2, 3]);
    expect(hanViec(v("X", { ct: "p-dtpc", ket_thuc: "2026-10-01" }))).toBe("2026-10-01");
  });
});

describe("tuần đã qua — số chốt tại ngày hom_nay", () => {
  it("bỏ việc vào sổ sau ngày chốt, coi việc xong sau ngày chốt là còn mở", () => {
    const g = dauVao([
      v("CV-1", { ct: "p-dtpc" }),
      v("CV-SAU", { ct: "p-dtpc", tao_ngay: "2026-10-02" }),
      v("CV-XONG-SAU", { ct: "p-dtpc", trang_thai: "hoan_thanh", xong_ngay: "2026-10-02" }),
    ]);
    const kq = tinhBaoCaoTuan({ ...g, tuan: { so: 39, tu: "2026-09-21", den: "2026-09-27" }, hom_nay: "2026-09-27" });
    expect(kq.viec["CV-SAU"]).toBeUndefined();
    expect(kq.the.dang_mo).toBe(2);
    expect(kq.viec["CV-XONG-SAU"].xong_ngay).toBeNull();
    expect(kq.don_vi.find((r) => r.ma === "p-dtpc")?.tai).toBe(8);
  });
});

describe("cách A — % trễ, làm ra/người, vùng ghép", () => {
  it("% trễ = điểm việc quá hạn ÷ điểm việc đang làm; từ ngưỡng 25% là trễ nhiều", () => {
    const kq = tinhBaoCaoTuan(dauVao([
      v("CV-A", { ct: "p-dtpc", diem: 8, ket_thuc: "2026-09-10" }),
      v("CV-B", { ct: "p-dtpc", diem: 8 }),
      v("CV-C", { ct: "p-dtpc", diem: 4, trang_thai: "hoan_thanh", xong_ngay: "2026-09-29" }),
    ]));
    const r = kq.don_vi.find((x) => x.ma === "p-dtpc")!;
    expect(r.diem_tre).toBe(8);
    expect(r.pt_tre).toBe(50);
    expect(r.tre_nhieu).toBe(true);
    expect(r.lam_ra_nguoi).toBe(Math.round((10 * 4) / r.nhan_su) / 10);
  });
});

describe("dự án — chỉ dự án SCI đầu tư", () => {
  it("việc không thuộc dự án SCI đầu tư không vào thống kê dự án nhưng vẫn vào điểm nóng", () => {
    const kq = tinhBaoCaoTuan(dauVao([
      { ...v("CV-1", { ct: "p-dtpc", diem: 8, ket_thuc: "2026-09-10" }), du_an_sci: "Hướng Việt" },
      v("CV-2", { ct: "p-dtpc", diem: 8, ket_thuc: "2026-09-10", du_an: "Hướng Phùng 1" }),
    ]));
    expect(kq.du_an.map((d) => d.ten)).toEqual(["Hướng Việt"]);
    expect(kq.nong.map((n) => n.ma).sort()).toEqual(["CV-1", "CV-2"]);
  });
});
