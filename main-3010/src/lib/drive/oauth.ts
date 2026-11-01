// ============================================================
// OAUTH2 GOOGLE DRIVE — PKCE + client secret (client kiểu "web").
// Luồng (chuyển cách làm từ bộ 2D-3D sang Next.js, gọi REST thuần):
//   1. /api/drive/connect  → sinh PKCE + state, lưu vào drive.enc, redirect Google
//   2. Google hỏi chọn tài khoản + Cho phép (người dùng KHÔNG gõ mật khẩu vào app)
//   3. /api/drive/callback → đổi code lấy token, lưu mã hóa, hỏi email qua about.get
// Token hết hạn tự làm mới bằng refresh_token.
// ============================================================

import crypto from "node:crypto";
import { capNhatDrive, docDrive, type DriveToken } from "./store";

const AUTH_URI = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URI = "https://oauth2.googleapis.com/token";
/** Chỉ xin đúng một quyền đọc/ghi Drive — đủ tạo cây + nạp/tải file */
export const SCOPE = "https://www.googleapis.com/auth/drive";

const b64url = (b: Buffer): string =>
  b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** Bước 1: tạo URL trang đồng ý của Google (kèm PKCE + state chống giả mạo) */
export function taoAuthUrl(redirectUri: string): { url: string } | { loi: string } {
  const s = docDrive();
  if (!s.client) return { loi: "Chưa có khóa OAuth — nạp credentials.json hoặc nhập Client ID/Secret trước." };
  const verifier = b64url(crypto.randomBytes(48));
  const state = b64url(crypto.randomBytes(24));
  capNhatDrive({ pkce: { verifier, state, taoLuc: Date.now() } });
  const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());
  const q = new URLSearchParams({
    client_id: s.client.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    // prompt=consent để CHẮC CHẮN nhận refresh_token (Google chỉ phát lần đầu);
    // select_account để đổi được sang đúng hòm thư kho (scigroup.sub.agents@…)
    prompt: "consent select_account",
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
  });
  return { url: `${AUTH_URI}?${q.toString()}` };
}

/** Bước 3: đổi code lấy token — kiểm state, dùng lại PKCE verifier đã lưu */
export async function doiCodeLayToken(
  code: string,
  state: string,
  redirectUri: string
): Promise<{ ok: true } | { ok: false; loi: string }> {
  const s = docDrive();
  if (!s.client) return { ok: false, loi: "Chưa có khóa OAuth." };
  if (!s.pkce || s.pkce.state !== state) {
    return { ok: false, loi: "State không khớp — mở lại từ nút Kết nối (chống giả mạo phiên)." };
  }
  if (Date.now() - s.pkce.taoLuc > 10 * 60 * 1000) {
    return { ok: false, loi: "Phiên kết nối quá 10 phút — bấm Kết nối lại." };
  }
  const body = new URLSearchParams({
    client_id: s.client.clientId,
    client_secret: s.client.clientSecret,
    code,
    code_verifier: s.pkce.verifier,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });
  const res = await fetch(TOKEN_URI, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const j = (await res.json().catch(() => null)) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  } | null;
  if (!res.ok || !j?.access_token) {
    return { ok: false, loi: `Google từ chối đổi mã: ${j?.error ?? res.status} — ${j?.error_description ?? "soát lại redirect URI đã khai trong client"}` };
  }
  const token: DriveToken = {
    accessToken: j.access_token,
    refreshToken: j.refresh_token ?? docDrive().token?.refreshToken ?? "",
    expiry: Date.now() + (j.expires_in ?? 3600) * 1000 - 60000,
    // Google trả refresh_token MỚI thì đồng hồ 7 ngày chạy lại từ bây giờ; không trả thì giữ ngày cấp cũ.
    capLuc: j.refresh_token ? Date.now() : docDrive().token?.capLuc,
  };
  capNhatDrive({ token, pkce: undefined });
  return { ok: true };
}

/** Lấy accessToken còn hạn — hết hạn thì tự làm mới bằng refresh_token */
export async function layAccessToken(): Promise<
  { ok: true; token: string } | { ok: false; loi: string }
> {
  const s = docDrive();
  if (!s.client || !s.token) return { ok: false, loi: "Chưa kết nối Google Drive." };
  if (Date.now() < s.token.expiry) return { ok: true, token: s.token.accessToken };
  if (!s.token.refreshToken) {
    return { ok: false, loi: "Token hết hạn mà không có refresh_token — bấm Kết nối lại." };
  }
  const body = new URLSearchParams({
    client_id: s.client.clientId,
    client_secret: s.client.clientSecret,
    refresh_token: s.token.refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch(TOKEN_URI, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const j = (await res.json().catch(() => null)) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  } | null;
  if (!res.ok || !j?.access_token) {
    return { ok: false, loi: `Làm mới token thất bại (${j?.error ?? res.status}) — bấm Kết nối lại.` };
  }
  capNhatDrive({
    token: {
      ...s.token,
      accessToken: j.access_token,
      expiry: Date.now() + (j.expires_in ?? 3600) * 1000 - 60000,
    },
  });
  return { ok: true, token: j.access_token };
}
