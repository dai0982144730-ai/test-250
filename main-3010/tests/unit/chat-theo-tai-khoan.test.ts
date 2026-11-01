// Trợ lý chat lưu lịch sử THEO TÀI KHOẢN (Mr. Đại chốt 04/10/2026): mỗi người chỉ thấy, mở,
// hỏi tiếp, đổi tên, xoá phiên CHÍNH MÌNH — kể cả Admin cũng không xem phiên người khác.
// Phiên người khác trả 404 như không có. CÙNG MỘT FILE ở Main · Tiến độ · Hợp đồng.
// Chạy trên bản sao dữ liệu tạm; không gọi AI thật (runChatAgent giả).
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Role } from "@/lib/quyen";

let email = "a@sci.vn";
let loai: Role = "engineer";
let daGoiAI = 0;

vi.mock("@/lib/route-auth", async (goc) => {
  const { NextResponse } = await import("next/server");
  const q = await import("@/lib/quyen");
  return {
    ...((await goc()) as object),
    // xét đúng cửa như bản thật (kèm câu báo riêng nếu route truyền)
    requireRole: async (c: string, cau?: string) =>
      q.duocQuaCua(loai, c as never)
        ? { ok: true, session: { email, role: loai, name: "thu" } }
        : { ok: false, response: NextResponse.json({ ok: false, message: cau || "chặn" }, { status: 403 }) },
  };
});
vi.mock("@/lib/projects", async (goc) => ({
  ...((await goc()) as object),
  canAccessProjectByEmail: () => true,
}));
vi.mock("@/lib/ai/providers", async (goc) => ({
  ...((await goc()) as object),
  getAIConfig: () => ({}),
  isAIConfigured: () => true,
}));
vi.mock("@/lib/ai/chat-agent", () => ({
  runChatAgent: async () => {
    daGoiAI++;
    return { reply: "ok", actions: [], uiActions: [], choDuyet: [] };
  },
}));

import { DELETE as xoaPhien, GET as dsPhien, PATCH as doiTen, POST as taoPhien } from "@/app/api/ai/chat/sessions/route";
import { GET as docTin } from "@/app/api/ai/chat/messages/route";
import { POST as hoi } from "@/app/api/ai/chat/route";
import { createSession, doiChuPhienChat, getSession } from "@/lib/ai/chat-store";
import { resolveProjectId } from "@/lib/projects";
import { LY_DO_TRO_LY } from "@/lib/quyen";

const GOC = "http://localhost/api/ai/chat";

function la(e: string, r: Role = "engineer") {
  email = e;
  loai = r;
}

async function json(res: Response) {
  return (await res.json()) as { ok: boolean; message?: string; sessions?: { id: string }[]; session?: { id: string } };
}

async function moPhienMoi(): Promise<string> {
  const r = await json(await taoPhien(new Request(`${GOC}/sessions`, { method: "POST", body: JSON.stringify({ title: "phiên thử" }) })));
  expect(r.ok).toBe(true);
  return r.session!.id;
}

async function idCacPhien(): Promise<string[]> {
  return ((await json(await dsPhien(new Request(`${GOC}/sessions`)))).sessions ?? []).map((s) => s.id);
}

beforeEach(() => {
  daGoiAI = 0;
});

describe("lịch sử chat theo tài khoản", () => {
  it("người khác — kể cả Admin — không thấy phiên của mình trong danh sách", async () => {
    la("a@sci.vn");
    const id = await moPhienMoi();
    expect(await idCacPhien()).toContain(id);
    la("b@sci.vn", "admin");
    expect(await idCacPhien()).not.toContain(id);
    la("A@SCI.VN"); // email khác hoa thường vẫn là một người
    expect(await idCacPhien()).toContain(id);
  });

  it("người khác mở tin nhắn, hỏi tiếp, đổi tên → 404 như không có; AI không bị gọi", async () => {
    la("a@sci.vn");
    const id = await moPhienMoi();
    la("b@sci.vn", "pm");
    const mo = await docTin(new Request(`${GOC}/messages?id=${id}`));
    expect(mo.status).toBe(404);
    expect((await json(mo)).message).toBe("Không tìm thấy phiên chat.");
    const hoiTiep = await hoi(new Request(GOC, { method: "POST", body: JSON.stringify({ sessionId: id, message: "đọc giúp phiên này" }) }));
    expect(hoiTiep.status).toBe(404);
    expect(daGoiAI).toBe(0);
    const doi = await doiTen(new Request(`${GOC}/sessions`, { method: "PATCH", body: JSON.stringify({ id, title: "đổi trộm" }) }));
    expect(doi.status).toBe(404);
    const s = getSession(resolveProjectId(null), id)!;
    expect(s.title).toBe("phiên thử");
    expect(s.messages).toHaveLength(0);
  });

  it("Admin không xoá được phiên người khác; chính chủ xoá được", async () => {
    la("a@sci.vn");
    const id = await moPhienMoi();
    la("b@sci.vn", "admin");
    expect((await xoaPhien(new Request(`${GOC}/sessions?id=${id}`, { method: "DELETE" }))).status).toBe(404);
    expect(getSession(resolveProjectId(null), id)).not.toBeNull();
    la("a@sci.vn");
    expect((await xoaPhien(new Request(`${GOC}/sessions?id=${id}`, { method: "DELETE" }))).status).toBe(200);
    expect(getSession(resolveProjectId(null), id)).toBeNull();
  });

  it("chính chủ mở, hỏi tiếp, đổi tên bình thường", async () => {
    la("a@sci.vn");
    const id = await moPhienMoi();
    expect((await docTin(new Request(`${GOC}/messages?id=${id}`))).status).toBe(200);
    const hoiTiep = await hoi(new Request(GOC, { method: "POST", body: JSON.stringify({ sessionId: id, message: "dự án chậm bao nhiêu ngày" }) }));
    expect(hoiTiep.status).toBe(200);
    expect(daGoiAI).toBe(1);
    const doi = await doiTen(new Request(`${GOC}/sessions`, { method: "PATCH", body: JSON.stringify({ id, title: "tên mới" }) }));
    expect(doi.status).toBe(200);
    expect(getSession(resolveProjectId(null), id)!.messages.length).toBeGreaterThan(0);
  });

  it("Người xem KHÔNG dùng trợ lý chat ở mọi cửa (Mr. Đại chốt 04/10 — tốn chi phí công ty), AI không bị gọi", async () => {
    la("xem@sci.vn", "viewer");
    for (const r of [
      await dsPhien(new Request(`${GOC}/sessions`)),
      await taoPhien(new Request(`${GOC}/sessions`, { method: "POST", body: "{}" })),
      await docTin(new Request(`${GOC}/messages?id=s-abc-1234`)),
      await hoi(new Request(GOC, { method: "POST", body: JSON.stringify({ message: "dự án chậm bao nhiêu ngày" }) })),
    ]) {
      expect(r.status).toBe(403);
      expect((await json(r)).message).toBe(LY_DO_TRO_LY);
    }
    expect(daGoiAI).toBe(0);
  });

  it("đổi email tài khoản: phiên đứng tên email cũ chuyển sang email mới, chủ mới thấy, chạy lại không đổi thêm", async () => {
    const s = createSession(resolveProjectId(null), "cu-doi@sci.vn", "phiên trước khi đổi email");
    expect(doiChuPhienChat({ "CU-DOI@sci.vn": "moi-doi@sci.vn" })).toBe(1);
    expect(getSession(resolveProjectId(null), s.id)!.createdBy).toBe("moi-doi@sci.vn");
    expect(doiChuPhienChat({ "cu-doi@sci.vn": "moi-doi@sci.vn" })).toBe(0);
    la("moi-doi@sci.vn");
    expect(await idCacPhien()).toContain(s.id);
  });
});
