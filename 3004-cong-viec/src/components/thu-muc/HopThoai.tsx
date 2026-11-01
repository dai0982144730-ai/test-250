"use client";
// Hộp thoại che màn hình (Esc hoặc bấm nền để đóng) — dùng cho xem trước, dòng thời gian.
import { useEffect } from "react";
import { X } from "lucide-react";

export function HopThoai({
  tieuDe,
  onDong,
  children,
  rong = "max-w-5xl",
  phai,
}: {
  tieuDe: React.ReactNode;
  onDong: () => void;
  children: React.ReactNode;
  rong?: string;
  phai?: React.ReactNode;
}) {
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === "Escape" && onDong();
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [onDong]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3" onClick={onDong}>
      <div
        role="dialog"
        aria-modal="true"
        className={`flex max-h-[92vh] w-full ${rong} flex-col rounded border border-border bg-bg shadow-card`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <div className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-text">{tieuDe}</div>
          {phai}
          <button type="button" onClick={onDong} className="rounded-sm p-1 text-text-muted hover:text-text" aria-label="Đóng">
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-3">{children}</div>
      </div>
    </div>
  );
}
