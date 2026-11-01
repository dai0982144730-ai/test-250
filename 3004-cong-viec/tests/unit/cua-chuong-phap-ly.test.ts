// Cửa chuông Pháp lý (20/10/2026) — chạy trên CSDL RAM của test, không đụng dữ liệu thật.
import { describe, it, expect, beforeAll } from "vitest";
import { csdlMoi } from "../helpers/csdl";
import { query } from "@/lib/db";
import { CUA_CHUONG_PHAP_LY, nhanThongBaoPhapLy, xetCuaChuongPhapLy } from "@/lib/mcp/cua-chuong-phap-ly";
import { DANH_MUC } from "@/lib/mcp/cong-base";

const EMAIL = "hung.tv@scigroup.vn";
const ND = "Góp ý của anh về mục 3 đã được trả lời, mời anh xem lại.";

beforeAll(async () => {
  await csdlMoi();
});

describe("quyền gọi cửa chuông Pháp lý", () => {
  it("đúng phaply + đúng khoá → được", () => {
    expect(xetCuaChuongPhapLy("phaply", true).duoc).toBe(true);
  });
  it("sai khoá → từ chối tiếng Việt", () => {
    const r = xetCuaChuongPhapLy("phaply", false);
    expect(r.duoc).toBe(false);
    if (!r.duoc) expect(r.lyDo).toContain("khoá nội bộ");
  });
  it("agent khác → từ chối", () => {
    for (const a of ["nghiemthu", "tiendo", "main"]) {
      const r = xetCuaChuongPhapLy(a, true);
      expect(r.duoc).toBe(false);
      if (!r.duoc) expect(r.lyDo).toContain("chỉ dành cho Agent pháp lý");
    }
  });
  it("có trong danh mục cửa", () => {
    expect(DANH_MUC.some((c) => c.ten === CUA_CHUONG_PHAP_LY)).toBe(true);
  });
});

describe("nhận chuông", () => {
  it("đúng loại + nội dung → bỏ chuông, có nhãn Pháp lý, lần hai trùng thì không bỏ", async () => {
    const r1 = await nhanThongBaoPhapLy({ nguoi_nhan: EMAIL, loai: "pl_tra_loi_gop_y", noi_dung: ND });
    expect(r1.ok).toBe(true);
    const { rows } = await query<{ noi_dung: string }>("SELECT noi_dung FROM docflow.thong_bao WHERE loai = 'pl_tra_loi_gop_y'");
    expect(rows).toHaveLength(1);
    expect(rows[0].noi_dung.startsWith("Pháp lý")).toBe(true);
    await nhanThongBaoPhapLy({ nguoi_nhan: [EMAIL], loai: "pl_tra_loi_gop_y", noi_dung: ND });
    const n = await query<{ n: number }>("SELECT count(*)::int AS n FROM docflow.thong_bao WHERE loai = 'pl_tra_loi_gop_y'");
    expect(n.rows[0].n).toBe(1);
  });
  it("loại lạ → từ chối", async () => {
    const r = await nhanThongBaoPhapLy({ nguoi_nhan: EMAIL, loai: "loai_la", noi_dung: ND });
    expect(r.ok).toBe(false);
  });
  it("nội dung quá ngắn / quá dài → từ chối", async () => {
    expect((await nhanThongBaoPhapLy({ nguoi_nhan: EMAIL, loai: "pl_tra_loi_gop_y", noi_dung: "ngắn" })).ok).toBe(false);
    expect((await nhanThongBaoPhapLy({ nguoi_nhan: EMAIL, loai: "pl_tra_loi_gop_y", noi_dung: "x".repeat(2001) })).ok).toBe(false);
  });
  it("thiếu người nhận / quá 20 người → từ chối", async () => {
    expect((await nhanThongBaoPhapLy({ loai: "pl_tra_loi_gop_y", noi_dung: ND })).ok).toBe(false);
    const nhieu = Array.from({ length: 21 }, (_, i) => `a${i}@x.vn`);
    expect((await nhanThongBaoPhapLy({ nguoi_nhan: nhieu, loai: "pl_tra_loi_gop_y", noi_dung: ND })).ok).toBe(false);
  });
});
