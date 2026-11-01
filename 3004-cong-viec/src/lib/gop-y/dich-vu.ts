// ============================================================
// gop-y/dich-vu.ts — GÓP Ý, PHẢN ÁNH (Mr. Đại chốt 01/10/2026). CHỈ SERVER.
// Mẫu: "Vấn đề phát sinh" của agent Tiến độ 3003 (tên + mô tả + dán ảnh). Khác 3003: nhiều người dùng, chạy trên máy chủ →
// lưu CSDL (docflow.gop_y) + ảnh vào kho file (luu-tru/kho), không lưu file rời.
//   · Ai đăng nhập cũng gửi được và XEM ĐƯỢC MỌI góp ý (Mr. Đại chọn "ai cũng xem tất cả").
//   · Quản trị đặt trạng thái + một câu trả lời → người góp ý nhận chuông. Góp ý mới → chuông cho quản trị.
//   · Người gửi xoá được góp ý của mình khi còn "Mới"; quản trị xoá được mọi góp ý.
// ============================================================
import type { Q } from "@/lib/db";
import type { NguoiDungPhien } from "@/lib/types";
import { LoiHttp } from "@/lib/phien";
import { demTiep } from "@/lib/ma";
import { ghiTep } from "@/lib/luu-tru/kho";
import { taoThongBao } from "@/lib/thong-bao";

export const TRANG_THAI_GOP_Y = {
  moi: "Mới",
  da_tiep_nhan: "Đã tiếp nhận",
  da_sua: "Đã sửa",
  khong_lam: "Không làm",
} as const;
export type TrangThaiGopY = keyof typeof TRANG_THAI_GOP_Y;

export interface AnhGopY {
  khoa: string;
  ten: string;
  loai: string;
  kich_thuoc: number;
}
export interface GopY {
  id: string;
  tieu_de: string;
  noi_dung: string;
  trang: string | null;
  anh: AnhGopY[];
  nguoi: string;
  ten_nguoi: string;
  don_vi: string | null;
  trang_thai: TrangThaiGopY;
  tra_loi: string | null;
  ten_tra_loi: string | null;
  tra_loi_luc: string | null;
  tao_luc: string;
}

export const GIOI_HAN_ANH = { so: 6, byte: 8 * 1024 * 1024 };
const LOAI_ANH = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

const docJson = <T,>(v: unknown): T => (typeof v === "string" ? (JSON.parse(v) as T) : (v as T));
const iso = (d: unknown) => (d ? new Date(d as string).toISOString() : null);

export async function danhSachGopY(q: Q): Promise<GopY[]> {
  const { rows } = await q.query<Record<string, unknown>>(
    `SELECT g.*, n.ten AS ten_nguoi, d.ten_ngan AS ten_don_vi, t.ten AS ten_tra_loi
       FROM docflow.gop_y g
       LEFT JOIN identity.nguoi_dung n ON n.id = g.nguoi
       LEFT JOIN identity.don_vi d ON d.id = g.don_vi_id
       LEFT JOIN identity.nguoi_dung t ON t.id = g.tra_loi_boi
      ORDER BY g.tao_luc DESC`,
  );
  return rows.map((r) => ({
    id: String(r.id),
    tieu_de: String(r.tieu_de),
    noi_dung: String(r.noi_dung ?? ""),
    trang: (r.trang as string | null) ?? null,
    anh: docJson<AnhGopY[]>(r.anh) ?? [],
    nguoi: String(r.nguoi),
    ten_nguoi: String(r.ten_nguoi ?? r.nguoi),
    don_vi: (r.ten_don_vi as string | null) ?? null,
    trang_thai: (r.trang_thai as TrangThaiGopY) ?? "moi",
    tra_loi: (r.tra_loi as string | null) ?? null,
    ten_tra_loi: (r.ten_tra_loi as string | null) ?? null,
    tra_loi_luc: iso(r.tra_loi_luc),
    tao_luc: iso(r.tao_luc)!,
  }));
}

export async function guiGopY(
  q: Q,
  nd: NguoiDungPhien,
  v: { tieu_de: string; noi_dung: string; trang?: string | null; anh: { ten: string; loai: string; noi_dung: Buffer }[] },
): Promise<{ id: string }> {
  const tieuDe = (v.tieu_de ?? "").trim();
  if (!tieuDe) throw new LoiHttp(400, "Chưa có tên góp ý — ghi ngắn gọn để sau còn tìm lại");
  if (tieuDe.length > 200) throw new LoiHttp(400, "Tên góp ý dài quá 200 chữ — phần chi tiết ghi ở ô mô tả");
  if (v.anh.length > GIOI_HAN_ANH.so) throw new LoiHttp(400, `Tối đa ${GIOI_HAN_ANH.so} ảnh mỗi góp ý`);
  const anh: AnhGopY[] = [];
  for (const a of v.anh) {
    if (!LOAI_ANH.has(a.loai)) throw new LoiHttp(400, `"${a.ten}" không phải ảnh (nhận PNG, JPG, WEBP, GIF)`);
    if (a.noi_dung.length > GIOI_HAN_ANH.byte) throw new LoiHttp(413, `Ảnh "${a.ten}" quá 8 MB`);
    const { khoa, kich_thuoc } = await ghiTep(a.noi_dung);
    anh.push({ khoa, ten: a.ten, loai: a.loai, kich_thuoc });
  }
  const id = `GY-${String(await demTiep(q, "gop_y")).padStart(4, "0")}`;
  await q.query(
    `INSERT INTO docflow.gop_y (id, tieu_de, noi_dung, trang, anh, nguoi, don_vi_id) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7)`,
    [id, tieuDe, (v.noi_dung ?? "").trim(), v.trang ?? null, JSON.stringify(anh), nd.id, nd.don_vi_id ?? null],
  );
  await taoThongBao(q, {
    nguoi_nhan: "quan-tri",
    loai: "gop_y",
    noi_dung: `Góp ý mới ${id} của ${nd.ten}: ${tieuDe}`,
    lien_ket: `/gop-y?id=${id}`,
  });
  return { id };
}

export async function traLoiGopY(q: Q, nd: NguoiDungPhien, id: string, v: { trang_thai: string; tra_loi?: string | null }): Promise<void> {
  if (!nd.la_quan_tri) throw new LoiHttp(403, "Chỉ quản trị mới đặt trạng thái góp ý");
  if (!(v.trang_thai in TRANG_THAI_GOP_Y)) throw new LoiHttp(400, "Trạng thái không hợp lệ");
  const { rows } = await q.query<{ nguoi: string; tieu_de: string }>(
    `UPDATE docflow.gop_y SET trang_thai = $2, tra_loi = $3, tra_loi_boi = $4, tra_loi_luc = now() WHERE id = $1 RETURNING nguoi, tieu_de`,
    [id, v.trang_thai, (v.tra_loi ?? "").trim() || null, nd.id],
  );
  if (!rows[0]) throw new LoiHttp(404, "Không có góp ý này");
  if (rows[0].nguoi !== nd.id && v.trang_thai !== "moi") {
    const traLoi = (v.tra_loi ?? "").trim();
    await taoThongBao(q, {
      nguoi_nhan: rows[0].nguoi,
      loai: "gop_y",
      noi_dung: `Góp ý ${id} "${rows[0].tieu_de}" của bạn: ${TRANG_THAI_GOP_Y[v.trang_thai as TrangThaiGopY]}${traLoi ? ` — ${traLoi}` : ""}`,
      lien_ket: `/gop-y?id=${id}`,
    });
  }
}

export async function xoaGopY(q: Q, nd: NguoiDungPhien, id: string): Promise<void> {
  const { rows } = await q.query<{ nguoi: string; trang_thai: string }>("SELECT nguoi, trang_thai FROM docflow.gop_y WHERE id = $1", [id]);
  const g = rows[0];
  if (!g) throw new LoiHttp(404, "Không có góp ý này");
  const cuaToi = g.nguoi === nd.id && g.trang_thai === "moi";
  if (!nd.la_quan_tri && !cuaToi) throw new LoiHttp(403, "Chỉ xoá được góp ý của mình khi còn \"Mới\"");
  await q.query("DELETE FROM docflow.gop_y WHERE id = $1", [id]);
}

/** Ảnh thứ i của một góp ý (ai đăng nhập cũng xem được) */
export async function anhGopY(q: Q, id: string, i: number): Promise<AnhGopY | null> {
  const { rows } = await q.query<{ anh: unknown }>("SELECT anh FROM docflow.gop_y WHERE id = $1", [id]);
  return rows[0] ? (docJson<AnhGopY[]>(rows[0].anh)[i] ?? null) : null;
}
