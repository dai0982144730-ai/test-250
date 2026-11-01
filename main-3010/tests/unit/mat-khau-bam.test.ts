// Mật khẩu băm có tiền tố (LOI-DUNG-CHUNG 6g.6 A2 — Đợt 1b, 03/10/2026).
// ⚠ Bộ số mẫu dưới đây DÙNG CHUNG cho 6 agent (4 bộ JSON + Pháp lý + Công việc) — đổi ở đây thì đổi cả 5 nơi kia.
import { describe, it, expect } from "vitest";
import { bamMatKhauMoi, khuonBamHopLe, kiemMatKhau } from "@/lib/mat-khau-bam";

const SALT = "a1b2c3d4e5f60718293a4b5c6d7e8f90";
const MK = "Thu@2026 tiếng Việt";
const SCRYPT = "9feecaa8a54012f49e8d7480321ea90fb83efa186f23d9d5d8300ed2ef37de78"; // scryptSync(MK, SALT, 32) — cách agent Công việc băm
const SHA256 = "ed03a5ee45f97c52488cce8c4924264e21cf15eaee3e34c1b9c06c0640823067"; // sha256(SALT + MK) — kiểu cũ bộ JSON

describe("mật khẩu băm có tiền tố — đọc được cả ba kiểu", () => {
  it("kiểu cũ không tiền tố (sha256, salt ở trường riêng) vẫn đăng nhập được", () => {
    expect(kiemMatKhau(SHA256, SALT, MK)).toBe(true);
    expect(kiemMatKhau(SHA256, SALT, "sai")).toBe(false);
    expect(kiemMatKhau(SHA256, "", MK)).toBe(false);
  });

  it("scrypt có tiền tố — đúng băm của agent Công việc (52 người chuyển lên Main ở Đợt 2)", () => {
    expect(kiemMatKhau(`scrypt:${SALT}:${SCRYPT}`, SALT, MK)).toBe(true);
    expect(kiemMatKhau(`scrypt:${SALT}:${SCRYPT}`, "salt-truong-rieng-khong-dung-toi", MK)).toBe(true);
    expect(kiemMatKhau(`scrypt:${SALT}:${SCRYPT}`, SALT, "sai")).toBe(false);
  });

  it("sha256 có tiền tố (kiểu cột matKhau của Pháp lý)", () => {
    expect(kiemMatKhau(`sha256:${SALT}:${SHA256}`, "", MK)).toBe(true);
    expect(kiemMatKhau(`sha256:${SALT}:${SHA256}`, "", "sai")).toBe(false);
  });

  it("chuỗi hỏng / thiếu phần → không cho vào, không văng lỗi", () => {
    expect(kiemMatKhau("scrypt:" + SALT, SALT, MK)).toBe(false);
    expect(kiemMatKhau("scrypt::", SALT, MK)).toBe(false);
    expect(kiemMatKhau("", SALT, MK)).toBe(false);
    expect(kiemMatKhau("khong-phai-hex", SALT, MK)).toBe(false);
  });

  it("mật khẩu mới băm scrypt có tiền tố, salt ghi cả trường riêng; mỗi lần một salt", () => {
    const a = bamMatKhauMoi(MK);
    const b = bamMatKhauMoi(MK);
    expect(a.passwordHash.startsWith(`scrypt:${a.salt}:`)).toBe(true);
    expect(a.salt).not.toBe(b.salt);
    expect(kiemMatKhau(a.passwordHash, a.salt, MK)).toBe(true);
    expect(kiemMatKhau(a.passwordHash, a.salt, "sai")).toBe(false);
  });

  it("hàm lọc khuôn: có tiền tố thì tự đủ; không tiền tố phải có salt", () => {
    expect(khuonBamHopLe(`scrypt:${SALT}:${SCRYPT}`, undefined)).toBe(true);
    expect(khuonBamHopLe(SHA256, SALT)).toBe(true);
    expect(khuonBamHopLe(SHA256, undefined)).toBe(false);
    expect(khuonBamHopLe("scrypt:thieu", SALT)).toBe(false);
    expect(khuonBamHopLe("scrypt::", SALT)).toBe(false);
    expect(khuonBamHopLe(`scrypt:${SALT}:`, SALT)).toBe(false);
    expect(khuonBamHopLe("", SALT)).toBe(false);
  });
});
