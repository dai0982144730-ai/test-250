// ============================================================
// BỘ NHỚ 10 PHÚT CHO CÂU HỎI ĐỌC — src/lib/nguon/bo-nho-hoi.ts (QS-074 · QS-082 · QS-073)
// Chạy OFFLINE: fetch giả. Bộ nhớ nằm trên globalThis nên mỗi bài xoá tay.
// ============================================================

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/nhat-ky/so", async (goc) => {
  const that = await goc<typeof import("@/lib/nhat-ky/so")>();
  return { ...that, ghiSuKienMach: vi.fn() };
});

import {
  HAN_NHO_MS,
  duocNho,
  hoiCoNho,
  khoaNho,
  soMucDangNho,
  thongTinBanCu,
  xoaBoNhoHoi,
  gioPhut,
} from "@/lib/nguon/bo-nho-hoi";
import { hoiAgent, xoaNgatMach } from "@/lib/nguon/hoi-agent";
import { hoiTienDo } from "@/lib/nguon-tien-do";
import { ghiSuKienMach } from "@/lib/nhat-ky/so";
import type { KhuonTra } from "@/lib/mcp/khuon";

const TOT = (n = 1): KhuonTra => ({
  ok: true,
  du_lieu: { so: n },
  nguon: [{ loai: "tien-do", ma: "HV", file_goc: "schedule.json" }],
  thoi_diem_tra_loi: "2026-09-27T01:30:00.000Z",
  canh_bao: [],
});

function fetchDem(than: unknown) {
  return vi.fn(async () => ({ json: async () => than })) as unknown as typeof fetch & { mock: { calls: unknown[] } };
}

beforeEach(() => {
  xoaBoNhoHoi();
  xoaNgatMach();
  vi.restoreAllMocks();
  vi.mocked(ghiSuKienMach).mockClear();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("khoá + danh sách trắng", () => {
  it("tham số khác thứ tự khoá → cùng một khoá; khác người dùng → khác khoá", () => {
    const a = khoaNho("tiendo", "tiendo.tom_tat_du_an", { ma_du_an: "HV", b: { y: 1, x: 2 } }, undefined);
    const b = khoaNho("tiendo", "tiendo.tom_tat_du_an", { b: { x: 2, y: 1 }, ma_du_an: "HV" }, "");
    expect(a).toBe(b);
    expect(khoaNho("tiendo", "tiendo.tom_tat_du_an", { ma_du_an: "HV" }, "dai")).not.toBe(
      khoaNho("tiendo", "tiendo.tom_tat_du_an", { ma_du_an: "HV" }, "thinh"),
    );
  });

  it("chỉ công cụ ĐỌC trong danh sách trắng được nhớ; sức khoẻ, ghi thì không", () => {
    for (const cc of [
      "tiendo.tom_tat_du_an",
      "tiendo.duong_gang",
      "tiendo.s_curve",
      "tiendo.so_tuan",
      "base.danh_sach_issue",
      "phaply.ho_so_thieu",
      "phaply.ho_so_cua_wbs",
      "base.viec_qua_han",
      "base.quy_trinh_dang_tac",
      "hopdong.phieu_gia_dang_cho",
      "hopdong.gia_tri_luy_ke",
      "tiendo.tim_dau_viec",
      "base.co_viec_cho_ma_khong",
    ]) {
      expect(duocNho(cc), cc).toBe(true);
    }
    for (const cc of ["suc_khoe", "nang_luc", "base.tao_viec", "tiendo.nang_suat", "base.thong_tin_nhan_su"]) {
      expect(duocNho(cc), cc).toBe(false);
    }
  });
});

describe("hoiCoNho — nhớ 10 phút, một lượt bay, chỉ nhớ ok", () => {
  it("lần hai trong 10 phút KHÔNG gọi lại; quá 10 phút thì gọi lại", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-27T08:00:00+07:00"));
    let dem = 0;
    const goi = async () => (dem++, TOT(dem));
    const k = "khoa-1";
    expect((await hoiCoNho(k, goi)).ok).toBe(true);
    await hoiCoNho(k, goi);
    expect(dem).toBe(1);
    vi.setSystemTime(Date.now() + HAN_NHO_MS + 1);
    await hoiCoNho(k, goi);
    expect(dem).toBe(2);
  });

  it("boQuaNho → hỏi thật, và bản mới thay bản cũ", async () => {
    let dem = 0;
    const goi = async () => (dem++, TOT(dem));
    await hoiCoNho("k", goi);
    const moi = await hoiCoNho("k", goi, { boQuaNho: true });
    expect(dem).toBe(2);
    expect(moi.ok && (moi.du_lieu as { so: number }).so).toBe(2);
    const lai = await hoiCoNho("k", goi);
    expect(lai.ok && (lai.du_lieu as { so: number }).so).toBe(2);
  });

  it("hai lượt cùng khoá cùng lúc dùng chung MỘT lời gọi thật", async () => {
    let dem = 0;
    let mo!: () => void;
    const cho = new Promise<void>((r) => (mo = r));
    const goi = async () => {
      dem++;
      await cho;
      return TOT();
    };
    const a = hoiCoNho("k", goi);
    const b = hoiCoNho("k", goi, { boQuaNho: true });
    mo();
    await Promise.all([a, b]);
    expect(dem).toBe(1);
  });

  it("KHONG_CO_DU_LIEU / lỗi KHÔNG được nhớ", async () => {
    let dem = 0;
    const goi = async (): Promise<KhuonTra> => (dem++, { ok: false, ma_loi: "KHONG_CO_DU_LIEU", thong_diep: "không có" });
    await hoiCoNho("k", goi);
    await hoiCoNho("k", goi);
    expect(dem).toBe(2);
    expect(soMucDangNho()).toBe(0);
  });

  it("gọi ném lỗi → trả LOI_NOI_BO, không ném ra ngoài, không kẹt lượt bay", async () => {
    const hong = async (): Promise<KhuonTra> => {
      throw new Error("sập");
    };
    const k = await hoiCoNho("k", hong);
    expect(k.ok).toBe(false);
    const lai = await hoiCoNho("k", async () => TOT());
    expect(lai.ok).toBe(true);
  });
});

describe("QS-073 — bên kia chưa trả lời kịp: dùng bản cũ và nói rõ tuổi", () => {
  it("quá 10 phút + lần mới HET_HAN_CHO + có dungBanCuKhiLoi → trả bản cũ có đánh dấu", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-27T08:00:00+07:00"));
    await hoiCoNho("k", async () => TOT(7));
    vi.setSystemTime(Date.now() + HAN_NHO_MS + 60_000);
    const hetGio = async (): Promise<KhuonTra> => ({
      ok: false,
      ma_loi: "HET_HAN_CHO",
      thong_diep: "Agent tiến độ không trả lời trong 60 giây.",
    });
    const k = await hoiCoNho("k", hetGio, { dungBanCuKhiLoi: true });
    expect(k.ok).toBe(true);
    const cu = thongTinBanCu(k);
    expect(cu).not.toBeNull();
    expect(cu!.lyDo).toMatch(/60 giây/);
    expect(gioPhut(cu!.luc)).toBe("08:30"); // 01:30Z = 08:30 giờ Việt Nam
    // không bật tuỳ chọn (trợ lý chat) → nói thật là lỗi
    const k2 = await hoiCoNho("k", hetGio);
    expect(k2.ok).toBe(false);
  });

  it("KHONG_CO_DU_LIEU mới là câu trả lời thật → KHÔNG thay bằng bản cũ", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-27T08:00:00+07:00"));
    await hoiCoNho("k", async () => TOT());
    vi.setSystemTime(Date.now() + HAN_NHO_MS + 1);
    const k = await hoiCoNho(
      "k",
      async (): Promise<KhuonTra> => ({ ok: false, ma_loi: "KHONG_CO_DU_LIEU", thong_diep: "hết" }),
      { dungBanCuKhiLoi: true },
    );
    expect(k.ok).toBe(false);
  });
});

describe("gắn vào hai cửa đi hỏi", () => {
  it("hoiAgent: cùng câu đọc hai lần → một lượt fetch; công cụ không nằm danh sách → mỗi lần một lượt", async () => {
    const f = fetchDem(TOT());
    vi.stubGlobal("fetch", f);
    await hoiAgent("tiendo", "tiendo.tom_tat_du_an", "thanh trên cùng", { tham_so: { ma_du_an: "HV" } });
    await hoiAgent("tiendo", "tiendo.tom_tat_du_an", "bảng điều hành (lý do khác)", { tham_so: { ma_du_an: "HV" } });
    expect(f.mock.calls).toHaveLength(1);
    await hoiAgent("tiendo", "tiendo.nang_suat", "lý do", { tham_so: { ma_du_an: "HV" } });
    await hoiAgent("tiendo", "tiendo.nang_suat", "lý do", { tham_so: { ma_du_an: "HV" } });
    expect(f.mock.calls).toHaveLength(3);
  });

  it("hoiTienDo (bảng điều hành) và hoiAgent('tiendo') (thanh trên cùng) dùng CHUNG một câu trả lời", async () => {
    const f = fetchDem(TOT());
    vi.stubGlobal("fetch", f);
    await hoiTienDo("tiendo.tom_tat_du_an", { ma_du_an: "HV" }, "bảng điều hành");
    await hoiAgent("tiendo", "tiendo.tom_tat_du_an", "thanh trên cùng", { tham_so: { ma_du_an: "HV" } });
    expect(f.mock.calls).toHaveLength(1);
  });

  it("ngắt mạch: nhiều lượt đang bay cùng hỏng → chỉ ghi MỘT dòng 'mở mạch' (đo 26/09: 8 dòng)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }),
    );
    await Promise.all(
      Array.from({ length: 6 }, (_, i) => hoiAgent("hopdong", "hopdong.toan_canh_x", `lý do ${i}`, { tham_so: { i } })),
    );
    const mo = vi.mocked(ghiSuKienMach).mock.calls.filter((c) => c[0] === "mo");
    expect(mo).toHaveLength(1);
  });
});
