// Test KHÔNG BAO GIỜ gọi Claude CLI thật (04/10/2026: giả lập thiếu runAIGan → 6 bài test gọi thật, Sonnet 5, ~115 nghìn token).
// vitest.config.ts đặt CAM_CLI_THAT=1 → providers.ts spawnClaude từ chối mọi CLI không phải CLI giả (ANTHROPIC_SUB_CLI_PATH).
// File này KHÔNG giả spawn, KHÔNG đặt CLI giả: lớp chặn phải bắt được.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.DOCFLOW_AI_DATA = fs.mkdtempSync(path.join(os.tmpdir(), "docflow-cam-cli-"));
delete process.env.ANTHROPIC_SUB_CLI_PATH;

describe("chặn gọi Claude CLI thật trong test", () => {
  it("vitest.config.ts bật CAM_CLI_THAT", () => {
    expect(process.env.CAM_CLI_THAT).toBe("1");
  });

  it("runCliPrompt không giả → bị chặn ngay, câu báo tiếng Việt (không ra tới mạng)", async () => {
    (globalThis as { __taiKhoanCauHinh?: unknown }).__taiKhoanCauHinh = {
      luc: Date.now() + 3600_000,
      ch: { hai_tai_khoan: false, dao_vai_24h: false, moi_phien_bat: false, moi_phien_gio: "07:00" },
    };
    const { runCliPrompt, findClaudeBinary } = await import("@/lib/ai/providers");
    if (!findClaudeBinary()) return; // máy không cài CLI thì vốn không gọi thật được
    const t = Date.now();
    await expect(runCliPrompt("Chỉ trả lời: OK")).rejects.toThrow(/cấm gọi Claude CLI thật/);
    expect(Date.now() - t).toBeLessThan(5000);
  });
});
