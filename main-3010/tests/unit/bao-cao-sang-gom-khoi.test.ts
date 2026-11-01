// TEST: GOM SỐ CÁC KHỐI BÁO CÁO SÁNG (gom-khoi.ts — KE-HOACH/23, Mr. Đại chốt 17/10/2026)
// Giả hoiAgent + Bảng điều hành + câu 🤖 — không gọi cổng thật, không gọi AI.
import { beforeEach, describe, expect, it, vi } from "vitest";

const goi: { agent: string; congCu: string; lyDo: string; thamSo: Record<string, unknown> }[] = [];
let cauAi = "6.1 Hợp đồng cung cấp turbine làm COD chậm 86 ngày so với Tiến độ mục tiêu.";

vi.mock("@/lib/nguon/hoi-agent", () => ({
  hoiAgent: vi.fn(async (agent: string, congCu: string, lyDo: string, tc: { tham_so?: Record<string, unknown> } = {}) => {
    goi.push({ agent, congCu, lyDo, thamSo: tc.tham_so ?? {} });
    const ok = (du_lieu: unknown) => ({ ok: true, du_lieu, nguon: [], thoi_diem_tra_loi: new Date().toISOString(), canh_bao: [] });
    if (congCu === "tiendo.duong_gang") {
      return ok({
        cod_du_bao: "2027-10-28",
        hang_muc_tu_lam_cod_cham: [{ wbs: "6.1", ten: "Hợp đồng cung cấp turbine", tu_lam_cod_cham_ngay: 41, trong_do_thoi_tiet_ngay: 0, so_viec_gang: 1 }],
        viec_gang_dang_tre: [],
      });
    }
    if (congCu === "tiendo.gia_dinh_cod") {
      const wbs = String(tc.tham_so?.ve_baseline ?? "");
      return ok({ cod_sau: wbs === "6.1" ? "2027-09-17" : "2027-10-27", cod_keo_ve_ngay: wbs === "6.1" ? 41 : 1 });
    }
    if (congCu === "phaply.ho_so_thieu") return { ok: false, ma_loi: "AGENT_KHONG_SAN_SANG", thong_diep: "Cổng trả mã 404" };
    return ok({});
  }),
}));
vi.mock("@/lib/bang-dieu-hanh/gom", () => ({
  songSongGioiHan: async <T, R>(ds: T[], _n: number, fn: (x: T) => Promise<R>) => Promise.all(ds.map(fn)),
  gomBangDieuHanh: vi.fn(async (ma: string) => ({ dangChon: ma })),
}));
vi.mock("@/lib/bang-dieu-hanh/tom-tat-ai", () => ({
  layTomTatAi: vi.fn(async () => ({ ok: true, cau: cauAi, loi: null, tuBoNho: true })),
  // khung số AI được đưa — gom-khoi dùng để ghép «so với …» theo con số (anh duyệt A 28/10); giả lập: khung ghi 56 ngày so với Baseline
  dungPrompt: () => "hạng mục tự làm COD chậm 56 ngày so với Baseline",
}));

import { gomKhoi } from "@/lib/bao-cao-sang/gom-khoi";
import type { DauDuAn, VanDeSang } from "@/lib/bao-cao-sang/luat-cod";
import type { MaKhoi } from "@/lib/bao-cao-sang/khoi";

const HV = "hv";
const dauHV: DauDuAn = {
  maDuAn: HV,
  ten: "Điện gió Hướng Việt",
  coTienDo: true,
  codDuBao: "2027-10-28",
  codMucTieu: "2027-08-03",
  chamNgay: 86,
  chamBaselineNgay: 44,
  codBaseline: "2027-09-14",
  soHomQua: 0,
  lyDoKhongSo: null,
  loi: null,
};
const vanDe: VanDeSang[] = [
  { maDuAn: HV, agent: "tiendo", tenAgent: "Tiến độ", idIssue: "A", wbs: "6.1.4", tenWbs: "Cung cấp Hub", tieuDe: "x", lyDo: ["gang"], soNgayLuiCod: 44, tienVnd: null, mucDo: "do", doLlmSinh: false, cauHoi: null, kem: [] },
];
const can = (ds: [MaKhoi, string[]][]) => new Map(ds.map(([m, d]) => [m, new Set(d)]));

beforeEach(() => {
  goi.length = 0;
  cauAi = "6.1 Hợp đồng cung cấp turbine làm COD chậm 86 ngày so với Tiến độ mục tiêu.";
});

describe("gomKhoi", () => {
  it("chỉ hỏi công cụ của khối cần; lý do gọi nêu tên khối (luật 29)", async () => {
    const dl = await gomKhoi({ ngay: "2026-10-17", duAn: [dauHV], vanDe, can: can([["DA-3", [HV]]]), soKeoVe: new Map() });
    expect(goi.map((g) => g.congCu)).toEqual(["tiendo.s_curve"]);
    expect(goi[0]!.lyDo).toContain("DA-3 S-Curve");
    expect(dl.daGom["DA-3"]).toEqual([HV]);
  });
  it("RQ-3 (27/10): bỏ giả định ① riêng việc đầu; còn «cả hạng mục nặng nhất» — một việc có mã thì không có giả định «mọi việc»", async () => {
    const dl = await gomKhoi({ ngay: "2026-10-17", duAn: [dauHV], vanDe, can: can([["RQ-3", [HV]]]), soKeoVe: new Map() });
    expect(goi.filter((g) => g.congCu === "tiendo.gia_dinh_cod").map((g) => g.thamSo.ve_baseline)).toEqual(["6.1"]);
    const t = dl.theoDuAn[HV]!.thuCod!;
    expect(t.ok && t.so.dong.map((d) => [d.codSau, d.keoVe])).toEqual([["2027-09-17", 41]]);
  });
  it("RQ-3 (27/10): từ 2 việc làm chậm COD thì thêm «mọi việc về đúng Baseline» trong MỘT lượt (danh sách mã, tối đa 20)", async () => {
    const hai = [vanDe[0]!, { ...vanDe[0]!, idIssue: "B", wbs: "7.2.3", tenWbs: "Thi công" }];
    const dl = await gomKhoi({ ngay: "2026-10-17", duAn: [dauHV], vanDe: hai, can: can([["RQ-3", [HV]]]), soKeoVe: new Map() });
    expect(goi.filter((g) => g.congCu === "tiendo.gia_dinh_cod").map((g) => g.thamSo.ve_baseline)).toEqual(["6.1.4, 7.2.3", "6.1"]);
    const t = dl.theoDuAn[HV]!.thuCod!;
    expect(t.ok && t.so.dong[0]!.nhan).toBe("Mọi 2 việc làm chậm COD về đúng Baseline");
  });
  it("RQ-1 cột kéo COD về: đúng số việc đầu mỗi dự án", async () => {
    const dl = await gomKhoi({ ngay: "2026-10-17", duAn: [dauHV], vanDe, can: can([["RQ-1", [HV]]]), soKeoVe: new Map([[HV, 5]]) });
    expect(dl.keoVe[`${HV}|6.1.4`]).toMatchObject({ soNgay: 1, codSau: "2027-10-27", loi: null });
    expect(goi.some((g) => g.congCu === "tiendo.duong_gang")).toBe(false);
  });
  it("agent hỏng → ô đó «chưa có số» kèm câu agent, không ném lỗi", async () => {
    const dl = await gomKhoi({ ngay: "2026-10-17", duAn: [dauHV], vanDe, can: can([["RQ-5", [HV]]]), soKeoVe: new Map() });
    expect(dl.theoDuAn[HV]!.hoSo).toEqual({ ok: false, loi: "Agent Pháp lý: Cổng trả mã 404" });
  });
  it("TQ-5: câu 🤖 nói chậm mà thiếu «so với» → loại (luật 36)", async () => {
    cauAi = "6.1 Hợp đồng cung cấp turbine làm COD chậm 86 ngày, kéo theo 20 việc.";
    const dl = await gomKhoi({ ngay: "2026-10-17", duAn: [dauHV], vanDe, can: can([["TQ-5", [HV]]]), soKeoVe: new Map() });
    expect(dl.theoDuAn[HV]!.cauAi!.cau).toBeNull();
    expect(dl.theoDuAn[HV]!.cauAi!.loi).toContain("luật 36");
  });
  it("TQ-5 (anh duyệt A 28/10): câu thiếu «so với» nhưng con số đã có hệ trong khung AI được đưa → code ghép, GIỮ câu", async () => {
    cauAi = "Hạng mục 6.1 Hợp đồng cung cấp turbine kéo chậm 56 ngày, pháp lý thiếu 78/97 hồ sơ.";
    const dl = await gomKhoi({ ngay: "2026-10-17", duAn: [dauHV], vanDe, can: can([["TQ-5", [HV]]]), soKeoVe: new Map() });
    expect(dl.theoDuAn[HV]!.cauAi!.cau).toContain("chậm 56 ngày so với Baseline");
    expect(dl.theoDuAn[HV]!.cauAi!.loi).toBeNull();
  });
  it("dự án chưa có tiến độ: không hỏi công cụ Tiến độ", async () => {
    await gomKhoi({ ngay: "2026-10-17", duAn: [{ ...dauHV, coTienDo: false }], vanDe, can: can([["DA-3", [HV]], ["TQ-2", [HV]]]), soKeoVe: new Map() });
    expect(goi).toHaveLength(0);
  });
});
