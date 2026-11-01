// Hai tài khoản Claude (Mr. Đại chốt 02/10/2026): vai chính/phụ, đảo vai 24 giờ, chọn tài khoản khi bận / hết hạn mức.
import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const goc = fs.mkdtempSync(path.join(os.tmpdir(), "tk-claude-"));
beforeAll(() => {
  process.env.DOCFLOW_AI_DATA = goc;
});

const ch = (x: Partial<{ hai_tai_khoan: boolean; dao_vai_24h: boolean }> = {}) => ({ hai_tai_khoan: true, dao_vai_24h: false, moi_phien_bat: false, moi_phien_gio: "07:00", ...x });

describe("hai tài khoản Claude", () => {
  it("tài khoản chính: tắt đảo vai → luôn 1; bật → đổi theo ngày giờ Việt Nam", async () => {
    const { taiKhoanChinh } = await import("@/lib/ai/tai-khoan-claude");
    expect(taiKhoanChinh(ch(), Date.UTC(2026, 9, 2, 3))).toBe(1);
    const a = taiKhoanChinh(ch({ dao_vai_24h: true }), Date.UTC(2026, 9, 2, 3));
    const b = taiKhoanChinh(ch({ dao_vai_24h: true }), Date.UTC(2026, 9, 3, 3));
    expect(a).not.toBe(b);
    // 23:30 giờ VN ngày 02/10 và 00:30 giờ VN ngày 03/10 là hai ngày khác nhau
    expect(taiKhoanChinh(ch({ dao_vai_24h: true }), Date.UTC(2026, 9, 2, 16, 30))).toBe(a);
    expect(taiKhoanChinh(ch({ dao_vai_24h: true }), Date.UTC(2026, 9, 2, 17, 30))).toBe(b);
    expect(taiKhoanChinh(ch({ hai_tai_khoan: false, dao_vai_24h: true }))).toBe(1);
  });

  it("nhận ra lỗi hết hạn mức (tiếng Việt và câu gốc của CLI)", async () => {
    const { laLoiHetLuot } = await import("@/lib/ai/tai-khoan-claude");
    expect(laLoiHetLuot("Tài khoản Claude đã dùng hết lượt cho giờ này.")).toBe(true);
    expect(laLoiHetLuot("Claude AI usage limit reached|1759380000")).toBe(true);
    expect(laLoiHetLuot("Claude CLI không phản hồi sau 420 giây")).toBe(false);
  });

  it("chọn tài khoản: tk2 chưa đăng nhập → 1; đăng nhập rồi: chính bận thì phụ đỡ; hết hạn mức thì chuyển", async () => {
    const m = await import("@/lib/ai/tai-khoan-claude");
    (globalThis as { __taiKhoanCauHinh?: unknown }).__taiKhoanCauHinh = { luc: Date.now(), ch: ch() };
    expect(await m.chonTaiKhoan()).toBe(1); // chưa có đăng nhập tài khoản 2
    fs.writeFileSync(path.join(m.thuMucTk(2), ".credentials.json"), "{}");
    expect(await m.chonTaiKhoan()).toBe(1); // cả hai rảnh → chính
    m.trangThai(1).dang = 1;
    expect(await m.chonTaiKhoan()).toBe(2); // chính bận, phụ rảnh → phụ
    m.trangThai(1).dang = 0;
    await m.danhDauHet(1, "Claude AI usage limit reached|4102444800"); // giờ mở lại do CLI báo
    expect(m.trangThai(1).het_den).toBe(4102444800 * 1000);
    expect(await m.chonTaiKhoan()).toBe(2);
    m.trangThai(1).het_den = 0;
    (globalThis as { __taiKhoanCauHinh?: unknown }).__taiKhoanCauHinh = { luc: Date.now(), ch: ch({ hai_tai_khoan: false }) };
    m.trangThai(1).dang = 1;
    expect(await m.chonTaiKhoan()).toBe(1); // tắt 2 tài khoản → luôn 1
  });
});
