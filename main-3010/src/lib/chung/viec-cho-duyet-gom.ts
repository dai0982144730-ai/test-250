// ============================================================
// BẢNG TỔNG VIỆC CHỜ DUYỆT ở Main (đợt ④, 06/10/2026 — THIET-KE-VIEC-CHO-DUYET-CHUNG-04-10 mục 2–3 · 5,
// bộ nhớ "viec-cho-duyet-tong-hop"). Main gom nháp chờ duyệt của các agent qua cửa ĐỌC `<agent>.viec_cho_duyet`,
// và chuyển cú bấm Giao / Bỏ qua về đúng agent gốc (`<agent>.giao_viec_cho_duyet` · `<agent>.bo_qua_viec_cho_duyet`).
// Bản gốc nháp nằm ở agent tạo ra; Main chỉ HIỆN + CHUYỂN. Mọi lượt đi qua hoiAgent → goiCoGhi (luật 29), kèm
// `ma_nguoi_dung` = người đang xem — agent gốc tự tính quyền giao theo dự án, Main không tự quyết.
// File gọi mạng nội bộ → CHỈ chạy phía máy chủ.
// ============================================================

import { hoiAgent } from "@/lib/nguon/hoi-agent";
import { TEN_AGENT_HOI_TRUNG } from "@/lib/chung/hoi-trung-kieu";
import type { NhapHien, ViecTuDong } from "@/lib/chung/viec-cong-viec-kieu";
import type { NhapViecAi } from "@/lib/chung/viec-ai-soan";

/** Agent đã mở 3 cửa (đợt ④ Tiến độ · Hợp đồng; đợt ⑤ agent Công việc — mã "base"; đợt ⑥ Pháp lý 07/10; đợt ⑦ Nghiệm thu 20/10 — Mr. Đại gật). Agent mới chưa mở thì khai ở dưới — màn báo rõ */
export const AGENT_CO_CUA = ["tiendo", "hopdong", "base", "phaply", "nghiemthu"] as const;
export const AGENT_CHUA_MO_CUA: { ma: string; vi: string }[] = [];

/** Đọc lâu nhất 15 giây/agent — trang không được treo vì một agent chậm */
const HAN_DOC_MS = 15_000;
/** Giao đi qua agent Công việc (có thể có lượt AI bên đó) — chờ lâu hơn, KHÔNG thử lại kẻo giao hai lần */
const HAN_GIAO_MS = 90_000;

export interface ChuaDoc {
  agent: string;
  ten: string;
  lyDo: string;
}

/** Một dòng khuôn chung mục 2 (agent gốc trả) */
interface DongKhuon {
  id: string;
  agent: string;
  du_an: { id: string; ma: string; ten: string } | null;
  tu_issue: { ma: string; tieu_de: string } | null;
  ten: string;
  ket_qua_can_co: string;
  han: string | null;
  giao_cho_goi_y: { id: string } | null;
  nguon_soan: "may" | "ai";
  hoi_trung: NhapViecAi["hoiTrung"] | null;
  van_soan?: boolean;
  chung?: boolean;
  nguoi_soan: string | null;
  luc: string;
  /** agent Công việc ghi (07/10): "cay-viec" | "issue" */
  nguon_viec?: "cay-viec" | "issue";
  /** 07/10 — ô Lọc: đường găng · mức issue gốc (agent chưa gửi → thiếu) */
  tren_duong_gang?: boolean | null;
  muc_do?: string | null;
}

function laDongKhuon(x: unknown): x is DongKhuon {
  const d = x as Partial<DongKhuon>;
  return !!d && typeof d.id === "string" && typeof d.ten === "string" && typeof d.luc === "string";
}

/** Khuôn chung → nháp hiện trên màn Main (giữ agent gốc để bấm Giao/Bỏ chuyển đúng nơi) */
function sangNhapHien(d: DongKhuon, agent: string): NhapHien {
  return {
    id: d.id,
    luc: d.luc,
    nguoi: d.nguoi_soan ?? "",
    tuIssue: d.tu_issue?.ma ?? "",
    ten: d.ten,
    moTa: d.ket_qua_can_co,
    ...(d.han ? { han: d.han } : {}),
    ...(d.du_an ? { projectId: d.du_an.id } : {}),
    ...(d.giao_cho_goi_y ? { giaoCho: d.giao_cho_goi_y.id } : {}),
    ...(d.hoi_trung ? { hoiTrung: d.hoi_trung } : {}),
    ...(d.van_soan ? { vanSoan: { nguoi: "", luc: d.luc } } : {}),
    ...(d.chung ? { chung: true } : {}),
    nguonSoan: d.nguon_soan,
    maDuAn: d.du_an?.ma ?? "",
    agent,
    ...(d.tu_issue?.tieu_de ? { tieuDeIssue: d.tu_issue.tieu_de } : {}),
    ...(d.nguon_viec ? { nguonViec: d.nguon_viec } : {}),
    ...(typeof d.tren_duong_gang === "boolean" ? { gang: d.tren_duong_gang } : {}),
    ...(d.muc_do === "red" || d.muc_do === "yellow" || d.muc_do === "green" ? { mucDo: d.muc_do } : {}),
  };
}

const tenAgent = (ma: string) => TEN_AGENT_HOI_TRUNG[ma] ?? ma;

/** Gom nháp chờ duyệt của mọi agent đã mở cửa — song song; agent nào không thưa thì ghi vào `chuaDoc` */
/** Một dòng `tu_dong` trong trả lời cửa đọc (08/10) — agent chưa nâng cấp thì không có, coi như rỗng */
function sangTuDong(x: unknown, agent: string): ViecTuDong | null {
  const d = x as Record<string, unknown> | null;
  if (!d || typeof d.id !== "string" || typeof d.ten !== "string" || typeof d.ly_do !== "string") return null;
  return {
    id: d.id,
    agent,
    maDuAn: typeof d.ma_du_an === "string" ? d.ma_du_an : "",
    ten: d.ten,
    lyDo: d.ly_do,
    luc: typeof d.luc === "string" ? d.luc : "",
    maViec: typeof d.ma_viec === "string" ? d.ma_viec : null,
  };
}

export async function gomViecChoDuyet(email: string): Promise<{ nhap: NhapHien[]; chuaDoc: ChuaDoc[]; tuDong: ViecTuDong[] }> {
  const kq = await Promise.all(
    AGENT_CO_CUA.map(async (ma) => {
      const tl = await hoiAgent(ma, `${ma}.viec_cho_duyet`, "Bảng tổng Việc của tôi ở Main — gom việc chờ duyệt người này giao được (đợt ④)", {
        tham_so: {},
        ma_nguoi_dung: email,
        hanChoMs: HAN_DOC_MS,
      });
      if (!tl.ok) return { ma, nhap: [] as NhapHien[], tuDong: [] as ViecTuDong[], loi: tl.thong_diep };
      const dl = tl.du_lieu as { viec?: unknown[]; tu_dong?: unknown[] } | null;
      const ds = dl?.viec;
      if (!Array.isArray(ds)) return { ma, nhap: [] as NhapHien[], tuDong: [] as ViecTuDong[], loi: "Trả lời sai khuôn (thiếu `viec`)." };
      const tuDong = (Array.isArray(dl?.tu_dong) ? dl.tu_dong : []).map((x) => sangTuDong(x, ma)).filter((x): x is ViecTuDong => !!x);
      return { ma, nhap: ds.filter(laDongKhuon).map((d) => sangNhapHien(d, ma)), tuDong, loi: null };
    }),
  );
  return {
    nhap: kq.flatMap((k) => k.nhap),
    tuDong: kq.flatMap((k) => k.tuDong).sort((a, b) => b.luc.localeCompare(a.luc)),
    chuaDoc: [
      ...kq.filter((k) => k.loi).map((k) => ({ agent: k.ma, ten: tenAgent(k.ma), lyDo: k.loi ?? "" })),
      ...AGENT_CHUA_MO_CUA.map((a) => ({ agent: a.ma, ten: tenAgent(a.ma), lyDo: a.vi })),
    ],
  };
}

export function laAgentCoCua(agent: string): boolean {
  return (AGENT_CO_CUA as readonly string[]).includes(agent);
}

/** Bấm Giao trên nháp của agent khác → chuyển về agent gốc. Trường nào có thì người sửa thắng nháp. */
export async function giaoQuaAgent(
  agent: string,
  email: string,
  v: { id: string; giaoCho: string; tenNhan?: string; ten?: string; ketQua?: string; han?: string; maDuAn?: string; dinhKem?: string[] },
): Promise<{ ok: true; maViec: string | null } | { ok: false; loi: string }> {
  const tl = await hoiAgent(agent, `${agent}.giao_viec_cho_duyet`, `Bảng tổng Việc của tôi ở Main — người bấm Giao việc nháp ${v.id} (đợt ④)`, {
    tham_so: {
      id: v.id,
      giao_cho: v.giaoCho,
      ...(v.tenNhan ? { ten_nhan: v.tenNhan } : {}),
      ...(v.ten !== undefined ? { ten: v.ten } : {}),
      ...(v.ketQua !== undefined ? { ket_qua: v.ketQua } : {}),
      ...(v.han !== undefined ? { han: v.han } : {}),
      ...(v.maDuAn !== undefined ? { ma_du_an: v.maDuAn } : {}),
      ...(v.dinhKem?.length ? { dinh_kem: v.dinhKem } : {}),
    },
    ma_nguoi_dung: email,
    hanChoMs: HAN_GIAO_MS,
    khongThuLai: true,
  });
  if (!tl.ok) return { ok: false, loi: `Agent ${tenAgent(agent)}: ${tl.thong_diep}` };
  return { ok: true, maViec: (tl.du_lieu as { ma_viec?: string | null } | null)?.ma_viec ?? null };
}

/** "Tự đóng" → bấm Hiện lại trên việc của agent khác → agent gốc đưa về chờ duyệt (08/10) */
export async function hienLaiQuaAgent(agent: string, email: string, id: string): Promise<{ ok: true } | { ok: false; loi: string }> {
  const tl = await hoiAgent(agent, `${agent}.hien_lai_viec_tu_dong`, `Bảng tổng Việc của tôi ở Main — người bấm Hiện lại việc tự đóng ${id}`, {
    tham_so: { id },
    ma_nguoi_dung: email,
    hanChoMs: HAN_DOC_MS,
    khongThuLai: true,
  });
  return tl.ok ? { ok: true } : { ok: false, loi: `Agent ${tenAgent(agent)}: ${tl.thong_diep}` };
}

/** Bấm Bỏ qua trên nháp của agent khác → agent gốc ghi người bỏ */
export async function boQuaQuaAgent(agent: string, email: string, id: string): Promise<{ ok: true } | { ok: false; loi: string }> {
  const tl = await hoiAgent(agent, `${agent}.bo_qua_viec_cho_duyet`, `Bảng tổng Việc của tôi ở Main — người bấm Bỏ qua nháp ${id} (đợt ④)`, {
    tham_so: { id },
    ma_nguoi_dung: email,
    hanChoMs: HAN_DOC_MS,
    khongThuLai: true,
  });
  return tl.ok ? { ok: true } : { ok: false, loi: `Agent ${tenAgent(agent)}: ${tl.thong_diep}` };
}
