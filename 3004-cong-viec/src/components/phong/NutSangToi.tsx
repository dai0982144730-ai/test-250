"use client";

// Nút SÁNG / TỐI (◐) — Mr. Đại 26/10/2026: nằm sát bên trái tên người đăng nhập, như 6 agent kia. Gắn <html data-theme="dark|light">,
// nhớ theo trình duyệt (localStorage "theme", cùng khoá các agent khác), mặc định TỐI. Script trong <head> (layout.tsx) gắn sẵn trước khi vẽ.
import { useEffect, useState } from "react";

type Theme = "dark" | "light";

export function NutSangToi() {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("theme");
    } catch {
      saved = null;
    }
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
      data-gt="sang-toi"
      title={theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
      aria-label="Đổi giao diện sáng/tối"
      className="nut-tren"
    >
      ◐
    </button>
  );
}
