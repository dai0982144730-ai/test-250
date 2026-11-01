"use client";
// Mảnh giao diện dùng chung của module kiem-tra-gui: gọi API, nhãn bước/trạng thái, huy hiệu, ảnh đại diện đơn vị.
import type { ReactNode } from "react";
import { fetchCoLoiViet, loiTheoMa } from "@/lib/loi-mang";

export async function goiApi<T = unknown>(url: string, body?: unknown, method?: string): Promise<T> {
  const r = await fetchCoLoiViet(
    url,
    body === undefined && !method
      ? { cache: "no-store" }
      : { method: method ?? "POST", headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) },
  );
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { loi?: string }).loi || loiTheoMa(r.status));
  return j as T;
}

export async function goiForm<T = unknown>(url: string, fd: FormData): Promise<T> {
  const r = await fetchCoLoiViet(url, { method: "POST", body: fd });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { loi?: string }).loi || loiTheoMa(r.status));
  return j as T;
}

export const NHAN_LOAI_BUOC: Record<string, string> = {
  gui: "Gửi",
  chuyen_tiep: "Chuyển tiếp nguyên văn",
  chuyen_tiep_kem: "Chuyển tiếp + gửi kèm",
  tra_lai: "Trả lại",
  gui_lai: "Gửi lại",
  gui_moi: "Tài liệu mới",
  hoan_thanh: "Hoàn thành",
};

export const NHAN_TRANG_THAI: Record<string, { nhan: string; mau: string }> = {
  cho_nhan: { nhan: "Chờ nhận", mau: "border-yellow text-yellow" },
  da_nhan: { nhan: "Đã nhận", mau: "border-green text-green" },
  bi_tra_lai: { nhan: "Bị trả lại", mau: "border-red text-red" },
  da_xu_ly: { nhan: "Đã nhận · đã xử lý", mau: "border-green text-green" },
  hoan_thanh: { nhan: "Hoàn thành", mau: "border-blue text-blue" },
};

export const NHAN_TRANG_THAI_TAI_LIEU: Record<string, { nhan: string; mau: string }> = {
  nhap: { nhan: "Nháp", mau: "border-border text-text-secondary" },
  da_gui: { nhan: "Đã gửi", mau: "border-green text-green" },
  bi_tra_lai: { nhan: "Bị trả lại", mau: "border-red text-red" },
  hoan_thanh: { nhan: "Hoàn thành", mau: "border-blue text-blue" },
};

export function Nhan({ children, mau = "border-border text-text-secondary", title }: { children: ReactNode; mau?: string; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] ${mau}`}>
      {children}
    </span>
  );
}

/** "2026-08-04T01:10:00Z" → "04/08 08:10" (giờ máy người xem). */
export function ngayGio(iso: string | null | undefined, coNam = false): string {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}${coNam ? `/${d.getFullYear()}` : ""} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** "2026-08-05" → "05/08/2026". */
export function ngayVN(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/** Chữ viết tắt trên ảnh đại diện: "P.ĐT&PC" → "ĐT", "Ban TGĐ" → "TGĐ", "Phó TGĐ phụ trách" → "PT". */
export function vietTat(ten: string, laNguoi = false): string {
  const t = (ten || "?").trim();
  if (laNguoi) {
    const w = t.split(/\s+/).filter(Boolean);
    return (w[0]?.[0] ?? "?").toUpperCase() + (w.length > 1 ? (w[w.length - 1][0] ?? "").toUpperCase() : "");
  }
  // Tên đầy đủ ("Phòng Đầu tư và Pháp chế", "BQLDA Quảng Trị", "SCI E&C") hoặc tên ngắn ("P.ĐT&PC")
  if (/^ban\s+t(ổ|ô)ng\s+gi(á|a)m\s+(đ|d)(ố|o)c/i.test(t) || /^tổng giám đốc/i.test(t)) return "TGĐ";
  const ngan = /^P\.([^\s&]+)/.exec(t);
  if (ngan) return ngan[1].slice(0, 3).toUpperCase(); // "P.ĐT&PC" → "ĐT"
  const bo = t
    .replace(/^(Phòng|Ban|Nhà máy thủy điện|Nhà máy|NM|SCI)\s+/i, "")
    .split(/[\s.]+/)
    .filter((x) => x && !/^(và|&)$/i.test(x));
  if (bo.length === 1) return bo[0].slice(0, 3).toUpperCase(); // "E&C", "PMC", "TGĐ"
  return bo
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();
}

const MAU_ANH = ["var(--accent)", "var(--blue)", "var(--green)", "var(--yellow)", "#a78bfa", "#f472b6"];

export function AnhDaiDien({ ten, khoa, laNguoi = false, co = 30 }: { ten: string; khoa: string; laNguoi?: boolean; co?: number }) {
  let h = 0;
  for (const c of khoa || ten) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const mau = MAU_ANH[h % MAU_ANH.length];
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full border font-semibold"
      style={{ width: co, height: co, fontSize: co * 0.34, color: mau, borderColor: mau }}
      aria-hidden
    >
      {vietTat(ten, laNguoi)}
    </span>
  );
}

export function NutChinh({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...p}
      className={`inline-flex items-center gap-1.5 rounded-sm bg-accent px-3 py-1.5 text-sm text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40 ${p.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function NutPhu({ children, nguyHiem, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { nguyHiem?: boolean }) {
  return (
    <button
      type="button"
      {...p}
      className={`inline-flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40 ${
        nguyHiem ? "border-red text-red hover:bg-surface" : "border-border text-text hover:border-accent"
      } ${p.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function The({ tieuDe, phai, children, className = "" }: { tieuDe?: ReactNode; phai?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded border border-border bg-surface ${className}`}>
      {tieuDe || phai ? (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <h2 className="text-sm font-semibold text-text">{tieuDe}</h2>
          {phai}
        </header>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function ThongDiep({ loai, children, onDong }: { loai: "loi" | "ok" | "tin"; children: ReactNode; onDong?: () => void }) {
  const mau = loai === "loi" ? "border-red text-red" : loai === "ok" ? "border-green text-green" : "border-blue text-blue";
  return (
    <div className={`flex items-start justify-between gap-3 rounded-sm border px-3 py-2 text-sm ${mau}`} role={loai === "loi" ? "alert" : "status"}>
      <div className="min-w-0">{children}</div>
      {onDong ? (
        <button type="button" onClick={onDong} className="text-text-muted hover:text-text" aria-label="Đóng">
          ×
        </button>
      ) : null}
    </div>
  );
}
