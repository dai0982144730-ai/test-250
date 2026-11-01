// ============================================================
// NGỮ CẢNH CHUỖI — khuôn sổ bản 2 (HOP-DONG-KET-NOI mục 7.1, chốt 26/09/2026)
//
// Một CHUỖI = một việc trọn vẹn: một câu chat, một lần mở trang/gọi API, một
// bản báo cáo sáng, một việc hẹn giờ. Mọi lượt hỏi–đáp sinh ra trong việc đó
// mang CÙNG `maChuoi` — kể cả lượt agent bên kia hỏi tiếp (mã đi qua header
// `x-sci-ma-chuoi`, bên nhận chạy phần việc của nó trong cùng chuỗi).
//
// Node giữ ngữ cảnh qua mọi `await` bằng AsyncLocalStorage — chỗ gọi không
// phải truyền tay mã chuỗi qua từng hàm.
//
// ⛔ Server-only (node:async_hooks). Tệp này GIỐNG HỆT ở 4 app Next, chỉ khác
//    đúng dòng `MA_AGENT_SO`.
// ============================================================

import { AsyncLocalStorage } from "node:async_hooks";
import { HEADER_KIEM_DINH, HEADER_MA_CHUOI, HEADER_MA_LUOT, maHopLe, sinhMa } from "./khuon-so";

/** Mã chuẩn (A04) của agent ghi sổ này — chỗ DUY NHẤT khác nhau giữa 4 bản */
export const MA_AGENT_SO = "main";

export interface NguCanhChuoi {
  maChuoi: string;
  /** Mã lượt đang chạy — header `x-sci-ma-luot` của lời gọi sang agent khác */
  maLuot?: string;
  /** Header `x-sci-kiem-dinh: 1` — mọi lượt trong chuỗi là kiểm định */
  kiemDinh?: boolean;
  /** Đang ở trong một việc gốc đã tự ghi dòng gốc — lồng thêm thì không ghi dòng gốc thứ hai */
  coGoc?: boolean;
  /** Đếm lượt đã ghi trong chuỗi theo bên được hỏi (dòng gốc mở trang tóm tắt bằng số này) */
  demLuot?: Map<string, number>;
}

// Giữ MỘT kho cho cả tiến trình — dev server nạp lại module thì vẫn dùng kho cũ
const g = globalThis as unknown as { __sciKhoChuoi?: AsyncLocalStorage<NguCanhChuoi> };
const kho: AsyncLocalStorage<NguCanhChuoi> = g.__sciKhoChuoi ?? (g.__sciKhoChuoi = new AsyncLocalStorage<NguCanhChuoi>());

export function nguCanhChuoi(): NguCanhChuoi | undefined {
  return kho.getStore();
}

export function maChuoiHienTai(): string | undefined {
  return kho.getStore()?.maChuoi;
}

/**
 * Chạy `fn` trong một chuỗi.
 *   · `maChuoi` hợp lệ và KHÁC chuỗi đang chạy → mở ngữ cảnh mới tinh với mã đó
 *   · `maChuoi` trống/không hợp lệ → ở lại chuỗi đang chạy; chưa có thì sinh mã mới
 * `them` ghi đè vài trường của ngữ cảnh (mã lượt, cờ kiểm định, cờ gốc…).
 */
export function chayTrongChuoi<T>(
  maChuoi: string | undefined,
  fn: () => T,
  them: Omit<NguCanhChuoi, "maChuoi"> = {},
): T {
  const cu = kho.getStore();
  if (maHopLe(maChuoi) && maChuoi !== cu?.maChuoi) {
    return kho.run({ ...them, maChuoi }, fn);
  }
  return kho.run({ ...cu, ...them, maChuoi: cu?.maChuoi ?? sinhMa(MA_AGENT_SO) }, fn);
}

/**
 * Header nội bộ gắn vào MỌI lời `fetch` sang agent khác: mã lượt + mã chuỗi
 * (+ cờ kiểm định). Ngoài chuỗi thì rỗng — bên nhận tự sinh mã.
 */
export function headerChuoi(): Record<string, string> {
  const c = kho.getStore();
  if (!c) return {};
  const h: Record<string, string> = { [HEADER_MA_CHUOI]: c.maChuoi };
  if (c.maLuot) h[HEADER_MA_LUOT] = c.maLuot;
  if (c.kiemDinh) h[HEADER_KIEM_DINH] = "1";
  return h;
}

/** Cổng MCP đọc ba header. Mã không hợp lệ (rác, quá dài) coi như không có */
export function docHeaderChuoi(req: { headers: Headers }): { maLuot?: string; maChuoi?: string; kiemDinh: boolean } {
  const luot = req.headers.get(HEADER_MA_LUOT)?.trim();
  const chuoi = req.headers.get(HEADER_MA_CHUOI)?.trim();
  return {
    maLuot: maHopLe(luot) ? luot : undefined,
    maChuoi: maHopLe(chuoi) ? chuoi : undefined,
    kiemDinh: (req.headers.get(HEADER_KIEM_DINH) ?? "").trim() === "1",
  };
}
