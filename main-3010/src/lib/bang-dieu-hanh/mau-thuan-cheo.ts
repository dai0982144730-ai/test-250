// ============================================================
// CHỖ HAI AGENT NÓI KHÁC NHAU — Main chỉ NÊU, không phân xử  (server-only)
// Mr. Đại chọn làm B11 (22/09/2026). Chưa có LLM ở bước này (J12 chờ gật).
//
// Hai loại mâu thuẫn, mỗi loại hỏi tối đa 20 mã WBS, ưu tiên mã trên đường găng:
//   (a) Base có việc XONG gắn mã WBS  ↔  phaply.ho_so_cua_wbs nói hồ sơ CÒN THIẾU
//   (b) Tiến độ ghi WBS 100%          ↔  nghiemthu.da_nghiem_thu_chua ≠ đã nghiệm thu (20/10/2026 — trước hỏi hopdong)
//
// ⛔ Main KHÔNG sửa số của bên nào. Mỗi dòng ghi đủ nguồn HAI BÊN để người đọc
//    tự mở ra xem. Agent nào tắt thì ghi "chưa hỏi được" — không đoán thay.
// ⛔ Mọi lượt hỏi đi qua hoiAgent / hoiTienDo (luật 29 — có vết trong sổ).
//
// Khuôn trả lời đã ĐO 22/09 (không đọc theo trí nhớ):
//   tiendo.duong_gang        → chuoi_gang[{wbs, pct, ten}]
//   tiendo.tim_dau_viec      → tasks[{wbs, name, pct, critical}] (ma_wbs = cả cây con)
//   base.co_viec_cho_ma_khong→ tim_thay_ma, so_viec_da_xong, viec[], ma_wbs_co_trong_du_lieu[]
//   phaply.ho_so_cua_wbs     → so_ho_so, da_co, con_thieu, ho_so[]; KHONG_CO_DU_LIEU = chưa gán
//   nghiemthu.da_nghiem_thu_chua → trang_thai ("khong_tra_duoc"…), da_nghiem_thu (true/false/null) — giữ khuôn cũ hopdong.da_nghiem_thu_chua
//
// ⭐ QS-081 (27/09) — đo 26/09 21:36–21:41: khối này gọi Base 42 lượt (từng mã một,
//    MỖI lượt Base tải lại cả hồ sơ dự án từ Base.vn), tim_dau_viec 16 lượt,
//    ho_so_cua_wbs 12 lượt — và chạy HAI lần song song mỗi lần mở (hai chuỗi cùng
//    giây). Nay:
//      · Base hỏi theo khuôn K2: MỘT lượt `ds_ma` cho mọi mã (tối đa 2 lượt: mã găng,
//        rồi mã Base có thêm); Base bản cũ trả KHONG_HIEU_YEU_CAU → rơi về từng mã
//      · % tiến độ lấy từ MỘT danh sách mọi đầu việc (cắt trang K1, dùng chung với từ
//        điển tên việc) thay vì hỏi từng mã; thiếu mã nào mới hỏi riêng mã đó
//      · cả khối nhớ 10 phút trên globalThis + một lượt bay theo dự án; từng câu hỏi
//        con cũng nhớ 10 phút (bo-nho-hoi.ts) — "Soát lại" thì bỏ qua cả hai
// ============================================================

import { hoiTienDo } from "@/lib/nguon-tien-do";
import { hoiAgent, type TuyChonHoi } from "@/lib/nguon/hoi-agent";
import type { KhuonTra } from "@/lib/mcp/khuon";
import type { TuyChonNho } from "@/lib/nguon/bo-nho-hoi";
import { layMoiDauViec } from "@/lib/nguon/tim-dau-viec-het";
import { rutGonTen } from "@/lib/chung/ma-kem-ten";
import { layTuDienWbs } from "@/lib/chung/tu-dien-ma-du-an";

/** Luật mã kèm tên (26/09): "6.1.4 Cung cấp Hub…" — không có tên thì in mã như cũ */
function nhanMa(ma: string, ten: string | null | undefined): string {
  return ten && ten.trim() !== "" ? `${ma} ${rutGonTen(ten)}` : ma;
}

/**
 * Mã `trang_thai` của nghiemthu.da_nghiem_thu_chua (trước 20/10/2026: hopdong.da_nghiem_thu_chua) → chữ tiếng Việt (25/09 — trước
 * đây in thẳng "chua_co_hop_dong" ra câu). Chữ theo đúng câu Agent Hợp đồng
 * chốt: KHO chỉ biết hợp đồng đã nạp nên nói "chưa thấy", không nói "chưa có".
 */
export function chuTrangThaiHopDong(ma: unknown): string {
  switch (ma) {
    case "chua_co_hop_dong":
      return "chưa thấy hợp đồng trong kho";
    case "co_hop_dong_chua_nghiem_thu":
      return "đã có hợp đồng, chưa nghiệm thu";
    case "da_nghiem_thu":
      return "đã nghiệm thu";
    case "khong_tra_duoc":
      return "chưa tra được";
    default:
      return "trạng thái hợp đồng chưa rõ";
  }
}

/** Trần số mã WBS hỏi cho MỖI loại — Mr. Đại chốt 20 */
export const TOI_DA_WBS_MOI_LOAI = 20;
/** Trần `ds_ma` một lượt — khuôn K2 */
export const TRAN_DS_MA = 100;
/** Gọi song song từng nhóm nhỏ — không dội 60 lượt cùng lúc vào ba cổng */
const MOI_NHOM = 5;
/** Nhớ kết quả 10 phút theo dự án — mở lại Bảng điều hành không hỏi lại */
const NHO_MS = 10 * 60 * 1000;

export interface DongMauThuan {
  loai: "ho-so" | "nghiem-thu";
  wbs: string;
  tenWbs: string;
  gang: boolean;
  /**
   * ⭐ 18/10/2026 (T1 — Mr. Đại gật «ok theo ý bạn»): MỘT câu tiếng người nói hai bên khác nhau điều gì — CODE ghép
   * (`cauMauThuan`), không LLM. Mã luôn kèm tên (luật 30), tên lấy từ dữ liệu thật; thiếu tên thì câu nói rõ là thiếu.
   * Dòng nhớ từ trước 18/10 không có trường này — màn rơi về hai dòng cũ.
   */
  cau?: string;
  /** Số liệu để ghép câu — chỉ những gì cổng hai bên trả */
  chiTiet?: ChiTietMauThuan;
  /** Bên thứ nhất nói gì — câu CODE ghép từ số cổng trả, không LLM. Màn hiện trong nút «Nguồn»; 🤖 Giải thích đọc hai câu này */
  benA: { agent: string; noiDung: string; nguon: string };
  benB: { agent: string; noiDung: string; nguon: string };
}

export interface ChiTietMauThuan {
  /** ho-so: số việc mang mã đã xong / còn đang làm bên agent Công việc */
  soViecXong?: number;
  soViecDangMo?: number;
  /** ho-so: hồ sơ còn thiếu bên Pháp lý — tên đúng như Pháp lý trả (null = Pháp lý không trả tên) */
  hoSoThieu?: { ma: string; ten: string | null }[];
  conThieu?: number;
  soHoSo?: number;
  /** nghiem-thu: chữ trạng thái hợp đồng (chuTrangThaiHopDong) + số biên bản */
  trangThaiHopDong?: string;
  soBienBan?: number;
}

export interface KhoiMauThuan {
  duAn: string;
  luc: string;
  dong: DongMauThuan[];
  /** Đã hỏi bao nhiêu mã mỗi loại — để người đọc biết "0 mâu thuẫn" là soát trên mấy mã */
  daSoat: { hoSo: number; nghiemThu: number };
  /** Bên nào chưa hỏi được (agent tắt / lỗi) — nói thẳng */
  chuaHoiDuoc: string[];
  /** Mã đã hỏi nhưng bên kia "chưa tra được" (không phải mâu thuẫn, cũng không phải sạch). `tenWbs` — luật 30 */
  chuaTraDuoc: { wbs: string; lyDo: string; tenWbs?: string }[];
}

/** Hồ sơ hiện tối đa trong câu — còn lại ghi «và N hồ sơ khác» */
const TOI_DA_HO_SO_TRONG_CAU = 4;

/** «Việc 1.1.4 Khảo sát địa hình» — thiếu tên thì nói rõ, không bịa (luật 30) */
export function viecKemTen(wbs: string, ten: string | null | undefined): string {
  return ten && ten.trim() !== "" ? `Việc ${wbs} ${rutGonTen(ten)}` : `Việc ${wbs} (agent Tiến độ chưa có tên cho mã này)`;
}

function hoSoKemTen(h: { ma: string; ten: string | null }): string {
  return h.ten && h.ten.trim() !== "" ? `${h.ma} ${rutGonTen(h.ten)}` : `${h.ma} (agent Pháp lý không trả tên hồ sơ)`;
}

/**
 * ⭐ 18/10/2026 (T1) — MỘT câu tiếng người cho một chỗ hai agent nói khác nhau. CODE ghép từ số hai bên trả, không LLM.
 *   ho-so:     «Việc 1.1.4 <tên> đã xong bên agent Công việc, nhưng hồ sơ HV-K-19 <tên hồ sơ> bên agent Pháp lý vẫn chưa có.»
 *   nghiem-thu: «Việc 2.3.1 <tên> đã 100% bên agent Tiến độ, nhưng bên agent Nghiệm thu chưa nghiệm thu xong (…).»
 * Dòng thiếu `chiTiet` (nhớ từ bản cũ) → null, màn hiện hai dòng cũ.
 */
export function cauMauThuan(d: Pick<DongMauThuan, "loai" | "wbs" | "tenWbs" | "chiTiet">): string | null {
  const c = d.chiTiet;
  if (!c) return null;
  const viec = viecKemTen(d.wbs, d.tenWbs);
  if (d.loai === "nghiem-thu") {
    const tt = c.trangThaiHopDong ? ` (${c.trangThaiHopDong}${typeof c.soBienBan === "number" ? `, ${c.soBienBan} biên bản` : ""})` : "";
    return `${viec} đã 100% bên agent Tiến độ, nhưng bên agent Nghiệm thu chưa nghiệm thu xong${tt}.`;
  }
  const xong = c.soViecXong ?? 0;
  const mo = c.soViecDangMo ?? 0;
  const benCv =
    mo > 0
      ? `${viec} có ${xong} việc đã xong bên agent Công việc (còn ${mo} việc đang làm)`
      : xong > 1
        ? `${viec} đã xong bên agent Công việc (cả ${xong} việc mang mã này)`
        : `${viec} đã xong bên agent Công việc`;
  const ds = c.hoSoThieu ?? [];
  const tong = c.soHoSo ?? 0;
  const thieu = c.conThieu ?? ds.length;
  if (ds.length === 0) {
    return `${benCv}, nhưng bên agent Pháp lý mã này còn thiếu ${thieu}/${tong} hồ sơ (Pháp lý không trả mã hồ sơ thiếu).`;
  }
  const ten = ds.slice(0, TOI_DA_HO_SO_TRONG_CAU).map(hoSoKemTen).join("; ");
  const conLai = thieu - Math.min(ds.length, TOI_DA_HO_SO_TRONG_CAU);
  const duoi = conLai > 0 ? ` và ${conLai} hồ sơ khác` : "";
  if (thieu === 1) {
    return `${benCv}, nhưng hồ sơ ${ten} bên agent Pháp lý vẫn chưa có${tong > 1 ? ` (mã này cần ${tong} hồ sơ, thiếu 1)` : ""}.`;
  }
  return `${benCv}, nhưng ${thieu}/${tong} hồ sơ bên agent Pháp lý vẫn chưa có: ${ten}${duoi}.`;
}

const LY_DO = (duAn: string) =>
  `Bảng điều hành Main — khối "Chỗ hai agent nói khác nhau" (B11) cho dự án ${duAn}`;

/** Bộ nhớ cả khối — trên globalThis (`next dev` nạp lại route không mất) + một lượt bay */
interface KhoMauThuan {
  nho: Map<string, { luc: number; ket: KhoiMauThuan }>;
  dangBay: Map<string, Promise<KhoiMauThuan>>;
}
const gMt = globalThis as unknown as { __sciMauThuanCheo?: KhoMauThuan };
function khoMt(): KhoMauThuan {
  return (gMt.__sciMauThuanCheo ??= { nho: new Map(), dangBay: new Map() });
}

/** Dùng trong test / khi cần soát lại ngay */
export function xoaNhoMauThuan(): void {
  khoMt().nho.clear();
  khoMt().dangBay.clear();
}

function obj(k: KhuonTra | undefined): Record<string, unknown> {
  return k && k.ok && k.du_lieu && typeof k.du_lieu === "object" ? (k.du_lieu as Record<string, unknown>) : {};
}

function nguonCua(k: KhuonTra, macDinh: string): string {
  if (!k.ok || !Array.isArray(k.nguon) || k.nguon.length === 0) return macDinh;
  const n = k.nguon[0];
  return [n.loai, n.ma, n.file_goc].filter((x) => String(x ?? "").trim() !== "").join(" · ") || macDinh;
}

async function theoNhom<T, R>(ds: T[], fn: (x: T) => Promise<R>): Promise<R[]> {
  const ra: R[] = [];
  for (let i = 0; i < ds.length; i += MOI_NHOM) {
    ra.push(...(await Promise.all(ds.slice(i, i + MOI_NHOM).map(fn))));
  }
  return ra;
}

// ─────────────────────────────────────────────────────────────
// K2 — hỏi Base nhiều mã một lượt
// ─────────────────────────────────────────────────────────────

/** Chữ ký của `hoiAgent` — tiêm vào để bài kiểm chạy không cần mạng */
export type HamHoiAgent = (maAgent: string, congCu: string, lyDo: string, tc: TuyChonHoi) => Promise<KhuonTra>;

export interface KetQuaBaseNhieuMa {
  /** Câu trả lời THEO TỪNG MÃ (khuôn một mã) — mã không có trong map = chưa hỏi được */
  theoMa: Map<string, KhuonTra>;
  /** Agent Base tắt / ngắt mạch */
  baseTat: boolean;
  /** Câu lỗi (không phải tắt, không phải "không có dữ liệu") — để nói ra */
  loi: string | null;
  /** Đã phải rơi về hỏi từng mã (Base bản cũ chưa hiểu ds_ma) */
  roiVeTungMa: boolean;
}

/**
 * Hỏi `base.co_viec_cho_ma_khong` cho nhiều mã — khuôn K2: MỘT lượt `ds_ma`
 * (tối đa 100 mã/lượt), Base trả `{ ket_qua: [{ ma, …trường một mã }], so_ma }`.
 * Base bản cũ trả KHONG_HIEU_YEU_CAU (hoặc khuôn không có `ket_qua`) → hỏi từng mã như cũ.
 */
export async function hoiBaseNhieuMa(
  duAn: string,
  dsMa: string[],
  lyDo: string,
  tc: TuyChonNho = {},
  hoi: HamHoiAgent = hoiAgent,
): Promise<KetQuaBaseNhieuMa> {
  const ra: KetQuaBaseNhieuMa = { theoMa: new Map(), baseTat: false, loi: null, roiVeTungMa: false };
  const ma = Array.from(new Set(dsMa.map((m) => m.trim()).filter((m) => m !== "")));

  const tungMa = async (cac: string[]) => {
    ra.roiVeTungMa = true;
    await theoNhom(cac, async (m) => {
      if (ra.baseTat) return;
      const k = await hoi("base", "base.co_viec_cho_ma_khong", lyDo, {
        ...tc,
        tham_so: { ma_he_thong: m, ma_du_an: duAn },
      });
      if (!k.ok && k.ma_loi === "AGENT_KHONG_SAN_SANG") {
        ra.baseTat = true;
        ra.loi = k.thong_diep;
        return;
      }
      ra.theoMa.set(m, k);
    });
  };

  for (let i = 0; i < ma.length; i += TRAN_DS_MA) {
    if (ra.baseTat) break;
    const lo = ma.slice(i, i + TRAN_DS_MA);
    const k = await hoi("base", "base.co_viec_cho_ma_khong", lyDo, {
      ...tc,
      tham_so: { ds_ma: lo, ma_du_an: duAn },
    });
    const kq = obj(k).ket_qua;
    if (k.ok && Array.isArray(kq)) {
      for (const phan of kq as Record<string, unknown>[]) {
        const m = String(phan?.ma ?? "").trim();
        if (m === "") continue;
        ra.theoMa.set(m, { ...k, du_lieu: phan });
      }
      continue;
    }
    if (!k.ok && k.ma_loi === "AGENT_KHONG_SAN_SANG") {
      ra.baseTat = true;
      ra.loi = k.thong_diep;
      break;
    }
    if (k.ok || k.ma_loi === "KHONG_HIEU_YEU_CAU") {
      // Base bản cũ: chưa hiểu `ds_ma` → từng mã như trước 27/09
      await tungMa(lo);
      continue;
    }
    // KHONG_CO_DU_LIEU / hết hạn chờ / lỗi nội bộ: câu này đúng cho mọi mã trong lô
    for (const m of lo) ra.theoMa.set(m, k);
    if (k.ma_loi !== "KHONG_CO_DU_LIEU") ra.loi = k.thong_diep;
  }
  return ra;
}

// ─────────────────────────────────────────────────────────────

interface UngVien {
  wbs: string;
  ten: string;
  gang: boolean;
  /** % tiến độ nếu đã biết (từ chuỗi găng); null = chưa hỏi */
  pct: number | null;
}

function sapUngVien(ds: Iterable<UngVien>): UngVien[] {
  // Găng lên đầu, rồi theo thứ tự mã
  return Array.from(ds).sort(
    (a, b) => Number(b.gang) - Number(a.gang) || a.wbs.localeCompare(b.wbs, "vi", { numeric: true }),
  );
}

/**
 * Gom ứng viên WBS: chuỗi găng (găng trước) + các mã Base đang có việc — và
 * câu trả lời Base cho đúng những mã sẽ soát (tối đa HAI lượt K2).
 * Base trả `ma_wbs_co_trong_du_lieu` tối đa 20 mã — vừa khớp trần của Mr. Đại.
 */
async function ungVien(
  duAn: string,
  ket: KhoiMauThuan,
  tc: TuyChonNho,
): Promise<{ uv: UngVien[]; base: Map<string, KhuonTra>; baseTat: boolean }> {
  const kGang = await hoiTienDo("tiendo.duong_gang", { ma_du_an: duAn }, LY_DO(duAn), undefined, tc);
  const ds = new Map<string, UngVien>();
  if (kGang.ok) {
    const cg = (obj(kGang).chuoi_gang as Record<string, unknown>[] | undefined) ?? [];
    for (const c of cg) {
      const wbs = String(c.wbs ?? "").trim();
      if (wbs === "") continue;
      ds.set(wbs, { wbs, ten: String(c.ten ?? ""), gang: true, pct: typeof c.pct === "number" ? c.pct : null });
    }
  } else {
    ket.chuaHoiDuoc.push(`Agent Tiến độ (đường găng): ${kGang.thong_diep}`);
  }

  // Lượt K2 thứ nhất: các mã găng sẽ soát. Không có mã găng nào thì vẫn hỏi một mã
  // "0" chỉ để lấy danh sách mã Base đang có việc (như trước 27/09).
  const gangSoat = sapUngVien(ds.values()).slice(0, TOI_DA_WBS_MOI_LOAI).map((u) => u.wbs);
  const lan1 = await hoiBaseNhieuMa(duAn, gangSoat.length > 0 ? gangSoat : ["0"], LY_DO(duAn), tc);
  const base = new Map(lan1.theoMa);
  let baseTat = lan1.baseTat;

  for (const k of Array.from(lan1.theoMa.values())) {
    const cac = obj(k).ma_wbs_co_trong_du_lieu;
    if (!Array.isArray(cac)) continue;
    for (const m of cac) {
      const wbs = String(m ?? "").trim();
      if (wbs !== "" && !ds.has(wbs)) ds.set(wbs, { wbs, ten: "", gang: false, pct: null });
    }
    break; // danh sách này như nhau ở mọi mã — đọc một lần
  }
  if (lan1.loi !== null) ket.chuaHoiDuoc.push(`Agent Công việc (tra mã đã có việc giao chưa): ${lan1.loi}`);

  const uv = sapUngVien(ds.values());
  // Lượt K2 thứ hai: mã Base có thêm lọt vào top 20 mà chưa hỏi
  const conThieu = uv
    .slice(0, TOI_DA_WBS_MOI_LOAI)
    .map((u) => u.wbs)
    .filter((m) => !base.has(m));
  if (conThieu.length > 0 && !baseTat) {
    const lan2 = await hoiBaseNhieuMa(duAn, conThieu, LY_DO(duAn), tc);
    lan2.theoMa.forEach((v, m) => base.set(m, v));
    baseTat = lan2.baseTat;
    if (lan2.loi !== null && lan1.loi === null) {
      ket.chuaHoiDuoc.push(`Agent Công việc (tra mã đã có việc giao chưa): ${lan2.loi}`);
    }
  }
  return { uv, base, baseTat };
}

/** (a) Base XONG ↔ Pháp lý còn thiếu hồ sơ */
async function soatHoSo(
  duAn: string,
  uv: UngVien[],
  base: Map<string, KhuonTra>,
  baseTat: boolean,
  ket: KhoiMauThuan,
  tc: TuyChonNho,
): Promise<void> {
  const chon = uv.slice(0, TOI_DA_WBS_MOI_LOAI);
  ket.daSoat.hoSo = chon.length;
  let phapLyTat = false;
  await theoNhom(chon, async (u) => {
    const kb = base.get(u.wbs);
    if (!kb || !kb.ok) return;
    const b = obj(kb);
    const soXong = typeof b.so_viec_da_xong === "number" ? b.so_viec_da_xong : 0;
    if (b.tim_thay_ma !== true || soXong <= 0) return;
    if (phapLyTat) return;
    // ⭐ 23/09 — PHẢI truyền ma_du_an. Đo sổ: 22/09 không truyền thì pháp lý tự đoán
    // dự án (WBS 1.1 → trả hồ sơ của Nậm Săm 3A cho dự án HV — mâu thuẫn GIẢ);
    // từ 23/09 00:58 pháp lý từ chối KHONG_HIEU_YEU_CAU và nhánh cũ lặng lẽ bỏ qua
    // → loại (a) soát 0 mã mà vẫn báo "0 chỗ khác nhau".
    // (Pháp lý chưa có công cụ nhận nhiều mã — hỏi từng mã, nhưng mỗi câu nhớ 10 phút.)
    const kp = await hoiAgent("phaply", "phaply.ho_so_cua_wbs", LY_DO(duAn), {
      ...tc,
      tham_so: { ma_wbs: u.wbs, ma_du_an: duAn },
    });
    if (!kp.ok) {
      if (kp.ma_loi === "AGENT_KHONG_SAN_SANG") phapLyTat = true;
      else if (kp.ma_loi === "KHONG_CO_DU_LIEU")
        ket.chuaTraDuoc.push({ wbs: u.wbs, lyDo: `Pháp lý chưa gán hồ sơ nào cho mã này (agent Công việc có ${soXong} việc xong)` });
      // Lỗi khác cũng phải NÓI RA — không được biến thành "sạch"
      else ket.chuaTraDuoc.push({ wbs: u.wbs, lyDo: `Pháp lý: ${kp.thong_diep.slice(0, 140)}` });
      return;
    }
    const p = obj(kp);
    const conThieu = typeof p.con_thieu === "number" ? p.con_thieu : 0;
    const soHoSo = typeof p.so_ho_so === "number" ? p.so_ho_so : 0;
    if (conThieu <= 0) return;
    // 18/10 (T1): giữ cả TÊN hồ sơ Pháp lý trả (`ho_so[].ten`) để câu ghi «mã + tên» (luật 30)
    const hoSoThieu = ((p.ho_so as Record<string, unknown>[] | undefined) ?? [])
      .filter((h) => h.da_co !== true)
      .map((h) => ({ ma: String(h.ma_ho_so ?? "").trim(), ten: typeof h.ten === "string" && h.ten.trim() !== "" ? h.ten.trim() : null }))
      .filter((h) => h.ma !== "");
    const thieu = hoSoThieu.map((h) => h.ma).slice(0, 4);
    ket.dong.push({
      loai: "ho-so",
      wbs: u.wbs,
      tenWbs: u.ten,
      gang: u.gang,
      chiTiet: {
        soViecXong: soXong,
        soViecDangMo: typeof b.so_viec_dang_mo === "number" ? b.so_viec_dang_mo : 0,
        hoSoThieu,
        conThieu,
        soHoSo,
      },
      benA: {
        agent: "Agent Công việc",
        noiDung: `${soXong} việc mang mã ${nhanMa(u.wbs, u.ten)} đã XONG bên agent Công việc`,
        nguon: nguonCua(kb, "sổ cái agent Công việc — tra việc theo mã WBS"),
      },
      benB: {
        agent: "Agent Pháp lý",
        noiDung: `hồ sơ của mã này còn thiếu ${conThieu}/${soHoSo}${thieu.length > 0 ? ` (${thieu.join(", ")})` : ""}`,
        nguon: nguonCua(kp, "danh mục hồ sơ cần có của agent Pháp lý — tra theo mã WBS"),
      },
    });
  });
  if (baseTat) ket.chuaHoiDuoc.push("Agent Công việc tắt giữa chừng — loại (a) soát dở");
  if (phapLyTat) ket.chuaHoiDuoc.push("Agent Pháp lý tắt giữa chừng — loại (a) soát dở");
}

/** (b) Tiến độ 100% ↔ Nghiệm thu chưa nghiệm thu xong (20/10/2026: agent Nghiệm thu ghép 4 trạng thái, tự hỏi Hợp đồng) */
async function soatNghiemThu(duAn: string, uv: UngVien[], ket: KhoiMauThuan, tc: TuyChonNho): Promise<void> {
  const chon = uv.slice(0, TOI_DA_WBS_MOI_LOAI);
  ket.daSoat.nghiemThu = chon.length;

  // % của mã chưa biết: MỘT danh sách mọi đầu việc (cắt trang K1, dùng chung với từ điển
  // tên việc, nhớ 10 phút) thay cho 16 lượt hỏi từng mã (đo 26/09). Danh sách hỏng hoặc
  // thiếu đúng mã đó thì mới hỏi riêng mã đó (tim_dau_viec ma_wbs trả cả cây con).
  const canHoi = chon.filter((u) => u.pct === null);
  const theoWbs = new Map<string, Record<string, unknown>>();
  let danhSachDu = false;
  if (canHoi.length > 0) {
    const tatCa = await layMoiDauViec(duAn, LY_DO(duAn), tc);
    for (const t of tatCa.tasks) theoWbs.set(String(t.wbs ?? ""), t);
    danhSachDu = tatCa.du && tatCa.loi === null;
  }
  const gan = (u: UngVien, t: Record<string, unknown> | undefined): UngVien =>
    t
      ? { ...u, ten: u.ten || String(t.name ?? ""), gang: u.gang || t.critical === true, pct: typeof t.pct === "number" ? t.pct : null }
      : { ...u, pct: null };

  const daBiet = await theoNhom(chon, async (u) => {
    if (u.pct !== null) return u;
    const tuDs = theoWbs.get(u.wbs);
    if (tuDs || danhSachDu) return gan(u, tuDs); // danh sách đủ mà không có mã → Tiến độ không có mã này
    const k = await hoiTienDo("tiendo.tim_dau_viec", { ma_du_an: duAn, ma_wbs: u.wbs }, LY_DO(duAn), undefined, tc);
    if (!k.ok) return { ...u, pct: null };
    const t = ((obj(k).tasks as Record<string, unknown>[] | undefined) ?? []).find((x) => String(x.wbs ?? "") === u.wbs);
    return gan(u, t);
  });
  const xong = daBiet.filter((u) => u.pct !== null && u.pct >= 100);
  let hopDongTat = false;
  await theoNhom(xong, async (u) => {
    if (hopDongTat) return;
    const kh = await hoiAgent("nghiemthu", "nghiemthu.da_nghiem_thu_chua", LY_DO(duAn), {
      ...tc,
      tham_so: { ma_du_an: duAn, ma_wbs: u.wbs },
    });
    if (!kh.ok) {
      if (kh.ma_loi === "AGENT_KHONG_SAN_SANG") hopDongTat = true;
      else ket.chuaTraDuoc.push({ wbs: u.wbs, lyDo: `Nghiệm thu: ${kh.thong_diep}` });
      return;
    }
    const h = obj(kh);
    if (h.trang_thai === "khong_tra_duoc" || h.da_nghiem_thu === null || h.da_nghiem_thu === undefined) {
      ket.chuaTraDuoc.push({ wbs: u.wbs, lyDo: `Nghiệm thu chưa tra được (${String(h.ly_do ?? "không rõ lý do").slice(0, 160)})` });
      return;
    }
    if (h.da_nghiem_thu === true) return;
    const soBienBan = typeof h.so_bien_ban === "number" ? h.so_bien_ban : 0;
    ket.dong.push({
      loai: "nghiem-thu",
      wbs: u.wbs,
      tenWbs: u.ten,
      gang: u.gang,
      chiTiet: { trangThaiHopDong: chuTrangThaiHopDong(h.trang_thai), soBienBan },
      benA: {
        agent: "Agent Tiến độ",
        noiDung: `mã ${nhanMa(u.wbs, u.ten)} đã 100% tiến độ`,
        nguon: "bảng tiến độ agent Tiến độ (đường găng · danh sách đầu việc) · schedule.json",
      },
      benB: {
        agent: "Agent Nghiệm thu",
        noiDung: `chưa nghiệm thu xong (${chuTrangThaiHopDong(h.trang_thai)}, ${soBienBan} biên bản)`,
        nguon: nguonCua(kh, "sổ biên bản agent Nghiệm thu + vế hợp đồng của agent Hợp đồng — tra theo mã WBS"),
      },
    });
  });
  if (hopDongTat) ket.chuaHoiDuoc.push("Agent Nghiệm thu tắt giữa chừng — loại (b) soát dở");
}

/**
 * ⭐ 18/10/2026 (T1) — luật 30 «mã kèm tên»: mã chỉ có ở agent Công việc (không nằm trên đường găng) chưa có tên việc.
 * Tra thêm MỘT lượt từ điển tên việc của dự án (agent Tiến độ `tim_dau_viec`, đệm 10 phút, có vết trong sổ — luật 29)
 * rồi ghép câu. Đo 18/10 HV: 3/3 dòng mâu thuẫn tenWbs rỗng trước khi tra. Tra không được → câu ghi rõ «chưa có tên».
 */
async function ganTenVaCau(duAn: string, ket: KhoiMauThuan): Promise<void> {
  const canTen = [...ket.dong.map((d) => ({ wbs: d.wbs, ten: d.tenWbs })), ...ket.chuaTraDuoc.map((x) => ({ wbs: x.wbs, ten: x.tenWbs ?? "" }))];
  if (canTen.some((x) => x.ten.trim() === "")) {
    const { ten } = await layTuDienWbs(duAn, `${LY_DO(duAn)}: tên việc cho mã WBS trong câu mâu thuẫn (luật 30 mã kèm tên)`);
    for (const d of ket.dong) if (d.tenWbs.trim() === "" && ten[d.wbs]) d.tenWbs = ten[d.wbs]!;
    for (const x of ket.chuaTraDuoc) if (!x.tenWbs && ten[x.wbs]) x.tenWbs = rutGonTen(ten[x.wbs]!);
  }
  for (const d of ket.dong) {
    const cau = cauMauThuan(d);
    if (cau) d.cau = cau;
  }
}

/** Soát mới cả khối — không ném lỗi */
async function soatMoi(duAn: string, lamMoi: boolean): Promise<KhoiMauThuan> {
  const tc: TuyChonNho = lamMoi ? { boQuaNho: true } : {};
  const ket: KhoiMauThuan = {
    duAn,
    luc: new Date().toISOString(),
    dong: [],
    daSoat: { hoSo: 0, nghiemThu: 0 },
    chuaHoiDuoc: [],
    chuaTraDuoc: [],
  };
  try {
    const { uv, base, baseTat } = await ungVien(duAn, ket, tc);
    await Promise.all([soatHoSo(duAn, uv, base, baseTat, ket, tc), soatNghiemThu(duAn, uv, ket, tc)]);
    // Găng lên đầu để người đọc thấy chỗ đau nhất trước
    ket.dong.sort((a, b) => Number(b.gang) - Number(a.gang) || a.wbs.localeCompare(b.wbs, "vi", { numeric: true }));
    // Gọn: một mã chỉ ghi "chưa tra được" một lần
    const daCo = new Set<string>();
    ket.chuaTraDuoc = ket.chuaTraDuoc.filter((x) => (daCo.has(x.wbs + x.lyDo) ? false : (daCo.add(x.wbs + x.lyDo), true)));
    await ganTenVaCau(duAn, ket);
  } catch (e) {
    ket.chuaHoiDuoc.push(`Lỗi khi soát: ${e instanceof Error ? e.message : "không rõ"}`);
  }
  return ket;
}

/**
 * Gom cả khối cho một dự án. Không ném lỗi; nhớ 10 phút (globalThis); hai lượt mở
 * cùng lúc (React dev chạy hiệu ứng hai lần, hai tab) dùng chung MỘT lượt soát.
 */
export async function gomMauThuanCheo(duAn: string, lamMoi = false): Promise<KhoiMauThuan> {
  const k = khoMt();
  const c = k.nho.get(duAn);
  if (!lamMoi && c && Date.now() - c.luc < NHO_MS) return c.ket;
  const dang = k.dangBay.get(duAn);
  if (dang) return dang;

  const p = soatMoi(duAn, lamMoi).then((ket) => {
    k.nho.set(duAn, { luc: Date.now(), ket });
    return ket;
  });
  k.dangBay.set(duAn, p);
  void p.finally(() => {
    if (k.dangBay.get(duAn) === p) k.dangBay.delete(duAn);
  });
  return p;
}
