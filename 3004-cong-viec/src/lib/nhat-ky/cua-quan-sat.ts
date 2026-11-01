// ============================================================
// BA CỬA SỔ NHẬT KÝ MỞ CHO AGENT QUAN SÁT (cổng 3014, mã `quansat`) — phần THUẦN
//
// ⭐ VÌ SAO (Mr. Đại muốn 26/09/2026: QUAN SÁT TRỰC QUAN 5 agent phối hợp)
//   Agent quan sát dựng màn Bản đồ · Cột · Dòng chảy · Hội thoại · Hỏi thừa
//   bằng cách HỎI QUA CỔNG MCP từng agent ba công cụ:
//       <ma>.nhat_ky_tong_hop   — số ĐÃ CỘNG trên sổ (theo bên · cặp · công cụ)
//       <ma>.nhat_ky_gan_day    — N dòng THÔ mới nhất, phân trang lùi/tiến
//       <ma>.hoi_thoai_gan_day  — câu hỏi + lý do gọi + câu trả lời gọn
//   Đo 26/09: cả 5 agent đều KHÔNG có ba cửa này → mọi màn của nó trống.
//   Khuôn trả về dưới đây khớp TỪNG TÊN TRƯỜNG với bộ bóc của agent quan sát
//   (`0-agent-quan-sat/src/lib/quan-sat/nhat-ky-qua-mcp.ts` bocTheoBen /
//   bocTheoCap / bocGanDay / hoiDongChayMotAgent / hoiLoiGanDayMotAgent,
//   `hoi-thoai.ts` bocHoiThoai, `hoi-thua.ts` layDongDo). Lệch một tên trường là
//   cột bên đó im lặng về 0 — nên file này GIỐNG HỆT ở 4 app Next (base ·
//   hopdong · main · tiendo) và pháp lý dùng lại qua lớp chuyển đổi Prisma.
//
// ⭐ KHUÔN SỔ BẢN 2 (HOP-DONG-KET-NOI 7.1, 26/09/2026): dòng mới (`phienBanSo: 2`)
//   ghi THẬT `maLuot` · `maChuoi` · `bam` · `loaiLuot` · `vai` · `maLoi` · `traGon`
//   và `traLoi` (nội dung trả lời ≤ 2.000 ký tự, `biCat`) — ba cửa trả đúng các
//   trường đó, lọc `ma_chuoi` chạy thật.
//
// ⚠ LỚP CHUYỂN ĐỔI cho DÒNG CŨ (không có `phienBanSo`) — giữ nguyên cách cũ:
//   · Không có nội dung trả lời đầy đủ, chỉ `traLoiGon` (một dòng ≤ 200 ký tự,
//     Mr. Đại chốt 12/09). `tra_loi.du_lieu` = đúng dòng gọn đó; `bi_cat` =
//     false; `nguon` dựng từ `nguonDan`. Không có `traLoiGon` → `tra_loi: null`
//     + `ghi_chu_tra_loi` nói lý do, không bịa.
//   · Không có mã lượt / mã chuỗi / dấu vân → `null`; `loai_luot` suy từ tên
//     công cụ như trước; `tra_gon` = false.
//
// ⛔ Chỉ ĐỌC. Không LLM, không ghi, không đụng dữ liệu nghiệp vụ.
// ⛔ Tham số trong sổ đã qua `locThamSo` lúc ghi (ẩn theo TÊN trường); ở đây
//    lọc thêm lần nữa theo TÊN và theo DẠNG GIÁ TRỊ (sk-…, AIza…, JWT, chuỗi
//    kết nối có mật khẩu) trước khi đưa ra ngoài.
//
// File THUẦN — không node:fs, không import gì của repo (để chép nguyên văn
// sang 4 app). Phần đọc sổ + bọc khuôn MCP nằm ở `lib/mcp/cua-nhat-ky.ts`.
// ============================================================

/** Một dòng sổ ĐÃ quy mã agent về chuẩn (A04) — đủ trường cho ba cửa */
export interface DongSoQs {
  thoiDiem: string;
  agentHoi: string;
  agentTraLoi: string;
  congCu: string;
  thamSo?: Record<string, unknown>;
  ketQua: string;
  miliGiay?: number | null;
  nguonDan?: string;
  traLoiGon?: string;
  lyDoGoi?: string;
  loi?: string;
  soToken?: number;
  duAn?: string;
  // Khuôn sổ bản 2 — dòng cũ không có (coi là null)
  phienBanSo?: number;
  maLuot?: string;
  maChuoi?: string;
  vai?: string;
  loaiLuot?: string;
  maLoi?: string;
  bam?: string;
  traLoi?: string;
  biCat?: boolean;
  traGon?: boolean;
}

export type KetQuaCua =
  | { ok: true; du_lieu: Record<string, unknown>; vi_tri: string; tong_ca_so: number }
  | { ok: false; ma_loi: "KHONG_CO_DU_LIEU" | "KHONG_CO_QUYEN"; thong_diep: string };

/** Mã agent quan sát — đúng chuỗi trong danh bạ Main */
export const MA_QUAN_SAT = "quansat";

/** Đuôi ba công cụ đọc sổ (tên đầy đủ = `<ma>.<đuôi>`) */
export const DUOI_CONG_CU_NHAT_KY = ["nhat_ky_tong_hop", "nhat_ky_gan_day", "hoi_thoai_gan_day"] as const;

/**
 * 04/10 (Quản lý token AI Đợt 3, Mr. Đại chốt): cửa ĐỌC sổ dùng AI `<ma>.thong_ke_ai` (lib/ai/cua-thong-ke-ai.ts) — Agent quan
 * sát gom 6 agent lên một màn + 🤖 nhận định đêm. Có tên người dùng → chỉ quansat (hoặc khoá nội bộ) đọc, như hoi_thoai_gan_day.
 */
export const DUOI_CONG_CU_THONG_KE_AI = "thong_ke_ai";

/**
 * ⭐ LUẬT CỨNG (26/09): agent quan sát CHỈ được gọi ba cửa nhật ký + `suc_khoe`
 * + `nang_luc` của mọi agent. Không bao giờ được gọi công cụ ghi. Ma trận ở
 * Main là theo CẶP agent, không theo công cụ — nên luật theo công cụ nằm ở đây.
 */
export const CONG_CU_QUAN_SAT_DUOC_GOI: readonly string[] = [...DUOI_CONG_CU_NHAT_KY, DUOI_CONG_CU_THONG_KE_AI, "suc_khoe", "nang_luc"];

/** Bỏ tiền tố `<ma>.` để so đuôi công cụ */
export function duoiCongCu(congCu: string): string {
  const s = (congCu ?? "").trim();
  const i = s.indexOf(".");
  return i >= 0 ? s.slice(i + 1) : s;
}

/**
 * Agent quan sát có được gọi công cụ này không. `themDuoc` = công cụ ĐỌC hạ
 * tầng riêng của cổng đó (Main: danh bạ · ma trận · dữ liệu dùng chung) mà agent
 * quan sát cần để biết hệ có mấy con.
 */
export function quanSatDuocGoi(congCu: string, themDuoc: readonly string[] = []): boolean {
  const s = (congCu ?? "").trim();
  if (themDuoc.includes(s)) return true;
  if (s === "suc_khoe" || s === "nang_luc") return true;
  if (duoiCongCu(s) === DUOI_CONG_CU_THONG_KE_AI && s.includes(".")) return true;
  return (DUOI_CONG_CU_NHAT_KY as readonly string[]).includes(duoiCongCu(s)) && s.includes(".");
}

export function cauTuChoiQuanSat(congCu: string, tenAgent: string): string {
  return (
    `Agent quan sát chỉ được gọi công cụ ĐỌC nhật ký (nhat_ky_tong_hop · nhat_ky_gan_day · hoi_thoai_gan_day) · thong_ke_ai ` +
    `và suc_khoe · nang_luc — không được gọi "${congCu}" của ${tenAgent} (luật chỉ đọc, chốt 26/09/2026).`
  );
}

/**
 * Hai luật theo CÔNG CỤ mà ma trận theo cặp của Main không diễn đạt được:
 *   ① `quansat` gọi công cụ ngoài danh sách đọc → chặn (luật chỉ đọc 26/09)
 *   ② `<ma>.hoi_thoai_gan_day` mang tham số + câu trả lời → chỉ `quansat` đọc
 *      (bài đo nội bộ có khoá `x-sci-noi-bo` vẫn qua)
 * `agentGoi` phải là mã ĐÃ chuẩn hoá (A04).
 */
export function xetLuatQuanSat(
  agentGoi: string,
  congCu: string,
  tenAgent: string,
  coKhoaNoiBo = false,
  themDuoc: readonly string[] = []
): { duoc: true } | { duoc: false; lyDo: string } {
  if (agentGoi === MA_QUAN_SAT && !quanSatDuocGoi(congCu, themDuoc)) {
    return { duoc: false, lyDo: cauTuChoiQuanSat(congCu, tenAgent) };
  }
  if (duoiCongCu(congCu) === "hoi_thoai_gan_day" && congCu.includes(".") && agentGoi !== MA_QUAN_SAT && !coKhoaNoiBo) {
    return {
      duoc: false,
      lyDo: `Hội thoại mang tham số và câu trả lời — chỉ Agent quan sát (quansat) được đọc "${congCu}" của ${tenAgent}.`,
    };
  }
  if (duoiCongCu(congCu) === DUOI_CONG_CU_THONG_KE_AI && congCu.includes(".") && agentGoi !== MA_QUAN_SAT && !coKhoaNoiBo) {
    return {
      duoc: false,
      lyDo: `Thống kê dùng AI có tên người dùng — chỉ Agent quan sát (quansat) được đọc "${congCu}" của ${tenAgent}.`,
    };
  }
  return { duoc: true };
}

/** Dòng khai `nang_luc` cho cửa thống kê dùng AI (04/10, Quản lý token AI Đợt 3) */
export function danhMucCongCuThongKeAi(ma: string): { ten: string; mo_ta: string; tham_so: string; san_sang: boolean }[] {
  return [
    {
      ten: `${ma}.${DUOI_CONG_CU_THONG_KE_AI}`,
      mo_ta:
        "Sổ dùng AI của agent này ĐÃ CỘNG: token theo tài khoản (TK1 · TK2 · cá nhân · API), phút AI chạy, phút ngừng vì hết hạn mức, 5 người + 5 tính năng tốn nhất, sự kiện tài khoản; kèm tình hình tài khoản (không email, không mã). Chỉ Agent quan sát được đọc",
      tham_so: "che_do? (ngay|tuan|thang), ngay? (YYYY-MM-DD) — hoặc tu_luc, den_luc (ISO, ≤ 8 ngày)",
      san_sang: true,
    },
  ];
}

/** Ba dòng khai cho `nang_luc` — cùng khuôn DANH_MUC của các cổng */
export function danhMucCongCuNhatKy(ma: string): { ten: string; mo_ta: string; tham_so: string; san_sang: boolean }[] {
  return [
    {
      ten: `${ma}.nhat_ky_tong_hop`,
      mo_ta:
        "Sổ hỏi–đáp của agent này ĐÃ CỘNG: theo bên được hỏi · theo cặp hỏi→trả lời · theo cặp+công cụ (số lượt, ok/lỗi, trung vị/chậm nhất ms). Chỉ đọc — mở cho Agent quan sát",
      tham_so: "tu_luc?, den_luc? (ISO), gioi_han? (≤100 dòng mỗi bảng)",
      san_sang: true,
    },
    {
      ten: `${ma}.nhat_ky_gan_day`,
      mo_ta: "N dòng sổ hỏi–đáp mới nhất (không kèm tham số) kèm mã lượt · mã chuỗi · dấu vân · loại lượt (khuôn sổ bản 2), lùi trang bằng truoc_moc, lấy phần mới bằng sau_moc. Chỉ đọc",
      tham_so: "gioi_han? (≤100), chi_loi?, truoc_moc?, sau_moc?",
      san_sang: true,
    },
    {
      ten: `${ma}.hoi_thoai_gan_day`,
      mo_ta:
        "Hội thoại: ai hỏi · hỏi gì (tham số đã lọc khoá) · vì sao · được trả lời gì (khuôn sổ bản 2: nội dung ≤ 2.000 ký tự; dòng cũ: dòng gọn) · mã lượt · mã chuỗi. Mặc định lượt nghiệp vụ + dòng gốc, bỏ hạ tầng. Lọc được theo ma_chuoi. Chỉ Agent quan sát được đọc",
      tham_so: "gioi_han? (≤100), loai? (nghiep-vu|tat-ca), truoc_moc?, sau_moc?, ma_chuoi?",
      san_sang: true,
    },
  ];
}

// ─────────────────────────────────────────────────────────────
// Tiện ích nhỏ
// ─────────────────────────────────────────────────────────────

export const TRAN_DONG = 100;
const MAC_DINH_GAN_DAY = 20;

export function chanGioiHan(v: unknown, macDinh = MAC_DINH_GAN_DAY): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) return macDinh;
  return Math.min(Math.floor(n), TRAN_DONG);
}

function chuoi(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Mốc ISO đọc được → số ms; không đọc được → null */
function mocMs(v: unknown): number | null {
  const s = chuoi(v);
  if (s === "") return null;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}

function tMs(d: DongSoQs): number {
  const t = Date.parse(d.thoiDiem);
  return Number.isNaN(t) ? 0 : t;
}

/** Trung vị. Mảng rỗng → null (0 ms là "nhanh tức thì", khác "chưa đo") */
export function trungVi(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = xs.slice().sort((a, b) => a - b);
  const g = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[g] : Math.round((s[g - 1] + s[g]) / 2);
}

function msCua(ds: DongSoQs[]): number[] {
  return ds.map((x) => x.miliGiay).filter((x): x is number => typeof x === "number" && Number.isFinite(x) && x >= 0);
}

function ganNhat(ds: DongSoQs[]): string | null {
  return ds.length === 0 ? null : ds.reduce((m, x) => (x.thoiDiem > m ? x.thoiDiem : m), ds[0].thoiDiem);
}

function laLoi(d: DongSoQs): boolean {
  return d.ketQua === "loi";
}
/** Mã chuẩn các agent của hệ (A04) — chép từ khuon-so.ts để file này không import gì */
const MA_AGENT_HE: readonly string[] = ["tiendo", "hopdong", "base", "phaply", "main", "quansat"];

/**
 * "ok mà không nguồn là vi phạm" — 7.1: CHỈ xét lượt nghiệp vụ tới MỘT AGENT
 * (không xét hạ tầng, LLM, Drive, Base.vn, dòng gốc).
 */
function laOkKhongNguon(d: DongSoQs): boolean {
  return (
    d.ketQua === "ok" &&
    (d.nguonDan ?? "").trim() === "" &&
    loaiCuaDong(d) === "nghiep-vu" &&
    MA_AGENT_HE.includes(d.agentTraLoi)
  );
}

function laDongV2(d: DongSoQs): boolean {
  return d.phienBanSo === 2;
}

/**
 * Số lần NGẮT MẠCH (HOP-DONG-KET-NOI 6.1 luật 2). Khuôn sổ bản 2 ghi một dòng
 * `ngat_mach` đúng lúc mạch mở → đếm các dòng đó. Dòng CŨ không có → suy như
 * trước từ chuỗi ≥ 3 lỗi liên tiếp.
 */
export function demNgatMach(ds: DongSoQs[]): number {
  const that = ds.filter((d) => duoiCongCu(d.congCu) === "ngat_mach").length;
  const theoGio = ds.filter((d) => !laDongV2(d)).sort((a, b) => a.thoiDiem.localeCompare(b.thoiDiem));
  let lien = 0;
  let lan = 0;
  for (const d of theoGio) {
    if (laLoi(d)) {
      lien += 1;
      if (lien === 3) lan += 1;
    } else lien = 0;
  }
  return that + lan;
}

function topTheo(ds: DongSoQs[], khoa: (d: DongSoQs) => string, n: number): { ma: string; so: number }[] {
  const dem = new Map<string, number>();
  for (const d of ds) {
    const k = khoa(d);
    if (k !== "") dem.set(k, (dem.get(k) ?? 0) + 1);
  }
  return Array.from(dem.entries())
    .map(([ma, so]) => ({ ma, so }))
    .sort((a, b) => b.so - a.so)
    .slice(0, n);
}

function gom(ds: DongSoQs[], khoa: (d: DongSoQs) => string | null): Map<string, DongSoQs[]> {
  const m = new Map<string, DongSoQs[]>();
  for (const d of ds) {
    const k = khoa(d);
    if (k === null) continue;
    const b = m.get(k) ?? [];
    b.push(d);
    m.set(k, b);
  }
  return m;
}

// ─────────────────────────────────────────────────────────────
// Phân loại lượt + lọc khoá
// ─────────────────────────────────────────────────────────────

export type LoaiLuot = "goc" | "nghiep-vu" | "ha-tang" | "kiem-dinh";

/** Công cụ HẠ TẦNG — đọc sổ, kéo danh bạ/cấu hình, sức khoẻ: không phải hội thoại nghiệp vụ */
const CONG_CU_HA_TANG =
  /^(nang_luc|suc_khoe|[a-z_]+\.(nhat_ky_gan_day|nhat_ky_tong_hop|hoi_thoai_gan_day|danh_ba|ma_tran_goi|cau_hinh_chung|du_lieu_dung_chung))$/;

/** Suy loại lượt cho DÒNG CŨ (dòng khuôn bản 2 đã ghi `loaiLuot` thật — xem `loaiCuaDong`) */
export function phanLoaiLuot(agentHoi: string, congCu: string, lyDoGoi: string): LoaiLuot {
  const hoi = (agentHoi ?? "").trim().toLowerCase();
  if (hoi === "sci-khung-dieu-hanh" || hoi === "scikhungdieuhanh" || /^(kiem dinh|kiểm định)/i.test((lyDoGoi ?? "").trim())) {
    return "kiem-dinh";
  }
  if (CONG_CU_HA_TANG.test((congCu ?? "").trim())) return "ha-tang";
  return "nghiep-vu";
}

/** Loại lượt của một dòng: trường ghi thật (khuôn bản 2), dòng cũ thì suy như trước */
export function loaiCuaDong(d: DongSoQs): LoaiLuot {
  const l = d.loaiLuot;
  if (l === "goc" || l === "nghiep-vu" || l === "ha-tang" || l === "kiem-dinh") return l;
  return phanLoaiLuot(d.agentHoi, d.congCu, d.lyDoGoi ?? "");
}

const TEN_NGHI_LA_KHOA = /(token|key|secret|password|mat_khau|matkhau|authorization|cookie|oauth|credential)/i;
const GIA_TRI_NGHI_LA_KHOA = [
  /sk-ant-[A-Za-z0-9_-]{10,}/g,
  /\bsk-(?:proj-)?[A-Za-z0-9]{20,}/g,
  /\bAIza[0-9A-Za-z_-]{30,}/g,
  /\bgh[pousr]_[A-Za-z0-9]{30,}/g,
  /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  /\b((?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^:\s"'/]+:)[^@\s"']+@/g,
];

/** Ẩn khoá theo TÊN trường (đệ quy) và theo DẠNG giá trị */
export function lamSach(v: unknown, sau = 0): unknown {
  if (sau > 8) return "«quá sâu»";
  if (typeof v === "string") {
    let s = v;
    for (const m of GIA_TRI_NGHI_LA_KHOA) {
      s = s.replace(m, (x: string, dau: unknown) =>
        typeof dau === "string" && x.startsWith(dau) ? `${dau}«đã ẩn»@` : "«đã ẩn»"
      );
    }
    return s;
  }
  if (Array.isArray(v)) return v.map((x) => lamSach(x, sau + 1));
  if (v !== null && typeof v === "object") {
    const ra: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      ra[k] = TEN_NGHI_LA_KHOA.test(k) ? "«đã ẩn»" : lamSach(x, sau + 1);
    }
    return ra;
  }
  return v;
}

// ─────────────────────────────────────────────────────────────
// ① <ma>.nhat_ky_tong_hop
// ─────────────────────────────────────────────────────────────

/**
 * `dong` = CẢ SỔ, mới nhất trước. `tu_luc`/`den_luc` (ISO, tuỳ chọn) cắt
 * khoảng thời gian [tu_luc, den_luc). Khuôn `theo_ben` · `theo_cap` giữ đúng tên
 * trường bộ bóc của agent quan sát; `theo_cong_cu` là bảng mới (cặp + công cụ).
 */
export function tongHopSo(dong: DongSoQs[], ts: Record<string, unknown>, tenSo: string): KetQuaCua {
  if (dong.length === 0) {
    return { ok: false, ma_loi: "KHONG_CO_DU_LIEU", thong_diep: `Sổ hỏi–đáp của ${tenSo} chưa có dòng nào nên chưa cộng được gì.` };
  }
  const tu = mocMs(ts.tu_luc);
  const den = mocMs(ts.den_luc);
  const gioiHan = chanGioiHan(ts.gioi_han, TRAN_DONG);
  const loc = dong.filter((d) => {
    const t = tMs(d);
    return (tu === null || t >= tu) && (den === null || t < den);
  });

  const theoBen = Array.from(gom(loc, (d) => d.agentTraLoi || "—").entries())
    .map(([ben, ds]) => {
      const soLoi = ds.filter(laLoi).length;
      const ms = msCua(ds);
      const coToken = ds.filter((x) => typeof x.soToken === "number");
      const thieu = ds.filter(laOkKhongNguon);
      return {
        ben,
        so_luot: ds.length,
        so_ok: ds.filter((x) => x.ketQua === "ok").length,
        so_loi: soLoi,
        so_khong_co_du_lieu: ds.filter((x) => x.ketQua === "khong-co-du-lieu").length,
        ty_le_loi: Math.round((soLoi / ds.length) * 1000) / 10,
        giua_ms: trungVi(ms),
        cham_nhat_ms: ms.length === 0 ? null : Math.max(...ms),
        so_ok_khong_nguon: thieu.length,
        cong_cu_thieu_nguon: topTheo(thieu, (d) => d.congCu, 3).map((t) => ({ cong_cu: t.ma, so: t.so })),
        so_lan_ngat_mach: demNgatMach(ds),
        // null = không lượt nào đo được token. KHÔNG đổi thành 0.
        tong_token: coToken.length > 0 ? coToken.reduce((s, x) => s + (x.soToken ?? 0), 0) : null,
        so_luot_khong_do_token: ds.length - coToken.length,
        luot_gan_nhat: ganNhat(ds),
      };
    })
    .sort((a, b) => b.so_luot - a.so_luot);

  const theoCap = Array.from(gom(loc, (d) => (d.agentHoi.trim() === "" ? null : `${d.agentHoi.trim()}\u0000${d.agentTraLoi}`)).entries())
    .map(([k, ds]) => {
      const [hoi, traLoi] = k.split("\u0000");
      const ms = msCua(ds);
      const hay = topTheo(ds, (d) => d.congCu, 1);
      return {
        hoi,
        tra_loi: traLoi,
        so_luot: ds.length,
        so_ok: ds.filter((x) => x.ketQua === "ok").length,
        so_loi: ds.filter(laLoi).length,
        so_ok_khong_nguon: ds.filter(laOkKhongNguon).length,
        giua_ms: trungVi(ms),
        cham_nhat_ms: ms.length === 0 ? null : Math.max(...ms),
        cong_cu_hay: hay.length > 0 ? hay[0].ma : null,
        luot_gan_nhat: ganNhat(ds),
      };
    })
    .sort((a, b) => b.so_luot - a.so_luot);

  const theoCongCu = Array.from(
    gom(loc, (d) => (d.agentHoi.trim() === "" ? null : `${d.agentHoi.trim()}\u0000${d.agentTraLoi}\u0000${d.congCu}`)).entries()
  )
    .map(([k, ds]) => {
      const [hoi, traLoi, congCu] = k.split("\u0000");
      const ms = msCua(ds);
      return {
        hoi,
        tra_loi: traLoi,
        cong_cu: congCu,
        so_luot: ds.length,
        so_ok: ds.filter((x) => x.ketQua === "ok").length,
        so_loi: ds.filter(laLoi).length,
        so_khong_co_du_lieu: ds.filter((x) => x.ketQua === "khong-co-du-lieu").length,
        giua_ms: trungVi(ms),
        cham_nhat_ms: ms.length === 0 ? null : Math.max(...ms),
        luot_gan_nhat: ganNhat(ds),
      };
    })
    .sort((a, b) => b.so_luot - a.so_luot);

  const benCon = Math.max(0, theoBen.length - gioiHan);
  const capCon = Math.max(0, theoCap.length - gioiHan);
  const ccCon = Math.max(0, theoCongCu.length - gioiHan);
  return {
    ok: true,
    tong_ca_so: dong.length,
    vi_tri: `cộng ${loc.length} lượt${tu !== null || den !== null ? " trong khoảng" : " cả sổ"}: ${theoBen.length} bên · ${theoCap.length} cặp · ${theoCongCu.length} cặp+công cụ`,
    du_lieu: {
      // `tong_luot` = số lượt ĐÃ CỘNG (trong khoảng nếu có tu_luc/den_luc)
      tong_luot: loc.length,
      tong_luot_ca_so: dong.length,
      tong: loc.length,
      con_lai: benCon + capCon + ccCon,
      tu_luc: tu === null ? null : new Date(tu).toISOString(),
      den_luc: den === null ? null : new Date(den).toISOString(),
      so_ben: theoBen.length,
      so_cap: theoCap.length,
      so_cong_cu: theoCongCu.length,
      theo_ben: theoBen.slice(0, gioiHan),
      theo_cap: theoCap.slice(0, gioiHan),
      theo_cong_cu: theoCongCu.slice(0, gioiHan),
      ben_con_lai: benCon,
      cap_con_lai: capCon,
      cong_cu_con_lai: ccCon,
      ghi_chu:
        loc.length === 0
          ? "Không có lượt nào trong khoảng đã hỏi — đây là SỰ THẬT ĐÃ ĐO, không phải lỗi."
          : "Mã agent đã quy về chuẩn (A04). ms = mili giây đo ở bên ghi sổ.",
    },
  };
}

// ─────────────────────────────────────────────────────────────
// ② <ma>.nhat_ky_gan_day
// ─────────────────────────────────────────────────────────────

function dongRa(d: DongSoQs) {
  return {
    thoi_diem: d.thoiDiem,
    agent_hoi: d.agentHoi,
    agent_tra_loi: d.agentTraLoi,
    cong_cu: d.congCu,
    ket_qua: d.ketQua,
    mili_giay: typeof d.miliGiay === "number" ? d.miliGiay : null,
    // Rỗng GIỮ NGUYÊN là rỗng — dấu hiệu "không dẫn nguồn" để bên quan sát bôi lên.
    nguon_dan: d.nguonDan ?? "",
    ly_do_goi: d.lyDoGoi ?? "",
    du_an: d.duAn ?? null,
    tra_loi_gon: d.traLoiGon ?? null,
    // Khuôn sổ bản 2 ghi thật; dòng cũ không có → null, KHÔNG bịa (xem đầu file)
    ma_luot: d.maLuot ?? null,
    ma_chuoi: d.maChuoi ?? null,
    bam_tra_loi: d.bam ?? null,
    loai_luot: loaiCuaDong(d),
    tra_gon: d.traGon === true,
    vai: d.vai ?? null,
    ma_loi: d.maLoi ?? null,
  };
}

/**
 * `dong` = CẢ SỔ, mới nhất trước. Hai kiểu phân trang (khớp agent quan sát):
 *   · `truoc_moc` → dòng CŨ HƠN HẲN mốc (`<`), trả `moc_tiep` + `con_trang_sau`
 *   · `sau_moc`   → dòng MỚI HƠN HẲN mốc, lấy phần CŨ NHẤT trong phần mới để đi
 *                   tiếp không sót; trả `da_dung_sau_moc` + `moc_tiep_sau` + `con_dong_moi_hon`
 */
export function ganDaySo(dong: DongSoQs[], ts: Record<string, unknown>, tenSo: string): KetQuaCua {
  if (dong.length === 0) {
    return { ok: false, ma_loi: "KHONG_CO_DU_LIEU", thong_diep: `Sổ hỏi–đáp của ${tenSo} chưa có dòng nào.` };
  }
  const gioiHan = chanGioiHan(ts.gioi_han);
  const chiLoi = ts.chi_loi === true;
  const truocTho = chuoi(ts.truoc_moc);
  const truoc = mocMs(truocTho);
  const sauTho = chuoi(ts.sau_moc);
  const sau = mocMs(sauTho);
  const nen = chiLoi ? dong.filter(laLoi) : dong;

  if (sau !== null) {
    const moi = nen.filter((d) => tMs(d) > sau && (truoc === null || tMs(d) < truoc));
    const trang = moi.slice(-gioiHan);
    return {
      ok: true,
      tong_ca_so: dong.length,
      vi_tri: `${trang.length} dòng mới hơn mốc ${sauTho}`,
      du_lieu: {
        tong_luot: dong.length,
        tong: moi.length,
        so_dong_tra: trang.length,
        con_lai: Math.max(0, moi.length - trang.length),
        da_dung_sau_moc: sauTho,
        moc_tiep_sau: trang.length > 0 ? trang[0].thoiDiem : sauTho,
        con_dong_moi_hon: moi.length > trang.length,
        dong: trang.map(dongRa),
        ghi_chu:
          trang.length === 0
            ? "Không có dòng nào mới hơn mốc — đây là SỰ THẬT ĐÃ ĐO, không phải lỗi."
            : moi.length > trang.length
              ? `Còn ${moi.length - trang.length} dòng mới hơn — gọi lại với sau_moc = moc_tiep_sau.`
              : "Đã lấy hết phần mới.",
      },
    };
  }

  const conLai = truoc === null ? nen : nen.filter((d) => tMs(d) < truoc);
  const lay = conLai.slice(0, gioiHan);
  return {
    ok: true,
    tong_ca_so: dong.length,
    vi_tri: truoc === null ? `${lay.length} dòng mới nhất` : `${lay.length} dòng cũ hơn mốc ${truocTho}`,
    du_lieu: {
      // 0 dòng ở đây là SỰ THẬT ĐÃ ĐO (vd chi_loi mà sổ không có lỗi)
      tong_luot: dong.length,
      tong: conLai.length,
      so_dong_tra: lay.length,
      con_lai: Math.max(0, conLai.length - lay.length),
      moc_tiep: lay.length > 0 ? lay[lay.length - 1].thoiDiem : null,
      con_trang_sau: conLai.length > lay.length,
      da_dung_moc: truoc === null ? null : truocTho,
      chi_loi: chiLoi,
      dong: lay.map(dongRa),
      ghi_chu:
        "Không kèm cột tham số — cửa này để dựng dòng chảy; tham số xem ở hoi_thoai_gan_day." +
        (truocTho !== "" && truoc === null
          ? ` ⚠ truoc_moc = "${truocTho}" không đọc được thành thời điểm nên đã BỎ QUA — đây là trang ĐẦU.`
          : "") +
        (conLai.length > lay.length ? ` Còn ${conLai.length - lay.length} dòng cũ hơn — gọi lại với truoc_moc = moc_tiep.` : ""),
    },
  };
}

// ─────────────────────────────────────────────────────────────
// ③ <ma>.hoi_thoai_gan_day
// ─────────────────────────────────────────────────────────────

/** Tách khuôn `traLoiGonTuKhuon` lúc hỏng: "khong-co · MA_LOI · thông điệp" */
function bocGonLoi(gon: string): { maLoi: string | null; thongDiep: string } | null {
  if (!gon.startsWith("khong-co")) return null;
  const phan = gon.split(" · ");
  const ma = (phan[1] ?? "").trim();
  return { maLoi: ma === "" || ma === "?" ? null : ma, thongDiep: phan.slice(2).join(" · ").trim() };
}

/**
 * Câu trả lời của một lượt. Dòng khuôn bản 2 có `traLoi` (≤ 2.000 ký tự) →
 * `du_lieu` = đúng nội dung đó; dòng cũ → dựng từ dòng gọn (lớp chuyển đổi).
 */
export function traLoiTuDong(d: DongSoQs): Record<string, unknown> | null {
  const gon = (d.traLoiGon ?? "").trim();
  const nguon = (d.nguonDan ?? "")
    .split(" · ")
    .map((s) => s.trim())
    .filter((s) => s !== "")
    .map((s) => ({ loai: "nguon-dan", ma: "nguồn dẫn", file_goc: s }));
  if (typeof d.traLoi === "string") {
    const ok = d.ketQua === "ok";
    return {
      ok,
      ma_loi: d.maLoi ?? null,
      thong_diep: ok ? null : (d.loi ?? "").trim() || null,
      du_lieu: String(lamSach(d.traLoi)),
      bi_cat: d.biCat === true,
      so_nguon: nguon.length,
      nguon,
      canh_bao: [],
      bam: d.bam ?? null,
    };
  }
  if (gon === "" && !(d.ketQua === "loi" && (d.loi ?? "").trim() !== "")) return null;
  const hong = bocGonLoi(gon);
  const ok = d.ketQua !== "loi" && hong === null;
  return {
    ok,
    ma_loi: hong?.maLoi ?? null,
    thong_diep: hong?.thongDiep || (d.ketQua === "loi" ? (d.loi ?? "").trim() || null : null),
    du_lieu: hong === null && gon !== "" ? String(lamSach(gon)) : null,
    bi_cat: false,
    so_nguon: nguon.length,
    nguon,
    canh_bao: [],
    bam: d.bam ?? null,
  };
}

export function hoiThoaiSo(dong: DongSoQs[], ts: Record<string, unknown>, tenSo: string): KetQuaCua {
  if (dong.length === 0) {
    return { ok: false, ma_loi: "KHONG_CO_DU_LIEU", thong_diep: `Sổ hỏi–đáp của ${tenSo} chưa có dòng nào.` };
  }
  const gioiHan = chanGioiHan(ts.gioi_han);
  const loai = chuoi(ts.loai) === "tat-ca" ? "tat-ca" : "nghiep-vu";
  const maChuoi = chuoi(ts.ma_chuoi);
  const truoc = mocMs(ts.truoc_moc);
  const sau = mocMs(ts.sau_moc);

  const loc = dong.filter((d) => {
    // Mặc định: lượt nghiệp vụ + dòng gốc chuỗi (câu người hỏi → câu trả lời cuối); bỏ hạ tầng, kiểm định
    if (loai === "nghiep-vu") {
      const l = loaiCuaDong(d);
      if (l !== "nghiep-vu" && l !== "goc") return false;
    }
    // Khuôn bản 2 ghi mã chuỗi thật; dòng cũ không có mã nên không bao giờ khớp
    if (maChuoi !== "" && d.maChuoi !== maChuoi) return false;
    if (truoc !== null && !(tMs(d) < truoc)) return false;
    if (sau !== null && !(tMs(d) > sau)) return false;
    return true;
  });
  const lay = sau !== null ? loc.slice(-gioiHan) : loc.slice(0, gioiHan);

  return {
    ok: true,
    tong_ca_so: dong.length,
    vi_tri: `hội thoại ${loai}: ${lay.length} lượt trên ${loc.length} sau lọc`,
    du_lieu: {
      tong_luot_ca_so: dong.length,
      tong_luot_sau_loc: loc.length,
      tong: loc.length,
      con_lai: Math.max(0, loc.length - lay.length),
      loai,
      so_dong_tra: lay.length,
      moc_tiep: lay.length > 0 ? lay[lay.length - 1].thoiDiem : null,
      moc_tiep_sau: lay.length > 0 ? lay[0].thoiDiem : null,
      con_nua: loc.length > lay.length,
      con_trang_sau: loc.length > lay.length,
      dong: lay.map((d) => {
        const t = traLoiTuDong(d);
        return {
          ma_luot: d.maLuot ?? null,
          ma_chuoi: d.maChuoi ?? null,
          vai: d.vai ?? null,
          thoi_diem: d.thoiDiem,
          agent_hoi: d.agentHoi,
          agent_tra_loi: d.agentTraLoi,
          cong_cu: d.congCu,
          tham_so: lamSach(d.thamSo ?? {}),
          ly_do_goi: d.lyDoGoi ?? "",
          ket_qua: d.ketQua,
          mili_giay: typeof d.miliGiay === "number" ? d.miliGiay : null,
          nguon_dan: d.nguonDan ?? "",
          loi: (d.loi ?? "").trim() || null,
          ma_loi: d.maLoi ?? null,
          loai_luot: loaiCuaDong(d),
          bam_tra_loi: d.bam ?? null,
          tra_gon: d.traGon === true,
          tra_loi: t,
          ghi_chu_tra_loi: t
            ? null
            : "Sổ không có dòng trả lời gọn cho lượt này (lượt ghi trước 12/09/2026 hoặc chỗ gọi không rút được) — không bịa.",
        };
      }),
      ghi_chu:
        (maChuoi !== "" && loc.length === 0
          ? `Không có lượt nào mang mã chuỗi "${maChuoi}" (dòng ghi trước khuôn sổ bản 2 không có mã chuỗi). `
          : "") +
        "Dòng khuôn sổ bản 2: câu trả lời = nội dung sổ ghi (≤ 2.000 ký tự, bi_cat khi bị cắt). " +
        "Dòng cũ: câu trả lời = dòng gọn (≤ 200 ký tự), KHÔNG phải nội dung đầy đủ.",
    },
  };
}
