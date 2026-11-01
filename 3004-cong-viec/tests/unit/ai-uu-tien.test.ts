// Hàng chờ AI: lượt chat (người đang chờ) chen trước việc nền đang chờ — Mr. Đại chốt 02/10/2026 (lib/ai/uu-tien.ts).
// CLI là GIẢ LẬP (vi.mock spawn), không đụng Claude thật.
import { describe, it, expect, vi } from "vitest";
import type { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tam = fs.mkdtempSync(path.join(os.tmpdir(), "docflow-ai-uu-tien-"));
const bin = path.join(tam, "claude.exe");
fs.writeFileSync(bin, "gia");
process.env.DOCFLOW_AI_DATA = path.join(tam, "data");
process.env.ANTHROPIC_SUB_CLI_PATH = bin;

const gia = vi.hoisted(() => ({ thuTu: [] as string[] }));

vi.mock("node:child_process", async (goc) => {
  const g = (await goc()) as Record<string, unknown>;
  const { EventEmitter: EE } = await import("node:events");
  return {
    ...g,
    spawn: (_lenh: string, args: string[]) => {
      const con = new EE() as EventEmitter & Record<string, unknown>;
      const out = new EE() as EventEmitter & { setEncoding: () => void };
      const err = new EE() as EventEmitter & { setEncoding: () => void };
      out.setEncoding = () => {};
      err.setEncoding = () => {};
      let vao = args.join(" ");
      con.stdout = out;
      con.stderr = err;
      con.stdin = { on: () => {}, write: (s: string) => ((vao += String(s)), true), end: () => {} };
      con.kill = () => true;
      con.unref = () => {};
      setTimeout(() => {
        const ma = (vao.match(/LUOT-[A-Z0-9]+/) ?? ["?"])[0];
        gia.thuTu.push(ma);
        out.emit("data", JSON.stringify({ type: "result", is_error: false, result: ma }));
        con.emit("close", 0);
      }, 40);
      return con;
    },
  };
});

describe("hàng chờ AI có ưu tiên", () => {
  it("3 lượt nền đang chờ, 1 câu chat đến sau → chat chạy ngay sau lượt đang chạy dở", async () => {
    (globalThis as { __taiKhoanCauHinh?: unknown }).__taiKhoanCauHinh = {
      luc: Date.now() + 3600_000,
      ch: { hai_tai_khoan: false, dao_vai_24h: false, moi_phien_bat: false, moi_phien_gio: "07:00" },
    };
    const { runCliPrompt } = await import("@/lib/ai/providers");
    const { chayUuTien } = await import("@/lib/ai/uu-tien");
    const nen = ["LUOT-N1", "LUOT-N2", "LUOT-N3"].map((m) => runCliPrompt(m));
    await new Promise((r) => setTimeout(r, 5));
    const chat = chayUuTien(() => runCliPrompt("LUOT-CHAT"));
    expect(await Promise.all([...nen, chat])).toEqual(["LUOT-N1", "LUOT-N2", "LUOT-N3", "LUOT-CHAT"]);
    expect(gia.thuTu).toEqual(["LUOT-N1", "LUOT-CHAT", "LUOT-N2", "LUOT-N3"]);
  });

  it("4 lượt nền đầy suất vẫn nhận câu chat (việc nền không chiếm suất của chat); lượt nền thứ 5 bị từ chối", async () => {
    gia.thuTu = [];
    const { runCliPrompt } = await import("@/lib/ai/providers");
    const { chayUuTien } = await import("@/lib/ai/uu-tien");
    const nen = ["LUOT-A1", "LUOT-A2", "LUOT-A3", "LUOT-A4"].map((m) => runCliPrompt(m));
    await expect(runCliPrompt("LUOT-A5")).rejects.toThrow(/đang xử lý 4 yêu cầu AI khác/);
    const chat = chayUuTien(() => runCliPrompt("LUOT-CHAT2"));
    await Promise.all([...nen, chat]);
    expect(gia.thuTu[1]).toBe("LUOT-CHAT2");
  });
});
