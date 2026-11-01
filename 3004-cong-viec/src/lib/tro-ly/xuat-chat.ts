// ============================================================
// XUẤT CÂU TRẢ LỜI TRỢ LÝ ra file (dải nút dưới mỗi câu trả lời — lấy từ agent tiến độ)
//
// Bản gốc dựng DOCX/XLSX/DXF bằng script Python; SCI công việc dựng thẳng bằng thư viện
// Node đã cài (docx, exceljs) — không phụ thuộc Python trên máy chủ. Bỏ DXF (bản vẽ
// AutoCAD không dùng trong SCI công việc). PDF làm ở trình duyệt (in trang HTML) — xem
// XuatTraLoi.tsx. Chỉ bày định dạng CHẠY THẬT — không bày nút giả.
// Tên file xuất ngày dd-mm-yyyy. Server-only.
// ============================================================

import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import ExcelJS from "exceljs";
import { laDongKe, mdSangHtml, oBang, tenFileTraLoi } from "./md-sang-html";

export type DinhDangXuat = "md" | "html" | "docx" | "xlsx";

export const DINH_DANG_XUAT: { ma: DinhDangXuat; nhan: string; mime: string }[] = [
  { ma: "md", nhan: "MD", mime: "text/markdown; charset=utf-8" },
  { ma: "html", nhan: "HTML", mime: "text/html; charset=utf-8" },
  { ma: "docx", nhan: "DOCX", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  { ma: "xlsx", nhan: "XLSX", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
];

export interface FileXuat {
  buffer: Buffer;
  mime: string;
  tenFile: string;
}

/** Một đoạn markdown đã tách: tiêu đề · đoạn · gạch đầu dòng · bảng */
type Khoi =
  | { loai: "tieu_de"; cap: number; chu: string }
  | { loai: "doan"; chu: string }
  | { loai: "gach"; chu: string }
  | { loai: "bang"; hang: string[][] };

export function tachKhoi(md: string): Khoi[] {
  const ra: Khoi[] = [];
  let bang: string[][] | null = null;
  const dong = () => {
    if (bang && bang.length > 0) ra.push({ loai: "bang", hang: bang });
    bang = null;
  };
  for (const tho of md.replace(/\r\n/g, "\n").split("\n")) {
    const s = tho.trim();
    const o = oBang(s);
    if (o) {
      if (!laDongKe(o)) (bang ??= []).push(o);
      continue;
    }
    dong();
    if (s === "") continue;
    const h = /^(#{1,6})\s+(.*)$/.exec(s);
    if (h) ra.push({ loai: "tieu_de", cap: h[1]!.length, chu: h[2]! });
    else if (/^[-*•]\s+/.test(s)) ra.push({ loai: "gach", chu: s.replace(/^[-*•]\s+/, "") });
    else ra.push({ loai: "doan", chu: s });
  }
  dong();
  return ra;
}

/** "**đậm** thường `mã`" → các TextRun (đậm giữ đậm, link bỏ đường dẫn) */
function chayChu(s: string, dam = false): TextRun[] {
  const sach = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "$1").replace(/`([^`]+)`/g, "$1");
  return sach
    .split(/(\*\*[^*]+\*\*)/g)
    .filter((p) => p !== "")
    .map((p) => (p.startsWith("**") && p.endsWith("**") && p.length > 4 ? new TextRun({ text: p.slice(2, -2), bold: true }) : new TextRun({ text: p, bold: dam })));
}

function boMd(s: string): string {
  return s.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1").replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "$1");
}

async function dungDocx(tieuDe: string, md: string): Promise<Buffer> {
  const con: (Paragraph | Table)[] = [new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: tieuDe, bold: true })] })];
  for (const k of tachKhoi(md)) {
    if (k.loai === "tieu_de") {
      const cap = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3][Math.min(2, k.cap - 1)]!;
      con.push(new Paragraph({ heading: cap, children: chayChu(k.chu) }));
    } else if (k.loai === "gach") {
      con.push(new Paragraph({ bullet: { level: 0 }, children: chayChu(k.chu) }));
    } else if (k.loai === "doan") {
      con.push(new Paragraph({ children: chayChu(k.chu) }));
    } else {
      const soCot = Math.max(...k.hang.map((h) => h.length));
      con.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: k.hang.map(
            (h, i) =>
              new TableRow({
                tableHeader: i === 0,
                children: Array.from({ length: soCot }, (_, j) => new TableCell({ children: [new Paragraph({ children: chayChu(h[j] ?? "", i === 0) })] })),
              }),
          ),
        }),
      );
      con.push(new Paragraph({ children: [] }));
    }
  }
  const doc = new Document({
    styles: { default: { document: { run: { font: "Times New Roman", size: 26 } } } },
    sections: [{ children: con }],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

async function dungXlsx(tieuDe: string, md: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Trợ lý SCI công việc";
  const khoi = tachKhoi(md);
  const bang = khoi.filter((k): k is Extract<Khoi, { loai: "bang" }> => k.loai === "bang");
  if (bang.length === 0) {
    // Không có bảng → một cột chữ (vẫn mở được, không bày file rỗng)
    const ws = wb.addWorksheet("Tra loi");
    ws.addRow([tieuDe]).font = { bold: true, size: 13 };
    for (const k of khoi) ws.addRow([k.loai === "bang" ? "" : boMd(k.chu)]);
    ws.getColumn(1).width = 110;
  } else {
    bang.forEach((b, i) => {
      const ws = wb.addWorksheet(`Bang ${i + 1}`);
      b.hang.forEach((h, j) => {
        const r = ws.addRow(h.map((c) => {
          const t = boMd(c);
          // Số viết kiểu Việt (1.234,5) → số thật để Excel tính được
          const so = /^-?\d{1,3}(\.\d{3})*(,\d+)?$|^-?\d+(,\d+)?$/.test(t) ? Number(t.replace(/\./g, "").replace(",", ".")) : NaN;
          return Number.isFinite(so) ? so : t;
        }));
        if (j === 0) {
          r.font = { bold: true };
          r.eachCell((c) => {
            c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };
          });
        }
        r.eachCell((c) => {
          c.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
          c.alignment = { wrapText: true, vertical: "top" };
        });
      });
      ws.columns.forEach((col) => {
        let rong = 10;
        col.eachCell?.({ includeEmpty: false }, (c) => {
          rong = Math.max(rong, Math.min(60, String(c.value ?? "").length + 2));
        });
        col.width = rong;
      });
      ws.views = [{ state: "frozen", ySplit: 1 }];
    });
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/** Xuất nội dung markdown của một câu trả lời ra file định dạng chọn */
export async function xuatTraLoi(dinhDang: DinhDangXuat, noiDung: string): Promise<FileXuat> {
  const dd = DINH_DANG_XUAT.find((x) => x.ma === dinhDang);
  if (!dd) throw new Error(`Không hỗ trợ định dạng "${dinhDang}".`);
  const { tieuDe, tenFile } = tenFileTraLoi(dinhDang);
  if (dinhDang === "md") return { buffer: Buffer.from(`# ${tieuDe}\n\n${noiDung}\n`, "utf8"), mime: dd.mime, tenFile };
  if (dinhDang === "html") return { buffer: Buffer.from(mdSangHtml(tieuDe, noiDung), "utf8"), mime: dd.mime, tenFile };
  if (dinhDang === "docx") return { buffer: await dungDocx(tieuDe, noiDung), mime: dd.mime, tenFile };
  return { buffer: await dungXlsx(tieuDe, noiDung), mime: dd.mime, tenFile };
}
