// ============================================================
// thu-muc/truy-van.ts — ĐỌC THƯ MỤC cho trang /thu-muc và API (CHỈ SERVER).
// Ai cũng thấy CẤU TRÚC mọi đơn vị. Mở xem NỘI DUNG theo cấu hình thu_muc.xem_noi_dung_phong_khac.
// Mỗi dòng trả kèm cờ quyền (được xóa / khôi phục / xem) để giao diện bật tắt nút.
// ============================================================
import type { Q } from "@/lib/db";
import type { DonVi, HanhDongLichSu, NguoiDungPhien } from "@/lib/types";
import { coQuyen } from "@sci/identity";
import { layCayDonVi } from "@sci/identity/don-vi";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { cheDoXemNoiDung } from "@/lib/bao-mat/quy-tac";
import { locKetQuaKiemTra } from "@/lib/bao-mat/loc";
import { ghiLichSuChuan as ghiLichSu } from "@/lib/lich-su/ghi-chuan";
import { LoiHttp } from "@/lib/phien";
import { taoMa } from "@/lib/ma";
import { coQuyenViTri, chuanPhienBan, type ThongTinPhienBan } from "./dich-vu";
import { damBaoThuMucDonVi } from "./hat-giong";
import { truongTaiSql } from "@/lib/truong-tai";

export interface NutThuMuc {
  id: string;
  don_vi_id: string;
  cha_id: string | null;
  ten: string;
  loai: string;
  so_tai_lieu: number;
}

export interface DonViCay extends Pick<DonVi, "id" | "ten" | "ten_ngan" | "cap" | "cha_id" | "loai" | "thu_tu"> {
  truong: string[]; // tên trưởng đơn vị
  duoc_tai_len: boolean;
}

function iso(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  return v instanceof Date ? v.toISOString() : new Date(String(v)).toISOString();
}

/** Tên người dùng theo id. */
export async function tenNguoiDung(q: Q, ids: (string | null | undefined)[]): Promise<Record<string, string>> {
  const ds = Array.from(new Set(ids.filter((x): x is string => !!x)));
  if (!ds.length) return {};
  const { rows } = await q.query<{ id: string; ten: string }>("SELECT id, ten FROM identity.nguoi_dung WHERE id = ANY($1::text[])", [ds]);
  const kq: Record<string, string> = {};
  for (const r of rows) kq[r.id] = r.ten;
  return kq;
}

async function truongDonVi(q: Q): Promise<Record<string, string[]>> {
  const { rows } = await q.query<{ don_vi_id: string; ten: string }>(
    // Đơn vị đã chọn TRƯỞNG CHÍNH (chốt 03/10/2026) → chỉ hiện người đó; chưa chọn → các trưởng biên chế như cũ
    `SELECT n.don_vi_id, n.ten FROM identity.nguoi_dung n JOIN identity.gan_vai_tro g ON g.nguoi_dung_id = n.id
     WHERE g.vai_tro_id = 'truong-don-vi' AND n.active AND n.don_vi_id IS NOT NULL AND ${truongTaiSql("n.don_vi_id")}
       AND NOT EXISTS (SELECT 1 FROM identity.don_vi d JOIN identity.nguoi_dung c ON c.id = d.uy_quyen_truong AND c.active WHERE d.id = n.don_vi_id)
     UNION
     SELECT d.id, n.ten FROM identity.don_vi d JOIN identity.nguoi_dung n ON n.id = d.uy_quyen_truong AND n.active
     ORDER BY 2`,
  );
  const kq: Record<string, string[]> = {};
  for (const r of rows) (kq[r.don_vi_id] ??= []).push(r.ten);
  return kq;
}

/** Cây thư mục của MỌI đơn vị (ai cũng thấy), kèm số tài liệu mỗi thư mục. */
export async function cayThuMuc(q: Q, nd: NguoiDungPhien): Promise<{ don_vi: DonViCay[]; thu_muc: NutThuMuc[] }> {
  // Kể cả đơn vị đã ngừng: thư mục cũ vẫn giữ nguyên, xem được, chỉ không tải thêm vào
  const cay = await layCayDonVi(q, true);
  // Đơn vị thêm sau chưa có thư mục → dựng luôn
  const thieu = await q.query<{ id: string }>(
    `SELECT d.id FROM identity.don_vi d WHERE d.active AND NOT EXISTS
       (SELECT 1 FROM docflow.thu_muc t WHERE t.don_vi_id = d.id AND t.loai = 'goc')`,
  );
  for (const d of thieu.rows) await damBaoThuMucDonVi(q, d.id);
  const cfg = await layCauHinh(q, "thu_muc");
  const { rows } = await q.query<NutThuMuc & { so_tai_lieu: number | string; so_rac: number | string }>(
    `SELECT t.id, t.don_vi_id, t.cha_id, t.ten, t.loai,
       (SELECT count(*) FROM docflow.vi_tri v WHERE v.thu_muc_id = t.id AND NOT v.da_xoa) AS so_tai_lieu,
       CASE WHEN t.loai = 'thung_rac' THEN
         (SELECT count(*) FROM docflow.vi_tri v JOIN docflow.thu_muc t2 ON t2.id = v.thu_muc_id
          WHERE t2.don_vi_id = t.don_vi_id AND v.da_xoa AND v.xoa_luc > now() - ($1::int * interval '1 day'))
       ELSE 0 END AS so_rac
     FROM docflow.thu_muc t JOIN identity.don_vi d ON d.id = t.don_vi_id
     ORDER BY t.tao_luc, t.ten`,
    [cfg.thung_rac_giu_ngay],
  );
  const truong = await truongDonVi(q);
  return {
    don_vi: cay.map((d) => ({
      id: d.id,
      ten: d.active ? d.ten : `${d.ten} (ngừng hoạt động)`,
      ten_ngan: d.ten_ngan,
      cap: d.cap,
      cha_id: d.cha_id,
      loai: d.loai,
      thu_tu: d.thu_tu,
      truong: truong[d.id] ?? [],
      duoc_tai_len: d.active && coQuyen(nd, "tai_lieu.tai_len", { don_vi_id: d.id }, cay),
    })),
    thu_muc: rows.map((r) => ({
      id: r.id,
      don_vi_id: r.don_vi_id,
      cha_id: r.cha_id,
      ten: r.ten,
      loai: r.loai,
      so_tai_lieu: r.loai === "thung_rac" ? Number(r.so_rac) : Number(r.so_tai_lieu),
    })),
  };
}

/** Đọc thông tin thư mục + tổ tiên (để làm đường dẫn và biết có nằm trong Dự án không). */
async function thuMucVaToTien(q: Q, id: string) {
  const { rows } = await q.query<{ id: string; don_vi_id: string; cha_id: string | null; ten: string; loai: string }>(
    `WITH RECURSIVE len AS (
       SELECT id, don_vi_id, cha_id, ten, loai, 0 AS muc FROM docflow.thu_muc WHERE id = $1
       UNION ALL
       SELECT t.id, t.don_vi_id, t.cha_id, t.ten, t.loai, len.muc + 1 FROM docflow.thu_muc t JOIN len ON t.id = len.cha_id WHERE len.muc < 50
     ) SELECT id, don_vi_id, cha_id, ten, loai FROM len ORDER BY muc DESC`,
    [id],
  );
  if (!rows.length) throw new LoiHttp(404, "Không tìm thấy thư mục");
  return { thu_muc: rows[rows.length - 1], duong_dan: rows };
}

/** Thư mục này cho tạo thư mục con không: chỉ trong nhánh Dự án. */
function trongDuAn(duongDan: { loai: string }[]): boolean {
  return duongDan.some((t) => t.loai === "du_an");
}

/**
 * Mở xem nội dung tài liệu được không (theo cấu hình + quyền tai_lieu.xem).
 * Q4 bảo mật tài chính (Mr. Đại chốt 07/10/2026): tài liệu KHÔNG theo mẫu mật của đơn vị trong "Bảo mật báo cáo tài chính ›
 * Đơn vị có tài liệu khác xét theo phân quyền" → xét theo phân quyền dù Thư mục để mọi người mở được. Báo cáo theo mẫu mật thì
 * mở được nhưng chỉ nhận bản đã cắt (bao-mat/loc.ts, ở nguồn đọc tệp).
 */
export async function duocXemNoiDung(q: Q, nd: NguoiDungPhien, taiLieuId: string, cay?: DonVi[]): Promise<boolean> {
  const cfg = await layCauHinh(q, "thu_muc");
  const bm = await layCauHinh(q, "bao_mat");
  const { rows } = await q.query<{ nguoi_tao: string; don_vi_lap: string | null; mau_ma: string | null }>(
    "SELECT nguoi_tao, don_vi_lap, mau_ma FROM docflow.tai_lieu WHERE id = $1",
    [taiLieuId],
  );
  if (cfg.xem_noi_dung_phong_khac !== "theo_quyen" && (!rows[0] || cheDoXemNoiDung(cfg.xem_noi_dung_phong_khac, bm, rows[0]) === "tat_ca")) return true;
  if (nd.la_quan_tri) return true;
  if (!rows[0]) return false;
  const dvs = await q.query<{ don_vi_id: string }>(
    "SELECT DISTINCT t.don_vi_id FROM docflow.vi_tri v JOIN docflow.thu_muc t ON t.id = v.thu_muc_id WHERE v.tai_lieu_id = $1",
    [taiLieuId],
  );
  const nguoiTaiLen = await q.query<{ tai_len_boi: string }>(
    "SELECT DISTINCT tai_len_boi FROM docflow.phien_ban_tep WHERE tai_lieu_id = $1",
    [taiLieuId],
  );
  if (nguoiTaiLen.rows.some((r) => r.tai_len_boi === nd.id) || rows[0].nguoi_tao === nd.id) return true;
  const cayDv = cay ?? (await layCayDonVi(q, true));
  const donVi = [rows[0].don_vi_lap, ...dvs.rows.map((r) => r.don_vi_id)].filter((x): x is string => !!x);
  return donVi.some((dv) => coQuyen(nd, "tai_lieu.xem", { chu_so_huu: rows[0].nguoi_tao, don_vi_id: dv }, cayDv));
}

export interface DongTaiLieu {
  vi_tri_id: string;
  tai_lieu_id: string;
  ten: string;
  mau_ma: string | null;
  mau_ten: string | null;
  phien_ban: number;
  ten_tep: string;
  mime: string;
  kich_thuoc: number;
  sha256: string;
  tai_len_boi: string;
  tai_len_boi_ten: string;
  tai_len_luc: string;
  don_vi_lap: string | null;
  don_vi_lap_ten: string | null;
  trang_thai: string;
  vai: string;
  nhan: string | null;
  them_luc: string;
  duoc_xem: boolean;
  duoc_xoa: boolean;
  duoc_khoi_phuc: boolean;
  // chỉ có trong Thùng rác
  xoa_boi?: string | null;
  xoa_boi_ten?: string | null;
  xoa_luc?: string | null;
  het_han_luc?: string | null;
  tu_thu_muc?: string | null;
}

/** Nội dung một thư mục. Thùng rác = mọi tài liệu đã xóa khỏi thư mục của đơn vị, còn trong hạn giữ. */
export async function noiDungThuMuc(q: Q, nd: NguoiDungPhien, thuMucId: string) {
  const { thu_muc, duong_dan } = await thuMucVaToTien(q, thuMucId);
  const cay = await layCayDonVi(q, true);
  const cfg = await layCauHinh(q, "thu_muc");
  const donVi = cay.find((d) => d.id === thu_muc.don_vi_id) ?? null;
  const laThungRac = thu_muc.loai === "thung_rac";
  const con = await q.query<{ id: string; ten: string; loai: string; so: number | string }>(
    `SELECT t.id, t.ten, t.loai, (SELECT count(*) FROM docflow.vi_tri v WHERE v.thu_muc_id = t.id AND NOT v.da_xoa) AS so
     FROM docflow.thu_muc t WHERE t.cha_id = $1 ORDER BY t.tao_luc, t.ten`,
    [thuMucId],
  );
  const { rows } = await q.query<Record<string, unknown>>(
    `SELECT v.id AS vi_tri_id, v.tai_lieu_id, v.vai, v.nhan, v.them_boi, v.them_luc, v.da_xoa, v.xoa_boi, v.xoa_luc,
            tm.ten AS tu_thu_muc, tm.don_vi_id,
            t.ten, t.mau_ma, m.ten AS mau_ten, t.phien_ban_hien_tai AS phien_ban, t.trang_thai, t.nguoi_tao, t.don_vi_lap,
            dl.ten_ngan AS don_vi_lap_ten,
            p.ten_tep, p.mime, p.kich_thuoc, p.sha256, p.tai_len_boi, p.tai_len_luc,
            (SELECT p1.tai_len_boi FROM docflow.phien_ban_tep p1 WHERE p1.tai_lieu_id = t.id ORDER BY p1.phien_ban LIMIT 1) AS nguoi_tai_len_dau
     FROM docflow.vi_tri v
     JOIN docflow.thu_muc tm ON tm.id = v.thu_muc_id
     JOIN docflow.tai_lieu t ON t.id = v.tai_lieu_id
     LEFT JOIN docflow.mau_word m ON m.ma = t.mau_ma
     LEFT JOIN identity.don_vi dl ON dl.id = t.don_vi_lap
     LEFT JOIN docflow.phien_ban_tep p ON p.tai_lieu_id = t.id AND p.phien_ban = t.phien_ban_hien_tai
     WHERE ${
       laThungRac
         ? "tm.don_vi_id = $1 AND v.da_xoa AND v.xoa_luc > now() - ($2::int * interval '1 day') ORDER BY v.xoa_luc DESC"
         : "v.thu_muc_id = $1 AND NOT v.da_xoa ORDER BY p.tai_len_luc DESC NULLS LAST, t.ten"
     }`,
    laThungRac ? [thu_muc.don_vi_id, cfg.thung_rac_giu_ngay] : [thuMucId],
  );
  const ten = await tenNguoiDung(q, rows.flatMap((r) => [r.tai_len_boi as string, r.xoa_boi as string]));
  const bm = await layCauHinh(q, "bao_mat");
  const xemTatCa = cfg.xem_noi_dung_phong_khac !== "theo_quyen" && bm.don_vi_theo_quyen.length === 0;
  const taiLieu: DongTaiLieu[] = [];
  for (const r of rows) {
    const vt = {
      don_vi_id: String(r.don_vi_id),
      them_boi: String(r.them_boi),
      nguoi_tai_len_dau: (r.nguoi_tai_len_dau as string | null) ?? null,
    };
    const xoaLuc = iso(r.xoa_luc);
    taiLieu.push({
      vi_tri_id: String(r.vi_tri_id),
      tai_lieu_id: String(r.tai_lieu_id),
      ten: String(r.ten),
      mau_ma: (r.mau_ma as string | null) ?? null,
      mau_ten: (r.mau_ten as string | null) ?? null,
      phien_ban: Number(r.phien_ban),
      ten_tep: String(r.ten_tep ?? r.ten),
      mime: String(r.mime ?? ""),
      kich_thuoc: Number(r.kich_thuoc ?? 0),
      sha256: String(r.sha256 ?? ""),
      tai_len_boi: String(r.tai_len_boi ?? ""),
      tai_len_boi_ten: ten[String(r.tai_len_boi)] ?? String(r.tai_len_boi ?? ""),
      tai_len_luc: iso(r.tai_len_luc) ?? "",
      don_vi_lap: (r.don_vi_lap as string | null) ?? null,
      don_vi_lap_ten: (r.don_vi_lap_ten as string | null) ?? null,
      trang_thai: String(r.trang_thai),
      vai: String(r.vai),
      nhan: (r.nhan as string | null) ?? null,
      them_luc: iso(r.them_luc) ?? "",
      duoc_xem: xemTatCa ? true : await duocXemNoiDung(q, nd, String(r.tai_lieu_id), cay),
      duoc_xoa: !laThungRac && coQuyenViTri(nd, "tai_lieu.xoa", vt, cay),
      duoc_khoi_phuc: laThungRac && coQuyenViTri(nd, "tai_lieu.khoi_phuc", vt, cay),
      ...(laThungRac
        ? {
            xoa_boi: (r.xoa_boi as string | null) ?? null,
            xoa_boi_ten: ten[String(r.xoa_boi)] ?? null,
            xoa_luc: xoaLuc,
            het_han_luc: xoaLuc ? new Date(new Date(xoaLuc).getTime() + cfg.thung_rac_giu_ngay * 86400000).toISOString() : null,
            tu_thu_muc: String(r.tu_thu_muc),
          }
        : {}),
    });
  }
  const duocTaiLen = coQuyen(nd, "tai_lieu.tai_len", { don_vi_id: thu_muc.don_vi_id }, cay);
  const truong = (await truongDonVi(q))[thu_muc.don_vi_id] ?? [];
  return {
    thu_muc,
    duong_dan,
    don_vi: donVi ? { id: donVi.id, ten: donVi.ten, ten_ngan: donVi.ten_ngan, loai: donVi.loai, cap: donVi.cap } : null,
    truong_don_vi: truong,
    thu_muc_con: con.rows.map((c) => ({ id: c.id, ten: c.ten, loai: c.loai, so_tai_lieu: Number(c.so) })),
    tai_lieu: taiLieu,
    la_thung_rac: laThungRac,
    duoc_tai_len: duocTaiLen && !laThungRac,
    duoc_tao_thu_muc: duocTaiLen && trongDuAn(duong_dan),
    thung_rac_giu_ngay: cfg.thung_rac_giu_ngay,
    xem_noi_dung_phong_khac: cfg.xem_noi_dung_phong_khac,
  };
}

/** Người dùng tạo thư mục con trong nhánh Dự án (theo quyền tải lên của đơn vị). */
export async function taoThuMucCon(q: Q, nd: NguoiDungPhien, chaId: string, ten: string, thietBi?: string | null): Promise<string> {
  const ten2 = ten.trim().replace(/\s+/g, " ");
  if (!ten2) throw new LoiHttp(400, "Chưa nhập tên thư mục");
  if (ten2.length > 120 || /[\\/:*?"<>|]/.test(ten2)) throw new LoiHttp(400, 'Tên thư mục không được chứa \\ / : * ? " < > | và dài tối đa 120 ký tự');
  const { thu_muc, duong_dan } = await thuMucVaToTien(q, chaId);
  if (!trongDuAn(duong_dan)) throw new LoiHttp(400, "Chỉ tạo thư mục con trong nhánh Dự án");
  const cay = await layCayDonVi(q, true);
  if (!coQuyen(nd, "tai_lieu.tai_len", { don_vi_id: thu_muc.don_vi_id }, cay)) {
    throw new LoiHttp(403, "Bạn không có quyền tạo thư mục trong đơn vị này");
  }
  const trung = await q.query("SELECT 1 FROM docflow.thu_muc WHERE cha_id = $1 AND lower(ten) = lower($2)", [chaId, ten2]);
  if (trung.rows.length) throw new LoiHttp(409, `Đã có thư mục "${ten2}"`);
  const id = taoMa("tm");
  await q.query("INSERT INTO docflow.thu_muc (id, don_vi_id, cha_id, ten, loai) VALUES ($1,$2,$3,$4,'khac')", [
    id,
    thu_muc.don_vi_id,
    chaId,
    ten2,
  ]);
  // Chưa có mã hành động riêng cho "tạo thư mục" trong HANH_DONG_LICH_SU (đã đề nghị nền thêm 'tao_thu_muc')
  await ghiLichSu(q, {
    nguoi: nd.id,
    don_vi_id: nd.don_vi_id,
    thiet_bi: thietBi ?? null,
    doi_tuong_loai: "thu_muc",
    doi_tuong_id: id,
    hanh_dong: "tao_thu_muc" as HanhDongLichSu,
    chi_tiet: { ten: ten2, cha_id: chaId, cha: thu_muc.ten, thu_muc_don_vi: thu_muc.don_vi_id },
  });
  return id;
}

export interface KetQuaTim {
  vi_tri_id: string;
  tai_lieu_id: string;
  ten: string;
  ten_tep: string;
  phien_ban: number;
  mau_ma: string | null;
  thu_muc_id: string;
  thu_muc_ten: string;
  don_vi_id: string;
  don_vi_ten: string;
  tai_len_luc: string;
}

/** Tìm tài liệu của MỌI đơn vị theo tên tài liệu / tên file (chỉ vị trí đang có, không gồm thùng rác). */
export async function timTaiLieu(q: Q, tuKhoa: string, gioiHan = 30): Promise<KetQuaTim[]> {
  const k = tuKhoa.trim();
  if (!k) return [];
  const mau = `%${k.replace(/[\\%_]/g, (c) => "\\" + c)}%`;
  const { rows } = await q.query<Record<string, unknown>>(
    `SELECT v.id AS vi_tri_id, t.id AS tai_lieu_id, t.ten, t.mau_ma, t.phien_ban_hien_tai AS phien_ban,
            p.ten_tep, p.tai_len_luc, tm.id AS thu_muc_id, tm.ten AS thu_muc_ten, d.id AS don_vi_id, d.ten_ngan AS don_vi_ten
     FROM docflow.vi_tri v
     JOIN docflow.tai_lieu t ON t.id = v.tai_lieu_id
     JOIN docflow.thu_muc tm ON tm.id = v.thu_muc_id
     JOIN identity.don_vi d ON d.id = tm.don_vi_id
     LEFT JOIN docflow.phien_ban_tep p ON p.tai_lieu_id = t.id AND p.phien_ban = t.phien_ban_hien_tai
     WHERE NOT v.da_xoa AND (t.ten ILIKE $1 OR p.ten_tep ILIKE $1 OR t.id = $2 OR t.mau_ma ILIKE $1)
     ORDER BY p.tai_len_luc DESC NULLS LAST LIMIT $3`,
    [mau, k, Math.min(Math.max(gioiHan, 1), 200)],
  );
  return rows.map((r) => ({
    vi_tri_id: String(r.vi_tri_id),
    tai_lieu_id: String(r.tai_lieu_id),
    ten: String(r.ten),
    ten_tep: String(r.ten_tep ?? r.ten),
    phien_ban: Number(r.phien_ban),
    mau_ma: (r.mau_ma as string | null) ?? null,
    thu_muc_id: String(r.thu_muc_id),
    thu_muc_ten: String(r.thu_muc_ten),
    don_vi_id: String(r.don_vi_id),
    don_vi_ten: String(r.don_vi_ten),
    tai_len_luc: iso(r.tai_len_luc) ?? "",
  }));
}

/** Thông tin một tài liệu: mọi phiên bản (kể cả khi đã xóa khỏi thư mục), mọi vị trí. */
export async function thongTinTaiLieu(q: Q, nd: NguoiDungPhien, taiLieuId: string) {
  const { rows } = await q.query<Record<string, unknown>>(
    `SELECT t.*, m.ten AS mau_ten, d.ten_ngan AS don_vi_lap_ten FROM docflow.tai_lieu t
     LEFT JOIN docflow.mau_word m ON m.ma = t.mau_ma LEFT JOIN identity.don_vi d ON d.id = t.don_vi_lap WHERE t.id = $1`,
    [taiLieuId],
  );
  const t = rows[0];
  if (!t) throw new LoiHttp(404, "Không tìm thấy tài liệu");
  const pb = await q.query<Record<string, unknown>>(
    "SELECT * FROM docflow.phien_ban_tep WHERE tai_lieu_id = $1 ORDER BY phien_ban",
    [taiLieuId],
  );
  const vt = await q.query<Record<string, unknown>>(
    `SELECT v.id, v.thu_muc_id, v.vai, v.nhan, v.them_boi, v.them_luc, v.da_xoa, v.xoa_boi, v.xoa_luc,
            tm.ten AS thu_muc_ten, tm.don_vi_id, d.ten_ngan AS don_vi_ten
     FROM docflow.vi_tri v JOIN docflow.thu_muc tm ON tm.id = v.thu_muc_id JOIN identity.don_vi d ON d.id = tm.don_vi_id
     WHERE v.tai_lieu_id = $1 ORDER BY v.them_luc`,
    [taiLieuId],
  );
  const phienBan: (Omit<ThongTinPhienBan, "khoa_luu"> & { tai_len_boi_ten: string })[] = [];
  const ten = await tenNguoiDung(q, [
    String(t.nguoi_tao),
    ...pb.rows.map((r) => String(r.tai_len_boi)),
    ...vt.rows.map((r) => r.xoa_boi as string),
    ...vt.rows.map((r) => r.them_boi as string),
  ]);
  for (const r of pb.rows) {
    const { khoa_luu: _bo, ...p } = chuanPhienBan(r);
    // Kết quả kiểm tra cắt theo người đọc — chương mật Form 4 (kiểm độc lập 10/10: đường này trả nguyên cho khung xem trước)
    const kq = await locKetQuaKiemTra(q, (t.mau_ma as string | null) ?? null, p.ket_qua_kiem_tra, p.tai_len_boi, nd);
    phienBan.push({ ...p, ket_qua_kiem_tra: kq, tai_len_boi_ten: ten[p.tai_len_boi] ?? p.tai_len_boi });
  }
  return {
    tai_lieu: {
      id: String(t.id),
      ten: String(t.ten),
      mau_ma: (t.mau_ma as string | null) ?? null,
      mau_ten: (t.mau_ten as string | null) ?? null,
      don_vi_lap: (t.don_vi_lap as string | null) ?? null,
      don_vi_lap_ten: (t.don_vi_lap_ten as string | null) ?? null,
      nguoi_tao: String(t.nguoi_tao),
      nguoi_tao_ten: ten[String(t.nguoi_tao)] ?? String(t.nguoi_tao),
      nguoi_gui_that: (t.nguoi_gui_that as string | null) ?? null,
      phien_ban_hien_tai: Number(t.phien_ban_hien_tai),
      ky_bao_cao: t.ky_bao_cao ?? null,
      trang_thai: String(t.trang_thai),
      lien_quan_den: (t.lien_quan_den as string | null) ?? null,
      tao_luc: iso(t.tao_luc),
    },
    phien_ban: phienBan,
    vi_tri: vt.rows.map((r) => ({
      id: String(r.id),
      thu_muc_id: String(r.thu_muc_id),
      thu_muc_ten: String(r.thu_muc_ten),
      don_vi_id: String(r.don_vi_id),
      don_vi_ten: String(r.don_vi_ten),
      vai: String(r.vai),
      nhan: (r.nhan as string | null) ?? null,
      them_boi_ten: ten[String(r.them_boi)] ?? String(r.them_boi),
      them_luc: iso(r.them_luc),
      da_xoa: Boolean(r.da_xoa),
      xoa_boi_ten: r.xoa_boi ? ten[String(r.xoa_boi)] ?? String(r.xoa_boi) : null,
      xoa_luc: iso(r.xoa_luc),
    })),
    duoc_xem: await duocXemNoiDung(q, nd, taiLieuId),
  };
}

/** Ghi lịch sử mở xem / tải về một phiên bản. */
export async function ghiXemTaiVe(
  q: Q,
  nd: NguoiDungPhien,
  v: { tai_lieu_id: string; phien_ban: number; hanh_dong: "mo_xem" | "tai_ve"; thiet_bi?: string | null; ten_tep?: string },
): Promise<void> {
  await ghiLichSu(q, {
    nguoi: nd.id,
    don_vi_id: nd.don_vi_id,
    thiet_bi: v.thiet_bi ?? null,
    doi_tuong_loai: "tai_lieu",
    doi_tuong_id: v.tai_lieu_id,
    hanh_dong: v.hanh_dong,
    chi_tiet: { phien_ban: v.phien_ban, ...(v.ten_tep ? { ten_tep: v.ten_tep } : {}) },
  });
}
