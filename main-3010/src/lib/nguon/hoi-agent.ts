// ============================================================
// MAIN AGENT — MỘT CỬA ĐI HỎI MỌI AGENT  (server-only)
//
// ⛔ LUẬT SỐ MỘT CỦA CON NÀY (PLAN-MAIN-AGENT mục 1 · KE-HOACH/05 A.1):
//    Main KHÔNG GIỮ DỮ LIỆU NGHIỆP VỤ. Cần số thì ĐI HỎI, không lưu.
//    "Thấy cần số thì dựng bảng riêng cho tiện — làm thế là hỏng cả hệ,
//     sẽ có hai bản số liệu cãi nhau."
//    Vì vậy file này là cửa DUY NHẤT để Main lấy số. Không có đường vòng.
//
// ⛔ ĐA NĂNG: KHÔNG viết bốn file nguon-tien-do / nguon-phap-ly /
//    nguon-hop-dong / nguon-base như tài liệu gợi ý. Bốn file ấy giống nhau
//    99%, chỉ khác mỗi cái tên — mà cái tên thì đã nằm trong DANH BẠ AGENT.
//    Một hàm `hoiAgent(maAgent, ...)` phục vụ được 2 con hay 6 con như nhau;
//    thêm agent thứ sáu KHÔNG phải viết thêm file nào.
//
// Giữ đủ luật chống lan sự cố của HOP-DONG-KET-NOI mục 6:
//    · hạn chờ 10s thường · 60s việc nặng · 3s kiểm sức khoẻ
//    · thử lại ĐÚNG 1 lần khi hết giờ / lỗi nội bộ
//    · ngắt mạch RIÊNG TỪNG AGENT: 3 lỗi liên tiếp → nghỉ con đó 10 phút,
//      các con khác vẫn gọi bình thường (đây là chỗ bản gốc một-agent không
//      làm được, vì nó chỉ có một bộ đếm)
//    · không bao giờ ném ngoại lệ — luôn trả về khuôn `KhuonTra`
//
// Mọi lượt gọi đều ghi vào SỔ NHẬT KÝ, kèm lý do gọi. Không ghi được sổ thì
// vẫn trả lời — mất vết còn hơn hỏng việc.
// ============================================================

import type { KhuonTra, MaLoi } from "@/lib/mcp/khuon";
import { docDanhBaAgent } from "@/lib/cai-dat-base";
import { lyDoKhongGoiDuoc, timAgent } from "@/lib/danh-ba-agent";
import { ghiSuKienMach, goiCoGhi } from "@/lib/nhat-ky/so";
import { headerChuoi } from "@/lib/nhat-ky/chuoi";
import { headerKhoaNoiBo } from "@/lib/day-sang-agent";
import { chuanHoaBen } from "@/lib/nhat-ky/model";
import { maNganDuAn } from "@/lib/projects";
import { duocNho, hoiCoNho, khoaNho, type TuyChonNho } from "@/lib/nguon/bo-nho-hoi";
import { cauKhongNoiDuoc, cauNgatMach, lyDoTuMaLoi, type LyDoHong } from "@/lib/nguon/cau-ngat-mach";

/**
 * ⭐ 24/09 — gọi PHÁP LÝ thì `ma_du_an` luôn là MÃ NGẮN (HV · N3A…). Đo sổ pháp lý
 * 23–24/09: Main gửi ba kiểu cho cùng một dự án — slug (ho_so_cua_wbs · danh_sach_issue
 * 232 lượt), nhãn dàn ngang "HV · Điện gió Hướng Việt (HV — dữ liệu test)" (ho_so_thieu
 * 140 lượt), và 24 lượt ho_so_cua_wbs THIẾU hẳn (trước bản vá 23/09 19:02). Pháp lý đoán
 * được slug/nhãn nhưng sổ thì lẫn ba kiểu, và nhãn đổi tên là trượt. Chuẩn hoá MỘT chỗ ở
 * cửa đi hỏi — mọi đường (bảng điều hành, mâu thuẫn chéo, trợ lý, báo cáo) đều qua đây.
 */
function chuanThamSoTheoAgent(maAgent: string, tuyChon: TuyChonHoi): TuyChonHoi {
  if (chuanHoaBen(maAgent) !== "phaply") return tuyChon;
  const ts = tuyChon.tham_so;
  if (!ts || typeof ts.ma_du_an !== "string") return tuyChon;
  const ngan = maNganDuAn(ts.ma_du_an);
  return ngan && ngan !== ts.ma_du_an ? { ...tuyChon, tham_so: { ...ts, ma_du_an: ngan } } : tuyChon;
}

/** Tên Main khi đi hỏi — HOP-DONG-KET-NOI mục 10 điểm 2 (bắt buộc kèm) */
export const TEN_AGENT_NAY = "main";

/** Hạn chờ — HOP-DONG-KET-NOI mục 6.1 luật 1 */
export const HAN_CHO_MS = {
  thuong: 10_000,
  nang: 60_000,
  suc_khoe: 3_000,
} as const;

/**
 * Công cụ NẶNG — dùng hạn 60 giây.
 * Nhận biết bằng ĐUÔI tên công cụ, không liệt kê theo từng agent: agent nào
 * mở thêm công cụ `*.du_bao` thì tự động được hưởng hạn dài, không phải sửa
 * danh sách ở đây.
 */
const DUOI_CONG_CU_NANG = [
  "du_bao",
  "duong_gang",
  "soat_quy_tac",
  "soat_cheo",
  "bao_cao_thang",
  // ⭐ QS-073 (27/09): ba công cụ này chạy lại bộ tính lịch bên Tiến độ — đo 26/09
  // phía nhận trung vị 6,3 giây, chậm nhất 16,9 giây → hạn 10 giây cắt oan, lượt
  // hỏng dồn thành ngắt mạch và Bảng điều hành trống. Xếp vào nhóm nặng (60 giây).
  "tom_tat_du_an",
  "s_curve",
  "so_tuan",
  // ⭐ 17/10/2026 (báo cáo sáng theo khối, KE-HOACH/23): giả định COD và năng suất cũng chạy lại bộ tính lịch bên Tiến độ
  "gia_dinh_cod",
  "nang_suat",
];

const NGUONG_LOI_LIEN_TIEP = 3;
const THOI_GIAN_NGHI_MS = 10 * 60 * 1000;

interface TrangThaiMach {
  soLoiLienTiep: number;
  moLaiLuc: number;
  /** Lý do lần hỏng gần nhất — câu ngắt mạch nói đúng nguyên nhân (kiểm lần 8 MC-01) */
  lyDo?: LyDoHong;
}

/**
 * Ngắt mạch RIÊNG cho từng agent.
 * Agent pháp lý chết không được làm Main ngừng hỏi agent tiến độ — đó đúng là
 * kiểu "một con kéo sập cả dây chuyền" mà mục 6.2 sinh ra để chặn.
 */
const mach = new Map<string, TrangThaiMach>();

function layMach(ma: string): TrangThaiMach {
  const t = mach.get(ma) ?? { soLoiLienTiep: 0, moLaiLuc: 0 };
  mach.set(ma, t);
  return t;
}

/** Lỗi "không có dữ liệu" KHÔNG tính là hỏng — mục 6.2. «Không có quyền» cũng là agent ĐÃ THƯA (từ chối một người), không
 *  được khoá agent đang sống 10 phút cho mọi người (kiểm lần 8 MC-01: sổ thật 3 lần mở mạch vì KHONG_CO_QUYEN) */
function laLoiHong(ma_loi: MaLoi): boolean {
  return ma_loi !== "KHONG_CO_DU_LIEU" && ma_loi !== "KHONG_HIEU_YEU_CAU" && ma_loi !== "KHONG_CO_QUYEN";
}

/** Trạng thái ngắt mạch của mọi agent — để màn hình hiện "thử lại lúc HH:mm" */
export function trangThaiNgatMach(): {
  ma: string;
  dangNgat: boolean;
  moLaiLuc: string | null;
}[] {
  const bay = Date.now();
  return Array.from(mach.entries()).map(([ma, t]) => ({
    ma,
    dangNgat: bay < t.moLaiLuc,
    moLaiLuc: bay < t.moLaiLuc ? new Date(t.moLaiLuc).toISOString() : null,
  }));
}

/** Dùng trong test — xoá hết trạng thái mạch */
export function xoaNgatMach(): void {
  mach.clear();
}

function loi(ma_loi: MaLoi, thong_diep: string): KhuonTra {
  return { ok: false, ma_loi, thong_diep };
}

// ─────────────────────────────────────────────────────────────
// Nơi gọi — lấy từ Danh bạ agent, KHÔNG gắn cứng địa chỉ nào
// ─────────────────────────────────────────────────────────────

export interface NoiGoi {
  diaChi: string;
  duongDan: string;
  ten: string;
  /** Câu tiếng Việt giải thích vì sao KHÔNG gọi được; null = gọi được */
  loi: string | null;
}

export function noiGoi(maAgent: string): NoiGoi {
  // Biến môi trường thắng danh bạ — để dựng thử ở máy khác không phải sửa cấu hình
  const tuEnv = process.env[`URL_AGENT_${maAgent.toUpperCase()}`]?.replace(/\/$/, "");
  if (tuEnv) {
    return {
      diaChi: tuEnv,
      duongDan: `/api/mcp/${maAgent}`,
      ten: maAgent,
      loi: null,
    };
  }
  try {
    const danhBa = docDanhBaAgent();
    const vuong = lyDoKhongGoiDuoc(danhBa, maAgent);
    if (vuong) return { diaChi: "", duongDan: "", ten: maAgent, loi: vuong };
    const a = timAgent(danhBa, maAgent)!;
    return { diaChi: a.diaChi, duongDan: a.duongDanMcp, ten: a.ten, loi: null };
  } catch {
    return {
      diaChi: "",
      duongDan: "",
      ten: maAgent,
      loi: `Chưa đọc được Danh bạ agent nên không biết "${maAgent}" ở đâu. Vào Cài đặt khai địa chỉ cho nó.`,
    };
  }
}

// ─────────────────────────────────────────────────────────────
// Lời gọi
// ─────────────────────────────────────────────────────────────

async function goiMotLan(
  noi: NoiGoi,
  cong_cu: string,
  tham_so: Record<string, unknown> | undefined,
  ly_do_goi: string,
  ma_nguoi_dung: string | undefined,
  hanChoMs: number,
  _kemKhoaNoiBo = false,
): Promise<KhuonTra> {
  const boDem = new AbortController();
  const hetGio = setTimeout(() => boDem.abort(), hanChoMs);
  try {
    const res = await fetch(`${noi.diaChi}${noi.duongDan}`, {
      method: "POST",
      // Khuôn sổ bản 2: mã lượt + mã chuỗi sang bên nhận (bên nhận ghi CÙNG mã lượt)
      // Khoá nội bộ gửi kèm MỌI lượt (Mr. Đại chốt 17/10/2026 tối, kiểm lần 7 🔴3): cổng Tiến độ lọc phần tiền của lượt máy–máy
      // không kèm khoá — trước đây chỉ gửi cho cửa chỉ-Main (base.so_do_to_chuc), nay `kemKhoaNoiBo` không còn tác dụng
      headers: { "Content-Type": "application/json", ...headerChuoi(), ...headerKhoaNoiBo() },
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

    // ⚠ Cổng KHÔNG BAO GIỜ trả HTTP 500 — sai vẫn là 200 kèm {ok:false}.
    //   Đọc `ok`, đừng đọc mã HTTP (HOP-DONG-KET-NOI mục 5).
    // ⭐ 17/10/2026 (đo ở Pháp lý 08:35–16:26): bộ đệm dev hỏng → cổng trả TRANG HTML 404. Trước đây `res.json()` ném lỗi và
    //   lượt bị xếp nhầm «không nối được» — trong khi cổng có trả lời (316–519 ms). Không phải JSON thì nói đúng chuyện đó.
    const loaiNoiDung = res.headers?.get?.("content-type") ?? null;
    if (loaiNoiDung !== null && !loaiNoiDung.includes("json")) {
      return loi(
        "AGENT_KHONG_SAN_SANG",
        `Cổng của ${noi.ten} trả mã ${res.status} kèm trang ${loaiNoiDung.split(";")[0] || "không rõ kiểu"}, không phải câu trả lời MCP — ` +
          `${res.status === 404 ? "bộ đệm dev của agent đó có thể đã hỏng (mọi đường dẫn trừ trang chủ đều 404), cần khởi động lại agent đó" : "kiểm cổng ở Danh bạ agent"}.`,
      );
    }
    const json = (await res.json()) as KhuonTra;
    if (typeof (json as { ok?: unknown })?.ok !== "boolean") {
      return loi("LOI_NOI_BO", `Cổng của ${noi.ten} trả khuôn lạ, không có trường ok.`);
    }
    return json;
  } catch (e) {
    const laHetGio = e instanceof Error && e.name === "AbortError";
    return laHetGio
      ? loi("HET_HAN_CHO", `${noi.ten} không trả lời trong ${hanChoMs / 1000} giây.`)
      : loi(
          "AGENT_KHONG_SAN_SANG",
          cauKhongNoiDuoc(noi.ten),
        );
  } finally {
    clearTimeout(hetGio);
  }
}

/** Cột "ai được hỏi" của sổ = mã chuẩn trong danh bạ (A04 22/09: tiendo · hopdong · base · phaply · main) */
function benCuaSo(ma: string) {
  return chuanHoaBen(ma);
}

export interface TuyChonHoi extends TuyChonNho {
  tham_so?: Record<string, unknown>;
  ma_nguoi_dung?: string;
  /** Bỏ qua kiểm ma trận "ai được gọi ai" — chỉ dùng cho lệnh kiểm sức khoẻ */
  boQuaMaTran?: boolean;
  /** Hạn chờ riêng (Luật 33 hỏi trùng: 15 giây/lần) — bỏ trống thì theo bảng HAN_CHO_MS */
  hanChoMs?: number;
  /** Không tự thử lại khi hết hạn chờ — bên gọi đã có lịch gọi lại riêng (Luật 33: ngay · 1 phút · 3 phút) */
  khongThuLai?: boolean;
  /** (Từ 17/10/2026 mọi lượt đều kèm khoá nội bộ — giữ trường cho các nơi gọi cũ, không còn tác dụng) */
  kemKhoaNoiBo?: boolean;
}

/**
 * HỎI MỘT AGENT BẤT KỲ trong danh bạ.
 *
 * Không bao giờ ném ngoại lệ — mọi thứ trả về khuôn `KhuonTra`, bên gọi không
 * phải bọc try/catch (HOP-DONG-KET-NOI mục 3.2).
 *
 * @param maAgent  mã trong Danh bạ agent: tiendo · phaply · hopdong · base …
 * @param cong_cu  tên công cụ, ví dụ "tiendo.duong_gang"
 * @param ly_do_goi BẮT BUỘC — một câu nói vì sao hỏi. Thiếu là từ chối.
 */
export async function hoiAgent(
  maAgent: string,
  cong_cu: string,
  ly_do_goi: string,
  tuyChonGoc: TuyChonHoi = {},
): Promise<KhuonTra> {
  const tuyChon = chuanThamSoTheoAgent(maAgent, tuyChonGoc);
  // ⭐ QS-074/QS-082 (27/09): công cụ ĐỌC trong danh sách trắng → nhớ 10 phút,
  // một lượt bay (bo-nho-hoi.ts). Thiếu lý do gọi thì không nhớ — để cửa dưới từ chối.
  const kq =
    ly_do_goi.trim() && duocNho(cong_cu)
      ? await hoiCoNho(
          khoaNho(benCuaSo(maAgent), cong_cu, tuyChon.tham_so, tuyChon.ma_nguoi_dung),
          () => hoiAgentMotLuot(maAgent, cong_cu, ly_do_goi, tuyChon),
          tuyChon,
        )
      : await hoiAgentMotLuot(maAgent, cong_cu, ly_do_goi, tuyChon);
  return locTheoNguoiHoi(maAgent, cong_cu, kq, tuyChon);
}

/**
 * ⭐ 18/10/2026 (Q3 kiểm độc lập lần 7): lượt hỏi THAY MỘT NGƯỜI (`ma_nguoi_dung` — trợ lý chat web + Telegram) lấy thẻ issue
 * của agent «thẻ theo dự án» (agent Công việc) → bỏ thẻ người đó không được thấy TRƯỚC khi tới tay trợ lý (thẻ có thể nói tới
 * tiền hợp đồng — ISS-2026-41-002 «Đợt 3 thanh toán EPC 38,2 tỷ»). Bộ nhớ 10 phút giữ bản đủ (khoá nhớ đã có người hỏi), lọc ở
 * lượt trả. Lượt máy–máy (không `ma_nguoi_dung`: màn Cảnh báo, báo cáo sáng / tháng) lọc ở lớp của chính nó.
 * Nạp hai tệp lọc lúc cần (import động) để không vòng nạp với lớp người dùng / sơ đồ.
 */
async function locTheoNguoiHoi(maAgent: string, cong_cu: string, kq: KhuonTra, tuyChon: TuyChonHoi): Promise<KhuonTra> {
  if (!kq.ok || !tuyChon.ma_nguoi_dung || !cong_cu.endsWith(".danh_sach_issue")) return kq;
  const { laAgentTheTheoDuAn, locTheIssueTrongKhuon } = await import("@/lib/agent-mat-loc");
  if (!laAgentTheTheoDuAn(maAgent)) return kq;
  const { boLocMatTheoMaNguoi } = await import("@/lib/agent-mat-tren-main");
  const ma = tuyChon.tham_so?.ma_du_an;
  return locTheIssueTrongKhuon(maAgent, kq, boLocMatTheoMaNguoi(tuyChon.ma_nguoi_dung), typeof ma === "string" && ma.trim() !== "" ? ma.trim() : null);
}

/** Một lượt hỏi thật (ghi sổ từng lần gọi) — không nhớ gì. Chỉ `hoiAgent` gọi. */
async function hoiAgentMotLuot(
  maAgent: string,
  cong_cu: string,
  ly_do_goi: string,
  tuyChon: TuyChonHoi,
): Promise<KhuonTra> {
  if (!ly_do_goi.trim()) {
    return loi(
      "KHONG_HIEU_YEU_CAU",
      "Thiếu lý do gọi — cổng MCP cố ý từ chối lời gọi vu vơ (mục 7).",
    );
  }

  const noi = noiGoi(maAgent);
  if (noi.loi) {
    // Bị tắt / chưa khai → NÓI RÕ ngay, không gọi rồi ngồi chờ hết hạn
    return loi("AGENT_KHONG_SAN_SANG", noi.loi);
  }

  const t = layMach(maAgent);
  if (Date.now() < t.moLaiLuc) {
    // Mr. Đại 26/10/2026: nói rõ LÝ DO — đang tắt / đang được dựng lại / chậm — để người hỏi biết chờ rồi hỏi lại
    return loi("AGENT_KHONG_SAN_SANG", cauNgatMach(noi.ten, t.lyDo ?? "khong_noi_duoc", NGUONG_LOI_LIEN_TIEP, t.moLaiLuc));
  }

  const hanCho =
    tuyChon.hanChoMs ??
    (cong_cu === "suc_khoe"
      ? HAN_CHO_MS.suc_khoe
      : DUOI_CONG_CU_NANG.some((d) => cong_cu.endsWith(d))
        ? HAN_CHO_MS.nang
        : HAN_CHO_MS.thuong);

  // ⭐ Khuôn sổ bản 2 (26/09): MỖI lần gọi thật là MỘT lượt có mã riêng (lần thử
  // lại cũng là một lượt) — bên nhận ghi cùng mã lượt, hai sổ ghép khớp từng lượt.
  const motLuot = () =>
    goiCoGhi(
      {
        agentHoi: TEN_AGENT_NAY,
        agentTraLoi: benCuaSo(maAgent),
        congCu: cong_cu,
        thamSo: tuyChon.tham_so ?? {},
        lyDoGoi: ly_do_goi,
        duong: "A",
        nguoi: tuyChon.ma_nguoi_dung,
      },
      () => goiMotLan(noi, cong_cu, tuyChon.tham_so, ly_do_goi, tuyChon.ma_nguoi_dung, hanCho, tuyChon.kemKhoaNoiBo === true),
      (k) => ({ traLoiGon: traLoiGon(k) }),
    );

  let ket = await motLuot();

  // HET_HAN_CHO và LOI_NOI_BO: thử lại ĐÚNG 1 lần (mục 3.2)
  if (!tuyChon.khongThuLai && !ket.ok && (ket.ma_loi === "HET_HAN_CHO" || ket.ma_loi === "LOI_NOI_BO")) {
    ket = await motLuot();
  }

  if (ket.ok || !laLoiHong(ket.ma_loi)) {
    // Mạch từng MỞ (đã nghỉ) mà lời thăm dò qua được → đóng lại, ghi sổ (7.1)
    const tungNgat = t.moLaiLuc > 0;
    t.soLoiLienTiep = 0;
    t.moLaiLuc = 0;
    if (tungNgat) ghiSuKienMach("dong", benCuaSo(maAgent), noi.ten);
  } else {
    t.soLoiLienTiep += 1;
    t.lyDo = lyDoTuMaLoi(ket.ma_loi);
    // Mạch ĐANG mở (lượt này bay trước lúc mở, giờ mới hỏng) thì không mở lại, không
    // ghi thêm dòng — đo 26/09 21:40: 8 dòng "mở" liền (3…10 lỗi) cho CÙNG một lần ngắt.
    if (t.soLoiLienTiep >= NGUONG_LOI_LIEN_TIEP && Date.now() >= t.moLaiLuc) {
      t.moLaiLuc = Date.now() + THOI_GIAN_NGHI_MS;
      // Mạch MỞ thật — ghi đúng lúc xảy ra (Agent quan sát đếm bằng dòng này)
      ghiSuKienMach("mo", benCuaSo(maAgent), noi.ten, {
        soLoi: t.soLoiLienTiep,
        phutNghi: THOI_GIAN_NGHI_MS / 60_000,
      });
    }
  }

  return ket;
}

// Nguồn dẫn KHÔNG tự rút ở đây nữa (khuôn sổ bản 2, 26/09): hàm bọc rút từ
// `nguon[]` theo MỘT luật chung cho 5 agent (khuon-so.ts `nguonTuTraVe`: file_goc
// hoặc ma, nối " · ", ≤ 300 ký tự; không có nguồn → để trống, KHÔNG bịa).
// ⛔ Bài học 05/09 vẫn giữ: bản rút cũ từng đọc `x.mo_ta` (trường không tồn tại)
//    nên MỌI câu trả lời bị ghi "chưa dẫn nguồn" — một luật chung là để khỏi lặp.

/**
 * ⭐ Mr. Đại chốt 12/09/2026: sổ phải nói được BÊN KIA TRẢ VỀ GÌ, gọn một dòng —
 * "đây là nội dung câu hỏi. Câu trả lời là như thế nào tôi cần biết ngắn gọn".
 */
function traLoiGon(ket: KhuonTra): string {
  if (!ket.ok) return `khong-co · ${ket.ma_loi} · ${ket.thong_diep}`.slice(0, 200);
  const d = (ket as unknown as { du_lieu?: unknown }).du_lieu;
  const phan: string[] = [];
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
  return phan.join(" · ").slice(0, 200);
}

/** Con này còn sống không. Dùng cho màn theo dõi và kịch bản đêm. */
export function sucKhoe(maAgent: string, ly_do_goi = "kiểm tra agent còn sống không") {
  return hoiAgent(maAgent, "suc_khoe", ly_do_goi, { boQuaMaTran: true });
}

/** Con này đang mở những công cụ gì — để Main biết hỏi được cái gì */
export function nangLuc(maAgent: string, ly_do_goi = "lấy danh sách công cụ agent này mở") {
  return hoiAgent(maAgent, "nang_luc", ly_do_goi, { boQuaMaTran: true });
}
