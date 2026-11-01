// ============================================================
// kiem-tra/doc-word.ts — ĐỌC Ô NHẬP GẮN MÃ trong file Word (w:sdt + w:tag) bằng JSZip + @xmldom/xmldom.
// Chủ module: kiem-tra (giai đoạn 3). Chữ ký là hợp đồng — module ai dùng để đọc báo cáo.
//
// Chịu được Word lưu lại: chữ bị tách thành nhiều run (rsid, proofErr, bookmark), ô nằm trong
// customXml/smartTag, dòng bảng bọc trong "repeating section", bản sửa có theo dõi (bỏ w:del).
// Bảng gắn mã: w:sdt có tag bắt đầu "bang_" bọc w:tbl, hoặc w:tblCaption = tag bảng.
// Mỗi ô trong dòng là một content control có tag = tên cột; dòng thêm tay không có ô gắn mã
// thì lấy cột theo vị trí đã học từ các dòng khác. Bảng số liệu có dòng nhóm: ô đầu dòng nhóm gắn tag "nhom",
// dòng nhóm không thành dòng dữ liệu, tên nhóm ghi vào cột "nhom" của các dòng thuộc nhóm.
// ============================================================

import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";

export interface NoiDungWord {
  mau_ma: string | null; // đọc từ ô gắn mã 'mau_ma' — null = không nhận ra mẫu
  o_nhap: Record<string, string>; // tag → giá trị chữ
  bang: Record<string, Record<string, string>[]>; // tag bảng → các dòng (tag cột → giá trị)
  tieu_de: string[]; // các tiêu đề mục còn trong file
  van_ban: string; // toàn bộ chữ thuần (cho AI tóm tắt)
  /** Các mục theo tiêu đề, chữ thuần NGOÀI ô gắn mã (cho góp ý nội dung: mục trống, còn "......") */
  muc?: { tieu_de: string; van_ban: string }[];
  /** Dòng TÊN NHÓM trong bảng việc (chỉ ô đầu có chữ, vd "SCI QUẢNG TRỊ", "KHÁC") — không thành dòng dữ liệu (10/10/2026). tag bảng → tên nhóm */
  dong_nhom?: Record<string, string[]>;
  /** Chỉ báo cáo Excel (mau-excel/doc-excel.ts): điều máy thấy lúc đọc tệp — bộ kiểm ghi thành cảnh báo / lỗi chặn */
  canh_bao_doc?: string[];
  chan_doc?: string[];
}

export type Nut = {
  nodeType: number;
  localName?: string | null;
  nodeName: string;
  childNodes: ArrayLike<Nut>;
  getAttribute?: (n: string) => string | null;
  textContent?: string | null;
};

const PHAN_TU = 1;

export function ten(n: Nut): string {
  return (n.localName || n.nodeName.replace(/^.*:/, "")) as string;
}

export function con(n: Nut): Nut[] {
  const kq: Nut[] = [];
  for (let i = 0; i < n.childNodes.length; i++) {
    const c = n.childNodes[i];
    if (c.nodeType === PHAN_TU) kq.push(c);
  }
  return kq;
}

export function conTen(n: Nut, t: string): Nut | undefined {
  return con(n).find((c) => ten(c) === t);
}

export function thuocTinh(n: Nut | undefined, t: string): string | null {
  if (!n?.getAttribute) return null;
  return n.getAttribute("w:" + t) ?? n.getAttribute(t);
}

/** Các phần tử bỏ qua khi lấy chữ: bản xóa có theo dõi, mã trường, phần dự phòng của AlternateContent. */
const BO_QUA = new Set(["del", "delText", "instrText", "Fallback", "rPr", "pPr", "sdtPr", "tblPr", "trPr", "tcPr", "sectPr", "commentReference"]);

/** Lấy chữ của một nút: w:t nối liền (bất kể tách run), tab → \t, br → \n, mỗi đoạn một dòng. */
/**
 * Chữ thuần của một nút. `dsWord`: đoạn là mục danh sách của Word (numPr — số / dấu đầu dòng KHÔNG nằm trong chữ)
 * thì ghi "• " ở đầu, để nhận ra "nhiều việc gõ chung một ô" (chỉ dùng khi đọc ô bảng).
 */
export function chu(n: Nut, dsWord = false): string {
  const out: string[] = [];
  const di = (x: Nut) => {
    const t = ten(x);
    if (BO_QUA.has(t)) return;
    if (dsWord && t === "p") {
      const ppr = conTen(x, "pPr");
      if (ppr && conTen(ppr, "numPr")) out.push("• ");
    }
    if (t === "t") {
      out.push(x.textContent ?? "");
      return;
    }
    if (t === "tab") {
      out.push("\t");
      return;
    }
    if (t === "br" || t === "cr") {
      out.push("\n");
      return;
    }
    if (t === "noBreakHyphen") {
      out.push("-");
      return;
    }
    for (const c of con(x)) di(c);
    if (t === "p") out.push("\n");
    if (t === "tc") out.push("\t");
  };
  di(n);
  return out
    .join("")
    .replace(/ /g, " ")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

export interface ThongTinSdt {
  tag: string | null;
  showingPlcHdr: boolean;
  noiDung: Nut | undefined;
}

export function docSdt(n: Nut): ThongTinSdt {
  const pr = conTen(n, "sdtPr");
  const tagEl = pr ? conTen(pr, "tag") : undefined;
  const tag = thuocTinh(tagEl, "val")?.trim() || null;
  return { tag, showingPlcHdr: !!(pr && conTen(pr, "showingPlcHdr")), noiDung: conTen(n, "sdtContent") };
}

/** Tìm mọi w:tbl bên trong (không xuyên qua bảng lồng). */
export function timBang(n: Nut): Nut[] {
  const kq: Nut[] = [];
  const di = (x: Nut) => {
    for (const c of con(x)) {
      if (ten(c) === "tbl") kq.push(c);
      else di(c);
    }
  };
  di(n);
  return kq;
}

/** Các dòng của bảng, kể cả dòng bọc trong sdt (repeating section) hoặc customXml. */
export function dongCuaBang(tbl: Nut): Nut[] {
  const kq: Nut[] = [];
  const di = (x: Nut) => {
    for (const c of con(x)) {
      const t = ten(c);
      if (t === "tr") kq.push(c);
      else if (t === "sdt" || t === "sdtContent" || t === "customXml") di(c);
    }
  };
  di(tbl);
  return kq;
}

/** Các ô của dòng, kể cả ô bọc trong sdt (cell-level) hoặc customXml. Trả về [phần tử ô, sdt bọc ô nếu có]. */
export function oCuaDong(tr: Nut): { tc: Nut; sdtBoc?: Nut }[] {
  const kq: { tc: Nut; sdtBoc?: Nut }[] = [];
  const di = (x: Nut, boc?: Nut) => {
    for (const c of con(x)) {
      const t = ten(c);
      if (t === "tc") kq.push({ tc: c, sdtBoc: boc });
      else if (t === "sdt") di(conTen(c, "sdtContent") ?? c, c);
      else if (t === "customXml" || t === "sdtContent") di(c, boc);
    }
  };
  di(tr);
  return kq;
}

/** Mọi sdt có tag nằm trong một nút (lấy sdt ngoài cùng). */
export function sdtTrong(n: Nut): ThongTinSdt[] {
  const kq: ThongTinSdt[] = [];
  const di = (x: Nut) => {
    for (const c of con(x)) {
      if (ten(c) === "sdt") {
        const s = docSdt(c);
        if (s.tag) {
          kq.push(s);
          continue;
        }
        if (s.noiDung) di(s.noiDung);
        continue;
      }
      if (BO_QUA.has(ten(c))) continue;
      di(c);
    }
  };
  di(n);
  return kq;
}

export function giaTriSdt(s: ThongTinSdt, dsWord = false): string {
  if (s.showingPlcHdr || !s.noiDung) return "";
  return chu(s.noiDung, dsWord);
}

/** Ô gộp dọc tiếp nối (vMerge không phải "restart"): trong Word ô này trống, giá trị là của ô phía trên. */
export function laOGopTiep(tc: Nut): boolean {
  const pr = conTen(tc, "tcPr");
  const vm = pr ? conTen(pr, "vMerge") : undefined;
  return !!vm && thuocTinh(vm, "val") !== "restart";
}

const LA_MA_DAU = /^(?:[IVXLC]+|\d+)\s*[.)\-–]\s*\S/;

export function laTieuDe(p: Nut, text: string): boolean {
  if (!text || text.length > 160) return false;
  const ppr = conTen(p, "pPr");
  const style = thuocTinh(ppr ? conTen(ppr, "pStyle") : undefined, "val") ?? "";
  if (/heading|tieude|tieu-de|muc|title|^\d$/i.test(style) && !/^title$/i.test(style)) return true;
  if (ppr && conTen(ppr, "outlineLvl")) return true;
  if (LA_MA_DAU.test(text) && /^[IVXLC]+\s*\./.test(text)) return true;
  // Mẫu thật: tiêu đề mục là đoạn chữ đậm "I. …", "A0. …", "B1. …" (không dùng kiểu Heading)
  return /^[A-Z]\d{0,2}\.\s+\S/.test(text) && toanChuDam(p);
}

/** Mọi run có chữ trong đoạn đều đậm. */
function toanChuDam(p: Nut): boolean {
  const runs: Nut[] = [];
  const di = (x: Nut) => {
    for (const c of con(x)) {
      if (ten(c) === "r") runs.push(c);
      else if (!BO_QUA.has(ten(c))) di(c);
    }
  };
  di(p);
  const coChu = runs.filter((r) => chu(r).trim());
  return (
    coChu.length > 0 &&
    coChu.every((r) => {
      const pr = conTen(r, "rPr");
      const b = pr ? conTen(pr, "b") : undefined;
      return !!b && thuocTinh(b, "val") !== "0" && thuocTinh(b, "val") !== "false";
    })
  );
}

/** Nút XML của từng ô (để đánh dấu lỗi lên đúng chỗ trong file — danh-dau-loi.ts). */
export interface ViTriDoc {
  o: Record<string, Nut>; // tag ô nhập → w:sdt đầu tiên
  bang: Record<string, { tr: Nut; o: Record<string, Nut> }[]>; // tag bảng → dòng dữ liệu (cùng thứ tự noi_dung.bang) → tag cột → w:tc
}

interface KetQuaDoc {
  o_nhap: Record<string, string>;
  bang: Record<string, Record<string, string>[]>;
  tieu_de: string[];
  vi_tri?: ViTriDoc;
  dong_nhom?: Record<string, string[]>;
}

function ganONhap(kq: KetQuaDoc, tag: string, v: string) {
  // Dấu nhận mẫu vô hình: ô bọc tiêu đề có tag "mau_ma:form-7" (chữ bên trong là tiêu đề, không phải mã)
  const dau = /^mau_ma[:=](.+)$/i.exec(tag);
  if (dau) {
    if (!kq.o_nhap["mau_ma"]) kq.o_nhap["mau_ma"] = dau[1].trim();
    return;
  }
  const cu = kq.o_nhap[tag];
  // Trùng tag: giữ giá trị đầu tiên có nội dung
  if (cu === undefined || (cu === "" && v !== "")) kq.o_nhap[tag] = v;
}

/** Tag ô đầu của dòng nhóm trong bảng số liệu (xem docBang). */
const TAG_NHOM = "nhom";

/** Màu nền của ô (tcPr/shd) — "" nếu không tô. Dùng nhận dòng tiêu đề bảng (cùng nền với dòng đầu). */
function nenO(tc: Nut): string {
  const pr = conTen(tc, "tcPr");
  const f = (thuocTinh(pr ? conTen(pr, "shd") : undefined, "fill") ?? "").toUpperCase();
  return f && f !== "AUTO" && f !== "FFFFFF" ? f : "";
}

const boDau = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Chữ tiêu đề cột của BẢNG VIỆC (đã bỏ dấu) → tag cột chuẩn. Chỉ dùng khi dòng tiêu đề có cột "Công việc":
 *   · cột không còn ô gắn mã nào (người lập gõ tay cả bảng, Word làm rơi nhãn) vẫn đọc được theo tiêu đề;
 *   · ô mang nhãn của cột KHÁC (chép ô Bắt đầu dán sang cột Kết thúc) thì tin vị trí cột, không tin nhãn.
 */
const TAG_THEO_TIEU_DE: Record<string, string> = {
  "cong viec": "ten",
  "ten viec": "ten",
  "ten cong viec": "ten",
  "du an": "du_an",
  "phu trach": "phu_trach",
  "bo phan phu trach": "phu_trach",
  "bat dau": "bat_dau",
  "ngay bat dau": "bat_dau",
  "ket thuc": "ket_thuc",
  "ngay ket thuc": "ket_thuc",
  "ket qua can co": "ket_qua_can_co",
  "tinh trang": "tinh_trang",
};

/** Đọc một bảng gắn mã thành các dòng (tag cột → giá trị). Bỏ dòng tiêu đề (không có ô gắn mã). */
function docBang(tbl: Nut, viTri?: { tr: Nut; o: Record<string, Nut> }[], nhomBo?: string[]): Record<string, string>[] {
  const hang = dongCuaBang(tbl);
  // Học cột theo vị trí từ các dòng có ô gắn mã: đếm tag theo vị trí, chốt sau khi đọc hết (xem "nha" bên dưới)
  const demTag: Record<number, Record<string, number>> = {};
  const hangDoc: { cells: { tag: string | null; v: string; tc: Nut; gop: boolean }[]; coMa: boolean; tr: Nut }[] = [];
  for (const tr of hang) {
    const cells = oCuaDong(tr).map(({ tc, sdtBoc }, i) => {
      let tag: string | null = null;
      let v = "";
      const trong = sdtTrong(tc);
      if (trong.length > 0) {
        tag = trong[0].tag;
        v = trong.map((s) => giaTriSdt(s, true)).join(" ").trim();
        // Ô có chữ gõ ngoài content control (Word hay để lại khi dán): lấy cả ô
        const caO = chu(tc, true);
        if (!v && caO && !trong.some((s) => s.showingPlcHdr)) v = caO;
      } else if (sdtBoc) {
        const s = docSdt(sdtBoc);
        tag = s.tag;
        v = chu(tc, true);
      } else {
        v = chu(tc, true);
      }
      if (tag && tag !== TAG_NHOM) (demTag[i] ??= {})[tag] = (demTag[i][tag] ?? 0) + 1;
      return { tag, v, tc, gop: laOGopTiep(tc) };
    });
    hangDoc.push({ cells, coMa: cells.some((c) => c.tag), tr });
  }
  // Dòng tiêu đề = dòng đầu không có ô gắn mã. Bảng việc (tiêu đề có cột "Công việc"): nghĩa cột lấy theo CHỮ TIÊU ĐỀ.
  const dau = hangDoc[0] && !hangDoc[0].coMa ? hangDoc[0] : undefined;
  const tagTieuDe: Record<number, string> = {};
  if (dau) {
    const ds = dau.cells.map((c) => TAG_THEO_TIEU_DE[boDau(c.v)]);
    if (ds.includes("ten"))
      ds.forEach((t, i) => {
        if (t && !Object.values(tagTieuDe).includes(t)) tagTieuDe[i] = t;
      });
  }
  // "Nhà" của mỗi tag: cột mà tiêu đề gọi đúng tên nó, không thì cột nó xuất hiện nhiều nhất (hoà → cột bên trái).
  // Đo 10/10/2026 (BC tuần 41 P.ĐT&PC): MỘT ô cột Kết thúc mang nhãn "bat_dau" (chép–dán) làm cả cột Kết thúc bị đọc thành
  // Bắt đầu — 28 lỗi chặn oan. Trước đó cột lấy theo nhãn gặp SAU CÙNG.
  const nha: Record<string, number> = {};
  const nhieuNhat: Record<string, number> = {};
  for (const [i, ds] of Object.entries(demTag))
    for (const [tag, n] of Object.entries(ds))
      if (n > (nhieuNhat[tag] ?? 0)) {
        nhieuNhat[tag] = n;
        nha[tag] = Number(i);
      }
  for (const [i, tag] of Object.entries(tagTieuDe)) nha[tag] = Number(i);
  const cotTheoViTri: Record<number, string> = {};
  for (const [i, ds] of Object.entries(demTag)) {
    const ung = Object.entries(ds)
      .filter(([tag]) => nha[tag] === Number(i))
      .sort((a, b) => b[1] - a[1])[0];
    if (ung) cotTheoViTri[Number(i)] = ung[0];
  }
  for (const [i, tag] of Object.entries(tagTieuDe)) cotTheoViTri[Number(i)] ??= tag;
  const soOChuan = dau?.cells.length ?? 0;
  // Nền của dòng tiêu đề: dòng không gắn mã đứng TRƯỚC dòng gắn mã đầu tiên chỉ là tiêu đề khi cùng nền với dòng đầu.
  // Trước 10/10/2026 mọi dòng như vậy đều bị coi là tiêu đề — việc gõ tay ở đầu bảng lặng lẽ rơi khỏi sổ (đo: 11 việc).
  const nenTieuDe = dau ? (dau.cells.map((c) => nenO(c.tc)).find(Boolean) ?? "") : "";
  // Bảng có dòng nhóm (ô đầu gắn tag "nhom", vd "ĐẦU TƯ", "Hướng Linh 7"): dòng nhóm không phải dòng dữ liệu,
  // tên nhóm ghi vào cột "nhom" của các dòng sau. Dòng thêm tay chỉ có chữ ở ô đầu cũng coi là dòng nhóm.
  const coNhom = hangDoc.some((h) => h.cells.some((c) => c.tag === TAG_NHOM));
  let nhom = "";
  const dong: Record<string, string>[] = [];
  let dongTruoc: Record<string, string> = {};
  let daQuaTieuDe = false;
  // Bảng việc (cột đầu là tên việc): dòng CHỈ ô đầu có chữ là dòng tên nhóm ("SCI QUẢNG TRỊ", "KHÁC") — không phải việc
  // (Mr. Đại chốt 10/10/2026). Tên nhóm trả về qua nhomBo để bộ kiểm ghi gợi ý, không lặng lẽ bỏ.
  const laBangViec = cotTheoViTri[0] === "ten";
  for (const [hi, h] of hangDoc.entries()) {
    // dòng tiêu đề trước dòng dữ liệu đầu tiên
    if (!h.coMa && !daQuaTieuDe && (hi === 0 || !nenTieuDe || h.cells.some((c) => nenO(c.tc) === nenTieuDe))) continue;
    daQuaTieuDe = true;
    if (!coNhom && laBangViec && h.cells.length > 2 && /\p{L}/u.test(h.cells[0].v) && h.cells.slice(1).every((c) => !c.v && !c.gop)) {
      nhomBo?.push(h.cells[0].v.split("\n")[0].trim());
      continue;
    }
    if (coNhom && (h.cells.some((c) => c.tag === TAG_NHOM) || (!h.coMa && h.cells.length > 1 && h.cells[0].v && h.cells.slice(1).every((c) => !c.v)))) {
      nhom = h.cells[0].v;
      continue;
    }
    const d: Record<string, string> = coNhom ? { [TAG_NHOM]: nhom } : {};
    const oTc: Record<string, Nut> = {};
    h.cells.forEach((c, i) => {
      // Ô mang nhãn của cột khác (nhà của nhãn không phải cột này, cột này đã có nghĩa riêng): tin vị trí cột
      const lac = !!c.tag && c.tag !== TAG_NHOM && !!cotTheoViTri[i] && cotTheoViTri[i] !== c.tag && nha[c.tag] !== i && h.cells.length === soOChuan;
      const tag = lac ? cotTheoViTri[i] : (c.tag ?? cotTheoViTri[i]);
      if (!tag) return;
      // Ô gộp dọc với ô trên (vd cột Dự án gộp cho nhiều việc): lấy giá trị của dòng trên
      const v = !c.v && c.gop ? (dongTruoc[tag] ?? "") : c.v;
      d[tag] = d[tag] ? `${d[tag]} ${v}`.trim() : v;
      if (!oTc[tag]) oTc[tag] = c.tc;
    });
    if (Object.keys(d).length > 0) {
      dong.push(d);
      dongTruoc = d;
      viTri?.push({ tr: h.tr, o: oTc });
    }
  }
  return dong;
}

/** Bảng số liệu gắn mã (w:tblDescription = "so_lieu", do scripts/chuyen-mau-that.mjs đặt). */
export function laBangSoLieu(tbl: Nut): boolean {
  const pr = conTen(tbl, "tblPr");
  return thuocTinh(pr ? conTen(pr, "tblDescription") : undefined, "val")?.trim() === "so_lieu";
}

export function tagBangCuaTbl(tbl: Nut): string | null {
  const pr = conTen(tbl, "tblPr");
  const cap = thuocTinh(pr ? conTen(pr, "tblCaption") : undefined, "val");
  return cap && /^bang_/i.test(cap.trim()) ? cap.trim() : null;
}

function duyet(n: Nut, kq: KetQuaDoc, trongBang: boolean) {
  for (const c of con(n)) {
    const t = ten(c);
    if (BO_QUA.has(t)) continue;
    if (t === "sdt") {
      const s = docSdt(c);
      const bangTrong = s.noiDung ? timBang(s.noiDung) : [];
      if (s.tag && (/^bang_/i.test(s.tag) || bangTrong.length > 0) && bangTrong.length > 0) {
        const vt = kq.vi_tri ? (kq.vi_tri.bang[s.tag] ??= []) : undefined;
        const nhomBo = ((kq.dong_nhom ??= {})[s.tag] ??= []);
        const dong = bangTrong.flatMap((b) => docBang(b, vt, nhomBo));
        kq.bang[s.tag] = [...(kq.bang[s.tag] ?? []), ...dong];
        continue;
      }
      if (s.tag) {
        ganONhap(kq, s.tag, giaTriSdt(s));
        const khoa = /^mau_ma[:=]/i.test(s.tag) ? "mau_ma" : s.tag;
        if (kq.vi_tri && !kq.vi_tri.o[khoa]) kq.vi_tri.o[khoa] = c;
        // Mẫu bản 5: ô "Đơn vị lập" nằm LỒNG trong khung tiêu đề (dấu nhận mẫu) — đọc cả ô gắn mã bên trong
        if (khoa === "mau_ma" && s.noiDung) {
          const lop = (x: Nut) => {
            for (const y of con(x)) {
              if (ten(y) === "sdt") {
                const t = docSdt(y);
                if (t.tag) {
                  ganONhap(kq, t.tag, giaTriSdt(t));
                  if (kq.vi_tri && !kq.vi_tri.o[t.tag]) kq.vi_tri.o[t.tag] = y;
                  continue;
                }
              }
              lop(y);
            }
          };
          lop(s.noiDung);
        }
        // Tiêu đề mục có thể nằm trong ô khối
        if (s.noiDung) for (const p of con(s.noiDung)) if (ten(p) === "p") themTieuDe(p, kq);
        continue;
      }
      if (s.noiDung) duyet(s.noiDung, kq, trongBang);
      continue;
    }
    if (t === "tbl") {
      const tag = tagBangCuaTbl(c);
      if (tag) {
        kq.bang[tag] = [...(kq.bang[tag] ?? []), ...docBang(c, kq.vi_tri ? (kq.vi_tri.bang[tag] ??= []) : undefined, ((kq.dong_nhom ??= {})[tag] ??= []))];
        continue;
      }
      duyet(c, kq, true);
      continue;
    }
    if (t === "p" && !trongBang) themTieuDe(c, kq);
    duyet(c, kq, trongBang);
  }
}

function themTieuDe(p: Nut, kq: KetQuaDoc) {
  const text = chu(p);
  if (laTieuDe(p, text)) kq.tieu_de.push(text);
}

export function phanTich(xml: string): Nut {
  const loi: string[] = [];
  const doc = new DOMParser({
    errorHandler: { warning: () => undefined, error: (m: string) => loi.push(m), fatalError: (m: string) => loi.push(m) },
  }).parseFromString(xml, "text/xml") as unknown as { documentElement: Nut | null };
  if (!doc.documentElement) throw new Error("Không đọc được nội dung Word: " + (loi[0] ?? "XML hỏng"));
  return doc.documentElement;
}

/** Chuẩn hóa mã mẫu: "Form 7", "FORM-7", "form_7" → "form-7". */
export function chuanHoaMaMau(v: string | null | undefined): string | null {
  const s = (v ?? "").trim().toLowerCase();
  if (!s) return null;
  const m = /^form[\s_-]*(\d+)$/.exec(s);
  if (m) return `form-${Number(m[1])}`;
  return s.replace(/\s+/g, "-");
}

/** Chữ thuần bỏ qua mọi ô gắn mã và bảng gắn mã (phần người dùng viết tự do). */
function chuNgoaiO(n: Nut): string {
  const out: string[] = [];
  // Bảng số liệu gắn mã (laBangSoLieu): chữ vẫn tính là chữ của mục, như khi bảng chưa gắn mã
  const di = (x: Nut, soLieu: boolean) => {
    const t = ten(x);
    if (BO_QUA.has(t)) return;
    if (t === "sdt" && docSdt(x).tag && !soLieu) {
      const nd = docSdt(x).noiDung;
      const bang = nd ? timBang(nd) : [];
      if (!nd || bang.length === 0 || !bang.every(laBangSoLieu)) return;
      for (const c of con(nd)) di(c, true);
      return;
    }
    if (t === "tbl" && tagBangCuaTbl(x) && !laBangSoLieu(x)) return;
    if (t === "t") return void out.push(x.textContent ?? "");
    if (t === "tab") return void out.push("\t");
    for (const c of con(x)) di(c, soLieu || (t === "tbl" && laBangSoLieu(x)));
    if (t === "p") out.push("\n");
  };
  di(n, false);
  return out.join("").replace(/\n{2,}/g, "\n").trim();
}

// Dòng ngày ký, kể cả khi còn trống như mẫu trắng: ", ngày ...... tháng ...... năm 20..."
const RE_NGAY_KY = /,\s*ngày\s+(\d+|[.…]+)\s+tháng\s+(\d+|[.…]+)\s+năm\s+(\d{4}|\d{0,2}[.…]+)/i;

/** Chia thân tài liệu thành mục theo tiêu đề; dừng ở dòng "…, ngày … tháng … năm …" (khối chữ ký). */
function chiaMuc(body: Nut): { tieu_de: string; van_ban: string }[] {
  const kq: { tieu_de: string; van_ban: string }[] = [];
  let hien: { tieu_de: string; phan: string[] } | null = null;
  for (const c of con(body)) {
    if (ten(c) === "p") {
      const text = chu(c);
      // Dừng ở khối chữ ký (mẫu đến bản 5) hoặc ghi chú cho người lập cuối mẫu (bản 6 bỏ dòng ngày ký)
      if (RE_NGAY_KY.test(text) || /^Ghi chú cho người lập báo cáo/i.test(text.trim())) break;
      if (laTieuDe(c, text)) {
        if (hien) kq.push({ tieu_de: hien.tieu_de, van_ban: hien.phan.join("\n").trim() });
        hien = { tieu_de: text, phan: [] };
        continue;
      }
    }
    if (hien) hien.phan.push(chuNgoaiO(c));
  }
  if (hien) kq.push({ tieu_de: hien.tieu_de, van_ban: hien.phan.join("\n").trim() });
  return kq;
}

export async function docWord(buf: Buffer): Promise<NoiDungWord> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buf);
  } catch {
    throw new Error("File không phải Word .docx (không mở được gói nén)");
  }
  const docEl = zip.file("word/document.xml");
  if (!docEl) throw new Error("File không phải Word .docx (thiếu word/document.xml)");
  const goc = phanTich(await docEl.async("string"));
  const kq: KetQuaDoc = { o_nhap: {}, bang: {}, tieu_de: [] };
  const body = conTen(goc, "body") ?? goc;
  duyet(body, kq, false);

  // Ô nhập đặt ở đầu trang / chân trang (vd mã mẫu)
  const phu = Object.keys(zip.files).filter((f) => /^word\/(header|footer)\d*\.xml$/.test(f)).sort();
  for (const f of phu) {
    const x = phanTich(await zip.file(f)!.async("string"));
    const tam: KetQuaDoc = { o_nhap: {}, bang: {}, tieu_de: [] };
    duyet(x, tam, false);
    for (const [k, v] of Object.entries(tam.o_nhap)) ganONhap(kq, k, v);
  }

  // Thuộc tính tài liệu tùy chỉnh SCI_MauMa (nguồn nhận mẫu thứ hai, Word lưu lại vẫn giữ)
  const custom = zip.file("docProps/custom.xml");
  if (custom && !kq.o_nhap["mau_ma"]) {
    const m = /name="SCI_MauMa"[^>]*>\s*<vt:lpwstr>([^<]+)<\/vt:lpwstr>/.exec(await custom.async("string"));
    if (m) kq.o_nhap["mau_ma"] = m[1].trim();
  }

  return {
    mau_ma: chuanHoaMaMau(kq.o_nhap["mau_ma"]),
    muc: chiaMuc(body),
    o_nhap: kq.o_nhap,
    bang: kq.bang,
    tieu_de: kq.tieu_de,
    van_ban: chu(body),
    dong_nhom: Object.fromEntries(Object.entries(kq.dong_nhom ?? {}).filter(([, v]) => v.length > 0)),
  };
}

/** Mở file Word kèm vị trí từng ô (thân văn bản) — để ghi đánh dấu lỗi rồi đóng gói lại. */
export async function moWordCoViTri(buf: Buffer): Promise<{ zip: JSZip; goc: Nut; body: Nut; vi_tri: ViTriDoc }> {
  const zip = await JSZip.loadAsync(buf);
  const docEl = zip.file("word/document.xml");
  if (!docEl) throw new Error("File không phải Word .docx (thiếu word/document.xml)");
  const goc = phanTich(await docEl.async("string"));
  const body = conTen(goc, "body") ?? goc;
  const kq: KetQuaDoc = { o_nhap: {}, bang: {}, tieu_de: [], vi_tri: { o: {}, bang: {} } };
  duyet(body, kq, false);
  return { zip, goc, body, vi_tri: kq.vi_tri! };
}
