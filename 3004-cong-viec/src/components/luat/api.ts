"use client";
// Gọi API của bộ luật (luat-loi: /api/luat/*, luat-ai: /api/luat/dich, /api/luat/ai). Lỗi → LoiLuatApi mang
// thông điệp tiếng Việt + danh_sach_loi (400 luật chưa hợp lệ) để hiện cạnh ô.
import type { DeXuatLuat, DinhNghiaLoaiLuat, KetQuaChayThu, LuatKiemTra, LuatNhap } from "@/lib/luat/types";
import type { DinhNghiaMauRutGon } from "@/lib/luat/types-them";

export type LoaiLuatUi = Omit<DinhNghiaLoaiLuat, "kiem">;
export interface PhienBanLuat {
  phien_ban: number;
  gia_tri: LuatKiemTra;
  boi: string | null;
  boi_ten?: string | null;
  luc: string;
  ghi_chu?: string | null;
}

export class LoiLuatApi extends Error {
  constructor(
    message: string,
    public status: number,
    public danhSach: string[] = [],
  ) {
    super(message);
  }
}

const THONG_DIEP: Record<number, string> = {
  403: "Bạn không có quyền làm việc này",
  404: "Không tìm thấy — có thể luật vừa bị xóa, tải lại trang",
  409: "Dữ liệu vừa đổi ở nơi khác — tải lại rồi thử lại",
};

async function goi<T>(url: string, tuy?: { method?: string; body?: unknown }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: tuy?.method ?? (tuy?.body !== undefined ? "POST" : "GET"),
      headers: tuy?.body !== undefined ? { "content-type": "application/json" } : undefined,
      body: tuy?.body !== undefined ? JSON.stringify(tuy.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new LoiLuatApi("Không kết nối được máy chủ — kiểm tra mạng rồi thử lại", 0);
  }
  const j = (await res.json().catch(() => null)) as (T & { loi?: string; danh_sach_loi?: string[] }) | null;
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") window.location.href = "/login";
    throw new LoiLuatApi(j?.loi ?? THONG_DIEP[res.status] ?? `Lỗi máy chủ (HTTP ${res.status})`, res.status, j?.danh_sach_loi ?? []);
  }
  return j as T;
}

const sapMau = (ds: DinhNghiaMauRutGon[]) => [...ds].sort((a, b) => a.ma.localeCompare(b.ma, "vi", { numeric: true }));

export async function taiDanhSachLuat(): Promise<{ luat: LuatKiemTra[]; duoc_sua: boolean }> {
  const r = await goi<{ luat: LuatKiemTra[]; duoc_sua: boolean }>("/api/luat");
  return { luat: r.luat ?? [], duoc_sua: !!r.duoc_sua };
}

/** Luật áp dụng cho một mẫu (màn Soạn và gửi). Lỗi → null (không hiện gì, không phá màn kiểm tra). */
export async function luatCuaMau(mauMa: string | null): Promise<LuatKiemTra[] | null> {
  try {
    return (await goi<{ luat: LuatKiemTra[] }>(`/api/luat${mauMa ? `?mau=${encodeURIComponent(mauMa)}` : ""}`)).luat ?? [];
  } catch {
    return null;
  }
}

export async function taiLoaiLuat(): Promise<LoaiLuatUi[]> {
  return (await goi<{ loai: LoaiLuatUi[] }>("/api/luat/loai")).loai ?? [];
}

export async function taiDinhNghiaMau(): Promise<DinhNghiaMauRutGon[]> {
  return sapMau((await goi<{ mau: DinhNghiaMauRutGon[] }>("/api/luat/mau")).mau ?? []);
}

export async function luuLuat(v: LuatNhap): Promise<LuatKiemTra> {
  return (await goi<{ luat: LuatKiemTra }>("/api/luat", { body: v })).luat;
}

export async function xoaLuat(id: string): Promise<void> {
  await goi(`/api/luat/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function taiPhienBan(id: string): Promise<PhienBanLuat[]> {
  const r = await goi<{ phien_ban: PhienBanLuat[] }>(`/api/luat/${encodeURIComponent(id)}/phien-ban`);
  return [...(r.phien_ban ?? [])].sort((a, b) => b.phien_ban - a.phien_ban);
}

export async function quayLaiPhienBan(id: string, phienBan: number): Promise<LuatKiemTra> {
  return (await goi<{ luat: LuatKiemTra }>(`/api/luat/${encodeURIComponent(id)}/quay-lai`, { body: { phien_ban: phienBan } })).luat;
}

export async function chayThu(luat: LuatNhap): Promise<KetQuaChayThu> {
  return goi<KetQuaChayThu>("/api/luat/chay-thu", { body: { luat } });
}

export async function dichCau(cau: string, apDung: LuatNhap["ap_dung"]): Promise<DeXuatLuat> {
  return goi<DeXuatLuat>("/api/luat/dich", { body: { cau, ap_dung: apDung } });
}
