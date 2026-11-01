// ============================================================
// client.ts — GỌI API BASE.VN (5 ứng dụng)
// Kiểu dùng chung: src/lib/integrations/base/types.ts
//
// ĐÃ KIỂM CHỨNG BẰNG API THẬT (14/08/2026):
//   • Mọi endpoint đều POST, body `application/x-www-form-urlencoded`
//   • Tên trường token LUÔN là `access_token_v2` (không phải access_token)
//   • Mỗi khoá chỉ mở ĐÚNG MỘT ứng dụng → khoá sai app trả
//     message "access_token_v2_invalid_3"
//   • project/list: page ĐẾM TỪ 0, items_per_page ≤ 100, PHẢI gửi
//     include_private=1 (không gửi thì Base giấu 2/3 dự án: 78 vs 273)
//   • Ngày Base là chuỗi dd/mm/YYYY, HOẶC unix giây dạng CHUỖI ("1784739600")
//
// 24/09/2026 (Mr. Đại chốt — Main chỉ ánh xạ): bỏ phần tải cấu trúc 1 dự án
// (layCauTrucDuAn + chuẩn hoá công việc cho mapper) — chỉ cổng giả
// /api/mcp/base dùng. Việc/quy trình Base do Agent Base (3011) trả lời.
// File này chỉ còn: khoá · kiểm tra khoá · gọi Base (giao việc, danh bạ) ·
// liệt kê dự án Wework (ghim không gian).
//
// NGUYÊN TẮC: KHÔNG BAO GIỜ throw, KHÔNG BAO GIỜ log token.
// Thiếu khoá → trả thông báo tiếng Việt, hệ thống vẫn chạy bình thường.
// CHỈ chạy phía server (đọc appconfig bằng node:fs).
// ============================================================

import { getSetting, type AppConfigKey } from "@/lib/appconfig";
import { goiCoGhi } from "@/lib/nhat-ky/so";
import {
  BASE_APPS,
  type BaseApp,
  type BaseAppInfo,
  type BaseAppStatus,
  type BaseProjectBrief,
} from "./types";

/** Timeout mỗi lần gọi (25 giây theo hợp đồng) */
const CHO_TOI_DA_MS = 25000;
/** Tên trường token — Base v2 dùng chung cho CẢ 5 ứng dụng */
const TEN_TRUONG_TOKEN = "access_token_v2";
/** Chặn lặp vô hạn khi phân trang */
const SO_TRANG_TOI_DA = 20;
/** project/list: tối đa 100 bản ghi/trang */
const SO_DU_AN_MOI_TRANG = 100;
/** Dự án tên bắt đầu bằng chuỗi này là hộp việc cá nhân, KHÔNG phải dự án */
const TIEN_TO_VIEC_CA_NHAN = "công việc của ";

/** Tên biến môi trường fallback cho 5 khoá Base (trùng ENV_NAMES của /api/settings) */
export const BASE_ENV_NAMES: Record<string, string> = {
  baseTokenWework: "BASE_TOKEN_WEWORK",
  baseTokenWorkflow: "BASE_TOKEN_WORKFLOW",
  baseTokenRequest: "BASE_TOKEN_REQUEST",
  baseTokenHrm: "BASE_TOKEN_HRM",
  baseTokenAccount: "BASE_TOKEN_ACCOUNT",
};

/** Kết quả 1 lần gọi API Base — KHÔNG throw, mọi lỗi nằm ở `message` */
export interface BaseCallResult {
  ok: boolean;
  data?: Record<string, unknown>;
  /** Thông báo tiếng Việt cho người dùng (không bao giờ chứa token) */
  message?: string;
  /** Mã lỗi THÔ do Base trả về (vd "access_token_v2_invalid_3") — dùng để phân loại */
  maLoi?: string;
}

// ============================================================
// TIỆN ÍCH CHUNG
// ============================================================

type Doi = Record<string, unknown>;

function laDoi(v: unknown): v is Doi {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** Che khoá, chỉ để lộ 4 ký tự cuối (dùng cho màn Cài đặt) */
export function cheKhoa(khoa: string): string {
  const t = khoa.replace(/\s+/g, "");
  if (t === "") return "";
  if (t.length <= 4) return "••••";
  return `••••${t.slice(-4)}`;
}

/** Lấy giá trị theo đường dẫn "a.b.0.c" trong object lồng nhau */
function docSau(obj: unknown, duongDan: string): unknown {
  let cur: unknown = obj;
  const doan = duongDan.split(".");
  for (let i = 0; i < doan.length; i += 1) {
    if (cur === null || cur === undefined) return undefined;
    const k = doan[i];
    if (Array.isArray(cur)) {
      if (!/^\d+$/.test(k)) return undefined;
      cur = cur[Number(k)];
    } else if (laDoi(cur)) {
      cur = cur[k];
    } else {
      return undefined;
    }
  }
  return cur;
}

/** Dò giá trị đầu tiên khác rỗng trong danh sách tên trường khả dĩ */
function doTruong(obj: unknown, tenTruong: string[]): unknown {
  for (let i = 0; i < tenTruong.length; i += 1) {
    const v = docSau(obj, tenTruong[i]);
    if (v === null || v === undefined) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    return v;
  }
  return undefined;
}

/** Ép về chuỗi gọn; object thì thử lấy name/title/username/id */
function veChuoi(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "string") return v.trim() || undefined;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return veChuoi(v[0]);
  if (laDoi(v)) {
    const ten = doTruong(v, [
      "name",
      "title",
      "full_name",
      "fullname",
      "display_name",
      "username",
      "email",
      "id",
    ]);
    return ten === undefined ? undefined : veChuoi(ten);
  }
  return undefined;
}

/** Tìm mảng bản ghi trong gói dữ liệu trả về (dò nhiều tên bao ngoài) */
function layMang(goi: unknown, uuTien: string[]): unknown[] {
  if (Array.isArray(goi)) return goi;
  if (!laDoi(goi)) return [];
  const ten = uuTien.concat(["data", "items", "results", "result", "list", "records", "rows"]);
  for (let i = 0; i < ten.length; i += 1) {
    const v = docSau(goi, ten[i]);
    if (Array.isArray(v)) return v;
  }
  return [];
}

function nghi(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function laLoiMang(err: unknown): boolean {
  const e = err as { name?: string; message?: string } | null;
  const m = String(e?.message ?? err ?? "");
  return (
    e?.name === "AbortError" ||
    /fetch failed|ENOTFOUND|EAI_AGAIN|ECONNRESET|ECONNREFUSED|socket hang up|EPIPE|ETIMEDOUT|network|aborted/i.test(
      m
    )
  );
}

function moTaLoi(err: unknown): string {
  const e = err as { name?: string; message?: string } | null;
  const m = String(e?.message ?? err ?? "");
  if (e?.name === "AbortError" || /aborted|timeout/i.test(m)) {
    return `quá thời gian chờ ${CHO_TOI_DA_MS / 1000} giây`;
  }
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(m)) return "không phân giải được tên miền (kiểm tra mạng)";
  if (/ECONNREFUSED/i.test(m)) return "máy chủ từ chối kết nối";
  if (/ECONNRESET|EPIPE|socket hang up/i.test(m)) return "kết nối bị ngắt giữa chừng";
  if (/certificate|SSL|TLS/i.test(m)) return "lỗi chứng thư bảo mật (SSL)";
  if (/fetch failed/i.test(m)) return "không kết nối được tới máy chủ Base";
  return m || "lỗi không rõ";
}

// ============================================================
// KHOÁ & CẤU HÌNH
// ============================================================

/** Thông tin 1 ứng dụng theo mã app */
export function thongTinApp(app: BaseApp): BaseAppInfo | undefined {
  for (let i = 0; i < BASE_APPS.length; i += 1) {
    if (BASE_APPS[i].app === app) return BASE_APPS[i];
  }
  return undefined;
}

/** Đọc khoá của 1 ứng dụng: settings.json ưu tiên → env. Chưa có → "" */
export function layKhoa(app: BaseApp): string {
  const info = thongTinApp(app);
  if (!info) return "";
  const env = BASE_ENV_NAMES[info.configKey] ?? "";
  const v = getSetting(info.configKey as AppConfigKey, env);
  return v ? v.trim() : "";
}

/** Đã nhập khoá cho ứng dụng này chưa */
export function coKhoa(app: BaseApp): boolean {
  return layKhoa(app) !== "";
}

// ============================================================
// GỌI API (POST + form-urlencoded, timeout 25s, thử lại 1 lần khi lỗi mạng)
// ============================================================

type LanGoi =
  | { kieu: "xong"; ketQua: BaseCallResult }
  | { kieu: "loi"; thuLai: boolean; message: string };

/** Đọc thông báo lỗi thô Base trả về trong gói JSON */
function tinLoiTrongGoi(goi: unknown): string {
  if (!laDoi(goi)) return "";
  const t = goi.message ?? goi.msg ?? goi.error ?? goi.error_message;
  if (t === null || t === undefined || t === "") return "";
  return typeof t === "string" ? t : JSON.stringify(t);
}

async function goiMotLan(url: string, bodyStr: string): Promise<LanGoi> {
  const dieuKhien = new AbortController();
  const dongHo = setTimeout(() => dieuKhien.abort(), CHO_TOI_DA_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
        Accept: "application/json",
      },
      body: bodyStr,
      signal: dieuKhien.signal,
      redirect: "follow",
      cache: "no-store",
    });
    const chu = await res.text();
    let goi: unknown = null;
    try {
      goi = chu ? JSON.parse(chu) : null;
    } catch {
      goi = null;
    }
    const tinLoi = tinLoiTrongGoi(goi);

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return {
          kieu: "xong",
          ketQua: {
            ok: false,
            maLoi: tinLoi,
            message:
              "Base từ chối khoá (mã " +
              res.status +
              ") — kiểm tra khoá còn hạn và đúng ứng dụng chưa.",
          },
        };
      }
      if (res.status === 404) {
        return {
          kieu: "xong",
          ketQua: { ok: false, maLoi: tinLoi, message: "Không tìm thấy đường dẫn API của Base (mã 404)." },
        };
      }
      if (res.status === 429) {
        return {
          kieu: "xong",
          ketQua: { ok: false, maLoi: tinLoi, message: "Base báo gọi quá nhiều (mã 429) — chờ một lát rồi thử lại." },
        };
      }
      return {
        kieu: "xong",
        ketQua: {
          ok: false,
          maLoi: tinLoi,
          message: `Máy chủ Base trả lỗi ${res.status}${tinLoi ? ": " + tinLoi : ""}.`,
        },
      };
    }

    if (goi === null) {
      return {
        kieu: "xong",
        ketQua: {
          ok: false,
          message: "Máy chủ Base trả về dữ liệu không phải JSON — thử lại sau ít phút.",
        },
      };
    }

    // Base trả { code: 1, ... } khi thành công, { code: 0, message } khi lỗi
    const ma = laDoi(goi) ? (goi.code ?? goi.status ?? goi.success) : undefined;
    const coLoi = ma === 0 || ma === "0" || ma === false || ma === "error" || ma === "fail";
    if (coLoi) {
      return {
        kieu: "xong",
        ketQua: {
          ok: false,
          maLoi: tinLoi,
          message: `Base báo lỗi: ${tinLoi || "không rõ nguyên nhân"}.`,
        },
      };
    }

    return { kieu: "xong", ketQua: { ok: true, data: laDoi(goi) ? goi : { data: goi } } };
  } catch (err) {
    return { kieu: "loi", thuLai: laLoiMang(err), message: moTaLoi(err) };
  } finally {
    clearTimeout(dongHo);
  }
}

/**
 * Gọi 1 endpoint của Base.
 * POST form-urlencoded, token lấy từ appconfig theo BASE_APPS[].configKey và
 * LUÔN gửi ở trường `access_token_v2`. Timeout 25s, thử lại đúng 1 lần khi lỗi mạng.
 * KHÔNG throw, KHÔNG log token.
 */
export async function goiBase(
  app: BaseApp,
  path: string,
  fields: Record<string, string | number | boolean | undefined> = {},
  /** Vì sao gọi — ghi vào `core.nhat_ky_hoi_agent`; không có thì không ghi vết */
  lyDoGoi?: string
): Promise<BaseCallResult> {
  // Không lý do thì không ghi vết (lời gọi nội bộ của chính client)
  if (!lyDoGoi) return goiBaseTho(app, path, fields);
  // ⭐ Khuôn sổ bản 2 (26/09): ghi qua `goiCoGhi` — ketQua/maLoi/dấu vân/nội dung trả
  // lời do khuôn tự quyết; Base.vn ở ngoài hệ (không có sổ) nên sổ BÊN GỌI ghi nội
  // dung trả lời; nguồn dẫn = `Base.vn/<đường gọi>`. `goiBaseTho` không bao giờ throw.
  return goiCoGhi(
    {
      agentHoi: "main",
      // Bên được hỏi là API Base.vn TRỰC TIẾP = "basevn", khác Agent Base ("base")
      agentTraLoi: "basevn",
      congCu: `base.${app}${path.startsWith("/") ? path : "/" + path}`,
      thamSo: fields as Record<string, unknown>,
      lyDoGoi,
      duong: "tay",
    },
    () => goiBaseTho(app, path, fields),
    (kq) => ({ traVe: khuonSoCuaBase(kq) }),
  );
}

/** Kết quả Base.vn → khuôn trả lời mục 3 để sổ xét ok/lỗi (khoá bị từ chối = KHONG_CO_QUYEN) */
function khuonSoCuaBase(kq: BaseCallResult): unknown {
  if (kq.ok) return { ok: true, du_lieu: kq.data ?? null };
  const thongDiep = kq.message ?? "Base.vn trả lỗi không rõ";
  return { ok: false, ma_loi: /khoá|khóa/i.test(thongDiep) ? "KHONG_CO_QUYEN" : "LOI_NOI_BO", thong_diep: thongDiep };
}

async function goiBaseTho(
  app: BaseApp,
  path: string,
  fields: Record<string, string | number | boolean | undefined> = {}
): Promise<BaseCallResult> {
  const info = thongTinApp(app);
  if (!info) {
    return { ok: false, message: `Ứng dụng Base "${app}" không được hỗ trợ.` };
  }
  const token = layKhoa(app);
  if (!token) {
    return {
      ok: false,
      message: `Chưa nhập khoá ${info.label} — vào Cài đặt → Kết nối Base.vn.`,
    };
  }

  const goc = info.apiUrl.replace(/\/+$/, "");
  const url = /^https?:\/\//i.test(path) ? path : goc + (path.startsWith("/") ? path : "/" + path);

  const body = new URLSearchParams();
  Object.keys(fields).forEach((k) => {
    const v = fields[k];
    if (v === undefined || v === null || v === "") return;
    body.set(k, String(v));
  });
  body.set(TEN_TRUONG_TOKEN, token); // token LUÔN nằm trong body, không bao giờ ghi log

  const bodyStr = body.toString();
  let loiCuoi = "";
  for (let lan = 0; lan < 2; lan += 1) {
    const kq = await goiMotLan(url, bodyStr);
    if (kq.kieu === "xong") return kq.ketQua;
    loiCuoi = kq.message;
    if (lan === 0 && kq.thuLai) {
      await nghi(800); // lỗi mạng → nghỉ ngắn rồi thử lại đúng 1 lần
      continue;
    }
    break;
  }
  return { ok: false, message: `Không gọi được API Base: ${loiCuoi} (đã thử lại 1 lần).` };
}

// ============================================================
// 1. KIỂM TRA 5 ỨNG DỤNG (màn Cài đặt)
// ============================================================

/** Đếm bản ghi đọc thử được theo countField của từng ứng dụng */
function demBanGhi(data: unknown, countField: string): number {
  const truc = docSau(data, countField);
  if (Array.isArray(truc)) return truc.length;
  const mang = layMang(data, [countField]);
  return mang.length;
}

/** Khoá sai ứng dụng — Base trả message "access_token_v2_invalid_3" */
function laKhoaSaiApp(maLoi: string | undefined): boolean {
  return /access_token(_v2)?_invalid/i.test(maLoi ?? "");
}

async function kiemTraMot(info: BaseAppInfo): Promise<BaseAppStatus> {
  const token = layKhoa(info.app);
  if (!token) {
    return {
      app: info.app,
      label: info.label,
      moTa: info.moTa,
      daCauHinh: false,
      khoaMask: "",
      ok: false,
      soBanGhi: 0,
      thongBao: "Chưa nhập khoá — vào Cài đặt → Kết nối Base.vn",
    };
  }

  const khoaMask = cheKhoa(token);
  const kq = await goiBase(info.app, info.testPath, info.testFields,
    `Cài đặt: kiểm tra khoá ứng dụng ${info.label} còn dùng được không`);

  if (!kq.ok) {
    const thongBao = laKhoaSaiApp(kq.maLoi)
      ? `Khoá không thuộc ứng dụng này — tạo khoá riêng cho ${info.label} trong Base Account.`
      : kq.message ?? "Không gọi được Base.";
    return {
      app: info.app,
      label: info.label,
      moTa: info.moTa,
      daCauHinh: true,
      khoaMask,
      ok: false,
      soBanGhi: 0,
      thongBao,
    };
  }

  const soBanGhi = demBanGhi(kq.data, info.countField);
  return {
    app: info.app,
    label: info.label,
    moTa: info.moTa,
    daCauHinh: true,
    khoaMask,
    ok: true,
    soBanGhi,
    thongBao:
      soBanGhi > 0
        ? `Kết nối tốt — đọc thử được ${soBanGhi} bản ghi.`
        : "Kết nối tốt nhưng chưa có dữ liệu — công ty chưa dùng ứng dụng này.",
  };
}

/** Kiểm tra cả 5 ứng dụng Base. KHÔNG throw — app nào chưa có khoá thì báo "chưa cấu hình". */
export async function kiemTraTatCa(): Promise<BaseAppStatus[]> {
  return Promise.all(BASE_APPS.map((info) => kiemTraMot(info)));
}

// ============================================================
// 2. DANH SÁCH DỰ ÁN WEWORK
// ============================================================

/** Base còn trang tiếp theo không (cờ is_remain) */
function conTrangSau(data: unknown, soBanGhiTrang: number, kichThuoc: number): boolean {
  const r = docSau(data, "is_remain");
  if (r === true || r === 1 || r === "1" || r === "true") return true;
  if (r === false || r === 0 || r === "0" || r === "false") return false;
  // Base không trả cờ → suy từ số bản ghi của trang
  return soBanGhiTrang >= kichThuoc;
}

/** Dự án là "hộp việc cá nhân" (tên bắt đầu "Công việc của ") → bỏ khỏi danh sách */
function laViecCaNhan(name: string): boolean {
  return name.trim().toLowerCase().indexOf(TIEN_TO_VIEC_CA_NHAN) === 0;
}

/**
 * Danh sách dự án Wework.
 * page ĐẾM TỪ 0, items_per_page=100, LUÔN gửi include_private=1
 * (không gửi thì Base giấu mất 2/3 dự án), lặp tới khi is_remain=false,
 * tối đa 20 trang để chặn lặp vô hạn.
 */
export async function layDanhSachDuAn(): Promise<{
  ok: boolean;
  projects: BaseProjectBrief[];
  message?: string;
}> {
  const projects: BaseProjectBrief[] = [];
  const daThay: Record<string, boolean> = {};

  for (let trang = 0; trang < SO_TRANG_TOI_DA; trang += 1) {
    const kq = await goiBase("wework", "/project/list", {
      page: trang,
      items_per_page: SO_DU_AN_MOI_TRANG,
      include_private: 1, // BẮT BUỘC — thiếu cờ này Base giấu dự án riêng tư
    }, "Lập tiến độ: liệt kê dự án trên Base để người chọn dự án cần nạp cấu trúc");
    if (!kq.ok) {
      if (projects.length > 0) {
        // Đã lấy được vài trang → dùng tạm, không làm hỏng cả luồng
        return { ok: true, projects, message: kq.message };
      }
      return { ok: false, projects: [], message: kq.message };
    }

    const mang = layMang(kq.data, ["projects", "project"]);
    if (mang.length === 0) break;

    let soMoi = 0;
    mang.forEach((tho, i) => {
      const id = veChuoi(doTruong(tho, ["id", "_id", "code"])) ?? "";
      const khoa = id !== "" ? id : `vt-${trang}-${i}`;
      if (daThay[khoa]) return;
      daThay[khoa] = true;
      soMoi += 1;

      const name = veChuoi(doTruong(tho, ["name", "title"])) ?? "";
      if (id === "" || name === "") return;
      if (laViecCaNhan(name)) return; // hộp việc cá nhân, không phải dự án

      const brief: BaseProjectBrief = { id, name };
      const soViec = doTruong(tho, [
        "total_task",
        "task_count",
        "total_tasks",
        "tasks_count",
        "count_task",
        "stat.task",
        "stats.task",
      ]);
      const n = Number(veChuoi(soViec));
      if (Number.isFinite(n) && n >= 0 && veChuoi(soViec) !== undefined) brief.soViec = n;
      const rt = doTruong(tho, ["private", "is_private", "privacy", "is_public"]);
      if (rt === true || rt === 1 || rt === "1") brief.riengTu = true;
      projects.push(brief);
    });

    if (soMoi === 0) break; // API bỏ qua tham số page, trả lặp lại 1 trang
    if (!conTrangSau(kq.data, mang.length, SO_DU_AN_MOI_TRANG)) break;
  }

  return { ok: true, projects };
}
