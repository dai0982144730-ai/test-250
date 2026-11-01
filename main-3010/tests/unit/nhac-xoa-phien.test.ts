// Máy KHÔNG tự xoá phiên chat khi quá 100 phiên — chỉ nhắc ở danh sách phiên (Mr. Đại chốt 18/10/2026, thay chốt cũ
// "100 phiên/người, xoá phiên cũ nhất"). CÙNG MỘT FILE ở Main · Tiến độ · Hợp đồng. Chạy trên bản sao dữ liệu tạm.
import { describe, expect, it } from "vitest";
import { createSession, getSession, listSessions } from "@/lib/ai/chat-store";
import { NGUONG_NHAC_XOA_PHIEN, cauNhacXoaPhien } from "@/lib/ai/nhac-xoa-phien";
import { resolveProjectId } from "@/lib/projects";

describe("quá 100 phiên chat: nhắc, không tự xoá", () => {
  it("dòng nhắc chỉ hiện khi QUÁ 100 phiên, số theo chuẩn Việt", () => {
    expect(NGUONG_NHAC_XOA_PHIEN).toBe(100);
    expect(cauNhacXoaPhien(0)).toBeNull();
    expect(cauNhacXoaPhien(100)).toBeNull();
    expect(cauNhacXoaPhien(101)).toBe("Anh/chị đang có 101 phiên trò chuyện — xoá bớt phiên cũ cho gọn");
    expect(cauNhacXoaPhien(1234)).toBe("Anh/chị đang có 1.234 phiên trò chuyện — xoá bớt phiên cũ cho gọn");
    expect(cauNhacXoaPhien(Number.NaN)).toBeNull();
  });

  it("tạo phiên thứ 101, 102 của một người — phiên cũ nhất vẫn còn, danh sách đủ 102", () => {
    const duAn = resolveProjectId(null);
    const email = "nhieu-phien@sci.vn";
    const dau = createSession(duAn, email, "phiên đầu tiên");
    for (let i = 2; i <= 102; i++) createSession(duAn, email, `phiên ${i}`);
    const ds = listSessions(duAn, email);
    expect(ds).toHaveLength(102);
    expect(getSession(duAn, dau.id)?.title).toBe("phiên đầu tiên");
    expect(cauNhacXoaPhien(ds.length)).toContain("102 phiên");
  });
});
