// ============================================================
// kiem-tra/gan-nhan.ts — GẮN NHÃN BẰNG CODE cho file Word thường theo cấu trúc mẫu khai theo nghĩa
// (Khai báo mẫu báo cáo không cần sửa code — Đợt B, Mr. Đại duyệt 01/10/2026; MD mục 4.1 bước 5, nguyên tắc 2:
//  "LLM đề xuất, CODE gắn nhãn" — cùng file + cùng cau_truc luôn ra cùng một file, không để LLM sửa XML).
//   1. Gỡ mọi nhãn cũ (người quản trị hay sửa thẳng trên file mẫu đã có nhãn rồi tải lên).
//   2. Dấu nhận mẫu `mau_ma:<mã>` (khoá) bọc dòng "BÁO CÁO …"; dòng ngay dưới = "Đơn vị lập".
//   3. Ô "Kỳ báo cáo" (+ hộp tích ☐/☒ Tuần · Tháng · Quý) nếu file có.
//   4. Mỗi bảng khai trong cau_truc: bảng thứ k ngay dưới tiêu đề chương → caption + bọc bảng (tag bảng);
//      cột ghép theo CHỮ TIÊU ĐỀ CỘT; mỗi ô dữ liệu bọc bằng tag cột.
//   5. Ghi thuộc tính SCI_MauMa vào file.
// Dùng lại hàm nhỏ đã kiểm chứng của scripts/chuyen-mau-that.mjs (như nhan-mau-goc.ts). Chỉ chạy ở server.
// ============================================================
import JSZip from "jszip";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import {
  W,
  boc,
  bocO,
  boSo,
  cells,
  chu,
  conPT,
  conTen,
  datThuocTinhMau,
  khongDau,
  laTieuDe,
  rows,
  tachRun,
  taoPT,
  tatCa,
  ten,
  themCaption,
} from "../../../scripts/chuyen-mau-that.mjs";
import type { CauTrucMau, CotMau, ONhapMau } from "@/lib/types";

export interface KetQuaGanNhan {
  buf: Buffer;
  /** ô nhập đầu mẫu đã gắn (mau_ma, don_vi_lap, ky_bao_cao) */
  o_nhap: ONhapMau[];
  /** đã gắn gì — hiện cho người duyệt */
  bao_cao: string[];
  /** khai mà không tìm thấy trên file (chặn lưu) */
  thieu: string[];
  /** ô nhập phiên bản trước còn trên file, giữ nguyên nhãn */
  o_nhap_giu: string[];
  /** bảng số liệu file tải lên không còn nhãn cũ → chỉ gắn lại nhãn bảng, nhãn cột mất (luật trỏ cột đó sẽ tắt) */
  mat_nhan_cot: { bang: string; tieu_de: string; cot: string[] }[];
}

/** Tiêu đề chương: đoạn in đậm đánh số "I. …" / "A1. …" hoặc kiểu Heading — DÙNG CHUNG cho gắn nhãn và khung đưa AI (Đợt C). */
const laKhoiTieuDe = (k: unknown) => ten(k) === "p" && (laTieuDe(k) || /^heading/i.test(conTen(conTen(k, "pPr") ?? k, "pStyle")?.getAttributeNS(W, "val") ?? ""));

const so = (s: string) => khongDau(boSo(s)).replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

type NutXml = { parentNode: NutXml | null; insertBefore: (a: unknown, b: unknown) => void; removeChild: (a: unknown) => void };

/** Bảng của một khối thân văn bản: chính nó (w:tbl) hoặc bảng nằm trong w:sdt bọc bảng. */
function bangCuaKhoi(k: unknown): unknown | null {
  if (ten(k) === "tbl") return k;
  if (ten(k) !== "sdt") return null;
  const nd = conTen(k, "sdtContent");
  return nd ? (conPT(nd).find((x) => ten(x) === "tbl") ?? null) : null;
}
/** Tag hiện có của bảng: caption, hoặc tag của w:sdt bọc bảng (dạng bang_…). */
function tagCoSan(tbl: unknown): string | null {
  const cap = conTen(conTen(tbl, "tblPr") ?? tbl, "tblCaption")?.getAttributeNS(W, "val");
  if (cap) return cap;
  const sdt = (tbl as NutXml).parentNode?.parentNode;
  const t = sdt && ten(sdt) === "sdt" ? tatCa(conTen(sdt, "sdtPr") ?? sdt, "tag")[0]?.getAttributeNS(W, "val") : null;
  return t && /^bang_/.test(t) ? t : null;
}
const tagOCot = (tc: unknown): string => tatCa(tc, "tag")[0]?.getAttributeNS(W, "val") ?? "";
/** Cột đã gắn nhãn của bảng (dòng dữ liệu đầu tiên có nhãn, tiêu đề = dòng ngay trên). */
function cotCoSan(tbl: unknown): { tag: string; tieu_de: string }[] {
  const hang = rows(tbl);
  const iMau = hang.findIndex((tr) => cells(tr).some((tc) => tagOCot(tc)));
  if (iMau < 0) return [];
  const dau = iMau > 0 ? cells(hang[iMau - 1]) : [];
  const ra: { tag: string; tieu_de: string }[] = [];
  const da = new Set<string>();
  for (const tr of hang.slice(iMau))
    cells(tr).forEach((tc, j) => {
      const t = tagOCot(tc);
      if (t && !da.has(t)) {
        da.add(t);
        ra.push({ tag: t, tieu_de: (dau[j] ? chu(dau[j]).replace(/\s+/g, " ").trim() : "") || t });
      }
    });
  return ra;
}

/**
 * Gỡ nhãn cũ: mở mọi w:sdt (giữ nguyên nội dung), xoá caption bảng. `giu`: các bảng GIỮ NGUYÊN nhãn
 * (bảng số liệu còn nhãn cũ — luật kiểm tra đang trỏ vào tag ô của chúng; đo 01/10: 59 luật code trên 18 bảng số liệu).
 */
function goNhan(doc: unknown, giu: Set<unknown> = new Set(), giuTag: Set<string> = new Set()) {
  const d = doc as { getElementsByTagNameNS: (ns: string, t: string) => ArrayLike<unknown> };
  const trongGiu = (n: unknown) => {
    for (let p = n as NutXml | null; p; p = p.parentNode) if (giu.has(p)) return true;
    return false;
  };
  const tagSdt = (sdt: unknown) => tatCa(conTen(sdt, "sdtPr") ?? sdt, "tag")[0]?.getAttributeNS(W, "val") ?? "";
  const boGiu = (sdt: unknown) => trongGiu(sdt) || (giu.size > 0 && giu.has(bangCuaKhoi(sdt))) || (giuTag.size > 0 && giuTag.has(tagSdt(sdt)));
  let sdts = Array.from(d.getElementsByTagNameNS(W, "sdt")).filter((s) => !boGiu(s));
  while (sdts.length) {
    for (const sdt of sdts as NutXml[]) {
      const nd = conTen(sdt, "sdtContent");
      if (nd) for (const c of conPT(nd)) sdt.parentNode!.insertBefore(c, sdt);
      sdt.parentNode!.removeChild(sdt);
    }
    sdts = Array.from(d.getElementsByTagNameNS(W, "sdt")).filter((s) => !boGiu(s));
  }
  for (const c of Array.from(d.getElementsByTagNameNS(W, "tblCaption")) as NutXml[]) if (!trongGiu(c)) c.parentNode!.removeChild(c);
}

/** Bọc ký tự ☐/☒ đầu run thành hộp tích Tuần / Tháng / Quý (như chuyen-mau-that bước 2). */
function hopTich(doc: unknown, vung: unknown) {
  for (const r of tatCa(vung, "r")) {
    const t = conTen(r, "t");
    if (!t || !/^[☐☒]/.test(t.textContent)) continue;
    const sau = t.textContent.slice(1);
    const chon = t.textContent[0] === "☒";
    const loai = /th[aá]ng/i.test(sau) ? "thang" : /qu[yý]/i.test(sau) ? "quy" : "tuan";
    const r1 = sau ? tachRun(doc, r, 1)[0] : r;
    boc(doc, [r1], `ky_chon_${loai}`, `Chọn kỳ ${loai}`, { loai: "checkbox", checked: chon, rPr: conTen(r1, "rPr") ?? undefined });
  }
}

/** `giuO`: tag ô nhập của phiên bản trước mà máy không tự dựng lại (vd "gui_den") — còn trên file thì giữ nguyên. */
export async function ganNhanTheoCauTruc(bufGoc: Buffer, ma: string, ct: CauTrucMau, giuO: string[] = []): Promise<KetQuaGanNhan> {
  const zip = await JSZip.loadAsync(bufGoc);
  const tepXml = zip.file("word/document.xml");
  if (!tepXml) throw new Error("File không phải Word (.docx) hợp lệ");
  const doc = new DOMParser().parseFromString(await tepXml.async("string"), "text/xml");
  const body = doc.getElementsByTagNameNS(W, "body")[0];
  const bao: string[] = [];
  const thieu: string[] = [];
  const oNhap: ONhapMau[] = [];
  const matNhanCot: KetQuaGanNhan["mat_nhan_cot"] = [];
  // bảng số liệu còn đúng tag khai → giữ nguyên toàn bộ nhãn của bảng đó
  const tagSoLieu = new Set(ct.chuong.flatMap((c) => c.bang.filter((b) => b.nghia === "so_lieu").map((b) => b.tag)));
  const tagCu = new Map<unknown, string | null>(tatCa(body, "tbl").map((t) => [t, tagCoSan(t)]));
  const giu = new Set(Array.from(tagCu).filter(([, t]) => t && tagSoLieu.has(t)).map(([tbl]) => tbl));
  const tuDung = new Set(["mau_ma", "don_vi_lap", "ky_bao_cao"]);
  const giuTag = new Set(giuO.filter((t) => !tuDung.has(t) && !/^ky_chon_/.test(t)));
  const oGiu = new Set(tatCa(body, "sdt").map((x) => tatCa(conTen(x, "sdtPr") ?? x, "tag")[0]?.getAttributeNS(W, "val") ?? "").filter((t) => giuTag.has(t)));
  goNhan(doc, giu, giuTag);

  // 2. Dấu nhận mẫu + đơn vị lập
  const doan = tatCa(body, "p");
  const iTieuDe = doan.findIndex((p) => /^BÁO CÁO/i.test(chu(p).normalize("NFC").trim()));
  if (iTieuDe < 0) thieu.push('Không thấy dòng tiêu đề "BÁO CÁO …" ở đầu file — cần có để máy nhận ra mẫu');
  else {
    const pTieuDe = doan[iTieuDe];
    const sdt = boc(doc, [pTieuDe], `mau_ma:${ma}`, "Dấu nhận mẫu — không xoá");
    tatCa(sdt, "sdtPr")[0].appendChild(taoPT(doc, "lock", { val: "sdtLocked" }));
    oNhap.push({ tag: "mau_ma", nhan: "Mã mẫu (dấu nhận mẫu ẩn ở tiêu đề)", bat_buoc: true, kieu: "chu", ...({ luat: "dung_mau" } as object) });
    bao.push(`Dấu nhận mẫu "${ma}" ở dòng "${chu(pTieuDe).slice(0, 60)}"`);
    const pDv = doan.slice(iTieuDe + 1, iTieuDe + 4).find((p) => p.parentNode === pTieuDe.parentNode || p.parentNode === sdt.parentNode ? chu(p).trim() : false);
    if (pDv && !/k[yỳ] b[aá]o c[aá]o/i.test(chu(pDv))) {
      boc(doc, [pDv], "don_vi_lap", "Đơn vị lập");
      oNhap.push({ tag: "don_vi_lap", nhan: "Đơn vị lập", bat_buoc: false, kieu: "don_vi", ...({ luat: "dung_mau" } as object) });
      bao.push(`Đơn vị lập: "${chu(pDv).slice(0, 60)}"`);
    }
  }

  // 3. Kỳ báo cáo (ô bảng "Kỳ báo cáo" | giá trị, hoặc đoạn "Kỳ báo cáo: ☐ Tuần …")
  let coKy = false;
  for (const tc of tatCa(body, "tc")) {
    if (coKy || !/^k[yỳ] b[aá]o c[aá]o\s*:?\s*$/i.test(chu(tc).normalize("NFC").trim())) continue;
    const tr = tc.parentNode;
    const cs = cells(tr);
    const giaTri = cs[cs.indexOf(tc) + 1];
    if (!giaTri) continue;
    const sdt = bocO(doc, giaTri, "ky_bao_cao", "Kỳ báo cáo");
    hopTich(doc, sdt);
    coKy = true;
  }
  if (!coKy) {
    const p = tatCa(body, "p").find((x) => /^k[yỳ] b[aá]o c[aá]o\s*:/i.test(chu(x).normalize("NFC").trim()));
    if (p) {
      hopTich(doc, p);
      boc(doc, [p], "ky_bao_cao", "Kỳ báo cáo");
      coKy = true;
    }
  }
  if (coKy) {
    oNhap.push({ tag: "ky_bao_cao", nhan: "Kỳ báo cáo", bat_buoc: true, kieu: "chu", ...({ luat: "ky_bao_cao" } as object) });
    bao.push("Kỳ báo cáo (hộp tích Tuần / Tháng)");
  } else thieu.push('Không thấy ô "Kỳ báo cáo" — máy cần ô này để biết báo cáo tuần/tháng nào');

  // 4. Chương + bảng theo thứ tự trong thân văn bản
  const khoi = conPT(body);
  const viTriTieuDe = khoi.map((k, i) => (laKhoiTieuDe(k) ? i : -1)).filter((i) => i >= 0);
  for (const c of ct.chuong) {
    const khoa = so(c.tieu_de);
    const iTd = viTriTieuDe.find((i) => {
      const t = so(chu(khoi[i]));
      return t === khoa || (khoa.length >= 8 && t.includes(khoa));
    });
    if (iTd === undefined) {
      if (c.bat_buoc || c.bang.length) thieu.push(`Không thấy chương "${c.tieu_de}"`);
      continue;
    }
    if (!c.bang.length) continue;
    const iSau = viTriTieuDe.find((i) => i > iTd) ?? khoi.length;
    const bangTrong = khoi.slice(iTd + 1, iSau).map(bangCuaKhoi).filter(Boolean);
    c.bang.forEach((b, k) => {
      const tbl = bangTrong[k];
      if (!tbl) return void thieu.push(`Chương "${c.tieu_de}": không thấy bảng thứ ${k + 1} ("${b.tieu_de}")`);
      const laSoLieu = b.nghia === "so_lieu";
      if (laSoLieu) {
        if (!b.tag) return void bao.push(`Bảng số liệu thứ ${k + 1} chương "${c.tieu_de}": không gắn nhãn (máy không đọc, như bản trước)`);
        if (giu.has(tbl)) {
          if (tagCu.get(tbl) === b.tag) return void bao.push(`Bảng số liệu "${b.tieu_de}" (${b.tag}): giữ nguyên nhãn cũ`);
          return void thieu.push(`Chương "${c.tieu_de}": bảng thứ ${k + 1} đang mang nhãn "${tagCu.get(tbl)}", khai là "${b.tag}"`);
        }
      }
      const hang = rows(tbl);
      // dòng tiêu đề: dòng đầu có nhiều ô khớp tên cột khai nhất (thường là dòng 1)
      const diem = (tr: unknown) => cells(tr).filter((tc) => b.cot.some((x) => so(x.tieu_de) && so(chu(tc)) === so(x.tieu_de))).length;
      let iDau = 0;
      for (let r = 0; r < Math.min(3, hang.length); r++) if (diem(hang[r]) > diem(hang[iDau])) iDau = r;
      const tieuDe = hang[iDau] ? cells(hang[iDau]).map((tc) => so(chu(tc))) : [];
      const cotTheoViTri = tieuDe.map((t) => b.cot.find((x) => so(x.tieu_de) === t) ?? b.cot.find((x) => so(x.tieu_de).length >= 4 && (t.includes(so(x.tieu_de)) || so(x.tieu_de).includes(t) && t.length >= 4)));
      const khongThay = b.cot.filter((x) => !cotTheoViTri.includes(x));
      // bảng số liệu: thiếu cột KHÔNG chặn — báo "mất nhãn cột" (luật kiểm tra trỏ cột đó sẽ tắt)
      if (laSoLieu) {
        if (khongThay.length) matNhanCot.push({ bang: b.tag, tieu_de: b.tieu_de, cot: khongThay.map((x) => x.tag) });
      } else for (const x of khongThay) thieu.push(`Bảng "${b.tieu_de}": không thấy cột "${x.tieu_de}"`);
      for (const tr of hang.slice(iDau + 1))
        cells(tr).forEach((tc, j) => {
          const x = cotTheoViTri[j];
          if (x) bocO(doc, tc, x.tag, x.tieu_de);
        });
      themCaption(doc, tbl, b.tag);
      boc(doc, [tbl], b.tag, b.tieu_de);
      bao.push(`Bảng "${b.tieu_de}" (${b.tag}): ${cotTheoViTri.filter(Boolean).length}/${b.cot.length} cột, ${hang.length - iDau - 1} dòng`);
    });
  }

  zip.file("word/document.xml", new XMLSerializer().serializeToString(doc));
  await datThuocTinhMau(zip, ma);
  return { buf: await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }), o_nhap: oNhap, bao_cao: bao, thieu, mat_nhan_cot: matNhanCot, o_nhap_giu: Array.from(oGiu) };
}

/** Gỡ hết nhãn — file Word thường (dùng cho kiểm thử khứ hồi và khi cần xem bản trơn). */
export async function goHetNhan(buf: Buffer): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buf);
  const doc = new DOMParser().parseFromString(await zip.file("word/document.xml")!.async("string"), "text/xml");
  goNhan(doc);
  zip.file("word/document.xml", new XMLSerializer().serializeToString(doc));
  // nguồn nhận mẫu thứ hai: thuộc tính tài liệu SCI_MauMa (doc-word.ts) — bỏ luôn để thành Word thường thật
  const custom = zip.file("docProps/custom.xml");
  if (custom) zip.file("docProps/custom.xml", (await custom.async("string")).replace(/<property [^>]*name="SCI_MauMa"[^>]*>[\s\S]*?<\/property>/, ""));
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

// ---------------- Cấu trúc của mẫu CŨ (chưa khai theo nghĩa) đọc từ chính file mẫu đang dùng (Đợt C) ----------------

/** Tag cột thật của mẫu cũ → nghĩa (cột bảng đặc biệt Tiến độ thiết kế: kiem-tra.ts COT_THAT_BANG_PHU). */
const NGHIA_TAG_CU: Record<string, CotMau["nghia"]> = {
  ten: "ten", du_an: "du_an", phu_trach: "phu_trach", bat_dau: "bat_dau", ket_thuc: "ket_thuc", ket_qua_can_co: "ket_qua_can_co",
  tinh_trang: "tinh_trang", da_xong: "tinh_trang", ma_viec: "ma_viec", han_quyet_dinh: "han_quyet_dinh",
  hang_muc: "ten", ngay_ke_hoach: "ket_thuc", pt_ht: "tinh_trang", stt: "bo_qua",
};
/** Bảng có code riêng — giữ nguyên tag cột, AI không đổi được (MD mục 2.2). */
export const BANG_DAC_BIET = new Set(["bang_tien_do_tk"]);

/**
 * Mẫu đang dùng chưa có cau_truc (11 mẫu Form 0–10): dựng "phiên bản trước" từ CHÍNH file mẫu đã gắn nhãn —
 * để bản cập nhật giữ đúng tag bảng, tag cột và bảng đặc biệt. Bảng không khai sinh việc → chỗ trống (tag "")
 * để giữ đúng thứ tự bảng trong chương.
 */
export async function cauTrucTuFileCo(
  buf: Buffer,
  dn: { bang_cong_viec: { tag: string; nhan: string; la_quyet_dinh?: boolean }[]; muc_bat_buoc: string[]; bang?: { tag: string; nhan: string; cot?: { tag: string; nhan: string }[] }[] },
): Promise<CauTrucMau> {
  const zip = await JSZip.loadAsync(buf);
  const doc = new DOMParser().parseFromString(await zip.file("word/document.xml")!.async("string"), "text/xml");
  const body = doc.getElementsByTagNameNS(W, "body")[0];
  const khai = new Map(dn.bang_cong_viec.map((b) => [b.tag, b]));
  const tagO = tagOCot;
  const chuong: CauTrucMau["chuong"] = [];
  let hien: CauTrucMau["chuong"][number] | null = null;
  for (const k of conPT(body)) {
    if (laKhoiTieuDe(k)) {
      const t = boSo(chu(k).normalize("NFC").trim());
      hien = { tieu_de: t, nghia: "thong_tin", bat_buoc: dn.muc_bat_buoc.some((m) => so(m) === so(t)), bang: [] };
      chuong.push(hien);
      continue;
    }
    const tbl = bangCuaKhoi(k);
    if (!hien || !tbl) continue;
    const cap = tagCoSan(tbl) ?? "";
    const b = khai.get(cap);
    if (!b) {
      // bảng số liệu: giữ tag bảng + tag cột (luật kiểm tra trỏ vào) — tên cột lấy từ định nghĩa cũ (màn Luật đang dùng), không có thì từ file
      if (!/^bang_/.test(cap)) hien.bang.push({ tag: "", tieu_de: "", nghia: "so_lieu", cot: [] });
      else {
        const dnB = dn.bang?.find((x) => x.tag === cap);
        const cot = dnB?.cot?.length ? dnB.cot.map((x) => ({ tag: x.tag, tieu_de: x.nhan || x.tag })) : cotCoSan(tbl);
        hien.bang.push({ tag: cap, tieu_de: dnB?.nhan || hien.tieu_de, nghia: "so_lieu", cot: cot.map((x) => ({ ...x, nghia: "them" as const })) });
      }
      continue;
    }
    const hang = rows(tbl);
    const iMau = hang.findIndex((tr) => cells(tr).some((tc) => tagO(tc)));
    const dau = hang[Math.max(0, iMau - 1)];
    const mau = hang[iMau] ?? dau;
    const daCo = new Set<string>();
    const cot: CotMau[] = [];
    cells(dau).forEach((tc, j) => {
      const tieuDe = chu(tc).replace(/\s+/g, " ").trim();
      const tag = tagO(cells(mau)[j]);
      if (!tieuDe || !tag) return;
      let n: CotMau["nghia"] = NGHIA_TAG_CU[tag] ?? "them";
      if (n !== "them" && n !== "bo_qua" && daCo.has(n)) n = "them";
      daCo.add(n);
      cot.push({ tag, tieu_de: tieuDe, nghia: n, ...(n === "them" ? { ten_them: tag } : {}) });
    });
    hien.nghia = "sinh_viec_bang";
    hien.bang.push({ tag: b.tag, tieu_de: hien.tieu_de, nghia: BANG_DAC_BIET.has(b.tag) ? "dac_biet" : b.la_quyet_dinh ? "quyet_dinh" : "sinh_viec", cot });
  }
  return { chuong };
}

// ---------------- Khung văn bản cho AI đề xuất cấu trúc (Đợt C) ----------------

export interface KhungBang {
  /** thứ tự bảng dưới chương (0, 1…) */
  vi_tri: number;
  /** chữ từng ô của dòng tiêu đề (dòng có nhiều chữ nhất trong 2 dòng đầu) */
  tieu_de_cot: string[];
  /** chữ một dòng dữ liệu đầu tiên có nội dung (rút gọn) */
  dong_mau: string[];
  so_dong: number;
  /** file tải lên còn nhãn cũ của bảng (bảng số liệu sửa trên file mẫu đã tải về) */
  tag_co_san?: string;
  cot_co_san?: { tag: string; tieu_de: string }[];
}
export interface KhungChuong {
  tieu_de: string; // đã bỏ số "III."
  tieu_de_goc: string;
  bang: KhungBang[];
  /** chữ thường (ngoài bảng) của chương, rút gọn — để AI biết chương văn xuôi */
  doan: string;
}
export interface KhungVanBan {
  tieu_de_bao_cao: string | null;
  co_ky_bao_cao: boolean;
  chuong: KhungChuong[];
}

/** Rút khung file Word (đã có nhãn hay chưa đều được — gỡ nhãn trước) theo ĐÚNG cách gắn nhãn nhìn file. */
export async function khungVanBan(buf: Buffer): Promise<KhungVanBan> {
  const zip = await JSZip.loadAsync(buf);
  const tepXml = zip.file("word/document.xml");
  if (!tepXml) throw new Error("File không phải Word (.docx) hợp lệ");
  const doc = new DOMParser().parseFromString(await tepXml.async("string"), "text/xml");
  const body = doc.getElementsByTagNameNS(W, "body")[0];
  const coSan = new Map<unknown, { tag: string; cot: { tag: string; tieu_de: string }[] }>();
  for (const t of tatCa(body, "tbl")) {
    const tag = tagCoSan(t);
    if (tag && /^bang_[a-z0-9_]+$/.test(tag)) coSan.set(t, { tag, cot: cotCoSan(t) });
  }
  goNhan(doc);
  const gon =(s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);
  const tieuDeBc = tatCa(body, "p").map((p) => chu(p).normalize("NFC").trim()).find((t) => /^BÁO CÁO/i.test(t)) ?? null;
  const coKy = tatCa(body, "p").some((p) => /^k[yỳ] b[aá]o c[aá]o/i.test(chu(p).normalize("NFC").trim()));
  const khoi = conPT(body);
  const chuong: KhungChuong[] = [];
  let hien: KhungChuong | null = null;
  for (const k of khoi) {
    if (laKhoiTieuDe(k)) {
      const t = chu(k).normalize("NFC").trim();
      hien = { tieu_de: boSo(t), tieu_de_goc: t, bang: [], doan: "" };
      chuong.push(hien);
      continue;
    }
    if (!hien) continue;
    if (ten(k) === "tbl") {
      const hang = rows(k);
      const chuO = (tr: unknown) => cells(tr).map((tc) => gon(chu(tc).replace(/\s+/g, " ").trim(), 60));
      const dem = (tr: unknown) => chuO(tr).filter(Boolean).length;
      let iDau = 0;
      for (let r = 1; r < Math.min(2, hang.length); r++) if (dem(hang[r]) > dem(hang[iDau])) iDau = r;
      const mau = hang.slice(iDau + 1).find((tr) => dem(tr) > 0);
      const cs = coSan.get(k);
      hien.bang.push({
        vi_tri: hien.bang.length, tieu_de_cot: hang[iDau] ? chuO(hang[iDau]) : [], dong_mau: mau ? chuO(mau) : [], so_dong: Math.max(0, hang.length - iDau - 1),
        ...(cs ? { tag_co_san: cs.tag, cot_co_san: cs.cot } : {}),
      });
    } else if (ten(k) === "p" && hien.doan.length < 400) {
      const t = chu(k).trim();
      if (t) hien.doan = gon(`${hien.doan} ${t}`.trim(), 400);
    }
  }
  return { tieu_de_bao_cao: tieuDeBc, co_ky_bao_cao: coKy, chuong };
}
