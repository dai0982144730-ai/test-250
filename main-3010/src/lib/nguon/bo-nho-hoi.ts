// ============================================================
// BỘ NHỚ TẠM 10 PHÚT CHO CÂU HỎI ĐỌC GỬI AGENT KHÁC  (QS-074 · QS-082, 27/09/2026)
//
// Đo 26/09 21:36–21:41: bảng điều hành mở 4 lần + thanh trên cùng → Main gọi
// ra ngoài 197 lượt, mỗi lần mở gọi lại TOÀN BỘ (tom_tat_du_an 24+6 lượt, B11
// co_viec_cho_ma_khong 42 lượt, danh_sach_issue 6 lượt × 4 agent…) — y hệt câu
// cũ, nhận y hệt câu trả lời cũ. Lý do gọi của thanh trên cùng còn ghi "đệm 10
// phút" mà thật ra không đệm (bộ đệm cũ là Map cấp module — `next dev` nạp lại
// route là mất, mỗi route một bản riêng).
//
// Luật của bộ nhớ này (phần chung 27/09):
//   · chỉ nhớ công cụ ĐỌC trong DANH SÁCH TRẮNG — công cụ ghi / sức khoẻ không bao giờ nhớ
//   · khoá = agent + công cụ + tham số (chuẩn hoá thứ tự khoá) + người dùng
//     (lý do gọi KHÔNG vào khoá: cùng câu hỏi, khác lý do → cùng câu trả lời)
//   · đặt trên globalThis — mọi route dùng chung một bản, không mất khi nạp lại
//   · MỘT LƯỢT BAY: hai lượt cùng khoá cùng lúc dùng chung một lời gọi thật
//   · chỉ nhớ câu trả lời `ok: true`
//   · bản quá 10 phút KHÔNG dùng như bản tươi, nhưng giữ tối đa 24 giờ để khi bên
//     kia chưa trả lời kịp / đang ngắt mạch thì bên gọi CHỌN dùng tạm (QS-073) —
//     và phải nói rõ tuổi số (`thongTinBanCu`)
//
// File THUẦN — không node:fs (luật 10). Lượt lấy từ bộ nhớ KHÔNG ghi sổ nhật ký:
// không có lời gọi nào đi ra ngoài (luật 29 chỉ ghi lượt gọi thật).
// ============================================================

import type { KhuonTra, MaLoi, TraThanhCong } from "@/lib/mcp/khuon";

/** Nhớ 10 phút — đúng lời hứa "đệm 10 phút" ghi trong lý do gọi */
export const HAN_NHO_MS = 10 * 60 * 1000;
/** Bản cũ giữ tối đa 24 giờ — chỉ để dùng tạm khi bên kia chưa trả lời kịp */
export const GIU_BAN_CU_MS = 24 * 60 * 60 * 1000;
/** Trần số mục — quá thì bỏ mục cũ nhất (Map giữ thứ tự thêm vào) */
const TRAN_MUC = 800;

/**
 * DANH SÁCH TRẮNG — đuôi tên công cụ ĐỌC được nhớ (so theo phần sau dấu chấm
 * cuối, để `tiendo.danh_sach_issue` và `base.danh_sach_issue` cùng một luật).
 * Rà 27/09 theo sổ 26/09 + mọi chỗ gọi `hoiAgent`/`hoiTienDo` trong Main.
 * ⛔ KHÔNG thêm công cụ ghi (tao_viec…), `suc_khoe` (phải tươi), `nang_luc`.
 */
export const CONG_CU_DUOC_NHO: ReadonlySet<string> = new Set([
  // Bảng điều hành + thanh trên cùng
  "tom_tat_du_an",
  "duong_gang",
  "s_curve",
  "so_tuan",
  "ho_so_thieu",
  "viec_qua_han",
  "quy_trinh_dang_tac",
  "phieu_gia_dang_cho",
  "gia_tri_luy_ke",
  "toan_canh",
  // Màn Cảnh báo (+ chống trùng ở Bảng điều hành)
  "danh_sach_issue",
  // Khối B11 "Chỗ hai agent nói khác nhau" + từ điển tên việc
  "tim_dau_viec",
  "co_viec_cho_ma_khong",
  "ho_so_cua_wbs",
  "da_nghiem_thu_chua",
]);

/** Công cụ này có được nhớ không */
export function duocNho(cong_cu: string): boolean {
  const i = cong_cu.lastIndexOf(".");
  return CONG_CU_DUOC_NHO.has(i >= 0 ? cong_cu.slice(i + 1) : cong_cu);
}

/** Sắp khoá object đệ quy — {b,a} và {a,b} ra cùng một chuỗi */
function chuan(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(chuan);
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    const ra: Record<string, unknown> = {};
    for (const k of Object.keys(o).sort()) {
      if (o[k] === undefined) continue; // undefined không gửi đi → không vào khoá
      ra[k] = chuan(o[k]);
    }
    return ra;
  }
  return v;
}

/** Khoá nhớ = agent + công cụ + tham số chuẩn hoá + người dùng */
export function khoaNho(
  agent: string,
  cong_cu: string,
  tham_so: Record<string, unknown> | undefined,
  nguoi: string | undefined,
): string {
  return JSON.stringify([agent, cong_cu, chuan(tham_so ?? {}), nguoi ?? ""]);
}

interface Muc {
  luc: number;
  ket: TraThanhCong;
}

interface Kho {
  muc: Map<string, Muc>;
  dangBay: Map<string, Promise<KhuonTra>>;
}

const g = globalThis as unknown as { __sciBoNhoHoiAgent?: Kho };

function kho(): Kho {
  return (g.__sciBoNhoHoiAgent ??= { muc: new Map(), dangBay: new Map() });
}

/** Đánh dấu câu trả lời lấy từ BẢN CŨ (quá 10 phút) vì bên kia chưa trả lời được */
const danhDauCu = new WeakMap<object, { luc: string; lyDo: string; maLoi: MaLoi }>();

/**
 * Câu trả lời này có phải bản cũ dùng tạm không. null = số tươi (hoặc nhớ ≤ 10 phút).
 * `luc` = lúc bên kia trả lời bản đó (ISO) · `lyDo` = vì sao lần hỏi mới hỏng.
 */
export function thongTinBanCu(ket: KhuonTra): { luc: string; lyDo: string; maLoi: MaLoi } | null {
  return danhDauCu.get(ket) ?? null;
}

/** Lỗi TẠM THỜI — bên kia bận/tắt/hỏng, không phải "không có dữ liệu" */
function laLoiTamThoi(ma: MaLoi): boolean {
  return ma === "HET_HAN_CHO" || ma === "AGENT_KHONG_SAN_SANG" || ma === "LOI_NOI_BO";
}

export interface TuyChonNho {
  /** true = bỏ qua bản nhớ, hỏi thật (người bấm ↻ lấy số mới; trợ lý chat cần số tươi) */
  boQuaNho?: boolean;
  /**
   * true = lần hỏi mới hỏng vì bên kia bận/tắt mà còn bản cũ (≤ 24 giờ) thì trả
   * bản cũ, đánh dấu để màn nói "đang dùng số lúc HH:mm". Chỉ màn hiển thị bật —
   * trợ lý chat không bật (đang trả lời người thì phải nói thật là chưa có số).
   */
  dungBanCuKhiLoi?: boolean;
}

function luu(khoa: string, ket: TraThanhCong): void {
  const m = kho().muc;
  m.delete(khoa); // đưa xuống cuối thứ tự — mục mới nhất
  m.set(khoa, { luc: Date.now(), ket });
  while (m.size > TRAN_MUC) {
    const dau = m.keys().next().value;
    if (dau === undefined) break;
    m.delete(dau);
  }
}

/**
 * Hỏi có nhớ. `goi` là lời gọi thật (đã ghi sổ ở bên trong) — chỉ chạy khi
 * không có bản tươi và không có lượt nào cùng khoá đang bay.
 * Không bao giờ ném ngoại lệ.
 */
export async function hoiCoNho(
  khoa: string,
  goi: () => Promise<KhuonTra>,
  tc: TuyChonNho = {},
): Promise<KhuonTra> {
  const k = kho();
  const m = k.muc.get(khoa);
  if (!tc.boQuaNho && m && Date.now() - m.luc < HAN_NHO_MS) return m.ket;

  let p = k.dangBay.get(khoa);
  if (!p) {
    p = (async (): Promise<KhuonTra> => {
      try {
        const ket = await goi();
        if (ket.ok) luu(khoa, ket);
        return ket;
      } catch (e) {
        return {
          ok: false,
          ma_loi: "LOI_NOI_BO",
          thong_diep: `Lỗi khi hỏi agent: ${e instanceof Error ? e.message : "không rõ"}`,
        };
      }
    })();
    k.dangBay.set(khoa, p);
    // Gỡ SAU khi xong (callback của finally luôn chạy bất đồng bộ — không gỡ nhầm trước lúc đặt)
    const bay = p;
    void bay.finally(() => {
      if (k.dangBay.get(khoa) === bay) k.dangBay.delete(khoa);
    });
  }
  const ket = await p;

  if (!ket.ok && tc.dungBanCuKhiLoi && laLoiTamThoi(ket.ma_loi)) {
    const cu = k.muc.get(khoa);
    if (cu && Date.now() - cu.luc < GIU_BAN_CU_MS) {
      const ban: TraThanhCong = { ...cu.ket };
      danhDauCu.set(ban, {
        luc: cu.ket.thoi_diem_tra_loi || new Date(cu.luc).toISOString(),
        lyDo: ket.thong_diep,
        maLoi: ket.ma_loi,
      });
      return ban;
    }
  }
  return ket;
}

/** Xoá hết — dùng trong test */
export function xoaBoNhoHoi(): void {
  const k = kho();
  k.muc.clear();
  k.dangBay.clear();
}

/** Số mục đang nhớ — dùng trong test / màn theo dõi */
export function soMucDangNho(): number {
  return kho().muc.size;
}

/** "HH:mm" giờ Việt Nam từ ISO — cho câu "đang dùng số lúc HH:mm" */
export function gioPhut(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "?";
  return new Date(t).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  });
}
