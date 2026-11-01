// ============================================================
// KHO ĐĨA CỦA CẦU NỐI TELEGRAM (server-only, node:fs — luật 10: phần thuần ở
// thuan.ts). Mọi file nằm dưới data/telegram-tro-ly/:
//   trang-thai.json  bật/tắt · offset getUpdates (bền, chống xử lý lặp) · đếm tin
//   ma-noi.json      mã nối 6 số đang sống (10 phút) + đếm gõ sai theo chat
//   phien.json       email → { dự án, id phiên chat "Telegram" }
//   (việc chờ bấm ✅ Làm / ❌ Bỏ: kho chung data/tro-ly/cho-duyet.json — lib/ai/cho-duyet-kho.ts)
//   nhat-ky.jsonl    sổ mỗi lượt: ai · lúc nào · hỏi gọn · trả lời gọn · ms · lỗi
// File hỏng/thiếu → coi như rỗng, không ném lỗi (vòng nhận không có người trực).
// ============================================================

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { gocDuLieu } from "@/lib/goc-du-lieu";
import { gioVn } from "@/lib/gio-vn";
import { TRANG_THAI_DAU, type TrangThaiNhan } from "./thuan";

function thuMuc(): string {
  return path.join(gocDuLieu(), "telegram-tro-ly");
}

function docJson<T>(ten: string, macDinh: T): T {
  try {
    return JSON.parse(fs.readFileSync(path.join(thuMuc(), ten), "utf8").replace(/^﻿/, "")) as T;
  } catch {
    return macDinh;
  }
}

function ghiJson(ten: string, v: unknown): void {
  fs.mkdirSync(thuMuc(), { recursive: true });
  const dich = path.join(thuMuc(), ten);
  const tam = `${dich}.${process.pid}.tam`;
  fs.writeFileSync(tam, JSON.stringify(v, null, 2) + "\n", "utf8");
  fs.renameSync(tam, dich);
}

// ===== Trạng thái vòng nhận =====

export function docTrangThai(): TrangThaiNhan {
  const t = docJson<Partial<TrangThaiNhan>>("trang-thai.json", {});
  return {
    ...TRANG_THAI_DAU,
    ...t,
    demNgay: t.demNgay && typeof t.demNgay.so === "number" ? t.demNgay : { ngay: "", so: 0 },
  };
}

export function suaTrangThai(sua: (t: TrangThaiNhan) => TrangThaiNhan): TrangThaiNhan {
  const moi = sua(docTrangThai());
  ghiJson("trang-thai.json", moi);
  return moi;
}

/** Cộng một tin vào đếm hôm nay (giờ VN) + ghi lúc tin cuối */
export function demMotTin(luc: Date = new Date()): void {
  const ngay = gioVn(luc).ngay;
  suaTrangThai((t) => ({
    ...t,
    tinCuoiLuc: luc.toISOString(),
    demNgay: { ngay, so: t.demNgay.ngay === ngay ? t.demNgay.so + 1 : 1 },
  }));
}

// ===== Mã nối =====

interface MaNoi {
  ma: string;
  email: string;
  hetHan: number;
}
interface SoMaNoi {
  ma: MaNoi[];
  /** chatId → các mốc gõ sai (ms) */
  sai: Record<string, number[]>;
}

export function docSoMaNoi(): SoMaNoi {
  const s = docJson<Partial<SoMaNoi>>("ma-noi.json", {});
  return { ma: Array.isArray(s.ma) ? s.ma : [], sai: s.sai && typeof s.sai === "object" ? s.sai : {} };
}

export function ghiSoMaNoi(s: SoMaNoi): void {
  ghiJson("ma-noi.json", s);
}

export function sinhMa(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

// ===== Phiên chat Telegram của từng người =====

export interface PhienTg {
  projectId: string;
  sessionId: string;
}

export function docPhien(email: string): PhienTg | null {
  const s = docJson<Record<string, PhienTg>>("phien.json", {});
  const p = s[email.toLowerCase()];
  return p && typeof p.projectId === "string" && typeof p.sessionId === "string" ? p : null;
}

/** Đổi email tài khoản (04/10/2026): phiên Telegram đang gắn email cũ chuyển sang email mới. true = có đổi */
export function doiEmailPhienTelegram(emailCu: string, emailMoi: string): boolean {
  const s = docJson<Record<string, PhienTg>>("phien.json", {});
  const cu = emailCu.trim().toLowerCase();
  if (!s[cu]) return false;
  s[emailMoi.trim().toLowerCase()] = s[cu];
  delete s[cu];
  ghiJson("phien.json", s);
  return true;
}

/** Bản tóm lịch sử phiên Telegram (26/10) — theo mã phiên */
type DongTom = { denTin?: number; chu?: string; luc?: string; loiLuc?: number };

function docSoTom(): Record<string, DongTom> {
  const s = docJson<unknown>("tom-tat.json", {});
  return s && typeof s === "object" && !Array.isArray(s) ? (s as Record<string, DongTom>) : {};
}

export function docTomTat(sessionId: string): { denTin: number; chu: string } | null {
  const t = docSoTom()[sessionId];
  return t && Number.isInteger(t.denTin) && typeof t.chu === "string" ? { denTin: t.denTin!, chu: t.chu } : null;
}

/** Lần tóm lỗi gần nhất (ms) — 0 nếu chưa lỗi (kiểm độc lập TG-03) */
export function docLoiTom(sessionId: string): number {
  const l = docSoTom()[sessionId]?.loiLuc;
  return typeof l === "number" ? l : 0;
}

export function ghiLoiTom(sessionId: string): void {
  try {
    const s = docSoTom();
    s[sessionId] = { ...(s[sessionId] ?? {}), loiLuc: Date.now() };
    ghiJson("tom-tat.json", s);
  } catch {
    /* sổ phụ */
  }
}

export function ghiTomTat(sessionId: string, t: { denTin: number; chu: string }): void {
  const s = docSoTom();
  s[sessionId] = { ...t, luc: new Date().toISOString() };
  // Giữ 200 phiên gần nhất
  const khoa = Object.keys(s);
  for (const k of khoa.slice(0, Math.max(0, khoa.length - 200))) delete s[k];
  ghiJson("tom-tat.json", s);
}

export function ghiPhien(email: string, p: PhienTg): void {
  const s = docJson<Record<string, PhienTg>>("phien.json", {});
  s[email.toLowerCase()] = p;
  ghiJson("phien.json", s);
}

// ===== Việc chờ bấm ✅ Làm =====
// Dời sang lib/ai/cho-duyet-kho.ts (25/09) — MỘT kho, MỘT bộ chạy cho cả web và
// Telegram (data/tro-ly/cho-duyet.json, mỗi dòng mang trường `kenh`).
export { docViecCho, suaViecCho, themViecCho } from "@/lib/ai/cho-duyet-kho";
export type { ViecCho } from "@/lib/ai/cho-duyet";

// ===== Sổ nhật ký lượt Telegram =====

export interface DongSoTg {
  luc: string;
  chatId: string;
  email: string | null;
  /** hoi = câu hỏi tới AI · lenh = /start /moi /noi · tu-choi = chưa nối/khoá/Người xem ·
   *  lam / bo = bấm nút · bo-qua = tin không xử lý (nhóm, tin tồn lần đầu…) */
  loai: "hoi" | "lenh" | "tu-choi" | "lam" | "bo" | "bo-qua";
  cauHoi: string;
  traLoi: string;
  ms: number;
  loi: string | null;
}

export function ghiSo(d: DongSoTg): void {
  try {
    fs.mkdirSync(thuMuc(), { recursive: true });
    fs.appendFileSync(path.join(thuMuc(), "nhat-ky.jsonl"), JSON.stringify(d) + "\n", "utf8");
  } catch {
    /* sổ hỏng không được làm hỏng lượt trả lời */
  }
}

export function docSo(gioiHan = 50): DongSoTg[] {
  try {
    const dong = fs.readFileSync(path.join(thuMuc(), "nhat-ky.jsonl"), "utf8").trim().split("\n");
    return dong
      .slice(-gioiHan)
      .map((d) => {
        try {
          return JSON.parse(d) as DongSoTg;
        } catch {
          return null;
        }
      })
      .filter((d): d is DongSoTg => d !== null);
  } catch {
    return [];
  }
}
