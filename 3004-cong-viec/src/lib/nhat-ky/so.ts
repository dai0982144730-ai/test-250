// SỔ NHẬT KÝ HỎI–ĐÁP — ghi và đọc  (HOP-DONG-KET-NOI mục 7)
//
// Ghi kiểu APPEND-ONLY (JSONL, mỗi dòng một bản ghi): sổ truy vết mà cho phép
// sửa/xoá thì mất luôn tác dụng chống bịa. Đọc thì đọc ngược từ cuối lên.
//
// Sổ nằm ở `core` — DÙNG CHUNG cả 5 agent, không tách theo dự án (mã dự án là
// một CỘT). Đặt ở `data/nhat-ky-hoi-agent.jsonl`.
//
// "Không tốn token — ghi SAU KHI việc đã xong, không dòng nào quay lại prompt"
// (PLAN-MAIN-AGENT). Vì vậy ghi hỏng cũng KHÔNG được làm hỏng việc chính.
// Server-only.
//
// AGENT CÔNG VIỆC (03/10/2026): chép từ Agent Base (1-agent-base/src/lib/nhat-ky/so.ts).
// Khác duy nhất: thư mục dữ liệu lấy qua `@/lib/ai/duong-dan` (biến DOCFLOW_AI_DATA).
// Mã agent ghi sổ là "base" — Agent Công việc thế chỗ Base trong danh bạ (Mr. Đại chốt).

import fs from "node:fs";
import path from "node:path";
import {
  chuanHoaDongNhatKy,
  dongHopLe,
  locThamSo,
  type BenDuocHoi,
  type DongNhatKy,
  type DuongGoi,
} from "./model";
// Agent Công việc: thư mục dữ liệu chung của app (đặt DOCFLOW_AI_DATA để test trỏ sang thư mục tạm)
import { thuMucDuLieu } from "@/lib/ai/duong-dan";
import { chayTrongChuoi, MA_AGENT_SO, nguCanhChuoi } from "./chuoi";
import {
  CONG_CU_MO_LAI_MACH,
  CONG_CU_NGAT_MACH,
  dungTruongV2,
  kenhTrang,
  laKhuonMcp,
  nguonBaseVn,
  phanLoaiLuot,
  sinhMa,
  type LoaiLuot,
  type VaiSo,
} from "./khuon-so";

const TEN_FILE = "nhat-ky-hoi-agent.jsonl";

function duongDan(): string {
  return path.join(thuMucDuLieu(), TEN_FILE);
}

/** Chuẩn hoá một dòng trước khi ghi — dùng chung cho ghiNhatKy và phân loại lượt v2 */
function chuanHoaDeGhi(d: DongNhatKy): DongNhatKy {
  return { ...chuanHoaDongNhatKy(d), thamSo: locThamSo(d.thamSo) };
}

/**
 * Ghi một dòng. KHÔNG BAO GIỜ ném lỗi ra ngoài: sổ hỏng thì mất vết, còn ném
 * lỗi thì hỏng luôn việc chính — đổi một mất mát nhỏ lấy một mất mát to.
 */
export function ghiNhatKy(d: DongNhatKy): boolean {
  try {
    if (!dongHopLe(d)) return false;
    // ⭐ A04 22/09: hai cột mã agent luôn ghi MÃ CHUẨN, dù chỗ gọi còn đưa bí danh cũ
    const sach: DongNhatKy = chuanHoaDeGhi(d);
    const p = duongDan();
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.appendFileSync(p, JSON.stringify(sach) + "\n", "utf8");
    return true;
  } catch {
    return false;
  }
}

export interface BoLoc {
  duAn?: string;
  agentTraLoi?: BenDuocHoi;
  duong?: DuongGoi;
  /** Chỉ lấy dòng lỗi */
  chiLoi?: boolean;
  /** Số dòng tối đa, tính từ MỚI NHẤT */
  gioiHan?: number;
}

/** Đọc sổ, mới nhất trước. Dòng hỏng thì bỏ qua dòng đó, không bỏ cả sổ. */
export function docNhatKy(loc: BoLoc = {}): DongNhatKy[] {
  const p = duongDan();
  if (!fs.existsSync(p)) return [];
  let tho: string;
  try {
    tho = fs.readFileSync(p, "utf8");
  } catch {
    return [];
  }
  const ra: DongNhatKy[] = [];
  for (const dong of tho.split("\n")) {
    const s = dong.trim();
    if (s === "") continue;
    try {
      // ⭐ A04 22/09: sổ cũ ghi "tien-do"/"base-agent"… — quy về mã chuẩn NGAY LÚC ĐỌC,
      // không sửa file sổ. Bộ lọc `agentTraLoi` vì thế cũng so bằng mã chuẩn.
      const d = chuanHoaDongNhatKy(JSON.parse(s) as DongNhatKy);
      if (loc.duAn && d.duAn !== loc.duAn) continue;
      if (loc.agentTraLoi && d.agentTraLoi !== loc.agentTraLoi) continue;
      if (loc.duong && d.duong !== loc.duong) continue;
      if (loc.chiLoi && d.ketQua !== "loi") continue;
      ra.push(d);
    } catch {
      // dòng hỏng — bỏ qua đúng dòng đó
    }
  }
  ra.reverse(); // mới nhất trước
  return loc.gioiHan ? ra.slice(0, loc.gioiHan) : ra;
}

// ─────────────────────────────────────────────────────────────
// KHUÔN SỔ BẢN 2 — ghi một lượt (HOP-DONG-KET-NOI 7.1, chốt 26/09/2026)
// Luật điền trường nằm ở `khuon-so.ts`; phần dưới chỉ lắp ráp và ghi.
// ─────────────────────────────────────────────────────────────

/**
 * `laKhuonMcp` coi MỌI đối tượng có `ok: boolean` là khuôn MCP. Nhiều hàm được
 * bọc trả kiểu riêng cũng có `ok` (Base.vn `{ok, data, message}`, LLM `{ok, text}`…)
 * — đưa thẳng vào khuôn thì dấu vân băm `du_lieu` không tồn tại (mọi câu trả lời
 * cùng một dấu vân) và lỗi thiếu `ma_loi`. Quy về khuôn thật trước khi xét:
 *   · `ok: true` không có `du_lieu` → cả đối tượng (trừ `ok`) là `du_lieu`
 *   · `ok: false` không có `ma_loi` → `LOI_NOI_BO`, thông điệp lấy `message`/`loi`
 */
export function traVeChoSo(v: unknown): unknown {
  if (!laKhuonMcp(v)) return v;
  const o = v as unknown as Record<string, unknown>;
  if (o.ok === true) {
    if ("du_lieu" in o) return v;
    const { ok: _ok, ...con } = o;
    void _ok;
    return { ok: true, du_lieu: con };
  }
  if (typeof o.ma_loi === "string" && o.ma_loi.trim() !== "") return v;
  const thongDiep = [o.thong_diep, o.message, o.loi, o.thongDiep, o.lyDo, o.tomTat].find(
    (x) => typeof x === "string" && x.trim() !== "",
  ) as string | undefined;
  return { ok: false, ma_loi: "LOI_NOI_BO", thong_diep: thongDiep };
}

interface MaLuotV2 {
  maLuot: string;
  maChuoi: string;
  kiemDinh: boolean;
}

/** Mở một lượt: mã lượt mới, mã chuỗi = chuỗi đang chạy (chưa có thì sinh mới) */
function moLuot(): MaLuotV2 {
  const c = nguCanhChuoi();
  return {
    maLuot: sinhMa(MA_AGENT_SO),
    maChuoi: c?.maChuoi ?? sinhMa(MA_AGENT_SO),
    kiemDinh: c?.kiemDinh === true,
  };
}

type NenDong = Omit<DongNhatKy, "ketQua" | "miliGiay">;

/**
 * Ghi một dòng v2. KHÔNG BAO GIỜ ném lỗi (sổ hỏng không được làm hỏng việc chính).
 * `ket` là giá trị hàm được bọc trả về, hoặc ngoại lệ nó ném.
 */
function ghiLuotV2(
  vai: VaiSo,
  nen: NenDong,
  luot: MaLuotV2,
  batDau: number,
  ket: { traVe: unknown } | { loiNem: unknown },
  them: { nguonDan?: string; soToken?: number; traLoiGon?: string; loaiLuot?: LoaiLuot } = {},
): boolean {
  try {
    // Phân loại theo mã ĐÃ chuẩn hoá (A04) — "tien-do" cũ vẫn là agent của hệ
    const chuan = chuanHoaDeGhi({ ...nen, ketQua: "ok", miliGiay: 0 });
    const loaiLuot =
      them.loaiLuot ??
      phanLoaiLuot({ agentHoi: chuan.agentHoi, congCu: chuan.congCu, lyDoGoi: chuan.lyDoGoi, kiemDinh: luot.kiemDinh });
    const { nguonTuDong, ...v2 } = dungTruongV2({
      maLuot: luot.maLuot,
      vai,
      maChuoi: luot.maChuoi,
      loaiLuot,
      agentTraLoi: chuan.agentTraLoi,
      ...("loiNem" in ket ? { loiNem: ket.loiNem ?? new Error("lỗi không rõ") } : { traVe: traVeChoSo(ket.traVe) }),
    });
    // Luật nguonDan: chỗ gọi đưa thì dùng; không thì rút từ nguon[]; gọi Base.vn thì đường gọi
    const nguonDan =
      them.nguonDan ??
      nguonTuDong ??
      (v2.ketQua === "ok" && chuan.agentTraLoi === "basevn" ? nguonBaseVn(chuan.congCu) : undefined);
    const ok = ghiNhatKy({
      ...nen,
      ...v2,
      miliGiay: Date.now() - batDau,
      nguonDan,
      soToken: them.soToken,
      traLoiGon: them.traLoiGon,
    });
    const dem = nguCanhChuoi()?.demLuot;
    if (ok && dem && loaiLuot !== "goc") dem.set(chuan.agentTraLoi, (dem.get(chuan.agentTraLoi) ?? 0) + 1);
    return ok;
  } catch {
    return false;
  }
}

export interface NguCanhGoi {
  agentTraLoi: BenDuocHoi;
  /** "thietke.phan_loai_ban_ve", "base.project_list"… */
  congCu: string;
  thamSo: Record<string, unknown>;
  /** BẮT BUỘC — không cho gọi vu vơ (mục 7) */
  lyDoGoi: string;
  duong: DuongGoi;
  duAn?: string;
  nguoi?: string;
  agentHoi?: string;
}

/** Thứ chỗ gọi nói thêm về kết quả — không biết thì bỏ trống, KHÔNG ước */
export interface TomTatLuot {
  /** Bỏ trống → hàm bọc tự rút từ `nguon[]` (Base.vn: `Base.vn/<đường>`) */
  nguonDan?: string;
  soToken?: number;
  traLoiGon?: string;
  /** Giá trị đưa khuôn sổ xét thay cho giá trị trả về (khi kiểu trả về không nói được ok/lỗi) */
  traVe?: unknown;
}

/**
 * BỌC một lời gọi ra ngoài: bấm giờ, gọi, ghi vết, trả kết quả nguyên vẹn.
 * Lỗi của việc chính vẫn được NÉM TIẾP ra ngoài sau khi đã ghi vết — sổ không
 * được nuốt lỗi.
 *
 * ⭐ Khuôn sổ bản 2 (26/09): `ketQua` do hàm bọc TỰ QUYẾT từ giá trị trả về
 * (`dungTruongV2`) — trả `{ok:false, ma_loi:"KHONG_CO_DU_LIEU"}` là
 * `khong-co-du-lieu`, không còn ghi "ok" như 2.675 dòng cũ. `fn` chạy trong
 * ngữ cảnh chuỗi có mã lượt, nên `headerChuoi()` trong `fn` mang đúng mã lượt
 * sang bên nhận.
 *
 * `tomTat` để chỗ gọi nói thêm nguồn dẫn, số token, dòng gọn nếu biết.
 */
export async function goiCoGhi<T>(
  nc: NguCanhGoi,
  fn: () => Promise<T>,
  tomTat?: (kq: T) => TomTatLuot
): Promise<T> {
  const bd = Date.now();
  const luot = moLuot();
  const nen: NenDong = {
    thoiDiem: new Date(bd).toISOString(),
    // ⭐ Vá 12/09: mặc định trước đây là "tien-do" — chuỗi kế thừa từ bộ mã Agent
    // Tiến độ, khiến sổ của Agent Base ghi TÊN AGENT KHÁC ở cột "ai hỏi".
    // ⭐ A04 22/09: mã chuẩn là "base" (tên cổng), không phải "base-agent".
    agentHoi: nc.agentHoi ?? "base",
    agentTraLoi: nc.agentTraLoi,
    congCu: nc.congCu,
    thamSo: nc.thamSo,
    lyDoGoi: nc.lyDoGoi,
    duong: nc.duong,
    duAn: nc.duAn,
    nguoi: nc.nguoi,
  };
  let kq: T;
  try {
    kq = await chayTrongChuoi(luot.maChuoi, fn, { maLuot: luot.maLuot, kiemDinh: luot.kiemDinh });
  } catch (err) {
    ghiLuotV2("goi", nen, luot, bd, { loiNem: err });
    throw err;
  }
  let t: TomTatLuot = {};
  try {
    t = tomTat?.(kq) ?? {};
  } catch {
    // tóm tắt hỏng thì ghi không tóm tắt — không được làm hỏng việc chính
  }
  ghiLuotV2("goi", nen, luot, bd, { traVe: "traVe" in t ? t.traVe : kq }, t);
  return kq;
}

/**
 * Cổng MCP ghi lượt BỊ GỌI (vai "nhan") — cùng mã lượt bên gọi gửi sang.
 * `kq` là khuôn trả lời cổng vừa trả.
 */
export function ghiLuotNhan(
  nen: NenDong,
  luot: MaLuotV2,
  batDau: number,
  kq: unknown,
  them: { traLoiGon?: string } = {},
): boolean {
  return ghiLuotV2("nhan", nen, luot, batDau, { traVe: kq }, them);
}

/**
 * NGẮT MẠCH GHI SỔ KHI XẢY RA THẬT (7.1 · 6.1 luật 2). Gọi đúng lúc trạng thái
 * đổi: `mo` = vừa đủ lỗi liên tiếp và bắt đầu nghỉ · `dong` = gọi lại được sau
 * khi đã nghỉ. Agent quan sát đếm ngắt mạch bằng các dòng này.
 */
export function ghiSuKienMach(
  suKien: "mo" | "dong",
  agentBiNgat: string,
  tenAgent: string,
  o: { soLoi?: number; phutNghi?: number; duong?: DuongGoi } = {},
): boolean {
  const luot = moLuot();
  const laMo = suKien === "mo";
  const lyDo = laMo
    ? `${o.soLoi ?? 3} lỗi liên tiếp tới ${tenAgent} — nghỉ ${o.phutNghi ?? 10} phút`
    : `${tenAgent} trả lời lại được sau khi nghỉ — gọi lại bình thường`;
  return ghiLuotV2(
    "goi",
    {
      thoiDiem: new Date().toISOString(),
      agentHoi: MA_AGENT_SO,
      agentTraLoi: agentBiNgat as BenDuocHoi,
      congCu: laMo ? CONG_CU_NGAT_MACH : CONG_CU_MO_LAI_MACH,
      thamSo: {},
      lyDoGoi: lyDo,
      duong: o.duong ?? "A",
    },
    luot,
    Date.now(),
    {
      traVe: laMo
        ? { ok: false, ma_loi: "AGENT_KHONG_SAN_SANG", thong_diep: lyDo }
        : { ok: true, du_lieu: { mach: "da-dong-lai", agent: agentBiNgat } },
    },
    { loaiLuot: "ha-tang" },
  );
}

export interface NguCanhGoc {
  /** Kênh — `KENH_GOC.*` hoặc `kenhTrang(...)` */
  kenh: string;
  lyDoGoi: string;
  /** Câu người hỏi (chat/Telegram) → `thamSo.cau_hoi` */
  cauHoi?: string;
  duong: DuongGoi;
  duAn?: string;
  nguoi?: string;
  thamSo?: Record<string, unknown>;
}

/**
 * DÒNG GỐC CHUỖI (7.1): chạy một việc trọn vẹn trong MỘT mã chuỗi mới rồi ghi
 * dòng `loaiLuot: goc` khi việc xong. `rutTraLoi` trả câu trả lời cuối gửi
 * người dùng (chữ), hoặc khuôn `{ok:false, ma_loi, thong_diep}` khi việc hỏng.
 * Lồng trong một việc gốc khác thì chỉ chạy, không ghi dòng gốc thứ hai.
 */
export async function chayGocChuoi<T>(
  nc: NguCanhGoc,
  fn: () => Promise<T>,
  rutTraLoi: (kq: T) => unknown | Promise<unknown>,
): Promise<T> {
  const cu = nguCanhChuoi();
  if (cu?.coGoc) return fn();
  const bd = Date.now();
  const luot: MaLuotV2 = { maLuot: sinhMa(MA_AGENT_SO), maChuoi: sinhMa(MA_AGENT_SO), kiemDinh: cu?.kiemDinh === true };
  const nen: NenDong = {
    thoiDiem: new Date(bd).toISOString(),
    agentHoi: MA_AGENT_SO,
    agentTraLoi: MA_AGENT_SO as BenDuocHoi,
    congCu: nc.kenh,
    thamSo: { ...(nc.thamSo ?? {}), ...(nc.cauHoi !== undefined ? { cau_hoi: nc.cauHoi } : {}) },
    lyDoGoi: nc.lyDoGoi,
    duong: nc.duong,
    duAn: nc.duAn,
    nguoi: nc.nguoi,
  };
  let kq: T;
  try {
    kq = await chayTrongChuoi(luot.maChuoi, fn, { coGoc: true, kiemDinh: luot.kiemDinh, demLuot: new Map() });
  } catch (err) {
    ghiLuotV2("goi", nen, luot, bd, { loiNem: err }, { loaiLuot: "goc" });
    throw err;
  }
  let traVe: unknown;
  try {
    traVe = await rutTraLoi(kq);
  } catch {
    traVe = undefined;
  }
  ghiLuotV2("goi", nen, luot, bd, { traVe }, { loaiLuot: "goc" });
  return kq;
}

/**
 * Rút câu trả lời cuối từ phản hồi JSON của một route (trợ lý chat…) cho dòng gốc:
 * `ok` → chữ ở trường `truong`; hỏng → khuôn `{ok:false, ma_loi, thong_diep}`
 * (mã lỗi theo mã HTTP: 400/404 sai yêu cầu · 401/403 không có quyền · còn lại lỗi nội bộ).
 */
export async function rutTraLoiJson(res: Response, truong = "reply"): Promise<unknown> {
  let j: Record<string, unknown> = {};
  try {
    j = (await res.clone().json()) as Record<string, unknown>;
  } catch {
    // không phải JSON
  }
  if (res.ok && j.ok !== false) {
    const t = j[truong];
    return typeof t === "string" ? t : JSON.stringify(t ?? null);
  }
  const ma =
    res.status === 400 || res.status === 404
      ? "KHONG_HIEU_YEU_CAU"
      : res.status === 401 || res.status === 403
        ? "KHONG_CO_QUYEN"
        : "LOI_NOI_BO";
  const tin = [j.message, j.thong_diep, j.loi].find((x) => typeof x === "string" && x.trim() !== "") as string | undefined;
  return { ok: false, ma_loi: ma, thong_diep: tin ?? `HTTP ${res.status}` };
}

/**
 * MỞ TRANG / GỌI API: mọi lượt của một lần mở chung MỘT mã chuỗi. Đã ở trong
 * chuỗi thì gom chung, không mở chuỗi mới. Có lượt hỏi ra ngoài thì ghi thêm
 * dòng gốc kênh `trang:<đường dẫn>` tóm tắt số lượt theo bên (code đếm, không
 * LLM) — không có lượt nào thì không ghi gì.
 */
export async function chayTrangChuoi<T>(
  duongDan: string,
  fn: () => Promise<T>,
  o: { nguoi?: string; duAn?: string } = {},
): Promise<T> {
  const cu = nguCanhChuoi();
  if (cu) return fn();
  const bd = Date.now();
  const dem = new Map<string, number>();
  const luot: MaLuotV2 = { maLuot: sinhMa(MA_AGENT_SO), maChuoi: sinhMa(MA_AGENT_SO), kiemDinh: false };
  const nen: NenDong = {
    thoiDiem: new Date(bd).toISOString(),
    agentHoi: MA_AGENT_SO,
    agentTraLoi: MA_AGENT_SO as BenDuocHoi,
    congCu: kenhTrang(duongDan),
    thamSo: {},
    lyDoGoi: `mở ${duongDan}`,
    duong: "tay",
    duAn: o.duAn,
    nguoi: o.nguoi,
  };
  const tomTat = (): string => {
    const tong = Array.from(dem.values()).reduce((s, x) => s + x, 0);
    const theoBen = Array.from(dem.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([ben, so]) => `${ben}×${so}`)
      .join(" · ");
    return `Mở ${duongDan}: ${tong.toLocaleString("vi-VN")} lượt hỏi ra ngoài — ${theoBen}`;
  };
  let kq: T;
  try {
    kq = await chayTrongChuoi(luot.maChuoi, fn, { demLuot: dem });
  } catch (err) {
    if (dem.size > 0) ghiLuotV2("goi", nen, luot, bd, { loiNem: err }, { loaiLuot: "goc" });
    throw err;
  }
  if (dem.size > 0) ghiLuotV2("goi", nen, luot, bd, { traVe: tomTat() }, { loaiLuot: "goc" });
  return kq;
}

/**
 * Bọc một handler route (GET/POST) vào chuỗi mở trang — `export const GET =
 * bocRouteTrang("/api/…", xuLyGet)`. Mọi lượt của một lần gọi chung một mã chuỗi.
 */
export function bocRouteTrang<A extends unknown[], R>(
  duongDan: string,
  fn: (...a: A) => Promise<R>,
): (...a: A) => Promise<R> {
  return (...a: A) => chayTrangChuoi(duongDan, () => fn(...a));
}

/**
 * ⭐ Mr. Đại chốt 12/09/2026: sổ phải nói được BÊN KIA NHẬN ĐƯỢC GÌ, gọn một dòng.
 * Dùng cho cả lượt ĐI HỎI lẫn lượt CỔNG MCP trả lời agent khác.
 * Không rút được thì nói thẳng, KHÔNG bịa.
 */
export function traLoiGonTuKhuon(kq: {
  ok: boolean;
  du_lieu?: unknown;
  nguon?: { file_goc?: string; ma?: string }[];
  ma_loi?: string;
  thong_diep?: string;
}): string {
  if (!kq.ok) return `khong-co · ${kq.ma_loi ?? "?"} · ${kq.thong_diep ?? ""}`.slice(0, 200);
  const phan: string[] = [];
  const d = kq.du_lieu;
  if (Array.isArray(d)) {
    phan.push(`${d.length} bản ghi`);
  } else if (d && typeof d === "object") {
    for (const [k, v] of Object.entries(d as Record<string, unknown>)) {
      if (phan.length >= 5) break;
      if (typeof v === "number" || typeof v === "boolean") phan.push(`${k}=${v}`);
      else if (typeof v === "string" && v.length <= 48) phan.push(`${k}=${v}`);
      else if (Array.isArray(v)) phan.push(`${k}: ${v.length} dòng`);
    }
  }
  phan.push(`${JSON.stringify(d ?? {}).length.toLocaleString("vi-VN")} ký tự`);
  return phan.join(" · ").slice(0, 200);
}
