// ============================================================
// ĐA DỰ ÁN — registry + thư mục dữ liệu + dự án đang chọn (nguồn sự thật chung)
// CHỈ chạy phía server (node:fs, next/headers) — không import vào Client Component.
//
// THIẾT KẾ:
// - Registry: data/projects.json { projects: ProjectInfo[] }. File chưa có →
//   coi như chỉ có DỰ ÁN GỐC (id "default" = Điện gió Hướng Phùng 1).
// - Thư mục dữ liệu: dự án "default" dùng NGUYÊN data/ như trước (không di dời,
//   tương thích 100% dữ liệu cũ); dự án khác dùng data/projects/<id>/.
//   → MỌI lib đọc-ghi file phải lấy thư mục qua projectDataDir(), KHÔNG tự
//   gocDuLieu() nữa.
// - Dự án đang chọn: cookie "sci_project" (không cần ký — chỉ là lựa chọn UI,
//   quyền thật kiểm ở canAccessProject). resolveProjectId() đọc cookie trong
//   request scope; ngoài request scope (build/test unit) → "default".
// - Quyền theo dự án: user có thêm projectIds?: string[] (users.ts).
//   undefined/rỗng = vào được MỌI dự án (tương thích user cũ); có mảng =
//   chỉ vào được các id trong mảng. PM LUÔN vào được mọi dự án.
//
// HỢP ĐỒNG API (agent triển khai đúng theo đây):
//   GET    /api/projects          → { projects: ProjectInfo[], current: string }
//                                   (đã lọc theo quyền user; kèm archived nếu ?all=1 và là pm)
//   POST   /api/projects          (chỉ pm) body { name, projectStart? }
//                                   → { ok, project } ; tự mkdir thư mục dữ liệu
//   PATCH  /api/projects          (chỉ pm) body { id, name? , archived? }
//                                   → { ok, project } ; không archive được "default"
//   DELETE /api/projects?id=...   (chỉ pm) → { ok } ; KHÔNG xóa được "default";
//                                   dữ liệu được CHUYỂN vào data/projects/_trash/
//                                   (không mất vĩnh viễn)
//   POST   /api/projects/select   body { id } → { ok } + Set-Cookie sci_project
//                                   (mọi role, nhưng phải canAccessProject)
//   Các API dữ liệu (schedule/weekreport/dayreport/ai-output...) nhận thêm
//   query ?project=<id> ĐÈ cookie (dùng cho MCP/Claude Desktop không có cookie).
// ============================================================

import fs from "node:fs";
import { duAnHaiTen } from "@/lib/ten-du-an-gan-trung";
import path from "node:path";
import { gocDuLieu } from "@/lib/goc-du-lieu";
import { luonMoiDuAn } from "@/lib/quyen";
import { chuanDonViDuAn, doiNhomDonVi, kiemDonViDuAn } from "@/lib/du-an-don-vi";
import { docToChuc } from "@/lib/to-chuc";
import { chiThuocNhaMay, dungBang, laLanhDao, thuocDuAnKeCapTren } from "@/lib/loai-theo-so-do";

export interface ProjectInfo {
  id: string; // slug [a-z0-9-], "default" = dự án gốc
  name: string;
  /** Ngày khởi công dự kiến (ISO) — chỉ để hiển thị, schedule.json mới là nguồn thật */
  projectStart?: string;
  /** Chủ đầu tư — Mr. Đại cấp 02/09: "Công ty cổ phần SCI" (ô mục I BC tuần) */
  chuDauTu?: string;
  /**
   * Toạ độ công trường — dùng để lấy dự báo thời tiết Open-Meteo (mục Dự báo
   * trên màn Thời tiết & Rủi ro, Mr. Đại chốt 06/09). Chưa khai thì màn hình
   * nói rõ "chưa khai toạ độ", KHÔNG đoán bừa một điểm nào đó.
   */
  viDo?: number;
  kinhDo?: number;
  /**
   * ⭐ MÃ NGẮN dùng chung cả hệ (HV · TT · BT · N3A) — Mr. Đại chốt 11/09/2026:
   * Main là nơi DUY NHẤT tạo dự án, 4 agent kia kéo về; mã này là khoá nối
   * (hợp đồng ghi maDuAn, pháp lý ghi ma, tiến độ nhận ma_du_an ở cổng MCP).
   */
  ma?: string;
  /**
   * Email Giám đốc dự án — CHỈ LÀ DỮ LIỆU dự án (hiện ở danh sách dự án, giao
   * sang 4 agent qua main.du_lieu_dung_chung). Từ 25/09 KHÔNG còn là điều kiện
   * quyền: ✍ ký phiếu giá = mọi PM, mọi dự án (quyen.ts cửa "pheduyet").
   */
  giamDoc?: string;
  /**
   * ⭐ 03/10/2026 (LOI-DUNG-CHUNG 6g.6, phương án A): TÊN GỌI KHÁC trong báo cáo ("ĐG Hướng Việt", "TĐ Nam Khiên 1"…) —
   * agent Công việc so tên việc với danh sách này để gắn việc vào dự án. Bản gốc ở Main, 5 agent kéo về.
   */
  tenKhac?: string[];
  /** ⭐ 03/10/2026: nhóm trên cây Dự án — "sci" = SCI đầu tư (dưới Ban QLDA) · "khac" = Loại khác */
  nhom?: "sci" | "khac";
  /**
   * ⭐ 03/10/2026 (6g.6 Đợt 2 bước E — Mr. Đại chốt "2a"): đơn vị gắn với dự án, mã đơn vị trong data/to-chuc.json.
   * SCI đầu tư: phần tử đầu = Ban QLDA đứng đầu, sau là đơn vị làm · Loại khác: đơn vị làm.
   * undefined = Main chưa quản (agent Công việc giữ bản tại chỗ) · [] = không gắn đơn vị nào. Luật: lib/du-an-don-vi.ts
   */
  donVi?: string[];
  /** Ban điều hành tổng thầu (chỉ dự án SCI đầu tư) */
  banDieuHanh?: string;
  /**
   * ⭐ 13/10/2026 (KE-HOACH/22, Mr. Đại): bốn ô của Bảng 3 báo cáo tháng — Công suất · Loại hình · Địa điểm · Giai đoạn.
   * Chữ tự do, khai ở Cài đặt → Dự án. Giai đoạn "Chuẩn bị đầu tư" → hồ sơ thủ tục của dự án vào Bảng 6, còn lại vào Bảng 7.
   */
  congSuat?: string;
  loaiHinh?: string;
  diaDiem?: string;
  giaiDoan?: string;
  createdAt: string;
  createdBy: string;
  archived?: boolean;
}

/** Chuẩn hoá danh sách tên gọi khác: bỏ trống, bỏ trùng (không phân biệt hoa thường), tối đa 30 tên × 120 ký tự */
export function chuanTenKhac(v: unknown, tenChinh?: string): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const seen = new Set<string>(tenChinh ? [tenChinh.trim().toLowerCase()] : []);
  const out: string[] = [];
  for (const x of v) {
    if (typeof x !== "string") continue;
    const t = x.trim().slice(0, 120);
    if (t === "" || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t);
    if (out.length >= 30) break;
  }
  return out.length ? out : undefined;
}
const chuanNhom = (v: unknown): "sci" | "khac" | undefined => (v === "sci" || v === "khac" ? v : undefined);
/** Ô chữ ngắn của sổ dự án (công suất, địa điểm…): bỏ trống thì undefined, tối đa 120 ký tự */
const chuNgan = (v: unknown): string | undefined => (typeof v === "string" && v.trim() !== "" ? v.trim().slice(0, 120) : undefined);
/** Các giai đoạn dự án chọn được ở Cài đặt → Dự án (13/10) */
export const CAC_GIAI_DOAN_DU_AN = ["Chuẩn bị đầu tư", "Đang thi công", "Vận hành"] as const;

export const DEFAULT_PROJECT_ID = "default";
export const PROJECT_COOKIE = "sci_project";

const DATA_DIR = gocDuLieu();
const PROJECTS_ROOT = path.join(DATA_DIR, "projects");
const REGISTRY_FILE = path.join(DATA_DIR, "projects.json");

// Tên "Dự án demo" (Mr. Đại chốt 04/09) — vỏ dự phòng cho app mới tinh, bị ẨN
// ngay khi có dự án thật (xem listProjects). Tên cũ "Điện gió Hướng Phùng 1".
const DEFAULT_PROJECT: ProjectInfo = {
  id: DEFAULT_PROJECT_ID,
  name: "Dự án demo",
  projectStart: "2025-09-15",
  createdAt: "2026-08-11T00:00:00.000Z",
  createdBy: "system",
};

const ID_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function sanitizeProjectId(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  return ID_RE.test(s) ? s : null;
}

// ===== Registry =====

function readRegistry(): ProjectInfo[] {
  let list: ProjectInfo[] = [];
  try {
    const raw = fs.readFileSync(REGISTRY_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (parsed !== null && typeof parsed === "object" && Array.isArray((parsed as Record<string, unknown>).projects)) {
      ((parsed as Record<string, unknown>).projects as unknown[]).forEach((p) => {
        if (p === null || typeof p !== "object") return;
        const r = p as Record<string, unknown>;
        const id = sanitizeProjectId(r.id);
        if (!id || typeof r.name !== "string" || r.name.trim() === "") return;
        list.push({
          id,
          name: r.name.trim(),
          projectStart:
            typeof r.projectStart === "string" && ISO_DATE_RE.test(r.projectStart)
              ? r.projectStart
              : undefined,
          // Chủ đầu tư (Mr. Đại cấp 02/09) — thiếu thì undefined, BC tuần ghi "—" + thiếu
          chuDauTu:
            typeof r.chuDauTu === "string" && r.chuDauTu.trim() !== ""
              ? r.chuDauTu.trim()
              : undefined,
          // Toạ độ công trường: chỉ nhận số trong khoảng hợp lệ, ngoài khoảng
          // coi như chưa khai (thà thiếu còn hơn hỏi thời tiết ở giữa biển)
          viDo:
            typeof r.viDo === "number" && r.viDo >= -90 && r.viDo <= 90 ? r.viDo : undefined,
          kinhDo:
            typeof r.kinhDo === "number" && r.kinhDo >= -180 && r.kinhDo <= 180
              ? r.kinhDo
              : undefined,
          // ⭐ 11/09: mã ngắn + Giám đốc dự án — bản gốc ở Main, 4 agent kia kéo về
          ma: typeof r.ma === "string" && /^[A-Z0-9]{2,6}$/.test(r.ma.trim().toUpperCase()) ? r.ma.trim().toUpperCase() : undefined,
          giamDoc: typeof r.giamDoc === "string" && r.giamDoc.trim() !== "" ? r.giamDoc.trim().toLowerCase() : undefined,
          // ⭐ 03/10: tên gọi khác + nhóm — PHẢI đọc ở đây, writeRegistry ghi lại đúng các trường đọc được
          tenKhac: chuanTenKhac(r.tenKhac, r.name),
          nhom: chuanNhom(r.nhom),
          // ⭐ 03/10 (6g.6 bước E): 3 trường gắn đơn vị — PHẢI đọc ở đây, writeRegistry chỉ ghi lại trường đọc được
          donVi: chuanDonViDuAn(r.donVi),
          banDieuHanh: typeof r.banDieuHanh === "string" && r.banDieuHanh.trim() !== "" ? r.banDieuHanh.trim() : undefined,
          // ⭐ 13/10: bốn ô Bảng 3 báo cáo tháng — PHẢI đọc ở đây, writeRegistry chỉ ghi lại trường đọc được
          congSuat: chuNgan(r.congSuat),
          loaiHinh: chuNgan(r.loaiHinh),
          diaDiem: chuNgan(r.diaDiem),
          giaiDoan: chuNgan(r.giaiDoan),
          createdAt: typeof r.createdAt === "string" ? r.createdAt : "",
          createdBy: typeof r.createdBy === "string" ? r.createdBy : "",
          archived: r.archived === true ? true : undefined,
        });
      });
    }
  } catch {
    list = [];
  }
  // Dự án gốc LUÔN tồn tại và LUÔN đứng đầu (giữ name/projectStart nếu đã đổi tên trong registry)
  const dedup: ProjectInfo[] = [];
  const seen = new Set<string>();
  const savedDefault = list.find((p) => p.id === DEFAULT_PROJECT_ID);
  dedup.push(savedDefault ? { ...savedDefault, archived: undefined } : { ...DEFAULT_PROJECT });
  seen.add(DEFAULT_PROJECT_ID);
  list.forEach((p) => {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      dedup.push(p);
    }
  });
  return dedup;
}

function writeRegistry(projects: ProjectInfo[]): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify({ projects }, null, 2) + "\n", "utf8");
}

/** Đổi email tài khoản (Mr. Đại chốt 04/10/2026): Giám đốc dự án / người tạo đang là email cũ → email mới. Trả số dự án đã đổi */
export function doiEmailTrongDuAn(emailCu: string, emailMoi: string): number {
  const cu = emailCu.trim().toLowerCase();
  const moi = emailMoi.trim().toLowerCase();
  const ds = readRegistry();
  let dem = 0;
  for (const p of ds) {
    let doi = false;
    if (p.giamDoc?.trim().toLowerCase() === cu) {
      p.giamDoc = moi;
      doi = true;
    }
    if (p.createdBy?.trim().toLowerCase() === cu) {
      p.createdBy = moi;
      doi = true;
    }
    if (doi) dem++;
  }
  if (dem > 0) writeRegistry(ds);
  return dem;
}

/** Danh sách dự án (mặc định ẩn archived). Luôn có ít nhất dự án gốc. */
export function listProjects(includeArchived = false): ProjectInfo[] {
  const all = readRegistry();
  const ds = includeArchived ? all : all.filter((p) => p.archived !== true);
  // "Dự án demo" (id "default", tên cũ Hướng Phùng 1) — Mr. Đại chốt 04/09:
  // ẨN khỏi MỌI danh sách khi còn ít nhất một dự án thật chưa lưu trữ; chỉ
  // hiện lại khi nó là dự án duy nhất (app mới tinh chưa tạo dự án nào).
  const coDuAnThat = all.some((p) => p.id !== DEFAULT_PROJECT_ID && p.archived !== true);
  return coDuAnThat ? ds.filter((p) => p.id !== DEFAULT_PROJECT_ID) : ds;
}

export function getProject(id: string): ProjectInfo | null {
  return readRegistry().find((p) => p.id === id) ?? null;
}

/**
 * ⭐ 24/09 — MÃ NGẮN của dự án (HV · N3A · TT · BT) từ bất kỳ cách gọi nào Main đang
 * cầm: slug id ("dien-gio-huong-viet-hv-du-lieu"), chính mã ngắn ("hv"), hay nhãn dàn
 * ngang ("HV · Điện gió Hướng Việt…"). Dự án chưa khai mã ngắn / không khớp → null,
 * nơi gọi giữ nguyên giá trị cũ — KHÔNG bịa mã.
 */
export function maNganDuAn(v: unknown): string | null {
  if (typeof v !== "string" || v.trim() === "") return null;
  const s = v.trim();
  const ds = readRegistry();
  const ma = (p: ProjectInfo | undefined) => (p?.ma ?? "").trim().toUpperCase() || null;
  const theoId = ds.find((p) => p.id === s);
  if (theoId) return ma(theoId);
  const dau = s.split(" · ")[0].trim().toUpperCase();
  return ma(ds.find((p) => (p.ma ?? "").trim().toUpperCase() === dau));
}

/** Bỏ dấu + hạ chữ thường + gộp khoảng trắng — so tên dự án "dễ tính" */
function phangTen(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * ⭐ 25/09 — TRA DỰ ÁN từ cách NGƯỜI nói: mã ngắn ("HV", "n3a"), slug id, nhãn dàn
 * ngang ("HV · Điện gió…"), hay tên ("Hướng Việt", "nậm săm 3A", "dự án Tân Thành").
 * Dùng cho trợ lý chat khi người hỏi vắt ngang một dự án không đang mở. Nhiều dự
 * án cùng khớp tên → null (không đoán); dự án lưu trữ không tính.
 */
export function timDuAn(v: unknown): ProjectInfo | null {
  if (typeof v !== "string" || v.trim() === "") return null;
  const s = v.trim();
  const ds = readRegistry().filter((p) => p.archived !== true);
  const theoId = ds.find((p) => p.id === s.toLowerCase());
  if (theoId) return theoId;
  const ma = (p: ProjectInfo) => (p.ma ?? "").trim().toUpperCase();
  const dau = s.split(" · ")[0]!.trim().toUpperCase();
  const theoMa = ds.find((p) => ma(p) !== "" && ma(p) === dau);
  if (theoMa) return theoMa;
  const q = phangTen(s);
  if (q === "") return null;
  const tu = new Set(q.split(" "));
  // Tên đầy đủ khớp, tên chứa câu gọi ("huong viet"), hoặc câu gọi nhắc mã như một từ ("du an hv")
  const khop = ds.filter((p) => {
    const ten = phangTen(p.name);
    return ten === q || (q.length >= 3 && ten.includes(q)) || (ma(p) !== "" && tu.has(ma(p).toLowerCase()));
  });
  return khop.length === 1 ? khop[0]! : null;
}

/** Tạo slug từ tên (bỏ dấu tiếng Việt), chống trùng bằng hậu tố -2, -3... */
function slugFromName(name: string): string {
  const base =
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/gi, "d")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 30) || "du-an";
  const existing = new Set(readRegistry().map((p) => p.id));
  if (!existing.has(base)) return base;
  let i = 2;
  while (existing.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

const MA_NGAN_RE = /^[A-Z0-9]{2,6}$/;

export function createProject(input: {
  name: string;
  projectStart?: string;
  createdBy: string;
  ma?: string;
  giamDoc?: string;
  tenKhac?: unknown;
  nhom?: unknown;
}): { ok: true; project: ProjectInfo } | { ok: false; error: string } {
  const name = input.name.trim();
  if (name === "") return { ok: false, error: "Tên dự án không được để trống." };
  const ma = (input.ma ?? "").trim().toUpperCase();
  if (ma !== "" && !MA_NGAN_RE.test(ma)) return { ok: false, error: "Mã ngắn phải 2–6 ký tự chữ/số (VD: HV, N3A)." };
  if (name.length > 120) return { ok: false, error: "Tên dự án tối đa 120 ký tự." };
  if (input.projectStart !== undefined && !ISO_DATE_RE.test(input.projectStart)) {
    return { ok: false, error: "Ngày khởi công phải là dạng yyyy-mm-dd." };
  }
  const projects = readRegistry();
  if (projects.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
    return { ok: false, error: `Đã có dự án tên "${name}".` };
  }
  if (ma !== "" && projects.some((p) => (p.ma ?? "").toUpperCase() === ma)) {
    return { ok: false, error: `Mã ngắn "${ma}" đã dùng cho dự án khác.` };
  }
  const project: ProjectInfo = {
    id: slugFromName(name),
    name,
    projectStart: input.projectStart,
    ...(ma !== "" ? { ma } : {}),
    ...(input.giamDoc?.trim() ? { giamDoc: input.giamDoc.trim().toLowerCase() } : {}),
    ...(chuanTenKhac(input.tenKhac, name) ? { tenKhac: chuanTenKhac(input.tenKhac, name) } : {}),
    ...(chuanNhom(input.nhom) ? { nhom: chuanNhom(input.nhom) } : {}),
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy,
  };
  const loiTen = tenGanTrungMoi(projects, [...projects, project]);
  if (loiTen) return { ok: false, error: loiTen };
  fs.mkdirSync(projectDataDir(project.id), { recursive: true });
  // ⭐ 24/09: bỏ bước tạo cây "Hồ sơ dự án" (lib/docs) — kho hồ sơ là của Agent
  // tiến độ, Main không giữ bản chép (chốt Mr. Đại 24/09).
  writeRegistry([...projects, project]);
  return { ok: true, project };
}

export function updateProject(
  id: string,
  patch: {
    name?: string;
    archived?: boolean;
    viDo?: number | null;
    kinhDo?: number | null;
    ma?: string | null;
    giamDoc?: string | null;
    /** null/[] = xoá hết tên gọi khác */
    tenKhac?: unknown;
    /** null = bỏ nhóm */
    nhom?: unknown;
    /** 6g.6 bước E: danh sách mã đơn vị (SCI đầu tư: đầu = Ban QLDA) */
    donVi?: unknown;
    /** 6g.6 bước E: mã Ban điều hành, null = bỏ */
    banDieuHanh?: unknown;
    /** 13/10: bốn ô Bảng 3 báo cáo tháng — chuỗi rỗng / null = xoá */
    congSuat?: unknown;
    loaiHinh?: unknown;
    diaDiem?: unknown;
    giaiDoan?: unknown;
  }
): { ok: true; project: ProjectInfo } | { ok: false; error: string } {
  const projects = readRegistry();
  const idx = projects.findIndex((p) => p.id === id);
  if (idx < 0) return { ok: false, error: `Không tìm thấy dự án "${id}".` };
  const maMoi = patch.ma === undefined ? undefined : (patch.ma ?? "").trim().toUpperCase();
  if (maMoi !== undefined && maMoi !== "" && !MA_NGAN_RE.test(maMoi)) {
    return { ok: false, error: "Mã ngắn phải 2–6 ký tự chữ/số (VD: HV, N3A)." };
  }
  if (maMoi && projects.some((p, i) => i !== idx && (p.ma ?? "").toUpperCase() === maMoi)) {
    return { ok: false, error: `Mã ngắn "${maMoi}" đã dùng cho dự án khác.` };
  }
  if (id === DEFAULT_PROJECT_ID && patch.archived === true) {
    return { ok: false, error: "Không thể lưu trữ dự án gốc." };
  }
  const name = patch.name?.trim();
  if (name !== undefined) {
    if (name === "") return { ok: false, error: "Tên dự án không được để trống." };
    if (projects.some((p, i) => i !== idx && p.name.toLowerCase() === name.toLowerCase())) {
      return { ok: false, error: `Đã có dự án tên "${name}".` };
    }
  }
  const project: ProjectInfo = {
    ...projects[idx],
    ...(name !== undefined ? { name } : {}),
    ...(patch.archived !== undefined ? { archived: patch.archived ? true : undefined } : {}),
    // Toạ độ công trường (dự báo thời tiết). null = xoá khai báo.
    ...(patch.viDo !== undefined ? { viDo: patch.viDo ?? undefined } : {}),
    ...(patch.kinhDo !== undefined ? { kinhDo: patch.kinhDo ?? undefined } : {}),
    ...(maMoi !== undefined ? { ma: maMoi || undefined } : {}),
    ...(patch.giamDoc !== undefined ? { giamDoc: patch.giamDoc?.trim().toLowerCase() || undefined } : {}),
    ...(patch.tenKhac !== undefined ? { tenKhac: chuanTenKhac(patch.tenKhac ?? [], name ?? projects[idx].name) } : {}),
    ...(patch.nhom !== undefined ? { nhom: chuanNhom(patch.nhom) } : {}),
    ...(patch.congSuat !== undefined ? { congSuat: chuNgan(patch.congSuat) } : {}),
    ...(patch.loaiHinh !== undefined ? { loaiHinh: chuNgan(patch.loaiHinh) } : {}),
    ...(patch.diaDiem !== undefined ? { diaDiem: chuNgan(patch.diaDiem) } : {}),
    ...(patch.giaiDoan !== undefined ? { giaiDoan: chuNgan(patch.giaiDoan) } : {}),
  };
  // ⭐ 03/10 (6g.6 Đợt 2 bước E): 3 trường gắn đơn vị — kiểm theo cây đơn vị ở Main; đổi nhóm thì 3 trường đi theo
  const nhomCu = projects[idx].nhom;
  if (patch.donVi !== undefined || patch.banDieuHanh !== undefined) {
    const tc = docToChuc();
    if (tc.tinhTrang !== "ok") return { ok: false, error: "Main chưa có tổ chức (cây đơn vị) — chạy bộ chuyển người trước rồi mới gắn đơn vị cho dự án." };
    const v = {
      donVi: patch.donVi !== undefined ? patch.donVi : (project.donVi ?? []),
      banDieuHanh: patch.banDieuHanh !== undefined ? patch.banDieuHanh : (project.banDieuHanh ?? null),
    };
    const loi = kiemDonViDuAn(project.nhom, v, tc.toChuc.don_vi);
    if (loi) return { ok: false, error: loi };
    project.donVi = chuanDonViDuAn(v.donVi) ?? [];
    project.banDieuHanh = typeof v.banDieuHanh === "string" && v.banDieuHanh.trim() !== "" ? v.banDieuHanh.trim() : undefined;
  } else if (project.nhom !== nhomCu && project.donVi) {
    const d = doiNhomDonVi({ donVi: project.donVi, banDieuHanh: project.banDieuHanh ?? null }, nhomCu, project.nhom);
    project.donVi = d.donVi;
    project.banDieuHanh = d.banDieuHanh ?? undefined;
  }
  // ⭐ 03/10 (6g.6): đổi tên thì giữ tên cũ trong "tên gọi khác" — báo cáo cũ ghi tên cũ vẫn khớp dự án ở agent Công việc
  // (agent kia kéo nguyên tenKhac về, không tự giữ được tên cũ qua nhiều lượt kéo)
  const tenCu = projects[idx].name.trim();
  if (name !== undefined && name.toLowerCase() !== tenCu.toLowerCase()) {
    project.tenKhac = chuanTenKhac([...(project.tenKhac ?? []), tenCu], name);
  }
  const next = projects.slice();
  next[idx] = project;
  const loiTen = tenGanTrungMoi(projects, next);
  if (loiTen) return { ok: false, error: loiTen };
  writeRegistry(next);
  return { ok: true, project };
}

/**
 * Soát 03/10 điểm 2: thao tác này có SINH THÊM cặp dự án tên gần trùng không (tên chính + tên gọi khác, dự án chưa lưu trữ).
 * Chỉ chặn cặp MỚI — cặp đã có từ trước (nếu có) không khoá việc sửa dự án khác. Trả câu lỗi tiếng Việt hoặc null.
 */
function tenGanTrungMoi(truoc: ProjectInfo[], sau: ProjectInfo[]): string | null {
  const ds = (l: ProjectInfo[]) => l.filter((p) => !p.archived).map((p) => ({ ten: p.name, ten_khac: p.tenKhac ?? [] }));
  const cu = new Set(duAnHaiTen(ds(truoc)));
  return duAnHaiTen(ds(sau)).find((x) => !cu.has(x)) ?? null;
}

/** Toàn bộ registry (kể cả lưu trữ) — cho cổng `main.du_lieu_dung_chung` giao 4 agent kia */
export function danhSachDuAnDungChung(): ProjectInfo[] {
  return readRegistry();
}

/** Xóa dự án (không xóa được dự án gốc). Dữ liệu CHUYỂN vào data/projects/_trash/ để cứu được. */
export function deleteProject(id: string): { ok: true } | { ok: false; error: string } {
  if (id === DEFAULT_PROJECT_ID) return { ok: false, error: "Không thể xóa dự án gốc." };
  const projects = readRegistry();
  if (!projects.some((p) => p.id === id)) return { ok: false, error: `Không tìm thấy dự án "${id}".` };
  const dir = projectDataDir(id);
  if (fs.existsSync(dir)) {
    const trashDir = path.join(PROJECTS_ROOT, "_trash");
    fs.mkdirSync(trashDir, { recursive: true });
    fs.renameSync(dir, path.join(trashDir, `${id}-${Date.now()}`));
  }
  writeRegistry(projects.filter((p) => p.id !== id));
  return { ok: true };
}

// ===== Thư mục dữ liệu theo dự án =====

/**
 * Thư mục dữ liệu của dự án:
 * - "default" → data/ (nguyên trạng — toàn bộ file cũ schedule.json,
 *   weekreport-*.json, baseline-*.json... vẫn nằm đây, KHÔNG di dời)
 * - khác     → data/projects/<id>/
 */
export function projectDataDir(projectId: string): string {
  return projectId === DEFAULT_PROJECT_ID ? DATA_DIR : path.join(PROJECTS_ROOT, projectId);
}

// ===== Dự án đang chọn (cookie) =====

/**
 * Xác định dự án hiện hành theo thứ tự: explicit (query ?project=) → cookie
 * sci_project → "default". Id không hợp lệ / không tồn tại / đã archived →
 * rơi về "default". Gọi ngoài request scope (build, unit test) an toàn.
 */
export function resolveProjectId(explicit?: string | null): string {
  const tryId = (v: unknown): string | null => {
    const id = sanitizeProjectId(v);
    if (!id) return null;
    const p = getProject(id);
    return p && p.archived !== true ? id : null;
  };
  const fromExplicit = tryId(explicit);
  if (fromExplicit) return fromExplicit;
  try {
    // import động để module này vẫn require được từ script node thuần (tests)
    const { cookies } = require("next/headers") as typeof import("next/headers");
    const fromCookie = tryId(cookies().get(PROJECT_COOKIE)?.value);
    if (fromCookie) return fromCookie;
  } catch {
    // ngoài request scope → rơi xuống dưới
  }
  // Không chỉ định dự án nào → dự án ĐẦU TIÊN đang hiện (04/09: dự án demo bị
  // ẩn khi có dự án thật, nên fallback là dự án thật đầu tiên; app mới tinh
  // chưa có dự án nào thì vẫn về dự án demo).
  return listProjects()[0]?.id ?? DEFAULT_PROJECT_ID;
}

// ===== Quyền theo dự án =====

/**
 * user.projectIds: undefined/rỗng = vào được mọi dự án (user cũ không đổi gì);
 * có mảng = chỉ các id trong mảng. PM/Admin LUÔN vào được mọi dự án
 * (quyen.ts luonMoiDuAn — Mr. Đại chốt 25/09).
 */
export function canAccessProject(
  user: { role?: string; projectIds?: string[] } | null | undefined,
  projectId: string
): boolean {
  if (!user) return false;
  if (luonMoiDuAn(user.role)) return true;
  if (!Array.isArray(user.projectIds) || user.projectIds.length === 0) return true;
  return user.projectIds.includes(projectId);
}

/**
 * Kiểm quyền theo email (dùng trong API route sau requireRole — session chỉ có
 * email+role). Đọc thẳng data/users.json (không import users.ts để tránh vòng
 * phụ thuộc). User không tìm thấy trong file (vd tài khoản seed cũ) → cho qua
 * theo role (tương thích cũ).
 */
export function canAccessProjectByEmail(email: string, role: string, projectId: string): boolean {
  if (luonMoiDuAn(role)) return true;
  try {
    const raw = fs.readFileSync(path.join(DATA_DIR, "users.json"), "utf8");
    const parsed: unknown = JSON.parse(raw);
    const arr: unknown[] = Array.isArray(parsed)
      ? parsed
      : parsed !== null && typeof parsed === "object" && Array.isArray((parsed as Record<string, unknown>).users)
        ? ((parsed as Record<string, unknown>).users as unknown[])
        : [];
    const found = arr.find(
      (u) =>
        u !== null &&
        typeof u === "object" &&
        typeof (u as Record<string, unknown>).email === "string" &&
        ((u as Record<string, unknown>).email as string).toLowerCase() === email.trim().toLowerCase()
    ) as Record<string, unknown> | undefined;
    if (!found) return true;
    // ⭐ 6g.6.13 (Mr. Đại chốt 03/10 tối "mọi người thấy hết trừ nhà máy"): tổ chức đã có → quyền vào dự án đi theo sơ đồ,
    // danh sách dự án khai tay (projectIds) thôi dùng. Người CHỈ thuộc nhà máy: chỉ dự án mình thuộc (lãnh đạo thì mọi dự án).
    const tc = docToChuc();
    if (tc.tinhTrang === "ok") {
      const b = dungBang(tc.toChuc);
      const nguoi = {
        id: typeof found.id === "string" ? found.id : undefined,
        email: String(found.email),
        role: "engineer" as const,
        donViId: typeof found.donViId === "string" ? found.donViId : null,
        vaiCongViec: Array.isArray(found.vaiCongViec) ? (found.vaiCongViec as unknown[]).filter((x): x is string => typeof x === "string") : [],
      };
      if (!chiThuocNhaMay(nguoi, b) || laLanhDao(nguoi)) return true;
      const p = readRegistry().find((x) => x.id === projectId);
      // 12/10/2026: Main giữ như đang chạy (Mr. Đại) — vẫn phép «đơn vị gắn hoặc cấp trên» cũ, không theo công thức mới của các agent
      return !!p && thuocDuAnKeCapTren(nguoi, { id: p.id, donVi: p.donVi, banDieuHanh: p.banDieuHanh }, b);
    }
    return canAccessProject(
      {
        role: typeof found.role === "string" ? found.role : undefined,
        projectIds: Array.isArray(found.projectIds)
          ? (found.projectIds as unknown[]).filter((x): x is string => typeof x === "string")
          : undefined,
      },
      projectId
    );
  } catch {
    return true;
  }
}
