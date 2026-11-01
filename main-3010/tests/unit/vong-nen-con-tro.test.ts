// G4 — VÒNG NỀN CHẠY MÃ MỚI NHẤT (Mr. Đại gật 18/10/2026, cách agent Tiến độ 17a9ac3 «hẹn giờ gọi qua con trỏ»).
// Lỗi gốc: `setInterval` giữ hàm của LẦN NẠP ĐẦU — 17/10 «quét tối» chạy mã cũ 12 giờ, đè mất bản 🤖 34 bộ. Nay mỗi vòng nền gọi
// qua một con trỏ trên globalThis mà thân mô-đun gán lại mỗi lần nạp. Bài này giả "dev biên dịch lại" bằng vi.resetModules() rồi
// import lại: con trỏ phải sang hàm của bản mới, vẫn chỉ MỘT bộ hẹn giờ, và bộ hẹn giờ gọi qua con trỏ.
// CÙNG MỘT FILE ở Main · Tiến độ · Hợp đồng (nhịp dọn sổ + mồi phiên tài khoản Claude). Không chạy việc thật: con trỏ bị thay
// bằng hàm giả trước khi đồng hồ giả chạy tới phút đầu.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type MoiPhien = { timer?: unknown; kiem?: () => Promise<void> };
const g = globalThis as unknown as { __donSoNhipDaBat?: boolean; __donSoKiem?: () => void; __moiPhien?: MoiPhien };

beforeEach(() => {
  vi.useFakeTimers();
  delete g.__donSoNhipDaBat;
  delete g.__donSoKiem;
  delete g.__moiPhien;
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  delete g.__donSoNhipDaBat;
  delete g.__moiPhien;
});

describe("vòng nền gọi qua con trỏ — nạp lại mô-đun là sang mã mới", () => {
  it("nhịp dọn sổ hỏi–đáp (nhat-ky/don-so.ts)", async () => {
    vi.resetModules();
    const ban1 = await import("@/lib/nhat-ky/don-so");
    const conTro1 = g.__donSoKiem;
    expect(typeof conTro1).toBe("function");
    ban1.khoiDongDonSo();
    expect(vi.getTimerCount()).toBe(1);

    vi.resetModules(); // giả dev biên dịch lại + có lượt mở trang
    const ban2 = await import("@/lib/nhat-ky/don-so");
    expect(g.__donSoKiem).not.toBe(conTro1);
    ban2.khoiDongDonSo(); // đã bật — không thêm bộ hẹn giờ thứ hai
    expect(vi.getTimerCount()).toBe(1);

    const gia = vi.fn();
    g.__donSoKiem = gia;
    vi.advanceTimersByTime(60_000);
    expect(gia).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60_000);
    expect(gia).toHaveBeenCalledTimes(2);
  });

  it("nhịp mồi phiên tài khoản Claude (ai/tai-khoan-claude.ts)", async () => {
    vi.resetModules();
    const tk = await import("@/lib/ai/tai-khoan-claude");
    const gui1 = vi.fn(async () => undefined);
    tk.batMoiPhien(gui1);
    const kiem1 = g.__moiPhien?.kiem;
    const hen1 = g.__moiPhien?.timer;
    expect(typeof kiem1).toBe("function");
    expect(vi.getTimerCount()).toBe(1);

    tk.batMoiPhien(vi.fn(async () => undefined)); // lượt AI sau (hoặc bản mã mới) gọi lại
    expect(g.__moiPhien?.kiem).not.toBe(kiem1);
    expect(g.__moiPhien?.timer).toBe(hen1);
    expect(vi.getTimerCount()).toBe(1);

    const gia = vi.fn(async () => undefined);
    g.__moiPhien!.kiem = gia;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(gia).toHaveBeenCalledTimes(1);
    expect(gui1).not.toHaveBeenCalled();
  });
});
