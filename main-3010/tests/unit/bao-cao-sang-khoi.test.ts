// ============================================================
// TEST: BÁO CÁO SÁNG THEO KHỐI (KE-HOACH/23 — Mr. Đại chốt 17/10/2026)
//   khoi.ts (thư viện, bộ mặc định, tiền tỷ, lưới luật 36) · khoi-du-lieu.ts (bộ đọc câu trả lời agent)
//   khoi-telegram.ts (in theo bộ khối) · agent-mat-loc.ts locDuLieuKhoi
// Số mẫu = số đo 17/10/2026 ở tệp 23 (Hướng Việt). Không gọi agent, không gọi AI.
// ============================================================

import { describe, expect, it } from "vitest";
import {
  BO_MAC_DINH,
  DANH_MUC_KHOI,
  boKhoiHieuLuc,
  chuanHoaBoKhoi,
  fmtTy,
  ghepHeTheoKhung,
  ghepSoVoiChoQuaHan,
  quaLuoiLuat36,
  soDongCua,
} from "@/lib/bao-cao-sang/khoi";
import {
  docCamKet,
  docGang,
  docDoiChieuKl,
  docLichHoSo,
  docNguonLuc,
  docViecSapToi,
  docNhatKy,
  docSoLieuNghiemThu,
  docGiaDinh,
  docHoSo,
  docSCurve,
  docTaiViec,
  docThiCong,
  docTien,
  docXuThe,
  gopDuLieuKhoi,
  khoaKeoVe,
  phanThieu,
  type DuLieuKhoi,
} from "@/lib/bao-cao-sang/khoi-du-lieu";
import { boMa, canCuaNguoiNhan, dungBoKhoi, ketXuatBoKhoi } from "@/lib/bao-cao-sang/khoi-telegram";
import { rongBangToiDa } from "@/lib/bao-cao-sang/khoi-in";
import { THAM_SO_MAU } from "@/lib/bao-cao-sang/kich-ban";
import type { DauDuAn, VanDeSang } from "@/lib/bao-cao-sang/luat-cod";
import type { BaoCaoSang } from "@/lib/bao-cao-sang/model";
import { AN_NGAN, locDuLieuKhoi, type BoLocMat } from "@/lib/agent-mat-loc";

const HV = "dien-gio-huong-viet-hv-du-lieu";
const TT = "tan-thanh";
const ngayVn = (iso: string) => iso.slice(0, 10);

function dau(p: Partial<DauDuAn> & { maDuAn: string; ten: string }): DauDuAn {
  return {
    coTienDo: true,
    codDuBao: "2027-10-28",
    codMucTieu: "2027-08-03",
    chamNgay: 86,
    chamBaselineNgay: 44,
    codBaseline: "2027-09-14",
    soHomQua: 0,
    lyDoKhongSo: null,
    loi: null,
    ...p,
  };
}

function vd(p: Partial<VanDeSang> & { maDuAn: string; tieuDe: string }): VanDeSang {
  return {
    agent: "tiendo",
    tenAgent: "Tiến độ",
    idIssue: "X",
    wbs: null,
    lyDo: ["gang"],
    soNgayLuiCod: null,
    heLuiCod: "Baseline",
    tienVnd: null,
    mucDo: "do",
    doLlmSinh: false,
    cauHoi: null,
    kem: [],
    ...p,
  };
}

function bcMau(): BaoCaoSang {
  return {
    ngay: "2026-10-17",
    soDuAn: 3,
    dong: [],
    thieuSot: [],
    luatApDung: [],
    soDongBiLoaiVaThieuNguon: 0,
    dungLuc: "2026-10-17T00:00:00.000Z",
    daGuiLuc: null,
    duAn: [
      dau({ maDuAn: HV, ten: "Điện gió Hướng Việt" }),
      dau({ maDuAn: TT, ten: "Tân Thành", codDuBao: "2028-04-24", codMucTieu: "2028-04-24", chamNgay: 0, chamBaselineNgay: null, codBaseline: null }),
      dau({ maDuAn: "im-lang", ten: "Dự án im lặng", coTienDo: false, codDuBao: null, codMucTieu: null, chamNgay: null, soHomQua: null }),
    ],
    vanDe: [
      vd({ maDuAn: HV, wbs: "6.1.4", tenWbs: "Cung cấp Hub, Nacelle", tieuDe: "Cung cấp Hub, Nacelle… chưa khởi công", soNgayLuiCod: 44, lyDo: ["gang", "lui-cod"] }),
      vd({ maDuAn: HV, wbs: "7.2.3", tenWbs: "Thi công san nền", tieuDe: "Thi công san nền dừng vì đền bù", soNgayLuiCod: 8, lyDo: ["lui-cod"] }),
    ],
    viecDoKhac: [],
    lienKetIssue: "http://localhost:3010/alerts",
    diaChiMain: "http://localhost:3010",
  };
}

function khoiMau(): DuLieuKhoi {
  return {
    daGom: {},
    gomLuc: "2026-10-17T00:00:00.000Z",
    keoVe: { [khoaKeoVe(HV, "6.1.4")]: { soNgay: 1, codSau: "2027-10-27", loi: null } },
    theoDuAn: {
      [HV]: {
        xuThe: {
          ok: true,
          so: {
            diem: [
              { ngay: "2026-09-24", cod: "2027-10-21" },
              { ngay: "2026-10-17", cod: "2027-10-28" },
            ],
            soDiemLa: 1,
            chuThichDiemLa: "Bỏ 1 điểm lạ 10/10/2026 (COD 18/05/2032) — lượt tính lỗi.",
            boCachCu: 0,
            codMucTieu: "2027-08-03",
            codBaseline: "2027-09-14",
          },
        },
        gang: {
          ok: true,
          so: docGang({
            cod_du_bao: "2027-10-28",
            tach_cham_cod: "COD dự báo 28/10/2027 chậm 86 ngày so với Tiến độ mục tiêu (03/08/2027) = 42 ngày … + 44 ngày …",
            tach_cham_cod_so: { tong_ngay: 86, baseline_so_muc_tieu_ngay: 42, thuc_hien_so_baseline_ngay: 44 },
            hang_muc_tu_lam_cod_cham: [
              { wbs: "6.1", ten: "Hợp đồng cung cấp turbine", tu_lam_cod_cham_ngay: 41, trong_do_thoi_tiet_ngay: 0, so_viec_gang: 1 },
              { wbs: "7.6", ten: "Vận chuyển và Lắp đặt Turbine", tu_lam_cod_cham_ngay: 20, trong_do_thoi_tiet_ngay: 20, so_viec_gang: 11 },
              { wbs: "7.1", ten: "Khác", tu_lam_cod_cham_ngay: 0, trong_do_thoi_tiet_ngay: 0, so_viec_gang: 2 },
            ],
            so_viec_gang_toi_cod: 21,
            so_viec_gang_dang_tre: 21,
            viec_gang_dang_tre: [{ wbs: "7.6.2.4", ten: "Turbine số 03", ke_hoach_xong: "2027-06-11", du_bao_xong: "2027-07-31", so_ngay_tre: 50 }],
          }),
        },
        tien: {
          ok: true,
          so: { giaTriHd: 192e9, soHd: 2, viSaoHd: null, daThanhToan: null, sanLuong: 5_453_487_956, sanLuongToi: "2026-10-11", viSaoSanLuong: null, daLenPhieu: 9_944_513_278, soPhieu: 3, viSaoPhieu: null },
        },
        hoSo: {
          ok: true,
          so: docHoSo({
            tong_ho_so_phai_co: 85,
            so_thieu: 20,
            ho_so_thieu: [{ ma_ho_so: "HV-09-01", ten: "Hợp đồng tín dụng", han: "2026-04-10", so_voi: "hạn phải có", so_ngay_qua_han: 188, co_quan_dang_giu: "" }],
          }),
        },
        hanChuTruong: { ok: true, so: { soNgayVuot: 301, soVoi: "so với hạn chủ trương 31/12/2026 (Quý IV/2026 — 1315/QĐ-UBND)", cau: null } },
        cauAi: { cau: "6.1 Hợp đồng cung cấp turbine làm COD chậm 86 ngày so với Tiến độ mục tiêu.", loi: null },
      },
      [TT]: { tien: { ok: false, loi: "Agent Hợp đồng: Kho không có hợp đồng tầng A nào của dự án tan-thanh." } },
    },
  };
}

// ─────────────────────────────────────────────────────────────

describe("thư viện + bộ khối", () => {
  it("đủ 21 khối (15 khối cũ + 4 khối 28/10 + VS-1, PL-2), 3 kệ, mã không trùng", () => {
    expect(DANH_MUC_KHOI).toHaveLength(21);
    expect(new Set(DANH_MUC_KHOI.map((k) => k.ma)).size).toBe(21);
    expect(new Set(DANH_MUC_KHOI.map((k) => k.ke)).size).toBe(3);
  });
  it("ba mẫu cũ = ba bộ mặc định (mục 6)", () => {
    expect(BO_MAC_DINH["tong-quat"].map((k) => k.ma)).toEqual(["TQ-1", "RQ-1"]);
    expect(BO_MAC_DINH["dieu-hanh"].map((k) => k.ma)).toEqual(["RQ-1"]);
    expect(BO_MAC_DINH["du-an"].map((k) => k.ma)).toEqual(["TQ-1", "RQ-1", "DA-1"]);
    expect(boKhoiHieuLuc("du-an", undefined).every((k) => k.phamVi === "du-an-chon")).toBe(true);
    expect(boKhoiHieuLuc("tong-quat", [{ ma: "DA-3", phamVi: "cong-ty" }]).map((k) => k.ma)).toEqual(["DA-3"]);
  });
  it("chuanHoaBoKhoi: bỏ mã lạ, bỏ trùng, kẹp số dòng, gopCongTy chỉ RQ-1", () => {
    const b = chuanHoaBoKhoi([
      { ma: "TQ-1", phamVi: "cong-ty" },
      { ma: "XX-9", phamVi: "cong-ty" },
      { ma: "TQ-1", phamVi: "du-an-chon" },
      { ma: "RQ-5", phamVi: "du-an-chon", soDong: 999 },
      { ma: "RQ-1", phamVi: "cong-ty", soDong: null, gopCongTy: true },
      { ma: "DA-2", phamVi: "cong-ty", gopCongTy: true },
    ]);
    expect(b).toEqual([
      { ma: "TQ-1", phamVi: "cong-ty" },
      { ma: "RQ-5", phamVi: "du-an-chon" },
      { ma: "RQ-1", phamVi: "cong-ty", soDong: null, gopCongTy: true },
      { ma: "DA-2", phamVi: "cong-ty" },
    ]);
    expect(chuanHoaBoKhoi("không phải mảng")).toBeNull();
    // T10 (Mr. Đại chốt 27/10): không còn số dòng mặc định — không đặt thì in đủ
    expect(soDongCua({ ma: "RQ-1", phamVi: "cong-ty" })).toBeNull();
    expect(soDongCua({ ma: "RQ-1", phamVi: "cong-ty", soDong: null })).toBeNull();
  });
});

describe("tiền tỷ đồng (chốt 8)", () => {
  it("1 số thập phân; dưới 1 tỷ 2 số; null → «chưa có số»", () => {
    expect(fmtTy(9_400_000_000)).toBe("9,4 tỷ");
    expect(fmtTy(544_513_278)).toBe("0,54 tỷ");
    expect(fmtTy(192e9)).toBe("192,0 tỷ");
    expect(fmtTy(null)).toBe("chưa có số");
  });
});

describe("lưới luật 36 cho chữ 🤖", () => {
  it("câu mẫu 17/10: vế đầu có «so với», vế «quá 250 ngày» không có → loại", () => {
    expect(
      quaLuoiLuat36(
        "COD dự báo 28/10/2027 chậm 86 ngày so với Tiến độ mục tiêu, nặng nhất là HV-09-01 Hợp đồng tín dụng (quá 250 ngày)",
      ),
    ).toBe(false);
  });
  it("câu đủ «so với» ở mọi vế → giữ; câu không nói chậm → giữ", () => {
    expect(quaLuoiLuat36("6.1.4 Cung cấp thiết bị dời 41 ngày so với Baseline – giao ai xử lý khẩn?")).toBe(true);
    expect(quaLuoiLuat36("Giao Phòng Cơ điện xử lý 6.1.4 Cung cấp Hub?")).toBe(true);
    expect(quaLuoiLuat36("6.1.4 Cung cấp thiết bị dời 41 ngày kéo theo 20 việc – giao ai xử lý khẩn?")).toBe(false);
  });
});

describe("bộ đọc câu trả lời agent", () => {
  it("xu thế COD: dùng theo_ngay của Tiến độ (đã bỏ điểm lạ), bỏ ngày cách cũ", () => {
    const x = docXuThe(
      {
        theo_ngay: [
          { ngay: "2026-09-20", cod_du_bao: "2027-06-01", cach_tinh: "cách cũ trước 24/09" },
          { ngay: "2026-09-24", cod_du_bao: "2027-10-21", cach_tinh: "năng suất 7 ngày" },
          { ngay: "2026-10-17", cod_du_bao: "2027-10-28", cach_tinh: "năng suất 7 ngày" },
        ],
        so_diem_la_da_bo: 1,
        chu_thich_diem_la: "Bỏ 1 điểm lạ.",
      },
      ngayVn,
      "2027-08-03",
      null,
    );
    expect(x.diem).toEqual([
      { ngay: "2026-09-24", cod: "2027-10-21" },
      { ngay: "2026-10-17", cod: "2027-10-28" },
    ]);
    expect(x.boCachCu).toBe(1);
    expect(x.soDiemLa).toBe(1);
    expect(x.chuThichDiemLa).toBe("Bỏ 1 điểm lạ.");
  });
  it("xu thế COD cổng cũ (chưa có theo_ngay): bỏ điểm cờ diem_la, lấy điểm cuối ngày", () => {
    const x = docXuThe(
      {
        moc: [
          { thoi_diem: "2026-10-10T08:00:00Z", cod_du_bao: "2027-10-14" },
          { thoi_diem: "2026-10-10T15:27:00Z", cod_du_bao: "2032-05-18", diem_la: true },
          { thoi_diem: "2026-10-11T08:00:00Z", cod_du_bao: "2027-10-27" },
          { thoi_diem: "2026-10-11T09:00:00Z", cod_du_bao: "2027-10-28" },
        ],
      },
      ngayVn,
      null,
      null,
    );
    expect(x.diem).toEqual([
      { ngay: "2026-10-10", cod: "2027-10-14" },
      { ngay: "2026-10-11", cod: "2027-10-28" },
    ]);
    expect(x.soDiemLa).toBe(1);
  });
  it("tiền: cộng phiếu các hợp đồng CHỈ khi mọi hợp đồng có số", () => {
    const du = docTien(
      { gia_tri_hop_dong: 192e9, so_hop_dong: 2, da_thanh_toan: null },
      { hop_dong: [{ chi_phi_luy_ke: 9.4e9, so_phieu_gia: 1 }, { chi_phi_luy_ke: 544_513_278, so_phieu_gia: 2 }] },
      { ngay_cat: "2026-10-11", tong_du_an: { luy_ke: 5_453_487_956 } },
    );
    expect(du.daLenPhieu).toBe(9_944_513_278);
    expect(du.soPhieu).toBe(3);
    const thieu = docTien({ gia_tri_hop_dong: null }, { hop_dong: [{ chi_phi_luy_ke: 1e9 }, { chi_phi_luy_ke: null, ma: "HD2", vi_sao_chua_co: "chưa đọc bảng E" }] }, "Agent Tiến độ: tắt");
    expect(thieu.daLenPhieu).toBeNull();
    expect(thieu.viSaoPhieu).toContain("không cộng thiếu");
    expect(thieu.viSaoSanLuong).toBe("Agent Tiến độ: tắt");
  });
  it("giả định COD: cod_keo_ve_ngay của Tiến độ; cổng cũ thì đảo dấu chenh_ngay (âm = sớm)", () => {
    expect(docGiaDinh({ cod_sau: "2027-09-17", cod_keo_ve_ngay: 41 }, "x").keoVe).toBe(41);
    expect(docGiaDinh({ cod_sau: "2027-10-27", chenh_ngay: -1 }, "x").keoVe).toBe(1);
    // ly_do_khong_doi của Tiến độ là DANH SÁCH câu — ghép lại, không bỏ trống
    expect(docGiaDinh({ cod_keo_ve_ngay: 0, ly_do_khong_doi: ["7.2.3: không áp — việc nhóm", "7.2.2 KHÔNG nằm trên đường găng"] }, "x").lyDoKhongDoi).toBe(
      "7.2.3: không áp — việc nhóm; 7.2.2 KHÔNG nằm trên đường găng",
    );
  });
  it("năng suất: chỉ dòng đang làm (nang-suat-thuc), số so với Baseline lấy nguyên", () => {
    const t = docThiCong({
      ngay_danh_gia: "2026-10-11",
      dong: [
        { ma_wbs: "7.2.1.2", ten: "Nhà ở", cach_du_bao: "nang-suat-thuc", baseline_xong: "2026-10-31", du_bao_xong: "2026-11-03", tre_ngay_so_baseline: 3 },
        { ma_wbs: "7.2.1.9", ten: "Chưa làm", cach_du_bao: "ke-hoach" },
      ],
    });
    expect(t.dong.map((x) => [x.wbs, x.treSoBaseline])).toEqual([["7.2.1.2", 3]]);
  });
  it("tải việc: việc trễ lâu nhất của từng người; cổng cắt bớt người thì không cộng", () => {
    const t = docTaiViec({
      so_nguoi: 12,
      nguoi: [
        { ho_ten: "Nguyễn Chính Đại", dang_mo: 5, qua_han: 5, viec_gang: 0, viec_nang: [{ ma_viec_base: "CV-1", ten: "A", qua_han_ngay: 15 }, { ma_viec_base: "CV-2", ten: "B", qua_han_ngay: 250, han: "2026-02-09" }] },
      ],
    });
    expect(t.du).toBe(false);
    expect(t.nguoi[0]!.treNhat).toEqual({ ma: "CV-2", ten: "B", han: "2026-02-09", quaHan: 250 });
  });
  it("S-Curve: % tại ngày cắt + lệch ngày Tiến độ tính", () => {
    const c = docSCurve({
      ngayCatDuLieu: "2026-10-11",
      diem: [
        { ngay: "2026-10-05", target: 15, baseline: 14, actual: 4 },
        { ngay: "2026-10-11", target: 16.8, baseline: 15.2, actual: 4.5, forecast: 4.5, lechNgay: { thucTe: -39 } },
      ],
      dat100: { mucTieu: { ngayDat100: "2027-08-03" } },
    });
    expect(c.tai).toEqual({ mucTieu: 16.8, baseline: 15.2, thucTe: 4.5 });
    expect(c.lechThucTe).toBe(-39);
    expect(c.dat100.mucTieu).toBe("2027-08-03");
    expect(c.duong.find((d) => d.muc === "du-bao")!.diem).toHaveLength(1);
  });
});

describe("in theo bộ khối", () => {
  const bc = bcMau();
  const khoi = khoiMau();
  const in1 = (ma: Parameters<typeof dungBoKhoi>[0]["boKhoi"][number]["ma"], phamVi: "cong-ty" | "du-an-chon" = "cong-ty", duAnChon: string[] | null = null) =>
    dungBoKhoi({ bc, khoi, boKhoi: [{ ma, phamVi }], thamSo: THAM_SO_MAU["du-an"], duAnChon, dayDu: true }).khoi[0]!;

  it("TQ-1: hàng tổng đầu (luật 34) + cột hạn chủ trương + dự án im lặng ẩn", () => {
    const c = in1("TQ-1").chu.split("\n");
    expect(c[0]).toContain("2 dự án có tiến độ");
    expect(c[1]).toContain("Nặng nhất: Điện gió Hướng Việt — chậm 86 ngày so với Tiến độ mục tiêu");
    // Khuôn 27/10: tên khối IN HOA; chú giải mở đầu «ⓘ», nằm cuối khối
    expect(c[0]).toMatch(/^▍BẢNG COD CÁC DỰ ÁN/);
    // 28/10 (G1+G3): THẺ, không viết tắt MT/BL; hạn chủ trương nằm ngay thẻ dự án
    expect(c.join("\n")).toContain("COD dự báo 28/10/2027 · chậm 86 ngày so với Tiến độ mục tiêu · chậm 44 ngày so với Baseline");
    expect(c.join("\n")).toContain("vượt 301 ngày");
    expect(c.join("\n")).not.toMatch(/\bMT\b|\bBL\b/);
    expect(c.join("\n")).not.toContain("Dự án im lặng");
  });
  it("TQ-2: đổi COD ghi rõ so với dự báo ngày đầu + khoảng ngày kèm số ngày (luật 31) + một ảnh", () => {
    const k = in1("TQ-2");
    // 27/10: BẢNG «Dự án · COD nay · Đổi»; COD đầu kỳ + khoảng ngày kèm số ngày chỉ ở web (kin)
    expect(k.chu).toMatch(/Hướng Việt\s+28\/10\/2027\s+\+7/);
    expect(k.chu).toContain("ⓘ Đổi = ngày, COD dự báo hôm nay − COD dự báo ngày đầu kỳ");
    const bang = k.kin!.phan.find((p) => p.k === "bang");
    expect(bang && bang.k === "bang" && bang.bang.hang[0]!.slice(3)).toEqual(["21/10/2027", "24 ngày · 24/09/2026 – 17/10/2026"]);
    expect(rongBangToiDa(k.kin!)).toBeLessThanOrEqual(34);
    expect(k.anh).toHaveLength(1);
    // 27/10 (KE-HOACH/33 mục 3): MỘT ảnh cho cả công ty — trục đứng là số ngày COD đã đổi, mỗi đường bắt đầu từ 0
    const a = k.anh[0]!.dacTa;
    expect(a.kieu).toBe("duong-so");
    if (a.kieu === "duong-so") {
      expect(a.duong.every((d) => d.diem[0]!.giaTri === 0)).toBe(true);
      expect(a.duong.some((d) => d.mau === "du-bao" && d.diem[d.diem.length - 1]!.giaTri === 7)).toBe(true);
      expect(a.tieuDe).toContain("lùi 7 ngày");
    }
  });
  it("TQ-1 gộp «Vì sao chậm» (TQ-3 cũ): nói bằng lời 42 ngày Baseline ký muộn + 44 ngày làm chậm, không vẽ ảnh; bộ cũ có TQ-3 đọc thành TQ-1", () => {
    const k = in1("TQ-1");
    expect(k.chu).toContain("vì sao chậm 86 ngày so với Tiến độ mục tiêu: 42 ngày do Baseline ký muộn hơn mục tiêu + 44 ngày do thực hiện chậm hơn Baseline");
    expect(k.anh).toHaveLength(0);
    expect(chuanHoaBoKhoi([{ ma: "TQ-3", phamVi: "cong-ty" }, { ma: "TQ-1", phamVi: "cong-ty" }, { ma: "RQ-2", phamVi: "cong-ty" }])!.map((x) => x.ma)).toEqual(["TQ-1", "RQ-2"]);
  });
  it("TQ-4: không cộng thiếu — Tân Thành chưa có số → hàng tổng «chưa cộng»", () => {
    const k = in1("TQ-4");
    // Bảng Ký · Làm · Đòi · Trả (tỷ đồng), hàng Cộng đứng đầu (luật 34), không cộng thiếu
    expect(k.chu).toContain("ⓘ Chưa cộng được tổng: chỉ cộng khi mọi dự án đều có số");
    expect(k.chu).toContain("chưa có số nào: Tân Thành");
    expect(k.chu).toMatch(/Hướng Việt\s+192,0\s+5,5\s+9,9\s+—/);
    expect(k.chu).not.toMatch(/Cộng\s+—\s+—\s+—\s+—/);
    expect(k.chu).toContain("Làm: sản lượng tới 11/10/2026");
    // Telegram HTML: tên khối đậm, bảng trong <pre> không rộng quá 34 ký tự
    expect(k.html).toContain("<b>▍TIỀN CÁC DỰ ÁN</b>");
    expect(k.html).toContain("<pre>");
    expect(rongBangToiDa(k.kin!)).toBeLessThanOrEqual(34);
  });
  it("RQ-1: cột «riêng việc này về đúng Baseline» (chốt 2) + số ngày ghi rõ hệ", () => {
    const k = in1("RQ-1");
    expect(k.chu).toContain("COD lùi 44 ngày so với Baseline");
    // 28/10 (G1+G3): THẺ việc, không mã, không viết tắt; luật 36 ghi hệ ngay trong câu
    expect(k.chu).toContain("Cung cấp Hub, Nacelle");
    expect(k.chu).not.toContain("6.1.4");
    // 28/10 (anh duyệt A): số 44 là COD của DỰ ÁN; riêng việc này chỉ kéo về 1 ngày → không viết «việc này làm COD lùi 44»
    expect(k.chu).toContain("COD dự án đang lùi 44 ngày so với Baseline · riêng việc này làm đúng Baseline thì COD sớm 1 ngày");
    expect(k.chu).not.toMatch(/\bBL\b/);
  });
  it("28/10: việc đã có khối riêng trong CÙNG bộ thì không in lại (RQ-1 ↔ TQ-1, RQ-6); bộ không có khối kia thì vẫn in", () => {
    const vd = (tieuDe: string) => ({ ...bc.vanDe![0]!, tieuDe, wbs: null, tenWbs: null, kem: [], cauHoi: null });
    const bc2 = { ...bc, vanDe: [...bc.vanDe!, vd("COD dự báo vượt hạn theo chủ trương 316 ngày — 1315/QĐ-UBND"), vd("Phó Tổng Giám đốc · Nguyễn Chính Đại tồn 1 việc quá hạn ≥ 7 ngày")] };
    // BB-02 (kiểm độc lập 27/10): khối kia chỉ được coi là «đã in» khi có số nguồn cho đúng dự án
    const taiViec = { ok: true as const, so: { soNguoi: 1, du: true, chuaGiao: null, nguoi: [{ ten: "Nguyễn Văn A", dangMo: 6, quaHan: 4, viecGang: 1, treNhat: null }] } };
    const khoiCo = { ...khoi, theoDuAn: { ...khoi.theoDuAn, [HV]: { ...khoi.theoDuAn[HV], taiViec } } } as unknown as typeof khoi;
    const dung = (ds: string[], kh: typeof khoi = khoiCo) =>
      dungBoKhoi({ bc: bc2, khoi: kh, boKhoi: ds.map((m) => ({ ma: m as "RQ-1", phamVi: "cong-ty" as const })), thamSo: THAM_SO_MAU["du-an"], duAnChon: null, dayDu: true }).khoi.find((x) => x.ma === "RQ-1")!.chu;
    const rieng = dung(["RQ-1"]);
    expect(rieng).toContain("vượt hạn theo chủ trương");
    expect(rieng).toContain("tồn 1 việc quá hạn");
    const chung = dung(["TQ-1", "RQ-6", "RQ-1"]);
    expect(chung).not.toContain("COD dự báo vượt hạn theo chủ trương");
    expect(chung).not.toContain("tồn 1 việc quá hạn");
    expect(chung).toContain("không in lại ở đây");
    // RQ-6 không có số tải việc → dòng «tồn … việc quá hạn» KHÔNG được coi là đã in ở khối kia
    expect(dung(["TQ-1", "RQ-6", "RQ-1"], khoi)).toContain("tồn 1 việc quá hạn");
  });
  it("BB-03 (kiểm độc lập 27/10): boMa bỏ mã phiếu dài / gạch dưới, giữ công suất «4.6 MW» và «49.5 MW»", () => {
    expect(boMa("Turbine 4.6 MW")).toBe("Turbine 4.6 MW");
    expect(boMa("Công suất 49.5 MW")).toBe("Công suất 49.5 MW");
    expect(boMa("6.1.4 Thử nghiệm tần số")).toBe("Thử nghiệm tần số");
    expect(boMa("Phiếu HV-EPC-ENC-CBCT-PYC-013 chờ ký")).toBe("Phiếu chờ ký");
    expect(boMa("ISS_PL_0115 quá hạn")).toBe("quá hạn");
  });
  it("28/10: câu hỏi 🤖 nằm NGAY DƯỚI thẻ việc của nó, không dồn xuống cuối nhóm", () => {
    const co = { ...bc, vanDe: bc.vanDe!.map((v, i) => ({ ...v, cauHoi: `Câu hỏi số ${i}?` })) };
    const c = dungBoKhoi({ bc: co, khoi, boKhoi: [{ ma: "RQ-1", phamVi: "cong-ty" }], thamSo: { ...THAM_SO_MAU["du-an"], cauHoiAi: true }, duAnChon: null, dayDu: true }).khoi[0]!.chu.split("\n");
    const i = c.findIndex((d) => d.includes("Câu hỏi số 0?"));
    expect(i).toBeGreaterThan(0);
    // dòng ngay trên câu hỏi là dòng nguồn của thẻ, không phải câu hỏi khác
    expect(c[i - 1]).not.toContain("Câu hỏi số");
  });
  it("RQ-2: không cộng dồn, phần thời tiết tách riêng, ảnh chỉ thanh > 0 + dòng hạng mục khác", () => {
    const k = in1("RQ-2");
    expect(k.chu).toContain("tự làm COD chậm so với Baseline");
    expect(k.chu).toContain("không cộng dồn");
    expect(k.chu).toMatch(/Hợp đồng cung cấp turbine\n\s+tự làm COD chậm 41 ngày so với Baseline/);
    const a = k.anh[0]!.dacTa;
    // 27/10: một ảnh cả công ty, nhãn «dự án · hạng mục», không vẽ thanh «hạng mục găng khác — 0 ngày»
    expect(a.kieu === "thanh-ngang" && a.thanh.map((t) => t.nhan)).toEqual(["Hướng Việt · Hợp đồng cung cấp turbine", "Hướng Việt · Vận chuyển và Lắp đặt Turbine"]);
  });
  it("RQ-5: quá hạn ghi «so với hạn phải có» + ngày hạn", () => {
    const c = in1("RQ-5").chu;
    // 28/10: THẺ hồ sơ, không mã hồ sơ
    expect(c).toContain("Hợp đồng tín dụng\n  quá hạn 188 ngày (hạn phải có 10/04/2026)");
    expect(c).not.toContain("HV-09-01");
    expect(c).toContain("so với hạn phải có");
  });
  it("ảnh mới 27/10 (luật C1): RQ-5 vẽ thiếu/quá hạn; TQ-4 không vẽ khi không có khoảng hở; RQ-6 không vẽ khi không ai quá hạn", () => {
    const r5 = in1("RQ-5").anh;
    expect(r5).toHaveLength(1);
    const a5 = r5[0]!.dacTa;
    expect(a5.kieu === "thanh-ngang" && a5.tieuDe).toBe("Điện gió Hướng Việt: thiếu 20/85 hồ sơ pháp lý, quá hạn 1");
    expect(a5.kieu === "thanh-ngang" && a5.thanh.map((t) => t.nhan)).toEqual(["Hướng Việt · thiếu", "Hướng Việt · quá hạn"]);
    // Dữ liệu thử: Đòi > Làm (hai số chốt ngày khác nhau), Trả chưa có → không có khoảng hở «làm rồi chưa đòi» → không vẽ
    expect(in1("TQ-4").anh).toHaveLength(0);
    expect(in1("RQ-6").anh).toHaveLength(0);
  });
  it("ảnh mới 27/10: TQ-4 có khoảng hở «làm rồi chưa đòi» → một ảnh Ký · Làm · Đòi · Trả; RQ-6 từ 2 người quá hạn → một ảnh", () => {
    const co = {
      ...khoi,
      theoDuAn: {
        ...khoi.theoDuAn,
        [HV]: {
          ...khoi.theoDuAn[HV],
          tien: { ok: true as const, so: { giaTriHd: 192e9, soHd: 2, viSaoHd: null, daThanhToan: 2e9, sanLuong: 30e9, sanLuongToi: "2026-10-11", viSaoSanLuong: null, daLenPhieu: 12e9, viSaoPhieu: null } },
          taiViec: {
            ok: true as const,
            so: {
              soNguoi: 2,
              du: true,
              chuaGiao: null,
              nguoi: [
                { ten: "Nguyễn Văn A", dangMo: 6, quaHan: 4, viecGang: 1, treNhat: { ma: "CV-1", ten: "Việc A", han: "2026-10-01", quaHan: 24 } },
                { ten: "Trần Thị B", dangMo: 3, quaHan: 1, viecGang: 0, treNhat: { ma: "CV-2", ten: "Việc B", han: "2026-10-20", quaHan: 5 } },
              ],
            },
          },
        },
      },
    };
    const dung = (ma: "TQ-4" | "RQ-6") => dungBoKhoi({ bc, khoi: co as unknown as typeof khoi, boKhoi: [{ ma, phamVi: "cong-ty" }], thamSo: THAM_SO_MAU["du-an"], duAnChon: null, dayDu: false }).khoi[0]!;
    const t4 = dung("TQ-4").anh;
    expect(t4).toHaveLength(1);
    const a4 = t4[0]!.dacTa;
    expect(a4.kieu === "thanh-ngang" && a4.tieuDe).toContain("đã làm 30,0 mà mới đòi 12,0 tỷ — treo 18,0 tỷ");
    expect(a4.kieu === "thanh-ngang" && a4.thanh.map((t) => t.nhan)).toEqual(["Hướng Việt · Ký", "Hướng Việt · Làm", "Hướng Việt · Đòi", "Hướng Việt · Trả"]);
    const t6 = dung("RQ-6").anh;
    expect(t6).toHaveLength(1);
    const a6 = t6[0]!.dacTa;
    expect(a6.kieu === "thanh-ngang" && a6.tieuDe).toBe("Nguyễn Văn A quá hạn 4/6 việc, trễ nhất 24 ngày so với hạn giao việc");
  });
  it("DA-4 (27/10): ảnh thanh HAI CHIỀU — ▲ chậm sang phải, ▼ sớm sang trái; không vẽ khi không có gì lệch", () => {
    const dong = (wbs: string, ten: string, tre: number | null) => ({ wbs, ten, thauPhu: "ENC", donVi: "m3", nsBaseline: 10, ns7: 8, duBaoXong: "2027-01-01", baselineXong: "2026-12-01", treSoBaseline: tre });
    const dung = (ds: ReturnType<typeof dong>[]) => {
      const co = { ...khoi, theoDuAn: { ...khoi.theoDuAn, [HV]: { ...khoi.theoDuAn[HV], thiCong: { ok: true as const, so: { ngayDanhGia: "2026-10-25", dong: ds } } } } };
      return dungBoKhoi({ bc, khoi: co as unknown as typeof khoi, boKhoi: [{ ma: "DA-4", phamVi: "cong-ty" }], thamSo: THAM_SO_MAU["du-an"], duAnChon: null, dayDu: false }).khoi[0]!;
    };
    const k = dung([dong("7.6", "Vận chuyển Turbine", 20), dong("6.1", "Hợp đồng cung cấp turbine", 56), dong("3.2", "Đường vào", -4), dong("4.1", "Móng", null)]);
    expect(k.anh).toHaveLength(1);
    const a = k.anh[0]!.dacTa;
    expect(a.kieu).toBe("thanh-hai-chieu");
    if (a.kieu === "thanh-hai-chieu") {
      expect(a.thanh.map((t) => t.giaTri)).toEqual([56, 20, -4]);
      expect(a.tieuDe).toContain("chậm 56 ngày so với Baseline — 2 hạng mục chậm, 1 sớm");
      expect(a.nhanAm).toBe("Sớm so với Baseline");
    }
    expect(dung([dong("6.1", "A", 0), dong("7.6", "B", 0)]).anh).toHaveLength(0);
    expect(dung([dong("6.1", "A", 5)]).anh).toHaveLength(0);
  });
  it("DA-1 (27/10): MỘT bảng «Mở · Nguồn · Việc», mở lâu nhất trên đầu; cột Quá hạn chỉ ở web", () => {
    const viec = [
      { maDuAn: HV, agent: "hopdong", tenAgent: "Hợp đồng", idIssue: "H1", wbs: null, tieuDe: "Bảo lãnh tạm ứng sắp hết hạn", soNgayQuaHan: 3, ngayMo: "2026-10-10T01:00:00Z", doLlmSinh: false },
      { maDuAn: HV, agent: "phaply", tenAgent: "Pháp lý", idIssue: "P1", wbs: null, tieuDe: "Thiếu giấy phép xây dựng", soNgayQuaHan: null, ngayMo: "2026-09-20T01:00:00Z", doLlmSinh: false },
    ];
    const k = dungBoKhoi({ bc: { ...bc, viecDoKhac: viec }, khoi, boKhoi: [{ ma: "DA-1", phamVi: "cong-ty" }], thamSo: THAM_SO_MAU["du-an"], duAnChon: null, dayDu: false }).khoi[0]!;
    expect(k.chu).toContain("• Hướng Việt — 🔴 2 việc đỏ");
    expect(k.chu.indexOf("Thiếu giấy phép")).toBeLessThan(k.chu.indexOf("Bảo lãnh"));
    expect(k.chu).toContain("đã mở ");
    expect(k.chu).toContain("do agent Pháp lý báo");
    expect(k.chu).toContain("quá hạn 3 ngày");
  });
  it("RQ-3 (27/10): BẢNG «Giả định · Sớm · COD sau»; lý do không đổi và «còn chậm» chỉ ở web", () => {
    const co = {
      ...khoi,
      theoDuAn: {
        ...khoi.theoDuAn,
        [HV]: {
          ...khoi.theoDuAn[HV],
          thuCod: {
            ok: true as const,
            so: {
              codNay: "2027-10-28",
              chamMucTieuNay: 86,
              dong: [
                { nhan: "Cả hạng mục 6.1 Hợp đồng cung cấp turbine về đúng Baseline", codSau: "2027-09-17", keoVe: 41, chamMucTieuSau: 45, giaiThich: null, lyDoKhongDoi: null, loi: null },
                { nhan: "Mọi 2 việc làm chậm COD về đúng Baseline", codSau: "2027-10-28", keoVe: 0, chamMucTieuSau: 86, giaiThich: null, lyDoKhongDoi: "việc có dự trữ; găng chuyển sang việc khác", loi: null },
              ],
            },
          },
        },
      },
    };
    const k = dungBoKhoi({ bc, khoi: co, boKhoi: [{ ma: "RQ-3", phamVi: "cong-ty" }], thamSo: THAM_SO_MAU["du-an"], duAnChon: null, dayDu: false }).khoi[0]!;
    expect(k.chu).toContain("Thử: nếu việc / hạng mục nặng nhất dưới đây làm đúng Baseline");
    expect(k.chu).toMatch(/Nếu cả hạng mục Hợp đồng[^\n]* làm đúng Baseline\n\s+COD sớm 41 ngày → 17\/09\/2027/);
    expect(k.chu).not.toContain("6.1");
    expect(k.chu).toContain("cũng không làm COD sớm hơn");
    expect(k.chu).toContain("việc có dự trữ");
    expect(k.chu).toContain("Mọi 2 việc");
  });
  it("kiểm độc lập 26/10 (B1): chưa gom được số thì nói «Chưa có số», KHÔNG báo «Không có …» (báo sạch giả)", () => {
    for (const ma of ["RQ-3", "RQ-5", "RQ-6", "DA-4"] as const) {
      const k = dungBoKhoi({ bc, khoi: null, boKhoi: [{ ma, phamVi: "cong-ty" }], thamSo: THAM_SO_MAU["du-an"], duAnChon: null, dayDu: false }).khoi[0]!;
      // Khuôn 27/10 (T9): «⚠ <dự án>: chưa có số — …»
      expect(k.chu, ma).toMatch(/⚠ .+: chưa có số/);
      expect(k.chu, ma).not.toMatch(/Không có (hồ sơ pháp lý quá hạn|việc quá hạn nào|việc \/ hạng mục nào để thử)/);
    }
  });
  it("luật 36: «quá hạn N ngày» thiếu «so với» được code ghép «so với hạn đã đặt»; «chậm N ngày» không rõ hệ thì không đoán", () => {
    const c = ghepSoVoiChoQuaHan("văn bản quy hoạch quá hạn 520 ngày, giấy chứng nhận quá hạn 365–360 ngày");
    expect(c).toBe("văn bản quy hoạch quá hạn 520 ngày so với hạn đã đặt, giấy chứng nhận quá hạn 365–360 ngày");
    expect(quaLuoiLuat36(c)).toBe(true);
    expect(ghepSoVoiChoQuaHan("quá hạn 12 ngày so với hạn phải có")).toBe("quá hạn 12 ngày so với hạn phải có");
    expect(quaLuoiLuat36(ghepSoVoiChoQuaHan("dự án chậm 86 ngày"))).toBe(false);
  });
  it("luật 36 (anh duyệt A 28/10): «chậm / lùi N ngày» thiếu «so với» → ghép hệ LẤY TỪ KHUNG cho đúng con số N; mơ hồ hoặc không có thì không đoán", () => {
    const khung = "tự làm COD chậm 56 ngày so với Baseline; chậm 20 ngày so với Baseline (trong đó 20 ngày do thời tiết); chậm 101 ngày so với Tiến độ mục tiêu · chậm 59 ngày so với Baseline";
    const cau = "COD chậm 101 ngày so với Tiến độ mục tiêu, hạng mục kéo chậm 56 ngày và hạng mục khác chậm 20 ngày do thời tiết, hồ sơ quá hạn 260 ngày";
    expect(quaLuoiLuat36(cau)).toBe(false);
    const sau = ghepHeTheoKhung(ghepSoVoiChoQuaHan(cau), khung);
    expect(sau).toContain("chậm 56 ngày so với Baseline");
    expect(sau).toContain("chậm 20 ngày so với Baseline do thời tiết");
    expect(sau).toContain("quá hạn 260 ngày so với hạn đã đặt");
    expect(quaLuoiLuat36(sau)).toBe(true);
    // con số khung ghi với HAI hệ → mơ hồ, để nguyên
    expect(ghepHeTheoKhung("COD lùi 59 ngày — sao?", "59 ngày so với Baseline; 59 ngày so với Tiến độ mục tiêu")).toBe("COD lùi 59 ngày — sao?");
    // khung không có con số đó → để nguyên (lưới bỏ câu)
    expect(ghepHeTheoKhung("chậm 77 ngày", "chậm 56 ngày so với Baseline")).toBe("chậm 77 ngày");
    // «vượt N ngày hạn X» (đã nêu hạn, chỉ thiếu «so với») → ghép
    const vuot = ghepHeTheoKhung("COD dự báo vượt 316 ngày hạn 1315/QĐ-UBND Quý IV/2026 — xin gia hạn không?", "");
    expect(vuot).toContain("vượt 316 ngày so với hạn 1315/QĐ-UBND");
    expect(quaLuoiLuat36(vuot)).toBe(true);
    // đã có «so với» thì không ghép thêm
    expect(ghepHeTheoKhung("chậm 56 ngày so với Baseline", khung)).toBe("chậm 56 ngày so với Baseline");
  });
  it("DA-2: chậm so với Baseline (dự án đã duyệt Baseline)", () => {
    // Luật 36: dòng tổng ghi «so với Baseline» một lần; bảng chỉ còn số ngày trễ; Telegram bỏ cột chỉ-web
    const k = in1("DA-2");
    expect(k.chu).toContain("Hướng Việt · 21/21 việc găng trễ — 50 ngày so với Baseline");
    expect(k.chu).toContain("Turbine số 03");
    expect(k.chu).not.toContain("7.6.2.4");
    expect(k.html).toContain("<b>21/21</b>");
    // Bản web thêm thông tin phụ ở thẻ; Telegram nói ngày dự báo xong và ngày theo Baseline ngay trong câu
    expect(k.chu).toContain("dự báo xong 31/07/2027, theo Baseline là 11/06/2027");
    expect(rongBangToiDa(k.kin!)).toBeLessThanOrEqual(34);
  });
  it("khối chưa gom số → câu nói rõ, không im lặng", () => {
    // 27/10/2026 (6b7021f): câu không còn bảo «bấm Dựng lại» — màn web tự lấy số khối thiếu của hôm nay
    const c = in1("DA-3").chu;
    expect(c).toContain("chưa có số — bản hôm nay thì màn tự lấy");
    expect(c).not.toContain("bấm Dựng lại");
  });
  it("NT-1: Nhà thầu mời nghiệm thu — bảng theo ngày hôm nay / ngày mai, giờ · nhà thầu · biên bản · trạng thái", () => {
    const co = {
      ...khoi,
      theoDuAn: {
        ...khoi.theoDuAn,
        [HV]: {
          ...khoi.theoDuAn[HV],
          lichNt: {
            ok: true as const,
            so: {
              lich: [
                {
                  ngay: "2026-10-25",
                  nhan: "hôm nay",
                  moi: [
                    { gioBd: "09:00", gioKt: "10:00", nhaThau: "Công ty Cổ phần ENC", maBb: "HV-1", tenBb: "Kiểm tra trạm trộn bê tông", viTri: "Kiểm tra trạm trộn bê tông", trangThai: "chờ ký" },
                    { gioBd: "14:00", gioKt: "15:30", nhaThau: "Công ty Cổ phần ENC", maBb: "HV-2", tenBb: "Bê tông móng tuabin 2", viTri: "Móng TB2", trangThai: "đã ký" },
                  ],
                },
                { ngay: "2026-10-26", nhan: "ngày mai", moi: [] },
              ],
            },
          },
        },
      },
    };
    const c = dungBoKhoi({ bc, khoi: co, boKhoi: [{ ma: "NT-1", phamVi: "cong-ty" }], thamSo: THAM_SO_MAU["du-an"], duAnChon: null, dayDu: true }).khoi[0]!.chu;
    expect(c).toContain("▍NHÀ THẦU MỜI NGHIỆM THU");
    // Khuôn 27/10: dòng dự án «• » rồi BẢNG Giờ · Nhà thầu · Biên bản · Trạng thái (tên nhà thầu một lần, lượt sau ghi «〃»)
    expect(c).toContain("• Hướng Việt · Hôm nay 25/10/2026 · 2 lượt · 1 đã ký · 1 chờ ký");
    expect(c).toMatch(/09:00\s+ENC\s+Kiểm tra trạm…\s+⏳/);
    expect(c).toMatch(/14:00\s+〃\s+Bê tông móng …\s+✅/);
    expect(rongBangToiDa(in1("NT-1").kin!)).toBeLessThanOrEqual(34);
    expect(c).toContain("Không có lượt nào: ngày mai 26/10/2026 (Hướng Việt)");
    expect((c.match(/ENC/g) ?? []).length).toBe(1);
  });
  it("NT-1 chưa gom số → câu nói rõ, không im lặng", () => {
    expect(in1("NT-1").chu).toContain("chưa có số");
  });
  it("«Dự án tôi chọn» mà chưa chọn dự án nào → lời nhắc chọn dự án", () => {
    expect(in1("TQ-1", "du-an-chon", []).chu).toContain("Chưa chọn dự án nào cho khối này");
  });
  it("Telegram HTML: mọi tin hợp lệ — thẻ đóng đủ, ≤ trần, chữ dữ liệu đã thoát, không rò thẻ vào chữ thuần", () => {
    const t = ketXuatBoKhoi({
      bc,
      khoi,
      boKhoi: [
        { ma: "TQ-4", phamVi: "cong-ty" },
        { ma: "DA-2", phamVi: "cong-ty" },
        { ma: "NT-1", phamVi: "cong-ty" },
        { ma: "RQ-1", phamVi: "cong-ty" },
      ],
      thamSo: THAM_SO_MAU["dieu-hanh"],
      duAnChon: null,
    });
    expect(t.tinHtml.length).toBeGreaterThan(0);
    for (const tin of t.tinHtml) {
      expect((tin.match(/<pre>/g) ?? []).length).toBe((tin.match(/<\/pre>/g) ?? []).length);
      expect((tin.match(/<b>/g) ?? []).length).toBe((tin.match(/<\/b>/g) ?? []).length);
      expect(tin.length).toBeLessThanOrEqual(4096);
      // mọi < còn lại phải là một trong các thẻ cho phép; không có < trần từ dữ liệu
      expect((tin.match(/<blockquote>/g) ?? []).length).toBe((tin.match(/<\/blockquote>/g) ?? []).length);
      expect((tin.match(/<(?!\/?(?:b|i|pre|blockquote)>)/g) ?? []).length).toBe(0);
    }
    // bản chữ thuần cũ (tin) không bao giờ chứa thẻ HTML do máy ghép
    for (const tin of t.tin) expect(tin).not.toMatch(/<\/?(?:b|pre|i|blockquote)>/);
  });
  it("khuôn 27/10 T5: lời AI nằm trong <blockquote><i>🤖 …</i>; chỉ lời AI mới nghiêng", () => {
    const k = in1("RQ-1");
    const coAi = k.kin!.phan.filter((p) => p.k === "ai");
    for (const p of k.kin!.phan) if (p.k === "chu") expect(JSON.stringify(p.dong)).not.toContain("🤖 →");
    for (const p of coAi) expect(k.html).toContain(`<blockquote><i>🤖 `);
    expect((k.html!.match(/<i>/g) ?? []).length).toBe(coAi.length);
  });
  it("T10 (Mr. Đại chốt 27/10): không cắt danh sách, không «xem ở Main» — khối dài chia sang tin sau với «(tiếp)», thẻ không hở", () => {
    // 60 việc găng trễ: trước đây Telegram in 3 dòng + «Còn 57 việc — xem ở Main»
    const nhieu = {
      ...khoi,
      theoDuAn: {
        ...khoi.theoDuAn,
        [HV]: {
          ...khoi.theoDuAn[HV],
          gang: khoi.theoDuAn[HV]!.gang!.ok
            ? {
                ok: true as const,
                so: {
                  ...khoi.theoDuAn[HV]!.gang!.so,
                  soGangDangTre: 60,
                  soGangToiCod: 60,
                  gangTre: Array.from({ length: 60 }, (_, i) => ({ ...khoi.theoDuAn[HV]!.gang!.ok ? (khoi.theoDuAn[HV]!.gang as { so: { gangTre: object[] } }).so.gangTre[0] : {}, wbs: `7.6.${i}`, ten: `Việc găng thử số ${i} có tên khá dài để bảng đầy`, soNgayTre: 100 - i })),
                },
              }
            : khoi.theoDuAn[HV]!.gang,
        },
      },
    } as typeof khoi;
    const t = ketXuatBoKhoi({ bc, khoi: nhieu, boKhoi: [{ ma: "DA-2", phamVi: "cong-ty" }, { ma: "RQ-5", phamVi: "cong-ty" }], thamSo: THAM_SO_MAU["tong-quat"], duAnChon: null, tran: 1500 });
    const ca = t.tinHtml.join("\n");
    expect(ca).not.toContain("xem ở Main");
    expect(ca).toContain("Việc găng thử số 59");
    expect(t.tinHtml.length).toBeGreaterThan(1);
    expect(ca).toContain("(tiếp)</b>");
    for (const tin of t.tinHtml) {
      expect(tin.length).toBeLessThanOrEqual(1500);
      expect((tin.match(/<pre>/g) ?? []).length).toBe((tin.match(/<\/pre>/g) ?? []).length);
      expect((tin.match(/<b>/g) ?? []).length).toBe((tin.match(/<\/b>/g) ?? []).length);
    }
  });
  it("Telegram: mọi ảnh có nội dung đi theo thứ tự khối, không còn trần 2 ảnh (27/10, gửi album)", () => {
    const t = ketXuatBoKhoi({
      bc,
      khoi,
      boKhoi: [
        { ma: "RQ-2", phamVi: "cong-ty" },
        { ma: "TQ-2", phamVi: "cong-ty" },
        { ma: "TQ-1", phamVi: "cong-ty" },
      ],
      thamSo: THAM_SO_MAU["dieu-hanh"],
      duAnChon: null,
    });
    expect(t.anh.map((a) => a.chuThich)).toEqual(["Hạng mục tự làm COD chậm — các dự án", "Xu thế COD dự báo — các dự án"]);
    expect(t.tin[0]).toMatch(/^📋 Báo cáo sáng 17\/10\/2026/);
    expect(t.tin[t.tin.length - 1]).toContain("Trang báo cáo: http://localhost:3010/bao-cao?tab=sang");
  });
  it("bộ mặc định Tổng quát: bảng COD + một dòng «Nặng nhất»", () => {
    const t = ketXuatBoKhoi({ bc, khoi, boKhoi: BO_MAC_DINH["tong-quat"], thamSo: THAM_SO_MAU["tong-quat"], duAnChon: null });
    expect(t.tin.join("\n")).toContain("Cung cấp Hub, Nacelle");
    expect(t.tin.join("\n")).toContain("COD lùi 44 ngày so với Baseline");
  });
});

describe("nhu cầu gom + gộp số", () => {
  it("chỉ hỏi khối có người dùng, đúng dự án trong phạm vi (dự án im lặng không hỏi)", () => {
    const { can, soKeoVe } = canCuaNguoiNhan(bcMau(), [
      { boKhoi: [{ ma: "TQ-2", phamVi: "du-an-chon" }], duAnChon: [HV] },
      { boKhoi: [{ ma: "RQ-1", phamVi: "cong-ty", soDong: 3 }, { ma: "DA-1", phamVi: "cong-ty" }], duAnChon: null },
    ]);
    expect(Array.from(can.get("TQ-2") ?? [])).toEqual([HV]);
    expect(can.has("DA-1")).toBe(false);
    expect(Array.from(can.get("RQ-1") ?? []).sort()).toEqual([HV, TT].sort());
    expect(soKeoVe.get(HV)).toBe(3);
  });
  it("phần thiếu + gộp", () => {
    const co: DuLieuKhoi = { daGom: { "TQ-2": [HV] }, theoDuAn: { [HV]: {} }, keoVe: {}, gomLuc: "" };
    const thieu = phanThieu(co, new Map([["TQ-2", new Set([HV, TT])], ["DA-3", new Set([HV])]]));
    expect(Array.from(thieu.get("TQ-2") ?? [])).toEqual([TT]);
    expect(Array.from(thieu.get("DA-3") ?? [])).toEqual([HV]);
    const gop = gopDuLieuKhoi(co, { daGom: { "TQ-2": [TT] }, theoDuAn: { [TT]: { cauAi: { cau: "x", loi: null } } }, keoVe: {}, gomLuc: "b" });
    expect(gop.daGom["TQ-2"]).toEqual([HV, TT]);
    expect(gop.theoDuAn[TT]!.cauAi!.cau).toBe("x");
  });
});

describe("agent mật (luật 05/10) cho số khối", () => {
  it("không thấy Hợp đồng → ẩn tiền; không thấy Pháp lý → ẩn hồ sơ + hạn chủ trương; câu 🤖 ẩn khi thiếu một trong hai", () => {
    const loc: BoLocMat = { thayHet: false, thay: (agent) => agent !== "hopdong" };
    const k = locDuLieuKhoi(khoiMau(), loc);
    expect(k.theoDuAn[HV]!.tien).toEqual({ ok: false, loi: AN_NGAN });
    expect(k.theoDuAn[HV]!.hoSo!.ok).toBe(true);
    expect(k.theoDuAn[HV]!.cauAi!.cau).toBeNull();
    const ban = dungBoKhoi({ bc: bcMau(), khoi: k, boKhoi: [{ ma: "TQ-4", phamVi: "cong-ty" }], thamSo: THAM_SO_MAU["du-an"], duAnChon: null, loc, dayDu: true });
    expect(ban.khoi[0]!.chu).not.toContain("192,0 tỷ");
    expect(ban.khoi[0]!.chu).toContain("ẩn — tài liệu mật");
  });
  it("kiểm độc lập 27/10 BB-01: JSON gửi lên web cũng ẩn lịch hồ sơ (Pháp lý) và cam kết nhân lực (Hợp đồng)", () => {
    const dl = khoiMau();
    dl.theoDuAn[HV]!.lichHoSo = { ok: true, so: { khoang: "x", hoSo: [] } as never };
    dl.theoDuAn[HV]!.nguonLuc = { ok: true, so: { dong: [], camKet: [{ hopDong: "HD-1", nhaThau: "A", nhanCong: 9, may: 2, lyDoChuaCo: null }] } as never };
    const khongPl = locDuLieuKhoi(dl, { thayHet: false, thay: (agent) => agent !== "phaply" });
    expect(khongPl.theoDuAn[HV]!.lichHoSo).toEqual({ ok: false, loi: AN_NGAN });
    const khongHd = locDuLieuKhoi(dl, { thayHet: false, thay: (agent) => agent !== "hopdong" });
    const nl = khongHd.theoDuAn[HV]!.nguonLuc;
    expect(nl && nl.ok && nl.so.camKet).toBeNull();
    expect(khongHd.theoDuAn[HV]!.lichHoSo!.ok).toBe(true);
  });
});

describe("bài kiểm người đọc (G4, 28/10): bản Telegram không lộ chữ của máy, không ghi mã", () => {
  const bc = bcMau();
  const khoi = khoiMau();
  const CAM = [/tan-thanh/i, /tầng [ABC]\b/i, /\bcổng\b/i, /lượt tính lỗi/i, /\bISS-/, /bị loại/, /bản sao/, /\bMT\b/, /\bBL\b/, /[▲▼]/, /% cắt/, /xem ở Main/];
  it("mọi khối trong bộ đầy đủ: không chữ cấm, không mã công việc (6.1.4) hay mã hồ sơ (HV-09-01)", () => {
    const tatCa = DANH_MUC_KHOI.map((k) => ({ ma: k.ma, phamVi: "cong-ty" as const }));
    const ban = dungBoKhoi({ bc, khoi, boKhoi: tatCa, thamSo: THAM_SO_MAU["tong-quat"], duAnChon: null, dayDu: false });
    const chu = [ban.dau, ...ban.khoi.map((k) => k.chu)].join("\n");
    for (const c of CAM) expect(chu, String(c)).not.toMatch(c);
    expect(chu).not.toMatch(/\b\d+\.\d+\.\d+(\.\d+)*\b/);
    expect(chu).not.toMatch(/\b[A-Z]{1,4}-\d{2}-\d{2}\b/);
  });
  it("«Sáng nay cần biết» ở đầu bản: tối đa 5 câu, mỗi câu mang tên khối", () => {
    const ban = dungBoKhoi({ bc, khoi, boKhoi: BO_MAC_DINH["tong-quat"], thamSo: THAM_SO_MAU["tong-quat"], duAnChon: null, dayDu: false });
    const dong = ban.dau.split("\n").filter((d) => d.startsWith("▸ "));
    expect(ban.dau).toContain("SÁNG NAY CẦN BIẾT");
    expect(dong.length).toBeGreaterThanOrEqual(2);
    expect(dong.length).toBeLessThanOrEqual(5);
  });
});

describe("bốn khối mới 28/10: NT-2 · NT-3 · CT-1 · CT-2 (hình dạng đo thật từ agent chủ)", () => {
  const bc = bcMau();
  // Câu trả lời THẬT của agent đo 27/10 (nghiemthu.so_lieu_sang · tiendo.nguon_luc_huy_dong · hopdong.cam_ket_nha_thau · tiendo.nhat_ky_thi_cong), qua bộ đọc
  const soLieuNt = docSoLieuNghiemThu({
    tinh_luc: "2026-10-27T02:39:58.896Z",
    ngay_thi_cong_moi_nhat: "2026-10-11",
    no_nghiem_thu_qua_han: { so_the: 1, nguong_ngay: 7, cac_the: [{ id: "NT-NO-HM-HV-01|NT-03-HV-HD02", tieu_de: "Chung công trường: 3 dòng BOQ thi công rồi quá 7 ngày chưa nghiệm thu", muc: "lâu nhất 37 ngày" }] },
    phieu_cho_ky_qua_han: { so_the: 1, nguong_gio: 24, cac_the: [{ id: "NT-PG-1", tieu_de: "Phiếu HV-EPC-ENC-CBCT-PYC-013 — Kiểm tra trạm trộn bê tông: chờ BQL ký quá hạn 24 giờ", muc: "quá 31 giờ" }] },
  });
  const nguonLuc = docNguonLuc(
    { tu_ngay: "2026-10-05", den_ngay: "2026-10-11", dong: [{ thau_phu: "SNP", so_ngay_co_bc: 6, nhan_cong_binh_quan: 10, may_chinh_binh_quan: 2 }, { thau_phu: "TS", so_ngay_co_bc: 7, nhan_cong_binh_quan: 25.7, may_chinh_binh_quan: 6 }] },
    16,
  );
  nguonLuc.camKet = docCamKet({ hop_dong: [{ ma_hop_dong: "NT-03-HV-HD02", ten: "Tổng thầu EPC", nha_thau: "Công ty Cổ phần ENC", co_so: false, tong_nhan_cong: null, tong_may: null, ly_do_chua_co: "cam kết bằng lời" }] });
  const nhatKy = docNhatKy(
    {
      ngay: [
        {
          ngay: "2026-10-11",
          bao_cao: [
            {
              nha_thau: "TS",
              thoi_tiet: { tinh_trang: "Nắng", anh_huong: "Không ảnh hưởng" },
              nhan_cong: [{ ten: "CN", so: 20 }],
              may: [{ ten: "máy đào", so: 2 }],
              cong_viec: [{ ma_boq: "A.13-02", ten: "Xây dựng nhà ở, kho xưởng công trường", don_vi: "m2", kl_ngay: 12.5, tinh_trang: "Đang thi công" }],
              ngoai_boq: [{ ten: "Bơm nước hố móng", don_vi: "ca", kl: 2 }],
              vuong_mac: [{ ma: "A.13-02", ten: "Xây dựng nhà ở, kho xưởng công trường", vuong_mac: "Thiếu tôn lợp mái, còn 200 m2 chưa về", giai_phap: "Đề nghị Ban điều hành cấp bổ sung 200 m2 tôn trước 13/10/2026" }],
            },
          ],
        },
      ],
    },
    16,
  )!;
  const khoi = {
    daGom: {},
    gomLuc: "2026-10-27T00:00:00.000Z",
    keoVe: {},
    theoDuAn: { [HV]: { soLieuNt: { ok: true as const, so: soLieuNt }, nguonLuc: { ok: true as const, so: nguonLuc }, nhatKy: { ok: true as const, so: nhatKy } } },
  } as unknown as DuLieuKhoi;
  const in1 = (ma: "NT-2" | "NT-3" | "CT-1" | "CT-2") => dungBoKhoi({ bc, khoi, boKhoi: [{ ma, phamVi: "cong-ty" }], thamSo: THAM_SO_MAU["du-an"], duAnChon: null, dayDu: false }).khoi[0]!;

  it("NT-2: thẻ phiếu không mã, nói quá bao nhiêu giờ so với ngưỡng", () => {
    const k = in1("NT-2");
    expect(k.chu).toContain("1 phiếu nghiệm thu chờ Ban QLDA ký quá 24 giờ · lâu nhất quá 31 giờ: Kiểm tra trạm trộn bê tông");
    expect(k.chu).toContain("Kiểm tra trạm trộn bê tông\n  chờ Ban QLDA ký quá 31 giờ (ngưỡng 24 giờ)");
    expect(k.chu).not.toContain("HV-EPC");
    expect(k.chu).toContain("27/10/2026 09:39");
  });
  it("NT-3: thẻ hạng mục, số dòng BOQ + lâu nhất bao nhiêu ngày", () => {
    const k = in1("NT-3");
    expect(k.chu).toContain("1 hạng mục đã thi công quá 7 ngày mà chưa nghiệm thu · lâu nhất 37 ngày: Chung công trường");
    expect(k.chu).toContain("3 dòng BOQ đã thi công mà quá 7 ngày vẫn chưa có biên bản nghiệm thu đã ký · lâu nhất 37 ngày");
    expect(k.chu).toContain("tới 11/10/2026");
  });
  it("CT-1: nhân lực + máy từng thầu phụ; số cũ ghi rõ; cam kết bằng lời thì nói chưa so được", () => {
    const k = in1("CT-1");
    expect(k.chu).toContain("2 thầu phụ báo cáo huy động ở 1 dự án · cộng nhân công bình quân 35,7 người");
    expect(k.chu).toContain("TS\n  nhân công bình quân 25,7 người · máy chính bình quân 6 · có báo cáo 7 ngày trong kỳ");
    expect(k.chu).toContain("báo cáo mới nhất đã cũ 16 ngày so với hôm qua");
    expect(k.chu).toContain("chỉ cam kết nhân lực / máy bằng lời, không ghi số");
  });
  it("CT-1: người không được xem hợp đồng thì không thấy dòng cam kết", () => {
    const loc = { thayHet: false, thay: () => false } as unknown as BoLocMat;
    const k = dungBoKhoi({ bc, khoi, boKhoi: [{ ma: "CT-1", phamVi: "cong-ty" }], thamSo: THAM_SO_MAU["du-an"], duAnChon: null, loc, dayDu: false }).khoi[0]!;
    expect(k.chu).not.toContain("cam kết");
  });
  it("CT-2: nhà thầu, việc làm có khối lượng, ngoài BOQ, vướng mắc kèm đề xuất", () => {
    const k = in1("CT-2");
    expect(k.chu).toContain("1 nhà thầu báo cáo ngày 11/10/2026 · 1 vướng mắc cần Ban QLDA gỡ");
    expect(k.chu).toContain("TS\n  20 nhân công, 2 máy · thời tiết nắng");
    expect(k.chu).toContain("Làm: Xây dựng nhà ở, kho xưởng công trường 12,5 m2");
    expect(k.chu).toContain("Ngoài BOQ: Bơm nước hố móng 2 ca");
    expect(k.chu).toContain("Vướng mắc: Xây dựng nhà ở, kho xưởng công trường — Thiếu tôn lợp mái, còn 200 m2 chưa về → đề xuất: Đề nghị Ban điều hành cấp bổ sung 200 m2 tôn trước 13/10/2026");
  });
  it("chưa gom số: mỗi khối nói «chưa có số», không báo sạch giả", () => {
    for (const ma of ["NT-2", "NT-3", "CT-1", "CT-2"] as const) {
      const k = dungBoKhoi({ bc, khoi: null, boKhoi: [{ ma, phamVi: "cong-ty" }], thamSo: THAM_SO_MAU["du-an"], duAnChon: null, dayDu: false }).khoi[0]!;
      expect(k.chu, ma).toMatch(/⚠ .+: chưa có số/);
    }
  });
});

describe("hai khối «nhìn tới» 28/10: VS-1 · PL-2 + dòng đầu NT-3 (hình dạng đo thật, phương án A KE-HOACH/36)", () => {
  const bc = bcMau();
  const viecSapToi = docViecSapToi({
    tu_ngay: "2026-10-27",
    den_ngay: "2026-11-02",
    ngay_danh_gia: "2026-10-11",
    tong_so: 3,
    so_viec_gang: 1,
    viec: [
      { ma_wbs: "5.1", ten: "Chuyển mục đích sử dụng rừng", ten_nhom_cha: "Pháp lý", nha_thau: "BQL", da_xong: true, tren_duong_gang: false, cau_so_baseline: "Xong sớm 32 ngày so với Baseline", cham_ngay_so_baseline: -32 },
      { ma_wbs: "7.1", ten: "Thỏa thuận đấu nối", ten_nhom_cha: "Thỏa thuận ngành điện", nha_thau: "BQL", da_xong: false, tren_duong_gang: false, du_bao_bat_dau: "2026-10-28", du_bao_xong: "2026-12-01", cau_so_baseline: "Chậm khởi công 22 ngày so với Baseline", cham_ngay_so_baseline: 22 },
      { ma_wbs: "6.1.4", ten: "Cung cấp Hub, Nacelle, Blade", ten_nhom_cha: "Hợp đồng cung cấp turbine", nha_thau: "NCC Thiết bị", da_xong: false, tren_duong_gang: true, du_bao_bat_dau: "2026-10-27", du_bao_xong: "2027-06-21", cau_so_baseline: "Chậm khởi công 40 ngày so với Baseline", cham_ngay_so_baseline: 40 },
    ],
  });
  const lichHoSo = docLichHoSo({
    khoang: "30 ngày · 27/10/2026 – 25/11/2026",
    dem: { qua_han: 48 },
    ho_so: [
      { ho_so: "HV-AI-27 Kết quả thẩm tra hồ sơ thiết kế bản vẽ thi công", co_quan: "Đơn vị tư vấn thẩm tra độc lập", han: "13/11/2026", tinh_hinh: "còn 17 ngày tới hạn phải có 13/11/2026", trang_thai: "Chưa nộp được", dang_cho: "đang chờ hồ sơ gốc HV-04-03 Biên bản họp tham vấn cộng đồng" },
      { ho_so: "HV-AI-05 Quyết định phê duyệt phương án trồng rừng thay thế", co_quan: "UBND tỉnh / Sở Nông nghiệp và Môi trường", han: "30/10/2026", tinh_hinh: "còn 3 ngày tới hạn phải có 30/10/2026", trang_thai: "Chưa nộp được", dang_cho: "đang chờ hồ sơ gốc HV-04-03 Biên bản họp tham vấn cộng đồng" },
    ],
  });
  const doiChieuKl = docDoiChieuKl({ ngay_so_thi_cong: "11/10/2026", tong: { so_hang_muc: 29, pt_thi_cong_theo_gia_tri: 2.5, pt_nghiem_thu_theo_gia_tri: 0.2, pt_con_no_theo_gia_tri: 2.3, bien_ban_xong: "5/68" } });
  const soLieuNt = docSoLieuNghiemThu({ tinh_luc: "2026-10-27T02:39:58.896Z", ngay_thi_cong_moi_nhat: "2026-10-11", no_nghiem_thu_qua_han: { so_the: 1, nguong_ngay: 7, cac_the: [{ tieu_de: "Chung công trường: 3 dòng BOQ thi công rồi quá 7 ngày chưa nghiệm thu", muc: "lâu nhất 37 ngày" }] } });
  const khoi = {
    daGom: {},
    gomLuc: "2026-10-27T00:00:00.000Z",
    keoVe: {},
    theoDuAn: { [HV]: { viecSapToi: { ok: true as const, so: viecSapToi }, lichHoSo: { ok: true as const, so: lichHoSo }, doiChieuKl: { ok: true as const, so: doiChieuKl }, soLieuNt: { ok: true as const, so: soLieuNt } } },
  } as unknown as DuLieuKhoi;
  const in1 = (ma: "VS-1" | "PL-2" | "NT-3", loc?: BoLocMat) => dungBoKhoi({ bc, khoi, boKhoi: [{ ma, phamVi: "cong-ty" }], thamSo: THAM_SO_MAU["du-an"], duAnChon: null, loc, dayDu: false }).khoi[0]!;

  it("VS-1: bỏ việc đã xong; việc găng trên đầu rồi việc chậm nhiều nhất; ghi số cũ của Tiến độ", () => {
    const k = in1("VS-1").chu;
    expect(k).toContain("2 việc sắp khởi công hoặc phải xong trong");
    expect(k).toContain("1 việc nằm trên đường găng");
    expect(k).not.toContain("Chuyển mục đích sử dụng rừng");
    expect(k.indexOf("Cung cấp Hub")).toBeLessThan(k.indexOf("Thỏa thuận đấu nối"));
    expect(k).toContain("dự báo khởi công 27/10/2026 · xong 21/06/2027 · Chậm khởi công 40 ngày so với Baseline · thầu: NCC Thiết bị");
    expect(k).toContain("theo ngày 11/10/2026, đã cũ 6 ngày");
    expect(k).not.toContain("6.1.4");
  });
  it("PL-2: gần hạn nhất trên đầu, nói hồ sơ gốc đang chặn, không mã; người không xem pháp lý thì ẩn", () => {
    const k = in1("PL-2").chu;
    expect(k).toContain("2 hồ sơ pháp lý sắp đến hạn phải có trong 30 ngày · 27/10/2026 – 25/11/2026");
    expect(k).toContain("2 hồ sơ cùng đang chờ «Biên bản họp tham vấn cộng đồng»");
    expect(k.indexOf("trồng rừng thay thế")).toBeLessThan(k.indexOf("thẩm tra hồ sơ thiết kế"));
    expect(k).toContain("đang chờ hồ sơ gốc: Biên bản họp tham vấn cộng đồng");
    expect(k).not.toMatch(/HV-AI|HV-04/);
    const an = in1("PL-2", { thayHet: false, thay: () => false } as unknown as BoLocMat).chu;
    expect(an).toContain("ẩn — tài liệu mật");
    expect(an).not.toContain("trồng rừng");
  });
  it("NT-3: dòng đầu nói toàn dự án đã thi công bao nhiêu, nghiệm thu bao nhiêu, ngay dưới câu kết luận", () => {
    const k = in1("NT-3").chu;
    expect(k).toContain("Toàn dự án Hướng Việt: đã thi công 2,5% giá trị, đã nghiệm thu 0,2%, còn nợ nghiệm thu 2,3% · 5/68 biên bản đã ký");
    expect(k.indexOf("1 hạng mục")).toBeLessThan(k.indexOf("Toàn dự án"));
  });
  it("chưa gom số: VS-1 và PL-2 nói «chưa có số»", () => {
    for (const ma of ["VS-1", "PL-2"] as const) {
      const k = dungBoKhoi({ bc, khoi: null, boKhoi: [{ ma, phamVi: "cong-ty" }], thamSo: THAM_SO_MAU["du-an"], duAnChon: null, dayDu: false }).khoi[0]!;
      expect(k.chu, ma).toMatch(/⚠ .+: chưa có số/);
    }
  });
});
