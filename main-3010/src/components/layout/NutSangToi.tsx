"use client";

// Nút SÁNG / TỐI (◐) — Mr. Đại 03/10/2026: "thêm nút sáng tối cho tất cả các agent, nguyên lý vị trí để và hoạt
// động giống agent pháp lý". Như Pháp lý: đứng ngay sau nút Giải thích, gắn <html data-theme="dark|light">, nhớ
// theo trình duyệt (localStorage "theme"), mặc định TỐI. Script trong <head> (layout.tsx) gắn sẵn trước khi vẽ — không nháy.
import { useEffect, useState } from "react";

type Theme = "dark" | "light";

export function NutSangToi() {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => {
    const saved = (() => {
      try {
        return localStorage.getItem("theme");
      } catch {
        return null;
      }
    })();
    const t: Theme = saved === "light" ? "light" : "dark";
    setTheme(t);
    document.documentElement.dataset.theme = t;
  }, []);
  const doi = () => {
    const t: Theme = theme === "dark" ? "light" : "dark";
    setTheme(t);
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem("theme", t);
    } catch {
      // trình duyệt chặn lưu — vẫn đổi cho lần xem này
    }
  };
  return (
    <button
      type="button"
      onClick={doi}
      data-lenh="topmenu.sang-toi"
      data-gt="Sáng / tối"
      title={theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
      aria-label="Đổi giao diện sáng/tối"
      className="flex items-center rounded-full border border-border bg-surface px-2.5 py-1 text-[12px] leading-none text-text-secondary transition hover:border-accent hover:text-accent"
    >
      ◐
    </button>
  );
}
