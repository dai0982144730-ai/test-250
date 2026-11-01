// ============================================================
// loai-du-an.ts — LOẠI TÀI KHOẢN THEO TỪNG DỰ ÁN (LOI-DUNG-CHUNG 6g.6.13 — Mr. Đại chốt 03/10/2026 tối). File THUẦN (luật 10).
//   Main tính theo sơ đồ tổ chức rồi giao kèm người dùng: `loaiTheoDuAn` = mã ngắn dự án (HV · TT · NK1…) →
//   "engineer" (thuộc dự án) | "viewer" (không thuộc) | null (không thấy dự án — từ 12/10/2026 Main không còn giao null).
//   ⭐ 12/10/2026 (Mr. Đại): bỏ ngoại lệ «lãnh đạo là Người dùng mọi dự án», bỏ luật «cấp trên», người nhà máy = Người xem —
//   lãnh đạo muốn là người của một dự án thì gắn KIÊM NHIỆM vào Ban QLDA / Ban điều hành ở sơ đồ tổ chức (agent Công việc).
//   Agent CHỈ TRA bảng này, không tự tính (luật 7 — định nghĩa duy nhất ở Main lib/loai-theo-so-do.ts).
//   Không có bảng (Main chưa có tổ chức) → giữ loại + danh sách dự án đã khai, như trước 6g.6.13.
// CHÉP SANG AGENT KHÁC: chép nguyên file (Tiến độ · Hợp đồng dùng y hệt) — TRỪ khối «PM theo từng dự án» ở cuối: chỉ Hợp đồng và Main có.
// ============================================================
import { duocGhi, duocQuanLyNguoiDung, luonMoiDuAn, type Role } from "@/lib/quyen";

export type LoaiDuAn = "engineer" | "viewer" | null;
export type BangLoaiDuAn = Record<string, LoaiDuAn>;

export function laBangLoaiDuAn(v: unknown): v is BangLoaiDuAn {
  return (
    v !== null &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    Object.values(v as Record<string, unknown>).every((x) => x === null || x === "engineer" || x === "viewer")
  );
}

const khoa = (ma: string | null | undefined): string => (ma ?? "").trim().toUpperCase();

/** Loại của người ở một dự án (theo mã ngắn). PM · Admin giữ nguyên; dự án ngoài bảng hoặc "không thấy" → Người xem */
export function loaiODuAn(u: { role: Role; loaiTheoDuAn?: BangLoaiDuAn }, maDuAn: string | null | undefined): Role {
  if (luonMoiDuAn(u.role) || !u.loaiTheoDuAn) return u.role;
  return u.loaiTheoDuAn[khoa(maDuAn)] === "engineer" ? "engineer" : "viewer";
}

/**
 * Người có thấy dự án không. `null` = chưa có bảng → dùng luật cũ (projectIds).
 * Dự án không mã ngắn (dự án demo) hoặc chưa có trong bảng → thấy (chốt "mọi người thấy hết trừ nhà máy").
 */
export function thayDuAn(u: { role?: string; loaiTheoDuAn?: BangLoaiDuAn }, maDuAn: string | null | undefined): boolean | null {
  if (luonMoiDuAn(u.role)) return true;
  if (!u.loaiTheoDuAn) return null;
  return u.loaiTheoDuAn[khoa(maDuAn)] !== null;
}

// ===== AGENT CHỨA TÀI LIỆU MẬT — Hợp đồng · Pháp lý (Mr. Đại chốt 04/10/2026 tối) =====
// Ở agent mật, "không thuộc dự án" = KHÔNG THẤY dự án đó (khác Tiến độ: không thuộc vẫn xem được).
// Người xem = không thuộc dự án nào theo sơ đồ (và không phải PM/Admin) → không vào được agent mật.

/** Agent mật: người có thấy dự án không. PM · Admin thấy hết; có bảng → chỉ dự án mình THUỘC; `null` = chưa có bảng (luật cũ) */
export function thayDuAnMat(u: { role?: string; loaiTheoDuAn?: BangLoaiDuAn }, maDuAn: string | null | undefined): boolean | null {
  if (luonMoiDuAn(u.role)) return true;
  if (!u.loaiTheoDuAn) return null;
  return u.loaiTheoDuAn[khoa(maDuAn)] === "engineer";
}

/**
 * Được vào agent mật không: PM · Admin; hoặc thuộc ít nhất MỘT dự án theo sơ đồ. Chưa có bảng (Main chưa có tổ chức)
 * → theo loại chung: Người dùng trở lên. Không thuộc dự án nào → không vào (vào cũng không thấy gì).
 */
export function duocVaoAgentMat(u: { role?: string; loaiTheoDuAn?: BangLoaiDuAn }): boolean {
  if (luonMoiDuAn(u.role)) return true;
  if (!u.loaiTheoDuAn) return duocGhi(u.role);
  return Object.values(u.loaiTheoDuAn).some((x) => x === "engineer");
}

/**
 * Mã danh bạ của agent mật — dãy link agent (menu tên người, cột trái Main) mờ link này với người không vào được.
 * ⭐ 12/10/2026 (Mr. Đại): CHỈ CÒN agent Hợp đồng. Agent Pháp lý mở thư viện luật · mẫu biểu · hướng dẫn cho mọi người đã đăng nhập
 *   (hồ sơ của dự án tự kín bên đó) nên link sang Pháp lý không khoá nữa.
 */
export const MA_AGENT_MAT: readonly string[] = ["hopdong"];

/** Chữ cạnh link agent mật bị khoá (luật 17: mờ kèm lý do) */
export const LY_DO_LINK_AGENT_MAT = "chỉ thành viên dự án — bạn chưa thuộc dự án nào";

/** Gắn lý do khoá vào link agent mật khi người đang mở không vào được (máy chủ gọi trong /api/lien-ket-agent) */
export function ganKhoaAgentMat<T extends { ma: string }>(day: T[], duocVao: boolean): (T & { khoa?: string })[] {
  return duocVao ? day : day.map((a) => (MA_AGENT_MAT.includes(a.ma) ? { ...a, khoa: LY_DO_LINK_AGENT_MAT } : a));
}

/** Câu báo khi không vào được agent mật — tiếng Việt, nói rõ cách mở */
export function lyDoKhongVaoAgentMat(tenAgent: string): string {
  return (
    `${tenAgent} chứa tài liệu mật — chỉ thành viên dự án được vào. Theo sơ đồ tổ chức bạn chưa thuộc dự án nào. ` +
    `Cần vào thì nhờ quản trị gắn bạn (chính hoặc kiêm nhiệm) vào đơn vị của dự án ở sơ đồ tổ chức (agent Công việc), ` +
    `hoặc ghi bạn ở ô «Giám đốc dự án» của dự án (Main → Cài đặt → Dự án).`
  );
}

// ===== ⭐ PM THEO TỪNG DỰ ÁN — riêng agent HỢP ĐỒNG (Mr. Đại chốt 12/10/2026) =====
// «PM của dự án nào thì vào xem và duyệt phiếu giá dự án đó được thôi chứ không thể xem duyệt phiếu giá dự án mình không phải PM.»
// PM của một dự án = người ghi ở ô «Giám đốc dự án» của dự án đó (Main → Cài đặt → Dự án; agent kéo về cùng danh sách dự án).
//   • XEM: loại tài khoản PM KHÔNG còn mở mọi dự án ở agent Hợp đồng — chỉ dự án mình làm Giám đốc dự án.
//   • KÝ phiếu giá: chỉ Giám đốc dự án của chính dự án đó (thay «PM nào cũng ký mọi dự án» của 25/09) — lib/hop-dong/ky-thuan.
//   • Người không mang loại PM mà được ghi làm Giám đốc dự án: coi như người của dự án đó, và ký được.
//   • Admin vẫn thấy mọi dự án (để cài đặt), không ký.
// Các hàm xét dự án phía trên GIỮ NGUYÊN — nơi gọi đưa người qua `nguoiXetHopDong` trước (ở Hợp đồng: `nguoiXetMat` của lib/projects).

export interface DuAnCoGiamDoc {
  ma?: string | null;
  giamDoc?: string | null;
}

/** Người này có phải Giám đốc dự án (PM) của dự án không — so email, không phân biệt hoa thường */
export function laGiamDocDuAn(email: string | null | undefined, duAn: DuAnCoGiamDoc | null | undefined): boolean {
  const a = (email ?? "").trim().toLowerCase();
  const b = (duAn?.giamDoc ?? "").trim().toLowerCase();
  return a !== "" && a === b;
}

/**
 * Người để XÉT DỰ ÁN ở agent Hợp đồng: bảng loại theo dự án Main giao, CỘNG các dự án người này làm Giám đốc dự án.
 * Loại PM bị hạ về Người dùng CHỈ trong phép xét dự án (để các hàm phía trên không mở mọi dự án cho PM); cửa quyền (ghi, cài đặt)
 * vẫn theo loại thật — nơi gọi không dùng kết quả hàm này để xét cửa.
 */
export function nguoiXetHopDong<T extends { role?: string; loaiTheoDuAn?: BangLoaiDuAn }>(u: T, email: string | null | undefined, duAn: readonly DuAnCoGiamDoc[]): T {
  if (duocQuanLyNguoiDung(u.role)) return u; // Admin: mọi dự án
  const cuaToi = duAn.filter((p) => laGiamDocDuAn(email, p) && khoa(p.ma) !== "").map((p) => khoa(p.ma));
  const laPm = luonMoiDuAn(u.role);
  if (!laPm && cuaToi.length === 0) return u;
  const bang: BangLoaiDuAn = { ...(u.loaiTheoDuAn ?? {}) };
  for (const ma of cuaToi) bang[ma] = "engineer";
  return { ...u, role: laPm ? "engineer" : u.role, loaiTheoDuAn: bang };
}
