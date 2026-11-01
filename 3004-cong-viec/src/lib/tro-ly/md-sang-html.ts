// ============================================================
// md-sang-html.ts — markdown câu trả lời → trang HTML in được (THUẦN, luật 10).
// Lấy nguyên hàm mdSangHtml của xuat-chat.ts bản gốc; tách file thuần để nút PDF
// trong khung chat (client) dựng trang in ngay trên trình duyệt, không cần máy chủ.
// ============================================================

/** Escape HTML rồi vẽ lại đậm **x** — đủ cho bản in/gửi mail */
export function inlineHtml(s: string): string {
  const e = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return e
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "$1");
}

/** Tách một dòng bảng markdown thành các ô (null nếu không phải dòng bảng) */
export function oBang(dong: string): string[] | null {
  const s = dong.trim();
  if (!(s.startsWith("|") && s.endsWith("|") && s.split("|").length > 2)) return null;
  return s
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

/** Dòng kẻ "|---|:---|" của markdown — không phải dữ liệu */
export function laDongKe(o: string[]): boolean {
  return o.every((c) => /^:?-{2,}:?$/.test(c || "-"));
}

export function mdSangHtml(tieuDe: string, md: string, inNgay = false): string {
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
    const o = oBang(s);
    if (o) {
      if (laDongKe(o)) continue;
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
  const tuIn = inNgay ? '<script>window.addEventListener("load",function(){setTimeout(function(){window.print()},200)})</script>' : "";
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${inlineHtml(tieuDe)}</title>
<style>body{font-family:"Times New Roman",system-ui,Segoe UI,Arial,sans-serif;max-width:820px;margin:24px auto;padding:0 16px;color:#1a1a1a;line-height:1.55}
table{border-collapse:collapse;margin:10px 0;width:100%}th,td{border:1px solid #999;padding:4px 8px;text-align:left;font-size:14px}
th{background:#f0f0f0}h1{font-size:20px}h2{font-size:17px}h3{font-size:15px}li{margin-left:18px}
@page{size:A4;margin:15mm 12mm}</style>${tuIn}
</head><body><h1>${inlineHtml(tieuDe)}</h1>${than.join("\n")}</body></html>`;
}

/** Tên file xuất: "Tra loi tro ly SCI công việc dd-mm-yyyy hhmm.ext" (ngày đủ số 0) */
export function tenFileTraLoi(ext: string, bayGio = new Date()): { tieuDe: string; tenFile: string } {
  const ngay = `${String(bayGio.getDate()).padStart(2, "0")}-${String(bayGio.getMonth() + 1).padStart(2, "0")}-${bayGio.getFullYear()}`;
  const gio = bayGio.toTimeString().slice(0, 5).replace(":", "");
  return { tieuDe: `Trả lời Trợ lý SCI công việc ${ngay}`, tenFile: `Tra loi tro ly SCI cong viec ${ngay} ${gio}.${ext}` };
}
