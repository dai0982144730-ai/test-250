"use client";
// Thành phần giao diện nhỏ dùng chung (nút, thẻ, hộp thoại, công tắc, thông báo nhanh) + gọi API.
// Tông tối, biến màu trong globals.css. Không dùng thư viện UI ngoài.

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

/** Gọi API JSON; lỗi (HTTP ≠ 2xx) ném Error mang thông điệp tiếng Việt + danh_sach_loi nếu có. */
export class LoiApi extends Error {
  constructor(
    message: string,
    public status: number,
    public danhSach: string[] = [],
  ) {
    super(message);
  }
}

export async function goiApi<T = unknown>(url: string, tuy?: { method?: string; body?: unknown; form?: FormData }): Promise<T> {
  // Mất mạng / máy chủ đang khởi động lại: trình duyệt báo "Failed to fetch" tiếng Anh → đổi sang tiếng Việt
  const res = await fetch(url, {
    method: tuy?.method ?? (tuy?.body !== undefined || tuy?.form ? "POST" : "GET"),
    headers: tuy?.body !== undefined ? { "content-type": "application/json" } : undefined,
    body: tuy?.form ?? (tuy?.body !== undefined ? JSON.stringify(tuy.body) : undefined),
    cache: "no-store",
  }).catch(() => {
    throw new LoiApi("Không kết nối được máy chủ (mất mạng hoặc máy chủ đang khởi động lại) — thử lại sau ít giây", 0, []);
  });
  const j = (await res.json().catch(() => null)) as (T & { loi?: string; danh_sach_loi?: string[] }) | null;
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined" && !url.startsWith("/api/auth/")) window.location.href = "/login";
    throw new LoiApi(j?.loi ?? `Lỗi máy chủ (HTTP ${res.status})`, res.status, j?.danh_sach_loi ?? []);
  }
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
    chinh: "border-accent bg-accent text-white hover:bg-accent-hover",
    vien: "border-border text-text-secondary hover:border-accent hover:text-accent",
    nhat: "border-transparent text-text-muted hover:bg-white/5 hover:text-text",
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

export function The({ tieuDe, phai, children, className = "" }: { tieuDe?: React.ReactNode; phai?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded border border-border bg-surface ${className}`}>
      {(tieuDe || phai) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <div className="text-[13px] font-bold text-text">{tieuDe}</div>
          {phai && <div className="flex flex-wrap items-center gap-2">{phai}</div>}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function HopThoai({
  tieuDe,
  dong,
  children,
  chan,
  rong = "max-w-[480px]",
}: {
  tieuDe: React.ReactNode;
  dong: () => void;
  children: React.ReactNode;
  chan?: React.ReactNode;
  rong?: string;
}) {
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === "Escape" && dong();
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [dong]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={dong}>
      <div className={`flex max-h-[90vh] w-full ${rong} flex-col rounded border border-border bg-surface shadow-card`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="text-[13px] font-bold text-text">{tieuDe}</div>
          <button type="button" onClick={dong} className="text-text-muted hover:text-text" aria-label="Đóng">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="scroll-thin overflow-y-auto p-4">{children}</div>
        {chan && <div className="flex justify-end gap-2 border-t border-border px-4 py-2.5">{chan}</div>}
      </div>
    </div>
  );
}

export function CongTac({ bat, doi, tat, nhan }: { bat: boolean; doi: (v: boolean) => void; tat?: boolean; nhan?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={bat}
      aria-label={nhan}
      disabled={tat}
      onClick={() => doi(!bat)}
      className={`relative h-5 w-9 shrink-0 rounded-full border transition disabled:cursor-not-allowed disabled:opacity-50 ${
        bat ? "border-accent bg-accent" : "border-border bg-bg"
      }`}
    >
      <span className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-all ${bat ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );
}

export const LOP_O_NHAP =
  "w-full rounded-sm border border-border bg-bg px-2.5 py-1.5 text-[12.5px] text-text outline-none transition placeholder:text-text-muted focus:border-accent disabled:opacity-60";

export function Truong({ nhan, goiY, children }: { nhan: React.ReactNode; goiY?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-text-secondary">{nhan}</span>
      {children}
      {goiY && <span className="mt-0.5 block text-[10.5px] text-text-muted">{goiY}</span>}
    </label>
  );
}

export function HopLoi({ loi, danhSach }: { loi?: string | null; danhSach?: string[] }) {
  if (!loi && !danhSach?.length) return null;
  return (
    <div className="rounded-sm border border-red/40 px-3 py-2 text-[12px] text-red">
      {loi && <div className="font-semibold">{loi}</div>}
      {danhSach && danhSach.length > 0 && (
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          {danhSach.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Thông báo nhanh góc dưới phải. */
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
      className={`fixed bottom-24 right-5 z-[60] max-w-[420px] rounded border bg-surface px-4 py-2.5 text-[12.5px] font-semibold shadow-card ${
        tb.tot ? "border-green/40 text-green" : "border-red/40 text-red"
      }`}
    >
      {tb.chu}
    </div>
  ) : null;
  return { bao, khung };
}

/** Ngày giờ kiểu Việt: 24/09/2026 14:05 */
export function ngayGio(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function ngay(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}
