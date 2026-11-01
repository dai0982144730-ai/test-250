"use client";

// ============================================================
// CHUÔNG NHÚNG — thanh trên Main · Tiến độ · Hợp đồng dùng CHUNG chuông agent Công việc (Mr. Đại chốt 07/10/2026): cùng con số
// "cũ+mới", cùng danh sách, cùng nút đọc hết / xem tệp. Không viết lại chuông ở agent khác (luật 7) — nhúng đúng thành phần Chuong.
// Chưa đăng nhập agent Công việc → chuông mờ, bấm mở trang đăng nhập bên đó ở thẻ mới. Số tự tải lại mỗi phút (trang 3004 tải một
// lần lúc mở; khung nhúng nằm lâu trên thanh trên agent khác nên phải tự làm mới).
// ============================================================
import { useEffect, useState } from "react";
import { taiLaiToi } from "@/components/layout/dung-toi";
import { Chuong } from "./KhungPhong";

export function ChuongNhung() {
  const [dangNhap, setDangNhap] = useState<boolean | null>(null);
  // 26/10/2026: theo sáng/tối của trang chủ nhà (Main · Tiến độ · …) — trang đó truyền ?theme=light|dark
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("theme");
    if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
  }, []);
  useEffect(() => {
    let song = true;
    const kiem = () =>
      void taiLaiToi().then((t) => {
        if (song) setDangNhap(!!t);
      });
    kiem();
    const id = setInterval(kiem, 60_000);
    return () => {
      song = false;
      clearInterval(id);
    };
  }, []);
  return (
    // Một hàng ngang: chuông · dòng chữ báo họp (kiểm lần 7: khối thường làm dòng chữ rớt xuống dòng 2, khung nhúng cao 34 px che mất)
    <div className="gd-phong" style={{ background: "transparent", minHeight: 0, padding: "4px 2px", display: "flex", alignItems: "center", flexWrap: "nowrap", gap: 4 }} data-gt="chuong-nhung">
      <style>{"html{color-scheme:light!important}html,body{background:transparent!important;margin:0;overflow:hidden}"}</style>
      {dangNhap === false ? (
        <a
          className="chuong"
          href="/login"
          target="_blank"
          rel="noopener"
          title="Chưa đăng nhập agent Công việc — bấm để đăng nhập (thẻ mới), rồi tải lại trang này"
          style={{ opacity: 0.5, textDecoration: "none" }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0" />
          </svg>
        </a>
      ) : (
        <Chuong nhung />
      )}
    </div>
  );
}
