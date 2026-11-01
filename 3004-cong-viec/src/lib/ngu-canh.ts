// ============================================================
// ngu-canh.ts — NGỮ CẢNH YÊU CẦU (CHỈ SERVER). Dùng AsyncLocalStorage để mọi hàm chạy trong một yêu cầu API
// biết thiết bị (IP + user-agent) và người đang làm mà không phải truyền qua chữ ký từng hàm.
//   xuLy() (phien.ts) tự bọc handler bằng chayVoiNguCanh({ thiet_bi: thietBi() }, ...)
//   ghiLichSu() (lich-su/ghi.ts) tự điền thiet_bi từ layNguCanh() khi sự kiện không truyền.
// Tác vụ nền (bộ hẹn giờ) chạy ngoài ngữ cảnh → layNguCanh() = undefined → thiet_bi null như cũ.
// ============================================================
import { AsyncLocalStorage } from "node:async_hooks";

export interface NguCanhYeuCau {
  thiet_bi: string | null;
  /** id người đang đăng nhập — batBuocDangNhap/layNguoiDung điền khi biết */
  nguoi?: string | null;
}

// Một kho cho cả tiến trình (Next dev nạp lại module vẫn dùng chung)
type G = typeof globalThis & { __docflowNguCanh?: AsyncLocalStorage<NguCanhYeuCau> };
const g = globalThis as G;
const kho: AsyncLocalStorage<NguCanhYeuCau> = (g.__docflowNguCanh ??= new AsyncLocalStorage<NguCanhYeuCau>());

/** Chạy fn trong ngữ cảnh yêu cầu (mỗi lần gọi một bản sao riêng — yêu cầu chạy xen kẽ không lẫn nhau). */
export function chayVoiNguCanh<T>(nc: NguCanhYeuCau, fn: () => T): T {
  return kho.run({ thiet_bi: nc.thiet_bi || null, nguoi: nc.nguoi ?? null }, fn);
}

/** Ngữ cảnh của yêu cầu hiện tại; undefined nếu đang chạy ngoài yêu cầu (tác vụ nền, test). */
export function layNguCanh(): NguCanhYeuCau | undefined {
  return kho.getStore();
}

/** Ghi người vào ngữ cảnh hiện tại (nếu có). */
export function ganNguoiNguCanh(nguoi: string | null): void {
  const nc = kho.getStore();
  if (nc) nc.nguoi = nguoi;
}

/** Chạy fn NGOÀI mọi ngữ cảnh — dùng khi bật tác vụ nền từ trong một yêu cầu (timer không kế thừa thiết bị). */
export function ngoaiNguCanh<T>(fn: () => T): T {
  return kho.exit(fn);
}

/** Thiết bị (IP + user-agent) lấy thẳng từ header — cho route không bọc xuLy (cổng agent dùng khóa riêng). */
export function thietBiTuHeaders(h: Headers): string | null {
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "";
  const tb = `${ip} ${h.get("user-agent") ?? ""}`.trim().slice(0, 300);
  return tb || null;
}
