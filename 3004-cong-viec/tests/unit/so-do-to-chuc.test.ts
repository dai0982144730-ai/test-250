// base.so_do_to_chuc — cửa CHỈ ĐỌC giao sơ đồ tổ chức cho Main (Mr. Đại chốt 12/10/2026 — câu 9).
// Ba điều phải giữ: chỉ Main + khoá nội bộ gọi được · không lọt mật khẩu · đủ cây đơn vị, kiêm nhiệm, vai trò từng người.
import { describe, it, expect, beforeAll } from "vitest";
import { csdlMoi } from "../helpers/csdl";
import { layQ } from "@/lib/db";
import { chayCongCu, DANH_MUC } from "@/lib/mcp/cong-base";
import { CUA_SO_DO, dungSoDo, xetCuaSoDo, type SoDoGiao } from "@/lib/mcp/so-do-to-chuc-thuan";

describe("cửa sơ đồ tổ chức — ai gọi được", () => {
  it("đúng Main + có khoá nội bộ mới qua", () => {
    expect(xetCuaSoDo("main", true).duoc).toBe(true);
    expect(xetCuaSoDo("Main", true).duoc).toBe(true);
    expect(xetCuaSoDo("main", false).duoc).toBe(false);
    expect(xetCuaSoDo("tiendo", true).duoc).toBe(false);
    expect(xetCuaSoDo("quansat", true).duoc).toBe(false);
    expect(xetCuaSoDo("", true).duoc).toBe(false);
  });
  it("câu chặn bằng tiếng Việt, nói rõ vì sao", () => {
    const k = xetCuaSoDo("hopdong", true);
    expect(k.duoc === false && k.lyDo).toContain("chỉ dành cho Main");
    const k2 = xetCuaSoDo("main", false);
    expect(k2.duoc === false && k2.lyDo).toContain("khoá nội bộ");
  });
  it("có tên trong danh mục công cụ (nang_luc)", () => {
    expect(DANH_MUC.some((c) => c.ten === CUA_SO_DO && c.san_sang)).toBe(true);
  });
});

describe("dungSoDo — chỉ chép trường đã kê, không lọt mật khẩu", () => {
  it("hàng người có kèm mật khẩu thì bản giao vẫn không có", () => {
    const hangNguoi = { id: "a@x.vn", email: "A@X.vn ", ten: "An", don_vi_id: "p1", chuc_vu: "Trưởng phòng", cap_chuc_vu: 2, active: true, mat_khau_hash: "BAM-BI-MAT", salt: "MUOI-BI-MAT", la_quan_tri: true };
    const ra = dungSoDo({
      donVi: [{ id: "p1", ten: "Phòng Một", ten_ngan: null, cap: 2, cha_id: null, loai: "phong", thu_tu: null, active: null, chuc_danh: null, chuc_danh_ngan: null, chuc_nang: null, uy_quyen_truong: null }],
      kiemNhiem: [{ nguoi_dung_id: "a@x.vn", don_vi_id: "p1", chuc_vu: null }],
      nguoi: [hangNguoi, { id: "b@x.vn", email: "b@x.vn", ten: "Bình", don_vi_id: null, chuc_vu: null, cap_chuc_vu: null, active: false }],
      vai: [
        { nguoi_dung_id: "a@x.vn", vai_tro_id: "truong-don-vi" },
        { nguoi_dung_id: "a@x.vn", vai_tro_id: "lanh-dao" },
      ],
    });
    const chu = JSON.stringify(ra);
    expect(chu).not.toContain("BAM-BI-MAT");
    expect(chu).not.toContain("MUOI-BI-MAT");
    expect(chu).not.toContain("la_quan_tri");
    expect(ra.nguoi[0]).toEqual({ id: "a@x.vn", email: "a@x.vn", ten: "An", don_vi_id: "p1", chuc_vu: "Trưởng phòng", cap_chuc_vu: 2, active: true, vai: ["lanh-dao", "truong-don-vi"] });
    expect(ra.nguoi[1].active).toBe(false);
    expect(ra.nguoi[1].vai).toEqual([]);
    expect(ra.don_vi[0]).toMatchObject({ id: "p1", ten_ngan: "Phòng Một", thu_tu: 0, active: true });
    expect(ra.kiem_nhiem).toEqual([{ nguoi_id: "a@x.vn", don_vi_id: "p1", chuc_vu: null }]);
    expect([ra.so_don_vi, ra.so_kiem_nhiem, ra.so_nguoi, ra.so_nguoi_dang_khoa]).toEqual([1, 1, 2, 1]);
  });
});

describe("base.so_do_to_chuc — đọc cơ sở dữ liệu (bản RAM của bộ kiểm)", () => {
  beforeAll(async () => {
    await csdlMoi();
  });

  it("trả đủ cây đơn vị + người + vai trò, khớp số đếm trong bảng, không có mật khẩu", async () => {
    const q = await layQ();
    const dem = async (bang: string) => (await q.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${bang}`)).rows[0].n;
    const kq = await chayCongCu(CUA_SO_DO, {});
    if (!kq.ok) throw new Error(kq.thong_diep);
    const d = kq.du_lieu as SoDoGiao;
    expect(d.don_vi.length).toBe(await dem("identity.don_vi"));
    expect(d.nguoi.length).toBe(await dem("identity.nguoi_dung"));
    expect(d.kiem_nhiem.length).toBe(await dem("identity.kiem_nhiem"));
    expect(d.nguoi.reduce((s, p) => s + p.vai.length, 0)).toBe(await dem("identity.gan_vai_tro"));
    expect(d.don_vi.length).toBeGreaterThan(0);
    expect(d.nguoi.length).toBeGreaterThan(0);
    // đơn vị cha (nếu có) phải nằm trong chính bản giao — Main từ chối cây gãy
    const ma = new Set(d.don_vi.map((x) => x.id));
    expect(d.don_vi.filter((x) => x.cha_id && !ma.has(x.cha_id))).toEqual([]);
    const chu = JSON.stringify(kq);
    for (const cam of ["mat_khau", "salt", "la_quan_tri", "scrypt:"]) expect(chu).not.toContain(cam);
    expect(kq.nguon?.[0]?.vi_tri).toContain("đơn vị");
  });

  it("sơ đồ rỗng thì nói rỗng (không giao bản rỗng cho Main ghi đè)", async () => {
    const q = await layQ();
    await q.query("BEGIN");
    try {
      await q.query("DELETE FROM identity.gan_vai_tro");
      await q.query("DELETE FROM identity.kiem_nhiem");
      await q.query("UPDATE identity.don_vi SET uy_quyen_truong = NULL");
      await q.query("DELETE FROM identity.nguoi_dung");
      const kq = await chayCongCu(CUA_SO_DO, {});
      if (kq.ok) throw new Error("đáng lẽ phải từ chối");
      expect(kq.ma_loi).toBe("KHONG_CO_DU_LIEU");
      expect(kq.thong_diep).toContain("rỗng");
    } finally {
      await q.query("ROLLBACK");
    }
  });
});
