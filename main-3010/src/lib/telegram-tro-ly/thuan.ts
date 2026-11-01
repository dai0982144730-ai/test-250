// ============================================================
// CẦU NỐI TELEGRAM ↔ TRỢ LÝ MAIN — PHẦN THUẦN (Mr. Đại chốt 25/09/2026)
//
// FILE THUẦN: không node:fs, không fetch — client, server, test đều import
// được (luật 10). Chứa: đọc lệnh (/start /moi /noi /giup), xét quyền người
// nhắn, chia khúc ≤ 4.000 ký tự, đổi Markdown của trợ lý sang HTML an toàn
// mà Telegram hiển thị được, mô tả việc chờ bấm ✅ Làm.
// ============================================================

import { duocCaiDat, duocGhi, NHAN_LOAI, type Role } from "@/lib/quyen";

/** Tên bot — hiện ở màn nối và câu hướng dẫn */
export const TEN_BOT = "SCI_Main_agent_bot";

/** Trần một tin Telegram là 4.096 ký tự; chữ gốc chia ở 4.000 (Mr. Đại chốt) */
export const TRAN_KHUC = 4000;
/** Trần HTML sau khi đổi (thẻ <b>, &amp;… làm dài thêm) */
export const TRAN_TIN_TELEGRAM = 4096;
/** Mã nối sống bao lâu */
export const HAN_MA_NOI_MS = 10 * 60 * 1000;
/** Việc chờ bấm ✅ Làm quá hạn 24 giờ — định nghĩa ở lib/ai/cho-duyet.ts (dùng chung web) */
export { HAN_CHO_DUYET_MS } from "@/lib/ai/cho-duyet";
/** Số lần gõ sai mã nối tối đa trong một cửa sổ hạn mã, mỗi chat */
export const TRAN_SAI_MA = 5;
/** Câu hỏi dài tối đa — giống trợ lý web */
export const TRAN_CAU_HOI = 4000;

// ===== Lệnh =====

export type Lenh =
  | { loai: "start" }
  | { loai: "giup" }
  | { loai: "moi" }
  | { loai: "noi"; ma: string }
  | { loai: "cau-hoi"; chu: string };

/** "/noi 123456", "/noi@SCI_Main_agent_bot 123456", "/moi"… → lệnh; còn lại là câu hỏi */
export function docLenh(chu: string): Lenh {
  const t = chu.trim();
  const m = t.match(/^\/([a-z]+)(?:@[A-Za-z0-9_]+)?(?:\s+([\s\S]*))?$/i);
  if (!m) return { loai: "cau-hoi", chu: t };
  const ten = m[1]!.toLowerCase();
  const du = (m[2] ?? "").trim();
  // Link sâu t.me/<bot>?start=noi_123456 → Telegram gửi "/start noi_123456"
  if (ten === "start") {
    const sau = du.match(/^noi_(\d{6})$/);
    return sau ? { loai: "noi", ma: sau[1]! } : { loai: "start" };
  }
  if (ten === "giup" || ten === "help") return { loai: "giup" };
  if (ten === "moi" || ten === "new") return { loai: "moi" };
  if (ten === "noi") return { loai: "noi", ma: du.replace(/\s+/g, "") };
  // "/ten-skill …" của trợ lý web vẫn là câu hỏi — để nguyên cho trợ lý
  return { loai: "cau-hoi", chu: t };
}

// ===== Quyền người nhắn =====

export interface NguoiNhan {
  email: string;
  name: string;
  role: Role;
  active: boolean;
}

export type KetQuaXet =
  | { duoc: true; nguoi: NguoiNhan; role: "pm" | "engineer"; tenLoai: string }
  | { duoc: false; lyDo: "chua-noi" | "bi-khoa" | "nguoi-xem"; cau: string };

/**
 * Người nhắn có được dùng trợ lý qua Telegram không. `nguoi` phải đọc từ sổ
 * NGAY lúc nhận tin (không nhớ đệm) để đổi loại / khoá có hiệu lực tức thì.
 * Tài khoản đã xoá = không còn trong sổ = như chưa nối.
 */
export function xetNguoiNhan(nguoi: NguoiNhan | null): KetQuaXet {
  if (!nguoi) {
    return { duoc: false, lyDo: "chua-noi", cau: huongDanNoi() };
  }
  if (!nguoi.active) {
    return {
      duoc: false,
      lyDo: "bi-khoa",
      cau: `Tài khoản ${nguoi.email} đang bị khoá trên Main — trợ lý không trả lời qua Telegram. Nhờ Admin mở khoá.`,
    };
  }
  if (!duocGhi(nguoi.role)) {
    return {
      duoc: false,
      lyDo: "nguoi-xem",
      cau: `Tài khoản ${NHAN_LOAI[nguoi.role]} không dùng trợ lý qua Telegram — cần loại Người dùng trở lên. Nhờ Admin đổi loại tài khoản.`,
    };
  }
  // Cùng quy đổi với route chat web: PM/Admin = bậc "pm" của sổ lệnh trợ lý
  const role: "pm" | "engineer" = duocCaiDat(nguoi.role) ? "pm" : "engineer";
  return { duoc: true, nguoi, role, tenLoai: NHAN_LOAI[nguoi.role] };
}

export function huongDanNoi(): string {
  return [
    "Chat này chưa nối với tài khoản Main nào (hoặc tài khoản đã bị xoá).",
    "Cách nối: đăng nhập website Main → góc dưới thanh bên trái bấm biểu tượng ✈ «Nối Telegram» → lấy mã 6 số → nhắn vào đây: /noi 123456",
    "Mã sống 10 phút. Chỉ tài khoản PM, Admin, Người dùng dùng được trợ lý qua Telegram.",
  ].join("\n");
}

export function loiChao(ten: string, tenLoai: string): string {
  return [
    `Chào ${ten} (${tenLoai}) — đây là Trợ lý Main.`,
    "• Nhắn câu hỏi như trên website, mình đi hỏi 4 agent rồi trả lời.",
    "• Việc có ghi dữ liệu (giao việc…) mình gửi nút ✅ Làm / ❌ Bỏ — anh bấm Làm mới chạy.",
    "• /moi — mở phiên trò chuyện mới (phiên cũ vẫn xem được trên website, mục trợ lý). Không gõ thì 0 giờ mỗi ngày tự mở phiên mới.",
  ].join("\n");
}

// ===== Chia khúc =====

/**
 * Chia chữ thành các khúc ≤ `tran` ký tự, ưu tiên cắt ở đoạn trống → xuống
 * dòng → dấu cách; KHÔNG cắt giữa từ (trừ khi một "từ" dài hơn cả khúc — vd
 * đường link khổng lồ — thì buộc cắt cứng).
 */
export function chiaKhuc(chu: string, tran: number = TRAN_KHUC): string[] {
  const khuc: string[] = [];
  let con = chu.replace(/\r\n/g, "\n").trim();
  while (con.length > tran) {
    const dau = con.slice(0, tran + 1);
    let cat = -1;
    for (const moc of ["\n\n", "\n", " "]) {
      const i = dau.lastIndexOf(moc, tran);
      if (i > tran * 0.3) {
        cat = i;
        break;
      }
    }
    if (cat <= 0) cat = tran; // một từ dài hơn cả khúc → cắt cứng
    khuc.push(con.slice(0, cat).trimEnd());
    con = con.slice(cat).trimStart();
  }
  if (con !== "") khuc.push(con);
  return khuc;
}

// ===== Markdown → HTML Telegram =====

export function maHoaHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** HTML Telegram → chữ thường (khi Telegram chê HTML thì gửi lại bằng cái này) */
export function boTheHtml(html: string): string {
  return html
    .replace(/<a href="([^"]*)">([\s\S]*?)<\/a>/g, (_m, u: string, t: string) => (t === u ? t : `${t} (${u})`))
    .replace(/<\/?(b|i|code|pre)>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** Lệnh bot — không biến thành link dù trông giống đường dẫn */
const LENH_BOT = new Set(["/moi", "/new", "/start", "/noi", "/giup", "/help"]);

function duongDayDu(u: string, goc: string): string | null {
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("/")) return goc.replace(/\/+$/, "") + u;
  return null;
}

/**
 * Markdown trợ lý viết (**đậm**, `mã`, ```khối```, # tiêu đề, [chữ](link),
 * bảng |a|b|, gạch đầu dòng) → HTML Telegram an toàn. Mọi chữ khác đều được
 * mã hoá & < > nên không bao giờ làm Telegram từ chối cả tin.
 * Link tương đối "/viec-cua-toi" → địa chỉ Main theo cấu hình (`goc`).
 */
export function mdSangHtml(md: string, goc: string): string {
  const giu: string[] = [];
  const cat = (html: string) => {
    giu.push(html);
    return `\u0000${giu.length - 1}\u0000`;
  };
  let s = md.replace(/\r\n/g, "\n");
  // Khối mã
  s = s.replace(/```[a-zA-Z0-9_-]*\n?([\s\S]*?)```/g, (_m, t: string) => cat(`<pre>${maHoaHtml(t.trimEnd())}</pre>`));
  // Mã một dòng
  s = s.replace(/`([^`\n]+)`/g, (_m, t: string) => cat(`<code>${maHoaHtml(t)}</code>`));
  // Link [chữ](url)
  s = s.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (m, t: string, u: string) => {
    const du = duongDayDu(u, goc);
    return du ? cat(`<a href="${maHoaHtml(du)}">${maHoaHtml(t)}</a>`) : m;
  });
  // Link trần http(s)
  s = s.replace(/https?:\/\/[^\s<>()]+[^\s<>().,;:!?»”'"]/g, (u) => cat(`<a href="${maHoaHtml(u)}">${maHoaHtml(u)}</a>`));
  // Đường dẫn tương đối đứng riêng: "màn /viec-cua-toi" → link về Main
  s = s.replace(/(^|[\s(«])(\/[a-z][a-z0-9-]*(?:\/[a-z0-9-]+)*)(?=$|[\s).,;:!?»])/gm, (m, truoc: string, p: string) => {
    if (LENH_BOT.has(p)) return m;
    const du = duongDayDu(p, goc)!;
    return truoc + cat(`<a href="${maHoaHtml(du)}">${maHoaHtml(du)}</a>`);
  });

  const dong = s.split("\n").flatMap((d): string[] => {
    // Dòng kẻ của bảng |---|---| → bỏ
    if (/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(d)) return [];
    let x = d;
    // Bảng |a|b| → "a · b"
    if (/^\s*\|.*\|\s*$/.test(x)) {
      x = x
        .trim()
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((c) => c.trim())
        .filter((c) => c !== "")
        .join(" · ");
    }
    const tieuDe = x.match(/^\s*#{1,6}\s+(.*)$/);
    x = maHoaHtml(tieuDe ? tieuDe[1]! : x);
    x = x.replace(/^(\s*)[-*]\s+/, "$1• ");
    x = x.replace(/\*\*([^*\n]+?)\*\*/g, "<b>$1</b>").replace(/__([^_\n]+?)__/g, "<b>$1</b>");
    if (tieuDe) x = `<b>${x}</b>`;
    return [x];
  });
  // \u0000 đã qua maHoaHtml nguyên vẹn → trả các mảnh HTML giữ chỗ về
  return dong.join("\n").replace(/\u0000(\d+)\u0000/g, (_m, i: string) => giu[Number(i)] ?? "");
}

// ===== Gọn cho Telegram (Mr. Đại chốt 26/10/2026) =====
// Ba tiêu chí: chính xác · ngắn gọn dễ hiểu · không thông tin thừa. Dặn AI rồi vẫn tái phạm nên CODE chặn:
//   ① bảng → từng khối «• **cột đầu** — cột: giá trị · …» (Telegram không vẽ bảng; trước đây thành dải «a · b · c»)
//   ② bỏ mã việc CV-… và tên công cụ máy (base.tai_viec_theo_nguoi…) — người đọc không dùng vào việc gì
//   ③ bỏ dòng chỉ dẫn máy (localhost / 127.0.0.1 / Cài đặt → Kết nối) — người hỏi không sửa máy, link localhost không mở được trên điện thoại

// Tên công cụ máy: «tiendo.du_bao», «base.tai_viec_theo_nguoi», «nghiemthu_khoi_luong_da_nghiem_thu» kèm dấu nối đứng trước
// (kiểm độc lập TG-05: trước chỉ bắt dạng sau «·», sót 6/47 câu thật)
const RE_CONG_CU_MAY = /\s*[·,]?\s*\b(?:base|tiendo|hopdong|phaply|nghiemthu|main|socai|lichsu)[._][a-z][a-z_]{2,}\b/g;
const COT_THU_TU = /^(#|stt|tt)$/i;
const RE_MAY_CUC_BO = /localhost|127\.0\.0\.1/i;
const RE_CAI_DAT_KET_NOI = /Cài đặt\s*(?:→|->|>|-|–|—|›)\s*Kết nối/i;
const RE_CAU_SU_VIEC = /chưa có số liệu|không trả lời|không nối được|không phản hồi|đang tắt|tạm không|^\s*kỹ thuật:/i;

function oBang(d: string): string[] {
  return d.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
}

function bangThanhKhoi(s: string): string {
  const dong = s.split("\n");
  const ra: string[] = [];
  let i = 0;
  const laBang = (d: string | undefined) => d !== undefined && /^\s*\|.*\|\s*$/.test(d);
  const laKe = (d: string | undefined) => d !== undefined && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(d);
  while (i < dong.length) {
    if (!(laBang(dong[i]) && laKe(dong[i + 1]))) {
      ra.push(dong[i]!);
      i++;
      continue;
    }
    const dau = oBang(dong[i]!);
    const dauBang = i;
    i += 2;
    const hang: string[][] = [];
    while (laBang(dong[i])) hang.push(oBang(dong[i++]!));
    // Bảng nhỏ (≤ 3 cột, ô ngắn) giữ dạng bảng — đổi sang khối chỉ làm dài thêm (kiểm độc lập TG-11)
    const nho = dau.length <= 3 && hang.every((o) => o.every((c) => c.length <= 30));
    if (nho) {
      ra.push(...dong.slice(dauBang, i));
      continue;
    }
    const kThuTu = dau.findIndex((h) => COT_THU_TU.test(h));
    // Đợt 2 (đóng vai người dùng, câu TD-05): cột có CÙNG giá trị ở mọi dòng (≥ 3 dòng) → nói MỘT lần ở đầu, không lặp từng dòng
    const cotChung = new Set<number>();
    if (hang.length >= 3) {
      dau.forEach((h, k) => {
        if (k === kThuTu || k === 0) return;
        const v0 = hang[0]![k] ?? "";
        if (v0 !== "" && hang.every((o) => o.length === dau.length && (o[k] ?? "") === v0)) cotChung.add(k);
      });
      // Đợt 2: cột chung toàn số 0 / «—» → MỘT dòng «Không dòng nào có: Việc găng» (kiểm độc lập N4: bỏ hẳn là mất tin
      // «không có quá hạn / găng»; Mr. Đại 27/10: gọn văn phong, không gọn thông tin)
      const laRong = (k: number) => /^(0|—|-|–|không|chưa có)$/i.test((hang[0]![k] ?? "").trim());
      const noi = Array.from(cotChung).filter((k) => !laRong(k));
      const rong = Array.from(cotChung).filter(laRong);
      if (noi.length > 0) ra.push(noi.map((k) => `${dau[k]}: ${hang[0]![k]}`).join(" · ") + " (mọi dòng)");
      if (rong.length > 0) ra.push(`Không dòng nào có: ${rong.map((k) => dau[k]).join(", ")}`);
    }
    const giu = dau.map((h, k) => ({ h, k })).filter(({ k }) => k !== kThuTu && !cotChung.has(k));
    // Mr. Đại chốt 27/10 (câu kiểm độc lập Đợt 2, chọn 1): bảng ≥ 6 dòng → tên cột in MỘT lần ở đầu, mỗi dòng chỉ còn giá trị
    // («• tên — Vàng · 316»), GIỮ ĐỦ mọi dòng và mọi ô (ô trống ghi «—» để giữ đúng vị trí cột)
    const motLanTenCot = hang.length >= 6 && giu.length >= 2;
    if (motLanTenCot) {
      const ghepMa = /^mã/i.test(giu[0]!.h) && giu.length >= 3;
      const cotSau = giu.slice(ghepMa ? 2 : 1).map(({ h }) => h);
      if (cotSau.length > 0) ra.push(`Cột: ${cotSau.join(" · ")}`);
    }
    for (const o of hang) {
      if (motLanTenCot && o.length === dau.length) {
        const ghepMa = /^mã/i.test(giu[0]!.h) && giu.length >= 3;
        const v = (k: number) => {
          const x = (o[k] ?? "").trim();
          return x === "" || x === "-" ? "—" : x;
        };
        let tenKhoi = v(giu[0]!.k);
        if (ghepMa) {
          const maChu = tenKhoi.replace(/\*\*/g, "").replace(/…$/, "").trim();
          const laMa = /^(?:[A-Z]{1,5}[-.]?)*\d/.test(maChu) || /^[A-Z]{2,}(?:-[A-Z0-9]+)+$/.test(maChu);
          const tenSau = v(giu[1]!.k);
          const dauMaChu = maChu.split(/\s+/).slice(0, 3).join(" ").toLowerCase();
          tenKhoi = maChu === "—" ? tenSau : !laMa && dauMaChu !== "" && tenSau.toLowerCase().includes(dauMaChu) ? tenSau : `${tenKhoi} ${tenSau}`;
        }
        const conLai = giu.slice(ghepMa ? 2 : 1).map(({ k }) => v(k));
        const thuTu = kThuTu >= 0 && (o[kThuTu] ?? "").trim() !== "" ? `${o[kThuTu]!.trim().replace(/\.$/, "")}. ` : "• ";
        const ten = `**${tenKhoi.replace(/\*\*/g, "")}**`;
        ra.push(conLai.length === 0 ? `${thuTu}${ten}` : `${thuTu}${ten} — ${conLai.join(" · ")}`);
        continue;
      }
      if (o.length !== dau.length) {
        ra.push(`• ${o.filter((c) => c !== "").join(" · ")}`);
        continue;
      }
      const cot = giu.map(({ h, k }) => ({ h, v: o[k] ?? "" })).filter(({ v }) => v !== "" && v !== "—" && v !== "-");
      if (cot.length === 0) continue;
      let [dauTien, ...con] = cot;
      // Cột «Mã …» đứng đầu thì ghép «mã + tên» làm đầu khối (luật 30; giữ mã quy tắc P01–P10 — TG-08)
      let tenKhoi = dauTien!.v;
      if (/^mã/i.test(dauTien!.h) && con.length > 0) {
        // Đợt 2 (27/10, CV-02): ô «Mã» sau khi bỏ CV- còn sót chữ («Làm hồ sơ pháp lý», «Bổ sung khối lượng…») mà ô tên đã có
        // → chỉ lấy tên, khỏi lặp. Ô mã thật (P02, HV-K-09, 6.1.4, NT-03) vẫn ghép «mã + tên».
        const maChu = dauTien!.v.replace(/\*\*/g, "").replace(/…$/, "").trim();
        const laMa = /^(?:[A-Z]{1,5}[-.]?)*\d/.test(maChu) || /^[A-Z]{2,}(?:-[A-Z0-9]+)+$/.test(maChu);
        const dauMaChu = maChu.split(/\s+/).slice(0, 3).join(" ").toLowerCase();
        tenKhoi = !laMa && dauMaChu !== "" && con[0]!.v.toLowerCase().includes(dauMaChu) ? con[0]!.v : `${dauTien!.v} ${con[0]!.v}`;
        con = con.slice(1);
      }
      // Gỡ «**» bên trong rồi mới bọc đậm — tránh đậm lồng hiện «****» (TG-07)
      const ten = `**${tenKhoi.replace(/\*\*/g, "")}**`;
      const thuTu = kThuTu >= 0 && (o[kThuTu] ?? "").trim() !== "" ? `${o[kThuTu]!.trim().replace(/\.$/, "")}. ` : "• ";
      ra.push(con.length === 0 ? `${thuTu}${ten}` : `${thuTu}${ten} — ${con.map(({ h, v }) => (h ? `${h}: ${v}` : v)).join(" · ")}`);
    }
  }
  return ra.join("\n");
}

/** Đánh lại số thứ tự danh sách 1. 2. 3. sau khi bỏ dòng (kiểm độc lập TG-06: còn «2. 3.» lẻ) */
function danhLaiSo(dong: string[]): string[] {
  let n = 0;
  return dong.map((d) => {
    const m = d.match(/^(\s*)\d+\.\s+(.*)$/);
    if (!m) {
      if (d.trim() !== "") n = 0;
      return d;
    }
    n++;
    return `${m[1]}${n}. ${m[2]}`;
  });
}

/**
 * Lưới gọn chữ trợ lý trước khi gửi Telegram — chạy trên câu AI viết (không chạy trên link Main tự thêm).
 * `cauHoi`: mã CV- người hỏi tự nêu thì GIỮ (kiểm độc lập TG-09).
 */
export function gonChoTelegram(md: string, cauHoi = ""): string {
  let s = md.replace(/\r\n/g, "\n").replace(RE_CONG_CU_MAY, "");
  // ② Mã việc CV-: bỏ cả cụm «mã việc là CV-…», mã đứng cạnh dấu nối; người hỏi nêu đúng mã thì giữ
  const giuMa = (ma: string) => cauHoi.includes(ma);
  s = s.replace(/[,;]?\s*(?:mã việc|mã)\s*(?:là\s*)?:?\s*(CV-\d{4}-\d{3,6})/gi, (khop: string, ma: string) => (giuMa(ma) ? khop : ""));
  s = s.replace(/\b(CV-\d{4}-\d{3,6})\b(?:\s*[:—–-](?=\s))?\s*/g, (khop: string, ma: string) => (giuMa(ma) ? khop : ""));
  s = s.replace(/\s*\(\s*\)/g, "").replace(/\(\s*nguồn:\s*\)/g, "");
  // ③ Chỉ dẫn máy: câu nêu SỰ VIỆC («agent chưa có số liệu») giữ, chỉ cắt địa chỉ; dòng chỉ dẫn thì bỏ (TG-06, TG-16)
  const dong: string[] = [];
  for (const d of s.split("\n")) {
    const coMay = RE_MAY_CUC_BO.test(d) || RE_CAI_DAT_KET_NOI.test(d);
    if (!coMay) {
      dong.push(d);
      continue;
    }
    // Đợt 2 (câu TD-14 thật: cả câu trả lời nằm trên một dòng có link localhost → bị xoá, người dùng nhận tin RỖNG):
    // chỉ bỏ dòng CHỈ DẪN máy; dòng nội dung thì giữ, link localhost còn chữ, địa chỉ bị cắt
    const laChiDan = /^\s*(?:[-*•]|\d+\.)?\s*(?:\*\*)?(?:vào|kiểm tra|bật|mở|truy cập|khởi động|chạy lại|xem trực tiếp)\b/i.test(d) || RE_CAI_DAT_KET_NOI.test(d);
    if (!laChiDan && !RE_CAU_SU_VIEC.test(d)) {
      const sach = d.replace(/\[([^\]]+)\]\((?:https?:\/\/)?(?:localhost|127\.0\.0\.1)[^)]*\)/gi, "$1").trimEnd();
      if (sach.trim() !== "") dong.push(sach);
      continue;
    }
    if (RE_CAU_SU_VIEC.test(d)) {
      const sach = d
        .replace(/\s*[(—–-]?\s*(?:không nối được tới\s*)?https?:\/\/(?:localhost|127\.0\.0\.1)[^\s)]*\)?/gi, "")
        .replace(/\s*\(\s*\)/g, "")
        .trimEnd();
      if (sach.trim() !== "") dong.push(sach);
    }
  }
  // Kiểm độc lập đợt 2 (ND): link tương đối «[Hợp đồng](/hop-dong)», «[Cảnh báo](/alerts)» bấm trên Telegram không mở được → chữ thường
  s = danhLaiSo(dong).join("\n").replace(/\[Cài đặt\]\([^)]*\)/g, "Cài đặt").replace(/\[([^\]\n]+)\]\(\/[^)\s]*\)/g, "$1");
  // Kiểm độc lập đợt 1 NC-09: địa chỉ nội bộ không «http://», đường dẫn ổ đĩa, chuỗi khoá — người đọc điện thoại không dùng được, không được lộ
  s = s
    .replace(/(?:https?:\/\/)?(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/[^\s)]*)?/gi, "")
    // Kiểm độc lập BA-04 (27/10): thư mục có dấu cách («D:\3 SETUP\log.txt») trước đây chỉ cắt «D:\3», lộ «SETUP\log.txt»
    // → ăn mọi đoạn «…\» (cho phép dấu cách trong tên thư mục), đoạn cuối không dấu cách
    .replace(/\b[A-Za-z]:\\(?:[^\\\n,;)»"]*\\)*[^\s\\,;)»"]*/g, "")
    .replace(/\bsk-[A-Za-z0-9_-]{10,}/g, "")
    .replace(/\s*\(\s*\)/g, "")
    // Đợt 2 (27/10, PL-06): thẻ <br> trong ô bảng / chữ cổng → « · » (Telegram không hiểu thẻ này)
    .replace(/\s*<br\s*\/?>\s*/gi, " · ");
  const khoi = bangThanhKhoi(s);
  const gon = boTieuDeTrong(khoi)
    // Đợt 2 (27/10, CV-08): gạch đầu dòng rỗng «-» / «•» đứng một mình
    .replace(/^[ \t]*[-*•][ \t]*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  // Chốt chặn (kiểm độc lập đợt 2 M2-02): lưới KHÔNG BAO GIỜ được làm rỗng một câu trả lời có chữ
  return gon !== "" ? gon : khoi.replace(/\n{3,}/g, "\n\n").trim();
}

/** Tiêu đề (dòng chỉ có **đậm** hoặc # …) mà bên dưới không có nội dung trước tiêu đề kế / hết bài → bỏ (đợt 2, câu TD-08) */
function boTieuDeTrong(s: string): string {
  const dong = s.split("\n");
  // Kiểm độc lập đợt 2 M2-02: câu kết luận in đậm («**Không có việc nào quá hạn.**») KHÔNG phải tiêu đề — trước đây bị nuốt thành
  // tin rỗng. Tiêu đề = dòng «#», hoặc dòng đậm viết IN HOA, hoặc kết thúc bằng «:»
  const laTieuDe = (d: string) => {
    if (/^\s*#{1,6}\s+.+$/.test(d)) return true;
    const m = d.match(/^\s*\*\*([^*]+)\*\*(:?)\s*$/);
    if (!m) return false;
    const chu = m[1]!.trim();
    return m[2] === ":" || /:$/.test(chu) || chu === chu.toUpperCase();
  };
  const ra: string[] = [];
  for (let i = 0; i < dong.length; i++) {
    if (laTieuDe(dong[i]!)) {
      let j = i + 1;
      while (j < dong.length && dong[j]!.trim() === "") j++;
      if (j >= dong.length || laTieuDe(dong[j]!)) continue;
    }
    ra.push(dong[i]!);
  }
  return ra.join("\n");
}

/**
 * Chia câu trả lời thành các tin HTML: chia chữ gốc ở TRAN_KHUC, đổi từng khúc
 * sang HTML; khúc nào phình quá trần Telegram sau khi đổi thì chia nhỏ tiếp.
 */
export function thanhCacTin(md: string, goc: string): string[] {
  const ra: string[] = [];
  const lam = (chu: string, tran: number) => {
    for (const k of chiaKhuc(chu, tran)) {
      const h = mdSangHtml(k, goc);
      if (h.length <= TRAN_TIN_TELEGRAM || tran < 500) ra.push(h.slice(0, TRAN_TIN_TELEGRAM));
      else lam(k, Math.floor(tran / 2));
    }
  };
  lam(md, TRAN_KHUC);
  return ra.length > 0 ? ra : ["(trợ lý không có nội dung trả lời)"];
}

// ===== Việc chờ bấm ✅ Làm =====
// Dời sang lib/ai/cho-duyet.ts (25/09) — MỘT cơ chế cho cả web và Telegram.
export { moTaViecCho } from "@/lib/ai/cho-duyet";

// ===== Lỗi AI → câu dễ hiểu =====

export function cauLoiAI(loi: string): string {
  const t = loi.toLowerCase();
  if (/429|rate.?limit|quota|usage limit|hạn mức|credit|overloaded|529/.test(t)) {
    return `Trợ lý AI đang hết hạn mức hoặc quá tải — anh thử lại sau ít phút. (Chi tiết: ${loi.slice(0, 200)})`;
  }
  if (/chưa cấu hình|chưa nhập api key/.test(t)) {
    return `Trợ lý AI chưa được cấu hình trên Main: ${loi.slice(0, 200)}`;
  }
  return `Trợ lý AI chưa trả lời được: ${loi.slice(0, 300)}`;
}

// ===== Tin ⏳ «đã nhận» (Mr. Đại gật 26/10/2026) =====
// Đo 26/10 15:41: câu hỏi chạy 45 giây (AI viết 44,5 giây) mà bot chỉ có chữ «đang nhập…» nhỏ dưới
// tên; câu thứ hai xếp hàng sau câu đầu mà không báo → người hỏi tưởng hệ thống hỏng.
// Gửi NGAY khi nhận câu hỏi, trả lời thẳng vào câu hỏi; có câu trả lời thì xoá tin này.

/**
 * Thời gian thường gặp — đo 26/10 lúc 17:38 trên sổ trợ lý Telegram `data/telegram-tro-ly/nhat-ky.jsonl` (24 câu trả lời được, 25/09–26/10; số của lúc đo):
 * nhanh nhất 9 giây, trung vị 44 giây, 21/24 câu (88%) dưới 1 phút, lâu nhất 119 giây. (Bản đầu ghi «20–60 giây» lấy nhầm số
 * thời gian AI của cả trợ lý web lẫn Telegram — kiểm độc lập 26/10 lần 2, C-2: chỉ 63% câu Telegram nằm trong 20–60 giây.)
 */
export const THOI_GIAN_THUONG = "dưới 1 phút";

/** `thuTu` = câu này đứng thứ mấy trong hàng của chat (1 = không phải chờ câu nào) */
export function cauDaNhan(thuTu: number): string {
  if (!(thuTu > 1)) return `⏳ Đã nhận câu hỏi — đang tra số liệu, thường mất ${THOI_GIAN_THUONG}.`;
  const truoc = thuTu - 1 === 1 ? "câu trước" : `${thuTu - 1} câu trước`;
  return `⏳ Đã nhận câu hỏi — đang trả lời ${truoc}, câu này xếp thứ ${thuTu}. Mỗi câu thường mất ${THOI_GIAN_THUONG}.`;
}

/** Sửa tin ⏳ của câu đang xếp hàng khi đến lượt */
export const CAU_DEN_LUOT = `⏳ Đến lượt câu này — đang tra số liệu, thường mất ${THOI_GIAN_THUONG}.`;

/** Rút gọn một dòng cho sổ nhật ký */
export function rutGon(s: string, tran = 160): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= tran ? t : `${t.slice(0, tran)}…`;
}

// ===== Trạng thái hiện ở Cài đặt =====

export interface TrangThaiNhan {
  bat: boolean;
  /** update_id kế tiếp cần lấy; null = chưa nhận lần nào (lần đầu bỏ tin tồn) */
  offset: number | null;
  /** ISO lần gọi getUpdates thành công gần nhất */
  lanNhanCuoi: string | null;
  /** ISO lúc nhận tin cuối */
  tinCuoiLuc: string | null;
  /** Đếm tin theo ngày giờ VN */
  demNgay: { ngay: string; so: number };
  /** Lỗi nhận gần nhất (tiếng Việt); null = không lỗi */
  loiCuoi: string | null;
}

export const TRANG_THAI_DAU: TrangThaiNhan = {
  bat: true,
  offset: null,
  lanNhanCuoi: null,
  tinCuoiLuc: null,
  demNgay: { ngay: "", so: 0 },
  loiCuoi: null,
};

/** Vòng nhận coi là "đang chạy" khi lần getUpdates thành công gần nhất trong 90 giây */
export function dangChay(tt: TrangThaiNhan, bay: number): boolean {
  if (!tt.bat || !tt.lanNhanCuoi) return false;
  return bay - Date.parse(tt.lanNhanCuoi) < 90_000;
}

/** Offset kế tiếp sau một lô update (không lặp khi khởi động lại) */
export function offsetKeTiep(hienTai: number | null, cacId: number[]): number | null {
  if (cacId.length === 0) return hienTai;
  return Math.max(hienTai ?? 0, ...cacId.map((i) => i + 1));
}
