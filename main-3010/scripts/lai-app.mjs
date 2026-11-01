// ============================================================
// LÁI APP — bộ điều khiển ứng dụng bằng trình duyệt thật (Playwright)
//
// Vì sao cần: luật bắt buộc là "sửa xong màn nào thì MỞ TRÌNH DUYỆT xem màn
// đó, đừng chỉ dựa vào biên dịch sạch". Bộ này để tự mở, tự bấm, tự chụp —
// và quan trọng nhất: BẮT LỖI CONSOLE mà mắt người nhìn màn hình không thấy.
//
// ── CÁC LỆNH ────────────────────────────────────────────────
//   node scripts/lai-app.mjs anh   <route> [--ten <tên>]   chụp ảnh một trang
//   node scripts/lai-app.mjs chu   <route>                 đổ chữ hiện trên trang
//   node scripts/lai-app.mjs menu                          liệt kê menu trái
//   node scripts/lai-app.mjs bam   <route> "<chữ trên nút>" bấm rồi chụp
//   node scripts/lai-app.mjs quet  [route1 route2 …]       quét nhiều trang
//   node scripts/lai-app.mjs demo  <tên-demo>              chụp file demo HTML
//
// ── TUỲ CHỌN ────────────────────────────────────────────────
//   --cong <số>      cổng app            (mặc định 3010)
//   --rong <số>      bề ngang cửa sổ     (mặc định 1600)
//   --cao  <số>      chiều cao cửa sổ    (mặc định 1000)
//   --sang           chụp ở giao diện SÁNG (mặc định tối)
//   --hien           mở cửa sổ thật, không chạy ẩn
//   --cho <ms>       chờ thêm trước khi chụp (mặc định 900)
//
// Ảnh lưu ở  anh-chup/<tên>.png
// ============================================================

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const THU_MUC_ANH = path.join(GOC, "anh-chup");
const PHIEN = path.join(THU_MUC_ANH, ".phien-dang-nhap.json");

// ── Đọc tham số ───────────────────────────────────────────────
const args = process.argv.slice(2);
const lenh = args[0] ?? "";

// Tách tham số VỊ TRÍ khỏi tuỳ chọn.
// ⚠ Phải bỏ cả GIÁ TRỊ đi sau mỗi --tuỳ-chọn, không chỉ bỏ mỗi cái tên.
//   Lọc kiểu `args.filter(a => !a.startsWith("--"))` sẽ giữ lại "DANH-BA" và
//   "6000" của `--ten DANH-BA --cho 6000`, rồi lệnh `bam` gộp chúng vào chữ
//   cần bấm và không tìm thấy gì. Đã vấp đúng lỗi này 05/09.
const CO_GIA_TRI = new Set(["--cong", "--rong", "--cao", "--cho", "--ten", "--tep"]);
const viTri = [];
for (let i = 0; i < args.length; i += 1) {
  const a = args[i];
  if (a.startsWith("--")) {
    if (CO_GIA_TRI.has(a)) i += 1; // bỏ luôn giá trị đi kèm
    continue;
  }
  viTri.push(a);
}
function co(ten) {
  return args.includes(`--${ten}`);
}
function lay(ten, mac) {
  const i = args.indexOf(`--${ten}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : mac;
}

const CONG = Number(lay("cong", "3010"));
const GOC_URL = `http://localhost:${CONG}`;
const RONG = Number(lay("rong", "1600"));
const CAO = Number(lay("cao", "1000"));
const CHO_THEM = Number(lay("cho", "900"));
const AN = !co("hien");
const GIAO_DIEN = co("sang") ? "light" : "dark";

// Tài khoản demo — chính trang /login in sẵn ba tài khoản này ở cuối trang.
// Không cần đi xin mật khẩu (xem HUONG-DAN-TEST.md mục 1).
const EMAIL = process.env.EMAIL_TEST ?? "dai@sci.vn";
const MAT_KHAU = process.env.MAT_KHAU_TEST ?? "Sci@2026";

fs.mkdirSync(THU_MUC_ANH, { recursive: true });

// ── Gom lỗi trên trang ────────────────────────────────────────
function theoDoiLoi(page, so) {
  page.on("console", (m) => {
    if (m.type() === "error") so.loiConsole.push(m.text().slice(0, 300));
  });
  page.on("pageerror", (e) => so.loiTrang.push(String(e).slice(0, 300)));
  page.on("response", (r) => {
    if (r.status() >= 400) so.hongMang.push(`${r.status()} ${r.url().replace(GOC_URL, "")}`);
  });
}

function soMoi() {
  return { loiConsole: [], loiTrang: [], hongMang: [] };
}

function inSo(so, lui = "   ") {
  const d = [];
  if (so.loiTrang.length) d.push(`${lui}✗ Lỗi trang: ${so.loiTrang[0]}`);
  if (so.loiConsole.length) d.push(`${lui}✗ Lỗi console (${so.loiConsole.length}): ${so.loiConsole[0]}`);
  if (so.hongMang.length) d.push(`${lui}✗ Hỏng mạng (${so.hongMang.length}): ${so.hongMang.slice(0, 3).join(" · ")}`);
  return d;
}

// ── Đăng nhập, giữ lại phiên cho lần sau ─────────────────────
async function moTrinhDuyet() {
  const tr = await chromium.launch({ headless: AN });
  const daCoPhien = fs.existsSync(PHIEN);
  const ctx = await tr.newContext({
    viewport: { width: RONG, height: CAO },
    colorScheme: GIAO_DIEN,
    storageState: daCoPhien ? PHIEN : undefined,
    locale: "vi-VN",
  });

  const page = await ctx.newPage();
  await page.goto(`${GOC_URL}/viec-cua-toi`, { waitUntil: "domcontentloaded" });

  // Bị đá về trang đăng nhập thì đăng nhập rồi lưu phiên lại
  if (page.url().includes("/login")) {
    // ⚠ Phải chờ React gắn xong sự kiện. Bấm sớm thì onSubmit chưa tồn tại,
    //   form không gửi đi gì cả và ta ngồi nhìn trang đăng nhập tưởng sai
    //   mật khẩu. Đã mất công tìm ra 05/09 — đừng bỏ hai dòng dưới.
    await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
    await page.waitForSelector('button[type="submit"]:not([disabled])', { timeout: 15000 });

    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', MAT_KHAU);

    const dangNhap = page.waitForResponse(
      (r) => r.url().includes("/api/auth/login"),
      { timeout: 20000 }
    );
    await page.click('button[type="submit"]');
    const res = await dangNhap.catch(() => null);
    if (!res) {
      throw new Error(
        "Bấm Đăng nhập nhưng KHÔNG có lời gọi /api/auth/login — nhiều khả năng " +
          "trang chưa kịp gắn sự kiện React. Thử tăng --cho."
      );
    }
    await page
      .waitForURL((u) => !u.pathname.includes("/login"), { timeout: 20000 })
      .catch(() => {});

    if (page.url().includes("/login")) {
      const loi = await page.locator("body").innerText().catch(() => "");
      throw new Error(
        `Đăng nhập hỏng với ${EMAIL} (HTTP ${res.status()}).\n` +
          `Ba tài khoản demo in sẵn ở cuối trang /login, mật khẩu Sci@2026.\n` +
          `--- Trang báo ---\n${loi.slice(0, 400)}`
      );
    }
    await ctx.storageState({ path: PHIEN });
  }
  return { tr, ctx, page };
}

/** Đặt giao diện sáng/tối rồi chờ trang lặng */
async function vaoTrang(page, route) {
  const so = soMoi();
  theoDoiLoi(page, so);
  const url = route.startsWith("http") ? route : `${GOC_URL}${route.startsWith("/") ? route : "/" + route}`;
  const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});

  // ⚠ Chỉ đặt data-theme SAU khi React hydrate xong. Đặt trước thì máy chủ
  //   dựng HTML không có thuộc tính này còn trình duyệt thì có → React kêu
  //   "Extra attributes from the server" và ta tưởng app hỏng. Lỗi này do
  //   chính bộ lái gây ra, đã mất công tìm 05/09.
  if (co("sang")) {
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
    await page.waitForTimeout(150);
  }

  await page.waitForTimeout(CHO_THEM);
  return { so, ma: res?.status() ?? 0 };
}

function tenAnh(route) {
  return (route.replace(/^https?:\/\/[^/]+/, "").replace(/^\//, "") || "trang-chu").replace(/[^\w-]/g, "_");
}

// ── Các lệnh ──────────────────────────────────────────────────
async function lenhAnh(route) {
  const { tr, page } = await moTrinhDuyet();
  try {
    const { so, ma } = await vaoTrang(page, route);
    const ten = lay("ten", tenAnh(route));
    const tep = path.join(THU_MUC_ANH, `${ten}.png`);
    await page.screenshot({ path: tep, fullPage: true });
    console.log(`✓ ${route}  (HTTP ${ma})  → anh-chup/${ten}.png`);
    inSo(so).forEach((d) => console.log(d));
  } finally {
    await tr.close();
  }
}

async function lenhChu(route) {
  const { tr, page } = await moTrinhDuyet();
  try {
    const { so, ma } = await vaoTrang(page, route);
    const chu = await page.locator("body").innerText();
    console.log(`── ${route} (HTTP ${ma}) ──`);
    console.log(chu.split("\n").map((d) => d.trim()).filter(Boolean).join("\n"));
    inSo(so, "").forEach((d) => console.log(d));
  } finally {
    await tr.close();
  }
}

async function lenhMenu() {
  const { tr, page } = await moTrinhDuyet();
  try {
    await vaoTrang(page, "/viec-cua-toi");
    const muc = await page.evaluate(() => {
      const ra = [];
      // Menu trái nằm trong <aside> hoặc <nav> đầu tiên
      const khung = document.querySelector("aside") ?? document.querySelector("nav");
      if (!khung) return ra;
      khung.querySelectorAll("a, button, [role='button']").forEach((e) => {
        const t = (e.textContent ?? "").trim().replace(/\s+/g, " ");
        if (t) ra.push({ chu: t, dan: e.getAttribute("href") ?? "" });
      });
      return ra;
    });
    console.log(`Menu trái — ${muc.length} mục:`);
    muc.forEach((m, i) => console.log(`  ${String(i + 1).padStart(2)}. ${m.chu}${m.dan ? "   → " + m.dan : ""}`));
  } finally {
    await tr.close();
  }
}

async function lenhBam(route, chu) {
  const { tr, page } = await moTrinhDuyet();
  try {
    const { so } = await vaoTrang(page, route);
    const muc = page.getByText(chu, { exact: false }).first();
    await muc.click({ timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(CHO_THEM);
    const ten = lay("ten", `bam-${tenAnh(route)}`);
    await page.screenshot({ path: path.join(THU_MUC_ANH, `${ten}.png`), fullPage: true });
    console.log(`✓ Bấm "${chu}" ở ${route} → anh-chup/${ten}.png`);
    console.log(`  Địa chỉ sau khi bấm: ${page.url().replace(GOC_URL, "") || "/"}`);
    inSo(so).forEach((d) => console.log(d));
  } finally {
    await tr.close();
  }
}

const ROUTE_MAC_DINH = [
  "/viec-cua-toi",
  // Màn nghiệp vụ RIÊNG của Agent Base — trước đây sót khỏi lượt quét
  "/viec-theo-du-an",
  "/alerts",
  "/skill",
  "/nhat-ky",
  "/kich-ban-test",
  "/gioi-thieu",
  "/settings",
];

async function lenhQuet(routes) {
  const ds = routes.length ? routes : ROUTE_MAC_DINH;
  const { tr, page } = await moTrinhDuyet();
  const ketQua = [];
  try {
    for (const r of ds) {
      const { so, ma } = await vaoTrang(page, r);
      const ten = tenAnh(r);
      await page.screenshot({ path: path.join(THU_MUC_ANH, `${ten}.png`), fullPage: true });
      const sach = !so.loiTrang.length && !so.loiConsole.length && ma < 400;
      ketQua.push({ r, ma, sach, so });
      console.log(`${sach ? "✓" : "✗"} ${r.padEnd(18)} HTTP ${ma}  → anh-chup/${ten}.png`);
      inSo(so).forEach((d) => console.log(d));
    }
  } finally {
    await tr.close();
  }
  const hong = ketQua.filter((k) => !k.sach);
  console.log(`\nTổng: ${ketQua.length - hong.length}/${ketQua.length} trang sạch.`);
  if (hong.length) {
    console.log("Trang có vấn đề: " + hong.map((h) => h.r).join(" · "));
    process.exitCode = 1;
  }
}

async function lenhDemo(ten) {
  const tep = path.resolve(GOC, "..", "0-THAM-CHIEU", "demo", ten.endsWith(".html") ? ten : `demo-agent-${ten}.html`);
  if (!fs.existsSync(tep)) {
    console.error(`✗ Không thấy demo: ${tep}`);
    process.exit(1);
  }
  const tr = await chromium.launch({ headless: AN });
  const ctx = await tr.newContext({ viewport: { width: RONG, height: CAO }, colorScheme: GIAO_DIEN });
  const page = await ctx.newPage();
  await page.goto("file:///" + tep.replace(/\\/g, "/"), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(CHO_THEM);
  const ra = lay("ten", `DEMO-${path.basename(tep, ".html")}`);
  await page.screenshot({ path: path.join(THU_MUC_ANH, `${ra}.png`), fullPage: true });
  console.log(`✓ Demo ${path.basename(tep)} → anh-chup/${ra}.png`);
  await tr.close();
}

// ── Điều phối ─────────────────────────────────────────────────
const HD = `LÁI APP — điều khiển ứng dụng bằng trình duyệt thật

  node scripts/lai-app.mjs anh   <route> [--ten <tên>]
  node scripts/lai-app.mjs chu   <route>
  node scripts/lai-app.mjs menu
  node scripts/lai-app.mjs bam   <route> "<chữ trên nút>"
  node scripts/lai-app.mjs quet  [route …]
  node scripts/lai-app.mjs demo  <base|hop-dong|phap-ly|tien-do>

Tuỳ chọn: --cong 3010  --rong 1600  --cao 1000  --sang  --hien  --cho 900
Tài khoản: ${EMAIL} (đổi bằng biến môi trường EMAIL_TEST / MAT_KHAU_TEST)`;

try {
  if (lenh === "anh") await lenhAnh(viTri[1] ?? "/viec-cua-toi");
  else if (lenh === "chu") await lenhChu(viTri[1] ?? "/viec-cua-toi");
  else if (lenh === "menu") await lenhMenu();
  else if (lenh === "bam") await lenhBam(viTri[1], viTri.slice(2).join(" "));
  else if (lenh === "quet") await lenhQuet(viTri.slice(1));
  else if (lenh === "demo") await lenhDemo(viTri[1] ?? "base");
  else console.log(HD);
} catch (e) {
  console.error("✗ " + (e instanceof Error ? e.message : String(e)));
  process.exit(1);
}
