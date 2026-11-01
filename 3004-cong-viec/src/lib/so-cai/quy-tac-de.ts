// ============================================================
// so-cai/quy-tac-de.ts — QUY TẮC ĐÈ KHI TRÙNG (THUẦN, không đụng CSDL). Chủ module: so-cai (giai đoạn 4).
// Thứ tự áp dụng lấy từ cấu hình quy_tac_de. Bản thua không mất: vẫn nằm trong nguon_cong_viec + lịch sử.
//
// Bốn thứ tự (cài đặt "Thứ tự ưu tiên khi việc trùng"):
//   cap_truoc  — cấp cao đè cấp thấp kể cả khi cấp thấp gửi sau; cùng cấp thì so ngày (mặc định)
//   ngay_truoc — báo cáo mới hơn thắng; cùng kỳ thì cấp cao thắng
//   chi_cap    — chỉ theo cấp; cùng cấp giữ bản đến trước
//   chi_ngay   — bản mới nhất luôn thắng, không xét cấp
// Luật chung trước mọi thứ tự:
//   - bản mới là quyết định TGĐ (Form 0) → đè tất cả
//   - bản mới từ bên ngoài (cấp ≥ cap_ben_ngoai) KHÔNG BAO GIỜ đè được việc trong công ty (từ 28/09 văn bản đến không sinh việc,
//     bỏ công tắc cap_ben_ngoai_duoc_de; luật giữ lại cho nguồn bên ngoài cũ còn trong sổ)
//   - bản cũ là quyết định TGĐ: khi so cấp, quyết định đứng trên mọi cấp
// ============================================================
import { MAC_DINH, type CauHinh } from "@/lib/cau-hinh/mac-dinh";

export interface NguonSoSanh {
  cap: number; // nhỏ hơn = cấp cao hơn (1 Ban TGĐ > 2 phòng > 3 đơn vị)
  ky_bao_cao: string | null; // ISO ngày cuối kỳ
  ngay_gui: string; // ISO
  la_quyet_dinh?: boolean; // quyết định TGĐ trong Form 0 → đè tất cả
}

export interface KetQuaSoSanh {
  thang: "moi" | "cu";
  ly_do: string; // 'cấp cao hơn đè', 'thua cấp', 'ngày sau', 'thua ngày', ...
}

/** Mốc thời gian của một nguồn (ms). null = không có. */
function moc(v: string | null | undefined): number | null {
  if (!v) return null;
  const t = Date.parse(v.length === 10 ? v + "T00:00:00Z" : v);
  return Number.isNaN(t) ? null : t;
}

/** So "ngày": >0 bản mới sau, <0 bản mới trước, 0 cùng ngày/kỳ. Tính theo kỳ báo cáo hoặc ngày gửi. */
function soNgay(cu: NguonSoSanh, moi: NguonSoSanh, theo: CauHinh["quy_tac_de"]["ngay_sau_tinh_theo"]): { d: number; don_vi: string } {
  if (theo === "ky_bao_cao") {
    const a = moc(cu.ky_bao_cao?.slice(0, 10));
    const b = moc(moi.ky_bao_cao?.slice(0, 10));
    if (a !== null && b !== null) return { d: Math.sign(b - a), don_vi: "kỳ" };
    // Thiếu kỳ ở một bên → so ngày gửi
  }
  const a = moc(cu.ngay_gui) ?? 0;
  const b = moc(moi.ngay_gui) ?? 0;
  return { d: Math.sign(b - a), don_vi: "ngày gửi" };
}

/** Chỉ so ngày gửi (dùng để phân xử khi cùng kỳ). */
function soNgayGui(cu: NguonSoSanh, moi: NguonSoSanh): number {
  return Math.sign((moc(moi.ngay_gui) ?? 0) - (moc(cu.ngay_gui) ?? 0));
}

/** Hạng cấp để so: quyết định TGĐ đứng trên mọi cấp. Nhỏ hơn = cao hơn. */
function hang(n: NguonSoSanh): number {
  return n.la_quyet_dinh ? -Infinity : n.cap;
}

/** So cấp: >0 bản mới cấp cao hơn, <0 thấp hơn, 0 cùng cấp. */
function soCap(cu: NguonSoSanh, moi: NguonSoSanh): number {
  const a = hang(cu);
  const b = hang(moi);
  if (a === b) return 0;
  return b < a ? 1 : -1;
}

function lyDoCap(huong: number, cu: NguonSoSanh): string {
  if (huong > 0) return "cấp cao hơn đè";
  return cu.la_quyet_dinh ? "thua cấp: quyết định của Tổng Giám đốc" : "thua cấp";
}

/** Phân xử khi ngày (kỳ) bằng nhau và cùng cấp: bản gửi sau đè, gửi cùng lúc thì bản mới vẫn đè. */
function phanXuCungNgay(cu: NguonSoSanh, moi: NguonSoSanh, tien: string): KetQuaSoSanh {
  const g = soNgayGui(cu, moi);
  if (g < 0) return { thang: "cu", ly_do: `${tien}thua ngày gửi` };
  return { thang: "moi", ly_do: `${tien}gửi sau đè` };
}

/**
 * So bản đang dùng (cu) với bản mới đến (moi). Trả bên thắng + lý do tiếng Việt.
 * capBenNgoai: cấp coi là "bên ngoài" (cấu hình nguoi_ngoai.cap_ben_ngoai) — tham số thêm, có mặc định.
 */
export function soSanhNguon(
  cu: NguonSoSanh,
  moi: NguonSoSanh,
  ch: CauHinh["quy_tac_de"],
  capBenNgoai: number = MAC_DINH.nguoi_ngoai.cap_ben_ngoai,
): KetQuaSoSanh {
  // 1. Quyết định TGĐ mới → đè tất cả
  if (moi.la_quyet_dinh && !cu.la_quyet_dinh) return { thang: "moi", ly_do: "quyết định của Tổng Giám đốc đè tất cả" };

  // 2. Bên ngoài không đè được việc trong công ty
  if (!moi.la_quyet_dinh && moi.cap >= capBenNgoai && (cu.la_quyet_dinh || cu.cap < capBenNgoai)) {
    return { thang: "cu", ly_do: "bên ngoài công ty không đè được việc trong công ty" };
  }

  const ngay = soNgay(cu, moi, ch.ngay_sau_tinh_theo);
  const cap = soCap(cu, moi);

  switch (ch.thu_tu) {
    case "ngay_truoc": {
      if (ngay.d > 0) return { thang: "moi", ly_do: `ngày sau đè (${ngay.don_vi} mới hơn)` };
      if (ngay.d < 0) return { thang: "cu", ly_do: `thua ngày (${ngay.don_vi} cũ hơn)` };
      if (cap !== 0) return { thang: cap > 0 ? "moi" : "cu", ly_do: `cùng ${ngay.don_vi}, ${lyDoCap(cap, cu)}` };
      return phanXuCungNgay(cu, moi, `cùng ${ngay.don_vi}, cùng cấp: `);
    }
    case "chi_cap": {
      if (cap !== 0) return { thang: cap > 0 ? "moi" : "cu", ly_do: lyDoCap(cap, cu) };
      return { thang: "cu", ly_do: "cùng cấp: giữ bản đến trước" };
    }
    case "chi_ngay": {
      if (ngay.d > 0) return { thang: "moi", ly_do: `ngày sau đè (${ngay.don_vi} mới hơn)` };
      if (ngay.d < 0) return { thang: "cu", ly_do: `thua ngày (${ngay.don_vi} cũ hơn)` };
      return phanXuCungNgay(cu, moi, `cùng ${ngay.don_vi}: `);
    }
    case "cap_truoc":
    default: {
      if (cap !== 0) return { thang: cap > 0 ? "moi" : "cu", ly_do: lyDoCap(cap, cu) };
      if (ngay.d > 0) return { thang: "moi", ly_do: `cùng cấp, ngày sau đè (${ngay.don_vi} mới hơn)` };
      if (ngay.d < 0) return { thang: "cu", ly_do: `cùng cấp, thua ngày (${ngay.don_vi} cũ hơn)` };
      return phanXuCungNgay(cu, moi, `cùng cấp, cùng ${ngay.don_vi}: `);
    }
  }
}
