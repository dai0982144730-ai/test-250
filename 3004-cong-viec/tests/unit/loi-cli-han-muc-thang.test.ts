// Câu lỗi Claude "hết hạn mức của tháng" (đo 06/10/2026 — câu tiếng Anh lọt ra màn Cây việc) phải ra tiếng Việt và được nhận là
// "hết lượt" để máy tự chuyển sang tài khoản dự phòng. Thuần, không gọi AI.
import { describe, it, expect } from "vitest";
import { dichLoiCli } from "@/lib/ai/loi-cli";
import { laLoiHetLuot } from "@/lib/ai/tai-khoan-claude";

const CAU = "You've hit your monthly spend limit · raise it at claude.ai/settings/usage?from=cc";

describe("lỗi hết hạn mức tháng của Claude", () => {
  it("dịch sang tiếng Việt, không còn chữ tiếng Anh", () => {
    const vi = dichLoiCli(CAU);
    expect(vi).toContain("hết hạn mức của tháng");
    expect(vi).not.toMatch(/spend limit|monthly/i);
  });
  it("câu gốc lẫn câu đã dịch đều được nhận là hết lượt (để chuyển tài khoản)", () => {
    expect(laLoiHetLuot(CAU)).toBe(true);
    expect(laLoiHetLuot(dichLoiCli(CAU)!)).toBe(true);
  });
  it("lỗi chu kỳ 5 giờ vẫn dịch như cũ", () => {
    expect(dichLoiCli("Claude AI usage limit reached|1759380000")).toContain("hết lượt");
  });
});
