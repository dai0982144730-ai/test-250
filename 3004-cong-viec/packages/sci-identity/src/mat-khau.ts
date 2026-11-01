// Băm mật khẩu bằng scrypt (node:crypto). CHỈ SERVER.
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function taoSalt(): string {
  return randomBytes(16).toString("hex");
}

export function bamMatKhau(salt: string, matKhau: string): string {
  return scryptSync(matKhau, salt, 32).toString("hex");
}

/**
 * Đúng mật khẩu không. Nhận thêm băm CÓ TIỀN TỐ Main giao (LOI-DUNG-CHUNG 6g.6 A2, Đợt 1b 03/10/2026 — dùng từ Đợt 3 khi
 * bảng người là bản chép kéo từ Main): `scrypt:<salt>:<hex>` · `sha256:<salt>:<hex>`. Không tiền tố = kiểu riêng của
 * agent này: scrypt với salt ở cột riêng (KHÁC kiểu không tiền tố của bộ JSON là sha256 — vì thế mới cần tiền tố).
 */
export function dungMatKhau(salt: string, hash: string, matKhau: string): boolean {
  if (typeof hash !== "string" || typeof matKhau !== "string") return false;
  let tinh: string;
  let dich = hash;
  if (hash.startsWith("scrypt:") || hash.startsWith("sha256:")) {
    const [kieu, s, h] = hash.split(":");
    if (!s || !h) return false;
    tinh = kieu === "scrypt" ? bamMatKhau(s, matKhau) : createHash("sha256").update(s + matKhau).digest("hex");
    dich = h;
  } else tinh = bamMatKhau(salt, matKhau);
  const a = Buffer.from(tinh, "hex");
  const b = Buffer.from(dich, "hex");
  return a.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}
