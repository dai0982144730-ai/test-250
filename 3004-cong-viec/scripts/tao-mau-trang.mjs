// ============================================================
// scripts/tao-mau-trang.mjs — SINH 9 MẪU WORD TRẮNG từ 9 mẫu đã chuyển (mau-word/form-N.docx).
//
// Chạy: node scripts/tao-mau-trang.mjs   → mau-word/trang/form-0.docx … form-8.docx
// (chạy sau node scripts/chuyen-mau-that.mjs mỗi khi mẫu đã chuyển thay đổi)
//
// GIỮ: bố cục, tiêu đề mục, tiêu đề cột, định dạng, mọi w:sdt + w:tag (dấu nhận mẫu, ô nhập, bảng gắn mã),
//      dòng "Gửi: …" (nơi nhận cố định), cột danh mục cố định của bảng (tên chỉ tiêu, nhà máy, khoản mục…).
// XÓA: số liệu ví dụ tuần 29/30 — ô nhập → "......"; kỳ báo cáo → hộp tích bỏ chọn + "....../20...";
//      ô số liệu → trống; bảng danh sách tự do → tiêu đề + 3 dòng trống; bảng gắn mã (kiến nghị, quyết định,
//      kế hoạch, công việc) → tiêu đề + 3 dòng trống; ngày ký → "ngày ...... tháng ...... năm 20...";
//      ảnh biểu đồ số liệu (Form 6, Form 8) → dòng nhắc "chèn biểu đồ" (ảnh là số liệu tuần 29, không phải logo).
// Cách xử lý từng bảng khai ở BANG_THEO_MAU (kiểm tra tiêu đề cột đầu để phát hiện mẫu đổi cấu trúc).
// ============================================================

import JSZip from "jszip";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { W, W14, MAU_THAT, MAU_DUNG_CHUNG, DAU_BAN_9, TAG_BANG_SO_LIEU, conPT, ten, tatCa, conTen, chu, taoPT, datSdt, dienBaoCao, khongDau } from "./chuyen-mau-that.mjs";

const GOC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "mau-word");

export const CHUA_DIEN = "......";
// Bản 9: ô kỳ không còn hộp ☐ đứng trước → không có dấu cách đầu dòng
export const KY_TUAN_TRANG = ["Tuần ....../20...", "  (....../....../20... – ....../....../20...)"];
export const KY_THANG_TRANG = "Tháng ......./20...";
export const NGAY_KY_TRANG = "ngày ...... tháng ...... năm 20...";
export const NHAC_BIEU_DO = "[Chèn biểu đồ số liệu của kỳ báo cáo]";
/** Số dòng trống của bảng danh sách tự do và bảng gắn mã. */
export const SO_DONG_TRONG = 3;

// ---------------- Đặc tả bảng số liệu (bảng KHÔNG gắn mã, theo thứ tự trong thân tài liệu) ----------------
// loai: 'danh_muc' — giữ chữ ở các cột `giu` (danh mục cố định), xóa ô còn lại;
//       'tu_do'    — danh sách thay đổi theo kỳ: giữ dòng tiêu đề + dòng TỔNG (chỉ nhãn), còn lại → 3 dòng trống;
//       'nhom'     — như tu_do nhưng giữ các dòng nhóm (ĐẦU TƯ / TƯ VẤN…), mỗi nhóm `so_dong` dòng trống.
// dau: số dòng tiêu đề; cot_dau: tiêu đề cột đầu (không dấu, bắt đầu bằng) để chắc đúng bảng;
// thay: [RegExp, chữ mới] áp cho chữ còn giữ (tiêu đề, nhãn) — bỏ ngày/tháng/năm của kỳ ví dụ.

const THAY_THANG_NAM = [
  [/tháng \d{1,2}\/\d{4}/g, "tháng ....../20..."],
  [/T1–T\d{1,2}\/\d{4}/g, "T1–T....../20..."],
  [/năm \d{4}/g, "năm 20..."],
];

export const BANG_THEO_MAU = {
  "form-0": [
    { cot_dau: "chi tieu", loai: "danh_muc", dau: 1, giu: [0] },
    { cot_dau: "kpi", loai: "danh_muc", dau: 1, giu: [0, 1] },
    { cot_dau: "ten du an", loai: "tu_do", dau: 2 },
    { cot_dau: "ho so / moc phap ly", loai: "nhom", dau: 1, so_dong: 2 },
  ],
  "form-1": [{ cot_dau: "ho so / moc phap ly", loai: "nhom", dau: 1, so_dong: 2 }],
  "form-2": [
    { cot_dau: "chi tieu", loai: "danh_muc", dau: 1, giu: [0] },
    { cot_dau: "kpi", loai: "danh_muc", dau: 1, giu: [0, 1] },
  ],
  "form-3": [
    {
      cot_dau: "chi tieu nhan su",
      loai: "danh_muc",
      dau: 1,
      giu: [0],
      thay: [
        [/^KH \d{4}$/, "KH 20..."],
        [/\(\d{1,2}\/\d{1,2}\)/g, "(....../......)"],
      ],
    },
  ],
  "form-4": [
    { cot_dau: "bao cao nguon tien", loai: "danh_muc", dau: 2, giu: [0, 2], thay: THAY_THANG_NAM },
    { cot_dau: "noi dung", loai: "danh_muc", dau: 1, giu: [0] },
    {
      cot_dau: "stt",
      loai: "danh_muc",
      dau: 1,
      giu: [0, 1],
      thay: [
        [/^Tháng \d{1,2} /, "Tháng ...... "],
        [/T1–T\d{1,2} /, "T1–T...... "],
        [/Kế hoạch \d{4}/, "Kế hoạch 20..."],
      ],
    },
  ],
  "form-5": [
    { cot_dau: "stt", loai: "tu_do", dau: 1 },
    { cot_dau: "stt", loai: "tu_do", dau: 1 },
  ],
  "form-6": [
    { cot_dau: "stt", loai: "tu_do", dau: 1 },
    { cot_dau: "hang muc", loai: "tu_do", dau: 1 },
    { cot_dau: "hang muc", loai: "tu_do", dau: 1 },
    { cot_dau: "hang muc", loai: "tu_do", dau: 1 },
    { cot_dau: "du an", loai: "tu_do", dau: 1 },
    { cot_dau: "du an", loai: "tu_do", dau: 1 },
  ],
  "form-7": [
    { cot_dau: "thong tin du an", loai: "danh_muc", dau: 1, giu: [0, 2] },
    { cot_dau: "hang muc", loai: "danh_muc", dau: 1, giu: [0] },
    { cot_dau: "stt", loai: "tu_do", dau: 1 },
    { cot_dau: "khu vuc", loai: "tu_do", dau: 1 },
  ],
  "form-8": [
    {
      cot_dau: "chi tieu",
      loai: "danh_muc",
      dau: 2,
      giu: [0],
      thay: [
        [/^Tuần \d+ \(.*\)$/, "Tuần ...... (....../...... – ....../....../20...)"],
        [/^Tháng \d{1,2}\/\d{4} \(.*\)$/, "Tháng ....../20... (....../...... – ....../......)"],
        [/^Cả năm \d{4}$/, "Cả năm 20..."],
      ],
    },
    { cot_dau: "stt", loai: "tu_do", dau: 1 },
  ],
  // Form 10 (Ban điều hành tổng thầu) = Form 7 bỏ bảng GPMB
  "form-10": [
    { cot_dau: "thong tin du an", loai: "danh_muc", dau: 1, giu: [0, 2] },
    { cot_dau: "hang muc", loai: "danh_muc", dau: 1, giu: [0] },
    { cot_dau: "stt", loai: "tu_do", dau: 1 },
  ],
  // Form 9 (mẫu SCI-160, Phòng Cơ điện)
  "form-9": [
    { cot_dau: "chi tieu", loai: "danh_muc", dau: 1, giu: [0] },
    { cot_dau: "hang muc / du an", loai: "nhom", dau: 1, so_dong: 2 },
  ],
};

/** Đoạn văn (ngoài bảng) mô tả theo số liệu ví dụ → chữ khung. Khóa: đầu đoạn (nguyên văn). */
export const DOAN_THEO_MAU = {
  "form-6": [
    ["◆ XU THẾ TIẾN ĐỘ ĐƯỜNG GĂNG", "◆ XU THẾ TIẾN ĐỘ ĐƯỜNG GĂNG — CÁC DỰ ÁN SCI ENC ĐANG THI CÔNG (T...... – T....../20...)"],
    ["1. TĐ Nậm Mô 1", "1. Dự án ...... (...... MW) — ......:"],
    ["2. TĐ Nậm Khiên 1", "2. Dự án ...... (...... MW) — ......:"],
    ["3. ĐG Hướng Phùng 1", "3. Dự án ...... (...... MW) — Giai đoạn chuẩn bị đầu tư:"],
  ],
  "form-7": [["Móng tua bin (đúc BT)", "Hạng mục ...... — chi tiết khối lượng thi công tuần:"]],
  "form-10": [["Móng tua bin (đúc BT)", "Hạng mục ...... — chi tiết khối lượng thi công tuần:"]],
  "form-8": [
    ["Sản lượng điện từng ngày", "Sản lượng điện từng ngày — phân theo khung giờ (Tuần ......):"],
    ["Doanh thu lũy kế tháng", "Doanh thu lũy kế tháng ....../20... — tiến độ đến ngày báo cáo:"],
  ],
};

/** Ô nhập đầu báo cáo đặt về "......" (kỳ báo cáo xử lý riêng; "Gửi:" giữ nguyên). */
const O_DAT_CHAM = ["nguoi_lap", "ngay_lap", "nguoi_kiem_soat", "du_an_ten", "du_an_chu_dau_tu", "du_an_thoi_gian_thi_cong", "du_an_ngay_phat_dien", "du_an_tinh_trang", "du_an_tien_do_luy_ke"];

const RE_TONG = /^(tổng|cân đối)/i;
const RE_NGAY_KY = /ngày\s+\d+\s+tháng\s+\d+\s+năm\s+\d{4}/;

// ---------------- DOM tiện ích ----------------

const tagCua = (sdt) => {
  const pr = conTen(sdt, "sdtPr");
  const t = pr && conTen(pr, "tag");
  return t ? t.getAttributeNS(W, "val") || t.getAttribute("w:val") : null;
};

/** Các dòng của bảng (kể cả dòng bọc sdt). */
function dong(tbl) {
  const kq = [];
  const di = (x) => {
    for (const c of conPT(x)) {
      if (ten(c) === "tr") kq.push(c);
      else if (ten(c) === "sdt" || ten(c) === "sdtContent") di(c);
    }
  };
  di(tbl);
  return kq;
}
const o = (tr) => conPT(tr).filter((c) => ten(c) === "tc");

/** Đặt chữ cho đoạn: giữ pPr + rPr của run có chữ đầu tiên (hoặc run đầu), bỏ các run khác. */
function datChuDoan(doc, p, text) {
  const nd = conPT(p).filter((c) => ten(c) !== "pPr");
  const runs = tatCa(p, "r");
  const r0 = runs.find((r) => chu(r)) ?? runs[0];
  const rPr = r0 ? conTen(r0, "rPr") : null;
  for (const c of nd) p.removeChild(c);
  const r = taoPT(doc, "r");
  if (rPr) r.appendChild(rPr.cloneNode(true));
  if (text) {
    const t = taoPT(doc, "t");
    t.setAttribute("xml:space", "preserve");
    t.textContent = text;
    r.appendChild(t);
  }
  p.appendChild(r);
}

/** Bỏ w14:paraId/textId của bản sao (Word đòi duy nhất). */
function boMaDoan(n) {
  for (const p of tatCa(n, "p")) {
    p.removeAttributeNS(W14, "paraId");
    p.removeAttributeNS(W14, "textId");
  }
  if (n.removeAttributeNS) {
    n.removeAttributeNS(W14, "paraId");
    n.removeAttributeNS(W14, "textId");
  }
}

/** Xóa chữ một ô bảng: giữ tcPr và đoạn đầu (định dạng), bỏ gộp dọc nếu `boGop`. Ô gắn mã (bảng số liệu): giữ content control, chỉ xóa chữ bên trong. */
function xoaO(doc, tc, boGop = false) {
  const sdt = conPT(tc).find((c) => ten(c) === "sdt");
  if (sdt) {
    for (const c of conPT(tc)) if (ten(c) !== "tcPr" && c !== sdt) tc.removeChild(c);
    datSdt(doc, sdt, "");
  } else {
    const ps = conPT(tc).filter((c) => ten(c) === "p");
    for (const c of conPT(tc)) if (ten(c) !== "tcPr" && c !== ps[0]) tc.removeChild(c);
    if (ps[0]) datChuDoan(doc, ps[0], "");
    else tc.appendChild(taoPT(doc, "p"));
  }
  if (boGop) {
    const pr = conTen(tc, "tcPr");
    const vm = pr && conTen(pr, "vMerge");
    if (vm) pr.removeChild(vm);
  }
}

/** Áp luật thay chữ lên từng đoạn của ô (chỉ viết lại đoạn có đổi). */
function thayTrongO(doc, tc, thay) {
  if (!thay?.length) return;
  for (const p of tatCa(tc, "p")) {
    const cu = chu(p);
    let moi = cu;
    for (const [re, rep] of thay) moi = moi.replace(re, rep);
    if (moi !== cu) datChuDoan(doc, p, moi);
  }
}

function dongTrong(doc, trMau) {
  const tr = trMau.cloneNode(true);
  boMaDoan(tr);
  for (const tc of o(tr)) xoaO(doc, tc, true);
  return tr;
}

const laDongNhom = (tr) => {
  const cs = o(tr);
  if (cs.length === 1) return chu(cs[0]).trim() !== ""; // một ô gộp ngang cả dòng (mẫu SCI-160)
  return cs.length > 1 && chu(cs[0]).trim() !== "" && cs.slice(1).every((c) => chu(c).trim() === "");
};

// ---------------- Xử lý từng phần ----------------

function lamTrangBangSoLieu(doc, tbl, sp) {
  const hang = dong(tbl);
  const tieuDe = hang.slice(0, sp.dau);
  const duLieu = hang.slice(sp.dau);
  for (const tr of tieuDe) for (const tc of o(tr)) thayTrongO(doc, tc, sp.thay);
  if (sp.loai === "danh_muc") {
    for (const tr of duLieu)
      o(tr).forEach((tc, i) => {
        if (sp.giu.includes(i)) thayTrongO(doc, tc, sp.thay);
        else xoaO(doc, tc);
      });
    const nhan = (i) => {
      const c = o(tieuDe[tieuDe.length - 1])[i] ?? o(tieuDe[0])[i];
      return c ? chu(c).split("\n")[0] : `cột ${i + 1}`;
    };
    return `danh mục ${duLieu.length} dòng, giữ cột ${sp.giu.map((i) => `"${nhan(i)}"`).join(", ")}`;
  }
  const trMau = duLieu.find((tr) => !laDongNhom(tr) && !RE_TONG.test(chu(o(tr)[0] ?? tr))) ?? duLieu[0];
  const mau = trMau.cloneNode(true);
  if (sp.loai === "nhom") {
    const nhom = [];
    for (const tr of duLieu) {
      if (laDongNhom(tr)) nhom.push(tr);
      else tbl.removeChild(tr);
    }
    for (const g of nhom) {
      let sau = g;
      for (let k = 0; k < (sp.so_dong ?? 2); k++) {
        const tr = dongTrong(doc, mau);
        tbl.insertBefore(tr, sau.nextSibling);
        sau = tr;
      }
    }
    return `nhóm ${nhom.map((g) => chu(o(g)[0])).join("/")}, mỗi nhóm ${sp.so_dong ?? 2} dòng trống`;
  }
  // tu_do
  const tong = duLieu.filter((tr) => RE_TONG.test(chu(o(tr)[0] ?? tr)));
  for (const tr of duLieu) if (!tong.includes(tr)) tbl.removeChild(tr);
  for (const tr of tong) o(tr).forEach((tc, i) => i > 0 && xoaO(doc, tc));
  const truoc = tong[0] ?? null;
  for (let k = 0; k < SO_DONG_TRONG; k++) tbl.insertBefore(dongTrong(doc, mau), truoc);
  return `danh sách tự do → ${SO_DONG_TRONG} dòng trống${tong.length ? ` + dòng "${chu(o(tong[0])[0])}"` : ""}`;
}

/** Bảng gắn mã (bang_*): giữ tiêu đề, 3 dòng trống (mỗi ô vẫn là content control đúng tag cột). */
function lamTrangBangGanMa(doc, sdt) {
  const tbl = tatCa(sdt, "tbl")[0];
  const hang = dong(tbl);
  const duLieu = hang.filter((tr) => tr.getElementsByTagNameNS(W, "sdt").length > 0);
  const mau = duLieu[0].cloneNode(true);
  const cha = duLieu[0].parentNode;
  for (const tr of duLieu) tr.parentNode.removeChild(tr);
  for (let k = 0; k < SO_DONG_TRONG; k++) {
    const tr = mau.cloneNode(true);
    boMaDoan(tr);
    for (const s of tatCa(tr, "sdt")) datSdt(doc, s, "");
    for (const tc of o(tr)) {
      const pr = conTen(tc, "tcPr");
      const vm = pr && conTen(pr, "vMerge");
      if (vm) pr.removeChild(vm);
    }
    cha.appendChild(tr);
  }
  return duLieu.length;
}

/** Kỳ báo cáo: bỏ tích mọi hộp, chữ tuần/tháng về dạng chấm. */
function lamTrangKy(doc, sdt) {
  for (const s of tatCa(sdt, "sdt")) {
    if (!/^ky_chon_/.test(tagCua(s) ?? "")) continue;
    const ck = s.getElementsByTagNameNS(W14, "checked")[0];
    if (ck) ck.setAttributeNS(W14, "w14:val", "0");
    const t = tatCa(s, "t")[0];
    if (t) t.textContent = "☐";
  }
  for (const p of tatCa(sdt, "p")) {
    const runs = conPT(p).filter((c) => ten(c) === "r" && conTen(c, "t"));
    if (!runs.length) continue;
    const text = chu(p);
    const thang = /tháng/i.test(text);
    const moi = thang ? [KY_THANG_TRANG] : KY_TUAN_TRANG;
    runs.forEach((r, i) => {
      const t = conTen(r, "t");
      if (i < moi.length) {
        t.textContent = moi[i];
        t.setAttribute("xml:space", "preserve");
      } else p.removeChild(r);
    });
    // mẫu chỉ có một run chữ: nối phần còn lại vào run đó
    if (runs.length < moi.length) conTen(runs[0], "t").textContent = moi.join("");
  }
}

/** Đoạn có ảnh (biểu đồ số liệu ví dụ) → dòng nhắc chèn biểu đồ. Trả các r:embed đã bỏ. */
function boAnh(doc, p) {
  const embed = [];
  for (const b of Array.from(p.getElementsByTagName("a:blip"))) {
    const id = b.getAttribute("r:embed");
    if (id) embed.push(id);
  }
  for (const c of conPT(p)) if (ten(c) !== "pPr") p.removeChild(c);
  const r = taoPT(doc, "r");
  const rPr = taoPT(doc, "rPr");
  rPr.appendChild(taoPT(doc, "i"));
  rPr.appendChild(taoPT(doc, "color", { val: "888888" }));
  r.appendChild(rPr);
  const t = taoPT(doc, "t");
  t.textContent = NHAC_BIEU_DO;
  r.appendChild(t);
  p.appendChild(r);
  return embed;
}

async function donAnhThua(zip, xmlMoi, embed) {
  if (!embed.length) return;
  const f = "word/_rels/document.xml.rels";
  let rels = await zip.file(f).async("string");
  for (const id of embed) {
    if (xmlMoi.includes(`r:embed="${id}"`)) continue;
    const m = new RegExp(`<Relationship [^>]*Id="${id}"[^>]*/>`).exec(rels);
    if (!m) continue;
    const dich = /Target="([^"]+)"/.exec(m[0])?.[1];
    rels = rels.replace(m[0], "");
    if (dich && !rels.includes(`Target="${dich}"`)) zip.remove(path.posix.join("word", dich));
  }
  zip.file(f, rels);
}

// ---------------- Làm trắng một mẫu ----------------

/**
 * Sinh mẫu trắng từ mẫu đã chuyển (buffer form-N.docx). Trả { buf, bao_cao }.
 * Ném lỗi nếu cấu trúc bảng khác đặc tả (mẫu đã chuyển đổi mà chưa cập nhật BANG_THEO_MAU).
 */
export async function taoMauTrang(bufDaChuyen, ma) {
  const zip = await JSZip.loadAsync(bufDaChuyen);
  const doc = new DOMParser().parseFromString(await zip.file("word/document.xml").async("string"), "text/xml");
  const body = doc.getElementsByTagNameNS(W, "body")[0];
  const bao = [];

  // 1. Ô nhập đầu báo cáo
  for (const s of tatCa(doc, "sdt")) {
    const tag = tagCua(s);
    if (O_DAT_CHAM.includes(tag)) datSdt(doc, s, CHUA_DIEN);
    // Mẫu dùng chung nhiều đơn vị (bản 5): dòng "Đơn vị lập" để trống cho người nộp ghi tên đơn vị mình
    // bản 9: chữ mở đầu gợi loại đơn vị ("NHÀ MÁY ......", "BQLDA ......") — Mr. Đại 01/10: mẫu trắng phải chỉ chỗ ghi tên
    else if (tag === "don_vi_lap" && MAU_DUNG_CHUNG.includes(ma)) datSdt(doc, s, DAU_BAN_9[ma]?.don_vi_trang ?? CHUA_DIEN);
    else if (tag === "ky_bao_cao") lamTrangKy(doc, s);
  }
  bao.push(`ô ${O_DAT_CHAM.join(", ")} → "${CHUA_DIEN}"; kỳ báo cáo → bỏ tích`);
  // Bản 9: tên công ty góc trái do bộ chuyển mẫu đặt sẵn ("CÔNG TY ......" ở Form 8, 10; Form 7 là công ty SCI cố định) —
  // không làm trắng thêm ở đây (bản 5 làm trắng dòng này, nay dòng đó là tên công ty chứ không phải tên đơn vị).

  // 2. Bảng gắn mã (kiến nghị, quyết định, kế hoạch, công việc). Bảng số liệu gắn mã xử lý ở bước 3 theo đặc tả.
  for (const k of conPT(body)) {
    if (ten(k) !== "sdt" || !/^bang_/.test(tagCua(k) ?? "") || TAG_BANG_SO_LIEU.has(tagCua(k))) continue;
    const n = lamTrangBangGanMa(doc, k);
    bao.push(`${tagCua(k)}: ${n} dòng → ${SO_DONG_TRONG} dòng trống`);
  }

  // 3. Bảng số liệu — không gắn mã hoặc gắn mã số liệu (bỏ bảng tiêu đề, bảng thông tin chung, bảng chữ ký)
  const bangTho = conPT(body).flatMap((k) => (ten(k) === "tbl" ? [k] : ten(k) === "sdt" && TAG_BANG_SO_LIEU.has(tagCua(k)) ? tatCa(k, "tbl").slice(0, 1) : []));
  const bangKy = [...bangTho].reverse().find((t) => /NGƯỜI/.test(chu(dong(t)[0] ?? t)));
  // Bỏ bảng tiêu đề + bảng thông tin chung (mẫu SCI-160: tiêu đề là đoạn văn, chỉ có bảng thông tin)
  const soBangDau = MAU_THAT.find((x) => x.ma === ma)?.bo_cuc === "sci160" ? 1 : 2;
  const bangSoLieu = bangTho.slice(soBangDau).filter((t) => t !== bangKy);
  const dac = BANG_THEO_MAU[ma] ?? [];
  if (bangSoLieu.length !== dac.length) throw new Error(`${ma}: có ${bangSoLieu.length} bảng số liệu, đặc tả ${dac.length} — cập nhật BANG_THEO_MAU`);
  bangSoLieu.forEach((tbl, i) => {
    const sp = dac[i];
    const dau = khongDau(chu(o(dong(tbl)[0])[0]));
    if (!dau.startsWith(sp.cot_dau)) throw new Error(`${ma}: bảng số liệu thứ ${i + 1} có cột đầu "${dau}", đặc tả "${sp.cot_dau}"`);
    bao.push(`bảng "${chu(o(dong(tbl)[0])[0]).split("\n")[0]}": ${lamTrangBangSoLieu(doc, tbl, sp)}`);
  });

  // 4. Đoạn văn: mô tả theo số liệu, ảnh biểu đồ, ngày ký
  const embed = [];
  for (const p of conPT(body).filter((k) => ten(k) === "p")) {
    const text = chu(p);
    if (p.getElementsByTagNameNS(W, "drawing").length || p.getElementsByTagName("w:pict").length) {
      embed.push(...boAnh(doc, p));
      bao.push(`ảnh biểu đồ → "${NHAC_BIEU_DO}"`);
      continue;
    }
    const d = (DOAN_THEO_MAU[ma] ?? []).find(([dau]) => text.startsWith(dau));
    if (d) {
      datChuDoan(doc, p, d[1]);
      bao.push(`đoạn "${text}" → "${d[1]}"`);
    } else if (RE_NGAY_KY.test(text)) {
      datChuDoan(doc, p, text.replace(RE_NGAY_KY, NGAY_KY_TRANG));
      bao.push(`ngày ký → "${text.replace(RE_NGAY_KY, NGAY_KY_TRANG)}"`);
    }
  }

  const xml = new XMLSerializer().serializeToString(doc);
  zip.file("word/document.xml", xml);
  await donAnhThua(zip, xml, embed);
  return { buf: await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }), bao_cao: bao };
}

// ---------------- Điền mẫu trắng (test, ví dụ) ----------------

/**
 * Điền các ô bắt buộc của mẫu trắng (kỳ, người lập, ngày lập, người kiểm soát, ngày ký) — mặc định tuần 29/2026
 * (Form 6 là báo cáo tháng: tháng 07/2026). `g` như dienBaoCao của chuyen-mau-that (ghi đè mặc định).
 */
export async function dienOBatBuoc(bufTrang, ma, g = {}) {
  const m = MAU_THAT.find((x) => x.ma === ma);
  const ky = m?.loai_ky === "thang" ? { chon: "thang", thang: "07/2026" } : { chon: "tuan", tuan: "29/2026   (13/07/2026 – 19/07/2026)" };
  const buf = await dienBaoCao(bufTrang, {
    ...g,
    o: { ky_bao_cao: ky, nguoi_lap: "Nguyễn Văn An", ngay_lap: "21/07/2026", nguoi_kiem_soat: "Trần Văn Bình", ...(g.o ?? {}) },
  });
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file("word/document.xml").async("string");
  zip.file("word/document.xml", xml.split(NGAY_KY_TRANG).join("ngày 21 tháng 07 năm 2026"));
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

// ---------------- Chạy ----------------

export async function taoTatCaMauTrang(thuMuc = GOC) {
  const ra = path.join(thuMuc, "trang");
  fs.mkdirSync(ra, { recursive: true });
  const bao = [];
  for (const m of MAU_THAT) {
    if (m.sua_tay) continue; // mẫu sửa tay (20/10/2026): bản trắng đã có sẵn ở mau-word/trang/
    const kq = await taoMauTrang(fs.readFileSync(path.join(thuMuc, `${m.ma}.docx`)), m.ma);
    fs.writeFileSync(path.join(ra, `${m.ma}.docx`), kq.buf);
    bao.push(`${m.ma}:\n   ${kq.bao_cao.join("\n   ")}`);
  }
  return bao;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  taoTatCaMauTrang().then((b) => console.log(b.join("\n")));
}
