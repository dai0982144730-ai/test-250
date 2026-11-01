// ============================================================
// auth-token.ts — ký/kiểm phiên đăng nhập. EDGE-SAFE (middleware import): chỉ Web Crypto, không node:*.
// Token = base64url(JSON payload) + "." + base64url(HMAC-SHA256).
// Cookie RIÊNG `sci_congviec_session` (Mr. Đại duyệt 03/10/2026, Đợt 0): trước dùng chung tên `sci_session` với Tiến độ/Base/Hợp đồng
// nhưng ruột khác ({id,ten} vs {email,role,name}) → trên localhost đăng nhập bên này đá phiên bên kia. Pháp lý cũng đã tách tên
// (sci_phaply_session). Đăng nhập một cổng cho cả 6 agent làm sau, khi Main thành nguồn gốc người dùng (phương án A).
// ============================================================

export const SESSION_COOKIE = "sci_congviec_session";
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export interface PhienToken {
  id: string; // nguoi_dung.id
  ten: string;
  exp: number;
}

function khoa(): string {
  const k = process.env.AUTH_SECRET;
  if (!k || k.length < 32) throw new Error("Thiếu AUTH_SECRET (ít nhất 32 ký tự) trong .env.local");
  return k;
}

function b64u(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function tuB64u(s: string): Uint8Array {
  const b = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b + "=".repeat((4 - (b.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(khoa()), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

export async function kyPhien(p: Omit<PhienToken, "exp">): Promise<string> {
  const payload: PhienToken = { ...p, exp: Date.now() + SESSION_TTL_MS };
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(), bytes);
  return `${b64u(bytes)}.${b64u(new Uint8Array(sig))}`;
}

// ===== Đăng nhập MỘT LẦN ở Main (Mr. Đại chốt 25/10/2026): nhận cookie chung `sci_session` do Main ký bằng khoá chung =====
// Cookie chung chỉ mang DANH TÍNH (email); quyền vẫn tra ở sổ người dùng của agent này (phien.ts). Khoá chung = AUTH_SECRET_CHUNG
// (cùng khoá Main · Tiến độ · Hợp đồng · Base · Nghiệm thu). Bản edge-safe (Web Crypto) để middleware dùng; bản node ở lib/mcp/khoa-chung.ts.
export const COOKIE_CHUNG = "sci_session";

export interface PhienChungToken {
  email: string;
  ten: string;
  exp: number;
}

export async function kiemPhienChungEdge(token: string | undefined | null): Promise<PhienChungToken | null> {
  const k = (process.env.AUTH_SECRET_CHUNG ?? "").trim();
  if (!token || k.length < 16) return null;
  const [a, b, thua] = token.split(".");
  if (!a || !b || thua !== undefined) return null;
  try {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(k), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const bytes = tuB64u(a);
    if (!(await crypto.subtle.verify("HMAC", key, tuB64u(b), bytes))) return null;
    const j = JSON.parse(new TextDecoder().decode(bytes)) as { email?: unknown; name?: unknown; exp?: unknown };
    if (typeof j.email !== "string" || typeof j.exp !== "number" || j.exp < Date.now()) return null;
    return { email: j.email.trim().toLowerCase(), ten: typeof j.name === "string" ? j.name : j.email, exp: j.exp };
  } catch {
    return null;
  }
}

export async function kiemPhien(token: string | undefined | null): Promise<PhienToken | null> {
  if (!token) return null;
  const [a, b] = token.split(".");
  if (!a || !b) return null;
  const key = await hmacKey();
  try {
    const bytes = tuB64u(a);
    if (!(await crypto.subtle.verify("HMAC", key, tuB64u(b), bytes))) return null;
    const p = JSON.parse(new TextDecoder().decode(bytes)) as PhienToken;
    if (typeof p.id !== "string" || typeof p.exp !== "number" || p.exp < Date.now()) return null;
    return p;
  } catch {
    return null;
  }
}
