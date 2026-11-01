// ============================================================
// luat/kho-luat.ts — LƯU LUẬT (CSDL, phiên bản, lịch sử, quyền). Chủ: agent luat-loi.
// Bảng: db/36-luat.sql. Quyền sửa: như nhóm cài đặt 'luat_kiem_tra' (duocSuaNhom) hoặc quản trị.
// Luật hệ thống (9 luật gốc): chỉ đổi bật/tắt, mức, áp dụng cho mẫu nào — không xóa. Hai chiều với cấu hình
// `luat_kiem_tra` (trang Cài đặt cũ): sửa ở đây thì ghi sang cấu hình; cấu hình đổi thì dongBoTuCauHinh kéo về.
// ============================================================
import type { Q } from "@/lib/db";
import type { DinhNghiaMau, NguoiDungPhien } from "@/lib/types";
import { LoiHttp } from "@/lib/phien";
import { taoMa } from "@/lib/ma";
import { ghiLichSu } from "@/lib/lich-su/ghi";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { duocSuaNhom } from "@/lib/cau-hinh/quyen";
import { ghiCauHinh, soSanhCauHinh } from "@/lib/cau-hinh/ghi";
import type { CauHinh } from "@/lib/cau-hinh/mac-dinh";
import { khongDau } from "@/lib/kiem-tra/chuan-hoa";
import { LOAI_LUAT, kiemThamSo } from "./loai-luat";
import type { CachKiem, LuatKiemTra, LuatNhap, MucLuat } from "./types";
import type { DinhNghiaMauRutGon } from "./types-them";

/** Lỗi luật chưa hợp lệ: 400 kèm danh sách lỗi (API trả { loi, danh_sach_loi }). */
export class LoiLuatKhongHopLe extends LoiHttp {
  constructor(public danhSach: string[]) {
    super(400, `Luật chưa hợp lệ: ${danhSach.join("; ")}`);
  }
}

/** Bằng chứng: luật (và phiên bản) đã dùng khi kiểm một báo cáo — lưu trong ket_qua_kiem_tra. */
export interface LuatDaDung {
  id: string;
  ma: string;
  phien_ban: number;
  cach_kiem: CachKiem;
  muc: MucLuat;
}

const CACH_KIEM: CachKiem[] = ["code", "ai", "ca_hai"];
const MUC: MucLuat[] = ["chan", "canh_bao", "goi_y"];
/** Khóa trong docflow.luat_danh_dau */
export const DAU_MOC_CAU_HINH = "moc_cau_hinh_luat_kiem_tra";
export const DAU_LUAT_MAU = "luat_mau_da_gieo";

// ---------------- Đọc ----------------

type Hang = Record<string, unknown>;

const iso = (d: unknown) => (d ? new Date(d as string).toISOString() : "");

function docJson<T>(v: unknown): T {
  if (typeof v !== "string") return v as T;
  try {
    return JSON.parse(v) as T;
  } catch {
    return v as T;
  }
}

function thanhLuat(r: Hang): LuatKiemTra {
  const ap = docJson<string[] | "tat_ca">(r.ap_dung);
  return {
    id: String(r.id),
    ma: String(r.ma),
    ten: String(r.ten),
    cau_luat: String(r.cau_luat ?? ""),
    mo_ta: (r.mo_ta as string | null) ?? null,
    he_thong: !!r.he_thong,
    cach_kiem: r.cach_kiem as CachKiem,
    loai: (r.loai as string | null) ?? null,
    tham_so: r.tham_so == null ? null : docJson<Record<string, unknown>>(r.tham_so),
    huong_dan_ai: (r.huong_dan_ai as string | null) ?? null,
    ap_dung: ap === "tat_ca" || !Array.isArray(ap) ? "tat_ca" : ap.map(String),
    muc: r.muc as MucLuat,
    khi_ai_loi: r.khi_ai_loi === "chan" ? "chan" : "cho_gui",
    bat: !!r.bat,
    nhom: (r.nhom as string | null) ?? null,
    thu_tu: Number(r.thu_tu ?? 0),
    phien_ban: Number(r.phien_ban ?? 1),
    tao_boi: (r.tao_boi as string | null) ?? null,
    tao_luc: iso(r.tao_luc),
    sua_boi: (r.sua_boi as string | null) ?? null,
    sua_luc: iso(r.sua_luc),
    da_xoa: !!r.da_xoa,
  };
}

/** Luật có áp dụng cho mẫu này không (null = tài liệu không theo mẫu: chỉ luật 'tat_ca'). */
export function apDungMau(l: Pick<LuatKiemTra, "ap_dung">, mauMa: string | null): boolean {
  if (l.ap_dung === "tat_ca") return true;
  return !!mauMa && l.ap_dung.includes(mauMa);
}

const THU_TU_SQL = "ORDER BY he_thong DESC, thu_tu, tao_luc, id";

export async function danhSachLuat(q: Q, loc: { mau_ma?: string; ca_da_xoa?: boolean } = {}): Promise<LuatKiemTra[]> {
  await dongBoTuCauHinh(q);
  const { rows } = await q.query<Hang>(
    `SELECT * FROM docflow.luat_kiem_tra ${loc.ca_da_xoa ? "" : "WHERE NOT da_xoa"} ${THU_TU_SQL}`,
  );
  const ds = rows.map(thanhLuat);
  return loc.mau_ma ? ds.filter((l) => apDungMau(l, loc.mau_ma!)) : ds;
}

export async function layLuat(q: Q, id: string): Promise<LuatKiemTra | null> {
  const { rows } = await q.query<Hang>("SELECT * FROM docflow.luat_kiem_tra WHERE id = $1", [id]);
  return rows[0] ? thanhLuat(rows[0]) : null;
}

/** Luật đang bật áp dụng cho một mẫu (kể cả luật hệ thống), theo thu_tu. */
export async function luatApDung(q: Q, mauMa: string | null): Promise<LuatKiemTra[]> {
  return (await danhSachLuat(q)).filter((l) => l.bat && apDungMau(l, mauMa)).sort((a, b) => a.thu_tu - b.thu_tu);
}

export async function phienBanLuat(q: Q, id: string): Promise<{ phien_ban: number; gia_tri: LuatKiemTra; boi: string | null; luc: string }[]> {
  const { rows } = await q.query<{ phien_ban: number; gia_tri: unknown; boi: string | null; luc: string | Date; ghi_chu: string | null }>(
    "SELECT phien_ban, gia_tri, boi, luc, ghi_chu FROM docflow.luat_kiem_tra_phien_ban WHERE luat_id = $1 ORDER BY phien_ban DESC",
    [id],
  );
  return rows.map((r) => ({
    phien_ban: Number(r.phien_ban),
    gia_tri: docJson<LuatKiemTra>(r.gia_tri),
    boi: r.boi,
    luc: iso(r.luc),
    ...(r.ghi_chu ? { ghi_chu: r.ghi_chu } : {}),
  }));
}

export async function duocSuaLuat(q: Q, nd: NguoiDungPhien): Promise<boolean> {
  if (nd.la_quan_tri) return true;
  return duocSuaNhom(nd, "luat_kiem_tra", await layCauHinh(q, "phan_quyen_cau_hinh"));
}

// ---------------- Định nghĩa mẫu rút gọn (cho kiểm tham số + giao diện chọn ô/bảng/cột) ----------------

type DinhNghiaCoBang = DinhNghiaMau & { bang?: { tag: string; nhan: string; cot?: { tag: string; nhan: string }[] }[] };

export function rutGonDinhNghia(ma: string, ten: string, dnTho: unknown): DinhNghiaMauRutGon {
  const dn = (docJson<DinhNghiaCoBang>(dnTho) ?? {}) as Partial<DinhNghiaCoBang>;
  const bang: DinhNghiaMauRutGon["bang"] = (dn.bang ?? []).map((b) => ({
    tag: b.tag,
    nhan: b.nhan,
    cot: (b.cot ?? []).map((c) => ({ tag: c.tag, nhan: c.nhan })),
  }));
  for (const b of dn.bang_cong_viec ?? []) if (!bang.some((x) => x.tag === b.tag)) bang.push({ tag: b.tag, nhan: b.nhan, cot: [] });
  return {
    ma,
    ten,
    o_nhap: (dn.o_nhap ?? []).map((o) => ({ tag: o.tag, nhan: o.nhan, ...(o.kieu ? { kieu: o.kieu } : {}) })),
    bang,
    muc_bat_buoc: dn.muc_bat_buoc ?? [],
  };
}

/** Định nghĩa rút gọn của mọi mẫu (đang dùng lẫn ngừng dùng), theo số form. */
export async function dinhNghiaCacMau(q: Q): Promise<DinhNghiaMauRutGon[]> {
  const { rows } = await q.query<{ ma: string; ten: string; dinh_nghia: unknown }>("SELECT ma, ten, dinh_nghia FROM docflow.mau_word");
  const so = (ma: string) => Number(/(\d+)$/.exec(ma)?.[1] ?? 9999);
  return rows.map((r) => rutGonDinhNghia(r.ma, r.ten, r.dinh_nghia)).sort((a, b) => so(a.ma) - so(b.ma) || a.ma.localeCompare(b.ma));
}

// ---------------- Mẫu đổi cấu trúc → luật trỏ vào bảng/cột/ô đã bỏ (Khai báo mẫu, MD mục 6 — 01/10/2026) ----------------

export interface LuatHong {
  id: string;
  ma: string;
  ten: string;
  ly_do: string;
  /** luật áp cho cả mẫu khác → chỉ gỡ mẫu này khỏi "Áp dụng"; chỉ áp mẫu này → tắt hẳn */
  chi_mau_nay: boolean;
}

/** Luật code (đang bật, áp riêng các mẫu có tên) của mẫu `ma` mà định nghĩa MỚI không còn bảng / cột / ô nó trỏ tới. */
export async function luatHongVoiDinhNghia(q: Q, ma: string, ten: string, dnMoi: unknown): Promise<LuatHong[]> {
  const rg = rutGonDinhNghia(ma, ten, dnMoi);
  const ds = await danhSachLuat(q);
  const ra: LuatHong[] = [];
  for (const l of ds) {
    if (l.he_thong || !l.bat || l.cach_kiem === "ai" || !l.loai || !LOAI_LUAT[l.loai] || !Array.isArray(l.ap_dung) || !l.ap_dung.includes(ma)) continue;
    let loi: string[];
    try {
      loi = kiemThamSo(l.loai, l.tham_so ?? {}, rg);
    } catch (e) {
      loi = [e instanceof Error ? e.message : String(e)];
    }
    if (loi.length) ra.push({ id: l.id, ma: l.ma, ten: l.ten, ly_do: loi[0], chi_mau_nay: l.ap_dung.length === 1 });
  }
  return ra;
}

/** Tắt / gỡ mẫu khỏi các luật hỏng (ghi phiên bản luật, ai bấm lưu mẫu thì đứng tên). */
export async function tatLuatChoMau(q: Q, nd: NguoiDungPhien, ma: string, ds: LuatHong[]): Promise<void> {
  for (const h of ds) {
    const { rows } = await q.query<Hang>(
      `UPDATE docflow.luat_kiem_tra
          SET ap_dung = CASE WHEN jsonb_array_length(ap_dung) > 1 THEN ap_dung - $2 ELSE ap_dung END,
              bat = CASE WHEN jsonb_array_length(ap_dung) > 1 THEN bat ELSE false END,
              phien_ban = phien_ban + 1, sua_boi = $3, sua_luc = now()
        WHERE id = $1 AND NOT da_xoa RETURNING *`,
      [h.id, ma, nd.id],
    );
    if (rows[0]) await ghiBanLuu(q, thanhLuat(rows[0]), nd.id, `Tự ${h.chi_mau_nay ? "tắt" : `gỡ mẫu ${ma} khỏi`}: mẫu ${ma} bỏ ${h.ly_do}`);
  }
}

// ---------------- Đánh dấu (mốc đồng bộ, luật mẫu đã gieo) ----------------

export async function docDanhDau<T>(q: Q, khoa: string): Promise<T | null> {
  const { rows } = await q.query<{ gia_tri: unknown }>("SELECT gia_tri FROM docflow.luat_danh_dau WHERE khoa = $1", [khoa]);
  return rows[0] ? docJson<T>(rows[0].gia_tri) : null;
}

export async function ghiDanhDau(q: Q, khoa: string, giaTri: unknown): Promise<void> {
  await q.query(
    `INSERT INTO docflow.luat_danh_dau (khoa, gia_tri, luc) VALUES ($1, $2::jsonb, now())
     ON CONFLICT (khoa) DO UPDATE SET gia_tri = EXCLUDED.gia_tri, luc = now()`,
    [khoa, JSON.stringify(giaTri)],
  );
}

// ---------------- Đồng bộ với cấu hình luat_kiem_tra ----------------

type LuatCauHinh = CauHinh["luat_kiem_tra"]["luat"][number];
type MocLuat = Pick<LuatCauHinh, "ma" | "bat" | "muc" | "ap_dung">;

export function trichMoc(ds: LuatCauHinh[]): MocLuat[] {
  return ds.map((l) => ({ ma: l.ma, bat: l.bat, muc: l.muc, ap_dung: l.ap_dung }));
}

const giongMoc = (a: MocLuat, b: MocLuat) => a.bat === b.bat && a.muc === b.muc && JSON.stringify(a.ap_dung) === JSON.stringify(b.ap_dung);

async function ghiBanLuu(q: Q, l: LuatKiemTra, boi: string | null, ghiChu?: string | null): Promise<void> {
  await q.query(
    `INSERT INTO docflow.luat_kiem_tra_phien_ban (luat_id, phien_ban, gia_tri, boi, ghi_chu) VALUES ($1, $2, $3::jsonb, $4, $5)
     ON CONFLICT (luat_id, phien_ban) DO NOTHING`,
    [l.id, l.phien_ban, JSON.stringify(l), boi, ghiChu ?? null],
  );
}

/**
 * Cấu hình `luat_kiem_tra` (trang Cài đặt) đổi từ lần đồng bộ trước → luật hệ thống nào đổi trong cấu hình thì
 * cập nhật bảng (so từng luật với mốc, không đè luật chỉ sửa ở màn Luật). Gọi trước mỗi lần đọc luật.
 */
export async function dongBoTuCauHinh(q: Q): Promise<void> {
  const ch = await layCauHinh(q, "luat_kiem_tra");
  const hien = trichMoc(ch.luat);
  const moc = await docDanhDau<MocLuat[]>(q, DAU_MOC_CAU_HINH);
  if (moc && JSON.stringify(moc) === JSON.stringify(hien)) return;
  if (moc) {
    const { rows: nguoiSua } = await q.query<{ sua_boi: string | null }>("SELECT sua_boi FROM docflow.cau_hinh WHERE khoa = 'luat_kiem_tra'");
    const boi = nguoiSua[0]?.sua_boi ?? "he-thong";
    for (const l of hien) {
      const m = moc.find((x) => x.ma === l.ma);
      if (m && giongMoc(m, l)) continue;
      const { rows } = await q.query<Hang>(
        `UPDATE docflow.luat_kiem_tra SET bat = $2, muc = $3, ap_dung = $4::jsonb, phien_ban = phien_ban + 1, sua_boi = $5, sua_luc = now()
         WHERE ma = $1 AND he_thong AND NOT da_xoa
           AND (bat IS DISTINCT FROM $2 OR muc IS DISTINCT FROM $3 OR ap_dung IS DISTINCT FROM $4::jsonb)
         RETURNING *`,
        [l.ma, l.bat, l.muc, JSON.stringify(l.ap_dung), boi],
      );
      if (rows[0]) await ghiBanLuu(q, thanhLuat(rows[0]), boi, "đồng bộ từ Cài đặt");
    }
  }
  await ghiDanhDau(q, DAU_MOC_CAU_HINH, hien);
}

/** Luật hệ thống sửa ở màn Luật → ghi sang cấu hình luat_kiem_tra (trang Cài đặt, AI góp ý đọc cấu hình này). */
async function ghiSangCauHinh(q: Q, nd: NguoiDungPhien, l: LuatKiemTra): Promise<void> {
  const ch = await layCauHinh(q, "luat_kiem_tra");
  const moi: LuatCauHinh = { ma: l.ma, ten: l.ten, bat: l.bat, muc: l.muc, ap_dung: l.ap_dung };
  const luat = ch.luat.some((x) => x.ma === l.ma) ? ch.luat.map((x) => (x.ma === l.ma ? { ...x, bat: l.bat, muc: l.muc, ap_dung: l.ap_dung } : x)) : [...ch.luat, moi];
  await ghiCauHinh(q, nd, "luat_kiem_tra", { ...ch, luat });
  await ghiDanhDau(q, DAU_MOC_CAU_HINH, trichMoc(luat));
}

// ---------------- Kiểm hợp lệ ----------------

function taoMaTuTen(ten: string): string {
  const s = khongDau(ten)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return s || "luat";
}

async function maChuaDung(q: Q, goc: string, boQuaId: string | null): Promise<string> {
  const { rows } = await q.query<{ ma: string }>(
    "SELECT ma FROM docflow.luat_kiem_tra WHERE NOT da_xoa AND (ma = $1 OR ma LIKE $1 || '-%') AND id IS DISTINCT FROM $2",
    [goc, boQuaId],
  );
  const co = new Set(rows.map((r) => r.ma));
  if (!co.has(goc)) return goc;
  for (let i = 2; ; i++) if (!co.has(`${goc}-${i}`)) return `${goc}-${i}`;
}

/** Chuẩn hóa dữ liệu nhập thành luật (chưa kiểm hợp lệ). Luật hệ thống: chỉ nhận bat/muc/ap_dung. */
function chuanHoaNhap(v: LuatNhap, cu: LuatKiemTra | null, nd: NguoiDungPhien): LuatKiemTra {
  const apDung: LuatKiemTra["ap_dung"] =
    v.ap_dung === "tat_ca" || v.ap_dung === undefined || v.ap_dung === null
      ? "tat_ca"
      : Array.isArray(v.ap_dung)
        ? Array.from(new Set(v.ap_dung.map((x) => String(x).trim()).filter(Boolean)))
        : (v.ap_dung as never);
  const muc = (v.muc ?? cu?.muc ?? "canh_bao") as MucLuat;
  const bat = v.bat === undefined || v.bat === null ? (cu?.bat ?? true) : !!v.bat;
  const bayGio = new Date().toISOString();
  if (cu?.he_thong) return { ...cu, bat, muc, ap_dung: apDung, sua_boi: nd.id, sua_luc: bayGio };
  const cach = (v.cach_kiem ?? "code") as CachKiem;
  const coCode = cach === "code" || cach === "ca_hai";
  const coAi = cach === "ai" || cach === "ca_hai";
  const chu = (x: unknown) => (typeof x === "string" ? x.trim() : "");
  const ten = chu(v.ten);
  return {
    id: cu?.id ?? "",
    ma: chu(v.ma),
    ten,
    cau_luat: chu(v.cau_luat) || ten,
    mo_ta: chu(v.mo_ta) || null,
    he_thong: false,
    cach_kiem: cach,
    loai: coCode ? chu(v.loai) || null : null,
    tham_so: coCode ? ((v.tham_so && typeof v.tham_so === "object" ? v.tham_so : {}) as Record<string, unknown>) : null,
    huong_dan_ai: coAi ? chu(v.huong_dan_ai) || null : null,
    ap_dung: apDung,
    muc,
    khi_ai_loi: (v.khi_ai_loi ?? "cho_gui") as LuatKiemTra["khi_ai_loi"],
    bat,
    nhom: chu(v.nhom) || null,
    thu_tu: Number.isFinite(Number(v.thu_tu)) && v.thu_tu !== null && v.thu_tu !== undefined ? Number(v.thu_tu) : (cu?.thu_tu ?? -1),
    phien_ban: cu?.phien_ban ?? 0,
    tao_boi: cu?.tao_boi ?? nd.id,
    tao_luc: cu?.tao_luc ?? bayGio,
    sua_boi: nd.id,
    sua_luc: bayGio,
    da_xoa: false,
  };
}

/** Kiểm một luật (đã chuẩn hóa). Rỗng = hợp lệ. `nhap` là dữ liệu gốc (để biết người dùng có chọn khi_ai_loi không). */
export async function kiemLuat(q: Q, l: LuatKiemTra, nhap?: Partial<LuatNhap>): Promise<string[]> {
  const loi: string[] = [];
  if (!MUC.includes(l.muc)) loi.push(`Mức "${String(l.muc)}" không hợp lệ (chan, canh_bao, goi_y)`);
  if (l.ap_dung !== "tat_ca" && !Array.isArray(l.ap_dung)) loi.push(`"Áp dụng" phải là "tat_ca" hoặc danh sách mã mẫu`);
  const { rows: mauRows } = await q.query<{ ma: string; ten: string; dinh_nghia: unknown }>("SELECT ma, ten, dinh_nghia FROM docflow.mau_word");
  const mau = new Map(mauRows.map((r) => [r.ma, r]));
  if (Array.isArray(l.ap_dung)) {
    if (l.ap_dung.length === 0) loi.push("Chưa chọn mẫu áp dụng (hoặc chọn tất cả các mẫu)");
    for (const m of l.ap_dung) if (!mau.has(m)) loi.push(`Không có mẫu "${m}"`);
  }
  if (l.he_thong) return loi;

  if (!l.ten) loi.push("Chưa có tên luật");
  if (!/^[a-z0-9][a-z0-9_-]{0,79}$/.test(l.ma)) loi.push(`Mã luật "${l.ma}" chỉ gồm chữ thường không dấu, số, "-" hoặc "_"`);
  else {
    const { rows } = await q.query<{ ten: string }>("SELECT ten FROM docflow.luat_kiem_tra WHERE ma = $1 AND NOT da_xoa AND id IS DISTINCT FROM $2", [l.ma, l.id || null]);
    if (rows[0]) loi.push(`Mã luật "${l.ma}" đã có (luật "${rows[0].ten}")`);
  }
  if (!CACH_KIEM.includes(l.cach_kiem)) {
    loi.push(`Cách kiểm "${String(l.cach_kiem)}" không hợp lệ (code, ai, ca_hai)`);
    return loi;
  }
  const coCode = l.cach_kiem !== "ai";
  const coAi = l.cach_kiem !== "code";
  if (coCode) {
    if (!l.loai) loi.push("Luật chạy bằng code phải chọn dạng luật");
    else if (l.loai === "he_thong") loi.push(`Dạng "he_thong" chỉ dành cho luật hệ thống`);
    else if (!LOAI_LUAT[l.loai]) loi.push(`Không có dạng luật "${l.loai}"`);
    else {
      const ts = l.tham_so ?? {};
      const kiem = (dn: DinhNghiaMauRutGon | null, tien: string) => {
        try {
          for (const x of kiemThamSo(l.loai!, ts, dn)) loi.push(tien + x);
        } catch (e) {
          loi.push(`${tien}Không kiểm được tham số: ${e instanceof Error ? e.message : String(e)}`);
        }
      };
      if (l.ap_dung === "tat_ca") kiem(null, "");
      else if (Array.isArray(l.ap_dung)) {
        const nhieu = l.ap_dung.length > 1;
        for (const m of l.ap_dung) {
          const r = mau.get(m);
          // Luật đang TẮT chỉ kiểm cú pháp: mẫu đổi (vd bản 6 bỏ ô Ngày lập) thì quản trị vẫn tắt được luật cũ trỏ ô đã bỏ
          if (r) kiem(l.bat === false ? null : rutGonDinhNghia(r.ma, r.ten, r.dinh_nghia), nhieu ? `${r.ten}: ` : "");
        }
      }
    }
  }
  if (coAi) {
    if (!l.huong_dan_ai) loi.push("Luật kiểm bằng AI phải có hướng dẫn cho AI");
    if (l.muc === "chan") {
      const k = nhap ? nhap.khi_ai_loi : l.khi_ai_loi;
      if (k !== "cho_gui" && k !== "chan") loi.push("Luật AI ở mức chặn: phải chọn khi AI lỗi thì cho gửi hay chặn gửi");
    }
  }
  if (l.khi_ai_loi !== "cho_gui" && l.khi_ai_loi !== "chan") loi.push(`"Khi AI lỗi" phải là cho_gui hoặc chan`);
  return Array.from(new Set(loi));
}

// ---------------- Ghi ----------------

/** Các trường người dùng sửa được — để so "từ gì sang gì". */
function phanSua(l: LuatKiemTra | null): Record<string, unknown> {
  if (!l) return {};
  const { ma, ten, cau_luat, mo_ta, cach_kiem, loai, tham_so, huong_dan_ai, ap_dung, muc, khi_ai_loi, bat, nhom, thu_tu } = l;
  return { ma, ten, cau_luat, mo_ta, cach_kiem, loai, tham_so, huong_dan_ai, ap_dung, muc, khi_ai_loi, bat, nhom, thu_tu };
}

async function luuNoiBo(q: Q, nd: NguoiDungPhien, v: LuatNhap, them: { quay_lai_tu?: number } = {}): Promise<LuatKiemTra> {
  if (!(await duocSuaLuat(q, nd))) throw new LoiHttp(403, "Bạn không có quyền sửa luật kiểm tra");
  if (!v || typeof v !== "object") throw new LoiHttp(400, "Thiếu dữ liệu luật");
  await dongBoTuCauHinh(q);
  let cu: LuatKiemTra | null = null;
  if (v.id) {
    const { rows } = await q.query<Hang>("SELECT * FROM docflow.luat_kiem_tra WHERE id = $1 FOR UPDATE", [v.id]);
    if (!rows[0]) throw new LoiHttp(404, "Không tìm thấy luật");
    cu = thanhLuat(rows[0]);
    if (cu.da_xoa) throw new LoiHttp(409, "Luật này đã xóa");
  }
  const moi = chuanHoaNhap(v, cu, nd);
  if (!cu && !moi.ma) moi.ma = await maChuaDung(q, taoMaTuTen(moi.ten), null);
  const loi = await kiemLuat(q, moi, v);
  if (loi.length > 0) throw new LoiLuatKhongHopLe(loi);

  const doi = soSanhCauHinh(phanSua(cu), phanSua(moi));
  if (cu && doi.length === 0) return cu;

  let rows: Hang[];
  if (!cu) {
    if (moi.thu_tu < 0) {
      const r = await q.query<{ n: number }>("SELECT COALESCE(max(thu_tu), 0)::int + 10 AS n FROM docflow.luat_kiem_tra");
      moi.thu_tu = r.rows[0].n;
    }
    moi.id = taoMa("luat");
    ({ rows } = await q.query<Hang>(
      `INSERT INTO docflow.luat_kiem_tra (id, ma, ten, cau_luat, mo_ta, he_thong, cach_kiem, loai, tham_so, huong_dan_ai, ap_dung, muc,
         khi_ai_loi, bat, nhom, thu_tu, phien_ban, tao_boi, tao_luc, sua_boi, sua_luc)
       VALUES ($1,$2,$3,$4,$5,false,$6,$7,$8::jsonb,$9,$10::jsonb,$11,$12,$13,$14,$15,1,$16,now(),$16,now()) RETURNING *`,
      [
        moi.id, moi.ma, moi.ten, moi.cau_luat, moi.mo_ta, moi.cach_kiem, moi.loai,
        moi.tham_so === null ? null : JSON.stringify(moi.tham_so), moi.huong_dan_ai, JSON.stringify(moi.ap_dung), moi.muc,
        moi.khi_ai_loi, moi.bat, moi.nhom, moi.thu_tu, nd.id,
      ],
    ));
  } else {
    ({ rows } = await q.query<Hang>(
      `UPDATE docflow.luat_kiem_tra SET ma=$2, ten=$3, cau_luat=$4, mo_ta=$5, cach_kiem=$6, loai=$7, tham_so=$8::jsonb, huong_dan_ai=$9,
         ap_dung=$10::jsonb, muc=$11, khi_ai_loi=$12, bat=$13, nhom=$14, thu_tu=$15, phien_ban = phien_ban + 1, sua_boi=$16, sua_luc=now()
       WHERE id = $1 RETURNING *`,
      [
        cu.id, moi.ma, moi.ten, moi.cau_luat, moi.mo_ta, moi.cach_kiem, moi.loai,
        moi.tham_so === null ? null : JSON.stringify(moi.tham_so), moi.huong_dan_ai, JSON.stringify(moi.ap_dung), moi.muc,
        moi.khi_ai_loi, moi.bat, moi.nhom, moi.thu_tu < 0 ? cu.thu_tu : moi.thu_tu, nd.id,
      ],
    ));
  }
  const luu = thanhLuat(rows[0]);
  const ghiChu = them.quay_lai_tu !== undefined ? `quay lại bản ${them.quay_lai_tu}` : null;
  await ghiBanLuu(q, luu, nd.id, ghiChu);
  if (luu.he_thong) await ghiSangCauHinh(q, nd, luu);
  await ghiLichSu(q, {
    nguoi: nd.id,
    don_vi_id: nd.don_vi_id,
    doi_tuong_loai: "cau_hinh",
    doi_tuong_id: `luat:${luu.id}`,
    hanh_dong: "sua_cau_hinh",
    chi_tiet: {
      luat_id: luu.id,
      ma: luu.ma,
      ten: luu.ten,
      he_thong: luu.he_thong,
      phien_ban: luu.phien_ban,
      phien_ban_truoc: cu?.phien_ban ?? 0,
      ...(cu ? {} : { tao_moi: true }),
      thay_doi: doi.slice(0, 50),
      ...(them.quay_lai_tu !== undefined ? { quay_lai_phien_ban: them.quay_lai_tu } : {}),
    },
  });
  return luu;
}

/** Tạo/sửa (kiểm tham số trước khi lưu, tăng phiên bản, ghi lịch sử). Trả luật sau khi lưu. */
export async function luuLuat(q: Q, nd: NguoiDungPhien, v: LuatNhap): Promise<LuatKiemTra> {
  return luuNoiBo(q, nd, v);
}

/** Quay lại một phiên bản cũ: lưu thành phiên bản MỚI có nội dung của bản cũ (lịch sử ghi quay_lai_phien_ban). */
export async function quayLaiLuat(q: Q, nd: NguoiDungPhien, id: string, phienBan: number): Promise<LuatKiemTra> {
  if (!(await duocSuaLuat(q, nd))) throw new LoiHttp(403, "Bạn không có quyền sửa luật kiểm tra");
  const { rows } = await q.query<{ gia_tri: unknown }>("SELECT gia_tri FROM docflow.luat_kiem_tra_phien_ban WHERE luat_id = $1 AND phien_ban = $2", [
    id,
    Number(phienBan),
  ]);
  if (!rows[0]) throw new LoiHttp(404, `Luật không có bản ${phienBan}`);
  const g = docJson<LuatKiemTra>(rows[0].gia_tri);
  const nhap: LuatNhap = {
    id,
    ma: g.ma,
    ten: g.ten,
    cau_luat: g.cau_luat,
    mo_ta: g.mo_ta,
    cach_kiem: g.cach_kiem,
    loai: g.loai,
    tham_so: g.tham_so,
    huong_dan_ai: g.huong_dan_ai,
    ap_dung: g.ap_dung,
    muc: g.muc,
    khi_ai_loi: g.khi_ai_loi,
    bat: g.bat,
    nhom: g.nhom,
    thu_tu: g.thu_tu,
  };
  return luuNoiBo(q, nd, nhap, { quay_lai_tu: Number(phienBan) });
}

/** Xóa mềm; luật hệ thống → LoiHttp 409. */
export async function xoaLuat(q: Q, nd: NguoiDungPhien, id: string): Promise<void> {
  if (!(await duocSuaLuat(q, nd))) throw new LoiHttp(403, "Bạn không có quyền sửa luật kiểm tra");
  const cu = await layLuat(q, id);
  if (!cu) throw new LoiHttp(404, "Không tìm thấy luật");
  if (cu.he_thong) throw new LoiHttp(409, `"${cu.ten}" là luật hệ thống: chỉ tắt hoặc đổi mức được, không xóa được`);
  if (cu.da_xoa) return;
  const { rows } = await q.query<Hang>(
    "UPDATE docflow.luat_kiem_tra SET da_xoa = true, phien_ban = phien_ban + 1, sua_boi = $2, sua_luc = now() WHERE id = $1 RETURNING *",
    [id, nd.id],
  );
  const luu = thanhLuat(rows[0]);
  await ghiBanLuu(q, luu, nd.id, "xóa");
  await ghiLichSu(q, {
    nguoi: nd.id,
    don_vi_id: nd.don_vi_id,
    doi_tuong_loai: "cau_hinh",
    doi_tuong_id: `luat:${id}`,
    hanh_dong: "sua_cau_hinh",
    chi_tiet: {
      luat_id: id,
      ma: cu.ma,
      ten: cu.ten,
      xoa: true,
      phien_ban: luu.phien_ban,
      phien_ban_truoc: cu.phien_ban,
      thay_doi: [{ truong: "da_xoa", tu: false, sang: true }],
    },
  });
}
