// ============================================================
// kiem-tra/don-vi-lap.ts — BÁO CÁO CỦA ĐƠN VỊ NÀO (Mr. Đại chốt 29/09/2026):
//   "Báo cáo thuộc đơn vị nào là do NỘI DUNG FILE nói. Người nộp thuộc đơn vị nào chỉ dùng để kiểm có được nộp hay không."
//   Không suy gián tiếp từ đơn vị chính của người nộp (trước đây: anh An — chính HL7, kiêm HL8 — nộp báo cáo HL8 bị ghi vào HL7).
// Thứ tự đọc:
//   1. Ô "Đơn vị lập" (mẫu bản 5: dòng tên đơn vị ngay dưới "BÁO CÁO …");
//   2. file cũ chưa có ô đó: dò các dòng đầu file (trước "Kỳ báo cáo");
//   3. không đọc được: mẫu riêng một đơn vị → đơn vị của mẫu; mẫu dùng chung (Form 7, 8, 10, 11) → không biết (chặn).
// Hàm THUẦN (không đụng CSDL) — kiem-tra.ts nạp danh bạ + cây đơn vị rồi gọi.
// ============================================================
import type { NoiDungWord } from "./doc-word";
import { timTen, type DanhBa } from "./phan-giai";
import { laChuaDien } from "./chuan-hoa";

/** Mẫu nhiều đơn vị dùng chung — phải ghi tên đơn vị trên báo cáo (khớp MAU_DUNG_CHUNG ở scripts/chuyen-mau-that.mjs). */
export const MAU_DUNG_CHUNG = new Set(["form-7", "form-8", "form-10", "form-11"]);

export interface NutDonVi {
  id: string;
  ten: string;
  cha_id: string | null;
  loai: string;
}

export interface KetQuaDonViLap {
  don_vi_id: string | null;
  /** Chữ đã đọc trên báo cáo (để báo lại cho người nộp) */
  chu: string | null;
  cach: "o_don_vi_lap" | "dau_file" | "theo_mau" | null;
  /** Đầu file ghi từ 2 đơn vị khác nhau trở lên (file cũ) */
  mo_ho?: string[];
}

/** Các dòng đầu file (trước "Kỳ báo cáo"), tối đa 8 dòng — nơi mẫu cũ ghi tên đơn vị. */
function dongDauFile(vanBan: string): string[] {
  const kq: string[] = [];
  for (const d of vanBan.split(/\r?\n/)) {
    const t = d.trim();
    if (!t) continue;
    if (/^k[ỳy]\s*b[áa]o\s*c[áa]o/i.test(t)) break;
    kq.push(t);
    if (kq.length >= 8) break;
  }
  return kq;
}

export function xacDinhDonViLap(
  noiDung: Pick<NoiDungWord, "o_nhap" | "van_ban">,
  mau: { ma: string; don_vi_lap: string | null; dinh_nghia?: { o_nhap?: { tag: string }[] } },
  danhBa: DanhBa,
  cay: NutDonVi[],
  chuaDien: string[] = [],
): KetQuaDonViLap {
  const nut = new Map(cay.map((d) => [d.id, d]));
  // Công ty mẹ (gốc cây) không phải đơn vị lập: dòng "CÔNG TY CỔ PHẦN SCI" đầu các mẫu phòng ban
  const laGoc = (id: string) => !nut.get(id)?.cha_id;
  const tim = (chu: string) => {
    const m = timTen(chu, danhBa, true);
    return m && !laGoc(m.id) ? m.id : null;
  };

  const o = noiDung.o_nhap.don_vi_lap;
  if (o !== undefined && o.trim() && !laChuaDien(o, chuaDien)) {
    const id = tim(o.trim());
    if (id) return { don_vi_id: id, chu: o.trim(), cach: "o_don_vi_lap" };
  }
  // Mẫu THIẾT KẾ không có ô "Đơn vị lập" (Form 0 — luôn Ban TGĐ): không dò dòng đầu, lấy đơn vị của mẫu.
  // Đo 30/09: dòng "TRÌNH TỔNG GIÁM ĐỐC" của Form 0 khớp nhầm "Trợ lý CT" → báo cáo Ban TGĐ bị ghi cho Trợ lý CT.
  const mauCoO = !mau.dinh_nghia?.o_nhap || mau.dinh_nghia.o_nhap.some((x) => x.tag === "don_vi_lap");
  if (o === undefined && mauCoO) {
    // File cũ (trước bản 5): dò các dòng đầu
    const thay = new Map<string, string>();
    for (const d of dongDauFile(noiDung.van_ban ?? "")) {
      const id = tim(d.replace(/^g[ửu]i\s*:.*$/i, "").trim());
      if (id && !thay.has(id)) thay.set(id, d);
    }
    if (thay.size === 1) {
      const [[id, chu]] = Array.from(thay.entries());
      return { don_vi_id: id, chu, cach: "dau_file" };
    }
    if (thay.size > 1 && MAU_DUNG_CHUNG.has(mau.ma)) {
      return { don_vi_id: null, chu: Array.from(thay.values()).join(" / "), cach: null, mo_ho: Array.from(thay.keys()) };
    }
  }
  if (mau.don_vi_lap && !MAU_DUNG_CHUNG.has(mau.ma)) return { don_vi_id: mau.don_vi_lap, chu: o?.trim() || null, cach: "theo_mau" };
  return { don_vi_id: null, chu: o?.trim() || null, cach: null };
}

/** Người nộp có thuộc đơn vị X không: đơn vị chính / kiêm nhiệm, hoặc chức danh nằm ngay dưới X (lãnh đạo trong Ban TGĐ). */
export function thuocDonVi(donViCuaNguoi: string[], x: string, cay: NutDonVi[]): boolean {
  if (donViCuaNguoi.includes(x)) return true;
  const nut = new Map(cay.map((d) => [d.id, d]));
  return donViCuaNguoi.some((u) => nut.get(u)?.cha_id === x && nut.get(u)?.loai === "chuc_danh");
}
