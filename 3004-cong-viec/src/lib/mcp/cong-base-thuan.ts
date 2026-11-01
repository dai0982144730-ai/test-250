// ============================================================
// CỔNG /api/mcp/base CỦA AGENT CÔNG VIỆC — phần THUẦN (04/10/2026, Mr. Đại chốt chuyển vai Base → Công việc 03/10)
//
// Giữ NGUYÊN khuôn trả lời của 1-agent-base/src/lib/mcp/cong-base.ts để 5 agent đang gọi không phải sửa dòng nào;
// chỉ đổi NGUỒN: việc Base.vn → SỔ CÁI của agent Công việc (ViecCay · gomTheoWbs ở lib/cay-viec/thuan.ts).
//   · "mã việc Base" (ma_viec_base)  = mã việc sổ cái CV-…
//   · "người phụ trách" (nguoi_phu_trach) = mã người / mã đơn vị CHỦ TRÌ (kèm ten_nguoi_phu_trach, loai_phu_trach)
//   · mã WBS chỉ tính dòng ĐÃ DUYỆT — 🤖 chờ duyệt KHÔNG tính là đã gắn (Mr. Đại chốt 03/10, gomTheoWbs đã lọc)
// Mọi phép đếm là CODE (phân vai 06/09). Không có số thì khai null kèm lý do, không khai 0.
// File THUẦN — không node:fs, không mạng (luật 10); test ở tests/unit/cong-base.test.ts.
// ============================================================
import { thatBai, TRAN_BAN_GHI, type KhuonTra } from "@/lib/mcp/khuon";
import { doiMaCu } from "@/lib/du-an-main-thuan";
import { tapMaCoCon } from "@/lib/cay-viec/issue/sinh";
import type { GomViec, ViecCay } from "@/lib/cay-viec/thuan";
import { cachNgay, ngayVN } from "@/lib/phong/tuan";
import { fmtSo } from "@/lib/format";

/** Tên agent khi trả lời — giữ mã "base" (đổi mã = ~245 chỗ ở 5 agent; Mr. Đại chốt giữ) */
export const TEN_AGENT = "base";
/** Tên hiện cho người đọc */
export const TEN_HIEN = "Agent Công việc";

/**
 * DANH BẠ HÀNG LOẠT TẠM ĐÓNG (04/10/2026 — phiên Công việc tự sửa khi soát lại, chờ Mr. Đại chốt hướng lâu dài).
 * Main · Tiến độ · Hợp đồng kéo cả danh bạ "base" mỗi 24 giờ (`base.thong_tin_nhan_su` tat_ca=1 · GET /api/viec/danh-ba)
 * vào kho `data/viec/danh-ba-base.json` — kho đó đang phục vụ "Việc của tôi" và ô chọn @ người nhận, hai thứ GỌI THẲNG
 * Base.vn bằng tên tài khoản Base.vn. Mã người agent Công việc (vd "truong.cd@scigroup.vn") không phải tài khoản Base.vn:
 * đổ vào là ô chọn @ lẫn 52 mã lạ, và `email_sci` làm ánh xạ email → tài khoản Base trỏ sang mã sai.
 * Bên gọi gặp lỗi thì GIỮ kho đang có (đã đọc code 3 agent). Mở lại cùng đợt "sửa Việc của tôi ở 4 agent" (chốt 03/10).
 */
export const LY_DO_DONG_DANH_BA =
  "Danh bạ hàng loạt của agent Công việc (mã base) đang tạm đóng: kho danh bạ ở agent gọi đang dùng để gọi thẳng Base.vn (Việc của tôi, ô chọn @ người nhận), " +
  "mà mã người agent Công việc không phải tài khoản Base.vn — đổ vào sẽ làm sai. Hãy giữ bản danh bạ đang có; mở lại khi sửa Việc của tôi ở các agent. " +
  "Tra từng người vẫn được: gửi ma_base (mã người hoặc email) hoặc ho_ten.";

export function chuoi(v: unknown): string {
  return typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
}

export function chanGioiHan(v: unknown, macDinh = 20): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) return macDinh;
  return Math.min(Math.floor(n), TRAN_BAN_GHI);
}

// ─────────────────────────────────────────────────────────────
// Tra dự án — luật của 1-agent-base/src/lib/mcp/tra-du-an.ts, đổi sổ dự án sang Cài đặt › Sơ đồ tổ chức dự án
// ─────────────────────────────────────────────────────────────

/** Dự án như Cài đặt của agent Công việc giữ (id = mã ngắn Main từ 03/10) */
export interface DuAnCong {
  id: string;
  ten: string;
  ma_tien_do?: string | null;
  ten_khac?: string[];
}

export interface DuAnDaTra {
  id: string;
  ten: string;
  /** Mã hỏi agent Tiến độ — null = dự án chưa có cây WBS */
  maTienDo: string | null;
}

export type KetQuaTraDuAn = { ok: true; duAn: DuAnDaTra } | { ok: false; loi: KhuonTra };

/** Bỏ dấu, chữ thường, bỏ ký tự không phải chữ-số: "Tân Thành" → "tanthanh" */
export function gonMa(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** "HV Điện gió Hướng Việt · TT Tân Thành" — luật 30: mã kèm tên */
export function lietKeMaDangCo(ds: readonly DuAnCong[]): string {
  return ds.length > 0 ? ds.map((d) => `${d.id} ${d.ten}`).join(" · ") : "(chưa có dự án nào)";
}

const traVe = (d: DuAnCong): KetQuaTraDuAn => ({ ok: true, duAn: { id: d.id, ten: d.ten, maTienDo: d.ma_tien_do?.trim() || null } });

export function traDuAnTrongDanhSach(tho: string, ds: readonly DuAnCong[]): KetQuaTraDuAn {
  const ma = (tho ?? "").trim();
  if (ma === "") return { ok: false, loi: thatBai("KHONG_HIEU_YEU_CAU", `Thiếu ma_du_an. Mã đang có: ${lietKeMaDangCo(ds)}.`) };
  const hoa = ma.toUpperCase();
  // ① đúng mã (không phân biệt hoa thường) · ② mã cũ của agent Công việc (da-hv → HV) · ③ đúng "Mã bên Tiến độ"
  const dung =
    ds.find((d) => d.id.toUpperCase() === hoa) ??
    ds.find((d) => d.id === doiMaCu(ma)) ??
    ds.find((d) => (d.ma_tien_do ?? "").trim().toUpperCase() === hoa);
  if (dung) return traVe(dung);
  // ④ bằng nhau sau khi bỏ dấu/gạch — mã, tên, tên gọi khác
  const g = gonMa(ma);
  const tenCua = (d: DuAnCong) => [d.id, d.ten, ...(d.ten_khac ?? [])].map(gonMa).filter((x) => x !== "");
  const bang = ds.filter((d) => tenCua(d).includes(g));
  if (bang.length === 1) return traVe(bang[0]!);
  // ⑤ một phần — chỉ khi trúng đúng MỘT dự án. Hai chiều: "huong" nằm trong tên, hoặc tên nằm trong slug Tiến độ
  //    gửi sang ("dien-gio-huong-viet-hv-du-lieu" chứa "diengiohuongviet")
  const khop =
    bang.length > 1
      ? bang
      : g.length >= 3
        ? ds.filter((d) => tenCua(d).some((t) => t.includes(g) || (t.length >= 6 && g.includes(t))))
        : [];
  if (khop.length === 1) return traVe(khop[0]!);
  if (khop.length > 1) {
    return {
      ok: false,
      loi: thatBai("KHONG_HIEU_YEU_CAU", `"${ma}" khớp ${khop.length} dự án (${lietKeMaDangCo(khop)}) — ghi rõ mã ngắn.`),
    };
  }
  return {
    ok: false,
    loi: thatBai(
      "KHONG_CO_DU_LIEU",
      `Không có dự án nào mang mã/tên "${ma}" — KHÔNG lấy số của dự án khác ra thay. Mã đang có: ${lietKeMaDangCo(ds)}.`,
    ),
  };
}

// ─────────────────────────────────────────────────────────────
// Người phụ trách
// ─────────────────────────────────────────────────────────────

/** Lọc theo người: khớp mã người/đơn vị hoặc tên (bỏ dấu), bỏ "@" đầu */
export function khopNguoi(v: Pick<ViecCay, "nguoiPhuTrach" | "tenNguoi">, loc: string): boolean {
  const l = gonMa(loc.replace(/^@/, ""));
  if (l === "") return true;
  return gonMa(v.nguoiPhuTrach).includes(l) || gonMa(v.tenNguoi).includes(l);
}

/** Ba trường người của mọi dòng việc trả ra — mã kèm TÊN (luật 30), chưa giao thì null */
export function truongNguoi(v: ViecCay) {
  return {
    nguoi_phu_trach: v.nguoiPhuTrach || null,
    ten_nguoi_phu_trach: v.nguoiPhuTrach ? v.tenNguoi || null : null,
    loai_phu_trach: v.nguoiPhuTrach ? (v.loaiPhuTrach === "don_vi" ? "don_vi" : "nguoi") : null,
  };
}

// ─────────────────────────────────────────────────────────────
// Phạm vi đã soát — kèm mọi câu trả lời đọc việc
// ─────────────────────────────────────────────────────────────

export function moiViec(g: GomViec): ViecCay[] {
  const ra: ViecCay[] = [];
  const co = new Set<string>();
  g.theoWbs.forEach((ds) => ds.forEach((v) => (co.has(v.id) ? null : (co.add(v.id), ra.push(v)))));
  for (const v of g.chuaGan) if (!co.has(v.id)) (co.add(v.id), ra.push(v));
  return ra;
}

export function phamVi(g: GomViec) {
  return {
    tong_so_viec: g.tongSoViec,
    so_viec_gan_duoc_wbs: g.ganDuoc,
    so_viec_chua_gan_duoc_ma: g.chuaGan.length,
    so_viec_ma_cho_duyet: g.choDuyet,
    da_soat_ca_viec_chua_gan_ma: true,
  };
}

// ─────────────────────────────────────────────────────────────
// base.co_viec_cho_ma_khong — một mã (dùng chung cho cách gọi một mã và ds_ma)
// ─────────────────────────────────────────────────────────────

export function traMotMa(
  g: GomViec,
  maHeThong: string,
  gioiHan: unknown,
): { duLieu: Record<string, unknown>; viTri: string; canhBao: string[] } {
  const ma = maHeThong.replace(/^[A-Za-z0-9]{2,5}\./, (m) => (/^\d/.test(m) ? m : "")); // bỏ tiền tố dự án "HV.7.5.4.6" · "hv.7.5.4.6"
  const ds = g.theoWbs.get(ma);
  const phamViDaSoat = {
    tong_so_viec: g.tongSoViec,
    so_viec_gan_duoc_wbs: g.ganDuoc,
    so_ma_wbs_co_trong_du_lieu: g.theoWbs.size,
    so_viec_ma_cho_duyet: g.choDuyet,
    truong_dang_khai: "mã WBS đã duyệt trong sổ cái (docflow.wbs_viec)",
  };
  if (!ds || ds.length === 0) {
    const maCo = Array.from(g.theoWbs.keys()).sort();
    const lyDo =
      g.ganDuoc === 0
        ? `Đã đọc ${g.tongSoViec} việc trong sổ cái nhưng KHÔNG việc nào có mã WBS đã duyệt${g.choDuyet ? ` (${g.choDuyet} việc 🤖 AI đề xuất mã còn chờ người duyệt — chưa tính)` : ""}. Vì thế KHÔNG BIẾT mã "${ma}" đã có ai được giao hay chưa: đây là THIẾU DỮ LIỆU GẮN, không phải "chưa ai được giao".`
        : `Đã soát ${g.tongSoViec} việc, ${g.ganDuoc} việc có mã WBS đã duyệt (${maCo.length} mã phân biệt), nhưng KHÔNG mã nào là "${ma}". Nghĩa là chưa việc nào trong sổ cái được gắn mã này — không phải "đã tra xong và chưa ai được giao".`;
    return {
      duLieu: {
        ma_he_thong: ma,
        tim_thay_ma: false,
        ket_luan: "KHONG_TIM_THAY_MA",
        da_co_ai_nhan: null,
        so_viec_mang_ma: null,
        so_viec_dang_mo: null,
        so_viec_da_xong: null,
        nguoi_dang_cam: null,
        viec: [],
        pham_vi_da_soat: phamViDaSoat,
        ma_wbs_co_trong_du_lieu: maCo.slice(0, 20),
        ghi_chu: lyDo,
      },
      viTri: `tra mã ${ma} trên ${g.tongSoViec} việc — KHÔNG thấy mã`,
      canhBao: [`KHÔNG TÌM THẤY mã "${ma}" trong sổ cái — các trường đếm khai null (chưa biết), KHÔNG phải 0.`],
    };
  }
  const dangMo = ds.filter((v) => !v.daXong);
  const soDaXong = ds.length - dangMo.length;
  const coNguoi = dangMo.some((v) => v.nguoiPhuTrach !== "");
  const ketLuan = dangMo.length === 0 ? "DA_XONG_HET" : coNguoi ? "DA_CO_NGUOI_NHAN" : "CHUA_AI_NHAN";
  const ghiChu =
    ketLuan === "DA_XONG_HET"
      ? `so_viec_dang_mo = 0 là số ĐÚNG NGHĨA: mã "${ma}" có ${ds.length} việc trong sổ cái và CẢ ${soDaXong} việc ĐỀU ĐÃ XONG — không phải "chưa ai được giao".`
      : ketLuan === "CHUA_AI_NHAN"
        ? `Mã "${ma}" có ${dangMo.length} việc đang mở nhưng KHÔNG việc nào có người chủ trì — đây mới đúng là "chưa ai được giao".`
        : `Mã "${ma}" có ${dangMo.length} việc đang mở, đã có người cầm.`;
  return {
    duLieu: {
      ma_he_thong: ma,
      tim_thay_ma: true,
      ket_luan: ketLuan,
      da_co_ai_nhan: coNguoi,
      so_viec_mang_ma: ds.length,
      so_viec_dang_mo: dangMo.length,
      so_viec_da_xong: soDaXong,
      nguoi_dang_cam: dangMo.map((v) => v.nguoiPhuTrach).filter(Boolean),
      ten_nguoi_dang_cam: dangMo.filter((v) => v.nguoiPhuTrach).map((v) => v.tenNguoi || v.nguoiPhuTrach),
      viec: dangMo.slice(0, chanGioiHan(gioiHan)).map((v) => ({
        ma_viec_base: v.id,
        ten: v.ten,
        ...truongNguoi(v),
        han: v.han,
        qua_han_ngay: v.quaHanNgay,
        giao_luc: v.giaoLuc ?? null,
      })),
      // 08/10 (Mr. Đại duyệt — việc chờ duyệt tự đóng): MỌI việc mang mã kể cả đã xong, kèm lúc giao — agent khác so với lúc soạn nháp
      viec_kem_luc_giao: ds.slice(0, 50).map((v) => ({ ma_viec_base: v.id, ten: v.ten, da_xong: v.daXong, giao_luc: v.giaoLuc ?? null })),
      pham_vi_da_soat: phamViDaSoat,
      ghi_chu: ghiChu,
    },
    viTri: `tra mã ${ma} trên ${g.tongSoViec} việc`,
    canhBao: [],
  };
}

// ─────────────────────────────────────────────────────────────
// Tải việc theo người — chép nguyên 1-agent-base/src/lib/mcp/tai-viec.ts (I29, Mr. Đại chốt 23/09).
// 17/10/2026: cột việc găng đếm theo tập việc LÁ găng tới COD + mã con (laGangHoacCon), không theo chuỗi găng.
// ─────────────────────────────────────────────────────────────

export interface ViecTai {
  id: string;
  ten: string;
  nguoiPhuTrach: string;
  daXong: boolean;
  han: string | null;
  quaHanNgay: number | null;
  maWbs: string[];
}

/** Loại dòng phụ trách (26/10/2026): danh sách tải việc trộn người, phòng, đơn vị, chức danh lãnh đạo — ghi rõ để bên hỏi không gọi nhầm */
export type LoaiPhuTrach = "nguoi" | "phong" | "don_vi" | "chuc_danh_lanh_dao" | "chua_ro";
export const NHAN_LOAI_PHU_TRACH: Record<LoaiPhuTrach, string> = {
  nguoi: "người",
  phong: "phòng",
  don_vi: "đơn vị (công ty, ban, nhà máy…)",
  chuc_danh_lanh_dao: "chức danh lãnh đạo (việc giao cho chức danh, người giữ chức danh ghi sau dấu ·)",
  chua_ro: "chưa rõ",
};

/**
 * Tên việc GỌN cho câu trả lời (26/10/2026): bỏ tiền tố dự án «[Điện gió … (HV — …)]», gộp khoảng trắng, cắt ở câu đầu,
 * tối đa 14 chữ. Tên đầy đủ vẫn giữ ở `ten` — AI chép tên dài có ngoặc vuông từng bị méo và lặp chữ.
 */
export function tenGonViec(ten: string): string {
  const goc = String(ten ?? "").replace(/\s+/g, " ").trim();
  // Bỏ MỌI tiền tố «[…]» đầu tên (kiểm độc lập P-CV-2: trước chỉ bỏ cái đầu)
  let s = goc;
  for (let i = 0; i < 5 && /^\[[^\]]*\]/.test(s); i++) s = s.replace(/^\[[^\]]*\]\s*/, "");
  if (s === "") return goc; // tên chỉ có «[…]» → giữ tên gốc, không trả rỗng
  let cat = false;
  // Cắt ở cuối câu đầu — chỉ khi sau dấu là chữ HOA và trước dấu không phải số («Hạng mục 6.1. Lắp đặt» không cắt) — P-CV-1
  const re = /[.;]\s+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    const truoc = s[m.index - 1] ?? "";
    const sau = s[m.index + m[0].length] ?? "";
    const laHoa = sau !== "" && sau === sau.toUpperCase() && sau !== sau.toLowerCase();
    if (/\d/.test(truoc) || !laHoa) continue;
    const dau = s.slice(0, m.index).trim();
    if (dau.split(" ").length >= 3) {
      s = dau;
      cat = true;
    }
    break;
  }
  const chu = s.split(" ");
  // 27/10 (Main đợt 3, CV-03/CV-19): 14 chữ cắt mất nội dung tên việc («…hết hạn 31/07…») — nới 24 chữ, vẫn cắt ở câu đầu
  if (chu.length > 24) {
    s = chu.slice(0, 24).join(" ").replace(/[,;:.]+$/, "");
    cat = true;
  }
  // Không để ngoặc mở chưa đóng: lùi về trước «(» cuối
  if (cat && (s.match(/\(/g) ?? []).length > (s.match(/\)/g) ?? []).length) s = s.slice(0, s.lastIndexOf("(")).trim();
  return cat ? `${s.replace(/[,;:.\s—–-]+$/, "")}…` : s;
}

export interface TaiMotNguoi {
  ma_base: string | null;
  ho_ten: string | null;
  /** người · phòng · đơn vị · chức danh lãnh đạo (26/10/2026) */
  loai: LoaiPhuTrach;
  /** Tên ngắn đơn vị cha (của đơn vị) hoặc đơn vị chính (của người) — null khi không có */
  thuoc: string | null;
  dang_mo: number;
  qua_han: number;
  sap_han_7_ngay: number;
  viec_gang: number;
  khong_khai_han: number;
  viec_nang: { ma_viec_base: string; ten: string; ten_gon: string; han: string | null; qua_han_ngay: number | null; ma_wbs: string | null; gang: boolean }[];
}

export const SO_NGAY_SAP_HAN = 7;

/** Sắp hạn: hạn trong (hôm nay, hôm nay + 7 ngày], chưa quá hạn */
export function sapHan(han: string | null, homNay: string): boolean {
  if (!han) return false;
  const lech = Math.round((new Date(han + "T00:00:00Z").getTime() - new Date(homNay + "T00:00:00Z").getTime()) / 86_400_000);
  return lech >= 0 && lech <= SO_NGAY_SAP_HAN;
}

/** Nặng nhất lên đầu: việc găng ↓ → quá hạn ↓ → sắp hạn ↓ → đang mở ↓ */
export function soSanhTai(a: TaiMotNguoi, b: TaiMotNguoi): number {
  return (
    b.viec_gang - a.viec_gang ||
    b.qua_han - a.qua_han ||
    b.sap_han_7_ngay - a.sap_han_7_ngay ||
    b.dang_mo - a.dang_mo ||
    String(a.ma_base ?? "~").localeCompare(String(b.ma_base ?? "~"))
  );
}

/**
 * Mã WBS `ma` là việc găng HOẶC mã con (mọi tầng) của một việc trong `tapGang` — "6.1.4.2" dưới "6.1.4" tính; "6.1" (nhóm
 * cha của 6.1.4) và "6.1.40" (khác nhánh) KHÔNG tính (Mr. Đại chốt 17/10/2026 — base.tai_viec_theo_nguoi).
 */
export function laGangHoacCon(ma: string, tapGang: Set<string>): boolean {
  const phan = ma.trim().split(".");
  for (let i = 1; i <= phan.length; i += 1) if (tapGang.has(phan.slice(0, i).join("."))) return true;
  return false;
}

/** Câu định nghĩa cột viec_gang của base.tai_viec_theo_nguoi — trả kèm công cụ, mô tả công cụ trỏ về */
export const DINH_NGHIA_VIEC_GANG_THEO_NGUOI =
  "viec_gang = số việc đang mở gắn mã WBS ĐÃ DUYỆT là một việc LÁ găng tới mốc COD theo Agent tiến độ (tiendo.tim_dau_viec · cờ critical — " +
  "cùng nguồn với tren_duong_gang của base.danh_sach_issue) HOẶC là mã con của việc lá găng đó (vd 6.1.4.2 dưới 6.1.4). " +
  "Mã nhóm cha (vd 6.1 chứa 6.1.4) KHÔNG tính. null = chưa hỏi được Agent tiến độ — chưa biết, KHÔNG phải 0.";

export function tongHopTaiTheoNguoi(
  viec: ViecTai[],
  maGang: Set<string>,
  homNay: string,
  hoTen: (ma: string) => string | null = () => null,
  toiDaViecNang = 5,
  phanLoai: (ma: string) => { loai: LoaiPhuTrach; thuoc: string | null } = () => ({ loai: "chua_ro", thuoc: null }),
): TaiMotNguoi[] {
  const theo = new Map<string, TaiMotNguoi>();
  const nangCua = new Map<string, { v: ViecTai; gang: boolean }[]>();
  for (const v of viec) {
    if (v.daXong) continue;
    const k = v.nguoiPhuTrach.trim();
    const t = theo.get(k) ?? {
      ma_base: k || null,
      ho_ten: k ? hoTen(k) : null,
      ...(k ? phanLoai(k) : { loai: "chua_ro" as const, thuoc: null }),
      dang_mo: 0,
      qua_han: 0,
      sap_han_7_ngay: 0,
      viec_gang: 0,
      khong_khai_han: 0,
      viec_nang: [],
    };
    t.dang_mo += 1;
    // 17/10/2026: việc găng = mã lá găng HOẶC mã con của nó (trước: đúng mã trong chuỗi găng)
    const gang = v.maWbs.some((m) => laGangHoacCon(m, maGang));
    if (gang) t.viec_gang += 1;
    if (v.quaHanNgay !== null && v.quaHanNgay > 0) t.qua_han += 1;
    else if (v.han === null) t.khong_khai_han += 1;
    else if (sapHan(v.han, homNay)) t.sap_han_7_ngay += 1;
    theo.set(k, t);
    const ds = nangCua.get(k) ?? [];
    ds.push({ v, gang });
    nangCua.set(k, ds);
  }
  for (const [k, t] of Array.from(theo.entries())) {
    t.viec_nang = (nangCua.get(k) ?? [])
      .sort((a, b) => Number(b.gang) - Number(a.gang) || (b.v.quaHanNgay ?? -1) - (a.v.quaHanNgay ?? -1))
      .slice(0, toiDaViecNang)
      .map(({ v, gang }) => ({ ma_viec_base: v.id, ten: v.ten, ten_gon: tenGonViec(v.ten), han: v.han, qua_han_ngay: v.quaHanNgay, ma_wbs: v.maWbs[0] ?? null, gang }));
  }
  return Array.from(theo.values()).sort(soSanhTai);
}

// ─────────────────────────────────────────────────────────────
// Cờ "trên đường găng" của thẻ issue — chép 1-agent-base/src/lib/mcp/gang-the.ts (25/09)
// ─────────────────────────────────────────────────────────────

export function laMaWbs(v: unknown): v is string {
  return typeof v === "string" && /^\d+(\.\d+)*$/.test(v.trim());
}

/** Tập mã việc LÁ găng tới COD từ danh sách đầu việc của `tiendo.tim_dau_viec` */
export function tapViecGangLa(dauViec: { wbs: string; critical?: boolean }[]): Set<string> {
  const coCon = tapMaCoCon(dauViec);
  return new Set(dauViec.filter((t) => t.critical === true && !coCon.has(t.wbs)).map((t) => t.wbs));
}

export function thuocLuatGang(t: { nguon?: string; tieuDe?: string }): boolean {
  return t.nguon === "gang" || /^Luật 3 — găng/.test(String(t.tieuDe ?? ""));
}

export function trenDuongGangCuaThe(
  t: { nguon?: string; tieuDe?: string; wbs?: string | null; wbsLienQuan?: string[] | null },
  tapGang: Set<string> | null,
): boolean | null {
  if (thuocLuatGang(t)) return true;
  if (tapGang === null) return null;
  const ma = [t.wbs, ...(Array.isArray(t.wbsLienQuan) ? t.wbsLienQuan : [])].filter(laMaWbs).map((m) => m.trim());
  return ma.some((m) => tapGang.has(m));
}

export const DINH_NGHIA_TREN_DUONG_GANG =
  "tren_duong_gang = true khi thẻ thuộc luật 3 (găng, chưa ai nhận) HOẶC wbs/wbs_lien_quan chứa một việc LÁ găng tới COD theo Agent tiến độ (tiendo.tim_dau_viec · critical, không tính mã nhóm); null = chưa hỏi được Agent tiến độ.";

// ─────────────────────────────────────────────────────────────
// base.viec_cua_toi — BA NÚT của agent Công việc cho màn "Việc của tôi" ở Main · Tiến độ · Hợp đồng
// (Mr. Đại chốt 04/10/2026, CHOT LOI-DUNG-CHUNG 6g.7 mục 3). Định nghĩa CHÉP NGUYÊN locViec ở
// src/components/phong/viec.ts (chốt 28/09) — sửa một chỗ thì sửa cả hai.
// ─────────────────────────────────────────────────────────────

export type LoaiViecToi = "nhan" | "giao" | "phoi_hop";
export const LOAI_VIEC_TOI: LoaiViecToi[] = ["nhan", "giao", "phoi_hop"];

/** Dòng sổ cái tối thiểu để lọc (khớp DongSoCai của so-cai/dich-vu) */
export interface DongLocToi {
  id: string;
  giao_boi: string | null;
  phan_viec: { phu_trach_loai: "nguoi" | "don_vi"; phu_trach_id: string; trang_thai: string; vai?: "chu_tri" | "phoi_hop"; da_bo?: boolean }[];
  nguon_hien_hanh?: { du_lieu?: { nguon_bang?: string } | null } | null;
}

/** Người được hỏi: mã người · chức danh lãnh đạo người đó giữ · đơn vị người đó là đầu (nhận chuông như trưởng) */
export interface ToiLocMay {
  id: string;
  chucDanh: string[];
  donViTruong: string[];
}

export function toiLocMay(nd: { id: string; don_vi_ids: string[]; vai_tro: string[]; don_vi_dau?: string[] }, lanhDao: Set<string>): ToiLocMay {
  const dau = nd.don_vi_dau ?? (nd.vai_tro.includes("truong-don-vi") ? nd.don_vi_ids : []);
  return { id: nd.id, chucDanh: nd.don_vi_ids.filter((d) => lanhDao.has(d)), donViTruong: dau.filter((d) => !lanhDao.has(d)) };
}

export function locViecCuaToi<T extends DongLocToi>(ds: T[], loai: LoaiViecToi, toi: ToiLocMay): T[] {
  const pt = (v: T) => v.phan_viec.filter((p) => !p.da_bo);
  const vai = (p: DongLocToi["phan_viec"][number]) => (p.vai === "phoi_hop" ? "phoi_hop" : "chu_tri");
  const laToi = (p: DongLocToi["phan_viec"][number]) => (p.phu_trach_loai === "nguoi" ? p.phu_trach_id === toi.id : toi.chucDanh.includes(p.phu_trach_id));
  const laCuaToi = (p: DongLocToi["phan_viec"][number]) => laToi(p) || (p.phu_trach_loai === "don_vi" && toi.donViTruong.includes(p.phu_trach_id));
  if (loai === "giao") {
    return ds.filter((v) => ["giao_tay", "bang_quyet_dinh"].includes(v.nguon_hien_hanh?.du_lieu?.nguon_bang ?? "") && v.giao_boi === toi.id);
  }
  if (loai === "nhan") return ds.filter((v) => pt(v).some((p) => vai(p) === "chu_tri" && laToi(p)));
  return ds.filter(
    (v) => !pt(v).some((p) => vai(p) === "chu_tri" && laCuaToi(p)) && pt(v).some((p) => vai(p) === "phoi_hop" && p.trang_thai === "dang_lam" && laCuaToi(p)),
  );
}

// ─────────────────────────────────────────────────────────────
// base.viec_co_han_trong_khoang — việc CÓ HẠN trong một khoảng ngày, theo dự án (18/10/2026)
//
// Cho Bảng 11 «Kế hoạch tháng tới» của báo cáo tháng Main (KE-HOACH/22 mục 10.2 dòng c — Mr. Đại chốt Bảng 11 là việc CÓ HẠN
// trong khoảng ngày của kỳ, không phải việc quá hạn còn mở). Hạn = cong_viec.ket_thuc (ViecCay.han) — đúng hạn mà
// base.viec_qua_han đang dùng, nên hai công cụ ra cùng một con số cho cùng một việc.
// Phần thuần: đọc tham số · lọc · chữ trạng thái. Nhanh/chậm nói bằng NGÀY (luật 35), ghi rõ «so với hạn» của việc.
// ─────────────────────────────────────────────────────────────

const KHUON_NGAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "2026-11-30" có thật trên lịch → true; "2026-02-30", "30/11/2026", "2026-11-30T00:00" → false */
export function laNgayIso(s: string): boolean {
  const m = KHUON_NGAY.exec(s);
  if (!m) return false;
  const [y, t, n] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(y, t - 1, n));
  return d.getUTCFullYear() === y && d.getUTCMonth() === t - 1 && d.getUTCDate() === n;
}

export interface KhoangHoi {
  /** yyyy-mm-dd, tính CẢ ngày đầu */
  tu: string;
  /** yyyy-mm-dd, tính CẢ ngày cuối */
  den: string;
  /** true (mặc định) = chỉ việc đang mở; false = cả việc đã xong */
  conMoThoi: boolean;
}

/** Đọc tu_ngay · den_ngay (bắt buộc, yyyy-mm-dd) · con_mo_thoi (mặc định true). Sai thì câu lỗi tiếng Việt cho bên gọi. */
export function docKhoangHoi(ts: Record<string, unknown>): { ok: true; khoang: KhoangHoi } | { ok: false; loi: KhuonTra } {
  const sai = (cau: string) => ({ ok: false as const, loi: thatBai("KHONG_HIEU_YEU_CAU", cau) });
  const tu = chuoi(ts.tu_ngay);
  const den = chuoi(ts.den_ngay);
  if (tu === "" || den === "") return sai("Thiếu `tu_ngay` hoặc `den_ngay` (dạng yyyy-mm-dd, ví dụ tu_ngay 2026-11-01 · den_ngay 2026-11-30).");
  for (const [ten, gt] of [["tu_ngay", tu], ["den_ngay", den]] as const) {
    if (!laNgayIso(gt)) return sai(`\`${ten}\` = "${gt}" không phải ngày dạng yyyy-mm-dd có thật trên lịch (ví dụ 2026-11-30).`);
  }
  if (tu > den) return sai(`\`tu_ngay\` ${ngayVN(tu)} nằm SAU \`den_ngay\` ${ngayVN(den)} — đổi chỗ hai ngày.`);
  const cm = ts.con_mo_thoi;
  let conMoThoi = true;
  if (cm !== undefined && cm !== null && cm !== "") {
    const s = typeof cm === "string" ? cm.trim().toLowerCase() : cm;
    if (s === true || s === 1 || s === "true" || s === "1") conMoThoi = true;
    else if (s === false || s === 0 || s === "false" || s === "0") conMoThoi = false;
    else return sai(`\`con_mo_thoi\` = "${String(cm)}" không hiểu — gửi true (chỉ việc đang mở, mặc định) hoặc false (cả việc đã xong).`);
  }
  return { ok: true, khoang: { tu, den, conMoThoi } };
}

/** Hạn nằm trong [tu, den] (tính cả hai đầu); con_mo_thoi thì bỏ việc đã xong. Hạn sớm trước, cùng hạn thì theo mã việc. */
export function locViecCoHan<T extends Pick<ViecCay, "id" | "han" | "daXong">>(viec: readonly T[], k: KhoangHoi): T[] {
  return viec
    .filter((v) => v.han !== null && v.han >= k.tu && v.han <= k.den && (!k.conMoThoi || !v.daXong))
    .sort((a, b) => a.han!.localeCompare(b.han!) || a.id.localeCompare(b.id));
}

export interface TinhTrangHan {
  trang_thai: "dang_mo" | "da_xong";
  /** Chữ cho người đọc — cùng luật chữ của màn Sơ đồ (components/phong/viec.ts) */
  trang_thai_chu: string;
  /** null = không đo được (việc đã xong mà sổ không ghi ngày xong) */
  da_qua_han: boolean | null;
  /** Số NGÀY so với hạn của việc. Đang mở: hôm nay − hạn (0 = chưa quá). Đã xong: ngày xong − hạn (0 = xong đúng/trước hạn). */
  qua_han_ngay: number | null;
}

export const DINH_NGHIA_VIEC_CO_HAN =
  "Hạn = ngày kết thúc của việc trong sổ cái (cùng hạn base.viec_qua_han dùng); khoảng tính CẢ ngày đầu và ngày cuối. " +
  "qua_han_ngay tính bằng NGÀY so với hạn của việc: việc đang mở = hôm nay − hạn (0 = chưa quá hạn); việc đã xong = ngày xong − hạn " +
  "(0 = xong đúng hoặc trước hạn). ma_wbs chỉ là mã ĐÃ DUYỆT; mã 🤖 chờ duyệt nằm ở ma_wbs_cho_duyet; ten_wbs là tên của mã đi kèm.";

/** Việc đã quá hạn chưa, bao nhiêu NGÀY (luật 35) — so với hạn của chính việc */
export function tinhTrangTheoHan(v: Pick<ViecCay, "daXong" | "han" | "xongNgay">, homNay: string): TinhTrangHan {
  if (v.daXong) {
    const x = v.xongNgay ?? null;
    if (!x) return { trang_thai: "da_xong", trang_thai_chu: "Đã xong — sổ không ghi ngày xong", da_qua_han: null, qua_han_ngay: null };
    const tre = v.han ? cachNgay(v.han, x) : null;
    return {
      trang_thai: "da_xong",
      trang_thai_chu: `Xong ngày ${ngayVN(x)}${tre !== null && tre > 0 ? ` — trễ ${fmtSo(tre)} ngày so với hạn` : ""}`,
      da_qua_han: tre === null ? null : tre > 0,
      qua_han_ngay: tre === null ? null : Math.max(0, tre),
    };
  }
  if (!v.han) return { trang_thai: "dang_mo", trang_thai_chu: "Đang mở — chưa khai hạn", da_qua_han: null, qua_han_ngay: null };
  const con = cachNgay(homNay, v.han);
  if (con < 0) return { trang_thai: "dang_mo", trang_thai_chu: `Đang mở — quá hạn ${fmtSo(-con)} ngày`, da_qua_han: true, qua_han_ngay: -con };
  return { trang_thai: "dang_mo", trang_thai_chu: con === 0 ? "Đang mở — đến hạn hôm nay" : `Đang mở — còn ${fmtSo(con)} ngày`, da_qua_han: false, qua_han_ngay: 0 };
}
