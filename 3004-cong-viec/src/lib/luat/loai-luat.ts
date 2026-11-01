// ============================================================
// luat/loai-luat.ts — CÁC DẠNG LUẬT CODE (THUẦN, không đụng CSDL). Chủ: agent luat-loai.
// Code không cần biết trước từng luật, chỉ biết trước DẠNG luật; người dùng chọn dạng rồi điền tham số.
// Chữ ký là hợp đồng (xem types.ts). Dạng bắt buộc có (mã cố định):
//   o_co_gia_tri · o_khop_mau · so_sanh_ngay · khoang_so · bang_toi_thieu · cot_bat_buoc ·
//   thuoc_danh_sach · neu_thi · muc_co_noi_dung · khong_trung · phu_trach_hop_le
// Dạng tính toán (loai/tinh-toan.ts): tinh_toan (kết quả = A − B, A + B…, A ÷ B × 100) · dong_tong (dòng TỔNG = tổng các dòng)
// Thân từng dạng nằm trong loai/*.ts; ở đây ghép registry + kiểm tham số + đọc thành lời.
// ============================================================
import type { DinhNghiaLoaiLuat, DinhNghiaMauRutGon } from "./types-them";
import type { ThamChieu, ThamSoDinhNghia } from "./types";
import {
  type LoaiDayDu,
  type ThamSoDayDu,
  PHEP_DIEU_KIEN,
  PHEP_SO,
  kiemBangMau,
  kiemCotMau,
  kiemMucMau,
  kiemOMau,
  kiemThamChieuMau,
  laDieuKien,
  laThamChieu,
  soThamSo,
  taoBoNhan,
} from "./loai/chung";
import { KHOANG_SO, O_CO_GIA_TRI, O_KHOP_MAU, THUOC_DANH_SACH } from "./loai/o";
import { BANG_TOI_THIEU, COT_BAT_BUOC, KHONG_TRUNG, PHU_TRACH_HOP_LE } from "./loai/bang";
import { NEU_THI, SO_SANH_NGAY } from "./loai/ngay-dieu-kien";
import { MUC_CO_NOI_DUNG } from "./loai/muc";
import { DONG_TONG, TINH_TOAN } from "./loai/tinh-toan";

const DS_LOAI: LoaiDayDu[] = [
  O_CO_GIA_TRI,
  O_KHOP_MAU,
  SO_SANH_NGAY,
  KHOANG_SO,
  BANG_TOI_THIEU,
  COT_BAT_BUOC,
  THUOC_DANH_SACH,
  NEU_THI,
  MUC_CO_NOI_DUNG,
  KHONG_TRUNG,
  PHU_TRACH_HOP_LE,
  TINH_TOAN,
  DONG_TONG,
];

const LOAI_DAY_DU: Record<string, LoaiDayDu> = Object.fromEntries(DS_LOAI.map((l) => [l.ma, l]));

export const LOAI_LUAT: Record<string, DinhNghiaLoaiLuat> = LOAI_DAY_DU;

const coGiaTri = (v: unknown) => v !== undefined && v !== null && !(typeof v === "string" && !v.trim());

/** Kiểm một tham số theo kiểu khai báo (+ có thật trong mẫu nếu có mẫu). */
function kiemMotThamSo(d: ThamSoDayDu, ts: Record<string, unknown>, mau: DinhNghiaMauRutGon | null): string[] {
  const v = ts[d.khoa];
  const ten = `"${d.nhan}"`;
  if (!coGiaTri(v)) return d.bat_buoc ? [`Thiếu tham số ${ten} (${d.khoa})`] : [];
  switch (d.kieu) {
    case "o":
      return typeof v === "string" ? kiemOMau(v.trim(), mau, ten) : [`${ten} phải là tag ô (chữ)`];
    case "bang":
      return typeof v === "string" ? kiemBangMau(v.trim(), mau, ten) : [`${ten} phải là tag bảng (chữ)`];
    case "cot": {
      if (typeof v !== "string") return [`${ten} phải là tag cột (chữ)`];
      const bang = d.theo_bang ? ts[d.theo_bang] : undefined;
      if (typeof bang !== "string" || !bang.trim()) return []; // thiếu bảng: đã báo ở tham số bảng
      if (mau && !mau.bang.some((b) => b.tag === bang.trim())) return []; // bảng sai: đã báo
      return kiemCotMau(bang.trim(), v.trim(), mau, ten);
    }
    case "tham_chieu":
      return kiemThamChieu(v, d, mau, ten);
    case "phep_so":
      return PHEP_SO.includes(v as never) ? [] : [`${ten} phải là một trong ${PHEP_SO.join(" ")}`];
    case "so":
      return soThamSo(v) === null ? [`${ten} phải là số (đang là ${JSON.stringify(v)})`] : [];
    case "chu":
      return typeof v === "string" ? [] : [`${ten} phải là chữ`];
    case "muc":
      return typeof v === "string" ? kiemMucMau(v.trim(), mau, ten) : [`${ten} phải là tiêu đề mục (chữ)`];
    case "danh_sach":
      return Array.isArray(v) && v.every((x) => typeof x === "string" || typeof x === "number") ? [] : [`${ten} phải là danh sách chữ`];
    case "bool":
      return typeof v === "boolean" ? [] : [`${ten} phải là đúng/sai`];
    case "dieu_kien":
      return kiemDieuKien(v, mau, ten);
  }
  return [];
}

function kiemThamChieu(v: unknown, d: Pick<ThamSoDayDu, "cho_ky">, mau: DinhNghiaMauRutGon | null, ten: string): string[] {
  if (!laThamChieu(v)) return [`${ten} phải trỏ tới một ô ({ o }), một cột ({ bang, cot })${d.cho_ky ? " hoặc kỳ báo cáo ({ ky: 'tu' | 'den' })" : ""}`];
  if ("ky" in v && !d.cho_ky) return [`${ten} không trỏ tới kỳ báo cáo được — chọn một ô hoặc một cột`];
  const tc: ThamChieu = "o" in v ? { o: v.o.trim() } : "bang" in v ? { bang: v.bang.trim(), cot: v.cot.trim() } : v;
  return kiemThamChieuMau(tc, mau, ten);
}

function kiemDieuKien(v: unknown, mau: DinhNghiaMauRutGon | null, ten: string): string[] {
  if (!v || typeof v !== "object" || Array.isArray(v)) return [`${ten} phải là điều kiện { tham_chieu, phep, gia_tri }`];
  const x = v as Record<string, unknown>;
  const loi = kiemThamChieu(x.tham_chieu, { cho_ky: true }, mau, `${ten}, chỗ xét`);
  if (!PHEP_DIEU_KIEN.includes(x.phep as never)) loi.push(`${ten}: phép "${String(x.phep)}" không hợp lệ (chọn: ${PHEP_DIEU_KIEN.join(", ")})`);
  else if (x.phep !== "co_gia_tri" && x.phep !== "trong") {
    if (!coGiaTri(x.gia_tri)) loi.push(`${ten}: thiếu giá trị để so`);
    else if (typeof x.gia_tri !== "string" && typeof x.gia_tri !== "number") loi.push(`${ten}: giá trị để so phải là chữ hoặc số`);
    else if (PHEP_SO.includes(x.phep as never) && soThamSo(x.gia_tri) === null && !/^\d{1,2}[/.\-]\d{1,2}[/.\-]\d{4}$|^\d{4}-\d{2}-\d{2}$/.test(String(x.gia_tri).trim())) {
      loi.push(`${ten}: phép ${String(x.phep)} cần giá trị là số hoặc ngày (đang là "${String(x.gia_tri)}")`);
    }
  }
  return loi;
}

/** Kiểm tham số của một luật code so với dạng luật + định nghĩa mẫu (ô/bảng/cột có thật không). Rỗng = hợp lệ. */
export function kiemThamSo(loai: string, thamSo: Record<string, unknown>, mau: DinhNghiaMauRutGon | null): string[] {
  const l = LOAI_DAY_DU[loai];
  if (!l) return [`Không có dạng luật "${loai}" (có: ${DS_LOAI.map((x) => x.ma).join(", ")})`];
  if (!thamSo || typeof thamSo !== "object" || Array.isArray(thamSo)) return ["Tham số phải là một đối tượng { khóa: giá trị }"];
  const loi = l.tham_so.flatMap((d) => kiemMotThamSo(d, thamSo, mau));
  if (loi.length) return loi;
  // Tham số dạng điều kiện đã hợp lệ thì mới kiểm ràng buộc riêng của dạng
  if (l.tham_so.some((d) => d.kieu === "dieu_kien" && coGiaTri(thamSo[d.khoa]) && !laDieuKien(thamSo[d.khoa]))) return loi;
  return l.kiemThem ? l.kiemThem(thamSo, mau) : [];
}

/** Đọc tham số thành câu tiếng Việt cho người dùng, vd 'Cột "% HT" của bảng "Tiến độ" phải từ 0 đến 100'. */
export function docThanhLoi(loai: string, thamSo: Record<string, unknown>, mau: DinhNghiaMauRutGon | null): string {
  const l = LOAI_DAY_DU[loai];
  if (!l) return `Dạng luật "${loai}" không có trong hệ thống`;
  try {
    return l.doc(thamSo ?? {}, taoBoNhan(mau));
  } catch {
    return `${l.ten} (tham số chưa đủ để đọc)`;
  }
}

export { DINH_DANG_CO_SAN } from "./loai/o";
export { docSo } from "./loai/chung";
export type { ThamSoDinhNghia };
