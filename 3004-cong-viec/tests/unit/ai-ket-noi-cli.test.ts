// Kết nối AI — gói thuê bao Claude qua Claude CLI (làm theo HptStart). CLI là GIẢ LẬP (vi.mock spawn):
// chưa cài / đã cài chưa đăng nhập / đã đăng nhập gói Max; cài, đăng nhập, đăng xuất chỉ chạy trên thư mục tạm —
// test KHÔNG đụng Claude CLI thật hay phiên đăng nhập thật của máy.
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { NguoiDungPhien } from "@/lib/types";

// ---- Cách ly môi trường TRƯỚC khi nạp module: home, PATH, APPDATA, thư mục dữ liệu đều là thư mục tạm ----
const tam = fs.mkdtempSync(path.join(os.tmpdir(), "docflow-ai-kn-cli-"));
const nha = path.join(tam, "nha");
const binThat = path.join(tam, "bin", "claude.exe");
fs.mkdirSync(path.join(nha, ".claude"), { recursive: true });
fs.mkdirSync(path.dirname(binThat), { recursive: true });
fs.writeFileSync(binThat, "gia");
process.env.DOCFLOW_AI_DATA = path.join(tam, "data");
process.env.USERPROFILE = nha;
process.env.HOME = nha;
process.env.APPDATA = path.join(tam, "appdata");
process.env.LOCALAPPDATA = path.join(tam, "localappdata");
process.env.PATH = path.join(tam, "path-trong");
process.env.CLAUDE_CONFIG_DIR = path.join(nha, ".claude");
process.env.CLAUDECODE = "1"; // như lúc server được bật từ trong một phiên Claude Code
process.env.CLAUDE_CODE_ENTRYPOINT = "cli";
delete process.env.AI_MODE;
delete process.env.AI_API_KEY;

// ---- Giả lập Claude CLI ----
type KichBan = "chua_cai" | "chua_dang_nhap" | "da_dang_nhap";
const gia = vi.hoisted(() => ({
  kichBan: "chua_cai" as string,
  /** kết quả `claude -p` (JSON) — mặc định trả lời bình thường */
  ketQuaPrompt: { type: "result", is_error: false, result: "Có, tôi đang hoạt động bình thường." } as Record<string, unknown>,
  goi: [] as { lenh: string; args: string[]; tuyChon: Record<string, unknown> }[],
}));

vi.mock("node:child_process", async (goc) => {
  const g = (await goc()) as Record<string, unknown>;
  const { EventEmitter: EE } = await import("node:events");
  function taoCon(stdout: string, code: number) {
    const con = new EE() as EventEmitter & Record<string, unknown>;
    const out = new EE() as EventEmitter & { setEncoding: () => void };
    const err = new EE() as EventEmitter & { setEncoding: () => void };
    out.setEncoding = () => {};
    err.setEncoding = () => {};
    con.stdout = out;
    con.stderr = err;
    con.stdin = { on: () => {}, write: () => true, end: () => {} };
    con.kill = () => true;
    con.unref = () => {};
    setTimeout(() => {
      if (stdout) out.emit("data", stdout);
      con.emit("close", code);
    }, 5);
    return con;
  }
  return {
    ...g,
    spawn: (lenh: string, args: string[], tuyChon: Record<string, unknown>) => {
      gia.goi.push({ lenh, args, tuyChon });
      if (/npm/i.test(lenh)) return taoCon("added 1 package\n", 0);
      if (/cmd\.exe/i.test(lenh)) return taoCon("", 0);
      if (args[0] === "--version") return taoCon("2.1.281 (Claude Code)\n", 0);
      if (args[0] === "auth") {
        if (gia.kichBan === "da_dang_nhap") {
          return taoCon(
            JSON.stringify({ loggedIn: true, authMethod: "claude.ai", email: "bo@scigroup.vn", subscriptionType: "max", orgName: "SCI" }),
            0,
          );
        }
        return taoCon(JSON.stringify({ loggedIn: false }), 1);
      }
      if (args[0] === "-p") return taoCon(JSON.stringify(gia.ketQuaPrompt), 0);
      return taoCon("", 1);
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
import { dichLoiCli, tenGoiClaude } from "@/lib/ai/loi-cli";
import { checkCliStatus, envConCli, resetClaudeBinaryCache, thuTroLy, getAIConfig } from "@/lib/ai/providers";

function datKichBan(k: KichBan) {
  gia.kichBan = k;
  if (k === "chua_cai") delete process.env.ANTHROPIC_SUB_CLI_PATH;
  else process.env.ANTHROPIC_SUB_CLI_PATH = binThat;
  resetClaudeBinaryCache();
}

async function json(r: Response) {
  return (await r.json()) as Record<string, unknown>;
}

async function lichSuKetNoi() {
  const q = await layQ();
  const r = await q.query<{ hanh_dong: string; chi_tiet: Record<string, unknown>; nguoi: string }>(
    "SELECT hanh_dong, chi_tiet, nguoi FROM docflow.lich_su WHERE doi_tuong_loai = 'cau_hinh' AND doi_tuong_id = 'ai_ket_noi' ORDER BY id",
  );
  return r.rows;
}

let quanTri: NguoiDungPhien;
let nhanVien: NguoiDungPhien;

beforeAll(async () => {
  await csdlMoi();
  quanTri = await nguoi("quantri@scigroup.vn");
  nhanVien = await nguoi("hung.tv@scigroup.vn");
});

beforeEach(() => {
  gia.goi = [];
  gia.ketQuaPrompt = { type: "result", is_error: false, result: "Có, tôi đang hoạt động bình thường." };
});

describe("câu lỗi CLI in ra như câu trả lời (lấy từ HptStart loiCli.test.js)", () => {
  it("bắt đủ 4 lỗi đã đo thật, câu tiếng Việt chỉ đúng chỗ sửa", () => {
    expect(dichLoiCli("Not logged in · Please run /login")).toMatch(/Chưa đăng nhập.*Cài đặt → AI → Kết nối AI/);
    expect(dichLoiCli("Claude usage limit reached. Your limit will reset at 3pm.")).toMatch(/hết lượt/);
    expect(dichLoiCli("Failed to authenticate: OAuth session expired and could not be refreshed")).toMatch(/đăng nhập lại/);
    const toChuc = dichLoiCli("Your organization has disabled Claude subscription access for Claude Code · Use an Anthropic API key instead");
    expect(toChuc).toMatch(/Tổ chức/);
    expect(toChuc).toMatch(/API key/);
  });
  it("câu trả lời thật thì cho qua (kể cả câu dài nhắc 'login', câu ngắn nhắc trang /login của SCI công việc)", () => {
    expect(dichLoiCli("Có, tôi đang hoạt động bình thường.")).toBeNull();
    expect(dichLoiCli("")).toBeNull();
    expect(dichLoiCli(null)).toBeNull();
    expect(dichLoiCli("Anh vào trang /login để đăng nhập SCI công việc.")).toBeNull();
    expect(dichLoiCli("Bạn cần login vào hệ thống quản lý. ".repeat(20))).toBeNull();
  });
  it("tên gói: max → Claude Max, pro → Claude Pro", () => {
    expect(tenGoiClaude("max")).toBe("Claude Max");
    expect(tenGoiClaude("pro")).toBe("Claude Pro");
    expect(tenGoiClaude(undefined, "claude.ai")).toBe("Claude (thuê bao)");
  });
});

describe("kiểm tra máy có Claude CLI chưa — 3 trạng thái", () => {
  it("chưa cài: installed=false, không gọi spawn nào", async () => {
    datKichBan("chua_cai");
    expect(await checkCliStatus()).toEqual({ installed: false, loggedIn: false });
    expect(gia.goi.length).toBe(0);
  });

  it("đã cài chưa đăng nhập: có phiên bản, loggedIn=false", async () => {
    datKichBan("chua_dang_nhap");
    const st = await checkCliStatus();
    expect(st).toMatchObject({ installed: true, loggedIn: false, version: "2.1.281 (Claude Code)" });
    expect(st.email).toBeUndefined();
  });

  it("đã đăng nhập gói Max: email + tên gói; CLI chạy trong thư mục cách ly, KHÔNG mang dấu vết phiên Claude Code ngoài", async () => {
    datKichBan("da_dang_nhap");
    const st = await checkCliStatus();
    expect(st).toMatchObject({ installed: true, loggedIn: true, plan: "max", tenGoi: "Claude Max", email: "bo@scigroup.vn" });
    for (const g of gia.goi) {
      expect(String(g.tuyChon.cwd)).toContain("docflow-ai-sandbox");
      const env = g.tuyChon.env as NodeJS.ProcessEnv;
      expect(env.CLAUDECODE).toBeUndefined();
      expect(env.CLAUDE_CODE_ENTRYPOINT).toBeUndefined();
    }
    expect(envConCli().CLAUDECODE).toBeUndefined();
    expect(process.env.CLAUDECODE).toBe("1"); // chỉ xóa ở env con
  });
});

describe("API /api/ai/status — ai cũng xem được, chỉ quản trị thấy email", () => {
  it("quản trị: coTheSua + email; nhân viên: xem trạng thái, không có email; chưa đăng nhập SCI công việc: 401", async () => {
    datKichBan("da_dang_nhap");
    const { GET } = await import("@/app/api/ai/status/route");
    phien.nd = quanTri;
    const a = await json(await GET());
    expect(a).toMatchObject({ ok: true, coTheSua: true, mode: "claude-cli" });
    expect(a.cli).toMatchObject({ installed: true, loggedIn: true, tenGoi: "Claude Max", email: "bo@scigroup.vn" });
    phien.nd = nhanVien;
    const b = await json(await GET());
    expect(b).toMatchObject({ ok: true, coTheSua: false });
    expect(b.cli).toMatchObject({ loggedIn: true, tenGoi: "Claude Max" });
    expect((b.cli as Record<string, unknown>).email).toBeUndefined();
    phien.nd = null;
    expect((await GET()).status).toBe(401);
  });
});

describe("nút cài CLI / đăng nhập / đăng xuất (giả lập)", () => {
  it("chưa cài → Cài Claude ngay chạy npm install -g (lệnh hằng số), ghi lịch sử; đã có → báo đã có sẵn; Cài lại thì vẫn chạy", async () => {
    const { POST, GET } = await import("@/app/api/ai/install-cli/route");
    phien.nd = quanTri;
    datKichBan("chua_cai");
    const r = await json(await POST(new Request("http://x", { method: "POST", body: "{}" })));
    expect(r).toMatchObject({ ok: true, started: true });
    const npm = gia.goi.find((g) => /npm/i.test(g.lenh));
    expect(npm?.args).toEqual(["install", "-g", "@anthropic-ai/claude-code"]);
    // chờ tiến trình giả kết thúc rồi xem tiến trình
    await new Promise((res) => setTimeout(res, 60));
    const st = await json(await GET());
    expect(st.running).toBe(false);
    expect((st.log as string[]).join("\n")).toContain("Bắt đầu cài");

    datKichBan("chua_dang_nhap");
    gia.goi = [];
    const daCo = await json(await POST(new Request("http://x", { method: "POST", body: "{}" })));
    expect(daCo).toMatchObject({ ok: true, already: true, started: false });
    expect(gia.goi.some((g) => /npm/i.test(g.lenh))).toBe(false);

    const caiLai = await json(await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ bat_buoc: true }) })));
    expect(caiLai.started).toBe(true);
    await new Promise((res) => setTimeout(res, 60));

    const ls = await lichSuKetNoi();
    expect(ls.filter((d) => d.chi_tiet.thao_tac === "cai_claude_cli").length).toBe(1);
    expect(ls.filter((d) => d.chi_tiet.thao_tac === "cai_lai_claude_cli").length).toBe(1);
    expect(ls.every((d) => d.hanh_dong === "sua_cau_hinh")).toBe(true);
  });

  // Cửa /api/ai/login-cli ĐÃ ĐÓNG 04/10 (kiểm độc lập lần 2 #3 — Mr. Đại chốt một cách đăng nhập: link + dán mã ở thẻ tài khoản)
  it("cửa cũ đăng nhập bằng cửa sổ máy chủ: 410 câu chỉ đường, không chạy gì", async () => {
    const { POST } = await import("@/app/api/ai/login-cli/route");
    phien.nd = quanTri;
    datKichBan("chua_dang_nhap");
    const r = await POST();
    expect(r.status).toBe(410);
    expect(String((await json(r)).loi)).toMatch(/Cách đăng nhập này đã bỏ.*Đăng nhập Claude/);
    expect(gia.goi.length).toBe(0);
  });

  it("cửa cũ đăng xuất máy chủ: 410, KHÔNG xoá file đăng nhập", async () => {
    const { POST } = await import("@/app/api/ai/login-cli/route");
    phien.nd = quanTri;
    const cred = path.join(process.env.CLAUDE_CONFIG_DIR!, ".credentials.json");
    expect(cred.startsWith(tam)).toBe(true); // an toàn: không bao giờ là ~/.claude thật
    fs.writeFileSync(cred, "{}");
    expect((await POST()).status).toBe(410);
    expect(fs.existsSync(cred)).toBe(true);
    fs.rmSync(cred, { force: true });
  });

  it("nhân viên không cài / đụng cửa đăng nhập cũ được (403), không spawn gì", async () => {
    phien.nd = nhanVien;
    datKichBan("chua_cai");
    const cai = await import("@/app/api/ai/install-cli/route");
    const dn = await import("@/app/api/ai/login-cli/route");
    expect((await cai.POST(new Request("http://x", { method: "POST", body: "{}" }))).status).toBe(403);
    expect((await cai.GET()).status).toBe(403);
    expect((await dn.POST()).status).toBe(403);
    expect(gia.goi.length).toBe(0);
  });
});

describe("Thử trợ lý AI qua CLI (hỏi thật một câu — giả lập)", () => {
  it("trả lời bình thường → ok + câu trả lời + số giây", async () => {
    datKichBan("da_dang_nhap");
    const kq = await thuTroLy(getAIConfig());
    expect(kq.ok).toBe(true);
    expect(kq.tra_loi).toContain("hoạt động");
    const p = gia.goi.find((g) => g.args[0] === "-p");
    expect(p?.args).toContain("--disallowed-tools");
  });

  it("CLI báo is_error 'Not logged in' → câu tiếng Việt, không coi là câu trả lời", async () => {
    datKichBan("da_dang_nhap");
    gia.ketQuaPrompt = { type: "result", is_error: true, result: "Not logged in · Please run /login" };
    const kq = await thuTroLy(getAIConfig());
    expect(kq.ok).toBe(false);
    expect(kq.loi).toMatch(/Chưa đăng nhập tài khoản Claude/);
  });

  it("tổ chức chặn gói thuê bao (in ra như câu trả lời thường) → báo lỗi, chỉ đường Đăng xuất / API key", async () => {
    datKichBan("da_dang_nhap");
    gia.ketQuaPrompt = { type: "result", is_error: false, result: "Your organization has disabled Claude subscription access for Claude Code" };
    const { POST } = await import("@/app/api/ai/test/route");
    phien.nd = quanTri;
    const r = await json(await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ thuThat: true }) })));
    expect(r.ok).toBe(false);
    expect(String(r.loi)).toMatch(/Tổ chức/);
    expect(String(r.loi)).toMatch(/Đăng xuất/);
  });

  it("kiểm tra nhanh (không tốn token) báo đúng gói; chưa đăng nhập thì chỉ nút Đăng nhập Claude", async () => {
    const { POST } = await import("@/app/api/ai/test/route");
    phien.nd = quanTri;
    datKichBan("da_dang_nhap");
    const a = await json(await POST(new Request("http://x", { method: "POST", body: "{}" })));
    expect(a).toMatchObject({ ok: true });
    expect(String(a.message)).toContain("Claude Max");
    expect(gia.goi.some((g) => g.args[0] === "-p")).toBe(false); // không gọi mô hình
    datKichBan("chua_dang_nhap");
    const b = await json(await POST(new Request("http://x", { method: "POST", body: "{}" })));
    expect(b.ok).toBe(false);
    expect(String(b.message)).toMatch(/Đăng nhập Claude/);
  });
});
