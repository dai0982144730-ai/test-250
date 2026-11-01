// ============================================================
// TÓM TẮT TIẾN ĐỘ — LẤY BẢNG GANTT TỪ AGENT TIẾN ĐỘ (Mr. Đại duyệt 26/10/2026, DE-XUAT-TOM-TAT-TIEN-DO-DONG-BO-26-10.md).
// Chỉ server (gọi mạng qua `hoiTienDo` — luật 29: có ghi sổ nhật ký). Không đụng node:fs (luật 10).
// Cổng `tiendo.bang_gantt` cắt trang 100 dòng: lặp `vi_tri += 100` tới khi `con_nua = false` (tối đa 10 trang).
// Nhớ 2 phút theo dự án — mở lại bảng không hỏi lại ngay, mà số báo cáo mới vẫn về nhanh.
// Sửa theo kiểm độc lập lần 8 (26/10/2026):
//   CT-2  trang sau hỏng / thiếu dòng so với `tong_so` → KHÔNG trả bảng cụt (ok:false, không nhớ)
//   CT-3  một lượt hỏi ngầm hỏng → cả 3004 nghỉ hỏi agent Tiến độ 60 giây (3 lỗi liền là Main/3004 ngắt mạch 10 phút mọi công cụ)
//   CT-5  `coBangGantt` trả `null` = chưa hỏi được (khác «không có Baseline»)
//   CT-12 bản cũ quá 24 giờ thì không dùng nữa — dự báo tính từ hôm nay nên sang ngày là số đã lệch
// ============================================================
import { hoiTienDo } from "@/lib/nguon-tien-do";
import { taoKhoNhoTam } from "@/lib/chung/nho-tam";
import type { DongGanttTD, TraBangGantt } from "./thuan";

export const NHO_BANG_GANTT_MS = 2 * 60 * 1000;
/** Sau một lượt hỏi hỏng, nghỉ chừng này rồi mới hỏi lại (CT-3) */
export const NGHI_SAU_LOI_MS = 60 * 1000;
/** Bản cũ quá chừng này thì không đưa ra nữa (CT-12) */
export const HAN_BAN_CU_MS = 24 * 3600 * 1000;
const SO_TRANG_TOI_DA = 10;

export type KetQuaBangGantt = { ok: true; bang: TraBangGantt; luc: string } | { ok: false; chua_co: boolean; thong_diep: string };

const kho = taoKhoNhoTam<KetQuaBangGantt>("__sciBangGanttTomTat", NHO_BANG_GANTT_MS);

/** Hỏi một trang — tách ra để bài kiểm thay được */
export type HoiTrangGantt = (thamSo: Record<string, unknown>) => Promise<{ ok: boolean; du_lieu?: unknown; ma_loi?: string; thong_diep?: string }>;

export async function layBangGanttTheoTrang(maTienDo: string, hoi: HoiTrangGantt): Promise<KetQuaBangGantt> {
  let dau: Omit<TraBangGantt, "dong"> | null = null;
  let tongSo: number | null = null;
  const dong: DongGanttTD[] = [];
  for (let trang = 0, vt = 0; trang < SO_TRANG_TOI_DA; trang++) {
    const kq = await hoi({ ma_du_an: maTienDo, vi_tri: vt });
    if (!kq.ok) {
      // Trang sau hỏng: KHÔNG dùng phần đã có — bảng cụt mà báo «ok» thì người đọc tưởng đủ (CT-2)
      if (dau) return { ok: false, chua_co: false, thong_diep: `mới lấy được ${dong.length}${tongSo !== null ? `/${tongSo}` : ""} dòng thì agent Tiến độ ngừng trả lời` };
      return { ok: false, chua_co: kq.ma_loi === "KHONG_CO_DU_LIEU", thong_diep: kq.thong_diep ?? "agent Tiến độ không trả lời" };
    }
    const d = kq.du_lieu as Omit<TraBangGantt, "dong"> & { dong?: DongGanttTD[]; con_nua?: boolean; tong_so?: number };
    dau ??= d;
    if (typeof d.tong_so === "number") tongSo = d.tong_so;
    const them = Array.isArray(d.dong) ? d.dong : [];
    dong.push(...them);
    if (!d.con_nua || !them.length) break;
    vt += them.length;
  }
  if (!dau) return { ok: false, chua_co: true, thong_diep: "agent Tiến độ không trả dòng nào" };
  if (tongSo !== null && dong.length < tongSo) {
    return { ok: false, chua_co: false, thong_diep: `mới lấy được ${dong.length}/${tongSo} dòng` };
  }
  return {
    ok: true,
    luc: new Date().toISOString(),
    bang: {
      co_baseline_duyet: dau.co_baseline_duyet === true,
      phien_ban_baseline: dau.phien_ban_baseline ?? null,
      baseline_duyet_luc: dau.baseline_duyet_luc ?? null,
      co_muc_tieu: dau.co_muc_tieu === true,
      ngay_bao_cao: dau.ngay_bao_cao ?? null,
      cod_muc_tieu: dau.cod_muc_tieu ?? null,
      cod_baseline: dau.cod_baseline ?? null,
      cod_du_bao: dau.cod_du_bao ?? null,
      dong,
    },
  };
}

/** Lúc hỏi hỏng gần nhất (mọi dự án chung — agent Tiến độ tắt là tắt cho cả bảng) — CT-3 */
const loi = ((globalThis as unknown as { __sciLoiBangGantt?: { luc: number } }).__sciLoiBangGantt ??= { luc: 0 });
const dangNghi = () => Date.now() - loi.luc < NGHI_SAU_LOI_MS;
/** Bài kiểm xoá trạng thái nghỉ */
export const _xoaNghiChoBaiKiem = () => {
  loi.luc = 0;
};

/** Dự án nào đã biết có Baseline duyệt bên Tiến độ — giữ cả khi bộ nhớ 2 phút hết hạn, để danh sách ở màn Dự án KHÔNG phải chờ
 *  agent Tiến độ tính lại (đo 26/10: lượt lạnh 3 dự án 13,5 giây; lượt nhớ 40 mili giây) */
type Biet = { co: boolean; luc: number };
const biet = ((globalThis as unknown as { __sciBietBangGantt?: Map<string, Biet> }).__sciBietBangGantt ??= new Map<string, Biet>());

/** Có Baseline duyệt bên Tiến độ không — trả ngay số đã biết (hỏi lại ngầm khi cũ quá 2 phút); chưa biết bao giờ thì mới chờ.
 *  `null` = chưa hỏi được (agent Tiến độ tắt / vừa hỏng) — KHÁC «không có Baseline» (CT-5) */
export async function coBangGantt(maTienDo: string, tenDuAn: string): Promise<boolean | null> {
  const b = biet.get(maTienDo);
  if (b) {
    if (Date.now() - b.luc > NHO_BANG_GANTT_MS && !dangNghi()) void layBangGantt(maTienDo, tenDuAn).catch(() => undefined);
    return b.co;
  }
  if (dangNghi()) return null;
  const kq = await layBangGantt(maTienDo, tenDuAn);
  if (kq.ok) return kq.bang.co_baseline_duyet;
  return kq.chua_co ? false : null;
}

/** Bảng đã lấy được lần gần nhất theo dự án — mở màn KHÔNG chờ agent Tiến độ tính lại (đo 26/10: Tân Thành lượt lạnh 7,7 giây) */
const banCuoi = ((globalThis as unknown as { __sciBangGanttCuoi?: Map<string, { kq: KetQuaBangGantt; luc: number }> }).__sciBangGanttCuoi ??= new Map());

const gioVN = (ms: number) =>
  new Date(ms).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });

/** Như `layBangGantt` nhưng có bản cũ thì trả ngay (cũ quá 2 phút thì hỏi lại ngầm cho lượt mở sau); chưa có bao giờ thì mới chờ.
 *  Bản cũ quá 24 giờ thì không đưa ra nữa (CT-12); vừa hỏi hỏng thì nghỉ 60 giây (CT-3) */
export async function layBangGanttNhanh(maTienDo: string, tenDuAn: string): Promise<KetQuaBangGantt> {
  const cu = banCuoi.get(maTienDo);
  if (cu) {
    const tuoi = Date.now() - cu.luc;
    if (tuoi > NHO_BANG_GANTT_MS && !dangNghi()) void layBangGantt(maTienDo, tenDuAn).catch(() => undefined);
    if (tuoi <= HAN_BAN_CU_MS) return cu.kq;
    return { ok: false, chua_co: false, thong_diep: `số lấy lần cuối lúc ${gioVN(cu.luc)} đã quá 24 giờ, chưa lấy được số mới` };
  }
  if (dangNghi()) return { ok: false, chua_co: false, thong_diep: "agent Tiến độ vừa không trả lời — máy tự hỏi lại sau ít nhất 1 phút" };
  return layBangGantt(maTienDo, tenDuAn);
}

/** ⭐ Cửa duy nhất: bảng Gantt cấp 1–3 của một dự án bên agent Tiến độ (`maTienDo` = mã ở Cài đặt → Dự án «Mã bên Tiến độ») */
export async function layBangGantt(maTienDo: string, tenDuAn: string): Promise<KetQuaBangGantt> {
  const { giaTri } = await kho.lay(
    maTienDo,
    () =>
      layBangGanttTheoTrang(maTienDo, (thamSo) =>
        hoiTienDo("tiendo.bang_gantt", thamSo, `Màn Tóm tắt tiến độ dự án ${tenDuAn}: vẽ bảng Gantt cấp 3 theo Baseline (nhớ tạm 2 phút)`),
      ),
    (v) => v.ok,
  );
  if (giaTri.ok) {
    loi.luc = 0;
    biet.set(maTienDo, { co: giaTri.bang.co_baseline_duyet, luc: Date.now() });
    const cu = banCuoi.get(maTienDo);
    if (!cu || cu.kq !== giaTri) banCuoi.set(maTienDo, { kq: giaTri, luc: Date.now() });
  } else if (giaTri.chua_co) {
    biet.set(maTienDo, { co: false, luc: Date.now() });
    banCuoi.delete(maTienDo);
  } else {
    loi.luc = Date.now();
  }
  return giaTri;
}
