// Cổng /api/mcp/base của agent Công việc (nhận vai agent Base 04/10/2026) — phần THUẦN: tra dự án, một mã, tải việc, cờ găng,
// cửa "Ai được gọi ai" chép từ Base. Không đụng CSDL, không đụng mạng.
import { describe, it, expect } from "vitest";
import { gomTheoWbs, type ViecCay } from "@/lib/cay-viec/thuan";
import {
  traDuAnTrongDanhSach,
  traMotMa,
  khopNguoi,
  truongNguoi,
  moiViec,
  tongHopTaiTheoNguoi,
  trenDuongGangCuaThe,
  tapViecGangLa,
} from "@/lib/mcp/cong-base-thuan";
import { xetQuyenGoi } from "@/lib/mcp/cua-ma-tran";

const DA = [
  { id: "HV", ten: "Điện gió Hướng Việt", ma_tien_do: "HV", ten_khac: ["Hướng Việt"] },
  { id: "TT", ten: "Tân Thành", ma_tien_do: "TT", ten_khac: [] },
  { id: "NK1", ten: "Nam Khian 1", ma_tien_do: null, ten_khac: [] },
  { id: "NK2", ten: "Nam Khian 2", ma_tien_do: null, ten_khac: [] },
];

const v = (o: Partial<ViecCay> & { id: string }): ViecCay => ({
  ten: o.id,
  nguoiPhuTrach: "",
  loaiPhuTrach: null,
  tenNguoi: "",
  daXong: false,
  han: null,
  quaHanNgay: null,
  namImNgay: null,
  link: "",
  duongGanMa: null,
  maWbs: null,
  duyetDuoc: false,
  ...o,
});

describe("tra dự án — không bao giờ lấy dự án khác ra thay", () => {
  it("mã ngắn (không phân biệt hoa thường), mã cũ da-hv, tên có dấu, slug Tiến độ", () => {
    const ma = (s: string) => {
      const r = traDuAnTrongDanhSach(s, DA);
      return r.ok ? r.duAn.id : r.loi.ok ? "?" : r.loi.ma_loi;
    };
    expect(ma("hv")).toBe("HV");
    expect(ma("da-hv")).toBe("HV");
    expect(ma("Tân Thành")).toBe("TT");
    expect(ma("tan-thanh")).toBe("TT");
    expect(ma("dien-gio-huong-viet-hv-du-lieu")).toBe("HV");
    expect(ma("Nam Khian")).toBe("KHONG_HIEU_YEU_CAU"); // trúng 2 dự án → bắt ghi rõ
    expect(ma("XYZ")).toBe("KHONG_CO_DU_LIEU");
    expect(ma("")).toBe("KHONG_HIEU_YEU_CAU");
  });
  it("câu báo mã đang có ghi MÃ KÈM TÊN (luật 30)", () => {
    const r = traDuAnTrongDanhSach("XYZ", DA);
    expect(!r.ok && !r.loi.ok && r.loi.thong_diep).toContain("HV Điện gió Hướng Việt");
  });
});

describe("base.co_viec_cho_ma_khong — một mã trên sổ cái", () => {
  const ds = [
    v({ id: "CV-1", maWbs: "7.2.3", duongGanMa: "nguoi", nguoiPhuTrach: "bqlda-qt", loaiPhuTrach: "don_vi", tenNguoi: "BQLDA Quảng Trị" }),
    v({ id: "CV-2", maWbs: "6.1.4", duongGanMa: "ai", aiGanChuaSoat: true, nguoiPhuTrach: "a@x.vn", loaiPhuTrach: "nguoi", tenNguoi: "A" }),
    v({ id: "CV-3", maWbs: "1.2.1", duongGanMa: "ai", daXong: true }),
    v({ id: "CV-4", maWbs: "9.9", duongGanMa: "nguoi" }),
  ];
  const g = gomTheoWbs(ds);
  const kl = (ma: string) => traMotMa(g, ma, 20).duLieu.ket_luan;
  it("đã có người · đã xong hết · chưa ai nhận", () => {
    expect(kl("7.2.3")).toBe("DA_CO_NGUOI_NHAN");
    expect(kl("HV.7.2.3")).toBe("DA_CO_NGUOI_NHAN"); // bỏ tiền tố dự án
    expect(kl("hv.7.2.3")).toBe("DA_CO_NGUOI_NHAN"); // tiền tố chữ thường (kiểm độc lập lần 3 #11)
    expect(kl("1.2.1")).toBe("DA_XONG_HET");
    expect(kl("9.9")).toBe("CHUA_AI_NHAN");
  });
  it("mã 🤖 CHỜ DUYỆT không tính là đã gắn (chốt 03/10) → KHONG_TIM_THAY_MA, đếm khai null chứ không 0", () => {
    const r = traMotMa(g, "6.1.4", 20).duLieu;
    expect(r.ket_luan).toBe("KHONG_TIM_THAY_MA");
    expect(r.so_viec_dang_mo).toBeNull();
    expect((r.pham_vi_da_soat as { so_viec_ma_cho_duyet: number }).so_viec_ma_cho_duyet).toBe(1);
  });
  it("mã 10.2 không bị cắt nhầm thành tiền tố dự án", () => {
    expect(traMotMa(g, "10.2", 20).duLieu.ma_he_thong).toBe("10.2");
  });
  it("mọi việc đếm một lần, kể cả việc chưa gắn", () => {
    expect(moiViec(g).map((x) => x.id).sort()).toEqual(["CV-1", "CV-2", "CV-3", "CV-4"]);
  });
});

describe("người phụ trách — mã kèm tên, lọc theo mã hoặc tên bỏ dấu", () => {
  const x = v({ id: "CV-9", nguoiPhuTrach: "truong.cd@scigroup.vn", loaiPhuTrach: "nguoi", tenNguoi: "Bùi Quế Lâm" });
  it("lọc", () => {
    expect(khopNguoi(x, "@truong.cd")).toBe(true);
    expect(khopNguoi(x, "que lam")).toBe(true);
    expect(khopNguoi(x, "thinh")).toBe(false);
  });
  it("chưa giao → ba trường null", () => {
    expect(truongNguoi(v({ id: "CV-0" }))).toEqual({ nguoi_phu_trach: null, ten_nguoi_phu_trach: null, loai_phu_trach: null });
    expect(truongNguoi(x)).toEqual({ nguoi_phu_trach: "truong.cd@scigroup.vn", ten_nguoi_phu_trach: "Bùi Quế Lâm", loai_phu_trach: "nguoi" });
  });
});

describe("tải việc theo người + cờ găng (chép Base)", () => {
  it("găng ↓ → quá hạn ↓; nhóm chưa giao có ma_base null", () => {
    const ds = tongHopTaiTheoNguoi(
      [
        { id: "1", ten: "a", nguoiPhuTrach: "p1", daXong: false, han: "2026-09-01", quaHanNgay: 30, maWbs: [] },
        { id: "2", ten: "b", nguoiPhuTrach: "p2", daXong: false, han: "2026-10-06", quaHanNgay: 0, maWbs: ["7.1"] },
        { id: "3", ten: "c", nguoiPhuTrach: "", daXong: false, han: null, quaHanNgay: null, maWbs: [] },
      ],
      new Set(["7.1"]),
      "2026-10-04",
    );
    expect(ds.map((d) => d.ma_base)).toEqual(["p2", "p1", null]);
    expect(ds[0]!.sap_han_7_ngay).toBe(1);
  });
  it("tren_duong_gang: luật 3 luôn true; không hỏi được Tiến độ → null; việc LÁ găng mới tính", () => {
    const gang = tapViecGangLa([{ wbs: "7", critical: true }, { wbs: "7.1", critical: true }, { wbs: "8", critical: false }]);
    expect([...gang]).toEqual(["7.1"]);
    expect(trenDuongGangCuaThe({ nguon: "gang" }, null)).toBe(true);
    expect(trenDuongGangCuaThe({ wbs: "7.1" }, null)).toBeNull();
    expect(trenDuongGangCuaThe({ wbs: "người:x", wbsLienQuan: ["7.1"] }, gang)).toBe(true);
    expect(trenDuongGangCuaThe({ wbs: "7" }, gang)).toBe(false);
  });
});

describe("cửa Ai được gọi ai — chép nguyên Base", () => {
  const ban = { luc: Date.now(), goiToi: [{ ma: "tiendo", duoc: true, lyDo: "" }, { ma: "hopdong", duoc: false, lyDo: "Ô hopdong → base đang tắt" }, { ma: "quansat", duoc: true, lyDo: "" }] };
  const xet = (agentGoi: string, congCu: string, coKhoaNoiBo = false) => xetQuyenGoi({ agentGoi, maNay: "base", congCu, coKhoaNoiBo, ban, banCu: false });
  it("suc_khoe không qua ma trận; ô tắt bị chặn; mã lạ cần khoá nội bộ; quansat chỉ đọc", () => {
    expect(xet("ai-do", "suc_khoe").duoc).toBe(true);
    expect(xet("tiendo", "base.viec_qua_han").duoc).toBe(true);
    expect(xet("hopdong", "base.viec_qua_han").duoc).toBe(false);
    expect(xet("do-kiem", "base.viec_qua_han").duoc).toBe(false);
    expect(xet("do-kiem", "base.viec_qua_han", true).duoc).toBe(true);
    expect(xet("quansat", "base.viec_qua_han", true).duoc).toBe(false);
    expect(xet("quansat", "base.hoi_thoai_gan_day").duoc).toBe(true);
    expect(xet("tiendo", "base.hoi_thoai_gan_day").duoc).toBe(false);
    expect(xet("base", "base.viec_qua_han").duoc).toBe(false); // tự gọi chính nó
  });
});

describe("base.viec_cua_toi — 3 nút chép định nghĩa locViec (chốt 28/09) · CHOT 6g.7 mục 3", async () => {
  const { locViecCuaToi, toiLocMay } = await import("@/lib/mcp/cong-base-thuan");
  const pv = (loai: "nguoi" | "don_vi", id: string, vai: "chu_tri" | "phoi_hop", tt = "dang_lam") => ({ phu_trach_loai: loai, phu_trach_id: id, trang_thai: tt, vai });
  const ds = [
    { id: "A", giao_boi: "x", phan_viec: [pv("nguoi", "toi", "chu_tri")], nguon_hien_hanh: null },
    { id: "B", giao_boi: "toi", phan_viec: [pv("don_vi", "p-cd", "chu_tri")], nguon_hien_hanh: { du_lieu: { nguon_bang: "giao_tay" } } },
    { id: "C", giao_boi: "toi", phan_viec: [pv("don_vi", "p-cd", "chu_tri")], nguon_hien_hanh: { du_lieu: { nguon_bang: "bang_viec" } } },
    { id: "D", giao_boi: "x", phan_viec: [pv("don_vi", "p-dt", "chu_tri"), pv("don_vi", "p-cd", "phoi_hop")], nguon_hien_hanh: null },
    { id: "E", giao_boi: "x", phan_viec: [pv("don_vi", "p-dt", "chu_tri"), pv("nguoi", "toi", "phoi_hop", "da_ket_thuc")], nguon_hien_hanh: null },
    { id: "F", giao_boi: "x", phan_viec: [pv("don_vi", "bld-ptgd", "chu_tri")], nguon_hien_hanh: null },
  ];
  const toi = toiLocMay({ id: "toi", don_vi_ids: ["p-cd", "bld-ptgd"], vai_tro: ["truong-don-vi"], don_vi_dau: ["p-cd"] }, new Set(["bld-ptgd"]));
  it("nhan = chủ trì đích danh tên tôi hoặc chức danh lãnh đạo tôi giữ — không tính việc giao cả đơn vị", () => {
    expect(locViecCuaToi(ds, "nhan", toi).map((v) => v.id)).toEqual(["A", "F"]);
  });
  it("giao = chỉ việc tôi giao TAY (giao_tay / bang_quyet_dinh), không tính việc máy tách từ báo cáo", () => {
    expect(locViecCuaToi(ds, "giao", toi).map((v) => v.id)).toEqual(["B"]);
  });
  it("phoi_hop = phần phối hợp chưa xong của tôi / đơn vị tôi đứng đầu; đã xong hoặc tôi chủ trì thì không tính", () => {
    expect(locViecCuaToi(ds, "phoi_hop", toi).map((v) => v.id)).toEqual(["D"]);
  });
});
