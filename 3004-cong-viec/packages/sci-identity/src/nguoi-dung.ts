// ============================================================
// nguoi-dung.ts — NGƯỜI DÙNG (CHỈ SERVER): thêm, sửa, khóa, đặt lại mật khẩu, kiêm nhiệm, gán vai trò, xác thực.
// Hàm không tự kiểm quyền người thao tác (web chủ kiểm bằng duocQuanLyNguoi / duocTraoVaiTro trong quyen.ts).
// ============================================================
import { randomBytes } from "node:crypto";
import type { Q } from "@/lib/db";
import { bamMatKhau, dungMatKhau, taoSalt } from "./mat-khau";
import { ghi, khacNhau, LoiIdentity, type NguCanh } from "./moi-truong";
import { boDau, chuanHoaEmail, laEmail } from "./chu";

export interface KiemNhiem {
  don_vi_id: string;
  chuc_vu: string | null;
}

/** Người dùng đầy đủ cho trang quản trị (không có mật khẩu). */
export interface NguoiDungQuanTri {
  id: string;
  email: string;
  ten: string;
  don_vi_id: string | null;
  chuc_vu: string | null;
  cap_chuc_vu: number | null;
  la_quan_tri: boolean;
  active: boolean;
  tao_luc: string;
  kiem_nhiem: KiemNhiem[];
  vai_tro: string[];
}

export interface DauVaoNguoiDung {
  email: string;
  ten: string;
  don_vi_id?: string | null;
  chuc_vu?: string | null;
  cap_chuc_vu?: number | null;
  la_quan_tri?: boolean;
  mat_khau?: string; // trống = mật khẩu lần đầu là chính email (matKhauDau)
  vai_tro?: string[];
  kiem_nhiem?: { don_vi_id: string; chuc_vu?: string | null }[];
}

/** Sửa được cả email (tên đăng nhập): mã tài khoản bên trong giữ nguyên nên lịch sử, việc, tài liệu cũ không đổi chủ. */
export type SuaNguoiDung = Partial<Omit<DauVaoNguoiDung, "mat_khau">> & { active?: boolean };

export const DO_DAI_MAT_KHAU_TOI_THIEU = 6;

/**
 * MẬT KHẨU LẦN ĐẦU = CHÍNH TÊN ĐĂNG NHẬP (email, chữ thường) — Mr. Đại chốt K13 02/10/2026: "khi cấp tài khoản lần 1 cho mọi
 * người dùng thì tài khoản chính là mật khẩu cho dễ truy cập. sau này đổi ntn họ tự đổi". Dùng khi tạo / nhập Excel / đặt lại mà
 * quản trị để trống ô mật khẩu.
 */
export function matKhauDau(email: string): string {
  return email.trim().toLowerCase();
}

/** Mật khẩu tạm dễ đọc: 10 ký tự, có chữ hoa, chữ thường, số. (Từ 02/10 không còn là mặc định — giữ cho agent khác.) */
export function taoMatKhauTam(): string {
  const bang = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const b = randomBytes(10);
  let s = "";
  for (let i = 0; i < 10; i++) s += bang[b[i] % bang.length];
  return `Sci-${s}`;
}

function kiemMatKhau(mk: string, toiThieu: number): void {
  if (mk.length < toiThieu) throw new LoiIdentity(400, `Mật khẩu phải có ít nhất ${toiThieu} ký tự`);
}

export async function danhSachNguoiDung(
  q: Q,
  loc: { don_vi_id?: string | "chua_gan"; tim?: string; ca_bi_khoa?: boolean } = {},
): Promise<NguoiDungQuanTri[]> {
  const dk: string[] = [];
  const ts: unknown[] = [];
  if (loc.don_vi_id === "chua_gan") dk.push("n.don_vi_id IS NULL");
  else if (loc.don_vi_id) {
    ts.push(loc.don_vi_id);
    dk.push(`(n.don_vi_id = $${ts.length} OR n.id IN (SELECT nguoi_dung_id FROM identity.kiem_nhiem WHERE don_vi_id = $${ts.length}))`);
  }
  if (!loc.ca_bi_khoa) dk.push("n.active");
  const { rows: tatCa } = await q.query<Omit<NguoiDungQuanTri, "kiem_nhiem" | "vai_tro">>(
    `SELECT n.id, n.email, n.ten, n.don_vi_id, n.chuc_vu, n.cap_chuc_vu, n.la_quan_tri, n.active,
            to_char(n.tao_luc AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS tao_luc
     FROM identity.nguoi_dung n ${dk.length ? "WHERE " + dk.join(" AND ") : ""}`,
    ts,
  );
  // Tìm không phân biệt dấu, hoa thường ("nguyen van" khớp "Nguyễn Văn"); xếp theo tên kiểu tiếng Việt
  const tim = boDau(loc.tim ?? "");
  const rows = (tim ? tatCa.filter((r) => boDau(`${r.ten} ${r.email} ${r.chuc_vu ?? ""}`).includes(tim)) : tatCa).sort(
    (a, b) => a.ten.localeCompare(b.ten, "vi") || a.id.localeCompare(b.id),
  );
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const kn = await q.query<{ nguoi_dung_id: string; don_vi_id: string; chuc_vu: string | null }>(
    "SELECT nguoi_dung_id, don_vi_id, chuc_vu FROM identity.kiem_nhiem WHERE nguoi_dung_id = ANY($1::text[])",
    [ids],
  );
  const vt = await q.query<{ nguoi_dung_id: string; vai_tro_id: string }>(
    "SELECT nguoi_dung_id, vai_tro_id FROM identity.gan_vai_tro WHERE nguoi_dung_id = ANY($1::text[]) ORDER BY vai_tro_id",
    [ids],
  );
  return rows.map((r) => ({
    ...r,
    kiem_nhiem: kn.rows.filter((k) => k.nguoi_dung_id === r.id).map((k) => ({ don_vi_id: k.don_vi_id, chuc_vu: k.chuc_vu })),
    vai_tro: vt.rows.filter((v) => v.nguoi_dung_id === r.id).map((v) => v.vai_tro_id),
  }));
}

export async function layNguoiDungQuanTri(q: Q, id: string): Promise<NguoiDungQuanTri | null> {
  const { rows } = await q.query<{ id: string }>("SELECT id FROM identity.nguoi_dung WHERE id = $1", [chuanHoaEmail(id)]);
  if (!rows[0]) return null;
  const ds = await danhSachNguoiDung(q, { ca_bi_khoa: true });
  return ds.find((n) => n.id === rows[0].id) ?? null;
}

async function kiemDonViCo(q: Q, id: string | null | undefined, nhan = "Đơn vị"): Promise<void> {
  if (!id) return;
  const { rows } = await q.query<{ active: boolean }>("SELECT active FROM identity.don_vi WHERE id = $1", [id]);
  if (!rows[0]) throw new LoiIdentity(400, `${nhan} ${id} không tồn tại`);
  if (!rows[0].active) throw new LoiIdentity(400, `${nhan} ${id} đã ngừng hoạt động`);
}

async function kiemVaiTroCo(q: Q, ds: string[]): Promise<void> {
  if (ds.length === 0) return;
  const { rows } = await q.query<{ id: string }>("SELECT id FROM identity.vai_tro WHERE id = ANY($1::text[])", [ds]);
  const thieu = ds.filter((d) => !rows.some((r) => r.id === d));
  if (thieu.length) throw new LoiIdentity(400, `Không có vai trò: ${thieu.join(", ")}`);
}

function kiemCap(cap: number | null | undefined): void {
  if (cap === null || cap === undefined) return;
  if (!Number.isInteger(cap) || cap < 0 || cap > 99) throw new LoiIdentity(400, "Cấp theo chức vụ phải là số nguyên 0–99 (để trống = theo đơn vị)");
}

export async function themNguoiDung(
  q: Q,
  ng: NguCanh,
  v: DauVaoNguoiDung,
  tuyChon: { khong_bao_chua_gan?: boolean; do_dai_mat_khau?: number } = {},
): Promise<{ nguoi_dung: NguoiDungQuanTri; mat_khau: string; mat_khau_tu_sinh: boolean }> {
  const email = chuanHoaEmail(v.email ?? "");
  if (!laEmail(email)) throw new LoiIdentity(400, `Email không hợp lệ: ${v.email ?? ""}`);
  if (!v.ten?.trim()) throw new LoiIdentity(400, "Họ tên không được trống");
  // Mã tài khoản cũ có thể khác email (tài khoản đổi sang email thật 29/09 giữ mã cũ) → chống trùng cả hai
  const { rows: co } = await q.query("SELECT 1 FROM identity.nguoi_dung WHERE id = $1 OR email = $1", [email]);
  if (co.length) throw new LoiIdentity(409, `Email ${email} đã có tài khoản`);
  await kiemDonViCo(q, v.don_vi_id);
  kiemCap(v.cap_chuc_vu);
  const vaiTro = Array.from(new Set(v.vai_tro ?? []));
  await kiemVaiTroCo(q, vaiTro);
  const tuSinh = !v.mat_khau;
  const matKhau = v.mat_khau || matKhauDau(email);
  kiemMatKhau(matKhau, tuyChon.do_dai_mat_khau ?? DO_DAI_MAT_KHAU_TOI_THIEU);
  const salt = taoSalt();
  await q.query(
    `INSERT INTO identity.nguoi_dung (id, email, ten, mat_khau_hash, salt, don_vi_id, chuc_vu, cap_chuc_vu, la_quan_tri)
     VALUES ($1,$1,$2,$3,$4,$5,$6,$7,$8)`,
    [email, v.ten.trim(), bamMatKhau(salt, matKhau), salt, v.don_vi_id || null, v.chuc_vu?.trim() || null, v.cap_chuc_vu ?? null, !!v.la_quan_tri],
  );
  for (const vt of vaiTro) await q.query("INSERT INTO identity.gan_vai_tro (nguoi_dung_id, vai_tro_id) VALUES ($1,$2)", [email, vt]);
  if (v.kiem_nhiem?.length) await ghiKiemNhiem(q, email, v.don_vi_id ?? null, v.kiem_nhiem);
  const nd = (await layNguoiDungQuanTri(q, email))!;
  await ghi(q, ng, {
    loai: "nguoi_dung",
    id: email,
    thao_tac: "them",
    chi_tiet: { sau: { ten: nd.ten, don_vi_id: nd.don_vi_id, chuc_vu: nd.chuc_vu, vai_tro: nd.vai_tro, kiem_nhiem: nd.kiem_nhiem, la_quan_tri: nd.la_quan_tri } },
  });
  if (!nd.don_vi_id && !tuyChon.khong_bao_chua_gan && ng.baoChuaGanDonVi) {
    await ng.baoChuaGanDonVi(q, [{ id: nd.id, email: nd.email, ten: nd.ten }]);
  }
  return { nguoi_dung: nd, mat_khau: matKhau, mat_khau_tu_sinh: tuSinh };
}

async function ghiKiemNhiem(q: Q, id: string, donViChinh: string | null, ds: { don_vi_id: string; chuc_vu?: string | null }[]): Promise<void> {
  const sach = new Map<string, string | null>();
  for (const k of ds) {
    if (!k.don_vi_id || k.don_vi_id === donViChinh) continue;
    await kiemDonViCo(q, k.don_vi_id, "Đơn vị kiêm nhiệm");
    sach.set(k.don_vi_id, k.chuc_vu?.trim() || null);
  }
  await q.query("DELETE FROM identity.kiem_nhiem WHERE nguoi_dung_id = $1", [id]);
  for (const [dv, cv] of Array.from(sach.entries())) {
    await q.query("INSERT INTO identity.kiem_nhiem (nguoi_dung_id, don_vi_id, chuc_vu) VALUES ($1,$2,$3)", [id, dv, cv]);
  }
}

export async function suaNguoiDung(q: Q, ng: NguCanh, id: string, v: SuaNguoiDung): Promise<NguoiDungQuanTri> {
  const cu = await layNguoiDungQuanTri(q, id);
  if (!cu) throw new LoiIdentity(404, `Không có người dùng ${id}`);
  if (v.ten !== undefined && !v.ten.trim()) throw new LoiIdentity(400, "Họ tên không được trống");
  if (v.don_vi_id !== undefined && v.don_vi_id !== cu.don_vi_id) await kiemDonViCo(q, v.don_vi_id);
  kiemCap(v.cap_chuc_vu);
  if (v.vai_tro) await kiemVaiTroCo(q, v.vai_tro);
  if (v.active === false && ng.nguoi === cu.id) throw new LoiIdentity(409, "Không tự khóa tài khoản của chính mình được");
  const emailMoi = v.email !== undefined ? chuanHoaEmail(v.email) : cu.email;
  if (emailMoi !== cu.email) {
    if (!laEmail(emailMoi)) throw new LoiIdentity(400, `Email không hợp lệ: ${v.email ?? ""}`);
    const { rows: trung } = await q.query("SELECT 1 FROM identity.nguoi_dung WHERE (email = $1 OR id = $1) AND id <> $2", [emailMoi, cu.id]);
    if (trung.length) throw new LoiIdentity(409, `Email ${emailMoi} đã có tài khoản khác`);
  }
  const donVi = v.don_vi_id !== undefined ? v.don_vi_id || null : cu.don_vi_id;
  await q.query(
    `UPDATE identity.nguoi_dung SET ten=$2, don_vi_id=$3, chuc_vu=$4, cap_chuc_vu=$5, la_quan_tri=$6, active=$7, email=$8 WHERE id=$1`,
    [
      cu.id,
      v.ten?.trim() ?? cu.ten,
      donVi,
      v.chuc_vu !== undefined ? v.chuc_vu?.trim() || null : cu.chuc_vu,
      v.cap_chuc_vu !== undefined ? v.cap_chuc_vu : cu.cap_chuc_vu,
      v.la_quan_tri ?? cu.la_quan_tri,
      v.active ?? cu.active,
      emailMoi,
    ],
  );
  if (v.vai_tro) {
    await q.query("DELETE FROM identity.gan_vai_tro WHERE nguoi_dung_id = $1", [cu.id]);
    for (const vt of Array.from(new Set(v.vai_tro)))
      await q.query("INSERT INTO identity.gan_vai_tro (nguoi_dung_id, vai_tro_id) VALUES ($1,$2)", [cu.id, vt]);
  }
  if (v.kiem_nhiem) await ghiKiemNhiem(q, cu.id, donVi, v.kiem_nhiem);
  else if (donVi && donVi !== cu.don_vi_id)
    await q.query("DELETE FROM identity.kiem_nhiem WHERE nguoi_dung_id = $1 AND don_vi_id = $2", [cu.id, donVi]);
  const moi = (await layNguoiDungQuanTri(q, cu.id))!;
  // TRƯỞNG CHÍNH (chốt 03/10/2026; soát vòng 2): người bị khoá hoặc không còn thuộc đơn vị (đổi đơn vị chính, bỏ kiêm nhiệm) thì thôi
  // làm trưởng chính ở đó — đơn vị về "chưa chọn", trưởng phụ thôi bị dời sau trưởng chính, cây Tổ chức báo ⚠ để chọn lại.
  const boTruongChinh = await q.query<{ id: string }>(
    `UPDATE identity.don_vi d SET uy_quyen_truong = NULL
      WHERE d.uy_quyen_truong = $1
        AND (NOT $2::boolean OR NOT (d.id = coalesce($3, '') OR d.id IN (SELECT don_vi_id FROM identity.kiem_nhiem WHERE nguoi_dung_id = $1)))
      RETURNING d.id`,
    [cu.id, moi.active, moi.don_vi_id],
  );
  for (const r of boTruongChinh.rows)
    await ghi(q, ng, {
      loai: "don_vi",
      id: r.id,
      thao_tac: "uy_quyen",
      chi_tiet: { truoc: { uy_quyen_truong: cu.id }, sau: { uy_quyen_truong: null }, ly_do: moi.active ? "không còn thuộc đơn vị" : "tài khoản bị khoá" },
    });
  const truong = ["email", "ten", "don_vi_id", "chuc_vu", "cap_chuc_vu", "la_quan_tri", "active", "vai_tro", "kiem_nhiem"] as const;
  const pick = (n: NguoiDungQuanTri) => Object.fromEntries(truong.map((k) => [k, n[k]]));
  const d = khacNhau(pick(cu), pick(moi));
  if (Object.keys(d.sau).length > 0) {
    const thaoTac =
      v.active === false && cu.active ? "khoa" : v.active === true && !cu.active ? "mo_khoa" : Object.keys(d.sau).every((k) => k === "vai_tro") ? "gan_vai_tro" : "sua";
    await ghi(q, ng, { loai: "nguoi_dung", id: cu.id, thao_tac: thaoTac, chi_tiet: d });
  }
  if (cu.don_vi_id && !moi.don_vi_id && moi.active && ng.baoChuaGanDonVi) {
    await ng.baoChuaGanDonVi(q, [{ id: moi.id, email: moi.email, ten: moi.ten }]);
  }
  return moi;
}

export async function khoaNguoiDung(q: Q, ng: NguCanh, id: string, khoa = true): Promise<NguoiDungQuanTri> {
  return suaNguoiDung(q, ng, id, { active: !khoa });
}

export async function ganVaiTro(q: Q, ng: NguCanh, id: string, vaiTro: string[]): Promise<NguoiDungQuanTri> {
  return suaNguoiDung(q, ng, id, { vai_tro: vaiTro });
}

export async function datKiemNhiem(
  q: Q,
  ng: NguCanh,
  id: string,
  ds: { don_vi_id: string; chuc_vu?: string | null }[],
): Promise<NguoiDungQuanTri> {
  return suaNguoiDung(q, ng, id, { kiem_nhiem: ds });
}

/** Quản trị đặt lại mật khẩu. Trống = về mật khẩu lần đầu (chính email). Trả mật khẩu mới (chỉ hiện một lần). */
export async function datLaiMatKhau(q: Q, ng: NguCanh, id: string, matKhauMoi?: string, doDai = DO_DAI_MAT_KHAU_TOI_THIEU): Promise<string> {
  const cu = await layNguoiDungQuanTri(q, id);
  if (!cu) throw new LoiIdentity(404, `Không có người dùng ${id}`);
  const mk = matKhauMoi || matKhauDau(cu.email);
  kiemMatKhau(mk, doDai);
  const salt = taoSalt();
  await q.query("UPDATE identity.nguoi_dung SET mat_khau_hash=$2, salt=$3 WHERE id=$1", [cu.id, bamMatKhau(salt, mk), salt]);
  await ghi(q, ng, { loai: "nguoi_dung", id: cu.id, thao_tac: "dat_lai_mat_khau", chi_tiet: { tu_sinh: !matKhauMoi } });
  return mk;
}

/** Người dùng tự đổi mật khẩu (phải đúng mật khẩu cũ). */
export async function doiMatKhau(q: Q, ng: NguCanh, id: string, matKhauCu: string, matKhauMoi: string, doDai = DO_DAI_MAT_KHAU_TOI_THIEU): Promise<void> {
  const { rows } = await q.query<{ salt: string; mat_khau_hash: string }>(
    "SELECT salt, mat_khau_hash FROM identity.nguoi_dung WHERE id = $1 AND active",
    [chuanHoaEmail(id)],
  );
  if (!rows[0] || !dungMatKhau(rows[0].salt, rows[0].mat_khau_hash, matKhauCu)) throw new LoiIdentity(400, "Mật khẩu cũ không đúng");
  kiemMatKhau(matKhauMoi, doDai);
  if (matKhauMoi === matKhauCu) throw new LoiIdentity(400, "Mật khẩu mới phải khác mật khẩu cũ");
  const salt = taoSalt();
  await q.query("UPDATE identity.nguoi_dung SET mat_khau_hash=$2, salt=$3 WHERE id=$1", [chuanHoaEmail(id), bamMatKhau(salt, matKhauMoi), salt]);
  await ghi(q, ng, { loai: "nguoi_dung", id: chuanHoaEmail(id), thao_tac: "doi_mat_khau" });
}

/**
 * Kiểm email + mật khẩu. Trả người dùng nếu đúng và tài khoản còn hoạt động.
 * Tra theo CỘT EMAIL, không theo mã: tài khoản chuyển sang email thật (Mr. Đại chốt 29/09, cách A) giữ mã cũ bên
 * trong để sổ lịch sử (chuỗi băm) và dữ liệu cũ nguyên vẹn — đăng nhập bằng email mới, mã cũ không còn dùng để đăng nhập.
 */
export async function xacThuc(
  q: Q,
  email: string,
  matKhau: string,
): Promise<{ ok: true; id: string; ten: string } | { ok: false; ly_do: "sai" | "bi_khoa"; id?: string }> {
  const { rows } = await q.query<{ id: string; ten: string; salt: string; mat_khau_hash: string; active: boolean }>(
    "SELECT id, ten, salt, mat_khau_hash, active FROM identity.nguoi_dung WHERE email = $1",
    [chuanHoaEmail(email ?? "")],
  );
  const u = rows[0];
  if (!u || !matKhau || !dungMatKhau(u.salt, u.mat_khau_hash, matKhau)) return { ok: false, ly_do: "sai", id: u?.id };
  if (!u.active) return { ok: false, ly_do: "bi_khoa", id: u.id };
  return { ok: true, id: u.id, ten: u.ten };
}
