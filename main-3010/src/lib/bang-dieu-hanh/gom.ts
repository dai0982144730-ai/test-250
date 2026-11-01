// ============================================================
// GOM SỐ CHO BẢNG ĐIỀU HÀNH  (server-only — đụng mạng qua cổng MCP)
// Demo nguồn: demo-agent-main.html màn "bdh" (7 vòng hỏi Mr. Đại 04/09)
//
// ⛔ Main KHÔNG TỰ TÍNH SỐ NÀO — mọi số do agent chủ trả về qua cổng, truy
//    nguồn ở Nhật ký agent hỏi nhau. Nguồn nào chưa mở công cụ thì ô hiện
//    "chưa lấy được dữ liệu từ Agent …" — demo ghi rõ: KHÔNG ĐƯỢC ĐOÁN.
//
// Đo thật 08/09/2026 trên cổng tiendo (13 công cụ):
//   • tiendo.tom_tat_du_an  → %TT, COD tính toán, COD mục tiêu, số việc găng,
//     việc trễ, câu tom_tat (CODE ghép — không phải LLM nên KHÔNG icon 🤖)
//   • tiendo.duong_gang     → cod_du_bao · cod_muc_tieu · lech_ngay_so_muc_tieu
//     · chuoi_gang[{wbs, ten, batDau, ketThuc, pct, quanHeTruoc}]
//   • ⭐ 09/09: tiendo.s_curve + tiendo.so_tuan ĐÃ MỞ (lệnh Mr. Đại) — hai khối
//     đó nay có số thật; so_tuan chưa đủ 2 tuần BC thì cổng nói thẳng.
// ⭐ 09/09 đo lại: cổng base.* (8 công cụ) và phaply.* (2 công cụ) ĐÃ MỞ —
// ghi chú cũ "chưa có dòng code" là của thời demo 08/09, đừng tin lại nó.
// ⭐ 10/09 đo tiếp: hopdong.* CŨNG ĐÃ MỞ (8 công cụ, đều san_sang) — đây là lần
// THỨ BA một ghi chú "chưa có cổng" bị số đo lật. Luật: muốn biết cổng nào mở,
// gọi nang_luc của nó, đừng đọc ghi chú.
// ============================================================

import { hoiTienDo } from "@/lib/nguon-tien-do";
import { hoiAgent } from "@/lib/nguon/hoi-agent";
import type { SCurveDayDu, SCurvePoint } from "@/lib/scurve-kieu";
import { docCauHinhBdh, type DuAnDanNgang } from "./cau-hinh";
import { congNgay, thuHaiTuanIso, type DongNguonLucTuan, type NguonLucHaiTuan } from "./tuan-khac";
import { gomIssue } from "@/lib/issue-main/gom";
import { maNganDuAn } from "@/lib/projects";
import type { KhuonTra } from "@/lib/mcp/khuon";
import { gioPhut, thongTinBanCu, type TuyChonNho } from "@/lib/nguon/bo-nho-hoi";
import { TEN_DANG_LAP, TEN_HE } from "@/lib/chung/luat-nhanh-cham";

/**
 * ⭐ QS-073/QS-074 (27/09) — một lượt gom Bảng điều hành:
 *   · mọi câu hỏi ĐỌC nhớ 10 phút (bo-nho-hoi.ts); `lamMoi` = người bấm ↻ → hỏi thật
 *   · bên kia chưa trả lời kịp / đang ngắt mạch mà còn bản cũ (≤ 24 giờ) → dùng tạm
 *     bản cũ và NÓI RÕ tuổi số ("đang dùng số lúc HH:mm"), không để ô trống
 */
interface NguCanhGom {
  tc: TuyChonNho;
  /** Câu tiếng Việt cho từng khối đang dùng bản cũ */
  banCu: string[];
  /** Lúc trả lời CŨ NHẤT trong các số đang bày (ISO) — màn in "số lấy lúc HH:mm" */
  lucCuNhat: string | null;
}

function taoNguCanh(lamMoi: boolean): NguCanhGom {
  return { tc: { dungBanCuKhiLoi: true, ...(lamMoi ? { boQuaNho: true } : {}) }, banCu: [], lucCuNhat: null };
}

/** Ghi nhận một câu trả lời: tuổi số + có phải bản cũ dùng tạm không */
function ghiNhan(ctx: NguCanhGom, nhan: string, kq: KhuonTra): void {
  if (!kq.ok) return;
  const cu = thongTinBanCu(kq);
  if (cu) {
    const cau = `${nhan}: chưa trả lời kịp (${cu.lyDo.replace(/\.$/, "")}) — đang dùng số lúc ${gioPhut(cu.luc)}`;
    if (!ctx.banCu.includes(cau)) ctx.banCu.push(cau);
  }
  const t = kq.thoi_diem_tra_loi;
  if (t && Number.isFinite(Date.parse(t)) && (ctx.lucCuNhat === null || Date.parse(t) < Date.parse(ctx.lucCuNhat))) {
    ctx.lucCuNhat = t;
  }
}

/** Câu lỗi khi CHƯA có số (không có cả bản cũ) — nói vì sao + làm gì tiếp */
function cauChuaCoSo(tenAgent: string, kq: KhuonTra): string {
  if (kq.ok) return "";
  if (kq.ma_loi === "HET_HAN_CHO") {
    return `Chưa lấy được từ ${tenAgent} — ${kq.thong_diep.replace(/\.$/, "")}; chưa có số, tải lại trang sau ít phút.`;
  }
  return `Chưa lấy được từ ${tenAgent} — ${kq.thong_diep}`;
}

/** Chạy song song có giới hạn, giữ đúng thứ tự — nhiều dự án một lúc không dồn cổng Tiến độ */
export async function songSongGioiHan<T, R>(ds: T[], toiDa: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const ra: R[] = new Array(ds.length);
  let tiep = 0;
  const tho = async () => {
    while (tiep < ds.length) {
      const i = tiep++;
      ra[i] = await fn(ds[i]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(Math.max(1, toiDa), ds.length) }, tho));
  return ra;
}

/** Số dự án hỏi tom_tat_du_an cùng lúc — cổng Tiến độ tính lịch lần lượt, dồn cả dàn là chậm cả dàn */
const SO_DU_AN_CUNG_LUC = 2;

/** Tóm tắt một dự án trên dàn ngang — số lấy nguyên từ tom_tat_du_an */
export interface TheDuAn {
  ma: string;
  ten: string;
  /** null = chưa lấy được (kèm lý do ở `loi`) */
  so: {
    /** % tổng cổng `pctTotal` — tập việc nối tới mốc COD (cùng số S-Curve) */
    pctTong: number;
    /** Nhãn cổng trả kèm `pctTotal` (`nhanPctTotal`) — "" = cổng chưa trả */
    nhanPctTong: string;
    /**
     * % cả dự án tính MỌI việc lá (cổng `pctToanBoViec`, 25/09) — null = cổng
     * chưa trả. Main chỉ ánh xạ, không tự tính.
     */
    pctToanBo: number | null;
    /** Nhãn cổng trả kèm `pctToanBoViec` (`nhanPctToanBoViec`) */
    nhanPctToanBo: string;
    codTinhToan: string;
    codMucTieu: string;
    /**
     * Số ngày COD dự báo chậm so với Tiến độ mục tiêu (cổng `cham_ngay_so_muc_tieu`) — DƯƠNG = chậm, ÂM = sớm.
     * null = chưa có ngày Tiến độ mục tiêu / chưa có COD dự báo (không thay 0, vì 0 là «đúng hạn»).
     */
    lechNgay: number | null;
    /** Số ngày COD dự báo chậm so với Baseline ĐÃ DUYỆT (cổng `cham_ngay_so_baseline`) — null = chưa có Baseline đã duyệt */
    lechNgaySoBaseline: number | null;
    /**
     * Số việc găng TỚI MỐC COD (cổng `so_viec_gang`, Mr. Đại chốt 24/09) —
     * null = cổng chưa trả trường này (không đoán, không thay 0)
     */
    soViecGang: number | null;
    /** Số việc găng đang trễ theo dự báo (cổng `so_viec_gang_dang_tre`) */
    soViecGangDangTre: number | null;
    /** Câu CODE ghép từ công cụ — không phải LLM, hiện không icon */
    tomTat: string;
  } | null;
  loi: string | null;
}

export interface DongGang {
  wbs: string;
  ten: string;
  batDau: string;
  ketThuc: string;
  /** TH — % thực tế chốt tại ngày báo cáo mới nhất */
  pct: number;
  /** KH — % lẽ ra phải đạt tại cùng ngày đó. null = cổng chưa tính được */
  pctKeHoach: number | null;
  /** Phần % còn thiếu quy ra ngày trên chính thanh baseline */
  soNgayTre: number | null;
}

/**
 * Một hạng mục găng — TỰ LÀM COD CHẬM bao nhiêu ngày so với Baseline (Mr. Đại chốt 14/10/2026, luật 35 + 36). Agent Tiến độ
 * tính (tiendo.duong_gang → hang_muc_tu_lam_cod_cham), Main chỉ hiện — không tính lại (phân vai 06/09).
 */
export interface HangMucTuLamCham {
  wbs: string;
  ten: string;
  duBaoXong: string | null;
  baselineXong: string | null;
  /** null = chưa có Baseline đã duyệt */
  tuLamCodCham: number | null;
  trongDoThoiTiet: number | null;
  soViecGang: number;
}

export interface ChiTietDuAn {
  codDuBao: string;
  codMucTieu: string;
  /** Số ngày COD dự báo chậm so với Tiến độ mục tiêu — dương = chậm, âm = sớm; null = chưa có ngày Tiến độ mục tiêu */
  lechNgay: number | null;
  /** COD Baseline ĐÃ DUYỆT + số ngày COD dự báo chậm so với nó — null = chưa duyệt (14/10/2026) */
  codBaseline: string | null;
  lechNgaySoBaseline: number | null;
  /** Câu agent Tiến độ viết sẵn: «chậm 86 ngày so với Tiến độ mục tiêu = 42 ngày … + 44 ngày …» — null = cổng cũ / thiếu số */
  tachChamCod: string | null;
  hangMucTuLam: HangMucTuLamCham[];
  /** Ngày báo cáo dùng làm mốc so KH ↔ TH — in ra để soi được */
  mocSoSanh: string;
  chuoiGang: DongGang[];
  loi: string | null;
}

// ⭐ 09/09 — bốn khối trước đây "chưa lấy được" nay có cổng thật (lệnh Mr. Đại):
// tiendo.s_curve · tiendo.so_tuan vừa mở; base.* và phaply.* đã mở từ trước
// nhưng ghi chú cũ trong màn nói "chưa có dòng code" — lỗi thời, đã đo lại.

export interface KhoiSCurve {
  diem: SCurvePoint[];
  /** 24/09 — Main CHỈ ÁNH XẠ: ngày cắt + ghi chú do tiendo.s_curve tính sẵn */
  ngayCatDuLieu?: string | null;
  ghiChu?: string[];
  /** 24/09 — ngày từng đường đạt 100% + việc cuối (tiendo.s_curve tính) */
  dat100?: SCurveDayDu["dat100"] | null;
  /** 24/09 tối — "tính trên N việc nối tới mốc COD …" (tiendo.s_curve tính) */
  cauTapViec?: string;
  /** 24/09 tối — việc kế hoạch xong trước COD mà không nối tới mốc COD (khối cảnh báo) */
  viecKhongNoi?: SCurveDayDu["viecKhongNoi"];
  loi: string | null;
}

export interface ThuocDoTuan {
  ten: string;
  truoc: string;
  nay: string;
  doi: string;
  tone: "green" | "red" | "yellow" | "muted";
  ghiChu: string;
}

export interface KhoiSoTuan {
  tuanTruoc: string;
  tuanNay: string;
  thuocDo: ThuocDoTuan[];
  loi: string | null;
}

export interface DongHoSoThieu {
  maHoSo: string;
  ten: string;
  coQuan: string;
  quaHanNgay: number | null;
}

export interface KhoiPhapLy {
  tongPhaiCo: number;
  soThieu: number;
  dong: DongHoSoThieu[];
  loi: string | null;
}

export interface DongViecTac {
  ten: string;
  nguoiPhuTrach: string;
  quaHanNgay: number;
}

export interface KhoiTac {
  soQuaHan: number;
  dong: DongViecTac[];
  /** Câu trả lời của base.quy_trinh_dang_tac (kể cả "không có gì tắc") */
  quyTrinh: string;
  /** ⭐ 10/09 — câu trả lời của hopdong.phieu_gia_dang_cho (demo khối ⑥ có phiếu giá tắc) */
  phieuGia: string;
  loi: string | null;
}

/**
 * ⭐ CHỐNG TRÙNG BẢNG ĐIỀU HÀNH ↔ MÀN ISSUE — Mr. Đại bắt lỗi 04/09.
 *
 * Demo (khối ⑤ và ⑥) chốt: thứ ĐÃ THÀNH ISSUE thì ở Bảng điều hành chỉ hiện
 * MỘT DÒNG GỌN CÓ MÃ (mờ đi, không nút) — nội dung và nút nằm ở thẻ issue.
 * Bảng điều hành trả lời "đang thế nào", màn Cảnh báo trả lời "phải xử gì".
 *
 * "Đã thành issue" là điều kiện CODE kiểm được, không để LLM tự thấy: mã hồ sơ
 * (HV-02-04) hoặc tên việc xuất hiện trong tiêu đề / mô tả / nguồn của một issue
 * đang mở. Không khớp thì coi như chưa thành issue — thà hiện đủ còn hơn giấu.
 */
export interface DaThanhIssue {
  /** Chuỗi đem đi dò — mã hồ sơ hoặc tên việc */
  khoa: string;
  /** Mã issue để hiện ra và trỏ sang màn Cảnh báo */
  maIssue: string;
}

// ─────────────────────────────────────────────────────────────
// ⭐ G10 (Mr. Đại chốt 22/09) — KHỐI TIỀN: toàn cảnh tiền của dự án lên Bảng
// điều hành. Hỏi hopdong.gia_tri_luy_ke(ma_du_an) lấy danh sách HĐ tầng A (BQL
// ký — luật I07: nhà thầu ký với BQL, KHÔNG quản thầu phụ), rồi
// hopdong.toan_canh(ma_hop_dong) từng HĐ. Số lấy NGUYÊN từ Agent hợp đồng;
// null = "chưa có số" kèm câu vì sao của chính agent đó. Main chỉ CỘNG các HĐ
// khi MỌI HĐ đều có số cùng đơn vị — thiếu một HĐ thì không cộng thiếu.
// ─────────────────────────────────────────────────────────────

export type KhoaTien =
  | "giaTriHd"
  | "daThanhToan"
  | "daNghiemThu"
  | "daThiCongChuaNt"
  | "phatDangTreo"
  | "tamUngChuaThuHoi"
  | "baoLanhSapHet";

/** Thứ tự + nhãn 7 ô — một chỗ định nghĩa, màn đọc lại từ đây */
export const O_TIEN: { khoa: KhoaTien; nhan: string }[] = [
  { khoa: "giaTriHd", nhan: "Giá trị hợp đồng" },
  { khoa: "daThanhToan", nhan: "Đã thanh toán" },
  { khoa: "daNghiemThu", nhan: "Đã nghiệm thu" },
  { khoa: "daThiCongChuaNt", nhan: "Đã thi công chưa nghiệm thu" },
  { khoa: "phatDangTreo", nhan: "Phạt đang treo" },
  { khoa: "tamUngChuaThuHoi", nhan: "Tạm ứng chưa thu hồi" },
  { khoa: "baoLanhSapHet", nhan: "Bảo lãnh sắp hết" },
];

export interface OTien {
  /** null = CHƯA CÓ SỐ (không phải 0) */
  so: number | null;
  donVi: string | null;
  /** Câu vì sao chưa có — nguyên văn Agent hợp đồng, hoặc Main nói vì sao không cộng */
  viSao: string | null;
}

export interface DongHdTien {
  ma: string;
  soHieu: string;
  nhaThau: string;
  o: Record<KhoaTien, OTien>;
  /** Lượt toan_canh của HĐ này hỏng — câu lỗi nguyên văn */
  loi: string | null;
}

export interface KhoiTien {
  /** Tổng các HĐ tầng A — chỉ cộng khi đủ số */
  tong: Record<KhoaTien, OTien>;
  hopDong: DongHdTien[];
  /** HĐ bị bỏ vì không phải BQL ký (luật I07) — nói ra, không giấu */
  boQua: string[];
  loi: string | null;
  /** ⭐ 05/10 luật agent mật: người đang xem không được thấy hợp đồng dự án này — câu hiện thay cả khối */
  an?: string;
}

/** Khối Tiền rỗng để thay khi người xem không được thấy hợp đồng (agent-mat-loc.ts) — không mang số nào */
export function khoiTienAn(lyDo: string): KhoiTien {
  const o = Object.fromEntries(O_TIEN.map((x) => [x.khoa, { so: null, donVi: null, viSao: lyDo }])) as Record<KhoaTien, OTien>;
  return { tong: o, hopDong: [], boQua: [], loi: null, an: lyDo };
}

/** Ba trường toan_canh CHƯA trả (đo 23/09) — đọc nếu có, không có thì nói thẳng */
const TRUONG_CONG_THEM: Record<"phatDangTreo" | "tamUngChuaThuHoi" | "baoLanhSapHet", string> = {
  phatDangTreo: "phat_dang_treo",
  tamUngChuaThuHoi: "tam_ung_chua_thu_hoi",
  baoLanhSapHet: "bao_lanh_sap_het",
};

function docO(x: unknown, viSaoThieu: string): OTien {
  if (!x || typeof x !== "object") return { so: null, donVi: null, viSao: viSaoThieu };
  const o = x as Record<string, unknown>;
  const so = typeof o.so === "number" && Number.isFinite(o.so) ? o.so : null;
  return {
    so,
    donVi: typeof o.don_vi === "string" && o.don_vi !== "" ? o.don_vi : null,
    viSao: so === null ? String(o.vi_sao_chua_co ?? viSaoThieu) : null,
  };
}

const LY_DO_TIEN = "Bảng điều hành của Main: khối Tiền — toàn cảnh tiền dự án cho lãnh đạo (G10)";
const TRAN_HD = 10;

async function tienMotDuAn(ma: string, ctx: NguCanhGom): Promise<KhoiTien> {
  const rong = (viSao: string): Record<KhoaTien, OTien> =>
    Object.fromEntries(O_TIEN.map((x) => [x.khoa, { so: null, donVi: null, viSao }])) as Record<KhoaTien, OTien>;
  const lk = await hoiAgent("hopdong", "hopdong.gia_tri_luy_ke", LY_DO_TIEN, { ...ctx.tc, tham_so: { ma_du_an: ma } });
  if (!lk.ok) return { tong: rong(lk.thong_diep), hopDong: [], boQua: [], loi: cauChuaCoSo("Agent Hợp đồng", lk) };
  ghiNhan(ctx, "Agent Hợp đồng — giá trị luỹ kế", lk);
  const dl = lk.du_lieu as Record<string, unknown>;
  const ds = Array.isArray(dl.hop_dong) ? (dl.hop_dong as Record<string, unknown>[]) : [];
  // Luật I07: gia_tri_luy_ke đã lọc tầng A (BQL ký). Chặn thêm mã thầu phụ TP-
  // phòng khi cổng đổi — thầu phụ do Agent tiến độ quản, Main không bày tiền.
  const boQua = ds.filter((h) => /^TP-/i.test(String(h.ma_nha_thau ?? ""))).map((h) => String(h.ma ?? ""));
  const nhan = ds.filter((h) => !/^TP-/i.test(String(h.ma_nha_thau ?? ""))).slice(0, TRAN_HD);

  const hopDong: DongHdTien[] = await Promise.all(
    nhan.map(async (h): Promise<DongHdTien> => {
      const maHd = String(h.ma ?? "");
      const goc = { ma: maHd, soHieu: String(h.so_hieu ?? ""), nhaThau: String(h.nha_thau ?? "") };
      const tc = await hoiAgent("hopdong", "hopdong.toan_canh", LY_DO_TIEN, { ...ctx.tc, tham_so: { ma_hop_dong: maHd } });
      if (!tc.ok) return { ...goc, o: rong(tc.thong_diep), loi: tc.thong_diep };
      ghiNhan(ctx, `Agent Hợp đồng — toàn cảnh hợp đồng ${maHd}`, tc);
      const d = tc.du_lieu as Record<string, unknown>;
      const bv = (d.bon_vung ?? {}) as Record<string, unknown>;
      const chuaTra = "Cổng hopdong.toan_canh chưa trả trường này (đo 23/09) — số đang nằm ở màn Toàn cảnh 3012, chưa mở qua cổng.";
      const o: Record<KhoaTien, OTien> = {
        giaTriHd: docO(bv.gia_tri_hop_dong, chuaTra),
        daThanhToan: docO(bv.da_thanh_toan, chuaTra),
        daNghiemThu: docO(bv.da_nghiem_thu, chuaTra),
        daThiCongChuaNt: docO(bv.da_thi_cong_chua_nghiem_thu, chuaTra),
        phatDangTreo: docO(d[TRUONG_CONG_THEM.phatDangTreo], chuaTra),
        tamUngChuaThuHoi: docO(d[TRUONG_CONG_THEM.tamUngChuaThuHoi], chuaTra),
        baoLanhSapHet: docO(d[TRUONG_CONG_THEM.baoLanhSapHet], chuaTra),
      };
      return { ...goc, soHieu: String(d.so_hieu ?? goc.soHieu), nhaThau: String(d.nha_thau ?? goc.nhaThau), o, loi: null };
    }),
  );

  const tong = rong("Dự án chưa có hợp đồng tầng A nào.");
  for (const { khoa } of O_TIEN) {
    const cac = hopDong.map((h) => h.o[khoa]);
    if (cac.length === 0) continue;
    const coSo = cac.filter((x) => x.so !== null);
    const donVi = Array.from(new Set(coSo.map((x) => x.donVi ?? "")));
    if (coSo.length === cac.length && donVi.length === 1) {
      tong[khoa] = { so: coSo.reduce((a, x) => a + (x.so ?? 0), 0), donVi: coSo[0]!.donVi, viSao: null };
    } else if (cac.length === 1) {
      tong[khoa] = cac[0]!;
    } else if (coSo.length === cac.length) {
      tong[khoa] = { so: null, donVi: null, viSao: `Các hợp đồng ghi khác đơn vị (${donVi.join(" · ")}) — không cộng.` };
    } else {
      tong[khoa] = {
        so: null,
        donVi: null,
        viSao: `${coSo.length}/${cac.length} hợp đồng có số — không cộng thiếu, xem từng hợp đồng bên dưới.`,
      };
    }
  }
  return { tong, hopDong, boQua, loi: null };
}

export interface DuLieuBdh {
  duAn: TheDuAn[];
  dangChon: string;
  /**
   * ⭐ 13/09 — Dự án người đang chọn ở top menu KHÔNG có trong dàn ngang Bảng
   * điều hành. Trước đây code lặng lẽ lấy dự án ĐẦU dàn rồi bày số của nó ra;
   * người đọc tưởng đang xem dự án mình chọn (Mr. Đại bắt lỗi cùng dạng ở Base
   * 13/09: *"đang chọn Nậm Sam 3A nhưng cây việc, issue lại của Hướng Việt"*).
   * Khác rỗng = màn phải nói thẳng câu này thay vì để người đọc nhầm.
   */
  canhBaoLechDuAn: string;
  chiTiet: ChiTietDuAn | null;
  sCurve: KhoiSCurve | null;
  soTuan: KhoiSoTuan | null;
  /** Nhân công · máy theo thầu phụ của hai tuần mà `soTuan` đang so (28/10) */
  nguonLuc: NguonLucHaiTuan | null;
  phapLy: KhoiPhapLy | null;
  tac: KhoiTac | null;
  /** ⭐ G10 — khối Tiền (Agent hợp đồng) */
  tien: KhoiTien | null;
  /** Bảng tra "khoá → mã issue" cho khối ⑤ ⑥ (chống trùng, xem DaThanhIssue) */
  daThanhIssue: DaThanhIssue[];
  /**
   * ⭐ QS-074 (27/09): lúc trả lời CŨ NHẤT trong các số đang bày (ISO) — màn in
   * "Số lấy lúc HH:mm" vì số có thể lấy từ bộ nhớ 10 phút. null = chưa có số nào.
   */
  lucSo: string | null;
  /** ⭐ QS-073 (27/09): khối nào đang dùng BẢN CŨ vì bên kia chưa trả lời kịp — câu tiếng Việt */
  banCu: string[];
}

/**
 * Dò xem những khoá nào (mã hồ sơ / tên việc) đã có issue đang mở nhận.
 *
 * ⛔ Không ném ngoại lệ ra ngoài: gom issue hỏng thì màn vẫn phải hiện đủ —
 *    mất chống trùng còn hơn mất cả Bảng điều hành (luật 3 HOP-DONG-KET-NOI).
 */
async function doDaThanhIssue(projectId: string, khoa: string[], tc: TuyChonNho): Promise<DaThanhIssue[]> {
  if (khoa.length === 0) return [];
  try {
    const { issue } = await gomIssue(projectId, { boQuaNho: tc.boQuaNho });
    const dangMo = issue.filter((i) => !i.daDong);
    const ra: DaThanhIssue[] = [];
    for (const k of khoa) {
      const kl = k.toLowerCase().trim();
      if (kl.length < 4) continue; // khoá quá ngắn dò ra bừa, bỏ
      const trung = dangMo.find(
        (i) =>
          i.tieuDe.toLowerCase().includes(kl) ||
          i.moTa.toLowerCase().includes(kl) ||
          i.nguonDuLieu.toLowerCase().includes(kl)
      );
      if (trung) ra.push({ khoa: k, maIssue: trung.id });
    }
    return ra;
  } catch {
    return [];
  }
}

/** Dự phòng khi cổng cũ chưa trả `cham_ngay_so_muc_tieu`: COD dự báo − COD mục tiêu; thiếu/hỏng ngày → null (không thay 0) */
function soNgayGiua(a: string, b: string): number | null {
  const ta = Date.parse(a + "T00:00:00Z");
  const tb = Date.parse(b + "T00:00:00Z");
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return null;
  return Math.round((ta - tb) / 86400000);
}

const LY_DO = "Bảng điều hành của Main: bày tình hình dự án cho lãnh đạo (demo màn bdh)";

/** Số từ cổng — thiếu/không phải số thì null (hiện "—"), tuyệt đối không thay 0 */
function soHoacNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * Câu "hoàn thành X% (nhãn) · Y% (nhãn)" — số + nhãn đúng như cổng
 * `tiendo.tom_tat_du_an` trả (25/09 "hai số cho hai câu hỏi"). Cổng chưa trả
 * nhãn thì ghi rõ "tới mốc COD" cho `pctTotal` — không để số % trần.
 */
export function cauPctTong(so: {
  pctTong: number;
  nhanPctTong: string;
  pctToanBo: number | null;
  nhanPctToanBo: string;
}): string {
  const vn = (x: number): string => String(x).replace(".", ",");
  const nhan1 = so.nhanPctTong !== "" ? so.nhanPctTong : "tới mốc COD";
  let cau = `hoàn thành ${vn(so.pctTong)}% (${nhan1})`;
  if (so.pctToanBo !== null) {
    cau += ` · ${vn(so.pctToanBo)}% (${so.nhanPctToanBo !== "" ? so.nhanPctToanBo : "toàn bộ việc"})`;
  }
  return cau;
}

/**
 * Nhãn "N việc găng tới COD · M việc găng dự báo chậm so với Baseline" — một chỗ, màn và câu tóm tắt cùng dùng.
 * Luật 36: agent Tiến độ đếm «đang trễ» = ngày xong dự báo muộn hơn ngày xong theo Baseline ĐÃ DUYỆT
 * (`5-Agent-tien-do/src/lib/du-bao/gang-tre.ts` dsViecGangDangTre); dự án chưa duyệt Baseline thì nó tạm so với bảng đang
 * lập — phải nói thẳng tên đó, không gọi là Baseline. `lechNgaySoBaseline === null` = chưa có Baseline đã duyệt.
 */
export function nhanViecGang(so: {
  soViecGang: number | null;
  soViecGangDangTre: number | null;
  lechNgaySoBaseline: number | null;
}): string {
  if (so.soViecGang === null) return "chưa lấy được số việc găng tới COD";
  const he = so.lechNgaySoBaseline === null ? TEN_DANG_LAP : TEN_HE.baseline;
  return (
    `${so.soViecGang} việc găng tới COD · ` +
    (so.soViecGangDangTre === null
      ? "chưa lấy được số việc găng dự báo chậm"
      : `${so.soViecGangDangTre} việc găng dự báo chậm so với ${he}`)
  );
}

async function tomTatMotDuAn(d: DuAnDanNgang, ctx: NguCanhGom): Promise<TheDuAn> {
  const kq = await hoiTienDo("tiendo.tom_tat_du_an", { ma_du_an: d.ma }, LY_DO, undefined, ctx.tc);
  if (!kq.ok) {
    return { ...d, so: null, loi: cauChuaCoSo("Agent tiến độ", kq) };
  }
  ghiNhan(ctx, `Agent Tiến độ — tóm tắt dự án ${d.ten}`, kq);
  const dl = kq.du_lieu as Record<string, unknown>;
  const codTinhToan = String(dl.cod ?? "");
  const codMucTieu = String(dl.cod_muc_tieu ?? "");
  return {
    ...d,
    so: {
      pctTong: Number(dl.pctTotal) || 0,
      // 25/09: HAI số % kèm NHÃN của chính cổng tiến độ — Main chỉ ánh xạ
      nhanPctTong: typeof dl.nhanPctTotal === "string" ? dl.nhanPctTotal : "",
      pctToanBo: soHoacNull(dl.pctToanBoViec),
      nhanPctToanBo: typeof dl.nhanPctToanBoViec === "string" ? dl.nhanPctToanBoViec : "",
      codTinhToan,
      codMucTieu,
      // Luật 35 + 36 (14/10/2026): đọc số ngày agent Tiến độ đã tính cho CẢ HAI hệ (phân vai 06/09). Cổng cũ chưa trả
      // `cham_ngay_so_muc_tieu` thì mới tự trừ COD dự báo − COD mục tiêu làm dự phòng.
      lechNgay:
        soHoacNull(dl.cham_ngay_so_muc_tieu) ??
        (codTinhToan && codMucTieu ? soNgayGiua(codTinhToan, codMucTieu) : null),
      lechNgaySoBaseline: soHoacNull(dl.cham_ngay_so_baseline),
      // 24/09: đọc trường MỚI của cổng — găng TỚI MỐC COD + đang trễ theo dự
      // báo. Main chỉ hiển thị, không tính (phân vai 06/09). Bỏ `criticalCount`
      // (găng tới việc cuối cả bảng) và `lateVsBaseline` (kế hoạch dời so
      // Baseline, không phải trễ thi công).
      soViecGang: soHoacNull(dl.so_viec_gang),
      soViecGangDangTre: soHoacNull(dl.so_viec_gang_dang_tre),
      tomTat: String(dl.tom_tat ?? ""),
    },
    loi: null,
  };
}

async function chiTietMotDuAn(ma: string, ctx: NguCanhGom): Promise<ChiTietDuAn> {
  const kq = await hoiTienDo("tiendo.duong_gang", { ma_du_an: ma }, LY_DO, undefined, ctx.tc);
  ghiNhan(ctx, "Agent Tiến độ — đường găng", kq);
  if (!kq.ok) {
    return {
      codDuBao: "",
      codMucTieu: "",
      lechNgay: null,
      codBaseline: null,
      lechNgaySoBaseline: null,
      tachChamCod: null,
      hangMucTuLam: [],
      mocSoSanh: "",
      chuoiGang: [],
      loi: cauChuaCoSo("Agent tiến độ", kq),
    };
  }
  const dl = kq.du_lieu as Record<string, unknown>;
  const chuoi = Array.isArray(dl.chuoi_gang) ? (dl.chuoi_gang as Record<string, unknown>[]) : [];
  return {
    codDuBao: String(dl.cod_du_bao ?? ""),
    codMucTieu: String(dl.cod_muc_tieu ?? ""),
    lechNgay: soHoacNull(dl.lech_ngay_so_muc_tieu),
    codBaseline: typeof dl.cod_baseline === "string" ? dl.cod_baseline : null,
    lechNgaySoBaseline: typeof dl.lech_ngay_so_baseline === "number" ? dl.lech_ngay_so_baseline : null,
    tachChamCod: typeof dl.tach_cham_cod === "string" ? dl.tach_cham_cod : null,
    // Cổng đã xếp tự làm COD chậm NHIỀU NHẤT LÊN ĐẦU — Main giữ nguyên thứ tự (phân vai 06/09)
    hangMucTuLam: (Array.isArray(dl.hang_muc_tu_lam_cod_cham) ? (dl.hang_muc_tu_lam_cod_cham as Record<string, unknown>[]) : []).map((h) => ({
      wbs: String(h.wbs ?? ""),
      ten: String(h.ten ?? ""),
      duBaoXong: typeof h.du_bao_xong === "string" ? h.du_bao_xong : null,
      baselineXong: typeof h.baseline_xong === "string" ? h.baseline_xong : null,
      tuLamCodCham: typeof h.tu_lam_cod_cham_ngay === "number" ? h.tu_lam_cod_cham_ngay : null,
      trongDoThoiTiet: typeof h.trong_do_thoi_tiet_ngay === "number" ? h.trong_do_thoi_tiet_ngay : null,
      soViecGang: Number(h.so_viec_gang) || 0,
    })),
    mocSoSanh: String(dl.moc_so_sanh ?? ""),
    // Cổng đã xếp CHẬM NHẤT LÊN ĐẦU (demo chốt) — Main giữ nguyên thứ tự, không
    // sắp lại, vì sắp lại là tự tính (phân vai 06/09).
    chuoiGang: chuoi.map((c) => ({
      wbs: String(c.wbs ?? ""),
      ten: String(c.ten ?? ""),
      batDau: String(c.batDau ?? ""),
      ketThuc: String(c.ketThuc ?? ""),
      pct: Number(c.pct) || 0,
      // null = cổng chưa tính được (đầu việc không tra ra, hoặc chưa có %thực
      // tế). Để null rồi hiện "—", tuyệt đối không thay bằng 0 cho đẹp bảng.
      pctKeHoach: c.pct_ke_hoach === null || c.pct_ke_hoach === undefined ? null : Number(c.pct_ke_hoach),
      soNgayTre: c.so_ngay_tre === null || c.so_ngay_tre === undefined ? null : Number(c.so_ngay_tre),
    })),
    loi: null,
  };
}

async function sCurveMotDuAn(ma: string, ctx: NguCanhGom): Promise<KhoiSCurve> {
  const kq = await hoiTienDo("tiendo.s_curve", { ma_du_an: ma }, LY_DO, undefined, ctx.tc);
  if (!kq.ok) return { diem: [], loi: cauChuaCoSo("Agent tiến độ", kq) };
  ghiNhan(ctx, "Agent Tiến độ — đường cong S", kq);
  const dl = kq.du_lieu as {
    diem?: SCurvePoint[];
    ngayCatDuLieu?: string | null;
    ghiChu?: string[];
    dat100?: SCurveDayDu["dat100"];
    cauTapViec?: string;
    viecKhongNoi?: SCurveDayDu["viecKhongNoi"];
  };
  const diem = Array.isArray(dl.diem) ? dl.diem : [];
  return diem.length > 0
    ? {
        diem,
        // Cổng cũ chưa có trường → undefined, màn không hiện dòng đó (không đoán)
        ngayCatDuLieu: dl.ngayCatDuLieu,
        ghiChu: Array.isArray(dl.ghiChu) ? dl.ghiChu : [],
        dat100: dl.dat100 ?? null,
        // Cổng cũ chưa có trường → undefined, màn không hiện (không đoán)
        cauTapViec: typeof dl.cauTapViec === "string" && dl.cauTapViec !== "" ? dl.cauTapViec : undefined,
        viecKhongNoi: Array.isArray(dl.viecKhongNoi) ? dl.viecKhongNoi : undefined,
        loi: null,
      }
    : { diem: [], loi: "Cổng trả 0 điểm." };
}

async function soTuanMotDuAn(ma: string, ctx: NguCanhGom): Promise<KhoiSoTuan> {
  const kq = await hoiTienDo("tiendo.so_tuan", { ma_du_an: ma }, LY_DO, undefined, ctx.tc);
  if (!kq.ok) return { tuanTruoc: "", tuanNay: "", thuocDo: [], loi: cauChuaCoSo("Agent tiến độ", kq) };
  ghiNhan(ctx, "Agent Tiến độ — so tuần này với tuần trước", kq);
  const dl = kq.du_lieu as Record<string, unknown>;
  const td = Array.isArray(dl.thuoc_do) ? (dl.thuoc_do as ThuocDoTuan[]) : [];
  return {
    tuanTruoc: String(dl.tuan_truoc ?? ""),
    tuanNay: String(dl.tuan_nay ?? ""),
    thuocDo: td,
    loi: null,
  };
}

/** Nhân công · máy chính bình quân theo thầu phụ trong hai tuần ISO (thứ Hai → Chủ nhật), hỏi song song */
async function nguonLucHaiTuan(ma: string, tuanTruoc: string, tuanNay: string, ctx: NguCanhGom): Promise<NguonLucHaiTuan> {
  const dT = thuHaiTuanIso(tuanTruoc);
  const dN = thuHaiTuanIso(tuanNay);
  if (!dT || !dN) return { truoc: null, nay: null, loi: "Không đọc được hai tuần cần so." };
  const mot = async (tu: string) => {
    const kq = await hoiTienDo("tiendo.nguon_luc_huy_dong", { ma_du_an: ma, tu_ngay: tu, den_ngay: congNgay(tu, 6) }, LY_DO, undefined, ctx.tc);
    if (!kq.ok) return { ds: null, loi: cauChuaCoSo("Agent tiến độ", kq) };
    ghiNhan(ctx, `Agent Tiến độ — nguồn lực huy động tuần từ ${tu}`, kq);
    const dl = kq.du_lieu as { dong?: Record<string, unknown>[] };
    const so = (v: unknown) => (typeof v === "number" ? v : null);
    const ds: DongNguonLucTuan[] = (Array.isArray(dl.dong) ? dl.dong : []).map((x) => ({
      thauPhu: String(x.thau_phu ?? "thầu phụ chưa rõ tên"),
      nhanCong: so(x.nhan_cong_binh_quan),
      may: so(x.may_chinh_binh_quan),
    }));
    return { ds, loi: null as string | null };
  };
  const [a, b] = await Promise.all([mot(dT), mot(dN)]);
  return { truoc: a.ds, nay: b.ds, loi: a.loi ?? b.loi };
}

/** Hồ sơ pháp lý thiếu — gửi MÃ NGẮN dự án (24/09; hoiAgent cũng chuẩn hoá lại lần nữa) */
async function phapLyMotDuAn(tenNgan: string, ctx: NguCanhGom): Promise<KhoiPhapLy> {
  const kq = await hoiAgent("phaply", "phaply.ho_so_thieu", LY_DO, {
    ...ctx.tc,
    tham_so: { ma_du_an: tenNgan },
  });
  if (!kq.ok) return { tongPhaiCo: 0, soThieu: 0, dong: [], loi: cauChuaCoSo("Agent Pháp lý", kq) };
  ghiNhan(ctx, "Agent Pháp lý — hồ sơ còn thiếu", kq);
  const dl = kq.du_lieu as Record<string, unknown>;
  const mang = Array.isArray(dl.ho_so_thieu) ? (dl.ho_so_thieu as Record<string, unknown>[]) : [];
  return {
    tongPhaiCo: Number(dl.tong_ho_so_phai_co) || 0,
    soThieu: Number(dl.so_thieu) || 0,
    dong: mang.map((h) => ({
      maHoSo: String(h.ma_ho_so ?? ""),
      ten: String(h.ten ?? ""),
      coQuan: String(h.co_quan_dang_giu ?? ""),
      quaHanNgay: typeof h.so_ngay_qua_han === "number" ? h.so_ngay_qua_han : null,
    })),
    loi: null,
  };
}

async function tacMotDuAn(ma: string, ctx: NguCanhGom): Promise<KhoiTac> {
  // 04/10 tối (Mr. Đại duyệt dọn vết Base): THÔI hỏi base.quy_trinh_dang_tac — agent Công việc không có luồng đề xuất/duyệt nên
  // lượt nào cũng trả "chưa có dữ liệu" (đo 04/10: 235 lượt từ Main, 9 lượt chờ quá 10 giây).
  const [qh, pg] = await Promise.all([
    hoiAgent("base", "base.viec_qua_han", LY_DO, { ...ctx.tc, tham_so: { ma_du_an: ma } }),
    hoiAgent("hopdong", "hopdong.phieu_gia_dang_cho", LY_DO, { ...ctx.tc, tham_so: { ma_du_an: ma } }),
  ]);
  ghiNhan(ctx, "Agent Công việc — việc quá hạn", qh);
  ghiNhan(ctx, "Agent Hợp đồng — phiếu giá đang chờ", pg);
  // Phiếu giá tắc (demo khối ⑥) — KHONG_CO_DU_LIEU là câu trả lời tốt, giữ nguyên văn
  let phieuGia: string;
  if (pg.ok) {
    const d = pg.du_lieu as Record<string, unknown>;
    const mang = Array.isArray(d.phieu_gia) ? (d.phieu_gia as Record<string, unknown>[]) : [];
    phieuGia =
      mang.length > 0
        ? `${mang.length} phiếu giá đang chờ` +
          (() => {
            // Chỉ nói phần có thật — không in «?» thay cho tên hay số ngày chưa biết
            const ten = mang[0] ? String(mang[0].ten ?? mang[0].ma ?? "") : "";
            const ngay = mang[0] ? mang[0].cho_ngay ?? mang[0].so_ngay_cho : null;
            const coNgay = typeof ngay === "number" || (typeof ngay === "string" && ngay !== "");
            if (!ten && !coNgay) return "";
            return ` — lâu nhất${ten ? `: ${ten}` : ""}${coNgay ? ` (đã chờ ${String(ngay)} ngày)` : ""}`;
          })()
        : "Có trả lời nhưng 0 phiếu chờ.";
  } else {
    phieuGia = pg.thong_diep;
  }
  const quyTrinh = "Agent Công việc chưa có luồng đề xuất / duyệt — chưa theo dõi được hồ sơ đang tắc ở bàn ai.";
  if (!qh.ok) return { soQuaHan: 0, dong: [], quyTrinh, phieuGia, loi: cauChuaCoSo("Agent Công việc", qh) };
  const dl = qh.du_lieu as Record<string, unknown>;
  const mang = Array.isArray(dl.viec) ? (dl.viec as Record<string, unknown>[]) : [];
  return {
    soQuaHan: Number(dl.so_viec_qua_han) || 0,
    dong: mang.slice(0, 6).map((v) => ({
      ten: String(v.ten ?? ""),
      // 04/10: "base" = agent Công việc — nguoi_phu_trach là mã người/đơn vị (vd p-dtpc); có ten_nguoi_phu_trach thì hiện tên (luật 30)
      nguoiPhuTrach: String(v.ten_nguoi_phu_trach ?? v.nguoi_phu_trach ?? "") || "chưa giao ai",
      quaHanNgay: Number(v.qua_han_ngay) || 0,
    })),
    quyTrinh,
    phieuGia,
    loi: null,
  };
}

/**
 * Gom cả màn. Hỏi song song từng dự án — một dự án hỏng không kéo cả dàn.
 * `hoiTienDo` không ném ngoại lệ nên không cần try/catch quanh từng lời gọi.
 */
export async function gomBangDieuHanh(duAnChon?: string, lamMoi = false): Promise<DuLieuBdh> {
  const ch = docCauHinhBdh();
  const ctx = taoNguCanh(lamMoi);
  // ⭐ 11/09 đợt 3: không có ?du_an thì theo DỰ ÁN ĐANG CHỌN ở top menu (cookie), không mặc định dự án đầu
  const { resolveProjectId } = require("@/lib/projects") as typeof import("@/lib/projects");
  const dangChonTopMenu = resolveProjectId();
  const coTrongDan = (ma: string) => ch.duAn.some((d) => d.ma === ma);
  // ⭐ 13/09: KHÔNG rơi ngầm về dự án đầu dàn. Người chọn dự án nào mà dàn ngang
  // không có dự án đó thì nói thẳng, để trống, chứ không bày số của dự án khác.
  let canhBaoLechDuAn = "";
  let dangChon = "";
  if (duAnChon && coTrongDan(duAnChon)) {
    dangChon = duAnChon;
  } else if (coTrongDan(dangChonTopMenu)) {
    dangChon = dangChonTopMenu;
  } else {
    const tenDangChon =
      (() => {
        try {
          const { getProject } = require("@/lib/projects") as typeof import("@/lib/projects");
          return getProject(dangChonTopMenu)?.name ?? dangChonTopMenu;
        } catch {
          return dangChonTopMenu;
        }
      })();
    canhBaoLechDuAn =
      `Dự án đang chọn ở thanh trên là «${tenDangChon}», nhưng Bảng điều hành chưa khai dự án này ` +
      `(dàn ngang đang có: ${ch.duAn.map((d) => d.ten || d.ma).join(" · ") || "chưa khai dự án nào"}). ` +
      `Vào Cài đặt → 📁 Quản lý dự án để thêm, hoặc bấm một dự án trên dàn ngang. ` +
      `Màn này KHÔNG hiện số của dự án khác thay cho dự án anh đang chọn.`;
  }

  // 24/09: pháp lý tra theo MÃ NGẮN (HV · N3A) — trước gửi nhãn "HV · Điện gió Hướng Việt…"
  const tenNgan = maNganDuAn(dangChon) ?? ch.duAn.find((d) => d.ma === dangChon)?.ten ?? dangChon;
  const [duAn, chiTiet, sCurve, soTuan, phapLy, tac, tien] = await Promise.all([
    // ⭐ QS-073: song song có giới hạn, dự án đang chọn hỏi TRƯỚC (số của nó cần nhất)
    songSongGioiHan(
      [...ch.duAn.filter((d) => d.ma === dangChon), ...ch.duAn.filter((d) => d.ma !== dangChon)],
      SO_DU_AN_CUNG_LUC,
      (d) => tomTatMotDuAn(d, ctx),
    ).then((ds) => ch.duAn.map((d) => ds.find((x) => x.ma === d.ma)!)),
    dangChon ? chiTietMotDuAn(dangChon, ctx) : Promise.resolve(null),
    dangChon ? sCurveMotDuAn(dangChon, ctx) : Promise.resolve(null),
    dangChon ? soTuanMotDuAn(dangChon, ctx) : Promise.resolve(null),
    dangChon ? phapLyMotDuAn(tenNgan, ctx) : Promise.resolve(null),
    dangChon ? tacMotDuAn(dangChon, ctx) : Promise.resolve(null),
    dangChon ? tienMotDuAn(dangChon, ctx) : Promise.resolve(null),
  ]);

  // Dò chống trùng SAU khi có hai khối kia — cần chính danh sách dòng của chúng
  // làm khoá. Một lượt gom issue nữa, chạy sau nên không kéo dài các khối trên.
  const khoa: string[] = [
    ...(phapLy?.dong ?? []).map((h) => h.maHoSo),
    ...(tac?.dong ?? []).map((v) => v.ten),
  ];
  const daThanhIssue = dangChon ? await doDaThanhIssue(dangChon, khoa, ctx.tc) : [];
  // Nguồn lực huy động hai kỳ 7 ngày = đúng hai tuần mà tiendo.so_tuan đang so (cần biết tuần rồi mới hỏi được)
  const nguonLuc = dangChon && soTuan && soTuan.loi === null ? await nguonLucHaiTuan(dangChon, soTuan.tuanTruoc, soTuan.tuanNay, ctx) : null;

  return {
    duAn,
    dangChon,
    canhBaoLechDuAn,
    chiTiet,
    sCurve,
    soTuan,
    nguonLuc,
    phapLy,
    tac,
    tien,
    daThanhIssue,
    lucSo: ctx.lucCuNhat,
    banCu: ctx.banCu,
  };
}
