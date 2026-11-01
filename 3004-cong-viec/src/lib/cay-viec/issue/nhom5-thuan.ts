// ============================================================
// cay-viec/issue/nhom5-thuan.ts — NHÓM 5 🤖 AI ĐỀ XUẤT: phần THUẦN (chép lib/canh-bao/sinh-nhom5.ts của agent Base).
// Base đọc ô Vướng mắc BC ngày + sheet Vấn đề BC tuần của chính nó. Agent Công việc đọc bảng KIẾN NGHỊ · SỰ CỐ · CẢNH BÁO của
// báo cáo tuần/tháng ĐÃ NỘP (cùng nguồn tab "Cần BLĐ ra quyết định" đọc bảng kiến nghị — lib/bao-cao-tuan/can-quyet.ts).
// Ba luật cứng không tắt được (y Base):
//   ① thẻ PHẢI trích NGUYÊN VĂN câu nguồn — CODE gắn trích dẫn, LLM chỉ trỏ số câu (không thể chép sai)
//   ② đủ 9 phần — Ảnh hưởng COD do CODE tính (găng → số ngày chậm; không găng → trừ dự trữ nếu agent Tiến độ có trả), không cho LLM ước
//   ③ chỉ là ĐỀ XUẤT (DX-n, chưa vào sổ) — người duyệt mới thành ISS
// ============================================================
import type { DauViecCay } from "@/lib/cay-viec/thuan";
import { docSoMay } from "@/lib/chung/doc-so";
import type { TheCanhBao } from "./model";

/** Một câu nguồn đưa cho LLM — trích NGUYÊN VĂN từ báo cáo */
export interface CauNguon {
  so: number;
  trich: string;
  /** "Báo cáo tuần 7 ngày · 21/09/2026 – 27/09/2026 — Ban QLDA HV — bảng Cảnh báo đầu tư – tư vấn – thi công dòng 2" */
  nguonDuLieu: string;
  /** Ngày đầu kỳ báo cáo — code tính "số ngày treo" khi LLM không ước được */
  ngayDau?: string;
  boSung?: string;
}

type Tho = Record<string, unknown>;
const chuoi = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** Bảng nào của báo cáo được đọc — tên hiện cho người đọc */
// Mr. Đại chốt 07/10/2026: Issue AI CHỈ đọc Cảnh báo + Sự cố — bảng Kiến nghị đã có tab "Cần ra quyết định" của Báo cáo tuần
// lo (bao-cao-tuan/can-quyet.ts) → không đọc ở đây nữa, tránh một vấn đề hiện hai nơi.
export const BANG_NHOM5: { tag: string; nhan: string }[] = [
  { tag: "bang_su_co", nhan: "Thiết bị & bảo trì — sự cố" },
  { tag: "bang_canh_bao", nhan: "Cảnh báo đầu tư – tư vấn – thi công" },
];

const gon = (s: string | undefined) => (s ?? "").replace(/(^|\n)•\s*/g, "$1").replace(/\s+/g, " ").trim();
const coChu = (s: string) => !!s.replace(/[.…\s\-–—]/g, "");

/** Một dòng bảng → câu trích nguyên văn (null = dòng trống) */
export function trichDong(tag: string, r: Record<string, string>): { trich: string; boSung?: string } | null {
  const g = (k: string) => gon(r[k]);
  if (tag === "bang_su_co") {
    const tb = g("thiet_bi");
    const mt = g("mo_ta");
    if (!coChu(tb) && !coChu(mt)) return null;
    return { trich: [tb, mt].filter(coChu).join(": "), ...(coChu(g("bien_phap")) ? { boSung: `biện pháp: ${g("bien_phap")}` } : {}) };
  }
  if (tag === "bang_canh_bao") {
    const hs = g("ho_so");
    if (!coChu(hs)) return null;
    const vm = g("vuong_mac");
    const phu = [coChu(g("tinh_trang")) ? `tình trạng: ${g("tinh_trang")}` : "", coChu(g("anh_huong")) ? `ảnh hưởng: ${g("anh_huong")}` : ""].filter(Boolean).join(" · ");
    return { trich: coChu(vm) ? `${hs} — ${vm}` : hs, ...(phu ? { boSung: phu } : {}) };
  }
  return null;
}

const coDau = (s: string | null | undefined) => (s ?? "").normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();

/** Dòng của báo cáo đơn vị KHÁC dự án có nhắc tên dự án (tên / tên gọi khác ≥ 3 ký tự) không */
export function nhacDuAn(chu: string, ten: string, tenKhac: string[]): boolean {
  const c = coDau(chu);
  return [ten, ...tenKhac].map(coDau).some((x) => x.length >= 3 && c.includes(x));
}

export const HE_THONG_NHOM5 = `Bạn là kỹ sư quản lý dự án của một công ty đầu tư, thiết kế, thi công điện gió / thủy điện / điện mặt trời ở Việt Nam.

Dưới đây là các CÂU NGUYÊN VĂN người thật viết trong bảng Sự cố, Cảnh báo của báo cáo tuần/tháng đã nộp, kèm danh sách đầu việc WBS của dự án. Nhiệm vụ: chọn ra những chuyện ĐÁNG MỞ ISSUE mà bộ đếm số (quá hạn, găng chưa ai nhận, xong trên giấy) chưa bắt được, và đề xuất xử lý.

Luật:
- Gộp các câu cùng một chuyện thành MỘT đề xuất.
- KHÔNG đề xuất trùng với issue đang mở (danh sách kèm dưới).
- "soNgayCham" = ước ngày chậm TỪ CHÍNH CÂU CHỮ (vd "chậm 4 ngày" → 4); không suy ra được thì bỏ trống, ĐỪNG bịa.
- "deXuat" phải có CON SỐ hành động được (làm gì, bao nhiêu, trước ngày nào).
- "tieuDe" định lượng, có số. "mucDo": "do" khi ảnh hưởng nặng/kéo dài, còn lại "vang".
- Ít chuyện đáng nói thì trả ít; không có thì trả mảng rỗng. ĐỪNG vẽ chuyện.
- "tieuDe", "phanTich", "deXuat": viết tiếng Việt; nhắc mã WBS thì luôn kèm tên ngắn (vd "7.2.3 Thi công san nền"), không bao giờ chỉ viết mã.

Trả về DUY NHẤT một mảng JSON, không lời dẫn, không rào \`\`\`:
[{"cau":[1,2],"wbs":"7.2.3","tieuDe":"...","phanTich":"...","mucDo":"do|vang","soNgayCham":4,"deXuat":"..."}]
"cau" là số thứ tự các câu nguồn làm căn cứ — BẮT BUỘC, ít nhất 1 số.
"wbs" là MỘT mã trong danh sách đầu việc (chuyện không gắn được đầu việc nào thì bỏ trống).`;

export interface DongTraLoi5 {
  cau: number[];
  wbs?: string;
  tieuDe: string;
  phanTich: string;
  mucDo: "do" | "vang";
  soNgayCham?: number;
  deXuat: string;
}

/** Bóc câu trả lời LLM — dòng thiếu tieuDe/deXuat/cau thì LOẠI (đếm được) */
export function docTraLoi5(raw: string): { dong: DongTraLoi5[]; soLoai: number } {
  const s = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const dau = s.indexOf("[");
  const cuoi = s.lastIndexOf("]");
  if (dau < 0 || cuoi <= dau) return { dong: [], soLoai: 0 };
  let mang: unknown[];
  try {
    const v: unknown = JSON.parse(s.slice(dau, cuoi + 1));
    if (!Array.isArray(v)) return { dong: [], soLoai: 0 };
    mang = v;
  } catch {
    return { dong: [], soLoai: 0 };
  }
  const dong: DongTraLoi5[] = [];
  let soLoai = 0;
  for (const x of mang) {
    if (x === null || typeof x !== "object") {
      soLoai++;
      continue;
    }
    const o = x as Tho;
    const cau = Array.isArray(o.cau) ? o.cau.map(Number).filter((n) => Number.isInteger(n) && n > 0) : [];
    const tieuDe = chuoi(o.tieuDe);
    const deXuat = chuoi(o.deXuat);
    if (cau.length === 0 || tieuDe === "" || deXuat === "") {
      soLoai++;
      continue;
    }
    const cham = docSoMay(o.soNgayCham) ?? NaN; // chữ AI viết trong JSON → lib/chung/doc-so (chốt 130)
    dong.push({
      cau,
      wbs: chuoi(o.wbs) || undefined,
      tieuDe,
      phanTich: chuoi(o.phanTich) || tieuDe,
      mucDo: o.mucDo === "do" ? "do" : "vang",
      soNgayCham: Number.isFinite(cham) && cham > 0 ? Math.round(cham) : undefined,
      deXuat,
    });
  }
  return { dong, soLoai };
}

/** DX-<n> — số lớn nhất đã dùng +1 (DX-BASE-… là đề xuất máy, đếm riêng) */
export function maDeXuatMoi(daCo: Pick<TheCanhBao, "id">[]): string {
  let max = 0;
  for (const t of daCo) {
    const m = /^DX-(\d+)$/.exec(t.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `DX-${max + 1}`;
}

/** Mã WBS dùng được từ chuỗi LLM trả — ưu tiên mã có trong cây */
export function bocWbs(raw: string | undefined, cay: Map<string, DauViecCay>): string | undefined {
  if (!raw) return undefined;
  const ung = raw.match(/\d+(?:\.\d+)*/g) ?? [];
  for (const w of ung) if (cay.has(w)) return w;
  return ung[0];
}

/**
 * Dựng thẻ từ câu trả lời LLM (thuần — test được). Ảnh hưởng COD do CODE tính:
 * găng → số ngày chậm; không găng → trừ dự trữ (floatDays nếu agent Tiến độ có trả); không gắn WBS / không ước được → 0 + nói thẳng.
 */
export function xayTheNhom5(
  dong: DongTraLoi5[],
  cau: CauNguon[],
  cay: Map<string, DauViecCay & { floatDays?: number }>,
  daCo: TheCanhBao[],
  homNay: string,
  ganTen: (s: string) => string = (s) => s,
): TheCanhBao[] {
  const cauTheoSo = new Map(cau.map((c) => [c.so, c]));
  const daCoMo = daCo.filter((t) => t.dieuKien !== "da-dong");
  const ra: TheCanhBao[] = [];
  const daCap = [...daCo];
  const ngayGiua = (a: string, b: string) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);

  for (const d of dong) {
    const nguon = d.cau.map((n) => cauTheoSo.get(n)).filter((c): c is CauNguon => !!c);
    if (nguon.length === 0) continue;
    const trich = nguon.map((c) => `«${c.trich}»`).join(" · ");
    if (daCoMo.some((t) => t.nguon === "ai" && (t.trichNguyenVan === trich || t.tieuDe === d.tieuDe))) continue;

    const wbs = bocWbs(d.wbs, cay);
    const tt = wbs ? cay.get(wbs) : undefined;
    let soNgayCham = d.soNgayCham;
    let ghiChuTreo = "";
    if (soNgayCham === undefined) {
      const cacNgay = nguon.map((c) => c.ngayDau).filter((x): x is string => !!x).sort();
      if (cacNgay.length > 0) {
        const treo = ngayGiua(cacNgay[0], homNay);
        if (treo > 0) {
          soNgayCham = treo;
          ghiChuTreo = `Số ngày chậm tạm tính = ${treo} ngày treo từ đầu kỳ báo cáo đầu tiên nêu chuyện này (${cacNgay[0].split("-").reverse().join("/")}) tới nay — máy tính, không phải AI ước.`;
        }
      }
    }
    let anhHuongCod = 0;
    let thieuDuLieu: string | undefined;
    if (tt && soNgayCham !== undefined) {
      if (tt.critical === true) {
        anhHuongCod = soNgayCham;
        if (ghiChuTreo) thieuDuLieu = ghiChuTreo;
      } else if (typeof tt.floatDays === "number") {
        anhHuongCod = Math.max(0, soNgayCham - Math.max(0, tt.floatDays));
        if (ghiChuTreo) thieuDuLieu = ghiChuTreo;
      } else {
        thieuDuLieu = "Đầu việc không trên đường găng và agent Tiến độ không trả độ dự trữ → ảnh hưởng COD ghi 0.";
      }
    } else if (!wbs || !tt) {
      thieuDuLieu = "Không gắn được WBS trong tiến độ → chưa tính được ảnh hưởng COD (ghi 0).";
    } else {
      thieuDuLieu = "Câu chữ nguồn không ước được số ngày chậm → ảnh hưởng COD ghi 0.";
    }
    const tenWbs = tt?.name ? String(tt.name) : "";
    const the: TheCanhBao = {
      id: maDeXuatMoi(daCap),
      nguon: "ai",
      mucDo: d.mucDo === "do" ? "red" : "yellow",
      tieuDe: ganTen(d.tieuDe),
      phanTich: ganTen(d.phanTich) + (tenWbs && wbs ? ` (đầu việc ${wbs} — ${tenWbs})` : ""),
      ...(wbs ? { wbs } : {}),
      anhHuongCod,
      nguonDuLieu: Array.from(new Set(nguon.map((c) => c.nguonDuLieu))).join(" · "),
      deXuat: ganTen(d.deXuat),
      ...(thieuDuLieu ? { thieuDuLieu } : {}),
      trichNguyenVan: trich,
      chuaVaoSo: true,
      dieuKien: "dang-vi-pham",
      xuLy: "chua-ai-dong",
      ghiNhan: [],
      ngayMo: homNay,
    };
    daCap.push(the);
    ra.push(the);
  }
  return ra;
}
