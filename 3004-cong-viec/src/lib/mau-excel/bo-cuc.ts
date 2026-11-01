// ============================================================
// mau-excel/bo-cuc.ts — BỐ CỤC MẪU BÁO CÁO rút từ file Word mẫu (Mr. Đại chốt 22/10/2026: báo cáo tuần nộp bằng .xlsx).
// Word mẫu vẫn là NGUỒN của nội dung mẫu (đã có 12 mẫu, quản trị đã quen sửa): máy đi lần lượt thân tài liệu, giữ đúng thứ tự
//   chữ đầu trang → ô nhập → chương → bảng gắn mã (dòng in sẵn, dòng nhóm, danh sách chọn) → bảng không gắn mã (lưới chữ),
// rồi dung-excel.ts vẽ đúng thứ tự đó xuống MỘT tờ Excel xếp dọc. Bản ví dụ (số liệu tuần 29) đi cùng đường → tờ «Ví dụ đã điền».
// Ghi chú cuối mẫu Word («Ghi chú cho người lập báo cáo…») không vẽ vào tờ để ghi — chuyển sang tờ «Hướng dẫn».
// ============================================================
import JSZip from "jszip";
import {
  chu,
  con,
  conTen,
  docSdt,
  dongCuaBang,
  giaTriSdt,
  laBangSoLieu,
  laOGopTiep,
  laTieuDe,
  oCuaDong,
  phanTich,
  sdtTrong,
  tagBangCuaTbl,
  ten,
  thuocTinh,
  timBang,
  chuanHoaMaMau,
  type Nut,
} from "@/lib/kiem-tra/doc-word";
import type { DinhNghiaMau, MauWord } from "@/lib/types";

/** Định nghĩa mẫu kèm danh sách bảng (trường `bang` có trong mau-word/dinh-nghia.json, chưa khai ở DinhNghiaMau). */
export type DinhNghiaCoBang = DinhNghiaMau & {
  bang?: { tag: string; nhan: string; so_lieu?: boolean | null; cot: { tag: string; nhan: string }[] }[];
};

/** Một ô của hàng lưới (bảng không gắn mã): chữ in sẵn, hoặc ô nhập gắn mã. `rong` = số cột gộp (gridSpan). */
export interface OLuoi {
  chu: string;
  o?: string;
  ds?: string[];
  rong?: number;
}

export interface CotBang {
  tag: string;
  nhan: string;
  ds?: string[];
}

export type DongBang = { nhom: string } | { gt: Record<string, string> };

export type Khoi =
  | { loai: "chu"; chu: string; dam?: boolean }
  | { loai: "o"; tag: string; nhan: string; gia_tri: string; ds?: string[] }
  | { loai: "hang"; o: OLuoi[] }
  | { loai: "chuong"; chu: string }
  | {
      loai: "bang";
      tag: string;
      so_lieu: boolean;
      co_nhom: boolean;
      cot: CotBang[];
      dong: DongBang[];
      /** Hàng tên cột tầng trên (bảng hai tầng tiêu đề, vd Form 8: «Tuần … | Tháng … | Cả năm») — chỉ để người đọc */
      tren?: OLuoi[];
    };

export interface BoCuc {
  mau_ma: string | null;
  khoi: Khoi[];
  /** Ghi chú cuối mẫu Word — đưa sang tờ Hướng dẫn */
  ghi_chu: string[];
  /** Mẫu Word in A4 NGANG (Form 4 Phòng TCKT) — tệp Excel in theo đúng hướng giấy của Word gốc; không có Word thì dọc */
  ngang?: boolean;
}

const DAU_GHI_CHU = /^Ghi chú cho người lập báo cáo/i;
const TAG_NHOM = "nhom";

/** Danh sách chọn (dropDownList / comboBox) của các sdt trong một nút. */
function danhSachChon(n: Nut | undefined): string[] {
  if (!n) return [];
  const kq: string[] = [];
  const di = (x: Nut) => {
    for (const c of con(x)) {
      const t = ten(c);
      if (t === "listItem") {
        const v = (thuocTinh(c, "displayText") ?? thuocTinh(c, "value") ?? "").trim();
        if (v && !kq.includes(v)) kq.push(v);
        continue;
      }
      di(c);
    }
  };
  di(n);
  return kq;
}

function rongO(tc: Nut): number {
  const pr = conTen(tc, "tcPr");
  const g = pr ? conTen(pr, "gridSpan") : undefined;
  const n = Number(thuocTinh(g, "val") ?? 1);
  return Number.isFinite(n) && n > 1 ? n : 1;
}

/** "Chọn" / "Chọn một mục" / "Bấm để nhập" — chữ nhắc của ô Word, không phải giá trị. */
const laChuNhac = (v: string) => /^(chọn( một mục)?|choose an item\.?|bấm (vào )?đây để nhập.*|click or tap.*)$/i.test(v.trim());

// ---------------- bảng gắn mã ----------------

function boCucBang(tbls: Nut[], tag: string, dn?: DinhNghiaCoBang): Extract<Khoi, { loai: "bang" }> {
  const dinh = (dn?.bang ?? []).find((b) => b.tag === tag);
  const coNhom = !!dinh?.cot.some((c) => c.tag === TAG_NHOM);
  type O = { tag: string | null; v: string; ds: string[]; gop: boolean; rong: number };
  const hang: O[][] = [];
  for (const tbl of tbls)
    for (const tr of dongCuaBang(tbl))
      hang.push(
        oCuaDong(tr).map(({ tc, sdtBoc }) => {
          const trong = sdtTrong(tc);
          let tagO: string | null = trong[0]?.tag ?? null;
          let v = trong.length ? trong.map((s) => giaTriSdt(s, true)).join(" ").trim() : chu(tc, true);
          if (!tagO && sdtBoc) tagO = docSdt(sdtBoc).tag;
          if (!trong.length && sdtBoc) v = chu(tc, true);
          const ds = danhSachChon(tc).concat(sdtBoc ? danhSachChon(conTen(sdtBoc, "sdtPr")) : []);
          if (ds.length && laChuNhac(v)) v = "";
          return { tag: tagO, v: v.replace(/\t/g, " ").trim(), ds, gop: laOGopTiep(tc), rong: rongO(tc) };
        }),
      );
  // Dòng tiêu đề: các dòng đầu không có ô gắn mã — lấy dòng có nhiều ô nhất làm tên cột
  let i = 0;
  while (i < hang.length && !hang[i].some((o) => o.tag)) i++;
  const dau = hang.slice(0, Math.max(i, 1));
  const tieuDe = dau.reduce((a, b) => (b.length > a.length ? b : a), dau[0] ?? []);
  const du = hang.slice(i);
  // Nghĩa từng cột theo vị trí: tag xuất hiện nhiều nhất ở cột đó
  const dem: Record<number, Record<string, number>> = {};
  for (const h of du)
    h.forEach((o, k) => {
      if (o.tag && o.tag !== TAG_NHOM) (dem[k] ??= {})[o.tag] = (dem[k][o.tag] ?? 0) + 1;
    });
  const soCot = Math.max(tieuDe.length, ...du.map((h) => h.length), 0);
  const cot: CotBang[] = [];
  for (let k = 0; k < soCot; k++) {
    const tagK = Object.entries(dem[k] ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0];
    const nhan = tieuDe[k]?.v || dinh?.cot.find((c) => c.tag === tagK)?.nhan || tagK || `Cột ${k + 1}`;
    const tagCot = tagK ?? dinh?.cot.find((c) => c.nhan.trim().toLowerCase() === nhan.trim().toLowerCase())?.tag ?? `cot_${k + 1}`;
    const ds = Array.from(new Set(du.flatMap((h) => h[k]?.ds ?? [])));
    cot.push({ tag: tagCot, nhan, ...(ds.length ? { ds } : {}) });
  }
  const dong: DongBang[] = [];
  let truoc: Record<string, string> = {};
  for (const h of du) {
    const laNhom = h.some((o) => o.tag === TAG_NHOM) || (coNhom && h.length > 1 && !!h[0]?.v && h.slice(1).every((o) => !o.v && !o.tag));
    if (laNhom) {
      dong.push({ nhom: h[0]?.v ?? "" });
      continue;
    }
    const gt: Record<string, string> = {};
    h.forEach((o, k) => {
      const t = cot[k]?.tag;
      if (t) gt[t] = !o.v && o.gop ? (truoc[t] ?? "") : o.v;
    });
    dong.push({ gt });
    truoc = gt;
  }
  const tren = dau.length > 1 && dau[0] !== tieuDe ? dau[0].map((o) => ({ chu: o.v, ...(o.rong > 1 ? { rong: o.rong } : {}) })) : undefined;
  return { loai: "bang", tag, so_lieu: tbls.some(laBangSoLieu) || !!dinh?.so_lieu, co_nhom: coNhom, cot, dong, ...(tren ? { tren } : {}) };
}

// ---------------- chữ / ô nhập ngoài bảng gắn mã ----------------

type Muc = { chu: string } | { o: string; v: string; ds: string[] } | { mau: string };

/** Đi một nút theo thứ tự đọc, tách chữ thường và ô nhập gắn mã (kể cả ô nằm giữa một đoạn: "Gửi: [ô]"). */
function mucCua(n: Nut): Muc[] {
  const kq: Muc[] = [];
  let dem = "";
  const xa = () => {
    const s = dem.replace(/[ \t]+/g, " ").trim();
    if (s) kq.push({ chu: s });
    dem = "";
  };
  const di = (x: Nut) => {
    for (const c of con(x)) {
      const t = ten(c);
      if (t === "sdt") {
        const s = docSdt(c);
        const mau = s.tag ? /^mau_ma[:=](.+)$/i.exec(s.tag) : null;
        if (mau) {
          xa();
          kq.push({ mau: mau[1].trim() });
          if (s.noiDung) di(s.noiDung);
          xa();
          continue;
        }
        if (s.tag) {
          xa();
          kq.push({ o: s.tag, v: giaTriSdt(s).replace(/\n+/g, " ").trim(), ds: danhSachChon(conTen(c, "sdtPr")) });
          continue;
        }
        if (s.noiDung) di(s.noiDung);
        continue;
      }
      if (t === "t") {
        dem += c.textContent ?? "";
        continue;
      }
      if (t === "tab") {
        dem += " ";
        continue;
      }
      if (t === "br" || t === "cr") {
        xa();
        continue;
      }
      if (t === "del" || t === "delText" || t === "instrText" || t === "Fallback" || t.endsWith("Pr")) continue;
      di(c);
      if (t === "p") xa();
    }
  };
  di(n);
  xa();
  return kq;
}

function nhanO(tag: string, dn?: DinhNghiaCoBang): string {
  return dn?.o_nhap.find((o) => o.tag === tag)?.nhan ?? tag;
}

/** Ô nhập: nhãn lấy từ chữ đứng ngay trước nếu chữ đó kết thúc bằng ":" ("Gửi:", "Kỳ báo cáo:"), không thì nhãn định nghĩa. */
function themMuc(ds: Muc[], ra: Khoi[], dn: DinhNghiaCoBang | undefined, ghi: (ma: string) => void) {
  for (let k = 0; k < ds.length; k++) {
    const m = ds[k];
    if ("mau" in m) {
      ghi(m.mau);
      continue;
    }
    if ("o" in m) {
      ra.push({ loai: "o", tag: m.o, nhan: nhanO(m.o, dn), gia_tri: laChuNhac(m.v) ? "" : m.v, ...(m.ds.length ? { ds: m.ds } : {}) });
      continue;
    }
    const sau = ds[k + 1];
    if (sau && "o" in sau && /:\s*$/.test(m.chu)) {
      ra.push({ loai: "o", tag: sau.o, nhan: m.chu.replace(/\s*:\s*$/, ""), gia_tri: laChuNhac(sau.v) ? "" : sau.v, ...(sau.ds.length ? { ds: sau.ds } : {}) });
      k++;
      continue;
    }
    ra.push({ loai: "chu", chu: m.chu });
  }
}

/** Bảng không gắn mã: hàng đơn giản (mỗi ô là chữ HOẶC một ô nhập) giữ lưới; hàng phức tạp (khung tiêu đề) trải thành từng dòng. */
function boCucLuoi(tbl: Nut, ra: Khoi[], dn: DinhNghiaCoBang | undefined, ghi: (ma: string) => void) {
  for (const tr of dongCuaBang(tbl)) {
    const o = oCuaDong(tr).map(({ tc }) => ({ muc: mucCua(tc), rong: rongO(tc) }));
    const donGian = o.every((x) => x.muc.length <= 1 && !x.muc.some((m) => "mau" in m));
    if (donGian) {
      if (o.every((x) => x.muc.length === 0)) continue;
      ra.push({
        loai: "hang",
        o: o.map((x) => {
          const m = x.muc[0];
          const rong = x.rong > 1 ? { rong: x.rong } : {};
          if (m && "o" in m) return { chu: laChuNhac(m.v) ? "" : m.v, o: m.o, ...(m.ds.length ? { ds: m.ds } : {}), ...rong };
          return { chu: m && "chu" in m ? m.chu : "", ...rong };
        }),
      });
      continue;
    }
    for (const x of o) themMuc(x.muc, ra, dn, ghi);
  }
}

/** Bố cục của một file Word mẫu (bản trắng hoặc bản ví dụ). `dn` cho nhãn ô nhập, cột nhóm của bảng. */
export async function boCucTuWord(buf: Buffer, dn?: DinhNghiaCoBang): Promise<BoCuc> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buf);
  } catch {
    throw new Error("File mẫu không phải Word .docx");
  }
  const el = zip.file("word/document.xml");
  if (!el) throw new Error("File mẫu không phải Word .docx (thiếu word/document.xml)");
  const xml = await el.async("string");
  const goc = phanTich(xml);
  const body = conTen(goc, "body") ?? goc;
  const kq: BoCuc = { mau_ma: null, khoi: [], ghi_chu: [] };
  const kho = /<w:pgSz [^>]*?w:w="(\d+)"[^>]*?w:h="(\d+)"/.exec(xml);
  if (kho && Number(kho[1]) > Number(kho[2])) kq.ngang = true;
  const ghi = (ma: string) => {
    kq.mau_ma ??= chuanHoaMaMau(ma);
  };
  let cuoi = false;
  const di = (n: Nut) => {
    for (const c of con(n)) {
      const t = ten(c);
      if (t === "sectPr") continue;
      if (cuoi) {
        const s = chu(c);
        if (s) kq.ghi_chu.push(...s.split("\n").map((x) => x.trim()).filter(Boolean));
        continue;
      }
      if (t === "p") {
        const s = chu(c);
        if (!s && !sdtTrong(c).length) continue;
        if (DAU_GHI_CHU.test(s.trim())) {
          cuoi = true;
          kq.ghi_chu.push(s.trim());
          continue;
        }
        if (laTieuDe(c, s) && !sdtTrong(c).length) kq.khoi.push({ loai: "chuong", chu: s.trim() });
        else themMuc(mucCua(c), kq.khoi, dn, ghi);
        continue;
      }
      if (t === "sdt") {
        const s = docSdt(c);
        const bang = s.noiDung ? timBang(s.noiDung) : [];
        if (s.tag && bang.length) {
          kq.khoi.push(boCucBang(bang, s.tag, dn));
          continue;
        }
        if (s.tag) {
          themMuc(mucCua(c), kq.khoi, dn, ghi);
          continue;
        }
        if (s.noiDung) di(s.noiDung);
        continue;
      }
      if (t === "tbl") {
        const tag = tagBangCuaTbl(c);
        if (tag) kq.khoi.push(boCucBang([c], tag, dn));
        else boCucLuoi(c, kq.khoi, dn, ghi);
        continue;
      }
      di(c);
    }
  };
  di(body);
  // Thuộc tính tài liệu SCI_MauMa (nguồn nhận mẫu thứ hai)
  if (!kq.mau_ma) {
    const custom = zip.file("docProps/custom.xml");
    const m = custom ? /name="SCI_MauMa"[^>]*>\s*<vt:lpwstr>([^<]+)<\/vt:lpwstr>/.exec(await custom.async("string")) : null;
    if (m) kq.mau_ma = chuanHoaMaMau(m[1]);
  }
  return kq;
}

/**
 * Bố cục khi mẫu KHÔNG có file Word (mẫu khai mới bằng định nghĩa): ô nhập ở đầu, mỗi bảng của định nghĩa là một chương
 * theo đúng thứ tự định nghĩa.
 */
export function boCucTuDinhNghia(m: Pick<MauWord, "ma" | "ten"> & { dinh_nghia: DinhNghiaCoBang }): BoCuc {
  const dn = m.dinh_nghia;
  const khoi: Khoi[] = [{ loai: "chu", chu: m.ten.toLocaleUpperCase("vi-VN"), dam: true }];
  for (const o of dn.o_nhap) if (o.tag !== "mau_ma") khoi.push({ loai: "o", tag: o.tag, nhan: o.nhan, gia_tri: "", ...(o.lua_chon?.length ? { ds: o.lua_chon } : {}) });
  // Mẫu khai theo nghĩa (cau_truc) có chương; mẫu cũ chỉ có danh sách bảng
  const chuong: { tieu_de: string; bang: { tag: string; so_lieu: boolean; cot: { tag: string; nhan: string }[] }[] }[] = dn.cau_truc?.chuong.length
    ? dn.cau_truc.chuong.map((c) => ({ tieu_de: c.tieu_de, bang: c.bang.map((b) => ({ tag: b.tag, so_lieu: b.nghia === "so_lieu", cot: b.cot.map((x) => ({ tag: x.tag, nhan: x.tieu_de })) })) }))
    : (dn.bang ?? []).map((b) => ({ tieu_de: b.nhan, bang: [{ tag: b.tag, so_lieu: !!b.so_lieu, cot: b.cot }] }));
  for (const c of chuong) {
    khoi.push({ loai: "chuong", chu: c.tieu_de });
    for (const b of c.bang)
      khoi.push({
        loai: "bang",
        tag: b.tag,
        so_lieu: b.so_lieu,
        co_nhom: b.cot.some((x) => x.tag === TAG_NHOM),
        cot: b.cot.filter((x) => x.tag !== TAG_NHOM),
        dong: [],
      });
  }
  return { mau_ma: m.ma, khoi, ghi_chu: [] };
}
