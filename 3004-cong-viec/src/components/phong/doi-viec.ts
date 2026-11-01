// ============================================================
// DỰNG ViecO TỪ DỮ LIỆU SƠ ĐỒ — MỘT chỗ cho cả Sơ đồ tổ chức (SoDoPhong) lẫn trang nhúng thẻ việc (/nhung/viec/[ma],
// popup "Việc của tôi" ở Main · Tiến độ · Hợp đồng — Mr. Đại chốt 04/10/2026). Thuần — không gọi mạng.
// ============================================================

import type { OSoDo } from "@/lib/phong/so-do";
import { duAnCuaViec, donViLam, nutDuAnDuoiDonVi, type DuAn } from "@/lib/phong/du-an-thuan";
import type { BoCuc } from "./bo-cuc";
import { chuyenViec, type ViecApi, type ViecO } from "./viec";

/** Phần dữ liệu /api/phong/so-do cần để dựng việc */
export interface DuLieuDoiViec {
  o: OSoDo[];
  lanh_dao: { id: string; ten: string; ten_ngan: string }[];
  nguoi: { id: string; ten: string; don_vi_id: string | null; don_vi_ids?: string[]; chuc_vu?: string | null }[];
  hom_nay: string;
  du_an?: DuAn[];
}

/**
 * Dự án Loại khác đã có Ban điều hành treo NGAY dưới đơn vị làm (BĐH Nậm Mô 1 dưới SCI E&C): ô Ban điều hành thay cho ô dự án
 * dưới đơn vị đó — không vẽ hai ô cho một dự án (Mr. Đại chốt 20/10/2026, mục 7b). Trả `<dự án>@<đơn vị>` → mã ô Ban điều hành.
 */
export function oBdhThayDuAn(dl: Pick<DuLieuDoiViec, "o" | "du_an">): Map<string, string> {
  const chaCua = new Map(dl.o.map((o) => [o.id, o.cha]));
  const r = new Map<string, string>();
  for (const a of dl.du_an ?? []) {
    if (a.nhom === "sci" || !a.ban_dieu_hanh || !chaCua.has(a.ban_dieu_hanh)) continue;
    const cha = chaCua.get(a.ban_dieu_hanh);
    if (cha && donViLam(a).includes(cha)) r.set(`${a.id}@${cha}`, a.ban_dieu_hanh);
  }
  return r;
}

/** Ô trên sân = đơn vị + ô dự án treo dưới SCI PMC / SCI E&C… (Đợt 3; không 📒, không +) — trừ ô đã có Ban điều hành thay */
export function oTatCaCua(dl: DuLieuDoiViec): OSoDo[] {
  const coO = new Set(dl.o.map((o) => o.id));
  const thay = oBdhThayDuAn(dl);
  const da = nutDuAnDuoiDonVi(dl.du_an ?? [], coO)
    .filter((n) => !thay.has(n.id))
    .map((n, i): OSoDo => ({ id: n.id, ten: `Dự án ${n.ten}`, ten_ngan: n.ten, cap: 4, loai: "du_an", mau_ma: null, thu_tu: 10000 + i, cha: n.cha }));
  return [...dl.o, ...da];
}

/**
 * Ô được đếm một việc dự án LOẠI KHÁC (Mr. Đại chốt 20/10/2026, mục 4–5): "Luồng … chỉ lên đến SCI E&C là dừng lại, không đổ
 * về phòng ĐT&PC" — P.ĐT&PC chỉ quan tâm việc dự án SCI đầu tư; Ban lãnh đạo muốn xem thì bấm ô E&C, PMC hoặc menu Dự án › Loại khác.
 * Từ mỗi ô chủ trì đi lên, dừng ở đơn vị làm (SCI E&C, SCI PMC — đơn vị làm của dự án, hoặc của bất kỳ dự án Loại khác nào).
 * Chuỗi không gặp đơn vị làm nào thì dừng trước ô gốc. Ô chủ trì luôn được đếm (kể cả khi chính nó là ô gốc).
 */
export function oDemViecLoaiKhac(nut: string[], a: DuAn, dsDuAn: DuAn[], theoId: Record<string, Pick<OSoDo, "cha">>, goc: string | null): string[] {
  const dung = new Set([...donViLam(a), ...dsDuAn.filter((x) => x.nhom !== "sci").flatMap(donViLam)]);
  const r = new Set<string>();
  for (const n of nut) {
    r.add(n);
    for (let id: string | null | undefined = n; id && !dung.has(id); ) {
      id = theoId[id]?.cha;
      if (!id || id === goc) break;
      r.add(id);
    }
  }
  return [...r];
}

/**
 * Việc không thuộc dự án: nếu một ô chủ trì nằm DƯỚI một công ty độc lập (`dung`) thì đếm từ ô đó lên tới công ty đó rồi dừng.
 * Không ô nào nằm dưới công ty độc lập → null (đếm như thường).
 */
export function oDemDungOCongTy(nut: string[], dung: Set<string>, theoId: Record<string, Pick<OSoDo, "cha">>, goc: string | null): string[] | null {
  const trong = (n: string) => {
    for (let id = theoId[n]?.cha; id; id = theoId[id]?.cha) if (dung.has(id)) return true;
    return false;
  };
  if (!nut.some(trong)) return null;
  const r = new Set<string>();
  for (const n of nut) {
    r.add(n);
    for (let id: string | null | undefined = n; id && !dung.has(id); ) {
      id = theoId[id]?.cha;
      if (!id || id === goc) break;
      r.add(id);
    }
  }
  return [...r];
}

/** Hàm đổi một việc của sổ cái (ViecApi) thành việc hiện trên màn (ViecO) — `bc` là bố cục đủ mọi ô, `theoId` tra ô theo mã */
export function taoDoiViec(dl: DuLieuDoiViec, bc: BoCuc, theoId: Record<string, OSoDo>): (v: ViecApi) => ViecO {
  const coO = new Set(dl.o.map((o) => o.id));
  const lanhDao = new Set(dl.lanh_dao.map((l) => l.id));
  const oCua = (id: string | null) => (!id ? null : coO.has(id) ? id : lanhDao.has(id) ? bc.goc : null);
  const dvNguoi = Object.fromEntries(dl.nguoi.map((n) => [n.id, n.don_vi_id]));
  const tenNguoi = Object.fromEntries(dl.nguoi.map((n) => [n.id, n.ten]));
  const tenNganLd = Object.fromEntries(dl.lanh_dao.map((l) => [l.id, l.ten_ngan]));
  const dsDuAn = dl.du_an ?? [];
  const thay = oBdhThayDuAn(dl);
  const dungChung = new Set(dsDuAn.filter((x) => x.nhom !== "sci").flatMap(donViLam));
  return (v: ViecApi): ViecO => {
    const x = chuyenViec(v, dl.hom_nay, oCua, dvNguoi, tenNguoi, tenNganLd);
    // Việc của dự án: đếm ở ô dự án dưới đơn vị (không đếm thẳng vào đơn vị)
    const da = duAnCuaViec(v.du_an, v.phan_viec.map((p) => p.phu_trach_id), dsDuAn, v.ten);
    if (!da) {
      // Việc KHÔNG thuộc dự án nào mà ô chủ trì nằm dưới một công ty độc lập (đơn vị con của SCI E&C…): cũng dừng ở công ty đó,
      // không đổ về Phòng Đầu tư — Mr. Đại chốt 29/10/2026 (mục 3)
      const duoc = oDemDungOCongTy(x.nut, dungChung, theoId, bc.goc);
      return duoc ? { ...x, duoc } : x;
    }
    const doi = (n: string) => (n && theoId[`${da}@${n}`] ? `${da}@${n}` : n);
    // Ô dự án đã được Ban điều hành thay (7b): việc của đơn vị làm cho dự án đó dồn vào ô Ban điều hành; tên bên phụ trách giữ nguyên
    const dem = (n: string) => thay.get(`${da}@${n}`) ?? doi(n);
    const nut = x.nut.map(dem);
    const a = dsDuAn.find((d) => d.id === da);
    return {
      ...x,
      pt: x.pt.map((p) => ({ ...p, nut: doi(p.nut) })),
      nut,
      nutPh: x.nutPh.map(dem),
      ...(a && a.nhom !== "sci" ? { duoc: oDemViecLoaiKhac(nut, a, dsDuAn, theoId, bc.goc) } : {}),
    };
  };
}
