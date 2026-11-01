// Ký / kiểm phiên đăng nhập — EDGE-SAFE (dùng được trong middleware): chỉ Web Crypto, không node:*.
// Token = base64url(JSON) + "." + base64url(HMAC-SHA256). Cùng định dạng cookie sci_session của các agent SCI
// (SCI công việc dùng bản tương đương ở src/lib/auth-token.ts). Web chủ truyền khóa bí mật (≥ 32 ký tự).

export interface PhienKy {
  id: string;
  ten: string;
  exp: number; // mili giây
}

const b64u = (b: Uint8Array) => {
  let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const tuB64u = (s: string) => {
  const x = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(x + "=".repeat((4 - (x.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

async function khoaHmac(bi: string): Promise<CryptoKey> {
  if (!bi || bi.length < 32) throw new Error("Khóa bí mật phiên phải có ít nhất 32 ký tự");
  return crypto.subtle.importKey("raw", new TextEncoder().encode(bi), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function kyToken(p: { id: string; ten: string }, khoaBiMat: string, thoiHanMs = 8 * 60 * 60 * 1000): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify({ ...p, exp: Date.now() + thoiHanMs } satisfies PhienKy));
  const chuKy = await crypto.subtle.sign("HMAC", await khoaHmac(khoaBiMat), bytes);
  return `${b64u(bytes)}.${b64u(new Uint8Array(chuKy))}`;
}

export async function kiemToken(token: string | null | undefined, khoaBiMat: string): Promise<PhienKy | null> {
  if (!token) return null;
  const [a, b] = token.split(".");
  if (!a || !b) return null;
  try {
    const bytes = tuB64u(a);
    if (!(await crypto.subtle.verify("HMAC", await khoaHmac(khoaBiMat), tuB64u(b), bytes))) return null;
    const p = JSON.parse(new TextDecoder().decode(bytes)) as PhienKy;
    return typeof p.id === "string" && typeof p.exp === "number" && p.exp > Date.now() ? p : null;
  } catch {
    return null;
  }
}
