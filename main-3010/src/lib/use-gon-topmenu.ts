"use client";

// ============================================================
// TOPMENU GỌN DẦN KHI HẸP — không bao giờ xuống dòng (27/09/2026)
//
// Mr. Đại 27/09: neo khung chat bên phải thì vùng nội dung hẹp lại, topmenu
// (cao cứng --cao-topmenu, trước đây `flex-wrap`) rớt sang dòng hai và ĐÈ lên
// nội dung bên dưới. Nay topmenu một dòng; hẹp tới đâu gọn tới đó:
//   gọn 1 — bỏ "dữ liệu đến …" cạnh tuần báo cáo
//   gọn 2 — Test / Giải thích / Giới thiệu chỉ còn biểu tượng (rê chuột vẫn có chữ)
//   gọn 3 — bỏ tên người dùng (còn chữ cái đầu)
//   gọn 4 — tên dự án co còn ~90px (rê chuột vẫn có tên đủ ở ô chọn)
//   gọn 5 — ẩn ô tuần báo cáo (vùng nội dung chỉ còn ~500px)
// Cách tính: đo thật — tràn (scrollWidth > clientWidth) thì lên một bậc, đổi bề
// rộng thì về 0 rồi đo lại (trước khi vẽ, không nháy). CSS ẩn nằm ở globals.css
// (`header[data-gon]`).
// ============================================================

import { useEffect, useLayoutEffect, useRef, useState } from "react";

export const GON_TOI_DA = 5;

export function useGonTopmenu<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [gon, setGon] = useState(0);
  const [, setLan] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let rongCu = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === rongCu) return;
      rongCu = el.clientWidth;
      setGon(0);
      setLan((n) => n + 1);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Không mảng phụ thuộc: chạy sau MỖI lần vẽ (dữ liệu tuần/người dùng về muộn cũng được đo)
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (gon < GON_TOI_DA && el.scrollWidth > el.clientWidth + 1) setGon(gon + 1);
  });

  return { ref, gon };
}
