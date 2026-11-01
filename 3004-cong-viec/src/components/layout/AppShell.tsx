"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { KhungPhong } from "@/components/phong/KhungPhong";
import { CuaSoXemTep } from "@/components/dinh-kem/DinhKem";

/**
 * Khung app. /login và /chat full-screen; trang khác: khung căn phòng (thanh trên, sơ đồ khối) — kiểu vẽ 3D / 2D theo
 * <html data-giao-dien>. Giao diện cổ điển (thanh bên trái) đã XOÁ hẳn 29/09/2026 (Mr. Đại: "trình bầy rối rắm").
 * Biến --chat-dock-* do ChatWidget ghi khi neo.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Ô ngày (Hạn, Bắt đầu, lọc theo ngày…): bấm vào BẤT KỲ chỗ nào trong ô là mở lịch nhỏ — chọn một ngày là điền vào ô và
  // lịch tự đóng (Mr. Đại chốt 28/09). Gắn một lần ở khung app để phủ mọi ô ngày, kể cả ô thêm sau này.
  useEffect(() => {
    const moLich = (e: MouseEvent) => {
      const o = e.target;
      if (!(o instanceof HTMLInputElement) || o.type !== "date" || o.disabled || o.readOnly) return;
      try {
        o.showPicker();
      } catch {
        /* trình duyệt không hỗ trợ / lịch đang mở: vẫn gõ tay được */
      }
    };
    document.addEventListener("click", moLich);
    return () => document.removeEventListener("click", moLich);
  }, []);
  // /nhung/*: trang nhúng trong popup của agent khác — không thanh trên, không khung (04/10/2026)
  if (pathname === "/login" || pathname === "/chat" || pathname.startsWith("/nhung/")) return <>{children}</>;
  const khung = (
    <KhungPhong>
      <main className="min-w-0">{children}</main>
    </KhungPhong>
  );
  return (
    <div
      style={{
        paddingLeft: "var(--chat-dock-l, 0px)",
        paddingRight: "var(--chat-dock-r, 0px)",
        transition: "padding-left var(--chat-dock-anim, 150ms) ease, padding-right var(--chat-dock-anim, 150ms) ease",
      }}
    >
      {khung}
      {/* Cửa sổ xem file đính kèm nổi giữa màn — mọi chỗ gọi moXemTep(id, ten) */}
      <CuaSoXemTep />
    </div>
  );
}
