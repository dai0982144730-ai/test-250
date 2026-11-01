import { ngayTrongChu } from "@/lib/ngay-hien";
import { fmtSo } from "@/lib/format";
import { thangToi } from "./khuon-agent";
// ============================================================
// BÁO CÁO THÁNG CỦA BQLDA — MÔ HÌNH THUẦN
//
// Nguồn đặc tả: PLAN-MAIN-AGENT-v1.0 mục 2 (mổ xẻ mẫu, ánh xạ từng ô về
// nguồn) và mục 3 · forms/DAC-TA-BAO-CAO-THANG.md mục 3 · form_bqlda_thang.js
// (cấu trúc cột thật của file .docx đã dựng — 11 bảng, đánh số 1..11).
//
// ⛔ LUẬT SỐ MỘT CỦA MÀN NÀY (KE-HOACH/05 mục A.4 điều 1):
//    KHÔNG DẪN ĐƯỢC NGUỒN THÌ KHÔNG ĐƯỢC GHI SỐ.
//    Luật này KHÔNG ép bằng lời dặn trong prompt mà ép bằng KIỂU DỮ LIỆU:
//    `OSo` là union hai nhánh — nhánh CÓ giá trị bắt buộc mang `vet` (vết một
//    lượt hỏi thật), nhánh KHÔNG có giá trị bắt buộc mang `lyDo`. Không viết
//    được một ô vừa có số vừa không nguồn: trình biên dịch chặn ngay chỗ gõ.
//    Vì sao gắt thế: một con số bịa trong báo cáo tháng đi thẳng lên bàn Chủ
//    đầu tư — sai một ô là mất tin cả bản báo cáo.
//
// ⛔ KHÔNG ƯỚC SỐ. Thiếu thì `null` → màn hình hiện "—", TUYỆT ĐỐI không 0.
//    Số 0 là một khẳng định ("không thanh toán đồng nào"), "—" là một lời thú
//    nhận ("tôi chưa hỏi được"). Hai thứ khác hẳn nhau.
//
// File THUẦN — KHÔNG đụng node:fs, màn hình client import thẳng được (luật 10).
// Đi hỏi ở `dung.ts` · lưu ở `kho.ts` · kết xuất ở `xuat.ts`.
// ============================================================

// ─────────────────────────────────────────────────────────────
// 1. Nguồn của một ô
// ─────────────────────────────────────────────────────────────

/**
 * Mã agent trong Danh bạ agent. Cố ý để `string` chứ KHÔNG phải union đóng:
 * số agent do người dùng khai trong Cài đặt, hôm nay 5 con mai 6 con — gắn
 * cứng union ở đây là bắt sửa code mỗi lần thêm agent (xem `danh-ba-agent.ts`).
 * Bốn mã đang dùng nằm ở `MA_AGENT` để gõ đỡ nhầm.
 */
export type MaAgent = string;

export const MA_AGENT = {
  tienDo: "tiendo",
  phapLy: "phaply",
  hopDong: "hopdong",
  base: "base",
  /** "main" = Main tự tổng hợp / đọc bảng lõi dùng chung (DAC-TA mục 3 ký hiệu MA) */
  main: "main",
} as const;

/** Tham số một lượt hỏi — chỉ nhận giá trị nguyên thuỷ để khoá lượt hỏi ổn định */
export type ThamSoHoi = Record<string, string | number | boolean>;

/**
 * ÁNH XẠ TĨNH: ô này lấy số ở đâu ra.
 * Khai một lần trong bảng `KHAI` bên dưới, không đi hỏi cũng biết — nhờ vậy
 * màn hình trả lời được câu "ô này định lấy ở đâu?" kể cả khi mọi agent tắt.
 */
export interface AnhXaNguon {
  maAgent: MaAgent;
  /** Tên công cụ MCP hoặc khung nhìn: "tiendo.tom_tat_du_an" · "core.issue" … */
  congCu: string;
  thamSo: ThamSoHoi;
}

/**
 * VẾT THẬT của một lượt hỏi đã chạy. Không vết thì không được ghi số — đây
 * chính là bài nghiệm thu số 9 của PLAN ("lấy 10 con số bất kỳ trong báo cáo,
 * cả 10 truy được về một lượt gọi cụ thể trong nhật ký").
 */
export interface VetNguon {
  /** Chuỗi dẫn nguồn agent trả về (`KhuonTra.nguon` nối lại). KHÔNG được rỗng. */
  moTa: string;
  /** Thời điểm agent trả lời (ISO) */
  thoiDiem: string;
}

/**
 * MỘT Ô SỐ.
 * - `coSo: true`  → bắt buộc có `giaTri` và `vet`.
 * - `coSo: false` → `giaTri` luôn `null`, bắt buộc có `lyDo` tiếng Việt.
 * Cả hai nhánh đều mang `anhXa`, nên MỌI ô đều khai được nó định hỏi ai — kể
 * cả ô chưa hỏi được.
 */
export type OSo =
  | {
      coSo: true;
      giaTri: string | number;
      donVi?: string;
      anhXa: AnhXaNguon;
      vet: VetNguon;
      /**
       * ⭐ 05/10 (luật agent mật trên Main): ô lấy từ sổ issue chung (`core.issue`) mang mã agent CHỦ của
       * issue điền ô — để lọc theo người xem (agent-mat-loc.ts). Ô hỏi thẳng agent thì đã có `anhXa.maAgent`.
       */
      agentGoc?: string;
    }
  | {
      coSo: false;
      giaTri: null;
      donVi?: string;
      anhXa: AnhXaNguon;
      /** Vì sao chưa có số. Câu tiếng Việt, hiện thẳng lên màn hình. */
      lyDo: string;
      agentGoc?: string;
    };

/** Chữ hiện thay cho số khi chưa có — KHÔNG BAO GIỜ là "0" */
export const DAU_TRONG = "—";

/** Tiền tố bắt buộc trước mọi nội dung do LLM sinh (A.4 điều 2 · luật 19) */
export const TIEN_TO_LLM = "🤖 ";

/**
 * Dựng ô CÓ SỐ. Vết rỗng → tự hạ xuống ô THIẾU thay vì ghi số không nguồn.
 * Đây là chốt thứ hai: kiểu dữ liệu chặn lúc gõ code, hàm này chặn lúc chạy
 * với dữ liệu đến từ agent (agent có thể trả số mà quên phần `nguon`).
 */
export function oCoSo(
  giaTri: string | number | null | undefined,
  anhXa: AnhXaNguon,
  vet: VetNguon,
  donVi?: string,
): OSo {
  if (giaTri === null || giaTri === undefined || giaTri === "") {
    return oThieu(anhXa, "Agent có trả lời nhưng ô này bỏ trống.", donVi);
  }
  if (!vet.moTa || vet.moTa.trim() === "") {
    return oThieu(
      anhXa,
      `Có giá trị nhưng ${anhXa.maAgent} không dẫn được nguồn — theo luật A.4 điều 1 thì không được ghi số.`,
      donVi,
    );
  }
  return { coSo: true, giaTri, donVi, anhXa, vet };
}

/** Dựng ô THIẾU. Lý do rỗng bị thay bằng câu mặc định — không để trống lý do. */
export function oThieu(anhXa: AnhXaNguon, lyDo: string, donVi?: string): OSo {
  return {
    coSo: false,
    giaTri: null,
    donVi,
    anhXa,
    lyDo: lyDo.trim() === "" ? "Chưa có số liệu, chưa rõ lý do." : lyDo.trim(),
  };
}

/**
 * Ô có hợp lệ không — dùng cho dữ liệu ĐỌC TỪ FILE, chỗ kiểu dữ liệu không
 * bảo vệ được (JSON không mang theo kiểu). Ô có giá trị mà thiếu nguồn =
 * KHÔNG HỢP LỆ.
 */
export function oHopLe(o: unknown): boolean {
  if (typeof o !== "object" || o === null) return false;
  const x = o as Partial<Extract<OSo, { coSo: true }>> &
    Partial<Extract<OSo, { coSo: false }>>;
  if (!x.anhXa || typeof x.anhXa.maAgent !== "string" || !x.anhXa.congCu) return false;
  if (x.anhXa.maAgent.trim() === "" || x.anhXa.congCu.trim() === "") return false;
  if (x.coSo === true) {
    if (x.giaTri === null || x.giaTri === undefined || x.giaTri === "") return false;
    return typeof x.vet?.moTa === "string" && x.vet.moTa.trim() !== "";
  }
  if (x.coSo === false) {
    if (x.giaTri !== null) return false;
    return typeof x.lyDo === "string" && x.lyDo.trim() !== "";
  }
  return false;
}

/**
 * Giá trị một ô thành chữ. Ô SỐ viết theo chuẩn số Việt Nam (Mr. Đại chốt 12/10/2026, chốt 130): thập phân dấu phẩy, nhóm ba
 * chữ số dấu chấm — 1234.5 → «1.234,5» (giữ tới 6 số lẻ, không thêm số 0). Ô CHỮ agent gửi (mã, tên, ngày) giữ nguyên văn.
 */
export function chuGiaTri(v: string | number): string {
  return typeof v === "number" ? fmtSo(v, 6) : String(v);
}

/** Chữ hiện ra màn hình cho một ô. Thiếu → "—", KHÔNG phải "0". */
export function hienO(o: OSo): string {
  if (!o.coSo) return DAU_TRONG;
  // ngày trong ô (cột kiểu "ngay", chữ agent khác gửi) luôn dd/mm/yyyy — dùng chung cho màn hình + tệp xuất (Mr. Đại 04/10)
  return ngayTrongChu(o.donVi ? `${chuGiaTri(o.giaTri)} ${o.donVi}` : chuGiaTri(o.giaTri));
}

/** Câu giải thích nguồn để hiện khi rê chuột / bấm "xem nguồn" */
export function moTaNguonO(o: OSo): string {
  const dau = `${o.anhXa.maAgent} · ${o.anhXa.congCu}`;
  const khoa = Object.keys(o.anhXa.thamSo).sort();
  const ts = khoa.length
    ? `(${khoa.map((k) => `${k}=${String(o.anhXa.thamSo[k])}`).join(", ")})`
    : "";
  return o.coSo ? `${dau}${ts} — ${o.vet.moTa}` : `${dau}${ts} — ${o.lyDo}`;
}

// ─────────────────────────────────────────────────────────────
// 2. Bảng · mục · báo cáo
// ─────────────────────────────────────────────────────────────

export type KieuCot = "chu" | "so" | "phan_tram" | "ngay" | "tien" | "stt";

export interface CotBang {
  khoa: string;
  nhan: string;
  kieu: KieuCot;
  /** Ô của cột này hỏi ai, công cụ nào (tham số dự án ghép thêm lúc dựng dòng) */
  anhXa: AnhXaNguon;
  /**
   * Tên trường có thể gặp trong bản ghi agent trả về. Nhiều tên vì hợp đồng
   * kết nối mới chốt KHUÔN TRẢ chứ chưa chốt tên trường của từng công cụ.
   * Đọc trượt hết thì ô thành "chưa có số liệu" — KHÔNG đoán bừa.
   */
  truongNguon?: string[];
  /** Cột góp phần định danh dòng — nhờ nó mà HAI agent điền chung MỘT dòng */
  laKhoa?: boolean;
  /** Cột Main tự sinh (số thứ tự) — không đi hỏi ai */
  tuSinh?: boolean;
  /** Cột do LLM soạn — nội dung phải mang tiền tố 🤖 */
  laLlm?: boolean;
  donVi?: string;
  /** Công cụ khác cũng điền được cột này (13/10 — bảng 11 gom việc từ hai agent vào chung cột) */
  congCuKhac?: string[];
  /** Cộng được giữa các dự án — hàng TỔNG CỘNG trên cùng (luật 34) */
  congDuoc?: boolean;
}

export interface DongBang {
  /** Khoá dòng, ghép từ các cột `laKhoa` */
  khoa: string;
  /** Dòng này thuộc dự án nào — để lỗi của một dự án không lem sang dự án khác */
  duAn?: string;
  o: Record<string, OSo>;
  /** Dòng giữ chỗ khi bảng không có dữ liệu — A.4 điều 5: không giấu bảng */
  laDongGiuCho?: boolean;
  /**
   * 13/10: "tong" = số CỘNG của cả dự án — khi in nằm ngay ở HÀNG TÊN DỰ ÁN (luật 34: tổng nhóm ở dòng tên nhóm) ·
   * "dem" = dòng đếm phần còn lại ("Còn N vấn đề khác…") — in một hàng chữ, 🤖 không soạn cho dòng này.
   */
  loai?: "tong" | "dem";
}

export interface Bang {
  /** Số hiệu 1..11 đúng thứ tự bảng trong file mẫu `form_bqlda_thang.js` */
  soHieu: number;
  ma: string;
  ten: string;
  cot: CotBang[];
  dong: DongBang[];
  /** Vì sao bảng không có dòng thật nào */
  lyDoTrong?: string;
  /** Câu in NGAY DƯỚI bảng (giải thích cách đọc số) */
  ghiChuDuoiBang: string[];
  /** Những lượt hỏi cần chạy để điền bảng này */
  luotHoi: AnhXaNguon[];
  /** Bảng nhiều dòng mỗi dự án — in thành HÀNG tên dự án thay cho CỘT dự án (Mr. Đại 13/10) */
  nhomTheoDuAn?: boolean;
}

export type MaMuc = "I" | "II" | "III" | "IV" | "V" | "VI";

export interface MucBaoCao {
  ma: MaMuc;
  ten: string;
  bang: Bang[];
  /** Nhận xét do LLM soạn — LUÔN mang tiền tố 🤖 (đặt qua `ghiNhanXetLlm`) */
  nhanXet?: string;
  /** Khối phi bảng của mục — hiện chỉ có ◆ biểu đồ xu thế đường găng của mục I */
  khoiThem?: KhoiThem[];
}

export interface KhoiThem {
  ma: string;
  ten: string;
  anhXa: AnhXaNguon;
  /** Các điểm lấy được; rỗng thì phải nói rõ vì sao, không nội suy cho đủ. `chu` = chữ in kèm (ngày COD dự báo của tháng đó) */
  diem: { nhan: string; giaTri: number; chu?: string }[];
  /** 13/10: mỗi dự án một khối xu thế (công cụ bắt buộc mã dự án) */
  duAn?: string;
  lyDoTrong?: string;
  ghiChu: string;
}

export interface KyBaoCao {
  thang: number;
  nam: number;
  /** dd/mm/yyyy — quy ước ngày của QUY-UOC-BIEU-MAU mục 4 */
  tuNgay: string;
  denNgay: string;
}

/**
 * Khoảng ngày của kỳ cho người đọc: "30 ngày · 01/09/2026 – 30/09/2026" (luật 31). Kỳ lưu ngày dạng dd/mm/yyyy
 * (dung.ts) — đổi về ISO rồi mới đưa khoangNgay (04/10: trước đưa thẳng nên ra "NaN ngày · undefined/…").
 */
export function khoangKy(ky: { tuNgay: string; denNgay: string }, khoang: (tu: string, den: string) => string): string {
  const iso = (x: string) => (/^\d{2}\/\d{2}\/\d{4}$/.test(x) ? x.split("/").reverse().join("-") : x);
  return khoang(iso(ky.tuNgay), iso(ky.denNgay));
}

export interface DuAnTrongBaoCao {
  ma: string;
  ten: string;
  /** 13/10 — bốn ô của bảng 3, khai ở sổ dự án của Main (Cài đặt → Dự án). Chưa khai thì ô là "—" kèm lý do */
  congSuat?: string;
  loaiHinh?: string;
  diaDiem?: string;
  /** "Chuẩn bị đầu tư" → hồ sơ thủ tục vào bảng 6; còn lại → bảng 7 */
  giaiDoan?: string;
}

/** Agent nào không hỏi được và vì sao — hiện nguyên văn đầu báo cáo (nghiệm thu bài 8) */
export interface AgentKhongHoiDuoc {
  maAgent: MaAgent;
  lyDo: string;
}

export interface BaoCaoThang {
  ky: KyBaoCao;
  duAn: DuAnTrongBaoCao[];
  /** Bảng 1 và 2 — khối đầu báo cáo, ngoài 6 mục nhưng vẫn được đánh số */
  dauBaoCao: Bang[];
  /** Đúng 6 mục I..VI */
  muc: MucBaoCao[];
  thoiDiemDung: string;
  /** Lúc chạy bước soạn nhận xét 🤖. Rỗng = chưa chạy bước đó. */
  thoiDiemSoanNhanXet?: string;
  agentKhongHoiDuoc: AgentKhongHoiDuoc[];
  canhBao: string[];
  /**
   * 13/10 Mr. Đại: dự án CHƯA CÓ DỮ LIỆU thì ẩn khỏi báo cáo (như báo cáo sáng) — mọi lượt hỏi theo dự án đó đều
   * "không có dữ liệu". Danh sách giữ ở đây để MÀN HÌNH nói rõ đã ẩn những dự án nào; bản Word không in.
   */
  duAnAn?: DuAnTrongBaoCao[];
  /** Chữ người sửa tay lời văn 🤖: khoá → chữ (lib/bao-cao-thang/sua-tay.ts). «Làm lại báo cáo» giữ nguyên phần này (Mr. Đại 28/10) */
  suaTay?: Record<string, string>;
}

/** PLAN mục 2: mẫu có 6 mục, 11 bảng — hai con số này là bất biến của màn này */
export const SO_MUC = 6;
export const SO_BANG = 11;

// ─────────────────────────────────────────────────────────────
// 3. Trạng thái hồ sơ pháp lý — BẮT BUỘC tách đôi
// ─────────────────────────────────────────────────────────────

/**
 * PLAN mục 2.2: cột Trạng thái của bảng chuẩn bị đầu tư PHẢI TÁCH ĐÔI, không
 * gộp thành một chữ "thiếu". Vì sao: 🔴 *chưa nộp được* là thứ BQL còn cứu
 * được (biết trước cả tháng thì kịp đi làm giấy tờ), 🟡 *đã nộp chờ kết quả*
 * thì chỉ còn thúc cơ quan cấp. Gộp lại là giấu mất đúng cái lãnh đạo can
 * thiệp được.
 *
 * Và: "thiếu" nghĩa là CHƯA CÓ văn bản `vai_tro = "kết quả"` — hồ sơ mới chỉ
 * có văn bản đề nghị vẫn tính là THIẾU (chốt AH + AN "04/09").
 */
export type TrangThaiHoSo = "chua_nop_duoc" | "da_nop_cho_ket_qua" | "da_co" | "chua_ro";

/**
 * ⭐ 18/10/2026: agent Pháp lý (`theo_ket_qua: true`, b5898b6) trả `trang_thai_nop` — chua_nop · da_nop_cho_ket_qua ·
 * da_co_ket_qua · chua_ro. Chỉ 🔴 / 🟡 có màu (hai hành động khác nhau — PLAN 2.2); «đã có» và «chưa rõ» là chữ thường
 * (luật 18: không có định nghĩa màu thì phân biệt bằng chữ).
 */
export const NHAN_TRANG_THAI_HO_SO: Record<TrangThaiHoSo, string> = {
  chua_nop_duoc: "🔴 Chưa nộp được",
  da_nop_cho_ket_qua: "🟡 Đã nộp, chờ kết quả",
  da_co: "Đã có kết quả",
  chua_ro: "Chưa rõ đã nộp hay chưa",
};

const TU_CHUA_NOP = ["chua_nop_duoc", "chua_nop", "chua nop", "chưa nộp", "thieu_thanh_phan", "chua bat dau", "chưa bắt đầu"];
const TU_CHO_KET_QUA = ["da_nop_cho_ket_qua", "da nop", "đã nộp", "cho_ket_qua", "chờ kết quả", "cho ket qua", "dang_xu_ly", "đang xử lý"];
const TU_DA_CO = ["da_co", "da_co_ket_qua", "đã có", "da co", "hoan_thanh", "hoàn thành", "xong"];
const TU_CHUA_RO = ["chua_ro", "chưa rõ"];

/**
 * Đọc trạng thái agent pháp lý trả về. KHÔNG nhận ra thì trả `null` để ô thành
 * "chưa có số liệu" — đoán bừa ở đúng cột này là xoá mất khác biệt 🔴/🟡.
 */
export function docTrangThaiHoSo(tho: unknown): TrangThaiHoSo | null {
  if (typeof tho !== "string") return null;
  const s = tho.trim().toLowerCase();
  if (s === "") return null;
  if (TU_CHUA_NOP.includes(s)) return "chua_nop_duoc";
  if (TU_CHO_KET_QUA.includes(s)) return "da_nop_cho_ket_qua";
  if (TU_DA_CO.includes(s)) return "da_co";
  if (TU_CHUA_RO.includes(s)) return "chua_ro";
  return null;
}

// ─────────────────────────────────────────────────────────────
// 4. Số ngày ảnh hưởng — KHÔNG CỘNG DỒN
// ─────────────────────────────────────────────────────────────

/**
 * A.4 điều 4: số ngày ảnh hưởng LẤY CÁI NẶNG NHẤT làm mốc, KHÔNG cộng dồn.
 * Ba vấn đề cùng chặn một mốc, mỗi cái 10 ngày, thì mốc trễ 10 ngày chứ không
 * phải 30 — chúng chặn song song, gỡ cái nặng nhất là mốc chạy tiếp.
 */
export const CAU_GIAI_THICH_NGAY_ANH_HUONG =
  "Số ngày ảnh hưởng lấy theo vấn đề NẶNG NHẤT, KHÔNG cộng dồn các dòng: " +
  "các vấn đề chặn song song cùng một mốc nên tổng của chúng không phải số ngày trễ thật.";

/**
 * Ô số ngày ảnh hưởng nặng nhất của một bảng. Trả về NGUYÊN Ô của dòng nặng
 * nhất — nhờ vậy con số vẫn dẫn được về đúng lượt hỏi đã sinh ra nó.
 * Không dòng nào có số → `null` (chứ không phải 0).
 */
export function ngayAnhHuongNangNhat(bang: Bang, khoaCot = "so_ngay_anh_huong"): OSo | null {
  let nang: OSo | null = null;
  let max = -Infinity;
  for (const d of bang.dong) {
    const o = d.o[khoaCot];
    if (!o || !o.coSo) continue;
    const v = typeof o.giaTri === "number" ? o.giaTri : Number(o.giaTri);
    if (!Number.isFinite(v)) continue;
    if (v > max) {
      max = v;
      nang = o;
    }
  }
  return nang;
}

// ─────────────────────────────────────────────────────────────
// 5. KHAI 11 BẢNG — ánh xạ từng cột về nguồn (PLAN mục 2.2 · DAC-TA mục 3)
//
// ⭐ BẢN 2 — 13/10/2026 (KE-HOACH/22, Mr. Đại chốt): đo thật thì 126/152 lượt hỏi hỏng và 93 ô
//    "agent có trả lời nhưng đọc trượt tên trường". Từ nay MỖI CÔNG CỤ có một hàm chuyển khuôn
//    riêng (`khuon-agent.ts`) đổi câu trả lời thật của agent thành bản ghi mang ĐÚNG tên `khoa`
//    của cột — không dò theo danh sách tên đoán nữa. Vì vậy `truongNguon` mặc định = [khoa].
// ─────────────────────────────────────────────────────────────

interface KhaiCot {
  khoa: string;
  nhan: string;
  kieu: KieuCot;
  maAgent: MaAgent;
  congCu: string;
  truongNguon?: string[];
  /** Công cụ KHÁC cũng điền được cột này (bảng 11: việc găng của Tiến độ + việc quá hạn của Công việc chung cột) */
  congCuKhac?: string[];
  laKhoa?: boolean;
  tuSinh?: boolean;
  laLlm?: boolean;
  donVi?: string;
  /** Cộng được giữa các dự án — hàng TỔNG CỘNG trên cùng (luật 34) */
  congDuoc?: boolean;
}

/** Một dự án có vào lượt hỏi của bảng này không (bảng 6 chỉ dự án chuẩn bị đầu tư, bảng 7 phần còn lại) */
type LocDuAn = (d: DuAnTrongBaoCao) => boolean;

/** Một công cụ bảng phải hỏi */
interface KhaiCongCu {
  maAgent: MaAgent;
  congCu: string;
  theoDuAn: boolean;
  locDuAn?: LocDuAn;
  /** ⭐ 18/10/2026 — tham số RIÊNG của công cụ này (vd `theo_ket_qua: true` cho phaply.ho_so_thieu), gửi thêm vào lượt hỏi */
  thamSoThem?: ThamSoHoi;
  /** ⭐ 18/10/2026 — `tu_ngay` · `den_ngay` là khoảng của THÁNG TỚI (kỳ báo cáo + 1), không phải tháng báo cáo */
  khoangThangToi?: boolean;
  /**
   * ⭐ 18/10/2026 — công cụ MỚI, agent có thể chưa dựng lại nên chưa mở: trả KHONG_HIEU_YEU_CAU thì bỏ qua IM LẶNG
   * (công cụ cũ cùng bảng vẫn lo phần của nó — đường dự phòng), không ghi lý do «chưa hỏi được» vào ô.
   */
  chuaCoThiBoQua?: boolean;
}

interface KhaiBang {
  soHieu: number;
  ma: string;
  ten: string;
  /** null = khối đầu báo cáo (bảng 1, 2) — được đánh số nhưng không thuộc mục nào */
  muc: MaMuc | null;
  cot: KhaiCot[];
  /** Câu in NGAY DƯỚI bảng — CHỈ câu cho NGƯỜI ĐỌC báo cáo. Ghi chú thiết kế nằm ở MD, không in (13/10) */
  ghiChuDuoiBang: string[];
  /** Công cụ cần gọi để điền bảng; tham số dự án ghép lúc dựng khung */
  congCu: KhaiCongCu[];
  /** Bảng nhiều dòng mỗi dự án — in thành HÀNG tên dự án thay cho CỘT dự án (Mr. Đại 13/10) */
  nhomTheoDuAn?: boolean;
}

function c(
  khoa: string,
  nhan: string,
  kieu: KieuCot,
  maAgent: MaAgent,
  congCu: string,
  them: Partial<KhaiCot> = {},
): KhaiCot {
  return { khoa, nhan, kieu, maAgent, congCu, truongNguon: [khoa], ...them };
}

const C_STT: KhaiCot = {
  khoa: "tt",
  nhan: "TT",
  kieu: "stt",
  maAgent: MA_AGENT.main,
  congCu: "main.so_thu_tu",
  tuSinh: true,
};

/**
 * Cột "Dự án" có ở MỌI bảng trong DỮ LIỆU — quyết định 1 của Mr. Đại 30/08: gộp các dự án một file.
 * 13/10: khi IN (Word + màn hình) cột này thành HÀNG tên dự án, xem `trinhBayBang`.
 */
const C_DU_AN: KhaiCot = {
  khoa: "du_an",
  nhan: "Dự án",
  kieu: "chu",
  maAgent: MA_AGENT.main,
  congCu: "core.du_an",
  truongNguon: ["du_an", "ma_du_an", "ten_du_an"],
  laKhoa: true,
};

export const GIAI_DOAN_CHUAN_BI = "Chuẩn bị đầu tư";
const laChuanBi: LocDuAn = (d) => d.giaiDoan === GIAI_DOAN_CHUAN_BI;
const khongChuanBi: LocDuAn = (d) => d.giaiDoan !== GIAI_DOAN_CHUAN_BI;

const TD = MA_AGENT.tienDo;
const PL = MA_AGENT.phapLy;
const HD = MA_AGENT.hopDong;
const CV = MA_AGENT.base;
const MA = MA_AGENT.main;

/** Bảng 8 «% sản lượng» — Main TÍNH từ hai ô đã có trên dòng (18/10/2026), không hỏi agent nào */
export const CC_PHAN_TRAM_SAN_LUONG = "main.phan_tram_san_luong";

/** Bảng 11 — các công cụ cùng điền các cột việc ngoài `tiendo.duong_gang` (18/10/2026) */
const CC_B11_CONG_VIEC = ["tiendo.viec_trong_khoang", "base.viec_co_han_trong_khoang", "base.viec_qua_han"];

/** Công cụ Main TỰ GOM từ nhiều agent (dung.ts) — vẫn dẫn nguồn về từng lượt hỏi thật */
export const CC_VAN_DE_NOI_BAT = "main.van_de_noi_bat";

/**
 * ĐÂY LÀ BẢNG ÁNH XẠ CHÍNH của cả màn hình. Sửa nguồn của một ô thì sửa ở
 * đây, không rải rác trong `dung.ts` — đọc một chỗ là biết cả báo cáo lấy số
 * ở đâu, đúng tinh thần mục 2 của PLAN.
 */
const KHAI: KhaiBang[] = [
  // ── Bảng 1 · 2: khối đầu báo cáo
  {
    soHieu: 1,
    ma: "B1",
    ten: "Đầu báo cáo",
    muc: null,
    ghiChuDuoiBang: [],
    congCu: [],
    cot: [
      c("don_vi_lap", "Đơn vị lập", "chu", MA, "cai_dat.don_vi_lap", { laKhoa: true }),
      c("noi_nhan", "Nơi nhận", "chu", MA, "cai_dat.noi_nhan"),
      c("ten_bao_cao", "Tên báo cáo", "chu", MA, "main.ky_bao_cao"),
      c("pham_vi", "Phạm vi", "chu", MA, "core.du_an"),
    ],
  },
  {
    soHieu: 2,
    ma: "B2",
    ten: "Kỳ báo cáo",
    muc: null,
    ghiChuDuoiBang: [],
    congCu: [],
    cot: [
      c("ky", "Kỳ báo cáo", "chu", MA, "main.ky_bao_cao", { laKhoa: true }),
      c("tu_ngay", "Từ ngày", "ngay", MA, "main.ky_bao_cao"),
      c("den_ngay", "Đến ngày", "ngay", MA, "main.ky_bao_cao"),
      c("ngay_lap", "Ngày lập", "ngay", MA, "main.ky_bao_cao"),
      // 13/10: người lập = người bấm "Làm lại báo cáo"; người ký khai ở khối "Thông tin đầu báo cáo"
      c("nguoi_lap", "Người lập", "chu", MA, "main.nguoi_lap"),
      c("nguoi_ky", "Người ký", "chu", MA, "cai_dat.nguoi_ky"),
    ],
  },

  // ── Mục I
  {
    soHieu: 3,
    ma: "B3",
    ten: "Tổng quan các dự án",
    muc: "I",
    ghiChuDuoiBang: [],
    congCu: [{ maAgent: TD, congCu: "tiendo.tom_tat_du_an", theoDuAn: true }],
    cot: [
      C_STT,
      C_DU_AN,
      // 13/10: bốn cột dưới lấy từ sổ dự án của Main (Cài đặt → Dự án)
      c("cong_suat", "Công suất", "chu", MA, "core.du_an.cong_suat"),
      c("loai_hinh", "Loại hình", "chu", MA, "core.du_an.loai_hinh"),
      c("dia_diem", "Địa điểm", "chu", MA, "core.du_an.dia_diem"),
      c("trang_thai", "Giai đoạn", "chu", MA, "core.du_an.giai_doan"),
      c("tien_do", "Tiến độ / Mốc gần nhất", "chu", TD, "tiendo.tom_tat_du_an"),
    ],
  },

  // ── Mục II
  {
    soHieu: 4,
    ma: "B4",
    ten: "Tiến độ chi tiết — dự án đang thi công",
    muc: "II",
    nhomTheoDuAn: true,
    ghiChuDuoiBang: [],
    congCu: [{ maAgent: TD, congCu: "tiendo.tom_tat_du_an", theoDuAn: true }],
    cot: [
      C_DU_AN,
      c("hang_muc", "Hạng mục", "chu", TD, "tiendo.tom_tat_du_an", { laKhoa: true }),
      c("kh_luy_ke", "Lũy kế theo Baseline", "phan_tram", TD, "tiendo.tom_tat_du_an", { donVi: "%" }),
      c("th_luy_ke", "TH lũy kế", "phan_tram", TD, "tiendo.tom_tat_du_an", { donVi: "%" }),
      // Luật 35 + 36 (14/10/2026): bỏ cột «Lệch» (điểm %) — nhanh/chậm chỉ bằng NGÀY, mỗi hệ một cột. Cột CHỮ
      // («chậm 86 ngày» / «sớm 5 ngày» / «đúng hạn») chứ không cột số: số âm trong cột «Chậm» người đọc dễ hiểu ngược.
      c("cham_muc_tieu", "So với Tiến độ mục tiêu", "chu", TD, "tiendo.tom_tat_du_an"),
      c("cham_baseline", "So với Baseline", "chu", TD, "tiendo.tom_tat_du_an"),
      c("tinh_trang", "Ghi chú", "chu", TD, "tiendo.tom_tat_du_an"),
    ],
  },
  {
    soHieu: 5,
    ma: "B5",
    ten: "Chi tiết khối lượng thi công",
    muc: "II",
    nhomTheoDuAn: true,
    ghiChuDuoiBang: [],
    congCu: [{ maAgent: TD, congCu: "tiendo.khoi_luong_hang_muc", theoDuAn: true }],
    cot: [
      C_STT,
      C_DU_AN,
      c("hang_muc", "Hạng mục", "chu", TD, "tiendo.khoi_luong_hang_muc", { laKhoa: true }),
      c("nha_thau", "Nhà thầu", "chu", TD, "tiendo.khoi_luong_hang_muc"),
      c("dvt", "ĐVT", "chu", TD, "tiendo.khoi_luong_hang_muc"),
      c("kl_thiet_ke", "KL thiết kế", "so", TD, "tiendo.khoi_luong_hang_muc"),
      c("kl_trong_ky", "Thực hiện trong kỳ", "so", TD, "tiendo.khoi_luong_hang_muc"),
      c("th_luy_ke", "TH lũy kế", "so", TD, "tiendo.khoi_luong_hang_muc"),
      c("kh_thang_sau", "KH tháng sau", "so", TD, "tiendo.khoi_luong_hang_muc"),
      c("phan_tram_dat", "% đạt", "phan_tram", TD, "tiendo.khoi_luong_hang_muc", { donVi: "%" }),
      c("ghi_chu", "Ghi chú", "chu", TD, "tiendo.khoi_luong_hang_muc"),
    ],
  },
  {
    soHieu: 6,
    ma: "B6",
    ten: "Tiến độ chi tiết — dự án chuẩn bị đầu tư",
    muc: "II",
    nhomTheoDuAn: true,
    ghiChuDuoiBang: [
      "Dự án chuẩn bị đầu tư đo bằng thủ tục xong chưa, không đo bằng phần trăm khối lượng.",
    ],
    // 18/10/2026: `theo_ket_qua` — Pháp lý trả thêm trạng thái NỘP (chưa nộp · đã nộp chờ kết quả · đã có · chưa rõ), PLAN 2.2
    congCu: [{ maAgent: PL, congCu: "phaply.ho_so_thieu", theoDuAn: true, locDuAn: laChuanBi, thamSoThem: { theo_ket_qua: true } }],
    cot: [
      C_DU_AN,
      c("ho_so", "Hồ sơ / Thủ tục", "chu", PL, "phaply.ho_so_thieu", { laKhoa: true }),
      c("trang_thai", "Trạng thái", "chu", PL, "phaply.ho_so_thieu"),
      c("han_baseline", "Hạn", "ngay", PL, "phaply.ho_so_thieu"),
      c("ghi_chu", "Ghi chú", "chu", PL, "phaply.ho_so_thieu"),
    ],
  },

  // ── Mục III
  {
    soHieu: 7,
    ma: "B7",
    ten: "Pháp lý & GPMB",
    muc: "III",
    nhomTheoDuAn: true,
    ghiChuDuoiBang: [],
    congCu: [{ maAgent: PL, congCu: "phaply.ho_so_thieu", theoDuAn: true, locDuAn: khongChuanBi, thamSoThem: { theo_ket_qua: true } }],
    cot: [
      C_DU_AN,
      c("ho_so_khu_vuc", "Hồ sơ", "chu", PL, "phaply.ho_so_thieu", { laKhoa: true, truongNguon: ["ho_so"] }),
      c("loai", "Loại", "chu", PL, "phaply.ho_so_thieu"),
      c("han_baseline", "Hạn", "ngay", PL, "phaply.ho_so_thieu"),
      c("trang_thai", "Trạng thái", "chu", PL, "phaply.ho_so_thieu"),
      c("vuong_mac", "Vướng mắc", "chu", PL, "phaply.ho_so_thieu", { truongNguon: ["ghi_chu"] }),
    ],
  },

  // ── Mục IV
  {
    soHieu: 8,
    ma: "B8",
    ten: "Hợp đồng & thanh toán",
    muc: "IV",
    nhomTheoDuAn: true,
    // 18/10/2026 (agent Hợp đồng debb181): «đã thanh toán» theo luật của app — nói rõ cho người đọc báo cáo
    ghiChuDuoiBang: [
      "«Đã thanh toán» = lũy kế giá trị thực hiện của phiếu giá mới nhất đã được Giám đốc dự án ký — theo phiếu đã ký, chưa phải số tiền đã chi (kho chưa ghi chứng từ chi tiền). «% đã lên phiếu» = lũy kế đã lên phiếu giá ÷ giá trị hợp đồng; «% sản lượng» = sản lượng lũy kế (agent Tiến độ) ÷ giá trị hợp đồng.",
      "Chênh lệch giữa «% sản lượng» và «% đã lên phiếu» là phần đã làm mà chưa đòi tiền (sản lượng cao hơn), hoặc đã đòi tiền trước khi làm (phiếu cao hơn).",
    ],
    congCu: [
      { maAgent: HD, congCu: "hopdong.chi_phi_theo_hop_dong", theoDuAn: true },
      { maAgent: HD, congCu: "hopdong.phieu_gia_dang_cho", theoDuAn: true },
      { maAgent: TD, congCu: "tiendo.san_luong_hop_dong", theoDuAn: true },
    ],
    cot: [
      C_DU_AN,
      c("hop_dong", "Hợp đồng", "chu", HD, "hopdong.chi_phi_theo_hop_dong", { laKhoa: true }),
      c("nha_thau", "Nhà thầu", "chu", HD, "hopdong.chi_phi_theo_hop_dong"),
      c("gia_tri_hd", "Giá trị HĐ", "tien", HD, "hopdong.chi_phi_theo_hop_dong", { donVi: "tỷ đ", congDuoc: true }),
      c("san_luong_thang", "Sản lượng trong tháng", "tien", TD, "tiendo.san_luong_hop_dong", { donVi: "tỷ đ", congDuoc: true }),
      c("san_luong_luy_ke", "Sản lượng lũy kế", "tien", TD, "tiendo.san_luong_hop_dong", { donVi: "tỷ đ", congDuoc: true }),
      c("da_thanh_toan_lk", "Đã lên phiếu giá lũy kế", "tien", HD, "hopdong.chi_phi_theo_hop_dong", { donVi: "tỷ đ", congDuoc: true }),
      c("da_thanh_toan", "Đã thanh toán (theo phiếu đã ký)", "tien", HD, "hopdong.chi_phi_theo_hop_dong", { donVi: "tỷ đ", congDuoc: true }),
      // 18/10/2026 (Mr. Đại gật câu 9): HAI cột % — đã lên phiếu (Hợp đồng) và sản lượng (Tiến độ), mỗi cột ÷ giá trị HĐ
      c("phan_tram_hd", "% đã lên phiếu", "phan_tram", HD, "hopdong.chi_phi_theo_hop_dong", { donVi: "%" }),
      c("phan_tram_san_luong", "% sản lượng", "phan_tram", MA, CC_PHAN_TRAM_SAN_LUONG, { donVi: "%" }),
      c("phieu_gia_cho_duyet", "Phiếu giá chờ", "so", HD, "hopdong.phieu_gia_dang_cho", { donVi: "phiếu", congDuoc: true }),
      c("so_ngay_cho", "Chờ lâu nhất", "so", HD, "hopdong.phieu_gia_dang_cho", { donVi: "ngày" }),
      c("dang_o_ban", "Đang ở khâu", "chu", HD, "hopdong.phieu_gia_dang_cho"),
      c("ghi_chu", "Ghi chú", "chu", HD, "hopdong.chi_phi_theo_hop_dong"),
    ],
  },
  {
    soHieu: 9,
    ma: "B9",
    ten: "Nhân lực & thiết bị — cam kết vs thực tế",
    muc: "IV",
    nhomTheoDuAn: true,
    ghiChuDuoiBang: [],
    congCu: [
      { maAgent: HD, congCu: "hopdong.cam_ket_nha_thau", theoDuAn: true },
      { maAgent: TD, congCu: "tiendo.nguon_luc_huy_dong", theoDuAn: true },
    ],
    cot: [
      C_DU_AN,
      c("nha_thau", "Nhà thầu", "chu", HD, "hopdong.cam_ket_nha_thau", { laKhoa: true, truongNguon: ["nha_thau", "ten_nha_thau"] }),
      c("nhan_luc_cam_ket", "Nhân lực cam kết", "so", HD, "hopdong.cam_ket_nha_thau", {
        donVi: "người",
        truongNguon: ["nhan_luc_cam_ket", "nhan_luc", "so_nguoi_cam_ket"],
      }),
      c("nhan_luc_thuc_te", "Nhân lực thực tế BQ kỳ", "so", TD, "tiendo.nguon_luc_huy_dong", {
        donVi: "người",
        truongNguon: ["nhan_luc_thuc_te", "nhan_luc_bq", "so_nguoi"],
      }),
      c("thiet_bi_cam_ket", "Thiết bị cam kết", "so", HD, "hopdong.cam_ket_nha_thau", {
        donVi: "máy",
        truongNguon: ["thiet_bi_cam_ket", "so_may_cam_ket"],
      }),
      c("thiet_bi_thuc_te", "Thiết bị thực tế", "so", TD, "tiendo.nguon_luc_huy_dong", {
        donVi: "máy",
        truongNguon: ["thiet_bi_thuc_te", "so_may"],
      }),
      { khoa: "danh_gia", nhan: "Đánh giá", kieu: "chu", maAgent: MA, congCu: "main.nhan_xet_llm", laLlm: true },
    ],
  },

  // ── Mục V
  {
    soHieu: 10,
    ma: "B10",
    ten: "Vấn đề nổi bật & kiến nghị",
    muc: "V",
    nhomTheoDuAn: true,
    ghiChuDuoiBang: [
      CAU_GIAI_THICH_NGAY_ANH_HUONG,
      "Cột Kiến nghị do 🤖 soạn NHÁP — người ký duyệt mới chốt.",
    ],
    // 13/10 Mr. Đại: mỗi dự án tối đa 10 vấn đề nặng nhất theo luật "làm chậm COD" của báo cáo sáng, còn lại MỘT dòng đếm
    congCu: [{ maAgent: MA, congCu: CC_VAN_DE_NOI_BAT, theoDuAn: true }],
    cot: [
      C_STT,
      C_DU_AN,
      c("van_de", "Rủi ro / Vấn đề", "chu", MA, CC_VAN_DE_NOI_BAT, { laKhoa: true, truongNguon: ["van_de", "tom_tat", "tieu_de"] }),
      c("muc_do", "Mức độ", "chu", MA, CC_VAN_DE_NOI_BAT),
      c("so_ngay_anh_huong", "Số ngày ảnh hưởng", "so", MA, CC_VAN_DE_NOI_BAT, { donVi: "ngày" }),
      c("anh_huong", "Ảnh hưởng", "chu", MA, CC_VAN_DE_NOI_BAT),
      c("nguon_bao", "Nguồn", "chu", MA, CC_VAN_DE_NOI_BAT),
      { khoa: "kien_nghi", nhan: "Kiến nghị", kieu: "chu", maAgent: MA, congCu: "main.nhan_xet_llm", laLlm: true },
    ],
  },

  // ── Mục VI
  {
    soHieu: 11,
    ma: "B11",
    ten: "Kế hoạch tháng tới",
    muc: "VI",
    nhomTheoDuAn: true,
    ghiChuDuoiBang: ["Cột Kết quả cần có do 🤖 soạn NHÁP — mô tả sản phẩm bàn giao, người ký duyệt mới chốt."],
    // 13/10 Mr. Đại: việc có hạn tháng tới ở agent Công việc + mốc tiến độ tháng tới.
    // Hiện có: việc GĂNG rơi vào tháng tới (Tiến độ) + ⭐ 18/10 việc CÓ HẠN TRONG THÁNG TỚI (agent Công việc
    // `base.viec_co_han_trong_khoang`, 180c198) + việc QUÁ HẠN từ trước còn mở. Hai nguồn Công việc gộp, bỏ trùng theo MÃ VIỆC
    // (`__khoa_dong`). Công cụ mới chưa mở (3004 chưa dựng lại) → bỏ qua im lặng, `viec_qua_han` vẫn chạy như cũ.
    // ⭐ 18/10 mốc tiến độ tháng tới: `tiendo.viec_trong_khoang` (9d23288) — việc / mốc có ngày bắt đầu hoặc xong rơi vào tháng
    // tới; khoá dòng = mã WBS nên việc găng `duong_gang` cũng trả thì gộp một dòng.
    congCu: [
      { maAgent: TD, congCu: "tiendo.duong_gang", theoDuAn: true },
      { maAgent: TD, congCu: "tiendo.viec_trong_khoang", theoDuAn: true, khoangThangToi: true, chuaCoThiBoQua: true },
      { maAgent: CV, congCu: "base.viec_co_han_trong_khoang", theoDuAn: true, khoangThangToi: true, chuaCoThiBoQua: true },
      { maAgent: CV, congCu: "base.viec_qua_han", theoDuAn: true },
    ],
    cot: [
      C_STT,
      C_DU_AN,
      c("cong_viec", "Công việc", "chu", TD, "tiendo.duong_gang", { laKhoa: true, congCuKhac: CC_B11_CONG_VIEC }),
      c("loai_viec", "Loại", "chu", TD, "tiendo.duong_gang", { congCuKhac: CC_B11_CONG_VIEC }),
      c("nguoi_phu_trach", "Người phụ trách", "chu", TD, "tiendo.duong_gang", { congCuKhac: CC_B11_CONG_VIEC }),
      c("han_ht", "Hạn hoàn thành", "ngay", TD, "tiendo.duong_gang", { congCuKhac: CC_B11_CONG_VIEC }),
      c("ghi_chu", "Ghi chú", "chu", TD, "tiendo.duong_gang", { congCuKhac: CC_B11_CONG_VIEC }),
      { khoa: "ket_qua_can_co", nhan: "Kết quả cần có", kieu: "chu", maAgent: MA, congCu: "main.nhan_xet_llm", laLlm: true },
    ],
  },
];

export const TEN_MUC: Record<MaMuc, string> = {
  I: "Tổng quan các dự án",
  II: "Tiến độ chi tiết từng dự án",
  III: "Pháp lý & GPMB",
  IV: "Hợp đồng, thanh toán & nguồn lực",
  V: "Vấn đề nổi bật & kiến nghị",
  VI: "Kế hoạch tháng tới",
};

export const THU_TU_MUC: MaMuc[] = ["I", "II", "III", "IV", "V", "VI"];

// ─────────────────────────────────────────────────────────────
// 6. Dựng KHUNG (chưa hỏi ai) — mọi ô đã khai sẵn nguồn
// ─────────────────────────────────────────────────────────────

const LY_DO_CHUA_HOI = "Chưa chạy lượt hỏi nào cho ô này.";

function cotTuKhai(k: KhaiCot, thamSo: ThamSoHoi): CotBang {
  return {
    khoa: k.khoa,
    nhan: k.nhan,
    kieu: k.kieu,
    anhXa: { maAgent: k.maAgent, congCu: k.congCu, thamSo },
    truongNguon: k.truongNguon,
    laKhoa: k.laKhoa,
    tuSinh: k.tuSinh,
    laLlm: k.laLlm,
    donVi: k.donVi,
    congCuKhac: k.congCuKhac,
    congDuoc: k.congDuoc,
  };
}

/** Khoá một lượt hỏi — dùng để gộp các ô cùng nguồn vào MỘT lời gọi */
export function khoaLuot(a: AnhXaNguon): string {
  const ts = Object.keys(a.thamSo)
    .sort()
    .map((k) => `${k}=${String(a.thamSo[k])}`)
    .join("&");
  return `${a.maAgent}|${a.congCu}|${ts}`;
}

export interface ThamSoKhung {
  ky: KyBaoCao;
  duAn: DuAnTrongBaoCao[];
  /** Khai trong Cài đặt; chưa khai thì ô đầu báo cáo là "chưa có số liệu" */
  donViLap?: string;
  noiNhan?: string;
  /** dd/mm/yyyy — ngày lập bản nháp */
  ngayLap?: string;
  /** Người bấm "Làm lại báo cáo" (13/10) */
  nguoiLap?: string;
  /** Người ký — khai ở khối "Thông tin đầu báo cáo" */
  nguoiKy?: string;
}

/** Nhãn kỳ dùng làm tham số hỏi: "2026-07" */
export function nhanKy(ky: KyBaoCao): string {
  return `${ky.nam}-${String(ky.thang).padStart(2, "0")}`;
}

/** Nhãn kỳ hiện ra người đọc: "Tháng 07/2026" */
export function nhanKyChu(ky: KyBaoCao): string {
  return `Tháng ${String(ky.thang).padStart(2, "0")}/${ky.nam}`;
}

function vetMain(moTa: string): VetNguon {
  return { moTa, thoiDiem: new Date().toISOString() };
}

/**
 * ⭐ VÌ SAO MỖI CỘT KHAI NHIỀU TÊN TRƯỜNG
 *
 * Bốn agent chưa chốt tên trường chung (kho `core` chưa dựng), nên cùng một
 * đại lượng mỗi con gọi một kiểu: "thực hiện luỹ kế" bên tiến độ là
 * `kl_luy_ke`, "% hoàn thành" là `pctTotal`, "hạng mục" là `ma_wbs`.
 *
 * Đo thật 05/09: khung khai đúng tên theo tài liệu, agent trả về tên khác —
 * lời gọi THÀNH CÔNG mà ô vẫn "—". Không đỏ ở đâu cả, chỉ là báo cáo rỗng.
 *
 * Vì vậy mỗi cột khai một DANH SÁCH tên chấp nhận được, đọc trúng cái nào thì
 * lấy cái đó. Khi các agent chốt tên chung thì rút danh sách lại, đừng xoá vội.
 */
/**
 * Dựng khung báo cáo: 6 mục, 11 bảng, mọi ô là "chưa có số liệu" kèm ánh xạ
 * nguồn. Chưa hỏi ai cả — nhờ vậy màn hình mở ra được ngay và trả lời được
 * câu "báo cáo này định lấy số ở đâu" kể cả khi 4 agent đang tắt hết.
 */
export function dungKhungBaoCao(ts: ThamSoKhung): BaoCaoThang {
  const ky = nhanKy(ts.ky);
  // Ngày kỳ báo cáo dạng ISO. `KyBaoCao` giữ dd/mm/yyyy theo quy ước biểu mẫu,
  // nhưng cổng MCP đòi yyyy-mm-dd — thiếu là Agent Tiến độ trả thẳng
  // "Bắt buộc tu_ngay và den_ngay dạng ISO" và mất trắng bảng nguồn lực.
  const isoTu = `${ts.ky.nam}-${String(ts.ky.thang).padStart(2, "0")}-01`;
  const isoDen = `${ts.ky.nam}-${String(ts.ky.thang).padStart(2, "0")}-${String(
    new Date(ts.ky.nam, ts.ky.thang, 0).getDate(),
  ).padStart(2, "0")}`;
  const bangTheoMuc: Record<MaMuc, Bang[]> = { I: [], II: [], III: [], IV: [], V: [], VI: [] };
  const dauBaoCao: Bang[] = [];

  for (const k of KHAI) {
    const thamSoChung: ThamSoHoi = { ky, tu_ngay: isoTu, den_ngay: isoDen };
    const bang: Bang = {
      soHieu: k.soHieu,
      ma: k.ma,
      ten: k.ten,
      cot: k.cot.map((c) => cotTuKhai(c, thamSoChung)),
      dong: [],
      ghiChuDuoiBang: [...k.ghiChuDuoiBang],
      nhomTheoDuAn: k.nhomTheoDuAn,
      luotHoi: k.congCu.flatMap((cc) => {
        // 18/10/2026: khoảng tháng tới + tham số riêng của từng công cụ
        const toi = cc.khoangThangToi ? thangToi(isoDen) : null;
        const khoang = toi ? { tu_ngay: toi.tu, den_ngay: toi.den } : { tu_ngay: isoTu, den_ngay: isoDen };
        const them = cc.thamSoThem ?? {};
        return cc.theoDuAn
          ? ts.duAn.filter((d) => !cc.locDuAn || cc.locDuAn(d)).map(
              (d): AnhXaNguon => ({
                maAgent: cc.maAgent,
                congCu: cc.congCu,
                // Truyền CẢ HAI tên khoá: bốn agent chưa thống nhất tên tham số
                // dự án — Agent Tiến độ bắt buộc `ma_du_an` và trả thẳng
                // "Thiếu ma_du_an" nếu không có, còn chỗ khác đọc `du_an`.
                // Gửi thừa một khoá thì bên không cần sẽ bỏ qua, không hỏng gì;
                // gửi thiếu thì mất trắng số của con đó. Đo thật 05/09.
                thamSo: { ky, du_an: d.ma, ma_du_an: d.ma, ...khoang, ...them },
              }),
            )
          : [{ maAgent: cc.maAgent, congCu: cc.congCu, thamSo: { ky, ...khoang, ...them } }];
      }),
    };
    if (k.muc === null) dauBaoCao.push(bang);
    else bangTheoMuc[k.muc].push(bang);
  }

  // Bảng 1 · 2 · 3 dựng sẵn dòng: đây là phần Main BIẾT CHẮC (kỳ báo cáo do
  // người dùng chọn, danh sách dự án từ core.du_an) nên ba bảng này không bao
  // giờ trống dù mọi agent đều tắt.
  const b1 = dauBaoCao.find((b) => b.ma === "B1");
  if (b1) b1.dong = [dongDauBaoCao(b1, ts)];
  const b2 = dauBaoCao.find((b) => b.ma === "B2");
  if (b2) b2.dong = [dongKyBaoCao(b2, ts)];
  const b3 = bangTheoMuc.I[0];
  if (b3) b3.dong = ts.duAn.map((d, i) => dongChoDuAn(b3, d, i + 1));

  return {
    ky: ts.ky,
    duAn: ts.duAn,
    dauBaoCao,
    muc: THU_TU_MUC.map((ma) => ({
      ma,
      ten: TEN_MUC[ma],
      bang: bangTheoMuc[ma],
      khoiThem: ma === "I" ? ts.duAn.map((d) => khoiXuTheDuongGang(ky, d)) : undefined,
    })),
    thoiDiemDung: "",
    agentKhongHoiDuoc: [],
    canhBao: [],
  };
}

/**
 * ◆ Xu thế COD dự báo 6 tháng — PLAN mục 2.2, nguồn `tiendo.lich_su_du_bao`.
 * 13/10: công cụ BẮT BUỘC mã dự án (đo: hỏi không kèm mã → "Thiếu ma_du_an", khối trống suốt) → mỗi dự án một khối.
 */
function khoiXuTheDuongGang(ky: string, d: DuAnTrongBaoCao): KhoiThem {
  return {
    ma: `XU_THE_DUONG_GANG::${d.ma}`,
    ten: `◆ Xu thế COD dự báo 6 tháng gần nhất — ${d.ten}`,
    duAn: d.ma,
    anhXa: {
      maAgent: MA_AGENT.tienDo,
      congCu: "tiendo.lich_su_du_bao",
      thamSo: { ky, so_thang: 6, du_an: d.ma, ma_du_an: d.ma },
    },
    diem: [],
    lyDoTrong: LY_DO_CHUA_HOI,
    ghiChu: "Mỗi tháng lấy lần dự báo CUỐI của tháng đó; chưa đủ 6 tháng thì có bao nhiêu điểm in bấy nhiêu, không nội suy.",
  };
}

function dongDauBaoCao(bang: Bang, ts: ThamSoKhung): DongBang {
  const o: Record<string, OSo> = {};
  for (const c of bang.cot) {
    if (c.khoa === "don_vi_lap") {
      o[c.khoa] = ts.donViLap
        ? oCoSo(ts.donViLap, c.anhXa, vetMain("Cài đặt · Đơn vị lập báo cáo"))
        : oThieu(c.anhXa, "Chưa khai Đơn vị lập trong Cài đặt.");
    } else if (c.khoa === "noi_nhan") {
      o[c.khoa] = ts.noiNhan
        ? oCoSo(ts.noiNhan, c.anhXa, vetMain("Cài đặt · Nơi nhận báo cáo"))
        : oThieu(c.anhXa, "Chưa khai Nơi nhận trong Cài đặt.");
    } else if (c.khoa === "ten_bao_cao") {
      o[c.khoa] = oCoSo(
        `BÁO CÁO ${nhanKyChu(ts.ky).toUpperCase()}`,
        c.anhXa,
        vetMain("Kỳ báo cáo do người dùng chọn khi bấm dựng bản nháp"),
      );
    } else if (c.khoa === "pham_vi") {
      o[c.khoa] =
        ts.duAn.length > 0
          ? oCoSo(
              `${ts.duAn.length} dự án: ${ts.duAn.map((d) => d.ten).join(", ")}`,
              c.anhXa,
              vetMain(`core.du_an · ${ts.duAn.map((d) => d.ma).join(", ")}`),
            )
          : oThieu(c.anhXa, "Chưa có dự án nào trong core.du_an.");
    } else {
      o[c.khoa] = oThieu(c.anhXa, LY_DO_CHUA_HOI, c.donVi);
    }
  }
  return { khoa: "dau_bao_cao", o };
}

function dongKyBaoCao(bang: Bang, ts: ThamSoKhung): DongBang {
  const vet = vetMain("Kỳ báo cáo do người dùng chọn khi bấm dựng bản nháp");
  const o: Record<string, OSo> = {};
  for (const c of bang.cot) {
    if (c.khoa === "ky") o[c.khoa] = oCoSo(nhanKyChu(ts.ky), c.anhXa, vet);
    else if (c.khoa === "tu_ngay") o[c.khoa] = oCoSo(ts.ky.tuNgay, c.anhXa, vet);
    else if (c.khoa === "den_ngay") o[c.khoa] = oCoSo(ts.ky.denNgay, c.anhXa, vet);
    else if (c.khoa === "ngay_lap") {
      o[c.khoa] = ts.ngayLap
        ? oCoSo(ts.ngayLap, c.anhXa, vet)
        : oThieu(c.anhXa, "Chưa có ngày lập — bản nháp chưa được chốt.");
    } else if (c.khoa === "nguoi_lap") {
      o[c.khoa] = ts.nguoiLap
        ? oCoSo(ts.nguoiLap, c.anhXa, vetMain("Người bấm làm lại báo cáo"))
        : oThieu(c.anhXa, "Chưa rõ người lập — bản này do máy tự dựng.");
    } else if (c.khoa === "nguoi_ky") {
      o[c.khoa] = ts.nguoiKy
        ? oCoSo(ts.nguoiKy, c.anhXa, vetMain("Thông tin đầu báo cáo · Người ký"))
        : oThieu(c.anhXa, "Chưa khai Người ký ở khối Thông tin đầu báo cáo.");
    } else o[c.khoa] = oThieu(c.anhXa, LY_DO_CHUA_HOI, c.donVi);
  }
  return { khoa: "ky_bao_cao", o };
}

function dongChoDuAn(bang: Bang, d: DuAnTrongBaoCao, stt: number): DongBang {
  const o: Record<string, OSo> = {};
  for (const c of bang.cot) {
    const anhXa: AnhXaNguon = { ...c.anhXa, thamSo: { ...c.anhXa.thamSo, du_an: d.ma } };
    if (c.khoa === "tt") {
      o[c.khoa] = oCoSo(stt, anhXa, vetMain("Số thứ tự do Main đánh theo thứ tự dự án"));
    } else if (c.khoa === "du_an") {
      o[c.khoa] = oCoSo(d.ten, anhXa, vetMain(`core.du_an · ${d.ma}`));
    } else if (c.anhXa.congCu.startsWith("core.du_an.")) {
      // 13/10: bốn ô lấy từ sổ dự án của Main — chưa khai thì nói rõ khai ở đâu
      const v = { cong_suat: d.congSuat, loai_hinh: d.loaiHinh, dia_diem: d.diaDiem, trang_thai: d.giaiDoan }[c.khoa];
      o[c.khoa] =
        v && v.trim() !== ""
          ? oCoSo(v.trim(), anhXa, vetMain(`sổ dự án của Main · ${d.ma}`))
          : oThieu(anhXa, `Chưa khai ${c.nhan} cho dự án này — khai ở Cài đặt → Dự án.`);
    } else {
      o[c.khoa] = oThieu(anhXa, LY_DO_CHUA_HOI, c.donVi);
    }
  }
  return { khoa: d.ma, duAn: d.ma, o };
}

// ─────────────────────────────────────────────────────────────
// 7. Duyệt báo cáo
// ─────────────────────────────────────────────────────────────

/** 11 bảng theo đúng thứ tự số hiệu — bảng 1,2 đầu báo cáo rồi tới 6 mục */
export function moiBang(bc: BaoCaoThang): Bang[] {
  const ra: Bang[] = [...bc.dauBaoCao];
  for (const m of bc.muc) ra.push(...m.bang);
  return ra.sort((a, b) => a.soHieu - b.soHieu);
}

/** Mọi ô trong báo cáo kèm chỗ đứng — dùng cho kiểm tra và cho màn "xem nguồn" */
export function moiO(bc: BaoCaoThang): { bang: string; dong: string; cot: string; o: OSo }[] {
  const ra: { bang: string; dong: string; cot: string; o: OSo }[] = [];
  for (const b of moiBang(bc)) {
    for (const d of b.dong) {
      for (const [khoa, o] of Object.entries(d.o)) {
        ra.push({ bang: b.ma, dong: d.khoa, cot: khoa, o });
      }
    }
  }
  return ra;
}

/** Mọi lượt hỏi cần chạy, đã gộp trùng (hai bảng cùng hỏi một công cụ = một lượt) */
export function cacLuotHoiCanThiet(bc: BaoCaoThang): AnhXaNguon[] {
  const bang = new Map<string, AnhXaNguon>();
  for (const b of moiBang(bc)) {
    for (const l of b.luotHoi) {
      const k = khoaLuot(l);
      if (!bang.has(k)) bang.set(k, l);
    }
  }
  for (const m of bc.muc) {
    for (const kt of m.khoiThem ?? []) {
      const k = khoaLuot(kt.anhXa);
      if (!bang.has(k)) bang.set(k, kt.anhXa);
    }
  }
  return Array.from(bang.values());
}

/** Báo cáo có ô nào phạm luật "có số mà không nguồn" không, có đủ 6 mục 11 bảng không */
export function baoCaoHopLe(bc: BaoCaoThang): { ok: boolean; loi: string[] } {
  const loi: string[] = [];
  if (bc.muc.length !== SO_MUC) loi.push(`Phải đủ ${SO_MUC} mục, đang có ${bc.muc.length}.`);
  const b = moiBang(bc);
  if (b.length !== SO_BANG) loi.push(`Phải đủ ${SO_BANG} bảng, đang có ${b.length}.`);
  for (const x of moiO(bc)) {
    if (!oHopLe(x.o)) {
      loi.push(`${x.bang}/${x.dong}/${x.cot}: ô không hợp lệ (có số mà không dẫn được nguồn).`);
    }
  }
  return { ok: loi.length === 0, loi };
}

/** Đếm ô đã có số / còn thiếu — hiện đầu màn hình để biết báo cáo đầy tới đâu */
export function demO(bc: BaoCaoThang): { tong: number; coSo: number; thieu: number } {
  let tong = 0;
  let coSo = 0;
  for (const b of moiBang(bc)) {
    for (const d of b.dong) {
      for (const o of Object.values(d.o)) {
        // 13/10: hàng TỔNG của dự án và hàng ĐẾM chỉ mang vài ô có nghĩa — ô để trắng của chúng không phải "thiếu số liệu"
        if (d.loai && !o.coSo) continue;
        tong += 1;
        if (o.coSo) coSo += 1;
      }
    }
  }
  return { tong, coSo, thieu: tong - coSo };
}

// ─────────────────────────────────────────────────────────────
// 8. Điền báo cáo từ kết quả các lượt hỏi
// ─────────────────────────────────────────────────────────────

/** Kết quả một lượt hỏi, đã bóc khỏi `KhuonTra` (bóc ở `dung.ts` để model thuần) */
export interface KetQuaLuot {
  anhXa: AnhXaNguon;
  ok: boolean;
  /** Bản ghi agent trả về. Chỉ đọc khi `ok`. */
  banGhi?: Record<string, unknown>[];
  /** Chuỗi dẫn nguồn nối từ `KhuonTra.nguon`; RỖNG thì không ô nào được ghi số */
  moTaNguon?: string;
  thoiDiem?: string;
  /** Câu tiếng Việt vì sao không lấy được — hiện thẳng vào ô */
  lyDo?: string;
  /** Mã lỗi cổng trả (KHONG_CO_DU_LIEU…) — để phân biệt "dự án chưa có dữ liệu" với "agent hỏng" khi ẩn dự án (13/10) */
  maLoi?: string;
}

function laVatThe(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function docTruong(bg: Record<string, unknown>, ten: string[] | undefined): unknown {
  if (!ten) return undefined;
  for (const t of ten) {
    const v = bg[t];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

function chuanGiaTri(v: unknown): string | number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") return v.trim() === "" ? null : v.trim();
  if (typeof v === "boolean") return v ? "có" : "không";
  return null;
}

/**
 * Khoá dòng. Cột `du_an` LUÔN lấy theo tham số của lượt hỏi chứ không lấy theo
 * trường trong bản ghi: mọi lượt đều hỏi theo từng dự án, mà tên dự án agent
 * trả về có thể là mã ("HV") hoặc tên đầy đủ — lấy nhầm là đẻ ra hai dòng cho
 * cùng một dự án và bảng 9 hết ghép được hai agent vào một dòng.
 */
function khoaDongTu(bang: Bang, bg: Record<string, unknown>, thamSo: ThamSoHoi): string {
  // 18/10/2026: bản ghi tự nói khoá dòng (bảng 11: MÃ VIỆC) — hai công cụ trả cùng một việc thì gộp một dòng dù tên in khác
  if (typeof bg.__khoa_dong === "string" && bg.__khoa_dong.trim() !== "") {
    return `${String(thamSo.du_an ?? "")}::${bg.__khoa_dong.trim()}`;
  }
  const phan: string[] = [];
  for (const c of bang.cot) {
    if (!c.laKhoa) continue;
    const v =
      c.khoa === "du_an"
        ? (thamSo.du_an ?? docTruong(bg, c.truongNguon))
        : docTruong(bg, c.truongNguon);
    phan.push(String(v ?? ""));
  }
  if (phan.every((p) => p === "")) return JSON.stringify(bg).slice(0, 80);
  return phan.join("::");
}

function dongMoi(bang: Bang, khoa: string, thamSo: ThamSoHoi): DongBang {
  const duAn = typeof thamSo.du_an === "string" ? thamSo.du_an : undefined;
  const o: Record<string, OSo> = {};
  for (const c of bang.cot) {
    const anhXa: AnhXaNguon = { ...c.anhXa, thamSo: { ...c.anhXa.thamSo, ...thamSo } };
    if (c.khoa === "du_an" && duAn) {
      // Main biết chắc mình đang hỏi dự án nào — ô này có nguồn thật là core.du_an
      o[c.khoa] = oCoSo(duAn, anhXa, vetMain(`core.du_an · ${duAn}`));
    } else if (c.laLlm) {
      o[c.khoa] = oThieu(
        anhXa,
        "Phần 🤖 do LLM soạn — chưa chạy bước soạn nhận xét. Người ký duyệt mới chốt.",
        c.donVi,
      );
    } else {
      o[c.khoa] = oThieu(anhXa, LY_DO_CHUA_HOI, c.donVi);
    }
  }
  return { khoa, duAn, o };
}

/**
 * ĐIỀN BÁO CÁO.
 *
 * Cách làm: mỗi bảng duyệt qua các lượt hỏi CỦA CHÍNH NÓ; với mỗi bản ghi thì
 * tìm (hoặc mở) một dòng theo khoá, rồi CHỈ điền những cột có `congCu` trùng
 * lượt hỏi đang xét. Nhờ vậy bảng 9 gộp được cam kết (Agent Hợp đồng) và thực
 * tế (Agent tiến độ) vào cùng MỘT dòng mà không bên nào ghi đè bên kia — đúng
 * ca kiểm thử bắt buộc của cơ chế hỏi chéo (nghiệm thu bài 7).
 *
 * Hàm THUẦN: không đụng mạng, không đụng đĩa — test được mà không cần agent nào.
 */
/**
 * ⭐ 18/10/2026 (Mr. Đại gật câu 9) — Bảng 8 «% sản lượng» = sản lượng lũy kế (`tiendo.san_luong_hop_dong`) ÷ giá trị HĐ
 * (`hopdong.chi_phi_theo_hop_dong`), CODE tính trên từng dòng sau khi hai agent đã điền. Hàng tổng của dự án cũng tính từ TỔNG
 * hai vế của chính hàng đó (luật 34 — không cộng phần trăm). Thiếu một vế → ô trống kèm lý do của vế thiếu.
 * Ô mang `agentGoc: "hopdong"` — số suy từ giá trị hợp đồng nên bộ lọc agent mật ẩn nó với người ngoài dự án như ô Giá trị HĐ.
 */
function tinhPhanTramSanLuong(bang: Bang): void {
  const cot = bang.cot.find((c) => c.khoa === "phan_tram_san_luong");
  if (!cot) return;
  for (const d of bang.dong) {
    if (d.laDongGiuCho || d.loai === "dem") continue;
    const sl = d.o.san_luong_luy_ke;
    const gt = d.o.gia_tri_hd;
    const anhXa: AnhXaNguon = { ...cot.anhXa, thamSo: { ...cot.anhXa.thamSo, ...(d.duAn ? { du_an: d.duAn } : {}) } };
    const thieu: string[] = [];
    if (!gt || !gt.coSo || typeof gt.giaTri !== "number") thieu.push(`chưa có giá trị HĐ${gt && !gt.coSo ? ` (${gt.lyDo})` : ""}`);
    else if (gt.giaTri <= 0) thieu.push("giá trị HĐ bằng 0");
    if (!sl || !sl.coSo || typeof sl.giaTri !== "number") thieu.push(`chưa có sản lượng lũy kế${sl && !sl.coSo ? ` (${sl.lyDo})` : ""}`);
    if (thieu.length > 0 || !gt?.coSo || !sl?.coSo) {
      d.o[cot.khoa] = { ...oThieu(anhXa, `Chưa tính được «% sản lượng»: ${thieu.join("; ")}.`, cot.donVi), agentGoc: "hopdong" };
      continue;
    }
    const pt = Math.round(((sl.giaTri as number) / (gt.giaTri as number)) * 1000) / 10;
    const vet: VetNguon = {
      moTa: `Main tính = Sản lượng lũy kế (${sl.vet.moTa}) ÷ Giá trị HĐ (${gt.vet.moTa})`,
      thoiDiem: sl.vet.thoiDiem > gt.vet.thoiDiem ? sl.vet.thoiDiem : gt.vet.thoiDiem,
    };
    d.o[cot.khoa] = { ...oCoSo(pt, anhXa, vet, cot.donVi), agentGoc: "hopdong" };
  }
}

/** Công cụ khai `chuaCoThiBoQua` (18/10/2026) */
const CC_MOI_CHUA_CHAC = new Set(KHAI.flatMap((k) => k.congCu.filter((c) => c.chuaCoThiBoQua).map((c) => c.congCu)));

/** Lượt của công cụ mới mà agent chưa mở (trả KHONG_HIEU_YEU_CAU) — bỏ qua im lặng (điền bảng, đếm lượt hỏng, ẩn dự án) */
export function laLuotMoiChuaMo(luot: AnhXaNguon, kq: KetQuaLuot | undefined): boolean {
  return CC_MOI_CHUA_CHAC.has(luot.congCu) && !!kq && !kq.ok && kq.maLoi === "KHONG_HIEU_YEU_CAU";
}

export function dienBaoCao(khung: BaoCaoThang, ketQua: KetQuaLuot[]): BaoCaoThang {
  const tra = new Map<string, KetQuaLuot>();
  for (const k of ketQua) tra.set(khoaLuot(k.anhXa), k);

  const bc = JSON.parse(JSON.stringify(khung)) as BaoCaoThang;
  bc.thoiDiemDung = new Date().toISOString();

  for (const bang of moiBang(bc)) {
    const theoKhoa = new Map<string, DongBang>();
    for (const d of bang.dong) theoKhoa.set(d.khoa, d);
    const lyDoThieu: string[] = [];

    for (const luot of bang.luotHoi) {
      const kq = tra.get(khoaLuot(luot));
      const cotCuaLuot = bang.cot.filter(
        (c) => c.anhXa.congCu === luot.congCu || (c.congCuKhac ?? []).includes(luot.congCu),
      );
      if (cotCuaLuot.length === 0) continue;
      // 18/10/2026: công cụ mới agent chưa mở → bỏ qua im lặng, công cụ cũ cùng bảng lo phần của nó
      if (laLuotMoiChuaMo(luot, kq)) continue;

      if (!kq || !kq.ok) {
        const lyDo =
          kq?.lyDo ??
          `Chưa hỏi được ${luot.maAgent} · ${luot.congCu}${
            luot.thamSo.du_an ? ` (dự án ${String(luot.thamSo.du_an)})` : ""
          }.`;
        if (!lyDoThieu.includes(lyDo)) lyDoThieu.push(lyDo);
        // Ghi lý do vào các ô thuộc lượt này — CHỈ ở dòng của đúng dự án đó,
        // để một agent hỏng ở dự án HV không làm mờ luôn số của dự án TT.
        for (const d of Array.from(theoKhoa.values())) {
          if (luot.thamSo.du_an && d.duAn && d.duAn !== luot.thamSo.du_an) continue;
          for (const c of cotCuaLuot) {
            if (!d.o[c.khoa]?.coSo) {
              d.o[c.khoa] = oThieu(
                { ...c.anhXa, thamSo: { ...c.anhXa.thamSo, ...luot.thamSo } },
                lyDo,
                c.donVi,
              );
            }
          }
        }
        continue;
      }

      const vet: VetNguon = {
        moTa: (kq.moTaNguon ?? "").trim(),
        thoiDiem: kq.thoiDiem ?? new Date().toISOString(),
      };

      for (const bg of kq.banGhi ?? []) {
        const khoa = khoaDongTu(bang, bg, luot.thamSo);
        let dong = theoKhoa.get(khoa);
        if (!dong) {
          dong = dongMoi(bang, khoa, luot.thamSo);
          theoKhoa.set(khoa, dong);
        }
        if (bg.__tong === true) dong.loai = "tong";
        else if (bg.__dem === true) dong.loai = "dem";
        // 13/10: ô KHOÁ của dòng (tên nhà thầu, mã hợp đồng…) biết chắc từ chính bản ghi này — điền luôn dù cột khai
        // công cụ của agent khác. Trước đây bảng 9 có số thực tế của Tiến độ mà ô Nhà thầu vẫn "—".
        for (const ck of bang.cot) {
          if (!ck.laKhoa || ck.khoa === "du_an" || cotCuaLuot.includes(ck) || dong.o[ck.khoa]?.coSo) continue;
          const vk = chuanGiaTri(docTruong(bg, ck.truongNguon));
          if (vk !== null) {
            dong.o[ck.khoa] = oCoSo(vk, { maAgent: luot.maAgent, congCu: luot.congCu, thamSo: { ...luot.thamSo } }, vet, ck.donVi);
          }
        }
        for (const c of cotCuaLuot) {
          // Cột điền qua `congCuKhac` thì nguồn là lượt hỏi THẬT đang xét, không phải công cụ khai mặc định của cột
          const anhXa: AnhXaNguon =
            c.anhXa.congCu === luot.congCu
              ? { ...c.anhXa, thamSo: { ...c.anhXa.thamSo, ...luot.thamSo } }
              : { maAgent: luot.maAgent, congCu: luot.congCu, thamSo: { ...c.anhXa.thamSo, ...luot.thamSo } };

          // Cột trạng thái hồ sơ KHÔNG được gộp thành một chữ "thiếu" (PLAN 2.2)
          if (c.khoa === "trang_thai" && (bang.ma === "B6" || bang.ma === "B7")) {
            const tt = docTrangThaiHoSo(docTruong(bg, c.truongNguon));
            // 18/10/2026: có `theo_ket_qua` thì bản ghi mang trạng thái NỘP (khuon-agent.ts) → 🔴 / 🟡 / đã có / chưa rõ.
            // Pháp lý bản cũ chỉ trả trạng thái ĐO ("chưa thấy văn bản kết quả"…) → in đúng chữ agent nói, không ép 🔴/🟡.
            const chuDo = typeof bg.trang_thai_chu === "string" ? bg.trang_thai_chu.trim() : "";
            dong.o[c.khoa] = tt
              ? oCoSo(NHAN_TRANG_THAI_HO_SO[tt], anhXa, vet, c.donVi)
              : chuDo !== ""
                ? oCoSo(chuDo, anhXa, vet, c.donVi)
                : oThieu(
                  anhXa,
                  `${luot.maAgent} trả về trạng thái không đọc được thành 🔴 Chưa nộp được / 🟡 Đã nộp chờ kết quả — ` +
                    "không gộp bừa thành “thiếu” vì hai loại này đòi hai hành động khác hẳn nhau.",
                  c.donVi,
                );
            continue;
          }

          const v = chuanGiaTri(docTruong(bg, c.truongNguon));
          if (v === null) {
            if (!dong.o[c.khoa]?.coSo) {
              // Bản ghi có thể nói rõ vì sao ô này trống (`__ly_do.<khoa>`) — câu cho người đọc, không phải tên trường
              const lyDoRieng =
                laVatThe(bg.__ly_do) && typeof bg.__ly_do[c.khoa] === "string" ? (bg.__ly_do[c.khoa] as string) : "";
              dong.o[c.khoa] = oThieu(
                anhXa,
                c.laLlm
                  ? "Phần 🤖 do LLM soạn — chưa chạy bước soạn nhận xét."
                  : lyDoRieng !== ""
                    ? lyDoRieng
                    : `${luot.maAgent} có trả lời nhưng chưa có số «${c.nhan}».`,
                c.donVi,
              );
            }
          } else {
            const o = oCoSo(v, anhXa, vet, c.donVi);
            // Bản ghi issue mang agent chủ (dung.ts) — ghi lên ô để lọc agent mật theo người xem
            dong.o[c.khoa] = typeof bg.agent_chu === "string" && bg.agent_chu !== "" ? { ...o, agentGoc: bg.agent_chu } : o;
          }
        }
      }
    }

    // 13/10: dòng do lượt SAU mở ra thì ô của lượt TRƯỚC (đã hỏng hoặc không có dòng khớp) còn nguyên câu
    // "chưa chạy lượt hỏi" — sai sự thật. Xét lại một lượt cuối để ô nói đúng lý do.
    for (const d of Array.from(theoKhoa.values())) {
      if (!d.duAn || d.loai) continue;
      for (const c of bang.cot) {
        const o = d.o[c.khoa];
        if (!o || o.coSo || o.lyDo !== LY_DO_CHUA_HOI || c.tuSinh || c.laLlm) continue;
        const cacCongCu = [c.anhXa.congCu, ...(c.congCuKhac ?? [])];
        const kqs = bang.luotHoi
          .filter((l) => cacCongCu.includes(l.congCu) && l.thamSo.du_an === d.duAn && !laLuotMoiChuaMo(l, tra.get(khoaLuot(l))))
          .map((l) => tra.get(khoaLuot(l)));
        if (kqs.length === 0) continue;
        const hong = kqs.find((k) => k && !k.ok && k.lyDo);
        if (hong?.lyDo) d.o[c.khoa] = oThieu(o.anhXa, hong.lyDo, c.donVi);
        else if (kqs.some((k) => k?.ok)) {
          d.o[c.khoa] = oThieu(o.anhXa, `Agent có trả lời nhưng không có số «${c.nhan}» cho dòng này.`, c.donVi);
        }
      }
    }

    // 13/10: dòng xếp theo thứ tự DỰ ÁN của báo cáo (ổn định trong từng dự án) — không để lượt hỏi nào trả về trước
    // thì dự án đó lên đầu (bảng 11 từng in Nậm săm 3A trước Hướng Việt).
    const viTriDuAn = new Map(bc.duAn.map((d, i) => [d.ma, i]));
    bang.dong = Array.from(theoKhoa.values())
      .map((d, i) => ({ d, i }))
      .sort(
        (a, b) =>
          (viTriDuAn.get(a.d.duAn ?? "") ?? 1e9) - (viTriDuAn.get(b.d.duAn ?? "") ?? 1e9) || a.i - b.i,
      )
      .map((x) => x.d);
    if (bang.ma === "B8") tinhPhanTramSanLuong(bang);
    danhSoThuTu(bang);

    // A.4 điều 5: KHÔNG GIẤU BẢNG. Không có dòng nào thì vẫn dựng đủ cột, một
    // dòng giữ chỗ toàn "—", kèm câu nói rõ vì sao.
    if (bang.dong.length === 0) {
      bang.lyDoTrong =
        lyDoThieu.length > 0
          ? lyDoThieu.join(" · ")
          : `Không có dòng nào cho bảng “${bang.ten}” trong kỳ này.`;
      bang.dong = [dongGiuCho(bang, bang.lyDoTrong)];
    } else {
      bang.lyDoTrong = undefined;
    }
  }

  dienKhoiThem(bc, tra);
  return bc;
}

function dienKhoiThem(bc: BaoCaoThang, tra: Map<string, KetQuaLuot>): void {
  for (const m of bc.muc) {
    // 13/10: dự án chưa có tiến độ đã lưu thì chưa có lịch sử dự báo — gỡ khối, không in câu lỗi (có thì tự hiện)
    if (m.khoiThem) {
      m.khoiThem = m.khoiThem.filter((kt) => {
        const kq = tra.get(khoaLuot(kt.anhXa));
        return !(kq && !kq.ok && kq.maLoi === MA_KHONG_CO_DU_LIEU);
      });
    }
    for (const kt of m.khoiThem ?? []) {
      const kq = tra.get(khoaLuot(kt.anhXa));
      if (!kq || !kq.ok) {
        kt.diem = [];
        kt.lyDoTrong = kq?.lyDo ?? `Chưa hỏi được ${kt.anhXa.maAgent} · ${kt.anhXa.congCu}.`;
        continue;
      }
      const diem: { nhan: string; giaTri: number; chu?: string }[] = [];
      for (const bg of kq.banGhi ?? []) {
        const nhan = chuanGiaTri(docTruong(bg, ["ky", "thang", "nhan"]));
        const gt = docTruong(bg, ["so_ngay_tre", "gia_tri", "duong_gang"]);
        if (nhan !== null && typeof gt === "number" && Number.isFinite(gt)) {
          diem.push({ nhan: String(nhan), giaTri: gt, chu: typeof bg.chu === "string" ? bg.chu : undefined });
        }
      }
      kt.diem = diem.slice(-6);
      kt.lyDoTrong =
        diem.length === 0
          ? "Agent tiến độ có trả lời nhưng không có điểm lịch sử dự báo nào đọc được."
          : undefined;
    }
  }
}

function danhSoThuTu(bang: Bang): void {
  const cotTT = bang.cot.find((c) => c.tuSinh && c.khoa === "tt");
  if (!cotTT) return;
  bang.dong.forEach((d, i) => {
    d.o.tt = oCoSo(
      i + 1,
      d.o.tt?.anhXa ?? cotTT.anhXa,
      vetMain("Số thứ tự do Main đánh theo thứ tự dòng trong bảng này"),
    );
  });
}

function dongGiuCho(bang: Bang, lyDo: string): DongBang {
  const o: Record<string, OSo> = {};
  for (const c of bang.cot) o[c.khoa] = oThieu(c.anhXa, lyDo, c.donVi);
  return { khoa: "__giu_cho__", o, laDongGiuCho: true };
}

// ─────────────────────────────────────────────────────────────
// 9. Nội dung do LLM sinh — LUÔN có 🤖 đứng trước
// ─────────────────────────────────────────────────────────────

/**
 * Đóng dấu 🤖 vào chữ do LLM sinh (A.4 điều 2). Đóng ở ĐÚNG MỘT CHỖ này để
 * không có đường nào ghi được nhận xét mà quên dấu.
 */
export function dongDauLlm(chu: string): string {
  const s = chu.trim();
  if (s === "") return "";
  return s.startsWith(TIEN_TO_LLM.trim()) ? s : TIEN_TO_LLM + s;
}

/** Ghi nhận xét LLM cho một mục */
export function ghiNhanXetLlm(bc: BaoCaoThang, ma: MaMuc, chu: string): BaoCaoThang {
  const m = bc.muc.find((x) => x.ma === ma);
  if (m) m.nhanXet = dongDauLlm(chu);
  return bc;
}

/**
 * Ghi một ô do LLM soạn (Kiến nghị · Đánh giá · Kết quả cần có).
 * Nguồn của ô là chính lượt gọi LLM — vẫn phải dẫn được, không miễn trừ.
 */
export function ghiOLlm(
  bc: BaoCaoThang,
  maBang: string,
  khoaDong: string,
  khoaCot: string,
  chu: string,
  moTaNguon: string,
): BaoCaoThang {
  const bang = moiBang(bc).find((b) => b.ma === maBang);
  const dong = bang?.dong.find((d) => d.khoa === khoaDong);
  const cot = bang?.cot.find((c) => c.khoa === khoaCot);
  if (!bang || !dong || !cot) return bc;
  dong.o[khoaCot] = oCoSo(dongDauLlm(chu), cot.anhXa, {
    moTa: moTaNguon,
    thoiDiem: new Date().toISOString(),
  });
  return bc;
}

// ─────────────────────────────────────────────────────────────
// 10. Ẩn dự án CHƯA CÓ DỮ LIỆU  (Mr. Đại chốt 13/10/2026 — "Dự án chưa có dữ liệu: ẩn")
// ─────────────────────────────────────────────────────────────

/** Mã lỗi "không có dữ liệu" của HOP-DONG-KET-NOI 3.2 — agent CÓ thưa, chỉ là dự án chưa có gì để trả */
const MA_KHONG_CO_DU_LIEU = "KHONG_CO_DU_LIEU";

/**
 * Dự án IM LẶNG: MỌI lượt hỏi theo dự án đó đều "không có dữ liệu" (hoặc trả lời mà không có dòng nào).
 * Chỉ cần MỘT lượt hỏng vì lý do khác (agent tắt, hết giờ, lỗi) là KHÔNG coi là im lặng — đó là sự cố phải
 * hiện ra, không phải "chưa có". Cùng tinh thần `maDuAnImLang` của báo cáo sáng.
 */
export function duAnImLang(duAn: readonly DuAnTrongBaoCao[], ketQua: readonly KetQuaLuot[]): Set<string> {
  const ra = new Set<string>();
  for (const d of duAn) {
    const cua = ketQua.filter((k) => k.anhXa.thamSo.du_an === d.ma && !laLuotMoiChuaMo(k.anhXa, k));
    if (cua.length === 0) continue;
    if (cua.every((k) => (k.ok ? (k.banGhi ?? []).length === 0 : k.maLoi === MA_KHONG_CO_DU_LIEU))) ra.add(d.ma);
  }
  return ra;
}

/**
 * Gỡ các dự án im lặng khỏi MỌI bảng và khối ◆; ghi lại ở `duAnAn` để màn hình nói rõ đã ẩn dự án nào.
 * Bảng hết dòng sau khi gỡ thì trả về một dòng giữ chỗ kèm lý do (không để bảng rỗng không lời giải thích).
 */
export function anDuAnImLang(bc: BaoCaoThang, ketQua: readonly KetQuaLuot[]): BaoCaoThang {
  const an = duAnImLang(bc.duAn, ketQua);
  if (an.size === 0) return bc;
  bc.duAnAn = bc.duAn.filter((d) => an.has(d.ma));
  bc.duAn = bc.duAn.filter((d) => !an.has(d.ma));
  for (const bang of moiBang(bc)) {
    const truoc = bang.dong.length;
    bang.dong = bang.dong.filter((d) => !d.duAn || !an.has(d.duAn));
    bang.luotHoi = bang.luotHoi.filter((l) => typeof l.thamSo.du_an !== "string" || !an.has(l.thamSo.du_an));
    if (bang.dong.length === truoc) continue;
    if (bang.dong.length === 0) {
      bang.lyDoTrong = `Không dự án nào có số liệu cho bảng “${bang.ten}” trong kỳ này.`;
      bang.dong = [dongGiuCho(bang, bang.lyDoTrong)];
    } else {
      danhSoThuTu(bang);
    }
  }
  for (const m of bc.muc) {
    if (m.khoiThem) m.khoiThem = m.khoiThem.filter((k) => !k.duAn || !an.has(k.duAn));
  }
  // Ô Phạm vi của bảng 1 đi theo danh sách dự án CÒN LẠI
  const b1 = bc.dauBaoCao.find((b) => b.ma === "B1");
  const oPhamVi = b1?.dong[0]?.o.pham_vi;
  if (b1 && oPhamVi) {
    b1.dong[0].o.pham_vi =
      bc.duAn.length > 0
        ? oCoSo(`${bc.duAn.length} dự án: ${bc.duAn.map((d) => d.ten).join(", ")}`, oPhamVi.anhXa, vetMain(`core.du_an · ${bc.duAn.map((d) => d.ma).join(", ")}`))
        : oThieu(oPhamVi.anhXa, "Chưa dự án nào có dữ liệu trong kỳ này.");
  }
  return bc;
}

// ─────────────────────────────────────────────────────────────
// 11. TRÌNH BÀY MỘT BẢNG — dùng chung cho bản Word và màn hình  (Mr. Đại chốt 13/10/2026)
//
//   · Bảng nhiều dự án: bỏ CỘT dự án, thay bằng HÀNG tên dự án, dự án nọ nối dự án kia.
//   · Số cộng của dự án nằm ngay ở HÀNG TÊN DỰ ÁN; có cột cộng được thì thêm hàng TỔNG CỘNG trên cùng (luật 34).
//   · Cột không có ô nào có số thì KHÔNG in — gom tên các cột đó về `cotAn` để ghi một dòng dưới bảng (luật 22).
// ─────────────────────────────────────────────────────────────

export interface HangIn {
  kieu: "tong-cong" | "du-an" | "thuong" | "dem";
  /** Chữ của hàng: tên dự án · "TỔNG CỘNG · n dự án" · câu đếm */
  nhan?: string;
  /** Số thứ tự trong dự án (hàng "thuong") */
  stt?: number;
  /** Ô theo khoá cột; không có = ô để trắng */
  o: Record<string, OSo | undefined>;
  /** Dòng dữ liệu gốc (hàng "thuong" / "dem") — màn hình cần để mở nguồn từng ô */
  dong?: DongBang;
}

export interface BangIn {
  /** Các cột ĐƯỢC IN, đúng thứ tự */
  cot: CotBang[];
  /** Nhãn các cột bị ẩn vì chưa có số nào */
  cotAn: string[];
  hang: HangIn[];
  /** true = bảng in thành nhóm theo dự án (không còn cột Dự án) */
  nhom: boolean;
}

function coGiaTri(o: OSo | undefined): boolean {
  return !!o && o.coSo;
}

export function trinhBayBang(bang: Bang, tenDuAn: (ma: string) => string): BangIn {
  const that = bang.dong.filter((d) => !d.laDongGiuCho);

  // Bảng phẳng (1 · 2 · 3): in nguyên, không ẩn cột — mỗi ô "—" ở đây là một lời nhắc đi khai
  if (!bang.nhomTheoDuAn) {
    return { cot: bang.cot, cotAn: [], nhom: false, hang: that.map((d) => ({ kieu: "thuong" as const, o: d.o, dong: d })) };
  }

  const cotDuLieu = bang.cot.filter((c) => c.khoa !== "du_an");
  const cot = cotDuLieu.filter((c) => c.laKhoa || c.tuSinh || that.some((d) => coGiaTri(d.o[c.khoa])));
  const cotAn = cotDuLieu.filter((c) => !cot.includes(c)).map((c) => c.nhan);

  const thuTu: string[] = [];
  for (const d of that) {
    const ma = d.duAn ?? "";
    if (!thuTu.includes(ma)) thuTu.push(ma);
  }

  const hang: HangIn[] = [];
  const cong = new Map<string, { tong: number; vet: OSo }>();
  for (const ma of thuTu) {
    const cua = that.filter((d) => (d.duAn ?? "") === ma);
    const tong = cua.find((d) => d.loai === "tong");
    hang.push({ kieu: "du-an", nhan: ma === "" ? "(chưa rõ dự án)" : tenDuAn(ma), o: tong ? tong.o : {}, dong: tong });
    for (const c of cot) {
      if (!c.congDuoc || !tong) continue;
      const o = tong.o[c.khoa];
      if (!o || !o.coSo || typeof o.giaTri !== "number") continue;
      const cu = cong.get(c.khoa);
      cong.set(c.khoa, { tong: (cu?.tong ?? 0) + o.giaTri, vet: cu?.vet ?? o });
    }
    let stt = 0;
    for (const d of cua) {
      if (d.loai === "tong") continue;
      if (d.loai === "dem") {
        // Câu đếm nằm ở cột KHOÁ của dòng (cột "Vấn đề"…) — không lấy ô số thứ tự
        const cKhoa = cot.find((c) => c.laKhoa);
        const oDem = cKhoa ? d.o[cKhoa.khoa] : undefined;
        hang.push({ kieu: "dem", nhan: oDem && oDem.coSo ? hienO(oDem) : "", o: d.o, dong: d });
        continue;
      }
      stt += 1;
      hang.push({ kieu: "thuong", stt, o: d.o, dong: d });
    }
  }

  // Luật 34: có cột cộng được và từ hai dự án trở lên → hàng TỔNG CỘNG là hàng ĐẦU TIÊN
  if (thuTu.length >= 2 && cong.size > 0) {
    const o: Record<string, OSo | undefined> = {};
    for (const c of cot) {
      const x = cong.get(c.khoa);
      if (!x) continue;
      o[c.khoa] = oCoSo(
        Math.round(x.tong * 1000) / 1000,
        { maAgent: MA_AGENT.main, congCu: "main.tong_cong", thamSo: {} },
        vetMain(`Main cộng ô «${c.nhan}» ở hàng tên dự án của ${thuTu.length} dự án`),
        c.donVi,
      );
    }
    hang.unshift({ kieu: "tong-cong", nhan: `TỔNG CỘNG · ${thuTu.length} dự án`, o });
  }
  return { cot, cotAn, hang, nhom: true };
}

// ─────────────────────────────────────────────────────────────
// 12. SO HAI BẢN — "làm lại báo cáo thì nó đổi ra sao"  (Mr. Đại 13/10/2026)
// ─────────────────────────────────────────────────────────────

export interface SoHaiBan {
  /** Lúc dựng của bản TRƯỚC (ISO) */
  dungLucTruoc: string;
  soDuAn: { truoc: number; nay: number };
  coSo: { truoc: number; nay: number };
  thieu: { truoc: number; nay: number };
  /** Chỉ những bảng có số ô-có-số hoặc số dòng ĐỔI */
  bang: { soHieu: number; ten: string; coSoTruoc: number; coSoNay: number; dongTruoc: number; dongNay: number }[];
}

function demBang(b: Bang): { coSo: number; dong: number } {
  let coSo = 0;
  const that = b.dong.filter((d) => !d.laDongGiuCho);
  for (const d of that) for (const o of Object.values(d.o)) if (o && o.coSo) coSo += 1;
  return { coSo, dong: that.length };
}

/** So bản vừa làm lại với bản trước đó của cùng kỳ. Hàm THUẦN — chỉ đếm, không diễn giải. */
export function soHaiBan(truoc: BaoCaoThang, nay: BaoCaoThang): SoHaiBan {
  const dT = demO(truoc);
  const dN = demO(nay);
  const bangT = new Map(moiBang(truoc).map((b) => [b.soHieu, demBang(b)]));
  const bang: SoHaiBan["bang"] = [];
  for (const b of moiBang(nay)) {
    const n = demBang(b);
    const t = bangT.get(b.soHieu) ?? { coSo: 0, dong: 0 };
    if (n.coSo !== t.coSo || n.dong !== t.dong) {
      bang.push({ soHieu: b.soHieu, ten: b.ten, coSoTruoc: t.coSo, coSoNay: n.coSo, dongTruoc: t.dong, dongNay: n.dong });
    }
  }
  return {
    dungLucTruoc: truoc.thoiDiemDung,
    soDuAn: { truoc: truoc.duAn.length, nay: nay.duAn.length },
    coSo: { truoc: dT.coSo, nay: dN.coSo },
    thieu: { truoc: dT.thieu, nay: dN.thieu },
    bang,
  };
}
