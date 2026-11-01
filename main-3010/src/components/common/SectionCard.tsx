import type { ReactNode } from "react";
import { TU_DIEN_GIAI_THICH } from "@/lib/giai-thich/noi-dung";
import { KhoiGap } from "@/components/common/KhoiGap";

/** Khoá giải thích của tiêu đề: khớp đúng chữ; tiêu đề có đuôi số động ("… — 12 văn bản") thì thử phần trước dấu " — " (03/10) */
function khoaTieuDe(t: ReactNode): string | undefined {
  if (typeof t !== "string") return undefined;
  if (t in TU_DIEN_GIAI_THICH) return t;
  const dau = t.split(" — ")[0];
  if (dau !== t && dau in TU_DIEN_GIAI_THICH) return dau;
  // Tiêu đề có đuôi số trong ngoặc («Luật động (0 đang bật)», «Người nhận báo cáo sáng (3 người sẽ nhận)») → thử phần trước ngoặc
  const khongNgoac = t.replace(/\s*\([^)]*\)\s*$/, "");
  return khongNgoac !== t && khongNgoac in TU_DIEN_GIAI_THICH ? khongNgoac : t;
}

/** Khung panel chuẩn cho mọi khối nội dung trên các tab */
export function SectionCard({
  title,
  subtitle,
  actions,
  children,
  className = "",
  gap = false,
}: {
  title?: ReactNode;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** true = khối GẬP, mặc định đóng, có nút "▸ Mở" (Mr. Đại 04/10 — trang Báo cáo sáng) */
  gap?: boolean;
}) {
  const dau = (
    <>
          <div>
            {title && (
              <h2
                className="text-[13.5px] font-bold text-text"
                data-gt={khoaTieuDe(title)}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p
                className="mt-0.5 text-[11px] text-text-muted"
                data-gt={subtitle in TU_DIEN_GIAI_THICH ? subtitle : undefined}
              >
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </>
  );
  if (gap)
    return (
      <KhoiGap dau={dau} className={className}>
        {children}
      </KhoiGap>
    );
  return (
    <section className={`rounded border border-border bg-surface shadow-card ${className}`} data-khoi-trang>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border-light px-4 py-3">
          {dau}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

/** Info-box "📐 Nguyên tắc" — giải thích công thức/nguồn dữ liệu ngay trên UI */
export function InfoBox({ title = "📐 Nguyên tắc tính toán", children }: { title?: string; children: ReactNode }) {
  // 26/10/2026 (Mr. Đại): bảng nguyên tắc mặc định ĐÓNG — cần thì bấm tiêu đề mới bung ra
  return (
    <details className="rounded-sm border border-border-light bg-bg2 px-3 py-2.5 text-[11.5px] leading-relaxed text-text-secondary">
      <summary className="cursor-pointer select-none font-bold text-text-muted">{title}</summary>
      <div className="mt-1">{children}</div>
    </details>
  );
}
