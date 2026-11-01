// ============================================================
// thu-muc/dich-vu.ts — LỚP 1: THƯ MỤC. Chủ module: thu-muc (giai đoạn 2).
// CHỮ KÝ LÀ HỢP ĐỒNG (KIEN-TRUC.md) — module gui, so-cai, ai gọi các hàm này. Không đổi chữ ký.
// Mọi hàm nhận q (có thể là giao dịch) và TỰ ghi lịch sử của thao tác mình.
// ============================================================
import type { Q } from "@/lib/db";
import type { KetQuaKiemTra, KyBaoCao, NguoiDungPhien } from "@/lib/types";
import { coQuyen } from "@sci/identity";
import { layCayDonVi } from "@sci/identity/don-vi";
import { ghiLichSuChuan as ghiLichSu } from "@/lib/lich-su/ghi-chuan";
import { ghiTep, docTep } from "@/lib/luu-tru/kho";
import { taoMa } from "@/lib/ma";
import { LoiHttp } from "@/lib/phien";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { damBaoThuMucDonVi } from "./hat-giong";
import { cauChanBanCat, locBaoMat, type NguoiDoc } from "@/lib/bao-mat/loc";

export type LoaiThuMuc = "goc" | "den" | "di" | "du_an" | "thung_rac" | "khac";

export interface TepTaiLen {
  ten_tep: string;
  mime: string;
  noi_dung: Buffer;
}

const TEN_MAC_DINH: Record<LoaiThuMuc, string> = {
  goc: "Thư mục gốc",
  den: "Đến",
  di: "Đi",
  du_an: "Dự án",
  thung_rac: "Thùng rác",
  khac: "Khác",
};

/** Id thư mục loại `loai` của đơn vị (tạo nếu chưa có, theo cấu hình thu_muc). */
export async function thuMucCuaDonVi(q: Q, donViId: string, loai: LoaiThuMuc): Promise<string> {
  const co = await q.query<{ id: string }>(
    "SELECT id FROM docflow.thu_muc WHERE don_vi_id = $1 AND loai = $2 ORDER BY (cha_id IS NULL) DESC, tao_luc LIMIT 1",
    [donViId, loai],
  );
  if (co.rows[0]) return co.rows[0].id;
  // Đơn vị thêm sau / cấu hình vừa đổi: dựng đủ cây mặc định
  const cay = await damBaoThuMucDonVi(q, donViId);
  if (cay[loai]) return cay[loai];
  // Loại không có trong cấu hình thư mục con → tạo riêng dưới thư mục gốc
  const id = taoMa("tm");
  const { rows } = await q.query<{ id: string }>(
    `INSERT INTO docflow.thu_muc (id, don_vi_id, cha_id, ten, loai) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT DO NOTHING RETURNING id`,
    [id, donViId, cay.goc, TEN_MAC_DINH[loai], loai],
  );
  if (rows[0]) return rows[0].id;
  const lai = await q.query<{ id: string }>("SELECT id FROM docflow.thu_muc WHERE don_vi_id = $1 AND loai = $2 LIMIT 1", [donViId, loai]);
  return lai.rows[0].id;
}

async function tenThuMuc(q: Q, thuMucId: string): Promise<{ ten: string; don_vi_id: string; loai: string }> {
  const { rows } = await q.query<{ ten: string; don_vi_id: string; loai: string }>(
    "SELECT ten, don_vi_id, loai FROM docflow.thu_muc WHERE id = $1",
    [thuMucId],
  );
  if (!rows[0]) throw new LoiHttp(404, "Không tìm thấy thư mục");
  return rows[0];
}

async function luuPhienBan(
  q: Q,
  taiLieuId: string,
  phienBan: number,
  nguoi: string,
  tep: TepTaiLen,
  ketQua: KetQuaKiemTra | null | undefined,
): Promise<{ sha256: string; kich_thuoc: number }> {
  const luu = await ghiTep(tep.noi_dung);
  await q.query(
    `INSERT INTO docflow.phien_ban_tep (tai_lieu_id, phien_ban, ten_tep, mime, kich_thuoc, sha256, khoa_luu, tai_len_boi, ket_qua_kiem_tra)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      taiLieuId,
      phienBan,
      tep.ten_tep,
      tep.mime || "application/octet-stream",
      luu.kich_thuoc,
      luu.sha256,
      luu.khoa,
      nguoi,
      ketQua ? JSON.stringify(ketQua) : null,
    ],
  );
  return { sha256: luu.sha256, kich_thuoc: luu.kich_thuoc };
}

/** Tạo tài liệu mới + phiên bản 1 + đặt vào thư mục (vai 'goc'). Ghi lịch sử 'tai_len'. */
export async function taoTaiLieu(
  q: Q,
  v: {
    ten: string;
    nguoi: string;
    don_vi_lap: string | null;
    thu_muc_id: string;
    tep: TepTaiLen;
    mau_ma?: string | null;
    ky_bao_cao?: KyBaoCao | null;
    ket_qua_kiem_tra?: KetQuaKiemTra | null;
    nguoi_gui_that?: string | null;
    lien_quan_den?: string | null;
  },
): Promise<{ tai_lieu_id: string; phien_ban: number }> {
  const tm = await tenThuMuc(q, v.thu_muc_id);
  if (tm.loai === "thung_rac") throw new LoiHttp(400, "Không tải lên vào Thùng rác");
  const id = taoMa("tl");
  await q.query(
    `INSERT INTO docflow.tai_lieu (id, ten, mau_ma, don_vi_lap, nguoi_tao, nguoi_gui_that, phien_ban_hien_tai, ky_bao_cao, lien_quan_den)
     VALUES ($1,$2,$3,$4,$5,$6,1,$7,$8)`,
    [
      id,
      v.ten.trim() || v.tep.ten_tep,
      v.mau_ma ?? null,
      v.don_vi_lap,
      v.nguoi,
      v.nguoi_gui_that ?? null,
      v.ky_bao_cao ? JSON.stringify(v.ky_bao_cao) : null,
      v.lien_quan_den ?? null,
    ],
  );
  const pb = await luuPhienBan(q, id, 1, v.nguoi, v.tep, v.ket_qua_kiem_tra);
  const viTriId = taoMa("vt");
  await q.query(
    "INSERT INTO docflow.vi_tri (id, tai_lieu_id, thu_muc_id, vai, them_boi) VALUES ($1,$2,$3,'goc',$4)",
    [viTriId, id, v.thu_muc_id, v.nguoi],
  );
  await ghiLichSu(q, {
    nguoi: v.nguoi,
    thay_cho: v.nguoi_gui_that ?? null,
    don_vi_id: v.don_vi_lap,
    doi_tuong_loai: "tai_lieu",
    doi_tuong_id: id,
    hanh_dong: "tai_len",
    chi_tiet: {
      ten: v.ten,
      phien_ban: 1,
      ten_tep: v.tep.ten_tep,
      sha256: pb.sha256,
      kich_thuoc: pb.kich_thuoc,
      mau_ma: v.mau_ma ?? null,
      thu_muc_id: v.thu_muc_id,
      thu_muc: tm.ten,
      thu_muc_don_vi: tm.don_vi_id,
      vi_tri_id: viTriId,
      ...(v.ket_qua_kiem_tra ? { kiem_tra_dat: v.ket_qua_kiem_tra.dat } : {}),
      ...(v.lien_quan_den ? { lien_quan_den: v.lien_quan_den } : {}),
    },
  });
  return { tai_lieu_id: id, phien_ban: 1 };
}

/**
 * Tên hiển thị sau khi thêm bản mới. Quy tắc: tên tài liệu đi theo tên file của phiên bản hiện tại
 * khi tên đang là tên file của một bản trước (tên tự đặt lúc tải lên). Tên người dùng tự đặt
 * (vd trích yếu văn thư nhập) thì giữ. Mỗi bản vẫn giữ ten_tep riêng trong phien_ban_tep.
 */
export function tenSauPhienBanMoi(tenHienTai: string, tenTepCu: string[], tenTepMoi: string): string {
  const moi = tenTepMoi.trim();
  if (!moi) return tenHienTai;
  return tenTepCu.includes(tenHienTai) ? moi : tenHienTai;
}

/**
 * Thêm phiên bản mới (bản 2, 3...). Bản cũ giữ nguyên trong lịch sử. Ghi lịch sử 'tai_len'.
 * Tên tài liệu đổi theo tên file bản mới (tenSauPhienBanMoi); đổi thì chi_tiet có ten_cu → ten.
 */
export async function themPhienBan(
  q: Q,
  taiLieuId: string,
  v: { nguoi: string; tep: TepTaiLen; ket_qua_kiem_tra?: KetQuaKiemTra | null; ky_bao_cao?: KyBaoCao | null },
): Promise<number> {
  const { rows } = await q.query<{ id: string; ten: string; don_vi_lap: string | null }>(
    "SELECT id, ten, don_vi_lap FROM docflow.tai_lieu WHERE id = $1 FOR UPDATE",
    [taiLieuId],
  );
  if (!rows[0]) throw new LoiHttp(404, "Không tìm thấy tài liệu");
  const mx = await q.query<{ n: number | string | null }>(
    "SELECT max(phien_ban) AS n FROM docflow.phien_ban_tep WHERE tai_lieu_id = $1",
    [taiLieuId],
  );
  const moi = Number(mx.rows[0]?.n ?? 0) + 1;
  const cu = await q.query<{ ten_tep: string }>("SELECT DISTINCT ten_tep FROM docflow.phien_ban_tep WHERE tai_lieu_id = $1", [taiLieuId]);
  const tenCu = rows[0].ten;
  const tenMoi = tenSauPhienBanMoi(tenCu, cu.rows.map((r) => r.ten_tep), v.tep.ten_tep);
  const pb = await luuPhienBan(q, taiLieuId, moi, v.nguoi, v.tep, v.ket_qua_kiem_tra);
  await q.query(
    `UPDATE docflow.tai_lieu SET phien_ban_hien_tai = $2, ky_bao_cao = COALESCE($3::jsonb, ky_bao_cao), ten = $4 WHERE id = $1`,
    [taiLieuId, moi, v.ky_bao_cao ? JSON.stringify(v.ky_bao_cao) : null, tenMoi],
  );
  await ghiLichSu(q, {
    nguoi: v.nguoi,
    don_vi_id: rows[0].don_vi_lap,
    doi_tuong_loai: "tai_lieu",
    doi_tuong_id: taiLieuId,
    hanh_dong: "tai_len",
    chi_tiet: {
      phien_ban: moi,
      ten_tep: v.tep.ten_tep,
      sha256: pb.sha256,
      kich_thuoc: pb.kich_thuoc,
      ...(v.ket_qua_kiem_tra ? { kiem_tra_dat: v.ket_qua_kiem_tra.dat } : {}),
      ...(tenMoi !== tenCu ? { ten_cu: tenCu, ten: tenMoi } : {}),
    },
  });
  return moi;
}

/** Đặt tài liệu vào thư mục (Đến của nơi nhận, Đi của người gửi...). Đã có vị trí đang hoạt động thì trả lại id cũ. */
export async function datVaoThuMuc(
  q: Q,
  v: { tai_lieu_id: string; thu_muc_id: string; vai: "goc" | "den" | "di"; nguoi: string; nhan?: string | null },
): Promise<string> {
  const co = await q.query<{ id: string }>(
    "SELECT id FROM docflow.vi_tri WHERE tai_lieu_id = $1 AND thu_muc_id = $2 AND NOT da_xoa ORDER BY them_luc LIMIT 1",
    [v.tai_lieu_id, v.thu_muc_id],
  );
  if (co.rows[0]) {
    if (v.nhan !== undefined) await q.query("UPDATE docflow.vi_tri SET nhan = $2 WHERE id = $1", [co.rows[0].id, v.nhan]);
    return co.rows[0].id;
  }
  const id = taoMa("vt");
  await q.query(
    "INSERT INTO docflow.vi_tri (id, tai_lieu_id, thu_muc_id, vai, nhan, them_boi) VALUES ($1,$2,$3,$4,$5,$6)",
    [id, v.tai_lieu_id, v.thu_muc_id, v.vai, v.nhan ?? null, v.nguoi],
  );
  return id;
}

/** Gắn/bỏ nhãn (vd 'bi_tra_lai') cho vị trí của tài liệu trong một thư mục. */
export async function ganNhan(q: Q, v: { tai_lieu_id: string; thu_muc_id: string; nhan: string | null }): Promise<void> {
  await q.query("UPDATE docflow.vi_tri SET nhan = $3 WHERE tai_lieu_id = $1 AND thu_muc_id = $2 AND NOT da_xoa", [
    v.tai_lieu_id,
    v.thu_muc_id,
    v.nhan,
  ]);
}

export interface ViTriDayDu {
  id: string;
  tai_lieu_id: string;
  thu_muc_id: string;
  thu_muc_ten: string;
  don_vi_id: string;
  them_boi: string;
  nguoi_tai_len_dau: string | null;
  da_xoa: boolean;
  xoa_luc: string | Date | null;
}

/** Vị trí kèm đơn vị của thư mục + người tải lên bản 1 (để xét quyền). */
export async function layViTri(q: Q, viTriId: string): Promise<ViTriDayDu> {
  const { rows } = await q.query<ViTriDayDu>(
    `SELECT v.id, v.tai_lieu_id, v.thu_muc_id, t.ten AS thu_muc_ten, t.don_vi_id, v.them_boi, v.da_xoa, v.xoa_luc,
            (SELECT p.tai_len_boi FROM docflow.phien_ban_tep p WHERE p.tai_lieu_id = v.tai_lieu_id ORDER BY p.phien_ban LIMIT 1) AS nguoi_tai_len_dau
     FROM docflow.vi_tri v JOIN docflow.thu_muc t ON t.id = v.thu_muc_id WHERE v.id = $1`,
    [viTriId],
  );
  if (!rows[0]) throw new LoiHttp(404, "Không tìm thấy tài liệu trong thư mục");
  return rows[0];
}

/**
 * Có quyền `quyen` (xóa / khôi phục) trên một vị trí không. Chủ sở hữu = người tải lên bản đầu
 * hoặc người đặt vào thư mục này; đơn vị = đơn vị của thư mục.
 */
export function coQuyenViTri(
  nd: NguoiDungPhien,
  quyen: "tai_lieu.xoa" | "tai_lieu.khoi_phuc",
  vt: Pick<ViTriDayDu, "don_vi_id" | "them_boi" | "nguoi_tai_len_dau">,
  cay: { id: string; cha_id: string | null }[],
): boolean {
  const chu = [vt.nguoi_tai_len_dau, vt.them_boi].filter((x): x is string => !!x);
  if (chu.length === 0) chu.push("");
  return chu.some((c) => coQuyen(nd, quyen, { chu_so_huu: c || null, don_vi_id: vt.don_vi_id }, cay));
}

/** Xóa (vào thùng rác) theo quyền tai_lieu.xoa. Không có quyền → LoiHttp 403. Ghi lịch sử 'xoa'. */
export async function xoaViTri(q: Q, nd: NguoiDungPhien, viTriId: string): Promise<void> {
  const vt = await layViTri(q, viTriId);
  if (vt.da_xoa) throw new LoiHttp(409, "Tài liệu này đã ở trong Thùng rác");
  const cay = await layCayDonVi(q, true);
  if (!coQuyenViTri(nd, "tai_lieu.xoa", vt, cay)) {
    throw new LoiHttp(403, "Bạn không có quyền xóa tài liệu này. Chỉ người tải lên, trưởng đơn vị của thư mục hoặc quản trị viên xóa được.");
  }
  await q.query("UPDATE docflow.vi_tri SET da_xoa = true, xoa_boi = $2, xoa_luc = now() WHERE id = $1", [viTriId, nd.id]);
  await ghiLichSu(q, {
    nguoi: nd.id,
    don_vi_id: nd.don_vi_id,
    doi_tuong_loai: "tai_lieu",
    doi_tuong_id: vt.tai_lieu_id,
    hanh_dong: "xoa",
    chi_tiet: { vi_tri_id: viTriId, thu_muc_id: vt.thu_muc_id, thu_muc: vt.thu_muc_ten, thu_muc_don_vi: vt.don_vi_id },
  });
}

/** Khôi phục từ thùng rác theo quyền tai_lieu.khoi_phuc. Ghi lịch sử 'khoi_phuc'. */
export async function khoiPhucViTri(q: Q, nd: NguoiDungPhien, viTriId: string): Promise<void> {
  const vt = await layViTri(q, viTriId);
  if (!vt.da_xoa) throw new LoiHttp(409, "Tài liệu này không nằm trong Thùng rác");
  const cay = await layCayDonVi(q, true);
  if (!coQuyenViTri(nd, "tai_lieu.khoi_phuc", vt, cay)) {
    throw new LoiHttp(403, "Bạn không có quyền khôi phục tài liệu này");
  }
  // Quá hạn giữ thùng rác: đã ẩn khỏi thư mục, chỉ quản trị viên kéo lại được (nội dung vẫn ở Lịch sử)
  const cfg = await layCauHinh(q, "thu_muc");
  if (vt.xoa_luc && !nd.la_quan_tri) {
    const han = new Date(vt.xoa_luc).getTime() + cfg.thung_rac_giu_ngay * 86400000;
    if (Date.now() > han) throw new LoiHttp(410, "Đã quá hạn giữ trong Thùng rác. Nội dung vẫn xem được trong Lịch sử.");
  }
  const trung = await q.query(
    "SELECT 1 FROM docflow.vi_tri WHERE tai_lieu_id = $1 AND thu_muc_id = $2 AND NOT da_xoa AND id <> $3 LIMIT 1",
    [vt.tai_lieu_id, vt.thu_muc_id, viTriId],
  );
  if (trung.rows.length > 0) throw new LoiHttp(409, "Tài liệu đã có lại trong thư mục " + vt.thu_muc_ten);
  await q.query("UPDATE docflow.vi_tri SET da_xoa = false, xoa_boi = NULL, xoa_luc = NULL WHERE id = $1", [viTriId]);
  await ghiLichSu(q, {
    nguoi: nd.id,
    don_vi_id: nd.don_vi_id,
    doi_tuong_loai: "tai_lieu",
    doi_tuong_id: vt.tai_lieu_id,
    hanh_dong: "khoi_phuc",
    chi_tiet: { vi_tri_id: viTriId, thu_muc_id: vt.thu_muc_id, thu_muc: vt.thu_muc_ten, thu_muc_don_vi: vt.don_vi_id },
  });
}

export interface ThongTinPhienBan {
  tai_lieu_id: string;
  phien_ban: number;
  ten_tep: string;
  mime: string;
  kich_thuoc: number;
  sha256: string;
  khoa_luu: string;
  tai_len_boi: string;
  tai_len_luc: string;
  ket_qua_kiem_tra: KetQuaKiemTra | null;
  /** true = bản đã cắt chương mật (bao-mat/loc.ts): sha256/kich_thuoc là của bản cắt, khoa_luu để trống */
  da_cat?: boolean;
}

/** Chuẩn hóa một dòng phien_ban_tep từ CSDL (bigint/Date khác nhau giữa pg và PGlite). */
export function chuanPhienBan(r: Record<string, unknown>): ThongTinPhienBan {
  const luc = r.tai_len_luc;
  return {
    tai_lieu_id: String(r.tai_lieu_id),
    phien_ban: Number(r.phien_ban),
    ten_tep: String(r.ten_tep),
    mime: String(r.mime),
    kich_thuoc: Number(r.kich_thuoc),
    sha256: String(r.sha256),
    khoa_luu: String(r.khoa_luu),
    tai_len_boi: String(r.tai_len_boi),
    tai_len_luc: luc instanceof Date ? luc.toISOString() : new Date(String(luc)).toISOString(),
    ket_qua_kiem_tra: (r.ket_qua_kiem_tra as KetQuaKiemTra | null) ?? null,
  };
}

/**
 * Đọc một phiên bản (mặc định bản hiện tại) kèm nội dung file — kể cả tài liệu đã xóa khỏi thư mục.
 * BẢO MẬT TÀI CHÍNH (Mr. Đại chốt 07/10/2026): `nguoi` = ai đang đọc. Bỏ trống / null (AI chạy ngầm, agent khác, code không rõ người)
 * → báo cáo mẫu mật trả BẢN ĐÃ CẮT chương mật. Người đăng nhập → cắt trừ khi có tên trong danh sách hoặc tự tải bản đó lên.
 * MAY_DOC_TOAN_VAN chỉ cho code máy không đưa chữ ra ngoài. Cắt hỏng → 403 (không rơi về tệp gốc).
 */
export async function docPhienBan(
  q: Q,
  taiLieuId: string,
  phienBan?: number,
  nguoi: NguoiDoc = null,
): Promise<{ thong_tin: ThongTinPhienBan; noi_dung: Buffer }> {
  const { rows } = await q.query<Record<string, unknown>>(
    `SELECT p.*, t.mau_ma AS tl_mau_ma FROM docflow.phien_ban_tep p JOIN docflow.tai_lieu t ON t.id = p.tai_lieu_id
     WHERE p.tai_lieu_id = $1 AND p.phien_ban = COALESCE($2::int, t.phien_ban_hien_tai)`,
    [taiLieuId, phienBan ?? null],
  );
  if (!rows[0]) throw new LoiHttp(404, phienBan ? `Không có bản ${phienBan} của tài liệu này` : "Không tìm thấy tài liệu");
  if (rows[0].xoa_luc)
    throw new LoiHttp(
      410,
      `Bản ${String(rows[0].phien_ban)} đã bị nộp đè quá 90 ngày nên file đã xoá. Bản cuối của tài liệu vẫn mở được.`,
    );
  const goc = chuanPhienBan(rows[0]);
  const kq = await locBaoMat(q, (rows[0].tl_mau_ma as string | null) ?? null, goc, await docTep(goc.khoa_luu), nguoi);
  return { thong_tin: kq.thong_tin.da_cat ? { ...kq.thong_tin, khoa_luu: "" } : kq.thong_tin, noi_dung: kq.noi_dung };
}

/**
 * Đọc TOÀN VĂN cho việc của chính người đang đăng nhập (đánh dấu lỗi, sửa lỗi, kiểm tra lại, góp ý…). Người chỉ được xem
 * bản cắt → 403 kèm câu từ chối: làm trên bản cắt rồi ghi lại là mất chương mật vĩnh viễn (sửa lỗi lưu bản mới).
 */
export async function docPhienBanDu(
  q: Q,
  taiLieuId: string,
  phienBan: number | undefined,
  nd: NguoiDungPhien,
): Promise<{ thong_tin: ThongTinPhienBan; noi_dung: Buffer }> {
  const kq = await docPhienBan(q, taiLieuId, phienBan, nd);
  if (kq.thong_tin.da_cat) throw new LoiHttp(403, await cauChanBanCat(q));
  return kq;
}
