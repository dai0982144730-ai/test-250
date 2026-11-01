// ============================================================
// dinh-kem/kho.ts — TỆP ĐÍNH KÈM VIỆC (CHỈ SERVER). Mr. Đại chốt 29/09/2026.
// · Kẹp file khi giao việc / báo xong / bình luận — bật tắt từng chỗ, dung lượng, số file, thời hạn lưu ở Cài đặt (dinh_kem).
// · Nội dung lưu KHO RIÊNG data/dinh-kem/<id> (hoặc DOCFLOW_DINH_KEM_DIR), TÁCH kho tài liệu data/files: trợ lý AI chỉ có
//   công cụ đọc kho tài liệu (ai/chat-tools.ts → thu-muc docPhienBan) → không đọc được file kẹp, không tốn token.
//   ⛔ Đừng thêm công cụ AI nào gọi docNoiDung ở đây.
// · Tải lên trước (chưa gắn việc), gắn khi bấm Giao / Báo xong / Gửi bình luận. Dòng chưa gắn quá 1 ngày thì dọn.
// · Hết hạn lưu: xóa nội dung, giữ dòng (xoa_luc) để màn ghi "đã xóa do hết hạn lưu".
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import type { Q } from "@/lib/db";
import type { NguoiDungPhien } from "@/lib/types";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { LoiHttp } from "@/lib/phien";
import { xoaChuongCuaViec } from "@/lib/thong-bao";
import { TEN_NOI, type NoiDinhKem, type TepDinhKem } from "./chung";

const NOI: NoiDinhKem[] = ["giao_viec", "bao_xong", "binh_luan"];

function goc(): string {
  return process.env.DOCFLOW_DINH_KEM_DIR || path.join(process.cwd(), "data", "dinh-kem");
}
function duongDan(id: string): string {
  if (!/^DK-[a-f0-9]{16}$/.test(id)) throw new LoiHttp(400, "Mã tệp đính kèm không hợp lệ");
  return path.join(goc(), id);
}

const SQL = `SELECT id, ten_tep, mime, kich_thuoc::int AS kich_thuoc, noi, tai_len_boi,
  to_char(luc AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS luc, phan_viec_id, binh_luan_id::int AS binh_luan_id,
  to_char(xoa_luc AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS xoa_luc, cong_viec_id
  FROM docflow.tep_dinh_kem`;

/** Một file vừa chọn → lưu kho + dòng chưa gắn việc. Kiểm bật/tắt + dung lượng theo Cài đặt. */
export async function taiLenDinhKem(q: Q, nd: NguoiDungPhien, noi: string, f: { ten: string; mime: string; buf: Buffer }): Promise<TepDinhKem> {
  if (!NOI.includes(noi as NoiDinhKem)) throw new LoiHttp(400, "Chỗ kẹp file không hợp lệ");
  const ch = await layCauHinh(q, "dinh_kem");
  if (!ch[noi as NoiDinhKem]) throw new LoiHttp(403, `Kẹp file khi ${TEN_NOI[noi as NoiDinhKem]} đang tắt trong Cài đặt`);
  const ten = path.basename(f.ten || "tep").slice(0, 200);
  if (f.buf.length === 0) throw new LoiHttp(400, `File "${ten}" rỗng`);
  if (f.buf.length > ch.toi_da_mb * 1024 * 1024) throw new LoiHttp(413, `File "${ten}" vượt ${ch.toi_da_mb} MB`);
  const id = `DK-${randomBytes(8).toString("hex")}`;
  const p = duongDan(id);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, f.buf);
  await q.query(
    "INSERT INTO docflow.tep_dinh_kem (id, noi, ten_tep, mime, kich_thuoc, tai_len_boi) VALUES ($1,$2,$3,$4,$5,$6)",
    [id, noi, ten, f.mime || "application/octet-stream", f.buf.length, nd.id],
  );
  return (await layTepDinhKem(q, id))!;
}

/**
 * Gắn các file đã tải lên vào việc (khi bấm Giao / Báo xong / Gửi bình luận). Chỉ file của chính người đó, chưa gắn, đúng chỗ.
 * Trả danh sách để đính kèm vào thông báo chuông.
 */
export async function ganDinhKem(
  q: Q,
  nd: NguoiDungPhien,
  ids: string[] | undefined,
  gan: { cong_viec_id: string; noi: NoiDinhKem; phan_viec_id?: string | null; binh_luan_id?: number | null },
): Promise<{ id: string; ten: string }[]> {
  const ds = Array.from(new Set((ids ?? []).filter((x) => typeof x === "string")));
  if (!ds.length) return [];
  const ch = await layCauHinh(q, "dinh_kem");
  if (!ch[gan.noi]) throw new LoiHttp(403, `Kẹp file khi ${TEN_NOI[gan.noi]} đang tắt trong Cài đặt`);
  if (ds.length > ch.so_file_toi_da) throw new LoiHttp(400, `Mỗi lần kẹp tối đa ${ch.so_file_toi_da} file (đang ${ds.length})`);
  const { rows } = await q.query<{ id: string; ten_tep: string }>(
    `UPDATE docflow.tep_dinh_kem SET cong_viec_id = $2, phan_viec_id = $3, binh_luan_id = $4
      WHERE id = ANY($1::text[]) AND tai_len_boi = $5 AND cong_viec_id IS NULL AND noi = $6
      RETURNING id, ten_tep`,
    [ds, gan.cong_viec_id, gan.phan_viec_id ?? null, gan.binh_luan_id ?? null, nd.id, gan.noi],
  );
  if (rows.length !== ds.length) throw new LoiHttp(400, "Có file kẹp không còn (đã gắn chỗ khác hoặc quá hạn chờ) — chọn lại file");
  return rows.map((r) => ({ id: r.id, ten: r.ten_tep }));
}

export async function layTepDinhKem(q: Q, id: string): Promise<(TepDinhKem & { cong_viec_id: string | null }) | null> {
  const { rows } = await q.query<TepDinhKem & { cong_viec_id: string | null }>(`${SQL} WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

/** File kẹp của một việc (giao việc, báo xong, bình luận), cũ trước. */
export async function dinhKemCuaViec(q: Q, cvId: string): Promise<TepDinhKem[]> {
  const { rows } = await q.query<TepDinhKem>(`${SQL} WHERE cong_viec_id = $1 ORDER BY luc, id`, [cvId]);
  return rows;
}

/** Nội dung file — CHỈ cho route tải/xem của người dùng. ⛔ Không đưa vào công cụ AI. */
export function docNoiDungDinhKem(id: string): Buffer {
  const p = duongDan(id);
  if (!fs.existsSync(p)) throw new LoiHttp(410, "File đã bị xóa khỏi hệ thống");
  return fs.readFileSync(p);
}

/** Dọn: xóa nội dung file quá hạn lưu (giữ dòng) + file tải lên mà không gắn việc quá 1 ngày. Chạy trong vòng nền hằng ngày. */
export async function donDinhKem(q: Q, bayGio = new Date()): Promise<{ het_han: number; bo_do: number }> {
  const ch = await layCauHinh(q, "dinh_kem");
  const han = new Date(bayGio);
  han.setMonth(han.getMonth() - ch.luu_thang);
  const hetHan = await q.query<{ id: string }>(
    "UPDATE docflow.tep_dinh_kem SET xoa_luc = $2 WHERE xoa_luc IS NULL AND cong_viec_id IS NOT NULL AND luc < $1 RETURNING id",
    [han.toISOString(), bayGio.toISOString()],
  );
  const boDo = await q.query<{ id: string }>(
    "DELETE FROM docflow.tep_dinh_kem WHERE cong_viec_id IS NULL AND luc < $1 RETURNING id",
    [new Date(bayGio.getTime() - 24 * 3600 * 1000).toISOString()],
  );
  for (const r of [...hetHan.rows, ...boDo.rows]) fs.rmSync(duongDan(r.id), { force: true });
  return { het_han: hetHan.rows.length, bo_do: boDo.rows.length };
}

/**
 * Việc đã xong / đã hủy quá thời hạn lưu (cùng số tháng với file đính kèm — Mr. Đại chốt 30/09) thì XÓA HẲN khỏi hệ thống:
 * file kèm, bình luận, giai đoạn, mốc phụ thuộc, nhắc hạn, nguồn, phần việc, CHUÔNG của việc (3d — Mr. Đại duyệt 08/10), rồi dòng việc.
 * Sổ lịch sử giữ nguyên: chỉ ghi thêm, CSDL có trigger chặn xoá + chuỗi băm chống sửa lén (lich-su/ghi.ts).
 * Việc đang mở còn chờ mốc của việc sắp xóa (phụ thuộc chưa tính) thì CHƯA xóa việc mốc đó.
 */
export async function donViecHetHan(q: Q, bayGio = new Date()): Promise<{ so_viec: number; ma: string[] }> {
  const ch = await layCauHinh(q, "dinh_kem");
  const han = new Date(bayGio);
  han.setMonth(han.getMonth() - ch.luu_thang);
  const { rows } = await q.query<{ id: string }>(
    `SELECT c.id FROM docflow.cong_viec c
      WHERE c.trang_thai IN ('hoan_thanh','da_dong') AND c.dong_luc IS NOT NULL AND c.dong_luc < $1
        AND NOT EXISTS (SELECT 1 FROM docflow.phu_thuoc_viec f JOIN docflow.cong_viec m ON m.id = f.cong_viec_id
                         WHERE f.viec_truoc_id = c.id AND f.da_tinh IS NULL AND m.trang_thai = 'dang_mo')
      ORDER BY c.id`,
    [han.toISOString()],
  );
  const ma = rows.map((r) => r.id);
  if (!ma.length) return { so_viec: 0, ma };
  const tep = await q.query<{ id: string }>("DELETE FROM docflow.tep_dinh_kem WHERE cong_viec_id = ANY($1::text[]) RETURNING id", [ma]);
  await q.query("DELETE FROM docflow.binh_luan WHERE cong_viec_id = ANY($1::text[])", [ma]);
  await q.query("DELETE FROM docflow.giai_doan_viec WHERE cong_viec_id = ANY($1::text[])", [ma]);
  await q.query("DELETE FROM docflow.do_kho_viec WHERE cong_viec_id = ANY($1::text[])", [ma]);
  await q.query("DELETE FROM docflow.wbs_viec WHERE cong_viec_id = ANY($1::text[])", [ma]);
  await q.query("DELETE FROM docflow.lanh_dao_phoi_hop WHERE cong_viec_id = ANY($1::text[])", [ma]);
  await q.query("DELETE FROM docflow.phu_thuoc_viec WHERE cong_viec_id = ANY($1::text[])", [ma]);
  // Việc khác từng lấy việc này làm mốc (đã tính xong ngày): giữ tên mốc, bỏ liên kết
  await q.query("UPDATE docflow.phu_thuoc_viec SET viec_truoc_id = NULL WHERE viec_truoc_id = ANY($1::text[])", [ma]);
  await q.query("DELETE FROM docflow.nhac_han WHERE phan_viec_id IN (SELECT id FROM docflow.phan_viec WHERE cong_viec_id = ANY($1::text[]))", [ma]);
  await q.query("DELETE FROM docflow.nguon_cong_viec WHERE cong_viec_id = ANY($1::text[])", [ma]);
  await xoaChuongCuaViec(q, ma);
  await q.query("DELETE FROM docflow.phan_viec WHERE cong_viec_id = ANY($1::text[])", [ma]);
  await q.query("DELETE FROM docflow.cong_viec WHERE id = ANY($1::text[])", [ma]);
  for (const r of tep.rows) fs.rmSync(duongDan(r.id), { force: true });
  return { so_viec: ma.length, ma };
}

/** Dung lượng kho đính kèm (hiện ở Cài đặt) + chỗ trống ổ đĩa. */
export async function dungLuongDinhKem(q: Q): Promise<{ so_tep: number; tong_byte: number; da_xoa: number; o_trong_byte: number | null }> {
  const { rows } = await q.query<{ so_tep: number; tong_byte: string | null; da_xoa: number }>(
    `SELECT count(*) FILTER (WHERE xoa_luc IS NULL)::int AS so_tep, sum(kich_thuoc) FILTER (WHERE xoa_luc IS NULL) AS tong_byte,
            count(*) FILTER (WHERE xoa_luc IS NOT NULL)::int AS da_xoa FROM docflow.tep_dinh_kem`,
  );
  let trong: number | null = null;
  try {
    fs.mkdirSync(goc(), { recursive: true });
    const st = fs.statfsSync(goc());
    trong = Number(st.bavail) * Number(st.bsize);
  } catch {
    trong = null;
  }
  return { so_tep: rows[0].so_tep, tong_byte: Number(rows[0].tong_byte ?? 0), da_xoa: rows[0].da_xoa, o_trong_byte: trong };
}
