// Máy KHÔNG tự xoá phiên chat khi quá 100 phiên — chỉ nhắc ở danh sách phiên (Mr. Đại chốt 18/10/2026, thay chốt cũ
// "100 phiên/người, xoá phiên cũ nhất"). Phiên lưu trong thư mục tạm (DOCFLOW_AI_DATA) — không đụng data/ thật.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { createSession, getSession, listSessions } from "@/lib/ai/chat-store";
import { NGUONG_NHAC_XOA_PHIEN, cauNhacXoaPhien } from "@/lib/ai/nhac-xoa-phien";

const tam = fs.mkdtempSync(path.join(os.tmpdir(), "docflow-nhac-phien-"));
process.env.DOCFLOW_AI_DATA = tam;

describe("quá 100 phiên chat: nhắc, không tự xoá", () => {
  afterAll(() => fs.rmSync(tam, { recursive: true, force: true }));

  it("dòng nhắc chỉ hiện khi QUÁ 100 phiên, số theo chuẩn Việt", () => {
    expect(NGUONG_NHAC_XOA_PHIEN).toBe(100);
    expect(cauNhacXoaPhien(100)).toBeNull();
    expect(cauNhacXoaPhien(101)).toBe("Anh/chị đang có 101 phiên trò chuyện — xoá bớt phiên cũ cho gọn");
    expect(cauNhacXoaPhien(1234)).toBe("Anh/chị đang có 1.234 phiên trò chuyện — xoá bớt phiên cũ cho gọn");
  });

  it("tạo phiên thứ 101, 102 của một người — phiên cũ nhất vẫn còn, danh sách đủ 102", () => {
    const nguoi = "nhieu-phien@scigroup.vn";
    const dau = createSession(nguoi, nguoi, "phiên đầu tiên");
    for (let i = 2; i <= 102; i++) createSession(nguoi, nguoi, `phiên ${i}`);
    const ds = listSessions(nguoi);
    expect(ds).toHaveLength(102);
    expect(getSession(nguoi, dau.id)?.title).toBe("phiên đầu tiên");
  });
});
