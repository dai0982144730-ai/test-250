// T5 — MỖI AGENT 2 TÀI KHOẢN CLAUDE ĐỘC LẬP, THAY PHIÊN (Mr. Đại chốt 18/10/2026: "con nào chết thì tự chết không ảnh hưởng tới con
// khác", "không cần kết nối ở main").
//   (a) không còn cửa đổi tài khoản MẶC ĐỊNH của máy chủ — "mo_link" kèm mac_dinh vẫn chỉ đăng nhập vào thư mục RIÊNG của agent;
//   (b) đăng nhập TK2 xong → tự BẬT "Dùng 2 tài khoản"; đăng xuất TK2 → tự TẮT; TK1 không đụng ô này.
// CÙNG MỘT FILE ở Main · Tiến độ · Hợp đồng · Quan sát. Không đăng nhập thật, không gọi CLI thật: lớp đăng nhập link + kiểm CLI là
// giả; thư mục đăng nhập nằm trong bản sao dữ liệu tạm (moi-truong-ai.ts: VITEST).
import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const gia = vi.hoisted(() => ({ moLink: [] as unknown[][] }));

vi.mock("@/lib/route-auth", async (goc) => {
  return {
    ...((await goc()) as object),
    requireRole: async () => ({ ok: true, session: { email: "quantri@sci.vn", role: "admin", name: "thu" } }),
  };
});
vi.mock("@/lib/ai/dang-nhap-link", async (goc) => ({
  ...((await goc()) as object),
  moDangNhapLink: async (...args: unknown[]) => {
    gia.moLink.push(args);
    return { ok: true, url: "https://claude.ai/oauth/authorize?thu=1" };
  },
  guiMaDangNhap: async () => ({ ok: true, message: "Đã đăng nhập." }),
  huyDangNhapLink: () => {},
}));
vi.mock("@/lib/ai/providers", async (goc) => ({
  ...((await goc()) as object),
  checkCliStatus: async () => ({ installed: true, loggedIn: true, email: "tk@vi.du", tenGoi: "Max" }),
  resetClaudeBinaryCache: () => {},
  khoiDongMoiPhien: () => {},
}));

import { POST } from "@/app/api/ai/tai-khoan/route";
import * as tk from "@/lib/ai/tai-khoan-claude";

const MA = "MaDangNhapThu_" + "a".repeat(30);
async function goi(body: Record<string, unknown>) {
  const r = await POST(new Request("http://localhost/api/ai/tai-khoan", { method: "POST", body: JSON.stringify(body) }));
  return (await r.json()) as { ok: boolean; message?: string };
}
const hai = async () => {
  tk.quenCauHinhTk();
  return (await tk.cauHinhTk()).hai_tai_khoan;
};

beforeEach(async () => {
  gia.moLink.length = 0;
  await tk.luuCauHinhTk({ hai_tai_khoan: false });
});

describe("hai tài khoản Claude riêng của agent — không qua Main", () => {
  it("không còn cửa đổi tài khoản mặc định của máy chủ", async () => {
    expect("thuMucMacDinhMay" in tk).toBe(false);
    const r = await goi({ so: 1, action: "mo_link", mac_dinh: true });
    expect(r.ok).toBe(true);
    expect(gia.moLink).toHaveLength(1);
    // Chỉ (khoá, thư mục RIÊNG tk1) — không có cờ "đổi tài khoản của máy", không trỏ ~/.claude
    expect(gia.moLink[0]).toHaveLength(2);
    expect(gia.moLink[0][0]).toBe("tk1");
    expect(String(gia.moLink[0][1])).toBe(tk.thuMucTk(1));
  });

  it("đăng nhập TK2 → tự bật «Dùng 2 tài khoản»; đăng nhập lại khi đã bật thì không báo gì thêm", async () => {
    expect(await hai()).toBe(false);
    const r = await goi({ so: 2, action: "nhap_ma", ma: MA });
    expect(r.ok).toBe(true);
    expect(r.message).toContain("Đã tự bật «Dùng 2 tài khoản Claude».");
    expect(await hai()).toBe(true);
    const lai = await goi({ so: 2, action: "nhap_ma", ma: MA });
    expect(lai.message).not.toContain("Đã tự bật");
    expect(await hai()).toBe(true);
  });

  it("đăng xuất TK2 → tự tắt; đăng nhập / đăng xuất TK1 không đụng ô này", async () => {
    await tk.luuCauHinhTk({ hai_tai_khoan: true });
    const dir2 = tk.thuMucTk(2);
    fs.writeFileSync(path.join(dir2, ".credentials.json"), "{}");
    const r = await goi({ so: 2, action: "logout" });
    expect(r.ok).toBe(true);
    expect(r.message).toContain("Đã tự tắt «Dùng 2 tài khoản Claude».");
    expect(await hai()).toBe(false);

    const tk1 = await goi({ so: 1, action: "nhap_ma", ma: MA });
    expect(tk1.ok).toBe(true);
    expect(tk1.message).not.toContain("Dùng 2 tài khoản");
    expect(await hai()).toBe(false);
  });
});
