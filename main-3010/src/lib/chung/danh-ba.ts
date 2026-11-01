// ============================================================
// danh-ba.ts — DANH BẠ NGƯỜI BASE (VIEC-CUA-TOI-v2.0 mục 3.4)
//
// Hai tầng, MỘT file (luật 7):
//   Tầng 1 (đang chạy): gom dần username + avatar từ mọi task đã đọc
//     (owners[].gavatar, task.avatar) — đo 05/09: wework không có /user/list,
//     HRM rỗng, Account chưa nhập khoá.
//   Tầng 2 (khi Mr. Đại nhập khoá Base Account): đổ họ tên + chức danh vào
//     ĐÚNG file này — mọi màn tra danh bạ không phải sửa.
//
// File: data/viec/danh-ba-base.json — { username: {avatar?, tenDayDu?, chucDanh?} }
// CHỈ chạy phía server.
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { gocDuLieu } from "@/lib/goc-du-lieu";

export interface NguoiBase {
  username: string;
  avatar?: string;
  tenDayDu?: string;
  chucDanh?: string;
  /**
   * ⭐ E15 (23/09) — email người dùng hệ thống ứng với username Base này, do
   * Agent Base trả trong base.thong_tin_nhan_su (commit Base 66c9fcf). Main
   * KHÔNG tự đoán ánh xạ — chỉ chép lại số Base trả.
   */
  emailSci?: string;
}

type Kho = Record<string, { avatar?: string; tenDayDu?: string; chucDanh?: string; emailSci?: string }>;

const THU_MUC = path.join(gocDuLieu(), "viec");
const FILE = path.join(THU_MUC, "danh-ba-base.json");

function docKho(): Kho {
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, "utf8")) as unknown;
    if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) return raw as Kho;
  } catch {
    // chưa có file — kho rỗng
  }
  return {};
}

function ghiKho(kho: Kho): void {
  fs.mkdirSync(THU_MUC, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(kho, null, 2) + "\n", "utf8");
}

function sachUsername(v: unknown): string {
  return String(v ?? "").replace(/^@/, "").trim();
}

/**
 * Gom người từ mảng task THÔ của Base (gọi mỗi lần đọc /user/tasks hay
 * /task/project). Chỉ ghi file khi CÓ người mới hoặc avatar mới — không
 * ghi đè tenDayDu/chucDanh (tầng 2 mới có quyền điền).
 */
export function gomTuTask(tasksTho: unknown[]): void {
  const kho = docKho();
  let doi = false;

  const them = (username: unknown, avatar: unknown) => {
    const u = sachUsername(username);
    if (u === "") return;
    const a = String(avatar ?? "").trim();
    const cu = kho[u];
    if (!cu) {
      kho[u] = a ? { avatar: a } : {};
      doi = true;
    } else if (a && cu.avatar !== a) {
      cu.avatar = a;
      doi = true;
    }
  };

  for (const t of tasksTho) {
    if (t === null || typeof t !== "object") continue;
    const o = t as Record<string, unknown>;
    // task.avatar là avatar NGƯỜI NHẬN (đo 05/09) — chỉ gán khi có username
    them(o.username, o.avatar);
    them(o.creator_username, undefined);
    for (const kh of ["owners", "followers"]) {
      const mang = o[kh];
      if (!Array.isArray(mang)) continue;
      for (const ng of mang) {
        if (ng && typeof ng === "object") {
          const n = ng as Record<string, unknown>;
          them(n.username, n.gavatar ?? n.avatar);
        }
      }
    }
  }
  if (doi) ghiKho(kho);
}

/** Tầng 2: đổ họ tên + chức danh (từ Base Account khi có khoá) */
export function capNhatHoTen(
  ds: { username: string; tenDayDu?: string; chucDanh?: string; avatar?: string; emailSci?: string | null }[],
): void {
  const kho = docKho();
  for (const ng of ds) {
    const u = sachUsername(ng.username);
    if (u === "") continue;
    const cu = kho[u] ?? {};
    if (ng.tenDayDu) cu.tenDayDu = ng.tenDayDu;
    if (ng.chucDanh) cu.chucDanh = ng.chucDanh;
    if (ng.avatar && !cu.avatar) cu.avatar = ng.avatar;
    // E15: undefined = nguồn không nói gì (giữ nguyên); null/"" = Base nói KHÔNG có → xoá
    if (ng.emailSci !== undefined) {
      if (ng.emailSci) cu.emailSci = ng.emailSci;
      else delete cu.emailSci;
    }
    kho[u] = cu;
  }
  ghiKho(kho);
}

/**
 * ⭐ E15 — ánh xạ email người dùng hệ thống → username Base, suy từ kho danh bạ
 * (chỉ những dòng Base đã trả email_sci). Màn Người dùng và gói
 * main.du_lieu_dung_chung đọc từ đây — một chỗ định nghĩa.
 */
export function anhXaEmailBase(): Record<string, { username: string; tenDayDu?: string }> {
  const ra: Record<string, { username: string; tenDayDu?: string }> = {};
  for (const [username, tt] of Object.entries(docKho())) {
    const e = (tt.emailSci ?? "").trim().toLowerCase();
    if (e !== "") ra[e] = { username, tenDayDu: tt.tenDayDu };
  }
  return ra;
}

/** Bỏ dấu tiếng Việt để tìm "thinh" ra "Thịnh" */
function boDau(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

/**
 * Khoá sắp xếp "theo họ tên" (J15, Mr. Đại 22/09): có tên đầy đủ thì theo tên
 * (bỏ dấu), chưa có tên xếp sau và theo username. Định nghĩa MỘT chỗ — ô chọn
 * người ở form giao việc, màn danh bạ và cổng MCP đều dùng thứ tự này.
 * (Chép từ Agent Base 23/09 — cùng bộ chung.)
 */
export function khoaSapTen(n: NguoiBase): string {
  const ten = boDau(n.tenDayDu ?? "");
  return ten !== "" ? `0 ${ten}` : `1 ${boDau(n.username)}`;
}

/**
 * Tìm người theo chuỗi gõ sau "@" — khớp đầu username HOẶC bất kỳ từ nào
 * trong họ tên hoặc chức danh (gõ "thi" ra cả @thinhhp lẫn "Hoàng Phú Thịnh").
 * Realtime, tối đa `toiDa` người, ưu tiên khớp đầu username; cùng điểm thì
 * theo họ tên. Chuỗi rỗng = CẢ danh bạ sắp theo họ tên (J15: ô chọn người
 * nhận việc hiện cả danh bạ cuộn được, không cắt 8).
 */
export function timNguoi(q: string, toiDa = 8): NguoiBase[] {
  const kho = docKho();
  const chuoi = boDau(q.trim());
  const ra: { diem: number; nguoi: NguoiBase }[] = [];
  for (const [username, tt] of Object.entries(kho)) {
    const nguoi: NguoiBase = { username, ...tt };
    if (chuoi === "") {
      ra.push({ diem: 1, nguoi });
      continue;
    }
    const u = boDau(username);
    const ten = boDau(tt.tenDayDu ?? "");
    let diem = 0;
    if (u.startsWith(chuoi)) diem = 3;
    else if (u.includes(chuoi)) diem = 2;
    else if (ten.split(/\s+/).some((tu) => tu.startsWith(chuoi))) diem = 2;
    else if (ten.includes(chuoi)) diem = 1;
    else if (boDau(tt.chucDanh ?? "").includes(chuoi)) diem = 1;
    if (diem > 0) ra.push({ diem, nguoi });
  }
  return ra
    .sort((a, b) => b.diem - a.diem || khoaSapTen(a.nguoi).localeCompare(khoaSapTen(b.nguoi)))
    .slice(0, toiDa)
    .map((x) => x.nguoi);
}

// ============================================================
// ⭐ J15 (Mr. Đại 22/09/2026) — KÉO DANH BẠ TỪ AGENT BASE MỖI 24 GIỜ
//
// Main KHÔNG tự quét Base.vn nữa (273 lượt gọi, 2–4 phút): danh bạ đầy đủ
// (152 người, 150 có họ tên — đo 23/09) đã nằm ở Agent Base. Main hỏi cổng
// `base.thong_tin_nhan_su` với `tat_ca=1` qua `hoiAgent` (có vết sổ nhật ký,
// luật 29), rồi đổ vào ĐÚNG kho này bằng capNhatHoTen — mọi màn tra danh bạ
// không phải sửa. Mốc kéo gần nhất ghi ở data/viec/danh-ba-keo-tu-base.json.
// ============================================================

const FILE_MOC_KEO = path.join(THU_MUC, "danh-ba-keo-tu-base.json");
/** Kéo lại khi bản đã cũ hơn 24 giờ */
const TUOI_TOI_DA_MS = 24 * 60 * 60 * 1000;
let dangKeoTuBase = false;

export interface MocKeoDanhBa {
  luc: string | null;
  soNguoi: number;
  soCoTen: number;
  /** E15 — số người Base trả kèm email_sci */
  soCoEmail?: number;
  loi?: string;
  /**
   * 04/10/2026 — hẹn hỏi lại (ISO). Agent trả KHONG_CO_DU_LIEU là CÂU TRẢ LỜI THẬT (vd agent Công việc tạm đóng danh bạ
   * hàng loạt) → không hỏi lại mỗi lần mở màn, đợi 24 giờ như khi kéo được; lỗi kết nối vẫn thử lại ngay như cũ.
   * `luc` vẫn là lần kéo THÀNH CÔNG cuối.
   */
  hoiLaiSau?: string;
}

export function docMocKeoTuBase(): MocKeoDanhBa {
  try {
    const d = JSON.parse(fs.readFileSync(FILE_MOC_KEO, "utf8")) as Partial<MocKeoDanhBa>;
    return { luc: d.luc ?? null, soNguoi: d.soNguoi ?? 0, soCoTen: d.soCoTen ?? 0, soCoEmail: d.soCoEmail, loi: d.loi, hoiLaiSau: d.hoiLaiSau };
  } catch {
    return { luc: null, soNguoi: 0, soCoTen: 0 };
  }
}

function ghiMocKeoTuBase(m: MocKeoDanhBa): void {
  try {
    fs.mkdirSync(THU_MUC, { recursive: true });
    fs.writeFileSync(FILE_MOC_KEO, JSON.stringify(m, null, 2) + "\n", "utf8");
  } catch {
    /* mất mốc thì lần sau kéo lại — không sập */
  }
}

/** Kéo NGAY cả danh bạ từ Agent Base (cổng 3011) và đổ vào kho. Không ném lỗi. */
export async function keoDanhBaTuBase(lyDo = "kéo danh bạ từ agent Công việc (mỗi 24 giờ)"): Promise<{
  ok: boolean;
  soNguoi: number;
  soCoTen: number;
  tongKho: number;
  message?: string;
}> {
  // import động: file này được bài kiểm nhập mà không cần cửa hỏi agent
  const { hoiAgent } = await import("@/lib/nguon/hoi-agent");
  const tra = await hoiAgent("base", "base.thong_tin_nhan_su", lyDo, {
    tham_so: { tat_ca: 1, gioi_han: 500 },
  });
  if (!tra.ok) {
    ghiMocKeoTuBase({
      ...docMocKeoTuBase(),
      loi: `${tra.ma_loi}: ${tra.thong_diep}`,
      hoiLaiSau: tra.ma_loi === "KHONG_CO_DU_LIEU" ? new Date(Date.now() + TUOI_TOI_DA_MS).toISOString() : undefined,
    });
    return { ok: false, soNguoi: 0, soCoTen: 0, tongKho: tongDanhBa(), message: `${tra.ma_loi}: ${tra.thong_diep}` };
  }
  const mang = ((tra.du_lieu as { nhan_su?: unknown[] } | undefined)?.nhan_su ?? []) as Record<string, unknown>[];
  const ds: { username: string; tenDayDu?: string; chucDanh?: string; avatar?: string; emailSci?: string | null }[] = [];
  for (const o of mang) {
    const username = sachUsername(o.ma_base);
    if (username === "") continue;
    ds.push({
      username,
      tenDayDu: typeof o.ho_ten === "string" && o.ho_ten.trim() !== "" ? o.ho_ten.trim() : undefined,
      chucDanh: typeof o.chuc_danh === "string" && o.chuc_danh.trim() !== "" ? o.chuc_danh.trim() : undefined,
      avatar: typeof o.anh === "string" && o.anh.trim() !== "" ? o.anh.trim() : undefined,
      // E15: Base có trường thì chép (kể cả null = xoá ánh xạ cũ); Base bản cũ không có trường thì giữ nguyên
      emailSci: "email_sci" in o ? (typeof o.email_sci === "string" && o.email_sci.trim() !== "" ? o.email_sci.trim().toLowerCase() : null) : undefined,
    });
  }
  const anhXaTruoc = JSON.stringify(anhXaEmailBase());
  if (ds.length > 0) capNhatHoTen(ds);
  const kq = {
    luc: new Date().toISOString(),
    soNguoi: ds.length,
    soCoTen: ds.filter((x) => x.tenDayDu).length,
    soCoEmail: ds.filter((x) => x.emailSci).length,
  };
  ghiMocKeoTuBase(kq);
  // E15: ánh xạ email ↔ username Base đổi thì đẩy gói dùng chung xuống 4 agent ngay
  if (JSON.stringify(anhXaEmailBase()) !== anhXaTruoc) {
    const { dayChoCacAgent } = await import("@/lib/day-sang-agent");
    void dayChoCacAgent("ánh xạ email ↔ username Base vừa đổi (E15)").catch(() => undefined);
  }
  return { ok: true, ...kq, tongKho: tongDanhBa() };
}

/**
 * Kéo NỀN khi bản đã cũ quá 24 giờ (hoặc chưa kéo lần nào). Không chờ, không
 * ném — gọi ở đầu GET /api/viec và /api/viec/danh-ba là đủ (mở màn là tự kéo).
 */
/**
 * CÔNG TẮC TỰ KÉO danh bạ "base" — TẮT theo chốt Mr. Đại sáng 04/10/2026: mã "base" nay là agent Công việc, danh bạ hàng
 * loạt đang tạm đóng (mã người agent Công việc không phải tài khoản Base.vn), nên KHÔNG tự kéo cho tới đợt sửa "Việc của tôi".
 * Người bấm kéo tay vẫn kéo được (sẽ nhận câu "tạm đóng"). Bật lại = đổi thành true.
 */
export const TU_KEO_DANH_BA_BASE = false;

export function keoDanhBaNenTuDong(): void {
  if (!TU_KEO_DANH_BA_BASE) return;
  if (dangKeoTuBase) return;
  const moc = docMocKeoTuBase();
  if (moc.luc !== null) {
    const tuoi = Date.now() - new Date(moc.luc).getTime();
    if (tuoi >= 0 && tuoi < TUOI_TOI_DA_MS) return;
  }
  if (moc.hoiLaiSau && Date.parse(moc.hoiLaiSau) > Date.now()) return;
  dangKeoTuBase = true;
  void keoDanhBaTuBase("tự kéo: danh bạ đã cũ quá 24 giờ hoặc chưa kéo lần nào")
    .catch(() => undefined)
    .finally(() => {
      dangKeoTuBase = false;
    });
}

/** Tổng số người trong kho danh bạ — màn hình nói rõ "8/140" chứ không im lặng cắt */
export function tongDanhBa(): number {
  return Object.keys(docKho()).length;
}

/** Tra nhanh 1 người (avatar cho dòng việc) */
export function traNguoi(username: string): NguoiBase | null {
  const u = sachUsername(username);
  if (u === "") return null;
  const kho = docKho();
  return kho[u] ? { username: u, ...kho[u] } : null;
}

/** Trả map {username → avatar/tên} cho danh sách username (vẽ 2 bảng) */
export function traNhieu(usernames: string[]): Record<string, NguoiBase> {
  const kho = docKho();
  const ra: Record<string, NguoiBase> = {};
  for (const raw of usernames) {
    const u = sachUsername(raw);
    if (u !== "" && kho[u]) ra[u] = { username: u, ...kho[u] };
  }
  return ra;
}

// ============================================================
// QUÉT DANH BẠ TOÀN CÔNG TY từ Base.vn (lệnh Mr. Đại 08/09) — ĐÃ GỠ 04/10/2026: Base.vn hết hợp đồng, nút gọi
// nó (POST /api/viec/danh-ba) trả 410 (kiểm độc lập lần 5 🟡5). Mã cũ xem lịch sử git trước commit gỡ.
// ============================================================
