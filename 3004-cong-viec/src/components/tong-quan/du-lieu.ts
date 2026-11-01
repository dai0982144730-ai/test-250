// Dữ liệu trang Tổng quan (CHỈ SERVER, CHỈ ĐỌC). Đọc thẳng bảng để không phụ thuộc hàm module khác.
import type { Q } from "@/lib/db";
import type { NguoiDungPhien } from "@/lib/types";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { danhSachThongBao, demChuaDoc, type ThongBao } from "@/lib/thong-bao";
import { layCayDonVi } from "@sci/identity/don-vi";

export interface DongHopDen {
  buoc_id: string;
  tai_lieu_id: string;
  ten: string;
  mau_ma: string | null;
  loai: string;
  tu_don_vi: string | null;
  tu_nguoi: string;
  den_don_vi: string | null;
  ly_do: string | null;
  luc: string;
}

export interface DongPhanViec {
  id: string;
  cong_viec_id: string;
  ten_viec: string;
  noi_dung: string;
  du_an: string | null;
  phu_trach_loai: "nguoi" | "don_vi";
  phu_trach_ten: string;
  han: string | null;
  luon_mo: boolean;
  so_ngay_con: number | null;
  cho_sua: boolean;
}

/** Việc của đơn vị dưới tôi (chỉ xem): mỗi dòng một việc đang mở, kèm các bộ phận cấp dưới đang làm. */
export interface DongViecCapDuoi {
  cong_viec_id: string;
  ten: string;
  du_an: string | null;
  bo_phan: string; // tên ngắn các bộ phận cấp dưới đang làm việc này
  han: string | null;
  so_ngay_con: number | null;
}

export interface DuLieuTongQuan {
  hop_den: DongHopDen[];
  so_hop_den: number;
  phan_viec: DongPhanViec[];
  dem: { dang_lam: number; qua_han: number; sap_den_han: number; luon_mo: number };
  sap_den_han_ngay: number;
  qua_han_vang_ngay: number;
  thong_bao: ThongBao[];
  so_thong_bao_chua_doc: number;
  /** null = đơn vị tôi không có cấp dưới (BQLDA, PMC, nhà máy…) → không hiện cột "việc đơn vị dưới" */
  cap_duoi: { don_vi: string[]; viec: DongViecCapDuoi[] } | null;
}

/**
 * Đơn vị cấp dưới của tôi: mọi đơn vị con cháu của đơn vị tôi. Lãnh đạo (chức danh trong Ban TGĐ, hoặc Ban TGĐ)
 * thì cấp dưới là mọi đơn vị con cháu của Ban TGĐ, trừ chính các chức danh lãnh đạo.
 */
async function donViCapDuoi(q: Q, cuaToi: string[]): Promise<{ id: string; ten_ngan: string }[]> {
  const cay = await layCayDonVi(q);
  const theoId = new Map(cay.map((d) => [d.id, d]));
  const goc = new Set<string>();
  for (const id of cuaToi) {
    const d = theoId.get(id);
    if (!d) continue;
    goc.add(d.loai === "chuc_danh" && d.cha_id ? d.cha_id : d.id);
  }
  const kq: { id: string; ten_ngan: string }[] = [];
  for (const d of cay) {
    if (goc.has(d.id) || d.loai === "chuc_danh") continue;
    for (let cha = d.cha_id; cha; cha = theoId.get(cha)?.cha_id ?? null) {
      if (goc.has(cha)) {
        kq.push({ id: d.id, ten_ngan: d.ten_ngan || d.ten });
        break;
      }
    }
  }
  return kq;
}

export async function duLieuTongQuan(q: Q, nd: NguoiDungPhien, gioiHan = 12): Promise<DuLieuTongQuan> {
  const donVi = nd.don_vi_ids;
  const hop = await q.query<DongHopDen & { tong: number }>(
    `SELECT b.id AS buoc_id, b.tai_lieu_id, t.ten, t.mau_ma, b.loai, dt.ten_ngan AS tu_don_vi,
            coalesce(n.ten, b.tu_nguoi) AS tu_nguoi, dd.ten_ngan AS den_don_vi, b.ly_do,
            to_char(b.luc AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS luc, count(*) OVER ()::int AS tong
     FROM docflow.buoc_hanh_trinh b
     JOIN docflow.tai_lieu t ON t.id = b.tai_lieu_id
     LEFT JOIN identity.don_vi dt ON dt.id = b.tu_don_vi
     LEFT JOIN identity.don_vi dd ON dd.id = b.den_don_vi
     LEFT JOIN identity.nguoi_dung n ON n.id = b.tu_nguoi
     WHERE b.trang_thai = 'cho_nhan' AND b.den_don_vi = ANY($1::text[])
     ORDER BY b.luc DESC LIMIT $2`,
    [donVi, gioiHan],
  );
  const sc = await layCauHinh(q, "so_cai");
  const sapDen = sc.sap_den_han_ngay;
  const pv = await q.query<DongPhanViec>(
    `SELECT pv.id, pv.cong_viec_id, cv.ten AS ten_viec, pv.noi_dung, cv.du_an, pv.phu_trach_loai,
            coalesce(n.ten, d.ten_ngan, pv.phu_trach_id) AS phu_trach_ten,
            to_char(coalesce(pv.ket_thuc, cv.ket_thuc), 'YYYY-MM-DD') AS han,
            (pv.luon_mo OR coalesce(pv.ket_thuc, cv.ket_thuc) IS NULL) AS luon_mo,
            (coalesce(pv.ket_thuc, cv.ket_thuc) - current_date)::int AS so_ngay_con,
            cv.cho_sua
     FROM docflow.phan_viec pv
     JOIN docflow.so_cai cv ON cv.id = pv.cong_viec_id
     LEFT JOIN identity.nguoi_dung n ON pv.phu_trach_loai = 'nguoi' AND n.id = pv.phu_trach_id
     LEFT JOIN identity.don_vi d ON pv.phu_trach_loai = 'don_vi' AND d.id = pv.phu_trach_id
     WHERE pv.trang_thai = 'dang_lam'
       AND ((pv.phu_trach_loai = 'nguoi' AND pv.phu_trach_id = $1)
         OR (pv.phu_trach_loai = 'don_vi' AND pv.phu_trach_id = ANY($2::text[])))
     ORDER BY (pv.luon_mo OR coalesce(pv.ket_thuc, cv.ket_thuc) IS NULL), coalesce(pv.ket_thuc, cv.ket_thuc), cv.tao_luc`,
    [nd.id, donVi],
  );
  const ds = pv.rows;
  const coHan = ds.filter((d) => !d.luon_mo && d.so_ngay_con !== null);
  return {
    hop_den: hop.rows.map(({ tong: _t, ...r }) => r),
    so_hop_den: hop.rows[0]?.tong ?? 0,
    phan_viec: ds.slice(0, gioiHan * 2),
    dem: {
      dang_lam: ds.length,
      qua_han: coHan.filter((d) => d.so_ngay_con! < 0).length,
      sap_den_han: coHan.filter((d) => d.so_ngay_con! >= 0 && d.so_ngay_con! <= sapDen).length,
      luon_mo: ds.filter((d) => d.luon_mo).length,
    },
    sap_den_han_ngay: sapDen,
    qua_han_vang_ngay: sc.qua_han_vang_ngay ?? 3,
    // Chỉ tin chưa đọc — đọc rồi thì rời chuông (Mr. Đại chốt 10/10/2026, db/87)
    thong_bao: await danhSachThongBao(q, nd, { gioi_han: 6, chua_doc: true }),
    so_thong_bao_chua_doc: await demChuaDoc(q, nd),
    cap_duoi: await viecCapDuoi(q, donVi),
  };
}

async function viecCapDuoi(q: Q, donVi: string[]): Promise<DuLieuTongQuan["cap_duoi"]> {
  const duoi = await donViCapDuoi(q, donVi);
  if (!duoi.length) return null;
  const { rows } = await q.query<DongViecCapDuoi>(
    `SELECT cv.id AS cong_viec_id, cv.ten, cv.du_an,
            string_agg(DISTINCT coalesce(d.ten_ngan, d.ten), ', ') AS bo_phan,
            to_char(min(coalesce(pv.ket_thuc, cv.ket_thuc)), 'YYYY-MM-DD') AS han,
            (min(coalesce(pv.ket_thuc, cv.ket_thuc)) - ((now() AT TIME ZONE 'UTC') + interval '7 hours')::date)::int AS so_ngay_con
     FROM docflow.phan_viec pv
     JOIN docflow.so_cai cv ON cv.id = pv.cong_viec_id
     JOIN identity.don_vi d ON pv.phu_trach_loai = 'don_vi' AND d.id = pv.phu_trach_id
     WHERE pv.trang_thai = 'dang_lam' AND NOT pv.da_bo AND pv.phu_trach_id = ANY($1::text[])
     GROUP BY cv.id, cv.ten, cv.du_an
     ORDER BY min(coalesce(pv.ket_thuc, cv.ket_thuc)) NULLS LAST, cv.id`,
    [duoi.map((d) => d.id)],
  );
  return { don_vi: duoi.map((d) => d.ten_ngan), viec: rows };
}
