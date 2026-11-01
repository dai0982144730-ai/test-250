// G4 — nhịp MỒI PHIÊN tài khoản Claude gọi qua con trỏ (Mr. Đại gật 18/10/2026, cách agent Tiến độ 17a9ac3): `setInterval` giữ
// hàm của lần bật đầu; mỗi lần gọi lại batMoiPhien thì con trỏ trỏ sang mã + hàm gửi mới nhất, bộ hẹn giờ vẫn chỉ một.
// Không chạy việc thật: con trỏ bị thay bằng hàm giả trước khi đồng hồ giả chạy tới phút đầu.
import { afterEach, describe, expect, it, vi } from "vitest";

type MoiPhien = { timer?: unknown; kiem?: () => Promise<void> };
const g = globalThis as unknown as { __moiPhien?: MoiPhien };
/** Đọc lại mỗi lần (không để TypeScript thu hẹp kiểu sau `delete`) */
const mp = (): MoiPhien | undefined => g.__moiPhien;

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  delete g.__moiPhien;
});

describe("mồi phiên gọi qua con trỏ", () => {
  it("gọi lại batMoiPhien: con trỏ đổi, vẫn MỘT bộ hẹn giờ, nhịp gọi qua con trỏ", async () => {
    vi.useFakeTimers();
    delete g.__moiPhien;
    const tk = await import("@/lib/ai/tai-khoan-claude");
    const gui1 = vi.fn(async () => undefined);
    tk.batMoiPhien(gui1);
    const kiem1 = mp()?.kiem;
    const hen1 = mp()?.timer;
    expect(typeof kiem1).toBe("function");
    expect(vi.getTimerCount()).toBe(1);
    tk.batMoiPhien(vi.fn(async () => undefined));
    expect(mp()?.kiem).not.toBe(kiem1);
    expect(mp()?.timer).toBe(hen1);
    expect(vi.getTimerCount()).toBe(1);
    const gia = vi.fn(async () => undefined);
    mp()!.kiem = gia;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(gia).toHaveBeenCalledTimes(1);
    expect(gui1).not.toHaveBeenCalled();
  });
});
