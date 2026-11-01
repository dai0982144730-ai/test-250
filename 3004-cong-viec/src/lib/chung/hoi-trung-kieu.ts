// ============================================================
// HỎI TRÙNG TRƯỚC KHI SOẠN VIỆC — Luật 33 (Mr. Đại chốt 04/10/2026, CLAUDE.md)
//
// "Mỗi khi AI định mở 1 việc gì đó thì việc đầu tiên nó cần đi hỏi: tôi định giao việc có nội dung như sau … vì … — hỏi
//  xem các agent khác việc này có trùng với việc mà nó đang định soạn hay không."
//
// Tệp THUẦN (không node:fs — luật 10): khuôn câu hỏi/câu trả lời, MÁY lọc ứng viên, khuôn 🤖 AI phán, bộ điều phối hỏi
// lại 3 lần. Phần gọi mạng + kho nháp nằm ở `hoi-trung.ts` của từng agent.
// Bản gốc: Main — sửa ở Main rồi chép nguyên sang Tiến độ · Hợp đồng · Công việc · Nghiệm thu; Pháp lý bản chép cùng nội dung (luật 7).
// 20/10/2026 (Mr. Đại gật): thêm agent Nghiệm thu (cổng 3015, mã `nghiemthu`) vào danh sách được hỏi trùng — cửa
// `nghiemthu.hoi_trung_viec` so với issue đang mở chưa thành việc + sổ việc đã giao của agent đó.
//
// Anh chốt 04/10 23:00: máy lọc ứng viên → 🤖 AI phán (có nút "Vẫn soạn việc riêng"); người đang chờ thì hỏi 1 lần chờ
// 15 giây, 2 lần còn lại hỏi ngầm, thấy trùng thì gắn cờ. Đo 04/10: 7 nhóm issue cùng mã WBS chỉ 1 nhóm là cùng một việc
// → KHÔNG được phán trùng chỉ vì cùng mã.
// ============================================================

/** Đuôi tên công cụ — tên đầy đủ `<mã agent>.hoi_trung_viec` */
export const DUOI_CONG_CU_HOI_TRUNG = "hoi_trung_viec";

/** Lịch gọi lại khi agent không thưa (đo 04/10 ở GAC-5-AGENT.ps1: gác ping 60 giây, bật lại chờ biên dịch 120 giây) */
export const LICH_HOI_LAI_MS = [0, 60_000, 180_000] as const;
/** Mỗi lần gọi chờ trả lời tối đa */
export const HAN_CHO_MS = 15_000;

export const AGENT_HOI_TRUNG = ["tiendo", "hopdong", "phaply", "base", "main", "nghiemthu"] as const;
export type MaAgentHoiTrung = (typeof AGENT_HOI_TRUNG)[number];

export const TEN_AGENT_HOI_TRUNG: Record<string, string> = {
  tiendo: "Tiến độ",
  hopdong: "Hợp đồng",
  phaply: "Pháp lý",
  base: "Công việc",
  main: "Main",
  nghiemthu: "Nghiệm thu",
};

export interface CauHoiTrung {
  /** "tôi định giao việc có nội dung như sau …" — tên việc + kết quả cần có */
  noi_dung: string;
  /** "… vì …" — lý do soạn (issue nào, số nào) */
  ly_do: string;
  /** Mã ngắn dự án (HV, N3A…) — trống = việc không thuộc dự án */
  ma_du_an?: string | null;
  /** Mã WBS dạng số (7.5.1) nếu biết */
  ma_wbs?: string | null;
  /** Mã hồ sơ pháp lý (HV-09-01) nếu biết */
  ma_ho_so?: string | null;
  /** yyyy-mm-dd */
  han?: string | null;
  /** ISO lúc bên hỏi giữ chỗ — hai bên cùng giữ chỗ thì bên giữ TRƯỚC giữ việc */
  luc_giu_cho?: string | null;
  /**
   * CHỈ KIỂM một việc/nháp đã biết (mã) còn không, đang ở trạng thái nào — không lọc, không 🤖 phán, 0 token.
   * Mr. Đại chốt 05/10: bản ghi trùng chỉ hỏi lại khi việc bên kia ĐỔI TRẠNG THÁI → bên hỏi kiểm bằng tham số này trước.
   */
  kiem_ma?: string | null;
}

/** Một việc của bên được hỏi đem ra so */
export interface ViecDeSo {
  ma: string;
  noi_dung: string;
  ma_du_an?: string | null;
  ma_wbs?: string | null;
  ma_ho_so?: string | null;
  /** dang_hoi = nháp đang giữ chỗ chờ hỏi xong · cho_duyet = nháp chờ người bấm Giao · da_giao = việc đang mở trong sổ */
  trang_thai: "dang_hoi" | "cho_duyet" | "da_giao";
  luc?: string | null;
  nguoi_nhan?: string | null;
  han?: string | null;
}

export interface TraLoiTrung {
  trung: boolean;
  /** Việc trùng (khi trung) */
  viec?: ViecDeSo;
  /** 🤖 lý do AI phán (luật 19 — hiện kèm 🤖) */
  ly_do?: string;
  /** khong_ung_vien = máy không thấy việc nào gần → 0 token · ai = AI đã phán · ai_loi = có ứng viên mà AI chưa phán được */
  cach_phan: "khong_ung_vien" | "ai" | "ai_loi";
  so_ung_vien: number;
  /** ai_loi: ứng viên gần nhất để người xem lại */
  nghi?: ViecDeSo;
}

// ───────────────────────── Đọc câu hỏi từ tham số cổng MCP ─────────────────────────

const chuoiHoacNull = (x: unknown): string | null => (typeof x === "string" && x.trim() ? x.trim() : null);

/** Tham số `tham_so` của cổng → câu hỏi; sai thì trả câu báo tiếng Việt */
/**
 * Hạn về yyyy-mm-dd — nhận yyyy-mm-dd (có thể kèm giờ) hoặc dd/mm/yyyy (d/m/yyyy).
 * null = không có hạn · undefined = SAI DẠNG. Kiểm lần 5 (05/10) 🔴: nháp trợ lý chat gửi dd/mm/yyyy, 4 agent từ chối cả câu hỏi.
 */
export function chuanHanHoiTrung(s: string | null | undefined): string | null | undefined {
  const t = (s ?? "").trim();
  if (!t) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  const vn = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  const [n, th, ng] = iso ? [+iso[1], +iso[2], +iso[3]] : vn ? [+vn[3], +vn[2], +vn[1]] : [0, 0, 0];
  if (!n || th < 1 || th > 12 || ng < 1 || ng > 31) return undefined;
  return `${n}-${String(th).padStart(2, "0")}-${String(ng).padStart(2, "0")}`;
}

export function docCauHoiTrung(t: Record<string, unknown>): CauHoiTrung | string {
  const noiDung = chuoiHoacNull(t.noi_dung);
  if (!noiDung || noiDung.length < 5) return "Thiếu nội dung việc định giao (noi_dung, ít nhất 5 ký tự).";
  const han = chuanHanHoiTrung(chuoiHoacNull(t.han));
  if (han === undefined) return "Hạn phải dạng yyyy-mm-dd hoặc dd/mm/yyyy.";
  return {
    noi_dung: noiDung.slice(0, 1_000),
    ly_do: (chuoiHoacNull(t.ly_do) ?? "").slice(0, 1_000),
    ma_du_an: chuoiHoacNull(t.ma_du_an),
    ma_wbs: chuoiHoacNull(t.ma_wbs),
    ma_ho_so: chuoiHoacNull(t.ma_ho_so),
    han,
    luc_giu_cho: chuoiHoacNull(t.luc_giu_cho),
    kiem_ma: chuoiHoacNull(t.kiem_ma),
  };
}

// ───────────────────────── MÁY lọc ứng viên (0 token) ─────────────────────────

export function boDauHoiTrung(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

/** Từ không mang nghĩa phân biệt việc — bỏ khi so chữ */
const TU_BO = new Set(
  "xu ly viec cho cua va cac theo trong voi den tu tai mot nhung duoc lam can phai giao issue the bao hon chua sau truoc khi de dang da con ngay han du an hang muc".split(" "),
);

/** Tập từ khoá (bỏ dấu, ≥ 3 ký tự hoặc có số, bỏ từ chung) */
export function tuKhoaHoiTrung(s: string): Set<string> {
  const ra = new Set<string>();
  for (const t of boDauHoiTrung(s).split(/[^a-z0-9.]+/)) {
    const w = t.replace(/^\.+|\.+$/g, "");
    if (!w || TU_BO.has(w)) continue;
    if (w.length >= 3 || /\d/.test(w)) ra.add(w);
  }
  return ra;
}

/** Hai mã WBS: trùng hẳn · cha–con (6.1 ↔ 6.1.4) · không liên quan */
export function quanHeWbs(a?: string | null, b?: string | null): "trung" | "cha_con" | null {
  const x = (a ?? "").trim();
  const y = (b ?? "").trim();
  if (!/^\d+(?:\.\d+)*$/.test(x) || !/^\d+(?:\.\d+)*$/.test(y)) return null;
  if (x === y) return "trung";
  return y.startsWith(`${x}.`) || x.startsWith(`${y}.`) ? "cha_con" : null;
}

/** Tỷ lệ phủ từ khoá: số từ chung / số từ của câu ngắn hơn */
export function doPhuTu(a: string, b: string): { chung: number; ty_le: number } {
  const A = tuKhoaHoiTrung(a);
  const B = tuKhoaHoiTrung(b);
  if (A.size === 0 || B.size === 0) return { chung: 0, ty_le: 0 };
  let chung = 0;
  A.forEach((w) => { if (B.has(w)) chung++; });
  return { chung, ty_le: chung / Math.min(A.size, B.size) };
}

/**
 * MÁY lọc việc có thể trùng — chỉ để đưa AI phán, KHÔNG tự kết luận trùng.
 * Cùng dự án (cả hai cùng trống cũng tính) VÀ (cùng mã hồ sơ · cùng/cha–con mã WBS · phủ từ ≥ 60% với ≥ 3 từ chung).
 * Nháp đang giữ chỗ của bên kia mà giữ SAU bên hỏi thì bỏ (bên kia sẽ nhường).
 */
export function locUngVienTrung(cau: CauHoiTrung, ds: readonly ViecDeSo[], toiDa = 5): ViecDeSo[] {
  const diem: { v: ViecDeSo; d: number }[] = [];
  const duAn = (cau.ma_du_an ?? "").trim().toUpperCase();
  for (const v of ds) {
    if ((v.ma_du_an ?? "").trim().toUpperCase() !== duAn) continue;
    if (v.trang_thai === "dang_hoi" && cau.luc_giu_cho && v.luc && v.luc > cau.luc_giu_cho) continue;
    let d = 0;
    if (cau.ma_ho_so && v.ma_ho_so && cau.ma_ho_so.trim().toUpperCase() === v.ma_ho_so.trim().toUpperCase()) d = Math.max(d, 4);
    const qh = quanHeWbs(cau.ma_wbs, v.ma_wbs);
    if (qh === "trung") d = Math.max(d, 3);
    else if (qh === "cha_con") d = Math.max(d, 2);
    const phu = doPhuTu(cau.noi_dung, v.noi_dung);
    if (phu.chung >= 3 && phu.ty_le >= 0.6) d = Math.max(d, 1 + phu.ty_le);
    if (d > 0) diem.push({ v, d });
  }
  return diem.sort((a, b) => b.d - a.d).slice(0, toiDa).map((x) => x.v);
}

// ───────────────────────── 🤖 AI phán ─────────────────────────

export const HE_THONG_PHAN_TRUNG = `Bạn là thư ký Ban QLDA điện gió. Nhiệm vụ DUY NHẤT: xét một việc ĐỊNH GIAO có trùng với một trong các việc ĐÃ CÓ hay không.

Luật:
- TRÙNG = cùng một hành động phải làm cho cùng một đối tượng (cùng hạng mục / hồ sơ / phiếu giá): người làm xong việc này thì việc kia không còn phải làm.
- KHÔNG TRÙNG = chỉ liên quan: cùng hạng mục nhưng hành động khác (thiết kế ≠ xin giấy phép ≠ thi công ≠ thanh toán ≠ đóng việc cũ), hoặc cùng loại hành động nhưng đối tượng khác.
- Không chắc thì coi là KHÔNG TRÙNG.
- Chỉ dùng chữ trong câu hỏi, không bịa.

Trả về DUY NHẤT một object JSON, không lời dẫn, không rào \`\`\`:
{"trung": true hoặc false, "ma": "mã việc trùng hoặc null", "ly_do": "một câu tiếng Việt, nêu mã kèm tên ngắn"}`;

export function promptPhanTrung(cau: CauHoiTrung, ungVien: readonly ViecDeSo[]): string {
  const dong = ungVien.map(
    (v, i) =>
      `${i + 1}. [${v.ma}] ${v.noi_dung}` +
      (v.ma_wbs ? ` · WBS ${v.ma_wbs}` : "") +
      (v.ma_ho_so ? ` · hồ sơ ${v.ma_ho_so}` : "") +
      ` · ${v.trang_thai === "da_giao" ? "đã giao" : v.trang_thai === "cho_duyet" ? "nháp chờ duyệt" : "nháp đang soạn"}` +
      (v.nguoi_nhan ? ` · người nhận ${v.nguoi_nhan}` : ""),
  );
  return (
    `VIỆC ĐỊNH GIAO: ${cau.noi_dung}\n` +
    (cau.ly_do ? `VÌ: ${cau.ly_do}\n` : "") +
    (cau.ma_wbs ? `WBS: ${cau.ma_wbs}\n` : "") +
    (cau.ma_ho_so ? `HỒ SƠ: ${cau.ma_ho_so}\n` : "") +
    `\nVIỆC ĐÃ CÓ:\n${dong.join("\n")}`
  );
}

/** Bóc câu AI — thiếu trường / mã lạ thì null (không đoán) */
export function docPhanTrung(raw: string, ungVien: readonly ViecDeSo[]): { trung: boolean; viec?: ViecDeSo; ly_do: string } | null {
  const s = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const dau = s.indexOf("{");
  const cuoi = s.lastIndexOf("}");
  if (dau < 0 || cuoi <= dau) return null;
  try {
    const o = JSON.parse(s.slice(dau, cuoi + 1)) as Record<string, unknown>;
    if (typeof o.trung !== "boolean") return null;
    const lyDo = typeof o.ly_do === "string" ? o.ly_do.trim().slice(0, 400) : "";
    if (!o.trung) return { trung: false, ly_do: lyDo };
    const ma = typeof o.ma === "string" ? o.ma.trim() : "";
    const viec = ungVien.find((v) => v.ma === ma);
    return viec ? { trung: true, viec, ly_do: lyDo } : null;
  } catch {
    return null;
  }
}

/** Bên được hỏi: máy lọc → (có ứng viên) AI phán. `aiPhan` trả chữ AI hoặc null khi lỗi — tiêm vào để test không gọi AI thật */
export async function phanTrung(
  cau: CauHoiTrung,
  ds: readonly ViecDeSo[],
  aiPhan: (prompt: string, heThong: string) => Promise<string | null>,
): Promise<TraLoiTrung> {
  // Câu KIỂM NHANH (kiem_ma): chỉ tra mã trong danh sách việc còn sống — trung=true nghĩa là "vẫn còn", viec mang trạng thái hiện tại
  if (cau.kiem_ma) {
    const v = ds.find((x) => x.ma === cau.kiem_ma);
    return v
      ? { trung: true, viec: v, ly_do: `Việc ${v.ma} vẫn còn — trạng thái ${v.trang_thai}`, cach_phan: "khong_ung_vien", so_ung_vien: 1 }
      : { trung: false, ly_do: `Không còn việc ${cau.kiem_ma} đang mở hoặc chờ duyệt (đã giao, đã đóng hoặc đã bỏ)`, cach_phan: "khong_ung_vien", so_ung_vien: 0 };
  }
  const ung = locUngVienTrung(cau, ds);
  if (ung.length === 0) return { trung: false, cach_phan: "khong_ung_vien", so_ung_vien: 0 };
  let raw: string | null = null;
  try {
    raw = await aiPhan(promptPhanTrung(cau, ung), HE_THONG_PHAN_TRUNG);
  } catch {
    raw = null;
  }
  const kq = raw ? docPhanTrung(raw, ung) : null;
  if (!kq) return { trung: false, cach_phan: "ai_loi", so_ung_vien: ung.length, nghi: ung[0] };
  return kq.trung
    ? { trung: true, viec: kq.viec, ly_do: kq.ly_do, cach_phan: "ai", so_ung_vien: ung.length }
    : { trung: false, ly_do: kq.ly_do, cach_phan: "ai", so_ung_vien: ung.length };
}

// ───────────────────────── Câu ghi ra khi trùng (anh chốt nguyên văn) ─────────────────────────

/** "Việc này đã được agent <X> soạn giao việc có nội dung là '<nội dung>'" — kèm mã việc + người nhận nếu có (luật 30) */
export function cauDaCoAgentSoan(maAgent: string, v: Pick<ViecDeSo, "ma" | "noi_dung" | "trang_thai" | "nguoi_nhan">): string {
  const ten = TEN_AGENT_HOI_TRUNG[maAgent] ?? maAgent;
  const them =
    v.trang_thai === "da_giao"
      ? ` (việc ${v.ma} đã giao${v.nguoi_nhan ? ` cho ${v.nguoi_nhan}` : ""})`
      : ` (nháp ${v.ma} đang chờ duyệt ở agent ${ten})`;
  return `Việc này đã được agent ${ten} soạn giao việc có nội dung là "${v.noi_dung}"${them}`;
}

// ───────────────────────── Bộ điều phối hỏi các agent ─────────────────────────

/**
 * Gọi `<maAgent>.hoi_trung_viec` — null = KHÔNG THƯA (tắt, lỗi mạng, hết giờ) → gọi lại theo lịch ·
 * "tu_choi" = bên kia thưa nhưng TỪ CHỐI câu hỏi (tham số sai, không có quyền) → hỏi lại cũng vậy, KHÔNG gọi lại (kiểm lần 5)
 */
export type GoiHoiTrung = (maAgent: string, lan: number) => Promise<TraLoiTrung | null | "tu_choi">;

/** Mã lỗi nghĩa là "bên kia từ chối câu hỏi" — gọi lại cũng vô ích */
export const MA_LOI_TU_CHOI_HOI_TRUNG: readonly string[] = ["KHONG_HIEU_YEU_CAU", "KHONG_CO_QUYEN"];

export interface KetQuaHoiTrung {
  /** Việc trùng tìm được (ưu tiên việc ĐÃ GIAO, rồi nháp chờ duyệt, rồi nháp giữ chỗ sớm hơn) */
  trung: (TraLoiTrung & { agent: string }) | null;
  /** Agent có ứng viên mà AI chưa phán được — người xem lại */
  nghi: { agent: string; viec: ViecDeSo }[];
  da_hoi: string[];
  chua_hoi_duoc: string[];
}

const HANG_TRANG_THAI: Record<ViecDeSo["trang_thai"], number> = { da_giao: 0, cho_duyet: 1, dang_hoi: 2 };

function gop(cu: KetQuaHoiTrung, agent: string, tl: TraLoiTrung): KetQuaHoiTrung {
  const ra: KetQuaHoiTrung = { ...cu, da_hoi: [...cu.da_hoi, agent], chua_hoi_duoc: cu.chua_hoi_duoc.filter((a) => a !== agent) };
  if (tl.trung && tl.viec) {
    const moi = { ...tl, agent };
    const cuT = ra.trung;
    if (!cuT || HANG_TRANG_THAI[tl.viec.trang_thai] < HANG_TRANG_THAI[cuT.viec!.trang_thai]) ra.trung = moi;
  } else if (tl.cach_phan === "ai_loi" && tl.nghi) ra.nghi = [...ra.nghi, { agent, viec: tl.nghi }];
  return ra;
}

const nguThat = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Hỏi mọi agent trong `dsAgent` (song song). Không thưa → gọi lại theo LICH_HOI_LAI_MS.
 * - cho = "nen": máy soạn không ai chờ → đủ 3 lần rồi mới trả.
 * - cho = "nguoi": người đang chờ → trả sau lần 1; agent chưa thưa thì hỏi ngầm 2 lần còn lại, xong gọi `sauKhiHoiNot`.
 * Đã thấy trùng thì thôi hỏi tiếp.
 */
export async function dieuPhoiHoiTrung(
  dsAgent: readonly string[],
  goi: GoiHoiTrung,
  tuyChon: {
    cho: "nen" | "nguoi";
    /** chờ giữa hai lần gọi (test tiêm đồng hồ giả) */
    ngu?: (ms: number) => Promise<void>;
    /** hết giờ chờ một lần gọi (test tiêm lời hứa không bao giờ xong) */
    hetGio?: (ms: number) => Promise<void>;
    sauKhiHoiNot?: (kq: KetQuaHoiTrung) => void;
  },
): Promise<KetQuaHoiTrung> {
  const ngu = tuyChon.ngu ?? nguThat;
  const hetGio = tuyChon.hetGio ?? nguThat;
  // Agent đã thưa mà từ chối câu hỏi — vẫn tính "chưa hỏi được" nhưng không gọi lại
  const tuChoi = new Set<string>();
  const motLuot = async (kq: KetQuaHoiTrung, ds: readonly string[], lan: number): Promise<KetQuaHoiTrung> => {
    const tl = await Promise.all(
      ds.map(async (a) => {
        const het = hetGio(HAN_CHO_MS).then(() => null);
        try {
          return await Promise.race([goi(a, lan), het]);
        } catch {
          return null;
        }
      }),
    );
    let ra = kq;
    ds.forEach((a, i) => {
      const t = tl[i];
      if (t === "tu_choi") tuChoi.add(a);
      else if (t) ra = gop(ra, a, t);
    });
    return ra;
  };
  const conGoi = (kq: KetQuaHoiTrung) => kq.chua_hoi_duoc.filter((a) => !tuChoi.has(a));
  const conLai = async (kq: KetQuaHoiTrung, tuLan: number): Promise<KetQuaHoiTrung> => {
    let ra = kq;
    for (let lan = tuLan; lan < LICH_HOI_LAI_MS.length && conGoi(ra).length > 0 && !ra.trung; lan++) {
      await ngu(LICH_HOI_LAI_MS[lan] - LICH_HOI_LAI_MS[lan - 1]);
      ra = await motLuot(ra, conGoi(ra), lan);
    }
    return ra;
  };

  const dau: KetQuaHoiTrung = { trung: null, nghi: [], da_hoi: [], chua_hoi_duoc: [...dsAgent] };
  const lan1 = await motLuot(dau, dsAgent, 0);
  if (lan1.trung || conGoi(lan1).length === 0) return lan1;
  if (tuyChon.cho === "nen") return conLai(lan1, 1);
  if (tuyChon.sauKhiHoiNot) {
    const xong = tuyChon.sauKhiHoiNot;
    void conLai(lan1, 1).then(xong, () => undefined);
  }
  return lan1;
}

/** Hàm hỏi trùng cho MỘT lượt máy soạn nền (nhiều việc liền nhau) */
export type HoiTrungNen = (cau: CauHoiTrung) => Promise<KetQuaHoiTrung>;

/**
 * Máy soạn NỀN nhiều việc trong một lượt (lượt đêm Pháp lý, nhắc nộp báo cáo của Tiến độ…): mỗi việc hỏi đủ 3 lần, nhưng
 * agent đã im đủ 3 lần ở việc trước thì BỎ QUA cho hết lượt — cả lượt chỉ chờ tối đa một lần ~3 phút 45 giây, không phải
 * mỗi việc một lần. Agent bỏ qua vẫn ghi "chưa hỏi được" (Luật 33). Agent chỉ hụt lần 1 vì đã thấy trùng sớm (chưa gọi
 * lại) thì KHÔNG coi là im.
 */
export function taoHoiTrungNen(
  dsAgent: readonly string[],
  goi: (cau: CauHoiTrung) => GoiHoiTrung,
  ngu?: (ms: number) => Promise<void>,
): HoiTrungNen {
  const agentIm = new Set<string>();
  return async (cau) => {
    const ds = dsAgent.filter((a) => !agentIm.has(a));
    const kq: KetQuaHoiTrung = ds.length
      ? await dieuPhoiHoiTrung(ds, goi(cau), { cho: "nen", ngu })
      : { trung: null, nghi: [], da_hoi: [], chua_hoi_duoc: [] };
    if (!kq.trung) kq.chua_hoi_duoc.forEach((a) => agentIm.add(a));
    return { ...kq, chua_hoi_duoc: Array.from(new Set(kq.chua_hoi_duoc.concat(Array.from(agentIm)))).filter((a) => !kq.da_hoi.includes(a)) };
  };
}

/** Một dòng tóm tắt cho người đọc + sổ nhật ký ("câu trả lời gọn" — luật 29) */
export function tomTatHoiTrung(kq: KetQuaHoiTrung): string {
  if (kq.trung?.viec) return cauDaCoAgentSoan(kq.trung.agent, kq.trung.viec);
  const ten = (ds: string[]) => ds.map((a) => TEN_AGENT_HOI_TRUNG[a] ?? a).join(", ");
  const phan = [`Đã hỏi ${kq.da_hoi.length} agent${kq.da_hoi.length ? ` (${ten(kq.da_hoi)})` : ""} — không trùng`];
  if (kq.nghi.length) phan.push(`🤖 chưa phán được, có thể gần với ${kq.nghi.map((n) => `${n.viec.ma} ở agent ${TEN_AGENT_HOI_TRUNG[n.agent] ?? n.agent}`).join(", ")}`);
  if (kq.chua_hoi_duoc.length) phan.push(`chưa hỏi được agent ${ten(kq.chua_hoi_duoc)}`);
  return phan.join(" · ");
}

/** Bản ghi lưu kèm nháp (kho nháp mỗi agent) — gọn, đủ để màn hiện câu trùng / "chưa hỏi được" */
export interface BanGhiHoiTrung {
  luc: string;
  tomTat: string;
  trung?: { agent: string; ma: string; noiDung: string; trangThai: string; nguoiNhan?: string | null; lyDo?: string };
  chuaHoiDuoc?: string[];
  nghi?: { agent: string; ma: string; noiDung: string }[];
  /** Trùng tìm thấy ở lượt HỎI NGẦM sau khi nháp đã soạn (Q3 anh chốt 04/10: "thấy trùng thì gắn cờ lên nháp") —
   *  nháp VẪN hiện, kèm cờ; khác trùng lúc hỏi (nháp không soạn, chỉ còn câu trùng) */
  muon?: boolean;
}

export function banGhiHoiTrung(kq: KetQuaHoiTrung, luc = new Date().toISOString(), muon = false): BanGhiHoiTrung {
  const t = kq.trung;
  return {
    luc,
    ...(muon && t?.viec ? { muon: true } : {}),
    tomTat: tomTatHoiTrung(kq),
    ...(t?.viec
      ? { trung: { agent: t.agent, ma: t.viec.ma, noiDung: t.viec.noi_dung, trangThai: t.viec.trang_thai, nguoiNhan: t.viec.nguoi_nhan ?? null, ...(t.ly_do ? { lyDo: t.ly_do } : {}) } }
      : {}),
    ...(kq.chua_hoi_duoc.length ? { chuaHoiDuoc: [...kq.chua_hoi_duoc] } : {}),
    ...(kq.nghi.length ? { nghi: kq.nghi.map((n) => ({ agent: n.agent, ma: n.viec.ma, noiDung: n.viec.noi_dung })) } : {}),
  };
}

/** Rút gọn chữ cho lý do gọi (sổ nhật ký) — không cắt giữa từ */
export function rutGonHoiTrung(s: string, toiDa = 120): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= toiDa) return t;
  const cat = t.slice(0, toiDa);
  return `${cat.slice(0, Math.max(cat.lastIndexOf(" "), toiDa - 20))}…`;
}
