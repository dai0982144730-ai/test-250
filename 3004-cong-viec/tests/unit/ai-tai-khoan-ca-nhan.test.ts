// Quản lý token AI — Đợt 1b (Mr. Đại duyệt 04/10/2026): đăng nhập bằng MÃ DÁN (claude setup-token) + TÀI KHOẢN CÁ NHÂN dự phòng.
// Thứ tự: TK1 → TK2 → tài khoản cá nhân của CHÍNH người đang hỏi; việc nền không bao giờ dùng tài khoản cá nhân.
// CLI là GIẢ LẬP (vi.mock spawn) — nhận ra tài khoản qua CLAUDE_CONFIG_DIR / CLAUDE_CODE_OAUTH_TOKEN, không đụng Claude thật.
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tam = fs.mkdtempSync(path.join(os.tmpdir(), "docflow-ai-ca-nhan-"));
const bin = path.join(tam, "claude.exe");
fs.writeFileSync(bin, "gia");
process.env.DOCFLOW_AI_DATA = path.join(tam, "data");
fs.mkdirSync(process.env.DOCFLOW_AI_DATA, { recursive: true });
process.env.ANTHROPIC_SUB_CLI_PATH = bin;

const MA_TK2 = "sk-ant-oat01-" + "B".repeat(60);
const MA_CN = "sk-ant-oat01-" + "C".repeat(60);
const MA_SAI = "sk-ant-oat01-" + "X".repeat(60);
const HET = "Claude AI usage limit reached|4102444800";

/** Kịch bản: tài khoản nào trả gì ("ok" / "het" / "401") + nhật ký tài khoản đã gọi */
const gia = vi.hoisted(() => ({ tra: {} as Record<string, string>, goi: [] as string[], thuMuc: [] as string[] }));

vi.mock("node:child_process", async (goc) => {
  const g = (await goc()) as Record<string, unknown>;
  const { EventEmitter: EE } = await import("node:events");
  return {
    ...g,
    spawn: (_lenh: string, _args: string[], opts: { env?: Record<string, string> }) => {
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
      const env = opts?.env ?? {};
      const ma = env.CLAUDE_CODE_OAUTH_TOKEN;
      const dir = env.CLAUDE_CONFIG_DIR ?? "";
      const tk = ma === MA_CN ? "ca_nhan" : ma === MA_TK2 ? "tk2" : ma === MA_SAI ? "sai" : /tk1$/.test(dir) ? "tk1" : /sci-thu-ma-/.test(dir) ? "thu" : "?";
      gia.goi.push(tk);
      gia.thuMuc.push(dir);
      const kieu = gia.tra[tk] ?? "ok";
      // Như CLI thật (đo 04/10): lỗi API → JSON đầy đủ trên stdout, lý do "result" nằm CUỐI (sau ~700 ký tự khác), thoát mã 1
      const dem = { is_error: true, duration_api_ms: 0, num_turns: 1, stop_reason: "stop_sequence", session_id: "x".repeat(36), usage: { input_tokens: 0, output_tokens: 0, server_tool_use: { web_search_requests: 0 } }, modelUsage: {}, permission_denials: [], terminal_reason: "x".repeat(300) };
      setTimeout(() => {
        const o =
          kieu === "het"
            ? { ...dem, result: HET, type: "result" }
            : kieu === "401"
              ? { ...dem, api_error_status: 401, result: "Failed to authenticate. API Error: 401 OAuth access token is invalid.", type: "result" }
              : { type: "result", is_error: false, result: `TRA-${tk}`, usage: { input_tokens: 10, output_tokens: 3 } };
        out.emit("data", JSON.stringify(o));
        con.emit("close", kieu === "ok" ? 0 : 1);
      }, 5);
      return con;
    },
  };
});

const CH = { hai_tai_khoan: true, dao_vai_24h: false, moi_phien_bat: false, moi_phien_gio: "07:00" };

beforeEach(async () => {
  (globalThis as { __taiKhoanCauHinh?: unknown }).__taiKhoanCauHinh = { luc: Date.now() + 3600_000, ch: CH };
  const m = await import("@/lib/ai/tai-khoan-claude");
  m.trangThai(1).het_den = 0;
  m.trangThai(2).het_den = 0;
  m.trangThai(1).het_doan = false;
  m.trangThai(2).het_doan = false;
  m.boDauHong(1);
  m.boDauHong(2);
  m.trangThaiCaNhan("u1").het_den = 0;
  m.boDauHongCaNhan("u1");
  gia.tra = {};
  gia.goi = [];
  gia.thuMuc = [];
});

describe("mã đăng nhập dán tay", () => {
  it("chuẩn hoá: bỏ khoảng trắng / xuống dòng; sai dạng → null", async () => {
    const { chuanHoaMa, duoiMa } = await import("@/lib/ai/tai-khoan-claude");
    expect(chuanHoaMa(`  sk-ant-oat01-${"a".repeat(30)}\n${"b".repeat(30)}  `)).toBe(`sk-ant-oat01-${"a".repeat(30)}${"b".repeat(30)}`);
    expect(chuanHoaMa("sk-ant-api03-" + "a".repeat(60))).toBeNull(); // khoá API, không phải mã đăng nhập
    expect(chuanHoaMa("sk-ant-oat01-ngan")).toBeNull();
    expect(chuanHoaMa(undefined)).toBeNull();
    expect(duoiMa(MA_TK2)).toBe("…BBBB");
  });

  it("tài khoản công ty: lưu mã → đã đăng nhập, kiểu 'ma', CLI nhận mã qua biến môi trường; đăng xuất xoá mã", async () => {
    const m = await import("@/lib/ai/tai-khoan-claude");
    expect(m.kieuDangNhap(2)).toBeNull();
    // Đo 04/10: có CẢ file cửa sổ lẫn mã thì CLI dùng file cửa sổ → lưu mã phải XOÁ file cửa sổ
    const tepCuaSo = path.join(m.thuMucTk(2), ".credentials.json");
    fs.writeFileSync(tepCuaSo, "{}");
    expect(m.kieuDangNhap(2)).toBe("cua_so");
    m.trangThai(2).het_den = Date.now() + 3600_000;
    m.luuMaCongTy(2, MA_TK2);
    expect(fs.existsSync(tepCuaSo)).toBe(false);
    expect(m.coDangNhap(2)).toBe(true);
    expect(m.kieuDangNhap(2)).toBe("ma");
    expect(m.maChay(2)).toBe(MA_TK2);
    expect(m.trangThai(2).het_den).toBe(0); // mã mới → bỏ mốc hết hạn mức cũ
    expect(m.thongTinMa(2)?.duoi_ma).toBe("…BBBB");
    const th = await m.tinhHinhTk();
    expect(JSON.stringify(th)).not.toContain(MA_TK2); // không bao giờ đưa mã ra ngoài
  });

  it("CLI thoát mã 1 kèm JSON lỗi dài (lý do ở cuối) → đọc được lý do, không cắt mất", async () => {
    const { docJsonLoiCli } = await import("@/lib/ai/providers");
    const tho = JSON.stringify({ is_error: true, usage: { a: "x".repeat(600) }, api_error_status: 401, result: "Failed to authenticate. API Error: 401 OAuth access token is invalid." });
    expect(tho.length).toBeGreaterThan(400);
    expect(docJsonLoiCli(tho)).toMatch(/^Failed to authenticate/);
    expect(docJsonLoiCli(JSON.stringify({ is_error: false, result: "OK" }))).toBeNull();
    expect(docJsonLoiCli("error: unknown option '--tools'")).toBeNull();
  });

  it("thử mã: mã sai → báo tiếng Việt, không lưu; mã đúng → ok; thư mục tạm được dọn", async () => {
    const { thuMaDangNhap } = await import("@/lib/ai/providers");
    gia.tra.sai = "401";
    const sai = await thuMaDangNhap(MA_SAI, "ca_nhan", "u1");
    expect(sai.ok).toBe(false);
    expect(sai.ok ? "" : sai.loi).toMatch(/Mã không đúng, đã hết hạn hoặc đã bị thu hồi/);
    expect(sai.ok ? "" : sai.loi).not.toMatch(/is_error|Failed|\{/); // không lọt JSON / tiếng Anh
    const dung = await thuMaDangNhap(MA_CN, "ca_nhan", "u1");
    expect(dung.ok).toBe(true);
    for (const d of gia.thuMuc) expect(fs.existsSync(d)).toBe(false);
    gia.tra.ca_nhan = "het";
    const het = await thuMaDangNhap(MA_CN, "ca_nhan", "u1");
    expect(het).toMatchObject({ ok: true, ghi_chu: expect.stringMatching(/đang hết hạn mức/) });
  });
});

describe("thứ tự TK1 → TK2 → tài khoản cá nhân", () => {
  it("người đang hỏi: TK1 hết, TK2 hết → chạy bằng tài khoản cá nhân của chính người đó", async () => {
    const m = await import("@/lib/ai/tai-khoan-claude");
    fs.writeFileSync(path.join(m.thuMucTk(1), ".credentials.json"), "{}");
    m.luuMaCongTy(2, MA_TK2);
    m.luuMaCaNhan("u1", MA_CN);
    const { runCliPrompt } = await import("@/lib/ai/providers");
    const { chayVoiNguCanh } = await import("@/lib/ngu-canh");
    gia.tra = { tk1: "het", tk2: "het" };
    const kq = await chayVoiNguCanh({ thiet_bi: null, nguoi: "u1" }, () => runCliPrompt("câu hỏi"));
    expect(kq).toBe("TRA-ca_nhan");
    expect(gia.goi).toEqual(["tk1", "tk2", "ca_nhan"]);
    // Sổ dùng AI ghi đúng tài khoản + người
    const so = fs.readFileSync(path.join(process.env.DOCFLOW_AI_DATA!, "ai-so-dung.jsonl"), "utf8").trim().split("\n").map((d) => JSON.parse(d));
    expect(so.slice(-3).map((l) => [l.tai_khoan, l.ket_qua])).toEqual([["tk1", "het_han_muc"], ["tk2", "het_han_muc"], ["ca_nhan", "ok"]]);
    expect(so.at(-1).nguoi).toBe("u1");
  });

  it("đã biết hai tài khoản công ty đang hết → đi thẳng tài khoản cá nhân, không gọi thử công ty", async () => {
    const m = await import("@/lib/ai/tai-khoan-claude");
    m.trangThai(1).het_den = Date.now() + 3600_000;
    m.trangThai(2).het_den = Date.now() + 3600_000;
    const { runCliPrompt } = await import("@/lib/ai/providers");
    const { chayVoiNguCanh } = await import("@/lib/ngu-canh");
    expect(await chayVoiNguCanh({ thiet_bi: null, nguoi: "u1" }, () => runCliPrompt("câu hỏi"))).toBe("TRA-ca_nhan");
    expect(gia.goi).toEqual(["ca_nhan"]);
  });

  it("việc nền (không có người): KHÔNG dùng tài khoản cá nhân — báo hết, kèm giờ mở lại", async () => {
    const { runCliPrompt } = await import("@/lib/ai/providers");
    gia.tra = { tk1: "het", tk2: "het" };
    await expect(runCliPrompt("việc nền")).rejects.toThrow(/Cả hai tài khoản Claude của công ty đều đang hết hạn mức \(dùng lại khoảng/);
    expect(gia.goi).toEqual(["tk1", "tk2"]);
  });

  it("người chưa nối tài khoản cá nhân → câu báo chỉ đường nối tài khoản", async () => {
    const m = await import("@/lib/ai/tai-khoan-claude");
    m.trangThai(1).het_den = Date.now() + 3600_000;
    m.trangThai(2).het_den = Date.now() + 3600_000;
    const { runCliPrompt } = await import("@/lib/ai/providers");
    const { chayVoiNguCanh } = await import("@/lib/ngu-canh");
    gia.tra = { tk1: "het" };
    await expect(chayVoiNguCanh({ thiet_bi: null, nguoi: "u2" }, () => runCliPrompt("câu hỏi"))).rejects.toThrow(/Tài khoản Claude cá nhân/);
    expect(gia.goi).not.toContain("ca_nhan");
  });

  it("tài khoản cá nhân cũng hết → báo cả hai, đánh dấu hết (ghi đĩa); mã cá nhân hỏng → báo dán mã mới", async () => {
    const m = await import("@/lib/ai/tai-khoan-claude");
    m.trangThai(1).het_den = Date.now() + 3600_000;
    m.trangThai(2).het_den = Date.now() + 3600_000;
    const { runCliPrompt } = await import("@/lib/ai/providers");
    const { chayVoiNguCanh } = await import("@/lib/ngu-canh");
    gia.tra = { ca_nhan: "het" };
    await expect(chayVoiNguCanh({ thiet_bi: null, nguoi: "u1" }, () => runCliPrompt("câu hỏi"))).rejects.toThrow(/tài khoản Claude cá nhân của anh\/chị .*đều đang hết hạn mức/);
    expect(m.trangThaiCaNhan("u1").het_den).toBe(4102444800 * 1000);
    expect(m.caNhanDungDuoc("u1")).toBe(false);
    // khởi động lại (quên bộ nhớ) vẫn nhớ mốc hết
    (globalThis as { __taiKhoanCaNhan?: Map<string, unknown> }).__taiKhoanCaNhan?.delete("u1");
    expect(m.trangThaiCaNhan("u1").het_den).toBe(4102444800 * 1000);
    m.trangThaiCaNhan("u1").het_den = 0;
    gia.tra = { ca_nhan: "401" };
    await expect(chayVoiNguCanh({ thiet_bi: null, nguoi: "u1" }, () => runCliPrompt("câu hỏi"))).rejects.toThrow(/không còn dùng được .*→ Đăng nhập Claude\.$/);
  });

  it("mốc hết của công ty chỉ là ĐOÁN 15 phút → thử lại công ty một lần trước khi dùng tài khoản cá nhân (kiểm độc lập #4)", async () => {
    const m = await import("@/lib/ai/tai-khoan-claude");
    const { runCliPrompt } = await import("@/lib/ai/providers");
    const { chayVoiNguCanh } = await import("@/lib/ngu-canh");
    // CLI báo hết mà KHÔNG kèm giờ mở lại → mốc đoán
    await m.danhDauHet(1, "Claude AI usage limit reached");
    expect(m.trangThai(1).het_doan).toBe(true);
    m.trangThai(2).het_den = Date.now() + 3600_000; // tk2 hết theo giờ CLI báo (không đoán)
    // tk1 đã mở lại thật → chạy bằng công ty, không đụng tài khoản cá nhân
    expect(await chayVoiNguCanh({ thiet_bi: null, nguoi: "u1" }, () => runCliPrompt("câu hỏi"))).toBe("TRA-tk1");
    expect(gia.goi).toEqual(["tk1"]);
    // tk1 vẫn hết thật → mới sang tài khoản cá nhân
    gia.goi = [];
    await m.danhDauHet(1, "Claude AI usage limit reached");
    gia.tra = { tk1: "het" };
    expect(await chayVoiNguCanh({ thiet_bi: null, nguoi: "u1" }, () => runCliPrompt("câu hỏi"))).toBe("TRA-ca_nhan");
    expect(gia.goi).toEqual(["tk1", "ca_nhan"]);
    // CLI báo giờ mở lại → không còn là đoán
    expect(m.trangThai(1).het_doan).toBe(false);
  });

  it("tài khoản công ty MẤT ĐĂNG NHẬP (401) → tự chuyển tài khoản còn lại, lượt sau bỏ qua tài khoản hỏng; đăng nhập lại thì thử ngay (Mr. Đại chốt 04/10)", async () => {
    const m = await import("@/lib/ai/tai-khoan-claude");
    const { runCliPrompt } = await import("@/lib/ai/providers");
    gia.tra = { tk1: "401" };
    expect(await runCliPrompt("việc nền")).toBe("TRA-tk2");
    expect(gia.goi).toEqual(["tk1", "tk2"]);
    expect(m.dangMatDangNhap(1)).toBe(true);
    expect(m.trangThai(1).het_den).toBe(0); // không tính là hết hạn mức
    gia.goi = [];
    expect(await runCliPrompt("việc nền")).toBe("TRA-tk2");
    expect(gia.goi).toEqual(["tk2"]); // tk1 đang hỏng → không gọi thử
    expect((await m.tinhHinhTk()).tai_khoan.find((t) => t.so === 1)?.mat_dang_nhap).toBe(true);
    m.boDauHong(1); // quản trị đăng nhập lại
    gia.tra = {};
    gia.goi = [];
    expect(await runCliPrompt("việc nền")).toBe("TRA-tk1");
  });

  it("401 ở TK1 + TK2 hết hạn mức → tài khoản cá nhân của người hỏi; việc nền hết đường thì giữ câu báo gốc chỉ chỗ đăng nhập lại", async () => {
    const m = await import("@/lib/ai/tai-khoan-claude");
    const { runCliPrompt } = await import("@/lib/ai/providers");
    const { chayVoiNguCanh } = await import("@/lib/ngu-canh");
    m.trangThai(2).het_den = Date.now() + 3600_000;
    gia.tra = { tk1: "401" };
    expect(await chayVoiNguCanh({ thiet_bi: null, nguoi: "u1" }, () => runCliPrompt("câu hỏi"))).toBe("TRA-ca_nhan");
    expect(gia.goi).toEqual(["tk1", "ca_nhan"]);
    gia.goi = [];
    // không còn đường nào → vẫn thử tk1 (401 không tốn token) và giữ câu gốc tiếng Việt chỉ chỗ sửa
    await expect(runCliPrompt("việc nền")).rejects.toThrow(/Phiên đăng nhập Claude đã hết hạn/);
    expect(gia.goi).toEqual(["tk1"]);
    // người có tài khoản cá nhân mà cá nhân cũng hết → câu báo nói đúng lý do mất đăng nhập
    m.trangThaiCaNhan("u1").het_den = Date.now() + 3600_000;
    await expect(chayVoiNguCanh({ thiet_bi: null, nguoi: "u1" }, () => runCliPrompt("câu hỏi"))).rejects.toThrow(/Phiên đăng nhập Claude đã hết hạn|mất đăng nhập/);
  });

  it("gỡ tài khoản cá nhân → không còn dùng; thư mục mỗi người tách riêng", async () => {
    const m = await import("@/lib/ai/tai-khoan-claude");
    expect(m.thuMucCaNhan("u1")).not.toBe(m.thuMucCaNhan("u2"));
    expect(m.thuMucCaNhan("u1")).toBe(m.thuMucCaNhan("u1"));
    expect(m.caNhanDungDuoc("u1")).toBe(true);
    expect(m.caNhanDungDuoc(null)).toBe(false);
    m.xoaMaCaNhan("u1");
    expect(m.maCaNhan("u1")).toBeNull();
    expect(m.caNhanDungDuoc("u1")).toBe(false);
  });
});

describe("kiểm độc lập lần 2 (04/10): nút Thử trợ lý AI + tài khoản đang phục vụ", () => {
  it("Thử trúng hết hạn mức → đánh dấu hết như lượt thật; trúng 401 → mất đăng nhập", async () => {
    const m = await import("@/lib/ai/tai-khoan-claude");
    const { thuTaiKhoan } = await import("@/lib/ai/providers");
    m.luuMaCongTy(2, MA_TK2);
    gia.tra = { tk2: "het" };
    const a = await thuTaiKhoan(2, "quantri");
    expect(a.ok).toBe(false);
    expect(m.trangThai(2).het_den).toBe(4102444800 * 1000); // giờ mở lại đọc từ câu CLI, không đoán
    m.trangThai(2).het_den = 0;
    gia.tra = { tk2: "401" };
    const b = await thuTaiKhoan(2, "quantri");
    expect(b.ok).toBe(false);
    expect(m.dangMatDangNhap(2)).toBe(true);
  });

  it("Thử trả lời được → ok, không đánh dấu gì", async () => {
    const m = await import("@/lib/ai/tai-khoan-claude");
    const { thuTaiKhoan } = await import("@/lib/ai/providers");
    m.luuMaCongTy(2, MA_TK2);
    const r = await thuTaiKhoan(2, "quantri");
    expect(r.ok).toBe(true);
    expect(r.tra_loi).toBe("TRA-tk2");
    expect(m.trangThai(2).het_den).toBe(0);
    expect(m.dangMatDangNhap(2)).toBe(false);
  });

  it("tài khoản đang phục vụ: chính dùng được → chính; chính hết hoặc mất đăng nhập → phụ; cả hai hết → chính", async () => {
    const m = await import("@/lib/ai/tai-khoan-claude");
    m.luuMaCongTy(2, MA_TK2);
    expect(await m.taiKhoanDangDung()).toBe(1);
    m.trangThai(1).dang = 3; // chính đang bận — KHÔNG đổi nhãn (khác chonTaiKhoan)
    expect(await m.taiKhoanDangDung()).toBe(1);
    m.trangThai(1).dang = 0;
    m.trangThai(1).het_den = Date.now() + 3600_000;
    expect(await m.taiKhoanDangDung()).toBe(2);
    m.trangThai(1).het_den = 0;
    await m.danhDauHongDangNhap(1, "Failed to authenticate. API Error: 401");
    expect(await m.taiKhoanDangDung()).toBe(2);
    m.trangThai(2).het_den = Date.now() + 3600_000;
    expect(await m.taiKhoanDangDung()).toBe(1);
  });
});

describe("kiểm độc lập lần 4 (04/10): tài khoản CÁ NHÂN mất đăng nhập cũng được đánh dấu", () => {
  it("nút Thử trúng 401 → đánh dấu (nhớ qua khởi động lại); Thử lại trả lời được → bỏ dấu", async () => {
    const m = await import("@/lib/ai/tai-khoan-claude");
    const { thuTaiKhoan } = await import("@/lib/ai/providers");
    m.luuMaCaNhan("u1", MA_CN);
    gia.tra = { ca_nhan: "401" };
    expect((await thuTaiKhoan({ nguoi: "u1" }, "u1")).ok).toBe(false);
    expect(m.caNhanMatDangNhap("u1")).toBe(true);
    expect(m.trangThaiCaNhan("u1").het_den).toBe(0); // không tính là hết hạn mức
    (globalThis as { __taiKhoanCaNhan?: Map<string, unknown> }).__taiKhoanCaNhan?.delete("u1");
    expect(m.caNhanMatDangNhap("u1")).toBe(true); // ghi đĩa
    gia.tra = {};
    expect((await thuTaiKhoan({ nguoi: "u1" }, "u1")).ok).toBe(true);
    expect(m.caNhanMatDangNhap("u1")).toBe(false);
  });

  it("lượt thật trên tài khoản cá nhân trúng 401 → đánh dấu + câu \"Đăng nhập lại\"; đăng nhập lại thì bỏ dấu", async () => {
    const m = await import("@/lib/ai/tai-khoan-claude");
    const { runCliPrompt } = await import("@/lib/ai/providers");
    const { chayVoiNguCanh } = await import("@/lib/ngu-canh");
    m.luuMaCaNhan("u1", MA_CN);
    m.trangThai(1).het_den = Date.now() + 3600_000;
    m.trangThai(2).het_den = Date.now() + 3600_000;
    gia.tra = { ca_nhan: "401" };
    await expect(chayVoiNguCanh({ thiet_bi: null, nguoi: "u1" }, () => runCliPrompt("câu hỏi"))).rejects.toThrow(/không còn dùng được/);
    expect(m.caNhanMatDangNhap("u1")).toBe(true);
    m.luuMaCaNhan("u1", MA_CN); // đăng nhập lại
    expect(m.caNhanMatDangNhap("u1")).toBe(false);
  });
});
