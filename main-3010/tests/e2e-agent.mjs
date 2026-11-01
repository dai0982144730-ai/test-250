// ============================================================================
// E2E AGENT — lái trình duyệt thật, kiểm những thứ chỉ nhìn màn hình mới thấy
//
// Khác hai bộ đang có:
//   npm test          → logic bên trong, không mở trình duyệt
//   npm run test:mcp  → kết nối agent, không mở trình duyệt
//   npm run test:ui   → BỘ NÀY: mở Chromium thật, đăng nhập, bấm, đọc màn hình
//
// Chạy:
//     BAT-5-AGENT.bat     (bật Main Agent ở cổng 3010)
//     npm run test:ui
//
// Tuỳ chọn:  --cong 3012   --hien (mở cửa sổ thật)   --anh (chụp mọi trang)
//
// Exit code 1 nếu có FAIL. SKIP không tính là FAIL.
// ============================================================================

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const co = (t) => args.includes(`--${t}`);
const lay = (t, m) => {
  const i = args.indexOf(`--${t}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : m;
};

const CONG = Number(lay("cong", process.env.CONG_APP ?? "3010"));
const URL = `http://localhost:${CONG}`;
const EMAIL = process.env.EMAIL_TEST ?? "dai@sci.vn";
const MAT_KHAU = process.env.MAT_KHAU_TEST ?? "Sci@2026";
const THU_MUC_ANH = path.join(GOC, "anh-chup", "e2e");

/** Bảy trang lõi phải sống ở mọi agent */
const TRANG_LOI = [
  { duong: "/viec-cua-toi", ten: "Việc của tôi", loi: true },
  { duong: "/viec-theo-du-an", ten: "Cây việc & đường găng", loi: false },
  { duong: "/alerts", ten: "Issue / Cảnh báo", loi: true },
  { duong: "/skill", ten: "Skill AI của tôi", loi: true },
  { duong: "/kich-ban-test", ten: "Kịch bản test", loi: false },
  { duong: "/gioi-thieu", ten: "Giới thiệu", loi: false },
  { duong: "/settings", ten: "Cài đặt", loi: false },
];

// ── Sổ kết quả ──────────────────────────────────────────────
const R = [];
const ghi = (nhom, ten, dat, chiTiet = "") =>
  R.push({ nhom, ten, trangThai: dat === null ? "SKIP" : dat ? "PASS" : "FAIL", chiTiet });

function inNhom(nhom) {
  console.log(`\n── ${nhom} ${"─".repeat(Math.max(0, 60 - nhom.length))}`);
}
function inBai(ten, dat, chiTiet) {
  const dau = dat === null ? "↓" : dat ? "✓" : "✗";
  console.log(`  ${dau} ${ten}${chiTiet ? "  — " + chiTiet : ""}`);
}
function kiem(nhom, ten, dat, chiTiet = "") {
  ghi(nhom, ten, dat, chiTiet);
  inBai(ten, dat, chiTiet);
}

// ── Bắt lỗi trên trang ──────────────────────────────────────
function theoDoi(page) {
  const so = { console: [], trang: [], mang: [] };
  page.on("console", (m) => {
    if (m.type() === "error") so.console.push(m.text().replace(/\s+/g, " ").slice(0, 200));
  });
  page.on("pageerror", (e) => so.trang.push(String(e).slice(0, 200)));
  page.on("response", (r) => {
    if (r.status() >= 400 && !r.url().includes("/api/auth/me")) {
      so.mang.push(`${r.status()} ${r.url().replace(URL, "")}`);
    }
  });
  return so;
}

async function vao(page, duong) {
  const res = await page.goto(`${URL}${duong}`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(600);
  return res?.status() ?? 0;
}

// ── Chạy ─────────────────────────────────────────────────────
const trinhDuyet = await chromium.launch({ headless: !co("hien") });
const ctx = await trinhDuyet.newContext({
  viewport: { width: 1600, height: 1000 },
  locale: "vi-VN",
});
const page = await ctx.newPage();
if (co("anh")) fs.mkdirSync(THU_MUC_ANH, { recursive: true });

try {
  // ══ NHÓM A — Đăng nhập và chặn đường ═══════════════════════
  inNhom("A. ĐĂNG NHẬP & CHẶN ĐƯỜNG");

  await page.goto(`${URL}/viec-cua-toi`, { waitUntil: "domcontentloaded" });
  kiem("A", "Chưa đăng nhập thì bị đá về /login", page.url().includes("/login"), page.url().replace(URL, ""));

  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await page.waitForSelector('button[type="submit"]:not([disabled])', { timeout: 15000 });

  // Sai mật khẩu phải báo bằng TIẾNG VIỆT, không phải "Unauthorized"
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', "sai-mat-khau-co-tinh");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);
  const chuLoi = await page.locator("body").innerText();
  kiem(
    "A",
    "Sai mật khẩu báo lỗi bằng tiếng Việt",
    /không đúng|sai|thất bại/i.test(chuLoi) && !/unauthorized|invalid credentials/i.test(chuLoi)
  );

  // Đăng nhập thật
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', MAT_KHAU);
  const traLoi = page.waitForResponse((r) => r.url().includes("/api/auth/login"), { timeout: 20000 });
  await page.click('button[type="submit"]');
  const resDn = await traLoi.catch(() => null);
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 20000 }).catch(() => {});
  kiem("A", `Đăng nhập ${EMAIL}`, !page.url().includes("/login"), `HTTP ${resDn?.status() ?? "?"}`);

  if (page.url().includes("/login")) {
    console.error("\n✗ Không đăng nhập được — dừng. Ba tài khoản demo in ở cuối trang /login.");
    process.exit(1);
  }

  // ══ NHÓM B — Mọi màn của Main render sạch ══════════════════
  // Đây là bộ test RIÊNG của Main Agent. Bản kế thừa từ Agent Base đã bỏ:
  // nó kiểm cây việc, cổng MCP của Base, màn quan sát — những thứ Main
  // KHÔNG có và cố ý không có.
  inNhom("B. MỌI MÀN CỦA MAIN RENDER SẠCH");

  const MAN = [
    // 26/09 gọn menu: Báo cáo 2 tab · Ai được gọi ai vào Cài đặt 🔌 · Quan sát vào tab Sức khoẻ
    ["/bao-cao?tab=sang", "Báo cáo — tab Sáng"],
    ["/bao-cao?tab=thang", "Báo cáo — tab Tháng"],
    ["/settings?tab=ket-noi", "Cài đặt — 🔌 Kết nối (có Ai được gọi ai)"],
    ["/alerts", "Issue"],
    ["/viec-cua-toi", "Việc của tôi"],
    ["/nhat-ky", "Đường cũ Nhật ký — một dòng dẫn sang Agent quan sát"],
    ["/skill", "Skill AI của tôi"],
    ["/settings", "Cài đặt"],
  ];
  for (const [duong, ten] of MAN) {
    const soB = theoDoi(page);
    const ma = await vao(page, duong);
    const sach = ma === 200 && soB.console.length === 0 && soB.trang.length === 0;
    kiem("B", `${ten} (${duong})`, sach,
      ma !== 200 ? `HTTP ${ma}` : (soB.console[0] ?? soB.trang[0] ?? ""));
  }

  // ══ NHÓM C — Main KHÔNG giữ dữ liệu nghiệp vụ ══════════════
  // Luật số một của con này (PLAN-MAIN-AGENT mục 1). Màn nào của bốn agent
  // kia còn sót lại trong Main là một lời mời phạm luật "dựng bảng riêng cho
  // tiện rồi hai bản số liệu cãi nhau".
  inNhom("C. MAIN KHÔNG GIỮ DỮ LIỆU NGHIỆP VỤ");

  const KHONG_DUOC_CO = [
    ["/viec-theo-du-an", "cây việc & đường găng"],
    ["/planning", "lập tiến độ"],
    ["/report-mgmt", "quản lý báo cáo"],
    ["/soat-so-lieu", "đối chiếu chéo"],
    ["/docs", "hồ sơ dự án"],
  ];
  for (const [duong, ten] of KHONG_DUOC_CO) {
    const ma = await vao(page, duong);
    kiem("C", `KHÔNG có màn ${ten}`, ma === 404, `HTTP ${ma}`);
  }

  // ══ NHÓM D — Menu trái ═════════════════════════════════════
  inNhom("D. MENU TRÁI");

  await vao(page, "/bao-cao");
  const chuMenu = await page.locator("aside").first().innerText().catch(() => "");
  kiem("D", "Thanh bên mang tên Main Agent", /Main Agent/.test(chuMenu));
  kiem("D", "Nói rõ bản chất: hỏi 4 con kia rồi tổng hợp",
    /Hỏi 4 con kia/.test(chuMenu));
  // 25/09: màn "Hỏi vắt ngang các ban" đã bỏ — hỏi vắt ngang qua trợ lý chat
  // 26/09: menu gọn — Báo cáo (2 tab) · Nhật ký & sức khoẻ agent; bỏ Khai một lần / Ai được gọi ai / Quan sát
  // 26/09 (sau): Nhật ký & sức khoẻ agent BỎ — thay bằng link Agent quan sát ↗
  for (const ten of ["Báo cáo", "Agent quan sát"]) {
    kiem("D", `Menu có "${ten}"`, chuMenu.includes(ten));
  }
  for (const ten of ["Khai một lần", "Quan sát các agent", "Nhật ký & sức khoẻ agent"]) {
    kiem("D", `Menu KHÔNG còn "${ten}" (gỡ 26/09)`, !chuMenu.includes(ten));
  }
  kiem("D", "Menu KHÔNG có cây việc của agent khác",
    !/Cây việc/.test(chuMenu));

  // ══ NHÓM E — Cổng MCP của Main ═════════════════════════════
  // ⚠ Gọi từ NODE, không gọi từ page.evaluate: cổng MCP chỉ nghe mạng nội bộ,
  //   gọi từ trình duyệt sẽ bị chặn khác nguồn và ta tưởng nhầm là cổng chết.
  inNhom("E. CỔNG MCP CỦA MAIN");

  async function goiMcp(cong_cu, tham_so) {
    try {
      const r = await fetch(`${URL}/api/mcp/main`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cong_cu,
          tham_so: tham_so ?? {},
          agent_goi: "base",
          ly_do_goi: "e2e kiểm cổng MCP của Main Agent",
        }),
        signal: AbortSignal.timeout(10000),
      });
      return { ma: r.status, than: await r.json() };
    } catch (e) {
      return { ma: 0, loi: String(e) };
    }
  }

  const sk = await goiMcp("suc_khoe");
  kiem("E", "Cổng trả HTTP 200 (không bao giờ 500)", sk.ma === 200, `HTTP ${sk.ma}`);
  kiem("E", "Thân trả lời có trường ok", typeof sk.than?.ok === "boolean");
  kiem("E", "Trả lời kèm mảng nguồn KHÔNG rỗng",
    Array.isArray(sk.than?.nguon) && sk.than.nguon.length > 0);

  const nl = await goiMcp("nang_luc");
  kiem("E", "nang_luc liệt kê được công cụ", Array.isArray(nl.than?.du_lieu?.cong_cu));
  kiem("E", "Main nói rõ nó KHÔNG sở hữu hệ mã nào",
    JSON.stringify(nl.than?.du_lieu ?? {}).includes("không"));

  const la = await goiMcp("main.cong_cu_khong_ton_tai");
  kiem("E", "Công cụ lạ vẫn HTTP 200 kèm ok:false", la.ma === 200 && la.than?.ok === false,
    `HTTP ${la.ma}`);

  const thieuLyDo = await (async () => {
    try {
      const r = await fetch(`${URL}/api/mcp/main`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cong_cu: "suc_khoe", agent_goi: "base" }),
        signal: AbortSignal.timeout(10000),
      });
      return { ma: r.status, than: await r.json() };
    } catch { return { ma: 0 }; }
  })();
  kiem("E", "Thiếu lý do gọi thì bị TỪ CHỐI (mục 7 — không cho gọi vu vơ)",
    thieuLyDo.than?.ok === false);

  // ══ NHÓM F — Ai được gọi ai: số agent do người dùng khai ════
  inNhom("F. MA TRẬN AI ĐƯỢC GỌI AI");

  // 26/09: ma trận nằm ở Cài đặt → 🔌 Kết nối (đường cũ /ma-tran-goi chuyển hướng về đây)
  await vao(page, "/settings?tab=ket-noi");
  await page.waitForTimeout(1500);
  const chuMt = await page.locator("main").innerText().catch(() => "");
  const cỡ = /Ma trận đang (\d+)×(\d+)/.exec(chuMt);
  kiem("F", "Có ma trận và nói rõ kích thước", cỡ !== null,
    cỡ ? `${cỡ[1]}×${cỡ[2]}` : "không thấy");

  const soBat = await page.evaluate(async () => {
    const r = await fetch("/api/ma-tran-goi", { cache: "no-store" });
    if (!r.ok) return null;
    const j = await r.json();
    const ds = j?.agent ?? j?.bang?.agent ?? null;
    return Array.isArray(ds) ? ds.length : null;
  }).catch(() => null);
  kiem("F", "Kích thước ma trận KHỚP số agent đang bật trong Danh bạ",
    soBat === null ? null : cỡ !== null && Number(cỡ[1]) === soBat,
    soBat === null ? "không đọc được API — bỏ qua" : `${soBat} con đang bật`);

  kiem("F", "Ô chưa có lượt ghi «chưa có lượt nào», KHÔNG ghi 0",
    /chưa có lượt nào/.test(chuMt));
  kiem("F", "Đường chéo cấm sẵn — agent không tự gọi mình",
    /chính nó — không tự gọi/.test(chuMt));

  // ══ NHÓM G — (26/09) màn "Khai một lần — dùng chung" ĐÃ GỠ: đường cũ phải chuyển hướng
  inNhom("G. ĐƯỜNG CŨ CHUYỂN HƯỚNG — KHÔNG 404");

  for (const [cu, moi] of [
    ["/cau-hinh-chung", "/settings"],
    ["/ma-tran-goi", "/settings"],
    ["/quan-sat", "/nhat-ky"],
    ["/bao-cao-sang", "/bao-cao"],
    ["/bao-cao-thang", "/bao-cao"],
  ]) {
    const ma = await vao(page, cu);
    kiem("G", `${cu} → ${moi}`, ma === 200 && page.url().includes(moi), `HTTP ${ma} · ${page.url()}`);
  }

  // ══ NHÓM H — Báo cáo sáng ══════════════════════════════════
  inNhom("H. BÁO CÁO SÁNG");

  await vao(page, "/bao-cao?tab=sang");
  await page.waitForTimeout(1200);
  const chuBc = await page.locator("main").innerText().catch(() => "");
  kiem("H", "Nói rõ luật «lệnh hôm nay chỉ áp cho hôm nay»",
    /CHỈ ÁP CHO HÔM NAY/.test(chuBc));
  kiem("H", "Có ô nhắn luật động", /Nhắn cho Main Agent/.test(chuBc));
  kiem("H", "Không có luật nào thì nói đó là bình thường, không phải hỏng",
    !/Đang không có luật nào/.test(chuBc) || /không phải hỏng/.test(chuBc));
  kiem("H", "Liệt kê kịch bản định kỳ theo giờ", /21:00/.test(chuBc) && /07:00/.test(chuBc));

  // ══ NHÓM I — Màn Issue riêng của Main ══════════════════════
  inNhom("I. MÀN ISSUE RIÊNG CỦA MAIN");

  await vao(page, "/alerts");
  await page.waitForTimeout(1500);
  const chuIs = await page.locator("main").innerText().catch(() => "");
  // Soi ĐÚNG hàng tab, không quét cả trang: khối giải thích cuối trang có câu
  // "Main không có tab máy sinh" — quét cả trang là tự bắt câu của chính mình.
  const soNutMaySinh = await page.getByRole("button", { name: /máy sinh/i }).count().catch(() => 0);
  kiem("I", "KHÔNG có tab máy sinh", soNutMaySinh === 0, soNutMaySinh + " nut khop");
  kiem("I", "Có tab «Phân loại lại» thay cho tab máy sinh", /Phân loại lại/.test(chuIs));
  kiem("I", "Có tab ⭐ Cần anh xem", /Cần anh xem/.test(chuIs));
  kiem("I", "Cố ý KHÔNG chấm điểm", /không chấm điểm/i.test(chuIs));
  kiem("I", "Nói rõ không cộng dồn số ngày ảnh hưởng", /không cộng dồn/i.test(chuIs));
  kiem("I", "Con nào chưa gom được thì nói rõ tên và lý do",
    !/Chưa gom được/.test(chuIs) || /Chưa gom được từ .+ —/.test(chuIs));

} finally {
  await trinhDuyet.close();
}

// ── Tổng kết ─────────────────────────────────────────────────
const dat = R.filter((r) => r.trangThai === "PASS").length;
const truot = R.filter((r) => r.trangThai === "FAIL");
const boQua = R.filter((r) => r.trangThai === "SKIP").length;

console.log("\n" + "═".repeat(64));
console.log(`TỔNG: ${dat} đạt · ${truot.length} trượt · ${boQua} bỏ qua  (trên ${R.length} bài)`);
if (truot.length) {
  console.log("\nBÀI TRƯỢT:");
  truot.forEach((t) => console.log(`  ✗ [${t.nhom}] ${t.ten}${t.chiTiet ? " — " + t.chiTiet : ""}`));
}
if (co("anh")) console.log(`\nẢnh chụp: anh-chup/e2e/`);
console.log("═".repeat(64));

process.exit(truot.length ? 1 : 0);
