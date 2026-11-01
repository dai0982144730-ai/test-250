"use client";
// Kiểu dữ liệu + hook tải danh mục (đơn vị, vai trò) cho các thẻ trang Quản trị.
import { useCallback, useEffect, useState } from "react";
import type { DonVi, PhamVi, Quyen } from "@/lib/types";
import { goiApi } from "@/components/layout/giao-dien";

export interface DonViQT extends DonVi {
  so_nguoi: number;
  sua_duoc: boolean;
  /** Chỉ đơn vị chức danh: chức danh khai tay; tên đơn vị máy tự ghép "<chức danh> · <người giữ>" (db/69) */
  chuc_danh?: string | null;
  chuc_danh_ngan?: string | null;
  /** TRƯỞNG CHÍNH (Mr. Đại chốt 03/10/2026 — trước là "ủy quyền trưởng" db/70): đơn vị có ≥ 2 trưởng chọn một người máy dùng */
  uy_quyen_truong?: string | null;
  /** Chức năng nhiệm vụ (db/81) — 🤖 AI soạn giao việc đọc ô này */
  chuc_nang?: string | null;
  /** Ngoài SCI (db/85): công ty SCI có cổ phần / ban điều hành tổng thầu — giao cho cả đơn vị thì được, không giao đích danh cá nhân */
  ngoai_sci?: boolean;
}

export interface VaiTroQT {
  id: string;
  ten: string;
  mo_ta: string | null;
  he_thong: boolean;
  quyen: Partial<Record<Quyen, PhamVi>>;
  so_nguoi: number;
}

export interface NguoiDungQT {
  id: string;
  email: string;
  ten: string;
  don_vi_id: string | null;
  chuc_vu: string | null;
  cap_chuc_vu: number | null;
  la_quan_tri: boolean;
  active: boolean;
  tao_luc: string;
  kiem_nhiem: { don_vi_id: string; chuc_vu: string | null }[];
  /** "Làm trưởng ở" (db/86): đơn vị người này thật sự làm trưởng — rỗng = mọi đơn vị của mình */
  truong_tai?: string[];
  vai_tro: string[];
  sua_duoc: boolean;
}

export interface KetQuaDonVi {
  don_vi: DonViQT[];
  chua_gan: number;
  loai: Record<DonVi["loai"], string>;
  mau: { ma: string; ten: string }[];
  them_goc_duoc: boolean;
}

export interface KetQuaVaiTro {
  vai_tro: VaiTroQT[];
  danh_muc_quyen: Record<Quyen, string>;
  sua_duoc: boolean;
  quyen_cua_toi: Partial<Record<Quyen, PhamVi>> | null; // null = quản trị viên (mọi quyền)
}

export type Bao = (chu: string, tot?: boolean) => void;

export function useTai<T>(url: string): { duLieu: T | null; loi: string | null; taiLai: () => Promise<void> } {
  const [duLieu, setDuLieu] = useState<T | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const taiLai = useCallback(async () => {
    try {
      setDuLieu(await goiApi<T>(url));
      setLoi(null);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không tải được dữ liệu");
    }
  }, [url]);
  useEffect(() => {
    void taiLai();
  }, [taiLai]);
  return { duLieu, loi, taiLai };
}

/** Đơn vị xếp theo cây, kèm độ sâu (để thụt lề trong ô chọn). */
export function xepTheoCay<T extends Pick<DonVi, "id" | "cha_id" | "thu_tu" | "ten">>(ds: T[]): (T & { sau: number })[] {
  const kq: (T & { sau: number })[] = [];
  const co = new Set(ds.map((d) => d.id));
  const di = (cha: string | null, sau: number) => {
    ds.filter((d) => (cha === null ? !d.cha_id || !co.has(d.cha_id) : d.cha_id === cha))
      .sort((a, b) => a.thu_tu - b.thu_tu || a.ten.localeCompare(b.ten, "vi"))
      .forEach((d) => {
        kq.push({ ...d, sau });
        di(d.id, sau + 1);
      });
  };
  di(null, 0);
  return kq;
}

/** Chữ cái đầu của họ và tên (như ảnh đại diện ở trang Thư mục): "Hoàng Thị Mai" → "HM". Bỏ phần trong ngoặc. */
export function chuCaiDau(ten: string): string {
  const t = ten.replace(/\(.*?\)/g, " ").trim().split(/\s+/).filter(Boolean);
  if (t.length === 0) return "?";
  return ((t.length > 1 ? t[0][0] : "") + t[t.length - 1][0]).toUpperCase();
}
