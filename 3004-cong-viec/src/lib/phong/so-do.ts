// ============================================================
// phong/so-do.ts — dữ liệu màn SƠ ĐỒ TỔ CHỨC của giao diện căn phòng (28/09/2026).
// Mỗi ô = một đơn vị; ô cha = nơi đơn vị GỬI báo cáo tới theo "Luồng báo cáo" (Cài đặt), không có luồng thì theo cây
// đơn vị. 8 chức danh lãnh đạo gộp vào ô Ban lãnh đạo (giao việc chọn người ở nút +). MÁY tính hết — không có LLM.
// ============================================================
import type { Q } from "@/lib/db";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import type { CauHinh } from "@/lib/cau-hinh/mac-dinh";
import { docGiaiDoan } from "./giai-doan";
import type { GiaiDoanViec } from "./giai-doan-thuan";
import { taoThongBao } from "@/lib/thong-bao";
import { LoiHttp } from "@/lib/phien";
import type { NguoiDungPhien } from "@/lib/types";
import { bayGioVN, cachNgay, hanNopTheoCap, khoangNgay, ngayVN, tuanCua, type TuanBaoCao } from "./tuan";
import { docNhomGap, type NhomGap } from "@/components/phong/bo-cuc";

export interface OSoDo {
  id: string;
  ten: string;
  ten_ngan: string;
  cap: number;
  loai: string;
  mau_ma: string | null;
  thu_tu: number;
  /** ô cha trên sơ đồ (theo luồng báo cáo) — null = gốc (Ban lãnh đạo) */
  cha: string | null;
}

export interface BaoCaoTuanO {
  tai_lieu_id: string;
  ten_tep: string;
  mau_ma: string | null;
  luc: string;
  ky: string;
  /** Người nộp + ngày nộp do MÁY ghi (mẫu bản 6 bỏ ô Người lập / Ngày lập / chữ ký — chốt 29/09/2026) */
  nguoi_nop: string | null;
  ngay_nop: string;
  dat: boolean | null;
  so_viec: number;
}

export interface DuLieuSoDo {
  tuan: TuanBaoCao;
  o: OSoDo[];
  /** lãnh đạo từng người (chức danh dưới Ban TGĐ) — cho nút + của Ban lãnh đạo */
  lanh_dao: { id: string; ten: string; ten_ngan: string }[];
  bao_cao: Record<string, BaoCaoTuanO>;
  nhac: Record<string, { luc: string; nguoi_nhan: string[] }>;
  /**
   * Hạn nộp báo cáo tuần của TỪNG đơn vị theo cấp ("yyyy-mm-ddTHH:MM" giờ VN; chốt 30/09) và danh sách đơn vị đã qua hạn —
   * qua hạn mà chưa nộp thì sổ tự hiện "!" (chốt 29/09).
   */
  han_nop: Record<string, string>;
  qua_han_nop: string[];
  hien_don_vi_khong_viec: boolean;
  /** ô có dòng nhóm bung/gập các ô cấp 3–4 (Mr. Đại chốt 20/10/2026) — chỉ những ô có trên sơ đồ */
  nhom_gap: NhomGap[];
  /** người → đơn vị (việc giao cho người thì hiện ở ô đơn vị của người đó) */
  nguoi: { id: string; ten: string; don_vi_id: string | null; don_vi_ids?: string[]; chuc_vu?: string | null }[];
  /** danh mục dự án (Cài đặt) + giai đoạn PMP của việc (🤖 hoặc người sửa) — cho menu Dự án */
  du_an: CauHinh["du_an"];
  giai_doan: Record<string, GiaiDoanViec>;
}

const LOAI_O = new Set(["ban_tgd", "phong", "don_vi"]);

interface KyJson {
  loai?: string;
  so?: number;
  nam?: number;
  tu?: string;
  den?: string;
}

/** Báo cáo có tính là "đã nộp" cho tuần này: kỳ giao với tuần; báo cáo tháng thì tháng vừa qua (kết thúc trong 35 ngày) vẫn tính. */
export function kyTinhChoTuan(ky: KyJson | null, tuan: TuanBaoCao): boolean {
  if (!ky) return false;
  const tu = ky.tu ?? ky.den;
  const den = ky.den ?? ky.tu;
  if (!tu || !den) return false;
  if (tu <= tuan.den && den >= tuan.tu) return true;
  return ky.loai === "thang" && den < tuan.tu && cachNgay(den, tuan.tu) <= 35;
}

function chuKy(ky: KyJson | null): string {
  if (!ky) return "";
  if (ky.loai === "thang" && ky.den) return `tháng ${Number(ky.den.slice(5, 7))}/${ky.den.slice(0, 4)}`;
  return `${ky.so ? `tuần ${ky.so} · ` : ""}${khoangNgay(ky.tu, ky.den)}`;
}

/** Ô cha theo luồng báo cáo (dòng đầu tiên gửi đi nơi khác), không có thì theo cây đơn vị. */
async function chaTheoLuong(q: Q, o: { id: string; cha_id: string | null }[]): Promise<Map<string, string | null>> {
  const luong = await layCauHinh(q, "luong_bao_cao");
  const co = new Set(o.map((x) => x.id));
  const m = new Map<string, string | null>();
  for (const x of o) {
    const l = luong.find((r) => r.tu === x.id && r.den !== x.id && co.has(r.den));
    m.set(x.id, l ? l.den : x.cha_id && co.has(x.cha_id) ? x.cha_id : null);
  }
  return m;
}

export async function duLieuSoDo(q: Q, ngayTrongTuan: string): Promise<DuLieuSoDo> {
  const tuan = tuanCua(ngayTrongTuan);
  const dv = (
    await q.query<{ id: string; ten: string; ten_ngan: string; cap: number; cha_id: string | null; loai: string; mau_ma: string | null; thu_tu: number }>(
      "SELECT id, ten, ten_ngan, cap, cha_id, loai, mau_ma, thu_tu FROM identity.don_vi WHERE active ORDER BY thu_tu, ten",
    )
  ).rows;
  const oDv = dv.filter((d) => LOAI_O.has(d.loai));
  const cha = await chaTheoLuong(q, oDv);
  const o: OSoDo[] = oDv.map((d) => ({
    id: d.id,
    ten: d.ten,
    ten_ngan: d.ten_ngan,
    cap: Number(d.cap),
    loai: d.loai,
    mau_ma: d.mau_ma,
    thu_tu: Number(d.thu_tu),
    cha: d.loai === "ban_tgd" ? null : (cha.get(d.id) ?? null),
  }));

  // Báo cáo đã gửi có kỳ rơi vào tuần — mỗi đơn vị lấy bản gửi muộn nhất
  const bc = (
    await q.query<{ id: string; don_vi_lap: string; mau_ma: string | null; ky_bao_cao: KyJson | null; ten_tep: string; luc: string; kq: Record<string, unknown> | null; nguoi_nop: string | null }>(
      `SELECT t.id, t.don_vi_lap, t.mau_ma, t.ky_bao_cao, p.ten_tep, p.tai_len_luc::text AS luc, p.ket_qua_kiem_tra AS kq, n.ten AS nguoi_nop
         FROM docflow.tai_lieu t JOIN docflow.phien_ban_tep p ON p.tai_lieu_id = t.id AND p.phien_ban = t.phien_ban_hien_tai
         LEFT JOIN identity.nguoi_dung n ON n.id = p.tai_len_boi
        WHERE t.don_vi_lap IS NOT NULL AND t.ky_bao_cao IS NOT NULL AND t.trang_thai IN ('da_gui', 'hoan_thanh')
        ORDER BY p.tai_len_luc`,
    )
  ).rows;
  const bao_cao: Record<string, BaoCaoTuanO> = {};
  // Báo cáo đóng dấu chức danh lãnh đạo (vd Form 0 của Trợ lý CT — chốt 28/09) hiện ở ô Ban lãnh đạo
  const goc = o.find((x) => x.cha === null)?.id ?? null;
  const laChucDanh = new Set(dv.filter((d) => d.loai === "chuc_danh").map((d) => d.id));
  for (const r of bc) {
    if (!kyTinhChoTuan(r.ky_bao_cao, tuan)) continue;
    if (laChucDanh.has(r.don_vi_lap) && goc) r.don_vi_lap = goc;
    const kq = (r.kq ?? {}) as { dat?: boolean; cong_viec?: unknown[] };
    bao_cao[r.don_vi_lap] = {
      tai_lieu_id: r.id,
      ten_tep: r.ten_tep,
      mau_ma: r.mau_ma,
      luc: r.luc,
      ky: chuKy(r.ky_bao_cao),
      nguoi_nop: r.nguoi_nop,
      ngay_nop: ngayVN(bayGioVN(new Date(r.luc))),
      dat: typeof kq.dat === "boolean" ? kq.dat : null,
      so_viec: Array.isArray(kq.cong_viec) ? kq.cong_viec.length : 0,
    };
  }

  const nhac: DuLieuSoDo["nhac"] = {};
  for (const r of (
    await q.query<{ don_vi_id: string; luc: string; nguoi_nhan: string[] }>(
      "SELECT don_vi_id, luc::text AS luc, nguoi_nhan FROM docflow.nhac_nop WHERE ky_tu = $1 ORDER BY luc",
      [tuan.tu],
    )
  ).rows)
    nhac[r.don_vi_id] = { luc: r.luc, nguoi_nhan: r.nguoi_nhan };

  const nguoi = (
    await q.query<{ id: string; ten: string; don_vi_id: string | null; don_vi_ids: string[]; chuc_vu: string | null }>(
      `SELECT n.id, n.ten, n.don_vi_id, n.chuc_vu,
              array_remove(array_cat(ARRAY[n.don_vi_id], COALESCE((SELECT array_agg(k.don_vi_id) FROM identity.kiem_nhiem k WHERE k.nguoi_dung_id = n.id), '{}')), NULL) AS don_vi_ids
         FROM identity.nguoi_dung n WHERE n.active ORDER BY n.ten`,
    )
  ).rows;
  const lanh_dao = dv.filter((d) => d.loai === "chuc_danh").map((d) => ({ id: d.id, ten: d.ten, ten_ngan: d.ten_ngan }));
  const kyCh = await layCauHinh(q, "ky_bao_cao");
  const bayGio = bayGioVN();
  const han_nop: Record<string, string> = {};
  for (const x of o) han_nop[x.id] = hanNopTheoCap(tuan, x.cap, kyCh.han_nop_theo_cap, kyCh.ngay_nghi ?? []);
  const qua_han_nop = Object.keys(han_nop).filter((id) => bayGio > han_nop[id]);
  const gd = await layCauHinh(q, "giao_dien");
  const hien_don_vi_khong_viec = gd.hien_don_vi_khong_viec !== false;
  const coO = new Set(o.map((x) => x.id));
  const nhom_gap = docNhomGap(gd.nhom_gap_so_do).filter((n) => coO.has(n.id));
  return { tuan, o, lanh_dao, bao_cao, nhac, han_nop, qua_han_nop, hien_don_vi_khong_viec, nhom_gap, nguoi, du_an: await layCauHinh(q, "du_an"), giai_doan: await docGiaiDoan(q) };
}

/**
 * Nhắc nộp báo cáo tuần: tin tới mọi người của đơn vị; đơn vị chưa có tài khoản (vd Ban điều hành tổng thầu) thì tới
 * người của ô cha (BQLDA); vẫn không có ai thì tới quản trị. Ghi sổ nhắc để ô giữ viền vàng tới khi nộp.
 */
export async function nhacNop(q: Q, nd: NguoiDungPhien, donViId: string, ngayTrongTuan: string): Promise<{ nguoi_nhan: string[] }> {
  const tuan = tuanCua(ngayTrongTuan);
  const dl = await duLieuSoDo(q, tuan.tu);
  const o = dl.o.find((x) => x.id === donViId);
  if (!o) throw new LoiHttp(404, "Không có đơn vị này trên sơ đồ");
  if (dl.bao_cao[donViId]) throw new LoiHttp(400, `${o.ten} đã nộp báo cáo tuần ${tuan.so}`);
  const thanhVien = async (id: string) =>
    (
      await q.query<{ id: string }>(
        `SELECT id FROM identity.nguoi_dung WHERE active AND (don_vi_id = $1
           OR id IN (SELECT nguoi_dung_id FROM identity.kiem_nhiem WHERE don_vi_id = $1))`,
        [id],
      )
    ).rows.map((r) => r.id);
  const tb = {
    loai: "nhac_nop",
    noi_dung: `Nhắc nộp báo cáo tuần ${tuan.so} (${khoangNgay(tuan.tu, tuan.den)}): ${o.ten} chưa nộp — ${nd.ten} nhắc`,
    lien_ket: "/gui-bao-cao",
  };
  let nhan = await thanhVien(donViId);
  if (!nhan.length && o.cha) nhan = await thanhVien(o.cha);
  if (!nhan.length) nhan = ["quan-tri"];
  for (const id of nhan) await taoThongBao(q, { ...tb, nguoi_nhan: id });
  await q.query("INSERT INTO docflow.nhac_nop (don_vi_id, ky_tu, ky_den, nguoi_nhac, nguoi_nhan) VALUES ($1,$2,$3,$4,$5)", [
    donViId,
    tuan.tu,
    tuan.den,
    nd.id,
    JSON.stringify(nhan),
  ]);
  return { nguoi_nhan: nhan };
}
