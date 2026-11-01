// Mã người bất biến (LOI-DUNG-CHUNG 6g.6 A1) — soát độc lập 03/10/2026 điểm 3: tạo người mới không được trùng MÃ người đang có.
import "../ho-tro/nguoi-dung-du-lieu-rieng";
import { describe, it, expect } from "vitest";
import { createUser, danhSachNguoiDungDayDu, listUsers, verifyUser } from "@/lib/users";
import { THU_MUC_NGUOI_TEST } from "../ho-tro/nguoi-dung-du-lieu-rieng";
import fs from "node:fs";
import path from "node:path";

describe("mã người không trùng", () => {
  it("tạo tài khoản đúng email đang là mã của người khác → chặn, báo tên người giữ mã", () => {
    expect(() => createUser({ email: "ptgd.dai@scigroup.vn", name: "Người lạ", role: "engineer", password: "Thu@2026" })).toThrow(/Nguyễn Chính Đại/);
    expect(listUsers()).toHaveLength(2);
  });
  it("người mới bình thường: mã = email, băm scrypt có tiền tố, đăng nhập được", () => {
    const u = createUser({ email: "moi@scigroup.vn", name: "Người mới", role: "engineer", password: "Thu@2026" });
    expect(u.id).toBe("moi@scigroup.vn");
    expect(verifyUser("moi@scigroup.vn", "Thu@2026")?.email).toBe("moi@scigroup.vn");
    expect(verifyUser("dainc@scigroup.vn", "Thu@2026")?.id).toBe("ptgd.dai@scigroup.vn");
  });
  it("trường tổ chức (6g.6 A9): đúng kiểu thì nhận và giữ qua lần ghi; sai kiểu thì bản ghi bị lọc", () => {
    const f = path.join(THU_MUC_NGUOI_TEST, "users.json");
    const ds = JSON.parse(fs.readFileSync(f, "utf8"));
    ds[1] = { ...ds[1], donViId: "bld-ptgd-dai", chucVu: "Phó Tổng Giám đốc", capChucVu: null };
    ds.push({ ...ds[0], id: "sai@scigroup.vn", email: "sai@scigroup.vn", capChucVu: "một" });
    fs.writeFileSync(f, JSON.stringify(ds));
    const dai = danhSachNguoiDungDayDu().find((u) => u.email === "dainc@scigroup.vn");
    expect(dai).toMatchObject({ donViId: "bld-ptgd-dai", chucVu: "Phó Tổng Giám đốc" });
    expect(listUsers().find((u) => u.email === "dainc@scigroup.vn")?.donViId).toBe("bld-ptgd-dai");
    expect(listUsers().some((u) => u.email === "sai@scigroup.vn")).toBe(false);
    createUser({ email: "them@scigroup.vn", name: "Thêm", role: "engineer", password: "Thu@2026" }); // ghi lại file
    expect(danhSachNguoiDungDayDu().find((u) => u.email === "dainc@scigroup.vn")?.chucVu).toBe("Phó Tổng Giám đốc");
  });
});
