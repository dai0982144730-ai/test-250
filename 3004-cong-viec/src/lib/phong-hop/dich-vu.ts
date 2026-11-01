// ============================================================
// phong-hop/dich-vu.ts — PHÒNG HỌP, phía máy chủ (CHỈ SERVER). Luật ở phong-hop/thuan.ts. Bảng db/89-phong-hop.sql.
//   · Ai cũng đặt được (không có lễ tân). Phòng đang có người đặt giờ đó thì từ chối, kể cả lãnh đạo (không giành phòng).
//   · Sửa / huỷ: người đặt hoặc quản trị. Đổi giờ, đổi phòng, huỷ → chuông báo lại người dự.
//   · Mời: danh sách người CHỐT lúc đặt; «cả phòng X» = người của phòng lúc đó. Người đặt cũng là người dự (đã xem).
//   · Giao ban (câu chốt A): bấm «Gửi thông báo» thì đặt luôn phòng cho buổi kế tiếp rồi mới báo; đã có buổi giao ban ngày đó thì cập nhật.
// ============================================================
import type { Q } from "@/lib/db";
import type { NguoiDungPhien } from "@/lib/types";
import { LoiHttp } from "@/lib/phien";
import { dauDonVi, nguoiCuaDonVi, taoThongBao } from "@/lib/thong-bao";
import {
  bayGioVN,
  cauTrung,
  conHien,
  cuocTrung,
  khoangGio,
  laMucMoi,
  loiDatHop,
  ngayGiaoBanKeTiep,
  ngayVN,
  phongTheoId,
  phut,
  MOC_BAT_DAU,
  MOC_KET_THUC,
  CHU_BUOI,
  type CuocHop,
  type HopCuaToi,
  type MucMoi,
  type NguoiDanhMuc,
  laDonViNgoaiVP,
  trangThaiCuoc,
  denKetThucSom,
  mocKetThucCho,
} from "./thuan";

const COT = `c.id::int AS id, c.phong, to_char(c.ngay, 'YYYY-MM-DD') AS ngay, c.tu, c.den, c.noi_dung, c.ghi_chu, c.khach_ngoai, c.duong_dan,
  c.loai, c.nguoi_dat, COALESCE(n.ten, c.nguoi_dat) AS nguoi_dat_ten`;

async function ganNguoiDu<T extends CuocHop>(q: Q, ds: T[]): Promise<T[]> {
  if (!ds.length) return ds;
  const { rows } = await q.query<{ cuoc_id: number; id: string; ten: string }>(
    `SELECT m.cuoc_id::int AS cuoc_id, m.nguoi_id AS id, COALESCE(n.ten, m.nguoi_id) AS ten
       FROM docflow.phong_hop_moi m LEFT JOIN identity.nguoi_dung n ON n.id = m.nguoi_id
      WHERE m.cuoc_id = ANY($1::bigint[]) ORDER BY n.ten`,
    [ds.map((c) => c.id)],
  );
  for (const c of ds) c.moi = rows.filter((r) => r.cuoc_id === c.id).map((r) => ({ id: r.id, ten: r.ten }));
  return ds;
}

/** Cuộc họp còn hiệu lực của các ngày [tu, den] */
export async function cuocTheoNgay(q: Q, tu: string, den: string = tu): Promise<CuocHop[]> {
  const { rows } = await q.query<CuocHop>(
    `SELECT ${COT} FROM docflow.phong_hop_cuoc c LEFT JOIN identity.nguoi_dung n ON n.id = c.nguoi_dat
      WHERE c.huy_luc IS NULL AND c.ngay BETWEEN $1::date AND $2::date ORDER BY c.ngay, c.tu`,
    [tu, den],
  );
  return ganNguoiDu(q, rows.map((r) => ({ ...r, moi: [] })));
}

async function motCuoc(q: Q, id: number): Promise<CuocHop | null> {
  const { rows } = await q.query<CuocHop>(
    `SELECT ${COT} FROM docflow.phong_hop_cuoc c LEFT JOIN identity.nguoi_dung n ON n.id = c.nguoi_dat WHERE c.id = $1 AND c.huy_luc IS NULL`,
    [id],
  );
  if (!rows[0]) return null;
  return (await ganNguoiDu(q, [{ ...rows[0], moi: [] }]))[0];
}

// ---------------- mời ----------------
/**
 * Phòng họp ở VĂN PHÒNG công ty (Mr. Đại chốt 25/10/2026): bỏ khỏi danh sách mời các đơn vị không ngồi ở văn phòng — nhà máy đang
 * vận hành («NM …», «Nhà máy …») và Ban điều hành tổng thầu («BĐH …», «Ban điều hành …») — kể cả đơn vị con của chúng.
 * Luật tên ở thuan.ts laDonViNgoaiVP (một chỗ).
 */
async function donViNgoaiVP(q: Q): Promise<Set<string>> {
  const { rows } = await q.query<{ id: string; ten: string; ten_ngan: string; cha_id: string | null }>("SELECT id, ten, ten_ngan, cha_id FROM identity.don_vi");
  const ngoai = new Set(rows.filter((d) => laDonViNgoaiVP(d)).map((d) => d.id));
  for (let doi = true; doi; ) {
    doi = false;
    for (const d of rows) if (!ngoai.has(d.id) && d.cha_id && ngoai.has(d.cha_id)) (ngoai.add(d.id), (doi = true));
  }
  return ngoai;
}
/** Người ngồi ở văn phòng: có ít nhất một đơn vị (chính hoặc kiêm nhiệm) không thuộc nhóm ngoài văn phòng; chưa gán đơn vị thì giữ */
async function locNguoiOVP(q: Q, ids: string[]): Promise<string[]> {
  if (!ids.length) return ids;
  const ngoai = await donViNgoaiVP(q);
  const { rows } = await q.query<{ id: string; dv: string[] }>(
    `SELECT n.id, array_remove(array_cat(ARRAY[n.don_vi_id], COALESCE((SELECT array_agg(k.don_vi_id) FROM identity.kiem_nhiem k WHERE k.nguoi_dung_id = n.id), '{}')), NULL) AS dv
       FROM identity.nguoi_dung n WHERE n.active AND n.id = ANY($1::text[])`,
    [ids],
  );
  return rows.filter((r) => !r.dv.length || r.dv.some((d) => !ngoai.has(d))).map((r) => r.id);
}
/** Người của nhóm đặc biệt: bld = người ở các đơn vị chức danh lãnh đạo · truong_phong = đầu các đơn vị loại «phòng» */
async function nguoiCuaNhom(q: Q, nhom: string): Promise<string[]> {
  if (nhom === "bld") {
    const { rows } = await q.query<{ id: string }>(
      `SELECT n.id FROM identity.nguoi_dung n WHERE n.active AND (n.don_vi_id IN (SELECT id FROM identity.don_vi WHERE loai = 'chuc_danh' AND active)
          OR n.id IN (SELECT k.nguoi_dung_id FROM identity.kiem_nhiem k JOIN identity.don_vi d ON d.id = k.don_vi_id WHERE d.loai = 'chuc_danh' AND d.active))`,
    );
    return rows.map((r) => r.id);
  }
  if (nhom === "truong_phong") {
    const { rows } = await q.query<{ id: string }>("SELECT id FROM identity.don_vi WHERE loai = 'phong' AND active ORDER BY thu_tu");
    const ra: string[] = [];
    for (const d of rows) ra.push(...(await dauDonVi(q, d.id)));
    return [...new Set(ra)];
  }
  return [];
}
/** Bung danh sách mục mời (nhóm · cả đơn vị · từng người) thành mã người — chỉ người đang làm việc */
export async function bungMoi(q: Q, muc: MucMoi[]): Promise<string[]> {
  const ra = new Set<string>();
  for (const m of muc) {
    if (m.loai === "nguoi") ra.add(m.id);
    else if (m.loai === "don_vi") for (const id of await nguoiCuaDonVi(q, m.id)) ra.add(id);
    else for (const id of await nguoiCuaNhom(q, m.id)) ra.add(id);
  }
  // chỉ người đang làm việc VÀ ngồi ở văn phòng (bỏ người chỉ thuộc nhà máy / Ban điều hành tổng thầu)
  return locNguoiOVP(q, [...ra]);
}

/** Danh mục để chọn người mời: người (kèm đơn vị) · đơn vị · nhóm đặc biệt (kèm số người) */
export async function danhMucMoi(q: Q): Promise<{
  nguoi: NguoiDanhMuc[];
  don_vi: { id: string; ten: string; ten_ngan: string; so: number; ids: string[] }[];
  nhom: { id: string; ten: string; so: number; ids: string[] }[];
}> {
  // bld = đơn vị chức danh lãnh đạo người đó giữ (chính hoặc kiêm nhiệm) — để xếp ghế chủ toạ, vẽ vòng trên đầu (thuan.ts xepGhe)
  const { rows: nguoi } = await q.query<NguoiDanhMuc>(
    `SELECT n.id, n.ten, d.ten_ngan AS don_vi, n.chuc_vu,
            COALESCE(CASE WHEN d.loai = 'chuc_danh' THEN d.id END,
              (SELECT k.don_vi_id FROM identity.kiem_nhiem k JOIN identity.don_vi d2 ON d2.id = k.don_vi_id
                WHERE k.nguoi_dung_id = n.id AND d2.loai = 'chuc_danh' ORDER BY d2.thu_tu LIMIT 1)) AS bld
       FROM identity.nguoi_dung n LEFT JOIN identity.don_vi d ON d.id = n.don_vi_id
      WHERE n.active ORDER BY n.ten`,
  );
  const { rows: dv } = await q.query<{ id: string; ten: string; ten_ngan: string; cap: number }>(
    "SELECT id, ten, ten_ngan, cap FROM identity.don_vi WHERE active AND loai IN ('ban_tgd', 'phong', 'don_vi') ORDER BY cap, thu_tu, ten_ngan",
  );
  const ngoai = await donViNgoaiVP(q);
  const oVP = new Set(await locNguoiOVP(q, nguoi.map((n) => n.id)));
  const don_vi = [];
  for (const d of dv.filter((x) => !ngoai.has(x.id))) {
    // ids: để giao diện tính đúng người dự (cảnh báo trùng giờ, quá số ghế) trước khi bấm đặt — 52 người, 31 đơn vị: nhẹ
    const ids = (await nguoiCuaDonVi(q, d.id)).filter((x) => oVP.has(x));
    if (ids.length) don_vi.push({ id: d.id, ten: d.ten, ten_ngan: d.ten_ngan, so: ids.length, ids });
  }
  const nhom = [];
  for (const n of [
    { id: "bld", ten: "Ban lãnh đạo" },
    { id: "truong_phong", ten: "Trưởng các phòng" },
  ]) {
    const ids = (await nguoiCuaNhom(q, n.id)).filter((x) => oVP.has(x));
    nhom.push({ ...n, so: ids.length, ids });
  }
  return { nguoi: nguoi.filter((n) => oVP.has(n.id)), don_vi, nhom };
}

// ---------------- đặt · sửa · huỷ ----------------
export interface DatHopBody {
  phong?: unknown;
  ngay?: unknown;
  tu?: unknown;
  den?: unknown;
  noi_dung?: unknown;
  ghi_chu?: unknown;
  khach_ngoai?: unknown;
  duong_dan?: unknown;
  moi?: unknown;
}
const chu = (x: unknown, dai = 500): string => (typeof x === "string" ? x.trim().slice(0, dai) : "");
function docDat(b: DatHopBody) {
  return {
    phong: chu(b.phong, 10),
    ngay: chu(b.ngay, 10),
    tu: chu(b.tu, 5),
    den: chu(b.den, 5),
    noi_dung: chu(b.noi_dung, 300),
    ghi_chu: chu(b.ghi_chu, 2000) || null,
    khach_ngoai: chu(b.khach_ngoai, 500) || null,
    duong_dan: chu(b.duong_dan, 500) || null,
    moi: Array.isArray(b.moi) ? (b.moi.filter(laMucMoi) as MucMoi[]).slice(0, 300) : [],
  };
}

async function ghiMoi(q: Q, cuocId: number, nguoi: string[], nguoiDat: string): Promise<void> {
  for (const id of new Set([...nguoi, nguoiDat]))
    await q.query(
      `INSERT INTO docflow.phong_hop_moi (cuoc_id, nguoi_id, xem_luc) VALUES ($1, $2, CASE WHEN $2 = $3 THEN now() END) ON CONFLICT DO NOTHING`,
      [cuocId, id, nguoiDat],
    );
}

/** Khoá ghi theo phòng + ngày trong giao dịch — hai người bấm đặt cùng lúc thì người sau thấy cuộc của người trước */
async function khoaPhong(q: Q, phong: string, ngay: string): Promise<void> {
  await q.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`phong-hop:${phong}:${ngay}`]);
}

export async function datHop(q: Q, nd: NguoiDungPhien, b: DatHopBody, loai: "thuong" | "giao_ban" = "thuong"): Promise<CuocHop> {
  const v = docDat(b);
  const loi = loiDatHop(v);
  if (loi) throw new LoiHttp(400, loi);
  await khoaPhong(q, v.phong, v.ngay);
  const trung = cuocTrung(await cuocTheoNgay(q, v.ngay), v);
  if (trung) throw new LoiHttp(409, cauTrung(trung));
  const { rows } = await q.query<{ id: number }>(
    `INSERT INTO docflow.phong_hop_cuoc (phong, ngay, tu, den, noi_dung, ghi_chu, khach_ngoai, duong_dan, loai, nguoi_dat)
     VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id::int AS id`,
    [v.phong, v.ngay, v.tu, v.den, v.noi_dung, v.ghi_chu, v.khach_ngoai, v.duong_dan, loai, nd.id],
  );
  await ghiMoi(q, rows[0].id, await bungMoi(q, v.moi), nd.id);
  return (await motCuoc(q, rows[0].id))!;
}

function duocSua(nd: NguoiDungPhien, c: CuocHop, chiKhiChuaHop = true): void {
  if (c.nguoi_dat !== nd.id && !nd.la_quan_tri) throw new LoiHttp(403, `Chỉ ${c.nguoi_dat_ten} (người đặt) hoặc quản trị mới sửa, huỷ được cuộc họp này`);
  // Cuộc họp đã bắt đầu hoặc đã xong: không sửa giờ, không huỷ — đang họp thì chỉ «Kết thúc sớm» (Mr. Đại 25/10/2026)
  const tt = trangThaiCuoc(c);
  if (chiKhiChuaHop && tt !== "sap")
    throw new LoiHttp(409, tt === "dang" ? "Cuộc họp đang diễn ra — không sửa giờ hay huỷ được, chỉ «Kết thúc sớm»" : "Cuộc họp đã xong — không sửa, huỷ được nữa");
}

async function baoNguoiDu(q: Q, c: CuocHop, nd: NguoiDungPhien, noi_dung: string): Promise<void> {
  for (const m of c.moi) if (m.id !== nd.id) await taoThongBao(q, { nguoi_nhan: m.id, loai: "phong_hop", noi_dung, lien_ket: `/phong-hop?ngay=${c.ngay}` });
}

/** Sửa: đổi giờ / phòng / nội dung / thêm người. Đổi giờ hoặc phòng → mọi người dự xem lại (dòng chữ đỏ nhấp nháy) + chuông báo */
export async function suaHop(q: Q, nd: NguoiDungPhien, id: number, b: DatHopBody): Promise<CuocHop> {
  const cu = await motCuoc(q, id);
  if (!cu) throw new LoiHttp(404, "Cuộc họp không còn (đã huỷ hoặc không có)");
  duocSua(nd, cu);
  const v = docDat(b);
  const loi = loiDatHop(v);
  if (loi) throw new LoiHttp(400, loi);
  await khoaPhong(q, v.phong, v.ngay);
  const trung = cuocTrung(await cuocTheoNgay(q, v.ngay), v, id);
  if (trung) throw new LoiHttp(409, cauTrung(trung));
  await q.query(
    `UPDATE docflow.phong_hop_cuoc SET phong = $2, ngay = $3::date, tu = $4, den = $5, noi_dung = $6, ghi_chu = $7, khach_ngoai = $8,
       duong_dan = $9, sua_luc = now() WHERE id = $1`,
    [id, v.phong, v.ngay, v.tu, v.den, v.noi_dung, v.ghi_chu, v.khach_ngoai, v.duong_dan],
  );
  // Danh sách người dự gửi lên là danh sách MỚI: bỏ người không còn, thêm người mới
  const moi = new Set([...(await bungMoi(q, v.moi)), cu.nguoi_dat]);
  const bo = cu.moi.filter((m) => !moi.has(m.id));
  if (bo.length) await q.query("DELETE FROM docflow.phong_hop_moi WHERE cuoc_id = $1 AND nguoi_id = ANY($2::text[])", [id, bo.map((m) => m.id)]);
  await ghiMoi(q, id, [...moi], cu.nguoi_dat);
  const doiGio = cu.phong !== v.phong || cu.ngay !== v.ngay || cu.tu !== v.tu || cu.den !== v.den;
  const sau = (await motCuoc(q, id))!;
  if (doiGio) {
    await q.query("UPDATE docflow.phong_hop_moi SET xem_luc = NULL WHERE cuoc_id = $1 AND nguoi_id <> $2", [id, nd.id]);
    await baoNguoiDu(
      q,
      sau,
      nd,
      `${nd.ten} đổi cuộc họp «${sau.noi_dung}» sang ${phongTheoId(sau.phong)?.ten} ${khoangGio(sau.tu, sau.den)} ngày ${ngayVN(sau.ngay)} (trước: ${phongTheoId(cu.phong)?.ten} ${khoangGio(cu.tu, cu.den)} ngày ${ngayVN(cu.ngay)})`,
    );
  }
  for (const m of bo) await taoThongBao(q, { nguoi_nhan: m.id, loai: "phong_hop", noi_dung: `${nd.ten} bỏ bạn khỏi cuộc họp «${cu.noi_dung}» ${cu.tu} ngày ${ngayVN(cu.ngay)}`, lien_ket: null });
  return sau;
}

/** Kết thúc sớm cuộc đang họp: giờ kết thúc = mốc 30 phút kế tiếp, trả phòng phần còn lại; báo người dự */
export async function ketThucSom(q: Q, nd: NguoiDungPhien, id: number): Promise<CuocHop> {
  const c = await motCuoc(q, id);
  if (!c) throw new LoiHttp(404, "Cuộc họp không còn (đã huỷ hoặc không có)");
  duocSua(nd, c, false);
  if (trangThaiCuoc(c) !== "dang") throw new LoiHttp(409, "Chỉ kết thúc sớm được cuộc họp đang diễn ra");
  const den = denKetThucSom();
  if (phut(den) >= phut(c.den)) throw new LoiHttp(409, `Cuộc họp đã sắp hết giờ (${c.den}) — không cần kết thúc sớm`);
  await q.query("UPDATE docflow.phong_hop_cuoc SET den = $2, sua_luc = now() WHERE id = $1", [id, den]);
  const sau = (await motCuoc(q, id))!;
  await baoNguoiDu(q, sau, nd, `${nd.ten} kết thúc sớm cuộc họp «${sau.noi_dung}» lúc ${den} (trước: tới ${c.den}) — ${phongTheoId(sau.phong)?.ten} trống từ ${den}`);
  return sau;
}

export async function huyHop(q: Q, nd: NguoiDungPhien, id: number): Promise<void> {
  const c = await motCuoc(q, id);
  if (!c) throw new LoiHttp(404, "Cuộc họp không còn (đã huỷ hoặc không có)");
  duocSua(nd, c);
  await q.query("UPDATE docflow.phong_hop_cuoc SET huy_luc = now() WHERE id = $1", [id]);
  await baoNguoiDu(q, c, nd, `${nd.ten} huỷ cuộc họp «${c.noi_dung}» ${phongTheoId(c.phong)?.ten} ${khoangGio(c.tu, c.den)} ngày ${ngayVN(c.ngay)}`);
}

// ---------------- của tôi (dòng chữ đỏ ở thanh trên) ----------------
export async function hopCuaToi(q: Q, nguoiId: string): Promise<HopCuaToi[]> {
  const bay = bayGioVN();
  const { rows } = await q.query<CuocHop & { da_xem: boolean }>(
    `SELECT ${COT}, (m.xem_luc IS NOT NULL) AS da_xem
       FROM docflow.phong_hop_moi m JOIN docflow.phong_hop_cuoc c ON c.id = m.cuoc_id LEFT JOIN identity.nguoi_dung n ON n.id = c.nguoi_dat
      WHERE m.nguoi_id = $1 AND c.huy_luc IS NULL AND c.ngay >= $2::date ORDER BY c.ngay, c.tu LIMIT 50`,
    [nguoiId, bay.ngay],
  );
  const ds = await ganNguoiDu(q, rows.map((r) => ({ ...r, moi: [] })).filter((c) => conHien(c, bay)));
  return ds;
}
export async function daXemHop(q: Q, nguoiId: string, ids: number[]): Promise<void> {
  if (ids.length) await q.query("UPDATE docflow.phong_hop_moi SET xem_luc = now() WHERE nguoi_id = $1 AND cuoc_id = ANY($2::bigint[]) AND xem_luc IS NULL", [nguoiId, ids]);
}

// ---------------- giao ban ----------------
export interface CauHinhGiaoBan {
  thu: number;
  tu: string;
  den: string;
  phong: string;
  thanh_phan: MucMoi[];
  noi_dung: string;
  sua_boi_ten: string | null;
  sua_luc: string | null;
}
export async function layGiaoBan(q: Q): Promise<CauHinhGiaoBan> {
  const { rows } = await q.query<CauHinhGiaoBan>(
    `SELECT g.thu, g.tu, g.den, g.phong, g.thanh_phan, g.noi_dung, n.ten AS sua_boi_ten, to_char(g.sua_luc AT TIME ZONE 'UTC' + interval '7 hours', 'DD/MM/YYYY HH24:MI') AS sua_luc
       FROM docflow.phong_hop_giao_ban g LEFT JOIN identity.nguoi_dung n ON n.id = g.sua_boi WHERE g.id = 1`,
  );
  return rows[0] ?? { thu: 1, tu: "15:00", den: "17:00", phong: "p09", thanh_phan: [{ loai: "nhom", id: "bld" }, { loai: "nhom", id: "truong_phong" }], noi_dung: "Họp giao ban tuần", sua_boi_ten: null, sua_luc: null };
}

/** Ai sửa / gửi giao ban: Ban lãnh đạo · trưởng các phòng · quản trị (người khác chỉ xem — 3004 ẩn nút không quyền) */
export async function duocLapGiaoBan(q: Q, nd: NguoiDungPhien): Promise<boolean> {
  if (nd.la_quan_tri) return true;
  return (await nguoiCuaNhom(q, "bld")).includes(nd.id) || (await nguoiCuaNhom(q, "truong_phong")).includes(nd.id);
}

function docGiaoBan(b: Record<string, unknown>): Omit<CauHinhGiaoBan, "sua_boi_ten" | "sua_luc"> {
  const thu = Number(b.thu);
  const v = {
    thu,
    tu: chu(b.tu, 5),
    den: chu(b.den, 5),
    phong: chu(b.phong, 10),
    thanh_phan: Array.isArray(b.thanh_phan) ? (b.thanh_phan.filter(laMucMoi) as MucMoi[]) : [],
    noi_dung: chu(b.noi_dung, 300) || "Họp giao ban tuần",
  };
  if (!Number.isInteger(thu) || thu < 1 || thu > 7) throw new LoiHttp(400, "Chưa chọn ngày họp trong tuần");
  if (!MOC_BAT_DAU.includes(v.tu) || !mocKetThucCho(v.tu).includes(v.den)) throw new LoiHttp(400, `Giờ họp trong giờ làm việc ${CHU_BUOI}, bước 30 phút, kết thúc sau bắt đầu`);
  if (!phongTheoId(v.phong)) throw new LoiHttp(400, "Chưa chọn phòng họp");
  if (!v.thanh_phan.length) throw new LoiHttp(400, "Chưa chọn thành phần tham gia");
  return v;
}

export async function luuGiaoBan(q: Q, nd: NguoiDungPhien, b: Record<string, unknown>): Promise<CauHinhGiaoBan> {
  if (!(await duocLapGiaoBan(q, nd))) throw new LoiHttp(403, "Chỉ Ban lãnh đạo, trưởng các phòng và quản trị mới sửa được lịch giao ban");
  const v = docGiaoBan(b);
  await q.query(
    `UPDATE docflow.phong_hop_giao_ban SET thu = $1, tu = $2, den = $3, phong = $4, thanh_phan = $5::jsonb, noi_dung = $6, sua_boi = $7, sua_luc = now() WHERE id = 1`,
    [v.thu, v.tu, v.den, v.phong, JSON.stringify(v.thanh_phan), v.noi_dung, nd.id],
  );
  return layGiaoBan(q);
}

/** Lưu cấu hình + đặt phòng cho buổi giao ban kế tiếp + mọi người trong thành phần nhận dòng chữ đỏ (câu chốt A) */
export async function guiGiaoBan(q: Q, nd: NguoiDungPhien, b: Record<string, unknown>): Promise<{ cuoc: CuocHop; so_nguoi: number; cap_nhat: boolean }> {
  const g = await luuGiaoBan(q, nd, b);
  const ngay = ngayGiaoBanKeTiep(g.thu, g.tu);
  const body: DatHopBody = { phong: g.phong, ngay, tu: g.tu, den: g.den, noi_dung: g.noi_dung, moi: g.thanh_phan };
  const { rows } = await q.query<{ id: number }>(
    "SELECT id::int AS id FROM docflow.phong_hop_cuoc WHERE loai = 'giao_ban' AND huy_luc IS NULL AND ngay = $1::date ORDER BY id LIMIT 1",
    [ngay],
  );
  let cuoc: CuocHop;
  const capNhat = !!rows[0];
  if (rows[0]) {
    // Đã gửi buổi này rồi → cập nhật (giờ / phòng / thành phần), người dự xem lại. Người gửi lần này đứng tên để sửa được tiếp
    await q.query("UPDATE docflow.phong_hop_cuoc SET nguoi_dat = $2 WHERE id = $1", [rows[0].id, nd.id]);
    cuoc = await suaHop(q, nd, rows[0].id, body);
    await q.query("UPDATE docflow.phong_hop_moi SET xem_luc = NULL WHERE cuoc_id = $1 AND nguoi_id <> $2", [rows[0].id, nd.id]);
  } else cuoc = await datHop(q, nd, body, "giao_ban");
  return { cuoc, so_nguoi: cuoc.moi.length, cap_nhat: capNhat };
}
