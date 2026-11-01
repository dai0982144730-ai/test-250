// ============================================================
// CÔNG CỤ GHI CHỜ BẤM ✅ LÀM — KHO ĐĨA + BỘ CHẠY, dùng chung web + Telegram
// (server-only, node:fs — phần thuần ở cho-duyet.ts, luật 10).
//
// Kho: data/tro-ly/cho-duyet.json (200 dòng gần nhất). File hỏng → coi rỗng.
// Bộ chạy `xuLyViecCho` là chỗ DUY NHẤT biến một cú bấm thành lần chạy thật:
//   · đúng kênh (web / Telegram), đúng chủ (email; Telegram thêm đúng chat)
//   · còn "cho" — đánh dấu TRƯỚC khi chạy nên bấm đúp không chạy hai lần
//   · chưa quá 24 giờ
//   · chạy qua runTool → cổng kiemCongCu xét LẠI loại tài khoản HIỆN TẠI và
//     câu người dùng đã nhắn ở lượt đó (đổi loại giữa chừng thì bị chặn)
//   · ghi kết quả vào phiên chat (xem lại được trên web)
// ============================================================

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { gocDuLieu } from "@/lib/goc-du-lieu";
import { runTool } from "@/lib/ai/chat-tools";
import { appendMessage, getSession, saveSession } from "@/lib/ai/chat-store";
import type { ExecutedAction, UiAction } from "@/lib/ai/chat-types";
import { duocCaiDat, NHAN_LOAI, type Role } from "@/lib/quyen";
import { HAN_CHO_DUYET_MS, gonViecCho, moTaViecCho, type KenhTroLy, type ViecCho, type ViecChoGon } from "./cho-duyet";

function tepKho(): string {
  return path.join(gocDuLieu(), "tro-ly", "cho-duyet.json");
}

export function docViecCho(): ViecCho[] {
  try {
    const ds = JSON.parse(fs.readFileSync(tepKho(), "utf8").replace(/^﻿/, "")) as ViecCho[];
    // Dòng cũ (trước khi có trường kenh) chỉ có thể là của Telegram
    return Array.isArray(ds) ? ds.map((v) => ({ ...v, kenh: v.kenh ?? "telegram" })) : [];
  } catch {
    return [];
  }
}

function ghiKho(ds: ViecCho[]): void {
  const dich = tepKho();
  fs.mkdirSync(path.dirname(dich), { recursive: true });
  const tam = `${dich}.${process.pid}.tam`;
  fs.writeFileSync(tam, JSON.stringify(ds.slice(-200), null, 2) + "\n", "utf8");
  fs.renameSync(tam, dich);
}

/** Đổi email tài khoản (04/10/2026): việc chờ đứng tên email cũ → email mới (người đó vẫn bấm được Làm/Bỏ). Trả số dòng đã đổi */
export function doiEmailViecCho(emailCu: string, emailMoi: string): number {
  const cu = emailCu.trim().toLowerCase();
  const ds = docViecCho();
  let dem = 0;
  for (const v of ds) {
    if (typeof v.email === "string" && v.email.trim().toLowerCase() === cu) {
      v.email = emailMoi.trim().toLowerCase();
      dem++;
    }
  }
  if (dem > 0) ghiKho(ds);
  return dem;
}

/** Thêm việc chờ; giữ tối đa 200 dòng gần nhất */
export function themViecCho(v: Omit<ViecCho, "id" | "luc" | "trangThai">): ViecCho {
  const moi: ViecCho = {
    ...v,
    id: crypto.randomBytes(6).toString("hex"),
    luc: new Date().toISOString(),
    trangThai: "cho",
  };
  ghiKho([...docViecCho(), moi]);
  return moi;
}

export function suaViecCho(id: string, sua: Partial<ViecCho>): ViecCho | null {
  const ds = docViecCho();
  const i = ds.findIndex((v) => v.id === id);
  if (i < 0) return null;
  ds[i] = { ...ds[i]!, ...sua };
  ghiKho(ds);
  return ds[i]!;
}

/** Việc còn chờ (chưa quá hạn) của một người trong một phiên — cho khung chat web */
export function viecChoCuaPhien(
  projectId: string,
  sessionId: string,
  email: string,
  kenh: KenhTroLy,
  bay: number = Date.now(),
): ViecChoGon[] {
  const e = email.toLowerCase();
  return docViecCho()
    .filter(
      (v) =>
        v.kenh === kenh &&
        v.trangThai === "cho" &&
        v.projectId === projectId &&
        v.sessionId === sessionId &&
        v.email.toLowerCase() === e &&
        bay - Date.parse(v.luc) <= HAN_CHO_DUYET_MS,
    )
    .map(gonViecCho);
}

/** Ghi một dòng kết quả vào phiên chat — hỏng thì thôi, không làm hỏng lượt bấm */
function luuVaoPhien(projectId: string, sessionId: string, chu: string, actions?: ExecutedAction[]): void {
  try {
    const s = getSession(projectId, sessionId);
    if (s) saveSession(appendMessage(s, "assistant", chu, actions));
  } catch {
    /* mất một dòng lịch sử không làm hỏng lượt bấm */
  }
}

export interface KetQuaBam {
  /**
   * khong-thay = không có việc / khác kênh / khác chat · xong-truoc = đã làm/bỏ rồi ·
   * tu-choi = không phải chủ (hoặc chủ không còn quyền dùng kênh) · qua-han ·
   * da-bo · da-lam (đã chạy — xem action.ok để biết chạy được hay không)
   */
  trangThai: "khong-thay" | "xong-truoc" | "tu-choi" | "qua-han" | "da-bo" | "da-lam";
  /** Câu tiếng Việt báo cho người bấm */
  cau: string;
  viec?: ViecCho;
  action?: ExecutedAction;
  uiAction?: UiAction;
}

/**
 * Xử lý MỘT cú bấm ✅ Làm / ❌ Bỏ. `nguoi` = người đang bấm, đọc MỚI (cookie web
 * hoặc sổ người dùng Telegram); null = không xác định được (Telegram: chat chưa
 * nối / bị khoá / Người xem) — khi đó `cauKhongNguoi` là lý do.
 */
export async function xuLyViecCho(o: {
  id: string;
  hanhDong: "lam" | "bo";
  kenh: KenhTroLy;
  chatId?: string;
  nguoi: { email: string; loai: Role } | null;
  cauKhongNguoi?: string;
  bay?: number;
}): Promise<KetQuaBam> {
  const v = docViecCho().find((x) => x.id === o.id);
  if (!v || v.kenh !== o.kenh || (o.kenh === "telegram" && v.chatId !== o.chatId)) {
    return { trangThai: "khong-thay", cau: "Không tìm thấy việc này." };
  }
  if (v.trangThai !== "cho") {
    return {
      trangThai: "xong-truoc",
      cau: v.trangThai === "da-lam" ? "Việc này đã làm rồi." : "Việc này đã bỏ rồi.",
      viec: v,
    };
  }
  if (!o.nguoi || o.nguoi.email.toLowerCase() !== v.email.toLowerCase()) {
    const cau = !o.nguoi
      ? (o.cauKhongNguoi ?? "Không xác định được người bấm — việc chờ không chạy.")
      : o.kenh === "telegram"
        ? "Chat này đã nối sang tài khoản khác — việc chờ cũ không chạy."
        : "Việc này là của tài khoản khác — bạn không bấm thay được.";
    // Telegram: chat đổi chủ thì nút cũ chết hẳn. Web: người lạ bấm không được
    // quyền huỷ việc của chủ → giữ nguyên trạng thái.
    if (o.kenh === "telegram") suaViecCho(v.id, { trangThai: "da-bo", ketQua: cau });
    return { trangThai: "tu-choi", cau, viec: v };
  }
  const moTa = moTaViecCho(v.name, v.args);
  if (o.hanhDong === "bo") {
    suaViecCho(v.id, { trangThai: "da-bo", ketQua: "người dùng bấm Bỏ" });
    const cau = `❌ Đã bỏ: ${moTa}`;
    luuVaoPhien(v.projectId, v.sessionId, cau);
    return { trangThai: "da-bo", cau, viec: v };
  }
  if ((o.bay ?? Date.now()) - Date.parse(v.luc) > HAN_CHO_DUYET_MS) {
    suaViecCho(v.id, { trangThai: "da-bo", ketQua: "quá hạn 24 giờ" });
    return {
      trangThai: "qua-han",
      cau: "Nút này quá 24 giờ nên không chạy nữa — nhắn lại yêu cầu để làm mới.",
      viec: v,
    };
  }
  // Đánh dấu TRƯỚC khi chạy — bấm đúp không chạy hai lần
  suaViecCho(v.id, { trangThai: "da-lam" });
  const kq = await runTool(v.name, v.args, {
    projectId: v.projectId,
    email: v.email,
    loai: o.nguoi.loai,
    role: duocCaiDat(o.nguoi.loai) ? "pm" : "engineer",
    tenLoai: NHAN_LOAI[o.nguoi.loai],
    // Cổng chống chèn lệnh xét lại đúng câu người dùng đã nhắn ở lượt đó
    userMessage: v.cauHoi,
    timWebBat: false,
  });
  suaViecCho(v.id, { ketQua: kq.summary });
  const action: ExecutedAction = { name: v.name, args: v.args, ok: kq.ok, summary: kq.summary };
  const cau = `${kq.ok ? "✅ Đã làm" : "⚠ Chưa làm được"}: ${kq.summary}`;
  luuVaoPhien(v.projectId, v.sessionId, cau, [action]);
  return { trangThai: "da-lam", cau, viec: v, action, uiAction: kq.uiAction };
}
