// ============================================================
// mat-khau-bam.ts — MẬT KHẨU BĂM CÓ TIỀN TỐ THUẬT TOÁN (LOI-DUNG-CHUNG 6g.6 luật A2 — Đợt 1b, 03/10/2026). CHỈ SERVER.
// ⚠ File này CHÉP Y HỆT ở 4 bộ JSON: 4-agent-main · 5-Agent-tien-do · 1-agent-base · 2-agent-hop-dong (src/lib/mat-khau-bam.ts).
//   Sửa một nơi thì chép sang cả ba nơi kia — test `mat-khau-bam.test.ts` dùng chung một bộ số mẫu để bắt lệch.
//
// Ba kiểu băm trong trường `passwordHash` (trường `salt` vẫn luôn ghi — hàm lọc khuôn cũ đòi có):
//   "scrypt:<salt>:<hex>"  — scryptSync(mật khẩu, salt, 32), y như agent Công việc. Main băm mật khẩu MỚI / ĐỔI bằng kiểu này.
//   "sha256:<salt>:<hex>"  — sha256(salt + mật khẩu), có tiền tố (cùng kiểu cột `matKhau` của agent Pháp lý).
//   không tiền tố          — kiểu cũ của bộ JSON: sha256(salt + mật khẩu), salt ở trường riêng.
// Lý do có tiền tố: 52 người của agent Công việc băm scrypt sắp chuyển lên Main (Đợt 2) — không tiền tố thì không
// phân biệt được với kiểu sha256 cũ, cả 4 agent sẽ không ai đăng nhập được (soát độc lập 03/10, điểm 1).
// ============================================================
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const TIEN_TO_SCRYPT = "scrypt:";
export const TIEN_TO_SHA256 = "sha256:";

function bangNhau(hexA: string, hexB: string): boolean {
  const a = Buffer.from(hexA, "hex");
  const b = Buffer.from(hexB, "hex");
  return a.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

const sha256 = (salt: string, matKhau: string) => createHash("sha256").update(salt + matKhau).digest("hex");
const scrypt = (salt: string, matKhau: string) => scryptSync(matKhau, salt, 32).toString("hex");

/** Có đúng mật khẩu không — nhận cả ba kiểu băm. */
export function kiemMatKhau(passwordHash: string, salt: string, matKhau: string): boolean {
  if (typeof passwordHash !== "string" || typeof matKhau !== "string") return false;
  if (passwordHash.startsWith(TIEN_TO_SCRYPT) || passwordHash.startsWith(TIEN_TO_SHA256)) {
    const [kieu, s, h] = passwordHash.split(":");
    if (!s || !h) return false;
    return bangNhau(kieu === "scrypt" ? scrypt(s, matKhau) : sha256(s, matKhau), h);
  }
  if (typeof salt !== "string" || !salt) return false;
  return bangNhau(sha256(salt, matKhau), passwordHash);
}

/** Băm mật khẩu mới (tạo người, đặt lại, đổi): kiểu scrypt có tiền tố + salt mới. */
export function bamMatKhauMoi(matKhau: string): { passwordHash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  return { passwordHash: `${TIEN_TO_SCRYPT}${salt}:${scrypt(salt, matKhau)}`, salt };
}

/** Bản ghi băm có hợp khuôn không (dùng cho hàm lọc bản ghi): có tiền tố thì tự đủ, không thì phải có salt. */
export function khuonBamHopLe(passwordHash: unknown, salt: unknown): boolean {
  if (typeof passwordHash !== "string" || passwordHash === "") return false;
  if (passwordHash.startsWith(TIEN_TO_SCRYPT) || passwordHash.startsWith(TIEN_TO_SHA256)) {
    const p = passwordHash.split(":"); // soát 03/10 điểm 7: "scrypt::" đủ 3 phần mà rỗng thì không nhận
    return p.length === 3 && p[1] !== "" && p[2] !== "";
  }
  return typeof salt === "string" && salt !== "";
}
