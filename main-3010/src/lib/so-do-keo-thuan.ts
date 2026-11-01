// ============================================================
// so-do-keo-thuan.ts — KÉO SƠ ĐỒ TỔ CHỨC TỪ AGENT CÔNG VIỆC VỀ MAIN: phần so sánh + chốt an toàn. File THUẦN (luật 10).
// (Mr. Đại chốt 12/10/2026 — câu 9 bản rà phân quyền: "Làm: 30 phút + nút kéo" · "Báo + một nút tạo" · "Main tự khoá")
//
// Vì sao: Main tính "ai thuộc dự án nào" từ sơ đồ (đơn vị chính · kiêm nhiệm · vai lãnh đạo / trưởng) nhưng sơ đồ đang SỬA
// ở agent Công việc; bản Main giữ là bản chép tay 04/10. Thêm một dòng kiêm nhiệm bên đó mà Main không biết thì quyền ở
// Tiến độ · Hợp đồng · Pháp lý đứng yên.
//
// Bộ kéo ĐƯỢC đổi:  cây đơn vị · kiêm nhiệm (data/to-chuc.json) · đơn vị chính, chức vụ, cấp chức vụ, vai trò của người
//                   ĐÃ có tài khoản · khoá tài khoản của người đã bị khoá / xoá bên agent Công việc (không xoá).
// Bộ kéo KHÔNG đổi: mật khẩu · email · tên · loại PM / Quản trị · dự án được vào · bảng ủy quyền ký · 3 ô đơn vị của dự án.
// Người MỚI bên agent Công việc: chỉ BÁO; tài khoản tạo khi quản trị bấm một nút (mật khẩu lần đầu = email).
// ⚠ Cầu TẠM tới Đợt 3 của LOI-DUNG-CHUNG 6g.6.3 (màn sửa tổ chức chuyển lên Main): lúc đó TẮT bộ kéo này.
// ============================================================
import { chuanHoaToChuc, type DonViToChuc, type KiemNhiemToChuc, type ToChuc } from "@/lib/to-chuc-kieu";

export const CONG_CU_SO_DO = "base.so_do_to_chuc";
export const NHIP_KEO_PHUT = 30;

export interface NguoiSoDo {
  id: string;
  email: string;
  ten: string;
  don_vi_id: string | null;
  chuc_vu: string | null;
  cap_chuc_vu: number | null;
  active: boolean;
  vai: string[];
}

export interface SoDoKeoVe {
  don_vi: DonViToChuc[];
  kiem_nhiem: KiemNhiemToChuc[];
  nguoi: NguoiSoDo[];
}

/** Phần của một tài khoản Main mà bộ kéo được XEM. Không có mật khẩu. */
export interface NguoiMainGon {
  id?: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  donViId?: string | null;
  chucVu?: string | null;
  capChucVu?: number | null;
  vaiCongViec?: string[];
}

/** Bốn trường tổ chức + cờ khoá/mở — đúng những gì bộ kéo được ghi vào một tài khoản */
export interface VaNguoi {
  donViId: string | null;
  chucVu: string | null;
  capChucVu: number | null;
  vaiCongViec: string[];
  active?: boolean;
}

export interface NguoiChuaCoTaiKhoan {
  id: string;
  email: string;
  ten: string;
  donViId: string | null;
  donVi: string | null;
  chucVu: string | null;
  capChucVu: number | null;
  vai: string[];
}

export interface KeHoachSoDo {
  /** Có gì để ghi không (đơn vị · kiêm nhiệm · người đã có tài khoản · khoá / mở) */
  coDoi: boolean;
  /** Các dòng "đổi gì" bằng tiếng Việt, mã kèm tên (luật 30) */
  dong: string[];
  toChucMoi: ToChuc;
  /** email → phần ghi vào tài khoản đó */
  vaNguoi: Record<string, VaNguoi>;
  soDonViMat: number;
  khoa: { email: string; ten: string; lyDo: string }[];
  moLai: { email: string; ten: string }[];
  /** PM / Quản trị bị khoá hoặc xoá bên agent Công việc — KHÔNG tự khoá, chỉ báo */
  khongKhoa: { email: string; ten: string; lyDo: string }[];
  /** Cùng mã người mà email hai bên khác nhau — không đổi email, chỉ báo */
  emailLech: { ten: string; emailMain: string; emailCongViec: string }[];
  nguoiChuaCoTaiKhoan: NguoiChuaCoTaiKhoan[];
}

const TEN_VAI: Record<string, string> = {
  "lanh-dao": "Lãnh đạo",
  "truong-don-vi": "Trưởng đơn vị",
  "nhan-vien": "Nhân viên",
  "van-thu": "Văn thư",
  "quan-tri": "Quản trị",
};
const tenVai = (ma: string): string => TEN_VAI[ma] ?? ma;

const chuoi = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
const thuong = (v: unknown): string => (typeof v === "string" ? v.trim().toLowerCase() : "");

/**
 * Đọc câu trả lời của `base.so_do_to_chuc`. CHẶT: sai khuôn một chỗ là TỪ CHỐI cả bản (không ghi nửa vời) —
 * khác `chuanHoaToChuc` khi đọc tệp (bỏ dòng sai, giữ dòng đúng), vì đây là bản sắp GHI ĐÈ lên sơ đồ đang dùng.
 */
export function docSoDoKeoVe(v: unknown): { soDo: SoDoKeoVe | null; loi: string[] } {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return { soDo: null, loi: ["câu trả lời không phải một đối tượng"] };
  const o = v as Record<string, unknown>;
  if (!Array.isArray(o.don_vi) || !Array.isArray(o.kiem_nhiem) || !Array.isArray(o.nguoi)) {
    return { soDo: null, loi: ["câu trả lời thiếu một trong ba danh sách: đơn vị · kiêm nhiệm · người"] };
  }
  const { toChuc, loi } = chuanHoaToChuc({ don_vi: o.don_vi, kiem_nhiem: o.kiem_nhiem, uy_quyen_ky: [] });
  if (toChuc.don_vi.length === 0) loi.push("không có đơn vị nào");
  const maDonVi = new Set(toChuc.don_vi.map((d) => d.id));
  const nguoi: NguoiSoDo[] = [];
  const daCoMa = new Set<string>();
  const daCoEmail = new Set<string>();
  for (let i = 0; i < o.nguoi.length; i++) {
    const p = (o.nguoi[i] ?? {}) as Record<string, unknown>;
    const id = chuoi(p.id);
    const email = thuong(p.email);
    const ten = chuoi(p.ten);
    if (!id || !ten || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      loi.push(`người dòng ${i + 1}: thiếu mã / tên hoặc email sai khuôn`);
      continue;
    }
    if (daCoMa.has(id) || daCoEmail.has(email)) {
      loi.push(`người ${email}: trùng mã hoặc trùng email với dòng trước`);
      continue;
    }
    const donVi = chuoi(p.don_vi_id);
    if (donVi && !maDonVi.has(donVi)) loi.push(`người ${email}: đơn vị chính ${donVi} không có trong cây đơn vị`);
    if (!Array.isArray(p.vai) || p.vai.some((x) => typeof x !== "string")) {
      loi.push(`người ${email}: danh sách vai trò sai khuôn`);
      continue;
    }
    daCoMa.add(id);
    daCoEmail.add(email);
    nguoi.push({
      id,
      email,
      ten,
      don_vi_id: donVi,
      chuc_vu: chuoi(p.chuc_vu),
      cap_chuc_vu: typeof p.cap_chuc_vu === "number" ? p.cap_chuc_vu : null,
      active: p.active !== false,
      vai: [...(p.vai as string[])].sort(),
    });
  }
  if (nguoi.length === 0) loi.push("không có người nào");
  for (const k of toChuc.kiem_nhiem) if (!daCoMa.has(k.nguoi_id)) loi.push(`kiêm nhiệm: mã người ${k.nguoi_id} không có trong danh sách người`);
  if (loi.length) return { soDo: null, loi };
  return { soDo: { don_vi: toChuc.don_vi, kiem_nhiem: toChuc.kiem_nhiem, nguoi }, loi: [] };
}

const laGiuCua = (role: string): boolean => role === "pm" || role === "admin";
const bangMang = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((x, i) => x === b[i]);
const khoaKiem = (k: KiemNhiemToChuc): string => `${k.nguoi_id}|${k.don_vi_id}|${k.chuc_vu ?? ""}`;

/**
 * So bản Main đang giữ với sơ đồ vừa kéo → kế hoạch ghi + các dòng "đổi gì".
 * @param tuKhoa email các tài khoản mà CHÍNH bộ kéo đã khoá ở lần trước — chỉ những tài khoản này mới được tự mở lại
 *               (tài khoản quản trị khoá tay ở Main thì giữ khoá, dù bên agent Công việc còn hoạt động).
 */
export function lapKeHoach(banCu: { toChuc: ToChuc; nguoi: NguoiMainGon[] }, soDo: SoDoKeoVe, tuKhoa: readonly string[] = []): KeHoachSoDo {
  const dong: string[] = [];
  const tenDonVi = new Map<string, string>();
  for (const d of banCu.toChuc.don_vi) tenDonVi.set(d.id, d.ten_ngan || d.ten);
  for (const d of soDo.don_vi) tenDonVi.set(d.id, d.ten_ngan || d.ten);
  const goiDonVi = (ma: string | null | undefined): string => (ma ? `${ma} ${tenDonVi.get(ma) ?? "(không rõ tên)"}` : "chưa gán đơn vị");

  // ── Cây đơn vị ──
  const cuTheoMa = new Map(banCu.toChuc.don_vi.map((d) => [d.id, d]));
  const moiTheoMa = new Map(soDo.don_vi.map((d) => [d.id, d]));
  for (const d of soDo.don_vi) {
    const cu = cuTheoMa.get(d.id);
    if (!cu) {
      dong.push(`Thêm đơn vị: ${goiDonVi(d.id)}`);
      continue;
    }
    const khac: string[] = [];
    if (cu.ten !== d.ten || cu.ten_ngan !== d.ten_ngan) khac.push(`tên "${cu.ten_ngan || cu.ten}" → "${d.ten_ngan || d.ten}"`);
    if (cu.cha_id !== d.cha_id) khac.push(`đơn vị cha ${goiDonVi(cu.cha_id)} → ${goiDonVi(d.cha_id)}`);
    if (cu.cap !== d.cap) khac.push(`cấp ${cu.cap} → ${d.cap}`);
    if (cu.active !== d.active) khac.push(d.active ? "mở lại" : "ngừng dùng");
    if (cu.uy_quyen_truong !== d.uy_quyen_truong) khac.push("đổi trưởng chính");
    if (cu.loai !== d.loai || cu.thu_tu !== d.thu_tu || cu.chuc_danh !== d.chuc_danh || cu.chuc_danh_ngan !== d.chuc_danh_ngan || cu.chuc_nang !== d.chuc_nang) {
      khac.push("đổi thông tin khác (loại · thứ tự · chức danh · chức năng)");
    }
    if (khac.length) dong.push(`Đổi đơn vị ${goiDonVi(d.id)}: ${khac.join(" · ")}`);
  }
  const donViMat = banCu.toChuc.don_vi.filter((d) => !moiTheoMa.has(d.id));
  for (const d of donViMat) dong.push(`Bớt đơn vị: ${d.id} ${d.ten_ngan || d.ten}`);

  // ── Tên người để viết dòng kiêm nhiệm ──
  const tenNguoi = new Map<string, string>();
  for (const u of banCu.nguoi) if (u.id) tenNguoi.set(u.id, u.name);
  for (const p of soDo.nguoi) tenNguoi.set(p.id, p.ten);
  const goiNguoi = (ma: string): string => tenNguoi.get(ma) ?? ma;

  // ── Kiêm nhiệm ──
  const kiemCu = new Set(banCu.toChuc.kiem_nhiem.map(khoaKiem));
  const kiemMoi = new Set(soDo.kiem_nhiem.map(khoaKiem));
  for (const k of soDo.kiem_nhiem) if (!kiemCu.has(khoaKiem(k))) dong.push(`Thêm kiêm nhiệm: ${goiNguoi(k.nguoi_id)} → ${goiDonVi(k.don_vi_id)}${k.chuc_vu ? ` (${k.chuc_vu})` : ""}`);
  for (const k of banCu.toChuc.kiem_nhiem) if (!kiemMoi.has(khoaKiem(k))) dong.push(`Bớt kiêm nhiệm: ${goiNguoi(k.nguoi_id)} → ${goiDonVi(k.don_vi_id)}${k.chuc_vu ? ` (${k.chuc_vu})` : ""}`);

  // ── Người: ghép theo MÃ trước, email sau ──
  const soDoTheoMa = new Map(soDo.nguoi.map((p) => [p.id, p]));
  const soDoTheoEmail = new Map(soDo.nguoi.map((p) => [p.email, p]));
  const daGhep = new Set<string>();
  const tuKhoaSet = new Set(tuKhoa.map(thuong));
  const vaNguoi: Record<string, VaNguoi> = {};
  const khoa: KeHoachSoDo["khoa"] = [];
  const moLai: KeHoachSoDo["moLai"] = [];
  const khongKhoa: KeHoachSoDo["khongKhoa"] = [];
  const emailLech: KeHoachSoDo["emailLech"] = [];

  for (const u of banCu.nguoi) {
    const email = thuong(u.email);
    const p = (u.id ? soDoTheoMa.get(u.id) : undefined) ?? soDoTheoEmail.get(email);
    if (!p || daGhep.has(p.id)) {
      // Không còn bên agent Công việc. Chỉ xét người TỪNG chép từ bên đó (có trường vaiCongViec) — người tạo riêng ở Main thì thôi.
      if (!p && Array.isArray(u.vaiCongViec) && u.active) {
        if (laGiuCua(u.role)) khongKhoa.push({ email, ten: u.name, lyDo: "đã xoá ở agent Công việc — là PM / Quản trị nên Main không tự khoá" });
        else {
          khoa.push({ email, ten: u.name, lyDo: "đã xoá ở agent Công việc" });
          vaNguoi[email] = { donViId: u.donViId ?? null, chucVu: u.chucVu ?? null, capChucVu: u.capChucVu ?? null, vaiCongViec: u.vaiCongViec, active: false };
        }
      }
      continue;
    }
    daGhep.add(p.id);
    if (p.email !== email) emailLech.push({ ten: u.name, emailMain: email, emailCongViec: p.email });

    const va: VaNguoi = { donViId: p.don_vi_id, chucVu: p.chuc_vu, capChucVu: p.cap_chuc_vu, vaiCongViec: p.vai };
    const khac: string[] = [];
    if ((u.donViId ?? null) !== va.donViId) khac.push(`đơn vị chính ${goiDonVi(u.donViId)} → ${goiDonVi(va.donViId)}`);
    if ((u.chucVu ?? null) !== va.chucVu) khac.push(`chức vụ "${u.chucVu ?? "—"}" → "${va.chucVu ?? "—"}"`);
    if ((u.capChucVu ?? null) !== va.capChucVu) khac.push(`cấp chức vụ ${u.capChucVu ?? "—"} → ${va.capChucVu ?? "—"}`);
    const vaiCu = [...(u.vaiCongViec ?? [])].sort();
    if (!Array.isArray(u.vaiCongViec) || !bangMang(vaiCu, va.vaiCongViec)) {
      const them = va.vaiCongViec.filter((x) => !vaiCu.includes(x)).map((x) => `+${tenVai(x)}`);
      const bot = vaiCu.filter((x) => !va.vaiCongViec.includes(x)).map((x) => `−${tenVai(x)}`);
      khac.push(them.length + bot.length ? `vai trò ${[...them, ...bot].join(" ")}` : "ghi nhận vai trò lần đầu");
    }
    if (!p.active && u.active) {
      if (laGiuCua(u.role)) khongKhoa.push({ email, ten: u.name, lyDo: "đã khoá ở agent Công việc — là PM / Quản trị nên Main không tự khoá" });
      else {
        va.active = false;
        khoa.push({ email, ten: u.name, lyDo: "đã khoá ở agent Công việc" });
      }
    } else if (p.active && !u.active && tuKhoaSet.has(email)) {
      va.active = true;
      moLai.push({ email, ten: u.name });
    }
    if (khac.length) dong.push(`${u.name}: ${khac.join(" · ")}`);
    if (khac.length || va.active !== undefined) vaNguoi[email] = va;
  }
  for (const k of khoa) dong.push(`Khoá tài khoản ${k.ten} (${k.email}) — ${k.lyDo}`);
  for (const m of moLai) dong.push(`Mở lại tài khoản ${m.ten} (${m.email}) — agent Công việc đã mở lại`);

  const nguoiChuaCoTaiKhoan: NguoiChuaCoTaiKhoan[] = soDo.nguoi
    .filter((p) => p.active && !daGhep.has(p.id))
    .map((p) => ({
      id: p.id,
      email: p.email,
      ten: p.ten,
      donViId: p.don_vi_id,
      donVi: p.don_vi_id ? (tenDonVi.get(p.don_vi_id) ?? null) : null,
      chucVu: p.chuc_vu,
      capChucVu: p.cap_chuc_vu,
      vai: p.vai,
    }));

  return {
    coDoi: dong.length > 0,
    dong,
    // Bảng ủy quyền ký (A12) là của Main — giữ nguyên, bộ kéo không đụng
    toChucMoi: { cap_nhat: banCu.toChuc.cap_nhat, don_vi: soDo.don_vi, kiem_nhiem: soDo.kiem_nhiem, uy_quyen_ky: banCu.toChuc.uy_quyen_ky },
    vaNguoi,
    soDonViMat: donViMat.length,
    khoa,
    moLai,
    khongKhoa,
    emailLech,
    nguoiChuaCoTaiKhoan,
  };
}

/** Ngưỡng "mất quá nhiều": số tuyệt đối tối thiểu 3, hoặc theo tỷ lệ trên bản đang có */
export const NGUONG_MAT_DON_VI = { toiThieu: 3, tyLe: 0.2 };
export const NGUONG_KHOA_NGUOI = { toiThieu: 3, tyLe: 0.1 };

const nguong = (tong: number, n: { toiThieu: number; tyLe: number }): number => Math.max(n.toiThieu, Math.ceil(tong * n.tyLe));

/**
 * CHỐT AN TOÀN trước khi ghi đè: sơ đồ kéo về làm MẤT quá nhiều đơn vị hoặc KHOÁ quá nhiều người so với bản đang có thì
 * không tự ghi — nhiều khả năng bên kia đang hỏng / đang sửa dở chứ không phải công ty vừa giải thể một phần ba.
 * Người có quyền bấm "Vẫn ghi theo sơ đồ mới" thì ghi.
 */
export function xetAnToan(banCu: { toChuc: ToChuc; nguoi: NguoiMainGon[] }, keHoach: KeHoachSoDo): { duoc: true } | { duoc: false; lyDo: string } {
  const soDonViCu = banCu.toChuc.don_vi.length;
  const tranDonVi = nguong(soDonViCu, NGUONG_MAT_DON_VI);
  if (soDonViCu > 0 && keHoach.soDonViMat > tranDonVi) {
    return {
      duoc: false,
      lyDo: `Sơ đồ mới làm MẤT ${keHoach.soDonViMat} trên ${soDonViCu} đơn vị Main đang có (ngưỡng tự ghi: tối đa ${tranDonVi}). Chưa ghi đè — xem lại sơ đồ ở agent Công việc.`,
    };
  }
  const soDangHoatDong = banCu.nguoi.filter((u) => u.active).length;
  const tranKhoa = nguong(soDangHoatDong, NGUONG_KHOA_NGUOI);
  if (keHoach.khoa.length > tranKhoa) {
    return {
      duoc: false,
      lyDo: `Sơ đồ mới sẽ KHOÁ ${keHoach.khoa.length} trên ${soDangHoatDong} tài khoản đang hoạt động (ngưỡng tự ghi: tối đa ${tranKhoa}). Chưa ghi đè — xem lại danh sách người ở agent Công việc.`,
    };
  }
  return { duoc: true };
}

/** Đến giờ kéo chưa — `lanThuCuoi` là mốc lần THỬ gần nhất (kể cả lần hỏng), để agent Công việc tắt thì không gọi dồn */
export function denGioKeo(lanThuCuoi: string | null, bayGioMs: number, nhipPhut = NHIP_KEO_PHUT): boolean {
  if (!lanThuCuoi) return true;
  const t = Date.parse(lanThuCuoi);
  return !Number.isFinite(t) || bayGioMs - t >= nhipPhut * 60_000;
}
