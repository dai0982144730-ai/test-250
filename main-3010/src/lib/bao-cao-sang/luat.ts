// ============================================================
// LUẬT ĐỘNG CỦA BÁO CÁO SÁNG — đọc câu nhắn tiếng Việt ra một luật
// MD: PLAN-MAIN-AGENT mục 6.2 (bảng `core.luat_bao_cao_sang`)
//
// ⭐ LUẬT QUAN TRỌNG NHẤT (mục 6.2): **lệnh nhắn hôm nay CHỈ ÁP CHO HÔM NAY**,
//    trừ khi nói rõ "từ nay trở đi" (không hạn) hoặc "tuần này" (đến Chủ nhật).
//    Vì sao phải ép ở tầng đọc câu chứ không để người dùng tự nhớ:
//    "không có luật này thì sau ba tháng có 90 luật chồng nhau, không ai nhớ
//     nổi đang bật cái gì, và báo cáo sáng thành thứ không ai đọc."
//
// ⛔ ĐỌC CÂU NHẮN LÀM BẰNG CODE, KHÔNG GỌI LLM. Ba lý do:
//    1. Chạy 21:00/07:00 không người trực — lượt LLM tốn token phải người bấm;
//    2. Soi từ khoá thì TEST ĐƯỢC, LLM thì không cho kết quả xác định;
//    3. Đọc sai hạn hiệu lực là hỏng đúng cái luật quan trọng nhất ở trên.
//
// File THUẦN — không đụng node:fs, màn hình client import được (luật 10).
// ============================================================

import { gioVn } from "@/lib/gio-vn";

// ─────────────────────────────────────────────────────────────
// Kiểu dữ liệu
// ─────────────────────────────────────────────────────────────

/** Ba mức hiệu lực — KHÔNG có mức thứ tư, thêm mức là mở đường cho luật chồng */
export type PhamViHieuLuc = "mot-ngay" | "tuan-nay" | "khong-han";

export const NHAN_PHAM_VI: Record<PhamViHieuLuc, string> = {
  "mot-ngay": "Một ngày",
  "tuan-nay": "Tuần này",
  "khong-han": "Không hạn",
};

/** Một luật động — khuôn theo `core.luat_bao_cao_sang` (mục 6.2) */
export interface LuatBaoCao {
  ma: string;
  /** Câu người dùng nhắn, giữ NGUYÊN VĂN — không tóm tắt, không sửa chính tả */
  noiDung: string;
  phamVi: PhamViHieuLuc;
  /** Ngày ISO (giờ VN) bắt đầu có hiệu lực */
  hieuLucTu: string;
  /** Ngày ISO cuối cùng còn hiệu lực; null = không hạn */
  hieuLucDen: string | null;
  nguoiDat: string;
  /** ISO đầy đủ, lúc người dùng nhắn */
  thoiDiemDat: string;
  /** "telegram" | "khung chat" — để về sau truy được lệnh đến từ đâu */
  nguon: string;
}

/** Kết quả đọc một câu nhắn. Không bao giờ ném lỗi — mọi ngả đều có nhánh. */
export type KetQuaDocCau =
  | { loai: "them-luat"; luat: LuatBaoCao }
  | { loai: "hoi-luat" }
  | { loai: "xoa-luat"; goiY: string }
  | { loai: "khong-hieu"; lyDo: string };

// ─────────────────────────────────────────────────────────────
// Chuẩn hoá chữ trước khi soi từ khoá
// ─────────────────────────────────────────────────────────────

/**
 * Bỏ dấu tiếng Việt + hạ chữ thường. Vì sao cần: người dùng nhắn qua Telegram
 * lúc gõ có dấu lúc không ("tu nay tro di" và "từ nay trở đi" là MỘT lệnh),
 * đọc trượt một cái là luật thành 1 ngày thay vì vĩnh viễn.
 */
export function boDau(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Từ khoá KHÔNG HẠN — xét TRƯỚC mọi mức khác (mục 6.2 bảng dòng 2) */
const TU_KHOA_KHONG_HAN = [
  "tu nay",
  "tu gio",
  "ke tu nay",
  "tro di",
  "tro ve sau",
  "ve sau",
  "luon luon",
  "mai mai",
  "vinh vien",
  "hang ngay",
  "moi ngay",
  "moi sang",
  "hang sang",
] as const;

/** Từ khoá TUẦN NÀY — hết hiệu lực đúng Chủ nhật của tuần đó (bảng dòng 3) */
const TU_KHOA_TUAN_NAY = ["tuan nay", "trong tuan", "ca tuan", "het tuan"] as const;

/** Từ khoá chỉ NGÀY MAI — vẫn là 1 ngày, nhưng là ngày mai chứ không phải hôm nay */
const TU_KHOA_NGAY_MAI = ["sang mai", "ngay mai", "sang hom sau", "hom sau"] as const;

function chua(chuoi: string, tuKhoa: readonly string[]): boolean {
  return tuKhoa.some((t) => chuoi.includes(t));
}

/**
 * Đọc phạm vi hiệu lực từ câu nhắn.
 * Thứ tự xét là CÓ CHỦ Ý: không-hạn → tuần-này → mặc định một-ngày.
 * "từ tuần này trở đi" phải ra KHÔNG HẠN, nên không-hạn xét trước.
 */
export function nhanDienPhamVi(cau: string): PhamViHieuLuc {
  const c = boDau(cau);
  if (chua(c, TU_KHOA_KHONG_HAN)) return "khong-han";
  if (chua(c, TU_KHOA_TUAN_NAY)) return "tuan-nay";
  // ⭐ MẶC ĐỊNH LÀ MỘT NGÀY. Không nói gì = chỉ hôm nay. Đây là cái chốt chặn
  //    90 luật chồng nhau; đừng đổi mặc định này thành "không hạn" cho tiện.
  return "mot-ngay";
}

// ─────────────────────────────────────────────────────────────
// Tính ngày
// ─────────────────────────────────────────────────────────────

/** Cộng n ngày vào một ngày ISO "YYYY-MM-DD" (tính bằng UTC nên không lệch múi) */
export function congNgay(ngay: string, n: number): string {
  const t = new Date(`${ngay}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}

/**
 * Chủ nhật của tuần chứa `ngay`. Tuần Việt Nam đi Thứ Hai → Chủ nhật, nên
 * Chủ nhật là NGÀY CUỐI tuần: hôm nay đã là Chủ nhật thì trả về chính nó
 * (luật "tuần này" đặt sáng Chủ nhật chỉ còn hiệu lực trong hôm đó).
 */
export function chuNhatCuaTuan(ngay: string): string {
  const thu = new Date(`${ngay}T00:00:00Z`).getUTCDay(); // 0 = Chủ nhật
  return congNgay(ngay, thu === 0 ? 0 : 7 - thu);
}

/** Ngày (giờ VN) của một mốc thời gian — tái dùng gioVn, không tự đổi múi giờ */
export function ngayVn(luc: Date): string {
  return gioVn(luc).ngay;
}

/**
 * Ngày hết hiệu lực theo phạm vi. `null` = không hạn.
 * "mot-ngay" hết hạn NGAY TRONG NGÀY bắt đầu — đúng chữ "chỉ áp cho hôm nay".
 */
export function tinhHieuLucDen(phamVi: PhamViHieuLuc, hieuLucTu: string): string | null {
  if (phamVi === "khong-han") return null;
  if (phamVi === "tuan-nay") return chuNhatCuaTuan(hieuLucTu);
  return hieuLucTu;
}

/**
 * Ngày bắt đầu có hiệu lực. "sáng mai báo kỹ về HP1" nhắn tối nay phải áp cho
 * BÁO CÁO SÁNG MAI, không phải cho hôm nay — nên câu có "sáng mai/ngày mai"
 * thì dời mốc bắt đầu sang hôm sau (vẫn đúng một ngày, không dài thêm).
 */
export function nhanDienNgayBatDau(cau: string, ngayNhan: string): string {
  const c = boDau(cau);
  if (chua(c, TU_KHOA_KHONG_HAN)) return ngayNhan; // "từ nay" = từ hôm nay
  if (chua(c, TU_KHOA_TUAN_NAY)) return ngayNhan;
  return chua(c, TU_KHOA_NGAY_MAI) ? congNgay(ngayNhan, 1) : ngayNhan;
}

// ─────────────────────────────────────────────────────────────
// Nhận biết câu HỎI LUẬT / XOÁ LUẬT
// ─────────────────────────────────────────────────────────────

const TU_HOI = ["gi", "nao", "dang bat", "dang co", "liet ke", "danh sach", "xem"] as const;

/** "đang bật những luật gì?" → liệt kê luật còn hiệu lực (mục 6.2 bảng dòng 4) */
export function laCauHoiLuat(cau: string): boolean {
  const c = boDau(cau).replace(/[?.!]/g, "");
  if (!c.includes("luat")) return false;
  if (c.includes("xoa") || c.includes("bo luat") || c.includes("huy")) return false;
  return chua(c, TU_HOI);
}

/** "xoá luật …" — cố ý KHÔNG xoá qua câu nhắn, vì xoá nhầm thì không hoàn lại */
export function laCauXoaLuat(cau: string): boolean {
  const c = boDau(cau);
  if (!c.includes("luat")) return false;
  return c.includes("xoa") || c.includes("huy") || c.includes("go bo") || c.includes("bo luat");
}

// ─────────────────────────────────────────────────────────────
// Sinh mã luật — tất định để test kiểm được, không dùng random
// ─────────────────────────────────────────────────────────────

function bam(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export function maLuat(thoiDiemDat: string, noiDung: string): string {
  return `L${thoiDiemDat.replace(/\D/g, "").slice(0, 14)}-${bam(noiDung)}`;
}

// ─────────────────────────────────────────────────────────────
// Cửa chính: đọc câu nhắn
// ─────────────────────────────────────────────────────────────

export interface BoiCanhDocCau {
  nguoiDat: string;
  /** Lúc nhận câu nhắn; mặc định "bây giờ" */
  luc?: Date;
  /** "telegram" | "khung chat" */
  nguon?: string;
}

/**
 * ĐỌC MỘT CÂU NHẮN RA LUẬT. Hàm thuần: không đụng đĩa, không gọi mạng.
 *
 * Bảng đối chiếu lấy đúng mục 6.2:
 *   "sáng mai báo kỹ về HP1"            → luật 1 ngày (là ngày mai)
 *   "từ nay bỏ mục nhân lực"            → luật không hạn
 *   "tuần này theo dõi sát nhà thầu TS" → hiệu lực đến hết Chủ nhật
 *   "đang bật những luật gì?"           → liệt kê luật còn hiệu lực
 */
export function docCauNhan(cau: string, boiCanh: BoiCanhDocCau): KetQuaDocCau {
  const goc = cau.trim();
  if (goc.length < 3) {
    return { loai: "khong-hieu", lyDo: "Câu nhắn quá ngắn, chưa rõ muốn báo cáo sáng làm gì." };
  }
  if (laCauHoiLuat(goc)) return { loai: "hoi-luat" };
  if (laCauXoaLuat(goc)) {
    return {
      loai: "xoa-luat",
      goiY:
        "Xoá luật làm trên màn Báo cáo sáng (Báo cáo → tab Sáng) — mỗi luật có nút Xoá riêng. " +
        "Cố ý không xoá qua câu nhắn vì xoá nhầm thì không hoàn lại được.",
    };
  }

  const luc = boiCanh.luc ?? new Date();
  const thoiDiemDat = luc.toISOString();
  const ngayNhan = ngayVn(luc);
  const phamVi = nhanDienPhamVi(goc);
  const hieuLucTu = nhanDienNgayBatDau(goc, ngayNhan);

  return {
    loai: "them-luat",
    luat: {
      ma: maLuat(thoiDiemDat, goc),
      noiDung: goc,
      phamVi,
      hieuLucTu,
      hieuLucDen: tinhHieuLucDen(phamVi, hieuLucTu),
      nguoiDat: boiCanh.nguoiDat,
      thoiDiemDat,
      nguon: boiCanh.nguon ?? "khung chat",
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Lọc luật còn hiệu lực
// ─────────────────────────────────────────────────────────────

/** Luật này có áp cho ngày `ngay` (ISO, giờ VN) không */
export function conHieuLuc(luat: LuatBaoCao, ngay: string): boolean {
  if (ngay < luat.hieuLucTu) return false;
  if (luat.hieuLucDen === null) return true;
  return ngay <= luat.hieuLucDen;
}

/**
 * Lọc danh sách luật còn hiệu lực cho một ngày. Luật hết hạn TỰ RỤNG khỏi
 * danh sách — không cần ai đi dọn, cũng không xoá khỏi đĩa (giữ lại để tra
 * được "hôm ấy báo cáo chạy theo luật nào").
 */
export function locLuatConHieuLuc(ds: readonly LuatBaoCao[], ngay: string): LuatBaoCao[] {
  return ds.filter((l) => conHieuLuc(l, ngay));
}

/** Luật đã hết hạn tính đến ngày `ngay` — màn hình hiện riêng một khối mờ */
export function locLuatHetHan(ds: readonly LuatBaoCao[], ngay: string): LuatBaoCao[] {
  return ds.filter((l) => !conHieuLuc(l, ngay));
}

/** "2026-09-05" → "05/09" */
export function ngayGon(ngay: string): string {
  return `${ngay.slice(8, 10)}/${ngay.slice(5, 7)}`;
}

/** Câu tiếng Việt mô tả hiệu lực, hiện thẳng lên màn — KHÔNG có luật ẩn (6.2) */
export function moTaHieuLuc(luat: LuatBaoCao): string {
  if (luat.hieuLucDen === null) return `Không hạn — từ ${ngayGon(luat.hieuLucTu)}`;
  if (luat.hieuLucDen === luat.hieuLucTu) return `Chỉ ngày ${ngayGon(luat.hieuLucTu)}`;
  return `Từ ${ngayGon(luat.hieuLucTu)} đến hết ${ngayGon(luat.hieuLucDen)}`;
}

/** Chuẩn hoá một dòng đọc từ đĩa — dữ liệu cũ/thiếu trường thì bỏ dòng đó */
export function chuanHoaLuat(v: unknown): LuatBaoCao | null {
  if (typeof v !== "object" || v === null) return null;
  const o = v as Record<string, unknown>;
  const noiDung = typeof o.noiDung === "string" ? o.noiDung.trim() : "";
  const hieuLucTu = typeof o.hieuLucTu === "string" ? o.hieuLucTu : "";
  if (noiDung === "" || !/^\d{4}-\d{2}-\d{2}$/.test(hieuLucTu)) return null;
  const phamVi: PhamViHieuLuc =
    o.phamVi === "khong-han" || o.phamVi === "tuan-nay" ? o.phamVi : "mot-ngay";
  const den = o.hieuLucDen;
  return {
    ma: typeof o.ma === "string" && o.ma !== "" ? o.ma : maLuat(hieuLucTu, noiDung),
    noiDung,
    phamVi,
    hieuLucTu,
    hieuLucDen: typeof den === "string" && /^\d{4}-\d{2}-\d{2}$/.test(den) ? den : null,
    nguoiDat: typeof o.nguoiDat === "string" ? o.nguoiDat : "không rõ",
    thoiDiemDat: typeof o.thoiDiemDat === "string" ? o.thoiDiemDat : `${hieuLucTu}T00:00:00.000Z`,
    nguon: typeof o.nguon === "string" ? o.nguon : "không rõ",
  };
}

// ─────────────────────────────────────────────────────────────
// ÁP LUẬT ĐỘNG VÀO NỘI DUNG BÁO CÁO
// MD: mục 6.2 — "định nghĩa những việc gì cần báo cáo những việc gì không"
//
// Chỉ hai phép, cố ý làm ĐƠN GIẢN và ĐOÁN ĐƯỢC:
//   · "bỏ mục X" / "không báo X"  → LOẠI những dòng nhắc tới X
//   · "tập trung X" / "báo kỹ X"  → ĐẨY những dòng nhắc tới X lên đầu
// Không làm gì tinh vi hơn: luật mà người dùng không đoán được kết quả thì
// họ sẽ ngừng đặt luật, và mục 6.2 mất tác dụng.
//
// Nhận kiểu tối thiểu `{ noiDung }` nên không kéo theo phụ thuộc nào.
// ─────────────────────────────────────────────────────────────

const MOC_BO = ["bo muc ", "bo chuyen ", "bo phan ", "khong bao ", "khong can bao ", "bo qua "];
const MOC_KY = ["tap trung ", "bao ky ve ", "bao ky ", "theo doi sat ", "chu y ", "luu y "];

/** Lấy CHỦ ĐỀ đứng sau một mốc từ. Không thấy mốc nào → chuỗi rỗng. */
export function chuDeSauMoc(cau: string, moc: readonly string[]): string {
  const c = boDau(cau);
  for (const m of moc) {
    const i = c.indexOf(m);
    if (i >= 0) {
      // Cắt tối đa 4 từ: "bỏ mục nhân lực và mưa" thì chủ đề là "nhân lực và mưa"
      return c.slice(i + m.length).split(" ").slice(0, 4).join(" ").trim();
    }
  }
  return "";
}

export function chuDeCanBo(cau: string): string {
  return chuDeSauMoc(cau, MOC_BO);
}

export function chuDeCanKy(cau: string): string {
  return chuDeSauMoc(cau, MOC_KY);
}

/** Dòng này có nhắc tới chủ đề không — so sau khi bỏ dấu cả hai bên */
export function dongNhacToi(noiDungDong: string, chuDe: string): boolean {
  if (chuDe === "") return false;
  const d = boDau(noiDungDong);
  // Khớp cả cụm, và khớp cả khi chỉ trùng từ đầu ("nhân lực" ↔ "nhân lực HP1")
  if (d.includes(chuDe)) return true;
  const tu = chuDe.split(" ").filter((t) => t.length >= 3);
  return tu.length > 0 && tu.every((t) => d.includes(t));
}

export interface KetQuaApLuat<T> {
  dong: T[];
  /** Số dòng bị luật "bỏ …" loại — báo cáo phải nói rõ, không loại lặng lẽ */
  soBiLuatBo: number;
}

/**
 * Áp danh sách luật CÒN HIỆU LỰC lên các dòng báo cáo.
 * Loại trước, đẩy lên sau — để một dòng vừa bị "bỏ" vừa được "báo kỹ" thì
 * lệnh BỎ thắng (người dùng bảo đừng báo thì đừng báo).
 */
/**
 * `noiDungKy` (tuỳ chọn): chữ dùng riêng cho luật «tập trung / báo kỹ» — dung.ts nối thêm TÊN DỰ ÁN vào đây để «báo kỹ về Nậm săm 3A»
 * khớp việc của dự án đó. Luật «bỏ …» chỉ xét `noiDung` (tiêu đề việc): nối tên dự án vào đó làm «bỏ qua Nam Khian 1» bỏ cả NK2, NK3 (kiểm độc lập 26/10).
 */
export function apDungLuat<T extends { noiDung: string; noiDungKy?: string }>(
  dong: readonly T[],
  cacLuat: readonly { noiDung: string }[],
): KetQuaApLuat<T> {
  const chuDeBo = cacLuat.map((l) => chuDeCanBo(l.noiDung)).filter((s) => s !== "");
  const chuDeKy = cacLuat.map((l) => chuDeCanKy(l.noiDung)).filter((s) => s !== "");

  const giu = dong.filter((d) => !chuDeBo.some((c) => dongNhacToi(d.noiDung, c)));
  const uuTien = giu.filter((d) => chuDeKy.some((c) => dongNhacToi(d.noiDungKy ?? d.noiDung, c)));
  const conLai = giu.filter((d) => !uuTien.includes(d));

  return { dong: [...uuTien, ...conLai], soBiLuatBo: dong.length - giu.length };
}

/**
 * Câu giải thích luật hiệu lực, hiện ngay trên màn Báo cáo sáng.
 * Mục 6.2 đòi "mọi luật đều xem và xoá được trên màn hình, không có luật ẩn"
 * — nên cả CÁCH TÍNH hiệu lực cũng phải hiện, không giấu trong code.
 */
export const GHI_CHU_LUAT =
  'Lệnh nhắn hôm nay CHỈ ÁP CHO HÔM NAY. Muốn dài hơn thì nói rõ: ' +
  '"từ nay trở đi" (không hạn) hoặc "tuần này" (đến hết Chủ nhật). ' +
  "Mọi luật đều xem và xoá được ở đây — không có luật ẩn.";
