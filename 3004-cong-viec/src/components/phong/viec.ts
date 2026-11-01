// phong/viec.ts — việc trong sổ cái → việc trên sơ đồ (ô nào, trễ hay không). MÁY tính, không LLM. Hàm thuần.
import { cachNgay, congNgay, khoangNgay, tuanCua } from "@/lib/phong/tuan";

export interface PhanViecApi {
  id: string;
  phu_trach_loai: "nguoi" | "don_vi";
  phu_trach_id: string;
  phu_trach_ten?: string;
  ket_thuc: string | null;
  trang_thai: string;
  da_bo?: boolean;
  luon_mo?: boolean;
  vai?: "chu_tri" | "phoi_hop";
}

export interface ViecApi {
  id: string;
  ten: string;
  du_an: string | null;
  ket_qua_can_co: string | null;
  luon_mo: boolean;
  bat_dau: string | null;
  ket_thuc: string | null;
  giao_boi: string | null;
  don_vi_giao: string | null;
  phan_viec: PhanViecApi[];
  /** Việc đã rời sổ cái (nút "Xong tuần …" / "Xong 30 ngày"): trạng thái + lúc xong */
  trang_thai?: string;
  dong_luc?: string | null;
  /** lúc việc vào sổ (giao tay / lọc từ báo cáo) — đếm "mới" trên nút Xong */
  tao_luc?: string | null;
  /** Máy chủ tính theo người đang xem: phần việc người này bấm Xong được · có quyền gia hạn / phối hợp / hủy không */
  co_the_ket_thuc?: string[];
  co_the_sua?: boolean;
  co_the_sua_viec?: boolean;
  /** việc đã xong: người giao + lãnh đạo mở lại được (K1 02/10) */
  co_the_mo_lai?: boolean;
  /** thêm đơn vị phối hợp: người sửa được việc + trưởng đơn vị cấp trên của bên chủ trì (K5 02/10) */
  co_the_phoi_hop?: boolean;
  /** phần việc giao cho CẢ đơn vị mà người xem là trưởng đơn vị đó — phân công cho nhân viên (chốt 30/09) */
  co_the_phan_cong?: string[];
  /** phần việc CHỦ TRÌ của đơn vị mình làm trưởng — gia hạn được dù việc do người khác giao (phương án A, 29/10/2026) */
  co_the_dieu_chinh?: string[];
  nguon_hien_hanh?: { tai_lieu_id: string | null; nhan: string; don_vi_id: string | null; don_vi_ten?: string | null; ky_bao_cao?: string | null; du_lieu?: { nguon_bang?: string; cot_khac?: Record<string, string> } | null } | null;
}

export interface PhanViecO {
  id: string;
  /** người hay đơn vị phụ trách, và mã của họ (để lọc "Việc của tôi") */
  loai: "nguoi" | "don_vi";
  pid: string;
  nut: string;
  ten: string;
  /** Tên riêng khi ô trên sơ đồ gộp nhiều bên (8 chức danh BLĐ → ô "Ban lãnh đạo"; giao cho người) — hiện "PTGĐ · Đoàn Thế Anh" thay vì tên ô */
  tenRieng?: string;
  xong: boolean;
  kt: string | null;
  vai: "chu_tri" | "phoi_hop";
}

export interface ViecO {
  ma: string;
  ten: string;
  bd: string | null;
  kt: string | null;
  luonMo: boolean;
  kq: string | null;
  /** dự án (để ô tìm việc tìm theo dự án) */
  duAn: string | null;
  pt: PhanViecO[];
  /** Ô CHỦ TRÌ — việc được đếm ở ô này (số việc, trễ) */
  nut: string[];
  /** Ô PHỐI HỢP — chỉ hiện ở nhóm "Phối hợp", không đếm (Mr. Đại chốt 28/09) */
  nutPh: string[];
  /**
   * Chỉ việc dự án LOẠI KHÁC: các ô được đếm việc này — từ ô chủ trì đi lên tới đơn vị làm (SCI E&C, SCI PMC) là dừng,
   * không cộng vào P.ĐT&PC, Ban lãnh đạo (Mr. Đại chốt 20/10/2026). Không có = đếm ở mọi ô cấp trên như thường.
   */
  duoc?: string[];
  /** Phần của mình / bộ phận mình bấm Xong được — chủ trì đứng trước */
  coTheXong: { id: string; vai: "chu_tri" | "phoi_hop" }[];
  /** Gia hạn, thêm phối hợp, hủy việc */
  coTheSua: boolean;
  /** Cây bút ✏ sửa toàn bộ việc (quyền "Sửa việc") */
  coTheSuaViec: boolean;
  /** Việc đã xong: nút "Mở lại" (người giao + lãnh đạo) */
  coTheMoLai: boolean;
  /** Nút "＋ Phối hợp" */
  coThePhoiHop: boolean;
  /** Phần việc của CẢ đơn vị mình (mình là trưởng) — chọn một nhân viên là giao ngay */
  coThePhanCong: { id: string; dv: string; ten: string; loai: "nguoi" | "don_vi" }[];
  /** mã phần việc gia hạn được (trưởng đơn vị chủ trì, không sửa được cả việc) */
  coTheDieuChinh: string[];
  nguon: ViecApi["nguon_hien_hanh"];
  giao: string | null;
  /** mã người giao + việc có phải GIAO THỦ CÔNG (nút "+ Giao việc" / quyết định TGĐ) — cho nút "Việc tôi giao" */
  giaoBoi: string | null;
  giaoTay: boolean;
  han: string | null;
  tt: "tre" | "sap" | "con" | "thuong-xuyen" | "xong";
  ttChu: string;
  /** Ngày hoàn thành (giờ VN, YYYY-MM-DD) — chỉ việc đã xong; việc đã xong chỉ để xem, không nút thao tác */
  xongNgay: string | null;
  /** Ngày việc phát sinh (vào sổ), giờ VN YYYY-MM-DD */
  taoNgay: string | null;
  loiNgay: boolean;
  /** Tên người đang chủ trì (nhiều người nối bằng ", ") khi MỌI phần chủ trì còn mở đã là cá nhân; null = còn phần giao cả đơn vị — việc chung */
  nguoiTen: string | null;
}

/**
 * `oCua(id)`: ô trên sơ đồ ứng với một đơn vị (chức danh lãnh đạo → Ban lãnh đạo; không có trên sơ đồ → null).
 * `dvNguoi`: người → đơn vị. `tenNguoi`: id/email → tên.
 */
export function chuyenViec(
  v: ViecApi,
  homNay: string,
  oCua: (donViId: string | null) => string | null,
  dvNguoi: Record<string, string | null>,
  tenNguoi: Record<string, string>,
  tenGon: Record<string, string> = {},
): ViecO {
  const pt: PhanViecO[] = v.phan_viec
    .filter((p) => !p.da_bo)
    .map((p) => {
      const dv = p.phu_trach_loai === "don_vi" ? p.phu_trach_id : (dvNguoi[p.phu_trach_id] ?? null);
      const vai = p.vai === "phoi_hop" ? "phoi_hop" : "chu_tri";
      const nut = oCua(dv) ?? "";
      const tenRieng = p.phu_trach_loai === "nguoi" ? (tenNguoi[p.phu_trach_id] ?? p.phu_trach_ten) : nut !== p.phu_trach_id ? tenGon[p.phu_trach_id] : undefined;
      return { id: p.id, loai: p.phu_trach_loai, pid: p.phu_trach_id, nut, tenRieng, ten: p.phu_trach_ten ?? p.phu_trach_id, xong: p.trang_thai !== "dang_lam", kt: p.ket_thuc, vai };
    });
  const ct = pt.filter((p) => p.vai === "chu_tri");
  const nut = [...new Set(ct.map((p) => p.nut).filter(Boolean))];
  if (!nut.length) {
    const o = oCua(v.don_vi_giao);
    if (o) nut.push(o);
  }
  const nutPh = [...new Set(pt.filter((p) => p.vai === "phoi_hop").map((p) => p.nut).filter((n) => n && !nut.includes(n)))];
  const ks = ct.filter((p) => !p.xong).map((p) => p.kt).filter((x): x is string => !!x).sort();
  const han = ks[0] ?? v.ket_thuc ?? null;
  let tt: ViecO["tt"];
  let ttChu: string;
  const ngayVn = (luc: string) => new Date(Date.parse(luc) + 7 * 36e5).toISOString().slice(0, 10);
  const xongNgay = v.trang_thai === "hoan_thanh" && v.dong_luc ? ngayVn(v.dong_luc) : null;
  const taoNgay = v.tao_luc && !Number.isNaN(Date.parse(v.tao_luc)) ? ngayVn(v.tao_luc) : null;
  if (xongNgay) {
    tt = "xong";
    // Mr. Đại giao 01/10: việc đã xong hiện "Xong ngày dd/mm/yyyy", chữ xanh lá đậm (phong.css .da-xong)
    ttChu = `Xong ngày ${xongNgay.slice(8, 10)}/${xongNgay.slice(5, 7)}/${xongNgay.slice(0, 4)}`;
  } else if (v.luon_mo || !han) {
    tt = "thuong-xuyen";
    ttChu = "việc thường xuyên";
  } else {
    const n = cachNgay(homNay, han);
    if (n < 0) [tt, ttChu] = ["tre", `quá hạn ${-n} ngày`];
    else if (n <= 3) [tt, ttChu] = ["sap", n === 0 ? "đến hạn hôm nay" : `còn ${n} ngày`];
    else [tt, ttChu] = ["con", `còn ${n} ngày`];
  }
  return {
    ma: v.id,
    ten: v.ten,
    bd: v.bat_dau,
    kt: v.ket_thuc,
    luonMo: v.luon_mo,
    kq: v.ket_qua_can_co,
    duAn: v.du_an,
    pt,
    nut,
    nutPh,
    coTheXong: pt
      .filter((p) => (v.co_the_ket_thuc ?? []).includes(p.id))
      .map((p) => ({ id: p.id, vai: p.vai }))
      .sort((a, b) => Number(a.vai === "phoi_hop") - Number(b.vai === "phoi_hop")),
    coTheSua: !!v.co_the_sua,
    coTheSuaViec: !!v.co_the_sua_viec,
    coTheMoLai: !!v.co_the_mo_lai && v.trang_thai === "hoan_thanh",
    coThePhoiHop: !!(v.co_the_phoi_hop ?? v.co_the_sua),
    coThePhanCong: pt.filter((p) => (v.co_the_phan_cong ?? []).includes(p.id)).map((p) => ({ id: p.id, dv: p.pid, ten: p.ten, loai: p.loai })),
    coTheDieuChinh: v.co_the_dieu_chinh ?? [],
    nguon: v.nguon_hien_hanh ?? null,
    giao: v.giao_boi ? (tenNguoi[v.giao_boi] ?? v.giao_boi) : null,
    giaoBoi: v.giao_boi,
    giaoTay: ["giao_tay", "bang_quyet_dinh"].includes(v.nguon_hien_hanh?.du_lieu?.nguon_bang ?? ""),
    han,
    tt,
    ttChu,
    xongNgay,
    taoNgay,
    loiNgay: !!(v.bat_dau && v.ket_thuc && v.ket_thuc < v.bat_dau),
    nguoiTen: nguoiChuTri(pt, tenGon),
  };
}

/** Tên cá nhân đang chủ trì: người, hoặc chức danh lãnh đạo (một người giữ). Còn phần chủ trì giao CẢ đơn vị → null (việc chung) */
function nguoiChuTri(pt: PhanViecO[], tenGon: Record<string, string>): string | null {
  const moDang = pt.filter((p) => p.vai === "chu_tri" && !p.xong);
  const mo = moDang.length ? moDang : pt.filter((p) => p.vai === "chu_tri"); // việc đã xong: người đã chủ trì
  if (!mo.length) return null;
  const ten: string[] = [];
  for (const p of mo) {
    const t = p.loai === "nguoi" ? (p.tenRieng ?? p.ten) : tenGon[p.pid] ? (p.tenRieng ?? tenGon[p.pid]) : null;
    if (!t) return null;
    if (!ten.includes(t)) ten.push(t);
  }
  return ten.join(", ");
}

/** Tên riêng = chữ cuối của họ tên ("Quách Thị Thanh Thủy" → "Thủy") */
const tenRieng = (ho: string) => ho.trim().split(/\s+/).pop() ?? ho;
const soTen = (a: string, b: string) => tenRieng(a).localeCompare(tenRieng(b), "vi") || a.localeCompare(b, "vi");

/**
 * Gom việc của một nhóm theo NGƯỜI chủ trì (Mr. Đại chốt 29/10/2026): mỗi người một đầu mục (tên đậm) xếp A–Z theo tên riêng,
 * việc giao cả đơn vị (chưa giao cá nhân) là «việc chung» đứng CUỐI. Việc nhiều người chủ trì hiện ở từng người.
 */
export function gomTheoNguoi<T extends ViecO>(ds: T[]): { nguoi: string | null; ds: T[] }[] {
  const theo = new Map<string, T[]>();
  const chung: T[] = [];
  for (const v of ds) {
    if (!v.nguoiTen) chung.push(v);
    else for (const t of v.nguoiTen.split(", ")) theo.set(t, [...(theo.get(t) ?? []), v]);
  }
  const ra = [...theo.keys()].sort(soTen).map((n) => ({ nguoi: n as string | null, ds: theo.get(n)! }));
  if (chung.length) ra.push({ nguoi: null, ds: chung });
  return ra;
}

/** Chữ thường bỏ dấu — ô tìm việc gõ "nam xe" vẫn ra "Nậm Xe" */
export const boDau = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

/** Ô tìm việc (Mr. Đại chốt 30/09): mã việc · tên việc · tên người (phụ trách, người giao) · dự án · đơn vị phụ trách */
export function chuTimViec(v: ViecO, tenO: (id: string) => string = () => ""): string {
  return boDau([v.ma, v.ten, v.duAn ?? "", v.giao ?? "", ...v.pt.flatMap((p) => [p.tenRieng ?? "", p.ten, p.nut ? tenO(p.nut) : ""])].join(" | "));
}

/** Ô phạm vi cạnh ô tìm: bỏ trống = tìm trong những gì cột phải đang hiện (theo các nút lọc); chọn = tìm theo phạm vi, bỏ qua nút lọc */
export type PhamViTim = "" | "cong_ty" | "phong" | "ca_nhan" | LocChuyenTiep;
export const PHAM_VI_TIM: { kieu: Exclude<PhamViTim, "">; nhan: string; giai_thich: string }[] = [
  { kieu: "cong_ty", nhan: "Việc toàn công ty", giai_thich: "Mọi việc của công ty (đang làm + đã xong gần đây)" },
  { kieu: "phong", nhan: "Việc thuộc phòng", giai_thich: "Việc đơn vị của tôi chủ trì hoặc phối hợp (kể cả đơn vị kiêm nhiệm)" },
  { kieu: "ca_nhan", nhan: "Việc thuộc cá nhân", giai_thich: "Việc tôi giao, hoặc giao đích danh tên tôi / chức danh tôi giữ (chủ trì hay phối hợp) — không tính việc giao cho cả đơn vị" },
];

/** Ô phạm vi đang là PHẠM VI TÌM (chỉ có tác dụng khi gõ chữ) — khác hai lựa chọn lọc giao chuyển tiếp (lọc ngay) */
export const laPhamTim = (p: PhamViTim): p is "cong_ty" | "phong" | "ca_nhan" => p === "cong_ty" || p === "phong" || p === "ca_nhan";

/**
 * Lọc GIAO CHUYỂN TIẾP (Mr. Đại chốt 21/10/2026) — hai lựa chọn cùng ô «Lọc tìm kiếm», chọn là lọc NGAY danh sách đang hiện
 * (theo ô đang chọn + các nút bên trái), không cần gõ chữ. Chỉ xét phần CHỦ TRÌ còn mở:
 *   · đã giao chuyển tiếp  = mọi phần chủ trì đã là một CÁ NHÂN (người, hoặc chức danh lãnh đạo — một người giữ)
 *   · chưa giao chuyển tiếp = còn phần chủ trì là CẢ ĐƠN VỊ → trưởng đơn vị đó biết để giao tiếp cho một người
 * Giao chuyển tiếp (`phanCong`, so-cai/dich-vu.ts) đổi đúng phần việc đó từ đơn vị sang người, nên hai nhóm cộng lại = cả danh sách.
 */
export type LocChuyenTiep = "da_giao_ct" | "chua_giao_ct";
export const LOC_CHUYEN_TIEP: { kieu: LocChuyenTiep; nhan: string; giai_thich: string }[] = [
  { kieu: "chua_giao_ct", nhan: "Việc chưa giao chuyển tiếp", giai_thich: "Việc đang giao cho cả một đơn vị, chưa có cá nhân cụ thể chủ trì — trưởng đơn vị giao chuyển tiếp cho một người" },
  { kieu: "da_giao_ct", nhan: "Việc đã giao chuyển tiếp", giai_thich: "Việc đã có cá nhân cụ thể chủ trì (người, hoặc chức danh lãnh đạo)" },
];
export function locChuyenTiep<T extends ViecO>(ds: T[], kieu: LocChuyenTiep, lanhDao: Set<string>): T[] {
  const caNhan = (p: PhanViecO) => p.loai === "nguoi" || lanhDao.has(p.pid);
  return ds.filter((v) => {
    const ct = v.pt.filter((p) => p.vai === "chu_tri" && !p.xong);
    const chua = ct.some((p) => !caNhan(p));
    return kieu === "chua_giao_ct" ? chua : ct.length > 0 && !chua;
  });
}

/** Chọn phạm vi ở ô nhỏ: việc thuộc phạm vi đó (bỏ qua các nút lọc). oToi = ô trên cây của các đơn vị tôi (chính + kiêm nhiệm) */
export function locPhamVi<T extends ViecO>(ds: T[], pham: PhamViTim, oToi: Set<string>, tl: ToiLoc | null): T[] {
  if (pham === "cong_ty") return ds;
  if (pham === "phong") return ds.filter((v) => [...v.nut, ...v.nutPh].some((n) => oToi.has(n)));
  // Cá nhân (Mr. Đại chốt 30/09): việc tôi giao + việc giao ĐÍCH DANH tên tôi / chức danh tôi giữ (chủ trì hoặc phối hợp).
  // KHÔNG tính việc giao cho cả đơn vị tôi đứng đầu (khác nút "Cần phối hợp").
  if (pham === "ca_nhan") {
    if (!tl) return [];
    const laToi = (p: PhanViecO) => (p.loai === "nguoi" ? p.pid === tl.id : tl.chucDanh.includes(p.pid));
    return ds.filter((v) => (v.giaoTay && v.giaoBoi === tl.id) || v.pt.some(laToi));
  }
  return ds;
}

/** Hai nút việc ĐÃ HOÀN THÀNH (Mr. Đại chốt 30/09): tuần đang chọn (tới hôm nay) · 30 ngày tính cả hôm nay */
export type KieuXong = "xong_tuan" | "xong_30";
export function khoangXongCua(tuan: { tu: string; den: string }, homNay: string): Record<KieuXong, [string, string]> {
  return { xong_tuan: [tuan.tu, tuan.den < homNay ? tuan.den : homNay], xong_30: [congNgay(homNay, -29), homNay] };
}
/** Nhãn nút: "Tuần 40: xong 5 · mới 12" (Mr. Đại chốt 30/09) — số tính cho ô đang chọn và các ô bên dưới */
export function nutXong(tuanSo: number | string, k: Record<KieuXong, [string, string]>): { kieu: KieuXong; nhan: string; tieu_de: string; giai_thich: string }[] {
  const giai = (ky: string, kh: [string, string]) =>
    `${ky} — ${khoangNgay(kh[0], kh[1])}. Xong = việc hoàn thành trong kỳ; mới = việc phát sinh (giao tay hoặc lọc từ báo cáo) trong kỳ, không tính việc đã hủy. ` +
    "Tính cho ô đang chọn và các ô bên dưới. Bấm để xem việc đã xong (chỉ xem)";
  return [
    { kieu: "xong_tuan", nhan: `Tuần ${tuanSo}`, tieu_de: `Việc xong tuần ${tuanSo}`, giai_thich: giai(`Tuần ${tuanSo}`, k.xong_tuan) },
    { kieu: "xong_30", nhan: "30 ngày", tieu_de: "Việc xong 30 ngày", giai_thich: giai("30 ngày gần nhất", k.xong_30) },
  ];
}
/**
 * Khối "Việc làm xong: Tuần N−1 và N" cuối mỗi nhóm ở cột phải (Mr. Đại giao 01/10 — họp giao ban thứ Ba xem lại tuần trước):
 * việc xong từ đầu TUẦN TRƯỚC tuần đang chọn tới hết tuần đang chọn (không quá hôm nay). Vd thứ Ba 06/10 (tuần 41):
 * tuần 40 (28/09–04/10) + 05–06/10.
 */
export function khoangViecLamXong(tuan: { tu: string; den: string }, homNay: string): { tu: string; den: string; nhan: string; giai_thich: string } {
  const truoc = tuanCua(congNgay(tuan.tu, -7));
  const nay = tuanCua(tuan.tu);
  const den = tuan.den < homNay ? tuan.den : homNay;
  return { tu: truoc.tu, den, nhan: `Việc làm xong: Tuần ${truoc.so} và ${nay.so}`, giai_thich: `${khoangNgay(truoc.tu, den)} — bấm để xem việc đã xong (chỉ xem)` };
}
/** Việc xong trong khoảng, mới xong đứng trước */
export const xongMoiTruoc = <T extends ViecO>(ds: T[], k: { tu: string; den: string }) =>
  ds.filter((v) => !!v.xongNgay && v.xongNgay >= k.tu && v.xongNgay <= k.den).sort((a, b) => (a.xongNgay! < b.xongNgay! ? 1 : a.xongNgay! > b.xongNgay! ? -1 : 0));

export const xongTrongKhoang = <T extends ViecO>(ds: T[], k: [string, string]) => ds.filter((v) => !!v.xongNgay && v.xongNgay >= k[0] && v.xongNgay <= k[1]);
export const moiTrongKhoang = <T extends ViecO>(ds: T[], k: [string, string]) => ds.filter((v) => !!v.taoNgay && v.taoNgay >= k[0] && v.taoNgay <= k[1]);

/** Việc chưa trễ đứng sau; việc thường xuyên cuối; còn lại theo hạn. */
export const xepViec = (ds: ViecO[]) =>
  [...ds].sort((a, b) => Number(a.tt === "thuong-xuyen") - Number(b.tt === "thuong-xuyen") || ((a.han ?? "") < (b.han ?? "") ? -1 : 1));

/** Bộ lọc cạnh nút Issue — dùng chung Sơ đồ tổ chức và menu Dự án. */
export type LocToi = "" | "giao" | "nhan" | "phoi_hop";

/** Người đang xem, cho bộ lọc: chức danh lãnh đạo mình giữ (chức danh kèm tên = cá nhân) + đơn vị mình đứng đầu. */
export interface ToiLoc {
  id: string;
  chucDanh: string[];
  /** đơn vị mình là đầu (trưởng chính, hoặc trưởng khác vẫn nhận chuông — chốt 03/10): thấy phần phối hợp giao cho đơn vị */
  donViTruong: string[];
}

/**
 * Ba nút thay "Việc của tôi / Việc của phòng / Việc thuộc hệ thống" (Mr. Đại chốt 28/09) — chỉ việc ĐÍCH DANH, không theo đơn vị:
 *  "giao": việc tôi giao thủ công (nút "+ Giao việc" hoặc quyết định TGĐ) — người giao là tôi.
 *  "nhan": tôi CHỦ TRÌ đích danh — tên tôi, hoặc chức danh lãnh đạo tôi giữ.
 *  "phoi_hop": phần PHỐI HỢP chưa xong giao đích danh tôi / chức danh tôi — hoặc (trưởng đơn vị) giao cho đơn vị tôi đứng đầu;
 *              việc tôi (hay đơn vị tôi) đã chủ trì thì không tính.
 * Xem việc theo đơn vị: bấm ô trên sơ đồ.
 */
export function locViec(ds: ViecO[], kieu: LocToi, toi: ToiLoc | null): ViecO[] {
  if (!kieu || !toi) return ds;
  const laToi = (p: PhanViecO) => (p.loai === "nguoi" ? p.pid === toi.id : toi.chucDanh.includes(p.pid));
  const laCuaToi = (p: PhanViecO) => laToi(p) || (p.loai === "don_vi" && toi.donViTruong.includes(p.pid));
  if (kieu === "giao") return ds.filter((v) => v.giaoTay && v.giaoBoi === toi.id);
  if (kieu === "nhan") return ds.filter((v) => v.pt.some((p) => p.vai === "chu_tri" && laToi(p)));
  return ds.filter((v) => !v.pt.some((p) => p.vai === "chu_tri" && laCuaToi(p)) && v.pt.some((p) => p.vai === "phoi_hop" && !p.xong && laCuaToi(p)));
}

/** Người đang xem → ToiLoc. `lanhDao`: các chức danh lãnh đạo trên sơ đồ. */
export function toiLoc(toi: { id: string; don_vi_ids?: string[]; vai_tro?: string[]; don_vi_dau?: string[] } | null, lanhDao: Set<string>): ToiLoc | null {
  if (!toi) return null;
  const dv = toi.don_vi_ids ?? [];
  // Đơn vị tôi là ĐẦU (nhận chuông như trưởng — gồm cả nơi đã có trưởng chính khác, Mr. Đại chốt 03/10); phiên cũ thì suy như trước
  const dau = toi.don_vi_dau ?? ((toi.vai_tro ?? []).includes("truong-don-vi") ? dv : []);
  return {
    id: toi.id,
    chucDanh: dv.filter((d) => lanhDao.has(d)),
    donViTruong: dau.filter((d) => !lanhDao.has(d)),
  };
}

/** nhan = tiêu đề cột phải; ngan = chữ trên nút (6 nút bằng nhau, Mr. Đại chốt 30/09 cho đổi chữ) */
export const NUT_LOC: { kieu: Exclude<LocToi, "">; nhan: string; ngan: string; giai_thich: string }[] = [
  { kieu: "giao", nhan: "Việc tôi giao", ngan: "Tôi giao", giai_thich: "Việc tôi giao thủ công (nút + Giao việc, hoặc quyết định TGĐ) — không tính việc máy tách từ báo cáo" },
  { kieu: "nhan", nhan: "Việc tôi nhận", ngan: "Tôi nhận", giai_thich: "Việc tôi chủ trì, giao đích danh tên tôi hoặc chức danh lãnh đạo tôi giữ — không tính việc giao cho cả đơn vị" },
  { kieu: "phoi_hop", nhan: "Việc cần phối hợp", ngan: "Cần phối hợp", giai_thich: "Phần phối hợp chưa xong giao đích danh tôi; trưởng đơn vị thấy cả phần giao cho đơn vị mình. Việc tôi đã chủ trì thì không tính" },
];

/** Một lựa chọn "giao cho / phối hợp" trong các ô chọn đơn vị. */
export interface NoiGiao {
  id: string;
  ten: string;
  ten_ngan: string;
  /** Ô chức danh lãnh đạo (đích danh) — hộp Sửa việc tách riêng ô "Lãnh đạo phối hợp" (chốt 03/10) */
  lanh_dao?: boolean;
}

/**
 * Danh sách để chọn người/đơn vị nhận việc (Mr. Đại chốt 28/09): Ban lãnh đạo KHÔNG chung chung — từng lãnh đạo đích danh
 * (chức danh kèm tên) đứng đầu, rồi các đơn vị; bỏ ô "Ban Tổng giám đốc" gộp.
 */
export function noiGiaoDichDanh(o: { id: string; ten: string; ten_ngan: string; loai: string }[], lanhDao: NoiGiao[]): NoiGiao[] {
  return [
    ...lanhDao.map((l) => ({ id: l.id, ten: l.ten, ten_ngan: l.ten_ngan, lanh_dao: true })),
    ...o.filter((x) => x.loai !== "ban_tgd" && x.loai !== "chuc_danh").map((x) => ({ id: x.id, ten: x.ten, ten_ngan: x.ten_ngan })),
  ];
}
