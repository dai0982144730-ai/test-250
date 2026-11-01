// ============================================================
// NẠP TỪ ĐIỂN NGỮ CẢNH — LOI-DUNG-CHUNG mục 6f
//
// Bóc nội dung file "cơ cấu tổ chức và tên các dự án do Sci Group triển
// khai.docx" rồi nạp vào ô "Sơ đồ tổ chức và dự án" của màn Cài đặt.
//
// Đây là VIỆC BẮT BUỘC làm ngay sau khi bật được app: thiếu nó thì agent
// đọc tên viết tắt trong Base (EnC · PMC · NL · QT · VL…) sẽ không biết đó
// là ban nào, dự án nào — mọi phân tích phía sau đều lệch.
//
// Nạp QUA GIAO DIỆN THẬT (không ghi thẳng file) để đồng thời kiểm chứng
// màn Cài đặt hoạt động và vết sửa được ghi lại.
//
// Chạy:  node scripts/nap-tu-dien-ngu-canh.mjs [--cong 3011]
// ============================================================

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const args = process.argv.slice(2);
const lay = (t, m) => {
  const i = args.indexOf(`--${t}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : m;
};
const CONG = Number(lay("cong", "3011"));
const URL = `http://localhost:${CONG}`;
const EMAIL = process.env.EMAIL_TEST ?? "dai@sci.vn";
const MAT_KHAU = process.env.MAT_KHAU_TEST ?? "Sci@2026";

const NGUON = lay(
  "tep",
  path.resolve(
    process.cwd(),
    "..",
    "0-THAM-CHIEU",
    "cơ cấu tổ chức và tên các dự án do Sci Group triển khai.docx"
  )
);

// ── Bóc chữ khỏi .docx (là file zip chứa word/document.xml) ──
function bocDocx(tep) {
  const buf = fs.readFileSync(tep);
  // Tìm entry word/document.xml trong zip, giải nén bằng inflateRaw
  const ten = Buffer.from("word/document.xml");
  let vt = buf.indexOf(ten);
  while (vt !== -1) {
    // Lùi về đầu local file header (PK\x03\x04)
    const dau = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x03, 0x04]), vt);
    if (dau !== -1) {
      const nLen = buf.readUInt16LE(dau + 26);
      const eLen = buf.readUInt16LE(dau + 28);
      const batDau = dau + 30 + nLen + eLen;
      try {
        const xml = zlib.inflateRawSync(buf.subarray(batDau)).toString("utf8");
        if (xml.includes("<w:document")) return xml;
      } catch {
        /* thử entry tiếp theo */
      }
    }
    vt = buf.indexOf(ten, vt + 1);
  }
  throw new Error("Không bóc được word/document.xml khỏi file .docx");
}

function xmlSangChu(xml) {
  const t = xml
    .replace(/<\/w:p>/g, "\n")
    .replace(/<w:tab[^>]*\/>/g, "\t")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return t
    .split("\n")
    .map((d) => d.trim())
    .filter(Boolean)
    .join("\n");
}

// ── Chạy ──
if (!fs.existsSync(NGUON)) {
  console.error(`✗ Không thấy file: ${NGUON}`);
  process.exit(1);
}

const chu = xmlSangChu(bocDocx(NGUON));
console.log(`• Bóc được ${chu.split("\n").length} dòng · ${chu.length} ký tự`);

const tr = await chromium.launch({ headless: true });
const ctx = await tr.newContext({ viewport: { width: 1500, height: 1000 }, locale: "vi-VN" });
const page = await ctx.newPage();

try {
  await page.goto(`${URL}/settings`, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login")) {
    await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
    await page.waitForSelector('button[type="submit"]:not([disabled])', { timeout: 15000 });
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', MAT_KHAU);
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 20000 });
    await page.goto(`${URL}/settings`, { waitUntil: "domcontentloaded" });
  }
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});

  const o = page.locator("textarea").first();
  await o.waitFor({ timeout: 15000 });
  await o.fill(chu);

  const traLoi = page.waitForResponse(
    (r) => r.url().includes("/api/cai-dat-base") && r.request().method() === "PUT",
    { timeout: 20000 }
  );
  await page.getByRole("button", { name: /Lưu từ điển/ }).click();
  const res = await traLoi;
  const than = await res.json();

  if (than.ok) {
    console.log(`✓ Đã nạp từ điển ngữ cảnh (${than.cauHinh.tuDienNguCanh.length} ký tự)`);
    const v = than.cauHinh.vetSua?.[0];
    if (v) console.log(`  Vết sửa: ${v.nguoi} · ${v.truong} · ${v.tuGiaTri} → ${v.sangGiaTri}`);
  } else {
    console.error(`✗ Lưu không được: ${than.message ?? "(không rõ)"}`);
    process.exitCode = 1;
  }
} finally {
  await tr.close();
}
