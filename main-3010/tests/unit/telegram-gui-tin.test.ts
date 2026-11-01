// guiTin — trả lời vào câu hỏi (26/10/2026): Telegram chê phần trích thì vẫn gửi được câu trả lời
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { guiTin, suaTin, xoaTin } from "@/lib/telegram-tro-ly/api-tg";

const goi: { phuongThuc: string; than: Record<string, unknown> }[] = [];
let traVe: Array<{ ok: boolean; error_code?: number; description?: string; result?: unknown }> = [];

beforeEach(() => {
  goi.length = 0;
  traVe = [];
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "token-gia");
  vi.stubGlobal("fetch", async (url: string, init: { body: string }) => {
    goi.push({ phuongThuc: url.split("/").pop()!, than: JSON.parse(init.body) as Record<string, unknown> });
    const j = traVe.shift() ?? { ok: true, result: { message_id: 77 } };
    return { status: j.ok ? 200 : (j.error_code ?? 400), json: async () => j };
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("guiTin trả lời vào câu hỏi", () => {
  it("bình thường: một lần gọi, kèm reply_parameters đúng mã câu hỏi", async () => {
    const kq = await guiTin("1", "<b>Đã tra xong</b>", undefined, { traLoiTin: 42 });
    expect(kq).toMatchObject({ ok: true, ketQua: { message_id: 77 } });
    expect(goi).toHaveLength(1);
    expect(goi[0]!.than.reply_parameters).toEqual({ message_id: 42, allow_sending_without_reply: true });
    expect(goi[0]!.than.parse_mode).toBe("HTML");
  });

  it("không nhờ trả lời thì không có reply_parameters", async () => {
    await guiTin("1", "chào");
    expect(goi[0]!.than).not.toHaveProperty("reply_parameters");
  });

  it("Telegram chê cả HTML lẫn phần trích (400, 400) → lần ba gửi chữ thuần KHÔNG trích, câu trả lời vẫn tới", async () => {
    traVe = [
      { ok: false, error_code: 400, description: "can't parse entities" },
      { ok: false, error_code: 400, description: "bad reply parameters" },
    ];
    const kq = await guiTin("1", "<b>Đã tra</b> xong", undefined, { traLoiTin: 42 });
    expect(kq.ok).toBe(true);
    expect(goi).toHaveLength(3);
    expect(goi[1]!.than.reply_parameters).toBeDefined();
    expect(goi[2]!.than).not.toHaveProperty("reply_parameters");
    expect(goi[2]!.than).not.toHaveProperty("parse_mode");
    expect(goi[2]!.than.text).toBe("Đã tra xong");
  });

  it("lỗi không phải 400 (mạng, 429) thì không thử bừa", async () => {
    traVe = [{ ok: false, error_code: 429, description: "Too Many Requests" }];
    const kq = await guiTin("1", "x", undefined, { traLoiTin: 42 });
    expect(kq.ok).toBe(false);
    expect(goi).toHaveLength(1);
  });

  it("sửa tin ⏳ và xoá tin ⏳ gọi đúng phương thức Telegram", async () => {
    await suaTin("1", 9, "⏳ Đến lượt");
    await xoaTin("1", 9);
    expect(goi.map((g) => g.phuongThuc)).toEqual(["editMessageText", "deleteMessage"]);
    expect(goi[1]!.than).toEqual({ chat_id: "1", message_id: 9 });
  });
});
