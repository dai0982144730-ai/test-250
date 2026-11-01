// ============================================================
// KHO KHÓA GOOGLE DRIVE — lưu cấu hình OAuth client + token, MÃ HÓA trên đĩa.
// Cách làm chuyển từ bộ 2D-3D (Mr. Đại chốt 01/09: chỉ lấy phần hướng dẫn +
// 2 đường nạp khóa json/nhập tay; MỘT tài khoản duy nhất theo
// CAU-TRUC-KHO-DU-LIEU mục 2 — không có chuyện mỗi phòng một kho).
//
// - File data/drive.enc (ĐÃ chặn git): AES-256-GCM, khóa dẫn xuất từ
//   AUTH_SECRET — đổi AUTH_SECRET thì phải nạp khóa + kết nối lại.
// - CHỈ chạy phía server. Không bao giờ trả client_secret/token ra API.
// ============================================================

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { gocDuLieu } from "@/lib/goc-du-lieu";
import { layKhoaAuth } from "@/lib/khoa-auth";

const FILE = path.join(gocDuLieu(), "drive.enc");

function khoa(): Buffer {
  const secret = layKhoaAuth(); // J01: thiếu AUTH_SECRET thì ném, không dùng khoá công khai
  return crypto.createHash("sha256").update(`drive:${secret}`).digest();
}

export interface DriveClient {
  clientId: string;
  clientSecret: string;
  /** "web" | "installed" — đọc từ credentials.json hoặc mặc định web khi nhập tay */
  loai: string;
  /** "json" (kéo tệp) | "tay" (nhập Client ID/Secret) */
  nguon: string;
}

export interface DriveToken {
  accessToken: string;
  refreshToken: string;
  /** epoch ms hết hạn accessToken */
  expiry: number;
  /** epoch ms lúc Google CẤP khoá làm mới (bấm Kết nối) — để báo trước hạn 7 ngày, xem han-khoa.ts. Khoá cũ không có. */
  capLuc?: number;
}

export interface DriveState {
  client?: DriveClient;
  token?: DriveToken;
  /** email tài khoản đã kết nối (lấy từ Drive about.get) */
  email?: string;
  /** id thư mục gốc SCI-AI-AGENT + cây đã tạo (cache để khỏi dò lại) */
  cay?: {
    rootId: string;
    heThongId?: string;
    /** projectId → folderId nhánh dự án trên Drive */
    duAn: Record<string, string>;
  };
  /** PKCE verifier + state đang chờ callback (2 request khác nhau nên phải lưu) */
  pkce?: { verifier: string; state: string; taoLuc: number };
}

export function docDrive(): DriveState {
  try {
    const raw = fs.readFileSync(FILE);
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const data = raw.subarray(28);
    const d = crypto.createDecipheriv("aes-256-gcm", khoa(), iv);
    d.setAuthTag(tag);
    const json = Buffer.concat([d.update(data), d.final()]).toString("utf8");
    return JSON.parse(json) as DriveState;
  } catch {
    return {};
  }
}

export function ghiDrive(state: DriveState): void {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", khoa(), iv);
  const data = Buffer.concat([c.update(JSON.stringify(state), "utf8"), c.final()]);
  fs.writeFileSync(FILE, Buffer.concat([iv, c.getAuthTag(), data]));
}

export function capNhatDrive(patch: Partial<DriveState>): DriveState {
  const s = { ...docDrive(), ...patch };
  ghiDrive(s);
  return s;
}

/** Xóa sạch khóa + token + cây (nút "Xóa khóa & gỡ kết nối") */
export function xoaDrive(): void {
  try {
    fs.unlinkSync(FILE);
  } catch {
    // chưa có file — coi như đã sạch
  }
}

/** Bóc client từ nội dung credentials.json (chấp nhận cả "web" lẫn "installed") */
export function bocCredentialsJson(noiDung: string): DriveClient | null {
  try {
    const j = JSON.parse(noiDung) as Record<string, { client_id?: string; client_secret?: string }>;
    for (const loai of ["web", "installed"]) {
      const c = j[loai];
      if (c?.client_id && c?.client_secret) {
        return { clientId: c.client_id, clientSecret: c.client_secret, loai, nguon: "json" };
      }
    }
    return null;
  } catch {
    return null;
  }
}
