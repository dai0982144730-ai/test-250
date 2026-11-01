// ===== Auth — phiên đăng nhập + chặn trang theo cửa quyền =====
// Danh sách user + mật khẩu ở src/lib/users.ts (store data/users.json, hash
// sha256+salt). File này CHỈ lo session + chặn trang. BẢNG QUYỀN nằm ở
// src/lib/quyen.ts (một định nghĩa duy nhất, Mr. Đại chốt 25/09/2026).
//
// Token = base64url(JSON payload) + "." + base64url(HMAC-SHA256(payload)).
// Dùng Web Crypto API (crypto.subtle) để chạy được trên CẢ edge middleware
// lẫn Node runtime — TUYỆT ĐỐI không import "node:crypto" hay users.ts
// (node:fs) ở đây: middleware edge import file này.

import { layKhoaAuth } from "@/lib/khoa-auth";
import { TRANG_CHU_MAIN } from "@/lib/nhan-dien-agent";
import { chuanHoaLoai, cuaCuaTrang, duocQuaCua, type Role } from "@/lib/quyen";

// Bốn loại: pm · admin · engineer (Người dùng) · viewer (Người xem) — xem quyen.ts.
export type { Role } from "@/lib/quyen";

export interface SessionPayload {
  email: string;
  role: Role;
  name: string;
  exp: number; // epoch ms hết hạn
}

export const SESSION_COOKIE = "sci_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 giờ

/**
 * Trang mặc định sau đăng nhập / khi bị chặn — cả bốn loại như nhau.
 * Là Báo cáo sáng, KHÔNG phải "/" ("/" từng render màn kế thừa Agent Tiến độ, 07/09).
 */
export const TRANG_NHA = TRANG_CHU_MAIN;

/** Loại `role` có mở được trang `pathname` không — theo CUA_THEO_TRANG ở quyen.ts */
export function canAccessPath(role: Role, pathname: string): boolean {
  return duocQuaCua(role, cuaCuaTrang(pathname));
}

// ===== base64url helpers (không dùng Buffer — edge-safe) =====

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// ===== HMAC-SHA256 qua Web Crypto =====

function getSecret(): string {
  // J01 (24/09 cho Main): KHÔNG còn chuỗi dự phòng — thiếu biến là ném lỗi tiếng Việt
  return layKhoaAuth();
}

async function getHmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** Tạo session token cho user (hết hạn sau 8h) */
export async function signSession(user: Pick<SessionPayload, "email" | "role" | "name">): Promise<string> {
  const payload: SessionPayload = {
    email: user.email,
    role: user.role,
    name: user.name,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const key = await getHmacKey();
  const sig = await crypto.subtle.sign("HMAC", key, payloadBytes);
  return `${bytesToBase64Url(payloadBytes)}.${bytesToBase64Url(new Uint8Array(sig))}`;
}

/** Verify token: sai chữ ký / hỏng / hết hạn → null */
export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  // J01: lấy khoá NGOÀI try — thiếu AUTH_SECRET phải ném ra cho middleware báo
  // câu tiếng Việt, không được nuốt thành "phiên hết hạn" rồi đẩy về /login mãi
  const key = await getHmacKey();
  try {
    const payloadBytes = base64UrlToBytes(parts[0]);
    const sigBytes = base64UrlToBytes(parts[1]);
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, payloadBytes);
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as SessionPayload;
    if (
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }
    // Lớp chuyển đổi duy nhất: cookie cũ mang `field` → engineer; mã lạ → từ chối
    const loai = chuanHoaLoai(payload.role);
    if (loai === null) return null;
    payload.role = loai;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
