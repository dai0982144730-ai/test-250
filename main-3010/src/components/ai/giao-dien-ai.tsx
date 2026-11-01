"use client";
// ============================================================
// giao-dien-ai.tsx — VÀI MẢNH GIAO DIỆN cho bộ "Quản lý token AI" (Đợt 2 nhân bản từ agent Công việc, 04/10/2026):
// nút, ô nhập, gọi API. Đặt tên y như bên agent Công việc (Nut · LOP_O_NHAP · goiApi · LoiApi) để các tệp
// TheTaiKhoanClaude / ThongKeAI / TaiKhoanClaudeCongTy chép qua lại giữa các agent mà không phải sửa thân.
// Màu lấy token của Main (tailwind.config.ts — luật 11).
// ============================================================
import type React from "react";
import { useCallback, useRef, useState } from "react";

export class LoiApi extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

/** Gọi API của chính app: có body → POST JSON. Lỗi HTTP → ném LoiApi với câu tiếng Việt của máy chủ (trường message). */
export async function goiApi<T = unknown>(url: string, tuy?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(url, {
    method: tuy?.method ?? (tuy?.body !== undefined ? "POST" : "GET"),
    headers: tuy?.body !== undefined ? { "content-type": "application/json" } : undefined,
    body: tuy?.body !== undefined ? JSON.stringify(tuy.body) : undefined,
    cache: "no-store",
  }).catch(() => {
    // Mất mạng / máy chủ đang khởi động lại: trình duyệt báo "Failed to fetch" tiếng Anh → đổi sang tiếng Việt
    throw new LoiApi("Không kết nối được máy chủ (mất mạng hoặc máy chủ đang khởi động lại) — thử lại sau ít giây", 0);
  });
  const j = (await res.json().catch(() => null)) as (T & { message?: string }) | null;
  if (!res.ok) throw new LoiApi(j?.message ?? `Lỗi máy chủ (HTTP ${res.status})`, res.status);
  return j as T;
}

type KieuNut = "chinh" | "vien" | "nhat" | "nguy";

export function Nut({
  kieu = "vien",
  nho,
  className = "",
  ...p
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { kieu?: KieuNut; nho?: boolean }) {
  const mau: Record<KieuNut, string> = {
    chinh: "border-accent/50 bg-accent-soft text-accent hover:border-accent",
    vien: "border-border text-text-secondary hover:border-accent hover:text-accent",
    nhat: "border-transparent text-text-muted hover:text-text",
    nguy: "border-red/40 text-red hover:border-red",
  };
  return (
    <button
      type="button"
      {...p}
      className={`inline-flex items-center justify-center gap-1.5 rounded-sm border font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        nho ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-[12px]"
      } ${mau[kieu]} ${className}`}
    />
  );
}

export const LOP_O_NHAP =
  "w-full rounded-sm border border-border bg-bg px-2.5 py-1.5 text-[12.5px] text-text outline-none transition placeholder:text-text-muted focus:border-accent disabled:opacity-60";

/** Hộp báo nhanh góc dưới phải, tự tắt sau 4 giây: { bao(chu, tot?), khung } — đặt `khung` ở cuối thành phần */
export function useThongBaoNhanh() {
  const [tb, setTb] = useState<{ chu: string; tot: boolean } | null>(null);
  const hen = useRef<number | null>(null);
  const bao = useCallback((chu: string, tot = true) => {
    setTb({ chu, tot });
    if (hen.current) window.clearTimeout(hen.current);
    hen.current = window.setTimeout(() => setTb(null), 4000);
  }, []);
  const khung = tb ? (
    <div
      role="status"
      className={`fixed bottom-24 right-5 z-[60] max-w-[420px] rounded border bg-surface px-4 py-2.5 text-[12.5px] font-semibold shadow-card ${
        tb.tot ? "border-green/40 text-green" : "border-red/40 text-red"
      }`}
    >
      {tb.chu}
    </div>
  ) : null;
  return { bao, khung };
}
