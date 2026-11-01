// ĐỔI EMAIL GIỮ MÃ (Mr. Đại chốt 29/09/2026, cách A): tài khoản chuyển sang email thật giữ mã cũ bên trong —
// đăng nhập bằng email mới, email cũ hết dùng; việc / lịch sử cũ vẫn của người đó; email trùng bị chặn.
import { describe, it, expect, beforeAll } from "vitest";
import { csdlMoi } from "../helpers/csdl";
import { tx } from "@/lib/db";
import { suaNguoiDung, themNguoiDung, xacThuc } from "@sci/identity/server";
// Mật khẩu lần đầu = email lúc tạo tài khoản (chốt K13 02/10) — đổi email không đổi mật khẩu
const MK_DAU = "gd.pmc@scigroup.vn";

const ng = { nguoi: "quantri@scigroup.vn" };

beforeAll(async () => {
  await csdlMoi();
});

describe("đổi email giữ mã tài khoản", () => {
  it("đăng nhập bằng email mới, mã cũ không đăng nhập được, mã không đổi", async () => {
    const n = await tx((q) => suaNguoiDung(q, ng, "gd.pmc@scigroup.vn", { email: "AnNV@scigroup.vn", ten: "Ngô Vũ An" }));
    expect(n.id).toBe("gd.pmc@scigroup.vn");
    expect(n.email).toBe("annv@scigroup.vn");
    const moi = await tx((q) => xacThuc(q, "annv@scigroup.vn", MK_DAU));
    expect(moi).toMatchObject({ ok: true, id: "gd.pmc@scigroup.vn", ten: "Ngô Vũ An" });
    const cu = await tx((q) => xacThuc(q, "gd.pmc@scigroup.vn", MK_DAU));
    expect(cu.ok).toBe(false);
  });

  it("email trùng với tài khoản khác (theo email hoặc theo mã) bị chặn", async () => {
    await expect(tx((q) => suaNguoiDung(q, ng, "gd.enc@scigroup.vn", { email: "annv@scigroup.vn" }))).rejects.toThrow(/đã có tài khoản khác/);
    await expect(tx((q) => suaNguoiDung(q, ng, "gd.enc@scigroup.vn", { email: "nv.enc@scigroup.vn" }))).rejects.toThrow(/đã có tài khoản khác/);
    await expect(tx((q) => suaNguoiDung(q, ng, "gd.enc@scigroup.vn", { email: "khong-phai-email" }))).rejects.toThrow(/không hợp lệ/);
  });

  it("tạo tài khoản mới trùng email đã đổi bị chặn", async () => {
    await expect(
      tx((q) => themNguoiDung(q, ng, { email: "annv@scigroup.vn", ten: "Trùng", don_vi_id: "sci-pmc", vai_tro: ["nhan-vien"] })),
    ).rejects.toThrow(/đã có tài khoản/);
  });
});
