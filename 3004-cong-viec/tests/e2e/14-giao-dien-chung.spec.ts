// Kiểm giao diện chung cho MỌI trang với nhiều vai: trang mở được, có tiêu đề, không lỗi JS/React,
// không tràn ngang, không ảnh vỡ, nút / ô nhập đều có tên đọc được (trình đọc màn hình),
// và giữ được bố cục ở màn hình nhỏ hơn (laptop 1280, máy tính bảng ngang 1024). Ảnh chụp từng trang đính kèm báo cáo.
import { test, expect, ND, dangNhapApi, type Page } from "./co-so";

const TRANG: { url: string; tieuDe: RegExp }[] = [
  { url: "/", tieuDe: /^Tổng quan$/ },
  { url: "/thu-muc", tieuDe: /^Thư mục$/ },
  { url: "/soan-gui", tieuDe: /^Soạn và gửi$/ },
  { url: "/so-cai", tieuDe: /^Sổ cái$/ },
  { url: "/van-thu", tieuDe: /^Sổ văn bản đến$/ },
  { url: "/lich-su", tieuDe: /^Lịch sử$/ },
  { url: "/mau-word", tieuDe: /^Mẫu Word$/ },
  { url: "/luat-kiem-tra", tieuDe: /^Luật kiểm tra$/ },
  { url: "/ky-nang", tieuDe: /^Kỹ năng AI$/ },
  { url: "/cai-dat", tieuDe: /^Cài đặt$/ },
  { url: "/thong-bao", tieuDe: /^Thông báo$/ },
  { url: "/quan-tri", tieuDe: /^Quản trị( hệ thống)?$/ },
  { url: "/quan-tri/khoa-agent", tieuDe: /^Khóa cho agent$/ },
];

const VAI: { ten: string; email: string }[] = [
  { ten: "quản trị", email: ND.quanTri },
  { ten: "lãnh đạo", email: ND.tgd },
  { ten: "trưởng đơn vị", email: ND.truongDtpc },
  { ten: "nhân viên", email: ND.hungTv },
  { ten: "văn thư", email: ND.vanThu },
  { ten: "chưa gán đơn vị", email: ND.nguoiMoi },
];

/** Các lỗi bố cục / khả năng tiếp cận đo được trong trình duyệt. */
async function doGiaoDien(page: Page) {
  return page.evaluate(() => {
    const hienThi = (e: Element) => {
      const r = (e as HTMLElement).getBoundingClientRect();
      const s = getComputedStyle(e as HTMLElement);
      return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
    };
    const tenDoc = (e: Element) => {
      const h = e as HTMLElement;
      const nhan = h.getAttribute("aria-labelledby")?.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? "").join(" ");
      const labelFor = h.id ? document.querySelector(`label[for="${CSS.escape(h.id)}"]`)?.textContent : "";
      return [h.getAttribute("aria-label"), nhan, h.getAttribute("title"), h.closest("label")?.textContent, labelFor, h.getAttribute("placeholder"), h.textContent, (h as HTMLInputElement).value && h.tagName === "INPUT" && ["submit", "button"].includes((h as HTMLInputElement).type) ? (h as HTMLInputElement).value : ""]
        .map((x) => (x ?? "").trim())
        .find(Boolean);
    };
    const moTa = (e: Element) => {
      const h = e as HTMLElement;
      return `<${h.tagName.toLowerCase()}${h.className && typeof h.className === "string" ? ` class="${h.className.slice(0, 80)}"` : ""}>${(h.outerHTML || "").slice(0, 160)}`;
    };

    const nutKhongTen = [...document.querySelectorAll('button, a[href], [role="button"], [role="switch"], [role="menuitem"], [role="tab"]')]
      .filter(hienThi)
      .filter((e) => !tenDoc(e) && !e.querySelector("img[alt]:not([alt=''])"))
      .map(moTa);
    const oKhongTen = [...document.querySelectorAll('input:not([type="hidden"]):not([type="file"]), select, textarea')]
      .filter(hienThi)
      .filter((e) => !tenDoc(e) && !(e.tagName === "SELECT" && (e as HTMLSelectElement).options[0]?.text.trim()))
      .map(moTa);
    const anhVo = [...document.querySelectorAll("img")].filter((i) => i.complete && i.naturalWidth === 0 && hienThi(i)).map((i) => i.src);
    const tranNgang = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    return { nutKhongTen, oKhongTen, anhVo, tranNgang };
  });
}

for (const vai of VAI) {
  test.describe(`Mọi trang — vai ${vai.ten}`, () => {
    for (const t of TRANG) {
      test(`${t.url}`, async ({ page, context }, info) => {
        await dangNhapApi(context, vai.email);
        const r = await page.goto(t.url);
        expect(r?.status(), "mã trả về của trang").toBeLessThan(400);
        await expect(page.getByRole("heading", { level: 1, name: t.tieuDe }).first()).toBeVisible({ timeout: 60_000 });
        // Chờ dữ liệu tải xong (hết chữ "Đang tải…/Đang mở…/Đang đọc…")
        await expect(page.locator("main").getByText(/^Đang (tải|mở|đọc)[^]{0,60}…$/)).toHaveCount(0, { timeout: 60_000 });
        await expect(page.locator("nextjs-portal")).toHaveCount(0);

        const kq = await doGiaoDien(page);
        await info.attach(`${vai.ten}${t.url.replace(/\//g, "_")}.png`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
        expect.soft(kq.tranNgang, "trang bị tràn ngang (có thanh cuộn ngang)").toBeLessThanOrEqual(1);
        expect.soft(kq.anhVo, "ảnh không tải được").toEqual([]);
        expect.soft(kq.nutKhongTen, "nút/liên kết không có tên đọc được (thiếu chữ, aria-label hoặc title)").toEqual([]);
        expect.soft(kq.oKhongTen, "ô nhập không có nhãn (label, aria-label, placeholder hoặc title)").toEqual([]);
      });
    }
  });
}

test.describe("Bố cục ở màn hình nhỏ hơn", () => {
  for (const kho of [
    { ten: "laptop 1280×720", width: 1280, height: 720 },
    { ten: "máy tính bảng ngang 1024×768", width: 1024, height: 768 },
  ]) {
    test(`${kho.ten}: không trang nào tràn ngang`, async ({ page, context }) => {
      await page.setViewportSize({ width: kho.width, height: kho.height });
      await dangNhapApi(context, ND.quanTri);
      for (const t of TRANG) {
        await page.goto(t.url);
        await expect(page.getByRole("heading", { level: 1, name: t.tieuDe }).first()).toBeVisible({ timeout: 60_000 });
        await expect(page.locator("main").getByText(/^Đang (tải|mở|đọc)[^]{0,60}…$/)).toHaveCount(0, { timeout: 60_000 });
        const tran = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect.soft(tran, `${t.url} tràn ngang ở ${kho.width}px`).toBeLessThanOrEqual(1);
      }
    });
  }
});

test("dùng bàn phím: Tab đi qua được các mục thanh bên và thấy được ô đang chọn", async ({ page, context }) => {
  await dangNhapApi(context, ND.hungTv);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Tổng quan" })).toBeVisible();
  const daQua = new Set<string>();
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press("Tab");
    const ten = await page.evaluate(() => {
      const e = document.activeElement as HTMLElement | null;
      return e && e !== document.body ? (e.getAttribute("title") || e.textContent || "").trim() : "";
    });
    if (ten) daQua.add(ten);
  }
  for (const muc of ["Thư mục", "Sổ cái", "Lịch sử"]) expect([...daQua].some((t) => t.includes(muc)), `Tab tới được "${muc}"`).toBeTruthy();
});
