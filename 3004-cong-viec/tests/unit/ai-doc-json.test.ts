// Mô hình viết xuống dòng thật trong "reply" (bảng nhiều dòng) → trước đây JSON hỏng, cả khối {"reply":…} hiện cho người dùng
// (test đêm 01/10 câu 12, Sonnet 5).
import { describe, it, expect } from "vitest";
import { parseModelReply, thoatTrongChuoi } from "@/lib/ai/chat-agent";

describe("parseModelReply — JSON có xuống dòng thật trong chuỗi", () => {
  it("vẫn tách được reply + actions", () => {
    const raw = '{"reply":"Có 2 việc:\n| Mã | Tên |\n|---|---|\n| CV-2026-0001 | \tGPMB |","actions":[{"name":"socai.chi_tiet_viec","args":{"ma_viec":"CV-2026-0001"}}]}';
    expect(() => JSON.parse(raw)).toThrow();
    const kq = parseModelReply(raw);
    expect(kq?.reply).toBe("Có 2 việc:\n| Mã | Tên |\n|---|---|\n| CV-2026-0001 | \tGPMB |");
    expect(kq?.actions).toEqual([{ name: "socai.chi_tiet_viec", args: { ma_viec: "CV-2026-0001" } }]);
  });
  it("xuống dòng NGOÀI chuỗi giữ nguyên; dấu \\\" trong chuỗi không làm lệch", () => {
    expect(thoatTrongChuoi('{\n "a": "x\ny \\" z\n"\n}')).toBe('{\n "a": "x\\ny \\" z\\n"\n}');
  });
});
