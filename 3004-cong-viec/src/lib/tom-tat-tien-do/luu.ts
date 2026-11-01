// TÓM TẮT TIẾN ĐỘ DỰ ÁN — phần LƯU (CHỈ SERVER, đụng node:fs — luật 10: phần thuần ở ./thuan.ts).
// Bản nháp không vào cơ sở dữ liệu: mỗi dự án MỘT tệp JSON ở data/tom-tat-tien-do/<mã dự án>.json. Nạp lại thì bản cũ
// được giữ thêm một đời ở <mã dự án>.truoc.json (không xoá hẳn thứ người vừa đè).
import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import type { NguoiDungPhien } from "@/lib/types";
import type { DuAn } from "@/lib/phong/du-an-thuan";
import { capWbs, docBangTomTat, wbsCoCon, type BanTomTat } from "./thuan";

function thuMuc(): string {
  return process.env.DOCFLOW_TOM_TAT_DIR || path.join(process.cwd(), "data", "tom-tat-tien-do");
}
const tepCua = (duAn: string, duoi = "") => path.join(thuMuc(), `${encodeURIComponent(duAn)}${duoi}.json`);

export function docBanTomTat(duAn: string): BanTomTat | null {
  try {
    return JSON.parse(fs.readFileSync(tepCua(duAn), "utf8")) as BanTomTat;
  } catch {
    return null;
  }
}

/** Mã các dự án đã có bản tóm tắt */
export function duAnCoTomTat(): Set<string> {
  try {
    return new Set(
      fs
        .readdirSync(thuMuc())
        .filter((f) => f.endsWith(".json") && !f.endsWith(".truoc.json"))
        .map((f) => decodeURIComponent(f.slice(0, -5))),
    );
  } catch {
    return new Set();
  }
}

export function ghiBanTomTat(ban: BanTomTat): void {
  fs.mkdirSync(thuMuc(), { recursive: true });
  const dich = tepCua(ban.du_an);
  if (fs.existsSync(dich)) fs.copyFileSync(dich, tepCua(ban.du_an, ".truoc"));
  const tam = `${dich}.tam`;
  fs.writeFileSync(tam, JSON.stringify(ban, null, 1), "utf8");
  fs.renameSync(tam, dich);
}

/**
 * Ai NẠP được tệp của một dự án — Mr. Đại chốt 13/10/2026: «ai cũng tải được nhưng chỉ có người của BQL mới nạp lên được»
 * (không mở cho Ban lãnh đạo, không mở cho quản trị). Ban QLDA của dự án SCI đầu tư là đơn vị ĐẦU ở Cài đặt → Dự án (don_vi[0]).
 * Dự án «Loại khác» không có Ban QLDA → người thuộc đơn vị gắn với dự án đó (không thì không ai nạp được).
 */
export function napDuocTomTat(nd: Pick<NguoiDungPhien, "don_vi_ids">, a: DuAn): boolean {
  const bql = a.nhom === "sci" ? a.don_vi.slice(0, 1) : a.don_vi;
  return nd.don_vi_ids.some((d) => bql.includes(d));
}

/** Tệp Excel → các hàng của trang tính đầu (ô thô: số, chữ; ô ngày là số thứ tự ngày của Excel) → dòng + lời nhắc */
export function docTepTomTat(noiDung: Buffer): ReturnType<typeof docBangTomTat> {
  const wb = XLSX.read(noiDung, { type: "buffer", cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return { dong: [], canh_bao: ["Tệp không có trang tính nào."] };
  return docBangTomTat(XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null, blankrows: false }));
}

const MAU_CHU_CAP = ["C2410C", "15803D", "1D4ED8"];

/**
 * Bảng đang lưu → tệp .xlsx ĐÚNG khuôn nạp (nút «Tải file»: tải về, sửa tay trong Excel, nạp ngược lại). Dự án chưa có bảng →
 * tệp mẫu chỉ có hàng tiêu đề. Ô WBS kiểu Chữ (để «1.10» không thành «1.1»), ô ngày là ngày thật hiện dd/mm/yyyy.
 */
export async function xuatTepTomTat(ban: BanTomTat | null): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Tiến độ rút gọn", { views: [{ state: "frozen", xSplit: 2, ySplit: 1 }] });
  ws.columns = [{ width: 11 }, { width: 78 }, { width: 10 }, { width: 14 }, { width: 13 }, { width: 13 }];
  const dau = ws.addRow(["WBS", "Công việc", "Đơn vị", "Khối lượng", "Bắt đầu", "Kết thúc"]);
  dau.eachCell((o) => {
    o.font = { bold: true, color: { argb: "FFFFFFFF" } };
    o.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1C1917" } };
    o.alignment = { horizontal: "center", vertical: "middle" };
  });
  const dong = ban?.dong ?? [];
  const nhom = wbsCoCon(dong);
  const ngay = (s: string | null) => (s ? new Date(`${s}T00:00:00Z`) : null);
  for (const d of dong) {
    const cap = capWbs(d.wbs);
    const r = ws.addRow([d.wbs, d.ten, d.don_vi, d.khoi_luong, ngay(d.bat_dau), ngay(d.ket_thuc)]);
    r.getCell(1).numFmt = "@";
    r.getCell(2).alignment = { indent: (cap - 1) * 2, wrapText: true, vertical: "middle" };
    r.getCell(3).alignment = { horizontal: "center" };
    r.getCell(4).numFmt = "#,##0.##";
    for (const c of [5, 6]) {
      r.getCell(c).numFmt = "dd/mm/yyyy";
      r.getCell(c).alignment = { horizontal: "center" };
    }
    if (nhom.has(d.wbs)) for (let c = 1; c <= 6; c++) r.getCell(c).font = { bold: true, color: { argb: `FF${MAU_CHU_CAP[cap - 1] ?? "000000"}` } };
  }
  if (!dong.length) for (let i = 2; i <= 200; i++) ws.getCell(i, 1).numFmt = "@";
  const hd = wb.addWorksheet("Hướng dẫn");
  hd.getColumn(1).width = 120;
  [
    "Tệp này là form nạp cho bảng «Tóm tắt tiến độ dự án» ở agent Công việc (menu Dự án).",
    "Máy chỉ đọc trang tính ĐẦU TIÊN, sáu cột: WBS · Công việc · Đơn vị · Khối lượng · Bắt đầu · Kết thúc.",
    "Cấp của một dòng tính theo số dấu chấm trong WBS: «1» là cấp 1, «1.4» là cấp 2, «1.4.7» là cấp 3, «1.4.7.2» là cấp 4. Ô WBS để kiểu Chữ.",
    "Ngày gõ theo kiểu ngày/tháng/năm (ví dụ 22/05/2027). Khối lượng gõ số, để trống nếu không có.",
    "Thêm, xoá, sửa dòng tuỳ ý rồi bấm «Nạp tiến độ» để nạp lại — bảng mới thay bảng cũ.",
  ].forEach((c) => hd.addRow([c]));
  return Buffer.from(await wb.xlsx.writeBuffer());
}
