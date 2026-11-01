// ============================================================
// MÀN ISSUE RIÊNG CỦA MAIN — MÔ HÌNH DỮ LIỆU THUẦN
// Nguồn: PLAN-MAIN-AGENT mục 8b (8b.1 chốt BE · 8b.2 chốt BA · 8b.3 chốt BD
//        · 8b.3b tab ⭐ · 8b.4 luật sinh · 8b.7 thước định lượng)
//        LOI-DUNG-CHUNG 6e (khuôn lõi) · KE-HOACH/05 mục A.4 (luật cứng)
//
// Main KHÁC bốn agent kia ở BA điểm, và cả ba đều nằm trong file này:
//   ① KHÔNG có tab máy sinh — Main không sở hữu dữ liệu nghiệp vụ nào để sinh
//     issue từ đó (mục 8b.1). Thay bằng việc PHÂN LOẠI LẠI đống issue gom về.
//   ② TÁM nhóm chủ đề + nhóm 📁 Khác. Issue do chính Main sinh nằm LẪN trong
//     tám nhóm, nhận ra bằng icon 🤖 trên thẻ — KHÔNG tách khu riêng (chốt BE).
//   ③ Tab ⭐ "Cần anh xem": 5 việc LLM chọn, mỗi việc MỘT CÂU lý do, cố ý
//     KHÔNG chấm điểm và KHÔNG xếp hạng bằng số (mục 8b.3b).
//
// ⛔ Bốn luật cứng được ép bằng KIỂU DỮ LIỆU, không phải bằng lời dặn:
//   A.4.1 không dẫn được nguồn thì không được hiện → `nguonDuLieu` rỗng là LOẠI
//   A.4.3 tuyệt đối không ước số            → số thiếu là `null`, hiện "—"
//   A.4.4 số ngày ảnh hưởng không cộng dồn  → `anhHuongNangNhat` lấy MAX
//   A.4.5 không có nút đóng tuỳ tiện        → `dieuKienDong` rỗng là LOẠI
//
// File THUẦN — không đụng node:fs, màn hình client import được (luật 10).
// ============================================================

import type { KhuonTra, NguonMcp } from "@/lib/mcp/khuon";
import { docSoMay } from "@/lib/chung/doc-so";
import { fmtNum, fmtSo } from "@/lib/format";

// ─────────────────────────────────────────────────────────────
// ① TÁM NHÓM CHỦ ĐỀ + nhóm "Khác" — mục 8b.3, bảng chốt BD
// ─────────────────────────────────────────────────────────────

/**
 * Tám nhóm lãnh đạo quan tâm, cộng "khac".
 *
 * "khac" KHÔNG phải nhóm thứ chín ngang hàng: nó là chỗ chứa issue chưa xếp
 * được vào tám nhóm trên, ẩn mờ cuối hàng nhưng vẫn đếm — để loại issue chưa
 * từng có không biến mất (mục 8b.3, đoạn "📁 Nhóm Khác — ẩn nhưng vẫn đếm").
 */
export type NhomChuDe =
  | "cod"
  | "duong-gang"
  | "hop-dong"
  | "thiet-ke"
  | "mat-bang"
  | "phap-ly"
  | "nha-thau"
  | "thiet-bi"
  | "khac";

/** Tám nhóm chính theo ĐÚNG thứ tự ①→⑧ của bảng 8b.3 — "khac" không nằm đây */
export const TAM_NHOM: readonly NhomChuDe[] = [
  "cod",
  "duong-gang",
  "hop-dong",
  "thiet-ke",
  "mat-bang",
  "phap-ly",
  "nha-thau",
  "thiet-bi",
] as const;

export const NHOM_KHAC: NhomChuDe = "khac";

/** Hàng tab đầy đủ: 8 nhóm rồi tới 📁 Khác ở cuối */
export const MOI_NHOM: readonly NhomChuDe[] = [...TAM_NHOM, NHOM_KHAC];

export const NHAN_NHOM: Record<NhomChuDe, string> = {
  cod: "📅 COD",
  "duong-gang": "🔗 Đường găng",
  "hop-dong": "💰 Hợp đồng · phiếu giá",
  "thiet-ke": "📐 Thiết kế",
  "mat-bang": "🗺 Mặt bằng",
  "phap-ly": "⚖️ Hồ sơ pháp lý",
  "nha-thau": "👷 Nhà thầu & nhân lực",
  "thiet-bi": "🚢 Thiết bị & vật tư dài hạn",
  khac: "📁 Khác",
};

/** Một câu nói nhóm này GỒM GÌ — để lãnh đạo không phải đoán theo cái tên */
export const MO_TA_NHOM: Record<NhomChuDe, string> = {
  cod: "Thứ đẩy thẳng ngày phát điện.",
  "duong-gang": "Nằm trên đường găng nhưng chưa quy ra được số ngày.",
  "hop-dong": "Lệch phiếu giá, chậm thanh toán, nghiệm thu sai.",
  "thiet-ke": "Bản vẽ chậm, thiết kế chưa ai làm.",
  "mat-bang": "Giải phóng mặt bằng, quan hệ địa phương, đường công vụ.",
  "phap-ly": "Thủ tục quá hạn, sắp hạn, văn bản hết hiệu lực.",
  "nha-thau": "Năng suất thấp, huy động thiếu người so với cam kết.",
  "thiet-bi": "Tuabin, máy biến áp, cáp — hàng nhập đặt trước cả năm.",
  khac: "Không thuộc tám nhóm trên — cấp dưới xử, nhưng vẫn giữ lại và vẫn đếm.",
};

/** Chuỗi lạ từ LLM có phải một nhóm hợp lệ không — sai thì rơi về "khac" */
export function laNhomHopLe(v: unknown): v is NhomChuDe {
  return typeof v === "string" && MOI_NHOM.includes(v as NhomChuDe);
}

// ─────────────────────────────────────────────────────────────
// ② MỘT ISSUE TRÊN MÀN CỦA MAIN
// ─────────────────────────────────────────────────────────────

export type MucDoIssue = "do" | "vang" | "xanh";

export const NHAN_MUC_DO: Record<MucDoIssue, string> = {
  do: "Nghiêm trọng",
  vang: "Cần xem",
  xanh: "Bình thường",
};

/**
 * Issue như Main NHÌN THẤY nó.
 *
 * Main không sở hữu dữ liệu nghiệp vụ (mục 1) nên phần lớn thẻ này là thứ gom
 * về từ agent chủ — Main chỉ thêm được cách XẾP NHÓM và câu tóm tắt cho lãnh
 * đạo (mục 8b.6). Con số thì lấy nguyên của agent chủ, Main KHÔNG tính lại
 * (phân vai LLM ↔ Code, mục 8b.7).
 */
/** Mã của chính app này trong danh bạ — hằng THUẦN, client import được (luật 10) */
export const MA_MAIN = "main";

export interface IssueMain {
  /** Mã chung của sổ `core.issue` — ISS-… ; đề xuất chưa duyệt là DX-… */
  id: string;
  /** Mã agent chủ trong Danh bạ: tiendo · phaply · hopdong · base · main */
  agentChu: string;
  /** Tên hiện ra màn hình của agent chủ */
  tenAgentChu: string;
  tieuDe: string;
  moTa: string;
  /**
   * A.4.1 — DẪN NGUỒN, rỗng là thẻ bị loại thẳng, không hiện ra màn.
   * Không dẫn được nguồn thì không được hiện như một khẳng định.
   */
  nguonDuLieu: string;
  /**
   * A.4.5 — ĐIỀU KIỆN ĐÓNG ghi rõ trên thẻ. Issue chỉ đóng khi điều kiện này
   * hết vi phạm; không có nút "đóng cho xong". Rỗng là thẻ bị loại.
   */
  dieuKienDong: string;
  mucDo: MucDoIssue;
  /** LLM xếp (mục 8b.3). `null` = chưa chạy phân loại → coi như 📁 Khác */
  nhomChinh: NhomChuDe | null;
  /** Nhóm phụ — hiện DÒNG TRỎ ở tab nhóm phụ, KHÔNG tính vào số đếm tab đó */
  nhomPhu: NhomChuDe[];
  /** 🤖 — nội dung do LLM sinh (luật 19 CLAUDE.md, mục 8b.2) */
  doLlmSinh: boolean;
  /** 👤 — người thêm tay */
  doNguoiThem: boolean;
  /** A.4.3 — không có số thì `null`, KHÔNG được điền 0 cho đủ chỗ */
  soNgayAnhHuong: number | null;
  tienAnhHuongVnd: number | null;
  /** Câu 🤖 giải thích vì sao issue này vào top 5 — chỉ có khi LLM đã chọn */
  lyDoChon?: string;
  /** Câu tóm tắt Main được phép ghi lên MỌI issue, kể cả của agent khác (8b.6) */
  tomTatChoLanhDao?: string;
  daDong: boolean;

  /** 🙈 6e.3 — CHỈ có nghĩa với issue do CHÍNH Main giữ sổ (agentChu = main).
   * Ẩn vẫn đếm vào tổng; issue agent khác thì ẩn/xoá ở agent đó (chốt BC). */
  an?: boolean;

  /**
   * ⭐ A10a (25/09) — mã WBS agent chủ trả về, ĐÃ LỌC qua `maWbsHopLe`.
   * `null`/thiếu = agent không trả mã WBS thật → khối "Chưa gắn WBS". Main KHÔNG suy mã.
   */
  wbs?: string | null;
  /** 01/11/2026 — issue đã giao thành việc ở agent Công việc (CV-…); agent chủ trả `ma_viec`. Thiếu/null = chưa giao */
  maViec?: string | null;

  /**
   * ⭐ 25/09 (phương án a) — thẻ GOM THEO NGƯỜI của Base: các mã WBS thật của
   * việc nằm trong thẻ (Base trả `wbs_lien_quan`), đã lọc qua `maWbsHopLe`.
   * Thẻ KHÔNG nhân bản vào khối WBS — mỗi khối chỉ có dòng trỏ tới nó.
   */
  wbsLienQuan?: string[];

  /**
   * ⭐ 18/10/2026 — dự án agent chủ ghi trên thẻ (`ma_du_an`; agent Công việc luôn ghi). Main dùng để ẩn thẻ theo dự án
   * CỦA THẺ với người ngoài dự án (agent-mat-loc.ts `locManIssue`). Thiếu = agent không ghi → xét theo dự án đang xem.
   */
  maDuAn?: string;
}

/**
 * VÌ SAO thẻ này không được hiện — `null` nghĩa là hiện được.
 *
 * Trả về CÂU TIẾNG VIỆT chứ không phải boolean: thẻ bị loại vẫn phải đếm được
 * và nói được lý do ở tab Phân loại lại, nếu không thì issue biến mất im lặng
 * và không ai biết agent chủ đang trả về thiếu gì.
 */
export function lyDoLoaiIssue(i: IssueMain): string | null {
  if (i.tieuDe.trim() === "") return "Thiếu tiêu đề — không biết vấn đề là gì.";
  if (i.nguonDuLieu.trim() === "") {
    return "Không dẫn được nguồn. Chưa có số liệu nên không được hiện như một khẳng định (luật A.4.1).";
  }
  if (i.dieuKienDong.trim() === "") {
    return "Chưa ghi ĐIỀU KIỆN ĐÓNG — thẻ không nói khi nào hết vi phạm thì không đóng được (luật A.4.5).";
  }
  return null;
}

export function hopLeIssue(i: IssueMain): boolean {
  return lyDoLoaiIssue(i) === null;
}

export interface KetQuaLoc {
  nhan: IssueMain[];
  loai: { issue: IssueMain; lyDo: string }[];
}

/** Chia đống issue thành phần hiện được và phần bị luật cứng loại */
export function locIssue(ds: IssueMain[]): KetQuaLoc {
  const nhan: IssueMain[] = [];
  const loai: { issue: IssueMain; lyDo: string }[] = [];
  for (const i of ds) {
    const lyDo = lyDoLoaiIssue(i);
    if (lyDo === null) nhan.push(i);
    else loai.push({ issue: i, lyDo });
  }
  return { nhan, loai };
}

// ─────────────────────────────────────────────────────────────
// ③ XẾP VÀO NHÓM — một issue chỉ vào MỘT nhóm chính (mục 8b.3)
// ─────────────────────────────────────────────────────────────

/** Chưa phân loại hoặc nhóm lạ thì về 📁 Khác — không bao giờ mất thẻ */
export function nhomChinhCuaIssue(i: IssueMain): NhomChuDe {
  return laNhomHopLe(i.nhomChinh) ? i.nhomChinh : NHOM_KHAC;
}

export type BangNhom = Record<NhomChuDe, IssueMain[]>;

function bangRong(): BangNhom {
  const b = {} as BangNhom;
  for (const n of MOI_NHOM) b[n] = [];
  return b;
}

/**
 * Xếp issue vào tám nhóm + 📁 Khác.
 *
 * Thẻ bị luật cứng loại KHÔNG vào bảng này — nếu vào thì nó lại hiện ra màn
 * đúng cái điều A.4.1 cấm.
 *
 * ⭐ Issue do Main tự sinh (🤖) và issue người thêm (👤) đi CHUNG một đường
 * với issue của bốn agent kia — chốt BE bỏ tab riêng của chúng, phân biệt chỉ
 * bằng icon trên thẻ.
 */
export function xepVaoNhom(ds: IssueMain[], xemDaDong = false): BangNhom {
  const b = bangRong();
  for (const i of locIssue(ds).nhan) {
    if (i.daDong !== xemDaDong) continue;
    b[nhomChinhCuaIssue(i)].push(i);
  }
  return b;
}

/** Số đếm trên tab — CHỈ đếm nhóm chính, nên tổng không bao giờ trùng (8b.3) */
export function demTheoNhom(ds: IssueMain[]): Record<NhomChuDe, number> {
  const b = xepVaoNhom(ds);
  const d = {} as Record<NhomChuDe, number>;
  for (const n of MOI_NHOM) d[n] = b[n].length;
  return d;
}

/**
 * DÒNG TRỎ ở tab nhóm phụ — bổ sung 04/09 ("nhóm phụ phải HIỆN ĐƯỢC ở tab
 * nhóm phụ, không chỉ nằm trong dòng chú của thẻ").
 *
 * Trả về issue có `nhom` trong nhóm phụ nhưng nhóm chính là chỗ khác. Ở tab
 * này chúng hiện MỘT DÒNG MẢNH, không phải thẻ đầy đủ, và KHÔNG tính vào số
 * đếm — thế thì lãnh đạo mở nhóm nào cũng thấy đủ vấn đề của nhóm đó mà tổng
 * vẫn không đếm trùng.
 */
export function dongTroNhomPhu(
  ds: IssueMain[],
  nhom: NhomChuDe,
  xemDaDong = false
): IssueMain[] {
  return locIssue(ds).nhan.filter(
    (i) => i.daDong === xemDaDong && nhomChinhCuaIssue(i) !== nhom && i.nhomPhu.includes(nhom)
  );
}

// ─────────────────────────────────────────────────────────────
// ④ TAB ⭐ "CẦN ANH XEM" — 5 việc, KHÔNG điểm số (mục 8b.3b)
// ─────────────────────────────────────────────────────────────

export const SO_VIEC_CAN_XEM = 5;

/**
 * Một dòng của tab ⭐.
 *
 * ⛔ Kiểu này CỐ Ý chỉ có hai trường. Không có `diem`, không có `thuHang`,
 * không có `mucDo0_100`. Chấm điểm kiểu "mức độ 87/100" nhìn có vẻ định lượng
 * nhưng con số đó máy bịa, không truy được về nguồn nào — trái bài nghiệm thu
 * 9. Thay bằng MỘT CÂU lý do 🤖 mà Mr. Đại đọc là kiểm được ngay, sai thì bác.
 *
 * Thứ tự trong mảng là thứ tự LLM đưa ra, KHÔNG phải hạng có số.
 */
export interface ViecCanAnhXem {
  issue: IssueMain;
  /** Câu 🤖 giải thích vì sao việc này đứng đó — bắt buộc, rỗng là bỏ */
  lyDo: string;
}

/**
 * Lấy 5 việc LLM đã chọn. Issue chưa có `lyDoChon` thì KHÔNG được vào —
 * đứng ở tab này mà không nói được vì sao mình đứng đó là đúng thứ mục 8b.3b
 * cấm.
 */
export function canAnhXem(ds: IssueMain[], gioiHan = SO_VIEC_CAN_XEM): ViecCanAnhXem[] {
  const ra: ViecCanAnhXem[] = [];
  for (const i of locIssue(ds).nhan) {
    if (i.daDong) continue;
    const lyDo = (i.lyDoChon ?? "").trim();
    if (lyDo === "") continue;
    ra.push({ issue: i, lyDo });
    if (ra.length >= gioiHan) break;
  }
  return ra;
}

// ─────────────────────────────────────────────────────────────
// ⑤ SỐ NGÀY ẢNH HƯỞNG — LẤY MAX, KHÔNG CỘNG (luật A.4.4)
// ─────────────────────────────────────────────────────────────

export interface AnhHuongNang {
  /** `null` = chưa agent nào trả về số ngày kèm nguồn — hiện "—", không hiện 0 */
  soNgay: number | null;
  issue: IssueMain | null;
  /** Câu giải thích in NGAY DƯỚI con số, bắt buộc theo A.4.4 */
  giaiThich: string;
}

/**
 * Số ngày ảnh hưởng của cả đống issue = cái NẶNG NHẤT, không phải tổng.
 *
 * Hai lý do, cả hai đã thành luật ở nơi khác: ① hai issue trên cùng một chuỗi
 * lan truyền mà cộng vào là đếm hai lần cùng một sự chậm; ② các chuỗi độc lập
 * chạy song song nên chuỗi dài nhất mới quyết định ngày phát điện.
 */
export function anhHuongNangNhat(ds: IssueMain[]): AnhHuongNang {
  let soNgay: number | null = null;
  let issue: IssueMain | null = null;
  for (const i of locIssue(ds).nhan) {
    if (i.daDong) continue;
    const n = i.soNgayAnhHuong;
    if (n === null || !Number.isFinite(n)) continue;
    if (soNgay === null || n > soNgay) {
      soNgay = n;
      issue = i;
    }
  }
  if (soNgay === null) {
    return {
      soNgay: null,
      issue: null,
      giaiThich:
        "Chưa có số liệu — chưa agent chủ nào trả về số ngày ảnh hưởng kèm nguồn. Main không tự ước số (luật A.4.3).",
    };
  }
  return {
    soNgay,
    issue,
    giaiThich:
      `Đây là số ngày của issue NẶNG NHẤT (${issue?.id ?? ""}), KHÔNG phải tổng các issue. ` +
      "Hai issue trên cùng một chuỗi mà cộng vào là đếm hai lần cùng một sự chậm; các chuỗi độc lập chạy song song nên chuỗi dài nhất mới quyết định ngày phát điện (luật A.4.4).",
  };
}

/** A.4.3 — thiếu số thì hiện "—", TUYỆT ĐỐI không hiện 0 cho đủ chỗ. Số theo chuẩn Việt Nam (chốt 130): «1.200» · «1,5» */
export function hienSo(n: number | null, donVi = ""): string {
  if (n === null || !Number.isFinite(n)) return "—";
  return donVi === "" ? fmtSo(n) : `${fmtSo(n)} ${donVi}`;
}

/** Tiền cũng theo luật ấy — không có thì "—", có thì gọn theo tỷ/triệu. Chuẩn số Việt Nam (chốt 130): «1,20 tỷ» · «999.000 đ» */
export function hienTien(vnd: number | null): string {
  if (vnd === null || !Number.isFinite(vnd)) return "—";
  if (Math.abs(vnd) >= 1_000_000_000) return `${fmtNum(vnd / 1_000_000_000, 2)} tỷ`;
  if (Math.abs(vnd) >= 1_000_000) return `${fmtNum(Math.round(vnd / 1_000_000))} triệu`;
  return `${fmtSo(vnd)} đ`;
}

/**
 * Icon đứng TRƯỚC nội dung: 🤖 cho thứ LLM sinh (luật 19 CLAUDE.md), 👤 cho
 * người thêm. Đây là thứ DUY NHẤT phân biệt issue Main tự sinh với issue bốn
 * agent kia — chốt BE bỏ tab riêng, không dựng thêm bộ lọc.
 */
export function iconIssue(i: IssueMain): string {
  if (i.doLlmSinh) return "🤖";
  if (i.doNguoiThem) return "👤";
  return "";
}

// ─────────────────────────────────────────────────────────────
// ⑥ ĐỌC ISSUE TỪ KHUÔN TRẢ LỜI MCP — cửa vào duy nhất của dữ liệu
// ─────────────────────────────────────────────────────────────

/** Kết quả gom từ MỘT agent — hoặc có issue, hoặc nói rõ vì sao chưa gom được */
export interface KetQuaGomMotAgent {
  ma: string;
  ten: string;
  issue: IssueMain[];
  /** Câu tiếng Việt "Chưa gom được từ …" — `null` nghĩa là gom được */
  chuaGomVi: string | null;
  /**
   * Agent còn thẻ đang mở mà KHÔNG trả về lần này (chạm trần bản ghi).
   * `undefined`/0 = lấy đủ · số > 0 = còn đúng bấy nhiêu thẻ · `null` = CÓ THỂ
   * còn nhưng agent không báo tổng số nên không biết bao nhiêu.
   */
  conThieu?: number | null;
  /** Agent ĐÃ trả lời: sổ của nó không có thẻ nào đang mở — tin tốt, không phải "chưa gom được" */
  khongCoTheMo?: boolean;
}

/**
 * Câu trả lời "sổ issue KHÔNG có thẻ nào đang mở" — agent đã trả lời, sổ trống.
 *
 * MỘT chỗ phân biệt cho cả màn Cảnh báo lẫn báo cáo sáng. Cổng trả sổ trống bằng
 * mã `KHONG_CO_DU_LIEU` (không trả mảng rỗng) — nhưng cùng mã đó cũng dùng cho
 * "CHƯA CÓ SỔ ISSUE" (sổ chưa sinh) và "Không có dự án nào mang mã …": hai ca
 * đó KHÔNG được nói thành "không có issue", vì chưa ai biết có hay không. Nên
 * soi thêm câu của cổng (đo 25/09 cả 4 cổng):
 *   tiến độ · Base · hợp đồng: "… có N thẻ nhưng KHÔNG thẻ nào đang mở"
 *   pháp lý: "… hiện không có thẻ nào đang mở."
 */
const MAU_SO_KHONG_THE_MO = /không\s+(?:có\s+)?thẻ\s+nào\s+đang\s+mở/i;

export function laSoKhongCoTheMo(kq: KhuonTra): boolean {
  return !kq.ok && kq.ma_loi === "KHONG_CO_DU_LIEU" && MAU_SO_KHONG_THE_MO.test(kq.thong_diep);
}

/**
 * Số thẻ Main XIN mỗi lần gọi `<agent>.danh_sach_issue`.
 *
 * ⛔ Lỗi đo 25/09: Main gọi không kèm `gioi_han` → cả bốn cổng trả MẶC ĐỊNH 20
 *    thẻ, HV mất 35 thẻ (tiến độ 20/30 · Base 20/34 · pháp lý 20/31) mà màn
 *    không có dòng nào báo cắt. Bốn cổng cùng trần 100, KHÔNG cổng nào phân
 *    trang (không có tham số bỏ qua/offset) — nên xin thẳng trần:
 *      tiến độ  5-Agent-tien-do/src/lib/mcp/danh-sach-issue.ts:29  TRAN_TOI_DA = 100
 *      Base     1-agent-base/src/lib/mcp/danh-sach-issue.ts:27     TRAN_TOI_DA = 100
 *      hợp đồng 2-agent-hop-dong/src/lib/mcp/danh-sach-issue.ts:40 TRAN_TOI_DA = 100
 *      pháp lý  3-agent-phap-ly-code/lib/mcp/khuon.ts:20           TRAN_BAN_GHI = 100
 *    Quá 100 thì agent vẫn cắt → `demTheConThieu` đếm phần còn lại để màn
 *    hiện dòng "còn N thẻ chưa lấy về", không im lặng.
 */
export const GIOI_HAN_XIN_ISSUE = 100;

/**
 * Còn bao nhiêu thẻ đang mở agent CHƯA trả về trong câu trả lời này.
 *
 * Đọc `du_lieu.so_the_dang_mo` (tổng thẻ mở agent đếm TRƯỚC khi cắt — tiến độ,
 * Base, hợp đồng trả đúng nghĩa này). Pháp lý trả `so_the_dang_mo` = số thẻ
 * ĐÃ trả (đếm sau `take`), nên không phân biệt được "vừa đủ 100" với "còn
 * nữa": khi nhận đúng bằng số đã xin mà tổng không lớn hơn → `null` (có thể
 * còn, không biết bao nhiêu). KHÔNG đoán số.
 */
export function demTheConThieu(kq: KhuonTra, soNhan: number, gioiHanXin: number): number | null {
  if (!kq.ok) return 0;
  const goc = kq.du_lieu;
  const tong =
    goc !== null && typeof goc === "object" && !Array.isArray(goc)
      ? soHoacNull((goc as Tho).so_the_dang_mo)
      : null;
  if (tong !== null && tong > soNhan) return tong - soNhan;
  if (soNhan >= gioiHanXin) return null;
  return 0;
}

/** Gộp mấy dòng dẫn nguồn của khuôn MCP thành một chuỗi đọc được */
export function nguonDanTuKhuon(nguon: readonly NguonMcp[]): string {
  return nguon
    .map((n) => [n.loai, n.ma, n.file_goc].filter((x) => (x ?? "").trim() !== "").join(" "))
    .filter((s) => s !== "")
    .join(" · ");
}

interface Tho {
  [k: string]: unknown;
}

function chuoi(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Số hoặc `null` — chuỗi rỗng, undefined, NaN đều thành `null`, KHÔNG thành 0.
 * Chữ trong JSON agent chủ trả (có thể do AI viết): đúng cú pháp số của máy thì lấy theo máy, còn lại đọc theo chuẩn số
 * Việt Nam — «1.200.000.000» là một tỷ hai, «1,5» là một phẩy năm (lib/chung/doc-so, chốt 130; bản cũ ra null).
 */
export function soHoacNull(v: unknown): number | null {
  return docSoMay(v);
}

function mangNhom(v: unknown): NhomChuDe[] {
  if (!Array.isArray(v)) return [];
  const ra: NhomChuDe[] = [];
  for (const x of v) if (laNhomHopLe(x) && !ra.includes(x)) ra.push(x);
  return ra;
}

/**
 * Bóc câu trả lời của một agent thành danh sách issue.
 *
 * ⚠ KHÔNG ném ngoại lệ và KHÔNG bịa: agent trả lỗi, trả khuôn lạ, hay trả
 * dòng thiếu nguồn — mọi trường hợp đều thành một CÂU nói rõ chưa gom được từ
 * con nào và vì sao. Im lặng bỏ qua thì lãnh đạo tưởng con đó không có issue.
 */
export function docIssueTuKhuon(ma: string, ten: string, kq: KhuonTra): KetQuaGomMotAgent {
  if (laSoKhongCoTheMo(kq)) {
    return { ma, ten, issue: [], chuaGomVi: null, khongCoTheMo: true };
  }
  if (!kq.ok) {
    return {
      ma,
      ten,
      issue: [],
      chuaGomVi: `Chưa gom được từ ${ten} — ${kq.thong_diep}`,
    };
  }
  const nguonChung = nguonDanTuKhuon(kq.nguon);
  const goc = kq.du_lieu;
  const mang: unknown[] = Array.isArray(goc)
    ? goc
    : goc !== null && typeof goc === "object" && Array.isArray((goc as Tho).issue)
      ? ((goc as Tho).issue as unknown[])
      : [];
  const coMangIssue =
    Array.isArray(goc) || (goc !== null && typeof goc === "object" && Array.isArray((goc as Tho).issue));
  // Trả `issue: []` hẳn hoi = đã trả lời, sổ trống — cùng nghĩa với câu trên
  if (coMangIssue && mang.length === 0) {
    return { ma, ten, issue: [], chuaGomVi: null, khongCoTheMo: true };
  }
  if (!coMangIssue) {
    return {
      ma,
      ten,
      issue: [],
      chuaGomVi: `Chưa gom được từ ${ten} — câu trả lời không có danh sách issue nào đọc được.`,
    };
  }

  const issue: IssueMain[] = [];
  for (const x of mang) {
    if (x === null || typeof x !== "object") continue;
    const o = x as Tho;
    const id = chuoi(o.id) || chuoi(o.ma);
    if (id === "") continue;
    const maDuAn = chuoi(o.ma_du_an) || chuoi(o.maDuAn);
    issue.push({
      ...(maDuAn !== "" ? { maDuAn } : {}),
      id,
      agentChu: ma,
      tenAgentChu: ten,
      tieuDe: chuoi(o.tieuDe) || chuoi(o.tieu_de),
      moTa: chuoi(o.moTa) || chuoi(o.mo_ta) || chuoi(o.phanTich),
      // Agent chủ quên dẫn nguồn từng dòng thì lấy nguồn chung của khuôn —
      // vẫn còn nguồn thật, không phải Main bịa ra
      nguonDuLieu: chuoi(o.nguonDuLieu) || chuoi(o.nguon_du_lieu) || nguonChung,
      dieuKienDong: chuoi(o.dieuKienDong) || chuoi(o.dieu_kien_dong),
      mucDo: o.mucDo === "do" || o.mucDo === "vang" || o.mucDo === "xanh" ? o.mucDo : "vang",
      nhomChinh: laNhomHopLe(o.nhomChinh) ? o.nhomChinh : null,
      nhomPhu: mangNhom(o.nhomPhu),
      doLlmSinh: o.doLlmSinh === true,
      doNguoiThem: o.doNguoiThem === true,
      soNgayAnhHuong: soHoacNull(o.soNgayAnhHuong ?? o.so_ngay_anh_huong),
      tienAnhHuongVnd: soHoacNull(o.tienAnhHuongVnd ?? o.tien_anh_huong_vnd),
      daDong: o.daDong === true,
      wbs: maWbsHopLe(o.wbs ?? o.ma_wbs),
      ...(chuoi(o.ma_viec) !== "" ? { maViec: chuoi(o.ma_viec) } : {}),
      wbsLienQuan: mangMaWbs(o.wbs_lien_quan ?? o.wbsLienQuan),
    });
  }
  return { ma, ten, issue, chuaGomVi: null, conThieu: demTheConThieu(kq, mang.length, GIOI_HAN_XIN_ISSUE) };
}

export interface KetQuaGom {
  issue: IssueMain[];
  /** Con nào chưa gom được và vì sao — hiện thẳng lên màn, không giấu */
  chuaGom: { ma: string; ten: string; lyDo: string }[];
  /** Con nào gom được nhưng CÒN thẻ chưa lấy về (chạm trần) — xem `ThieuThe` */
  thieuThe: ThieuThe[];
  /** Con nào ĐÃ trả lời mà sổ không có thẻ nào đang mở — hiện chữ thường, không ô vàng */
  khongCoIssue: { ma: string; ten: string }[];
}

/** Một agent còn thẻ đang mở chưa lấy về được — màn hiện kèm link sang màn Cảnh báo của nó */
export interface ThieuThe {
  ma: string;
  ten: string;
  /** Số thẻ còn thiếu; `null` = có thể còn nhưng agent không báo tổng số */
  soConLai: number | null;
  /** Địa chỉ màn Cảnh báo của agent đó — `null` khi danh bạ chưa khai địa chỉ */
  lienKet: string | null;
}

/** Câu hiện lên màn cho một dòng thiếu thẻ — một chỗ, màn và báo cáo cùng dùng */
export function cauThieuThe(t: Pick<ThieuThe, "ten" | "soConLai">): string {
  return t.soConLai === null
    ? `${t.ten} có thể còn thẻ chưa lấy về (đã nhận đủ ${GIOI_HAN_XIN_ISSUE} thẻ — trần của cổng — mà agent không báo tổng số)`
    : `Còn ${t.soConLai} thẻ của ${t.ten} chưa lấy về (cổng trả tối đa ${GIOI_HAN_XIN_ISSUE} thẻ/lần)`;
}

/**
 * Gộp kết quả gom của những agent ĐANG BẬT.
 *
 * Trùng mã thì giữ bản đầu: sổ chung `core.issue` cấp mã duy nhất, hai con
 * cùng trả về một mã nghĩa là cùng một issue, vẽ hai thẻ là đếm trùng.
 */
export function gopKetQuaGom(
  cac: KetQuaGomMotAgent[],
  lienKetManIssue: (ma: string) => string | null = () => null,
): KetQuaGom {
  const issue: IssueMain[] = [];
  const daCo = new Set<string>();
  const chuaGom: { ma: string; ten: string; lyDo: string }[] = [];
  const thieuThe: ThieuThe[] = [];
  const khongCoIssue: { ma: string; ten: string }[] = [];
  for (const k of cac) {
    if (k.khongCoTheMo === true) {
      khongCoIssue.push({ ma: k.ma, ten: k.ten });
      continue;
    }
    if (k.chuaGomVi !== null) {
      chuaGom.push({ ma: k.ma, ten: k.ten, lyDo: k.chuaGomVi });
      continue;
    }
    if (k.conThieu === null || (typeof k.conThieu === "number" && k.conThieu > 0)) {
      thieuThe.push({ ma: k.ma, ten: k.ten, soConLai: k.conThieu, lienKet: lienKetManIssue(k.ma) });
    }
    for (const i of k.issue) {
      if (daCo.has(i.id)) continue;
      daCo.add(i.id);
      issue.push(i);
    }
  }
  return { issue, chuaGom, thieuThe, khongCoIssue };
}

// ─────────────────────────────────────────────────────────────
// ⑦ XẾP THEO WBS — A10a (Mr. Đại chốt 25/09, gốc J07)
//
// Mỗi agent giữ issue RIÊNG theo tiêu chí của mình — KHÔNG gộp, KHÔNG dựng
// "issue gốc". Chế độ này chỉ ĐẶT CẠNH NHAU các issue cùng một mã WBS để
// lãnh đạo thấy ba góc nhìn (tiến độ · Base · pháp lý · hợp đồng) một chỗ.
// Chỉ ánh xạ theo mã agent chủ trả về — không tính lại số nào.
// ─────────────────────────────────────────────────────────────

export type CheDoXep = "chu-de" | "wbs";

export const NHAN_CHE_DO_XEP: Record<CheDoXep, string> = {
  "chu-de": "Chủ đề",
  wbs: "WBS",
};

/**
 * Mã WBS hợp lệ = dãy số chấm số ("1", "1.1.6", "7.2.1.2") — đúng khuôn mã của
 * Agent Tiến độ. Chuỗi khác KHÔNG phải mã WBS thì trả `null`.
 *
 * Vì sao phải lọc (đo 25/09, HV): Base trả trường `wbs` là KHOÁ GOM THẺ, không
 * phải mã việc — 32/34 thẻ mang `người:@nick` · `xong-giấy:@nick` ·
 * `chưa-đóng:@nick` (1-agent-base/src/lib/canh-bao/sinh-base.ts:282,464,521).
 * Coi chúng là mã WBS thì màn mọc 17 "khối WBS" tên người. Không đoán mã từ
 * tiêu đề — không có mã thì vào khối "Chưa gắn WBS".
 */
const MAU_MA_WBS = /^\d+(?:\.\d+)*$/;

export function maWbsHopLe(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return MAU_MA_WBS.test(s) ? s : null;
}

/** So hai mã WBS theo từng đoạn số: 1.1.10 đứng SAU 1.1.9 */
export function soSanhMaWbs(a: string, b: string): number {
  const x = a.split(".").map(Number);
  const y = b.split(".").map(Number);
  for (let k = 0; k < Math.max(x.length, y.length); k++) {
    const d = (x[k] ?? -1) - (y[k] ?? -1);
    if (d !== 0) return d;
  }
  return 0;
}

/** Mảng mã WBS agent chủ trả về — chỉ giữ mã thật, không trùng, xếp theo đoạn số */
export function mangMaWbs(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const tap = new Set<string>();
  for (const x of v) {
    const m = maWbsHopLe(x);
    if (m !== null) tap.add(m);
  }
  return Array.from(tap).sort(soSanhMaWbs);
}

export interface NhomAgentTrongKhoi {
  ma: string;
  ten: string;
  issue: IssueMain[];
}

/** Dòng "Có trong thẻ Base: <tiêu đề ngắn> →" dưới một khối WBS (phương án a, 25/09) */
export interface TroTheGom {
  /** id thẻ gom — neo để cuộn tới nó ở khối "… — gom theo người" */
  id: string;
  agentChu: string;
  /** Tên ngắn agent: "Agent Base.vn" → "Base" */
  tenAgent: string;
  tieuDeNgan: string;
}

export type LoaiKhoiWbs = "wbs" | "gom" | "chua-gan";

export interface KhoiWbs {
  /** `null` = khối "… — gom theo người" hoặc khối cuối "Chưa gắn WBS" (xem `loai`) */
  ma: string | null;
  loai: LoaiKhoiWbs;
  /** Tên việc lấy từ Agent Tiến độ; khối gom mang tên "Base — gom theo người" */
  ten: string | null;
  /** Issue từng agent, CẠNH NHAU — thứ tự agent theo lần gom (không gắn cứng) */
  theoAgent: NhomAgentTrongKhoi[];
  soIssue: number;
  /** Chỉ khối `wbs`: thẻ gom có chứa việc mang mã này — dòng trỏ, không nhân bản thẻ */
  troGom: TroTheGom[];
  /** Số agent có góc nhìn ở khối = agent có thẻ ∪ agent có dòng trỏ */
  soAgent: number;
}

/** "Agent Base.vn" → "Base" · "Agent tiến độ" → "tiến độ" */
export function tenNganAgent(ten: string): string {
  return ten.replace(/^Agent\s+/i, "").replace(/\.vn$/i, "").trim() || ten;
}

/** Cắt tiêu đề cho dòng trỏ — tối đa `toiDa` ký tự, cắt ở ranh giới từ */
export function tieuDeNgan(s: string, toiDa = 70): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= toiDa) return t;
  const cat = t.slice(0, toiDa);
  const cach = cat.lastIndexOf(" ");
  return `${(cach > toiDa * 0.6 ? cat.slice(0, cach) : cat).replace(/[\s·—,:-]+$/, "")}…`;
}

/** Neo HTML của một thẻ trong chế độ WBS — dòng trỏ cuộn tới đây */
export function neoTheWbs(agentChu: string, id: string): string {
  return `the-wbs-${agentChu}-${id}`.replace(/[^\w-]/g, "_");
}

/**
 * Chia issue thành khối theo mã WBS.
 * • Issue có mã WBS thật → khối mã đó.
 * • Issue KHÔNG có mã nhưng có `wbsLienQuan` (thẻ Base gom theo người) → khối
 *   riêng "<agent> — gom theo người"; mỗi khối WBS ĐÃ CÓ của các mã trong
 *   `wbsLienQuan` hiện thêm dòng trỏ tới thẻ. Mã chỉ có trong thẻ gom thì
 *   KHÔNG mở khối mới (khối rỗng toàn dòng trỏ làm ngập màn) — đếm vào `demKhoiWbs`.
 * • Còn lại → "Chưa gắn WBS".
 * Thứ tự: khối có góc nhìn từ ≥ 2 agent (tính cả dòng trỏ) lên đầu → theo mã →
 * khối gom → "Chưa gắn WBS" cuối. Chỉ ánh xạ, không tính lại số nào.
 */
export function xepTheoWbs(
  ds: IssueMain[],
  tenWbs: Record<string, string> = {},
  xemDaDong = false,
): KhoiWbs[] {
  const theoMa = new Map<string, Map<string, NhomAgentTrongKhoi>>();
  const gom = new Map<string, NhomAgentTrongKhoi>();
  const chuaGan = new Map<string, NhomAgentTrongKhoi>();
  const dat = (khoi: Map<string, NhomAgentTrongKhoi>, i: IssueMain) => {
    if (!khoi.has(i.agentChu)) khoi.set(i.agentChu, { ma: i.agentChu, ten: i.tenAgentChu, issue: [] });
    khoi.get(i.agentChu)!.issue.push(i);
  };
  const theGom: IssueMain[] = [];
  for (const i of locIssue(ds).nhan) {
    if (i.daDong !== xemDaDong) continue;
    const ma = maWbsHopLe(i.wbs);
    if (ma !== null) {
      if (!theoMa.has(ma)) theoMa.set(ma, new Map());
      dat(theoMa.get(ma)!, i);
    } else if ((i.wbsLienQuan ?? []).length > 0) {
      dat(gom, i);
      theGom.push(i);
    } else {
      dat(chuaGan, i);
    }
  }

  const troTheoMa = new Map<string, TroTheGom[]>();
  for (const i of theGom) {
    for (const m of i.wbsLienQuan ?? []) {
      if (!theoMa.has(m)) continue;
      const ds2 = troTheoMa.get(m) ?? [];
      ds2.push({ id: i.id, agentChu: i.agentChu, tenAgent: tenNganAgent(i.tenAgentChu), tieuDeNgan: tieuDeNgan(i.tieuDe) });
      troTheoMa.set(m, ds2);
    }
  }

  const tenKhoiGom = (): string => {
    const cac = Array.from(new Set(Array.from(gom.values()).map((a) => tenNganAgent(a.ten))));
    return `${cac.join(" · ")} — gom theo người`;
  };
  const dung = (ma: string | null, loai: LoaiKhoiWbs, m: Map<string, NhomAgentTrongKhoi>): KhoiWbs => {
    const theoAgent = Array.from(m.values());
    const troGom = ma !== null ? (troTheoMa.get(ma) ?? []) : [];
    return {
      ma,
      loai,
      ten: loai === "gom" ? tenKhoiGom() : ma !== null ? (tenWbs[ma] ?? "").trim() || null : null,
      theoAgent,
      soIssue: theoAgent.reduce((s, a) => s + a.issue.length, 0),
      troGom,
      soAgent: new Set([...theoAgent.map((a) => a.ma), ...troGom.map((t) => t.agentChu)]).size,
    };
  };
  const khoi = Array.from(theoMa.entries()).map(([ma, m]) => dung(ma, "wbs", m));
  khoi.sort((a, b) => {
    const nhieuA = a.soAgent >= 2 ? 0 : 1;
    const nhieuB = b.soAgent >= 2 ? 0 : 1;
    return nhieuA - nhieuB || soSanhMaWbs(a.ma!, b.ma!);
  });
  if (gom.size > 0) khoi.push(dung(null, "gom", gom));
  if (chuaGan.size > 0) khoi.push(dung(null, "chua-gan", chuaGan));
  return khoi;
}

export interface DemKhoiWbs {
  soKhoi: number;
  soKhoiNhieuAgent: number;
  soChuaGan: number;
  /** Thẻ gom theo người (khối "… — gom theo người") */
  soTheGom: number;
  /** Tổng dòng "Có trong thẻ Base" dưới các khối WBS */
  soDongTro: number;
  /** Mã trong `wbsLienQuan` của thẻ gom: tổng mã khác nhau · trong đó có khối riêng */
  soMaTrongTheGom: number;
  soMaTrongTheGomCoKhoi: number;
}

/** Các con số đầu chế độ WBS — đếm từ chính kết quả `xepTheoWbs`, không đếm lại chỗ khác */
export function demKhoiWbs(khoi: KhoiWbs[]): DemKhoiWbs {
  const coMa = khoi.filter((k) => k.loai === "wbs");
  const khoiGom = khoi.find((k) => k.loai === "gom");
  const maGom = new Set<string>();
  for (const a of khoiGom?.theoAgent ?? []) for (const i of a.issue) for (const m of i.wbsLienQuan ?? []) maGom.add(m);
  const coKhoi = new Set(coMa.map((k) => k.ma!));
  return {
    soKhoi: coMa.length,
    soKhoiNhieuAgent: coMa.filter((k) => k.soAgent >= 2).length,
    soChuaGan: khoi.find((k) => k.loai === "chua-gan")?.soIssue ?? 0,
    soTheGom: khoiGom?.soIssue ?? 0,
    soDongTro: coMa.reduce((s, k) => s + k.troGom.length, 0),
    soMaTrongTheGom: maGom.size,
    soMaTrongTheGomCoKhoi: Array.from(maGom).filter((m) => coKhoi.has(m)).length,
  };
}
