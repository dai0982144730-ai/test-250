"use client";
// useToi() — người đang đăng nhập (GET /api/toi), dùng chung một lần tải cho mọi thành phần trên trang.
// Gọi taiLaiToi() sau khi đổi thứ ảnh hưởng (đọc thông báo, đổi đơn vị…) để thanh bên cập nhật.

import { useEffect, useState } from "react";
import type { NguoiDungPhien } from "@/lib/types";

export interface ThongTinToi extends NguoiDungPhien {
  don_vi: { id: string; ten: string; ten_ngan: string; cap: number } | null;
  kiem_nhiem: { id: string; ten: string; ten_ngan: string; cap: number }[];
  co_the: { quan_tri: boolean; cai_dat: boolean; quan_tri_toan_bo?: boolean; cap_khoa?: boolean; quan_ly_mau?: boolean; ra_soat_so_cai?: boolean; thong_ke_ai?: boolean };
  so_thong_bao_chua_doc: number;
  /** chưa đọc đến sau lần mở chuông trước — chuông hiện "cũ+mới" */
  so_thong_bao_moi?: number;
  /** Việc mình chủ trì đích danh giao sau lần mở Việc của tôi gần nhất — nút Việc của tôi phát sáng (08/10) */
  so_viec_moi?: number;
  /** Giao diện 3D / 2D (Mr. Đại chốt 29/09) */
  kieu_ve?: "3d" | "2d";
  so_viec_qua_han?: number;
  /** quản trị: số dòng việc của báo cáo đã gửi còn thiếu trong sổ cái (lần rà soát gần nhất) */
  so_viec_thieu_so_cai?: number;
}

let hienTai: ThongTinToi | null = null;
let dangTai: Promise<ThongTinToi | null> | null = null;
const nguoiNghe = new Set<(t: ThongTinToi | null) => void>();

export function taiLaiToi(): Promise<ThongTinToi | null> {
  dangTai = fetch("/api/toi", { cache: "no-store" })
    .then((r) => (r.ok ? (r.json() as Promise<ThongTinToi>) : null))
    .catch(() => null)
    .then((t) => {
      hienTai = t;
      dangTai = null;
      nguoiNghe.forEach((f) => f(t));
      return t;
    });
  return dangTai;
}

export function useToi(): ThongTinToi | null {
  const [toi, setToi] = useState<ThongTinToi | null>(hienTai);
  useEffect(() => {
    nguoiNghe.add(setToi);
    if (!hienTai && !dangTai) void taiLaiToi();
    else if (hienTai) setToi(hienTai);
    return () => {
      nguoiNghe.delete(setToi);
    };
  }, []);
  return toi;
}
