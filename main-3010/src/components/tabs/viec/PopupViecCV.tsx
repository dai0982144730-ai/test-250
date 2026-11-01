"use client";

// ============================================================
// POPUP MỘT VIỆC CỦA AGENT CÔNG VIỆC (Mr. Đại chốt 04/10/2026): bấm một việc ở màn "Việc của tôi" → popup chứa ĐÚNG thẻ việc
// của agent Công việc (trang nhúng /nhung/viec/<mã>: Xong việc · Gia hạn · + Phối hợp · Hủy việc · ý kiến @/@@ · 📎) để báo xong
// hoặc góp ý ngay tại chỗ; không cần xem thì ✕ (hoặc Esc, hoặc bấm ra ngoài). Không viết lại thẻ ở agent này (luật 7).
// Đăng nhập: cookie phiên agent Công việc của chính trình duyệt — chưa đăng nhập thì khung hiện ô đăng nhập của agent Công việc.
// BẢN GỐC ở Main — chép nguyên sang Tiến độ · Hợp đồng.
// ============================================================

import { useEffect, useRef } from "react";

export function PopupViecCV({ goc, ma, ten, onDong }: { goc: string; ma: string; ten: string; onDong: (daDoi: boolean) => void }) {
  const daDoi = useRef(false);

  useEffect(() => {
    // Trang nhúng báo "việc vừa đổi" (Xong việc, Gia hạn, ý kiến…) → đóng popup thì danh sách tải lại
    const nghe = (e: MessageEvent) => {
      const d = e.data as { loai?: string; ma?: string } | null;
      if (d?.loai === "sci-viec-doi" && d.ma === ma) daDoi.current = true;
    };
    const phim = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDong(daDoi.current);
    };
    window.addEventListener("message", nghe);
    window.addEventListener("keydown", phim);
    return () => {
      window.removeEventListener("message", nghe);
      window.removeEventListener("keydown", phim);
    };
  }, [ma, onDong]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3" onClick={() => onDong(daDoi.current)} data-gt="viec:popup-viec">
      <div className="flex h-[88vh] w-full max-w-[760px] flex-col overflow-hidden rounded border border-border bg-bg shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <b className="min-w-0 flex-1 truncate text-[13px] text-text" title={ten}>
            {ma} · {ten}
          </b>
          <a href={`${goc}/so-do?viec=${encodeURIComponent(ma)}`} target="_blank" rel="noreferrer" className="shrink-0 text-[11.5px] text-accent hover:text-accent-hover" title="Mở việc này ở Sơ đồ tổ chức của agent Công việc (tab mới)">
            Mở ở agent Công việc ↗
          </a>
          <button type="button" onClick={() => onDong(daDoi.current)} className="shrink-0 px-1 text-[15px] text-text-muted hover:text-text" title="Đóng (Esc)">
            ✕
          </button>
        </div>
        <iframe src={`${goc}/nhung/viec/${encodeURIComponent(ma)}`} title={`Việc ${ma} ở agent Công việc`} className="min-h-0 w-full flex-1 border-0 bg-white" />
      </div>
    </div>
  );
}
