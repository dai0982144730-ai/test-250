// Đăng nhập (hàm lõi): đúng/sai mật khẩu, tài khoản bị khóa, lịch sử 'dang_nhap', đổi mật khẩu, phiên ký.
// Mật khẩu lần đầu = chính email (Mr. Đại chốt K13 02/10/2026)
import { describe, it, expect, beforeAll } from "vitest";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { layQ, query } from "@/lib/db";
import { dangNhap, nguCanh } from "@/lib/cau-hinh/cau-noi-identity";
import { doiMatKhau, khoaNguoiDung, xacThuc } from "@sci/identity/server";
import { kiemPhien, kyPhien } from "@/lib/auth-token";

describe("identity — đăng nhập", () => {
  beforeAll(async () => {
    process.env.AUTH_SECRET ??= "khoa-thu-nghiem-cho-test-it-nhat-32-ky-tu!!";
    await csdlMoi();
  });

  it("đúng mật khẩu → người dùng đã tính quyền, ghi lịch sử dang_nhap", async () => {
    const kq = await dangNhap(await layQ(), "  HUNG.TV@scigroup.vn ", "hung.tv@scigroup.vn", "127.0.0.1 vitest");
    expect(kq.ok).toBe(true);
    if (!kq.ok) return;
    expect(kq.nguoi_dung).toMatchObject({ id: "hung.tv@scigroup.vn", don_vi_id: "p-ktvh", vai_tro: ["nhan-vien"] });
    const ls = await query<{ nguoi: string; thiet_bi: string; tc: string }>(
      "SELECT nguoi, thiet_bi, chi_tiet->>'thanh_cong' tc FROM docflow.lich_su WHERE hanh_dong='dang_nhap' ORDER BY id DESC LIMIT 1",
    );
    expect(ls.rows[0]).toEqual({ nguoi: "hung.tv@scigroup.vn", thiet_bi: "127.0.0.1 vitest", tc: "true" });
    // phiên ký được và kiểm lại được
    const token = await kyPhien({ id: kq.nguoi_dung.id, ten: kq.nguoi_dung.ten });
    expect((await kiemPhien(token))?.id).toBe("hung.tv@scigroup.vn");
    expect(await kiemPhien(token.slice(0, -2) + "xx")).toBeNull();
  });

  it("sai mật khẩu / email không có → từ chối; sai mật khẩu tài khoản thật vẫn ghi lịch sử", async () => {
    const q = await layQ();
    expect(await dangNhap(q, "hung.tv@scigroup.vn", "sai")).toEqual({ ok: false, loi: "Email hoặc mật khẩu không đúng" });
    expect(await dangNhap(q, "khong-co@scigroup.vn", "khong-co@scigroup.vn")).toEqual({ ok: false, loi: "Email hoặc mật khẩu không đúng" });
    expect(await dangNhap(q, "hung.tv@scigroup.vn", "")).toMatchObject({ ok: false });
    const ls = await query<{ n: number }>("SELECT count(*)::int n FROM docflow.lich_su WHERE hanh_dong='dang_nhap' AND chi_tiet->>'thanh_cong'='false'");
    expect(ls.rows[0].n).toBe(2);
  });

  it("tài khoản bị khóa không đăng nhập được", async () => {
    const qt = await nguoi("quantri@scigroup.vn");
    await khoaNguoiDung(await layQ(), nguCanh(qt), "nv.enc@scigroup.vn", true);
    expect(await dangNhap(await layQ(), "nv.enc@scigroup.vn", "nv.enc@scigroup.vn")).toMatchObject({ ok: false, loi: expect.stringMatching(/khóa/) });
  });

  it("đổi mật khẩu: phải đúng mật khẩu cũ, đủ dài; xong thì mật khẩu cũ hết dùng", async () => {
    const q = await layQ();
    const ng = { nguoi: "hung.tv@scigroup.vn" };
    await expect(doiMatKhau(q, ng, "hung.tv@scigroup.vn", "sai", "MoiMoi@1")).rejects.toThrow(/cũ không đúng/);
    await expect(doiMatKhau(q, ng, "hung.tv@scigroup.vn", "hung.tv@scigroup.vn", "123")).rejects.toThrow(/ít nhất/);
    await doiMatKhau(q, ng, "hung.tv@scigroup.vn", "hung.tv@scigroup.vn", "MoiMoi@1");
    expect((await xacThuc(q, "hung.tv@scigroup.vn", "hung.tv@scigroup.vn")).ok).toBe(false);
    expect((await xacThuc(q, "hung.tv@scigroup.vn", "MoiMoi@1")).ok).toBe(true);
  });
});
