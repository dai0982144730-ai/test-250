// ============================================================
// NGUỒN TIẾN ĐỘ — LỚP CÁCH LY DUY NHẤT để lấy số liệu tiến độ
//
// ⛔ LUẬT: KHÔNG file nào khác trong agent này được gọi thẳng
//    `POST /api/mcp/tiendo`. Mọi lời gọi đi qua đúng file này.
//
//    Vì sao: HUONG-DAN-BAT-AGENT-TIEN-DO mục 7 + LOI-DUNG-CHUNG 6e.4 —
//    khi kho chung PostgreSQL (`chung.wbs`) dựng xong, chỗ gọi MCP sẽ đổi
//    sang truy vấn SQL. Có lớp riêng thì sửa MỘT chỗ; không có thì phải
//    lục khắp dự án. Nghĩa vụ này ghi bắt buộc trong prompt bàn giao.
//
// Cài đặt theo HOP-DONG-KET-NOI mục 6 "Chống lan sự cố":
//    Luật 1 — mọi lời gọi có hạn chờ (10s thường · 60s nặng · 3s sức khỏe)
//    Luật 2 — ngắt mạch: 3 lỗi liên tiếp → ngừng gọi 10 phút
//    Luật 3 — màn hình không bao giờ chờ agent khác để hiện
//    Cấm    — không gọi MCP trong lúc dựng trang
//
// File này chỉ chạy PHÍA MÁY CHỦ (giữ trạng thái ngắt mạch + gọi localhost).
// Không import vào component client. Không đụng node:fs (luật 10).
// ============================================================

import type { KhuonTra, MaLoi } from "@/lib/mcp/khuon";
import { docDanhBaAgent } from "@/lib/cai-dat-base";
import { timAgent, lyDoKhongGoiDuoc } from "@/lib/danh-ba-agent";
import { ghiSuKienMach, goiCoGhi } from "@/lib/nhat-ky/so";
import { headerChuoi } from "@/lib/nhat-ky/chuoi";
import { headerKhoaNoiBo } from "@/lib/day-sang-agent";
import { duocNho, hoiCoNho, khoaNho, type TuyChonNho } from "@/lib/nguon/bo-nho-hoi";
import { cauKhongNoiDuoc, cauNgatMach, lyDoTuMaLoi, type LyDoHong } from "@/lib/nguon/cau-ngat-mach";

// ─────────────────────────────────────────────────────────────
// Cấu hình
// ─────────────────────────────────────────────────────────────

/**
 * Tên agent này khi đi hỏi — HOP-DONG-KET-NOI mục 10 điểm 2 (bắt buộc).
 *
 * ⭐ SỬA 07/09/2026: chỗ này còn ghi "base" (di sản lúc fork từ Agent Base),
 * nên mỗi lượt Main hỏi Agent Tiến độ đều đóng dấu `agent_goi: "base"` —
 * Main mạo danh Base trong sổ nhật ký và trong ma trận "ai được gọi ai" của
 * bên kia. Cửa chuẩn `src/lib/nguon/hoi-agent.ts` từ đầu đã ghi "main".
 */
export const TEN_AGENT_NAY = "main";

/**
 * ⭐ Địa chỉ agent tiến độ KHÔNG gắn cứng — đọc từ DANH BẠ AGENT khai trong
 * Cài đặt. Người điều khiển đổi địa chỉ (localhost → tên miền), bật/tắt, hay
 * thêm bớt agent mà KHÔNG phải sửa dòng code nào.
 *
 * Thứ tự ưu tiên: biến môi trường (để chạy test) → danh bạ → mặc định 3003.
 *
 * ⚠ Bẫy đã đo: file CHAY-UNG-DUNG.bat của bộ tiến độ mở ở cổng 3100, còn
 *   tài liệu MCP ghi 3003. Bật bằng `npm run dev -- -p 3003` mới khớp.
 */
const MA_AGENT_TIEN_DO = "tiendo";

function noiGoi(): { diaChi: string; duongDan: string; loi: string | null } {
  const tuEnv = process.env.URL_AGENT_TIEN_DO?.replace(/\/$/, "");
  if (tuEnv) return { diaChi: tuEnv, duongDan: "/api/mcp/tiendo", loi: null };
  try {
    const danhBa = docDanhBaAgent();
    const loi = lyDoKhongGoiDuoc(danhBa, MA_AGENT_TIEN_DO);
    if (loi) return { diaChi: "", duongDan: "", loi };
    const a = timAgent(danhBa, MA_AGENT_TIEN_DO)!;
    return { diaChi: a.diaChi, duongDan: a.duongDanMcp, loi: null };
  } catch {
    // Chưa có file cấu hình (lần chạy đầu) — dùng mặc định, không chết
    return { diaChi: "http://localhost:3003", duongDan: "/api/mcp/tiendo", loi: null };
  }
}

/** Hạn chờ theo HOP-DONG-KET-NOI mục 6.1 luật 1 */
const HAN_CHO_MS = {
  thuong: 10_000,
  nang: 60_000,
  suc_khoe: 3_000,
} as const;

/** Công cụ nặng — dùng hạn chờ 60s */
const CONG_CU_NANG = new Set<string>([
  "tiendo.du_bao",
  "tiendo.duong_gang",
  "tiendo.soat_quy_tac",
  // ⭐ QS-073 (27/09): chạy lại bộ tính lịch bên Tiến độ — đo 26/09 phía nhận trung
  // vị 6,3 giây, chậm nhất 16,9 giây; hạn 10 giây cắt oan rồi dồn thành ngắt mạch.
  "tiendo.tom_tat_du_an",
  "tiendo.s_curve",
  "tiendo.so_tuan",
]);

// ─────────────────────────────────────────────────────────────
// 13 công cụ agent tiến độ đang mở (đo 06/09/2026)
// ─────────────────────────────────────────────────────────────

export type CongCuTienDo =
  | "nang_luc"
  | "suc_khoe"
  | "tim_theo_ma"
  | "tiendo.tom_tat_du_an"
  | "tiendo.tim_dau_viec"
  | "tiendo.chi_tiet_dau_viec"
  | "tiendo.duong_gang"
  | "tiendo.du_bao"
  | "tiendo.nang_suat"
  | "tiendo.soat_quy_tac"
  | "tiendo.khoi_luong_hang_muc"
  | "tiendo.nguon_luc_huy_dong"
  | "tiendo.lich_su_du_bao"
  // ⭐ 09/09 — hai công cụ Agent tiến độ vừa mở cho Bảng điều hành
  | "tiendo.s_curve"
  | "tiendo.so_tuan";

// ─────────────────────────────────────────────────────────────
// Ngắt mạch — HOP-DONG-KET-NOI mục 6.1 luật 2
// ─────────────────────────────────────────────────────────────

const NGUONG_LOI_LIEN_TIEP = 3;
const THOI_GIAN_NGHI_MS = 10 * 60 * 1000;

const ngatMach: { soLoiLienTiep: number; moLaiLuc: number; lyDo: LyDoHong } = {
  soLoiLienTiep: 0,
  moLaiLuc: 0, // mốc thời gian được phép gọi lại
  lyDo: "khong_noi_duoc", // lý do lần hỏng gần nhất — câu ngắt mạch nói đúng nguyên nhân (kiểm lần 8 MC-01)
};

/** Lỗi "không có dữ liệu" KHÔNG tính là hỏng — mục 6.2. «Không có quyền» = agent đã thưa, không khoá 10 phút (MC-01) */
function laLoiHong(ma_loi: MaLoi): boolean {
  return ma_loi !== "KHONG_CO_DU_LIEU" && ma_loi !== "KHONG_HIEU_YEU_CAU" && ma_loi !== "KHONG_CO_QUYEN";
}

function ghiNhanHong(maLoi: string): void {
  ngatMach.soLoiLienTiep += 1;
  ngatMach.lyDo = lyDoTuMaLoi(maLoi);
  // Mạch ĐANG mở (lượt bay trước lúc mở, giờ mới hỏng) → không mở lại, không ghi
  // thêm dòng. Đo 26/09 21:40: 8 dòng "mở" liền (3…10 lỗi) cho CÙNG một lần ngắt.
  if (ngatMach.soLoiLienTiep >= NGUONG_LOI_LIEN_TIEP && Date.now() >= ngatMach.moLaiLuc) {
    ngatMach.moLaiLuc = Date.now() + THOI_GIAN_NGHI_MS;
    // Khuôn sổ bản 2 (7.1): mạch MỞ thật → một dòng `ngat_mach`
    ghiSuKienMach("mo", "tiendo", "Agent tiến độ", {
      soLoi: ngatMach.soLoiLienTiep,
      phutNghi: THOI_GIAN_NGHI_MS / 60_000,
    });
  }
}

function ghiNhanNgon(): void {
  const tungNgat = ngatMach.moLaiLuc > 0;
  ngatMach.soLoiLienTiep = 0;
  ngatMach.moLaiLuc = 0;
  // Đã nghỉ rồi gọi lại được → một dòng `mo_lai_mach`
  if (tungNgat) ghiSuKienMach("dong", "tiendo", "Agent tiến độ");
}

/** Trạng thái ngắt mạch — để màn hình hiện "thử lại lúc HH:mm" (luật 3) */
export function trangThaiNgatMach(): {
  dangNgat: boolean;
  moLaiLuc: string | null;
} {
  const dangNgat = Date.now() < ngatMach.moLaiLuc;
  return {
    dangNgat,
    moLaiLuc: dangNgat ? new Date(ngatMach.moLaiLuc).toISOString() : null,
  };
}

// ─────────────────────────────────────────────────────────────
// Lời gọi gốc
// ─────────────────────────────────────────────────────────────

function loi(ma_loi: MaLoi, thong_diep: string): KhuonTra {
  return { ok: false, ma_loi, thong_diep };
}

async function goiMotLan(
  cong_cu: CongCuTienDo,
  tham_so: Record<string, unknown> | undefined,
  ly_do_goi: string,
  ma_nguoi_dung: string | undefined,
  hanChoMs: number
): Promise<KhuonTra> {
  const noi = noiGoi();
  if (noi.loi) {
    // Agent bị TẮT hoặc chưa khai trong danh bạ: nói rõ lý do, KHÔNG gọi rồi
    // ngồi chờ hết hạn (HOP-DONG-KET-NOI 8.1 điều 5).
    return loi("AGENT_KHONG_SAN_SANG", noi.loi);
  }

  const boDem = new AbortController();
  const hetGio = setTimeout(() => boDem.abort(), hanChoMs);
  try {
    const res = await fetch(`${noi.diaChi}${noi.duongDan}`, {
      method: "POST",
      // Khuôn sổ bản 2: mã lượt + mã chuỗi sang bên nhận
      // + khoá nội bộ mọi lượt (Mr. Đại chốt 17/10/2026 tối — cổng Tiến độ lọc phần tiền của lượt máy–máy không kèm khoá)
      headers: { "Content-Type": "application/json", ...headerChuoi(), ...headerKhoaNoiBo() },
      // 4 trường theo HUONG-DAN mục 5; ma_nguoi_dung theo mục 10 điểm 3
      body: JSON.stringify({
        cong_cu,
        tham_so: tham_so ?? {},
        agent_goi: TEN_AGENT_NAY,
        ly_do_goi,
        ...(ma_nguoi_dung ? { ma_nguoi_dung } : {}),
      }),
      signal: boDem.signal,
      cache: "no-store",
    });

    // ⚠ Cổng KHÔNG BAO GIỜ trả HTTP 500 — kể cả khi sai vẫn là 200 kèm
    //   {ok:false}. Đọc `ok`, đừng đọc mã HTTP (HUONG-DAN mục 5, vấp số 2).
    // ⭐ 17/10/2026: bộ đệm dev hỏng → trang HTML 404 — nói đúng chuyện đó, không xếp nhầm «không nối được» (cùng lưới hoi-agent.ts)
    const loaiNoiDung = res.headers?.get?.("content-type") ?? null;
    if (loaiNoiDung !== null && !loaiNoiDung.includes("json")) {
      return loi(
        "AGENT_KHONG_SAN_SANG",
        `Cổng tiến độ trả mã ${res.status} kèm trang ${loaiNoiDung.split(";")[0] || "không rõ kiểu"}, không phải câu trả lời MCP — ` +
          `${res.status === 404 ? "bộ đệm dev của Agent tiến độ có thể đã hỏng, cần khởi động lại cổng 3003" : "kiểm cổng ở Cài đặt → Danh bạ agent"}.`
      );
    }
    const json = (await res.json()) as KhuonTra;
    if (typeof (json as { ok?: unknown })?.ok !== "boolean") {
      return loi("LOI_NOI_BO", "Cổng tiến độ trả về khuôn lạ, không có trường ok.");
    }
    return json;
  } catch (e) {
    const laHetGio = e instanceof Error && e.name === "AbortError";
    if (laHetGio) {
      return loi(
        "HET_HAN_CHO",
        `Agent tiến độ không trả lời trong ${hanChoMs / 1000} giây.`
      );
    }
    return loi(
      "AGENT_KHONG_SAN_SANG",
      cauKhongNoiDuoc("Agent Tiến độ")
    );
  } finally {
    clearTimeout(hetGio);
  }
}

/**
 * Hỏi agent tiến độ — CỬA DUY NHẤT.
 *
 * Không bao giờ ném ngoại lệ: mọi thứ trả về khuôn `KhuonTra`
 * (HOP-DONG-KET-NOI mục 3.2 — bên gọi không phải bọc try/catch).
 *
 * @param ly_do_goi Bắt buộc — một câu nói vì sao hỏi. Thiếu là cổng từ chối.
 */
/** Gọi thật ra ngoài. ⛔ CẤM gọi thẳng hàm này — đi qua `hoiTienDo` để có vết sổ. */
async function hoiTienDoTho(
  cong_cu: CongCuTienDo,
  tham_so?: Record<string, unknown>,
  ly_do_goi = "",
  ma_nguoi_dung?: string
): Promise<KhuonTra> {
  if (!ly_do_goi.trim()) {
    return loi(
      "KHONG_HIEU_YEU_CAU",
      "Thiếu `ly_do_goi` — cổng MCP cố ý từ chối lời gọi vu vơ."
    );
  }

  // Ngắt mạch đang bật → trả về NGAY, không chờ hết hạn (bài nghiệm thu số 5)
  if (Date.now() < ngatMach.moLaiLuc) {
    return loi(
      "AGENT_KHONG_SAN_SANG",
      cauNgatMach("Agent Tiến độ", ngatMach.lyDo, NGUONG_LOI_LIEN_TIEP, ngatMach.moLaiLuc)
    );
  }

  const hanCho =
    cong_cu === "suc_khoe"
      ? HAN_CHO_MS.suc_khoe
      : CONG_CU_NANG.has(cong_cu)
        ? HAN_CHO_MS.nang
        : HAN_CHO_MS.thuong;

  let ket = await goiMotLan(cong_cu, tham_so, ly_do_goi, ma_nguoi_dung, hanCho);

  // HET_HAN_CHO và LOI_NOI_BO: thử lại ĐÚNG 1 lần (mục 3.2)
  if (!ket.ok && (ket.ma_loi === "HET_HAN_CHO" || ket.ma_loi === "LOI_NOI_BO")) {
    ket = await goiMotLan(cong_cu, tham_so, ly_do_goi, ma_nguoi_dung, hanCho);
  }

  if (ket.ok) ghiNhanNgon();
  else if (laLoiHong(ket.ma_loi)) ghiNhanHong(ket.ma_loi);
  else ghiNhanNgon(); // KHONG_CO_DU_LIEU là câu trả lời hợp lệ, không phải hỏng

  return ket;
}

/**
 * Rút CÂU TRẢ LỜI của agent tiến độ về MỘT DÒNG cho sổ nhật ký.
 * Không rút được thì nói thẳng "không có", KHÔNG bịa.
 */
function tomTatTienDo(kq: KhuonTra): { traLoiGon: string } {
  if (!kq.ok) return { traLoiGon: `khong-co · ${kq.ma_loi} · ${kq.thong_diep}`.slice(0, 200) };
  const phan: string[] = [];
  const d = kq.du_lieu;
  if (Array.isArray(d)) {
    phan.push(`${d.length} bản ghi`);
  } else if (d && typeof d === "object") {
    for (const [k, v] of Object.entries(d as Record<string, unknown>)) {
      if (phan.length >= 5) break;
      if (typeof v === "number" || typeof v === "boolean") phan.push(`${k}=${v}`);
      else if (typeof v === "string" && v.length <= 48) phan.push(`${k}=${v}`);
      else if (Array.isArray(v)) phan.push(`${k}: ${v.length} dòng`);
    }
  }
  phan.push(`${JSON.stringify(d ?? {}).length.toLocaleString("vi-VN")} ký tự`);
  // Nguồn dẫn KHÔNG tự rút ở đây nữa (26/09): hàm bọc rút từ `nguon[]` theo
  // một luật chung cho 5 agent (khuon-so.ts `nguonTuTraVe`).
  return { traLoiGon: phan.join(" · ").slice(0, 200) };
}

/**
 * ⭐ LUẬT 29 (Mr. Đại chốt 12/09/2026): **AI hỏi nhau KHÔNG được gọi thẳng qua
 * mạng — buộc phải đi qua SỔ NHẬT KÝ.** Việc gọi thật nằm ở `hoiTienDoTho`;
 * cửa duy nhất ra ngoài là hàm này, và nó ghi vết mọi lượt: hỏi công cụ gì,
 * tham số nào, vì sao hỏi, trả lời gọn ra sao, hết bao nhiêu mili giây.
 */
export async function hoiTienDo(
  cong_cu: CongCuTienDo,
  tham_so?: Record<string, unknown>,
  ly_do_goi = "",
  ma_nguoi_dung?: string,
  /** ⭐ QS-074 (27/09): nhớ 10 phút công cụ ĐỌC — bỏ qua / dùng bản cũ khi lỗi */
  tuyChon: TuyChonNho = {}
): Promise<KhuonTra> {
  // Cùng một bộ nhớ với hoiAgent("tiendo", …) — thanh trên cùng và Bảng điều hành
  // hỏi tom_tat_du_an qua hai cửa khác nhau mà vẫn dùng chung một câu trả lời.
  if (ly_do_goi.trim() && duocNho(cong_cu)) {
    return hoiCoNho(
      khoaNho("tiendo", cong_cu, tham_so, ma_nguoi_dung),
      () => hoiTienDoCoGhi(cong_cu, tham_so, ly_do_goi, ma_nguoi_dung),
      tuyChon
    );
  }
  return hoiTienDoCoGhi(cong_cu, tham_so, ly_do_goi, ma_nguoi_dung);
}

/** Một lượt hỏi thật có ghi sổ — không nhớ. Chỉ `hoiTienDo` gọi. */
function hoiTienDoCoGhi(
  cong_cu: CongCuTienDo,
  tham_so: Record<string, unknown> | undefined,
  ly_do_goi: string,
  ma_nguoi_dung: string | undefined
): Promise<KhuonTra> {
  return goiCoGhi(
    {
      agentTraLoi: "tiendo",
      congCu: cong_cu,
      thamSo: tham_so ?? {},
      lyDoGoi: ly_do_goi,
      duong: "tay",
      nguoi: ma_nguoi_dung,
    },
    () => hoiTienDoTho(cong_cu, tham_so, ly_do_goi, ma_nguoi_dung),
    (kq) => tomTatTienDo(kq)
  );
}

// ─────────────────────────────────────────────────────────────
// Bọc sẵn các công cụ agent này dùng nhiều nhất
// ─────────────────────────────────────────────────────────────

/** Agent tiến độ còn sống không + đang theo phiên bản hợp đồng nào */
export function sucKhoeTienDo(ly_do_goi = "kiểm tra agent tiến độ còn sống không") {
  return hoiTienDo("suc_khoe", {}, ly_do_goi);
}

/** Danh sách 13 công cụ kèm tham số — dùng để dựng bảng năng lực */
export function nangLucTienDo(ly_do_goi = "lấy danh sách công cụ agent tiến độ") {
  return hoiTienDo("nang_luc", {}, ly_do_goi);
}

/** % tổng thể · COD dự báo · lệch Mục tiêu · số việc găng/trễ */
export function tomTatDuAn(ma_du_an: string, ly_do_goi: string) {
  return hoiTienDo("tiendo.tom_tat_du_an", { ma_du_an }, ly_do_goi);
}

/** Tìm đầu việc theo từ khoá hoặc mã WBS — để treo việc lên đúng đầu việc */
export function timDauViec(
  ma_du_an: string,
  timTheo: { tu_khoa?: string; ma_wbs?: string },
  ly_do_goi: string
) {
  return hoiTienDo("tiendo.tim_dau_viec", { ma_du_an, ...timTheo }, ly_do_goi);
}

/** Baseline · thực tế · dự báo · % · có trên đường găng không */
export function chiTietDauViec(ma_du_an: string, ma_wbs: string, ly_do_goi: string) {
  return hoiTienDo("tiendo.chi_tiet_dau_viec", { ma_du_an, ma_wbs }, ly_do_goi);
}

/** Chuỗi đầu việc găng chốt COD (công cụ NẶNG — hạn chờ 60s) */
export function duongGang(ma_du_an: string, ly_do_goi: string) {
  return hoiTienDo("tiendo.duong_gang", { ma_du_an }, ly_do_goi);
}

/**
 * Từng dòng khối lượng theo WBS × thầu phụ, kèm nguồn.
 *
 * ⚠ Thuật ngữ (HOP-DONG-KET-NOI 5.1, Mr. Đại xác nhận 07/09):
 *   `thau_phu` nhận tên đơn vị TRỰC TIẾP thi công như ghi trong BC ngày/tuần
 *   (TS · SNP · Điện 8) — KHÔNG phải "nhà thầu" theo hợp đồng.
 *   BQL không ký với thầu phụ; việc quy đổi thầu phụ → hợp đồng là việc của
 *   Agent Hợp đồng, không phải của công cụ này.
 *
 * Trả về kèm `phu_tu` = ngày đầu tiên có dữ liệu BC. Trước ngày đó là
 * KHÔNG CÓ SỐ, không phải 0 — đừng vẽ đường bằng 0 ra biểu đồ.
 */
export function khoiLuongHangMuc(
  ma_du_an: string,
  loc: {
    thau_phu?: string;
    ma_wbs?: string;
    tu_ngay?: string;
    den_ngay?: string;
  },
  ly_do_goi: string
) {
  return hoiTienDo("tiendo.khoi_luong_hang_muc", { ma_du_an, ...loc }, ly_do_goi);
}

/** Nhân lực + máy chính thực tế bình quân trong kỳ, theo thầu phụ */
export function nguonLucHuyDong(
  ma_du_an: string,
  tu_ngay: string,
  den_ngay: string,
  thau_phu: string | undefined,
  ly_do_goi: string
) {
  return hoiTienDo(
    "tiendo.nguon_luc_huy_dong",
    { ma_du_an, tu_ngay, den_ngay, ...(thau_phu ? { thau_phu } : {}) },
    ly_do_goi
  );
}
