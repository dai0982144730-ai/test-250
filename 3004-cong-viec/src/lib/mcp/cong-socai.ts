// ============================================================
// CỔNG MCP `socai.*` — SCI công việc TRẢ LỜI các agent khác (agent tiến độ, main, báo cáo…)
//
// Làm theo đúng cách cổng `tiendo.*` của agent tiến độ (src/lib/mcp/cong-tiendo.ts):
//   • khuôn trả HOP-DONG-KET-NOI mục 3 (khuon.ts): { ok, du_lieu, nguon, thoi_diem_tra_loi, canh_bao }
//     hoặc { ok:false, ma_loi, thong_diep } — KHÔNG ném ngoại lệ ra ngoài biên MCP.
//   • 3 công cụ bắt buộc (nang_luc · suc_khoe · tim_theo_ma) + công cụ nghiệp vụ.
//   • trần 100 bản ghi; KHÔNG công cụ nào ghi dữ liệu nghiệp vụ hay gọi LLM.
// Khác bản gốc: xác thực bằng KHÓA RIÊNG (khoa-agent.ts) thay vì chỉ mạng nội bộ,
// và mỗi dòng việc trả đúng dạng DongSoCaiAgent (so-cai/dinh-dang-agent.ts — tên
// trường cố định, mô tả ở docs/SO-CAI-CHO-AGENT.md).
// Server-only.
// ⛔ BẢO MẬT TÀI CHÍNH (Mr. Đại chốt 07/10/2026): agent khác (Quan sát, Main, Tiến độ, Hợp đồng, Pháp lý, Nghiệm thu và agent
//   viết sau) KHÔNG BAO GIỜ nhận chương mật của báo cáo mẫu mật (Form 4 — I–III). Thêm công cụ trả nội dung tệp thì BẮT BUỘC
//   docPhienBan(q, id, phienBan, null) — bản đã cắt, chỗ cắt ghi sẵn câu "Không có số liệu…"; cấm docTep / MAY_DOC_TOAN_VAN.
// ============================================================

import type { Q } from "@/lib/db";
import { danhSachSoCai, viecDaXong, type LocSoCai } from "@/lib/so-cai/dich-vu";
import { dongChoAgent, type DongSoCaiAgent } from "@/lib/so-cai/dinh-dang-agent";
import { layCay, timDonVi, timNguoi } from "@/lib/ai/tra-cuu";
import { PHIEN_BAN_HOP_DONG, TRAN_BAN_GHI, thanhCong, thatBai, type KhuonTra, type NguonMcp } from "./khuon";

/** Mã chuẩn của cổng này (ma trận "Ai được gọi ai" của các agent SCI) */
export const MA_CONG = "socai";

export interface MoTaCongCu {
  ten: string;
  mo_ta: string;
  tham_so: string;
  san_sang: boolean;
  /** JSON Schema cho tools/list của MCP chuẩn */
  input_schema: Record<string, unknown>;
}

const LOC_VIEC = {
  don_vi: { type: "string", description: "Mã hoặc tên đơn vị: ban-tgd, p-dtpc, SCI E&C, BQLDA Quảng Trị…" },
  du_an: { type: "string", description: "Tên dự án, vd «ĐG Hướng Việt»" },
  nguoi: { type: "string", description: "Email hoặc tên người phụ trách" },
  luon_mo: { type: "boolean", description: "true = chỉ việc luôn mở (không ngày); false = chỉ việc có hạn" },
  canh_bao: { type: "string", enum: ["qua_han", "sap_den_han"] },
  tu_khoa: { type: "string" },
  gioi_han: { type: "integer", minimum: 1, maximum: TRAN_BAN_GHI },
};

export const DANH_MUC_CONG_CU: MoTaCongCu[] = [
  { ten: "nang_luc", mo_ta: "Danh sách công cụ cổng socai cung cấp", tham_so: "—", san_sang: true, input_schema: { type: "object", properties: {} } },
  { ten: "suc_khoe", mo_ta: "Cổng còn sống không, phiên bản hợp đồng nào", tham_so: "—", san_sang: true, input_schema: { type: "object", properties: {} } },
  {
    ten: "tim_theo_ma",
    mo_ta: "Tra một mã việc (CV-2026-0412) — đang mở hoặc đã xong",
    tham_so: "ma",
    san_sang: true,
    input_schema: { type: "object", properties: { ma: { type: "string" } }, required: ["ma"] },
  },
  {
    ten: "socai.danh_sach_viec",
    mo_ta: "Việc ĐANG MỞ trong sổ cái, lọc theo đơn vị, dự án, người, luôn mở hay có hạn, cảnh báo. Mỗi dòng dạng DongSoCaiAgent (không kèm quá trình).",
    tham_so: "don_vi?, du_an?, nguoi?, luon_mo?, canh_bao?, tu_khoa?, gioi_han?",
    san_sang: true,
    input_schema: { type: "object", properties: LOC_VIEC },
  },
  {
    ten: "socai.chi_tiet_viec",
    mo_ta: "Một việc: phần việc, người, ngày, nguồn hiện hành, các bản đã bị đè, quá trình",
    tham_so: "ma_viec",
    san_sang: true,
    input_schema: { type: "object", properties: { ma_viec: { type: "string" } }, required: ["ma_viec"] },
  },
  {
    ten: "socai.viec_cua_don_vi",
    mo_ta: "Việc đang mở của MỘT đơn vị hoặc MỘT người",
    tham_so: "don_vi | nguoi",
    san_sang: true,
    input_schema: { type: "object", properties: { don_vi: LOC_VIEC.don_vi, nguoi: LOC_VIEC.nguoi, gioi_han: LOC_VIEC.gioi_han } },
  },
  {
    ten: "lichsu.tra_cuu_viec",
    mo_ta: "Việc ĐÃ XONG (đã rời sổ cái: hoàn thành hoặc đóng) trong khoảng ngày",
    tham_so: "tu?, den? (yyyy-mm-dd), don_vi?, du_an?, nguoi?, tu_khoa?, ma_viec?, gioi_han?",
    san_sang: true,
    input_schema: {
      type: "object",
      properties: {
        tu: { type: "string", format: "date" },
        den: { type: "string", format: "date" },
        ma_viec: { type: "string" },
        ...LOC_VIEC,
      },
    },
  },
];

// ---------------------------------------------------------------
// Tiện ích
// ---------------------------------------------------------------

function chuoi(tham: Record<string, unknown>, khoa: string): string {
  const v = tham[khoa];
  return typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
}

function gioiHan(tham: Record<string, unknown>): number {
  const v = Number(tham.gioi_han ?? TRAN_BAN_GHI);
  return Number.isFinite(v) ? Math.max(1, Math.min(TRAN_BAN_GHI, Math.round(v))) : TRAN_BAN_GHI;
}

const ISO_NGAY = /^\d{4}-\d{2}-\d{2}$/;

/** Nguồn luôn có: chính sổ cái SCI công việc (kể cả khi danh sách rỗng — "không có việc" cũng là dữ liệu) */
function nguonSoCai(trangThai?: string): NguonMcp {
  return { loai: "so-cai", ma: "docflow.so_cai", file_goc: "CSDL scidocflow · view docflow.so_cai", thoi_diem_trich: new Date().toISOString(), trang_thai: trangThai };
}

function nguonViec(v: DongSoCaiAgent): NguonMcp {
  return {
    loai: "cong-viec",
    ma: v.ma_viec,
    file_goc: v.nguon_hien_hanh ? `${v.nguon_hien_hanh.bao_cao} · ${v.nguon_hien_hanh.don_vi}` : "giao tay trong SCI công việc",
    vi_tri: `/cong-viec/${v.ma_viec}`,
    trang_thai: v.trang_thai,
  };
}

/** Hàm module khác chưa xong ném "Chưa làm" → mã lỗi AGENT_KHONG_SAN_SANG (không ném ra ngoài) */
class ChuaSan extends Error {}
async function goi<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/chưa làm/i.test(msg)) throw new ChuaSan("Sổ cái SCI công việc đang được xây dựng — chưa trả được dữ liệu này.");
    throw e;
  }
}

async function dungLoc(q: Q, tham: Record<string, unknown>): Promise<{ loc: LocSoCai } | { loi: KhuonTra }> {
  const loc: LocSoCai = {};
  const hoiDv = chuoi(tham, "don_vi") || chuoi(tham, "cong_ty") || chuoi(tham, "don_vi_id");
  if (hoiDv !== "") {
    const cay = await layCay(q);
    const dv = timDonVi(cay, hoiDv);
    if (!dv) {
      return { loi: thatBai("KHONG_HIEU_YEU_CAU", `Không nhận ra đơn vị "${hoiDv}". Mã hợp lệ: ${cay.map((d) => `${d.id} (${d.ten_ngan})`).join(", ")}.`) };
    }
    loc.don_vi_id = dv.id;
  }
  const hoiNguoi = chuoi(tham, "nguoi");
  if (hoiNguoi !== "") {
    const ng = await timNguoi(q, hoiNguoi);
    if (ng.length === 0) return { loi: thatBai("KHONG_CO_DU_LIEU", `Không có người dùng "${hoiNguoi}" trong SCI công việc.`) };
    if (ng.length > 1) {
      return { loi: thatBai("KHONG_HIEU_YEU_CAU", `"${hoiNguoi}" khớp ${ng.length} người: ${ng.map((x) => x.email).join(", ")} — gửi email cho chắc.`) };
    }
    loc.nguoi = ng[0]!.id;
  }
  const duAn = chuoi(tham, "du_an");
  if (duAn !== "") loc.du_an = duAn;
  const lm = tham.luon_mo;
  if (lm === true || lm === "true") loc.luon_mo = true;
  else if (lm === false || lm === "false") loc.luon_mo = false;
  const cb = chuoi(tham, "canh_bao");
  if (cb !== "") {
    if (cb !== "qua_han" && cb !== "sap_den_han") return { loi: thatBai("KHONG_HIEU_YEU_CAU", "`canh_bao` chỉ nhận qua_han hoặc sap_den_han.") };
    loc.canh_bao = cb;
  }
  const tk = chuoi(tham, "tu_khoa");
  if (tk !== "") loc.tu_khoa = tk;
  return { loc };
}

async function sangDongAgent(q: Q, ids: string[], coQuaTrinh: boolean): Promise<DongSoCaiAgent[]> {
  const ra: DongSoCaiAgent[] = [];
  for (const id of ids) {
    const d = await goi(() => dongChoAgent(q, id, coQuaTrinh));
    if (d) ra.push(d);
  }
  return ra;
}

// ---------------------------------------------------------------
// Từng công cụ
// ---------------------------------------------------------------

function ccNangLuc(): KhuonTra {
  return thanhCong(
    { agent: MA_CONG, ung_dung: "SCI công việc", phien_ban_hop_dong: PHIEN_BAN_HOP_DONG, tai_lieu: "docs/SO-CAI-CHO-AGENT.md", cong_cu: DANH_MUC_CONG_CU.map(({ input_schema: _s, ...c }) => c) },
    [{ loai: "tai-lieu", ma: "SO-CAI-CHO-AGENT", file_goc: "docs/SO-CAI-CHO-AGENT.md" }],
  );
}

function ccSucKhoe(): KhuonTra {
  return thanhCong({ ok: true, phien_ban_hop_dong: PHIEN_BAN_HOP_DONG, thoi_diem: new Date().toISOString() }, [
    { loai: "tai-lieu", ma: "suc_khoe", file_goc: "src/lib/mcp/cong-socai.ts" },
  ]);
}

async function ccChiTiet(q: Q, ma: string): Promise<KhuonTra> {
  const m = ma.trim().toUpperCase();
  if (m === "") return thatBai("KHONG_HIEU_YEU_CAU", "Thiếu `ma_viec` (vd CV-2026-0412).");
  if (!/^[A-Z0-9_-]{1,64}$/.test(m)) return thatBai("KHONG_HIEU_YEU_CAU", `Mã việc "${ma}" không hợp lệ.`);
  const d = await goi(() => dongChoAgent(q, m, true));
  if (!d) return thatBai("KHONG_CO_DU_LIEU", `Không có việc mã ${m} trong SCI công việc.`);
  return thanhCong(d, [nguonViec(d), nguonSoCai()]);
}

async function ccDanhSach(q: Q, tham: Record<string, unknown>, batBuocDoiTuong: boolean): Promise<KhuonTra> {
  const l = await dungLoc(q, tham);
  if ("loi" in l) return l.loi;
  if (batBuocDoiTuong && !l.loc.don_vi_id && !l.loc.nguoi) {
    return thatBai("KHONG_HIEU_YEU_CAU", "Cần `don_vi` hoặc `nguoi`.");
  }
  const ds = await goi(() => danhSachSoCai(q, l.loc));
  const n = gioiHan(tham);
  const dong = await sangDongAgent(q, ds.slice(0, n).map((v) => v.id), false);
  const canhBao: string[] = [];
  if (ds.length > n) canhBao.push(`Có ${ds.length} việc, chỉ trả ${n} (trần ${TRAN_BAN_GHI}) — lọc hẹp hơn để lấy đủ.`);
  return thanhCong(
    { tong: ds.length, qua_han: ds.filter((v) => v.canh_bao === "qua_han").length, sap_den_han: ds.filter((v) => v.canh_bao === "sap_den_han").length, viec: dong },
    [nguonSoCai("dang_mo"), ...dong.slice(0, TRAN_BAN_GHI - 1).map(nguonViec)],
    canhBao,
  );
}

async function ccDaXong(q: Q, tham: Record<string, unknown>): Promise<KhuonTra> {
  const ma = chuoi(tham, "ma_viec");
  if (ma !== "") return ccChiTiet(q, ma);
  const l = await dungLoc(q, tham);
  if ("loi" in l) return l.loi;
  const tu = chuoi(tham, "tu");
  const den = chuoi(tham, "den");
  if ((tu !== "" && !ISO_NGAY.test(tu)) || (den !== "" && !ISO_NGAY.test(den))) {
    return thatBai("KHONG_HIEU_YEU_CAU", "`tu`/`den` phải dạng yyyy-mm-dd.");
  }
  const ds = await goi(() => viecDaXong(q, { ...l.loc, ...(tu ? { tu } : {}), ...(den ? { den } : {}) }));
  const n = gioiHan(tham);
  const dong = await sangDongAgent(q, ds.slice(0, n).map((v) => v.id), false);
  return thanhCong(
    { tong: ds.length, viec: dong },
    [{ loai: "lich-su", ma: "docflow.cong_viec", file_goc: "CSDL scidocflow · việc đã rời sổ cái", thoi_diem_trich: new Date().toISOString() }, ...dong.slice(0, TRAN_BAN_GHI - 1).map(nguonViec)],
    ds.length > n ? [`Có ${ds.length} việc, chỉ trả ${n}.`] : [],
  );
}

/** Điều phối — KHÔNG BAO GIỜ ném ngoại lệ (mọi lỗi thành khuôn thất bại) */
export async function chayCongCu(q: Q, congCu: string, thamSo: Record<string, unknown>): Promise<KhuonTra> {
  try {
    switch (congCu) {
      case "nang_luc":
        return ccNangLuc();
      case "suc_khoe":
        return ccSucKhoe();
      case "tim_theo_ma":
        return await ccChiTiet(q, chuoi(thamSo, "ma") || chuoi(thamSo, "ma_viec"));
      case "socai.danh_sach_viec":
        return await ccDanhSach(q, thamSo, false);
      case "socai.viec_cua_don_vi":
        return await ccDanhSach(q, thamSo, true);
      case "socai.chi_tiet_viec":
        return await ccChiTiet(q, chuoi(thamSo, "ma_viec") || chuoi(thamSo, "ma"));
      case "lichsu.tra_cuu_viec":
        return await ccDaXong(q, thamSo);
      default:
        return thatBai("KHONG_HIEU_YEU_CAU", `Không có công cụ "${congCu}". Gọi nang_luc để xem danh mục.`);
    }
  } catch (e) {
    if (e instanceof ChuaSan) return thatBai("AGENT_KHONG_SAN_SANG", e.message);
    return thatBai("LOI_NOI_BO", e instanceof Error ? e.message : "Lỗi không rõ trong cổng MCP.");
  }
}
