"use client";

// Khối GẬP ĐƯỢC — cùng khung với SectionCard, mặc định đóng, bấm "▸ Mở" mới xem chi tiết
// (Mr. Đại 04/10/2026, trang Báo cáo sáng: "còn tất cả đều đóng lại có nút mở ra khi có nhu cầu xem chi tiết").
// Thân khối chỉ ẨN chứ không gỡ — phần bên trong vẫn chạy (vd khối Người nhận báo số người cho nút Gửi ngay).
import { useState, type ReactNode } from "react";

export function KhoiGap({
  dau,
  children,
  className = "",
  moSan = false,
}: {
  /** Phần đầu khối (tiêu đề + chú thích) — SectionCard dựng sẵn */
  dau: ReactNode;
  children: ReactNode;
  className?: string;
  moSan?: boolean;
}) {
  const [mo, setMo] = useState(moSan);
  return (
    <section className={`rounded border border-border bg-surface shadow-card ${className}`} data-khoi-trang>
      <header className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 ${mo ? "border-b border-border-light" : ""}`}>
        {dau}
        <button
          type="button"
          onClick={() => setMo((m) => !m)}
          aria-expanded={mo}
          data-gt="Mở / thu gọn khối"
          className="rounded-sm border border-border px-2.5 py-1 text-[11.5px] font-semibold text-text-secondary transition hover:border-accent/40 hover:text-accent"
        >
          {mo ? "▾ Thu gọn" : "▸ Mở"}
        </button>
      </header>
      <div className="p-4" hidden={!mo}>
        {children}
      </div>
    </section>
  );
}
