// Ai thấy dòng nguyên nhân kỹ thuật khi agent không thưa (Mr. Đại chốt 26/10/2026)
import { describe, expect, it } from "vitest";
import { xemNguyenNhanKyThuat } from "@/lib/ai/chat-agent";

describe("xemNguyenNhanKyThuat", () => {
  it("quản trị trên web: có; quản trị trên Telegram: không", () => {
    expect(xemNguyenNhanKyThuat("web", "admin", "qt@scigroup.vn")).toBe(true);
    expect(xemNguyenNhanKyThuat("telegram", "admin", "qt@scigroup.vn")).toBe(false);
  });
  it("anh Nguyễn Chính Đại: mọi kênh", () => {
    expect(xemNguyenNhanKyThuat("telegram", "pm", "DaiNC@scigroup.vn")).toBe(true);
    expect(xemNguyenNhanKyThuat("web", "pm", "dainc@scigroup.vn")).toBe(true);
  });
  it("người dùng thường: không", () => {
    expect(xemNguyenNhanKyThuat("web", "engineer", "nv@scigroup.vn")).toBe(false);
  });
});

import { agentTheoMa } from "@/lib/ai/chat-tools";
describe("tra_ma chọn agent theo dạng mã (kiểm độc lập đợt 1 NC-01…04)", () => {
  it("đúng agent", () => {
    const ca: Array<[string, string]> = [
      ["CV-2026-0130", "base"], ["HD-548", "hopdong"], ["hd-548", "hopdong"], ["HĐ-548", "hopdong"], ["PG-548.02", "hopdong"],
      ["6.1.4", "tiendo"], ["A.1.1-01", "tiendo"], ["TP-HV-03", "tiendo"], ["P01", "tiendo"], ["ISS-PL-0115", "phaply"],
      ["K-09", "phaply"], ["HV-K-09", "phaply"], ["1315/QĐ-UBND", "phaply"], ["#58", "phaply"],
    ];
    for (const [ma, ag] of ca) expect([ma, agentTheoMa(ma)]).toEqual([ma, ag]);
  });
});
