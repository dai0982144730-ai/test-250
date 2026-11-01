"use client";

// ============================================================
// UserMenu — menu xổ của chip tên người (góc trên bên phải). Mr. Đại chốt 03/10/2026:
// gom về đây Giao diện 3D/2D · Skill AI của tôi · Agent quan sát ↗ · Cài đặt · Đổi mật khẩu · Đăng xuất
// (trước nằm rải ở cột trái và chân cột trái). Mỗi thứ MỘT chỗ.
// Mr. Đại chốt 04/10/2026 (ảnh menu agent Công việc): làm giống agent Công việc — dòng đầu "đơn vị · chức vụ",
// rồi 3D/2D · Cài đặt · Skill AI của tôi · Đổi mật khẩu · Đăng xuất; dưới Đăng xuất gạch ngang + dãy link các agent
// (DayAgent.tsx). Ẩn Giới thiệu · Test ("ẩn tất cả các mục help, trợ giúp, test") — trang vẫn còn, chỉ bỏ khỏi menu.
// Main: Nối Telegram để dưới cùng (Mr. Đại 04/10).
// Quyền: mục ngoài quyền HIỆN MỜ kèm lý do (luật 17) — dùng đúng hàm của cột trái cũ.
// ============================================================
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { canAccessPath } from "@/lib/auth";
import { cuaCuaTrang, LY_DO_CHAN } from "@/lib/quyen";
import { useSessionUser } from "@/lib/use-session";
import { COOKIE_GIAO_DIEN, KIEU_MAC_DINH, laKieuGiaoDien, type KieuGiaoDien } from "@/lib/giao-dien-agent";
import { ChangePasswordModal, handleLogout } from "@/components/layout/Sidebar";
import { DayAgentMenu } from "@/components/layout/DayAgent";
import { NoiTelegramModal } from "@/components/telegram-tro-ly/NoiTelegram";
import { HuongDanMoThang } from "@/components/huong-dan/NutHuongDan";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

const MUC =
  "flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-left text-[12px] font-medium text-text-secondary transition hover:bg-white/5 hover:text-text";

/** Gắn kiểu lên <html> ngay (không tải lại trang) + cookie 400 ngày cho lần tải sau. */
function apKieu(k: KieuGiaoDien) {
  document.documentElement.dataset.giaoDien = k;
  document.cookie = `${COOKIE_GIAO_DIEN}=${k}; path=/; max-age=${400 * 86400}; samesite=lax`;
}

export function UserMenu() {
  const user = useSessionUser();
  const pathname = usePathname();
  const [mo, setMo] = useState(false);
  const [kieu, setKieu] = useState<KieuGiaoDien>(KIEU_MAC_DINH);
  const [doiMk, setDoiMk] = useState(false);
  const [telegram, setTelegram] = useState(false);
  const [huongDanTg, setHuongDanTg] = useState(false);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const v = document.documentElement.dataset.giaoDien;
    if (laKieuGiaoDien(v)) setKieu(v);
  }, []);
  useEffect(() => setMo(false), [pathname]);
  useEffect(() => {
    if (!mo) return;
    const ngoai = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMo(false);
    };
    const phim = (e: KeyboardEvent) => e.key === "Escape" && setMo(false);
    document.addEventListener("mousedown", ngoai);
    document.addEventListener("keydown", phim);
    return () => {
      document.removeEventListener("mousedown", ngoai);
      document.removeEventListener("keydown", phim);
    };
  }, [mo]);

  const chon = (k: KieuGiaoDien) => {
    apKieu(k);
    setKieu(k);
  };
  const baoKq = (text: string, ok: boolean) => {
    setToast({ text, ok });
    window.setTimeout(() => setToast(null), 3500);
  };
  const choCaiDat = !user || canAccessPath(user.role, "/settings");
  const choSkill = !user || canAccessPath(user.role, "/skill");

  return (
    <div ref={ref} className="relative">
      {mo && <KhaiHuongDan ma="menu-ten-nguoi" uuTien={2} />}
      <button
        type="button"
        onClick={() => setMo((m) => !m)}
        aria-haspopup="menu"
        aria-expanded={mo}
        data-gt="Menu tên người"
        className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[11.5px] transition hover:border-accent"
      >
        <span data-ava className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white">
          {user ? user.name.charAt(0) : "…"}
        </span>
        <span className="nhan-gon-3 text-text-secondary">{user ? user.name : "Đang tải…"}</span>
        <span aria-hidden className="text-text-muted">▾</span>
      </button>

      {mo && (
        <div role="menu" data-um-hop className="absolute right-0 top-[calc(100%+6px)] z-50 w-[280px] rounded-md border border-border bg-surface p-1 shadow-card">
          {/* Dòng đầu chữ xám "đơn vị · chức vụ" như agent Công việc — tên đã nằm trên nút; chưa khai thì hiện email */}
          <div className="border-b border-border px-2.5 pb-2 pt-1.5 text-[12px] leading-snug text-text-muted">
            {user ? user.dongDau || user.email : "…"}
          </div>

          <div data-gt="Giao diện 3D/2D" className="grid grid-cols-2 gap-1 border-b border-border p-1.5">
            {(["3d", "2d"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => chon(k)}
                aria-pressed={kieu === k}
                className={`rounded-sm border px-2 py-1 text-[12px] font-medium transition ${
                  kieu === k ? "border-accent font-bold text-accent" : "border-border text-text-secondary hover:border-accent hover:text-text"
                }`}
              >
                Giao diện {k.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="py-1">
            {choCaiDat ? (
              <Link href="/settings" role="menuitem" className={MUC} data-gt="Cài đặt">Cài đặt</Link>
            ) : (
              <span aria-disabled="true" title={`Cài đặt — ${LY_DO_CHAN[cuaCuaTrang("/settings")]}`} className={`${MUC} cursor-not-allowed opacity-50`}>
                Cài đặt
              </span>
            )}
            {choSkill ? (
              <Link href="/skill" role="menuitem" className={MUC} data-gt="Skill AI của tôi">Skill AI của tôi</Link>
            ) : (
              <span aria-disabled="true" title={`Skill AI của tôi — ${LY_DO_CHAN[cuaCuaTrang("/skill")]}`} className={`${MUC} cursor-not-allowed opacity-50`}>
                Skill AI của tôi
              </span>
            )}
            {/* Quản lý token AI (04/10): mỗi người tự nối tài khoản Claude của mình làm dự phòng */}
            <Link href="/tai-khoan-claude" role="menuitem" className={MUC} data-gt="Tài khoản Claude cá nhân">Tài khoản Claude cá nhân</Link>
            <button type="button" role="menuitem" onClick={() => (setDoiMk(true), setMo(false))} className={MUC} data-gt="Đổi mật khẩu">Đổi mật khẩu</button>
            <button type="button" role="menuitem" onClick={handleLogout} className={`${MUC} hover:text-red`} data-gt="Đăng xuất">Đăng xuất</button>
          </div>
          <DayAgentMenu maToi="main" />
          <div className="flex items-center gap-1 border-t border-border pt-1">
            <button type="button" role="menuitem" onClick={() => (setTelegram(true), setMo(false))} title="Nối Telegram — hỏi trợ lý Main qua bot" className={`${MUC} flex-1`} data-gt="Nối Telegram">Nối Telegram</button>
            {/* Mr. Đại 28/10/2026: «Hướng dẫn» ngay bên phải «Nối Telegram» — bấm là mở bài hướng dẫn từng bước có hình */}
            <button
              type="button"
              onClick={() => (setHuongDanTg(true), setMo(false))}
              title="Xem hướng dẫn nối Telegram từng bước, có hình"
              data-gt="Hướng dẫn nối Telegram"
              className="shrink-0 rounded-sm border border-accent/50 bg-accent-soft px-2 py-0.5 text-[11.5px] font-bold text-accent transition-colors hover:border-accent"
            >
              ? Hướng dẫn
            </button>
          </div>
        </div>
      )}

      {huongDanTg && <HuongDanMoThang ma="noi-telegram" onClose={() => setHuongDanTg(false)} />}
      {telegram && <NoiTelegramModal onClose={() => setTelegram(false)} />}
      {doiMk && <ChangePasswordModal onClose={() => setDoiMk(false)} onDone={baoKq} />}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 rounded border bg-surface px-4 py-2.5 text-[12.5px] font-semibold shadow-card ${
            toast.ok ? "border-green/30 text-green" : "border-red/30 text-red"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
