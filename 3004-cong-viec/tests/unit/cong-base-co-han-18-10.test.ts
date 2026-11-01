// ============================================================
// Cổng base của agent Công việc — công cụ MỚI base.viec_co_han_trong_khoang (18/10/2026)
// Cho Bảng 11 «Kế hoạch tháng tới» của báo cáo tháng Main (KE-HOACH/22 mục 10.2 dòng c): việc CÓ HẠN trong khoảng ngày của
// kỳ, theo dự án — thay cho việc quá hạn còn mở (base.viec_qua_han) Main đang tạm dùng.
// Phần thuần (đọc tham số · lọc · chữ trạng thái) + chạy thật trên CSDL RAM. Không gọi agent khác, không gọi AI.
// ============================================================
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { csdlMoi } from "../helpers/csdl";
import { tx } from "@/lib/db";
import { gioVn } from "@/lib/chung/gio-vn";
import { congNgay, khoangNgay } from "@/lib/phong/tuan";
import { docKhoangHoi, laNgayIso, locViecCoHan, tinhTrangTheoHan } from "@/lib/mcp/cong-base-thuan";

const CONG_CU = "base.viec_co_han_trong_khoang";
const T = gioVn(new Date()).ngay;
const N = (n: number) => congNgay(T, n);

type DongViec = {
  ma_viec_base: string;
  ten: string;
  han: string;
  nguoi_phu_trach: string | null;
  ten_nguoi_phu_trach: string | null;
  loai_phu_trach: string | null;
  trang_thai: string;
  trang_thai_chu: string;
  da_qua_han: boolean | null;
  qua_han_ngay: number | null;
  xong_ngay: string | null;
  ma_wbs: string | null;
  ma_wbs_cho_duyet: string | null;
  ten_wbs: string | null;
};
type DuLieu = {
  ma_du_an: string;
  khoang: string;
  con_mo_thoi: boolean;
  so_viec: number;
  so_viec_da_qua_han: number;
  pham_vi_da_soat: { so_viec_khong_khai_han: number; so_viec_khong_thuoc_dau_viec_wbs_co_han_trong_khoang: number };
  viec: DongViec[];
  ghi_chu?: string;
  dinh_nghia: string;
};

let tmp = "";
let maTruongCd = "";

beforeAll(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cv-co-han-18-10-"));
  process.env.DOCFLOW_AI_DATA = tmp;
  await csdlMoi();
  await tx(async (q) => {
    maTruongCd = (await q.query<{ id: string }>("SELECT id FROM identity.nguoi_dung WHERE email = 'truong.cd@scigroup.vn'")).rows[0]!.id;
    // [mã, tên, dự án (chữ trong sổ), trạng thái, hạn, ngày xong, loại chủ trì, mã chủ trì]
    const viec: [string, string, string, string, string | null, string | null, "nguoi" | "don_vi", string][] = [
      ["CV-K-1", "Thi công san nền khu trụ T5", "ĐG Hướng Việt", "dang_mo", N(10), null, "don_vi", "p-cd"],
      ["CV-K-2", "Chuẩn bị thử nghiệm tần số", "ĐG Hướng Việt", "dang_mo", N(5), null, "nguoi", maTruongCd],
      ["CV-K-3", "Nộp hồ sơ hoàn công trụ T3", "ĐG Hướng Việt", "hoan_thanh", N(12), N(-1), "don_vi", "p-cd"],
      ["CV-K-4", "Lắp tuabin trụ T9", "ĐG Hướng Việt", "dang_mo", N(40), null, "don_vi", "p-cd"],
      ["CV-K-5", "Theo dõi an toàn công trường", "ĐG Hướng Việt", "dang_mo", null, null, "don_vi", "p-cd"],
      ["CV-K-6", "Họp giao ban nội bộ tháng", "ĐG Hướng Việt", "dang_mo", N(20), null, "don_vi", "p-cd"],
      ["CV-K-7", "Đôn đốc lô Hub thứ hai", "ĐG Hướng Việt", "dang_mo", N(-5), null, "don_vi", "p-cd"],
      ["CV-K-8", "Nghiệm thu móng trụ T2", "ĐG Hướng Việt", "hoan_thanh", N(-8), N(-3), "don_vi", "p-cd"],
      ["CV-K-9", "Khảo sát tuyến đường dây", "ĐG Tân Thành", "dang_mo", N(10), null, "don_vi", "p-cd"],
    ];
    for (const [id, ten, duAn, tt, han, xong, loai, pt] of viec) {
      await q.query("INSERT INTO docflow.cong_viec (id, ten, du_an, trang_thai, ket_thuc, dong_luc) VALUES ($1,$2,$3,$4,$5,$6)", [
        id,
        ten,
        duAn,
        tt,
        han,
        xong ? `${xong}T03:00:00Z` : null,
      ]);
      await q.query("INSERT INTO docflow.phan_viec (id, cong_viec_id, phu_trach_loai, phu_trach_id, noi_dung, vai) VALUES ($1,$2,$3,$4,$5,'chu_tri')", [
        `${id}-p`,
        id,
        loai,
        pt,
        ten,
      ]);
    }
    // [mã việc, mã WBS (null = không thuộc đầu việc nào), tên WBS, trạng thái gắn]
    const gan: [string, string | null, string | null, string][] = [
      ["CV-K-1", "7.2.3", "Thi công san nền", "da_duyet"],
      ["CV-K-2", "9.6.4", "Thử nghiệm tần số", "cho_duyet"],
      ["CV-K-6", null, null, "da_duyet"],
    ];
    for (const [id, ma, tenWbs, tt] of gan) {
      await q.query(
        "INSERT INTO docflow.wbs_viec (cong_viec_id, du_an_id, ma_wbs, ten_wbs, ly_do, do_chac, nguon, trang_thai) VALUES ($1,'HV',$2,$3,'bài kiểm',0.9,'ai',$4)",
        [id, ma, tenWbs, tt],
      );
    }
  });
});

afterAll(() => {
  delete process.env.DOCFLOW_AI_DATA;
  fs.rmSync(tmp, { recursive: true, force: true });
});

async function hoi(thamSo: Record<string, unknown>) {
  const { chayCongCu } = await import("@/lib/mcp/cong-base");
  return chayCongCu(CONG_CU, thamSo);
}

describe("phần thuần — tham số · lọc · chữ trạng thái", () => {
  it("ngày phải đúng yyyy-mm-dd và có thật trên lịch", () => {
    expect(laNgayIso("2026-11-30")).toBe(true);
    expect(laNgayIso("2028-02-29")).toBe(true);
    expect(laNgayIso("2026-02-30")).toBe(false);
    expect(laNgayIso("30/11/2026")).toBe(false);
    expect(laNgayIso("2026-11-30T00:00")).toBe(false);
  });

  it("đọc tham số: thiếu ngày · ngày sai · đảo ngày · con_mo_thoi lạ → câu lỗi tiếng Việt; mặc định chỉ việc đang mở", () => {
    const loi = (ts: Record<string, unknown>) => {
      const r = docKhoangHoi(ts);
      return r.ok ? "" : r.loi.ok ? "?" : `${r.loi.ma_loi}: ${r.loi.thong_diep}`;
    };
    expect(loi({ tu_ngay: "2026-11-01" })).toMatch(/^KHONG_HIEU_YEU_CAU: Thiếu `tu_ngay` hoặc `den_ngay`/);
    expect(loi({ tu_ngay: "2026-11-01", den_ngay: "2026-02-30" })).toMatch(/không phải ngày dạng yyyy-mm-dd/);
    expect(loi({ tu_ngay: "2026-11-30", den_ngay: "2026-11-01" })).toMatch(/30\/11\/2026 nằm SAU `den_ngay` 01\/11\/2026/);
    expect(loi({ tu_ngay: "2026-11-01", den_ngay: "2026-11-30", con_mo_thoi: "co" })).toMatch(/con_mo_thoi/);
    const k = (cm: unknown) => {
      const r = docKhoangHoi({ tu_ngay: "2026-11-01", den_ngay: "2026-11-30", con_mo_thoi: cm });
      return r.ok ? r.khoang.conMoThoi : null;
    };
    expect(k(undefined)).toBe(true);
    expect(k(true)).toBe(true);
    expect(k("false")).toBe(false);
    expect(k(false)).toBe(false);
    expect(k(0)).toBe(false);
  });

  it("lọc: tính CẢ ngày đầu và ngày cuối, hạn sớm lên trước, bỏ việc không hạn", () => {
    const v = (id: string, han: string | null, daXong = false) => ({ id, han, daXong });
    const ds = [v("C", "2026-11-30"), v("A", "2026-11-01"), v("B", "2026-10-31"), v("D", "2026-12-01"), v("E", null), v("F", "2026-11-15", true)];
    const k = { tu: "2026-11-01", den: "2026-11-30", conMoThoi: true };
    expect(locViecCoHan(ds, k).map((x) => x.id)).toEqual(["A", "C"]);
    expect(locViecCoHan(ds, { ...k, conMoThoi: false }).map((x) => x.id)).toEqual(["A", "F", "C"]);
  });

  it("trạng thái nói bằng NGÀY so với hạn (luật 35), số theo chuẩn Việt", () => {
    const h = "2026-10-18";
    expect(tinhTrangTheoHan({ daXong: false, han: "2026-10-13" }, h)).toEqual({
      trang_thai: "dang_mo",
      trang_thai_chu: "Đang mở — quá hạn 5 ngày",
      da_qua_han: true,
      qua_han_ngay: 5,
    });
    expect(tinhTrangTheoHan({ daXong: false, han: "2026-10-18" }, h).trang_thai_chu).toBe("Đang mở — đến hạn hôm nay");
    expect(tinhTrangTheoHan({ daXong: false, han: "2026-10-30" }, h)).toMatchObject({ trang_thai_chu: "Đang mở — còn 12 ngày", da_qua_han: false, qua_han_ngay: 0 });
    expect(tinhTrangTheoHan({ daXong: true, han: "2026-10-15", xongNgay: "2026-10-20" }, h)).toEqual({
      trang_thai: "da_xong",
      trang_thai_chu: "Xong ngày 20/10/2026 — trễ 5 ngày so với hạn",
      da_qua_han: true,
      qua_han_ngay: 5,
    });
    expect(tinhTrangTheoHan({ daXong: true, han: "2026-10-25", xongNgay: "2026-10-20" }, h)).toMatchObject({ trang_thai_chu: "Xong ngày 20/10/2026", da_qua_han: false, qua_han_ngay: 0 });
    expect(tinhTrangTheoHan({ daXong: true, han: "2026-10-25", xongNgay: null }, h)).toMatchObject({ da_qua_han: null, qua_han_ngay: null });
    expect(tinhTrangTheoHan({ daXong: false, han: "2023-01-01" }, h).trang_thai_chu).toMatch(/^Đang mở — quá hạn \d\.\d{3} ngày$/);
  });
});

describe(`${CONG_CU} — chạy trên sổ cái`, () => {
  it("mặc định: việc đang mở có hạn trong khoảng, đúng dự án; bỏ việc đã xong, ngoài khoảng, không hạn, không thuộc WBS", async () => {
    const kq = await hoi({ ma_du_an: "HV", tu_ngay: N(1), den_ngay: N(30) });
    expect(kq.ok).toBe(true);
    if (!kq.ok) return;
    const d = kq.du_lieu as DuLieu;
    expect(d.ma_du_an).toBe("HV");
    expect(d.con_mo_thoi).toBe(true);
    expect(d.khoang).toBe(khoangNgay(N(1), N(30)));
    expect(d.khoang).toMatch(/^30 ngày · /);
    expect(d.viec.map((v) => v.ma_viec_base)).toEqual(["CV-K-2", "CV-K-1"]);
    expect(d.so_viec).toBe(2);
    expect(d.so_viec_da_qua_han).toBe(0);
    expect(d.pham_vi_da_soat.so_viec_khong_khai_han).toBe(1);
    expect(d.pham_vi_da_soat.so_viec_khong_thuoc_dau_viec_wbs_co_han_trong_khoang).toBe(1);
    expect(d.ghi_chu).toMatch(/1 việc đang mở KHÔNG khai hạn/);
    expect(d.ghi_chu).toMatch(/không thuộc đầu việc WBS nào/);

    const k1 = d.viec.find((v) => v.ma_viec_base === "CV-K-1")!;
    expect(k1).toMatchObject({
      ten: "Thi công san nền khu trụ T5",
      han: N(10),
      nguoi_phu_trach: "p-cd",
      ten_nguoi_phu_trach: "Phòng Cơ điện",
      loai_phu_trach: "don_vi",
      trang_thai: "dang_mo",
      trang_thai_chu: "Đang mở — còn 10 ngày",
      da_qua_han: false,
      qua_han_ngay: 0,
      xong_ngay: null,
      ma_wbs: "7.2.3",
      ma_wbs_cho_duyet: null,
      ten_wbs: "Thi công san nền",
    });
    // Mã 🤖 chờ duyệt không được coi là mã đã gắn — cùng luật base.trang_thai_cong_viec
    const k2 = d.viec.find((v) => v.ma_viec_base === "CV-K-2")!;
    expect(k2).toMatchObject({ ma_wbs: null, ma_wbs_cho_duyet: "9.6.4", ten_wbs: "Thử nghiệm tần số", ten_nguoi_phu_trach: "Bùi Quế Lâm" });
    expect(kq.nguon[0]?.loai).toBe("so-cai-cong-viec");
  });

  it("khoảng có ngày đã qua: việc đang mở quá hạn ghi số ngày quá; con_mo_thoi=false lấy cả việc đã xong (xong trễ ghi số ngày trễ)", async () => {
    const mo = await hoi({ ma_du_an: "HV", tu_ngay: N(-10), den_ngay: N(30) });
    expect(mo.ok).toBe(true);
    if (!mo.ok) return;
    const dm = mo.du_lieu as DuLieu;
    expect(dm.viec.map((v) => v.ma_viec_base)).toEqual(["CV-K-7", "CV-K-2", "CV-K-1"]);
    expect(dm.viec[0]).toMatchObject({ da_qua_han: true, qua_han_ngay: 5, trang_thai_chu: "Đang mở — quá hạn 5 ngày" });
    expect(dm.so_viec_da_qua_han).toBe(1);

    const ca = await hoi({ ma_du_an: "HV", tu_ngay: N(-10), den_ngay: N(30), con_mo_thoi: false });
    expect(ca.ok).toBe(true);
    if (!ca.ok) return;
    const dc = ca.du_lieu as DuLieu;
    expect(dc.con_mo_thoi).toBe(false);
    expect(dc.viec.map((v) => v.ma_viec_base)).toEqual(["CV-K-8", "CV-K-7", "CV-K-2", "CV-K-1", "CV-K-3"]);
    const k8 = dc.viec[0]!;
    expect(k8).toMatchObject({ trang_thai: "da_xong", xong_ngay: N(-3), da_qua_han: true, qua_han_ngay: 5 });
    expect(k8.trang_thai_chu).toMatch(/— trễ 5 ngày so với hạn$/);
    expect(dc.viec.find((v) => v.ma_viec_base === "CV-K-3")).toMatchObject({ trang_thai: "da_xong", da_qua_han: false, qua_han_ngay: 0 });
    expect(dc.so_viec_da_qua_han).toBe(2);
  });

  it("lọc đúng dự án: Tân Thành chỉ thấy việc Tân Thành", async () => {
    const kq = await hoi({ ma_du_an: "TT", tu_ngay: N(1), den_ngay: N(30) });
    expect(kq.ok).toBe(true);
    if (!kq.ok) return;
    expect((kq.du_lieu as DuLieu).viec.map((v) => v.ma_viec_base)).toEqual(["CV-K-9"]);
  });

  it("chạm trần gioi_han → cảnh báo còn bao nhiêu việc chưa trả", async () => {
    const kq = await hoi({ ma_du_an: "HV", tu_ngay: N(1), den_ngay: N(30), gioi_han: 1 });
    expect(kq.ok).toBe(true);
    if (!kq.ok) return;
    expect((kq.du_lieu as DuLieu).viec).toHaveLength(1);
    expect((kq.du_lieu as DuLieu).so_viec).toBe(2);
    expect((kq.canh_bao ?? []).join(" ")).toMatch(/Còn 1 việc chưa trả về/);
  });

  it("không có việc / sai tham số / dự án lạ → thưa rõ bằng tiếng Việt, không lấy số dự án khác ra thay", async () => {
    const rong = await hoi({ ma_du_an: "HV", tu_ngay: N(100), den_ngay: N(120) });
    expect(rong.ok).toBe(false);
    if (!rong.ok) {
      expect(rong.ma_loi).toBe("KHONG_CO_DU_LIEU");
      expect(rong.thong_diep).toContain(`Không có việc đang mở nào có hạn trong ${khoangNgay(N(100), N(120))} của dự án HV Hướng Việt`);
    }
    const chuaViec = await hoi({ ma_du_an: "BT", tu_ngay: N(1), den_ngay: N(30) });
    expect(!chuaViec.ok && chuaViec.thong_diep).toMatch(/0 việc/);
    const la = await hoi({ ma_du_an: "XYZ", tu_ngay: N(1), den_ngay: N(30) });
    expect(!la.ok && la.ma_loi).toBe("KHONG_CO_DU_LIEU");
    // 27/10/2026 (Đợt 3a Main, KE-HOACH/31): bỏ trống ma_du_an = mọi dự án — không còn là lỗi; ra cả việc của Tân Thành
    const moiDuAn = await hoi({ tu_ngay: N(1), den_ngay: N(30) });
    expect(moiDuAn.ok && (moiDuAn.du_lieu as { viec: { ma_viec_base: string }[] }).viec.map((v) => v.ma_viec_base)).toContain("CV-K-9");
    const saiNgay = await hoi({ ma_du_an: "HV", tu_ngay: "01/11/2026", den_ngay: N(30) });
    expect(!saiNgay.ok && saiNgay.ma_loi).toBe("KHONG_HIEU_YEU_CAU");
  });

  it("khai trong nang_luc; công cụ cũ giữ nguyên — base.viec_qua_han trên cùng sổ vẫn ra đúng 1 việc quá hạn", async () => {
    const { DANH_MUC, chayCongCu } = await import("@/lib/mcp/cong-base");
    const ten = DANH_MUC.map((c) => c.ten);
    expect(DANH_MUC.find((c) => c.ten === CONG_CU)).toMatchObject({ san_sang: true });
    for (const cu of [
      "nang_luc",
      "suc_khoe",
      "tim_theo_ma",
      "base.nguoi_phu_trach",
      "base.trang_thai_cong_viec",
      "base.viec_qua_han",
      "base.tai_viec_theo_nguoi",
      "base.co_viec_cho_ma_khong",
      "base.thong_tin_nhan_su",
      "base.viec_cua_toi",
      "base.hoi_trung_viec",
      "base.danh_sach_issue",
    ]) {
      expect(ten).toContain(cu);
    }
    const qh = await chayCongCu("base.viec_qua_han", { ma_du_an: "HV" });
    expect(qh.ok).toBe(true);
    if (!qh.ok) return;
    const d = qh.du_lieu as { so_viec_qua_han: number; viec: { ma_viec_base: string; qua_han_ngay: number }[] };
    expect(d.so_viec_qua_han).toBe(1);
    expect(d.viec[0]).toMatchObject({ ma_viec_base: "CV-K-7", qua_han_ngay: 5 });
  });
});
