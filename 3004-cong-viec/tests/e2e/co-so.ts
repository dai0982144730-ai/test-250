// Nền dùng chung cho mọi test e2e: người dùng mẫu, đăng nhập nhanh, mở trang theo vai,
// canh lỗi giao diện (lỗi JS, lỗi React trong console, màn lỗi của Next) — test nào làm trang lỗi là trượt.
import fs from "node:fs";
import path from "node:path";
import { test as goc, expect, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test";

export { expect };
export type { Page, Locator };

export const MAT_KHAU = "Sci@2026";

/** Người dùng mẫu gieo sẵn (src/lib/khoi-tao.ts). */
export const ND = {
  quanTri: "quantri@scigroup.vn",
  tgd: "tgd@scigroup.vn",
  phoTgd: "photgd@scigroup.vn",
  truongDtpc: "truong.dtpc@scigroup.vn",
  nvDtpc: "nv.dtpc@scigroup.vn",
  truongKtvh: "truong.ktvh@scigroup.vn",
  hungTv: "hung.tv@scigroup.vn",
  truongHcth: "truong.hcth@scigroup.vn",
  vanThu: "vanthu@scigroup.vn",
  truongTckt: "truong.tckt@scigroup.vn",
  gdPmc: "gd.pmc@scigroup.vn",
  gdEnc: "gd.enc@scigroup.vn",
  nvEnc: "nv.enc@scigroup.vn",
  gdBqlda: "gd.bqlda@scigroup.vn",
  nvBqlda: "nv.bqlda@scigroup.vn",
  gdNamXe: "gd.namxe@scigroup.vn",
  nguoiMoi: "nguoimoi@scigroup.vn",
} as const;

export const GOC = process.cwd();
export const THU_MUC_VI_DU = path.join(GOC, "mau-word", "vi-du");
export const MIME_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Đường dẫn file ví dụ trong mau-word/vi-du. */
export const viDu = (ten: string) => path.join(THU_MUC_VI_DU, ten);

/** File ví dụ nhưng đổi tên (để tên tài liệu không trùng giữa các test). */
export function viDuDoiTen(ten: string, tenMoi: string) {
  return { name: tenMoi, mimeType: MIME_DOCX, buffer: fs.readFileSync(viDu(ten)) };
}

/** Chuỗi ngắn riêng cho mỗi lần chạy — gắn vào tên tài liệu, thư mục, người dùng... */
export const MA_CHAY = Date.now().toString(36).slice(-5);

/** Đăng nhập bằng API (nhanh), cookie phiên nằm trong context. */
export async function dangNhapApi(ctx: BrowserContext, email: string, matKhau = MAT_KHAU) {
  const r = await ctx.request.post("/api/auth/login", { data: { email, mat_khau: matKhau } });
  expect(r.ok(), `đăng nhập ${email}: ${r.status()} ${await r.text()}`).toBeTruthy();
}

// ---------- Canh lỗi giao diện ----------

/** Lỗi console bỏ qua: tải tài nguyên 4xx (test quyền cố ý gọi API bị từ chối), thông điệp riêng của next dev. */
const BO_QUA_CONSOLE: RegExp[] = [
  /Failed to load resource/i,
  /Download the React DevTools/i,
  /\[Fast Refresh\]/i,
  /\[HMR\]/i,
  /webpack-hmr/i,
  /net::ERR_ABORTED/i,
];

type LoiTrang = { loai: string; noi_dung: string; url: string };

export function canhLoi(page: Page, ds: LoiTrang[]) {
  page.on("pageerror", (e) => ds.push({ loai: "Lỗi JS", noi_dung: `${e.message}\n${e.stack ?? ""}`, url: page.url() }));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    if (BO_QUA_CONSOLE.some((r) => r.test(t))) return;
    ds.push({ loai: "console.error", noi_dung: t, url: page.url() });
  });
}

type CoSo = {
  /** Mở một trang mới đã đăng nhập bằng email cho sẵn (context riêng, tự đóng khi test xong). */
  moTrang: (email: string, matKhau?: string) => Promise<Page>;
  /** Danh sách lỗi giao diện đã bắt được trong test (tự kiểm cuối test). */
  loiGiaoDien: LoiTrang[];
  /** Mẫu lỗi console test này chấp nhận (vd test cố ý làm hỏng một yêu cầu). */
  choPhepLoi: RegExp[];
};

export const test = goc.extend<CoSo>({
  choPhepLoi: [[], { option: true }],
  loiGiaoDien: async ({}, use) => {
    await use([]);
  },
  page: async ({ page, loiGiaoDien }, use) => {
    canhLoi(page, loiGiaoDien);
    await use(page);
  },
  moTrang: async ({ browser, loiGiaoDien }, use) => {
    const mo: BrowserContext[] = [];
    await use(async (email, matKhau) => {
      const ctx = await moContext(browser);
      mo.push(ctx);
      await dangNhapApi(ctx, email, matKhau);
      const p = await ctx.newPage();
      canhLoi(p, loiGiaoDien);
      return p;
    });
    for (const c of mo) await c.close().catch(() => undefined);
  },
});

// Kiểm cuối mỗi test: trang không có lỗi JS / lỗi React, không hiện màn lỗi của Next
test.afterEach(async ({ loiGiaoDien, choPhepLoi }, info) => {
  const con = loiGiaoDien.filter((l) => !choPhepLoi.some((r) => r.test(l.noi_dung)));
  if (con.length) {
    await info.attach("loi-giao-dien.txt", { body: con.map((l) => `[${l.loai}] ${l.url}\n${l.noi_dung}`).join("\n\n") });
  }
  expect(con.map((l) => `[${l.loai}] ${l.noi_dung.split("\n")[0]}`), "Trang có lỗi JS/React trong lúc test").toEqual([]);
});

async function moContext(browser: Browser) {
  const cfg = test.info().project.use;
  return browser.newContext({ baseURL: cfg.baseURL, locale: cfg.locale, timezoneId: cfg.timezoneId, viewport: cfg.viewport });
}

// ---------- Tiện ích thao tác ----------

/** Thanh bên ứng dụng (có logo SCI công việc) — khác thanh cây thư mục cũng là <aside>. */
export const thanhBen = (page: Page) => page.locator("aside").first();

/** Trang Thư mục: cây thư mục (aside thứ hai), vùng nội dung, dòng tài liệu theo tên. */
export const tm = {
  cay: (page: Page) => page.getByRole("complementary").filter({ hasText: "Công ty CP SCI" }),
  noiDung: (page: Page) => page.locator("main section").first(),
  dong: (page: Page, ten: string) => page.locator("main section").first().getByRole("row").filter({ hasText: ten }),
};

/** Hộp thoại dạng HopThoai (div cố định, không có role) có chứa chữ cho trước. */
export const hopThoai = (page: Page, chu: string | RegExp) => page.locator("div.fixed.inset-0").filter({ hasText: chu }).last();

/** Chờ trang không còn dòng "Đang tải…". */
export async function choTaiXong(vung: Page | Locator) {
  await expect(vung.getByText(/^Đang (tải|mở|đọc)[^]*…$/).first()).toBeHidden({ timeout: 60_000 });
}

/** Mã tài liệu trong URL /tai-lieu/<id>. */
export function maTuUrl(href: string | null): string {
  const m = href?.match(/\/tai-lieu\/([^/?#]+)/);
  if (!m) throw new Error("Không đọc được mã tài liệu từ " + href);
  return decodeURIComponent(m[1]);
}

/** Mở trang và chờ tiêu đề h1. */
export async function moVaChoTieuDe(page: Page, url: string, tieuDe: string | RegExp) {
  await page.goto(url);
  await expect(page.getByRole("heading", { level: 1, name: tieuDe })).toBeVisible({ timeout: 60_000 });
}
