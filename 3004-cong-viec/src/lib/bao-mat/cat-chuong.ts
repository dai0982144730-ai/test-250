// ============================================================
// bao-mat/cat-chuong.ts — CẮT CHƯƠNG MẬT KHỎI TỆP WORD (Mr. Đại chốt 07/10/2026). Không đụng CSDL/đĩa — chỉ Buffer vào, Buffer ra.
//
// Đo 07/10 trên 3 tệp Form 4 thật: tiêu đề chương là ĐOẠN VĂN cấp ngoài cùng của thân tài liệu ("I. TÓM TẮT THÔNG TIN CHÍNH"),
// bảng số ngay sau là w:tbl / w:sdt cấp ngoài cùng. Nên cắt theo khối cấp ngoài cùng:
//   • gặp tiêu đề chương mật → xoá từ đó tới trước tiêu đề chương KHÔNG mật kế tiếp; chèn MỘT đoạn ghi câu từ chối vào chỗ cắt.
//   • chương kế tiếp chỉ được coi là ranh giới khi khớp tên chương đã biết của mẫu (và số La Mã lớn hơn) — đoạn "V. Ghi chú" nằm
//     trong chương mật không làm dừng cắt. Không chắc thì CẮT THỪA (người thường mất bớt chữ), không bao giờ cắt thiếu.
//   • biểu đồ / ảnh / tệp nhúng chỉ khối đã xoá trỏ tới → xoá cả phần đó trong gói (không thì file tải về vẫn mang số trong biểu đồ);
//     chú thích cuối trang / bình luận nằm trong khối đã xoá → xoá theo.
// THẤT BẠI LÀ CHẶN (ném LoiCatChuong — nơi gọi trả 403, không bao giờ rơi về tệp gốc — Q3):
//   không đọc được tệp · không thấy chương mật nào · khối mật có w:dataBinding (số nằm ở customXml) · cắt xong chữ còn tên chương mật.
// ============================================================
import JSZip from "jszip";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { boDauHoa, gocTenChuong, soLaMa } from "./quy-tac";

export class LoiCatChuong extends Error {}

export interface TuyChonCat {
  /** Gốc tên chương mật (gocChuongMat) */
  mat: string[];
  /** Mọi chương đã biết của mẫu (muc_bat_buoc) — trống = tệp không rõ mẫu: chương La Mã số lớn hơn là ranh giới */
  biet: string[];
  cau_tu_choi: string;
}

export interface KetQuaCat {
  buf: Buffer;
  /** Chữ tiêu đề các chương đã cắt */
  chuong_da_cat: string[];
  so_khoi_xoa: number;
  so_phan_xoa: number;
}

type El = Element;

function chuCua(el: El): string {
  const ts = el.getElementsByTagName("w:t");
  let s = "";
  for (let i = 0; i < ts.length; i++) s += ts[i]!.textContent ?? "";
  return s;
}

function conCapNgoai(body: El): El[] {
  const ds: El[] = [];
  for (let n = body.firstChild; n; n = n.nextSibling) if (n.nodeType === 1) ds.push(n as El);
  return ds;
}

/** Đoạn văn cấp ngoài cùng ngắn → chữ tiêu đề; không phải tiêu đề → null */
function chuTieuDe(el: El): string | null {
  if (el.nodeName !== "w:p") return null;
  const chu = chuCua(el).trim();
  if (!chu || chu.length > 160) return null;
  return chu;
}

const laMat = (chu: string, mat: string[]) => {
  const g = gocTenChuong(chu);
  return mat.some((m) => g.startsWith(m));
};

async function moGoi(buf: Buffer): Promise<{ zip: JSZip; doc: Document; body: El }> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buf);
  } catch {
    throw new LoiCatChuong("tệp không phải Word .docx");
  }
  const f = zip.file("word/document.xml");
  if (!f) throw new LoiCatChuong("tệp Word thiếu phần thân tài liệu");
  const doc = new DOMParser().parseFromString(await f.async("string"), "text/xml") as unknown as Document;
  const body = doc.getElementsByTagName("w:body")[0] as El | undefined;
  if (!body) throw new LoiCatChuong("tệp Word thiếu phần thân tài liệu");
  return { zip, doc, body };
}

/** Tệp Word có tiêu đề chương mật ở cấp ngoài cùng không (dò tài liệu không gắn mẫu mật — vd nộp lại dưới đơn vị khác). Lỗi → false. */
export async function coChuongMat(buf: Buffer, mat: string[]): Promise<boolean> {
  if (mat.length === 0) return false;
  try {
    const { body } = await moGoi(buf);
    return conCapNgoai(body).some((el) => {
      const chu = chuTieuDe(el);
      return !!chu && laMat(chu, mat);
    });
  } catch {
    return false;
  }
}

/** Kiểu quan hệ trỏ tới nội dung nằm TRONG thân (biểu đồ, ảnh, tệp nhúng…) — mồ côi thì xoá được */
const KIEU_XOA_DUOC = /\/(chart|image|oleObject|package|diagramData|diagramLayout|diagramQuickStyle|diagramColors|diagramDrawing|aFChunk|control|video|audio|media|hyperlink|chartUserShapes)$/;

function duongDanDich(goc: string, dich: string): string {
  if (dich.startsWith("/")) return dich.slice(1);
  const phan = goc.split("/").slice(0, -1);
  for (const p of dich.split("/")) {
    if (p === "..") phan.pop();
    else if (p !== ".") phan.push(p);
  }
  return phan.join("/");
}

/** Tệp .rels của một phần: word/charts/chart1.xml → word/charts/_rels/chart1.xml.rels */
function relsCua(phan: string): string {
  const i = phan.lastIndexOf("/");
  return `${phan.slice(0, i + 1)}_rels/${phan.slice(i + 1)}.rels`;
}

/** Xoá phần mồ côi: quan hệ của thân không còn được trỏ tới, rồi mọi phần trong thư mục nội dung nhúng không còn ai trỏ tới. */
async function xoaPhanMoCoi(zip: JSZip, xmlThan: string): Promise<number> {
  const relsThan = "word/_rels/document.xml.rels";
  const f = zip.file(relsThan);
  if (!f) return 0;
  const conTro = new Set<string>();
  for (const m of xmlThan.matchAll(/\br:[A-Za-z]+="([^"]+)"/g)) conTro.add(m[1]!);
  const rd = new DOMParser().parseFromString(await f.async("string"), "text/xml") as unknown as Document;
  const rels = rd.getElementsByTagName("Relationship");
  for (let i = rels.length - 1; i >= 0; i--) {
    const r = rels[i] as El;
    if (!KIEU_XOA_DUOC.test(r.getAttribute("Type") ?? "")) continue;
    if (conTro.has(r.getAttribute("Id") ?? "")) continue;
    r.parentNode?.removeChild(r);
  }
  zip.file(relsThan, new XMLSerializer().serializeToString(rd as unknown as Node));

  // Phần nội dung nhúng còn sống = đi theo .rels từ MỌI phần không nằm trong thư mục nhúng (thân, header, footer…), lặp tới khi đứng yên
  const THU_MUC_NHUNG = /^word\/(charts|embeddings|media|diagrams|activeX)\//;
  const tenPhan = Object.keys(zip.files).filter((t) => !zip.files[t]!.dir && !t.endsWith(".rels"));
  const songSot = new Set<string>(tenPhan.filter((t) => !THU_MUC_NHUNG.test(t)));
  const doiXet = Array.from(songSot);
  while (doiXet.length) {
    const phan = doiXet.pop()!;
    const rf = zip.file(relsCua(phan));
    if (!rf) continue;
    for (const m of (await rf.async("string")).matchAll(/<Relationship\s[^>]*>/g)) {
      if (/TargetMode="External"/.test(m[0])) continue;
      const dich = /Target="([^"]+)"/.exec(m[0])?.[1];
      if (!dich) continue;
      const pd = duongDanDich(phan, dich);
      if (!songSot.has(pd)) {
        songSot.add(pd);
        doiXet.push(pd);
      }
    }
  }
  let soXoa = 0;
  const xoa: string[] = [];
  for (const ten of tenPhan) if (THU_MUC_NHUNG.test(ten) && !songSot.has(ten)) xoa.push(ten, relsCua(ten));
  for (const ten of xoa) {
    if (!zip.file(ten)) continue;
    zip.remove(ten);
    if (!ten.endsWith(".rels")) soXoa++;
  }
  // Thư mục nhúng đã rỗng thì bỏ luôn (không để lại dấu vết từng có biểu đồ)
  for (const ten of Object.keys(zip.files)) {
    const e = zip.files[ten];
    if (!e?.dir || !THU_MUC_NHUNG.test(ten)) continue;
    if (!Object.keys(zip.files).some((f) => f.startsWith(ten) && zip.files[f] && !zip.files[f]!.dir)) zip.remove(ten);
  }
  // [Content_Types].xml: bỏ dòng Override của phần đã xoá
  const ct = zip.file("[Content_Types].xml");
  if (ct && xoa.length) {
    let x = await ct.async("string");
    for (const ten of xoa) x = x.replace(new RegExp(`<Override\\b[^>]*PartName="/${ten.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*/>`, "g"), "");
    zip.file("[Content_Types].xml", x);
  }
  return soXoa;
}

/** Xoá chú thích cuối trang / cuối tài liệu / bình luận có mã thuộc khối đã xoá */
async function xoaTheoMa(zip: JSZip, phan: string, the: string, ma: Set<string>): Promise<void> {
  if (ma.size === 0) return;
  const f = zip.file(phan);
  if (!f) return;
  const d = new DOMParser().parseFromString(await f.async("string"), "text/xml") as unknown as Document;
  const ds = d.getElementsByTagName(the);
  for (let i = ds.length - 1; i >= 0; i--) {
    const el = ds[i] as El;
    if (ma.has(el.getAttribute("w:id") ?? "")) el.parentNode?.removeChild(el);
  }
  zip.file(phan, new XMLSerializer().serializeToString(d as unknown as Node));
}

function maTrongKhoi(khoi: El[], the: string): Set<string> {
  const s = new Set<string>();
  for (const k of khoi) {
    const ds = k.getElementsByTagName(the);
    for (let i = 0; i < ds.length; i++) {
      const id = (ds[i] as El).getAttribute("w:id");
      if (id) s.add(id);
    }
  }
  return s;
}

/** Cắt chương mật. Ném LoiCatChuong khi không cắt được an toàn. */
export async function catChuongMat(buf: Buffer, tc: TuyChonCat): Promise<KetQuaCat> {
  if (tc.mat.length === 0) throw new LoiCatChuong("chưa khai chương mật");
  const { zip, doc, body } = await moGoi(buf);
  const biet = tc.biet.map(gocTenChuong).filter((g) => g.length >= 4 && !tc.mat.some((m) => g.startsWith(m)));
  const laRanhGioi = (chu: string, soMat: number | null): boolean => {
    const so = soLaMa(chu);
    if (so !== null && soMat !== null && so <= soMat) return false;
    if (biet.length > 0) {
      const g = gocTenChuong(chu);
      return biet.some((b) => g.startsWith(b));
    }
    return so !== null;
  };

  const xoa: El[] = [];
  const chuongDaCat: string[] = [];
  let dangCat = false;
  let soMat: number | null = null;
  let viTriChen: El | null = null;
  for (const el of conCapNgoai(body)) {
    if (el.nodeName === "w:sectPr") continue;
    const chu = chuTieuDe(el);
    if (chu && laMat(chu, tc.mat)) {
      dangCat = true;
      soMat = Math.max(soMat ?? 0, soLaMa(chu) ?? 0) || null;
      chuongDaCat.push(chu);
    } else if (dangCat && chu && laRanhGioi(chu, soMat)) {
      dangCat = false;
    }
    if (dangCat) {
      if (!viTriChen) viTriChen = el;
      xoa.push(el);
    }
  }
  if (chuongDaCat.length === 0) throw new LoiCatChuong("không thấy chương mật nào trong tệp");
  for (const k of xoa) if (k.getElementsByTagName("w:dataBinding").length > 0) throw new LoiCatChuong("chương mật có ô liên kết dữ liệu ẩn");

  const maChuThich = maTrongKhoi(xoa, "w:footnoteReference");
  const maCuoi = maTrongKhoi(xoa, "w:endnoteReference");
  const maBinhLuan = new Set([...Array.from(maTrongKhoi(xoa, "w:commentReference")), ...Array.from(maTrongKhoi(xoa, "w:commentRangeStart"))]);

  // Đoạn thay thế ngay chỗ cắt
  const p = doc.createElementNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "w:p");
  const r = doc.createElementNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "w:r");
  const rPr = doc.createElementNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "w:rPr");
  rPr.appendChild(doc.createElementNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "w:i"));
  const t = doc.createElementNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "w:t");
  t.setAttribute("xml:space", "preserve");
  t.appendChild(doc.createTextNode(`(Phần số liệu tài chính đã ẩn) ${tc.cau_tu_choi}`));
  r.appendChild(rPr);
  r.appendChild(t);
  p.appendChild(r);
  body.insertBefore(p, viTriChen);
  for (const k of xoa) body.removeChild(k);

  // Soát lần cuối: chữ còn lại không được chứa tên chương mật
  const conLai = boDauHoa(chuCua(body));
  const lot = tc.mat.find((m) => conLai.includes(m));
  if (lot) throw new LoiCatChuong(`cắt xong vẫn còn chữ của chương mật (${lot.toLowerCase()})`);

  const xmlThan = new XMLSerializer().serializeToString(doc as unknown as Node);
  zip.file("word/document.xml", xmlThan);
  await xoaTheoMa(zip, "word/footnotes.xml", "w:footnote", maChuThich);
  await xoaTheoMa(zip, "word/endnotes.xml", "w:endnote", maCuoi);
  await xoaTheoMa(zip, "word/comments.xml", "w:comment", maBinhLuan);
  const soPhan = await xoaPhanMoCoi(zip, xmlThan);
  const ra = (await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" })) as Buffer;
  return { buf: ra, chuong_da_cat: chuongDaCat, so_khoi_xoa: xoa.length, so_phan_xoa: soPhan };
}
