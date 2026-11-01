// ============================================================
// bao-mat/quy-tac.ts — LUẬT BẢO MẬT BÁO CÁO TÀI CHÍNH (thuần, không đụng CSDL hay tệp — dùng được client lẫn server, dễ test).
// Mr. Đại chốt 07/10/2026: báo cáo theo mẫu mật (Form 4 — Phòng TCKT) có chương mật; chỉ người có tên trong danh sách
// (Cài đặt › Bảo mật báo cáo tài chính) + chính người tải bản đó lên thấy đủ. Quản trị KHÔNG được ngoại lệ.
// Cắt tệp ở bao-mat/cat-chuong.ts · lọc ở nguồn đọc tệp ở bao-mat/loc.ts.
// ============================================================
import type { CauHinh } from "@/lib/cau-hinh/mac-dinh";

type BaoMat = CauHinh["bao_mat"];

/** Bỏ dấu, viết hoa, gộp khoảng trắng — để so tên chương không lệ thuộc cách gõ */
export function boDauHoa(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "D")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

const LA_MA = /^([IVXL]{1,6})\s*[.):]\s*/;

/** Số La Mã đầu tiêu đề ("III. BÁO CÁO…" → 3); không có → null */
export function soLaMa(chu: string): number | null {
  const m = LA_MA.exec(boDauHoa(chu));
  if (!m) return null;
  const gt: Record<string, number> = { I: 1, V: 5, X: 10, L: 50 };
  let tong = 0;
  const s = m[1]!;
  for (let i = 0; i < s.length; i++) {
    const a = gt[s[i]!]!;
    const b = i + 1 < s.length ? gt[s[i + 1]!]! : 0;
    tong += a < b ? -a : a;
  }
  return tong > 0 ? tong : null;
}

/**
 * Gốc tên chương để so: bỏ dấu, bỏ số La Mã đầu, chỉ lấy phần trước dấu "—"/"–"/" - ".
 * "II. BÁO CÁO NGUỒN TIỀN — ĐƠN VỊ: TRIỆU ĐỒNG" → "BAO CAO NGUON TIEN".
 */
export function gocTenChuong(chu: string): string {
  return boDauHoa(chu)
    .replace(LA_MA, "")
    .split(/\s[—–-]\s|\s*[—–]\s*/)[0]!
    .replace(/[\s.:]+$/, "")
    .trim();
}

/** Danh sách gốc tên chương mật (bỏ dòng trống, gốc quá ngắn dễ khớp nhầm thì bỏ) */
export function gocChuongMat(cfg: Pick<BaoMat, "chuong_mat">): string[] {
  return Array.from(new Set(cfg.chuong_mat.map(gocTenChuong).filter((g) => g.length >= 6)));
}

export function laMauMat(cfg: Pick<BaoMat, "mau_mat">, ma: string | null | undefined): boolean {
  if (!ma) return false;
  return cfg.mau_mat.some((m) => m.trim() === ma);
}

/** Có tên trong danh sách được xem đủ (so cả email lẫn mã tài khoản — mã có thể khác email, vd truong.tckt@…) */
export function coTenTrongDanhSach(cfg: Pick<BaoMat, "nguoi_duoc_xem">, nd: { id: string; email?: string | null }): boolean {
  const ds = new Set(cfg.nguoi_duoc_xem.map((x) => x.trim().toLowerCase()).filter(Boolean));
  return ds.has(nd.id.toLowerCase()) || (!!nd.email && ds.has(nd.email.toLowerCase()));
}

/**
 * Được xem ĐỦ một bản: có tên trong danh sách, hoặc chính người tải bản đó lên (Q1 — thấy đủ bản của mình; đồng nghiệp cùng
 * phòng thì không). Quản trị không ngoại lệ (kẽ hở 4). nd null = máy / AI chạy ngầm / agent khác → không bao giờ.
 */
export function duocXemDu(cfg: Pick<BaoMat, "nguoi_duoc_xem">, nd: { id: string; email?: string | null } | null, taiLenBoi: string | null | undefined): boolean {
  if (!nd) return false;
  if (taiLenBoi && taiLenBoi === nd.id) return true;
  return coTenTrongDanhSach(cfg, nd);
}

/**
 * Chế độ mở nội dung một tài liệu (Q4): tài liệu KHÔNG theo mẫu mật của đơn vị trong `don_vi_theo_quyen` → xét theo phân quyền
 * dù cài đặt Thư mục để "tat_ca". Tài liệu theo mẫu mật thì ai cũng mở được — nhưng chỉ nhận bản đã cắt (bao-mat/loc.ts).
 */
export function cheDoXemNoiDung(
  cheDoChung: "tat_ca" | "theo_quyen",
  cfg: Pick<BaoMat, "mau_mat" | "don_vi_theo_quyen">,
  tl: { don_vi_lap?: string | null; mau_ma?: string | null },
): "tat_ca" | "theo_quyen" {
  if (cheDoChung === "theo_quyen") return "theo_quyen";
  if (tl.don_vi_lap && cfg.don_vi_theo_quyen.includes(tl.don_vi_lap) && !laMauMat(cfg, tl.mau_ma)) return "theo_quyen";
  return "tat_ca";
}

/** Khoá của kết quả kiểm tra được giữ khi trả bản đã cắt — đầu báo cáo + việc chương "Kết quả và kế hoạch việc" */
const KHOA_KQ_GIU = ["dat", "mau_ma", "ky_bao_cao", "ngay_nop", "gui_den", "o_nhap", "cong_viec", "luat_da_dung"];

/**
 * Kết quả kiểm tra lúc nộp của bản đã cắt (kẽ hở 5): chỉ giữ phần không mật; dòng lỗi chỉ giữ dòng thuộc bảng công việc
 * (dòng lỗi khác có thể trích chữ trong chương mật). Đo 07/10 trên 4 bản Form 4: không bản nào có số tài chính trong
 * kết quả, nhưng lọc theo danh sách GIỮ để trường mới thêm sau này mặc định bị bỏ.
 */
export function catKetQuaKiemTra<T>(kq: T): T {
  if (!kq || typeof kq !== "object") return kq;
  const goc = kq as Record<string, unknown>;
  const moi: Record<string, unknown> = {};
  for (const k of KHOA_KQ_GIU) if (k in goc) moi[k] = goc[k];
  if (Array.isArray(goc.loi)) {
    moi.loi = (goc.loi as { vi_tri?: { bang?: string } | null }[]).filter((l) => l?.vi_tri?.bang === "bang_cong_viec");
  }
  return moi as T;
}
