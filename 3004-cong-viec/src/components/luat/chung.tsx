"use client";
// Mảnh giao diện dùng chung của BỘ LUẬT KIỂM TRA: huy hiệu cách kiểm (Code / AI / Code + AI), mức (Chặn gửi / Cảnh báo / Gợi ý),
// nhãn mẫu, menu nhỏ, ngăn kéo bên phải. Màu chỉ ở chữ + viền (globals.css: bỏ nền trạng thái).
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AlertTriangle, Braces, Check, Info, Lock, Sparkles, X } from "lucide-react";
import type { CachKiem, LuatKiemTra, MucLuat } from "@/lib/luat/types";

// ---------------- Nhãn ----------------

export const NHAN_MUC: Record<MucLuat, { nhan: string; mo_ta: string; chu: string; vien: string; vienDam: string; cham: string }> = {
  chan: {
    nhan: "Chặn gửi",
    mo_ta: "Không đạt thì khóa nút Gửi",
    chu: "text-red",
    vien: "border-[color:color-mix(in_srgb,var(--red)_60%,transparent)]",
    vienDam: "border-red",
    cham: "bg-red",
  },
  canh_bao: {
    nhan: "Cảnh báo",
    mo_ta: "Báo cho người gửi, vẫn gửi được",
    chu: "text-yellow",
    vien: "border-[color:color-mix(in_srgb,var(--yellow)_60%,transparent)]",
    vienDam: "border-yellow",
    cham: "bg-yellow",
  },
  goi_y: {
    nhan: "Gợi ý",
    mo_ta: "Chỉ nhắc nhẹ, không làm phiền",
    chu: "text-blue",
    vien: "border-[color:color-mix(in_srgb,var(--blue)_60%,transparent)]",
    vienDam: "border-blue",
    cham: "bg-blue",
  },
};

export const NHAN_CACH: Record<CachKiem, { nhan: string; mo_ta: string }> = {
  code: {
    nhan: "Code",
    mo_ta: "Chạy chắc chắn, tức thì, không tốn AI — được chặn gửi",
  },
  ai: {
    nhan: "AI",
    mo_ta: "AI đọc hiểu nội dung — linh hoạt nhưng có thể sai, nên để cảnh báo",
  },
  ca_hai: {
    nhan: "Code + AI",
    mo_ta: "Code kiểm phần chắc chắn, AI xem thêm phần cần đọc hiểu",
  },
};

/** 'form-7' → 'Form 7' */
export function tenMau(ma: string): string {
  const m = /^form-(\d+)$/i.exec(ma);
  return m ? `Form ${m[1]}` : ma;
}

export function tenApDung(ap: LuatKiemTra["ap_dung"]): string {
  if (ap === "tat_ca") return "Mọi mẫu";
  if (!ap.length) return "Chưa chọn mẫu";
  return [...ap]
    .sort((a, b) => a.localeCompare(b, "vi", { numeric: true }))
    .map(tenMau)
    .join(" · ");
}

/** Nhãn VIẾT HOA trong mẫu Word → kiểu câu: "VẤN ĐỀ NỔI BẬT" → "Vấn đề nổi bật" */
export function kieuCau(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  const chu = t.replace(/[^\p{L}]/gu, "");
  if (chu && chu === chu.toUpperCase()) {
    const thuong = t.toLocaleLowerCase("vi");
    return thuong.charAt(0).toLocaleUpperCase("vi") + thuong.slice(1);
  }
  return t;
}

// ---------------- Huy hiệu ----------------

/** Huy hiệu cách kiểm: dáng vuông, chữ đậm nhỏ — khác hẳn huy hiệu mức (dáng tròn có chấm). */
export function HuyHieuCach({ cach, nho }: { cach: CachKiem | null | undefined; nho?: boolean }) {
  if (!cach) return null;
  const co = nho ? "h-[18px] px-1.5 text-[10px]" : "h-5 px-1.5 text-[10.5px]";
  const code = (
    <span className={`inline-flex items-center gap-1 font-bold tracking-wide text-text-secondary ${co}`}>
      <Braces className="h-3 w-3 text-blue" /> CODE
    </span>
  );
  const ai = (
    <span className={`inline-flex items-center gap-1 font-bold tracking-wide text-accent ${co}`}>
      <Sparkles className="h-3 w-3" /> AI
    </span>
  );
  return (
    <span
      title={NHAN_CACH[cach].mo_ta}
      className={`inline-flex shrink-0 items-center overflow-hidden rounded-[5px] border ${cach === "code" ? "border-border" : "border-[color:color-mix(in_srgb,var(--accent)_50%,transparent)]"}`}
    >
      {cach !== "ai" && code}
      {cach === "ca_hai" && <span className="h-3 w-px bg-border" />}
      {cach !== "code" && ai}
    </span>
  );
}

export function HuyHieuMuc({ muc, nho, className = "" }: { muc: MucLuat; nho?: boolean; className?: string }) {
  const m = NHAN_MUC[muc];
  return (
    <span
      title={m.mo_ta}
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border ${m.vien} ${m.chu} ${
        nho ? "px-1.5 py-px text-[10px]" : "px-2 py-0.5 text-[11px]"
      } font-semibold ${className}`}
    >
      {muc === "chan" ? <Lock className="h-2.5 w-2.5" /> : <span className={`h-1.5 w-1.5 rounded-full ${m.cham}`} />}
      {m.nhan}
    </span>
  );
}

export function HuyHieuHeThong() {
  return (
    <span
      title="Luật gốc của hệ thống: tắt hoặc đổi mức được, không xóa được"
      className="inline-flex items-center gap-1 rounded-[5px] border border-border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-text-muted"
    >
      <Lock className="h-2.5 w-2.5" /> Hệ thống
    </span>
  );
}

/** Ô chữ nhỏ có biểu tượng — thông tin phụ dưới tên luật. */
export function ThongTinNho({ icon, children, title }: { icon: React.ReactNode; children: React.ReactNode; title?: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1 text-[11px] text-text-muted" title={title}>
      <span className="shrink-0 opacity-80">{icon}</span>
      <span className="truncate">{children}</span>
    </span>
  );
}

// ---------------- Thông điệp trong khung ----------------

export function GhiChu({ loai = "tin", children, className = "" }: { loai?: "tin" | "canh_bao" | "loi"; children: React.ReactNode; className?: string }) {
  const mau =
    loai === "loi"
      ? "border-[color:color-mix(in_srgb,var(--red)_40%,transparent)] text-red"
      : loai === "canh_bao"
        ? "border-[color:color-mix(in_srgb,var(--yellow)_40%,transparent)] text-yellow"
        : "border-border text-text-secondary";
  const Icon = loai === "tin" ? Info : AlertTriangle;
  return (
    <div className={`flex items-start gap-2 rounded-sm border px-3 py-2 text-[12px] leading-relaxed ${mau} ${className}`}>
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

// ---------------- Menu nhỏ (⋯) ----------------

export interface MucMenu {
  nhan: string;
  icon: React.ReactNode;
  lam: () => void;
  nguy?: boolean;
  an?: boolean;
  chon?: boolean;
}

export function MenuNho({ nut, muc, nhan = "Thao tác", lopNut }: { nut: React.ReactNode; muc: MucMenu[]; nhan?: string; lopNut?: string }) {
  const [mo, setMo] = useState(false);
  const goc = useRef<HTMLDivElement>(null);
  const hien = muc.filter((m) => !m.an);
  useEffect(() => {
    if (!mo) return;
    const ngoai = (e: MouseEvent) => !goc.current?.contains(e.target as Node) && setMo(false);
    const phim = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setMo(false);
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const ds = Array.from(goc.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]") ?? []);
        const i = ds.indexOf(document.activeElement as HTMLButtonElement);
        ds[(i + (e.key === "ArrowDown" ? 1 : -1) + ds.length) % ds.length]?.focus();
      }
    };
    document.addEventListener("mousedown", ngoai);
    window.addEventListener("keydown", phim, true);
    goc.current?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus();
    return () => {
      document.removeEventListener("mousedown", ngoai);
      window.removeEventListener("keydown", phim, true);
    };
  }, [mo]);
  if (!hien.length) return null;
  return (
    <div ref={goc} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={mo}
        aria-label={nhan}
        onClick={() => setMo((x) => !x)}
        className={
          lopNut ??
          `inline-flex h-7 w-7 items-center justify-center rounded-sm border transition ${
            mo ? "border-accent text-accent" : "border-transparent text-text-muted hover:border-border hover:text-text"
          }`
        }
      >
        {nut}
      </button>
      {mo && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-1 min-w-[196px] rounded-sm border border-border bg-surface py-1 shadow-card">
          {hien.map((m) => (
            <button
              key={m.nhan}
              type="button"
              role="menuitem"
              onClick={() => {
                setMo(false);
                m.lam();
              }}
              className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[12px] outline-none transition focus:bg-white/5 ${
                m.nguy ? "text-red hover:bg-white/5" : "text-text-secondary hover:bg-white/5 hover:text-text"
              }`}
            >
              <span className="flex h-3.5 w-3.5 items-center justify-center">{m.icon}</span>
              <span className="flex-1">{m.nhan}</span>
              {m.chon && <Check className="h-3.5 w-3.5 text-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------- Ngăn kéo bên phải ----------------

/** Hiện dần: false ở khung đầu, true ở khung sau → chuyển động CSS chạy được. */
export function useHienDan(): boolean {
  const [vao, setVao] = useState(false);
  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setVao(true)));
    return () => cancelAnimationFrame(id);
  }, []);
  return vao;
}

export function NganKeo({
  tieuDe,
  phu,
  dong,
  children,
  chan,
  rong = "max-w-[780px]",
}: {
  tieuDe: React.ReactNode;
  phu?: React.ReactNode;
  dong: () => void;
  children: React.ReactNode;
  chan?: React.ReactNode;
  rong?: string;
}) {
  const vao = useHienDan();
  const khung = useRef<HTMLDivElement>(null);
  const dongRef = useRef(dong);
  dongRef.current = dong;
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) dongRef.current();
    };
    window.addEventListener("keydown", f);
    const cu = document.activeElement as HTMLElement | null;
    khung.current?.focus();
    const tran = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", f);
      document.body.style.overflow = tran;
      cu?.focus?.();
    };
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${vao ? "opacity-100" : "opacity-0"}`}
        onMouseDown={() => dongRef.current()}
        aria-hidden
      />
      <div
        ref={khung}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className={`relative flex h-full w-full ${rong} flex-col border-l border-border bg-bg shadow-card outline-none transition-transform duration-200 ease-out ${
          vao ? "translate-x-0" : "translate-x-8 opacity-0"
        }`}
        style={{ transitionProperty: "transform, opacity" }}
      >
        <div className="nen-ghim flex items-start justify-between gap-3 border-b border-border px-5 py-3">
          <div className="min-w-0">
            <div className="text-[15px] font-bold text-text">{tieuDe}</div>
            {phu && <div className="mt-0.5 text-[11px] text-text-muted">{phu}</div>}
          </div>
          <button
            type="button"
            onClick={dong}
            className="mt-0.5 rounded-sm p-1 text-text-muted transition hover:bg-white/5 hover:text-text"
            aria-label="Đóng (Esc)"
            title="Đóng (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">{children}</div>
        {chan && <div className="border-t border-border bg-surface py-3 pl-5 pr-[84px]">{chan}</div>}
      </div>
    </div>
  );
}

/** Khung chờ (xương) cho danh sách đang tải. */
export function XuongDong({ so = 4 }: { so?: number }) {
  return (
    <div className="divide-y divide-border-light">
      {Array.from({ length: so }).map((_, i) => (
        <div key={i} className="flex animate-pulse items-start gap-3 px-4 py-3.5" style={{ animationDelay: `${i * 120}ms` }}>
          <div className="mt-0.5 h-5 w-9 rounded-full bg-white/[0.06]" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-white/[0.08]" />
            <div className="h-2.5 w-2/3 rounded bg-white/[0.05]" />
            <div className="h-2 w-1/4 rounded bg-white/[0.04]" />
          </div>
          <div className="h-5 w-16 rounded-full bg-white/[0.05]" />
        </div>
      ))}
    </div>
  );
}

/** Phím tắt dạng nút nhỏ: <Phim>Enter</Phim> */
export function Phim({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded-[4px] border border-border px-1 font-sans text-[10px] text-text-muted">{children}</kbd>;
}

/** Hàm gọi một lần khi giá trị đổi (bỏ lần đầu). */
export function useKhiDoi(gt: unknown, f: () => void) {
  const dau = useRef(true);
  const fRef = useRef(f);
  fRef.current = f;
  const khoa = JSON.stringify(gt);
  const lam = useCallback(() => fRef.current(), []);
  useEffect(() => {
    if (dau.current) {
      dau.current = false;
      return;
    }
    lam();
  }, [khoa, lam]);
}
