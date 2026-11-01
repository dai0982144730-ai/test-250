// ============================================================
// mau-excel/doc-excel.ts — ĐỌC BÁO CÁO .xlsx thành đúng khuôn NoiDungWord (Mr. Đại chốt 22/10/2026). Server-only (exceljs).
// Phần sau (luật kiểm tra, sổ cái, chuỗi việc kỳ trước, góp ý AI) không biết tệp là Word hay Excel.
//
// Máy nhận theo CHỮ, không theo vị trí — người lập chèn / đổi thứ tự cột, chèn dòng vẫn đọc đúng:
//   · mẫu: dòng «Mã mẫu: form-N» · tờ ẩn _may · (mất cả hai) tên chương khớp định nghĩa mẫu nào nhiều nhất;
//   · chương: hàng chỉ một ô có chữ, khớp tên chương của mẫu (bỏ số La Mã) — hoặc dạng «IV. …»;
//   · bảng: hàng có ≥ nửa số tên cột của bảng đó → cột nào nghĩa gì; đọc tới chương kế tiếp;
//   · ô nhập: ô có chữ đúng nhãn («Kỳ báo cáo:») → giá trị ở ô ngay bên phải (hoặc sau dấu ":" trong cùng ô).
// Chỉ đọc tờ để ghi (tên «Mẫu trắng», đổi tên thì tờ hiện đầu tiên không phải Hướng dẫn / Ví dụ).
// Những điều máy thấy mà phần sau không biết (hàng ẩn, công thức mất kết quả, chép nguyên ví dụ…) trả qua canh_bao_doc / chan_doc.
// ============================================================
import ExcelJS from "exceljs";
import type { NoiDungWord } from "@/lib/kiem-tra/doc-word";
import { chuanHoaMaMau } from "@/lib/kiem-tra/doc-word";
import { chuanHoaTieuDe, khongDau } from "@/lib/kiem-tra/chuan-hoa";
import type { DinhNghiaCoBang } from "./bo-cuc";
import { TO_GHI, TO_HUONG_DAN, TO_LOI, TO_MAY, TO_VI_DU } from "./dung-excel";

/** Bản đồ máy đọc của một mẫu — từ tờ _may, hoặc dựng từ định nghĩa mẫu. */
export interface BanDoMau {
  ma: string;
  o: { tag: string; nhan: string }[];
  chuong: string[];
  bang: { tag: string; so_lieu: boolean; co_nhom: boolean; chuong: string; cot: { tag: string; nhan: string }[] }[];
  vi_du: string[];
  /** Kỳ máy ghi sẵn lúc tải mẫu · số ô bảng có chữ in sẵn ở bản trắng — để biết tờ còn trắng */
  ky_san?: string;
  o_in_san?: number;
}

export interface MauDeDoan {
  ma: string;
  ten: string;
  dinh_nghia: DinhNghiaCoBang;
}

/** Tệp có phải gói Excel (.xlsx) không — nhìn nội dung, không nhìn đuôi tên. */
export function laGoiExcel(buf: Buffer): boolean {
  if (buf.length < 4 || buf[0] !== 0x50 || buf[1] !== 0x4b) return false;
  const dau = buf.subarray(0, Math.min(buf.length, 400_000)).toString("latin1");
  return dau.includes("xl/workbook.xml") || dau.includes("xl/worksheets/");
}

// ---------------- chữ của một ô ----------------

const so2 = (n: number) => String(n).padStart(2, "0");

/** Số theo chuẩn Việt Nam: «.» nhóm ba, «,» thập phân (luật chuẩn số). */
function soVN(n: number): string {
  if (!Number.isFinite(n)) return "";
  const [nguyen, le] = String(Math.round(n * 1e9) / 1e9).split(".");
  const am = nguyen.startsWith("-");
  const g = (am ? nguyen.slice(1) : nguyen).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${am ? "-" : ""}${g}${le ? "," + le : ""}`;
}

interface TrangThaiDoc {
  congThucMat: number;
}

function chuGiaTri(v: ExcelJS.CellValue, numFmt: string | undefined, tt: TrangThaiDoc): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return /%/.test(numFmt ?? "") ? `${soVN(v * 100)}%` : soVN(v);
  if (typeof v === "boolean") return v ? "Có" : "Không";
  if (v instanceof Date) return `${so2(v.getUTCDate())}/${so2(v.getUTCMonth() + 1)}/${v.getUTCFullYear()}`;
  if (typeof v === "object") {
    if ("richText" in v && Array.isArray(v.richText)) return v.richText.map((x) => x.text).join("");
    if ("formula" in v || "sharedFormula" in v) {
      const kq = (v as { result?: ExcelJS.CellValue }).result;
      if (kq === undefined || kq === null || (typeof kq === "object" && "error" in (kq as object))) {
        tt.congThucMat++;
        return "";
      }
      return chuGiaTri(kq as ExcelJS.CellValue, numFmt, tt);
    }
    if ("text" in v) return String((v as { text: unknown }).text ?? "");
    if ("error" in v) return "";
  }
  return String(v);
}

/** Ô gộp: ô phụ cùng hàng với ô chính → trống (gộp ngang); ô phụ ở hàng dưới → giá trị ô chính (gộp dọc, như Word vMerge). */
function chuO(cell: ExcelJS.Cell, tt: TrangThaiDoc): string {
  let c = cell;
  if (cell.isMerged && cell.master && cell.master !== cell) {
    if (cell.master.row === cell.row) return "";
    c = cell.master;
  }
  return chuGiaTri(c.value, c.numFmt, tt)
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
}

// ---------------- so khớp chữ ----------------

/** Chữ so khớp nhãn: bỏ dấu, bỏ chấm điền («Tháng ...... (Tr.đ)»), dấu câu — GIỮ số («Hướng Linh 7» ≠ «Hướng Linh 8»). */
const khoaNhan = (s: string) =>
  khongDau(s)
    .toLowerCase()
    .replace(/[.…]{2,}/g, " ")
    .replace(/[^a-z0-9%]+/g, " ")
    .trim();
/** Khoá lỏng (bỏ cả số) — chỉ dùng khi không cột nào khác cùng khoá: người lập điền «Tháng 09» vào nhãn «Tháng ......» */
const khoaLong = (s: string) => khoaNhan(s).replace(/\d+/g, " ").replace(/\s+/g, " ").trim();

/** Cột ngày: ô dán từ nơi khác có thể là SỐ NGÀY của Excel (46239 = 05/08/2026) dù ô định dạng chữ. */
const COT_NGAY = new Set(["bat_dau", "ket_thuc", "han_quyet_dinh", "han", "ngay_ke_hoach"]);
function ngayTuSoExcel(v: string): string {
  if (!/^\d{1,3}(?:\.\d{3})+$|^\d{5}$/.test(v)) return v;
  const n = Number(v.replace(/\./g, ""));
  if (n < 20000 || n > 80000) return v;
  const d = new Date(Date.UTC(1899, 11, 30) + n * 86400000);
  return `${so2(d.getUTCDate())}/${so2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}
const khoaChuong = (s: string) => chuanHoaTieuDe(s);
const RE_MA_MAU = /^m[aã] m[aẫ]u\s*:?\s*([a-z0-9_ -]+?)(?:\s*\(|$)/i;
const RE_LA_MA = /^[IVXLC]+\s*[.)]\s+\S/;

// ---------------- bản đồ ----------------

function banDoTuToMay(ws: ExcelJS.Worksheet): BanDoMau | null {
  const bd: BanDoMau = { ma: "", o: [], chuong: [], bang: [], vi_du: [] };
  ws.eachRow((row) => {
    const v = (i: number) => String(row.getCell(i).value ?? "").trim();
    switch (v(1)) {
      case "ma_mau":
        bd.ma = chuanHoaMaMau(v(2)) ?? "";
        break;
      case "o":
        bd.o.push({ tag: v(2), nhan: v(3) });
        break;
      case "chuong":
        bd.chuong.push(v(2));
        break;
      case "bang":
        bd.bang.push({ tag: v(2), so_lieu: v(3) === "1", co_nhom: v(4) === "1", chuong: v(5), cot: [] });
        break;
      case "cot":
        bd.bang.find((b) => b.tag === v(2))?.cot.push({ tag: v(3), nhan: v(4) });
        break;
      case "vi_du":
        bd.vi_du.push(v(2));
        break;
      case "ky_san":
        bd.ky_san = v(2);
        break;
      case "o_in_san":
        bd.o_in_san = Number(v(2)) || 0;
        break;
    }
  });
  return bd.ma ? bd : null;
}

/** Bản đồ dựng từ định nghĩa mẫu (tệp mất tờ _may — vd chép sang tệp mới, mở bằng phần mềm khác rồi lưu). */
export function banDoTuDinhNghia(m: MauDeDoan): BanDoMau {
  const dn = m.dinh_nghia;
  const nhanO = dn.o_nhap.filter((o) => o.tag !== "mau_ma").map((o) => ({ tag: o.tag, nhan: o.nhan }));
  const bang = (dn.bang ?? []).map((b) => ({
    tag: b.tag,
    so_lieu: !!b.so_lieu,
    co_nhom: b.cot.some((c) => c.tag === "nhom"),
    chuong: b.nhan,
    cot: b.cot.filter((c) => c.tag !== "nhom"),
  }));
  return { ma: m.ma, o: nhanO, chuong: Array.from(new Set([...(dn.muc_bat_buoc ?? []), ...bang.map((b) => b.chuong)])), bang, vi_du: [] };
}

// ---------------- đọc ----------------

export interface NoiDungExcel extends NoiDungWord {
  /** tag bảng → số hàng Excel của từng dòng dữ liệu (cùng thứ tự `bang`) — đợt 2 dùng để tô lỗi đúng ô */
  hang_excel?: Record<string, number[]>;
  /** Toạ độ ô (hàng, cột đếm từ 1) trên tờ `to` — tô lỗi (danh-dau-excel.ts) và sửa thẳng vào ô (sua-vao-excel.ts) dùng */
  vi_tri_excel?: {
    to: string;
    /** tag ô nhập → ô GIÁ TRỊ */
    o: Record<string, { hang: number; cot: number }>;
    /** tag bảng → tag cột → số cột; hàng của từng dòng ở hang_excel */
    bang: Record<string, Record<string, number>>;
  };
}

export function chonToGhi(wb: ExcelJS.Workbook): ExcelJS.Worksheet | null {
  const hien = wb.worksheets.filter((w) => w.state !== "veryHidden" && w.state !== "hidden" && w.name !== TO_MAY);
  const ten = (w: ExcelJS.Worksheet) => khongDau(w.name).toLowerCase().trim();
  return (
    hien.find((w) => ten(w) === khongDau(TO_GHI).toLowerCase()) ??
    hien.find((w) => ![TO_HUONG_DAN, TO_VI_DU, TO_LOI].map((x) => khongDau(x).toLowerCase()).includes(ten(w))) ??
    null
  );
}

/** Lưới chữ của một tờ: hàng → ô (1-based, đã gỡ ô gộp), kèm hàng ẩn. */
type HangLuoi = {
  hang: number;
  o: string[];
  an: boolean;
  /** chỉ số ô (0-based) là ô chính của vùng gộp ngang */
  gopNgang: Set<number>;
  /** số ô của vùng gộp ngang bắt đầu ở mỗi ô (1 = không gộp) — ô nhập: giá trị nằm ở ô ngay sau vùng gộp của nhãn */
  rong: number[];
};

function luoiCua(ws: ExcelJS.Worksheet, tt: TrangThaiDoc): HangLuoi[] {
  const kq: HangLuoi[] = [];
  const soCot = Math.min(Math.max(ws.columnCount, ws.actualColumnCount), 60);
  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const o: string[] = [];
    const gopNgang = new Set<number>();
    const rong: number[] = [];
    for (let c = 1; c <= soCot; c++) {
      const cell = row.getCell(c);
      o.push(chuO(cell, tt));
      let n = 1;
      while (c + n <= soCot + 1 && row.getCell(c + n).isMerged && row.getCell(c + n).master === cell) n++;
      if (n > 1) gopNgang.add(c - 1);
      rong.push(n);
    }
    kq.push({ hang: r, o, an: !!row.hidden, gopNgang, rong });
  }
  return kq;
}

/**
 * Đọc báo cáo Excel. `layMau` trả danh sách mẫu (định nghĩa) — chỉ gọi khi tệp mất tờ _may.
 */
export async function docExcel(buf: Buffer, layMau?: () => Promise<MauDeDoan[]>): Promise<NoiDungExcel> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
  } catch {
    throw new Error("Tệp không mở được bằng Excel (.xlsx hỏng, hoặc là tệp .xls cũ đổi đuôi)");
  }
  const tt: TrangThaiDoc = { congThucMat: 0 };
  const canh_bao_doc: string[] = [];
  const chan_doc: string[] = [];
  const ws = chonToGhi(wb);
  if (!ws) throw new Error(`Không thấy tờ «${TO_GHI}» trong tệp`);
  const luoi = luoiCua(ws, tt);

  // 1. Bản đồ mẫu
  const toMay = wb.worksheets.find((w) => w.name === TO_MAY);
  let bd = toMay ? banDoTuToMay(toMay) : null;
  let maTrenTo: string | null = null;
  for (const h of luoi.slice(0, 30))
    for (const v of h.o) {
      const m = RE_MA_MAU.exec(v);
      if (m && !maTrenTo) maTrenTo = chuanHoaMaMau(m[1]);
    }
  if (bd && maTrenTo && maTrenTo !== bd.ma) {
    // Dòng mã mẫu bị sửa tay khác tờ ẩn: tin dòng trên tờ (người dùng thấy) nếu là mẫu có thật, báo lại
    canh_bao_doc.push(`Dòng «Mã mẫu» ghi ${maTrenTo} nhưng tệp được tải từ mẫu ${bd.ma} — máy đọc theo ${maTrenTo}.`);
    bd = null;
  }
  if (!bd && layMau) {
    const ds = await layMau();
    const theoMa = maTrenTo ? ds.find((m) => m.ma === maTrenTo) : undefined;
    if (theoMa) bd = banDoTuDinhNghia(theoMa);
    else {
      // Đoán theo tên chương: mẫu khớp nhiều chương nhất (≥ 2 và hơn hẳn mẫu thứ hai)
      const chuCacHang = new Set(luoi.map((h) => h.o.find(Boolean) ?? "").filter(Boolean).map(khoaChuong));
      const diem = ds
        .map((m) => {
          const b = banDoTuDinhNghia(m);
          return { b, ten: m.ten, n: b.chuong.filter((c) => chuCacHang.has(khoaChuong(c))).length / Math.max(1, b.chuong.length), k: b.chuong.filter((c) => chuCacHang.has(khoaChuong(c))).length };
        })
        .sort((a, b) => b.n - a.n || b.k - a.k);
      if (diem[0] && diem[0].k >= 2 && diem[0].n >= 0.6 && (!diem[1] || diem[1].n < diem[0].n)) {
        bd = diem[0].b;
        canh_bao_doc.push(`Tệp không còn dòng «Mã mẫu» — máy nhận theo tên các chương là ${diem[0].ten}. Lần sau tải lại mẫu từ màn Mẫu báo cáo.`);
      }
    }
  }
  const kq: NoiDungExcel = { mau_ma: bd?.ma ?? maTrenTo ?? null, o_nhap: {}, bang: {}, tieu_de: [], van_ban: "", muc: [], dong_nhom: {}, hang_excel: {} };
  if (bd) kq.o_nhap.mau_ma = bd.ma;

  const chuongBiet = new Set((bd?.chuong ?? []).map(khoaChuong));
  const nhanO = new Map((bd?.o ?? []).map((o) => [khoaNhan(o.nhan), o.tag]));
  const vanBan: string[] = [];
  let muc: { tieu_de: string; phan: string[] } | null = null;
  const xongMuc = () => {
    if (muc) kq.muc!.push({ tieu_de: muc.tieu_de, van_ban: muc.phan.join("\n").trim() });
  };
  type Dang = { b: BanDoMau["bang"][number]; cot: Map<number, string>; nhom: string };
  let bang: Dang | null = null;
  const daThay = new Set<string>();
  const hangAn: number[] = [];

  const viTri: NonNullable<NoiDungExcel["vi_tri_excel"]> = { to: ws.name, o: {}, bang: {} };
  kq.vi_tri_excel = viTri;
  const ganO = (tag: string, v: string, hang: number, cot: number) => {
    const cu = kq.o_nhap[tag];
    if (cu === undefined || (cu === "" && v !== "")) {
      kq.o_nhap[tag] = v;
      viTri.o[tag] = { hang, cot };
    }
  };

  for (const h of luoi) {
    const coChu = h.o.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
    if (!coChu.length) continue;
    if (h.an) hangAn.push(h.hang);
    vanBan.push(h.o.filter(Boolean).join("\t"));
    const dau = h.o[coChu[0]];
    if (RE_MA_MAU.test(dau)) continue;

    // Chương
    const motO = coChu.length === 1;
    if (motO && (chuongBiet.has(khoaChuong(dau)) || (RE_LA_MA.test(dau) && dau.length <= 160 && !bang))) {
      xongMuc();
      kq.tieu_de.push(dau);
      muc = { tieu_de: dau, phan: [] };
      bang = null;
      continue;
    }
    if (motO && bang && chuongBiet.size && RE_LA_MA.test(dau) && chuongBiet.has(khoaChuong(dau))) continue;

    // Hàng tên cột của một bảng
    if (bd) {
      let tot: { b: BanDoMau["bang"][number]; cot: Map<number, string>; diem: number } | null = null;
      for (const b of bd.bang) {
        const cot = new Map<number, string>();
        // Tên cột trùng nhau (Form 8: «% KH» ở cả Tuần lẫn Tháng) → ghép theo thứ tự trái → phải
        const theoKhoa = new Map<string, string[]>();
        for (const c of b.cot) theoKhoa.set(khoaNhan(c.nhan), [...(theoKhoa.get(khoaNhan(c.nhan)) ?? []), c.tag]);
        const demLong = new Map<string, number>();
        for (const c of b.cot) demLong.set(khoaLong(c.nhan), (demLong.get(khoaLong(c.nhan)) ?? 0) + 1);
        const theoLong = new Map(b.cot.filter((c) => demLong.get(khoaLong(c.nhan)) === 1).map((c) => [khoaLong(c.nhan), c.tag]));
        const daDung = new Set<string>();
        h.o.forEach((v, i) => {
          if (!v) return;
          const t = (theoKhoa.get(khoaNhan(v)) ?? []).find((x) => !daDung.has(x)) ?? theoLong.get(khoaLong(v));
          if (t && !daDung.has(t)) {
            cot.set(i, t);
            daDung.add(t);
          }
        });
        const diem = cot.size / Math.max(1, b.cot.length);
        // Ưu tiên bảng của chương đang đứng (hai chương cùng bộ cột «Hạng mục · KH lũy kế…»)
        const cungChuong = muc && khoaChuong(b.chuong) === khoaChuong(muc.tieu_de) ? 0.01 : 0;
        if (cot.size >= Math.min(2, b.cot.length) && diem >= 0.5 && (!tot || diem + cungChuong > tot.diem)) tot = { b, cot, diem: diem + cungChuong };
      }
      if (tot) {
        // Bảng đã đọc một lần rồi gặp lại tên cột: bảng của chương khác cùng tên cột → chọn bảng chưa đọc
        if (daThay.has(tot.b.tag)) {
          const khac = bd.bang.find((b) => !daThay.has(b.tag) && b.cot.length === tot!.b.cot.length && b.cot.every((c, i) => khoaNhan(c.nhan) === khoaNhan(tot!.b.cot[i].nhan)));
          if (khac) tot = { ...tot, b: khac };
        }
        bang = { b: tot.b, cot: tot.cot, nhom: "" };
        daThay.add(tot.b.tag);
        kq.bang[tot.b.tag] ??= [];
        viTri.bang[tot.b.tag] ??= Object.fromEntries([...tot.cot].map(([i, t]) => [t, i + 1]));
        const thieu = tot.b.cot.filter((c) => ![...tot!.cot.values()].includes(c.tag));
        if (thieu.length)
          canh_bao_doc.push(`Bảng «${tot.b.chuong}» không thấy cột ${thieu.map((c) => `«${c.nhan}»`).join(", ")} — chữ ở hàng tên cột đã bị sửa hoặc xoá (hàng ${h.hang}).`);
        continue;
      }
    }

    // Dòng của bảng đang đọc
    if (bang) {
      const coNghia = [...bang.cot.keys()];
      const coChuNghia = coNghia.filter((i) => h.o[i]);
      if (!coChuNghia.length) {
        if (muc) muc.phan.push(h.o.filter(Boolean).join(" | "));
        continue;
      }
      const dauCot = Math.min(...coNghia);
      const chiDau = coChuNghia.length === 1 && coChuNghia[0] === dauCot && coChu.length === 1;
      // Dòng nhóm («ĐẦU TƯ», «THI CÔNG»): ô gộp ngang như mẫu in sẵn, hoặc chữ IN HOA. Dòng chỉ ghi cột đầu bằng chữ thường
      // vẫn là dòng dữ liệu (Excel không còn nhãn ô như Word để phân biệt).
      // Mẫu từ 22/10 gộp ô MỌI cột theo độ dài nội dung → dòng nhóm là ô gộp TRÀN QUA cột thứ hai của bảng, không phải mọi ô gộp
      const v0 = h.o[dauCot];
      const cotHai = coNghia.filter((i) => i > dauCot).sort((a, b) => a - b)[0] ?? Infinity;
      const gopQua = h.gopNgang.has(dauCot) && dauCot + (h.rong[dauCot] ?? 1) > cotHai;
      const laNhom = chiDau && (gopQua || (/\p{L}/u.test(v0) && v0 === v0.toLocaleUpperCase("vi-VN")));
      if (bang.b.co_nhom && laNhom) {
        bang.nhom = h.o[dauCot];
        continue;
      }
      const laBangViec = [...bang.cot.values()].includes("ten") && bang.cot.get(dauCot) === "ten";
      if (laBangViec && chiDau && coNghia.length > 2 && /\p{L}/u.test(h.o[dauCot])) {
        (kq.dong_nhom![bang.b.tag] ??= []).push(h.o[dauCot].split("\n")[0].trim());
        continue;
      }
      const d: Record<string, string> = bang.b.co_nhom ? { nhom: bang.nhom } : {};
      for (const [i, tag] of bang.cot) d[tag] = COT_NGAY.has(tag) ? ngayTuSoExcel(h.o[i] ?? "") : (h.o[i] ?? "");
      kq.bang[bang.b.tag].push(d);
      (kq.hang_excel![bang.b.tag] ??= []).push(h.hang);
      if (bang.b.so_lieu && muc) muc.phan.push(h.o.filter(Boolean).join(" | "));
      continue;
    }

    // Ô nhập: nhãn → ô bên phải (hoặc "Nhãn: giá trị" trong cùng ô)
    let laO = false;
    for (const i of coChu) {
      const v = h.o[i];
      const tag = nhanO.get(khoaNhan(v));
      if (tag) {
        const j = i + (h.rong[i] ?? 1);
        ganO(tag, h.o[j] ?? "", h.hang, j + 1);
        laO = true;
        continue;
      }
      const hai = /^([^:]{2,60}):\s*(.+)$/s.exec(v);
      const tag2 = hai ? nhanO.get(khoaNhan(hai[1])) : undefined;
      if (hai && tag2) {
        ganO(tag2, hai[2].trim(), h.hang, i + 1);
        laO = true;
      }
    }
    if (laO) continue;
    if (muc) muc.phan.push(h.o.filter(Boolean).join(" | "));
  }
  xongMuc();
  for (const o of bd?.o ?? []) if (!(o.tag in kq.o_nhap)) {
    // nhãn có trên tờ nhưng ô bên phải trống → vẫn coi là ô có mặt (giá trị rỗng); nhãn mất hẳn → để bộ kiểm báo "mất ô"
    if (luoi.some((h) => h.o.some((v) => khoaNhan(v) === khoaNhan(o.nhan)))) kq.o_nhap[o.tag] = "";
  }
  kq.van_ban = vanBan.join("\n");

  // Cảnh báo riêng của Excel
  if (hangAn.length) canh_bao_doc.push(`Có ${hangAn.length} hàng đang ẩn có chữ (hàng ${hangAn.slice(0, 8).join(", ")}${hangAn.length > 8 ? "…" : ""}) — máy vẫn đọc các hàng này.`);
  if (tt.congThucMat) canh_bao_doc.push(`Có ${tt.congThucMat} ô công thức không còn kết quả (tệp lưu từ phần mềm khác) — các ô đó máy đọc là trống. Mở bằng Excel, lưu lại rồi nộp.`);
  // Chép nguyên số liệu ví dụ sang tờ để ghi
  const dau = new Set(bd?.vi_du ?? []);
  if (dau.size) {
    const dai = Object.values(kq.bang).flatMap((ds) => ds.flatMap((d) => Object.values(d))).filter((v) => v.trim().length >= 15);
    const trung = dai.filter((v) => dau.has(v.trim())).length;
    if (trung >= 5 && trung >= dai.length / 2)
      chan_doc.push(`Tờ «${ws.name}» đang chứa số liệu của tờ «${TO_VI_DU}» (${trung} ô giống hệt ví dụ) — đây là số minh hoạ, không phải báo cáo thật. Xoá đi rồi ghi số liệu của kỳ này.`);
  }
  // Điền nhầm vào tờ Ví dụ, tờ để ghi bỏ trống: không có việc nào, kỳ báo cáo còn «......» hoặc đúng kỳ máy ghi sẵn lúc tải
  // mẫu mà các bảng không thêm chữ nào ngoài chữ in sẵn (đếm việc + ô có chữ — bảng số liệu có dòng chỉ tiêu in sẵn)
  const soViec = Object.values(kq.bang).reduce((a, ds) => a + ds.filter((d) => (d.ten ?? "").trim()).length, 0);
  const soOCoChu = Object.values(kq.bang).reduce((a, ds) => a + ds.reduce((b, d) => b + Object.entries(d).filter(([k, v]) => k !== "nhom" && v.trim()).length, 0), 0);
  const ky = kq.o_nhap.ky_bao_cao ?? "......";
  const kyTrang = /\.{3,}|…/.test(ky) || (!!bd?.ky_san && ky.trim() === bd.ky_san && soOCoChu <= (bd.o_in_san ?? 0));
  if (!soViec && wb.worksheets.some((w) => w.name === TO_VI_DU) && kyTrang)
    chan_doc.push(`Tờ «${ws.name}» chưa ghi gì. Máy chỉ đọc tờ «${TO_GHI}» — nếu đã điền vào tờ «${TO_VI_DU}» thì chép sang tờ «${TO_GHI}».`);
  if (canh_bao_doc.length) kq.canh_bao_doc = canh_bao_doc;
  if (chan_doc.length) kq.chan_doc = chan_doc;
  kq.dong_nhom = Object.fromEntries(Object.entries(kq.dong_nhom ?? {}).filter(([, v]) => v.length > 0));
  return kq;
}
