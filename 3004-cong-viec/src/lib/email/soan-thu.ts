// email/soan-thu.ts — soạn tiêu đề + nội dung thư từ một thông báo (thuần, không truy vấn).
import { lienKetTuyetDoi } from "./cau-hinh";

export function dienBien(mau: string, bien: Record<string, string | number | null | undefined>): string {
  return mau.replace(/\{(\w+)\}/g, (m, k: string) => (bien[k] === undefined || bien[k] === null ? m : String(bien[k])));
}

function rutGon(s: string, toiDa: number): string {
  const mot = s.replace(/\s+/g, " ").trim();
  return mot.length <= toiDa ? mot : mot.slice(0, toiDa - 1).trimEnd() + "…";
}

function thoatHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export interface ThuDaSoan {
  tieu_de: string;
  van_ban: string;
  html: string;
}

export function soanThu(v: {
  ten_ung_dung: string;
  ten_nguoi_nhan?: string | null;
  tieu_de_mau: string;
  noi_dung: string;
  lien_ket?: string | null;
}): ThuDaSoan {
  const app = v.ten_ung_dung.trim() || "SCI công việc";
  const tieuDe = rutGon(`[${app}] ${dienBien(v.tieu_de_mau || "{noi_dung}", { noi_dung: rutGon(v.noi_dung, 120) })}`, 200);
  const url = lienKetTuyetDoi(v.lien_ket);
  const chao = v.ten_nguoi_nhan?.trim() ? `Chào ${v.ten_nguoi_nhan.trim()},` : "Chào anh/chị,";
  const chanThu = [
    `Thư tự động từ ${app}, vui lòng không trả lời thư này.`,
    "Không muốn nhận email thông báo: tắt mục \"Nhận email thông báo\" trong tùy chọn cá nhân hoặc báo quản trị viên.",
  ];
  const van_ban = [chao, "", v.noi_dung, "", `Xem chi tiết: ${url}`, "", "—", ...chanThu].join("\n");
  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${thoatHtml(tieuDe)}</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1f2328;line-height:1.5">
<p>${thoatHtml(chao)}</p>
<p style="white-space:pre-line">${thoatHtml(v.noi_dung)}</p>
<p><a href="${thoatHtml(url)}" style="display:inline-block;padding:8px 14px;background:#1f6feb;color:#fff;border-radius:6px;text-decoration:none">Mở trong ${thoatHtml(app)}</a></p>
<p style="font-size:12px;color:#57606a">${thoatHtml(url)}</p>
<hr style="border:none;border-top:1px solid #d0d7de">
<p style="font-size:12px;color:#57606a">${chanThu.map(thoatHtml).join("<br>")}</p>
</body></html>`;
  return { tieu_de: tieuDe, van_ban, html };
}
