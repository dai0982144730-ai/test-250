// ============================================================
// XUẤT CÂU TRẢ LỜI TRỢ LÝ ra file (S8 tầng 2 ⑤ — lệnh Mr. Đại 05/09)
//
// CHỈ các định dạng CHẠY THẬT trên máy chủ này (đo 05/09): MD · HTML (thuần
// code) · DOCX · XLSX · DXF (scripts/xuat_chat.py — python-docx, openpyxl,
// ezdxf đã cài). PDF/PPTX/SVG/MMD/DOT/KML trong danh mục 11 định dạng của lõi
// (LOI-DUNG-CHUNG mục 3) CHƯA có bộ chuyển — không bày nút giả.
//
// Tên file xuất TIẾNG VIỆT, ngày dd-mm-yyyy (chuẩn GD-8). Server-only.
// ============================================================

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type DinhDangXuat = "md" | "html" | "docx" | "xlsx" | "dxf";

export const DINH_DANG_XUAT: { ma: DinhDangXuat; nhan: string; mime: string }[] = [
  { ma: "md", nhan: "MD", mime: "text/markdown; charset=utf-8" },
  { ma: "html", nhan: "HTML", mime: "text/html; charset=utf-8" },
  {
    ma: "docx",
    nhan: "DOCX",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  {
    ma: "xlsx",
    nhan: "XLSX",
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },
  { ma: "dxf", nhan: "DXF", mime: "application/dxf" },
];

function chayPython(input: Record<string, unknown>): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn("python", [path.join(process.cwd(), "scripts", "xuat_chat.py")], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let ra = "";
    let loi = "";
    p.stdout.on("data", (d) => (ra += String(d)));
    p.stderr.on("data", (d) => (loi += String(d)));
    p.on("error", (e) => reject(new Error(`Không chạy được python: ${e.message}`)));
    p.on("close", () => {
      try {
        const j = JSON.parse(ra.trim().split("\n").pop() ?? "{}") as {
          ok?: boolean;
          loi?: string;
        };
        if (j.ok === true) resolve();
        else reject(new Error(j.loi ?? loi.slice(0, 300) ?? "Bộ xuất Python lỗi không rõ."));
      } catch {
        reject(new Error(loi.slice(0, 300) || "Bộ xuất Python không trả kết quả."));
      }
    });
    p.stdin.write(JSON.stringify(input), "utf8");
    p.stdin.end();
  });
}

/** Escape HTML rồi vẽ lại đậm **x** — đủ cho bản in/gửi mail */
function inlineHtml(s: string): string {
  const e = s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return e.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/`([^`]+)`/g, "<code>$1</code>");
}

function mdSangHtml(tieuDe: string, md: string): string {
  const than: string[] = [];
  let bang: string[][] | null = null;
  const dongBang = () => {
    if (!bang || bang.length === 0) {
      bang = null;
      return;
    }
    const [dau, ...con] = bang;
    than.push("<table><thead><tr>");
    for (const c of dau!) than.push(`<th>${inlineHtml(c)}</th>`);
    than.push("</tr></thead><tbody>");
    for (const d of con) {
      than.push("<tr>");
      for (const c of d) than.push(`<td>${inlineHtml(c)}</td>`);
      than.push("</tr>");
    }
    than.push("</tbody></table>");
    bang = null;
  };
  for (const dongTho of md.replace(/\r\n/g, "\n").split("\n")) {
    const s = dongTho.trim();
    if (s.startsWith("|") && s.endsWith("|") && s.split("|").length > 2) {
      const o = s
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => c.trim());
      if (o.every((c) => /^:?-{2,}:?$/.test(c || "-"))) continue;
      (bang ??= []).push(o);
      continue;
    }
    dongBang();
    if (s === "") continue;
    const h = /^(#{1,6})\s+(.*)$/.exec(s);
    if (h) than.push(`<h${h[1]!.length + 1}>${inlineHtml(h[2]!)}</h${h[1]!.length + 1}>`);
    else if (/^[-*•]\s+/.test(s)) than.push(`<li>${inlineHtml(s.replace(/^[-*•]\s+/, ""))}</li>`);
    else than.push(`<p>${inlineHtml(s)}</p>`);
  }
  dongBang();
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${inlineHtml(tieuDe)}</title>
<style>body{font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:820px;margin:24px auto;padding:0 16px;color:#1a1a1a;line-height:1.55}
table{border-collapse:collapse;margin:10px 0;width:100%}th,td{border:1px solid #999;padding:4px 8px;text-align:left;font-size:14px}
th{background:#f0f0f0}h1{font-size:20px}h2{font-size:17px}h3{font-size:15px}li{margin-left:18px}</style>
</head><body><h1>${inlineHtml(tieuDe)}</h1>${than.join("\n")}</body></html>`;
}

export interface FileXuat {
  buffer: Buffer;
  mime: string;
  tenFile: string;
}

/** Xuất nội dung markdown của một câu trả lời ra file định dạng chọn */
export async function xuatTraLoi(dinhDang: DinhDangXuat, noiDung: string): Promise<FileXuat> {
  const dd = DINH_DANG_XUAT.find((x) => x.ma === dinhDang);
  if (!dd) throw new Error(`Không hỗ trợ định dạng "${dinhDang}".`);
  const bayGio = new Date();
  // Ngày trong TÊN FILE theo dd-mm-yyyy đủ số 0 (chuẩn hiển thị GD-8)
  const ngay = `${String(bayGio.getDate()).padStart(2, "0")}-${String(bayGio.getMonth() + 1).padStart(2, "0")}-${bayGio.getFullYear()}`;
  const gio = bayGio.toTimeString().slice(0, 5).replace(":", "");
  const tieuDe = `Trả lời trợ lý AI ${ngay}`;
  const tenFile = `Tra loi tro ly ${ngay} ${gio}.${dinhDang}`;

  if (dinhDang === "md") {
    return { buffer: Buffer.from(`# ${tieuDe}\n\n${noiDung}\n`, "utf8"), mime: dd.mime, tenFile };
  }
  if (dinhDang === "html") {
    return { buffer: Buffer.from(mdSangHtml(tieuDe, noiDung), "utf8"), mime: dd.mime, tenFile };
  }

  // docx / xlsx / dxf — qua bộ xuất Python
  const duongRa = path.join(
    os.tmpdir(),
    `sci-xuat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${dinhDang}`
  );
  try {
    await chayPython({ dinh_dang: dinhDang, tieu_de: tieuDe, noi_dung: noiDung, duong_ra: duongRa });
    const buffer = fs.readFileSync(duongRa);
    return { buffer, mime: dd.mime, tenFile };
  } finally {
    try {
      fs.rmSync(duongRa, { force: true });
    } catch {
      // file tạm còn sót cũng không sao
    }
  }
}
