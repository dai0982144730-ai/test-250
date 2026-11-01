// ============================================================
// kiem-tra/sua-vao-file.ts — GHI CHỮ SỬA VÀO FILE WORD (Mr. Đại chốt 28/09/2026, bước "Sửa lỗi" khi nộp báo cáo).
// Người nộp bấm "Sửa vào file" trên đề xuất 🤖 "Cũ → Mới" (có thể chỉnh chữ mới trước khi bấm) → máy thay chữ của
// ĐÚNG MỘT ô: ô bảng (bảng · dòng · cột) hoặc ô nhập (content control gắn mã). Giữ định dạng chữ của đoạn đầu ô,
// bỏ chữ giữ chỗ ("Bấm để nhập…"). Không đụng chỗ nào khác của file. Kết quả là file MỚI → lưu thành phiên bản mới
// (bản cũ còn nguyên trong lịch sử) rồi kiểm tra lại từ đầu.
// ============================================================
import { XMLSerializer } from "@xmldom/xmldom";
import { moWordCoViTri, type Nut } from "./doc-word";

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
type El = Element;
const el = (n: Nut) => n as unknown as El;

export interface SuaMotCho {
  vi_tri: { tag?: string; bang?: string; dong?: number; cot?: string };
  moi: string;
}

function con(e: El, ten: string): El | undefined {
  for (let c = e.firstChild; c; c = c.nextSibling) if (c.nodeType === 1 && (c as El).localName === ten) return c as El;
  return undefined;
}
const tatCa = (e: El, ten: string): El[] => Array.from(e.getElementsByTagNameNS(W, ten));

/** Thay toàn bộ chữ trong `vung` (ô bảng / nội dung content control) bằng `moi`, giữ kiểu chữ đầu tiên. */
function thayChu(vung: El, moi: string) {
  const doc = vung.ownerDocument as Document;
  const doan = tatCa(vung, "p");
  const kieu = tatCa(vung, "rPr")[0]?.cloneNode(true) as El | undefined;
  // Ô nhập nội dòng (content control trong đoạn): chỉ có các w:r
  if (!doan.length) {
    for (const r of tatCa(vung, "r")) r.parentNode?.removeChild(r);
    vung.appendChild(taoRun(doc, moi, kieu));
    return;
  }
  const dau = doan[0];
  for (const p of doan.slice(1)) p.parentNode?.removeChild(p);
  for (let c = dau.firstChild; c; ) {
    const tiep = c.nextSibling;
    if (!(c.nodeType === 1 && (c as El).localName === "pPr")) dau.removeChild(c);
    c = tiep;
  }
  dau.appendChild(taoRun(doc, moi, kieu));
}

function taoRun(doc: Document, chu: string, kieu?: El): El {
  const r = doc.createElementNS(W, "w:r");
  if (kieu) {
    // bỏ tô màu đánh dấu lỗi cũ trong kiểu chữ chép sang
    for (const h of tatCa(kieu, "highlight")) h.parentNode?.removeChild(h);
    r.appendChild(kieu);
  }
  chu.split(/\r?\n/).forEach((dong, i) => {
    if (i) r.appendChild(doc.createElementNS(W, "w:br"));
    const t = doc.createElementNS(W, "w:t");
    t.setAttribute("xml:space", "preserve");
    t.appendChild(doc.createTextNode(dong));
    r.appendChild(t);
  });
  return r;
}

/** Ghi các chỗ sửa vào file. Chỗ nào không tìm thấy trong file thì báo lỗi (không ghi nửa chừng). */
export async function ghiSuaVaoFile(buf: Buffer, sua: SuaMotCho[]): Promise<Buffer> {
  const { zip, goc, vi_tri } = await moWordCoViTri(buf);
  for (const s of sua) {
    const v = s.vi_tri;
    let vung: El | undefined;
    if (v.bang && v.dong && v.cot) {
      const n = vi_tri.bang[v.bang]?.[v.dong - 1]?.o[v.cot];
      vung = n ? el(n) : undefined;
    } else if (v.tag) {
      const sdt = vi_tri.o[v.tag] ? el(vi_tri.o[v.tag]) : undefined;
      if (sdt) {
        const pr = con(sdt, "sdtPr");
        const giuCho = pr && con(pr, "showingPlcHdr");
        if (giuCho) pr!.removeChild(giuCho);
        vung = con(sdt, "sdtContent");
      }
    }
    if (!vung) throw new Error(`Không tìm thấy chỗ cần sửa trong file (${v.bang ? `bảng ${v.bang}, dòng ${v.dong}, cột ${v.cot}` : `ô ${v.tag}`})`);
    thayChu(vung, s.moi);
  }
  const doc = el(goc).ownerDocument as Document;
  zip.file("word/document.xml", new XMLSerializer().serializeToString(doc as unknown as Node));
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
