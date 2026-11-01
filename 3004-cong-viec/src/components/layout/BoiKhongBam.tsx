"use client";

// ============================================================
// KÉO CHUỘT ĐỂ BÔI CHỮ THÌ KHÔNG TÍNH LÀ BẤM (Mr. Đại chốt 11/10/2026 — mọi agent, E45):
//   "khi tôi bấm chuột để bôi copy thông tin … nó bôi nền thành màu xanh … hiện đa số các trang là đổi màu chữ
//    hoặc thậm chí không cho phép bôi để copy nội dung"
// globals.css đã cho bôi chữ nằm trong nút / link / nhãn. Nhưng bôi xong thả chuột thì trình duyệt vẫn bắn "click":
// dòng tự mở, link tự chuyển trang, vệt bôi mất. Ở đây chặn đúng lượt click đó: chuột đã KÉO từ 5px trở lên VÀ đang
// có chữ được bôi. Bấm thường (không kéo) không bị đụng; ô nhập liệu không bị đụng.
// Bản giống hệt ở cả 6 agent — sửa một nơi thì chép sang nơi kia (luật 7).
// ============================================================
import { useEffect } from "react";

const NGUONG_KEO = 5; // px

export default function BoiKhongBam() {
  useEffect(() => {
    let x0 = 0;
    let y0 = 0;
    const xuong = (e: MouseEvent) => {
      x0 = e.clientX;
      y0 = e.clientY;
    };
    const bam = (e: MouseEvent) => {
      if (Math.abs(e.clientX - x0) + Math.abs(e.clientY - y0) < NGUONG_KEO) return;
      const d = e.target instanceof Element ? e.target : null;
      if (!d || d.closest("input, textarea, select, [contenteditable]")) return;
      const s = window.getSelection();
      if (!s || s.isCollapsed || s.toString().trim() === "") return;
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener("mousedown", xuong, true);
    document.addEventListener("click", bam, true);
    return () => {
      document.removeEventListener("mousedown", xuong, true);
      document.removeEventListener("click", bam, true);
    };
  }, []);
  return null;
}
