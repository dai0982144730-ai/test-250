// ============================================================
// GOM DANH SÁCH — hai khuôn gọi chung (27/09)
//   K1 — tiendo.tim_dau_viec cắt trang 100 dòng (src/lib/nguon/tim-dau-viec-het.ts)
//   K2 — base.co_viec_cho_ma_khong nhận `ds_ma` (hoiBaseNhieuMa, mau-thuan-cheo.ts)
// Chạy OFFLINE: hàm gọi được tiêm vào.
// ============================================================

import { describe, expect, it } from "vitest";
import type { KhuonTra } from "@/lib/mcp/khuon";
import { gomMoiTrang, TOI_DA_TRANG } from "@/lib/nguon/tim-dau-viec-het";
import { hoiBaseNhieuMa, type HamHoiAgent } from "@/lib/bang-dieu-hanh/mau-thuan-cheo";

const tra = (du_lieu: unknown): KhuonTra => ({
  ok: true,
  du_lieu,
  nguon: [{ loai: "tien-do", ma: "HV", file_goc: "schedule.json" }],
  thoi_diem_tra_loi: "2026-09-27T00:00:00Z",
  canh_bao: [],
});
const viec = (n: number) => Array.from({ length: n }, (_, i) => ({ wbs: `1.${i + 1}`, name: `Việc ${i + 1}`, pct: 0 }));

describe("K1 — lặp trang tim_dau_viec", () => {
  it("cổng theo K1: 330 việc → 4 trang vi_tri 0·100·200·300, đủ 330", async () => {
    const tat = viec(330);
    const goi: Record<string, unknown>[] = [];
    const kq = await gomMoiTrang(async (t) => {
      goi.push(t);
      const vt = Number(t.vi_tri ?? 0);
      const trang = tat.slice(vt, vt + 100);
      return tra({ tasks: trang, tong_so: 330, vi_tri: vt, so_tra_ve: trang.length, con_nua: vt + trang.length < 330 });
    });
    expect(goi.map((t) => t.vi_tri)).toEqual([0, 100, 200, 300]);
    expect(goi.every((t) => t.gioi_han === 100)).toBe(true);
    expect(kq.tasks).toHaveLength(330);
    expect(kq.du).toBe(true);
    expect(kq.soLuot).toBe(4);
  });

  it("cổng BẢN CŨ (không có con_nua, total 330, trả 100): xin lại MỘT lượt gioi_han 500", async () => {
    const tat = viec(330);
    const goi: Record<string, unknown>[] = [];
    const kq = await gomMoiTrang(async (t) => {
      goi.push(t);
      const n = Math.min(Number(t.gioi_han), 500);
      return tra({ total: 330, tasks: tat.slice(0, n) });
    });
    expect(goi).toEqual([{ gioi_han: 100, vi_tri: 0 }, { gioi_han: 500 }]);
    expect(kq.tasks).toHaveLength(330);
    expect(kq.du).toBe(true);
  });

  it("dự án nhỏ (40 việc, cổng K1) → một lượt", async () => {
    const kq = await gomMoiTrang(async () => tra({ tasks: viec(40), tong_so: 40, vi_tri: 0, so_tra_ve: 40, con_nua: false }));
    expect(kq.soLuot).toBe(1);
    expect(kq.tasks).toHaveLength(40);
  });

  it("trang đầu hỏng → loi tiếng Việt, 0 việc; trang sau hỏng → giữ phần đã có, du=false", async () => {
    const hong = await gomMoiTrang(async () => ({ ok: false, ma_loi: "HET_HAN_CHO", thong_diep: "Agent tiến độ không trả lời trong 10 giây." }));
    expect(hong.tasks).toHaveLength(0);
    expect(hong.loi).toMatch(/không trả lời/);

    let lan = 0;
    const doDang = await gomMoiTrang(async () =>
      lan++ === 0
        ? tra({ tasks: viec(100), tong_so: 250, con_nua: true })
        : { ok: false, ma_loi: "LOI_NOI_BO", thong_diep: "hỏng" },
    );
    expect(doDang.tasks).toHaveLength(100);
    expect(doDang.du).toBe(false);
    expect(doDang.loi).toMatch(/Mới lấy được 100 việc/);
  });

  it("tối đa 10 trang — cổng cứ báo còn thì dừng ở trang 10, không giả là đủ", async () => {
    const kq = await gomMoiTrang(async () => tra({ tasks: viec(100), tong_so: 5000, con_nua: true }));
    expect(kq.soLuot).toBe(TOI_DA_TRANG);
    expect(kq.du).toBe(false);
  });
});

describe("K2 — base.co_viec_cho_ma_khong nhiều mã một lượt", () => {
  const MA = ["1.1", "1.1.1", "9.6.4", "7.1.12"];

  it("Base đã theo K2: MỘT lượt ds_ma cho mọi mã, tách đúng câu từng mã", async () => {
    const goi: Record<string, unknown>[] = [];
    const hoi: HamHoiAgent = async (_a, _c, _l, tc) => {
      goi.push(tc.tham_so ?? {});
      const ds = (tc.tham_so?.ds_ma as string[]) ?? [];
      return tra({ so_ma: ds.length, ket_qua: ds.map((m) => ({ ma: m, tim_thay_ma: true, so_viec_da_xong: m === "9.6.4" ? 2 : 0 })) });
    };
    const kq = await hoiBaseNhieuMa("hv", MA, "lý do", {}, hoi);
    expect(goi).toHaveLength(1);
    expect(goi[0]).toEqual({ ds_ma: MA, ma_du_an: "hv" });
    expect(kq.roiVeTungMa).toBe(false);
    const k = kq.theoMa.get("9.6.4");
    expect(k?.ok && (k.du_lieu as { so_viec_da_xong: number }).so_viec_da_xong).toBe(2);
    expect(kq.theoMa.size).toBe(4);
  });

  it("Base bản cũ trả KHONG_HIEU_YEU_CAU → rơi về từng mã như cũ (1 + 4 lượt)", async () => {
    const goi: Record<string, unknown>[] = [];
    const hoi: HamHoiAgent = async (_a, _c, _l, tc) => {
      goi.push(tc.tham_so ?? {});
      if (tc.tham_so?.ds_ma) return { ok: false, ma_loi: "KHONG_HIEU_YEU_CAU", thong_diep: "Thiếu ma_he_thong." };
      return tra({ tim_thay_ma: true, so_viec_da_xong: 1 });
    };
    const kq = await hoiBaseNhieuMa("hv", MA, "lý do", {}, hoi);
    expect(goi).toHaveLength(5);
    expect(goi.slice(1).map((t) => t.ma_he_thong)).toEqual(MA);
    expect(kq.roiVeTungMa).toBe(true);
    expect(kq.theoMa.size).toBe(4);
  });

  it("Base tắt → baseTat, không hỏi thêm", async () => {
    let dem = 0;
    const hoi: HamHoiAgent = async () => (dem++, { ok: false, ma_loi: "AGENT_KHONG_SAN_SANG", thong_diep: "Agent Base đang tắt." });
    const kq = await hoiBaseNhieuMa("hv", MA, "lý do", {}, hoi);
    expect(dem).toBe(1);
    expect(kq.baseTat).toBe(true);
    expect(kq.loi).toMatch(/đang tắt/);
  });

  it("hơn 100 mã → chia lô 100 (khuôn K2)", async () => {
    const nhieu = Array.from({ length: 150 }, (_, i) => `2.${i + 1}`);
    const lo: number[] = [];
    const hoi: HamHoiAgent = async (_a, _c, _l, tc) => {
      const ds = tc.tham_so?.ds_ma as string[];
      lo.push(ds.length);
      return tra({ so_ma: ds.length, ket_qua: ds.map((m) => ({ ma: m })) });
    };
    await hoiBaseNhieuMa("hv", nhieu, "lý do", {}, hoi);
    expect(lo).toEqual([100, 50]);
  });
});
