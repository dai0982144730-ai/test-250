// Khung nhỏ cho màn Kỹ năng AI — lấy đúng SectionCard / InfoBox / Pill của agent tiến độ
// (components/common) để màn đồng nhất với các agent SCI. Dùng được cả server lẫn client.
import type { ReactNode } from "react";

/** Khung panel chuẩn cho mọi khối nội dung */
export function SectionCard({
  title,
  subtitle,
  actions,
  children,
  className = "",
}: {
  title?: ReactNode;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded border border-border bg-surface shadow-card ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border-light px-4 py-3">
          <div>
            {title && <h2 className="text-[13.5px] font-bold text-text">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[11px] text-text-muted">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

/** Info-box "📐 Nguyên tắc" — giải thích ngay trên giao diện */
export function InfoBox({ title = "📐 Nguyên tắc", children }: { title?: string; children: ReactNode }) {
  // 26/10/2026 (Mr. Đại): bảng nguyên tắc mặc định ĐÓNG — cần thì bấm tiêu đề mới bung ra
  return (
    <details className="rounded-sm border border-border-light bg-bg2 px-3 py-2.5 text-[11.5px] leading-relaxed text-text-secondary">
      <summary className="cursor-pointer select-none font-bold text-text-muted">{title}</summary>
      <div className="mt-1">{children}</div>
    </details>
  );
}

const TONE: Record<string, string> = {
  green: "text-green",
  red: "text-red",
  yellow: "text-yellow",
  blue: "text-blue",
  accent: "text-accent",
  muted: "text-text-muted",
};

export function Pill({ tone, children }: { tone: keyof typeof TONE; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold ${TONE[tone] ?? TONE.muted}`}>{children}</span>;
}
