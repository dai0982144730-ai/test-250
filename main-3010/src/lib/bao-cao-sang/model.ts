// ============================================================
// BÁO CÁO SÁNG — MÔ HÌNH + KẾT XUẤT CHỮ GỬI TELEGRAM
// MD: PLAN-MAIN-AGENT mục 6.3 (khung cố định) · KE-HOACH/05 mục A.4 (luật cứng)
//
// Khung CỐ ĐỊNH ba phần, không đổi thứ tự, không thêm bớt phần:
//     🔴 Cần anh quyết · 🟡 Đáng chú ý · ✅ Đêm qua hệ thống đã làm
//
// ⭐ "Không có gì bất thường thì VẪN GỬI, chỉ ngắn hơn. Im lặng dễ nhầm với
//    hỏng." — vì vậy `dungKhung()` luôn trả về báo cáo có đủ ba đầu mục, và
//    `ketXuatTelegram()` luôn in ra chữ, không bao giờ trả chuỗi rỗng.
//
// Bốn luật cứng được ÉP Ở ĐÂY chứ không nhắc suông:
//  1. Không dẫn được nguồn thì KHÔNG vào báo cáo → `nguon` là kiểu có nhãn,
//     đường duy nhất tạo ra nó là `taoDong()`, và nó trả `null` khi nguồn rỗng.
//  2. 🤖 đứng trước mọi nội dung do LLM sinh → cờ `doLlmSinh` in tiền tố.
//  3. Không ước số → `soNgayAnhHuong: number | null`, null in ra "—" chứ
//     KHÔNG in "0" (0 ngày và "chưa biết mấy ngày" là hai chuyện khác nhau).
//  4. Số ngày ảnh hưởng KHÔNG cộng dồn → `soNgayNangNhat()` lấy max, kèm
//     `cauGiaiThichSoNgay()` in ngay dưới.
//
// File THUẦN — không đụng node:fs, màn hình client import được (luật 10).
//
// ⭐ 25/09 — LUẬT BÁO CÁO SÁNG MỚI (Mr. Đại chốt): bản dựng từ 25/09 mang thêm
//    `duAn` + `vanDe` và kết xuất theo `luat-cod.ts` (chỉ việc làm chậm COD, một
//    màn điện thoại). Khung ba phần bên dưới CHỈ còn để đọc lại bản cũ trong sổ.
// ============================================================

import { ketXuatTinNhan, type DauDuAn, type VanDeSang, type ViecKhac } from "./luat-cod";
import { fmtSo } from "@/lib/format";

// ─────────────────────────────────────────────────────────────
// 1. Nguồn — kiểu có nhãn, không tự tay dựng được
// ─────────────────────────────────────────────────────────────

declare const NHAN_NGUON: unique symbol;

/**
 * Chuỗi nguồn ĐÃ ĐƯỢC KIỂM là không rỗng.
 * Nhãn `unique symbol` làm cho `const n: NguonDan = "abc"` KHÔNG biên dịch
 * được — muốn có một `NguonDan` thì bắt buộc đi qua `taoDong()`. Đây là cách
 * ép luật cứng số 1 bằng KIỂU DỮ LIỆU thay vì bằng lời dặn.
 */
export type NguonDan = string & { readonly [NHAN_NGUON]: true };

/** Ba phần cố định của khung báo cáo sáng (mục 6.3) */
export type MucBaoCao = "can-quyet" | "dang-chu-y" | "da-lam";

/** Thứ tự in ra — cố định, không sắp lại theo số lượng dòng */
export const THU_TU_MUC: readonly MucBaoCao[] = ["can-quyet", "dang-chu-y", "da-lam"];

export const NHAN_MUC: Record<MucBaoCao, string> = {
  "can-quyet": "🔴 Cần anh quyết",
  "dang-chu-y": "🟡 Đáng chú ý",
  "da-lam": "✅ Đêm qua hệ thống đã làm",
};

/** Câu in khi một mục không có dòng nào — im lặng dễ nhầm với hỏng (6.3) */
export const CAU_MUC_RONG: Record<MucBaoCao, string> = {
  "can-quyet": "Không có việc nào cần anh quyết sáng nay.",
  "dang-chu-y": "Không có gì bất thường đáng chú ý.",
  "da-lam": "Đêm qua không có kịch bản nào chạy.",
};

// ─────────────────────────────────────────────────────────────
// 2. Một dòng báo cáo
// ─────────────────────────────────────────────────────────────

export interface DongBaoCao {
  muc: MucBaoCao;
  /** Mã dự án; null = dòng của cả hệ, không gắn dự án nào */
  duAn: string | null;
  noiDung: string;
  /** ⛔ BẮT BUỘC không rỗng — luật cứng 1, ép bằng kiểu `NguonDan` */
  nguon: NguonDan;
  /**
   * Số ngày ảnh hưởng. null = CHƯA CÓ SỐ, in ra "—".
   * ⛔ Tuyệt đối không điền 0 cho đẹp bảng: 0 nghĩa là "đo được và bằng 0".
   */
  soNgayAnhHuong: number | null;
  /** true → in 🤖 trước nội dung (luật cứng 2) */
  doLlmSinh: boolean;
}

/** Tham số dựng một dòng — `nguon` ở đây còn là string thường, chưa được nhãn */
export interface ThamSoDong {
  muc: MucBaoCao;
  duAn?: string | null;
  noiDung: string;
  nguon: string;
  soNgayAnhHuong?: number | null;
  doLlmSinh?: boolean;
}

/**
 * CỬA DUY NHẤT dựng một dòng báo cáo.
 * Trả `null` khi thiếu nguồn hoặc thiếu nội dung — bên gọi PHẢI xử lý cái null
 * đó (thường là đẩy sang `thieuSot` với câu "chưa có số liệu vì …"), chứ không
 * được lẳng lặng đưa dòng không nguồn vào báo cáo.
 */
export function taoDong(t: ThamSoDong): DongBaoCao | null {
  const noiDung = t.noiDung.trim();
  const nguon = t.nguon.trim();
  if (noiDung === "" || nguon === "") return null;
  const soNgay =
    typeof t.soNgayAnhHuong === "number" && Number.isFinite(t.soNgayAnhHuong)
      ? t.soNgayAnhHuong
      : null;
  return {
    muc: t.muc,
    duAn: t.duAn ?? null,
    noiDung,
    nguon: nguon as NguonDan,
    soNgayAnhHuong: soNgay,
    doLlmSinh: t.doLlmSinh === true,
  };
}

/**
 * Dựng nhiều dòng, LOẠI THẲNG dòng nào không dẫn được nguồn.
 * Trả kèm số dòng bị loại để báo cáo nói rõ "đã bỏ N dòng vì thiếu nguồn" —
 * bỏ im lặng thì lần sau không ai biết mà sửa nguồn.
 */
export function locDongCoNguon(ds: readonly ThamSoDong[]): {
  dong: DongBaoCao[];
  soBiLoai: number;
} {
  const dong: DongBaoCao[] = [];
  let soBiLoai = 0;
  for (const t of ds) {
    const d = taoDong(t);
    if (d) dong.push(d);
    else soBiLoai += 1;
  }
  return { dong, soBiLoai };
}

// ─────────────────────────────────────────────────────────────
// 3. Chỗ chưa hỏi được — luật cứng 5
// ─────────────────────────────────────────────────────────────

/**
 * Một mục KHÔNG lấy được số. Agent tắt/chết thì ghi rõ "chưa hỏi được vì …"
 * và BÁO CÁO VẪN GỬI — không được im, cũng không được bịa thay.
 */
export interface DongThieu {
  /** Tên agent hoặc tên nguồn không hỏi được */
  ten: string;
  /** Câu tiếng Việt: vì sao chưa hỏi được */
  lyDo: string;
  /**
   * ⭐ 04/10 — dự án bị thiếu (slug). Không có = thiếu ở MỌI dự án (agent tắt / không mở
   * công cụ). Trước 04/10 lỗi của MỘT dự án bị ghi như cả agent hỏng ("Agent Công việc
   * chưa hỏi được vì Tân Thành chưa có cây WBS").
   */
  maDuAn?: string;
  tenDuAn?: string;
}

export function cauChuaCoSoLieu(t: DongThieu): string {
  return `${t.ten} — chưa có số liệu: ${t.lyDo}`;
}

// ─────────────────────────────────────────────────────────────
// 4. Cả bản báo cáo
// ─────────────────────────────────────────────────────────────

export interface LuatDaApDung {
  ma: string;
  noiDung: string;
  moTaHieuLuc: string;
}

export interface BaoCaoSang {
  /** Ngày ISO (giờ VN) của bản báo cáo */
  ngay: string;
  /** Số dự án gộp trong báo cáo; null = chưa đếm được, in "—" */
  soDuAn: number | null;
  dong: DongBaoCao[];
  thieuSot: DongThieu[];
  /** Luật động đang áp cho bản này — hiện thẳng lên màn, không có luật ẩn */
  luatApDung: LuatDaApDung[];
  /** Số dòng bị loại vì không dẫn được nguồn (luật cứng 1) */
  soDongBiLoaiVaThieuNguon: number;
  /** ISO lúc dựng */
  dungLuc: string;
  /** Đã gửi Telegram lúc nào; null = chưa gửi */
  daGuiLuc: string | null;
  /** ⭐ 25/09 — dòng đầu từng dự án (COD dự báo · mục tiêu · chậm · so hôm qua). Có = bản theo luật mới */
  duAn?: DauDuAn[];
  /** ⭐ 25/09 — vấn đề đạt luật COD, đã gộp trùng + xếp */
  vanDe?: VanDeSang[];
  /** ⭐ 25/09 — đếm để soát: bao nhiêu thẻ xét, bao nhiêu vào, bao nhiêu gộp trùng */
  thongKe?: { soTheXet: number; soVao: number; soGop: number; soLuatBo: number; cauHoiAi: string };
  /** ⭐ 25/09 — link màn Cảnh báo của Main (DIA_CHI_MAIN) */
  lienKetIssue?: string;
  /** ⭐ 04/10 — việc ĐỎ ngoài luật COD, cho bản "Dự án" của PM (kich-ban.ts) */
  viecDoKhac?: ViecKhac[];
  /** ⭐ 04/10 — địa chỉ Main lúc dựng (link "xem chi tiết" của bản Tổng quát) */
  diaChiMain?: string;
}

export interface ThamSoKhung {
  ngay: string;
  soDuAn?: number | null;
  dungLuc?: string;
}

/**
 * Dựng KHUNG báo cáo — luôn có đủ ba phần dù chưa có dòng nào.
 * Đây là chỗ hiện thực câu "không có gì bất thường thì vẫn gửi, chỉ ngắn hơn".
 */
export function dungKhung(t: ThamSoKhung): BaoCaoSang {
  return {
    ngay: t.ngay,
    soDuAn: typeof t.soDuAn === "number" ? t.soDuAn : null,
    dong: [],
    thieuSot: [],
    luatApDung: [],
    soDongBiLoaiVaThieuNguon: 0,
    dungLuc: t.dungLuc ?? new Date().toISOString(),
    daGuiLuc: null,
  };
}

export function dongTheoMuc(bc: BaoCaoSang, muc: MucBaoCao): DongBaoCao[] {
  return bc.dong.filter((d) => d.muc === muc);
}

/** Báo cáo có gì bất thường không — quyết định bản dài hay bản ngắn */
export function coBatThuong(bc: BaoCaoSang): boolean {
  return bc.dong.some((d) => d.muc === "can-quyet" || d.muc === "dang-chu-y");
}

// ─────────────────────────────────────────────────────────────
// 5. Số ngày ảnh hưởng — LẤY NẶNG NHẤT, KHÔNG CỘNG DỒN (luật cứng 4)
// ─────────────────────────────────────────────────────────────

/**
 * Số ngày ảnh hưởng của một nhóm dòng = cái NẶNG NHẤT, không phải tổng.
 * Vì sao: hai việc cùng chậm 4 ngày và 6 ngày mà chạy song song thì dự án
 * chậm 6 ngày, không phải 10. Cộng dồn là cách nhanh nhất để thổi phồng con
 * số rồi mất tin cậy cả bản báo cáo.
 * Không dòng nào có số → `null` (in "—"), KHÔNG trả 0.
 */
export function soNgayNangNhat(ds: readonly DongBaoCao[]): number | null {
  let max: number | null = null;
  for (const d of ds) {
    if (d.soNgayAnhHuong === null) continue;
    if (max === null || d.soNgayAnhHuong > max) max = d.soNgayAnhHuong;
  }
  return max;
}

/** Câu giải thích in NGAY DƯỚI con số — luật cứng 4 bắt buộc có câu này */
export function cauGiaiThichSoNgay(ds: readonly DongBaoCao[]): string {
  const max = soNgayNangNhat(ds);
  const soDongCoSo = ds.filter((d) => d.soNgayAnhHuong !== null).length;
  if (max === null) {
    return "Số ngày ảnh hưởng: — (chưa dòng nào đo được số ngày; không ước).";
  }
  if (soDongCoSo <= 1) {
    return `Số ngày ảnh hưởng: ${fmtSo(max)} ngày (lấy từ dòng nặng nhất).`;
  }
  return (
    `Số ngày ảnh hưởng: ${fmtSo(max)} ngày — lấy dòng NẶNG NHẤT trong ${soDongCoSo} dòng, ` +
    `KHÔNG cộng dồn, vì các việc chậm chạy song song chứ không nối đuôi nhau.`
  );
}

/** In một số có thể chưa có: null → "—" (luật cứng 3, không bao giờ in 0 thay). Số theo chuẩn Việt Nam (chốt 130): «1.200» · «1,5» */
export function hienSo(n: number | null): string {
  return n === null ? "—" : fmtSo(n);
}

// ─────────────────────────────────────────────────────────────
// 6. Kết xuất chữ gửi Telegram
// ─────────────────────────────────────────────────────────────

/** Trần một tin nhắn Telegram; dài hơn thì cắt và mời mở trên web */
export const TRAN_KY_TU_TELEGRAM = 4000;

function ngayGonVn(ngay: string): string {
  return `${ngay.slice(8, 10)}/${ngay.slice(5, 7)}`;
}

function inMotDong(d: DongBaoCao): string {
  const bot = d.doLlmSinh ? "🤖 " : "";
  const duAn = d.duAn ? `${d.duAn} — ` : "";
  const ngay =
    d.soNgayAnhHuong === null ? "" : ` (ảnh hưởng ${fmtSo(d.soNgayAnhHuong)} ngày)`;
  return `   • ${bot}${duAn}${d.noiDung}${ngay}\n     ↳ nguồn: ${d.nguon}`;
}

/**
 * Kết xuất chữ THUẦN (không HTML, không Markdown) để gửi Telegram.
 * Cố ý không dùng parse_mode: tên nhà thầu hay mã hồ sơ có dấu `_` `*` `[`
 * sẽ làm Telegram từ chối cả tin nhắn — mất báo cáo vì một dấu gạch dưới là
 * cái giá quá đắt cho chữ in đậm.
 *
 * LUÔN trả về chữ, kể cả khi không có dòng nào (6.3).
 */
export function ketXuatTelegram(bc: BaoCaoSang): string {
  // ⭐ Bản dựng theo luật 25/09 → một màn điện thoại, chỉ việc làm chậm COD
  if (bc.duAn && bc.vanDe) {
    return ketXuatTinNhan({
      ngay: bc.ngay,
      duAn: bc.duAn,
      vanDe: bc.vanDe,
      chuaHoiDuoc: bc.thieuSot,
      luat: bc.luatApDung,
      lienKetIssue: bc.lienKetIssue ?? "/alerts",
    });
  }
  const p: string[] = [];
  const soDA = bc.soDuAn === null ? "—" : `${bc.soDuAn}`;
  p.push(`📋 Báo cáo sáng ${ngayGonVn(bc.ngay)} · ${soDA} dự án`);

  for (const muc of THU_TU_MUC) {
    const ds = dongTheoMuc(bc, muc);
    p.push("");
    p.push(ds.length > 0 ? `${NHAN_MUC[muc]} (${ds.length})` : NHAN_MUC[muc]);
    if (ds.length === 0) {
      p.push(`   ${CAU_MUC_RONG[muc]}`);
      continue;
    }
    for (const d of ds) p.push(inMotDong(d));
    // Luật cứng 4: con số nặng nhất + câu giải thích, chỉ ở hai mục có số ngày
    if (muc !== "da-lam" && ds.some((d) => d.soNgayAnhHuong !== null)) {
      p.push(`   ${cauGiaiThichSoNgay(ds)}`);
    }
  }

  if (bc.thieuSot.length > 0) {
    p.push("");
    p.push("⚠️ Chưa hỏi được");
    for (const t of bc.thieuSot) p.push(`   • ${cauChuaCoSoLieu(t)}`);
  }

  if (bc.soDongBiLoaiVaThieuNguon > 0) {
    p.push("");
    p.push(
      `ℹ️ Đã bỏ ${bc.soDongBiLoaiVaThieuNguon} dòng vì không dẫn được nguồn — ` +
        "không nguồn thì không đưa vào báo cáo.",
    );
  }

  if (bc.luatApDung.length > 0) {
    p.push("");
    p.push(`📌 Luật đang áp (${bc.luatApDung.length})`);
    for (const l of bc.luatApDung) p.push(`   • ${l.noiDung} — ${l.moTaHieuLuc}`);
  } else {
    p.push("");
    p.push("📌 Không có luật động nào đang áp — báo cáo theo khung mặc định.");
  }

  p.push("");
  p.push("Mở đầy đủ trên web: /bao-cao?tab=sang");

  const chu = p.join("\n");
  if (chu.length <= TRAN_KY_TU_TELEGRAM) return chu;
  // Bỏ NGUYÊN DÒNG từ cuối lên — không cắt giữa câu (25/09)
  const dong = chu.split("\n");
  while (dong.join("\n").length > TRAN_KY_TU_TELEGRAM - 60 && dong.length > 1) dong.pop();
  return `${dong.join("\n")}\n…\n(Bản đầy đủ trên web: /bao-cao?tab=sang)`;
}

/** Dòng tóm tắt một câu — dùng cho danh sách lịch sử trên màn hình */
export function tomTatMotCau(bc: BaoCaoSang): string {
  const do1 = dongTheoMuc(bc, "can-quyet").length;
  const vang = dongTheoMuc(bc, "dang-chu-y").length;
  const lam = dongTheoMuc(bc, "da-lam").length;
  return `${do1} cần quyết · ${vang} đáng chú ý · ${lam} việc hệ thống đã làm`;
}

// ─────────────────────────────────────────────────────────────
// 7. KỊCH BẢN ĐỊNH KỲ — PLAN-MAIN-AGENT mục 7 (bảng nhịp)
//
// Để ở file THUẦN này để màn hình liệt kê được nhịp mà không phải kéo theo
// node:fs. Phần CHẠY nằm ở `dung.ts`.
//
// ⛔ (24/09: bộ hẹn giờ lõi `lib/hen-gio` đã gỡ khỏi Main — xem lib/gio-vn.ts) Trước đó: KHÔNG gộp vào hen-gio: bộ hẹn giờ ở đó là của lõi
//    dùng chung, sửa nó là đụng vào phần agent khác đang viết song song.
// ─────────────────────────────────────────────────────────────

export type MaNhip = "dung-bao-cao-dem" | "gui-bao-cao-sang" | "nhac-bc-tuan" | "nhap-bc-thang";

export interface NhipDinhKy {
  ma: MaNhip;
  ten: string;
  /** Giờ VN "HH:MM" */
  gio: string;
  /** null = hằng ngày; 0–6 theo giờ VN (0 = Chủ nhật) */
  thu: number | null;
  /** null = mọi ngày trong tháng; 1 = ngày mùng 1 */
  ngayTrongThang: number | null;
  moTa: string;
  nguonMd: string;
}

/** Bốn nhịp cố định của mục 7. Nhịp thứ năm ("issue đỏ → nhắn ngay") không
 *  theo giờ nên không nằm trong bảng này — nó do bên sinh issue gọi thẳng. */
export const NHIP_DINH_KY: readonly NhipDinhKy[] = [
  {
    // ⭐ 04/10: dời 21:00 → 06:30. Đo 03–04/10: bản 21:00 mang ngày HÔM ĐÓ nên 07:00 sáng
    // sau không thấy bản nào, phải dựng lại từ đầu (lượt AI chờ tới 120 giây) — và số
    // liệu 21:00 đã cũ 10 giờ, bỏ lỡ các việc đêm 01:50/02:00. Mã nhịp giữ nguyên để
    // không mất trạng thái "đã chạy" trong sổ.
    ma: "dung-bao-cao-dem",
    ten: "06:30 — dựng báo cáo sáng",
    gio: "06:30",
    thu: null,
    ngayTrongThang: null,
    moTa: "Hỏi các agent đang bật, dựng và LƯU bản báo cáo của hôm nay — 07:00 gửi bản này",
    nguonMd: "PLAN-MAIN-AGENT mục 7 · 6.1",
  },
  {
    ma: "gui-bao-cao-sang",
    ten: "07:00 — gửi báo cáo sáng qua Telegram",
    gio: "07:00",
    thu: null,
    ngayTrongThang: null,
    moTa: "Gửi bản dựng lúc 06:30 cho từng người nhận theo kịch bản của họ. Chưa có bản nào thì DỰNG NGAY rồi gửi — không có gì bất thường vẫn gửi",
    nguonMd: "PLAN-MAIN-AGENT mục 7 · 6.3",
  },
  {
    ma: "nhac-bc-tuan",
    ten: "Thứ Hai 14:00 — nhắc báo cáo tuần",
    gio: "14:00",
    thu: 1,
    ngayTrongThang: null,
    moTa: "Nhắc Agent tiến độ đã dựng nháp báo cáo tuần chưa",
    nguonMd: "PLAN-MAIN-AGENT mục 7",
  },
  {
    ma: "nhap-bc-thang",
    ten: "Ngày 1 hằng tháng 08:00 — nháp báo cáo tháng",
    gio: "08:00",
    thu: null,
    ngayTrongThang: 1,
    moTa: "Dựng bản nháp báo cáo tháng theo mẫu mục 2",
    nguonMd: "PLAN-MAIN-AGENT mục 7 · mục 2",
  },
];

/**
 * Nhịp này đã ĐẾN GIỜ chạy chưa: đúng thứ (nếu có), đúng ngày trong tháng
 * (nếu có), đã qua giờ hẹn của hôm nay, và hôm nay CHƯA chạy.
 * `daChayNgay` = ngày ISO lần chạy tự động gần nhất; null = chưa chạy bao giờ.
 *
 * Nhận `gioHienTai` đã tính sẵn theo giờ VN để hàm này THUẦN — bên gọi dùng
 * `gioVn()` của bộ hẹn giờ lõi, không ai tự viết lại phép đổi múi giờ.
 */
export function denGioChayNhip(
  nhip: NhipDinhKy,
  gioHienTai: { ngay: string; gio: string; thu: number },
  daChayNgay: string | null,
): boolean {
  if (nhip.thu !== null && gioHienTai.thu !== nhip.thu) return false;
  if (
    nhip.ngayTrongThang !== null &&
    Number(gioHienTai.ngay.slice(8, 10)) !== nhip.ngayTrongThang
  ) {
    return false;
  }
  if (gioHienTai.gio < nhip.gio) return false;
  return daChayNgay !== gioHienTai.ngay;
}
