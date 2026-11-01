// Cổng MCP base.lich_hop (26/10/2026) — bài kiểm theo kiểm độc lập đợt 0 P-CV-3. Đồng hồ giả theo giờ VN (luật 44).
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { tx } from "@/lib/db";
import type { NguoiDungPhien } from "@/lib/types";
import { datHop } from "@/lib/phong-hop/dich-vu";
import { chayCongCu } from "@/lib/mcp/cong-base";

const LUC = Date.UTC(2026, 9, 26, 1, 10); // Thứ Hai 26/10/2026 08:10 giờ VN

describe("base.lich_hop", () => {
  let tp: NguoiDungPhien;
  let nv: NguoiDungPhien;
  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(LUC);
    await csdlMoi();
    nv = await nguoi("nv.dtpc@scigroup.vn");
    tp = await nguoi("truong.dtpc@scigroup.vn");
    await tx((q) =>
      datHop(q, tp, {
        phong: "p01",
        ngay: "2026-10-27",
        tu: "09:00",
        den: "10:00",
        noi_dung: "Họp kiểm lịch test",
        ghi_chu: "x".repeat(500),
        moi: [{ loai: "nguoi", id: nv.id }],
      }),
    );
  });
  afterAll(() => vi.useRealTimers());

  it("trả cuộc người được mời, giờ VN, ghi chú cắt ≤ 200 ký tự", async () => {
    const kq = (await chayCongCu("base.lich_hop", { nguoi: "NV.DTPC@scigroup.vn" }, "nv.dtpc")) as { ok: boolean; du_lieu: Record<string, unknown> };
    expect(kq.ok).toBe(true);
    const cuoc = kq.du_lieu.cuoc as Array<{ noi_dung: string; ghi_chu: string; gio: string }>;
    const c = cuoc.find((x) => x.noi_dung === "Họp kiểm lịch test")!;
    expect(c).toBeTruthy();
    expect(c.ghi_chu.length).toBeLessThanOrEqual(201);
    expect(String(kq.du_lieu.bay_gio)).toContain("26/10/2026");
  });

  it("kiểm lần 8 CT-421: người hỏi KHÔNG được mời (hoặc không gửi ma_nguoi_dung) thì mất ghi chú, đường dẫn, khách ngoài; quản trị thấy đủ", async () => {
    const lay = async (ma?: string) => {
      const kq = (await chayCongCu("base.lich_hop", { nguoi: "nv.dtpc@scigroup.vn" }, ma)) as { du_lieu: { cuoc: Array<{ noi_dung: string; ghi_chu: string | null }> } };
      return kq.du_lieu.cuoc.find((x) => x.noi_dung === "Họp kiểm lịch test")!;
    };
    expect((await lay(undefined)).ghi_chu).toBeNull();
    expect((await lay("truong.ktvh")).ghi_chu).toBeNull();
    expect((await lay("nv.dtpc@scigroup.vn")).ghi_chu).toBeTruthy();
    expect((await lay("quantri")).ghi_chu).toBeTruthy();
  });

  it("00:30 giờ VN vẫn là ngày VN (không lùi về ngày UTC)", async () => {
    vi.setSystemTime(Date.UTC(2026, 9, 25, 17, 30)); // 00:30 VN 26/10
    const kq = (await chayCongCu("base.lich_hop", { nguoi: "nv.dtpc@scigroup.vn" })) as { du_lieu: Record<string, unknown> };
    expect(String(kq.du_lieu.bay_gio)).toBe("00:30 26/10/2026 (giờ Việt Nam)");
    vi.setSystemTime(LUC);
  });

  it("email lạ → KHONG_CO_DU_LIEU tiếng Việt; thiếu nguoi → KHONG_HIEU_YEU_CAU", async () => {
    const la = (await chayCongCu("base.lich_hop", { nguoi: "khong.co@scigroup.vn" })) as { ok: boolean; ma_loi: string; thong_diep: string };
    expect(la.ok).toBe(false);
    expect(la.ma_loi).toBe("KHONG_CO_DU_LIEU");
    expect(la.thong_diep).toContain("không có tài khoản");
    const thieu = (await chayCongCu("base.lich_hop", {})) as { ok: boolean; ma_loi: string };
    expect(thieu.ma_loi).toBe("KHONG_HIEU_YEU_CAU");
  });

  it("gioi_han cắt số cuộc, so_cuoc vẫn là tổng", async () => {
    const kq = (await chayCongCu("base.lich_hop", { nguoi: "truong.dtpc@scigroup.vn", gioi_han: 1 })) as { du_lieu: Record<string, unknown> };
    expect((kq.du_lieu.cuoc as unknown[]).length).toBeLessThanOrEqual(1);
  });
});
