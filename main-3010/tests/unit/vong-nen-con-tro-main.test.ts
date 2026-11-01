// G4 — VÒNG NỀN RIÊNG CỦA MAIN chạy mã mới nhất (Mr. Đại gật 18/10/2026, cách agent Tiến độ 17a9ac3): nhịp báo cáo sáng
// (06:30 dựng · 07:00 gửi · nhắc BC tuần · nháp BC tháng) và nhịp kéo sơ đồ tổ chức 30 phút. Giả "dev biên dịch lại" bằng
// vi.resetModules() rồi import lại: con trỏ sang hàm của bản mới, vẫn MỘT bộ hẹn giờ, bộ hẹn giờ gọi qua con trỏ.
// Không chạy việc thật: con trỏ bị thay bằng hàm giả trước khi đồng hồ giả chạy tới phút đầu.
// (Vòng nhận Telegram không cần: vòng nền chỉ gõ cửa route nội bộ — mọi logic nằm sau route, xem telegram-tro-ly/nhan.ts.)
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const g = globalThis as unknown as Record<string, unknown>;
const CO = ["__nhipBaoCaoSangDaBat", "__nhipBaoCaoSangKiem", "__nhipKeoSoDoDaBat", "__nhipKeoSoDoKiem"];

beforeEach(() => {
  vi.useFakeTimers();
  for (const k of CO) delete g[k];
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  for (const k of CO) delete g[k];
});

async function kiemVong(duong: string, conTro: string, batDau: (m: Record<string, unknown>) => void) {
  vi.resetModules();
  const ban1 = (await import(duong)) as Record<string, unknown>;
  const ct1 = g[conTro];
  expect(typeof ct1).toBe("function");
  batDau(ban1);
  expect(vi.getTimerCount()).toBe(1);

  vi.resetModules(); // giả dev biên dịch lại + có lượt mở trang
  const ban2 = (await import(duong)) as Record<string, unknown>;
  expect(g[conTro]).not.toBe(ct1);
  batDau(ban2); // đã bật — không thêm bộ hẹn giờ thứ hai
  expect(vi.getTimerCount()).toBe(1);

  const gia = vi.fn();
  g[conTro] = gia;
  vi.advanceTimersByTime(60_000);
  expect(gia).toHaveBeenCalledTimes(1);
}

// Mỗi ca nạp lại CẢ cây mô-đun hai lần (vi.resetModules): đo 27/10 chạy riêng mất 3,5 giây, chạy cùng
// `--maxWorkers=2` thì vượt hạn 5 giây mặc định rồi đỏ oan. Cho 30 giây — chậm là do biên dịch, không
// phải do vòng nền treo.
const HAN = 30_000;

describe("vòng nền của Main gọi qua con trỏ — nạp lại mô-đun là sang mã mới", () => {
  it(
    "nhịp báo cáo sáng (bao-cao-sang/dung.ts)",
    async () => {
      await kiemVong("@/lib/bao-cao-sang/dung", "__nhipBaoCaoSangKiem", (m) => (m.khoiDongNhipBaoCaoSang as () => void)());
    },
    HAN,
  );

  it(
    "nhịp kéo sơ đồ tổ chức (so-do-keo.ts)",
    async () => {
      await kiemVong("@/lib/so-do-keo", "__nhipKeoSoDoKiem", (m) => (m.khoiDongNhipKeoSoDo as () => void)());
    },
    HAN,
  );
});
