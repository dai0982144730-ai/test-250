// ============================================================
// MÁY CHẠY BỘ CÂU HỎI KIỂM (KE-HOACH/31, đợt 2 — 26/10/2026)
//
// Hỏi từng câu trong KE-HOACH/31-BO-CAU-HOI-KIEM.json qua ĐÚNG bộ máy chat của Main (cùng đường Telegram),
// bằng một tài khoản thật, rồi ghi kết quả + chấm tự động những lỗi MÁY bắt được (bảng 8 lỗi, mục 4):
//   mã việc CV- · tên công cụ máy · localhost · «chậm/trễ/sớm N ngày» không ghi so với hệ nào · độ dài · công cụ gọi đúng không.
// Phần «gọn · dễ hiểu · không thừa» do người (hoặc phiên đóng vai người dùng) đọc tệp kết quả.
//
// Chạy:  npx tsx scripts/chay-bo-cau-hoi.mts [--email dainc@scigroup.vn] [--chi TD-01,HD-03] [--tu 1 --den 20]
// Ra:    ../KE-HOACH/ket-qua-cau-hoi/<yyyy-mm-dd-hhmm>.jsonl  (+ .md tóm tắt)
// Gọi AI THẬT (tốn lượt AI công ty, đo 27/10: ~93.000 token/câu) — chạy tuần tự, mỗi câu ~40–70 giây.
// Không gọi AI:  --chon-cong-cu   ·   --cham-lai <tệp.jsonl trong ket-qua-cau-hoi>   (xem «KIỂM 3 TẦNG» bên dưới)
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { runChatAgent } from "@/lib/ai/chat-agent";
import { gonChoTelegram } from "@/lib/telegram-tro-ly/thuan";
import { getUserByEmail } from "@/lib/users";
import { gioVn } from "@/lib/gio-vn";

// 27/10: nạp .env.local như Next — thiếu thì lượt sang agent khác không mang khoá nội bộ (danh bạ 3004 báo «thiếu AUTH_SECRET»,
// cổng Tiến độ lọc phần tiền) → kết quả kiểm sai khác app thật (đo: CV-09, CV-20 lần chạy 27/10 06:37)
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());

const arg = (k: string) => {
  const i = process.argv.indexOf(`--${k}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const email = arg("email") ?? "dainc@scigroup.vn";
const chi = new Set((arg("chi") ?? "").split(",").filter(Boolean));
const tu = Number(arg("tu") ?? 1);
const den = Number(arg("den") ?? 9999);
const duAn = arg("du-an") ?? "dien-gio-huong-viet-hv-du-lieu";

const goc = path.resolve(process.cwd(), "..", "KE-HOACH");
const bo = JSON.parse(fs.readFileSync(path.join(goc, "31-BO-CAU-HOI-KIEM.json"), "utf8")).cau as string[][];
const u = getUserByEmail(email);
if (!u) throw new Error(`Không thấy tài khoản ${email}`);

const g = gioVn(new Date());
const thuMuc = path.join(goc, "ket-qua-cau-hoi");
fs.mkdirSync(thuMuc, { recursive: true });
const ten = `${g.ngay}-${g.gio.slice(0, 5).replace(":", "")}`;
const tepJsonl = path.join(thuMuc, `${ten}.jsonl`);

/** Chấm tự động — chỉ những lỗi máy chắc chắn bắt được */
function cham(traLoi: string, mongDoi: string, daGoi: string[]) {
  const loi: string[] = [];
  if (/CV-\d{4}-\d{3,6}/.test(traLoi)) loi.push("còn mã việc CV-");
  if (/\b(tiendo|hopdong|phaply|nghiemthu|base|socai)[._][a-z][a-z_]{2,}\b/.test(traLoi)) loi.push("còn tên công cụ máy");
  if (/localhost|127\.0\.0\.1/.test(traLoi)) loi.push("còn địa chỉ localhost");
  // 27/10: hệ so sánh có thể đứng TRƯỚC con số («So với Baseline: chậm 44 ngày») — xét 60 ký tự hai phía, cùng dòng
  // Kiểm độc lập đợt 2 (M2 luật 36): thêm «chậm tới N», «chậm **N ngày**», «chậm thêm N», «59–65 ngày»
  const chamTron = [...traLoi.matchAll(/(chậm|trễ|sớm|vượt)(?:\s+(?:tới|thêm|hơn|khoảng|đến))?\s+\**\d+(?:\s*[–-]\s*\d+)?\**\s*\**ngày/gi)].find((m) => {
    // 01/11 Mr. Đại gật: «làm COD chậm N ngày» là phần COD lùi do riêng hạng mục, không phải so với hệ nào
    if (/làm COD\s*$/i.test(traLoi.slice(Math.max(0, m.index! - 12), m.index!))) return false;
    const dau = traLoi.lastIndexOf("\n", m.index!) + 1;
    const cuoiDong = traLoi.indexOf("\n", m.index!);
    const truoc = traLoi.slice(Math.max(dau, m.index! - 60), m.index!);
    const sau = traLoi.slice(m.index! + m[0].length, cuoiDong < 0 ? undefined : Math.min(cuoiDong, m.index! + m[0].length + 60));
    if (/so với|Baseline|Tiến độ mục tiêu|kế hoạch nội bộ/i.test(truoc + " " + sau)) return false;
    // 31/10: ô trong bảng — hệ so sánh nằm ở dòng tiêu đề cột của chính bảng đó («| So với Baseline |»)
    if (/^\s*\|/.test(traLoi.slice(dau, m.index!))) {
      const dongTruoc = traLoi.slice(0, Math.max(0, dau - 1)).split("\n");
      let i = dongTruoc.length - 1;
      while (i >= 0 && /^\s*\|/.test(dongTruoc[i]!)) i--;
      const tieuDe = dongTruoc[i + 1] ?? "";
      if (/so với|Baseline|Tiến độ mục tiêu/i.test(tieuDe)) return false;
    }
    // dạng gọn Telegram: dòng «Cột: … So với Baseline …» đứng đầu khối gạch đầu dòng
    if (/^\s*•/.test(traLoi.slice(dau, m.index!))) {
      const dongTruoc = traLoi.slice(0, Math.max(0, dau - 1)).split("\n");
      for (let i = dongTruoc.length - 1; i >= 0 && /\S/.test(dongTruoc[i]!); i--) {
        if (/^\s*Cột:/.test(dongTruoc[i]!)) return !/so với|Baseline|Tiến độ mục tiêu/i.test(dongTruoc[i]!);
      }
    }
    return true;
  });
  if (chamTron) loi.push(`«${chamTron[0]}» không ghi so với hệ nào (luật 36)`);
  // 27/10 Mr. Đại chốt: gọn văn phong ≠ gọn thông tin — danh sách đủ mục dài là ĐÚNG; chỉ báo khi quá dài bất thường
  if (traLoi.length > 6000) loi.push(`dài ${traLoi.length} ký tự — soát có chữ thừa không (KHÔNG bớt mục)`);
  // 31/10: «nhieu» là ghi chú «nhiều công cụ», không phải tên; «nghiemthu» / «hopdong» là nhóm → khớp theo tiền tố tên công cụ
  const can = mongDoi.split("+").map((x) => x.trim()).filter((x) => /^[a-z_]+$/.test(x) && x !== "nhieu");
  const thieu = can.filter((c) => !daGoi.some((g) => g === c || g.startsWith(c + "_")));
  if (can.length && thieu.length === can.length) loi.push(`không gọi công cụ mong đợi (${can.join(", ")})`);
  return loi;
}

// ── KIỂM 3 TẦNG (Mr. Đại chốt 27/10/2026 — phương án 1, tiết kiệm lượt AI) ──
// ① --chon-cong-cu : chấm bộ chọn công cụ cả bộ câu, KHÔNG gọi AI
// ② --cham-lai <tệp.jsonl> : chạy lại lưới gọn Telegram + chấm trên câu trả lời GỐC đã lưu, KHÔNG gọi AI
// ③ chạy AI thật chỉ cho câu vừa đổi (--chi …); cả bộ chỉ chạy ở đợt cuối
if (process.argv.includes("--chon-cong-cu")) {
  const { chonCongCu, khuonCauQuen } = await import("@/lib/ai/chon-cong-cu");
  const { listProjects } = await import("@/lib/projects");
  const loai = (u.role === "pm" || u.role === "admin" ? u.role : "engineer") as never;
  const { TOOL_SPECS } = await import("@/lib/ai/chat-types");
  const coThat = new Set(TOOL_SPECS.map((s) => s.name));
  let dat = 0, tong = 0;
  const truot: string[] = [];
  const chuaXay: string[] = [];
  for (const [ma, nhom, cau, mongDoi] of bo) {
    if (nhom === "bien" || (chi.size && !chi.has(ma!))) continue;
    const can = mongDoi!.split("+").map((x) => x.trim()).filter((x) => /^[a-z_]+$/.test(x));
    if (!can.length) continue;
    // Công cụ mong đợi chưa có trong danh mục = việc đợt 3 (công cụ mới) — đếm riêng, không tính là bộ chọn sai
    if (can.every((c) => !coThat.has(c))) { chuaXay.push(`${ma} (${can.join(", ")})`); continue; }
    tong++;
    const coSan = chonCongCu(loai, cau!).map((s) => s.name);
    const goiTruoc = khuonCauQuen(cau!, listProjects()).map((c) => c.name);
    const thieu = can.filter((c) => !coSan.includes(c) && !goiTruoc.includes(c));
    if (thieu.length < can.length) dat++;
    else truot.push(`${ma} «${cau}» — mong ${can.join(", ")} · danh mục đưa: ${coSan.length} · gọi trước: ${goiTruoc.join(", ") || "—"}`);
  }
  console.log(`① Chọn công cụ: ${dat}/${tong} câu có công cụ mong đợi trong tay AI`);
  for (const t of truot) console.log("  ✗ " + t);
  console.log(`Chưa có công cụ (việc đợt 3): ${chuaXay.length} câu — ${chuaXay.join(" · ")}`);
  process.exit(0);
}
const chamLai = arg("cham-lai");
if (chamLai) {
  const tep = path.isAbsolute(chamLai) ? chamLai : path.join(thuMuc, chamLai);
  const dong = fs.readFileSync(tep, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  let dat = 0, dat0 = 0, rong = 0;
  const ra: string[] = [];
  for (const d of dong) {
    if (!d.tra_loi_goc || /^lỗi chạy/.test(d.loi_tu_dong?.[0] ?? "")) continue;
    if (chi.size && !chi.has(d.ma)) continue;
    const moi = gonChoTelegram(d.tra_loi_goc, d.cau);
    const loi = cham(moi, d.mong_doi, d.da_goi);
    if (moi.trim() === "") { rong++; loi.push("lưới làm rỗng câu trả lời"); }
    if (loi.length === 0) dat++;
    if ((d.loi_tu_dong ?? []).length === 0) dat0++;
    if (loi.length) ra.push(`  ✗ ${d.ma}: ${loi.join("; ")}`);
  }
  console.log(`② Chấm lại không gọi AI trên ${path.basename(tep)}: đạt ${dat} (lần chạy gốc ${dat0}) · rỗng ${rong}`);
  for (const r of ra) console.log(r);
  process.exit(0);
}

(async () => {
  let stt = 0;
  for (const [ma, nhom, cau, mongDoi, man] of bo) {
    stt++;
    if (stt < tu || stt > den) continue;
    if (chi.size && !chi.has(ma!)) continue;
    if (nhom === "bien") continue; // ca biên là kịch bản người làm, không phải câu gõ thẳng
    const t = Date.now();
    let goc0 = "";
    let daGoi: string[] = [];
    let loiChay: string | null = null;
    try {
      const kq = await runChatAgent({
        projectId: duAn,
        email: u.email,
        role: u.role === "pm" || u.role === "admin" ? "pm" : "engineer",
        loai: u.role,
        tenLoai: u.role,
        message: cau!,
        history: [],
        lichSuCaNgay: true,
        timWebBat: false,
        kenh: "telegram",
      } as never);
      goc0 = kq.reply;
      daGoi = kq.actions.map((a: { name: string }) => a.name);
    } catch (e) {
      loiChay = e instanceof Error ? e.message : String(e);
    }
    const traLoi = gonChoTelegram(goc0, cau!);
    const dong = {
      ma, nhom, cau, mong_doi: mongDoi, man,
      giay: Math.round((Date.now() - t) / 1000),
      da_goi: daGoi,
      loi_tu_dong: loiChay ? [`lỗi chạy: ${loiChay}`] : cham(traLoi, mongDoi!, daGoi),
      tra_loi: traLoi,
      tra_loi_goc: goc0,
    };
    fs.appendFileSync(tepJsonl, JSON.stringify(dong) + "\n", "utf8");
    console.log(`${ma} · ${dong.giay}s · ${dong.loi_tu_dong.length ? dong.loi_tu_dong.join("; ") : "đạt tự động"}`);
  }
  // Tóm tắt .md
  const kq = fs.readFileSync(tepJsonl, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const dat = kq.filter((d) => d.loi_tu_dong.length === 0).length;
  const md = [
    `# Kết quả chạy bộ câu hỏi — ${ten.replace(/-(\d{2})(\d{2})$/, " $1:$2")} (tài khoản ${email})`,
    "",
    `Đạt chấm tự động: **${dat}/${kq.length}** · thời gian trung bình ${Math.round(kq.reduce((a, d) => a + d.giay, 0) / Math.max(1, kq.length))} giây/câu`,
    "",
    "| Mã | Câu | Giây | Lỗi tự động |",
    "|---|---|---|---|",
    ...kq.map((d) => `| ${d.ma} | ${d.cau} | ${d.giay} | ${d.loi_tu_dong.join("; ") || "—"} |`),
  ].join("\n");
  fs.writeFileSync(tepJsonl.replace(/\.jsonl$/, ".md"), md, "utf8");
  console.log(`XONG ${dat}/${kq.length} → ${tepJsonl}`);
})();
