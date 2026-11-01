// Telegram HTML + đường lùi chữ thuần (Mr. Đại chốt 25/10/2026). Không gọi mạng thật: fetch được giả.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bangPre, dam, htmlRaChuThuan, laLoiDocHtml, RONG_PRE, thanhChu, thoatHtml } from "@/lib/bao-cao-sang/telegram-html";
import { guiTelegramToi } from "@/lib/bao-cao-sang/telegram";

describe("telegram-html — hàm thuần", () => {
  it("thoát đúng ba ký tự, mã có _ * [ không bị đụng", () => {
    expect(thoatHtml("a<b>&c")).toBe("a&lt;b&gt;&amp;c");
    expect(thoatHtml("ISS_PL_0115 *x* [y]")).toBe("ISS_PL_0115 *x* [y]");
    expect(dam("Tắc <A>")).toBe("<b>Tắc &lt;A&gt;</b>");
  });
  it("bản chữ thuần bỏ thẻ và trả lại ký tự đã thoát", () => {
    const h = `${dam("Tiêu đề")}\n<pre>a &lt; b</pre>\n<a href="https://x">liên kết</a>`;
    expect(htmlRaChuThuan(h)).toBe("Tiêu đề\na < b\nliên kết");
    expect(htmlRaChuThuan(thoatHtml("1 < 2 & 3 > 2"))).toBe("1 < 2 & 3 > 2");
  });
  it("bảng <pre> không bao giờ rộng quá RONG_PRE và cắt có …", () => {
    const b = bangPre(
      [
        ["Dự án", "COD", "MT", "BL"],
        ["Điện gió Hướng Việt rất dài", "20/03/2027", "+86", "+44"],
      ],
      [10, 10, 4, 4],
      [2, 3],
    );
    const dongs = b.replace("<pre>", "").replace("</pre>", "").split("\n");
    expect(dongs.every((d) => d.length <= RONG_PRE)).toBe(true);
    expect(dongs[1]).toContain("…");
    expect(dongs[1]!.startsWith("Điện gió …")).toBe(true);
  });
  it("thanh chữ đủ n ô, không tràn khi phần > tổng", () => {
    expect(thanhChu(5, 10, 10)).toBe("█████░░░░░");
    expect(thanhChu(99, 10, 10)).toBe("██████████");
    expect(thanhChu(1, 0, 6)).toBe("░░░░░░");
  });
  it("nhận ra lỗi không đọc được HTML, không nhầm lỗi khác", () => {
    expect(laLoiDocHtml("Bad Request: can't parse entities: Unsupported start tag \"z\" at byte offset 3")).toBe(true);
    expect(laLoiDocHtml("Bad Request: chat not found")).toBe(false);
    expect(laLoiDocHtml(undefined)).toBe(false);
  });
});

describe("guiTelegramToi — chế độ HTML và đường lùi", () => {
  const cu = { token: process.env.TELEGRAM_BOT_TOKEN, chat: process.env.TELEGRAM_CHAT_ID };
  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = "test-token";
    process.env.TELEGRAM_CHAT_ID = "1";
  });
  afterEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = cu.token;
    process.env.TELEGRAM_CHAT_ID = cu.chat;
    vi.unstubAllGlobals();
  });

  const traLoi = (j: unknown) => ({ json: async () => j }) as Response;

  it("mặc định KHÔNG gửi parse_mode (chữ thuần như cũ)", async () => {
    const f = vi.fn(async (_u: string, _o?: RequestInit) => traLoi({ ok: true, result: { message_id: 7 } }));
    vi.stubGlobal("fetch", f);
    const kq = await guiTelegramToi("42", "chữ <thuần>");
    expect(kq.ok).toBe(true);
    const body = JSON.parse((f.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.parse_mode).toBeUndefined();
    expect(body.text).toBe("chữ <thuần>");
  });

  it("html:true gửi parse_mode HTML, một lần là xong", async () => {
    const f = vi.fn(async (_u: string, _o?: RequestInit) => traLoi({ ok: true, result: { message_id: 8 } }));
    vi.stubGlobal("fetch", f);
    const kq = await guiTelegramToi("42", "<b>đậm</b>", { html: true });
    expect(f).toHaveBeenCalledTimes(1);
    expect(JSON.parse((f.mock.calls[0]![1] as RequestInit).body as string).parse_mode).toBe("HTML");
    expect(kq.luiVeChuThuan).toBeUndefined();
  });

  it("Telegram từ chối thẻ → gửi lại bản chữ thuần, báo đã lùi", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(traLoi({ ok: false, description: "Bad Request: can't parse entities: Unsupported start tag" }))
      .mockResolvedValueOnce(traLoi({ ok: true, result: { message_id: 9 } }));
    vi.stubGlobal("fetch", f);
    const kq = await guiTelegramToi("42", "<b>đậm</b> a &lt; b", { html: true });
    expect(f).toHaveBeenCalledTimes(2);
    const body2 = JSON.parse((f.mock.calls[1]![1] as RequestInit).body as string);
    expect(body2.parse_mode).toBeUndefined();
    expect(body2.text).toBe("đậm a < b");
    expect(kq.ok).toBe(true);
    expect(kq.luiVeChuThuan).toBe(true);
  });

  it("lỗi khác (chat không tồn tại) KHÔNG lùi, báo đúng lý do", async () => {
    const f = vi.fn(async () => traLoi({ ok: false, description: "Bad Request: chat not found" }));
    vi.stubGlobal("fetch", f);
    const kq = await guiTelegramToi("42", "<b>x</b>", { html: true });
    expect(f).toHaveBeenCalledTimes(1);
    expect(kq.ok).toBe(false);
    expect(kq.thongDiep).toContain("chat not found");
  });
});
