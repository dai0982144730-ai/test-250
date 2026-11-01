// Lịch sử cả ngày + tự tóm cho trợ lý Telegram (Mr. Đại chốt 26/10/2026)
import { describe, expect, it } from "vitest";
import { GIU_TIN, chonLichSu, promptTomTat } from "@/lib/telegram-tro-ly/lich-su-ngay";
import type { ChatMessage } from "@/lib/ai/chat-types";

const tin = (n: number, doDai: number): ChatMessage[] =>
  Array.from({ length: n }, (_, i) => ({ id: `m${i}`, role: i % 2 ? "assistant" : "user", content: "x".repeat(doDai), at: "2026-10-26T01:00:00Z" }) as ChatMessage);

describe("chonLichSu", () => {
  it("dưới trần: đưa nguyên văn mọi tin, không tóm", () => {
    const r = chonLichSu(tin(40, 900), null); // 36.000 ký tự
    expect(r.canTom).toBeNull();
    expect(r.lichSu).toHaveLength(40);
  });
  it("quá trần: đòi tóm phần cũ, giữ GIU_TIN tin cuối", () => {
    const r = chonLichSu(tin(100, 900), null); // 90.000 ký tự
    expect(r.canTom?.denTinMoi).toBe(100 - GIU_TIN);
    expect(r.canTom?.tin).toHaveLength(100 - GIU_TIN);
  });
  it("đã có bản tóm: bản tóm đứng đầu + tin sau mốc tóm", () => {
    const r = chonLichSu(tin(100, 900), { denTin: 80, chu: "tóm" });
    expect(r.canTom).toBeNull();
    expect(r.lichSu).toHaveLength(21);
    expect(r.lichSu[0]!.content).toContain("tóm");
  });
  it("bản tóm cũ + phần mới lại quá trần: tóm tiếp, mang bản tóm cũ", () => {
    const r = chonLichSu(tin(200, 900), { denTin: 80, chu: "tóm cũ" });
    expect(r.canTom?.tomCu).toBe("tóm cũ");
    expect(r.canTom?.tin).toHaveLength(200 - GIU_TIN - 80);
  });
  it("prompt tóm có tiếng Việt và cấm bịa", () => {
    expect(promptTomTat("", tin(2, 5))).toContain("Không thêm điều không có");
  });
});
