// ============================================================
// CẢNH BÁO & ISSUE — MÔ HÌNH DỮ LIỆU
// Nguồn: PLAN-TONG-THE mục 8 (5 nguồn · 2 trục trạng thái · 5 tab)
//        PLAN-AGENT-TIEN-DO mục 10.0 (giải phẫu 9 phần) · 10.5 (5 bộ cấu hình)
//
// NĂM NGUỒN SINH ISSUE = NĂM TAB (PLAN-TONG-THE 8.2c + 8.7):
//   1 🔗 gang       Logic đường găng   — MÁY sinh, CHỈ MÁY đóng
//   2 📉 nang-suat  Năng suất thấp     — MÁY sinh, CHỈ MÁY đóng
//   3 ⚡ su-kien    Sự kiện (luật cứng)— MÁY sinh, CHỈ MÁY đóng
//   4 👤 nguoi      Người thêm         — vào sổ NGAY, người đóng
//   5 🤖 ai         AI đề xuất         — CHƯA VÀO SỔ, chờ người Duyệt/Bác bỏ
//
// HAI TRỤC TRẠNG THÁI (8.3) — hiển thị CÙNG LÚC trên thẻ:
//   • Điều kiện: máy giữ với nguồn 1–3, người giữ với nguồn 4–5
//   • Xử lý:     LUÔN LUÔN do người ghi. Nút "Ghi nhận xử lý" chỉ ghi vào trục
//                này — nó là ghi chú hành động, KHÔNG đóng issue.
//
// LUẬT CHẶN (10.0): thiếu "Ảnh hưởng COD" hoặc "🤖 Đề xuất" thì thẻ KHÔNG
// được hiện — cảnh báo không nói ảnh hưởng gì và nên làm gì là cảnh báo vô dụng.
// ============================================================

import type { Severity } from "@/lib/types";

/** 5 tab = 5 nguồn sinh issue */
export type NguonIssue = "gang" | "nang-suat" | "su-kien" | "nguoi" | "ai";

/** Trục 1 — điều kiện khách quan, máy hoặc người giữ tùy nguồn */
export type TrangThaiDieuKien =
  | "dang-vi-pham"
  | "het-vi-pham"
  | "cho-on-dinh"
  | "da-dong";

/** Trục 2 — hành động của người, LUÔN do người ghi */
export type TrangThaiXuLy =
  | "chua-ai-dong"
  | "da-tiep-nhan"
  | "da-giao-viec"
  | "dang-xu-ly";

export const NHAN_DIEU_KIEN: Record<TrangThaiDieuKien, string> = {
  "dang-vi-pham": "Đang vi phạm",
  "het-vi-pham": "Hết vi phạm",
  "cho-on-dinh": "Chờ ổn định 2 tuần",
  "da-dong": "Đã đóng",
};

export const NHAN_XU_LY: Record<TrangThaiXuLy, string> = {
  "chua-ai-dong": "Chưa ai động",
  "da-tiep-nhan": "Đã tiếp nhận",
  "da-giao-viec": "Đã giao việc",
  "dang-xu-ly": "Đang xử lý",
};

export const NHAN_TAB: Record<NguonIssue, string> = {
  gang: "🔗 Logic đường găng",
  "nang-suat": "📉 Năng suất thấp",
  "su-kien": "⚡ Sự kiện",
  nguoi: "👤 Issue do người thêm",
  // ⭐ Tab 5 của Agent Base — Mr. Đại chốt 07/09: màn "Đề xuất chờ duyệt"
  // KHÔNG đứng riêng ở menu nữa mà gộp thành tab 5 của màn Cảnh báo.
  ai: "🤖 Đề xuất chờ duyệt",
};

/** Nguồn 1–3 do máy sinh và CHỈ MÁY đóng được (8.2c) */
export function laNguonMay(n: NguonIssue): boolean {
  return n === "gang" || n === "nang-suat" || n === "su-kien";
}

/** Một lần ghi nhận hành động — lưu bền, không phải state trong phiên */
export interface GhiNhanXuLy {
  /** ISO datetime */
  luc: string;
  nguoi: string;
  /** Việc đã làm, người gõ tay */
  viecDaLam: string;
  /** Trục 2 chuyển sang trạng thái nào */
  chuyenSang: TrangThaiXuLy;
}

/**
 * MỘT THẺ CẢNH BÁO — đủ 9 phần của mục 10.0.
 * Số thứ tự trong chú thích là số phần trong bảng 10.0.
 */
/**
 * AGENT SINH RA ISSUE NÀY — chốt BC 04/09 (LOI-DUNG-CHUNG 6e.1):
 *   NHÌN: mọi agent nhìn thấy issue của cả 5 agent.
 *   GHI : thêm/sửa/xoá CHỈ với issue do chính agent đó sinh ra.
 *
 * ⭐ SỬA 05/09/2026 — bộ code này là AGENT BASE, không phải agent tiến độ.
 * `AGENT_NAY` trước đây ghi cứng "tien-do" (di sản lúc fork). Hậu quả THẬT,
 * không phải chuyện chữ nghĩa:
 *   ① issue người thêm bị đóng dấu chủ sở hữu SAI (`agent: "tien-do"`),
 *   ② `chanGhiAgentKhac` so nhầm chủ, nên Agent Base sửa được issue của
 *      agent tiến độ và ngược lại — đúng điều LOI-DUNG-CHUNG 6e.1 cấm.
 * Đổi ở ĐÚNG một hằng số này là cả hai chỗ tự đúng theo.
 */
export type MaAgent = "tien-do" | "phap-ly" | "hop-dong" | "base" | "main";

export const AGENT_NAY: MaAgent = "base";

export const TEN_AGENT: Record<MaAgent, string> = {
  "tien-do": "Agent tiến độ",
  "phap-ly": "Agent pháp lý",
  "hop-dong": "Agent hợp đồng",
  base: "Agent Công việc",
  main: "Main Agent",
};

/** Phạm vi đang xem trên màn Cảnh báo */
export type PhamViIssue = "agent-nay" | "toan-bo" | "da-dong";

export const NHAN_PHAM_VI: Record<PhamViIssue, string> = {
  // Nhãn đọc từ bảng tên agent — đổi AGENT_NAY là nhãn tự đổi theo
  "agent-nay": `Chỉ issue của ${TEN_AGENT[AGENT_NAY]}`,
  "toan-bo": "Toàn bộ dự án — cả 5 agent",
  "da-dong": "Đã đóng — xem lại",
};

export interface TheCanhBao {
  /** (1) Mã issue — ISS-<năm>-<tuần>-<số>; nguồn AI dùng "DX-<số>" vì CHƯA vào sổ */
  id: string;
  nguon: NguonIssue;
  /** (1) Mức */
  mucDo: Severity;
  /** (1) Tiêu đề ĐỊNH LƯỢNG — có số, không nói chung chung */
  tieuDe: string;
  /** (2) Phân tích số: vì sao máy kết luận thế */
  phanTich: string;
  /** Đối tượng — mã WBS/mốc/nhà thầu */
  wbs?: string;
  /** (3) Chuỗi lan truyền tới COD, mỗi dòng ghi rõ quy tắc P nào, bị đẩy mấy ngày */
  chuoiLanTruyen?: string[];
  /** (4) Ảnh hưởng COD — TÁCH RIÊNG, không lẫn vào văn xuôi */
  anhHuongCod: number;
  /**
   * (4) Chuỗi trùng: thẻ này nằm trong ảnh hưởng của thẻ kia thì ghi mã thẻ kia
   * và KHÔNG cộng dồn số ngày (luật "không cộng dồn trùng" của Nhóm 1).
   */
  trungChuoiVoi?: string;
  /** (5) Nguồn — file / lần tính nào sinh ra thẻ */
  nguonDuLieu: string;
  /** (6) 🤖 Đề xuất xử lý của AI — phải có CON SỐ hành động được */
  deXuat: string;
  /** (7) Thiếu dữ liệu đối chiếu thì NÓI THẲNG, kèm cách khắc phục */
  thieuDuLieu?: string;
  /** (8) Hai trục trạng thái */
  dieuKien: TrangThaiDieuKien;
  xuLy: TrangThaiXuLy;
  /** Lịch sử ghi nhận — lưu bền, thay cho `acknowledged` chỉ sống trong phiên */
  ghiNhan: GhiNhanXuLy[];

  /**
   * 🙈 ẨN (chốt AQ / LOI-DUNG-CHUNG 6e.3): issue ĐÚNG nhưng để xử sau.
   * Vẫn nằm trong sổ, VẪN ĐẾM vào tổng — ẩn chỉ để đỡ rối mắt, không phải để
   * tự lừa mình là hết việc. Khác hẳn XOÁ (issue SAI → rời sổ, vào sổ đã bác).
   */
  an?: boolean;

  /**
   * Agent sinh ra thẻ. Chỉ agent bằng AGENT_NAY mới được sửa/xoá — chốt BC.
   *
   * ⚠ Thiếu trường này thì coi là của CHÍNH AGENT NÀY (dữ liệu cũ ghi trước
   * 06/09, lúc chưa có cột `agent`). Cố ý chọn hướng dễ dãi: khoá nhầm dữ
   * liệu cũ của chính mình thì người dùng bị chặn oan và không hiểu vì sao.
   */
  agent?: MaAgent;

  /** Cột riêng của Agent tiến độ (PLAN-TONG-THE 8.2b) */
  soNgayTre?: number;
  trenDuongGang?: boolean;

  /** Ngày mở (ISO) — để chạy luật 8.4 ② tự nâng mức sau 3 tuần chưa xử lý */
  ngayMo: string;
  /** Số tuần đã mở — máy tính lại mỗi lần chạy */
  soTuanMo?: number;

  /** Nguồn 5 BẮT BUỘC: trích NGUYÊN VĂN câu chữ đã đọc được */
  trichNguyenVan?: string;
  /** Nguồn 5: chưa vào sổ cho tới khi người bấm Duyệt */
  chuaVaoSo?: boolean;
  /** Nguồn 5: lý do bác bỏ — lưu để đo AI sai bao nhiêu */
  lyDoBacBo?: string;

  /** Người thêm (nguồn 4) */
  nguoiMo?: string;
  nguoiTheoDoi?: string;
  hanXuLy?: string;
}

/**
 * LUẬT CHẶN của 10.0 — thẻ thiếu Ảnh hưởng COD hoặc Đề xuất thì KHÔNG hiện.
 * `anhHuongCod = 0` là hợp lệ (việc không trên găng), nhưng phải có ĐỀ XUẤT.
 */
export function theHopLe(t: TheCanhBao): boolean {
  if (typeof t.anhHuongCod !== "number" || Number.isNaN(t.anhHuongCod)) return false;
  if (!t.deXuat || t.deXuat.trim() === "") return false;
  // Nguồn AI còn phải trích nguyên văn câu chữ nguồn (10.5 bộ 5, luật không tắt được)
  if (t.nguon === "ai" && (!t.trichNguyenVan || t.trichNguyenVan.trim() === "")) return false;
  return true;
}

/** Đỏ trước, rồi ảnh hưởng COD nhiều hơn lên trước — dùng cho cả 11.3 */
export function sapXep(a: TheCanhBao, b: TheCanhBao): number {
  const m = (x: Severity): number => (x === "red" ? 0 : x === "yellow" ? 1 : 2);
  if (m(a.mucDo) !== m(b.mucDo)) return m(a.mucDo) - m(b.mucDo);
  return b.anhHuongCod - a.anhHuongCod;
}

/**
 * BỨC TRANH CHUNG của màn Cảnh báo — áp cùng khuôn với màn Phân tích năng suất
 * (Mr. Đại chốt 06/09: "ok áp").
 *
 * ⚠ KHÔNG cộng dồn ảnh hưởng COD của các thẻ. Hai lý do, cả hai đều đã thành
 * luật ở nơi khác:
 *   ① Thẻ nào ghi `trungChuoiVoi` là nằm TRONG chuỗi lan truyền của thẻ khác —
 *      cộng vào là đếm hai lần cùng một sự chậm (luật "không cộng dồn trùng"
 *      của Nhóm 1, xem sinh-nhom12.ts).
 *   ② Các chuỗi độc lập chạy song song, nên cái dài nhất mới quyết định COD.
 * Vậy con số đưa ra là ẢNH HƯỞNG NẶNG NHẤT, không phải tổng.
 */
export interface TongCanhBao {
  /** Bao nhiêu issue đang mở */
  soDangMo: number;
  soDo: number;
  soVang: number;
  /** Số ngày COD bị đẩy bởi thẻ nặng nhất — KHÔNG phải tổng các thẻ */
  codNangNhat: number;
  /** Thẻ gây ra con số đó, để nêu đích danh */
  theNangNhat: TheCanhBao | null;
  /** Bao nhiêu thẻ chưa ai nhận xử lý */
  soChuaAiDong: number;
  /** Bao nhiêu thẻ đã mở quá 3 tuần mà chưa xong */
  soDeLau: number;
}

export function tongCanhBao(ds: TheCanhBao[]): TongCanhBao {
  const mo = ds.filter(dangMo);
  let codNangNhat = 0;
  let theNangNhat: TheCanhBao | null = null;
  for (const t of mo) {
    // Thẻ nằm trong chuỗi của thẻ khác thì bỏ qua khi tìm cái nặng nhất
    if (t.trungChuoiVoi) continue;
    if (t.anhHuongCod > codNangNhat) {
      codNangNhat = t.anhHuongCod;
      theNangNhat = t;
    }
  }
  return {
    soDangMo: mo.length,
    soDo: mo.filter((t) => t.mucDo === "red").length,
    soVang: mo.filter((t) => t.mucDo === "yellow").length,
    codNangNhat,
    theNangNhat,
    soChuaAiDong: mo.filter((t) => t.xuLy === "chua-ai-dong").length,
    soDeLau: mo.filter((t) => (t.soTuanMo ?? 0) >= 3).length,
  };
}

/** Thẻ còn "đang mở" = điều kiện chưa đóng hẳn */
export function dangMo(t: TheCanhBao): boolean {
  return t.dieuKien !== "da-dong";
}

/** Số tuần trọn vẹn giữa hai ngày ISO */
export function soTuanGiua(tu: string, den: string): number {
  const a = new Date(tu + "T00:00:00Z").getTime();
  const b = new Date(den + "T00:00:00Z").getTime();
  return Math.max(0, Math.floor((b - a) / (7 * 86400000)));
}

/**
 * LUẬT 8.4 ② — issue mở 3 tuần liên tiếp chưa ai xử lý thì VÀNG TỰ LÊN ĐỎ.
 * Trả về thẻ mới (không sửa tại chỗ) để dễ kiểm.
 */
export function tuNangMuc(t: TheCanhBao, homNay: string): TheCanhBao {
  const tuan = soTuanGiua(t.ngayMo, homNay);
  const chuaAiDong = t.xuLy === "chua-ai-dong";
  if (t.mucDo === "yellow" && chuaAiDong && tuan >= 3) {
    return {
      ...t,
      soTuanMo: tuan,
      mucDo: "red",
      phanTich:
        t.phanTich +
        ` — mở tuần thứ ${tuan + 1} mà chưa ai động, tự nâng 🟡 → 🔴 (luật 8.4②).`,
    };
  }
  return { ...t, soTuanMo: tuan };
}

/**
 * LUẬT 8.4 ① — KHÔNG MỞ TRÙNG: cùng đối tượng + cùng nguồn mà đang mở thì
 * không tạo thẻ mới. Trả về danh sách đã gộp, thẻ cũ được giữ (ngày mở cũ).
 */
export function bo_trung(cu: TheCanhBao[], moi: TheCanhBao[]): TheCanhBao[] {
  const khoa = (t: TheCanhBao): string => `${t.nguon}|${t.wbs ?? ""}`;
  const dangCo = new Map<string, TheCanhBao>();
  for (const t of cu) if (dangMo(t)) dangCo.set(khoa(t), t);
  const ra: TheCanhBao[] = [...cu];
  for (const t of moi) {
    const k = khoa(t);
    const co = dangCo.get(k);
    if (co) {
      // Cùng vấn đề vẫn đang mở → cập nhật số liệu, GIỮ ngày mở và lịch sử cũ
      const i = ra.indexOf(co);
      ra[i] = {
        ...t,
        id: co.id,
        ngayMo: co.ngayMo,
        ghiNhan: co.ghiNhan,
        xuLy: co.xuLy,
        nguoiTheoDoi: co.nguoiTheoDoi,
      };
    } else {
      ra.push(t);
      dangCo.set(k, t);
    }
  }
  return ra;
}
