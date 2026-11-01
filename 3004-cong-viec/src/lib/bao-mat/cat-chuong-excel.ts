// ============================================================
// bao-mat/cat-chuong-excel.ts — CẮT CHƯƠNG MẬT KHỎI BÁO CÁO .xlsx (22/10/2026 — báo cáo nộp bằng Excel; cùng luật với cat-chuong.ts).
// Chỉ Buffer vào, Buffer ra. Tờ để ghi xếp chương từ trên xuống, nên cắt theo HÀNG:
//   • hàng tiêu đề chương mật (một ô có chữ, khớp gốc tên chương mật) → xoá từ đó tới trước tiêu đề chương KHÔNG mật kế tiếp
//     (ranh giới: khớp tên chương đã biết của mẫu, số La Mã lớn hơn); chèn MỘT hàng câu từ chối vào chỗ cắt.
// Không chắc thì CẮT THỪA: tệp ra chỉ còn tờ để ghi (chép GIÁ TRỊ — bỏ công thức trỏ sang ô đã xoá, bỏ ghi chú ô, ảnh, biểu đồ,
// tờ Hướng dẫn, tờ Ví dụ, tờ khác người dùng thêm) + tờ ẩn máy đọc đã bỏ chương mật.
// THẤT BẠI LÀ CHẶN (ném LoiCatChuong — nơi gọi trả 403, không bao giờ rơi về tệp gốc): không mở được · không thấy chương mật ·
// cắt xong chữ còn tên chương mật.
// ============================================================
import ExcelJS from "exceljs";
import { LoiCatChuong, type KetQuaCat, type TuyChonCat } from "./cat-chuong";
import { boDauHoa, gocTenChuong, soLaMa } from "./quy-tac";
import { chonToGhi } from "@/lib/mau-excel/doc-excel";
import { TO_MAY } from "@/lib/mau-excel/dung-excel";

const laMat = (chu: string, mat: string[]) => {
  const g = gocTenChuong(chu);
  return mat.some((m) => g.startsWith(m));
};

/** Giá trị phẳng của ô (công thức → kết quả; ô phụ của vùng gộp → trống) */
function giaTriPhang(c: ExcelJS.Cell): ExcelJS.CellValue {
  if (c.isMerged && c.master && c.master !== c) return null;
  const v = c.value;
  if (v && typeof v === "object" && !(v instanceof Date) && ("formula" in v || "sharedFormula" in v)) {
    const kq = (v as { result?: ExcelJS.CellValue }).result;
    return kq && typeof kq === "object" && !(kq instanceof Date) && "error" in (kq as object) ? null : (kq ?? null);
  }
  return v;
}

function chuHang(ws: ExcelJS.Worksheet, r: number, soCot: number): string[] {
  const kq: string[] = [];
  for (let c = 1; c <= soCot; c++) {
    const cell = ws.getCell(r, c);
    kq.push(cell.isMerged && cell.master !== cell ? "" : (cell.text ?? "").trim());
  }
  return kq;
}

/** Chữ tiêu đề nếu hàng chỉ có MỘT ô có chữ và chữ ngắn */
function tieuDeHang(o: string[]): string | null {
  const co = o.filter(Boolean);
  return co.length === 1 && co[0].length <= 160 ? co[0] : null;
}

async function mo(buf: Buffer): Promise<{ wb: ExcelJS.Workbook; ws: ExcelJS.Worksheet }> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
  } catch {
    throw new LoiCatChuong("tệp Excel không mở được");
  }
  const ws = chonToGhi(wb);
  if (!ws) throw new LoiCatChuong("không thấy tờ báo cáo trong tệp Excel");
  return { wb, ws };
}

const soCotCua = (ws: ExcelJS.Worksheet) => Math.min(Math.max(ws.columnCount, ws.actualColumnCount, 1), 60);

/** Tệp Excel có hàng tiêu đề chương mật không. Lỗi → false. */
export async function coChuongMatExcel(buf: Buffer, mat: string[]): Promise<boolean> {
  if (mat.length === 0) return false;
  try {
    const { ws } = await mo(buf);
    const n = soCotCua(ws);
    for (let r = 1; r <= ws.rowCount; r++) {
      const t = tieuDeHang(chuHang(ws, r, n));
      if (t && laMat(t, mat)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function catChuongMatExcel(buf: Buffer, tc: TuyChonCat): Promise<KetQuaCat> {
  if (tc.mat.length === 0) throw new LoiCatChuong("chưa khai chương mật");
  const { wb, ws } = await mo(buf);
  const n = soCotCua(ws);
  const biet = tc.biet.map(gocTenChuong).filter((g) => g.length >= 4 && !tc.mat.some((m) => g.startsWith(m)));
  const laRanhGioi = (chu: string, soMat: number | null): boolean => {
    const so = soLaMa(chu);
    if (so !== null && soMat !== null && so <= soMat) return false;
    if (biet.length > 0) return biet.some((b) => gocTenChuong(chu).startsWith(b));
    return so !== null;
  };

  const xoa = new Set<number>();
  const chuongDaCat: string[] = [];
  let dangCat = false;
  let soMat: number | null = null;
  let dauCat = 0;
  for (let r = 1; r <= ws.rowCount; r++) {
    const t = tieuDeHang(chuHang(ws, r, n));
    if (t && laMat(t, tc.mat)) {
      dangCat = true;
      soMat = Math.max(soMat ?? 0, soLaMa(t) ?? 0) || null;
      chuongDaCat.push(t);
    } else if (dangCat && t && laRanhGioi(t, soMat)) dangCat = false;
    if (dangCat) {
      dauCat ||= r;
      xoa.add(r);
    }
  }
  if (chuongDaCat.length === 0) throw new LoiCatChuong("không thấy chương mật nào trong tệp");

  // Tệp mới: chỉ tờ để ghi (đã bỏ hàng mật) + tờ máy đọc đã lọc
  const moi = new ExcelJS.Workbook();
  moi.creator = "SCI Công việc";
  const ra = moi.addWorksheet(ws.name);
  ws.columns.forEach((c, i) => {
    if (c?.width) ra.getColumn(i + 1).width = c.width;
  });
  const hangMoi = new Map<number, number>();
  let rr = 1;
  for (let r = 1; r <= ws.rowCount; r++) {
    if (r === dauCat) {
      const c = ra.getCell(rr, 1);
      c.value = `(Phần số liệu tài chính đã ẩn) ${tc.cau_tu_choi}`;
      c.font = { italic: true };
      rr++;
    }
    if (xoa.has(r)) continue;
    const goc = ws.getRow(r);
    const dich = ra.getRow(rr);
    if (goc.height) dich.height = goc.height;
    for (let c = 1; c <= n; c++) {
      const o = goc.getCell(c);
      const d = dich.getCell(c);
      d.value = giaTriPhang(o);
      if (o.style) d.style = JSON.parse(JSON.stringify(o.style)) as Partial<ExcelJS.Style>;
    }
    hangMoi.set(r, rr);
    rr++;
  }
  // Vùng gộp nằm trọn trong hàng giữ lại
  const merges = ((ws.model as unknown as { merges?: string[] }).merges ?? []) as string[];
  for (const vung of merges) {
    const m = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(vung);
    if (!m) continue;
    const r1 = Number(m[2]), r2 = Number(m[4]);
    const giu = [];
    for (let r = r1; r <= r2; r++) if (hangMoi.has(r)) giu.push(hangMoi.get(r)!);
    if (giu.length !== r2 - r1 + 1) continue;
    try {
      ra.mergeCells(`${m[1]}${hangMoi.get(r1)}:${m[3]}${hangMoi.get(r2)}`);
    } catch {
      /* vùng chồng nhau — bỏ gộp, giá trị vẫn còn */
    }
  }
  const may = wb.worksheets.find((w) => w.name === TO_MAY);
  if (may) {
    const mayMoi = moi.addWorksheet(TO_MAY);
    mayMoi.state = "veryHidden";
    const bangMat = new Set<string>();
    may.eachRow((row) => {
      const v = (i: number) => String(row.getCell(i).value ?? "");
      if (v(1) === "bang" && laMat(v(5), tc.mat)) bangMat.add(v(2));
    });
    may.eachRow((row) => {
      const v = (i: number) => String(row.getCell(i).value ?? "");
      if (v(1) === "vi_du") return;
      if (v(1) === "chuong" && laMat(v(2), tc.mat)) return;
      if ((v(1) === "bang" || v(1) === "cot") && bangMat.has(v(2))) return;
      mayMoi.addRow((row.values as ExcelJS.CellValue[]).slice(1));
    });
  }

  // Soát lần cuối: chữ còn lại (mọi tờ) không được chứa tên chương mật
  const chu: string[] = [];
  for (const w of moi.worksheets) w.eachRow((row) => row.eachCell((c) => void chu.push(c.text ?? "")));
  const conLai = boDauHoa(chu.join("\n"));
  const lot = tc.mat.find((m) => conLai.includes(m));
  if (lot) throw new LoiCatChuong(`cắt xong vẫn còn chữ của chương mật (${lot.toLowerCase()})`);
  const kq = Buffer.from(await moi.xlsx.writeBuffer());
  return { buf: kq, chuong_da_cat: chuongDaCat, so_khoi_xoa: xoa.size, so_phan_xoa: wb.worksheets.length - moi.worksheets.length };
}
