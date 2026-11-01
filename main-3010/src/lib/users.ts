// User store server-side tại data/users.json — thay danh sách user hardcode
// trong auth.ts. CHỈ chạy phía server Node runtime (dùng node:fs + node:crypto).
// TUYỆT ĐỐI không import file này từ middleware (edge runtime) hoặc Client
// Component. auth.ts KHÔNG import users.ts — login route gọi thẳng verifyUser.
//
// - Mật khẩu băm có tiền tố thuật toán (lib/mat-khau-bam.ts — LOI-DUNG-CHUNG 6g.6 A2, Đợt 1b 03/10/2026):
//   đọc được scrypt / sha256 có tiền tố và kiểu cũ sha256(salt + password); mật khẩu mới/đổi băm scrypt.
// - ⛔ KHÔNG tự sinh tài khoản mẫu nữa (6g.6 A4 · T4, Đợt 1b): file chưa có / hỏng / rỗng → báo lỗi ở nhật ký
//   máy chủ, KHÔNG ghi đè. Trước đây tự gieo 4 tài khoản mẫu Sci@2026 — nếu hàm lọc loại hết bản ghi khuôn mới
//   thì 52 người bị đè mất.
// - Ghi file GIỮ NGUYÊN bản ghi hàm lọc không hiểu (writeUsersFile) — không âm thầm xoá người.
// - Loại tài khoản + quyền: src/lib/quyen.ts. Mã cũ `field` đọc vào thành
//   engineer (chuanHoaLoai) — không ghi mới ra `field` nữa.

import fs from "node:fs";
import path from "node:path";
import { gocDuLieu } from "@/lib/goc-du-lieu";
import { bamMatKhauMoi, khuonBamHopLe, kiemMatKhau } from "@/lib/mat-khau-bam";
import { CAC_LOAI, chuanHoaLoai, laNhaThau, luonMoiDuAn, type Role } from "@/lib/quyen";
import { sanitizeProjectId } from "@/lib/projects";
import { docToChuc } from "@/lib/to-chuc";
import { dungBang, loaiOMain } from "@/lib/loai-theo-so-do";

/** Bản ghi đầy đủ lưu trong data/users.json (có hash/salt — KHÔNG trả về client) */
export interface StoredUser {
  /**
   * ⭐ Mã người BẤT BIẾN, tách khỏi email (6g.6 A1, Đợt 1b 03/10/2026). Người tạo mới ở Main: id = email lúc tạo;
   * 52 người chuyển từ agent Công việc (Đợt 2) giữ nguyên mã bên đó. Bản ghi cũ chưa có thì để trống — không tự điền.
   */
  id?: string;
  email: string;
  name: string;
  role: Role;
  passwordHash: string;
  salt: string;
  active: boolean;
  createdAt: string; // ISO
  /**
   * Dự án được truy cập (id slug). undefined = MỌI dự án (tương thích user cũ
   * không có trường này). PM luôn vào được mọi dự án bất kể trường này
   * (xem canAccessProject trong lib/projects.ts).
   */
  projectIds?: string[];
  /**
   * Username trên Base.vn (vd "hoabt") — màn "Việc của tôi" dùng để gọi
   * wework /user/tasks. Không có = chưa nối Base. ĐO 04/09: HRM employee/list
   * rỗng nên không tự tra được, người dùng tự khai một lần trên màn đó.
   */
  baseUsername?: string;
  /**
   * id đoạn chat Telegram đã NỐI với tài khoản này (Mr. Đại chốt 25/09) — nhắn
   * bot @SCI_Main_agent_bot là trợ lý chạy đúng danh tính + loại của người này.
   * Nối bằng mã 6 số (lib/telegram-tro-ly/noi-tai-khoan.ts). Một chat ↔ một người.
   */
  telegramChatId?: string;
  /**
   * ⭐ Tổ chức (LOI-DUNG-CHUNG 6g.6 A9, Đợt 2 — 03/10/2026): đơn vị chính (mã đơn vị trong data/to-chuc.json) · chức vụ ·
   * cấp chức vụ. Chép từ agent Công việc lần chuyển đầu; kiêm nhiệm nằm ở to-chuc.json. Không có = chưa gán.
   */
  donViId?: string | null;
  chucVu?: string | null;
  capChucVu?: number | null;
  /**
   * ⭐ 6g.6.13 (03/10/2026): BẢN CHÉP vai trò ở agent Công việc (lanh-dao · truong-don-vi · nhan-vien …) do bộ chuyển ghi —
   * dùng tính loại theo sơ đồ (lib/loai-theo-so-do.ts). ⏸ ④ từ Đợt 3 sửa ở đâu: chốt sau.
   */
  vaiCongViec?: string[];
  /**
   * ⭐ 18/10/2026 (Mr. Đại chốt): tài khoản loại «Nhà thầu» thuộc đúng MỘT đơn vị — nhà thầu chính (mã NT-) hoặc thầu phụ
   * (mã TP-<DA>-nn), lấy từ sổ nhà thầu của agent Tiến độ. Agent Nghiệm thu / Tiến độ dùng mã này để mở phần được ghi
   * (biên bản, BC ngày của đơn vị mình). Loại khác không mang trường này.
   */
  nhaThau?: DonViNhaThau | null;
}

/** Đơn vị của tài khoản nhà thầu — mã + tên đúng sổ nhà thầu agent Tiến độ */
export interface DonViNhaThau {
  ma: string;
  ten: string;
}

/**
 * Bản ghi an toàn trả về client — không có hash/salt.
 * `role` = loại HIỆU LỰC: tổ chức đã có thì người không phải PM/Admin tính theo sơ đồ (6g.6.13), `theoSoDo` = true.
 */
export type SafeUser = Omit<StoredUser, "passwordHash" | "salt"> & { theoSoDo?: true };

const DATA_DIR = gocDuLieu();
const USERS_FILE = path.join(DATA_DIR, "users.json");


// ===== helpers =====

/** Email chuẩn hóa lowercase + trim */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Validate định dạng email đơn giản (đủ dùng nội bộ) */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Mã loại hợp lệ để GHI (chỉ 4 mã mới — `field` không nhận nữa) */
export function isValidRole(role: unknown): role is Role {
  return typeof role === "string" && (CAC_LOAI as readonly string[]).includes(role);
}

const CAU_SAI_LOAI = "Loại tài khoản không hợp lệ (pm/admin/engineer/viewer/nhathau).";
const CAU_THIEU_DON_VI = "Tài khoản nhà thầu phải chọn đơn vị (nhà thầu hoặc thầu phụ).";
const CAU_THIEU_DU_AN = "Tài khoản nhà thầu phải chọn ít nhất một dự án — không cho xem mọi dự án.";

/** Đơn vị nhà thầu hợp lệ: mã NT-… hoặc TP-…, tên không rỗng */
export function chuanDonViNhaThau(v: unknown): DonViNhaThau | null {
  if (!v || typeof v !== "object") return null;
  const ma = String((v as DonViNhaThau).ma ?? "").trim().toUpperCase();
  const ten = String((v as DonViNhaThau).ten ?? "").trim().slice(0, 200);
  return /^(NT|TP)-[A-Z0-9-]{1,30}$/.test(ma) && ten ? { ma, ten } : null;
}

/**
 * 6g.6.13: hàm cho loại HIỆU LỰC — đọc tổ chức MỘT lần cho cả lượt. Tổ chức chưa có / hỏng → giữ loại đã khai (như trước).
 * PM · Admin luôn giữ loại đã khai; người khác: lãnh đạo + trưởng = Người dùng, còn lại Người xem.
 */
export function boLoaiHieuLuc(): (u: Pick<StoredUser, "id" | "email" | "role" | "donViId" | "vaiCongViec">) => { role: Role; theoSoDo: boolean } {
  const tc = docToChuc();
  if (tc.tinhTrang !== "ok") return (u) => ({ role: u.role, theoSoDo: false });
  const b = dungBang(tc.toChuc);
  // Nhà thầu (18/10/2026) cũng giữ loại đã khai — người ngoài công ty, không có trên sơ đồ
  return (u) => (luonMoiDuAn(u.role) || laNhaThau(u.role) ? { role: u.role, theoSoDo: false } : { role: loaiOMain(u, b), theoSoDo: true });
}

function toSafe(u: StoredUser, loai: ReturnType<typeof boLoaiHieuLuc> = boLoaiHieuLuc()): SafeUser {
  const hl = loai(u);
  return {
    ...(typeof u.id === "string" && u.id !== "" ? { id: u.id } : {}),
    email: u.email,
    name: u.name,
    role: hl.role,
    ...(hl.theoSoDo ? { theoSoDo: true as const } : {}),
    active: u.active,
    createdAt: u.createdAt,
    ...(Array.isArray(u.projectIds) && u.projectIds.length > 0
      ? { projectIds: u.projectIds }
      : {}),
    ...(typeof u.baseUsername === "string" && u.baseUsername !== ""
      ? { baseUsername: u.baseUsername }
      : {}),
    ...(laChatIdTelegram(u.telegramChatId) ? { telegramChatId: u.telegramChatId } : {}),
    ...(typeof u.donViId === "string" && u.donViId !== "" ? { donViId: u.donViId } : {}),
    ...(typeof u.chucVu === "string" && u.chucVu !== "" ? { chucVu: u.chucVu } : {}),
    ...(typeof u.capChucVu === "number" ? { capChucVu: u.capChucVu } : {}),
    ...(Array.isArray(u.vaiCongViec) && u.vaiCongViec.length ? { vaiCongViec: u.vaiCongViec } : {}),
    ...(laNhaThau(u.role) && u.nhaThau ? { nhaThau: u.nhaThau } : {}),
  };
}

/** id chat Telegram hợp lệ: số nguyên (nhóm có dấu âm), tối đa 20 chữ số */
export function laChatIdTelegram(v: unknown): v is string {
  return typeof v === "string" && /^-?\d{1,20}$/.test(v);
}

/**
 * Sanitize danh sách dự án được truy cập: chỉ giữ slug hợp lệ (bỏ trùng);
 * không phải mảng / mảng rỗng sau lọc → undefined (= mọi dự án).
 */
export function sanitizeProjectIds(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: string[] = [];
  v.forEach((x) => {
    const id = sanitizeProjectId(x);
    if (id !== null && out.indexOf(id) < 0) out.push(id);
  });
  return out.length > 0 ? out : undefined;
}

// ===== đọc/ghi file (không cache module-level — nhất quán appconfig.ts) =====

function isStoredUser(v: unknown): v is StoredUser {
  if (v === null || typeof v !== "object") return false;
  const u = v as Record<string, unknown>;
  // Lớp chuyển đổi: bản ghi cũ mang `field` → engineer ngay khi đọc
  const loai = chuanHoaLoai(u.role);
  if (loai !== null) u.role = loai;
  // Băm có tiền tố mà thiếu trường salt (bản ghi chuyển từ nơi khác) → lấy salt trong chuỗi băm
  if (u.salt === undefined && khuonBamHopLe(u.passwordHash, undefined)) u.salt = String(u.passwordHash).split(":")[1];
  return (
    typeof u.email === "string" &&
    typeof u.name === "string" &&
    isValidRole(u.role) &&
    khuonBamHopLe(u.passwordHash, u.salt) &&
    typeof u.salt === "string" &&
    (u.id === undefined || typeof u.id === "string") &&
    typeof u.active === "boolean" &&
    typeof u.createdAt === "string" &&
    (u.donViId === undefined || u.donViId === null || typeof u.donViId === "string") &&
    (u.chucVu === undefined || u.chucVu === null || typeof u.chucVu === "string") &&
    (u.capChucVu === undefined || u.capChucVu === null || typeof u.capChucVu === "number") &&
    (u.vaiCongViec === undefined || (Array.isArray(u.vaiCongViec) && u.vaiCongViec.every((x) => typeof x === "string"))) &&
    (u.nhaThau === undefined || u.nhaThau === null || chuanDonViNhaThau(u.nhaThau) !== null)
  );
}

/** Bản ghi đang có trong file mà hàm lọc không nhận (khuôn lạ) — ghi lại nguyên, không xoá */
function banGhiLa(): unknown[] {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
    return Array.isArray(parsed) ? parsed.filter((v) => !isStoredUser(structuredClone(v))) : [];
  } catch {
    return [];
  }
}

/**
 * Số bản ghi trong users.json mà hàm lọc không nhận (thiếu tên, loại lạ, băm sai…) — giao kèm `main.du_lieu_dung_chung`
 * (`nguoi_dung_bi_loc`) để agent nhận KHÔNG coi người bị lọc là "Main đã bỏ" mà khoá nhầm (soát vòng 2 · 03/10/2026).
 */
export function soBanGhiNguoiLa(): number {
  return banGhiLa().length;
}

function writeUsersFile(users: StoredUser[]): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const la = banGhiLa();
  if (la.length) console.error(`[users] ${la.length} bản ghi khuôn lạ trong users.json — giữ nguyên, không xoá (6g.6 A4)`);
  fs.writeFileSync(USERS_FILE, JSON.stringify([...users, ...la], null, 2) + "\n", "utf8");
}

/** Đọc data/users.json; file chưa có / hỏng / rỗng → danh sách rỗng + báo lỗi (KHÔNG tự sinh tài khoản — 6g.6 A4) */
function readUsersFile(): StoredUser[] {
  try {
    const raw = fs.readFileSync(USERS_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const users = parsed.filter(isStoredUser).map((u) => {
        // Chuẩn hóa projectIds ngay khi đọc — file có thể bị sửa tay
        const pids = sanitizeProjectIds(u.projectIds);
        const clean: StoredUser = { ...u };
        if (pids) clean.projectIds = pids;
        else delete clean.projectIds;
        return clean;
      });
      if (users.length > 0) return users;
      console.error(`[users] users.json có ${parsed.length} bản ghi nhưng không bản ghi nào đúng khuôn — không ai đăng nhập được; KHÔNG tự sinh tài khoản`);
      return [];
    }
    console.error("[users] users.json không phải danh sách — không ai đăng nhập được; KHÔNG tự sinh tài khoản");
  } catch (e) {
    console.error(`[users] không đọc được users.json (${e instanceof Error ? e.message : e}) — không ai đăng nhập được; KHÔNG tự sinh tài khoản`);
  }
  return [];
}

// ===== API công khai =====

/**
 * Bản ĐẦY ĐỦ (kèm hash/salt) — CHỈ cho cổng MCP `main.du_lieu_dung_chung` giao 4 agent
 * kia ghi vào users.json của chúng (Mr. Đại chốt 11/09: người dùng khai một nơi ở Main).
 * Không bao giờ trả ra trình duyệt.
 */
export function danhSachNguoiDungDayDu(): StoredUser[] {
  return readUsersFile();
}

/** Danh sách user (không kèm hash/salt), sắp theo createdAt rồi email */
export function listUsers(): SafeUser[] {
  const loai = boLoaiHieuLuc();
  return readUsersFile()
    .map((u) => toSafe(u, loai))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.email.localeCompare(b.email));
}

/** Xác thực đăng nhập: đúng mật khẩu VÀ đang active → SafeUser, ngược lại null */
export function verifyUser(email: string, password: string): SafeUser | null {
  const norm = normalizeEmail(email);
  const user = readUsersFile().find((u) => u.email === norm);
  if (!user || !user.active) return null;
  if (!kiemMatKhau(user.passwordHash, user.salt, password)) return null;
  return toSafe(user);
}

/** Tạo user mới. Throw Error message tiếng Việt nếu dữ liệu không hợp lệ/trùng email. */
export function createUser(input: {
  email: string;
  name: string;
  role: Role;
  password: string;
  /** Dự án được truy cập — bỏ qua/mảng rỗng = mọi dự án; pm luôn mọi dự án */
  projectIds?: string[];
  /** Bắt buộc với loại Nhà thầu (18/10/2026) */
  nhaThau?: unknown;
}): SafeUser {
  const email = normalizeEmail(input.email);
  const name = input.name.trim();
  if (!isValidEmail(email)) throw new Error("Email không đúng định dạng.");
  if (name === "") throw new Error("Tên không được để trống.");
  if (!isValidRole(input.role)) throw new Error(CAU_SAI_LOAI);
  // 18/10/2026: để trống mật khẩu = mật khẩu lần đầu là email (nếp agent Công việc)
  const matKhau = input.password === "" ? email : input.password;
  if (matKhau.length < 6) throw new Error("Mật khẩu phải có ít nhất 6 ký tự.");
  const nhaThau = laNhaThau(input.role) ? chuanDonViNhaThau(input.nhaThau) : null;
  if (laNhaThau(input.role) && !nhaThau) throw new Error(CAU_THIEU_DON_VI);

  const users = readUsersFile();
  if (users.some((u) => u.email === email)) {
    throw new Error(`Email "${email}" đã tồn tại.`);
  }
  // Soát 03/10 điểm 3 (6g.6 A1): mã người mới = email lúc tạo — không được trùng MÃ của người đang có (21 người chuyển từ
  // agent Công việc có mã ≠ email, vd mã "ptgd.dai@scigroup.vn"); trùng mã thì agent con cập nhật theo mã sẽ đè người thật.
  const trungMa = users.find((u) => u.id === email);
  if (trungMa) {
    throw new Error(`"${email}" đang là mã người của ${trungMa.name} (${trungMa.email}) — không tạo được tài khoản trùng mã.`);
  }
  const bam = bamMatKhauMoi(matKhau);
  // PM/Admin luôn truy cập mọi dự án (quyen.ts luonMoiDuAn) → không lưu projectIds
  const pids = luonMoiDuAn(input.role) ? undefined : sanitizeProjectIds(input.projectIds);
  if (laNhaThau(input.role) && !pids) throw new Error(CAU_THIEU_DU_AN);
  const user: StoredUser = {
    id: email, // 6g.6 A1: mã bất biến = email lúc tạo
    email,
    name,
    role: input.role,
    passwordHash: bam.passwordHash,
    salt: bam.salt,
    active: true,
    createdAt: new Date().toISOString(),
    ...(pids ? { projectIds: pids } : {}),
    ...(nhaThau ? { nhaThau } : {}),
  };
  users.push(user);
  writeUsersFile(users);
  return toSafe(user);
}

/**
 * Chặn mất người giữ cửa: sau thao tác vẫn phải còn ≥1 PM hoạt động (người ký
 * phiếu giá) và ≥1 Admin hoạt động (người quản lý người dùng).
 * `sau` = danh sách người dùng NẾU thao tác được thực hiện.
 */
function kiemConNguoiGiuCua(truoc: StoredUser[], sau: StoredUser[]): void {
  const dem = (ds: StoredUser[], loai: Role) => ds.filter((u) => u.role === loai && u.active).length;
  // Chỉ chặn khi CHÍNH thao tác này làm số người từ ≥1 về 0 (sổ vốn chưa có thì không chặn)
  const mat = (loai: Role) => dem(truoc, loai) > 0 && dem(sau, loai) === 0;
  if (mat("pm")) throw new Error("Không thể bỏ PM đang hoạt động cuối cùng — hệ cần ít nhất một PM để ký phiếu giá.");
  if (mat("admin")) throw new Error("Không thể bỏ Admin đang hoạt động cuối cùng — hệ cần ít nhất một Admin để quản lý người dùng.");
}

/**
 * Cập nhật name/role/active. Chặn nếu làm hệ mất PM hoặc Admin hoạt động cuối
 * cùng (kiemConNguoiGiuCua).
 */
export function updateUser(
  email: string,
  patch: {
    name?: string;
    role?: Role;
    active?: boolean;
    projectIds?: string[];
    /** Username Base.vn — chuỗi rỗng = xóa liên kết. Tự bóc "@" đầu. */
    baseUsername?: string;
    /** Đơn vị nhà thầu (18/10/2026) — chỉ giữ khi loại là Nhà thầu */
    nhaThau?: unknown;
  },
): SafeUser {
  const norm = normalizeEmail(email);
  const users = readUsersFile();
  const user = users.find((u) => u.email === norm);
  if (!user) throw new Error(`Không tìm thấy người dùng "${norm}".`);

  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (name === "") throw new Error("Tên không được để trống.");
    user.name = name;
  }
  if (patch.role !== undefined && !isValidRole(patch.role)) {
    throw new Error(CAU_SAI_LOAI);
  }

  kiemConNguoiGiuCua(
    users,
    users.map((u) =>
      u.email === norm
        ? { ...u, role: patch.role ?? u.role, active: patch.active ?? u.active }
        : u,
    ),
  );

  if (patch.role !== undefined) user.role = patch.role;
  if (patch.active !== undefined) user.active = patch.active;

  // Dự án được truy cập: mảng rỗng/không hợp lệ → xóa trường (= mọi dự án).
  if (patch.projectIds !== undefined) {
    const pids = sanitizeProjectIds(patch.projectIds);
    if (pids) user.projectIds = pids;
    else delete user.projectIds;
  }
  // PM/Admin luôn truy cập mọi dự án → không giữ projectIds
  if (luonMoiDuAn(user.role)) delete user.projectIds;

  // Nhà thầu (18/10/2026): bắt buộc một đơn vị + ít nhất một dự án; đổi sang loại khác thì bỏ đơn vị
  if (patch.nhaThau !== undefined) {
    const dv = chuanDonViNhaThau(patch.nhaThau);
    if (dv) user.nhaThau = dv;
    else delete user.nhaThau;
  }
  if (laNhaThau(user.role)) {
    if (!user.nhaThau) throw new Error(CAU_THIEU_DON_VI);
    if (!user.projectIds || user.projectIds.length === 0) throw new Error(CAU_THIEU_DU_AN);
  } else delete user.nhaThau;

  // Username Base: bóc "@" đầu, chỉ giữ chữ-số-._- ; rỗng = xóa liên kết
  if (patch.baseUsername !== undefined) {
    const bu = patch.baseUsername.trim().replace(/^@/, "");
    if (bu === "") delete user.baseUsername;
    else if (!/^[a-zA-Z0-9._-]{2,64}$/.test(bu)) {
      throw new Error("Username Base chỉ gồm chữ, số, dấu chấm/gạch (2–64 ký tự).");
    } else user.baseUsername = bu;
  }

  writeUsersFile(users);
  return toSafe(user);
}

// ===== Bộ kéo sơ đồ tổ chức từ agent Công việc (Mr. Đại chốt 12/10/2026 — câu 9) =====

/** Đúng những gì bộ kéo sơ đồ được ghi vào một tài khoản — KHÔNG có mật khẩu, email, tên, loại */
export interface VaTheoSoDo {
  donViId: string | null;
  chucVu: string | null;
  capChucVu: number | null;
  vaiCongViec: string[];
  /** Có thì khoá (false) / mở lại (true); không có thì giữ nguyên */
  active?: boolean;
}

/**
 * Ghi MỘT lượt phần tổ chức của nhiều tài khoản (khoá: email). Đọc – sửa – ghi liền trong một hàm đồng bộ nên không chen
 * được với lượt sửa tay ở màn Người dùng. PM / Quản trị KHÔNG bị khoá qua đường này (bỏ qua cờ khoá, trả về danh sách).
 */
export function apDungSoDoVaoNguoi(va: Record<string, VaTheoSoDo>): { soNguoiDoi: number; khongKhoa: string[] } {
  const users = readUsersFile();
  if (users.length === 0) return { soNguoiDoi: 0, khongKhoa: [] };
  const truoc = users.map((u) => ({ ...u }));
  const khongKhoa: string[] = [];
  let soNguoiDoi = 0;
  for (const u of users) {
    const v = va[u.email];
    if (!v) continue;
    u.donViId = v.donViId;
    u.chucVu = v.chucVu;
    u.capChucVu = v.capChucVu;
    u.vaiCongViec = [...v.vaiCongViec].sort();
    if (v.active === false && luonMoiDuAn(u.role)) khongKhoa.push(u.email);
    else if (v.active !== undefined) u.active = v.active;
    soNguoiDoi++;
  }
  if (soNguoiDoi === 0) return { soNguoiDoi: 0, khongKhoa };
  kiemConNguoiGiuCua(truoc, users);
  writeUsersFile(users);
  return { soNguoiDoi, khongKhoa };
}

/**
 * Tạo tài khoản cho người CÓ ở agent Công việc mà CHƯA có ở Main. Mật khẩu lần đầu = email (nếp chung của hệ);
 * loại lưu = engineer, loại hiệu lực tính theo sơ đồ. Giữ nguyên MÃ người bên agent Công việc (6g.6 A1).
 * Người đã có (trùng email hoặc trùng mã) thì bỏ qua, kê lý do.
 */
export function taoNguoiTheoSoDo(
  ds: { id: string; email: string; ten: string; donViId: string | null; chucVu: string | null; capChucVu: number | null; vai: string[] }[],
): { tao: string[]; boQua: { email: string; lyDo: string }[] } {
  const users = readUsersFile();
  const tao: string[] = [];
  const boQua: { email: string; lyDo: string }[] = [];
  for (const p of ds) {
    const email = normalizeEmail(p.email);
    const ten = (p.ten ?? "").trim();
    if (!isValidEmail(email) || ten === "" || typeof p.id !== "string" || p.id.trim() === "") {
      boQua.push({ email, lyDo: "thiếu mã / tên hoặc email sai khuôn" });
      continue;
    }
    if (users.some((u) => u.email === email)) {
      boQua.push({ email, lyDo: "email đã có tài khoản" });
      continue;
    }
    const trungMa = users.find((u) => u.id === p.id || u.id === email || u.email === p.id);
    if (trungMa) {
      boQua.push({ email, lyDo: `trùng mã người với ${trungMa.name} (${trungMa.email})` });
      continue;
    }
    const bam = bamMatKhauMoi(email);
    users.push({
      id: p.id,
      email,
      name: ten,
      role: "engineer",
      passwordHash: bam.passwordHash,
      salt: bam.salt,
      active: true,
      createdAt: new Date().toISOString(),
      donViId: p.donViId,
      chucVu: p.chucVu,
      capChucVu: p.capChucVu,
      vaiCongViec: [...p.vai].sort(),
    });
    tao.push(email);
  }
  if (tao.length) writeUsersFile(users);
  return { tao, boQua };
}

/** Tra 1 user theo email (bản an toàn) — màn "Việc của tôi" cần baseUsername */
export function getUserByEmail(email: string): SafeUser | null {
  const norm = normalizeEmail(email);
  const u = readUsersFile().find((x) => x.email === norm);
  return u ? toSafe(u) : null;
}

/** Đặt lại mật khẩu (Admin thao tác) — salt mới + hash mới */
export function resetPassword(email: string, newPassword: string): void {
  if (newPassword.length < 6) throw new Error("Mật khẩu mới phải có ít nhất 6 ký tự.");
  const norm = normalizeEmail(email);
  const users = readUsersFile();
  const user = users.find((u) => u.email === norm);
  if (!user) throw new Error(`Không tìm thấy người dùng "${norm}".`);
  Object.assign(user, bamMatKhauMoi(newPassword));
  writeUsersFile(users);
}

/**
 * Đổi email đăng nhập (Mr. Đại chốt 04/10/2026 — Cài đặt → Người dùng → Sửa). GIỮ mã người (`id`) và mọi trường khác;
 * mật khẩu đặt lại = email mới (lệ "mật khẩu lần đầu = email"). Email mới trùng tài khoản khác → lỗi.
 * Chỉ đổi users.json — thứ đứng tên email cũ ở chỗ khác do lib/doi-email.ts chuyển theo.
 */
export function doiEmail(emailCu: string, emailMoi: string): SafeUser {
  const cu = normalizeEmail(emailCu);
  const moi = normalizeEmail(emailMoi);
  if (!isValidEmail(moi)) throw new Error(`Email mới "${emailMoi.trim()}" không đúng dạng.`);
  if (cu === moi) throw new Error("Email mới trùng email đang dùng.");
  const users = readUsersFile();
  const user = users.find((u) => u.email === cu);
  if (!user) throw new Error(`Không tìm thấy người dùng "${cu}".`);
  if (users.some((u) => u.email === moi)) throw new Error(`Email "${moi}" đã là một tài khoản khác.`);
  user.email = moi;
  Object.assign(user, bamMatKhauMoi(moi));
  writeUsersFile(users);
  return toSafe(user);
}

/** Xóa user — chặn xóa PM/Admin hoạt động cuối cùng */
export function deleteUser(email: string): void {
  const norm = normalizeEmail(email);
  const users = readUsersFile();
  const user = users.find((u) => u.email === norm);
  if (!user) throw new Error(`Không tìm thấy người dùng "${norm}".`);
  kiemConNguoiGiuCua(users, users.filter((u) => u.email !== norm));
  writeUsersFile(users.filter((u) => u.email !== norm));
}

/** Tự đổi mật khẩu: cần mật khẩu cũ đúng. Throw message tiếng Việt nếu sai. */
export function changePassword(email: string, oldPassword: string, newPassword: string): void {
  if (newPassword.length < 6) throw new Error("Mật khẩu mới phải có ít nhất 6 ký tự.");
  const norm = normalizeEmail(email);
  const users = readUsersFile();
  const user = users.find((u) => u.email === norm);
  if (!user || !user.active) throw new Error("Tài khoản không tồn tại hoặc đã bị khóa.");
  if (!kiemMatKhau(user.passwordHash, user.salt, oldPassword)) {
    throw new Error("Mật khẩu cũ không đúng.");
  }
  Object.assign(user, bamMatKhauMoi(newPassword));
  writeUsersFile(users);
}

// ===== Nối Telegram (25/09) — đọc sổ MỖI LẦN, không nhớ đệm =====

/** Người đang nối với đoạn chat này (kể cả tài khoản bị khoá — bên gọi tự xét) */
export function timNguoiTheoTelegram(chatId: string): SafeUser | null {
  if (!laChatIdTelegram(chatId)) return null;
  const u = readUsersFile().find((x) => x.telegramChatId === chatId);
  return u ? toSafe(u) : null;
}

/**
 * Nối chat ↔ tài khoản. MỘT chat chỉ thuộc MỘT người: chat đang nối với ai
 * khác thì chuyển sang người này; người này đang nối chat khác thì thay.
 */
export function noiTelegram(email: string, chatId: string): SafeUser {
  if (!laChatIdTelegram(chatId)) throw new Error("id chat Telegram không hợp lệ.");
  const norm = normalizeEmail(email);
  const users = readUsersFile();
  const user = users.find((u) => u.email === norm);
  if (!user) throw new Error(`Không tìm thấy người dùng "${norm}".`);
  users.forEach((u) => {
    if (u.telegramChatId === chatId) delete u.telegramChatId;
  });
  user.telegramChatId = chatId;
  writeUsersFile(users);
  return toSafe(user);
}

/** Gỡ nối Telegram của một tài khoản (không nối thì thôi, không lỗi) */
export function goNoiTelegram(email: string): SafeUser {
  const norm = normalizeEmail(email);
  const users = readUsersFile();
  const user = users.find((u) => u.email === norm);
  if (!user) throw new Error(`Không tìm thấy người dùng "${norm}".`);
  delete user.telegramChatId;
  writeUsersFile(users);
  return toSafe(user);
}
