"use client";

// Công tắc «Hiện danh sách tài khoản ở màn đăng nhập» (Mr. Đại chốt 25/10/2026) — một công tắc cho cả hệ agent: giai đoạn test BẬT
// (bấm tên là vào, mật khẩu điền sẵn = email), hết giai đoạn test TẮT thì phải gõ email + mật khẩu.
import { useCallback, useEffect, useState } from "react";

export function KhoaDanhSachDangNhap({ laQuanTri, lyDoMo, showToast }: { laQuanTri: boolean; lyDoMo?: string; showToast: (text: string, ok: boolean) => void }) {
  const [hien, setHien] = useState<boolean | null>(null);
  const [dang, setDang] = useState(false);
  const tai = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/dang-nhap-hien", { cache: "no-store" });
      const j = (await r.json()) as { hien?: boolean };
      setHien(j.hien === true);
    } catch {
      setHien(null);
    }
  }, []);
  useEffect(() => {
    void tai();
  }, [tai]);
  async function doi() {
    if (hien === null) return;
    setDang(true);
    try {
      const r = await fetch("/api/auth/dang-nhap-hien", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hien: !hien }) });
      const j = (await r.json().catch(() => null)) as { ok?: boolean; message?: string; hien?: boolean } | null;
      if (r.ok && j?.ok) {
        setHien(j.hien === true);
        showToast(j.hien ? "Đã BẬT danh sách tài khoản ở màn đăng nhập (giai đoạn test)" : "Đã TẮT — từ giờ phải gõ email và mật khẩu", true);
      } else showToast(j?.message ?? `Máy chủ trả HTTP ${r.status}`, false);
    } catch {
      showToast("Không kết nối được máy chủ", false);
    }
    setDang(false);
  }
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-sm border border-border-light bg-bg2/40 px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-bold text-text">Danh sách tài khoản ở màn đăng nhập (giai đoạn test)</div>
        <div className="text-[11.5px] text-text-muted">
          {hien === null ? "Chưa đọc được trạng thái" : hien ? "Đang BẬT — bấm tên là đăng nhập luôn ở các agent" : "Đang TẮT — phải gõ email và mật khẩu"}
        </div>
      </div>
      <button
        type="button"
        onClick={() => void doi()}
        disabled={dang || hien === null || !laQuanTri}
        title={laQuanTri ? undefined : lyDoMo}
        className="rounded-sm border border-border px-3 py-1.5 text-[12px] font-bold text-text-secondary transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {hien ? "Tắt danh sách" : "Bật danh sách"}
      </button>
    </div>
  );
}
