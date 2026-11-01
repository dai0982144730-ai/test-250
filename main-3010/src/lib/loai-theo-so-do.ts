// ============================================================
// loai-theo-so-do.ts — LOẠI TÀI KHOẢN THEO SƠ ĐỒ TỔ CHỨC + THEO DỰ ÁN (LOI-DUNG-CHUNG 6g.6.13 — Mr. Đại chốt 03/10/2026 tối).
// File THUẦN (luật 10). MỘT định nghĩa duy nhất (luật 7): Main tính, giao kèm người dùng cho các agent — agent chỉ tra, không tự tính.
//
//   Main (không theo dự án): PM · Admin giữ loại đã khai · LÃNH ĐẠO + TRƯỞNG = Người dùng · còn lại Người xem.
//     (Mr. Đại chốt lại 12/10/2026: «Main giữ như đang chạy … Main không chia theo dự án».)
//   Tiến độ · Hợp đồng · Pháp lý (theo dự án) — ⭐ ĐỔI 12/10/2026 (Mr. Đại, KE-HOACH/13 câu 1–4, plan chốt 140):
//     PM · Admin đủ quyền · THUỘC dự án = Người dùng · MỌI người còn lại = Người xem.
//     · BỎ ngoại lệ «lãnh đạo là Người dùng mọi dự án»: lãnh đạo không gắn dự án nào = Người xem. Muốn gắn một lãnh đạo vào
//       dự án: thêm dòng KIÊM NHIỆM của người đó vào Ban QLDA / Ban điều hành ở sơ đồ tổ chức (agent Công việc).
//     · BỎ luật «cấp trên»: chỉ người của CHÍNH đơn vị gắn (chính hoặc kiêm nhiệm) mới là người dự án.
//     · Người chỉ thuộc nhà máy: Người xem như mọi người (trước là «không thấy dự án»).
//   "Thuộc dự án" = đơn vị chính hoặc kiêm nhiệm là ĐƠN VỊ GẮN của dự án (Ban QLDA đứng đầu · đơn vị làm · Ban điều hành).
//     KHÔNG tính cấp trên, KHÔNG tính cấp dưới.
//   Lãnh đạo = mang vai "lanh-dao" ở agent Công việc (7 người) · Trưởng = vai "truong-don-vi" ở đơn vị chưa có trưởng chính
//     khác, hoặc là trưởng chính — TRỪ đơn vị nhà máy (cách tính chép từ agent Công việc src/lib/phien.ts).
//   ⏸ ④ vai trò đang khai ở agent Công việc — Main dùng bản chép `vaiCongViec` do bộ chuyển ghi; từ Đợt 3 sửa ở đâu: chốt sau.
//   Tổ chức chưa có / hỏng → KHÔNG tính gì, giữ loại + danh sách dự án đã khai (như trước 6g.6.13).
// ============================================================
import { laNhaThau, luonMoiDuAn, type Role } from "@/lib/quyen";
import type { DonViToChuc, ToChuc } from "@/lib/to-chuc-kieu";

export const VAI_LANH_DAO = "lanh-dao";
export const VAI_TRUONG = "truong-don-vi";

/** Loại của một người ở một dự án. `null` = không thấy dự án — từ 12/10/2026 công thức không còn sinh ra `null` (giữ kiểu cho dữ liệu cũ) */
export type LoaiDuAn = "engineer" | "viewer" | null;

export interface NguoiSoDo {
  id?: string;
  email: string;
  role: Role;
  donViId?: string | null;
  /** Bản chép vai trò ở agent Công việc (bộ chuyển ghi) */
  vaiCongViec?: string[];
}

export interface DuAnSoDo {
  id: string;
  donVi?: string[];
  banDieuHanh?: string | null;
}

/** Mã người để đối chiếu kiêm nhiệm / trưởng chính: mã bất biến (A1), người cũ chưa có mã thì dùng email */
const maNguoi = (u: NguoiSoDo): string => u.id ?? u.email;
/** PM · Admin (người có quyền Cài đặt) — luôn giữ loại đã khai, mọi dự án đủ quyền */
const laQuanLy = (r: Role): boolean => luonMoiDuAn(r);
/** Loại KHÔNG tính theo sơ đồ: PM · Admin (luôn đủ quyền) và Nhà thầu (18/10/2026 — người ngoài công ty, không có trên sơ đồ) */
const giuLoaiDaKhai = (r: Role): boolean => laQuanLy(r) || laNhaThau(r);
/** Bỏ trùng, giữ thứ tự (dự án dịch ES5 — không trải Set được) */
const duyNhat = (ds: string[]): string[] => ds.filter((x, i) => ds.indexOf(x) === i);

/** Bảng tra dựng một lần cho cả lượt tính (52 người × 15 dự án) */
export interface BangSoDo {
  donVi: DonViToChuc[];
  theoMa: Map<string, DonViToChuc>;
  kiemNhiem: Map<string, string[]>;
}

export function dungBang(tc: ToChuc): BangSoDo {
  const theoMa = new Map(tc.don_vi.map((d) => [d.id, d]));
  const kiemNhiem = new Map<string, string[]>();
  for (const k of tc.kiem_nhiem) kiemNhiem.set(k.nguoi_id, [...(kiemNhiem.get(k.nguoi_id) ?? []), k.don_vi_id]);
  return { donVi: tc.don_vi, theoMa, kiemNhiem };
}

/** Chuỗi cấp trên của một đơn vị (không gồm chính nó), chặn vòng lặp */
function capTren(ma: string, b: BangSoDo): string[] {
  const kq: string[] = [];
  let c = b.theoMa.get(ma)?.cha_id ?? null;
  while (c && !kq.includes(c) && c !== ma) {
    kq.push(c);
    c = b.theoMa.get(c)?.cha_id ?? null;
  }
  return kq;
}

/**
 * Đơn vị nhà máy: tên đơn vị hoặc một cấp trên của nó bắt đầu bằng "Nhà máy".
 * ⏸ Agent Công việc chưa có loại đơn vị riêng cho nhà máy (đo 03/10: 7 đơn vị "NM …" cùng loại `don_vi` dưới P.KT&VH) —
 * nhận theo tên như lần đo 03/10; có loại riêng thì đổi đúng hàm này.
 */
export function laDonViNhaMay(ma: string, b: BangSoDo): boolean {
  return [ma, ...capTren(ma, b)].some((x) => /^nhà máy/i.test((b.theoMa.get(x)?.ten ?? "").trim()));
}

/** Đơn vị của người: chính + kiêm nhiệm, chỉ đơn vị đang hoạt động */
export function donViCua(u: NguoiSoDo, b: BangSoDo): string[] {
  const ds = [u.donViId, ...(b.kiemNhiem.get(maNguoi(u)) ?? [])].filter((x): x is string => !!x && b.theoMa.get(x)?.active === true);
  return duyNhat(ds);
}

export const laLanhDao = (u: NguoiSoDo): boolean => (u.vaiCongViec ?? []).includes(VAI_LANH_DAO);

/** Đơn vị người này làm trưởng — chép cách tính của agent Công việc (src/lib/phien.ts `donViTruong`) */
export function donViTruong(u: NguoiSoDo, b: BangSoDo): string[] {
  const ma = maNguoi(u);
  const coVai = (u.vaiCongViec ?? []).includes(VAI_TRUONG);
  const theoVai = coVai
    ? donViCua(u, b).filter((d) => {
        const tc = b.theoMa.get(d)?.uy_quyen_truong;
        return !tc || tc === ma;
      })
    : [];
  const truongChinh = b.donVi.filter((d) => d.active && d.uy_quyen_truong === ma).map((d) => d.id);
  return duyNhat([...theoVai, ...truongChinh]);
}

/** Trưởng theo nghĩa 6g.6.13: làm trưởng ít nhất một đơn vị KHÔNG phải nhà máy (bỏ GĐ nhà máy) */
export const laTruong = (u: NguoiSoDo, b: BangSoDo): boolean => donViTruong(u, b).some((d) => !laDonViNhaMay(d, b));

/** Người CHỈ thuộc nhà máy (mọi đơn vị chính + kiêm nhiệm đều là nhà máy) */
export function chiThuocNhaMay(u: NguoiSoDo, b: BangSoDo): boolean {
  const ds = donViCua(u, b);
  return ds.length > 0 && ds.every((d) => laDonViNhaMay(d, b));
}

/** Đơn vị gắn của dự án: Ban QLDA đứng đầu · đơn vị làm · Ban điều hành */
export const donViGan = (p: DuAnSoDo): string[] => duyNhat([...(p.donVi ?? []), ...(p.banDieuHanh ? [p.banDieuHanh] : [])]);

/** Thuộc dự án: một đơn vị của người (chính hoặc kiêm nhiệm) LÀ đơn vị gắn của dự án — không tính cấp trên, không tính cấp dưới (12/10/2026) */
export function thuocDuAn(u: NguoiSoDo, p: DuAnSoDo, b: BangSoDo): boolean {
  const cuaNguoi = donViCua(u, b);
  if (!cuaNguoi.length) return false;
  return donViGan(p).some((g) => cuaNguoi.includes(g));
}

/**
 * Bản TRƯỚC 12/10/2026 — đơn vị gắn HOẶC cấp trên của đơn vị gắn. Chỉ còn Main dùng cho việc của riêng nó (người chỉ thuộc nhà
 * máy vào dự án nào trên Main — `canAccessProjectByEmail`), vì Mr. Đại chốt «Main giữ như đang chạy». Không dùng để xếp loại.
 */
export function thuocDuAnKeCapTren(u: NguoiSoDo, p: DuAnSoDo, b: BangSoDo): boolean {
  const cuaNguoi = donViCua(u, b);
  if (!cuaNguoi.length) return false;
  return donViGan(p).some((g) => [g, ...capTren(g, b)].some((x) => cuaNguoi.includes(x)));
}

/** Loại ở Main */
export function loaiOMain(u: NguoiSoDo, b: BangSoDo): Role {
  if (giuLoaiDaKhai(u.role)) return u.role;
  return laLanhDao(u) || laTruong(u, b) ? "engineer" : "viewer";
}

/**
 * Loại ở một dự án (Tiến độ · Hợp đồng · Pháp lý). PM/Admin không đi qua hàm này — luôn đủ quyền.
 * ⭐ 12/10/2026: thuộc dự án = Người dùng; mọi người còn lại (kể cả lãnh đạo chưa gắn dự án, người nhà máy) = Người xem.
 */
export function loaiTheoDuAn(u: NguoiSoDo, p: DuAnSoDo, b: BangSoDo): LoaiDuAn {
  return thuocDuAn(u, p, b) ? "engineer" : "viewer";
}

/**
 * Bản tính cho một người: loại ở Main + loại từng dự án (khoá = `id` truyền vào — bản giao agent dùng MÃ NGẮN, vd "HV").
 * PM/Admin → `theoDuAn` undefined (mọi dự án đủ quyền).
 */
export function tinhChoNguoi(u: NguoiSoDo, duAn: DuAnSoDo[], b: BangSoDo): { role: Role; theoDuAn?: Record<string, LoaiDuAn> } {
  const role = loaiOMain(u, b);
  if (giuLoaiDaKhai(u.role)) return { role };
  return { role, theoDuAn: Object.fromEntries(duAn.map((p) => [p.id, loaiTheoDuAn(u, p, b)])) };
}
