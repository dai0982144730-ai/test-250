// ============================================================
// kiem-tra/chuan-hoa.ts — hàm thuần: ô "chưa điền", đọc ngày dd/mm/yyyy, chuẩn hóa chữ để so khớp.
// Dùng được cả client lẫn server.
// ============================================================
import { congNgay, khoangNgay, tuanCua } from "@/lib/phong/tuan";
import { docSoNguoiGo } from "@/lib/chung/doc-so";

/** Khoảng ngày đúng của một kỳ: tuần ISO (thứ Hai → Chủ nhật — cùng cách đánh số với lib/phong/tuan), tháng/quý theo lịch. */
export function khoangCuaKy(loai: "tuan" | "thang" | "quy", so: number, nam: number): { tu: string; den: string } {
  if (loai === "tuan") {
    // Tuần 1 = tuần chứa ngày 04/01
    const tu = congNgay(tuanCua(`${nam}-01-04`).tu, (so - 1) * 7);
    return { tu, den: congNgay(tu, 6) };
  }
  const dau = loai === "thang" ? so : (so - 1) * 3 + 1;
  const cuoi = loai === "thang" ? so : dau + 2;
  const ngayCuoi = new Date(Date.UTC(nam, cuoi, 0)).getUTCDate();
  return { tu: `${nam}-${String(dau).padStart(2, "0")}-01`, den: `${nam}-${String(cuoi).padStart(2, "0")}-${String(ngayCuoi).padStart(2, "0")}` };
}

/** Ô coi là chưa điền: trống, đúng một chuỗi trong cấu hình (vd "......"), hoặc chỉ toàn dấu chấm/gạch. */
export function laChuaDien(v: string | null | undefined, danhSach: string[] = ["......"]): boolean {
  const s = (v ?? "").replace(/ /g, " ").trim();
  if (!s) return true;
  if (danhSach.some((x) => x.trim() === s)) return true;
  return /^[.…_\-–\s]+$/.test(s);
}

/** Giá trị ô sau khi bỏ "chưa điền" (trả về "" nếu chưa điền). */
export function giaTri(v: string | null | undefined, danhSach: string[]): string {
  return laChuaDien(v, danhSach) ? "" : (v ?? "").replace(/ /g, " ").trim();
}

export interface NgayDoc {
  iso?: string; // yyyy-mm-dd
  loi?: string;
  thieu_nam?: boolean;
}

function hopLe(y: number, m: number, d: number): boolean {
  if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1) return false;
  const soNgay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return d <= soNgay;
}

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** Đọc ngày: dd/mm/yyyy (chấp nhận - . làm dấu ngăn), yyyy-mm-dd; dd/mm không năm thì lấy namMacDinh. */
export function docNgay(v: string, namMacDinh?: number): NgayDoc {
  const s = v.trim();
  if (!s) return {};
  let m = /^(\d{1,2})\s*[/.\-]\s*(\d{1,2})\s*[/.\-]\s*(\d{4})$/.exec(s);
  if (m) {
    const [d, t, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return hopLe(y, t, d) ? { iso: iso(y, t, d) } : { loi: `"${s}" không phải ngày có thật` };
  }
  m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:T.*)?$/.exec(s);
  if (m) {
    const [y, t, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return hopLe(y, t, d) ? { iso: iso(y, t, d) } : { loi: `"${s}" không phải ngày có thật` };
  }
  m = /^(\d{1,2})\s*[/.\-]\s*(\d{1,2})$/.exec(s);
  if (m && namMacDinh) {
    const [d, t] = [Number(m[1]), Number(m[2])];
    return hopLe(namMacDinh, t, d) ? { iso: iso(namMacDinh, t, d), thieu_nam: true } : { loi: `"${s}" không phải ngày có thật` };
  }
  return { loi: `"${s}" không đúng dạng ngày dd/mm/yyyy` };
}

/** ISO yyyy-mm-dd → dd/mm/yyyy (hiển thị). */
export function ngayVN(isoNgay: string | null | undefined): string {
  if (!isoNgay) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoNgay);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : isoNgay;
}

/** Bỏ dấu, chữ thường, gom khoảng trắng — để so khớp tên đơn vị/người/tiêu đề mục. */
export function khongDau(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();
}

export function chuanHoaTen(s: string): string {
  return khongDau(s)
    .replace(/[^a-z0-9@&]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Tiêu đề mục: bỏ số thứ tự đầu dòng (I., 1., a)...). */
export function chuanHoaTieuDe(s: string): string {
  return chuanHoaTen(s.replace(/^\s*(?:[IVXLC]+|[a-z]\d{0,2}|\d+(?:\.\d+)*)\s*[.)\-–:]\s*/i, ""));
}

/**
 * Giá trị ô "Tình trạng" / "Đã xong" có nghĩa là ĐÃ XONG không. Mr. Đại 02/10/2026: người viết báo cáo ghi rất nhiều kiểu —
 * "xong", "đã xong 27/09", "100%", "đạt", "hoàn thành", "kết thúc", "đã nghiệm thu"… Code bắt những kiểu rõ nghĩa; kiểu lạ
 * do AI đọc lại ở bước 4 (so-cai/ai-ra-viec.ts, tình trạng từng dòng). "chưa xong", "không đạt", "đạt 80%" = KHÔNG xong.
 */
export function laDaXong(v: string): boolean {
  const s = khongDau(v).replace(/\s+/g, " ").trim().replace(/[.!;,]+$/, "");
  if (!s) return false;
  if (/^(x|v|✓|✔|☑|☒|co|roi|done|yes|true|1|ok)$/.test(s)) return true;
  if (/^(chua|khong|dang|sap|du kien|ke hoach|tam|dung|cham|tre|qua han|con|mot phan|chuan bi|cho)\b/.test(s)) return false;
  if (/\b(chua|khong|mot phan)\b/.test(s)) return false;
  // tỷ lệ: chỉ 100% mới là xong ("đạt 80%" = đang làm)
  const pt = /(\d{1,3}(?:[.,]\d+)?)\s*%/.exec(s);
  if (pt) return (docSoNguoiGo(pt[1]) ?? 0) >= 100; // chữ người gõ → chuẩn số Việt Nam, lib/chung/doc-so (chốt 130): «99,5%» = 99,5
  if (/^100(\s*\/\s*100)?$/.test(s)) return true;
  if (/^dat (hang|mua|lich|coc|cho)\b/.test(s)) return false; // "đặt hàng" bỏ dấu cũng là "dat"
  // "Nghiệm thu" / "Bàn giao" trơn có thể là đang ở bước đó → để AI đọc; "đã nghiệm thu", "nghiệm thu xong" thì chắc
  return (
    /^(da )?(xong|hoan thanh|hoan tat|ket thuc|dat)\b/.test(s) ||
    /^da (nghiem thu|ban giao|giai quyet|xu ly|thuc hien|trinh ky|ky)\b/.test(s) ||
    /^(nghiem thu|ban giao|giai quyet|xu ly|thuc hien|lam) xong\b/.test(s)
  );
}

/** Tách danh sách tên phụ trách: cách nhau bằng ; , + hoặc xuống dòng. */
export function tachTen(s: string): string[] {
  return s
    .split(/[;,+\n]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

// ---------------- Kỳ báo cáo gộp một ô (mẫu thật) ----------------

export interface KyDocDuoc {
  loai?: "tuan" | "thang" | "quy";
  so?: number;
  nam?: number;
  tu?: string;
  den?: string;
  loi: string[];
  goi_y: string[];
}

const DAU_TICH = /^(?:[☒☑■✓✔xX]|\[\s*[xX]\s*\])$/;

/**
 * Đọc ô "Kỳ báo cáo" kiểu mẫu anh Đại: "☒ Tuần 29/2026 (14/07 – 20/07/2026)  ☐ Tháng ......./2026".
 * ☒ (hoặc x, ✓) = kỳ được chọn. Số kỳ/năm ở dạng "29/2026"; từ–đến trong ngoặc, ngày thiếu năm lấy năm của kỳ.
 * Tháng/quý không ghi từ–đến thì tự tính đầu–cuối tháng/quý.
 */
export function docKyBaoCao(s: string): KyDocDuoc {
  const kq: KyDocDuoc = { loi: [], goi_y: [] };
  const re = /(\[\s*[xX ]?\s*\]|[☐☒☑□■✓✔]|\b[xX]\b)?\s*(Tuần|Tháng|Quý)(?=[\s\d.]|$)([^☐☒☑□■✓✔\n]*)/giu;
  const lua: { chon: boolean; loai: "tuan" | "thang" | "quy"; phan: string }[] = [];
  for (const m of s.matchAll(re)) {
    const w = khongDau(m[2]);
    lua.push({ chon: !!m[1] && DAU_TICH.test(m[1].trim()), loai: w.startsWith("tuan") ? "tuan" : w.startsWith("thang") ? "thang" : "quy", phan: m[3] ?? "" });
  }
  const soNam = (phan: string) => {
    const m = /^\s*(?:số\s*)?(\d{1,2})\s*\/\s*(\d{2}|\d{4})\b/i.exec(phan);
    if (!m) return null;
    const nam = Number(m[2]) < 100 ? 2000 + Number(m[2]) : Number(m[2]);
    return { so: Number(m[1]), nam };
  };
  let chon = lua.filter((x) => x.chon);
  // Mẫu không có hộp tích (vd mẫu SCI-160: "Tuần 39/2026 (từ … đến …)") và chỉ ghi một loại kỳ: chính là kỳ đó
  const coHopTich = /[☐☒☑□■]|\[\s*[xX ]?\s*\]/.test(s);
  if (chon.length === 0 && !coHopTich && lua.length === 1) chon = lua;
  if (chon.length === 0) {
    const coSo = lua.filter((x) => soNam(x.phan));
    if (coSo.length === 1) {
      chon = coSo;
      kq.goi_y.push(`Chưa tích ô kỳ báo cáo, hiểu là ${coSo[0].loai === "thang" ? "tháng" : coSo[0].loai === "quy" ? "quý" : "tuần"}`);
    } else {
      kq.loi.push("Chưa tích chọn kỳ báo cáo (☒ Tuần hoặc ☒ Tháng)");
      return kq;
    }
  }
  if (chon.length > 1) {
    kq.loi.push("Tích cùng lúc nhiều kỳ báo cáo — chỉ tích một ô Tuần hoặc Tháng");
    return kq;
  }
  const c = chon[0];
  kq.loai = c.loai;
  const tenKy = c.loai === "thang" ? "tháng" : c.loai === "quy" ? "quý" : "tuần";
  const sn = soNam(c.phan);
  if (!sn) {
    kq.loi.push(`Chưa ghi số ${tenKy}/năm của kỳ báo cáo (vd ${c.loai === "thang" ? "07/2026" : "29/2026"})`);
    return kq;
  }
  kq.so = sn.so;
  kq.nam = sn.nam;
  if (c.loai === "tuan" && (sn.so < 1 || sn.so > 53)) kq.loi.push(`Số tuần ${sn.so} không hợp lệ`);
  if (c.loai === "thang" && (sn.so < 1 || sn.so > 12)) kq.loi.push(`Số tháng ${sn.so} không hợp lệ`);
  if (c.loai === "quy" && (sn.so < 1 || sn.so > 4)) kq.loi.push(`Số quý ${sn.so} không hợp lệ`);
  // Khoảng ngày đúng của kỳ: tuần ISO (thứ Hai → Chủ nhật, như lib/phong/tuan) · tháng/quý theo lịch
  const dung = khoangCuaKy(c.loai, sn.so, sn.nam);
  // Mẫu bản 9 (Mr. Đại 01/10/2026): ô kỳ chỉ một loại kỳ; "từ – đến" GIỮ cho dễ đọc nhưng phải KHỚP số kỳ — lệch thì chặn.
  // Để trống (còn "....../....../20...") thì máy tự tính theo số kỳ, không bắt ghi.
  const ngoacTho = /\(([^)]*)\)/.exec(c.phan);
  const ngoac = ngoacTho && /\d{1,2}\s*\/\s*\d{1,2}/.test(ngoacTho[1]) ? ngoacTho : null;
  if (ngoac) {
    const [a, b] = ngoac[1].split(/\s*(?:–|—|-|đến)\s*/).map((x) => x.trim().replace(/^từ\s*(?:ngày\s*)?/i, ""));
    if (!a || !b) kq.loi.push(`Kỳ báo cáo: "${ngoac[1].trim()}" chưa đủ từ ngày – đến ngày`);
    else {
      const den = docNgay(b, sn.nam);
      const tu = docNgay(a, den.iso ? Number(den.iso.slice(0, 4)) : sn.nam);
      if (tu.loi) kq.loi.push(`Kỳ báo cáo, từ ngày: ${tu.loi}`);
      if (den.loi) kq.loi.push(`Kỳ báo cáo, đến ngày: ${den.loi}`);
      if (tu.iso && den.iso && tu.iso > den.iso) kq.loi.push(`Kỳ báo cáo: từ ngày ${ngayVN(tu.iso)} sau đến ngày ${ngayVN(den.iso)}`);
      else if (tu.iso && den.iso && kq.loi.length === 0 && (tu.iso !== dung.tu || den.iso !== dung.den)) {
        kq.loi.push(
          `Kỳ báo cáo: ${tenKy} ${sn.so}/${sn.nam} là ${khoangNgay(dung.tu, dung.den)}, file ghi ${khoangNgay(tu.iso, den.iso)} — sửa số ${tenKy} hoặc ngày cho khớp`,
        );
      }
      kq.tu = tu.iso;
      kq.den = den.iso;
    }
  } else if (c.loai === "tuan" && kq.loi.length === 0) {
    kq.tu = dung.tu;
    kq.den = dung.den;
  }
  if (!kq.tu && !kq.den && c.loai !== "tuan" && kq.loi.length === 0) {
    const thangDau = c.loai === "thang" ? sn.so : (sn.so - 1) * 3 + 1;
    const thangCuoi = c.loai === "thang" ? sn.so : thangDau + 2;
    const cuoi = new Date(Date.UTC(sn.nam, thangCuoi, 0)).getUTCDate();
    kq.tu = `${sn.nam}-${String(thangDau).padStart(2, "0")}-01`;
    kq.den = `${sn.nam}-${String(thangCuoi).padStart(2, "0")}-${String(cuoi).padStart(2, "0")}`;
  }
  return kq;
}
