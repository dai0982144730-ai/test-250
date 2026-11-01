// Kết nối AI — chế độ API key (làm theo HptStart): khóa RIÊNG theo nhà cung cấp, không bao giờ về client
// (chỉ dạng che sk-…abcd), không vào lịch sử; thử kết nối / thử trợ lý / danh sách model bằng fetch GIẢ;
// quyền: nhân viên chỉ xem trạng thái, không đổi được.
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { NguoiDungPhien } from "@/lib/types";

const tam = fs.mkdtempSync(path.join(os.tmpdir(), "docflow-ai-kn-api-"));
process.env.DOCFLOW_AI_DATA = tam;
for (const k of ["AI_MODE", "AI_PROVIDER", "AI_API_KEY", "AI_MODEL", "AI_MODEL_CLI", "AI_BASE_URL"]) delete process.env[k];

// CLI giả: không cho spawn thật trong file này (status route luôn dò CLI)
vi.mock("node:child_process", async (goc) => {
  const g = (await goc()) as Record<string, unknown>;
  return {
    ...g,
    spawn: () => {
      throw new Error("không spawn trong test API");
    },
  };
});

const phien = vi.hoisted(() => ({ nd: null as NguoiDungPhien | null }));
vi.mock("@/lib/phien", async (goc) => {
  const g = (await goc()) as Record<string, unknown>;
  return {
    ...g,
    batBuocDangNhap: async () => {
      if (!phien.nd) throw new (g.LoiHttp as new (s: number, m: string) => Error)(401, "Chưa đăng nhập");
      return phien.nd;
    },
  };
});

import { csdlMoi, nguoi } from "../helpers/csdl";
import { layQ } from "@/lib/db";
import { getAIConfig, maskApiKey, modelHopVoiKetNoi, resetClaudeBinaryCache } from "@/lib/ai/providers";

const KHOA_DUNG = "sk-ant-api03-DUNGDUNGDUNG-abcd";
const KHOA_OPENAI = "sk-proj-openaiopenai-wxyz";

// ---- fetch giả: khóa đúng → 200, sai → 401 ----
const goiFetch: { url: string; headers: Record<string, string>; body?: string }[] = [];
function fetchGia(url: string, init?: RequestInit): Promise<Response> {
  const headers = (init?.headers ?? {}) as Record<string, string>;
  goiFetch.push({ url, headers, body: typeof init?.body === "string" ? init.body : undefined });
  const khoa = headers["x-api-key"] ?? headers.authorization?.replace(/^Bearer /, "") ?? "";
  const dung = khoa === KHOA_DUNG || khoa === KHOA_OPENAI;
  if (!dung) return Promise.resolve(new Response(JSON.stringify({ error: { message: "invalid x-api-key" } }), { status: 401 }));
  if (url.includes("/models")) {
    const data = url.includes("anthropic")
      ? [
          { id: "claude-opus-5", display_name: "Claude Opus 5" },
          { id: "claude-sonnet-5", display_name: "Claude Sonnet 5" },
        ]
      : [{ id: "gpt-5" }, { id: "gpt-5-mini" }];
    return Promise.resolve(new Response(JSON.stringify({ data }), { status: 200 }));
  }
  if (url.includes("/v1/messages")) {
    return Promise.resolve(new Response(JSON.stringify({ content: [{ type: "text", text: "Có, tôi đang hoạt động." }] }), { status: 200 }));
  }
  return Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: "Vâng, đang hoạt động." } }] }), { status: 200 }));
}

async function json(r: Response) {
  return (await r.json()) as Record<string, unknown>;
}
const post = (body: unknown) => new Request("http://x", { method: "POST", body: JSON.stringify(body) });

let quanTri: NguoiDungPhien;
let nhanVien: NguoiDungPhien;

beforeAll(async () => {
  await csdlMoi();
  quanTri = await nguoi("quantri@scigroup.vn");
  nhanVien = await nguoi("hung.tv@scigroup.vn");
  vi.stubGlobal("fetch", vi.fn(fetchGia));
});

beforeEach(() => {
  goiFetch.length = 0;
  resetClaudeBinaryCache();
});

describe("che khóa + model hợp kết nối", () => {
  it("che dạng sk-…abcd, không lộ phần giữa", () => {
    expect(maskApiKey(KHOA_DUNG)).toBe("sk-…abcd");
    expect(maskApiKey("AIzaSyXXXXXXXXXXXXXXXX1234")).toBe("AIza…1234");
    expect(maskApiKey("ngan")).toBe("••••");
    expect(maskApiKey("")).toBe("");
  });
  it("model Claude của cấu hình chung không bị gửi sang OpenAI; CLI không nhận tên GPT", () => {
    const api = { mode: "api" as const, provider: "openai" as const, apiKey: "x", model: "", baseUrl: "" };
    expect(modelHopVoiKetNoi(api, "claude-sonnet-5")).toBeUndefined();
    expect(modelHopVoiKetNoi(api, "gpt-5")).toBe("gpt-5");
    expect(modelHopVoiKetNoi({ ...api, provider: "anthropic" }, "claude-sonnet-5")).toBe("claude-sonnet-5");
    expect(modelHopVoiKetNoi({ ...api, mode: "claude-cli" }, "gpt-5")).toBeUndefined();
    expect(modelHopVoiKetNoi({ ...api, mode: "claude-cli" }, "claude-opus-5")).toBe("claude-opus-5");
  });
});

describe("lưu API key (quản trị)", () => {
  it("chưa cấu hình gì → mặc định gói thuê bao Claude CLI", () => {
    expect(getAIConfig().mode).toBe("claude-cli");
  });

  it("lưu key Anthropic → chế độ api; GET chỉ trả dạng che; file lưu trên máy chủ; lịch sử không có khóa", async () => {
    phien.nd = quanTri;
    const kn = await import("@/app/api/ai/ket-noi/route");
    const r = await kn.POST(post({ mode: "api", provider: "anthropic", apiKey: KHOA_DUNG, model: "claude-sonnet-5" }));
    expect(r.status).toBe(200);
    const traVe = await r.text();
    expect(traVe).not.toContain(KHOA_DUNG);
    expect(traVe).not.toContain("DUNGDUNG");
    const g = await json(await kn.GET());
    expect(g).toMatchObject({ mode: "api", provider: "anthropic", model: "claude-sonnet-5", keyMasked: "sk-…abcd" });
    expect((g.nhaCungCap as Record<string, { coKhoa: boolean }>).anthropic.coKhoa).toBe(true);
    expect((g.nhaCungCap as Record<string, { coKhoa: boolean }>).openai.coKhoa).toBe(false);
    expect(fs.readFileSync(path.join(tam, "ai-ket-noi.json"), "utf8")).toContain(KHOA_DUNG);

    const q = await layQ();
    const ls = await q.query<{ hanh_dong: string; chi_tiet: unknown; nguoi: string }>(
      "SELECT hanh_dong, chi_tiet, nguoi FROM docflow.lich_su WHERE doi_tuong_loai='cau_hinh' AND doi_tuong_id='ai_ket_noi' ORDER BY id",
    );
    expect(ls.rows.length).toBe(1);
    expect(ls.rows[0]!.hanh_dong).toBe("sua_cau_hinh");
    expect(ls.rows[0]!.nguoi).toBe(quanTri.id);
    const ct = JSON.stringify(ls.rows[0]!.chi_tiet);
    expect(ct).not.toContain("DUNGDUNG");
    expect(ct).toContain("anthropic");
    expect(ct).toContain("đặt khóa mới");
  });

  it("khóa riêng theo nhà cung cấp: chuyển sang OpenAI không mang khóa Anthropic theo; nccKhoa sửa khóa hãng khác mà không đổi hãng đang dùng", async () => {
    phien.nd = quanTri;
    const kn = await import("@/app/api/ai/ket-noi/route");
    await kn.POST(post({ mode: "api", provider: "openai" }));
    expect(getAIConfig()).toMatchObject({ provider: "openai", apiKey: "" });
    await kn.POST(post({ nccKhoa: "openai", apiKey: KHOA_OPENAI }));
    expect(getAIConfig()).toMatchObject({ provider: "openai", apiKey: KHOA_OPENAI });
    await kn.POST(post({ provider: "anthropic" }));
    expect(getAIConfig()).toMatchObject({ provider: "anthropic", apiKey: KHOA_DUNG, model: "claude-sonnet-5" });
    // xóa khóa OpenAI khi đang dùng Anthropic — Anthropic vẫn giữ nguyên
    await kn.POST(post({ nccKhoa: "openai", apiKey: "-" }));
    const g = await json(await kn.GET());
    expect(g.provider).toBe("anthropic");
    expect((g.nhaCungCap as Record<string, { coKhoa: boolean }>).openai.coKhoa).toBe(false);
    expect((g.nhaCungCap as Record<string, { coKhoa: boolean }>).anthropic.coKhoa).toBe(true);
  });

  it("dữ liệu sai bị chặn 400 (chế độ lạ, nhà cung cấp lạ, key có khoảng trắng, model lạ)", async () => {
    phien.nd = quanTri;
    const kn = await import("@/app/api/ai/ket-noi/route");
    expect((await kn.POST(post({ mode: "cli" }))).status).toBe(400);
    expect((await kn.POST(post({ provider: "bard" }))).status).toBe(400);
    expect((await kn.POST(post({ apiKey: "sk-ant co khoang trang" }))).status).toBe(400);
    expect((await kn.POST(post({ model: "x; rm -rf /" }))).status).toBe(400);
  });

  it("bản cũ (một khóa chung) đọc được và tự chuyển sang khóa riêng của hãng đã lưu", async () => {
    fs.writeFileSync(path.join(tam, "ai-ket-noi.json"), JSON.stringify({ aiMode: "api", aiProvider: "deepseek", aiApiKey: "sk-cu-deepseek-000000-9999", aiModel: "deepseek-chat" }));
    expect(getAIConfig()).toMatchObject({ provider: "deepseek", apiKey: "sk-cu-deepseek-000000-9999", model: "deepseek-chat" });
    phien.nd = quanTri;
    const kn = await import("@/app/api/ai/ket-noi/route");
    await kn.POST(post({ provider: "openai" }));
    // khóa DeepSeek KHÔNG bị gắn nhầm sang OpenAI
    expect(getAIConfig()).toMatchObject({ provider: "openai", apiKey: "" });
    const f = JSON.parse(fs.readFileSync(path.join(tam, "ai-ket-noi.json"), "utf8")) as Record<string, unknown>;
    expect(f.aiApiKey).toBeUndefined();
    expect((f.nccRieng as Record<string, { khoa: string; model: string }>).deepseek).toEqual({ khoa: "sk-cu-deepseek-000000-9999", model: "deepseek-chat" });
    // khôi phục cho các test sau: Anthropic với khóa đúng
    await kn.POST(post({ mode: "api", provider: "anthropic", apiKey: KHOA_DUNG, model: "claude-sonnet-5" }));
  });
});

describe("thử kết nối bằng fetch giả", () => {
  it("không tốn token: key đúng → ok (GET /v1/models); key sai → 'không hợp lệ'", async () => {
    phien.nd = quanTri;
    const t = await import("@/app/api/ai/test/route");
    const a = await json(await t.POST(post({})));
    expect(a.ok).toBe(true);
    expect(goiFetch[0]!.url).toContain("api.anthropic.com/v1/models");
    expect(goiFetch.some((g) => g.url.includes("/v1/messages"))).toBe(false);

    const kn = await import("@/app/api/ai/ket-noi/route");
    await kn.POST(post({ nccKhoa: "anthropic", apiKey: "sk-ant-api03-SAISAISAI-0000" }));
    const b = await json(await t.POST(post({})));
    expect(b.ok).toBe(false);
    expect(String(b.message)).toMatch(/không hợp lệ/);
    await kn.POST(post({ nccKhoa: "anthropic", apiKey: KHOA_DUNG }));
  });

  it("Thử trợ lý AI (hỏi thật một câu): ok + câu trả lời + giây; key sai → lỗi HTTP 401 tiếng Việt", async () => {
    phien.nd = quanTri;
    const t = await import("@/app/api/ai/test/route");
    const a = await json(await t.POST(post({ thuThat: true, mode: "api", provider: "anthropic" })));
    expect(a).toMatchObject({ ok: true, tra_loi: "Có, tôi đang hoạt động." });
    expect(typeof a.giay).toBe("number");
    const kn = await import("@/app/api/ai/ket-noi/route");
    await kn.POST(post({ nccKhoa: "anthropic", apiKey: "sk-ant-api03-SAISAISAI-0000" }));
    const b = await json(await t.POST(post({ thuThat: true })));
    expect(b.ok).toBe(false);
    expect(String(b.loi)).toMatch(/HTTP 401/);
    await kn.POST(post({ nccKhoa: "anthropic", apiKey: KHOA_DUNG }));
  });

  it("thử một hãng đã có khóa mà CHƯA bật (panel đang xem) không đổi hãng đang dùng", async () => {
    phien.nd = quanTri;
    const kn = await import("@/app/api/ai/ket-noi/route");
    await kn.POST(post({ nccKhoa: "openai", apiKey: KHOA_OPENAI }));
    const t = await import("@/app/api/ai/test/route");
    const r = await json(await t.POST(post({ thuThat: true, mode: "api", provider: "openai" })));
    expect(r).toMatchObject({ ok: true, tra_loi: "Vâng, đang hoạt động." });
    expect(goiFetch.at(-1)!.url).toContain("api.openai.com/v1/chat/completions");
    expect(getAIConfig().provider).toBe("anthropic");
  });

  it("danh sách model: có khóa → hỏi thẳng hãng; khóa sai / chưa có → danh sách dự phòng", async () => {
    phien.nd = quanTri;
    const m = await import("@/app/api/ai/models/route");
    const a = await json(await m.POST(post({ provider: "anthropic" })));
    expect(a.tuHang).toBe(true);
    expect((a.models as { id: string }[]).map((x) => x.id)).toEqual(["claude-opus-5", "claude-sonnet-5"]);
    const b = await json(await m.POST(post({ provider: "anthropic", apiKey: "sk-ant-api03-SAISAISAI-0000" })));
    expect(b.tuHang).toBe(false);
    expect((b.models as unknown[]).length).toBeGreaterThan(0);
    const c = await json(await m.POST(post({ provider: "gemini" })));
    expect(c.tuHang).toBe(false);
    expect((c.models as { id: string }[])[0]!.id).toContain("gemini");
    expect((await m.POST(post({ provider: "khong-co" }))).status).toBe(400);
  });
});

describe("quyền: nhân viên chỉ xem, không đổi được", () => {
  it("nhân viên: GET status được (không email, không khóa che); mọi thao tác đổi/thử/xem khóa → 403; cấu hình không đổi", async () => {
    phien.nd = nhanVien;
    const truoc = fs.readFileSync(path.join(tam, "ai-ket-noi.json"), "utf8");
    const st = await import("@/app/api/ai/status/route");
    const s = await json(await st.GET());
    expect(s).toMatchObject({ ok: true, coTheSua: false, mode: "api" });
    expect(s.api).toMatchObject({ provider: "anthropic", coKhoa: true });
    expect((s.api as Record<string, unknown>).keyMasked).toBeUndefined();
    expect(JSON.stringify(s)).not.toContain("abcd");

    const kn = await import("@/app/api/ai/ket-noi/route");
    const t = await import("@/app/api/ai/test/route");
    const m = await import("@/app/api/ai/models/route");
    expect((await kn.GET()).status).toBe(403);
    expect((await kn.POST(post({ mode: "off" }))).status).toBe(403);
    expect((await kn.POST(post({ apiKey: "sk-ant-api03-cuamaychu-1234" }))).status).toBe(403);
    expect((await t.POST(post({ thuThat: true }))).status).toBe(403);
    expect((await m.POST(post({ provider: "anthropic" }))).status).toBe(403);
    expect(fs.readFileSync(path.join(tam, "ai-ket-noi.json"), "utf8")).toBe(truoc);
    expect(goiFetch.length).toBe(0);
  });

  it("quản trị tắt AI → chế độ off, runAI báo tắt, có lịch sử", async () => {
    phien.nd = quanTri;
    const kn = await import("@/app/api/ai/ket-noi/route");
    await kn.POST(post({ mode: "off" }));
    expect(getAIConfig().mode).toBe("off");
    const { runAI } = await import("@/lib/ai/providers");
    await expect(runAI("xin chào")).rejects.toThrow(/TẮT/);
    const q = await layQ();
    const r = await q.query<{ chi_tiet: { mode?: string } }>(
      "SELECT chi_tiet FROM docflow.lich_su WHERE doi_tuong_id='ai_ket_noi' ORDER BY id DESC LIMIT 1",
    );
    expect(r.rows[0]!.chi_tiet.mode).toBe("off");
    // Không dòng lịch sử nào chứa khóa
    const tatCa = await q.query<{ chi_tiet: unknown }>("SELECT chi_tiet FROM docflow.lich_su WHERE doi_tuong_id='ai_ket_noi'");
    const chu = JSON.stringify(tatCa.rows);
    expect(chu).not.toContain("DUNGDUNG");
    expect(chu).not.toContain("openaiopenai");
    expect(chu).not.toContain("SAISAISAI");
  });
});
