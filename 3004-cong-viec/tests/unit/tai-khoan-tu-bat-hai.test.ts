// T5 — MỖI AGENT 2 TÀI KHOẢN CLAUDE ĐỘC LẬP, THAY PHIÊN (Mr. Đại chốt 18/10/2026): đăng nhập TK2 xong → tự BẬT "Dùng 2 tài khoản"
// ở Cài đặt → AI (CSDL); đăng xuất TK2 → tự TẮT; TK1 không đụng ô này. Không bắt bấm thêm (luật bớt cú bấm).
// CSDL RAM (DOCFLOW_DB=memory); lớp đăng nhập link + kiểm CLI là giả — không đăng nhập thật, không gọi CLI thật; thư mục đăng
// nhập nằm trong thư mục tạm (DOCFLOW_AI_DATA).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { NguoiDungPhien } from "@/lib/types";

const tam = fs.mkdtempSync(path.join(os.tmpdir(), "docflow-tu-bat-hai-"));
process.env.DOCFLOW_AI_DATA = tam;

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
vi.mock("@/lib/ai/dang-nhap-link", async (goc) => ({
  ...((await goc()) as object),
  guiMaDangNhap: async () => ({ ok: true, message: "Đã đăng nhập." }),
  huyDangNhapLink: () => {},
}));
vi.mock("@/lib/ai/providers", async (goc) => ({
  ...((await goc()) as object),
  checkCliStatus: async () => ({ installed: true, loggedIn: true, email: "tk@vi.du", tenGoi: "Max" }),
  resetClaudeBinaryCache: () => {},
}));
vi.mock("@/lib/ai/cli-setup", async (goc) => ({
  ...((await goc()) as object),
  logoutCli: () => ({ ok: true, message: "Đã đăng xuất." }),
}));

import { csdlMoi, nguoi } from "../helpers/csdl";
import { layQ } from "@/lib/db";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { POST } from "@/app/api/ai/tai-khoan/route";
import { quenCauHinhTk, thuMucTk } from "@/lib/ai/tai-khoan-claude";

const MA = "MaDangNhapThu_" + "a".repeat(30);
async function goi(body: Record<string, unknown>) {
  const r = await POST(new Request("http://localhost/api/ai/tai-khoan", { method: "POST", body: JSON.stringify(body) }));
  return (await r.json()) as { ok: boolean; message?: string };
}
const hai = async () => !!(await layCauHinh(await layQ(), "ai")).hai_tai_khoan;

beforeAll(async () => {
  await csdlMoi();
  phien.nd = await nguoi("quantri@scigroup.vn");
});
beforeEach(() => quenCauHinhTk());

describe("hai tài khoản Claude riêng của agent Công việc", () => {
  it("đăng nhập TK2 → tự bật «Dùng 2 tài khoản» (ghi CSDL); đăng nhập lại khi đã bật thì không báo gì thêm", async () => {
    expect(await hai()).toBe(false);
    const r = await goi({ so: 2, action: "nhap_ma", ma: MA });
    expect(r.ok).toBe(true);
    expect(r.message).toContain("Đã tự bật «Dùng 2 tài khoản Claude».");
    expect(await hai()).toBe(true);
    const lai = await goi({ so: 2, action: "nhap_ma", ma: MA });
    expect(lai.message).not.toContain("Đã tự bật");
  });

  it("đăng xuất TK2 → tự tắt; TK1 đăng nhập không đụng ô này", async () => {
    fs.writeFileSync(path.join(thuMucTk(2), ".credentials.json"), "{}");
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
