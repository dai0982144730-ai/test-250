// ============================================================
// cay-viec/thuan.ts — MÀN "CÂY VIỆC & ĐƯỜNG GĂNG" (chép từ agent Base, Mr. Đại chốt 03/10/2026). File THUẦN: client import
// được (luật 10), test được không cần CSDL.
//
// Khác agent Base ĐÚNG MỘT CHỖ — nguồn việc:
//   Base:        việc trên Base.vn (khoá API, không gian) → khuôn ViecBase (lib/nguon-base.ts)
//   Công việc:   việc trong SỔ CÁI của chính agent này (sinh từ báo cáo tuần + giao tay) → khuôn ViecCay dưới đây,
//                mã WBS lấy từ bảng docflow.wbs_viec (db/80-gan-wbs.sql) thay cho file data/gan-wbs/<dự án>.json của Base.
// Ánh xạ trạng thái gắn: Base "ai_gan" (🤖 chấm vàng) ↔ 'cho_duyet'; Base "da_soat" ↔ 'da_duyet'; canCu ↔ ly_do; doChac ↔ do_chac.
// Mọi phép đếm ở đây là CODE, không LLM (phân vai 06/09). Công thức 4 thẻ giữ đúng bản Base (Mr. Đại chốt 10/09).
// ============================================================
import type { WbsViec } from "@/lib/gan-wbs/thuan";

/** Đường gắn mã của một việc — thay DuongGanMa của Base ("truong-tuy-bien" | "the" | "ten-viec" | "llm") */
export type DuongGan = "ai" | "nguoi" | "ten_viec";

/** Một việc của sổ cái treo dưới nút WBS — cùng hình với ViecBase của agent Base */
export interface ViecCay {
  /** Mã việc sổ cái, vd CV-2026-0074 */
  id: string;
  ten: string;
  /** Mã người (email) hoặc mã đơn vị chủ trì. Rỗng = chưa giao cho ai */
  nguoiPhuTrach: string;
  loaiPhuTrach: "nguoi" | "don_vi" | null;
  /** Tên thật của người / đơn vị chủ trì — màn hiện tên, không hiện email trần */
  tenNguoi: string;
  daXong: boolean;
  /** Ngày xong (yyyy-mm-dd, giờ VN) = cong_viec.dong_luc — chỉ việc đã xong (dòng "Xong ngày …", Mr. Đại chốt 05/10) */
  xongNgay?: string | null;
  /** Hạn = cong_viec.ket_thuc (yyyy-mm-dd) */
  han: string | null;
  /** Lúc giao việc (ISO) — agent khác cần để biết việc giao TRƯỚC hay SAU nháp của nó (tự đóng việc chờ duyệt, Mr. Đại duyệt 08/10) */
  giaoLuc?: string | null;
  /** Quá hạn bao nhiêu ngày. null = không hạn hoặc đã xong */
  quaHanNgay: number | null;
  /** Nằm im bao nhiêu ngày — từ lần ghi lịch sử gần nhất của việc. null = đã xong hoặc không đo được */
  namImNgay: number | null;
  /** Mở việc trong agent Công việc */
  link: string;
  /** null = chưa có dòng gắn nào */
  duongGanMa: DuongGan | null;
  maWbs: string | null;
  canCuGan?: string;
  /** true = dòng 🤖 còn chờ duyệt (chấm vàng) */
  aiGanChuaSoat?: boolean;
  /** 0–1; undefined = AI không chấm */
  doChacGan?: number;
  /** Người đang xem có quyền "Duyệt gắn WBS" cho việc này (quyền ẩn/hiện ✎ và Duyệt — luật riêng 3004) */
  duyetDuoc: boolean;
}

/** Một nút trên cây theo giai đoạn — cùng hình NutCay của agent Base */
export interface NutCay {
  wbs: string;
  ten: string;
  pct: number;
  gang: boolean;
  /** Ngày bắt đầu / kết thúc baseline (yyyy-mm-dd) — hạn để AI soạn việc giao */
  start: string;
  end: string;
  nhaThau: string;
  viec: ViecCay[];
  daCoAiNhan: boolean;
  /** Người đã đánh dấu "Việc này không cần giao trong agent Công việc" */
  khongCanGiao: boolean;
  /** Việc LÁ (không có đầu việc con) — chỉ việc lá mới đếm / soạn giao (Mr. Đại chốt 04/10) */
  laLa: boolean;
  /** Việc lá, chưa xong, ngày bắt đầu baseline ≤ hôm nay + cửa sổ giao (Cài đặt › Gắn việc vào WBS) */
  denLucGiao: boolean;
  /** Số ngày từ hôm nay tới ngày bắt đầu (âm = đã qua); null = không có ngày */
  conNgay: number | null;
  con: NutCay[];
}

/** Một dòng đọc từ sổ cái (cong_viec + phần chủ trì + lịch sử) */
export interface DongSoCai {
  id: string;
  ten: string;
  trang_thai: string;
  ket_thuc: string | null;
  pt_loai: "nguoi" | "don_vi" | null;
  pt_id: string | null;
  pt_ten: string | null;
  /** Lần ghi lịch sử gần nhất (hoặc lúc tạo việc) — ISO */
  cap_nhat_cuoi: string | null;
  /** Ngày xong yyyy-mm-dd (giờ VN) — chỉ việc hoàn thành */
  xong_ngay?: string | null;
  /** Lúc giao (cong_viec.tao_luc, ISO) */
  tao_luc?: string | null;
}

/** Đầu việc thô agent Tiến độ trả (tiendo.tim_dau_viec) */
export interface DauViecCay {
  wbs: string;
  name?: string;
  pct?: number;
  critical?: boolean;
  start?: string;
  end?: string;
  contractor?: string;
}

const NGAY_MS = 86_400_000;
const msNgay = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));

/** Ánh xạ MỘT việc sổ cái → khuôn việc của màn (chỗ duy nhất khác Base) */
export function anhXaViec(d: DongSoCai, gan: WbsViec | undefined, homNay: string, bayGioMs: number, duyetDuoc: boolean): ViecCay {
  const daXong = d.trang_thai === "hoan_thanh";
  const han = d.ket_thuc ? d.ket_thuc.slice(0, 10) : null;
  const quaHanNgay = han && !daXong ? Math.max(0, Math.round((msNgay(homNay) - msNgay(han)) / NGAY_MS)) : null;
  const moc = d.cap_nhat_cuoi ? Date.parse(d.cap_nhat_cuoi) : NaN;
  const namImNgay = daXong || Number.isNaN(moc) ? null : Math.max(0, Math.floor((bayGioMs - moc) / NGAY_MS));
  return {
    id: d.id,
    ten: d.ten,
    nguoiPhuTrach: d.pt_id ?? "",
    loaiPhuTrach: d.pt_loai,
    tenNguoi: d.pt_ten ?? "",
    daXong,
    xongNgay: daXong ? (d.xong_ngay ?? null) : null,
    han,
    giaoLuc: d.tao_luc ?? null,
    quaHanNgay,
    namImNgay,
    link: `/so-do?viec=${encodeURIComponent(d.id)}`,
    duongGanMa: gan ? gan.nguon : null,
    maWbs: gan?.ma_wbs ?? null,
    canCuGan: gan ? (gan.ly_do ?? (gan.nguon === "nguoi" ? "✎ người gắn" : undefined)) : undefined,
    aiGanChuaSoat: gan ? gan.trang_thai === "cho_duyet" : undefined,
    doChacGan: gan && typeof gan.do_chac === "number" ? gan.do_chac : undefined,
    duyetDuoc,
  };
}

/** Kết quả gom việc theo mã WBS — thay KetQuaNguonBase của agent Base */
export interface GomViec {
  theoWbs: Map<string, ViecCay[]>;
  /** Tầng B: việc liên quan WBS nhưng chưa gắn được mã (AI chưa đọc, hoặc 🤖 đề xuất mã còn chờ duyệt) */
  chuaGan: ViecCay[];
  /** Việc LIÊN QUAN WBS = việc trong sổ thuộc dự án − việc kết luận "không thuộc đầu việc nào" (Mr. Đại chốt 05/10) */
  tongSoViec: number;
  /** Việc đã có mã WBS ĐÃ DUYỆT (Mr. Đại chốt 03/10: chờ duyệt KHÔNG tính — khác Base vốn tính cả "ai_gan") */
  ganDuoc: number;
  /** Việc đã có dòng gắn MÃ (kết luận "không thuộc" đã bỏ ra) */
  daXet: number;
  /** 🤖 đề xuất MỘT mã WBS cụ thể, chờ người duyệt */
  choDuyet: number;
  /** AI/người kết luận "không thuộc đầu việc nào" (kể cả đang chờ duyệt) — BỎ khỏi màn, chỉ giữ số cho công thức */
  khongThuoc: number;
  theoDuong: Record<"ai_cho" | "ai_duyet" | "nguoi" | "ten_viec", number>;
  mauChuaGan: string[];
}

/**
 * Việc không gắn được vào một mã WBS cụ thể: có dòng gắn mà mã rỗng = AI hoặc người kết luận "không thuộc đầu việc nào",
 * kể cả kết luận 🤖 còn chờ duyệt. Mr. Đại chốt 05/10: "màn này chỉ làm việc với việc có liên quan đến mã WBS — việc không
 * gán được vào mã WBS cụ thể thì không để trong này" (đo HV 05/10: 2 việc — CV-2026-0073 đã duyệt, CV-2026-0134 chờ duyệt).
 */
export function laKhongThuocWbs(v: Pick<ViecCay, "duongGanMa" | "maWbs">): boolean {
  return !!v.duongGanMa && v.maWbs === null;
}

export function gomTheoWbs(viec: ViecCay[]): GomViec {
  const theoWbs = new Map<string, ViecCay[]>();
  const chuaGan: ViecCay[] = [];
  const theoDuong = { ai_cho: 0, ai_duyet: 0, nguoi: 0, ten_viec: 0 };
  let ganDuoc = 0;
  let daXet = 0;
  let choDuyet = 0;
  let khongThuoc = 0;
  const mauChuaGan: string[] = [];
  for (const v of viec) {
    if (laKhongThuocWbs(v)) {
      khongThuoc++;
      continue;
    }
    if (v.duongGanMa) daXet++;
    if (v.aiGanChuaSoat) {
      choDuyet++;
      theoDuong.ai_cho++;
    }
    // Mr. Đại chốt 03/10: mã 🤖 AI đề xuất mà CHƯA ai duyệt không được tính là đã gắn — không treo lên cây, không vào 4 thẻ,
    // không làm nút găng thành "đã có việc"; việc nằm ở tầng B và danh sách soát tay cho tới khi người duyệt.
    if (!v.maWbs || v.aiGanChuaSoat) {
      chuaGan.push(v);
      if (mauChuaGan.length < 8 && v.ten.trim()) mauChuaGan.push(v.ten);
      continue;
    }
    ganDuoc++;
    if (v.duongGanMa === "ai") theoDuong.ai_duyet++;
    else if (v.duongGanMa === "nguoi") theoDuong.nguoi++;
    else if (v.duongGanMa === "ten_viec") theoDuong.ten_viec++;
    const cu = theoWbs.get(v.maWbs);
    if (cu) cu.push(v);
    else theoWbs.set(v.maWbs, [v]);
  }
  return { theoWbs, chuaGan, tongSoViec: viec.length - khongThuoc, ganDuoc, daXet, choDuyet, khongThuoc, theoDuong, mauChuaGan };
}

/** So mã WBS theo từng đoạn số ("7.10" sau "7.9") */
export function sanhWbs(a: string, b: string): number {
  const x = a.split(".").map(Number);
  const y = b.split(".").map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const c = (x[i] ?? -1) - (y[i] ?? -1);
    if (c !== 0) return c;
  }
  return 0;
}

// ─────────────────────────────────────────────────────────────
// CỬA SỔ GIAO VIỆC GĂNG — MỘT định nghĩa cho thẻ ④, cây, khung phải, soạn hàng loạt và luật ⭕ sinh issue (Mr. Đại chốt
// 04/10/2026: đo 32 nút găng chưa ai giao = 20 việc lá + 12 nút tổng, cả 20 việc lá còn ≥ 205 ngày mới bắt đầu — đếm đỏ cả là
// báo động giả). Chỉ VIỆC LÁ, chưa xong, ngày bắt đầu baseline ≤ hôm nay + N ngày (N ở Cài đặt › Gắn việc vào WBS, mặc định 7).
// ─────────────────────────────────────────────────────────────

/** yyyy-mm-dd cộng n ngày (theo lịch, không lệch múi giờ) */
export function congNgay(ngay: string, n: number): string {
  const d = new Date(`${ngay.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Số ngày từ a tới b (yyyy-mm-dd) */
export function soNgayGiua(a: string, b: string): number {
  return Math.round((Date.parse(`${b.slice(0, 10)}T00:00:00Z`) - Date.parse(`${a.slice(0, 10)}T00:00:00Z`)) / 86_400_000);
}

/** Mã có đầu việc con */
export function tapMaCoCon(ds: { wbs: string }[]): Set<string> {
  const coCon = new Set<string>();
  for (const t of ds) {
    const i = t.wbs.lastIndexOf(".");
    if (i > 0) coCon.add(t.wbs.slice(0, i));
  }
  return coCon;
}

/** Nút găng LÁ chưa xong, ngày bắt đầu ≤ hôm nay + soNgay (soNgay = 0: đã đến ngày bắt đầu — y lib/gang/nut-gang.ts của Base) */
export function locGangDenNgay(tasks: DauViecCay[], homNay: string, soNgay = 0): DauViecCay[] {
  const coCon = tapMaCoCon(tasks);
  const cuoi = congNgay(homNay, soNgay);
  // Không có ngày bắt đầu = không biết khi nào tới lúc → KHÔNG tính (07/10: tiến độ Tân Thành nạp lỗi, chuỗi rỗng "" ≤ mọi ngày
  // làm 108 việc thành "tới lúc giao" — Mr. Đại bắt "việc chưa đến lúc giao thì kh cần giao")
  return tasks.filter((t) => {
    const bd = String(t.start ?? "").slice(0, 10);
    return t.critical === true && !coCon.has(t.wbs) && /^\d{4}-\d{2}-\d{2}$/.test(bd) && bd <= cuoi && (t.pct ?? 0) < 100;
  });
}

/** Nút găng chưa ai nhận: trừ sổ "không cần giao", trừ nút sổ việc ĐÃ có việc gắn mã ĐÃ DUYỆT (kể cả việc đã xong) — theoWbs chỉ chứa mã đã duyệt */
export function locNutGangChuaAiNhan(tasks: DauViecCay[], theoWbs: Map<string, ViecCay[]>, boQua: Set<string>, homNay: string, soNgay = 0): DauViecCay[] {
  return locGangDenNgay(tasks, homNay, soNgay).filter((t) => !boQua.has(t.wbs) && !((theoWbs.get(t.wbs)?.length ?? 0) > 0));
}

/** Nút trên cây: găng, đến lúc giao, chưa có việc treo, không đánh dấu "không cần giao" → "CHƯA AI ĐƯỢC GIAO" (đỏ) */
export function chuaAiGiao(n: NutCay): boolean {
  return n.gang && n.denLucGiao && n.viec.length === 0 && !n.khongCanGiao;
}

/** Việc lá găng chưa có việc treo nhưng ngày bắt đầu còn xa hơn cửa sổ giao → "chưa tới lúc giao" (xám, vẫn giao sớm được) */
export function chuaToiLucGiao(n: NutCay): boolean {
  return n.gang && n.laLa && !n.denLucGiao && n.pct < 100 && n.viec.length === 0 && !n.khongCanGiao;
}

/** Dựng cây theo giai đoạn từ danh sách phẳng (cha = mã bỏ đoạn cuối) — đúng thuật toán route Base */
export function dungCay(tasks: DauViecCay[], theoWbs: Map<string, ViecCay[]>, boQua: Set<string>, homNay: string, soNgay: number): NutCay[] {
  const banDo = new Map<string, NutCay>();
  const coCon = tapMaCoCon(tasks.filter((t) => t.wbs));
  const cuoi = congNgay(homNay, soNgay);
  for (const t of tasks) {
    if (!t.wbs) continue;
    const viec = theoWbs.get(t.wbs) ?? [];
    const batDau = String(t.start ?? "").slice(0, 10);
    const laLa = !coCon.has(t.wbs);
    const pct = typeof t.pct === "number" ? t.pct : 0;
    banDo.set(t.wbs, {
      wbs: t.wbs,
      ten: String(t.name ?? ""),
      pct: typeof t.pct === "number" ? t.pct : 0,
      gang: t.critical === true,
      start: String(t.start ?? "").slice(0, 10),
      end: String(t.end ?? "").slice(0, 10),
      nhaThau: String(t.contractor ?? ""),
      viec,
      // "đã có ai nhận" = ít nhất một việc chưa xong và có người cầm (định nghĩa Base)
      daCoAiNhan: viec.some((v) => !v.daXong && v.nguoiPhuTrach !== ""),
      khongCanGiao: boQua.has(t.wbs),
      laLa,
      // Cùng điều kiện locGangDenNgay (ngày trống coi như đã đến — giữ y luật cũ)
      denLucGiao: laLa && /^\d{4}-\d{2}-\d{2}$/.test(batDau) && batDau <= cuoi && pct < 100,
      conNgay: batDau ? soNgayGiua(homNay, batDau) : null,
      con: [],
    });
  }
  const cay: NutCay[] = [];
  for (const n of [...banDo.values()].sort((a, b) => sanhWbs(a.wbs, b.wbs))) {
    const viTri = n.wbs.lastIndexOf(".");
    const cha = viTri > 0 ? banDo.get(n.wbs.slice(0, viTri)) : undefined;
    if (cha) cha.con.push(n);
    else cay.push(n);
  }
  return cay;
}

/**
 * ⭐ 4 THẺ — công thức Mr. Đại chốt 10/09 (đếm trên TOÀN cây, giữ nguyên bản Base):
 *   ① tongWbs = mọi đầu việc baseline · ② tongGang = đầu việc trên đường găng
 *   ③ việc gắn được (từ gomTheoWbs)
 *   ④ ⭐ 04/10: chưa ai giao = việc LÁ trên găng − đã có việc treo (kể cả việc đã xong) − đánh dấu "không cần giao" − đã xong
 *      theo tiến độ − CHƯA TỚI LÚC GIAO (bắt đầu sau hôm nay + cửa sổ N ngày). Nút tổng không đếm (Mr. Đại chốt 04/10).
 */
export function demBonThe(tasks: DauViecCay[], theoWbs: Map<string, ViecCay[]>, boQua: Set<string>, homNay: string, soNgay: number) {
  const dong = tasks.filter((t) => t.wbs);
  const gang = dong.filter((t) => t.critical === true);
  const demNhom = new Map<string, number>();
  for (const t of gang) {
    const nhom = t.wbs.split(".")[0];
    demNhom.set(nhom, (demNhom.get(nhom) ?? 0) + 1);
  }
  const gangTheoNhom = [...demNhom.entries()]
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([nhom, so]) => `Nhóm ${nhom}: ${so}`)
    .join(" · ");
  const coViec = (w: string) => (theoWbs.get(w)?.length ?? 0) > 0;
  const coCon = tapMaCoCon(dong);
  const la = gang.filter((t) => !coCon.has(t.wbs));
  const cuoi = congNgay(homNay, soNgay);
  const laCoViec = la.filter((t) => coViec(t.wbs));
  const laKhongCan = la.filter((t) => !coViec(t.wbs) && boQua.has(t.wbs));
  const conLai = la.filter((t) => !coViec(t.wbs) && !boQua.has(t.wbs));
  const laDaXong = conLai.filter((t) => (t.pct ?? 0) >= 100);
  const laChuaToiLuc = conLai.filter((t) => (t.pct ?? 0) < 100 && String(t.start ?? "").slice(0, 10) > cuoi);
  return {
    tongWbs: dong.length,
    tongGang: gang.length,
    gangTheoNhom,
    soNutGangCoViec: gang.filter((t) => coViec(t.wbs)).length,
    soGangLa: la.length,
    soLaCoViec: laCoViec.length,
    soLaKhongCan: laKhongCan.length,
    soLaDaXong: laDaXong.length,
    soLaChuaToiLuc: laChuaToiLuc.length,
    cuaSoGiaoNgay: soNgay,
    ngayCuoiCuaSo: cuoi,
    // Cùng định nghĩa luật ⭕ sinh issue — không tự đếm lại
    nutGangChuaGiao: locNutGangChuaAiNhan(tasks, theoWbs, boQua, homNay, soNgay).length,
  };
}

/**
 * Câu "Kết quả cần có" mặc định của việc giao từ nút găng — dùng cả ở máy chủ (giaoTuCay) lẫn ô Sửa ở khung phải
 * (điền sẵn đúng câu máy sẽ ghi, người sửa được — Mr. Đại chốt 04/10). Không gồm dòng hạn: hạn nằm ở ô Hạn.
 */
export function ketQuaMacDinhGang(maWbs: string, ten: string, canCu?: string | null): string {
  return (
    `Đầu việc ${maWbs} ${ten} trên ĐƯỜNG GĂNG chưa có ai được giao trong agent Công việc (màn Cây việc & đường găng).` +
    (canCu ? `\nCăn cứ đề xuất: ${canCu}` : "")
  );
}

/** Nút GĂNG mà sổ việc chưa có việc nào treo — tập hợp nút "🤖 Soạn giao việc (N)" soạn một lượt */
export function nutGangTrong(cay: NutCay[]): NutCay[] {
  const ra: NutCay[] = [];
  const di = (ds: NutCay[]) => {
    for (const n of ds) {
      if (chuaAiGiao(n)) ra.push(n); // chỉ việc lá đến lúc giao (cửa sổ N ngày — Mr. Đại chốt 04/10)
      di(n.con);
    }
  };
  di(cay);
  return ra;
}

/** Tầng B: nằm im lâu nhất lên trước, việc đã xong xuống cuối (như Base) */
export function xepTangB(ds: ViecCay[]): ViecCay[] {
  return [...ds].sort((a, b) => (a.daXong !== b.daXong ? (a.daXong ? 1 : -1) : (b.namImNgay ?? -1) - (a.namImNgay ?? -1)));
}

/** Mọi nút của cây, phẳng — tra nút theo mã, dựng ô chọn mã WBS */
export function phangCay(cay: NutCay[]): NutCay[] {
  const ra: NutCay[] = [];
  const di = (ds: NutCay[]) => ds.forEach((n) => (ra.push(n), di(n.con)));
  di(cay);
  return ra;
}
