// Mật khẩu băm có tiền tố Main giao (LOI-DUNG-CHUNG 6g.6 A2 — Đợt 1b, 03/10/2026).
// ⚠ Bộ số mẫu DÙNG CHUNG cho 6 agent (4-agent-main/tests/unit/mat-khau-bam.test.ts) — đổi ở đây thì đổi cả bên đó.
import { describe, it, expect } from "vitest";
import { bamMatKhau, dungMatKhau } from "@sci/identity/mat-khau";

const SALT = "a1b2c3d4e5f60718293a4b5c6d7e8f90";
const MK = "Thu@2026 tiếng Việt";
const SCRYPT = "9feecaa8a54012f49e8d7480321ea90fb83efa186f23d9d5d8300ed2ef37de78";
const SHA256 = "ed03a5ee45f97c52488cce8c4924264e21cf15eaee3e34c1b9c06c0640823067";

describe("agent Công việc đọc băm có tiền tố Main giao", () => {
  it("kiểu riêng (scrypt, salt cột riêng) không đổi — và trùng bộ số mẫu chung", () => {
    expect(bamMatKhau(SALT, MK)).toBe(SCRYPT);
    expect(dungMatKhau(SALT, SCRYPT, MK)).toBe(true);
    expect(dungMatKhau(SALT, SCRYPT, "sai")).toBe(false);
  });
  it("scrypt có tiền tố — salt trong chuỗi, cột salt bỏ qua", () => {
    expect(dungMatKhau("cot-salt-khac", `scrypt:${SALT}:${SCRYPT}`, MK)).toBe(true);
    expect(dungMatKhau("", `scrypt:${SALT}:${SCRYPT}`, "sai")).toBe(false);
  });
  it("sha256 có tiền tố (người tạo ở bộ JSON trước Đợt 1b)", () => {
    expect(dungMatKhau("", `sha256:${SALT}:${SHA256}`, MK)).toBe(true);
    expect(dungMatKhau("", `sha256:${SALT}:${SHA256}`, "sai")).toBe(false);
  });
  it("chuỗi hỏng → không cho vào, không văng lỗi", () => {
    expect(dungMatKhau(SALT, `scrypt:${SALT}`, MK)).toBe(false);
    expect(dungMatKhau(SALT, "", MK)).toBe(false);
  });
});
