// ============================================================
// kiem-tra/danh-dau-loi.ts — BẢN WORD ĐÁNH DẤU LỖI: tô màu đúng ô sai + ghi chú (comment Word) nói cần sửa gì.
// Đỏ = lỗi chặn gửi, vàng = cảnh báo. Lỗi không gắn được vào ô nào (thiếu mục, mất bảng…) ghi chú ở đoạn đầu.
// Mr. Đại chốt 28/09: ① chỗ chặn gửi luôn NỀN ĐỎ — cảnh báo cùng chỗ không được đè thành vàng (tô vàng trước, đỏ sau);
// lỗi chỉ ra dòng (cột không có trong bảng) thì tô nền cả dòng ② ghi chú neo ĐÚNG ô/dòng lỗi, không dồn về đầu bảng
// ③ tải lên lại chính bản đã đánh dấu thì bỏ ghi chú cũ của máy trước khi đánh dấu mới (không nhân đôi)
//   — và bỏ cả MÀU cũ máy tô (nền ô đỏ/vàng của máy + bôi chữ đỏ/vàng), để dòng đã sửa xong không còn vàng/đỏ sót.
// Người dùng mở bằng Word, sửa ngay trên file này rồi tải lên lại — không phải dò theo mã ô.
// ============================================================
import { XMLSerializer } from "@xmldom/xmldom";
import type { LoiKiemTra, MauWord } from "@/lib/types";
import { moWordCoViTri, type Nut } from "./doc-word";

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const REL_CMT = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments";
const CT_CMT = "application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml";

type El = Element;
const el = (n: Nut) => n as unknown as El;

const MAU = { chan: { to: "red", nen: "FF8A80", nhan: "CHẶN GỬI" }, canh_bao: { to: "yellow", nen: "FFF2A8", nhan: "CẢNH BÁO" } } as const;
const TAC_GIA = "SCI công việc";

function tao(doc: Document, ten: string, attrs: Record<string, string> = {}): El {
  const e = doc.createElementNS(W, `w:${ten}`);
  for (const [k, v] of Object.entries(attrs)) e.setAttributeNS(W, `w:${k}`, v);
  return e;
}

function con(e: El, ten: string): El | undefined {
  for (let c = e.firstChild; c; c = c.nextSibling) if (c.nodeType === 1 && (c as El).localName === ten) return c as El;
  return undefined;
}

function conTruoc(e: El, ten: string, doc: Document): El {
  let c = con(e, ten);
  if (!c) {
    c = tao(doc, ten);
    e.insertBefore(c, e.firstChild);
  }
  return c;
}

function tatCa(e: El, ten: string): El[] {
  return Array.from(e.getElementsByTagNameNS(W, ten));
}

// Thứ tự phần tử con theo chuẩn OOXML: thẻ mới phải đứng TRƯỚC các thẻ này, nếu không Word báo file hỏng
const SAU_SHD_O = new Set(["noWrap", "tcMar", "textDirection", "tcFitText", "vAlign", "hideMark", "headers", "cellIns", "cellDel", "cellMerge", "tcPrChange"]);
const SAU_HIGHLIGHT = new Set(["u", "effect", "bdr", "shd", "fitText", "vertAlign", "rtl", "cs", "em", "lang", "eastAsianLayout", "specVanish", "oMath", "rPrChange"]);

function chenDungCho(pr: El, moi: El, sau: Set<string>) {
  for (let c = pr.firstChild; c; c = c.nextSibling) {
    if (c.nodeType === 1 && sau.has((c as El).localName)) {
      pr.insertBefore(moi, c);
      return;
    }
  }
  pr.appendChild(moi);
}

function toNenO(tc: El, doc: Document, muc: keyof typeof MAU) {
  const pr = conTruoc(tc, "tcPr", doc);
  const cu = con(pr, "shd");
  if (cu) pr.removeChild(cu);
  chenDungCho(pr, tao(doc, "shd", { val: "clear", color: "auto", fill: MAU[muc].nen }), SAU_SHD_O);
}

function toTo(e: El, doc: Document, muc: keyof typeof MAU) {
  // Tô nền cả ô bảng chứa chỗ sai (kể cả ô trống), và bôi màu chữ bên trong. Chỗ sai là cả dòng → tô nền mọi ô của dòng.
  let tc: Node | null = e;
  while (tc && (tc as El).localName !== "tc") tc = tc.parentNode;
  if (tc) toNenO(tc as El, doc, muc);
  else if (e.localName === "tr") for (const o of tatCa(e, "tc")) toNenO(o, doc, muc);
  for (const r of tatCa(e, "r")) {
    const pr = conTruoc(r, "rPr", doc);
    const cu = con(pr, "highlight");
    if (cu) pr.removeChild(cu);
    chenDungCho(pr, tao(doc, "highlight", { val: MAU[muc].to }), SAU_HIGHLIGHT);
  }
}

/**
 * Đoạn gắn ghi chú = đoạn ĐẦU TIÊN của ô / dòng sai (Mr. Đại chốt 28/09: ghi chú bên lề phải chỉ đúng dòng lỗi).
 * Thử bằng Word 16 ngày 28/09: ghi chú nằm trong ô bảng có content control vẫn mở, lưu, đọc lại được.
 * Không tìm được đoạn trong chỗ sai thì lùi về cách cũ (đoạn ngay trước bảng).
 */
function doanNeo(e: El, body: El): El | undefined {
  const trong = e.localName === "p" ? e : tatCa(e, "p")[0];
  if (trong) return trong;
  return doanNeoCu(e, body);
}

function doanNeoCu(e: El, body: El): El | undefined {
  let trongBang = false;
  let top: Node = e;
  for (let x: Node | null = e; x && x !== body; x = x.parentNode) {
    if ((x as El).localName === "tbl") trongBang = true;
    top = x;
  }
  if (!trongBang) {
    const p = tatCa(e, "p")[0];
    if (p) return p;
    let x: Node | null = e;
    while (x && (x as El).localName !== "p") x = x.parentNode;
    return (x as El) ?? tatCa(body, "p")[0];
  }
  for (let x = top.previousSibling; x; x = x.previousSibling) if ((x as El).localName === "p") return x as El;
  for (let x = top.nextSibling; x; x = x.nextSibling) if ((x as El).localName === "p") return x as El;
  return undefined;
}

/** "Bảng “Công việc”, dòng 2, cột “Kết thúc”" / "Ô “Người lập”" theo định nghĩa mẫu. */
const TEN_COT_VIEC: Record<string, string> = { ket_thuc: "hạn kết thúc", bat_dau: "ngày bắt đầu", phu_trach: "người phụ trách", noi_dung: "nội dung việc" };

export function nhanViTri(v: LoiKiemTra["vi_tri"], mau?: MauWord | null): string {
  if (!v) return "";
  const dn = mau?.dinh_nghia as { o_nhap?: { tag: string; nhan: string }[]; bang_cong_viec?: { tag: string; nhan: string }[]; bang?: { tag: string; nhan?: string; cot?: { tag: string; nhan: string }[] }[] } | undefined;
  if (v.bang) {
    const b = dn?.bang_cong_viec?.find((x) => x.tag === v.bang)?.nhan ?? dn?.bang?.find((x) => x.tag === v.bang)?.nhan ?? v.bang;
    // Cột máy tự thêm cho việc (hạn, phụ trách) có thể không có trong bảng — vẫn gọi bằng tên người đọc hiểu, không để mã
    // Tiêu đề cột khai trong cau_truc (mẫu khai theo nghĩa, 01/10/2026) đứng trước tên đoán theo tag
    const cotKhai = mau?.dinh_nghia.cau_truc?.chuong.flatMap((c) => c.bang).find((b) => b.tag === v.bang)?.cot.find((c) => c.tag === v.cot)?.tieu_de;
    const cot = v.cot ? (cotKhai ?? dn?.bang?.find((x) => x.tag === v.bang)?.cot?.find((c) => c.tag === v.cot)?.nhan ?? TEN_COT_VIEC[v.cot] ?? v.cot) : "";
    return `Bảng “${b}”${v.dong ? `, dòng ${v.dong}` : ""}${cot ? `, cột “${cot}”` : ""}`;
  }
  if (v.tag?.startsWith("muc:")) return `Mục “${v.tag.slice(4)}”`;
  if (v.tag === "mau_ma") return "Tiêu đề đầu trang";
  return v.tag ? `Ô “${dn?.o_nhap?.find((o) => o.tag === v.tag)?.nhan ?? v.tag}”` : "";
}

function ganGhiChu(p: El, doc: Document, id: number) {
  const bd = tao(doc, "commentRangeStart", { id: String(id) });
  const pPr = con(p, "pPr");
  p.insertBefore(bd, pPr ? pPr.nextSibling : p.firstChild);
  p.appendChild(tao(doc, "commentRangeEnd", { id: String(id) }));
  const r = tao(doc, "r");
  r.appendChild(tao(doc, "commentReference", { id: String(id) }));
  p.appendChild(r);
}

function xmlEsc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Bỏ ghi chú cũ do máy ghi (tác giả "SCI công việc") — người dùng tải lại chính bản đã đánh dấu. */
function boGhiChuCu(than: El, cmtXml: string): string {
  const bo = new Set<string>();
  const xml = cmtXml.replace(/<w:comment\b[^>]*>[\s\S]*?<\/w:comment>/g, (k) => {
    const id = /w:id="([^"]+)"/.exec(k)?.[1];
    if (id && /w:author="([^"]*)"/.exec(k)?.[1] === TAC_GIA) {
      bo.add(id);
      return "";
    }
    return k;
  });
  if (!bo.size) return cmtXml;
  for (const ten of ["commentRangeStart", "commentRangeEnd"])
    for (const n of tatCa(than, ten)) if (bo.has(n.getAttributeNS(W, "id") ?? "")) n.parentNode?.removeChild(n);
  for (const n of tatCa(than, "commentReference")) {
    if (!bo.has(n.getAttributeNS(W, "id") ?? "")) continue;
    const r = n.parentNode as El | null;
    if (r && r.localName === "r") r.parentNode?.removeChild(r);
    else n.parentNode?.removeChild(n);
  }
  return xml;
}

/** Nền ô máy từng dùng (cả màu đỏ cũ F4B6B6 trước 28/09) — chỉ xoá khi file là bản máy đã đánh dấu. */
const NEN_CUA_MAY = new Set(["FF8A80", "F4B6B6", "FFF2A8"]);

function boMauCu(than: El) {
  for (const shd of tatCa(than, "shd")) {
    const cha = shd.parentNode as El | null;
    if (cha?.localName === "tcPr" && NEN_CUA_MAY.has((shd.getAttributeNS(W, "fill") ?? "").toUpperCase())) cha.removeChild(shd);
  }
  for (const h of tatCa(than, "highlight")) {
    const v = h.getAttributeNS(W, "val");
    if (v === "red" || v === "yellow") h.parentNode?.removeChild(h);
  }
}

/** Bản Word đánh dấu lỗi chặn gửi + cảnh báo. Trả file .docx mới (file gốc không đổi). */
export async function danhDauLoi(buf: Buffer, loi: LoiKiemTra[], mau?: MauWord | null): Promise<{ buf: Buffer; so_cho: number }> {
  const { zip, goc, body, vi_tri } = await moWordCoViTri(buf);
  const doc = el(goc).ownerDocument as Document;
  const than = el(body);
  const ghiChu: { id: number; text: string }[] = [];
  let id = 9000; // tránh trùng id ghi chú sẵn có
  let soCho = 0;

  const cmtTep = zip.file("word/comments.xml");
  const cmtGoc = cmtTep ? await cmtTep.async("string") : null;
  const cmtCu = cmtGoc !== null ? boGhiChuCu(than, cmtGoc) : null;
  // File có ghi chú của máy = bản đã đánh dấu tải lên lại → xoá màu cũ máy tô trước khi tô theo lần kiểm mới
  if (cmtGoc !== null && cmtCu !== cmtGoc) boMauCu(than);

  const dichCua = (l: LoiKiemTra): El | undefined => {
    const v = l.vi_tri;
    if (v?.bang && v.dong) {
      const dong = vi_tri.bang[v.bang]?.[v.dong - 1];
      const n = dong ? (v.cot && dong.o[v.cot]) || dong.tr : undefined;
      return n ? el(n) : undefined;
    }
    if (v?.tag && !v.tag.startsWith("muc:")) {
      const n = vi_tri.o[v.tag];
      return n ? el(n) : undefined;
    }
    return undefined;
  };
  const canDanh = loi.filter((l): l is LoiKiemTra & { muc: "chan" | "canh_bao" } => l.muc === "chan" || l.muc === "canh_bao");
  // Tô màu: cảnh báo trước, chặn gửi sau — chỗ vừa chặn vừa cảnh báo luôn ra ĐỎ
  for (const l of [...canDanh.filter((x) => x.muc === "canh_bao"), ...canDanh.filter((x) => x.muc === "chan")]) {
    const dich = dichCua(l);
    if (dich) {
      toTo(dich, doc, l.muc);
      soCho++;
    }
  }

  const toDo = new Set(canDanh.filter((x) => x.muc === "chan").map(dichCua).filter(Boolean));
  for (const l of canDanh) {
    const v = l.vi_tri;
    const dich = dichCua(l);
    const neo = dich ? doanNeo(dich, than) : tatCa(than, "p")[0];
    if (!neo) continue;
    ganGhiChu(neo, doc, ++id);
    const noi = nhanViTri(v, mau);
    ghiChu.push({ id, text: `[${MAU[l.muc].nhan}]${noi ? ` ${noi}${dich ? ` (ô tô ${toDo.has(dich) ? "đỏ" : "vàng"})` : ""}:` : ""} ${l.thong_diep}` });
  }

  zip.file("word/document.xml", new XMLSerializer().serializeToString(doc as unknown as Node));

  // comments.xml (+ quan hệ + kiểu nội dung) — nối vào ghi chú sẵn có nếu file đã có
  const phan = ghiChu
    .map(
      (g) =>
        `<w:comment w:id="${g.id}" w:author="${TAC_GIA}" w:initials="CV" w:date="${new Date().toISOString().slice(0, 19)}Z"><w:p><w:r><w:t xml:space="preserve">${xmlEsc(g.text)}</w:t></w:r></w:p></w:comment>`,
    )
    .join("");
  if (cmtCu !== null) {
    const x = cmtCu.replace(/<w:comments([^>]*)\/>\s*$/, "<w:comments$1></w:comments>");
    zip.file("word/comments.xml", x.replace(/<\/w:comments>\s*$/, `${phan}</w:comments>`));
  } else {
    zip.file("word/comments.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:comments xmlns:w="${W}">${phan}</w:comments>`);
    const relP = "word/_rels/document.xml.rels";
    const rels = (await zip.file(relP)?.async("string")) ?? `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;
    if (!rels.includes(REL_CMT)) zip.file(relP, rels.replace(/<\/Relationships>\s*$/, `<Relationship Id="rIdDocFlowCmt" Type="${REL_CMT}" Target="comments.xml"/></Relationships>`));
    const ct = await zip.file("[Content_Types].xml")!.async("string");
    if (!ct.includes("/word/comments.xml")) zip.file("[Content_Types].xml", ct.replace(/<\/Types>\s*$/, `<Override PartName="/word/comments.xml" ContentType="${CT_CMT}"/></Types>`));
  }
  return { buf: await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }), so_cho: soCho };
}
