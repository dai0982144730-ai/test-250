// ============================================================
// KHẢO SÁT TRƯỜNG TÙY CHỈNH TRÊN BASE.VN — đo thật, không đoán
//
// Vì sao có script này: đo 05/09/2026 cho thấy 128 việc của không gian
// 111663 (PMC - Hướng Việt) nhưng 0 việc gắn được mã WBS, do tên việc
// đánh số theo tập hồ sơ ("Tập 8.3."), không theo WBS.
// PLAN-AGENT-BASE-VN mục 5.3 gọi lối thoát là "một cơ hội rẻ": đọc các
// trường custom_* mà Base trả kèm mỗi công việc.
//
// Script này gọi THẲNG API Base (không qua client.ts) để nhìn được gói
// JSON THÔ — client.ts chuẩn hoá xong là mất trường lạ.
//
// Chạy:  node scripts/khao-sat-truong-tuy-bien.mjs [maKhongGian...]
// ============================================================

import fs from "node:fs";
import path from "node:path";

const GOC = path.join(process.cwd(), "data", "settings.json");
const cauHinh = JSON.parse(fs.readFileSync(GOC, "utf8").replace(/^﻿/, ""));

const KHOA = {
  wework: cauHinh.baseTokenWework,
  request: cauHinh.baseTokenRequest,
  workflow: cauHinh.baseTokenWorkflow,
  hrm: cauHinh.baseTokenHrm,
  account: cauHinh.baseTokenAccount,
};

const URL_APP = {
  wework: "https://wework.base.vn/extapi/v3",
  request: "https://request.base.vn/extapi/v1",
  workflow: "https://workflow.base.vn/extapi/v1",
  hrm: "https://hrm.base.vn/extapi/v1",
  account: "https://account.base.vn/extapi/v1",
};

async function goi(app, duong, truong = {}) {
  const token = KHOA[app];
  if (!token) return { ok: false, message: `Chưa có khoá ${app}` };
  const body = new URLSearchParams();
  body.set("access_token_v2", token);
  for (const [k, v] of Object.entries(truong)) {
    if (v !== undefined && v !== null) body.set(k, String(v));
  }
  const ct = new AbortController();
  const hen = setTimeout(() => ct.abort(), 30000);
  try {
    const r = await fetch(URL_APP[app] + duong, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: ct.signal,
    });
    const chu = await r.text();
    try {
      return { ok: r.ok, http: r.status, data: JSON.parse(chu) };
    } catch {
      return { ok: false, http: r.status, message: chu.slice(0, 300) };
    }
  } catch (e) {
    return { ok: false, message: String(e?.message ?? e) };
  } finally {
    clearTimeout(hen);
  }
}

/** Gom mọi công việc trong gói trả về, kể cả việc con lồng nhau */
function gomViec(goi) {
  const ra = [];
  const daGap = new Set();
  const di = (n, sau = 0) => {
    if (!n || typeof n !== "object" || sau > 8) return;
    if (Array.isArray(n)) {
      n.forEach((x) => di(x, sau + 1));
      return;
    }
    // Là một công việc nếu có id + name và nằm dưới khoá tasks/subtasks
    if (n.id !== undefined && (n.name !== undefined || n.content !== undefined)) {
      const k = String(n.id);
      if (!daGap.has(k)) {
        daGap.add(k);
        ra.push(n);
      }
    }
    for (const k of Object.keys(n)) {
      if (k === "tasks" || k === "subtasks" || k === "tasklists" || k === "sections") di(n[k], sau + 1);
    }
  };
  di(goi);
  return ra;
}

const MAU_WBS = /(?:^|[^\w.])((?:[A-Z]{2}\.)?\d{1,2}(?:\.\d{1,3}){2,5})(?![\w.])/;

async function khaoSatKhongGian(ma) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`KHÔNG GIAN ${ma}`);
  console.log("=".repeat(70));

  const kq = await goi("wework", "/project/get.full", { id: ma });
  if (!kq.ok) {
    console.log("  ✖ get.full lỗi:", kq.message ?? JSON.stringify(kq.data).slice(0, 200));
    return;
  }
  const duAn = kq.data?.project ?? kq.data;
  console.log("  Tên dự án:", duAn?.name ?? "(không rõ)");

  let viec = gomViec(kq.data);
  console.log("  Số việc từ get.full:", viec.length);

  if (viec.length === 0) {
    const kq2 = await goi("wework", "/task/project", { id: ma, page: 0, limit: 500 });
    viec = gomViec(kq2.data);
    console.log("  Số việc từ task/project:", viec.length);
  }
  if (viec.length === 0) return;

  // ---- 1. Đếm TẦN SUẤT MỌI KHOÁ trên toàn bộ việc ----
  const tanSuat = new Map();
  const coGiaTri = new Map();
  for (const t of viec) {
    for (const k of Object.keys(t)) {
      tanSuat.set(k, (tanSuat.get(k) ?? 0) + 1);
      const v = t[k];
      const rong =
        v === null || v === undefined || v === "" || v === "0" ||
        (Array.isArray(v) && v.length === 0) ||
        (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0);
      if (!rong) coGiaTri.set(k, (coGiaTri.get(k) ?? 0) + 1);
    }
  }

  console.log(`\n  --- MỌI KHOÁ Base trả kèm mỗi công việc (${tanSuat.size} khoá) ---`);
  console.log("  khoá".padEnd(30), "có mặt".padStart(8), "có giá trị".padStart(12), "  ví dụ");
  const sapXep = [...tanSuat.entries()].sort((a, b) => (coGiaTri.get(b[0]) ?? 0) - (coGiaTri.get(a[0]) ?? 0));
  for (const [k, n] of sapXep) {
    const cg = coGiaTri.get(k) ?? 0;
    const mau = viec.find((t) => {
      const v = t[k];
      return v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0);
    });
    let vd = mau ? JSON.stringify(mau[k]) : "";
    if (vd.length > 60) vd = vd.slice(0, 57) + "...";
    console.log("  " + k.padEnd(30), String(n).padStart(8), String(cg).padStart(12), "  " + vd);
  }

  // ---- 2. Soi riêng các trường tùy chỉnh ----
  console.log("\n  --- TRƯỜNG TÙY CHỈNH (custom*) ---");
  const tuyBien = new Map(); // tên trường -> {co, viDu[]}
  const nap = (ten, giaTri) => {
    const t = String(ten ?? "").trim();
    if (t === "") return;
    if (giaTri === null || giaTri === undefined || giaTri === "") return;
    if (!tuyBien.has(t)) tuyBien.set(t, { co: 0, viDu: [] });
    const o = tuyBien.get(t);
    o.co += 1;
    if (o.viDu.length < 3) o.viDu.push(typeof giaTri === "object" ? JSON.stringify(giaTri).slice(0, 80) : String(giaTri).slice(0, 80));
  };
  for (const t of viec) {
    for (const k of Object.keys(t)) {
      if (/^custom[_-]/i.test(k)) nap(k, t[k]);
    }
    for (const boc of ["custom", "customs", "customFields", "custom_fields", "fields", "metas", "meta"]) {
      const nguon = t[boc];
      if (!nguon) continue;
      if (Array.isArray(nguon)) {
        nguon.forEach((f) => {
          if (f && typeof f === "object") nap(f.key ?? f.id ?? f.name ?? f.label, f.value ?? f.val ?? f.content);
        });
      } else if (typeof nguon === "object") {
        Object.keys(nguon).forEach((k) => nap(k, nguon[k]));
      }
    }
  }
  if (tuyBien.size === 0) {
    console.log("  ⚠ KHÔNG có trường tùy chỉnh nào có giá trị trên", viec.length, "việc.");
  } else {
    for (const [k, o] of [...tuyBien.entries()].sort((a, b) => b[1].co - a[1].co)) {
      console.log(`  ${k.padEnd(28)} có giá trị ở ${String(o.co).padStart(4)}/${viec.length} việc · ví dụ: ${o.viDu.join(" | ")}`);
      const hopWbs = o.viDu.filter((v) => MAU_WBS.test(" " + v)).length;
      if (hopWbs > 0) console.log(`      ⭐ ${hopWbs}/${o.viDu.length} ví dụ trông GIỐNG MÃ WBS`);
    }
  }

  // ---- 3. Bao nhiêu việc có mã WBS trong TÊN ----
  const trongTen = viec.filter((t) => MAU_WBS.test(" " + String(t.name ?? ""))).length;
  console.log(`\n  --- MÃ WBS TRONG TÊN VIỆC: ${trongTen}/${viec.length} ---`);
  console.log("  5 tên việc đầu:");
  viec.slice(0, 5).forEach((t) => console.log("   ·", String(t.name ?? "").slice(0, 90)));
}

// ─────────────────────────────────────────────────────────────
// Chế độ QUÉT TOÀN BỘ — trả lời câu hỏi lớn:
//   "Trên TOÀN công ty, có việc nào khai được mã WBS không, khai bằng gì?"
// ─────────────────────────────────────────────────────────────

const TIEN_TO_CA_NHAN = /^công việc của /i;

async function quetToanBo() {
  // 1. Liệt kê mọi không gian
  let tatCa = [];
  for (let trang = 0; trang < 20; trang += 1) {
    const kq = await goi("wework", "/project/list", {
      page: trang,
      items_per_page: 100,
      include_private: 1,
    });
    const mang = kq.data?.projects ?? [];
    if (mang.length === 0) break;
    tatCa = tatCa.concat(mang);
    if (mang.length < 100) break;
  }
  const caNhan = tatCa.filter((p) => TIEN_TO_CA_NHAN.test(String(p.name ?? "")));
  const duAn = tatCa.filter((p) => !TIEN_TO_CA_NHAN.test(String(p.name ?? "")));
  console.log(`TỔNG SỐ KHÔNG GIAN: ${tatCa.length}  (dự án ${duAn.length} · cá nhân ${caNhan.length})`);
  console.log("Quét TOÀN BỘ không gian dự án — mỗi dòng một không gian\n");

  console.log(
    "KG".padEnd(9) + "việc".padStart(6) + "custom*".padStart(9) + "có thẻ".padStart(8) +
      "thẻ=WBS".padStart(9) + "WBS-tên".padStart(9) + "  tên không gian"
  );

  let tViec = 0, tCustom = 0, tThe = 0, tTheWbs = 0, tTen = 0, tLoi = 0;
  const khoaCustom = new Set();
  const moiThe = new Map();

  for (const p of duAn) {
    const id = String(p.id);
    const kq = await goi("wework", "/project/get.full", { id });
    if (!kq.ok || !kq.data) {
      tLoi += 1;
      console.log(`${id.padEnd(9)}   LỖI: ${kq.message ?? "không đọc được"}`);
      continue;
    }
    let viec = gomViec(kq.data);
    if (viec.length === 0) {
      const kq2 = await goi("wework", "/task/project", { id, page: 0, limit: 500 });
      viec = gomViec(kq2.data);
    }
    let nC = 0, nT = 0, nTW = 0, nN = 0;
    for (const t of viec) {
      const ck = Object.keys(t).filter((k) => /^custom[_-]/i.test(k));
      if (ck.length > 0) { nC += 1; ck.forEach((k) => khoaCustom.add(k)); }
      const the = (Array.isArray(t.tags) ? t.tags : []).map(String).filter((x) => x.trim() !== "");
      if (the.length > 0) {
        nT += 1;
        the.forEach((x) => moiThe.set(x, (moiThe.get(x) ?? 0) + 1));
        if (the.some((x) => MAU_WBS_DAY.test(x.trim().replace(/^[A-Za-z]{2}\./, "")))) nTW += 1;
      }
      if (MAU_WBS.test(" " + String(t.name ?? ""))) nN += 1;
    }
    tViec += viec.length; tCustom += nC; tThe += nT; tTheWbs += nTW; tTen += nN;
    console.log(
      id.padEnd(9) + String(viec.length).padStart(6) + String(nC).padStart(9) +
        String(nT).padStart(8) + String(nTW).padStart(9) + String(nN).padStart(9) +
        "  " + String(p.name ?? "").slice(0, 42)
    );
  }

  console.log("-".repeat(90));
  console.log(
    "TỔNG".padEnd(9) + String(tViec).padStart(6) + String(tCustom).padStart(9) +
      String(tThe).padStart(8) + String(tTheWbs).padStart(9) + String(tTen).padStart(9) +
      `  (${duAn.length - tLoi} không gian đọc được, ${tLoi} lỗi)`
  );
  const pc = (n) => (tViec === 0 ? "0" : ((n * 100) / tViec).toFixed(1));
  console.log("");
  console.log(`  · việc có trường custom_*      : ${tCustom}/${tViec}  (${pc(tCustom)}%)`);
  console.log(`  · việc có thẻ (tag) khác rỗng  : ${tThe}/${tViec}  (${pc(tThe)}%)`);
  console.log(`  · việc có THẺ trông như mã WBS : ${tTheWbs}/${tViec}  (${pc(tTheWbs)}%)`);
  console.log(`  · việc có mã WBS trong TÊN     : ${tTen}/${tViec}  (${pc(tTen)}%)`);
  console.log("");
  console.log("  Khoá custom_* bắt gặp:", khoaCustom.size > 0 ? [...khoaCustom].join(", ") : "(KHÔNG CÓ)");
  console.log(`  Thẻ phân biệt: ${moiThe.size} — 25 thẻ dùng nhiều nhất:`);
  [...moiThe.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)
    .forEach(([k, n]) => console.log(`     "${k}" × ${n}`));
}

/** Một THẺ chỉ chứa đúng một mã WBS (khác MAU_WBS: đây là khớp TRỌN chuỗi) */
const MAU_WBS_DAY = /^\d{1,2}(?:\.\d{1,3}){2,5}$/;

async function main() {
  const dau = process.argv.slice(2);
  if (dau[0] === "--toan-bo") {
    await quetToanBo();
    return;
  }
  const dsKhongGian = dau.length > 0 ? dau : ["111663"];
  for (const ma of dsKhongGian) await khaoSatKhongGian(ma);
}

main().catch((e) => {
  console.error("Lỗi:", e);
  process.exit(1);
});
