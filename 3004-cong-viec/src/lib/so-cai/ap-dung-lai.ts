// ============================================================
// so-cai/ap-dung-lai.ts — ÁP DỤNG LẠI QUY TẮC ĐÈ CHO VIỆC ĐANG MỞ khi quản trị đổi cài đặt quy_tac_de.
// Chủ module: so-cai. Công tắc "Áp dụng lại cho việc đang mở khi đổi cài đặt" (quy_tac_de.ap_dung_lai_khi_doi);
// tắt = quy tắc mới chỉ áp dụng cho báo cáo gửi từ nay. Cau-hinh/ghi.ts gọi apDungLaiQuyTac trong CÙNG giao dịch.
//
// Cách tính (PHÁT LẠI như thể quy tắc mới đã có từ đầu):
//   Với mỗi việc đang mở, lấy mọi nguồn (hiện hành + bị đè + không dùng) theo thứ tự đến (luc), bỏ:
//     - nguồn báo "đã xong" (không mang nội dung việc; xử lý riêng ở mục "ghi nhận đã xong" bên dưới)
//     - bản cũ của cùng tài liệu đã có bản mới hơn (người lập đã thay)
//     - nguồn từ tài liệu đang bị trả lại chờ sửa (trừ khi đang là hiện hành)
//   rồi cho từng nguồn "đến" lần lượt, so với bản đang dùng bằng đúng soSanhNguon với cấu hình MỚI.
//   Luật đứng trên soSanhNguon (giống ghiVaoSoCai / giaoViec):
//     - quyết định TGĐ (Form 0) đè mọi bản; bản thường KHÔNG BAO GIỜ đè được quyết định (kể cả "chỉ theo ngày")
//     - giao lại tay (nguon_bang = 'giao_tay') là thao tác của người giao → thắng tại thời điểm nó đến
//   Không đụng: việc đã hoàn thành/đã đóng (không nằm trong sổ cái), việc đang chờ sửa (cho_sua: đợi bản gửi lại
//   đi đường thường), việc mà nguồn hiện hành là quyết định TGĐ.
//
// QUY TẮC THAO TÁC TAY (gia hạn, đổi người, thêm/bớt phần việc) khi nguồn thắng đổi sang bản W:
//   "Thao tác tay làm SAU lúc W đến thì GIỮ; làm TRƯỚC lúc W đến thì W đè như khi báo cáo đến bình thường."
//   (Đúng với phát lại: nếu W thắng ngay lúc đến thì mọi thao tác tay sau đó vẫn còn.) Cụ thể, với thao tác sau W:
//     - gia hạn cả việc  → giữ hạn việc và hạn mọi phần việc đang có (W chỉ đổi tên, dự án, hạng mục)
//     - gia hạn 1 phần   → giữ hạn phần đó
//     - đổi người        → giữ người mới; W nhắc tới người cũ thì không thêm lại người cũ
//     - thêm phần việc   → giữ phần đó dù W không có
//     - bớt phần việc    → W có người đó cũng không thêm lại
//   Phần việc ĐÃ KẾT THÚC luôn giữ nguyên (không mở lại, không sửa ngày).
//
// GHI NHẬN "ĐÃ XONG": khi da_xong_luon_ghi_nhan bật, báo cáo "đã xong" trước đây bị thua (lúc đó cài đặt tắt)
// nay đóng phần việc của chính người/đơn vị báo — trừ phần có thao tác tay sau báo cáo đó. Phần cuối đóng → việc
// hoàn thành như thường. Áp dụng lại KHÔNG tự đóng cả việc chỉ vì một bản "đã xong" nay thắng.
// ============================================================
import type { Q } from "@/lib/db";
import type { DongCongViec, NguoiDungPhien, PhuTrach } from "@/lib/types";
import type { CauHinh } from "@/lib/cau-hinh/mac-dinh";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { ghiLichSu } from "@/lib/lich-su/ghi";
import { taoMa } from "@/lib/ma";
import { taoThongBao } from "@/lib/thong-bao";
import { chuanHoaVai, kiemTraHoanThanh, nguoiGiaoTuBaoCao } from "./dich-vu";
import { soSanhNguon, type KetQuaSoSanh } from "./quy-tac-de";
import { chuanHoa } from "./tien-ich";

export type QuyTacDe = CauHinh["quy_tac_de"];

/** Các trường cài đặt làm đổi thứ tự thắng/thua — đổi một trong số này mới cần áp dụng lại. */
export const TRUONG_ANH_HUONG = ["thu_tu", "ngay_sau_tinh_theo", "da_xong_luon_ghi_nhan"] as const;

/** Có trường ảnh hưởng thứ tự nào đổi không (thuần). */
export function doiThuTuQuyTac(cu: Partial<QuyTacDe> | null | undefined, moi: Partial<QuyTacDe>): boolean {
  return TRUONG_ANH_HUONG.some((t) => (cu?.[t] ?? null) !== (moi[t] ?? null));
}

function rutGon(ch: Partial<QuyTacDe> | null | undefined): Record<string, unknown> | null {
  if (!ch) return null;
  return Object.fromEntries(TRUONG_ANH_HUONG.map((t) => [t, ch[t] ?? null]));
}

// ---------------- Kiểu kết quả (hiện cho quản trị trước khi lưu) ----------------

export interface ViecApDungLai {
  cong_viec_id: string;
  ten: string;
  loai: "doi_nguon" | "ghi_nhan_da_xong";
  nguon_cu: { id: string; nhan: string } | null;
  nguon_moi: { id: string; nhan: string } | null;
  ly_do: string;
  han_cu: string | null;
  han_moi: string | null;
  ten_moi?: string;
  them_phan_viec: string[];
  bo_phan_viec: string[];
  ghi_nhan_da_xong: { phan_viec_id: string; phu_trach: string; tu: string }[];
  giu_thao_tac_tay: string[];
  doi_trang_thai_nguon: { nguon_id: string; nhan: string; tu: string; sang: string; ly_do: string | null }[];
  hoan_thanh?: boolean;
}

export interface KetQuaApDungLai {
  so_viec: number;
  viec: ViecApDungLai[];
}

// ---------------- Đọc ----------------

interface Nguon {
  id: string;
  cong_viec_id: string;
  nhan: string;
  cap: number;
  ky_bao_cao: string | null;
  ngay_gui: string;
  ms: number; // lúc nguồn vào CSDL (ms, có phần lẻ) — so với lúc thao tác tay
  du_lieu: DongCongViec;
  trang_thai: string;
  ly_do: string | null;
  la_quyet_dinh: boolean;
  nguoi_gui: string | null;
  don_vi_id: string | null;
  tai_lieu_id: string | null;
  phien_ban: number | null;
  tl_tra_lai: boolean;
}

interface Viec {
  id: string;
  ten: string;
  du_an: string | null;
  hang_muc: string | null;
  ket_qua_can_co: string | null;
  luon_mo: boolean;
  bat_dau: string | null;
  ket_thuc: string | null;
  cho_sua: boolean;
  nguon_hien_hanh_id: string | null;
}

interface Phan {
  id: string;
  phu_trach_loai: "nguoi" | "don_vi";
  phu_trach_id: string;
  phu_trach_ten: string;
  noi_dung: string;
  trang_thai: string;
  da_bo: boolean;
  thu_tu: number;
}

interface ThaoTacTay {
  hanh_dong: string;
  chi_tiet: Record<string, unknown>;
  ms: number;
}

function iso(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  return v === null || v === undefined ? "" : String(v);
}

async function docViecMo(q: Q, khoa: boolean): Promise<Viec[]> {
  const { rows } = await q.query<Record<string, unknown>>(
    `SELECT id, ten, du_an, hang_muc, ket_qua_can_co, luon_mo, bat_dau::text AS bat_dau, ket_thuc::text AS ket_thuc, cho_sua,
            nguon_hien_hanh_id
       FROM docflow.cong_viec WHERE trang_thai = 'dang_mo' ORDER BY id${khoa ? " FOR UPDATE" : ""}`,
  );
  return rows.map((r) => ({
    id: String(r.id),
    ten: String(r.ten),
    du_an: (r.du_an as string) ?? null,
    hang_muc: (r.hang_muc as string) ?? null,
    ket_qua_can_co: (r.ket_qua_can_co as string) ?? null,
    luon_mo: !!r.luon_mo,
    bat_dau: (r.bat_dau as string) ?? null,
    ket_thuc: (r.ket_thuc as string) ?? null,
    cho_sua: !!r.cho_sua,
    nguon_hien_hanh_id: (r.nguon_hien_hanh_id as string) ?? null,
  }));
}

async function docNguonViecMo(q: Q): Promise<Map<string, Nguon[]>> {
  const { rows } = await q.query<Record<string, unknown>>(
    `SELECT g.id, g.cong_viec_id, g.nhan, g.cap, g.ky_bao_cao::text AS ky_bao_cao, g.ngay_gui, g.du_lieu, g.trang_thai, g.ly_do,
            g.la_quyet_dinh, g.nguoi_gui, g.don_vi_id, g.tai_lieu_id, g.phien_ban,
            (extract(epoch FROM g.luc) * 1000)::float8 AS ms, COALESCE(t.trang_thai = 'bi_tra_lai', false) AS tl_tra_lai
       FROM docflow.nguon_cong_viec g
       JOIN docflow.cong_viec c ON c.id = g.cong_viec_id AND c.trang_thai = 'dang_mo'
       LEFT JOIN docflow.tai_lieu t ON t.id = g.tai_lieu_id
      ORDER BY g.cong_viec_id, g.luc, g.id`,
  );
  const kq = new Map<string, Nguon[]>();
  for (const r of rows) {
    const n: Nguon = {
      id: String(r.id),
      cong_viec_id: String(r.cong_viec_id),
      nhan: String(r.nhan),
      cap: Number(r.cap),
      ky_bao_cao: (r.ky_bao_cao as string) ?? null,
      ngay_gui: iso(r.ngay_gui),
      ms: Number(r.ms),
      du_lieu: (typeof r.du_lieu === "string" ? JSON.parse(r.du_lieu) : r.du_lieu) as DongCongViec,
      trang_thai: String(r.trang_thai),
      ly_do: (r.ly_do as string) ?? null,
      la_quyet_dinh: !!r.la_quyet_dinh,
      nguoi_gui: (r.nguoi_gui as string) ?? null,
      don_vi_id: (r.don_vi_id as string) ?? null,
      tai_lieu_id: (r.tai_lieu_id as string) ?? null,
      phien_ban: r.phien_ban === null || r.phien_ban === undefined ? null : Number(r.phien_ban),
      tl_tra_lai: !!r.tl_tra_lai,
    };
    kq.set(n.cong_viec_id, [...(kq.get(n.cong_viec_id) ?? []), n]);
  }
  return kq;
}

async function docPhan(q: Q, cvId: string): Promise<Phan[]> {
  const { rows } = await q.query<Record<string, unknown>>(
    `SELECT p.id, p.phu_trach_loai, p.phu_trach_id, COALESCE(d.ten, n.ten, p.phu_trach_id) AS phu_trach_ten, p.noi_dung,
            p.trang_thai, p.da_bo, p.thu_tu
       FROM docflow.phan_viec p
       LEFT JOIN identity.don_vi d ON p.phu_trach_loai = 'don_vi' AND d.id = p.phu_trach_id
       LEFT JOIN identity.nguoi_dung n ON p.phu_trach_loai = 'nguoi' AND n.id = p.phu_trach_id
      WHERE p.cong_viec_id = $1 ORDER BY p.thu_tu, p.id`,
    [cvId],
  );
  return rows.map((r) => ({
    id: String(r.id),
    phu_trach_loai: r.phu_trach_loai as Phan["phu_trach_loai"],
    phu_trach_id: String(r.phu_trach_id),
    phu_trach_ten: String(r.phu_trach_ten),
    noi_dung: String(r.noi_dung),
    trang_thai: String(r.trang_thai),
    da_bo: !!r.da_bo,
    thu_tu: Number(r.thu_tu ?? 0),
  }));
}

async function docThaoTacTay(q: Q, cvId: string): Promise<ThaoTacTay[]> {
  const { rows } = await q.query<{ hanh_dong: string; chi_tiet: Record<string, unknown>; ms: number }>(
    `SELECT hanh_dong, chi_tiet, (extract(epoch FROM luc) * 1000)::float8 AS ms FROM docflow.lich_su
      WHERE doi_tuong_loai = 'cong_viec' AND doi_tuong_id = $1
        AND hanh_dong IN ('gia_han', 'doi_nguoi', 'them_phan_viec', 'bot_phan_viec') ORDER BY id`,
    [cvId],
  );
  return rows.map((r) => ({ hanh_dong: r.hanh_dong, chi_tiet: r.chi_tiet ?? {}, ms: Number(r.ms) }));
}

async function tenPhuTrach(q: Q, loai: string, id: string): Promise<string> {
  const { rows } = await q.query<{ ten: string }>(
    loai === "don_vi" ? "SELECT ten FROM identity.don_vi WHERE id = $1" : "SELECT ten FROM identity.nguoi_dung WHERE id = $1",
    [id],
  );
  return rows[0]?.ten ?? id;
}

// ---------------- Phát lại (thuần) ----------------

const laGiaoTay = (n: Nguon) => n.du_lieu?.nguon_bang === "giao_tay" && !n.la_quyet_dinh;

interface KetQuaPhatLai {
  thang: Nguon;
  ly_do_thang: string;
  trang_thai: Map<string, { trang_thai: "hien_hanh" | "bi_de" | "khong_dung"; ly_do: string | null }>;
}

/** Nguồn được đem ra so (bỏ bản "đã xong", bản cũ cùng tài liệu, bản đang bị trả lại chờ sửa). */
function nguonDuocSo(ds: Nguon[], hienHanhId: string | null): Nguon[] {
  return ds.filter((n) => {
    if (n.du_lieu?.da_xong) return false;
    if (n.tai_lieu_id && ds.some((m) => m.tai_lieu_id === n.tai_lieu_id && (m.phien_ban ?? 0) > (n.phien_ban ?? 0))) return false;
    if (n.tl_tra_lai && n.id !== hienHanhId) return false;
    return true;
  });
}

function phatLai(ds: Nguon[], ch: QuyTacDe, capBenNgoai: number): KetQuaPhatLai | null {
  if (!ds.length) return null;
  const tt: KetQuaPhatLai["trang_thai"] = new Map();
  let cur = ds[0];
  let lyDoThang = "bản đầu tiên vào sổ cái";
  for (const s of ds.slice(1)) {
    let ss: KetQuaSoSanh;
    if (s.la_quyet_dinh) ss = { thang: "moi", ly_do: "quyết định của Tổng Giám đốc đè tất cả" };
    else if (laGiaoTay(s)) ss = { thang: "moi", ly_do: "giao lại tay bởi người giao việc" };
    else if (cur.la_quyet_dinh) ss = { thang: "cu", ly_do: "thua cấp: quyết định của Tổng Giám đốc" };
    else
      ss = soSanhNguon(
        { cap: cur.cap, ky_bao_cao: cur.ky_bao_cao, ngay_gui: cur.ngay_gui, la_quyet_dinh: cur.la_quyet_dinh },
        { cap: s.cap, ky_bao_cao: s.ky_bao_cao, ngay_gui: s.ngay_gui },
        ch,
        capBenNgoai,
      );
    if (ss.thang === "moi") {
      tt.set(cur.id, { trang_thai: "bi_de", ly_do: `${ss.ly_do} · bởi ${s.nhan}` });
      cur = s;
      lyDoThang = ss.ly_do;
    } else tt.set(s.id, { trang_thai: "khong_dung", ly_do: ss.ly_do });
  }
  tt.set(cur.id, { trang_thai: "hien_hanh", ly_do: null });
  return { thang: cur, ly_do_thang: lyDoThang, trang_thai: tt };
}

// ---------------- Lõi: xử lý một việc (xem trước dùng chung với ghi) ----------------

interface NguCanh {
  ch: QuyTacDe;
  capBenNgoai: number;
  ghi: boolean;
  nd?: NguoiDungPhien;
  lyDo: string;
  chCu: Partial<QuyTacDe> | null;
  phienBan?: number;
}

type PhuTrachNgay = PhuTrach & { bat_dau: string | null; ket_thuc: string | null };

function phuTrachCuaNguon(n: Nguon): PhuTrachNgay[] {
  const d = n.du_lieu;
  const ngay = { bat_dau: d.bat_dau || null, ket_thuc: d.ket_thuc || null };
  const ds = (d.phu_trach ?? []).filter((p) => p && p.id);
  if (ds.length) return ds.map((p) => ({ ...p, ...ngay }));
  // Phụ trách trống → đơn vị lập báo cáo (hoặc người gửi) — như lúc vào sổ cái
  if (n.don_vi_id) return [{ loai: "don_vi", id: n.don_vi_id, ten: n.don_vi_id, ...ngay }];
  return n.nguoi_gui ? [{ loai: "nguoi", id: n.nguoi_gui, ten: n.nguoi_gui, ...ngay }] : [];
}

const khoaPt = (loai: string, id: string) => `${loai}:${id}`;

async function xuLyViec(q: Q, c: NguCanh, cv: Viec, dsNguon: Nguon[]): Promise<ViecApDungLai | null> {
  if (cv.cho_sua) return null; // chờ sửa: đợi bản gửi lại đi đường thường
  const hienHanh = dsNguon.find((n) => n.id === cv.nguon_hien_hanh_id) ?? null;
  if (hienHanh?.la_quyet_dinh) return null; // quyết định TGĐ không bị lật

  const kq: ViecApDungLai = {
    cong_viec_id: cv.id,
    ten: cv.ten,
    loai: "doi_nguon",
    nguon_cu: hienHanh ? { id: hienHanh.id, nhan: hienHanh.nhan } : null,
    nguon_moi: null,
    ly_do: "",
    han_cu: cv.ket_thuc,
    han_moi: cv.ket_thuc,
    them_phan_viec: [],
    bo_phan_viec: [],
    ghi_nhan_da_xong: [],
    giu_thao_tac_tay: [],
    doi_trang_thai_nguon: [],
  };
  let coDoi = false;
  let tay: ThaoTacTay[] | null = null;
  const layTay = async () => (tay ??= await docThaoTacTay(q, cv.id));
  const moiTao = new Set<string>(); // phần việc tạo trong lần áp dụng lại này
  const nd = c.nd;
  const nguoi = nd?.id ?? "he-thong";

  // ---- 1. Tính lại nguồn thắng ----
  const pl = hienHanh ? phatLai(nguonDuocSo(dsNguon, cv.nguon_hien_hanh_id), c.ch, c.capBenNgoai) : null;
  if (pl && hienHanh && pl.thang.id !== hienHanh.id && pl.trang_thai.has(hienHanh.id)) {
    coDoi = true;
    const W = pl.thang;
    const d = W.du_lieu;
    kq.nguon_moi = { id: W.id, nhan: W.nhan };
    kq.ly_do = pl.ly_do_thang;
    const sauW = (await layTay()).filter((t) => t.ms > W.ms);
    const giaHanViec = sauW.some((t) => t.hanh_dong === "gia_han" && !t.chi_tiet.phan_viec_id);
    const pvGiaHan = new Set(sauW.filter((t) => t.hanh_dong === "gia_han" && t.chi_tiet.phan_viec_id).map((t) => String(t.chi_tiet.phan_viec_id)));
    const pvDoiNguoi = new Map(sauW.filter((t) => t.hanh_dong === "doi_nguoi").map((t) => [String(t.chi_tiet.phan_viec_id), String(t.chi_tiet.cu ?? "")]));
    const pvThemTay = new Set(sauW.filter((t) => t.hanh_dong === "them_phan_viec").map((t) => String(t.chi_tiet.phan_viec_id)));
    const pvBotTay = new Set(sauW.filter((t) => t.hanh_dong === "bot_phan_viec").map((t) => String(t.chi_tiet.phan_viec_id)));

    const hanMoi = giaHanViec ? cv.ket_thuc : d.ket_thuc || null;
    const luonMo = giaHanViec ? cv.luon_mo : !d.ket_thuc;
    kq.han_moi = hanMoi;
    if (d.ten && d.ten !== cv.ten) kq.ten_moi = d.ten;
    if (giaHanViec) kq.giu_thao_tac_tay.push(`giữ hạn việc đã gia hạn tay (${cv.ket_thuc ?? "luôn mở"})`);

    // Trạng thái nguồn theo phát lại
    for (const n of dsNguon) {
      const t = pl.trang_thai.get(n.id);
      if (t && t.trang_thai !== n.trang_thai)
        kq.doi_trang_thai_nguon.push({ nguon_id: n.id, nhan: n.nhan, tu: n.trang_thai, sang: t.trang_thai, ly_do: t.ly_do });
    }

    // Phần việc theo W, giữ phần đã kết thúc + thao tác tay sau W
    const phan = await docPhan(q, cv.id);
    const dangCo = phan.filter((p) => !p.da_bo);
    const theoKhoa = new Map<string, Phan>();
    for (const p of dangCo) if (!theoKhoa.has(khoaPt(p.phu_trach_loai, p.phu_trach_id))) theoKhoa.set(khoaPt(p.phu_trach_loai, p.phu_trach_id), p);
    const khoaBotTay = new Set(phan.filter((p) => p.da_bo && pvBotTay.has(p.id)).map((p) => khoaPt(p.phu_trach_loai, p.phu_trach_id)));
    const daKhop = new Set<string>();
    let thuTu = phan.reduce((m, p) => Math.max(m, p.thu_tu), 0);
    const capNhat: { id: string; noi_dung: string; bat_dau: string | null; ket_thuc: string | null; giu_ngay: boolean }[] = [];
    const themMoi: (PhuTrachNgay & { noi_dung_pv: string; thu_tu: number })[] = [];
    const boDi: Phan[] = [];

    for (const e of phuTrachCuaNguon(W)) {
      const k = khoaPt(e.loai, e.id);
      const p = theoKhoa.get(k);
      if (p) {
        daKhop.add(p.id);
        if (p.trang_thai !== "dang_lam") continue; // phần đã kết thúc: giữ nguyên
        const giuNgay = giaHanViec || pvGiaHan.has(p.id);
        if (pvGiaHan.has(p.id)) kq.giu_thao_tac_tay.push(`giữ hạn gia hạn tay của phần "${p.noi_dung}" (${p.phu_trach_ten})`);
        const noiDung = e.noi_dung?.trim() || (p.noi_dung === cv.ten ? d.ten : p.noi_dung);
        capNhat.push({ id: p.id, noi_dung: noiDung, bat_dau: e.bat_dau, ket_thuc: e.ket_thuc, giu_ngay: giuNgay });
        continue;
      }
      if (khoaBotTay.has(k)) {
        kq.giu_thao_tac_tay.push(`không thêm lại ${e.ten || e.id}: đã bớt tay sau khi ${W.nhan} đến`);
        continue;
      }
      if (pvDoiNguoi.size) {
        const tenE = [chuanHoa(e.ten), chuanHoa(await tenPhuTrach(q, e.loai, e.id))];
        const pd = dangCo.find((x) => pvDoiNguoi.has(x.id) && !daKhop.has(x.id) && tenE.includes(chuanHoa(pvDoiNguoi.get(x.id))));
        if (pd) {
          daKhop.add(pd.id);
          kq.giu_thao_tac_tay.push(`giữ người đã đổi tay cho phần "${pd.noi_dung}" (${pd.phu_trach_ten} thay ${pvDoiNguoi.get(pd.id)})`);
          continue;
        }
      }
      themMoi.push({ ...e, noi_dung_pv: e.noi_dung?.trim() || d.ten, thu_tu: ++thuTu });
      kq.them_phan_viec.push(e.ten && e.ten !== e.id ? e.ten : await tenPhuTrach(q, e.loai, e.id));
    }
    for (const p of dangCo) {
      if (daKhop.has(p.id) || p.trang_thai !== "dang_lam") continue;
      if (pvThemTay.has(p.id) || pvDoiNguoi.has(p.id) || pvGiaHan.has(p.id)) {
        kq.giu_thao_tac_tay.push(`giữ phần "${p.noi_dung}" (${p.phu_trach_ten}) có thao tác tay sau khi ${W.nhan} đến`);
        continue;
      }
      boDi.push(p);
      kq.bo_phan_viec.push(p.phu_trach_ten);
    }

    if (c.ghi && nd) {
      await q.query(
        `UPDATE docflow.cong_viec SET ten = $2, du_an = $3, hang_muc = $4, ket_qua_can_co = $5, bat_dau = $6, ket_thuc = $7,
           luon_mo = $8, nguon_hien_hanh_id = $9, giao_boi = $10, don_vi_giao = $11 WHERE id = $1`,
        [
          cv.id, d.ten || cv.ten, d.du_an ?? cv.du_an, d.hang_muc ?? cv.hang_muc, d.ket_qua_can_co ?? cv.ket_qua_can_co,
          d.bat_dau || null, hanMoi, luonMo, W.id,
          // quyết định TGĐ: người quyết là người giao; báo cáo: trưởng đơn vị lập (chốt 28/09)
          W.la_quyet_dinh || !W.nguoi_gui ? W.nguoi_gui : await nguoiGiaoTuBaoCao(q, W.don_vi_id, W.nguoi_gui),
          W.don_vi_id,
        ],
      );
      for (const t of kq.doi_trang_thai_nguon)
        await q.query("UPDATE docflow.nguon_cong_viec SET trang_thai = $2, ly_do = $3 WHERE id = $1", [t.nguon_id, t.sang, t.ly_do]);
      const lyDoBo = `không còn trong ${W.nhan} (áp dụng lại quy tắc đè)`;
      for (const p of boDi) await q.query("UPDATE docflow.phan_viec SET da_bo = true, bo_ly_do = $2 WHERE id = $1", [p.id, lyDoBo]);
      for (const u of capNhat) {
        if (u.giu_ngay) await q.query("UPDATE docflow.phan_viec SET noi_dung = $2 WHERE id = $1", [u.id, u.noi_dung]);
        else
          await q.query("UPDATE docflow.phan_viec SET noi_dung = $2, bat_dau = $3, ket_thuc = $4, luon_mo = $5 WHERE id = $1", [
            u.id, u.noi_dung, u.bat_dau, u.ket_thuc, !u.ket_thuc,
          ]);
      }
      for (const e of themMoi) {
        const id = taoMa("pv");
        moiTao.add(id);
        await q.query(
          `INSERT INTO docflow.phan_viec (id, cong_viec_id, phu_trach_loai, phu_trach_id, noi_dung, luon_mo, bat_dau, ket_thuc, thu_tu)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [id, cv.id, e.loai, e.id, e.noi_dung_pv, !e.ket_thuc, e.bat_dau, e.ket_thuc, e.thu_tu],
        );
      }
      await chuanHoaVai(q, cv.id);
      const chiTietChung = { ap_dung_lai: true, ly_do_ap_dung_lai: c.lyDo, cau_hinh_cu: rutGon(c.chCu), cau_hinh_moi: rutGon(c.ch), phien_ban_cau_hinh: c.phienBan ?? null };
      await ghiLichSu(q, {
        nguoi,
        don_vi_id: nd.don_vi_id,
        doi_tuong_loai: "cong_viec",
        doi_tuong_id: cv.id,
        hanh_dong: "bi_de",
        chi_tiet: {
          ...chiTietChung,
          tu: W.nhan,
          bi_de: hienHanh.nhan,
          nguon_id: W.id,
          nguon_bi_de_id: hienHanh.id,
          ly_do: pl.ly_do_thang,
          cap: W.cap,
          ky_bao_cao: W.ky_bao_cao,
          han_cu: cv.ket_thuc,
          han_moi: hanMoi,
          ten_cu: kq.ten_moi ? cv.ten : undefined,
          ten_moi: kq.ten_moi,
          them_phan_viec: kq.them_phan_viec.length ? kq.them_phan_viec : undefined,
          bo_phan_viec: kq.bo_phan_viec.length ? kq.bo_phan_viec : undefined,
          giu_thao_tac_tay: kq.giu_thao_tac_tay.length ? kq.giu_thao_tac_tay : undefined,
        },
      });
      for (const t of kq.doi_trang_thai_nguon.filter((x) => x.sang === "khong_dung")) {
        await ghiLichSu(q, {
          nguoi,
          don_vi_id: nd.don_vi_id,
          doi_tuong_loai: "cong_viec",
          doi_tuong_id: cv.id,
          hanh_dong: "khong_dung",
          chi_tiet: { ...chiTietChung, tu: t.nhan, nguon_id: t.nguon_id, trang_thai_cu: t.tu, ly_do: t.ly_do, hien_hanh: W.nhan },
        });
      }
      if (c.ch.bao_nguoi_gui_khi_khong_dung) {
        if (hienHanh.nguoi_gui && hienHanh.nguoi_gui !== nd.id)
          await taoThongBao(q, {
            nguoi_nhan: hienHanh.nguoi_gui,
            loai: "bi_de",
            noi_dung: `Sau khi đổi quy tắc đè, bản của bạn cho việc ${cv.id} (${hienHanh.nhan}) không còn được dùng: nay dùng ${W.nhan} (${pl.ly_do_thang})`,
            lien_ket: `/cong-viec/${cv.id}`,
          });
        if (W.nguoi_gui && W.nguoi_gui !== nd.id && W.nguoi_gui !== hienHanh.nguoi_gui)
          await taoThongBao(q, {
            nguoi_nhan: W.nguoi_gui,
            loai: "ap_dung_lai_quy_tac",
            noi_dung: `Sau khi đổi quy tắc đè, bản của bạn cho việc ${cv.id} (${W.nhan}) nay là nguồn hiện hành${hanMoi ? `, hạn ${hanMoi}` : ", luôn mở"}`,
            lien_ket: `/cong-viec/${cv.id}`,
          });
      }
    }
  }

  // ---- 2. Ghi nhận "đã xong" trước đây bị thua (khi cài đặt nay bật) ----
  if (c.ch.da_xong_luon_ghi_nhan) {
    const baoXong = dsNguon.filter((n) => n.du_lieu?.da_xong && n.trang_thai !== "hien_hanh");
    if (baoXong.length) {
      const phan = (await docPhan(q, cv.id)).filter((p) => !p.da_bo && p.trang_thai === "dang_lam" && !moiTao.has(p.id));
      const daDong = new Set<string>();
      for (const s of baoXong) {
        const sauS = (await layTay()).filter((t) => t.ms > s.ms && t.chi_tiet.phan_viec_id).map((t) => String(t.chi_tiet.phan_viec_id));
        const cuaNguoiBao = phan.filter(
          (p) =>
            !daDong.has(p.id) &&
            !sauS.includes(p.id) &&
            ((p.phu_trach_loai === "nguoi" && p.phu_trach_id === s.nguoi_gui) || (p.phu_trach_loai === "don_vi" && p.phu_trach_id === s.don_vi_id)),
        );
        for (const p of cuaNguoiBao) {
          daDong.add(p.id);
          kq.ghi_nhan_da_xong.push({ phan_viec_id: p.id, phu_trach: p.phu_trach_ten, tu: s.nhan });
          if (c.ghi && nd) {
            await q.query(
              `UPDATE docflow.phan_viec SET trang_thai = 'da_ket_thuc', ket_thuc_boi = $2, ket_thuc_luc = now(), ghi_chu = $3 WHERE id = $1`,
              [p.id, s.nguoi_gui ?? nd.id, `Báo đã xong trong ${s.nhan} (ghi nhận khi áp dụng lại quy tắc đè)`],
            );
            await ghiLichSu(q, {
              nguoi,
              don_vi_id: nd.don_vi_id,
              doi_tuong_loai: "cong_viec",
              doi_tuong_id: cv.id,
              hanh_dong: "ket_thuc_phan_viec",
              chi_tiet: {
                tu: s.nhan,
                phan_viec_id: p.id,
                noi_dung: p.noi_dung,
                phu_trach: p.phu_trach_ten,
                bao_boi: s.nguoi_gui,
                ly_do: "người phụ trách báo đã xong: ghi nhận khi áp dụng lại quy tắc đè",
                tu_bao_cao: true,
                ap_dung_lai: true,
                ly_do_ap_dung_lai: c.lyDo,
              },
            });
          }
        }
      }
      if (kq.ghi_nhan_da_xong.length && !coDoi) {
        coDoi = true;
        kq.loai = "ghi_nhan_da_xong";
        kq.ly_do = "báo đã xong trước đây nay được ghi nhận (đã xong luôn được ghi nhận)";
      }
    }
  }

  if (!coDoi) return null;
  if (c.ghi && nd) kq.hoan_thanh = (await kiemTraHoanThanh(q, cv.id, nguoi, { ap_dung_lai: true })).hoan_thanh;
  return kq;
}

async function chay(q: Q, c: NguCanh): Promise<KetQuaApDungLai> {
  const viec = await docViecMo(q, c.ghi);
  const nguon = await docNguonViecMo(q);
  const kq: ViecApDungLai[] = [];
  for (const cv of viec) {
    const r = await xuLyViec(q, c, cv, nguon.get(cv.id) ?? []);
    if (r) kq.push(r);
  }
  return { so_viec: kq.length, viec: kq };
}

// ---------------- Hàm công khai ----------------

/**
 * Áp dụng lại quy tắc đè (cấu hình quy_tac_de HIỆN HÀNH — gọi sau khi đã lưu cấu hình mới) cho mọi việc đang mở.
 * Gọi trong tx(). Ghi lịch sử từng việc đổi (chi_tiet.ap_dung_lai = true, cấu hình cũ → mới), báo người gửi nếu cài đặt bật.
 */
export async function apDungLaiQuyTac(
  q: Q,
  nd: NguoiDungPhien,
  lyDo: string,
  tuy: { cau_hinh_cu?: Partial<QuyTacDe> | null; phien_ban?: number } = {},
): Promise<KetQuaApDungLai> {
  const ch = await layCauHinh(q, "quy_tac_de");
  const capBenNgoai = (await layCauHinh(q, "nguoi_ngoai")).cap_ben_ngoai;
  return chay(q, { ch, capBenNgoai, ghi: true, nd, lyDo: lyDo?.trim() || "áp dụng lại quy tắc đè", chCu: tuy.cau_hinh_cu ?? null, phienBan: tuy.phien_ban });
}

/**
 * Xem trước (KHÔNG ghi): những việc sẽ đổi nếu áp dụng quy tắc. `quyTacMoi` = giá trị định lưu (trộn lên cấu hình
 * hiện hành) để quản trị xem trước khi bấm Lưu; bỏ trống = cấu hình hiện hành.
 */
export async function xemTruocApDungLai(q: Q, quyTacMoi?: Partial<QuyTacDe> | null): Promise<KetQuaApDungLai> {
  const hienTai = await layCauHinh(q, "quy_tac_de");
  const ch = { ...hienTai, ...(quyTacMoi ?? {}) } as QuyTacDe;
  const capBenNgoai = (await layCauHinh(q, "nguoi_ngoai")).cap_ben_ngoai;
  return chay(q, { ch, capBenNgoai, ghi: false, lyDo: "xem trước", chCu: hienTai });
}
