// ============================================================
// phan-tich.ts — NHẬN DẠNG CHUỖI DẪN NGUỒN (lệnh Mr. Đại 07/09 điểm 2–3)
//
// Mọi chỗ AI/máy nêu căn cứ đều ghi nguồn dạng chữ ("BC ngày 2026-08-27 —
// Điện 8 · BC tuần 2026-W35 — sheet Vấn đề dòng 2"). File này là ĐỊNH NGHĨA
// DUY NHẤT (luật 7) cách đọc chuỗi đó thành mốc bấm được — client và server
// dùng chung (THUẦN, không fs, không fetch).
//
// Khuôn chuỗi (đúng khuôn sinh-nhom5.ts đang ghi):
//   "BC ngày <ISO>[ → <ISO>[ (n báo cáo)]] — <nhà thầu>"
//     (nhà thầu ghi "tất cả nhà thầu" = không lọc — popup hiện mọi nhà thầu)
//   "BC tuần <YYYY-Wnn> — sheet <tên>[ dòng <n>]"
//   "màn <tên> (</đường-dẫn>)" — nguồn là một bảng NGAY TRONG APP (ví dụ bảng
//     Theo dõi thiết kế) → link chuyển tới màn đó thay vì popup.
// Đoạn không khớp khuôn → loai "chu", hiện chữ thường không bấm được.
//
// MUỐN GHI chuỗi nguồn ở bất kỳ bộ sinh nào: dùng taBcNgay/taBcTuan/taMan
// dưới đây — cấm tự ghép chuỗi tay ở nơi khác (chệch khuôn là mất link).
// ============================================================

export interface MocNguon {
  /** Chuỗi gốc nguyên văn của đoạn này */
  chu: string;
  loai: "bc-ngay" | "bc-tuan" | "man" | "chu";
  /** bc-ngay — nhaThau bỏ trống = mọi nhà thầu */
  tuNgay?: string;
  denNgay?: string;
  nhaThau?: string;
  /** bc-tuan */
  tuan?: string;
  sheet?: string;
  dong?: number;
  /** man — màn trong app */
  tenMan?: string;
  duongDan?: string;
}

const RE_BC_NGAY = /^BC ngày (\d{4}-\d{2}-\d{2})(?:\s*→\s*(\d{4}-\d{2}-\d{2})(?:\s*\(\d+ báo cáo\))?)?\s*—\s*(.+)$/;
const RE_BC_TUAN = /^BC tuần (\d{4}-W\d{2})\s*—\s*sheet\s+(.+?)(?:\s+dòng\s+(\d+|\?))?$/;
const RE_MAN = /^màn (.+?) \((\/[a-z0-9/?=&#-]*)\)$/;

/** Nhãn "mọi nhà thầu" — popup không lọc */
export const MOI_NHA_THAU = "tất cả nhà thầu";

/** Đọc MỘT đoạn nguồn */
export function docMotMoc(doan: string): MocNguon {
  const chu = doan.trim();
  const ngay = RE_BC_NGAY.exec(chu);
  if (ngay) {
    const nhaThau = ngay[3].trim();
    return {
      chu,
      loai: "bc-ngay",
      tuNgay: ngay[1],
      denNgay: ngay[2] || undefined,
      ...(nhaThau.toLowerCase() === MOI_NHA_THAU ? {} : { nhaThau }),
    };
  }
  const tuan = RE_BC_TUAN.exec(chu);
  if (tuan) {
    const dong = tuan[3] && tuan[3] !== "?" ? Number(tuan[3]) : undefined;
    return { chu, loai: "bc-tuan", tuan: tuan[1], sheet: tuan[2].trim(), ...(dong ? { dong } : {}) };
  }
  const man = RE_MAN.exec(chu);
  if (man) {
    return { chu, loai: "man", tenMan: man[1], duongDan: man[2] };
  }
  return { chu, loai: "chu" };
}

// ===== HÀM GHI — nơi duy nhất được ghép chuỗi nguồn (luật 7) =====

/** "BC ngày 2026-08-27 — Điện 8" · có khoảng: "BC ngày a → b (n báo cáo) — X" */
export function taBcNgay(
  tu: string,
  tuy?: { den?: string; soBc?: number; nhaThau?: string }
): string {
  const den = tuy?.den && tuy.den !== tu ? ` → ${tuy.den}${tuy.soBc ? ` (${tuy.soBc} báo cáo)` : ""}` : "";
  return `BC ngày ${tu}${den} — ${tuy?.nhaThau ?? MOI_NHA_THAU}`;
}

/** "BC tuần 2026-W35 — sheet Vấn đề dòng 2" */
export function taBcTuan(tuan: string, sheet: string, dong?: number | string): string {
  return `BC tuần ${tuan} — sheet ${sheet}${dong !== undefined ? ` dòng ${dong}` : ""}`;
}

/** "màn Theo dõi thiết kế (/thiet-ke)" — nguồn là bảng ngay trong app */
export function taMan(ten: string, duongDan: string): string {
  return `màn ${ten} (${duongDan})`;
}

/** Tách chuỗi nguồn nhiều đoạn (phân cách " · ") thành các mốc */
export function tachDanNguon(chuoi: string | undefined | null): MocNguon[] {
  if (!chuoi || chuoi.trim() === "") return [];
  return chuoi
    .split(" · ")
    .map((d) => d.trim())
    .filter((d) => d !== "")
    .map(docMotMoc);
}
