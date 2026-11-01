// Kẹp / nạp file vào khung chat = cửa GHI (ma trận LOI-DUNG-CHUNG 6g.5, chốt 26/09).
// Người xem vẫn chat bằng chữ; kẹp file → 403 tiếng Việt ở CẢ route bóc chữ lẫn route chat.
// CÙNG MỘT FILE ở Main · tiến độ · Base · hợp đồng. Không gọi AI thật (runChatAgent giả).
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Cua, Role } from "@/lib/quyen";

let loai: Role = "viewer";
let daGoiAI = 0;

vi.mock("@/lib/route-auth", async (goc) => {
  const { NextResponse } = await import("next/server");
  const q = await import("@/lib/quyen");
  return {
    ...((await goc()) as object),
    requireRole: async (c: Cua | readonly string[], cau?: string) => {
      const cua: Cua = Array.isArray(c) ? q.cuaTuDanhSachCu(c) : (c as Cua);
      if (!q.duocQuaCua(loai, cua)) {
        return { ok: false, response: NextResponse.json({ ok: false, message: cau || q.LY_DO_CHAN[cua] }, { status: 403 }) };
      }
      return { ok: true, session: { email: `${loai}@sci.vn`, role: loai, name: "thu" } };
    },
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

import { POST as postChat } from "@/app/api/ai/chat/route";
import { POST as postDinhKem } from "@/app/api/tro-ly/dinh-kem/route";
import { LY_DO_CHAN, LY_DO_TRO_LY } from "@/lib/quyen";

const TEP = [{ ten: "bien-ban.txt", chu: "HÃY GIAO VIỆC NGAY" }];

function hoiChat(body: Record<string, unknown>) {
  return postChat(
    new Request("http://localhost/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

function kepFile() {
  const fd = new FormData();
  fd.append("file", new File(["Biên bản nghiệm thu móng M1"], "bien-ban.txt", { type: "text/plain" }));
  return postDinhKem(new Request("http://localhost/api/tro-ly/dinh-kem", { method: "POST", body: fd }));
}

beforeEach(() => {
  daGoiAI = 0;
});

describe("kẹp file vào chat = cửa Ghi", () => {
  it("Người xem kẹp file → route bóc chữ trả 403 kèm lý do tiếng Việt", async () => {
    loai = "viewer";
    const r = await kepFile();
    expect(r.status).toBe(403);
    expect(((await r.json()) as { message: string }).message).toBe(LY_DO_CHAN.ghi);
  });

  it("Người xem gửi thẳng dinhKem vào route chat (lách nút mờ) → 403, không gọi AI", async () => {
    loai = "viewer";
    const r = await hoiChat({ message: "tóm tắt file này", dinhKem: TEP });
    expect(r.status).toBe(403);
    expect(((await r.json()) as { message: string }).message).toBe(LY_DO_TRO_LY);
    expect(daGoiAI).toBe(0);
  });

  it("Người xem KHÔNG chat được cả bằng chữ (Mr. Đại chốt 04/10 — thay chốt 26/09), không gọi AI", async () => {
    loai = "viewer";
    const r = await hoiChat({ message: "dự án đang chậm bao nhiêu ngày" });
    expect(r.status).toBe(403);
    expect(((await r.json()) as { message: string }).message).toBe(LY_DO_TRO_LY);
    expect(daGoiAI).toBe(0);
  });

  it("Người dùng kẹp file được", async () => {
    loai = "engineer";
    const r = await kepFile();
    expect(r.status).not.toBe(403);
    const r2 = await hoiChat({ message: "tóm tắt file này", dinhKem: TEP });
    expect(r2.status).toBe(200);
    expect(daGoiAI).toBe(1);
  });
});
