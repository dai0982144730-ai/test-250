// ============================================================
// thu-muc/lam-sach-html.ts — LÀM SẠCH HTML xem trước (mammoth, SheetJS) trước khi đưa lên trình duyệt.
// Danh sách trắng thẻ + thuộc tính; bỏ script/style/iframe..., bỏ mọi on*, chỉ cho liên kết http(s)/mailto/#
// và ảnh nhúng data:image. Thuần, không phụ thuộc node → dùng được cả client lẫn server.
// ============================================================

const THE_CHO_PHEP = new Set([
  "p", "br", "h1", "h2", "h3", "h4", "h5", "h6", "strong", "b", "em", "i", "u", "s", "sub", "sup",
  "ul", "ol", "li", "table", "thead", "tbody", "tfoot", "tr", "td", "th", "caption", "colgroup", "col",
  "a", "img", "span", "div", "blockquote", "pre", "code", "hr",
]);

/** Thẻ bỏ luôn cả phần bên trong. */
const THE_BO_CA_RUOT = ["script", "style", "iframe", "object", "embed", "noscript", "template", "svg", "math", "textarea", "select", "form", "frameset", "frame", "applet", "head", "title"];

const THUOC_TINH: Record<string, Set<string>> = {
  a: new Set(["href", "title"]),
  img: new Set(["src", "alt", "title", "width", "height"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan"]),
  col: new Set(["span"]),
  colgroup: new Set(["span"]),
  ol: new Set(["start"]),
};

function giaiMa(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);?/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);?/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&colon;/gi, ":")
    .replace(/&tab;/gi, "\t")
    .replace(/&newline;/gi, "\n")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function maHoa(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function urlAnToan(giaTri: string, laAnh: boolean): string | null {
  const v = giaiMa(giaTri).replace(/[\u0000- \u007f-\u009f]/g, "");
  if (laAnh) {
    if (/^data:image\/(png|jpe?g|gif|webp|bmp|x-emf|x-wmf|tiff);base64,[a-z0-9+/=]+$/i.test(v)) return v;
    return /^https?:\/\//i.test(v) ? v : null;
  }
  if (/^(https?:\/\/|mailto:|#)/i.test(v)) return v;
  return null;
}

function locThuocTinh(the: string, chuoi: string): string {
  const choPhep = THUOC_TINH[the];
  if (!choPhep) return "";
  const ra: string[] = [];
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*("[^"]*"|'[^']*'|[^\s"'>]+))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(chuoi))) {
    const ten = m[1].toLowerCase();
    if (!choPhep.has(ten)) continue;
    let gt = m[2] ?? "";
    if (gt.startsWith('"') || gt.startsWith("'")) gt = gt.slice(1, -1);
    if (ten === "href" || ten === "src") {
      const u = urlAnToan(gt, ten === "src");
      if (u === null) continue;
      ra.push(`${ten}="${maHoa(u)}"`);
    } else if (ten === "colspan" || ten === "rowspan" || ten === "span" || ten === "start" || ten === "width" || ten === "height") {
      if (/^\d{1,4}$/.test(gt)) ra.push(`${ten}="${gt}"`);
    } else {
      ra.push(`${ten}="${maHoa(giaiMa(gt))}"`);
    }
  }
  if (the === "a" && ra.some((x) => x.startsWith("href="))) ra.push('target="_blank"', 'rel="noopener noreferrer"');
  return ra.length ? " " + ra.join(" ") : "";
}

/** Làm sạch HTML: chỉ giữ thẻ trình bày an toàn. */
export function lamSachHtml(html: string): string {
  let s = html.replace(/<!--[\s\S]*?-->/g, "").replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "").replace(/<![^>]*>/g, "").replace(/<\?[\s\S]*?\?>/g, "");
  for (const t of THE_BO_CA_RUOT) {
    s = s.replace(new RegExp(`<${t}\\b[\\s\\S]*?<\\/${t}\\s*>`, "gi"), "");
    s = s.replace(new RegExp(`<${t}\\b[^>]*>`, "gi"), "");
  }
  s = s.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (toan, ten: string, thuocTinh: string) => {
    const t = ten.toLowerCase();
    if (!THE_CHO_PHEP.has(t)) return "";
    if (toan.startsWith("</")) return `</${t}>`;
    return `<${t}${locThuocTinh(t, thuocTinh)}>`;
  });
  // Dấu < lẻ còn sót (không thành thẻ hợp lệ) → mã hóa để không ghép thành thẻ mới
  s = s.replace(/<(?!\/?(?:[a-z][a-z0-9]*)(?:\s[^<>]*)?>)/g, "&lt;");
  return s;
}
