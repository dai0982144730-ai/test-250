"use client";
// dung-phien.ts — người đang đăng nhập cho khung chat (thay useSessionUser của agent tiến độ).
// Gọi /api/tro-ly/phien MỘT lần cho cả trang (widget + panel dùng chung một lời hứa).
// Chưa đăng nhập (401) → null → khung chat tự ẩn.

import { useEffect, useState } from "react";

export interface NguoiDungChat {
  id: string;
  ten: string;
  email: string;
  don_vi_id: string | null;
  cauGoiY: string[];
  quyen: { cauHinh: boolean; kyNangChung: boolean; capKhoa: boolean };
}

let hua: Promise<NguoiDungChat | null> | null = null;

function napMotLan(): Promise<NguoiDungChat | null> {
  if (!hua) {
    hua = fetch("/api/tro-ly/phien", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { ok?: boolean; nguoi?: Omit<NguoiDungChat, "cauGoiY" | "quyen">; cauGoiY?: string[]; quyen?: NguoiDungChat["quyen"] } | null) => {
        if (!j || j.ok !== true || !j.nguoi) {
          hua = null; // đăng nhập xong lần sau hỏi lại
          return null;
        }
        return { ...j.nguoi, cauGoiY: j.cauGoiY ?? [], quyen: j.quyen ?? { cauHinh: false, kyNangChung: false, capKhoa: false } };
      })
      .catch(() => {
        hua = null;
        return null;
      });
  }
  return hua;
}

/** Hook: null khi chưa biết / chưa đăng nhập. `khoa` đổi (vd pathname) thì hỏi lại nếu lần trước chưa có. */
export function useNguoiDungChat(khoa?: string): NguoiDungChat | null {
  const [nd, setNd] = useState<NguoiDungChat | null>(null);
  useEffect(() => {
    let huy = false;
    // Trang đăng nhập: chưa có phiên — không hỏi (tránh lỗi 401 đỏ trong console mỗi lần mở /login)
    if (khoa === "/login" || khoa?.startsWith("/login?")) {
      setNd(null);
      return;
    }
    void napMotLan().then((v) => {
      if (!huy) setNd(v);
    });
    return () => {
      huy = true;
    };
  }, [khoa]);
  return nd;
}
