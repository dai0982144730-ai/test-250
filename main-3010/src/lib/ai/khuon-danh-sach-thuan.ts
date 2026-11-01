// ============================================================
// KHUÔN DANH SÁCH — rút gọn kết quả công cụ dài TRƯỚC KHI đưa cho AI (Mr. Đại chốt 28/10/2026)
//
// Vì sao: đo 28/10 trên 425 lượt chat — thời gian chờ phụ thuộc vào số chữ AI GÕ RA (tương quan 0,97, ~45 token/giây),
// không phụ thuộc chữ đọc vào. Câu liệt kê 28 issue / 78 hồ sơ mất 45–70 giây. Bớt dòng đưa cho AI thì AI gõ ít đi.
//
// Mặc định «khuôn» (cắt gọn); quản trị đổi từng nhóm sang «đầy đủ» ở Cài đặt → Khuôn danh sách, không cần dựng lại.
// Người dùng gõ «xem hết / liệt kê đủ / toàn bộ» thì lượt đó trả đủ.
//
// File THUẦN — không node:fs (luật 10). Đọc cài đặt ở khuon-danh-sach-cai-dat.ts.
// 7 nhóm: muc · ngay · hang · boq · tracuu · thongbao · nhathau (xem NHOM)
// ============================================================

export type CheDo = "khuon" | "day-du";
export type MaNhom = "muc" | "ngay" | "hang" | "boq" | "tracuu" | "thongbao" | "nhathau";

export interface CaiDatNhom {
  cheDo: CheDo;
  /** Số dòng tối đa (nhóm boq: cận dưới) */
  soDong: number;
  /** Nhóm boq: cận trên số dòng chính */
  soDongToiDa?: number;
  /** Nhóm ngay: chỉ nhìn trong N ngày tới (và quá hạn) khi người hỏi không nêu khoảng ngày */
  soNgay?: number;
}

export type CaiDatKhuon = Record<MaNhom, CaiDatNhom>;

export const NHAN_NHOM: Record<MaNhom, string> = {
  muc: "Theo mức (issue, hồ sơ thiếu) — đỏ trước, vàng sau",
  ngay: "Theo ngày (việc có hạn, hồ sơ cần bắt đầu, việc đã xong)",
  hang: "Xếp hạng chậm (đường găng, việc quá hạn, việc của tôi)",
  boq: "BOQ và khối lượng — khối lượng chính trước, phụ chỉ khi chính ít",
  tracuu: "Tra cứu văn bản, khung thủ tục, hồ sơ thiết kế",
  thongbao: "Thông báo, đơn vị chưa nộp báo cáo",
  nhathau: "Nhà thầu, thầu phụ",
};

export const CAI_DAT_MAC_DINH: CaiDatKhuon = {
  muc: { cheDo: "khuon", soDong: 10 },
  ngay: { cheDo: "khuon", soDong: 10, soNgay: 7 },
  hang: { cheDo: "khuon", soDong: 10 },
  boq: { cheDo: "khuon", soDong: 10, soDongToiDa: 20 },
  tracuu: { cheDo: "khuon", soDong: 10 },
  thongbao: { cheDo: "khuon", soDong: 10 },
  nhathau: { cheDo: "khuon", soDong: 10 },
};

/** Ghép cài đặt đọc từ tệp (có thể thiếu/hỏng) với mặc định — luôn trả đủ 7 nhóm, số dòng trong 1…200 */
export function chuanHoaCaiDat(raw: unknown): CaiDatKhuon {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, Partial<CaiDatNhom> | undefined>;
  const so = (v: unknown, mac: number, lo = 1, hi = 200) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : mac);
  const ra = {} as CaiDatKhuon;
  for (const k of Object.keys(CAI_DAT_MAC_DINH) as MaNhom[]) {
    const mac = CAI_DAT_MAC_DINH[k];
    const g = r[k] ?? {};
    const nhom: CaiDatNhom = { cheDo: g.cheDo === "day-du" ? "day-du" : "khuon", soDong: so(g.soDong, mac.soDong) };
    if (mac.soDongToiDa !== undefined) nhom.soDongToiDa = Math.max(nhom.soDong, so(g.soDongToiDa, mac.soDongToiDa));
    if (mac.soNgay !== undefined) nhom.soNgay = so(g.soNgay, mac.soNgay, 1, 365);
    ra[k] = nhom;
  }
  return ra;
}

/** Người dùng đòi xem đủ: «xem hết», «liệt kê đủ», «toàn bộ», «tất cả các dòng», «đầy đủ» (không phân biệt dấu) */
export function doiXemHet(tin: string | undefined): boolean {
  const t = (tin ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();
  return /\b(xem|liet ke|ke|hien|cho toi)\s+(het|du|day du|toan bo|tat ca)\b|toan bo danh sach|day du|tat ca (cac )?(muc|dong|issue|ho so|viec)/.test(t);
}

// ───────────────────── Bảng công cụ → nhóm → chỗ mảng nằm ─────────────────────

interface Luat {
  nhom: MaNhom;
  /** Đường tới mảng trong `data` của ToolResult */
  duong: string[];
  /** Cách chọn + xếp; trả các dòng GIỮ (đã xếp) */
  chon: (ds: Rec[], cd: CaiDatNhom, boi: BoiCanh) => Rec[];
  /** Mô tả cách lọc để AI nói lại với người dùng */
  cach: (cd: CaiDatNhom, boi: BoiCanh) => string;
}

type Rec = Record<string, unknown>;
interface BoiCanh {
  /** Ngày hôm nay theo giờ VN, yyyy-mm-dd */
  homNay: string;
  /** Người hỏi có nêu khoảng ngày riêng không (tu_ngay/den_ngay) */
  coKhoangRieng: boolean;
}

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : 0);
const giam = <T,>(ds: T[], k: (x: T) => number): T[] => [...ds].sort((a, b) => k(b) - k(a));

/** dd/mm/yyyy hoặc yyyy-mm-dd → yyyy-mm-dd; không đọc được → "" */
export function ngayIso(v: unknown): string {
  const s = String(v ?? "");
  const a = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (a) return `${a[1]}-${a[2]}-${a[3]}`;
  const b = /(\d{2})\/(\d{2})\/(\d{4})/.exec(s);
  return b ? `${b[3]}-${b[2]}-${b[1]}` : "";
}
const cong = (iso: string, n: number): string => new Date(Date.parse(iso + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);

const MUC_DO = (r: Rec): number => {
  const m = String(r.mucDo ?? r.trang_thai_do ?? "").toLowerCase();
  return m === "do" || m === "đỏ" ? 2 : m === "vang" || m === "vàng" ? 1 : 0;
};

/** Đỏ trước, vàng sau; trong cùng mức: quá hạn nhiều ngày nhất trước. Đỏ đủ N thì không hiện vàng. */
function chonTheoMuc(ds: Rec[], cd: CaiDatNhom): Rec[] {
  const xep = [...ds].sort((a, b) => MUC_DO(b) - MUC_DO(a) || num(b.so_ngay_qua_han) - num(a.so_ngay_qua_han));
  const do_ = xep.filter((r) => MUC_DO(r) === 2);
  return do_.length >= cd.soDong ? do_.slice(0, cd.soDong) : xep.slice(0, cd.soDong);
}

/** Phần chính: sắp theo trọng số giảm dần, giữ tới khi cộng dồn đủ 80% tổng, kẹp trong [soDong, soDongToiDa] */
export function chonChinh(ds: Rec[], trong: (r: Rec) => number, nThap: number, nCao: number): Rec[] {
  const xep = giam(ds, trong);
  const tong = xep.reduce((s, r) => s + Math.max(0, trong(r)), 0);
  if (tong <= 0) return xep.slice(0, nThap);
  let dem = 0;
  let k = 0;
  for (; k < xep.length; k++) {
    dem += Math.max(0, trong(xep[k]!));
    if (dem / tong >= 0.8) { k++; break; }
  }
  return xep.slice(0, Math.min(nCao, Math.max(nThap, k)));
}

/** Việc theo ngày: không nêu khoảng riêng → chỉ quá hạn + trong N ngày tới; luôn cắt N dòng gần hôm nay nhất */
function chonTheoNgay(layNgay: (r: Rec) => string) {
  return (ds: Rec[], cd: CaiDatNhom, boi: BoiCanh): Rec[] => {
    const han = cong(boi.homNay, cd.soNgay ?? 7);
    const trongCua = boi.coKhoangRieng ? ds : ds.filter((r) => { const n = layNgay(r); return n === "" || n <= han; });
    return [...trongCua].sort((a, b) => Math.abs(Date.parse((layNgay(a) || boi.homNay) + "T00:00:00Z") - Date.parse(boi.homNay + "T00:00:00Z")) - Math.abs(Date.parse((layNgay(b) || boi.homNay) + "T00:00:00Z") - Date.parse(boi.homNay + "T00:00:00Z"))).slice(0, cd.soDong);
  };
}

const cachMuc = (cd: CaiDatNhom) => `đỏ trước, vàng sau, tối đa ${cd.soDong} dòng`;
const cachNgay = (cd: CaiDatNhom, boi: BoiCanh) => (boi.coKhoangRieng ? `gần hôm nay nhất, tối đa ${cd.soDong} dòng` : `quá hạn và trong ${cd.soNgay ?? 7} ngày tới, tối đa ${cd.soDong} dòng`);
const cachHang = (cd: CaiDatNhom) => `chậm nhiều ngày nhất, tối đa ${cd.soDong} dòng`;
const cachDau = (cd: CaiDatNhom) => `${cd.soDong} dòng đầu`;
/** Số ngày chậm của một dòng Gantt: lấy hệ chậm hơn (dòng chưa có số thì coi là 0) */
const ngayChamGantt = (r: Rec): number => {
  const ngay = (k: string) => num(((r[k] ?? {}) as Rec).ngay);
  return Math.max(ngay("cham_so_muc_tieu"), ngay("cham_so_baseline"));
};
const theoSoNgayTre = (k: string) => (ds: Rec[], cd: CaiDatNhom) => giam(ds, (r) => num(r[k])).slice(0, cd.soDong);

const LUAT: Record<string, Luat> = {
  // ── theo mức
  phaply_ho_so_thieu: { nhom: "muc", duong: ["du_lieu", "ho_so_thieu"], chon: chonTheoMuc, cach: cachMuc },
  phaply_danh_sach_issue: { nhom: "muc", duong: ["du_lieu", "issue"], chon: chonTheoMuc, cach: cachMuc },
  danh_sach_issue: { nhom: "muc", duong: ["du_lieu", "issue"], chon: chonTheoMuc, cach: cachMuc },
  base_danh_sach_issue: { nhom: "muc", duong: ["du_lieu", "issue"], chon: chonTheoMuc, cach: cachMuc },
  hopdong_danh_sach_issue: { nhom: "muc", duong: ["du_lieu", "issue"], chon: chonTheoMuc, cach: cachMuc },
  nghiemthu_danh_sach_issue: { nhom: "muc", duong: ["du_lieu", "issue"], chon: chonTheoMuc, cach: cachMuc },
  // ── theo ngày
  phaply_doi_ngay_nen_bat_dau: { nhom: "ngay", duong: ["du_lieu", "ho_so"], chon: chonTheoNgay((r) => ngayIso(r.ngay_nen_bat_dau)), cach: cachNgay },
  viec_trong_khoang: { nhom: "ngay", duong: ["du_lieu", "viec"], chon: chonTheoNgay((r) => ngayIso(r.du_bao_bat_dau ?? r.baseline_bat_dau)), cach: cachNgay },
  base_viec_co_han_trong_khoang: { nhom: "ngay", duong: ["du_lieu", "viec"], chon: chonTheoNgay((r) => ngayIso(r.han)), cach: cachNgay },
  base_viec_da_xong: { nhom: "ngay", duong: ["du_lieu", "viec"], chon: chonTheoNgay((r) => ngayIso(r.xong_ngay)), cach: cachNgay },
  // ── xếp hạng chậm
  duong_gang: { nhom: "hang", duong: ["du_lieu", "viec_gang_dang_tre"], chon: theoSoNgayTre("so_ngay_tre"), cach: cachHang },
  base_viec_qua_han: { nhom: "hang", duong: ["du_lieu", "viec"], chon: theoSoNgayTre("qua_han_ngay"), cach: cachHang },
  // Đo 28/10: 27 dòng / 20.363 ký tự; mỗi dòng có chậm theo HAI hệ (Tiến độ mục tiêu, Baseline) — xếp theo hệ nào chậm hơn
  bang_gantt: {
    nhom: "hang",
    duong: ["du_lieu", "dong"],
    chon: (ds, cd) => giam(ds, ngayChamGantt).slice(0, cd.soDong),
    cach: (cd) => `chậm nhiều ngày nhất (theo hệ chậm hơn trong Tiến độ mục tiêu và Baseline), tối đa ${cd.soDong} dòng`,
  },
  // ── BOQ và khối lượng: chính = trọng số lớn; cộng dồn 80%, kẹp [soDong, soDongToiDa]
  luy_ke_boq: {
    nhom: "boq",
    duong: ["du_lieu", "dong"],
    chon: (ds, cd) => {
      const chinh = chonChinh(ds, (r) => num(r.ty_trong), cd.soDong, cd.soDongToiDa ?? 20);
      // dòng vượt thiết kế luôn hiện (việc quan trọng cần chú ý)
      const vuot = ds.filter((r) => num(r.kl_boq) > 0 && num(r.da_thi_cong) > num(r.kl_boq) && !chinh.includes(r));
      return [...chinh, ...vuot];
    },
    cach: (cd) => `khối lượng chính (tỷ trọng lớn nhất, ${cd.soDong}–${cd.soDongToiDa ?? 20} dòng) và mọi dòng vượt thiết kế`,
  },
  bao_cao_ngay_boq: { nhom: "boq", duong: ["du_lieu", "ma"], chon: (ds, cd) => chonChinh(ds, (r) => num(r.luy_ke), cd.soDong, cd.soDongToiDa ?? 20), cach: (cd) => `việc chính làm nhiều nhất (${cd.soDong}–${cd.soDongToiDa ?? 20} dòng)` },
  nghiemthu_doi_chieu_khoi_luong: { nhom: "boq", duong: ["du_lieu", "hang_muc"], chon: (ds, cd) => chonChinh(ds, (r) => num(r.pt_thi_cong_theo_gia_tri), cd.soDong, cd.soDongToiDa ?? 20), cach: (cd) => `hạng mục chính theo giá trị (${cd.soDong}–${cd.soDongToiDa ?? 20} dòng)` },
  // ── tra cứu
  phaply_van_ban_theo_nhom: { nhom: "tracuu", duong: ["du_lieu", "van_ban"], chon: (ds, cd) => ds.slice(0, cd.soDong), cach: cachDau },
  phaply_khung_thu_tuc: { nhom: "tracuu", duong: ["du_lieu", "thu_tuc"], chon: (ds, cd) => ds.slice(0, cd.soDong), cach: cachDau },
  // ── thông báo
  base_thong_bao_cua_toi: { nhom: "thongbao", duong: ["du_lieu", "thong_bao"], chon: (ds, cd) => [...ds].sort((a, b) => String(b.luc ?? "").localeCompare(String(a.luc ?? ""))).slice(0, cd.soDong), cach: (cd) => `mới nhất, tối đa ${cd.soDong} dòng` },
  base_bao_cao_da_nop: { nhom: "thongbao", duong: ["du_lieu", "chua_nop"], chon: (ds, cd) => [...ds].sort((a, b) => Number(b.da_qua_han === true) - Number(a.da_qua_han === true)).slice(0, cd.soDong), cach: (cd) => `đã quá hạn trước, tối đa ${cd.soDong} dòng` },
  // ── nhà thầu
  hop_dong_nha_thau: { nhom: "nhathau", duong: ["du_lieu", "hop_dong"], chon: (ds, cd) => giam(ds, (r) => num(r.gia_tri_hop_dong ?? r.gia_tri_boq_phan_nhan)).slice(0, cd.soDong), cach: (cd) => `giá trị hợp đồng lớn nhất, tối đa ${cd.soDong} dòng` },
  thau_phu: { nhom: "nhathau", duong: ["du_lieu", "theo_wbs"], chon: (ds, cd) => ds.slice(0, cd.soDong), cach: cachDau },
};

export const CONG_CU_CO_KHUON: readonly string[] = Object.keys(LUAT);

function layMang(data: unknown, duong: string[]): Rec[] | null {
  let x: unknown = data;
  for (const k of duong) {
    if (!x || typeof x !== "object") return null;
    x = (x as Rec)[k];
  }
  return Array.isArray(x) && x.every((e) => e && typeof e === "object") ? (x as Rec[]) : null;
}

function thayMang(data: unknown, duong: string[], moi: Rec[]): unknown {
  if (duong.length === 0) return moi;
  const [k, ...tiep] = duong;
  const goc = (data ?? {}) as Rec;
  return { ...goc, [k!]: thayMang(goc[k!], tiep, moi) };
}

export interface KetQuaCongCu {
  ok: boolean;
  summary: string;
  data?: unknown;
}

export interface DauVaoKhuon {
  ten: string;
  args: Record<string, unknown>;
  ketQua: KetQuaCongCu;
  caiDat: CaiDatKhuon;
  /** Tin cuối của người dùng (để bắt «xem hết») */
  tin?: string;
  homNay: string;
}

/**
 * Áp khuôn lên kết quả một công cụ. Trả kết quả MỚI (không sửa bản gốc); không áp được (công cụ ngoài bảng, chế độ đầy đủ,
 * người dùng đòi xem hết, mảng không thấy, hoặc số dòng ≤ giới hạn) thì trả NGUYÊN kết quả.
 */
export function apDungKhuon(d: DauVaoKhuon): KetQuaCongCu {
  const luat = LUAT[d.ten];
  if (!luat || !d.ketQua.ok) return d.ketQua;
  const cd = d.caiDat[luat.nhom];
  if (cd.cheDo !== "khuon" || doiXemHet(d.tin)) return d.ketQua;
  const ds = layMang(d.ketQua.data, luat.duong);
  if (!ds || ds.length <= cd.soDong) return d.ketQua;
  const boi: BoiCanh = { homNay: d.homNay, coKhoangRieng: Boolean(d.args.tu_ngay || d.args.den_ngay) };
  const giu = luat.chon(ds, cd, boi);
  if (giu.length >= ds.length) return d.ketQua;
  const an = ds.length - giu.length;
  const ghiChu =
    `\n[KHUÔN DANH SÁCH — chế độ cắt gọn] Hiện ${giu.length}/${ds.length} dòng (${luat.cach(cd, boi)}). ` +
    `Chỉ liệt kê đúng ${giu.length} dòng này; KHÔNG tự thêm dòng khác. Cuối câu BẮT BUỘC ghi một dòng: «Còn ${an} mục nữa — nhắn "xem hết" để xem đủ.»`;
  return {
    ...d.ketQua,
    summary: d.ketQua.summary + ghiChu,
    data: {
      ...(thayMang(d.ketQua.data, luat.duong, giu) as Rec),
      khuon_danh_sach: { nhom: luat.nhom, tong: ds.length, hien: giu.length, an, cach_loc: luat.cach(cd, boi) },
    },
  };
}
