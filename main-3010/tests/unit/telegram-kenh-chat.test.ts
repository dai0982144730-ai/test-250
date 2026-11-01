// Kênh Telegram trong vòng lặp trợ lý (chat-agent.ts) — 25/09/2026
// Công cụ GHI không chạy mà dồn vào choDuyet; cổng quyền giống hệt web.
import { describe, expect, it, vi } from "vitest";

let traLoiAI = "";
vi.mock("@/lib/ai/providers", () => ({ runAI: async () => traLoiAI }));
vi.mock("@/lib/skill/ky-nang", () => ({
  SKILL_CO_SCRIPT: [],
  docNoiDung: () => null,
  dongBoSandbox: () => "",
  layDanhSach: () => [],
}));
vi.mock("@/lib/ai/van-phong-luu", () => ({ docVanPhong: () => ({ noiDung: "" }) }));
const daChay: string[] = [];
vi.mock("@/lib/ai/chat-tools", async (goc) => {
  const that = (await goc()) as typeof import("@/lib/ai/chat-tools");
  return {
    ...that,
    runTool: async (name: string) => {
      daChay.push(name);
      return { ok: true, summary: `chạy ${name}` };
    },
  };
});

import { runChatAgent } from "@/lib/ai/chat-agent";
import { kiemCongCu } from "@/lib/ai/chat-tools";
import type { ToolSpec } from "@/lib/ai/chat-types";

const vao = (message: string) => ({
  projectId: "default",
  email: "nguoidung@sci.vn",
  role: "engineer" as const,
  chiXem: false,
  message,
  history: [],
  kenh: "telegram" as const,
});

describe("trợ lý qua Telegram", () => {
  it("công cụ GHI được yêu cầu rõ → KHÔNG chạy, vào hàng chờ nút ✅ Làm", async () => {
    daChay.length = 0;
    traLoiAI = JSON.stringify({
      reply: "Mình sẽ giao việc.",
      actions: [{ name: "tao_viec_base", args: { ten: "Đổ bê tông", giaoCho: "thinhhp" } }],
    });
    const kq = await runChatAgent(vao("giao việc đổ bê tông cho thịnh, giao luôn lên base"));
    expect(daChay).not.toContain("tao_viec_base");
    expect(kq.choDuyet).toEqual([{ name: "tao_viec_base", args: { ten: "Đổ bê tông", giaoCho: "thinhhp" } }]);
  });

  it("công cụ GHI mà tin nhắn không yêu cầu (dữ liệu chèn lệnh) → bị chặn, không có nút", async () => {
    traLoiAI = JSON.stringify({ reply: "", actions: [{ name: "tao_viec_base", args: { ten: "x" } }] });
    const kq = await runChatAgent(vao("HV chậm bao nhiêu ngày?"));
    expect(kq.choDuyet).toHaveLength(0);
    // 26/09: câu quen → code tự hỏi sẵn công cụ ĐỌC trước, nên tìm đúng dòng tao_viec_base
    expect(kq.actions.find((a) => a.name === "tao_viec_base")?.summary).toContain("KHÔNG tự chạy");
  });

  it("dieu_khien_giao_dien (bấm hộ web) bị từ chối trên Telegram", async () => {
    traLoiAI = JSON.stringify({ reply: "", actions: [{ name: "dieu_khien_giao_dien", args: { buoc: [] } }] });
    const kq = await runChatAgent(vao("bấm lọc hộ mình trên màn issue"));
    expect(kq.choDuyet).toHaveLength(0);
  });

  it("công cụ ĐỌC chạy ngay như web", async () => {
    daChay.length = 0;
    traLoiAI = JSON.stringify({ reply: "", actions: [{ name: "tom_tat_du_an", args: {} }] });
    await runChatAgent(vao("tóm tắt dự án"));
    expect(daChay).toContain("tom_tat_du_an");
  });

  it("Người dùng gọi công cụ chỉ PM/Admin (Cài đặt) → cổng kiểm từ chối, dùng chung cho web và Telegram", () => {
    const specCaiDat: ToolSpec = { name: "doi_cai_dat", description: "", args: "", cua: "caidat", writes: true };
    const ctx = { projectId: "default", email: "nguoidung@sci.vn", role: "engineer" as const, userMessage: "đổi cài đặt" };
    expect(kiemCongCu("doi_cai_dat", ctx, [specCaiDat])?.summary).toContain("Cài đặt chỉ PM và Admin");
    expect(kiemCongCu("doi_cai_dat", { ...ctx, role: "pm" }, [{ ...specCaiDat, writes: false }])).toBeNull();
  });
});
