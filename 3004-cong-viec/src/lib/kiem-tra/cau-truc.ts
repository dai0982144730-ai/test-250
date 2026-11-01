// ============================================================
// kiem-tra/cau-truc.ts — CẤU TRÚC MẪU THEO NGHĨA (Khai báo mẫu báo cáo không cần sửa code — Mr. Đại duyệt 01/10/2026).
// Thước: 0 Tài liệu thiết kế/DE-XUAT-KHAI-BAO-MAU-BAO-CAO-v0.1-CHO-DUYET.md mục 2–3. File thuần — client import được (luật 10).
//   · Mẫu có `dinh_nghia.cau_truc`: bộ tách việc đọc cột theo NGHĨA (ten, ket_thuc…), không theo tên tag ghi cứng.
//   · Mẫu chưa có: chạy đúng như trước (ảnh chuẩn tests/unit/__chuan__/mau-bao-cao.json phải bằng hệt).
//   · Khi lưu mẫu có cau_truc: bang_cong_viec + muc_bat_buoc SINH LẠI từ đây — ~15 chỗ khác đang đọc hai trường đó vẫn chạy.
// ============================================================
import type { BangSinhViec, CauTrucMau, DinhNghiaMau, NghiaCot } from "@/lib/types";

/** Bộ nghĩa cột cố định — nhãn tiếng Việt hiện ở màn khai báo (mục 2.3). */
export const NHAN_NGHIA_COT: Record<NghiaCot, string> = {
  ten: "Tên việc",
  ket_thuc: "Ngày kết thúc / hạn",
  tinh_trang: "Tình trạng / đã xong",
  du_an: "Dự án",
  phu_trach: "Người / đơn vị phụ trách",
  bat_dau: "Ngày bắt đầu",
  ket_qua_can_co: "Kết quả cần có",
  ma_viec: "Mã việc",
  han_quyet_dinh: "Hạn quyết định",
  them: "Thông tin thêm",
  bo_qua: "Không lấy",
};

/** Cột bảng sinh việc phải có (thiếu thì chặn lưu mẫu — mục 4.1 bước 5). */
export const COT_BAT_BUOC_SINH_VIEC: NghiaCot[] = ["ten", "ket_thuc", "tinh_trang"];

export const NHAN_NGHIA_CHUONG = {
  sinh_viec_bang: "Chương sinh việc — bảng",
  sinh_viec_van_xuoi: "Chương sinh việc — văn xuôi (🤖 AI nhặt)",
  so_lieu: "Chương số liệu",
  thong_tin: "Chương thông tin",
} as const;

export const NHAN_NGHIA_BANG = {
  sinh_viec: "Bảng sinh việc",
  quyet_dinh: "Bảng quyết định của lãnh đạo",
  so_lieu: "Bảng số liệu",
  dac_biet: "Bảng đặc biệt (có code riêng)",
} as const;

export interface AnhXaBang {
  /** nghĩa → tag cột thật trên file */
  theoNghia: Map<NghiaCot, string>;
  /** tag cột thật → nghĩa */
  nghiaCuaTag: Map<string, NghiaCot>;
  /** tag cột "thông tin thêm" → khoá lưu */
  tenThem: Map<string, string>;
}

/** Ánh xạ cột của một bảng theo cau_truc. null = mẫu/bảng chưa khai cau_truc → dùng tag như cũ (tag = nghĩa). */
export function anhXaBang(dn: Pick<DinhNghiaMau, "cau_truc"> | null | undefined, tagBang: string): AnhXaBang | null {
  const b = dn?.cau_truc?.chuong.flatMap((c) => c.bang).find((x) => x.tag === tagBang);
  if (!b || b.nghia === "dac_biet") return null;
  const ax: AnhXaBang = { theoNghia: new Map(), nghiaCuaTag: new Map(), tenThem: new Map() };
  for (const c of b.cot) {
    ax.nghiaCuaTag.set(c.tag, c.nghia);
    if (c.nghia === "them") ax.tenThem.set(c.tag, c.ten_them || c.tag);
    else if (c.nghia !== "bo_qua" && !ax.theoNghia.has(c.nghia)) ax.theoNghia.set(c.nghia, c.tag);
  }
  return ax;
}

/** Khoá dòng việc chuẩn mà bộ tách việc đọc (kiem-tra.ts) — cột "thông tin thêm" trùng tên khoá này được thêm tiền tố. */
const KHOA_CHUAN = new Set(["ma_viec", "ten", "du_an", "hang_muc", "phu_trach", "bat_dau", "ket_thuc", "ket_qua_can_co", "da_xong", "tinh_trang", "han_quyet_dinh", "stt"]);

/**
 * Một dòng bảng (khoá = tag thật) → dòng khoá theo NGHĨA mà bộ tách việc hiểu.
 * Cột nghĩa chuẩn → khoá nghĩa (cột đầu tiên thắng) · "thông tin thêm" → khoá ten_them (cột_khác) · "không lấy" → bỏ ·
 * tag chưa khai → giữ nguyên như cũ (vẫn hiện ở cột khác, không mất dữ liệu).
 */
export function chuanHoaDongTheoNghia(row: Record<string, string>, ax: AnhXaBang): Record<string, string> {
  const ra: Record<string, string> = {};
  for (const [tag, gt] of Object.entries(row)) {
    const n = ax.nghiaCuaTag.get(tag);
    if (n === "bo_qua") continue;
    if (n === "them") {
      const k = ax.tenThem.get(tag) ?? tag;
      ra[KHOA_CHUAN.has(k) ? `them_${k}` : k] = gt;
    } else if (n) {
      if (ax.theoNghia.get(n) === tag) ra[n] = gt;
    } else if (!(tag in ra)) ra[tag] = gt;
  }
  return ra;
}

/** Hai trường cũ sinh từ cau_truc (lưu cùng mẫu): bảng sinh việc + chương bắt buộc. */
export function sinhTruongCu(ct: CauTrucMau): Pick<DinhNghiaMau, "bang_cong_viec" | "muc_bat_buoc"> {
  const bang: BangSinhViec[] = [];
  for (const c of ct.chuong)
    for (const b of c.bang)
      if (b.nghia === "sinh_viec" || b.nghia === "quyet_dinh" || (b.nghia === "dac_biet" && c.nghia === "sinh_viec_bang"))
        bang.push({ tag: b.tag, nhan: b.tieu_de || c.tieu_de, ...(b.nghia === "quyet_dinh" ? { la_quyet_dinh: true } : {}) });
  return { bang_cong_viec: bang, muc_bat_buoc: ct.chuong.filter((c) => c.bat_buoc).map((c) => c.tieu_de) };
}

/** Tên cũ còn nhận của một chương bắt buộc (khoá so = chữ đã chuẩn hoá bởi `chuan`). */
export function tenCuCuaChuong(ct: CauTrucMau | undefined, tieuDe: string, chuan: (s: string) => string): string[] {
  const c = ct?.chuong.find((x) => chuan(x.tieu_de) === chuan(tieuDe));
  return (c?.ten_cu ?? []).map(chuan);
}

/** Lỗi cấu trúc (mục 4.1 bước 5): bảng sinh việc thiếu cột bắt buộc, trùng tag. Rỗng = hợp lệ. */
export function kiemCauTruc(ct: CauTrucMau): string[] {
  const loi: string[] = [];
  const tagBang = new Set<string>();
  for (const c of ct.chuong) {
    if (!c.tieu_de.trim()) loi.push("Có chương chưa có tiêu đề");
    for (const b of c.bang) {
      if (!b.tag && b.nghia === "so_lieu") continue; // bảng số liệu không gắn nhãn — máy không đọc (giữ như bản trước)
      if (!/^bang_[a-z0-9_]+$/.test(b.tag)) loi.push(`Bảng "${b.tieu_de}": tag "${b.tag}" phải dạng bang_… (chữ thường, không dấu)`);
      // bảng số liệu được trùng tag (mẫu cũ Form 6: 2 bảng Tiến độ thi công cùng tag — bộ đọc gộp dòng)
      if (tagBang.has(b.tag) && b.nghia !== "so_lieu") loi.push(`Hai bảng trùng tag "${b.tag}"`);
      tagBang.add(b.tag);
      const tagCot = new Set<string>();
      for (const cot of b.cot) {
        if (tagCot.has(cot.tag)) loi.push(`Bảng "${b.tieu_de}": hai cột trùng tag "${cot.tag}"`);
        tagCot.add(cot.tag);
      }
      if (b.nghia === "sinh_viec" || b.nghia === "quyet_dinh") {
        const co = new Set(b.cot.map((x) => x.nghia));
        const can = b.nghia === "quyet_dinh" ? (["ten"] as NghiaCot[]) : COT_BAT_BUOC_SINH_VIEC;
        for (const n of can) if (!co.has(n)) loi.push(`Bảng sinh việc "${b.tieu_de}" thiếu cột ${NHAN_NGHIA_COT[n]}`);
      }
    }
  }
  return loi;
}
