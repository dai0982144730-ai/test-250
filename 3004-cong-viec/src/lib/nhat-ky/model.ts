// ============================================================
// NHẬT KÝ HỎI–ĐÁP GIỮA CÁC AGENT — `core.nhat_ky_hoi_agent`
// MD: HOP-DONG-KET-NOI mục 7 (8 cột) · mục 8 (hai đường A/B)
//     PLAN-TONG-THE 8.6 · demo view `v-nhatky`
//
// MỤC ĐÍCH THẬT LÀ CHỐNG BỊA, không phải để xem cho vui:
//   "10 con số bất kỳ trong báo cáo phải truy về được một dòng ở đây."
//
// VÌ SAO LÀM ĐƯỢC NGAY DÙ CHƯA CÓ AGENT KHÁC. Sổ này ghi MỌI LƯỢT HỎI RA
// NGOÀI, không riêng agent↔agent. Hôm nay đã có ba loại lượt như thế mà chưa
// cái nào để lại vết:
//   tiến độ → LLM     (phân loại bản vẽ hệ 3 · dự báo · cảnh báo · trợ lý chat)
//   tiến độ → Base    (nạp cấu trúc dự án ở Lập tiến độ)
//   tiến độ → Drive   (ghi file gốc báo cáo miệng)
// Bốn agent kia ra đời thì chỉ là thêm giá trị cho cột "ai được hỏi" — KHÔNG
// phải thiết kế lại.
//
// `lyDoGoi` BẮT BUỘC (mục 7): "không cho gọi vu vơ". Thiếu lý do thì dòng đó
// bị từ chối ghi, và chỗ gọi phải sửa.
//
// File này THUẦN — màn hình import được.
// ============================================================

import { chuanHoaAgentHoi, chuanHoaMaAgent, laMaAgentChuan } from "@/lib/chung/ma-agent";
// Chỉ KIỂU — xoá khi biên dịch nên file này vẫn thuần (khuon-so.ts dùng node:crypto)
import type { LoaiLuot, TruongSoV2, VaiSo } from "./khuon-so";

/**
 * Bên được hỏi. Mã agent = MÃ CHUẨN (tên cổng, không gạch — A04 22/09/2026);
 * ba bên ngoài hệ agent giữ mã riêng: llm · basevn (API Base.vn trực tiếp) · drive.
 * Sổ cũ ghi "tien-do" / "phap-ly" / "hop-dong" / "base-agent" và "base" (nghĩa cũ
 * = API Base.vn) — `chuanHoaBen` quy về đúng nghĩa lúc đọc, KHÔNG sửa file sổ.
 */
export type BenDuocHoi =
  | "llm"
  | "basevn"
  | "drive"
  | "phaply"
  | "hopdong"
  | "base"
  | "main"
  | "tiendo"
  /** Agent quan sát (cổng 3014) — thêm 26/09/2026 */
  | "quansat";

export const NHAN_BEN: Record<BenDuocHoi, string> = {
  llm: "LLM",
  basevn: "Base.vn (API trực tiếp)",
  drive: "Google Drive",
  phaply: "Agent Pháp lý",
  hopdong: "Agent Hợp đồng",
  // Agent Công việc thế chỗ Agent Base trong danh bạ (mã "base") — 03/10/2026
  base: "Agent Công việc",
  main: "Main Agent",
  tiendo: "Agent tiến độ",
  quansat: "Agent quan sát",
};

/** Bên nào CHƯA TỒN TẠI — 22/09/2026 cả 5 agent đều đã chạy, danh sách này rỗng */
export const CHUA_CO: readonly BenDuocHoi[] = [];

/**
 * Quy cột "ai được hỏi" của sổ về mã chuẩn. Cái bẫy duy nhất: sổ cũ ghi `"base"`
 * cho API Base.vn trực tiếp (công cụ dạng `base.wework/task/project` — có dấu "/"),
 * còn Agent Base thì ghi `"base-agent"`. Đo 22/09 trên 8.754 dòng sổ Main: 5.479
 * dòng `base` đều mang "/" trong tên công cụ; dòng `base` không có "/" là Agent Base.
 */
export function chuanHoaBen(tho: string, congCu = ""): BenDuocHoi {
  const t = (tho ?? "").trim().toLowerCase();
  if (t === "llm" || t === "drive" || t === "basevn") return t;
  if (t === "base" && congCu.includes("/")) return "basevn";
  const c = chuanHoaMaAgent(t);
  if (laMaAgentChuan(c)) return c;
  // Mã lạ — giữ dạng đã bỏ gạch để ít nhất gộp được với nhau
  return c as BenDuocHoi;
}

/** Một dòng sổ (cũ hay mới) về đúng mã chuẩn ở cả hai cột — dùng lúc ghi lẫn lúc đọc */
export function chuanHoaDongNhatKy<T extends { agentHoi: string; agentTraLoi: string; congCu: string }>(d: T): T {
  const agentTraLoi = chuanHoaBen(d.agentTraLoi, d.congCu);
  // ⭐ 25/09 (A04 đối soát bản 2): client Base.vn của CHÍNH app này ghi mặc định
  // `agentHoi: "tien-do"` (di sản bộ mã gốc) tới 23/09 — sổ Base còn 1.022 dòng
  // "tien-do" → base.wework/…, không dòng nào đi đâu khác. Dòng gọi API Base.vn
  // thẳng trong sổ CỦA APP NÀY chỉ có thể do app này ghi (Agent Tiến độ thật gọi
  // vào qua cổng MCP, ghi `→ base`), nên quy về "base" thay vì "tiendo".
  const agentHoi =
    agentTraLoi === "basevn" && (d.agentHoi ?? "").trim().toLowerCase() === "tien-do"
      ? "base"
      : chuanHoaAgentHoi(d.agentHoi);
  return { ...d, agentHoi, agentTraLoi };
}

/**
 * Hai đường của mục 8 + một đường thật mà MD chưa kể:
 *   A   — hỏi ngay trong lượt chat, người đang ngồi đó
 *   B   — kịch bản đêm 21:00, có hạn giờ
 *   tay — NGƯỜI BẤM một nút trên màn hình (ví dụ "Hỏi AI phân loại")
 * Đường "tay" là thứ đang chạy nhiều nhất hôm nay; gán bừa nó vào A hay B là
 * làm sai số liệu của chính sổ này.
 */
export type DuongGoi = "A" | "B" | "tay";

export const NHAN_DUONG: Record<DuongGoi, string> = {
  A: "Đường A — trong lượt chat",
  B: "Đường B — kịch bản đêm",
  tay: "Người bấm nút",
};

/** Một dòng của `core.nhat_ky_hoi_agent` — 8 cột của HOP-DONG-KET-NOI mục 7 */
export interface DongNhatKy {
  /** ISO datetime */
  thoiDiem: string;
  agentHoi: string;
  agentTraLoi: BenDuocHoi;
  /** Tên công cụ, ví dụ "thietke.phan_loai_ban_ve" */
  congCu: string;
  /** Tham số đã gọi — KHÔNG chứa khoá API, mật khẩu (xem `locThamSo`) */
  thamSo: Record<string, unknown>;
  ketQua: "ok" | "loi" | "khong-co-du-lieu";
  /** Dựa bản ghi nào — file, mã issue, mã hợp đồng… */
  nguonDan?: string;
  /**
   * ⭐ Mr. Đại chốt 12/09/2026: *"đây là nội dung câu hỏi. Câu trả lời là như thế nào
   * tôi cần biết ngắn gọn để đánh giá tình hình. Tất nhiên câu trả lời rất dài thì
   * phải đưa về ngắn gọn."*
   *
   * MỘT DÒNG tóm tắt thứ agent kia trả về — đủ để người đọc biết máy nhận được gì
   * mà không phải mở cả khối JSON. Bên gọi tự rút; không rút được thì để trống,
   * màn hình ghi "—" chứ KHÔNG bịa.
   */
  traLoiGon?: string;
  miliGiay: number;
  /** BẮT BUỘC — không cho gọi vu vơ */
  lyDoGoi: string;
  duong: DuongGoi;
  duAn?: string;
  nguoi?: string;
  /** Số token; đường CLI không trả nên để trống — KHÔNG ước */
  soToken?: number;
  /** Câu lỗi khi ketQua = "loi" */
  loi?: string;

  // ── Khuôn sổ bản 2 (HOP-DONG-KET-NOI 7.1, chốt 26/09/2026) ──────────────
  // Dòng cũ không có các trường này — đọc lên coi là null, KHÔNG sửa sổ cũ.
  // Luật điền nằm ở `khuon-so.ts` (dungTruongV2), chỗ gọi không tự ráp.
  phienBanSo?: TruongSoV2["phienBanSo"];
  /** Mã một lượt hỏi–đáp — bên gọi sinh, bên nhận ghi CÙNG mã */
  maLuot?: string;
  /** goi = sổ bên hỏi · nhan = sổ bên trả lời (cổng MCP) */
  vai?: VaiSo;
  /** Mã một việc trọn vẹn (câu chat, lần mở trang, báo cáo sáng, việc đêm) */
  maChuoi?: string;
  loaiLuot?: LoaiLuot;
  /** Mã lỗi nguyên văn khuôn 3.2 khi ketQua ≠ ok */
  maLoi?: string;
  /** Dấu vân câu trả lời (16 ký tự SHA-1 của du_lieu, bỏ khoá thoi_diem*) */
  bam?: string;
  /** Nội dung trả lời ≤ 2.000 ký tự — lượt nghiệp vụ/gốc, ghi ở sổ bên trả lời */
  traLoi?: string;
  biCat?: boolean;
  /** Hỏi gọn "có đổi không" và nhận `khong_doi` */
  traGon?: boolean;
}

/** Khoá/mật khẩu tuyệt đối không được lọt vào sổ */
const CAM = /(token|key|secret|password|mat_khau|matkhau|authorization|cookie)/i;

/**
 * Lọc tham số trước khi ghi: bỏ trường nhạy cảm, cắt chuỗi dài.
 * Sổ này Mr. Đại mở xem hằng ngày — để khoá API lọt vào là hỏng cả nguyên tắc
 * "khoá API tuyệt đối không đưa ra ngoài".
 */
export function locThamSo(v: Record<string, unknown>): Record<string, unknown> {
  const ra: Record<string, unknown> = {};
  for (const [k, x] of Object.entries(v)) {
    if (CAM.test(k)) {
      ra[k] = "«đã ẩn»";
      continue;
    }
    if (typeof x === "string") {
      ra[k] = x.length > 200 ? x.slice(0, 200) + "…" : x;
    } else if (Array.isArray(x)) {
      ra[k] = `${x.length} phần tử`;
    } else if (x !== null && typeof x === "object") {
      ra[k] = "{…}";
    } else {
      ra[k] = x;
    }
  }
  return ra;
}

/** Dòng có hợp lệ để ghi vào sổ không — thiếu lý do là KHÔNG */
export function dongHopLe(d: DongNhatKy): boolean {
  if (!d.lyDoGoi || d.lyDoGoi.trim().length < 3) return false;
  if (!d.congCu || d.congCu.trim() === "") return false;
  return true;
}

/** Gom theo NGÀY để hiện như demo ("Đêm 29/08 → sáng 30/08 · 11 lượt · 0 lỗi") */
export interface NhomNgay {
  ngay: string;
  dong: DongNhatKy[];
  soLuot: number;
  soLoi: number;
  /** Tổng token của những dòng CÓ số token; dòng không có thì không cộng */
  tongToken: number | null;
  /** Bao nhiêu dòng không đo được token — nói rõ chứ không ước */
  soDongKhongCoToken: number;
}

export function gomTheoNgay(ds: DongNhatKy[]): NhomNgay[] {
  const map = new Map<string, DongNhatKy[]>();
  for (const d of ds) {
    const ngay = d.thoiDiem.slice(0, 10);
    const b = map.get(ngay) ?? [];
    b.push(d);
    map.set(ngay, b);
  }
  return Array.from(map.entries())
    .map(([ngay, dong]) => {
      const coToken = dong.filter((x) => typeof x.soToken === "number");
      return {
        ngay,
        dong: dong.sort((a, b) => b.thoiDiem.localeCompare(a.thoiDiem)),
        soLuot: dong.length,
        soLoi: dong.filter((x) => x.ketQua === "loi").length,
        tongToken:
          coToken.length > 0 ? coToken.reduce((s, x) => s + (x.soToken ?? 0), 0) : null,
        soDongKhongCoToken: dong.length - coToken.length,
      };
    })
    .sort((a, b) => b.ngay.localeCompare(a.ngay));
}
