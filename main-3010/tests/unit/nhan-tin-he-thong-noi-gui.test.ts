// Kiểm lại 26/10 tối (MG-1): bài `nhan-tin-he-thong.test.ts` chỉ giữ CÂU nhãn và hàm ghép — xoá `ganNhanHeThong(...)` ở đúng
// 3 nơi Main gửi tin máy (issue đỏ · nhắc báo cáo tuần · nháp báo cáo tháng) thì cả bộ vẫn xanh. Bài này chạy thật 3 nơi đó với
// Telegram giả và kiểm tin đi ra đứng đầu bằng nhãn.
import { beforeEach, describe, expect, it, vi } from "vitest";

const daGui: string[] = [];
vi.mock("@/lib/bao-cao-sang/telegram", async (goc) => ({
  ...(await goc<typeof import("@/lib/bao-cao-sang/telegram")>()),
  guiTelegram: async (chu: string) => {
    daGui.push(chu);
    return { ok: true, chuaCauHinh: false, thongDiep: "đã gửi (giả)", luc: new Date().toISOString() };
  },
}));
let hoiDuoc = true;
vi.mock("@/lib/nguon/hoi-agent", async (goc) => ({
  ...(await goc<typeof import("@/lib/nguon/hoi-agent")>()),
  hoiAgent: async () => (hoiDuoc ? { ok: true, thong_diep: "có nháp" } : { ok: false, thong_diep: "Agent tiến độ không trả lời" }),
}));

import { NHAN_TIN_HE_THONG } from "@/lib/bao-cao-sang/telegram";
import { chayNhip, nhanNgay } from "@/lib/bao-cao-sang/dung";

const dauNhan = (chu: string | undefined) => (chu ?? "").split("\n")[0];

beforeEach(() => {
  daGui.length = 0;
  hoiDuoc = true;
});

describe("nhãn «🛠 TIN HỆ THỐNG» ở 3 nơi Main tự gửi Telegram", () => {
  it("issue đỏ nhắn ngay (nhanNgay)", async () => {
    await nhanNgay("Móng T5 chậm 12 ngày so với Baseline", "BC ngày 2026-10-26 — Nhà thầu thử");
    expect(daGui).toHaveLength(1);
    expect(dauNhan(daGui[0])).toBe(NHAN_TIN_HE_THONG);
    expect(daGui[0]).toContain("🔴 Issue đỏ");
  });
  for (const hoi of [true, false]) {
    it(`nhắc báo cáo tuần (${hoi ? "có nháp" : "không lấy được nháp"})`, async () => {
      hoiDuoc = hoi;
      await chayNhip("nhac-bc-tuan", "bài kiểm");
      expect(daGui).toHaveLength(1);
      expect(dauNhan(daGui[0])).toBe(NHAN_TIN_HE_THONG);
      expect(daGui[0]).toContain("🟡 Nhắc");
    });
    it(`nháp báo cáo tháng (${hoi ? "có dữ liệu" : "chưa dựng được"})`, async () => {
      hoiDuoc = hoi;
      await chayNhip("nhap-bc-thang", "bài kiểm");
      expect(daGui).toHaveLength(1);
      expect(dauNhan(daGui[0])).toBe(NHAN_TIN_HE_THONG);
      expect(daGui[0]).toContain("📄");
    });
  }
});
