// ============================================================
// scripts/chuyen-mau-that.mjs — CHUYỂN 9 MẪU WORD THẬT (anh Đại, mau-word/goc/) SANG DẠNG CÓ Ô NHẬP GẮN MÃ.
//
// Chạy: node scripts/chuyen-mau-that.mjs   → mau-word/form-0.docx … form-8.docx + mau-word/dinh-nghia.json
//
// Nguyên tắc: KHÔNG đổi nội dung, định dạng, bảng, ảnh của mẫu gốc. Chỉ:
//   · BỌC ô/đoạn cần máy đọc bằng content control w:sdt có w:tag (run/rPr bên trong giữ nguyên);
//   · thêm dấu nhận mẫu vô hình: sdt bọc tiêu đề (tag "mau_ma:form-N", khóa không cho xóa) + thuộc tính
//     tài liệu tùy chỉnh SCI_MauMa (docProps/custom.xml) — Word lưu lại vẫn giữ;
//   · ô ☐/☒ của kỳ báo cáo thành hộp tích bấm được (w14:checkbox), chữ vẫn là ☐/☒ như cũ;
//   · THÊM mục "Công việc" chuẩn (Mã việc · Công việc · Dự án · Người phụ trách · Bắt đầu · Kết thúc ·
//     Kết quả cần có · Đã xong) trước dòng "…, ngày … tháng …"/khối chữ ký, kiểu bảng theo bảng kiến nghị
//     của chính mẫu (trừ Form 6: bảng "Kế hoạch công việc tháng tới" có sẵn là bảng sinh việc).
// Định nghĩa mẫu (ô, ô bắt buộc, mục bắt buộc, bảng sinh việc) sinh từ đúng những gì đã bọc → dinh-nghia.json.
// ============================================================

import JSZip from "jszip";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";

export const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
export const W14 = "http://schemas.microsoft.com/office/word/2010/wordml";
export const W15 = "http://schemas.microsoft.com/office/word/2012/wordml";
// Tăng khi đổi mẫu gieo sẵn (hat-giong nâng cấp mẫu chưa bị quản trị sửa).
// 3: gắn mã thêm các bảng số liệu (BANG_SO_LIEU) để bộ luật kiểm tra động đọc được.
// 4 (29/09/2026 — Mr. Đại): chương việc thống nhất "KẾT QUẢ VÀ KẾ HOẠCH VIỆC TUẦN/THÁNG TỚI", 6 cột, Tình trạng là ô chọn;
//   Form 0 thêm cột "Bộ phận phụ trách"; Form 5 bảng "Tiến độ chi tiết công tác thiết kế" cũng sinh việc.
// 5 (29/09/2026 — Mr. Đại): "báo cáo thuộc đơn vị nào là do NỘI DUNG FILE nói" → nhãn "Đơn vị lập" ở dòng tên đơn vị
//   dưới tiêu đề (Form 1–10); Form 7/10 gắn nhãn 6 ô bảng "THÔNG TIN DỰ ÁN".
// 6 (29/09/2026 — Mr. Đại, "công ty tối giản, không cầu kỳ trình ký"): đầu báo cáo chỉ còn Kỳ báo cáo; BỎ Người lập,
//   Người kiểm soát, Ngày lập (máy dùng NGÀY NỘP tự ghi), dòng "…, ngày … tháng … năm …" và khối chữ ký.
// 7 (29/09/2026 — Mr. Đại): bấm vào ô nhập trong Word không còn hiện nhãn tên ô ("Kết thúc", "KẾT QUẢ VÀ KẾ HOẠCH…")
//   — bỏ w:alias, khung ô để ẩn (w15:appearance hidden); Form 9 bỏ dòng "BẢN DEMO — số liệu giả định".
// 8 (29/09/2026 — soát PDF gốc ↔ mẫu, Bài 0): tiêu đề mục không bị bỏ trơ cuối trang (keepNext); ghi chú cuối mẫu dùng
//   phông của thân báo cáo (Form 3–8, 10 trước đây ra Times New Roman).
// 9 (01/10/2026 — Mr. Đại, đồng bộ 11 mẫu): đầu trang MỘT khuôn 2 cột (trái: công ty + "Gửi: <nơi nhận>" thay dòng địa chỉ;
//   phải: BÁO CÁO TUẦN + tên đơn vị) — Form 9 dựng khung mới; mẫu dùng chung có dòng gợi ý cách ghi tên. Ô kỳ chỉ một loại
//   kỳ, bỏ hộp ☐ (mẫu tuần giữ "từ – đến", máy kiểm khớp số tuần). Mục đánh số La Mã liền mạch (Form 0 A0/A1/B1/C/D,
//   Form 9 1/2/3/4). Ghi chú cuối mẫu: dòng chữ ĐỎ màu đỏ, dòng XANH LÁ màu xanh, còn lại màu đen.
export const PHIEN_BAN_MAU = 9;
/** Ô đầu báo cáo bỏ từ bản 6 — xóa cả cặp nhãn + giá trị */
const O_BO_BAN_6 = new Set(["nguoi_lap", "ngay_lap", "nguoi_kiem_soat"]);

/** Mẫu nhiều đơn vị dùng chung: tên đơn vị trên mặt báo cáo quyết báo cáo của ai (không có thì chặn). */
export const MAU_DUNG_CHUNG = ["form-7", "form-8", "form-10", "form-11"];
/** Mẫu dùng chung mà tên CÔNG TY góc trái cũng do đơn vị tự ghi (bản 9 — Mr. Đại chọn 01/10: nhà máy, tổng thầu) */
export const CONG_TY_TU_GHI = ["form-8", "form-10", "form-11"];

/**
 * Đầu trang bản 9 (Mr. Đại 01/10/2026): trái = công ty + "Gửi: <nơi nhận>"; phải = tiêu đề + tên đơn vị.
 * cong_ty bỏ trống = giữ của mẫu gốc. don_vi_trang = dòng tên đơn vị ở MẪU TRẮNG (mẫu dùng chung).
 * goi_y_* = dòng chữ xám nhỏ ngay dưới, hướng dẫn cách ghi (máy không đọc).
 */
export const DAU_BAN_9 = {
  "form-0": { cong_ty: "CÔNG TY CỔ PHẦN SCI", gui: "Ban Tổng giám đốc", tieu_de: "BÁO CÁO HỢP NHẤT TUẦN" },
  "form-1": { cong_ty: "CÔNG TY CỔ PHẦN SCI", gui: "Ban Tổng giám đốc", tieu_de: "BÁO CÁO TUẦN" },
  "form-2": { cong_ty: "CÔNG TY CỔ PHẦN SCI", gui: "Ban Tổng giám đốc", tieu_de: "BÁO CÁO TUẦN" },
  "form-3": { cong_ty: "CÔNG TY CỔ PHẦN SCI", gui: "Ban Tổng giám đốc", tieu_de: "BÁO CÁO TUẦN" },
  "form-4": { cong_ty: "CÔNG TY CỔ PHẦN SCI", gui: "Ban Tổng giám đốc", tieu_de: "BÁO CÁO TUẦN" },
  "form-9": { cong_ty: "CÔNG TY CỔ PHẦN SCI", gui: "Ban Tổng giám đốc", tieu_de: "BÁO CÁO TUẦN" },
  "form-5": { gui: "Phòng Đầu tư và Pháp chế", tieu_de: "BÁO CÁO TUẦN" },
  "form-6": { gui: "Phòng Đầu tư và Pháp chế", tieu_de: "BÁO CÁO TUẦN" }, // 20/10/2026: báo cáo tuần (trước: BÁO CÁO THÁNG)
  "form-7": {
    cong_ty: "CÔNG TY CỔ PHẦN SCI",
    gui: "Phòng Đầu tư và Pháp chế",
    tieu_de: "BÁO CÁO TUẦN",
    don_vi_trang: "BQLDA ......",
    vd_don_vi: "BQLDA Quảng Trị",
    goi_y_don_vi: "Ghi tên ban: BQLDA Quảng Trị hoặc BQLDA Lào",
  },
  "form-8": {
    cong_ty: "CÔNG TY ......",
    gui: "Phòng Kinh tế và Vận hành",
    tieu_de: "BÁO CÁO TUẦN",
    don_vi_trang: "NHÀ MÁY ......",
    vd_don_vi: "Nhà máy thủy điện Nậm Xe",
    goi_y_cong_ty: "Ghi tên công ty đang vận hành nhà máy vào đây", // Mr. Đại 01/10 — nguyên văn
    goi_y_don_vi: "Ghi tên nhà máy, vd: Nhà máy thủy điện Nậm Xe · Nhà máy điện gió Hướng Linh 7",
  },
  "form-10": {
    cong_ty: "CÔNG TY ......",
    gui: "......",
    tieu_de: "BÁO CÁO TUẦN",
    don_vi_trang: "BAN ĐIỀU HÀNH ......",
    vd_don_vi: "Ban điều hành Hướng Việt",
    goi_y_cong_ty: "Ghi tên công ty Tổng thầu thi công vào đây", // Mr. Đại 01/10 — nguyên văn
    goi_y_don_vi: "Ghi tên ban, vd: Ban điều hành Hướng Việt",
  },
  // Form 11 (Mr. Đại chốt 20/10/2026) = Form 10 cho Ban điều hành dự án LOẠI KHÁC, gửi SCI E&C — sửa tay, không sinh từ goc
  "form-11": {
    cong_ty: "CÔNG TY ......",
    gui: "......",
    tieu_de: "BÁO CÁO TUẦN",
    don_vi_trang: "BAN ĐIỀU HÀNH ......",
    vd_don_vi: "Ban điều hành Hướng Việt",
    goi_y_cong_ty: "Ghi tên công ty Tổng thầu thi công vào đây; dòng «Gửi:» ghi «SCI E&C»",
    goi_y_don_vi: "Ghi tên ban, vd: Ban điều hành Hướng Việt",
  },
};


// Ô bảng "THÔNG TIN DỰ ÁN" (Form 7, 10): nhãn trái → mã ô
const O_THONG_TIN_DU_AN = [
  [/^ten du an/, "du_an_ten", "Tên dự án"],
  [/^chu dau tu/, "du_an_chu_dau_tu", "Chủ đầu tư"],
  [/^thoi gian thi cong/, "du_an_thoi_gian_thi_cong", "Thời gian thi công"],
  [/^ngay phat dien/, "du_an_ngay_phat_dien", "Ngày phát điện KH"],
  [/^tinh trang tong the/, "du_an_tinh_trang", "Tình trạng tổng thể"],
  [/^tien do luy ke/, "du_an_tien_do_luy_ke", "Tiến độ lũy kế (vs KH)"],
];

const GOC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "mau-word");

/**
 * Đặc tả 11 mẫu: file gốc, đơn vị lập, nơi nhận mặc định, kỳ mặc định.
 * `sua_tay` (20/10/2026 — Mr. Đại chốt Form 5, Form 6 còn 3 chương, Form 6 thành báo cáo tuần): mẫu đã sửa thẳng ở mau-word/
 * qua luồng Khai báo mẫu, KHÔNG sinh lại từ goc — chuyenTatCa / taoTatCaMauTrang giữ nguyên tệp + định nghĩa đang có;
 * nhan-mau-goc vẫn nhận file gốc cũ bằng bộ chuyển cũ (còn đủ 3 chương mới, chỉ thừa chương đã bỏ). Form 11 (BĐH dự án Loại khác) chỉ có ở dinh-nghia.json.
 */
export const MAU_THAT = [
  { ma: "form-0", so: 0, tep: "OK_Form0_BaoCaoHopNhat_Sua lan 2.docx", ten: "Báo cáo hợp nhất trình TGĐ (Form 0)", don_vi_lap: "ban-tgd", gui_den_mac_dinh: "ban-tgd", loai_ky: "tuan" },
  { ma: "form-1", so: 1, tep: "OK_Form1_PhongDauTuPhapChe_Sua lan 2.docx", ten: "Báo cáo Phòng Đầu tư và Pháp chế (Form 1)", don_vi_lap: "p-dtpc", gui_den_mac_dinh: "ban-tgd", loai_ky: "tuan" },
  { ma: "form-2", so: 2, tep: "OK_Form2_PhongKinhTeVanHanh_Sua lan 2.docx", ten: "Báo cáo Phòng Kinh tế và Vận hành (Form 2)", don_vi_lap: "p-ktvh", gui_den_mac_dinh: "ban-tgd", loai_ky: "tuan" },
  { ma: "form-3", so: 3, tep: "OK_Form3_PhongHanhChinh_Sua lan 2.docx", ten: "Báo cáo Phòng Hành chính Tổng hợp (Form 3)", don_vi_lap: "p-hcth", gui_den_mac_dinh: "ban-tgd", loai_ky: "tuan" },
  { ma: "form-4", so: 4, tep: "OK_Form4_PhongTaiChinhKeToan_Sua lan 2.docx", ten: "Báo cáo Phòng Tài chính Kế toán (Form 4)", don_vi_lap: "p-tckt", gui_den_mac_dinh: "ban-tgd", loai_ky: "tuan" },
  { ma: "form-5", so: 5, tep: "OK_Form5_SCI_PMC_Sua lan 2.docx", ten: "Báo cáo SCI PMC (Form 5)", don_vi_lap: "sci-pmc", gui_den_mac_dinh: "p-dtpc", loai_ky: "tuan", sua_tay: true },
  { ma: "form-6", so: 6, tep: "OK_Form6_SCI_ENC_Sua lan 2.docx", ten: "Báo cáo tuần SCI E&C (Form 6)", don_vi_lap: "sci-enc", gui_den_mac_dinh: "p-dtpc", loai_ky: "tuan", sua_tay: true },
  { ma: "form-7", so: 7, tep: "OK_Form7_BQLDA_Sua lan 2.docx", ten: "Báo cáo BQLDA Quảng Trị (Form 7)", don_vi_lap: "bqlda-qt", gui_den_mac_dinh: "p-dtpc", loai_ky: "tuan" },
  { ma: "form-8", so: 8, tep: "OK_Form8_NhaMayNamXe_Sua lan 2.docx", ten: "Báo cáo Nhà máy thủy điện Nậm Xe (Form 8)", don_vi_lap: "nm-namxe", gui_den_mac_dinh: "p-ktvh", loai_ky: "tuan" },
  // Mẫu SCI-160 (26/09/2026) — bố cục mới: tiêu đề là đoạn văn, bảng đầu là kỳ báo cáo + ngày lập, mục "1. 2. 3." kiểu Heading,
  // tên người ký ở dòng cuối khung ký. ma_so_file: mã biểu mẫu công ty trong tên file.
  // Bản 9: tiêu đề đoạn văn được dựng thành khung 2 cột như các mẫu khác (dau_doan) — sau bước đó mẫu đi đúng đường chung.
  { ma: "form-9", so: 9, tep: "SCI-160_BaoCaoTuan_PhongCoDien.docx", ten: "Báo cáo tuần Phòng Cơ điện (Form 9)", don_vi_lap: "p-cd", gui_den_mac_dinh: "ban-tgd", loai_ky: "tuan", dau_doan: true, ma_so_file: "SCI-160" },
  // Form 10 (27/09/2026 — Mr. Đại): báo cáo của Ban điều hành TỔNG THẦU THI CÔNG một dự án SCI đầu tư (cấp 4, dưới BQLDA).
  // Do tổng thầu lập, không phải BQLDA. Bố cục = Form 7 bỏ mục GPMB. Nhiều BĐH dùng chung mẫu → không gắn đơn vị lập,
  // dòng "Gửi:" để trống: nơi nhận theo luồng báo cáo (BĐH → BQLDA của dự án).
  { ma: "form-10", so: 10, tep: "Form10_BanDieuHanhTongThau.docx", ten: "Báo cáo Ban điều hành tổng thầu thi công (Form 10)", don_vi_lap: null, gui_den_mac_dinh: null, loai_ky: "tuan" },
];

// ---------------- DOM tiện ích ----------------

export const khongDau = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export const conPT = (n) => {
  const kq = [];
  for (let c = n.firstChild; c; c = c.nextSibling) if (c.nodeType === 1) kq.push(c);
  return kq;
};
export const ten = (n) => n.localName;
export const tatCa = (n, t) => Array.from(n.getElementsByTagNameNS(W, t));
export const conTen = (n, t) => conPT(n).find((c) => ten(c) === t);

/** Chữ của nút (bỏ bản xóa có theo dõi); đoạn cách nhau \n. */
export function chu(n) {
  const out = [];
  const di = (x) => {
    const t = ten(x);
    if (t === "del" || t === "delText" || t === "instrText" || t === "sdtPr" || t === "rPr" || t === "pPr") return;
    if (t === "t") return void out.push(x.textContent ?? "");
    if (t === "tab") return void out.push("\t");
    if (t === "br") return void out.push("\n");
    for (const c of conPT(x)) di(c);
    if (t === "p") out.push("\n");
  };
  di(n);
  return out.join("").replace(/\n+$/g, "").trim();
}

export function taoPT(doc, t, attrs = {}) {
  const e = doc.createElementNS(W, `w:${t}`);
  for (const [k, v] of Object.entries(attrs)) e.setAttributeNS(W, `w:${k}`, String(v));
  return e;
}

let soId = 700000;

/** w:sdtPr: tag, id, khóa; loai: 'text' (ô chữ trong dòng) | 'rich' (khối) | 'checkbox'.
 *  Bản 7: KHÔNG ghi tên hiển thị (alias) và để khung ô ẩn — người lập bấm vào ô thấy như Word thường (Mr. Đại 29/09).
 *  Máy chỉ đọc w:tag; tham số alias giữ lại để dò mã nguồn cho dễ. */
export function taoSdtPr(doc, tag, alias, o = {}) { // eslint-disable-line no-unused-vars
  const pr = taoPT(doc, "sdtPr");
  if (o.rPr) pr.appendChild(o.rPr.cloneNode(true));
  pr.appendChild(taoPT(doc, "tag", { val: tag }));
  pr.appendChild(taoPT(doc, "id", { val: soId++ }));
  const an = doc.createElementNS(W15, "w15:appearance");
  an.setAttributeNS(W15, "w15:val", "hidden");
  pr.appendChild(an);
  if (o.khoa) pr.appendChild(taoPT(doc, "lock", { val: o.khoa }));
  if (o.giuCho) pr.appendChild(taoPT(doc, "showingPlcHdr"));
  if (o.loai === "text") pr.appendChild(taoPT(doc, "text"));
  if (o.loai === "chon") {
    const dl = taoPT(doc, "dropDownList");
    for (const x of o.muc) dl.appendChild(taoPT(doc, "listItem", { displayText: x, value: x }));
    pr.appendChild(dl);
  }
  if (o.loai === "checkbox") {
    const cb = doc.createElementNS(W14, "w14:checkbox");
    const ck = doc.createElementNS(W14, "w14:checked");
    ck.setAttributeNS(W14, "w14:val", o.checked ? "1" : "0");
    const cs = doc.createElementNS(W14, "w14:checkedState");
    cs.setAttributeNS(W14, "w14:val", "2612");
    cs.setAttributeNS(W14, "w14:font", "MS Gothic");
    const us = doc.createElementNS(W14, "w14:uncheckedState");
    us.setAttributeNS(W14, "w14:val", "2610");
    us.setAttributeNS(W14, "w14:font", "MS Gothic");
    cb.appendChild(ck);
    cb.appendChild(cs);
    cb.appendChild(us);
    pr.appendChild(cb);
  }
  return pr;
}

/** Bọc các nút (liền nhau, cùng cha) vào một w:sdt. */
export function boc(doc, nodes, tag, alias, o = {}) {
  if (!nodes.length) return null;
  const cha = nodes[0].parentNode;
  const sdt = taoPT(doc, "sdt");
  sdt.appendChild(taoSdtPr(doc, tag, alias, o));
  const nd = taoPT(doc, "sdtContent");
  sdt.appendChild(nd);
  cha.insertBefore(sdt, nodes[0]);
  for (const n of nodes) nd.appendChild(n);
  return sdt;
}

/** Bọc toàn bộ nội dung một ô bảng (các đoạn sau tcPr) thành ô nhập khối. */
export function bocO(doc, tc, tag, alias) {
  const nd = conPT(tc).filter((c) => ten(c) !== "tcPr");
  if (!nd.length) {
    const p = taoPT(doc, "p");
    tc.appendChild(p);
    nd.push(p);
  }
  return boc(doc, nd, tag, alias);
}

/** Tách run tại vị trí ký tự `viTri` của chữ trong run (run chỉ có một w:t). Trả [run trước, run sau]. */
export function tachRun(doc, r, viTri) {
  const t = conTen(r, "t");
  const s = t.textContent;
  const r2 = r.cloneNode(true);
  // run sau: bỏ mọi thứ trừ rPr và một w:t
  for (const c of conPT(r2)) if (ten(c) !== "rPr" && ten(c) !== "t") r2.removeChild(c);
  const t2 = conTen(r2, "t");
  t2.textContent = s.slice(viTri);
  t2.setAttribute("xml:space", "preserve");
  t.textContent = s.slice(0, viTri);
  t.setAttribute("xml:space", "preserve");
  r.parentNode.insertBefore(r2, r.nextSibling);
  return [r, r2];
}

export const cells = (tr) => conPT(tr).filter((c) => ten(c) === "tc");
export const rows = (tbl) => conPT(tbl).filter((c) => ten(c) === "tr");

// ---------------- Nhận diện cột ----------------

/** Tiêu đề cột → tag. Thứ tự quan trọng (cụ thể trước chung). */
export function tagCot(nhan, bang) {
  const k = khongDau(nhan);
  if (!k || k === "#" || k === "stt") return "stt";
  if (k.startsWith("uu tien")) return "uu_tien";
  if (k.includes("ma viec")) return "ma_viec";
  if (k.includes("noi dung can")) return "ten";
  if (k.includes("han quyet dinh")) return "han_quyet_dinh";
  if (k.includes("ket qua can co")) return "ket_qua_can_co";
  if (k.includes("phu trach")) return "phu_trach";
  if (k.startsWith("han")) return "ket_thuc";
  if (k.includes("bat dau")) return "bat_dau";
  if (k.includes("ket thuc")) return "ket_thuc";
  if (k.includes("da xong")) return "da_xong";
  if (k.includes("tai lieu")) return "tai_lieu";
  if (k.includes("anh huong")) return "anh_huong";
  if (k.includes("kien nghi")) return "kien_nghi";
  if (k.includes("muc do")) return "muc_do";
  if (k.includes("nguon")) return "nguon";
  if (k.includes("du an")) return "du_an";
  if (k.includes("van de") || k.includes("rui ro")) return "noi_dung";
  if (k === "cong viec" || k.startsWith("cong viec")) return bang === "bang_kien_nghi" ? "noi_dung" : "ten";
  return k.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "cot";
}

const LA_MA = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const RE_TIEU_DE = /^([IVX]+|[A-Z]\d?)\.\s+\S/;
const RE_NGAY_KY = /,\s*ngày\s+\d+\s+tháng\s+\d+\s+năm\s+\d{4}/i;

export function laTieuDe(p) {
  const t = chu(p);
  if (t.length > 140) return false;
  // Mẫu mới (SCI-160): mục "1. …", "2. …" dùng kiểu Heading
  const kieu = conTen(conTen(p, "pPr") ?? p, "pStyle")?.getAttributeNS(W, "val") ?? "";
  if (/^heading/i.test(kieu) && (/^\d{1,2}\.\s+\S/.test(t) || RE_TIEU_DE.test(t))) return true; // bản 9: Form 9 đánh La Mã
  if (!RE_TIEU_DE.test(t)) return false;
  const runs = tatCa(p, "r").filter((r) => chu(r).trim());
  return runs.length > 0 && runs.every((r) => r.getElementsByTagNameNS(W, "b").length > 0);
}

/** Tiêu đề bỏ số thứ tự: "V. RỦI RO & KIẾN NGHỊ" → "RỦI RO & KIẾN NGHỊ". */
export const boSo = (t) => t.replace(/^\s*(?:[IVX]+|[A-Z]\d?|\d{1,2})\.\s*/, "").trim();

// ---------------- Bảng Công việc chuẩn ----------------

/** Chương việc — máy nhận theo TÊN (bỏ số chương). Mẫu báo cáo tháng dùng "THÁNG TỚI". */
export const TEN_CHUONG_VIEC = { tuan: "KẾT QUẢ VÀ KẾ HOẠCH VIỆC TUẦN TỚI", thang: "KẾT QUẢ VÀ KẾ HOẠCH VIỆC THÁNG TỚI" };
export const tenChuongViec = (loaiKy) => (loaiKy === "thang" ? TEN_CHUONG_VIEC.thang : TEN_CHUONG_VIEC.tuan);

/** Ô chọn cột Tình trạng: chọn "Đã xong" thì máy đóng việc. */
export const TINH_TRANG_VIEC = ["Chưa làm", "Đang làm", "Đã xong"];

/** Cột bảng việc: [tag, nhãn, % bề rộng]. Việc thuộc đơn vị lập báo cáo — trừ Form 0 (thêm cột Bộ phận phụ trách). */
export const COT_CONG_VIEC = [
  ["ten", "Công việc", 30],
  ["du_an", "Dự án", 14],
  ["bat_dau", "Bắt đầu", 11],
  ["ket_thuc", "Kết thúc", 11],
  ["ket_qua_can_co", "Kết quả cần có", 22],
  ["tinh_trang", "Tình trạng", 12],
];
export const COT_CONG_VIEC_FORM0 = [
  ["ten", "Công việc", 25],
  ["du_an", "Dự án", 12],
  ["phu_trach", "Bộ phận phụ trách", 14],
  ["bat_dau", "Bắt đầu", 10],
  ["ket_thuc", "Kết thúc", 10],
  ["ket_qua_can_co", "Kết quả cần có", 18],
  ["tinh_trang", "Tình trạng", 11],
];
export const cotCongViec = (ma) => (ma === "form-0" ? COT_CONG_VIEC_FORM0 : COT_CONG_VIEC);

function datChu(doc, p, text) {
  // Giữ pPr + rPr của run đầu; thay chữ.
  const runs = conPT(p).filter((c) => ten(c) !== "pPr");
  const r0 = runs.find((r) => ten(r) === "r");
  const rPr = r0 ? conTen(r0, "rPr") : null;
  for (const r of runs) p.removeChild(r);
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

function oMau(doc, tcMau, rong, text) {
  const tc = tcMau.cloneNode(true);
  const tcPr = conTen(tc, "tcPr");
  const w = tcPr ? conTen(tcPr, "tcW") : null;
  if (w) {
    w.setAttributeNS(W, "w:w", String(rong));
    w.setAttributeNS(W, "w:type", "dxa");
  }
  const gs = tcPr ? conTen(tcPr, "gridSpan") : null;
  if (gs) tcPr.removeChild(gs);
  // Ô mẫu đã được bọc (bảng gắn mã): đưa đoạn đầu trong ô nhập ra ngoài để giữ định dạng đoạn + chữ
  const sdtTrong = conPT(tc).find((c) => ten(c) === "sdt");
  if (sdtTrong && !conPT(tc).some((c) => ten(c) === "p")) {
    const pTrong = tatCa(sdtTrong, "p")[0];
    if (pTrong) tc.insertBefore(pTrong, sdtTrong);
  }
  const ps = conPT(tc).filter((c) => ten(c) === "p");
  for (const p of ps.slice(1)) tc.removeChild(p);
  if (ps[0]) datChu(doc, ps[0], text);
  // bỏ sdt nếu ô mẫu đã được bọc
  for (const s of conPT(tc).filter((c) => ten(c) === "sdt")) tc.removeChild(s);
  if (!conPT(tc).some((c) => ten(c) === "p")) tc.appendChild(taoPT(doc, "p"));
  return tc;
}

/** Dựng bảng Công việc theo kiểu của một bảng có sẵn (tblPr, ô tiêu đề, ô dữ liệu). */
function dungBangCongViec(doc, tblMau, cot = COT_CONG_VIEC, soDong = 3) {
  const tbl = taoPT(doc, "tbl");
  const tblPr = conTen(tblMau, "tblPr").cloneNode(true);
  for (const c of conPT(tblPr)) if (ten(c) === "tblCaption" || ten(c) === "tblDescription") tblPr.removeChild(c);
  tbl.appendChild(tblPr);
  const grid = conTen(tblMau, "tblGrid");
  const tong = grid ? conPT(grid).reduce((a, g) => a + Number(g.getAttributeNS(W, "w") || g.getAttribute("w:w") || 0), 0) : 9900;
  const rong = cot.map(([, , pt]) => Math.round((tong * pt) / 100));
  const g = taoPT(doc, "tblGrid");
  for (const w of rong) g.appendChild(taoPT(doc, "gridCol", { w }));
  tbl.appendChild(g);
  const hang = rows(tblMau);
  const trTieuDe = hang[0];
  const trDuLieu = hang[1] ?? hang[0];
  const oTieuDe = cells(trTieuDe)[Math.min(1, cells(trTieuDe).length - 1)];
  const oDuLieu = cells(trDuLieu)[Math.min(1, cells(trDuLieu).length - 1)];
  const moiTr = (mau) => {
    const tr = mau.cloneNode(false);
    const trPr = conTen(mau, "trPr");
    if (trPr) tr.appendChild(trPr.cloneNode(true));
    return tr;
  };
  const tr0 = moiTr(trTieuDe);
  cot.forEach(([, nhan], i) => tr0.appendChild(oMau(doc, oTieuDe, rong[i], nhan)));
  tbl.appendChild(tr0);
  for (let d = 0; d < soDong; d++) {
    const tr = moiTr(trDuLieu);
    cot.forEach(([tag, nhan], i) => {
      const tc = oMau(doc, oDuLieu, rong[i], "");
      if (tag === "tinh_trang") oChonTinhTrang(doc, tc);
      else bocO(doc, tc, tag, nhan);
      tr.appendChild(tc);
    });
    tbl.appendChild(tr);
  }
  return tbl;
}

/** Ô Tình trạng: ô chọn (dropdown) trong đoạn đầu của ô, đang hiện chữ giữ chỗ (máy đọc là trống). */
function oChonTinhTrang(doc, tc) {
  const p = conPT(tc).find((c) => ten(c) === "p");
  const pPr = conTen(p, "pPr");
  const r0 = conPT(p).find((c) => ten(c) === "r");
  const rPr = (r0 && conTen(r0, "rPr")) ?? (pPr ? conTen(pPr, "rPr") : null);
  for (const c of conPT(p)) if (c !== pPr) p.removeChild(c);
  const r = taoPT(doc, "r");
  if (rPr) r.appendChild(rPr.cloneNode(true));
  const t = taoPT(doc, "t");
  t.textContent = "Chọn";
  r.appendChild(t);
  p.appendChild(r);
  boc(doc, [r], "tinh_trang", "Tình trạng", { loai: "chon", muc: TINH_TRANG_VIEC, giuCho: true, ...(rPr ? { rPr } : {}) });
}

// ---------------- Bảng số liệu gắn mã (phiên bản mẫu 3 — cho bộ luật kiểm tra động) ----------------
// Bảng số liệu của mẫu thật (an toàn, KPI, tiến độ, GPMB, thu vốn…) được bọc như bảng kiến nghị: sdt tag bảng
// + tblCaption, mỗi ô dữ liệu một content control tag cột. Chỉ bọc — chữ, định dạng, gộp ô giữ nguyên.
// Chọn bảng theo mục: tiêu đề mục (không dấu) chứa `muc`; `so` = thứ tự bảng trong mục (bỏ trống = mọi bảng
// trong mục có cột đầu khớp); `cot_dau` = tiêu đề cột đầu (không dấu, bắt đầu bằng) để chắc đúng bảng;
// `dau` = số dòng tiêu đề; `cot` = [tag, nhãn] theo vị trí ô của dòng dữ liệu (số ô phải khớp, lệch → báo lỗi);
// `nhom` = bảng có dòng nhóm (chỉ ô đầu có chữ, vd "ĐẦU TƯ", "Hướng Linh 7") → ô đầu gắn tag "nhom", bộ đọc
// không coi là dòng dữ liệu mà ghi tên nhóm vào cột "nhom" của các dòng sau.
// Nhãn bảng = tiêu đề mục (để luật "mục có nội dung" tính cả chữ trong bảng).

export const TAG_NHOM = "nhom";
/** w:tblDescription của bảng số liệu gắn mã (doc-word.ts dùng để giữ chữ bảng trong chữ của mục). */
export const MO_TA_SO_LIEU = "so_lieu";

const COT_AN_TOAN = [
  ["chi_tieu", "Chỉ tiêu"],
  ["tuan_nay", "Tuần này"],
  ["luy_ke_nam", "Lũy kế năm"],
  ["ghi_chu", "Ghi chú / Hành động ngay"],
];
const COT_KPI = [
  ["kpi", "KPI"],
  ["dvt", "ĐVT"],
  ["kh_thang", "KH tháng"],
  ["tuan_nay", "Tuần này"],
  ["luy_ke_thang", "Lũy kế tháng"],
  ["mat_agc_tuan", "Sản lượng mất AGC (Tuần này)"],
  ["mat_agc_thang", "Sản lượng mất AGC (Tháng)"],
  ["luy_ke_nam", "Lũy kế năm"],
  ["tinh_trang", "Tình trạng"],
];
const COT_CANH_BAO = [
  ["ho_so", "Hồ sơ / Mốc pháp lý"],
  ["loai", "Loại"],
  ["tinh_trang", "Tình trạng hiện tại"],
  ["vuong_mac", "Vướng mắc cần xử lý"],
  ["anh_huong", "Ảnh hưởng nếu trễ (có định lượng)"],
];

export const BANG_SO_LIEU = {
  "form-9": [
    {
      muc: "canh bao an toan dien",
      cot_dau: "chi tieu",
      tag: "bang_an_toan",
      dau: 1,
      // Cột cuối là HÀNH ĐỘNG (việc cần làm kèm ngày) → sổ cái lấy việc từ cột này
      cot: [
        ["chi_tieu", "Chỉ tiêu"],
        ["tuan_nay", "Tuần này"],
        ["luy_ke_nam", "Lũy kế năm"],
        ["hanh_dong", "Ghi chú / Hành động ngay"],
      ],
    },
    {
      muc: "canh bao ky thuat co dien",
      cot_dau: "hang muc",
      tag: "bang_canh_bao",
      dau: 1,
      nhom: true,
      cot: [["ho_so", "Hạng mục / Dự án"], ...COT_CANH_BAO.slice(1)],
    },
  ],
  "form-0": [
    { muc: "canh bao an toan", cot_dau: "chi tieu", tag: "bang_an_toan", dau: 1, cot: COT_AN_TOAN },
    { muc: "kpi dieu hanh", cot_dau: "kpi", tag: "bang_kpi", dau: 1, nhom: true, cot: COT_KPI },
    {
      muc: "cong no phai thu",
      cot_dau: "ten du an",
      tag: "bang_cong_no",
      dau: 2,
      cot: [
        ["du_an", "Tên dự án"],
        ["gia_tri_hd", "Giá trị hợp đồng"],
        ["da_xuat_hd", "Giá trị đã xuất hóa đơn"],
        ["con_lai", "Giá trị còn lại"],
        ["do_dang", "Sản lượng dở dang"],
        ["no_trong_han", "Công nợ phải thu — Trong hạn"],
        ["no_qua_han", "Công nợ phải thu — Quá hạn"],
      ],
    },
    { muc: "canh bao dau tu", cot_dau: "ho so", tag: "bang_canh_bao", dau: 1, nhom: true, cot: COT_CANH_BAO },
  ],
  "form-1": [{ muc: "canh bao dau tu", cot_dau: "ho so", tag: "bang_canh_bao", dau: 1, nhom: true, cot: COT_CANH_BAO }],
  "form-2": [
    { muc: "canh bao an toan", cot_dau: "chi tieu", tag: "bang_an_toan", dau: 1, cot: COT_AN_TOAN },
    { muc: "doanh thu dien", cot_dau: "kpi", tag: "bang_kpi", dau: 1, nhom: true, cot: COT_KPI },
  ],
  "form-3": [
    {
      muc: "nhan su",
      cot_dau: "chi tieu nhan su",
      tag: "bang_nhan_su",
      dau: 1,
      cot: [
        ["chi_tieu", "Chỉ tiêu nhân sự"],
        ["kh_nam", "KH năm"],
        ["dau_ky", "Đầu tuần"],
        ["cuoi_ky", "Cuối tuần"],
        ["bien_dong", "Biến động"],
        ["ghi_chu", "Ghi chú"],
      ],
    },
  ],
  "form-4": [
    {
      muc: "bao cao nguon tien",
      cot_dau: "noi dung",
      tag: "bang_nguon_tien",
      dau: 1,
      cot: [
        ["noi_dung", "Nội dung"],
        ["sci", "SCI"],
        ["sci_nang_luong", "SCI Năng Lượng"],
        ["sci_tu_van", "SCI Tư Vấn"],
        ["sci_quang_tri", "SCI Quảng Trị"],
        ["sci_lai_chau", "SCI Lai Châu"],
        ["sci_nghe_an", "SCI Nghệ An"],
        ["huong_linh_7", "Hướng Linh 7"],
        ["huong_linh_8", "Hướng Linh 8"],
      ],
    },
    {
      muc: "chi phi gia thanh",
      cot_dau: "stt",
      tag: "bang_chi_phi",
      dau: 1,
      cot: [
        ["stt", "STT"],
        ["khoan_muc", "Thành phần chi phí"],
        ["thang", "Tháng (Tr.đ)"],
        ["luy_ke", "Lũy kế (Tr.đ)"],
        ["ke_hoach", "Kế hoạch năm (Tr.đ)"],
        ["pt_ht", "% Hoàn thành"],
      ],
    },
  ],
  "form-5": [
    {
      muc: "tong quan cac du an",
      cot_dau: "stt",
      tag: "bang_du_an",
      dau: 1,
      cot: [
        ["stt", "STT"],
        ["du_an", "Dự án"],
        ["cong_suat", "Công suất"],
        ["giai_doan", "Giai đoạn"],
        ["chu_dau_tu", "Chủ đầu tư"],
        ["trang_thai", "Trạng thái"],
      ],
    },
    {
      muc: "tien do chi tiet cong tac thiet ke",
      cot_dau: "stt",
      tag: "bang_tien_do_tk",
      dau: 1,
      cot: [
        ["stt", "STT"],
        ["du_an", "Dự án"],
        ["hang_muc", "Hạng mục thiết kế"],
        ["ngay_ke_hoach", "Ngày kế hoạch"],
        ["pt_ht", "% HT"],
        ["ghi_chu", "Ghi chú"],
      ],
    },
  ],
  "form-6": [
    {
      muc: "tong quan cac du an",
      cot_dau: "stt",
      tag: "bang_du_an",
      dau: 1,
      cot: [
        ["stt", "STT"],
        ["du_an", "Dự án"],
        ["cong_suat", "Công suất"],
        ["loai_hinh", "Loại hình"],
        ["dia_diem", "Địa điểm"],
        ["trang_thai", "Trạng thái tổng thể"],
        ["tien_do", "Tiến độ"],
      ],
    },
    {
      muc: "tien do thi cong chi tiet",
      so: [0, 1],
      cot_dau: "hang muc",
      tag: "bang_tien_do_tc",
      dau: 1,
      cot: [
        ["hang_muc", "Hạng mục"],
        ["kh_luy_ke", "KH lũy kế"],
        ["th_luy_ke", "TH lũy kế"],
        ["lech", "% KH (lệch TH − KH)"],
        ["ghi_chu", "Tình trạng / Ghi chú"],
      ],
    },
    {
      muc: "nhan luc & an toan",
      cot_dau: "du an",
      tag: "bang_nhan_luc",
      dau: 1,
      cot: [
        ["du_an", "Dự án"],
        ["lao_dong_pt", "Lao động phổ thông"],
        ["ky_su", "Kỹ sư/Kỹ thuật"],
        ["quan_ly", "Quản lý"],
        ["tong", "Tổng"],
        ["tnld_tuan", "TNLĐ tuần"],
        ["vi_pham_atld", "Vi phạm ATLĐ"],
        ["gio_cong_at", "Giờ công AT liên tục"],
      ],
    },
    {
      muc: "tien do thu von",
      cot_dau: "du an",
      tag: "bang_thu_von",
      dau: 1,
      cot: [
        ["du_an", "Dự án"],
        ["gia_tri_hd", "TTS HĐ (tỷ đ)"],
        ["giai_ngan_lk", "GT giải ngân LK"],
        ["pt_gia_tri_hd", "% GT HĐ"],
        ["phai_thu_qua_han", "Phải thu quá hạn"],
        ["ghi_chu", "Ghi chú"],
      ],
    },
  ],
  "form-7": [
    {
      muc: "tien do tong the",
      cot_dau: "hang muc",
      tag: "bang_tien_do",
      dau: 1,
      cot: [
        ["hang_muc", "Hạng mục"],
        ["kh_luy_ke", "KH lũy kế"],
        ["th_luy_ke", "TH lũy kế"],
        ["lech", "Lệch"],
        ["ghi_chu", "Ghi chú"],
      ],
    },
    {
      muc: "chi tiet tien do tung hang muc",
      cot_dau: "stt",
      tag: "bang_khoi_luong",
      dau: 1,
      cot: [
        ["stt", "STT"],
        ["cong_viec", "Công việc"],
        ["don_vi", "Đơn vị"],
        ["kl_thiet_ke", "KL thiết kế"],
        ["kl_thuc_hien", "KL thực hiện (lũy kế tuần này)"],
        ["kl_tuan_sau", "KH khối lượng tuần sau"],
        ["pt_dat", "% đạt được"],
        ["ghi_chu", "Ghi chú"],
      ],
    },
    {
      muc: "gpmb",
      cot_dau: "khu vuc",
      tag: "bang_gpmb",
      dau: 1,
      cot: [
        ["khu_vuc", "Khu vực / Hộ dân"],
        ["loai_dat", "Loại đất"],
        ["dien_tich", "Diện tích (m²)"],
        ["tinh_trang", "Tình trạng"],
        ["vuong_mac", "Vướng mắc"],
      ],
    },
  ],
  "form-8": [
    {
      muc: "san luong & van hanh",
      cot_dau: "chi tieu",
      tag: "bang_san_luong",
      dau: 2,
      cot: [
        ["chi_tieu", "Chỉ tiêu"],
        ["tuan_th", "Tuần — T/H"],
        ["tuan_kh", "Tuần — KH"],
        ["tuan_pt_kh", "Tuần — % KH"],
        ["thang_lk", "Tháng — Lũy kế"],
        ["thang_kh", "Tháng — KH tháng"],
        ["thang_pt_kh", "Tháng — % KH"],
        ["nam_kh", "Cả năm — KH năm"],
        ["nam_lk", "Cả năm — LK YTD"],
      ],
    },
    {
      muc: "thiet bi & bao tri",
      cot_dau: "stt",
      tag: "bang_su_co",
      dau: 1,
      cot: [
        ["stt", "STT"],
        ["ngay", "Ngày"],
        ["thiet_bi", "Thiết bị"],
        ["mo_ta", "Mô tả bất thường / sự cố"],
        ["bien_phap", "Trạng thái & Biện pháp xử lý"],
      ],
    },
  ],
};

// Form 10 = bảng số liệu của Form 7 trừ bảng GPMB (tổng thầu không báo cáo GPMB)
BANG_SO_LIEU["form-10"] = BANG_SO_LIEU["form-7"].filter((b) => b.tag !== "bang_gpmb");

/** Mọi tag bảng số liệu (bảng gắn mã không phải bảng kiến nghị/quyết định/kế hoạch/công việc). */
export const TAG_BANG_SO_LIEU = new Set(Object.values(BANG_SO_LIEU).flatMap((ds) => ds.map((d) => d.tag)));

/** Dòng nhóm: nhiều ô, chỉ ô đầu có chữ ("ĐẦU TƯ", "Hướng Linh 7"). */
export const laDongNhom = (tr) => {
  const cs = cells(tr);
  if (cs.length === 1) return chu(cs[0]).trim() !== ""; // một ô gộp ngang cả dòng (mẫu SCI-160)
  return cs.length > 1 && chu(cs[0]).trim() !== "" && cs.slice(1).every((c) => chu(c).trim() === "");
};

/** Gắn mã một bảng số liệu theo đặc tả. Trả mô tả bảng cho dinh-nghia.json. */
function ganMaBangSoLieu(doc, tbl, sp, nhan, ma) {
  const hang = rows(tbl);
  let soNhom = 0;
  for (const [i, tr] of hang.slice(sp.dau).entries()) {
    const cs = cells(tr);
    if (sp.nhom && laDongNhom(tr)) {
      bocO(doc, cs[0], TAG_NHOM, "Nhóm");
      soNhom++;
      continue;
    }
    if (cs.length !== sp.cot.length) throw new Error(`${ma} ${sp.tag}: dòng ${sp.dau + i + 1} có ${cs.length} ô, đặc tả ${sp.cot.length} cột`);
    cs.forEach((tc, k) => bocO(doc, tc, sp.cot[k][0], sp.cot[k][1]));
  }
  themCaption(doc, tbl, sp.tag);
  // Dấu "bảng số liệu" (mô tả thay thế của bảng): bộ đọc vẫn tính chữ của bảng vào chữ của mục như trước khi gắn mã
  conTen(tbl, "tblPr")?.appendChild(taoPT(doc, "tblDescription", { val: MO_TA_SO_LIEU }));
  boc(doc, [tbl], sp.tag, nhan);
  const cot = sp.cot.map(([tag, n]) => ({ tag, nhan: n }));
  return { tag: sp.tag, nhan, so_lieu: true, cot: sp.nhom ? [{ tag: TAG_NHOM, nhan: "Nhóm" }, ...cot] : cot, _nhom: soNhom };
}

/** Bước gắn mã bảng số liệu của một mẫu (chạy sau khi đã gắn các bảng kiến nghị/quyết định/kế hoạch). */
function ganBangSoLieu(doc, body, ma, ghi) {
  const dac = BANG_SO_LIEU[ma] ?? [];
  const kq = [];
  let mucHienTai = null;
  let soTrongMuc = 0;
  const daGan = new Set();
  for (const k of conPT(body)) {
    if (ten(k) === "p" && laTieuDe(k)) {
      mucHienTai = chu(k);
      soTrongMuc = 0;
      continue;
    }
    if (ten(k) !== "tbl" || !mucHienTai) continue;
    const so = soTrongMuc++;
    const kt = khongDau(mucHienTai);
    const sp = dac.find((d) => kt.includes(d.muc) && (d.so === undefined || d.so.includes(so)));
    if (!sp) continue;
    const dau = khongDau(chu(cells(rows(k)[0])[0]));
    if (!dau.startsWith(sp.cot_dau)) throw new Error(`${ma} ${sp.tag}: bảng trong mục "${mucHienTai}" có cột đầu "${dau}", đặc tả "${sp.cot_dau}"`);
    const mt = ganMaBangSoLieu(doc, k, sp, boSo(mucHienTai), ma);
    const { _nhom, ...moTa } = mt;
    if (!daGan.has(sp.tag)) kq.push(moTa);
    daGan.add(sp.tag);
    ghi.push(`${sp.tag} ← bảng mục "${mucHienTai}" (${rows(k).length} dòng${_nhom ? `, ${_nhom} dòng nhóm` : ""})`);
  }
  for (const d of dac) if (!daGan.has(d.tag)) throw new Error(`${ma}: không tìm thấy bảng ${d.tag} (mục "${d.muc}")`);
  return kq;
}

// ---------------- Chuyển một mẫu ----------------

export function themCaption(doc, tbl, tag) {
  const pr = conTen(tbl, "tblPr");
  if (!pr) return;
  for (const c of conPT(pr)) if (ten(c) === "tblCaption" || ten(c) === "tblDescription") pr.removeChild(c);
  pr.appendChild(taoPT(doc, "tblCaption", { val: tag }));
}

/** Gắn mã một bảng có sẵn: bọc bảng (tag bảng) + từng ô dữ liệu (tag cột theo tiêu đề). */
function ganMaBang(doc, tbl, tag, nhan) {
  const hang = rows(tbl);
  const tieuDe = cells(hang[0]).map((c) => chu(c));
  const cot = tieuDe.map((t) => tagCot(t, tag));
  for (const tr of hang.slice(1)) cells(tr).forEach((tc, i) => bocO(doc, tc, cot[i] ?? `cot_${i + 1}`, tieuDe[i] || cot[i]));
  themCaption(doc, tbl, tag);
  boc(doc, [tbl], tag, nhan);
  return { tag, nhan, cot: cot.map((c, i) => ({ tag: c, nhan: tieuDe[i] })) };
}

/**
 * Chuyển một mẫu gốc. Trả { buf, dinh_nghia, bao_cao } — bao_cao ghi những gì đã bọc/thêm để in ra.
 */
export async function chuyenMau(bufGoc, m) {
  const zip = await JSZip.loadAsync(bufGoc);
  const xml = await zip.file("word/document.xml").async("string");
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const body = doc.getElementsByTagNameNS(W, "body")[0];
  const ghi = [];
  // 0. Bản 9: đầu trang một khuôn (trước mọi bước — Form 9 có khung tiêu đề rồi mới đi đường chung)
  khungDauBan9(doc, body, m, ghi);
  const khoi = conPT(body);
  const bangs = khoi.filter((k) => ten(k) === "tbl");
  const oNhap = [];
  const themO = (o) => {
    if (!oNhap.some((x) => x.tag === o.tag)) oNhap.push(o);
  };

  const sci160 = m.bo_cuc === "sci160";
  // 1. Tiêu đề: dấu nhận mẫu (sdt khóa bọc tiêu đề) + dòng "Gửi:" (Form 5–8)
  const tieuDe = bangs[0];
  const oTieuDe = sci160 ? [] : cells(rows(tieuDe)[0]);
  if (sci160) {
    const pTieuDe = conPT(body).find((k) => ten(k) === "p" && /^BÁO CÁO/i.test(chu(k)));
    if (!pTieuDe) throw new Error(`${m.ma}: không thấy tiêu đề "BÁO CÁO …"`);
    boc(doc, [pTieuDe], `mau_ma:${m.ma}`, `Mẫu ${m.ten} — không xóa ô này`).getElementsByTagNameNS(W, "sdtPr")[0].appendChild(taoPT(doc, "lock", { val: "sdtLocked" }));
  } else {
    const oPhai = oTieuDe[oTieuDe.length - 1];
    bocO(doc, oPhai, `mau_ma:${m.ma}`, `Mẫu ${m.ten} — không xóa ô này`).getElementsByTagNameNS(W, "sdtPr")[0].appendChild(taoPT(doc, "lock", { val: "sdtLocked" }));
  }
  themO({ tag: "mau_ma", nhan: "Mã mẫu (dấu nhận mẫu ẩn ở tiêu đề)", bat_buoc: true, kieu: "chu", luat: "dung_mau" });
  // 1b. "Đơn vị lập" (bản 5): dòng tên đơn vị NGAY DƯỚI dòng "BÁO CÁO …" — máy đọc chữ người thấy, không dùng mã ẩn.
  // Form 0 bỏ qua (dòng đó là "TRÌNH TỔNG GIÁM ĐỐC"; báo cáo hợp nhất luôn của Ban TGĐ).
  if (m.ma !== "form-0") {
    const ps = sci160
      ? conPT(body).filter((k) => ten(k) === "p" || ten(k) === "sdt")
      : tatCa(oTieuDe[oTieuDe.length - 1], "p");
    const iBc = ps.findIndex((p) => /^BÁO CÁO/i.test(chu(p).trim()));
    const pDv = iBc >= 0 ? ps.slice(iBc + 1).find((p) => ten(p) === "p" && chu(p).trim()) : undefined;
    if (!pDv) throw new Error(`${m.ma}: không thấy dòng tên đơn vị dưới tiêu đề "BÁO CÁO …"`);
    boc(doc, [pDv], "don_vi_lap", "Đơn vị lập — ghi đúng tên đơn vị nộp báo cáo");
    themO({ tag: "don_vi_lap", nhan: "Đơn vị lập", bat_buoc: false, kieu: "don_vi", luat: "dung_mau" }); // file cũ không có ô này — máy dò đầu file
    ghi.push(`don_vi_lap = "${chu(pDv)}"`);
  }
  for (const p of oTieuDe.length ? tatCa(oTieuDe[0], "p") : []) {
    const t = chu(p);
    const i = t.indexOf("Gửi:");
    if (i < 0) continue;
    const runs = conPT(p).filter((c) => ten(c) === "r");
    let dem = 0;
    let conLai = [];
    for (let k = 0; k < runs.length; k++) {
      const rt = chu(runs[k]);
      if (dem + rt.length > i + 4 || conLai.length) {
        if (!conLai.length) {
          const cat = i + 4 - dem + (rt.slice(i + 4 - dem).match(/^\s*/)[0].length);
          if (cat > 0 && cat < rt.length) conLai.push(tachRun(doc, runs[k], cat)[1]);
          else if (cat <= 0) conLai.push(runs[k]);
        } else conLai.push(runs[k]);
      }
      dem += rt.length;
    }
    if (conLai.length) {
      boc(doc, conLai, "gui_den", "Gửi (nơi nhận)", { loai: "text" });
      themO({ tag: "gui_den", nhan: "Gửi", bat_buoc: false, kieu: "don_vi", luat: "gui_den" });
      ghi.push(`gui_den = "${chu(conLai[0].parentNode)}"`);
    }
  }

  // 2. Bảng thông tin chung: kỳ báo cáo, người lập, ngày lập, người kiểm soát
  const NHAN_O = [
    [/^ky bao cao/, "ky_bao_cao", "Kỳ báo cáo", "ky_bao_cao"],
    [/^(nguoi lap|tong hop boi)/, "nguoi_lap", null, "nguoi_lap"],
    [/^ngay lap/, "ngay_lap", "Ngày lập", "nguoi_lap"],
    [/^(nguoi kiem soat|nguoi kiem tra)/, "nguoi_kiem_soat", null, "nguoi_lap"],
  ];
  for (const tr of rows(sci160 ? bangs[0] : bangs[1])) {
    const cs = cells(tr);
    for (let i = 0; i + 1 < cs.length; i += 2) {
      const nhan = chu(cs[i]).replace(/:\s*$/, "").trim();
      const k = khongDau(nhan);
      const d = NHAN_O.find(([re]) => re.test(k));
      if (!d) continue;
      const [, tag, nhanCo, luat] = d;
      if (O_BO_BAN_6.has(tag)) {
        xoaCapO(doc, tr, cs[i], cs[i + 1]);
        ghi.push(`bỏ ô "${nhan}" (bản 6)`);
        continue;
      }
      if (tag === "ky_bao_cao") gonKyBan9(doc, cs[i + 1], m, ghi);
      const sdt = bocO(doc, cs[i + 1], tag, nhanCo ?? nhan);
      themO({ tag, nhan: nhanCo ?? nhan, bat_buoc: true, kieu: tag === "ngay_lap" ? "ngay" : "chu", luat });
      if (tag === "ky_bao_cao") {
        // ☒/☐ → hộp tích bấm được (chữ giữ nguyên)
        for (const r of tatCa(sdt, "r")) {
          const t = conTen(r, "t");
          if (!t || !/^[☐☒]/.test(t.textContent)) continue;
          const sau = t.textContent.slice(1);
          const chon = t.textContent[0] === "☒";
          const loai = /th[aá]ng/i.test(sau) ? "thang" : /qu[yý]/i.test(sau) ? "quy" : "tuan";
          const r1 = sau ? tachRun(doc, r, 1)[0] : r;
          boc(doc, [r1], `ky_chon_${loai}`, `Chọn kỳ ${loai === "thang" ? "tháng" : loai === "quy" ? "quý" : "tuần"}`, { loai: "checkbox", checked: chon, rPr: conTen(r1, "rPr") ?? undefined });
        }
      }
      ghi.push(`${tag} = "${chu(sdt).replace(/\n/g, " / ")}"`);
    }
  }

  for (const tr of rows(sci160 ? bangs[0] : bangs[1])) if (!cells(tr).length) tr.parentNode.removeChild(tr);

  // 2b. Bảng "THÔNG TIN DỰ ÁN" (Form 7, 10 — bản 5): gắn nhãn từng ô giá trị (cặp nhãn | giá trị)
  // Chỉ bảng có dòng tiêu đề "THÔNG TIN DỰ ÁN" (Form 0 có bảng danh sách cột "Tên dự án" — không phải bảng này)
  const bangTtda = bangs.find((b) => khongDau(chu(rows(b)[0] ?? b)).trim().startsWith("thong tin du an"));
  if (bangTtda) {
    for (const tr of rows(bangTtda)) {
      const cs = cells(tr);
      for (let i = 0; i + 1 < cs.length; i += 2) {
        const d = O_THONG_TIN_DU_AN.find(([re]) => re.test(khongDau(chu(cs[i]).trim())));
        if (!d) continue;
        bocO(doc, cs[i + 1], d[1], d[2]);
        themO({ tag: d[1], nhan: d[2], bat_buoc: false, kieu: "chu" });
        ghi.push(`${d[1]} = "${chu(cs[i + 1])}"`);
      }
    }
  }

  // 3. Mục (tiêu đề) và bảng theo mục
  const muc = [];
  const bangSinhViec = [];
  const bangMoTa = [];
  let tieuDeHienTai = null;
  let bangKienNghi = null;
  let bangQuyetDinh = null;
  let chuongCu = null;
  let daGanTrongMuc = false;
  for (const k of conPT(body)) {
    if (ten(k) === "p" && laTieuDe(k)) {
      tieuDeHienTai = { p: k, text: chu(k) };
      muc.push(tieuDeHienTai);
      daGanTrongMuc = false;
      continue;
    }
    if (ten(k) !== "tbl" || !tieuDeHienTai || daGanTrongMuc) continue;
    const kt = khongDau(tieuDeHienTai.text);
    if (kt.includes("kien nghi")) {
      bangMoTa.push(ganMaBang(doc, k, "bang_kien_nghi", boSo(tieuDeHienTai.text)));
      bangKienNghi = k;
      daGanTrongMuc = true;
    } else if (kt.includes("quyet dinh")) {
      // Form 0 "Việc cần lãnh đạo quyết định": bảng báo cáo — TGĐ bấm giao tay từng dòng (không tự sinh việc)
      bangMoTa.push(ganMaBang(doc, k, "bang_quyet_dinh", boSo(tieuDeHienTai.text)));
      bangSinhViec.push({ tag: "bang_quyet_dinh", nhan: tieuDeHienTai.text, la_quyet_dinh: true });
      bangQuyetDinh = k;
      daGanTrongMuc = true;
    } else if (kt.includes("ke hoach cong viec")) {
      // Form 6 "Kế hoạch công việc tháng tới": thay bằng chương việc chuẩn ở bước 4 (giữ vị trí)
      chuongCu = { tbl: k, muc: tieuDeHienTai };
      daGanTrongMuc = true;
    }
  }

  // 3b. Bảng số liệu (an toàn, KPI, tiến độ, GPMB, thu vốn…) — cho bộ luật kiểm tra động
  bangMoTa.unshift(...ganBangSoLieu(doc, body, m.ma, ghi));
  // Form 5: bảng "Tiến độ chi tiết công tác thiết kế" cũng sinh việc (mỗi hạng mục một việc; không có ngày bắt đầu → ngày lập)
  const tienDoTk = bangMoTa.find((b) => b.tag === "bang_tien_do_tk");
  if (tienDoTk) {
    const mTk = muc.find((x) => boSo(x.text) === tienDoTk.nhan);
    bangSinhViec.push({ tag: "bang_tien_do_tk", nhan: mTk?.text ?? tienDoTk.nhan });
  }

  // 4. Chương việc chuẩn "KẾT QUẢ VÀ KẾ HOẠCH VIỆC TUẦN/THÁNG TỚI" — máy nhận theo tên, số chương theo vị trí trong mẫu
  {
    const tenChuong = tenChuongViec(m.loai_ky);
    const cot = cotCongViec(m.ma);
    let tieuDeMoi;
    if (chuongCu) {
      // Thay tại chỗ: giữ số chương, đổi tên; bảng cũ → bảng chuẩn (mượn kiểu bảng cũ)
      const so = chuongCu.muc.text.match(/^\s*([IVX]+|[A-Z]\d?|\d{1,2})\./)?.[1] ?? "";
      tieuDeMoi = `${so ? `${so}. ` : ""}${tenChuong}`;
      datChu(doc, chuongCu.muc.p, tieuDeMoi);
      chuongCu.muc.text = tieuDeMoi;
      const tbl = dungBangCongViec(doc, chuongCu.tbl, cot);
      themCaption(doc, tbl, "bang_cong_viec");
      body.insertBefore(tbl, chuongCu.tbl);
      body.removeChild(chuongCu.tbl);
      boc(doc, [tbl], "bang_cong_viec", tenChuong);
      ghi.push(`đổi mục "${so}." thành "${tieuDeMoi}" (bảng ${cot.length} cột)`);
    } else {
      const khoiNay = conPT(body);
      const ngayKy = khoiNay.find((k) => ten(k) === "p" && RE_NGAY_KY.test(chu(k)));
      const bangKy = [...khoiNay].reverse().find((k) => ten(k) === "tbl" && /NGƯỜI/.test(chu(rows(k)[0] ?? k)));
      const chen = ngayKy ?? bangKy;
      const mauTieuDe = muc[muc.length - 1].p;
      const soTiep = /^[IVX]+\./.test(muc[muc.length - 1].text) ? LA_MA[muc.filter((x) => /^[IVX]+\./.test(x.text)).length] : String.fromCharCode(muc[muc.length - 1].text.charCodeAt(0) + 1);
      const pTieuDe = mauTieuDe.cloneNode(true);
      for (const x of tatCa(pTieuDe, "lastRenderedPageBreak")) x.parentNode.removeChild(x);
      tieuDeMoi = `${soTiep}. ${tenChuong}`;
      datChu(doc, pTieuDe, tieuDeMoi);
      const mauBang = bangKienNghi ?? bangQuyetDinh ?? bangs[bangs.length - 2];
      const tbl = dungBangCongViec(doc, mauBang, cot);
      themCaption(doc, tbl, "bang_cong_viec");
      body.insertBefore(pTieuDe, chen);
      body.insertBefore(tbl, chen);
      boc(doc, [tbl], "bang_cong_viec", tenChuong);
      body.insertBefore(taoPT(doc, "p"), chen); // đoạn trống ngăn cách
      muc.push({ p: pTieuDe, text: tieuDeMoi });
      ghi.push(`thêm mục "${tieuDeMoi}" trước ${ngayKy ? `"${chu(ngayKy)}"` : "khối chữ ký"} (bảng ${cot.length} cột)`);
    }
    bangSinhViec.push({ tag: "bang_cong_viec", nhan: tieuDeMoi });
    bangMoTa.push({ tag: "bang_cong_viec", nhan: tenChuong, cot: cot.map(([tag, nhan]) => ({ tag, nhan })) });
  }

  // 5. Bản 6: BỎ dòng "…, ngày … tháng … năm …" và khối chữ ký — báo cáo đưa lên hệ thống là đã thống nhất, không trình ký
  {
    const bangKy = [...conPT(body)].reverse().find((k) => ten(k) === "tbl" && /NGƯỜI/.test(chu(rows(k)[0] ?? k)));
    if (bangKy) {
      body.removeChild(bangKy);
      ghi.push("bỏ khối chữ ký (bản 6)");
    }
    for (const k of conPT(body)) if (ten(k) === "p" && RE_NGAY_KY.test(chu(k))) (body.removeChild(k), ghi.push("bỏ dòng ngày ký (bản 6)"));
    // Bản 7: dòng "BẢN DEMO — toàn bộ số liệu … giả định" dưới tiêu đề (Form 9 gốc) — Mr. Đại: xoá
    for (const k of tatCa(body, "p")) if (/^\s*B\u1EA2N DEMO/.test(chu(k).normalize("NFC"))) (k.parentNode.removeChild(k), ghi.push('bỏ dòng "BẢN DEMO" (bản 7)'));
  }

  // 5b. Bản 9: mục đánh số La Mã liền mạch I, II, III… (máy đọc mục bỏ qua số đầu dòng — đổi số không đổi cách đọc)
  {
    const doi = new Map();
    muc.forEach((x, i) => {
      const moi = `${LA_MA[i]}. ${boSo(x.text)}`;
      if (moi === x.text) return;
      doi.set(x.text, moi);
      datChu(doc, x.p, moi);
      x.text = moi;
    });
    for (const b of bangSinhViec) if (doi.has(b.nhan)) b.nhan = doi.get(b.nhan);
    if (doi.size) ghi.push(`đánh số La Mã: ${[...doi].map(([a, b]) => `"${a.slice(0, 4)}…" → "${b.slice(0, 5)}…"`).join(", ")} (bản 9)`);
  }

  // 6. TÔ MÀU HƯỚNG DẪN + GHI CHÚ CUỐI MẪU (bản 5 — Mr. Đại chốt 29/09/2026)
  //   ĐỎ = không được sửa (máy đọc theo đúng chữ này) · XANH LÁ = bắt buộc cập nhật mỗi kỳ.
  toMauHuongDan(doc, body, m, muc);
  // 6b. Bản 9: dòng gợi ý cách ghi tên ở mẫu dùng chung — đặt SAU khi tô màu để giữ chữ xám
  goiYBan9(doc, body, m, ghi);
  // 7. Bản 8: tiêu đề mục / dòng chú thích ngay trên bảng không bị bỏ trơ cuối trang (soát PDF 29/09: Form 0, 2, 5, 7)
  giuLienDoanSau(doc, body);

  const moi = new XMLSerializer().serializeToString(doc);
  zip.file("word/document.xml", moi);
  await datThuocTinhMau(zip, m.ma);

  const dinh_nghia = {
    o_nhap: oNhap,
    bang_cong_viec: bangSinhViec,
    muc_bat_buoc: muc.map((x) => boSo(x.text)),
    bang: bangMoTa,
  };
  return { buf: await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }), dinh_nghia, bao_cao: ghi, muc: muc.map((x) => x.text) };
}

/** Xóa cặp ô nhãn + giá trị khỏi một dòng; độ rộng (gridSpan) dồn cho ô liền trước (không có thì ô liền sau) để bảng không lệch lưới. */
function xoaCapO(doc, tr, oNhan, oGiaTri) {
  const span = (tc) => Number(conTen(conTen(tc, "tcPr") ?? tc, "gridSpan")?.getAttributeNS(W, "val") ?? 1) || 1;
  const them = span(oNhan) + span(oGiaTri);
  tr.removeChild(oNhan);
  tr.removeChild(oGiaTri);
  const cs = cells(tr);
  if (!cs.length) return;
  // ô liền trước vị trí đã xóa = ô cuối cùng còn lại đứng trước (các cặp theo thứ tự trái → phải)
  const nhan = cs[cs.length - 1];
  let tcPr = conTen(nhan, "tcPr");
  if (!tcPr) {
    tcPr = taoPT(doc, "tcPr");
    nhan.insertBefore(tcPr, nhan.firstChild);
  }
  const gs = conTen(tcPr, "gridSpan");
  const moi = taoPT(doc, "gridSpan", { val: String(span(nhan) + them) });
  if (gs) tcPr.replaceChild(moi, gs);
  else {
    // gridSpan đứng sau tcW trong tcPr
    const tcW = conTen(tcPr, "tcW");
    tcPr.insertBefore(moi, tcW ? tcW.nextSibling : tcPr.firstChild);
  }
  const w = conTen(tcPr, "tcW");
  if (w) tcPr.removeChild(w); // bỏ độ rộng cố định cũ — Word tự tính theo lưới
}

// ---------------- Giữ tiêu đề liền nội dung (bản 8) ----------------

// Thứ tự phần tử con của w:pPr theo lược đồ OOXML
const THU_TU_PPR = ["pStyle", "keepNext", "keepLines", "pageBreakBefore", "framePr", "widowControl", "numPr", "suppressLineNumbers", "pBdr", "shd", "tabs", "suppressAutoHyphens", "kinsoku", "wordWrap", "overflowPunct", "topLinePunct", "autoSpaceDE", "autoSpaceDN", "bidi", "adjustRightInd", "snapToGrid", "spacing", "ind", "contextualSpacing", "mirrorIndents", "suppressOverlap", "jc", "textDirection", "textAlignment", "textboxTightWrap", "outlineLvl", "divId", "cnfStyle", "rPr", "sectPr", "pPrChange"];

/** Đặt w:keepNext cho đoạn (đúng thứ tự trong pPr). */
function datKeepNext(doc, p) {
  let pPr = conTen(p, "pPr");
  if (!pPr) {
    pPr = taoPT(doc, "pPr");
    p.insertBefore(pPr, p.firstChild);
  }
  if (conTen(pPr, "keepNext")) return;
  const viTri = THU_TU_PPR.indexOf("keepNext");
  const sau = conPT(pPr).find((c) => THU_TU_PPR.indexOf(ten(c)) > viTri);
  pPr.insertBefore(taoPT(doc, "keepNext"), sau ?? null);
}

/** Tiêu đề mục + đoạn chú thích ngắn đứng ngay trên bảng: giữ liền đoạn/bảng sau (Word tự đẩy sang trang mới cùng nội dung). */
function giuLienDoanSau(doc, body) {
  const ks = conPT(body);
  for (let i = 0; i < ks.length - 1; i++) {
    const k = ks[i];
    if (ten(k) !== "p") continue;
    const t = chu(k).trim();
    if (!t) continue;
    const sau = ks.slice(i + 1).find((x) => ten(x) !== "p" || chu(x).trim());
    if (laTieuDe(k) || (t.length <= 140 && sau && ten(sau) === "tbl")) datKeepNext(doc, k);
  }
}

// ---------------- Tô màu hướng dẫn (bản 5) ----------------

export const MAU_DO = "C00000";
export const MAU_XANH_LA = "00B050";
// Thứ tự phần tử con của w:rPr theo lược đồ OOXML — chèn sai thứ tự Word có thể báo file lỗi
const THU_TU_RPR = ["rStyle", "rFonts", "b", "bCs", "i", "iCs", "caps", "smallCaps", "strike", "dstrike", "outline", "shadow", "emboss", "imprint", "noProof", "snapToGrid", "vanish", "webHidden", "color", "spacing", "w", "kern", "position", "sz", "szCs", "highlight", "u", "effect", "bdr", "shd", "fitText", "vertAlign", "rtl", "cs", "em", "lang", "eastAsianLayout", "specVanish", "oMath"];

/** Đặt một thuộc tính chữ (color / i / iCs) cho run, đúng thứ tự trong rPr. */
function datRPr(doc, r, tenPT, attrs = {}) {
  let rPr = conTen(r, "rPr");
  if (!rPr) {
    rPr = taoPT(doc, "rPr");
    r.insertBefore(rPr, r.firstChild);
  }
  const cu = conTen(rPr, tenPT);
  if (cu) rPr.removeChild(cu);
  const moi = taoPT(doc, tenPT, attrs);
  const viTri = THU_TU_RPR.indexOf(tenPT);
  const sau = conPT(rPr).find((c) => THU_TU_RPR.indexOf(ten(c)) > viTri);
  rPr.insertBefore(moi, sau ?? null);
}

/** Tô màu mọi run trong một nút (và dấu đoạn, để chữ gõ thêm cũng cùng màu). */
function toMau(doc, n, mau) {
  if (!n) return;
  for (const r of tatCa(n, "r")) datRPr(doc, r, "color", { val: mau });
  for (const p of ten(n) === "p" ? [n] : tatCa(n, "p")) {
    let pPr = conTen(p, "pPr");
    if (!pPr) {
      pPr = taoPT(doc, "pPr");
      p.insertBefore(pPr, p.firstChild);
    }
    // Dấu đoạn: w:pPr/w:rPr (phần tử cuối của pPr — trước sectPr / pPrChange, mẫu không có)
    if (!conTen(pPr, "rPr")) pPr.appendChild(taoPT(doc, "rPr"));
    datRPr(doc, pPr, "color", { val: mau });
  }
}

// Thứ tự con của w:tcPr theo lược đồ: shd đứng sau tcBorders, trước noWrap/tcMar/…
const SAU_SHD = ["noWrap", "tcMar", "textDirection", "tcFitText", "vAlign", "hideMark"];
function datNenO(doc, tc, fill) {
  let tcPr = conTen(tc, "tcPr");
  if (!tcPr) {
    tcPr = taoPT(doc, "tcPr");
    tc.insertBefore(tcPr, tc.firstChild);
  }
  const cu = conTen(tcPr, "shd");
  const moi = taoPT(doc, "shd", { val: "clear", color: "auto", fill });
  if (cu) tcPr.replaceChild(moi, cu);
  else tcPr.insertBefore(moi, conPT(tcPr).find((c) => SAU_SHD.includes(ten(c))) ?? null);
}

function toMauHuongDan(doc, body, m, muc) {
  const theo = sdtTheoTag(doc);
  const sdt = (tag) => theo.get(tag) ?? [];
  const dungChung = MAU_DUNG_CHUNG.includes(m.ma);
  // Ô gắn mã nằm trong một ô bảng: ô bên trái là nhãn ("Người lập:") — nhãn là chữ không được sửa
  const oNhanTrai = (s) => {
    let tc = s.parentNode;
    while (tc && ten(tc) !== "tc") tc = tc.parentNode;
    let t = tc?.previousSibling;
    while (t && ten(t) !== "tc") t = t.previousSibling;
    return t;
  };
  // ĐỎ: khung tiêu đề (tên báo cáo + đơn vị), tên các mục, dòng tiêu đề cột bảng việc, nhãn các ô
  for (const [tag, ds] of theo) if (tag.startsWith("mau_ma")) ds.forEach((x) => toMau(doc, x, MAU_DO));
  for (const x of muc) toMau(doc, x.p, MAU_DO);
  for (const x of sdt("bang_cong_viec")) {
    const tbl = tatCa(x, "tbl")[0];
    if (!tbl) continue;
    // Nền tiêu đề cột đang xanh đậm (chữ trắng) — chữ đỏ trên nền đó không đọc được: đổi nền hồng nhạt
    for (const tc of cells(rows(tbl)[0])) datNenO(doc, tc, "FCE4E4");
    toMau(doc, rows(tbl)[0], MAU_DO);
  }
  // Mẫu dùng chung mà tên công ty góc trái do đơn vị tự ghi (bản 9: Form 8, 10 — Form 7 là công ty SCI cố định)
  if (CONG_TY_TU_GHI.includes(m.ma) && ten(conPT(body).find((k) => ten(k) === "tbl") ?? {}) === "tbl") {
    const o0 = cells(rows(conPT(body).find((k) => ten(k) === "tbl"))[0])[0];
    const p0 = tatCa(o0, "p").find((p) => chu(p).trim() && !/^g[ửu]i\s*:/i.test(chu(p).trim()));
    if (p0) toMau(doc, p0, MAU_XANH_LA);
  }
  const CAP_NHAT = ["ky_bao_cao", ...O_THONG_TIN_DU_AN.map((d) => d[1])];
  for (const tag of CAP_NHAT) for (const x of sdt(tag)) toMau(doc, oNhanTrai(x), MAU_DO);
  // XANH LÁ: ô phải cập nhật mỗi kỳ; dòng ngày ký; tên đơn vị ở mẫu dùng chung (người nộp ghi tên đơn vị mình)
  for (const tag of CAP_NHAT) for (const x of sdt(tag)) toMau(doc, x, MAU_XANH_LA);
  // Tên đơn vị: mẫu dùng chung → xanh lá (ghi tên đơn vị mình); mẫu riêng → đỏ (Form 9: dòng này nằm ngoài khung tiêu đề)
  for (const x of sdt("don_vi_lap")) toMau(doc, x, dungChung ? MAU_XANH_LA : MAU_DO);
  // Bản 9: nơi nhận do đơn vị tự ghi (Form 10 — BĐH ở Quảng Trị gửi BQLDA QT, ở Lào gửi BQLDA Lào) → xanh lá
  if (DAU_BAN_9[m.ma]?.gui === "......") for (const x of sdt("gui_den")) toMau(doc, x, MAU_XANH_LA);

  // GHI CHÚ cuối mẫu: in nghiêng, không đậm, không đánh số (máy không nhầm là tiêu đề mục). Bản 9 (Mr. Đại 01/10): dòng nói về
  // chữ ĐỎ in màu đỏ, dòng nói về chữ XANH LÁ in màu xanh lá, các dòng còn lại màu đen — màu chữ khớp đúng điều nó nói.
  const chuong = m.loai_ky === "thang" ? "KẾT QUẢ VÀ KẾ HOẠCH VIỆC THÁNG TỚI" : "KẾT QUẢ VÀ KẾ HOẠCH VIỆC TUẦN TỚI";
  const dau9 = DAU_BAN_9[m.ma] ?? {};
  const dong = [
    ["Ghi chú cho người lập báo cáo (đọc kỹ trước khi điền; không cần xóa dòng này, hệ thống không đọc):", null],
    [`• Chữ màu ĐỎ — ${dungChung ? "tiêu đề báo cáo" : "tên đơn vị, tiêu đề báo cáo"}, tên các mục, tiêu đề cột bảng "${chuong}", nhãn "Kỳ báo cáo": KHÔNG sửa, không xóa, không đổi thứ tự. Hệ thống đọc báo cáo theo đúng chữ này; sửa sai thì báo cáo bị chặn, không gửi được.`, MAU_DO],
    [
      (m.loai_ky === "thang"
        ? "• Chữ màu XANH LÁ — kỳ báo cáo (số tháng/năm)"
        : "• Chữ màu XANH LÁ — kỳ báo cáo (số tuần/năm và từ ngày – đến ngày; hai chỗ phải khớp nhau, lệch thì báo cáo bị chặn)") +
        (m.ma === "form-7" || m.ma === "form-10" ? ", thông tin dự án (tình trạng, tiến độ lũy kế…)" : "") +
        ": BẮT BUỘC cập nhật mỗi kỳ. Để nguyên của kỳ trước thì hệ thống hiểu là báo cáo của kỳ cũ — ghi đè lên báo cáo đã nộp kỳ đó, còn kỳ này vẫn bị tính là chưa nộp.",
      MAU_XANH_LA,
    ],
    ["• Không cần ghi người lập, ngày lập, không cần ký: hệ thống tự ghi người nộp và ngày nộp. Chỉ người thuộc đơn vị (đơn vị chính hoặc kiêm nhiệm) mới nộp được báo cáo của đơn vị đó.", null],
    ...(dungChung
      ? [[
          `• Tên đơn vị (dòng ngay dưới "BÁO CÁO TUẦN"${CONG_TY_TU_GHI.includes(m.ma) ? ", tên công ty góc trái" : ""}, chữ xanh lá): ghi ĐÚNG tên đơn vị nộp báo cáo, vd "${dau9.vd_don_vi ?? "NM Hướng Linh 7"}". Mẫu này nhiều đơn vị dùng chung — hệ thống xếp báo cáo vào đơn vị theo dòng dưới "BÁO CÁO TUẦN"; người không thuộc đơn vị đó sẽ bị chặn.` +
            (dau9.gui === "......" ? ' Dòng "Gửi:" ghi Ban QLDA nhận báo cáo, vd "BQLDA Quảng Trị" hoặc "BQLDA Lào".' : ""),
          MAU_XANH_LA,
        ]]
      : []),
    [`• Bảng "${chuong}": mỗi dòng MỘT việc; cột Kết thúc ghi ngày dd/mm/yyyy hoặc "N ngày sau khi xong <tên việc>". Chỉ việc trong bảng này vào sổ cái — việc viết ở mục khác không tự thành việc.`, null],
    ["• Không xóa ô, không chép bảng từ file khác đè vào; cần thêm dòng thì chèn dòng ngay trong bảng.", null],
  ];
  const sect = conPT(body).find((k) => ten(k) === "sectPr");
  body.insertBefore(taoPT(doc, "p"), sect ?? null);
  // Phông ghi chú = phông chữ thân báo cáo (bản 8 — file gốc Form 3–8, 10 có phông mặc định Times New Roman: ghi chú hiện chữ có chân)
  const demPhong = new Map();
  for (const f of tatCa(body, "rFonts")) {
    const a = f.getAttributeNS(W, "ascii");
    if (a) demPhong.set(a, (demPhong.get(a) ?? 0) + 1);
  }
  // Phông dùng nhiều nhất trong thân báo cáo — chỉ khi file ghi phông trên từng đoạn (≥ 20 lần); ít hơn thì chữ theo phông
  // mặc định của file (Form 0–2: vài chỗ Times/Arial chỉ là ký hiệu lẻ, đo 29/09)
  const [phong, soLan] = [...demPhong.entries()].sort((x, y) => y[1] - x[1])[0] ?? [];
  const datPhong = soLan >= 20 ? phong : null;
  for (const [i, [t, mau]] of dong.entries()) {
    const p = taoPT(doc, "p");
    const r = taoPT(doc, "r");
    const w = taoPT(doc, "t");
    w.setAttribute("xml:space", "preserve");
    w.appendChild(doc.createTextNode(t));
    r.appendChild(w);
    p.appendChild(r);
    datRPr(doc, r, "i");
    datRPr(doc, r, "iCs");
    datRPr(doc, r, "color", { val: mau ?? "000000" });
    datRPr(doc, r, "sz", { val: "18" });
    if (datPhong) datRPr(doc, r, "rFonts", { ascii: datPhong, hAnsi: datPhong, cs: datPhong, eastAsia: datPhong });
    if (i < dong.length - 1) datKeepNext(doc, p); // cả khối ghi chú nằm chung một trang
    body.insertBefore(p, sect ?? null);
  }
}

// ---------------- Bản 9: đầu trang một khuôn · ô kỳ một loại · gợi ý ghi tên ----------------

/** Đoạn một run: kieu = { b, i, mau, co (nửa điểm), jc, phong, truoc, sau } */
function taoDoan(doc, text, kieu = {}) {
  const p = taoPT(doc, "p");
  const pPr = taoPT(doc, "pPr");
  pPr.appendChild(taoPT(doc, "spacing", { before: kieu.truoc ?? 0, after: kieu.sau ?? 0, line: 280, lineRule: "auto" }));
  if (kieu.jc) pPr.appendChild(taoPT(doc, "jc", { val: kieu.jc }));
  p.appendChild(pPr);
  const r = taoPT(doc, "r");
  const t = taoPT(doc, "t");
  t.setAttribute("xml:space", "preserve");
  t.textContent = text;
  r.appendChild(t);
  p.appendChild(r);
  if (kieu.phong) datRPr(doc, r, "rFonts", { ascii: kieu.phong, hAnsi: kieu.phong, cs: kieu.phong, eastAsia: kieu.phong });
  if (kieu.b) (datRPr(doc, r, "b"), datRPr(doc, r, "bCs"));
  if (kieu.i) (datRPr(doc, r, "i"), datRPr(doc, r, "iCs"));
  if (kieu.mau) datRPr(doc, r, "color", { val: kieu.mau });
  if (kieu.co) (datRPr(doc, r, "sz", { val: kieu.co }), datRPr(doc, r, "szCs", { val: kieu.co }));
  return p;
}

/**
 * Đầu trang bản 9 (Mr. Đại 01/10): trái = công ty + "Gửi: <nơi nhận>" (thay dòng địa chỉ); phải = tiêu đề + tên đơn vị.
 * Form 9 (tiêu đề là 3 đoạn văn giữa trang) → dựng khung 2 cột cùng kích thước, màu chữ như Form 1.
 */
function khungDauBan9(doc, body, m, ghi) {
  const sp = DAU_BAN_9[m.ma];
  if (!sp) return;
  if (m.dau_doan) {
    const ps = conPT(body).filter((k) => ten(k) === "p" && chu(k).trim()).slice(0, 3); // công ty · BÁO CÁO … · tên đơn vị
    if (ps.length < 3 || !/^BÁO CÁO/i.test(chu(ps[1]).trim())) throw new Error(`${m.ma}: không thấy 3 dòng tiêu đề đầu trang`);
    const phong = tatCa(ps[0], "rFonts")[0]?.getAttributeNS(W, "ascii") || undefined;
    const tenDv = chu(ps[2]).trim();
    const tbl = taoPT(doc, "tbl");
    const tblPr = taoPT(doc, "tblPr");
    tblPr.appendChild(taoPT(doc, "tblW", { w: 10206, type: "dxa" }));
    const vien = taoPT(doc, "tblBorders");
    for (const c of ["top", "left", "bottom", "right", "insideH", "insideV"]) vien.appendChild(taoPT(doc, c, { val: "single", sz: 4, space: 0, color: "auto" }));
    tblPr.appendChild(vien);
    const le = taoPT(doc, "tblCellMar");
    le.appendChild(taoPT(doc, "left", { w: 10, type: "dxa" }));
    le.appendChild(taoPT(doc, "right", { w: 10, type: "dxa" }));
    tblPr.appendChild(le);
    tbl.appendChild(tblPr);
    const grid = taoPT(doc, "tblGrid");
    grid.appendChild(taoPT(doc, "gridCol", { w: 6080 }));
    grid.appendChild(taoPT(doc, "gridCol", { w: 4126 }));
    tbl.appendChild(grid);
    const tr = taoPT(doc, "tr");
    const o = (rong, doan) => {
      const tc = taoPT(doc, "tc");
      const tcPr = taoPT(doc, "tcPr");
      tcPr.appendChild(taoPT(doc, "tcW", { w: rong, type: "dxa" }));
      tc.appendChild(tcPr);
      for (const p of doan) tc.appendChild(p);
      return tc;
    };
    tr.appendChild(o(6080, [
      taoDoan(doc, sp.cong_ty, { b: true, mau: "003366", co: 26, truoc: 80, sau: 20, phong }),
      taoDoan(doc, `Gửi: ${sp.gui}`, { mau: "6B7A8D", co: 17, sau: 80, phong }),
    ]));
    tr.appendChild(o(4126, [
      taoDoan(doc, sp.tieu_de, { b: true, mau: "003366", co: 26, truoc: 80, sau: 20, jc: "right", phong }),
      taoDoan(doc, tenDv, { b: true, mau: "1F5FA0", co: 20, sau: 80, jc: "right", phong }),
    ]));
    tbl.appendChild(tr);
    body.insertBefore(tbl, ps[0]);
    body.insertBefore(taoPT(doc, "p"), ps[0]); // đoạn trống ngăn khung tiêu đề với bảng kỳ (hai bảng liền nhau Word gộp làm một)
    for (const p of ps) body.removeChild(p);
    ghi.push(`dựng khung đầu trang 2 cột: "${sp.cong_ty} · Gửi: ${sp.gui}" | "${sp.tieu_de} · ${tenDv}" (bản 9)`);
    return;
  }
  const tbl = conPT(body).find((k) => ten(k) === "tbl");
  const [trai, phai] = cells(rows(tbl)[0]);
  const pt = tatCa(trai, "p").filter((p) => chu(p).trim());
  const pp = tatCa(phai, "p").filter((p) => chu(p).trim());
  if (sp.cong_ty) datChu(doc, pt[0], sp.cong_ty);
  // dòng 2 bên trái: "Gửi: …" (mẫu đơn vị) hoặc dòng địa chỉ "Tầng 3, Tháp C…" (mẫu phòng) → "Gửi: <nơi nhận>"
  const pGui = pt.find((p) => /^g[ửu]i\s*:/i.test(chu(p).trim())) ?? pt[1];
  if (!pGui) throw new Error(`${m.ma}: khung đầu trang thiếu dòng thứ hai bên trái`);
  datChu(doc, pGui, `Gửi: ${sp.gui}`);
  const pTd = pp.find((p) => /^BÁO CÁO/i.test(chu(p).trim()));
  if (!pTd) throw new Error(`${m.ma}: không thấy tiêu đề "BÁO CÁO …"`);
  datChu(doc, pTd, sp.tieu_de);
  ghi.push(`đầu trang: "${chu(pt[0])} · Gửi: ${sp.gui}" | "${sp.tieu_de}" (bản 9)`);
}

/**
 * Ô kỳ báo cáo bản 9: chỉ một loại kỳ theo mẫu (tuần: bỏ dòng Tháng; tháng: bỏ dòng Tuần), bỏ hộp ☐/☒ đầu dòng
 * (chỉ còn một kỳ thì không có gì để tích). "(từ A đến B)" → "(A – B)" như các mẫu khác.
 */
function gonKyBan9(doc, tc, m, ghi) {
  for (const p of tatCa(tc, "p")) {
    const t = chu(p);
    if (!t.trim()) continue;
    const coTuan = /tu[aầ]n/i.test(t);
    const coThang = /th[aá]ng/i.test(t);
    if ((m.loai_ky === "thang" && coTuan && !coThang) || (m.loai_ky !== "thang" && coThang && !coTuan)) {
      p.parentNode.removeChild(p);
      ghi.push(`ô kỳ: bỏ dòng "${t.trim()}" (bản 9)`);
      continue;
    }
    let dau = true;
    for (const w of tatCa(p, "t")) {
      if (dau) w.textContent = w.textContent.replace(/^[\s☐☒]+/, "");
      if (w.textContent) dau = false;
      w.textContent = w.textContent.replace(/\(\s*từ\s+([^)]*?)\s+đến\s+([^)]*?)\s*\)/i, "($1 – $2)");
      // Form 6 gốc tích nhầm ví dụ "Tuần 29" cho báo cáo tháng → bản có ví dụ ghi tháng 07 (cùng kỳ ví dụ tuần 29)
      if (m.loai_ky === "thang") w.textContent = w.textContent.replace(/\.{3,}\s*\/\s*(\d{4})/, "07/$1");
    }
    // Ví dụ gốc ghi tuần lệch một ngày ("Tuần 29/2026 (14/07 – 20/07/2026)" = thứ Ba → thứ Hai) — máy nay kiểm khớp số tuần,
    // bản có ví dụ ghi đúng tuần ISO (thứ Hai → Chủ nhật) để không tự chặn mình
    const kt = /Tuần\s+(\d{1,2})\s*\/\s*(\d{4})/.exec(chu(p));
    if (kt) {
      const [tu, den] = tuanIso(Number(kt[1]), Number(kt[2]));
      for (const w of tatCa(p, "t")) w.textContent = w.textContent.replace(/\(\s*\d{1,2}\/\d{1,2}(?:\/\d{4})?\s*[–-]\s*\d{1,2}\/\d{1,2}\/\d{4}\s*\)/, `(${tu} – ${den})`);
    }
  }
}

/** Tuần ISO số `so` năm `nam` → ["dd/mm/yyyy" thứ Hai, "dd/mm/yyyy" Chủ nhật] (tuần 1 chứa ngày 04/01) */
export function tuanIso(so, nam) {
  const j4 = Date.UTC(nam, 0, 4);
  const thu = (new Date(j4).getUTCDay() + 6) % 7;
  const tu = j4 - thu * 864e5 + (so - 1) * 7 * 864e5;
  const vn = (t) => new Date(t).toISOString().slice(0, 10).split("-").reverse().join("/");
  return [vn(tu), vn(tu + 6 * 864e5)];
}

/** Dòng chữ xám nhỏ hướng dẫn cách ghi tên ở mẫu dùng chung (máy không đọc — nằm ngoài ô gắn mã). */
function goiYBan9(doc, body, m, ghi) {
  const sp = DAU_BAN_9[m.ma];
  if (!sp) return;
  const kieu = { i: true, mau: "808080", co: 15, sau: 40 };
  if (sp.goi_y_don_vi) {
    const s = sdtTheoTag(doc).get("don_vi_lap")?.[0];
    if (!s) throw new Error(`${m.ma}: không thấy ô "Đơn vị lập" để đặt gợi ý`);
    s.parentNode.insertBefore(taoDoan(doc, sp.goi_y_don_vi, { ...kieu, jc: "right" }), s.nextSibling);
    ghi.push(`gợi ý tên đơn vị: "${sp.goi_y_don_vi}" (bản 9)`);
  }
  if (sp.goi_y_cong_ty) {
    const tbl = conPT(body).find((k) => ten(k) === "tbl");
    const trai = cells(rows(tbl)[0])[0];
    trai.appendChild(taoDoan(doc, sp.goi_y_cong_ty, kieu));
    ghi.push(`gợi ý công ty: "${sp.goi_y_cong_ty}" (bản 9)`);
  }
}

/** Thuộc tính tài liệu tùy chỉnh SCI_MauMa (docProps/custom.xml) — nguồn nhận mẫu thứ hai. */
export async function datThuocTinhMau(zip, ma) {
  const FMTID = "{D5CDD505-2E9C-101B-9397-08002B2CF9AE}";
  let custom = zip.file("docProps/custom.xml") ? await zip.file("docProps/custom.xml").async("string") : null;
  if (!custom) {
    custom = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"></Properties>`;
    let ct = await zip.file("[Content_Types].xml").async("string");
    if (!ct.includes("/docProps/custom.xml")) {
      ct = ct.replace("</Types>", `<Override PartName="/docProps/custom.xml" ContentType="application/vnd.openxmlformats-officedocument.custom-properties+xml"/></Types>`);
      zip.file("[Content_Types].xml", ct);
    }
    let rels = await zip.file("_rels/.rels").async("string");
    if (!rels.includes("docProps/custom.xml")) {
      rels = rels.replace("</Relationships>", `<Relationship Id="rIdSciMau" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties" Target="docProps/custom.xml"/></Relationships>`);
      zip.file("_rels/.rels", rels);
    }
  }
  custom = custom.replace(/<property [^>]*name="SCI_MauMa"[^>]*>[\s\S]*?<\/property>/, "");
  const pids = Array.from(custom.matchAll(/pid="(\d+)"/g)).map((x) => Number(x[1]));
  const pid = Math.max(1, ...pids) + 1;
  custom = custom.replace("</Properties>", `<property fmtid="${FMTID}" pid="${pid}" name="SCI_MauMa"><vt:lpwstr>${ma}</vt:lpwstr></property></Properties>`);
  zip.file("docProps/custom.xml", custom);
}

// ---------------- Điền báo cáo từ mẫu đã chuyển (cho ví dụ, test) ----------------

function sdtTheoTag(doc) {
  const m = new Map();
  for (const s of tatCa(doc, "sdt")) {
    const pr = conTen(s, "sdtPr");
    const tg = pr && conTen(pr, "tag");
    if (!tg) continue;
    const t = tg.getAttributeNS(W, "val") || tg.getAttribute("w:val");
    if (!m.has(t)) m.set(t, []);
    m.get(t).push(s);
  }
  return m;
}

/** Đặt chữ cho một sdt: khối → mỗi dòng một đoạn (theo đoạn đầu); trong dòng → một run. */
export function datSdt(doc, sdt, text) {
  const pr = conTen(sdt, "sdtPr");
  const giuCho = pr && conTen(pr, "showingPlcHdr");
  if (giuCho) {
    if (!String(text ?? "")) return; // ô chọn chưa chọn: giữ chữ giữ chỗ
    pr.removeChild(giuCho);
  }
  const nd = conTen(sdt, "sdtContent");
  const ps = conPT(nd).filter((c) => ten(c) === "p");
  if (ps.length) {
    const mau = ps[0];
    for (const p of ps.slice(1)) nd.removeChild(p);
    const dong = String(text ?? "").split("\n");
    datChu(doc, mau, dong[0]);
    let sau = mau;
    for (const d of dong.slice(1)) {
      const p = mau.cloneNode(true);
      datChu(doc, p, d);
      nd.insertBefore(p, sau.nextSibling);
      sau = p;
    }
    return;
  }
  const runs = conPT(nd).filter((c) => ten(c) === "r");
  const r0 = runs[0];
  for (const r of runs.slice(1)) nd.removeChild(r);
  const t = conTen(r0, "t") ?? r0.appendChild(taoPT(doc, "t"));
  t.textContent = String(text ?? "");
  t.setAttribute("xml:space", "preserve");
}

/** Kỳ báo cáo: {chon:'tuan'|'thang', tuan:'29/2026   (14/07/2026 – 20/07/2026)', thang:'07/2026'} — giữ hộp tích. */
function datKy(doc, sdt, v) {
  for (const s of tatCa(sdt, "sdt")) {
    const tg = conTen(conTen(s, "sdtPr"), "tag")?.getAttributeNS(W, "val") ?? "";
    const m = /^ky_chon_(\w+)$/.exec(tg);
    if (!m) continue;
    const bat = v.chon === m[1];
    const ck = s.getElementsByTagNameNS(W14, "checked")[0];
    if (ck) ck.setAttributeNS(W14, "w14:val", bat ? "1" : "0");
    const t = tatCa(s, "t")[0];
    if (t) t.textContent = bat ? "☒" : "☐";
  }
  for (const p of tatCa(sdt, "p")) {
    const runs = conPT(p).filter((c) => ten(c) === "r");
    const t = chu(p);
    const loai = /tháng/i.test(t) ? "thang" : /quý/i.test(t) ? "quy" : "tuan";
    if (v[loai] === undefined || !runs.length) continue;
    const nhan = loai === "thang" ? "Tháng" : loai === "quy" ? "Quý" : "Tuần";
    const r0 = runs[0];
    for (const r of runs.slice(1)) p.removeChild(r);
    const tt = conTen(r0, "t");
    // Bản 9 bỏ hộp tích: không còn ký tự ☐ đứng trước nên không chèn dấu cách đầu dòng
    const coHop = tatCa(p, "sdt").length > 0;
    tt.textContent = `${coHop ? " " : ""}${nhan} ${v[loai]}`;
    tt.setAttribute("xml:space", "preserve");
  }
}

function boBocSdt(sdt) {
  const nd = conTen(sdt, "sdtContent");
  const cha = sdt.parentNode;
  for (const c of conPT(nd)) cha.insertBefore(c, sdt);
  cha.removeChild(sdt);
}

/**
 * Điền báo cáo từ mẫu đã chuyển. g = {
 *   o: {tag: chữ} (ky_bao_cao: {chon, tuan, thang}),
 *   bang: {tag: [{cot: chữ}]}      — thay toàn bộ dòng dữ liệu,
 *   bang_them: {tag: [{cot: chữ}]} — thêm dòng vào cuối,
 *   thay: [[chữ cũ (nguyên một w:t), chữ mới]],
 *   bo_muc: [tiêu đề mục (không số)] — xóa tiêu đề + nội dung tới mục sau,
 *   bo_o: [tag] — gỡ ô gắn mã (mô phỏng người dùng xóa mất ô nhập)
 * }
 */
export async function dienBaoCao(bufMau, g = {}) {
  const zip = await JSZip.loadAsync(bufMau);
  const doc = new DOMParser().parseFromString(await zip.file("word/document.xml").async("string"), "text/xml");
  let theoTag = sdtTheoTag(doc);
  for (const [tag, v] of Object.entries(g.o ?? {})) {
    for (const s of theoTag.get(tag) ?? []) {
      if (tag === "ky_bao_cao" && typeof v === "object") datKy(doc, s, v);
      else datSdt(doc, s, v);
    }
  }
  const dienBang = (tag, dongs, them) => {
    const s = (theoTag.get(tag) ?? [])[0];
    if (!s) throw new Error(`Mẫu không có bảng ${tag}`);
    const tbl = tatCa(s, "tbl")[0];
    const duLieu = rows(tbl).filter((tr) => tr.getElementsByTagNameNS(W, "sdt").length > 0);
    const mau = duLieu[duLieu.length - 1];
    if (!them) for (const tr of duLieu) tbl.removeChild(tr);
    for (const d of dongs) {
      const tr = mau.cloneNode(true);
      for (const o of tatCa(tr, "sdt")) {
        const tg = conTen(conTen(o, "sdtPr"), "tag").getAttributeNS(W, "val");
        datSdt(doc, o, d[tg] ?? "");
      }
      tbl.appendChild(tr);
    }
  };
  for (const [tag, dongs] of Object.entries(g.bang ?? {})) dienBang(tag, dongs, false);
  for (const [tag, dongs] of Object.entries(g.bang_them ?? {})) dienBang(tag, dongs, true);
  for (const [cu, moi] of g.thay ?? []) {
    let n = 0;
    for (const t of tatCa(doc, "t")) if (t.textContent === cu) (t.textContent = moi), n++;
    if (!n) throw new Error(`Không thấy "${cu}" để thay`);
  }
  const body = doc.getElementsByTagNameNS(W, "body")[0];
  for (const mucBo of g.bo_muc ?? []) {
    const ks = conPT(body);
    const i = ks.findIndex((k) => ten(k) === "p" && laTieuDe(k) && boSo(chu(k)) === mucBo);
    if (i < 0) throw new Error(`Không thấy mục "${mucBo}"`);
    let j = i + 1;
    while (j < ks.length && !(ten(ks[j]) === "p" && (laTieuDe(ks[j]) || RE_NGAY_KY.test(chu(ks[j]))))) j++;
    for (const k of ks.slice(i, j)) body.removeChild(k);
  }
  theoTag = sdtTheoTag(doc);
  for (const tag of g.bo_o ?? []) for (const s of theoTag.get(tag) ?? []) boBocSdt(s);
  zip.file("word/document.xml", new XMLSerializer().serializeToString(doc));
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

// ---------------- Chạy ----------------

export async function chuyenTatCa(thuMuc = GOC) {
  const dn = [];
  const bao = [];
  const cu = JSON.parse(fs.readFileSync(path.join(thuMuc, "dinh-nghia.json"), "utf8"));
  for (const m of MAU_THAT) {
    if (m.sua_tay) {
      // mẫu sửa tay (20/10/2026): giữ nguyên tệp + định nghĩa đang có
      dn.push(cu.find((x) => x.ma === m.ma));
      bao.push(`${m.ma}: sửa tay — giữ nguyên`);
      continue;
    }
    const goc = fs.readFileSync(path.join(thuMuc, "goc", m.tep));
    const kq = await chuyenMau(goc, m);
    fs.writeFileSync(path.join(thuMuc, `${m.ma}.docx`), kq.buf);
    dn.push({
      ma: m.ma,
      ten: m.ten,
      don_vi_lap: m.don_vi_lap,
      gui_den_mac_dinh: m.gui_den_mac_dinh,
      loai_ky: m.loai_ky,
      tep: `${m.ma}.docx`,
      tep_goc: `goc/${m.tep}`,
      phien_ban: PHIEN_BAN_MAU,
      dinh_nghia: kq.dinh_nghia,
    });
    bao.push(`${m.ma}: ${kq.muc.join(" | ")}\n   ${kq.bao_cao.join("\n   ")}\n   ô: ${kq.dinh_nghia.o_nhap.map((o) => o.tag).join(", ")}\n   bảng: ${kq.dinh_nghia.bang.map((b) => `${b.tag}(${b.cot.map((c) => c.tag).join(",")})`).join(" ")}`);
  }
  // mẫu chỉ có ở dinh-nghia.json (Form 11) giữ nguyên ở cuối
  for (const x of cu) if (!dn.some((y) => y.ma === x.ma)) dn.push(x);
  fs.writeFileSync(path.join(thuMuc, "dinh-nghia.json"), JSON.stringify(dn, null, 2) + "\n");
  return bao;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  chuyenTatCa().then((b) => console.log(b.join("\n")));
}
