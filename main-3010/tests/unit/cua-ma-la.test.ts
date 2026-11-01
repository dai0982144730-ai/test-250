// CỬA MÃ LẠ Ở CỔNG MAIN (Mr. Đại chốt sáng 04/10/2026): xử như agent con — nhãn bài đo có khoá nội bộ thì cho qua kèm cảnh báo,
// không khoá thì chặn; agent của hệ / đã khai Danh bạ thì đi tiếp ma trận (null).
import { describe, it, expect } from "vitest";
import type { KhaiAgent } from "@/lib/danh-ba-agent";
import { xetMaLa } from "@/lib/mcp/cua-ma-la";

const DB = [{ ma: "nghiemthu", ten: "Agent Nghiệm thu", dangBat: false }] as unknown as KhaiAgent[];

describe("cửa mã lạ ở cổng Main", () => {
  it("agent của hệ (kể cả viết khác: tien-do) và mã đã khai Danh bạ → null, xét ma trận như cũ", () => {
    for (const ma of ["tiendo", "tien-do", "base", "quansat", "Main Agent", "nghiemthu"]) {
      expect(xetMaLa(ma, false, DB)).toBeNull();
      expect(xetMaLa(ma, true, DB)).toBeNull();
    }
  });

  it("mã lạ CÓ khoá nội bộ → cho qua, cảnh báo nói rõ mã đã gửi", () => {
    const kq = xetMaLa("kiem-doc-lap", true, DB);
    expect(kq).toMatchObject({ duoc: true });
    expect(kq && kq.duoc ? kq.canhBao : "").toContain('"kiem-doc-lap"');
  });

  it("mã lạ KHÔNG khoá → chặn, câu tiếng Việt dặn gửi khoá", () => {
    const kq = xetMaLa("do-kiem", false, DB);
    expect(kq).toMatchObject({ duoc: false });
    expect(kq && !kq.duoc ? kq.lyDo : "").toMatch(/bị chặn ở màn Ai được gọi ai.*khoá nội bộ \(header x-sci-noi-bo\)/);
  });
});
