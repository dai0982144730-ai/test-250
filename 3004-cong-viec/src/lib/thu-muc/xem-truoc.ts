// ============================================================
// thu-muc/xem-truoc.ts — XEM TRƯỚC NGAY TRÊN WEB (CHỈ SERVER).
// .docx → mammoth → HTML đã làm sạch · .xlsx/.xls/.csv → bảng HTML · PDF/ảnh → trình duyệt tự vẽ ·
// .txt/.md/.json → chữ. .doc/.rtf/.odt/.ppt(x) → nếu máy có LibreOffice (soffice) thì đổi sang PDF, lưu tạm
// trong data/xem-truoc/<sha256>.pdf (không đụng kho file gốc). Không throw: lỗi trả loai 'khong_ho_tro'.
// ============================================================
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { lamSachHtml } from "./lam-sach-html";

export type LoaiXem = "html" | "pdf" | "anh" | "chu" | "khong_ho_tro";

export interface BanXem {
  loai: LoaiXem;
  html?: string;
  chu?: string;
  ghi_chu?: string;
  /** PDF do LibreOffice đổi ra (tải qua ?ban=pdf) */
  ban_pdf?: boolean;
}

const DUOI_ANH = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"]);
const DUOI_CHU = new Set([".txt", ".md", ".json", ".log", ".xml"]);
const DUOI_LIBRE = new Set([".doc", ".rtf", ".odt", ".ppt", ".pptx", ".odp", ".ods"]);

export function duoiTep(ten: string): string {
  const i = ten.lastIndexOf(".");
  return i < 0 ? "" : ten.slice(i).toLowerCase();
}

/** Mime theo đuôi khi trình duyệt không gửi. */
export function doanMime(ten: string, mime?: string | null): string {
  if (mime && mime !== "application/octet-stream") return mime;
  const d = duoiTep(ten);
  const bang: Record<string, string> = {
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".doc": "application/msword",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xls": "application/vnd.ms-excel",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
    ".txt": "text/plain",
    ".csv": "text/csv",
    ".md": "text/markdown",
    ".json": "application/json",
  };
  return bang[d] ?? "application/octet-stream";
}

/** Có được hiện thẳng trong trình duyệt (inline) không — chỉ PDF và ảnh raster, còn lại tải về. */
export function hienTrucTiepDuoc(ten: string, mime: string): boolean {
  const d = duoiTep(ten);
  return d === ".pdf" || mime === "application/pdf" || DUOI_ANH.has(d);
}

function thuMucBanXem(): string {
  return process.env.DOCFLOW_PREVIEW_DIR || path.join(process.cwd(), "data", "xem-truoc");
}

/** Đường dẫn PDF đã đổi bằng LibreOffice cho một nội dung (theo mã băm). */
export function duongDanBanPdf(sha256: string): string {
  if (!/^[a-f0-9]{64}$/.test(sha256)) throw new Error("Mã băm không hợp lệ");
  return path.join(thuMucBanXem(), `${sha256}.pdf`);
}

/** Tìm soffice: biến DOCFLOW_SOFFICE, rồi vài chỗ cài mặc định. null = máy không có LibreOffice. */
export function timSoffice(): string | null {
  const ungVien = [
    process.env.DOCFLOW_SOFFICE,
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
    "/usr/bin/soffice",
    "/usr/local/bin/soffice",
    "/usr/lib/libreoffice/program/soffice",
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
  ].filter((x): x is string => !!x);
  for (const p of ungVien) if (fs.existsSync(p)) return p;
  return null;
}

async function doiSangPdf(buf: Buffer, ten: string, sha256: string): Promise<boolean> {
  const dich = duongDanBanPdf(sha256);
  if (fs.existsSync(dich)) return true;
  const soffice = timSoffice();
  if (!soffice) return false;
  const tam = fs.mkdtempSync(path.join(os.tmpdir(), "docflow-xem-"));
  try {
    const vao = path.join(tam, `tep${duoiTep(ten)}`);
    fs.writeFileSync(vao, buf);
    await new Promise<void>((ok, loi) =>
      execFile(soffice, ["--headless", "--convert-to", "pdf", "--outdir", tam, vao], { timeout: 60000 }, (e) => (e ? loi(e) : ok())),
    );
    const ra = path.join(tam, "tep.pdf");
    if (!fs.existsSync(ra)) return false;
    fs.mkdirSync(path.dirname(dich), { recursive: true });
    fs.copyFileSync(ra, dich);
    return true;
  } catch {
    return false;
  } finally {
    fs.rmSync(tam, { recursive: true, force: true });
  }
}

/** Dựng bản xem trước cho một phiên bản file. */
export async function taoBanXem(ten: string, mime: string, buf: Buffer, sha256: string): Promise<BanXem> {
  const d = duoiTep(ten);
  try {
    if (d === ".pdf" || mime === "application/pdf") return { loai: "pdf" };
    if (DUOI_ANH.has(d)) return { loai: "anh" };
    if (d === ".docx" || d === ".docm") {
      const mammoth = await import("mammoth");
      const kq = await mammoth.convertToHtml({ buffer: buf });
      return {
        loai: "html",
        html: lamSachHtml(kq.value),
        ghi_chu: "Bản xem nhanh trên web: giữ chữ, bảng, định dạng chính. Đầu trang, chân trang, hộp chữ có thể không hiện — tải về để xem đúng bản in.",
      };
    }
    if (d === ".xlsx" || d === ".xls" || d === ".csv") {
      const XLSX = await import("xlsx");
      const { oSoRaChuVN } = await import("@/lib/chung/o-so-excel");
      const wb = XLSX.read(buf, { type: "buffer" });
      // Bỏ tờ ẩn (vd tờ máy đọc «_may» của mẫu báo cáo). Báo cáo theo mẫu Excel (22/10/2026): chỉ vẽ tờ báo cáo — tờ «Hướng dẫn»,
      // «Ví dụ đã điền», «Lỗi cần sửa» không phải nội dung báo cáo, và để khoanh dòng (dinh-kem/khoanh.ts) không trúng nhầm dòng ví dụ.
      const an = new Set((wb.Workbook?.Sheets ?? []).filter((x) => x.Hidden).map((x) => x.name));
      let to = wb.SheetNames.filter((t) => !an.has(t));
      const laMauBaoCao = wb.SheetNames.includes("_may") || to.includes("Mẫu trắng");
      if (laMauBaoCao) to = to.filter((t) => !["Hướng dẫn", "Ví dụ đã điền", "Lỗi cần sửa"].includes(t)).slice(0, 1);
      const phan = to.slice(0, 20).map((ten) => {
        oSoRaChuVN(wb.Sheets[ten]); // chốt 130: ô SỐ hiện theo chuẩn số Việt Nam («1.234,5»), không phải chữ kiểu Anh thư viện viết ra («1,234.5»)
        // Hàng trống (mẫu in sẵn 30 dòng việc trống) bỏ đi cho gọn
        const bang = XLSX.utils.sheet_to_html(wb.Sheets[ten], { header: "", footer: "" }).replace(/<tr>(?:<td[^>]*><\/td>)*<\/tr>/g, "");
        return `${laMauBaoCao ? "" : `<h3>${ten.replace(/[<>&"]/g, "")}</h3>`}${bang}`;
      });
      return {
        loai: "html",
        html: lamSachHtml(phan.join("")),
        ...(laMauBaoCao ? { ghi_chu: "Bản xem nhanh tờ báo cáo — tải về để xem đủ định dạng." } : {}),
      };
    }
    if (DUOI_CHU.has(d) || mime.startsWith("text/")) return { loai: "chu", chu: buf.toString("utf8").slice(0, 300000) };
    if (DUOI_LIBRE.has(d)) {
      if (await doiSangPdf(buf, ten, sha256)) {
        return { loai: "pdf", ban_pdf: true, ghi_chu: "Đã đổi sang PDF bằng LibreOffice để xem trên web." };
      }
      return { loai: "khong_ho_tro", ghi_chu: `Chưa xem trước được đuôi ${d} (máy chủ chưa cài LibreOffice). Bấm Tải về để mở.` };
    }
    return { loai: "khong_ho_tro", ghi_chu: `Chưa xem trước được đuôi ${d || "(không rõ)"} — bấm Tải về để mở.` };
  } catch (e) {
    return { loai: "khong_ho_tro", ghi_chu: `Không đọc được file: ${e instanceof Error ? e.message.slice(0, 160) : "lỗi không rõ"}` };
  }
}
