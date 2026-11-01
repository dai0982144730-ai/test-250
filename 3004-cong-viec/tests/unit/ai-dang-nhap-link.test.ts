// ĐĂNG NHẬP CLAUDE BẰNG LINK + DÁN MÃ (Mr. Đại chốt 04/10/2026 trưa) — lib/ai/dang-nhap-link.ts + tài khoản cá nhân đăng nhập bằng link.
// CLI là GIẢ (một script node qua file .cmd, chạy THẬT như tiến trình con) — bắt chước đúng hành vi đo được của `claude auth login`
// 04/10: in link rồi chờ "Paste code here"; mã đúng → ghi .credentials.json, thoát 0; mã sai → "Login failed: … status code 400", thoát 1.
// Không đụng Claude thật, không đụng tài khoản thật (DOCFLOW_AI_DATA = thư mục tạm).
import { describe, it, expect, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tam = fs.mkdtempSync(path.join(os.tmpdir(), "docflow-dang-nhap-link-"));
process.env.DOCFLOW_AI_DATA = path.join(tam, "data");
fs.mkdirSync(process.env.DOCFLOW_AI_DATA, { recursive: true });

const MA_DUNG = "ma-dung-thu-nghiem#state-abc";
const js = path.join(tam, "gia-claude.js");
fs.writeFileSync(
  js,
  `const fs = require("fs"), path = require("path");
const a = process.argv.slice(2);
if (a[0] !== "auth" || a[1] !== "login") process.exit(2);
const dir = process.env.CLAUDE_CONFIG_DIR;
fs.writeFileSync(path.join(dir, "browser.txt"), process.env.BROWSER || "");
process.stdout.write("Opening browser to sign in…\\nIf the browser didn't open, visit: https://claude.com/cai/oauth/authorize?code=true&client_id=x&state=abc\\nPaste code here if prompted > ");
let buf = "";
process.stdin.on("data", (d) => {
  buf += d;
  if (!buf.includes("\\n")) return;
  if (buf.trim() === ${JSON.stringify(MA_DUNG)}) {
    fs.writeFileSync(path.join(dir, ".credentials.json"), "{}");
    process.stdout.write("Login successful.\\n");
    process.exit(0);
  }
  process.stderr.write("Login failed: Request failed with status code 400\\n");
  process.exit(1);
});
`,
);
const bin = path.join(tam, process.platform === "win32" ? "claude.cmd" : "claude");
if (process.platform === "win32") fs.writeFileSync(bin, `@node "${js}" %*\r\n`);
else fs.writeFileSync(bin, `#!/bin/sh\nexec node "${js}" "$@"\n`, { mode: 0o755 });
process.env.ANTHROPIC_SUB_CLI_PATH = bin;

afterAll(() => {
  try {
    fs.rmSync(tam, { recursive: true, force: true });
  } catch {
    /* Windows còn giữ file thì thôi */
  }
});

describe("đăng nhập Claude bằng link + dán mã (04/10 trưa)", () => {
  it("chuẩn hoá mã dán: bỏ khoảng trắng / xuống dòng, chỉ nhận ký tự của mã", async () => {
    const m = await import("@/lib/ai/dang-nhap-link");
    expect(m.chuanHoaMaLink("  abcDEF123_-.~#xyz789 \n")).toBe("abcDEF123_-.~#xyz789");
    expect(m.chuanHoaMaLink("ab#c")).toBeNull(); // quá ngắn
    expect(m.chuanHoaMaLink("abcdefghij & del *.*")).toBeNull(); // ký tự lạ
    expect(m.chuanHoaMaLink(null)).toBeNull();
  });

  it("mở link: trả đúng link đăng nhập, chặn máy chủ tự bật trình duyệt (BROWSER = lệnh rỗng)", async () => {
    const m = await import("@/lib/ai/dang-nhap-link");
    const dir = path.join(tam, "tk-a");
    const r = await m.moDangNhapLink("tk-a", dir);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.url).toBe("https://claude.com/cai/oauth/authorize?code=true&client_id=x&state=abc");
    await new Promise((x) => setTimeout(x, 200));
    const browser = fs.readFileSync(path.join(dir, "browser.txt"), "utf8");
    expect(browser).toMatch(process.platform === "win32" ? /sci-trinh-duyet-rong\.cmd$/ : /^true$/);
    m.huyDangNhapLink("tk-a");
  }, 30_000);

  it("dán mã đúng → CLI ghi file đăng nhập vào thư mục tài khoản", async () => {
    const m = await import("@/lib/ai/dang-nhap-link");
    const dir = path.join(tam, "tk-b");
    expect((await m.moDangNhapLink("tk-b", dir)).ok).toBe(true);
    const r = await m.guiMaDangNhap("tk-b", MA_DUNG);
    expect(r).toEqual({ ok: true, message: "Đã đăng nhập." });
    expect(fs.existsSync(path.join(dir, ".credentials.json"))).toBe(true);
  }, 30_000);

  it("dán mã sai → câu tiếng Việt, lượt đăng nhập kết thúc (phải lấy link mới)", async () => {
    const m = await import("@/lib/ai/dang-nhap-link");
    const dir = path.join(tam, "tk-c");
    expect((await m.moDangNhapLink("tk-c", dir)).ok).toBe(true);
    const r = await m.guiMaDangNhap("tk-c", "ma-sai-thu-nghiem#state-abc");
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/^Mã không đúng hoặc đã quá hạn/);
    expect(fs.existsSync(path.join(dir, ".credentials.json"))).toBe(false);
    const lai = await m.guiMaDangNhap("tk-c", MA_DUNG);
    expect(lai.message).toMatch(/đã hết hạn — bấm Đăng nhập Claude để lấy link mới/);
  }, 30_000);

  it("nới bộ lọc mã: nhận = % / + (dạng mã thật chưa thấy — kiểm độc lập lần 2 #5)", async () => {
    const m = await import("@/lib/ai/dang-nhap-link");
    expect(m.chuanHoaMaLink("abcDEF123%2B/xyz+uvw==#state_9")).toBe("abcDEF123%2B/xyz+uvw==#state_9");
    expect(m.chuanHoaMaLink("abcdefghij&calc")).toBeNull();
    expect(m.chuanHoaMaLink('abcdefghij"x')).toBeNull();
  });

  it("trần tổng 5 lượt chờ cùng lúc; lượt thứ 6 nhận câu tiếng Việt, không chạy thêm tiến trình", async () => {
    const m = await import("@/lib/ai/dang-nhap-link");
    const khoa = [1, 2, 3, 4, 5].map((i) => `tran-${i}`);
    for (const k of khoa) expect((await m.moDangNhapLink(k, path.join(tam, k))).ok).toBe(true);
    const r = await m.moDangNhapLink("tran-6", path.join(tam, "tran-6"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/^Đang có 5 lượt đăng nhập Claude chờ dán mã cùng lúc \(tối đa 5\)/);
    expect(fs.existsSync(path.join(tam, "tran-6"))).toBe(false);
    // người đã có lượt bấm lại thì lượt cũ được thay, không bị trần chặn
    expect((await m.moDangNhapLink("tran-1", path.join(tam, "tran-1"))).ok).toBe(true);
    for (const k of khoa) m.huyDangNhapLink(k);
  }, 60_000);

  it("câu báo hỏng không ghép nguyên văn tiếng Anh của CLI", async () => {
    const m = await import("@/lib/ai/dang-nhap-link");
    const r = await m.moDangNhapLink("tk-loi", path.join(tam, "tk-loi"));
    expect(r.ok).toBe(true);
    const sai = await m.guiMaDangNhap("tk-loi", "ma-sai-thu-nghiem#state-abc");
    expect(sai.message).not.toMatch(/Login failed|Request failed|status code/i);
  }, 30_000);

  it("chưa bấm Đăng nhập mà gửi mã → báo hết hạn, không chạy gì", async () => {
    const m = await import("@/lib/ai/dang-nhap-link");
    const r = await m.guiMaDangNhap("tk-khong-co", MA_DUNG);
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/^Lượt đăng nhập này đã hết hạn/);
  });

  it("tài khoản cá nhân đăng nhập bằng link: dùng được, không cần mã dán; đăng xuất xoá file đăng nhập", async () => {
    const tk = await import("@/lib/ai/tai-khoan-claude");
    const m = await import("@/lib/ai/dang-nhap-link");
    expect(tk.coDangNhapCaNhan("u-link")).toBe(false);
    expect(tk.caNhanDungDuoc("u-link")).toBe(false);
    expect((await m.moDangNhapLink("ca_nhan:u-link", tk.thuMucCaNhan("u-link"))).ok).toBe(true);
    expect((await m.guiMaDangNhap("ca_nhan:u-link", MA_DUNG)).ok).toBe(true);
    tk.daDangNhapLinkCaNhan("u-link");
    expect(tk.kieuCaNhan("u-link")).toBe("cua_so");
    expect(tk.caNhanDungDuoc("u-link")).toBe(true);
    expect(tk.maChayCaNhan("u-link")).toBeUndefined(); // CLI đọc file, không truyền mã
    // hết hạn mức → mốc ghi đĩa riêng (không có file mã để ghi kèm), khởi động lại vẫn nhớ
    tk.danhDauHetCaNhan("u-link", "Claude AI usage limit reached|4102444800");
    expect(tk.caNhanDungDuoc("u-link")).toBe(false);
    expect(fs.existsSync(path.join(tk.thuMucCaNhan("u-link"), "sci-het-han-muc.json"))).toBe(true);
    tk.xoaMaCaNhan("u-link");
    expect(tk.coDangNhapCaNhan("u-link")).toBe(false);
    expect(fs.existsSync(path.join(tk.thuMucCaNhan("u-link"), ".credentials.json"))).toBe(false);
  }, 30_000);

  it("tài khoản công ty đăng nhập bằng link: bỏ mã dán cũ + mốc hết hạn mức / mất đăng nhập cũ", async () => {
    const tk = await import("@/lib/ai/tai-khoan-claude");
    tk.luuMaCongTy(2, "sk-ant-oat01-" + "Z".repeat(60));
    tk.trangThai(2).het_den = Date.now() + 3600_000;
    tk.trangThai(2).hong_den = Date.now() + 3600_000;
    fs.writeFileSync(path.join(tk.thuMucTk(2), ".credentials.json"), "{}"); // CLI vừa ghi sau khi dán mã đúng
    tk.daDangNhapLinkCongTy(2);
    expect(tk.kieuDangNhap(2)).toBe("cua_so");
    expect(tk.maChay(2)).toBeUndefined();
    expect(tk.trangThai(2).het_den).toBe(0);
    expect(tk.trangThai(2).hong_den).toBe(0);
  });
});
