// Thanh tiêu đề trang (dính đỉnh, nền mờ như topmenu các agent SCI). Dùng được ở server lẫn client component.
export function TieuDeTrang({ tieuDe, moTa, phai }: { tieuDe: React.ReactNode; moTa?: React.ReactNode; phai?: React.ReactNode }) {
  return (
    <header className="nen-ghim sticky top-0 z-30 flex min-h-[var(--cao-topmenu)] flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-2">
      <div className="min-w-0">
        <h1 className="text-[15px] font-bold text-text">{tieuDe}</h1>
        {moTa && <div className="text-[11px] text-text-muted">{moTa}</div>}
      </div>
      {phai && <div className="flex flex-wrap items-center gap-2">{phai}</div>}
    </header>
  );
}
