// ============================================================
// gui/doc.ts — ĐỌC cho trang /tai-lieu/[id]: thông tin tài liệu, hộp xử lý (nút hợp lệ theo bước + quyền),
// cây hành trình. CHỈ SERVER, chỉ đọc.
// ============================================================
import type { Q } from "@/lib/db";
import type { KetQuaKiemTra, MauWord, NguoiDungPhien } from "@/lib/types";
import { layMau } from "@/lib/kiem-tra/kiem-tra";
import { locKetQuaKiemTra } from "@/lib/bao-mat/loc";
import { cayHanhTrinh, type NutHanhTrinh } from "./dich-vu";
import { coQuyenGui, laNoiNhan, layTaiLieu, type HangBuoc, type HangTaiLieu } from "./chung";

export type ThaoTac = "nhan" | "chuyen_tiep" | "chuyen_tiep_kem" | "tra_lai" | "gui_lai" | "gui_moi" | "hoan_thanh";

export interface BuocCuaToi {
  buoc_id: string;
  loai: HangBuoc["loai"];
  trang_thai: HangBuoc["trang_thai"];
  tu_ten: string;
  den_ten: string;
  ly_do: string | null;
  luc: string;
  phien_ban: number;
  thao_tac: ThaoTac[];
}

export function thaoTacHopLe(b: Pick<HangBuoc, "loai" | "trang_thai" | "tu_don_vi">, tl: Pick<HangTaiLieu, "nguoi_gui_that">): ThaoTac[] {
  if (b.loai === "hoan_thanh" || b.trang_thai === "bi_tra_lai" || b.trang_thai === "hoan_thanh") return [];
  const t: ThaoTac[] = [];
  // Bị trả lại: người gửi chỉ cần sửa rồi gửi lại, hoặc dừng hẳn (Hoàn thành) — không cần bấm "Nhận" lời trả lại
  if (b.loai === "tra_lai") {
    if (b.trang_thai !== "da_xu_ly") t.push("gui_lai");
    t.push("hoan_thanh");
    return t;
  }
  if (b.trang_thai === "cho_nhan") t.push("nhan");
  t.push("chuyen_tiep", "chuyen_tiep_kem");
  if ((b.trang_thai === "cho_nhan" || b.trang_thai === "da_nhan") && !(!b.tu_don_vi && tl.nguoi_gui_that)) t.push("tra_lai");
  t.push("gui_moi", "hoan_thanh");
  return t;
}

export interface ThongTinTaiLieuGui {
  tai_lieu: HangTaiLieu & { don_vi_lap_ten: string | null; nguoi_tao_ten: string | null };
  phien_ban: { phien_ban: number; ten_tep: string; tai_len_boi: string; tai_len_luc: string; sha256: string; kich_thuoc: number }[];
  ket_qua_kiem_tra: KetQuaKiemTra | null;
  mau: MauWord | null;
  la_form0: boolean;
  co_the_gui: boolean; // nháp của mình: mở màn Soạn và gửi
  buoc_cua_toi: BuocCuaToi[];
  lien_quan_den: { id: string; ten: string } | null;
  tai_lieu_lien_quan: { id: string; ten: string }[];
  so_den: { so_den: number; nam: number | null; noi_gui: string; so_ky_hieu: string | null; ngay_van_ban: string | null; hinh_thuc: string } | null;
  cay: NutHanhTrinh[];
}

export async function thongTinTaiLieuGui(q: Q, nd: NguoiDungPhien, id: string): Promise<ThongTinTaiLieuGui> {
  const tl = await layTaiLieu(q, id);
  const ten = await q.query<{ dv: string | null; nt: string | null }>(
    `SELECT (SELECT ten FROM identity.don_vi WHERE id = $1) dv, (SELECT ten FROM identity.nguoi_dung WHERE id = $2) nt`,
    [tl.don_vi_lap, tl.nguoi_tao],
  );
  const pb = await q.query<{ phien_ban: number; ten_tep: string; tai_len_boi: string; tai_len_luc: string | Date; sha256: string; kich_thuoc: string | number; ket_qua_kiem_tra: KetQuaKiemTra | null }>(
    "SELECT phien_ban, ten_tep, tai_len_boi, tai_len_luc, sha256, kich_thuoc, ket_qua_kiem_tra FROM docflow.phien_ban_tep WHERE tai_lieu_id = $1 ORDER BY phien_ban",
    [id],
  );
  const hienTai = pb.rows.find((r) => Number(r.phien_ban) === Number(tl.phien_ban_hien_tai)) ?? pb.rows[pb.rows.length - 1];
  const mau = tl.mau_ma ? await layMau(q, tl.mau_ma) : null;

  const { rows: buoc } = await q.query<HangBuoc & { tu_ten: string | null; den_ten: string | null; tu_nguoi_ten: string | null }>(
    `SELECT b.*, dt.ten tu_ten, COALESCE(nn.ten, dd.ten) den_ten, nt.ten tu_nguoi_ten
     FROM docflow.buoc_hanh_trinh b
     LEFT JOIN identity.don_vi dt ON dt.id = b.tu_don_vi
     LEFT JOIN identity.don_vi dd ON dd.id = b.den_don_vi
     LEFT JOIN identity.nguoi_dung nn ON nn.id = b.den_nguoi
     LEFT JOIN identity.nguoi_dung nt ON nt.id = b.tu_nguoi
     WHERE b.tai_lieu_id = $1 AND b.loai <> 'hoan_thanh' ORDER BY b.luc`,
    [id],
  );
  const cuaToi: BuocCuaToi[] = [];
  for (const b of buoc) {
    if (!(await laNoiNhan(q, nd, b))) continue;
    const thao_tac = thaoTacHopLe(b, tl);
    cuaToi.push({
      buoc_id: b.id,
      loai: b.loai,
      trang_thai: b.trang_thai,
      tu_ten: b.tu_ten ?? tl.nguoi_gui_that ?? b.tu_nguoi_ten ?? b.tu_nguoi,
      den_ten: b.den_ten ?? "",
      ly_do: b.ly_do,
      luc: new Date(b.luc).toISOString(),
      phien_ban: Number(b.phien_ban),
      thao_tac,
    });
  }

  const daGui = await q.query("SELECT 1 FROM docflow.hanh_trinh WHERE tai_lieu_goc_id = $1 LIMIT 1", [id]);
  const coTheGui = tl.trang_thai === "nhap" && daGui.rows.length === 0 && (await coQuyenGui(q, nd, { chu_so_huu: tl.nguoi_tao, don_vi_id: tl.don_vi_lap }));

  const lq = tl.lien_quan_den ? await q.query<{ id: string; ten: string }>("SELECT id, ten FROM docflow.tai_lieu WHERE id = $1", [tl.lien_quan_den]) : { rows: [] };
  const lqTu = await q.query<{ id: string; ten: string }>("SELECT id, ten FROM docflow.tai_lieu WHERE lien_quan_den = $1 ORDER BY tao_luc", [id]);
  const sd = await q.query<{ so_den: number; nam: number | null; noi_gui: string; so_ky_hieu: string | null; ngay_van_ban: string | Date | null; hinh_thuc: string }>(
    "SELECT so_den, nam, noi_gui, so_ky_hieu, to_char(ngay_van_ban, 'YYYY-MM-DD') AS ngay_van_ban, hinh_thuc FROM docflow.so_van_ban_den WHERE tai_lieu_id = $1",
    [id],
  );

  return {
    tai_lieu: { ...tl, tao_luc: new Date(tl.tao_luc).toISOString(), don_vi_lap_ten: ten.rows[0]?.dv ?? null, nguoi_tao_ten: ten.rows[0]?.nt ?? null },
    phien_ban: pb.rows.map((r) => ({
      phien_ban: Number(r.phien_ban),
      ten_tep: r.ten_tep,
      tai_len_boi: r.tai_len_boi,
      tai_len_luc: new Date(r.tai_len_luc).toISOString(),
      sha256: r.sha256,
      kich_thuoc: Number(r.kich_thuoc),
    })),
    // Cắt theo người đọc — chương mật Form 4 (kiểm độc lập 10/10)
    ket_qua_kiem_tra: hienTai ? await locKetQuaKiemTra(q, tl.mau_ma ?? null, hienTai.ket_qua_kiem_tra, hienTai.tai_len_boi, nd) : null,
    mau,
    la_form0: !!mau?.dinh_nghia.bang_cong_viec?.some((b) => b.la_quyet_dinh),
    co_the_gui: coTheGui,
    buoc_cua_toi: cuaToi,
    lien_quan_den: lq.rows[0] ?? null,
    tai_lieu_lien_quan: lqTu.rows,
    so_den: sd.rows[0]
      ? { ...sd.rows[0], ngay_van_ban: (sd.rows[0].ngay_van_ban as string | null) ?? null }
      : null,
    cay: await cayHanhTrinh(q, id),
  };
}

/** Tài liệu nháp của tôi (chưa gửi) — để chọn khi "Gửi tài liệu mới" hoặc làm file kèm. */
export async function taiLieuNhapCuaToi(q: Q, nd: NguoiDungPhien): Promise<{ id: string; ten: string; mau_ma: string | null; tao_luc: string; dat: boolean | null; so_loi: number; so_canh_bao: number }[]> {
  // Mỗi bản nháp kèm số lỗi chặn + cảnh báo của lần kiểm tra gần nhất (Mr. Đại 01/10: ghi rõ trạng thái từng bản; 15 bản/trang ở giao diện)
  const { rows } = await q.query<{ id: string; ten: string; mau_ma: string | null; tao_luc: string | Date; dat: boolean | null; so_loi: number; so_canh_bao: number }>(
    `SELECT t.id, t.ten, t.mau_ma, t.tao_luc, (p.ket_qua_kiem_tra->>'dat')::boolean AS dat,
            COALESCE((SELECT count(*) FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p.ket_qua_kiem_tra->'loi') = 'array' THEN p.ket_qua_kiem_tra->'loi' ELSE '[]'::jsonb END) e WHERE e->>'muc' = 'chan'), 0)::int AS so_loi,
            COALESCE((SELECT count(*) FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p.ket_qua_kiem_tra->'loi') = 'array' THEN p.ket_qua_kiem_tra->'loi' ELSE '[]'::jsonb END) e WHERE e->>'muc' = 'canh_bao'), 0)::int AS so_canh_bao
     FROM docflow.tai_lieu t
     LEFT JOIN docflow.phien_ban_tep p ON p.tai_lieu_id = t.id AND p.phien_ban = t.phien_ban_hien_tai
     WHERE t.nguoi_tao = $1 AND t.trang_thai = 'nhap'
       AND NOT EXISTS (SELECT 1 FROM docflow.hanh_trinh h WHERE h.tai_lieu_goc_id = t.id)
     ORDER BY t.tao_luc DESC LIMIT 1000`,
    [nd.id],
  );
  return rows.map((r) => ({ ...r, tao_luc: new Date(r.tao_luc).toISOString() }));
}

/** Nơi nhận có thể chọn: 9 đơn vị (+ đơn vị riêng) và người dùng; kèm nơi nhận mặc định theo luồng báo cáo. */
export async function danhSachNoiNhan(q: Q): Promise<{
  don_vi: { id: string; ten: string; ten_ngan: string; cap: number; loai: string }[];
  nguoi: { id: string; ten: string; chuc_vu: string | null; don_vi_id: string }[];
}> {
  const dv = await q.query<{ id: string; ten: string; ten_ngan: string; cap: number; loai: string }>(
    "SELECT id, ten, ten_ngan, cap, loai FROM identity.don_vi WHERE active ORDER BY thu_tu, ten",
  );
  const nd = await q.query<{ id: string; ten: string; chuc_vu: string | null; don_vi_id: string }>(
    "SELECT id, ten, chuc_vu, don_vi_id FROM identity.nguoi_dung WHERE active AND don_vi_id IS NOT NULL ORDER BY ten",
  );
  return { don_vi: dv.rows, nguoi: nd.rows };
}
