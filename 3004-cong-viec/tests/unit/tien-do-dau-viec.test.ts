// ============================================================
// TEST: CÂY ĐẦU VIỆC DÙNG CHUNG — khuôn K1 cắt trang + một bộ nhớ (QS-075 + QS-078)
// Giả lập Agent tiến độ — KHÔNG gọi 3003.
// Agent Công việc 03/10/2026: chép từ Agent Base (tests/unit/cay-dau-viec.test.ts), bỏ ca
// "từ điển mã→tên" vì app này chưa có lib/chung/tu-dien-ma-du-an.
// ============================================================

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { KhuonTra } from "@/lib/mcp/khuon";

/** Cây giả 330 đầu việc — đúng cỡ HV đo 25/09 */
const CAY = Array.from({ length: 330 }, (_, i) => ({ wbs: `9.${i + 1}`, name: `Việc ${i + 1}`, critical: i % 30 === 0 }));

const soLanHoi = { n: 0 };
const thamSoDaGui: Record<string, unknown>[] = [];

/** Tiến độ theo K1: gioi_han ≤ 100, vi_tri, tong_so, con_nua */
function tienDoK1(ts: Record<string, unknown>): KhuonTra {
  const gh = Math.min(Number(ts.gioi_han ?? 50), 100);
  const vt = Number(ts.vi_tri ?? 0);
  const trang = CAY.slice(vt, vt + gh);
  return {
    ok: true,
    du_lieu: { total: CAY.length, tong_so: CAY.length, vi_tri: vt, so_tra_ve: trang.length, con_nua: vt + trang.length < CAY.length, tasks: trang },
    nguon: [{ loai: "tien-do", ma: "HV", file_goc: "schedule.json" }],
    thoi_diem_tra_loi: "2026-09-27T01:00:00.000Z",
    canh_bao: [],
  };
}

/** Tiến độ BẢN CŨ: bỏ qua vi_tri, không có con_nua, trần 500 */
function tienDoCu(ts: Record<string, unknown>): KhuonTra {
  const gh = Math.min(Number(ts.gioi_han ?? 50), 500);
  return {
    ok: true,
    du_lieu: { total: CAY.length, tasks: CAY.slice(0, gh) },
    nguon: [{ loai: "tien-do", ma: "HV", file_goc: "schedule.json" }],
    thoi_diem_tra_loi: "2026-09-27T01:00:00.000Z",
    canh_bao: [],
  };
}

let tienDo: (ts: Record<string, unknown>) => KhuonTra = tienDoK1;

vi.mock("@/lib/nguon-tien-do", () => ({
  hoiTienDo: async (_cc: string, ts: Record<string, unknown>) => {
    soLanHoi.n += 1;
    thamSoDaGui.push(ts);
    await new Promise((r) => setTimeout(r, 10));
    return tienDo(ts);
  },
}));

beforeEach(async () => {
  const { xoaNhoDauViec } = await import("@/lib/tien-do-dau-viec");
  xoaNhoDauViec();
  soLanHoi.n = 0;
  thamSoDaGui.length = 0;
  tienDo = tienDoK1;
});

describe("layHetTheoTrang — khuôn K1", () => {
  it("330 việc → 4 trang gioi_han 100, vi_tri 0/100/200/300, đủ 330, KHÔNG xin quá 100", async () => {
    const { layHetTheoTrang } = await import("@/lib/tien-do-dau-viec");
    const kq = await layHetTheoTrang("HV", "thử", async (ts) => {
      thamSoDaGui.push(ts);
      return tienDoK1(ts);
    });
    expect(kq.ok).toBe(true);
    if (!kq.ok) return;
    expect(kq.du_lieu.tasks.length).toBe(330);
    expect(kq.du_lieu.so_trang).toBe(4);
    expect(kq.du_lieu.bi_cat).toBe(false);
    expect(thamSoDaGui.map((t) => t.vi_tri)).toEqual([0, 100, 200, 300]);
    expect(thamSoDaGui.every((t) => Number(t.gioi_han) <= 100)).toBe(true);
  });

  it("tối đa 10 trang — cây 1.500 việc dừng ở 1.000 và nói rõ bị cắt", async () => {
    const { layHetTheoTrang } = await import("@/lib/tien-do-dau-viec");
    const to = Array.from({ length: 1500 }, (_, i) => ({ wbs: `1.${i}` }));
    let n = 0;
    const kq = await layHetTheoTrang("X", "thử", async (ts) => {
      n += 1;
      const vt = Number(ts.vi_tri);
      return { ok: true, du_lieu: { tasks: to.slice(vt, vt + 100), tong_so: 1500, con_nua: vt + 100 < 1500 }, nguon: [], thoi_diem_tra_loi: "", canh_bao: [] };
    });
    expect(n).toBe(10);
    expect(kq.ok && kq.du_lieu.tasks.length).toBe(1000);
    expect(kq.ok && kq.du_lieu.bi_cat).toBe(true);
    expect(kq.ok && kq.canh_bao.join(" ")).toMatch(/1000\/1500/);
  });

  it("Tiến độ bản cũ (chưa K1): trang đầu 100/330 → xin cả cây MỘT lượt theo luật cũ + cảnh báo", async () => {
    const { layHetTheoTrang } = await import("@/lib/tien-do-dau-viec");
    const kq = await layHetTheoTrang("HV", "thử", async (ts) => {
      thamSoDaGui.push(ts);
      return tienDoCu(ts);
    });
    expect(kq.ok && kq.du_lieu.tasks.length).toBe(330);
    expect(thamSoDaGui.length).toBe(2);
    expect(thamSoDaGui[1]!.gioi_han).toBe(330);
    expect(kq.ok && kq.canh_bao.join(" ")).toMatch(/chưa có khuôn cắt trang K1/);
  });

  it("trang đầu lỗi → trả lỗi nguyên mã; trang sau lỗi → phần đã có + cảnh báo, đánh dấu bị cắt", async () => {
    const { layHetTheoTrang } = await import("@/lib/tien-do-dau-viec");
    const hong = await layHetTheoTrang("HV", "thử", async () => ({ ok: false, ma_loi: "HET_HAN_CHO", thong_diep: "chậm" }));
    expect(hong.ok).toBe(false);
    let n = 0;
    const doDang = await layHetTheoTrang("HV", "thử", async (ts) => {
      n += 1;
      return n === 1 ? tienDoK1(ts) : { ok: false, ma_loi: "HET_HAN_CHO", thong_diep: "chậm" };
    });
    expect(doDang.ok && doDang.du_lieu.tasks.length).toBe(100);
    expect(doDang.ok && doDang.du_lieu.bi_cat).toBe(true);
  });
});

describe("layHetDauViec — MỘT bản cho cả tiến trình", () => {
  it("bảy chỗ gọi cùng lúc (danh sách issue · sinh issue · cây việc…) → một lượt cắt trang (4 lượt hỏi), không phải 7 × 500", async () => {
    const { layHetDauViec } = await import("@/lib/tien-do-dau-viec");
    const kq = await Promise.all(Array.from({ length: 7 }, (_, i) => layHetDauViec("dien-gio-huong-viet-hv-du-lieu", `chỗ gọi ${i}`)));
    expect(kq.every((k) => k.ok && k.du_lieu.tasks.length === 330)).toBe(true);
    expect(soLanHoi.n).toBe(4);
    expect(kq.filter((k) => !k.tuNho).length).toBe(1);
    // Gọi lại trong 10 phút — không hỏi thêm
    await layHetDauViec("dien-gio-huong-viet-hv-du-lieu", "lượt sau");
    expect(soLanHoi.n).toBe(4);
  });

  it("câu lỗi KHÔNG nhớ — lượt sau hỏi lại", async () => {
    const { layHetDauViec } = await import("@/lib/tien-do-dau-viec");
    tienDo = () => ({ ok: false, ma_loi: "AGENT_KHONG_SAN_SANG", thong_diep: "tắt" });
    expect((await layHetDauViec("HV-LOI", "thử")).ok).toBe(false);
    tienDo = tienDoK1;
    expect((await layHetDauViec("HV-LOI", "thử")).ok).toBe(true);
    expect(soLanHoi.n).toBe(1 + 4);
  });
});
