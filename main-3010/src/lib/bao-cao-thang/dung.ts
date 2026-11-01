// ============================================================
// DỰNG BẢN NHÁP BÁO CÁO THÁNG — ĐI HỎI RỒI ĐIỀN  (server-only)
//
// PLAN-MAIN-AGENT mục 2 (ánh xạ nguồn) · mục 7 ("Ngày 1 hằng tháng: dựng bản
// nháp báo cáo tháng") · mục 11 (bốn công cụ gọi nhiều nhất).
//
// Main KHÔNG GIỮ DỮ LIỆU NGHIỆP VỤ — mọi số trong báo cáo này đều đi hỏi qua
// đúng một cửa `hoiAgent`. File này không có một dòng SQL nghiệp vụ nào, và
// cũng không được có: thấy cần số thì hỏi, không dựng bảng riêng.
//
// Hỏi không được thì ô ghi "chưa có số liệu" KÈM LÝ DO NGUYÊN VĂN của cổng
// MCP — nghiệm thu bài 8: "Tắt Agent Hợp đồng rồi dựng báo cáo tháng → vẫn ra
// báo cáo, mục IV ghi rõ chưa lấy được dữ liệu từ Agent Hợp đồng".
// ============================================================

import { hoiAgent } from "@/lib/nguon/hoi-agent";
import { gomIssue } from "@/lib/issue-main/gom";
import type { KhuonTra, NguonMcp } from "@/lib/mcp/khuon";
import { docDanhBaAgent } from "@/lib/cai-dat-base";
import { cacAgentDangBat, lyDoKhongGoiDuoc } from "@/lib/danh-ba-agent";
import { listProjects } from "@/lib/projects";
import {
  anDuAnImLang,
  cacLuotHoiCanThiet,
  CC_VAN_DE_NOI_BAT,
  dienBaoCao,
  dungKhungBaoCao,
  laLuotMoiChuaMo,
  moiBang,
  type AgentKhongHoiDuoc,
  type AnhXaNguon,
  type BaoCaoThang,
  type DuAnTrongBaoCao,
  type KetQuaLuot,
  type KyBaoCao,
  MA_AGENT,
} from "./model";
import { laAgentNghiepVu } from "@/lib/chung/ma-agent";
import { chuyenKhuon } from "./khuon-agent";
import { docCaiDatDau } from "./kho";
import { gomVanDeChoBaoCaoThang, type KetQuaGomVanDe } from "@/lib/bao-cao-sang/dung";
import { soAnhHuong, type VanDeSang } from "@/lib/bao-cao-sang/luat-cod";
import { rutGonTen } from "@/lib/chung/ma-kem-ten";
import { fmtSo } from "@/lib/format";
import { gioVn } from "@/lib/gio-vn";

// ─────────────────────────────────────────────────────────────
// Kỳ báo cáo
// ─────────────────────────────────────────────────────────────

function hai(n: number): string {
  return String(n).padStart(2, "0");
}

/** Kỳ tháng theo quy ước ngày dd/mm/yyyy của QUY-UOC-BIEU-MAU mục 4 */
export function kyThang(thang: number, nam: number): KyBaoCao {
  const cuoi = new Date(Date.UTC(nam, thang, 0)).getUTCDate();
  return {
    thang,
    nam,
    tuNgay: `01/${hai(thang)}/${nam}`,
    denNgay: `${hai(cuoi)}/${hai(thang)}/${nam}`,
  };
}

/** Kỳ của tháng LIỀN TRƯỚC — kịch bản ngày 1 hằng tháng dựng báo cáo tháng vừa xong */
export function kyThangTruoc(bay = new Date()): KyBaoCao {
  // Luật 44: tháng/năm tính theo giờ VN (+7), không theo múi giờ máy (kiểm độc lập 27/10 BD-5)
  const [nam, thang] = gioVn(bay).ngay.split("-").map(Number) as [number, number];
  return thang === 1 ? kyThang(12, nam - 1) : kyThang(thang - 1, nam);
}

// ─────────────────────────────────────────────────────────────
// Danh sách dự án — `core.du_an`
// ─────────────────────────────────────────────────────────────

/**
 * Quyết định 1 của Mr. Đại 30/08: báo cáo tháng GỘP CẢ 3 DỰ ÁN vào một file,
 * nên lấy toàn bộ dự án chưa lưu trữ chứ không lấy dự án đang chọn trên thanh.
 */
export function danhSachDuAn(): DuAnTrongBaoCao[] {
  try {
    return listProjects(false).map((p) => ({
      ma: p.id,
      ten: p.name,
      // 13/10: bốn ô Bảng 3 — khai ở Cài đặt → Dự án
      congSuat: p.congSuat,
      loaiHinh: p.loaiHinh,
      diaDiem: p.diaDiem,
      giaiDoan: p.giaiDoan,
    }));
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
// Bóc `KhuonTra` thành bản ghi
// ─────────────────────────────────────────────────────────────

function laBanGhi(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Lấy mảng bản ghi ra khỏi `du_lieu`. Hợp đồng kết nối chốt KHUÔN TRẢ chứ chưa
 * chốt hình dạng `du_lieu` của từng công cụ, nên chấp nhận ba dạng hay gặp:
 * mảng · vật thể bọc một mảng · một vật thể đơn. Không nhận ra dạng nào thì
 * trả `null` để ô thành "chưa có số liệu" — KHÔNG cố nặn ra bản ghi.
 */
export function bocBanGhi(duLieu: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(duLieu)) {
    const chi = duLieu.filter(laBanGhi);
    return chi.length === duLieu.length ? chi : null;
  }
  if (laBanGhi(duLieu)) {
    for (const [, v] of Object.entries(duLieu)) {
      if (Array.isArray(v) && v.every(laBanGhi)) return v as Record<string, unknown>[];
    }
    return [duLieu];
  }
  return null;
}

/** Nối `KhuonTra.nguon` thành một câu dẫn nguồn đọc được */
export function noiNguon(nguon: NguonMcp[]): string {
  return nguon
    .map((n) =>
      [n.loai, n.ma, n.file_goc, n.vi_tri].filter((x) => typeof x === "string" && x !== "").join(" · "),
    )
    .filter((s) => s !== "")
    .join(" | ");
}

/** Đổi câu trả lời cổng MCP thành kết quả một lượt để `dienBaoCao` dùng */
export function doiThanhKetQua(anhXa: AnhXaNguon, tra: KhuonTra): KetQuaLuot {
  // ⭐ 18/10/2026 (agent Hợp đồng bcdf19c): cam_ket_nha_thau theo dự án — hợp đồng ĐẦU không có số thì câu trả lời là lỗi, nhưng
  // mảng `hop_dong[]` (MỌI hợp đồng) nằm cạnh `thong_diep`: vẫn in đủ các hợp đồng, nguồn ghi rõ là lượt đó.
  const moiHopDong = (tra as { hop_dong?: unknown }).hop_dong;
  if (!tra.ok && anhXa.congCu === "hopdong.cam_ket_nha_thau" && Array.isArray(moiHopDong) && moiHopDong.length > 0) {
    const banGhi = chuyenKhuon(anhXa.congCu, { hop_dong: moiHopDong }, anhXa.thamSo) ?? [];
    const ma = moiHopDong
      .map((x) => (x && typeof x === "object" ? String((x as Record<string, unknown>).ma_hop_dong ?? "") : ""))
      .filter((m) => m !== "");
    return {
      anhXa,
      ok: true,
      banGhi,
      moTaNguon: `agent Hợp đồng · hopdong.cam_ket_nha_thau theo dự án · hợp đồng ${ma.join(", ")} (hợp đồng đầu: ${tra.thong_diep})`,
      thoiDiem: new Date().toISOString(),
    };
  }
  if (!tra.ok) {
    return { anhXa, ok: false, maLoi: tra.ma_loi, lyDo: `${anhXa.maAgent} · ${anhXa.congCu}: ${tra.thong_diep}` };
  }
  const nguon = noiNguon(tra.nguon);
  if (nguon === "") {
    // Hợp đồng kết nối mục 3.1: không dẫn được nguồn thì không được trả lời.
    // Cổng lỡ trả về khuôn thiếu nguồn thì Main từ chối dùng số đó.
    return {
      anhXa,
      ok: false,
      lyDo: `${anhXa.maAgent} · ${anhXa.congCu}: có trả lời nhưng KHÔNG dẫn được nguồn — theo luật A.4 điều 1 thì không được ghi số.`,
    };
  }
  // 13/10: công cụ nào đã có hàm chuyển khuôn riêng (khuon-agent.ts) thì dùng hàm đó — không dò tên trường theo đoán
  // 18/10/2026: kèm `canh_bao` — bảng 8 đưa câu cảnh báo của từng hợp đồng (vênh giá trị…) vào cột Ghi chú
  const banGhi = chuyenKhuon(anhXa.congCu, tra.du_lieu, anhXa.thamSo, Array.isArray(tra.canh_bao) ? tra.canh_bao : []) ?? bocBanGhi(tra.du_lieu);
  if (banGhi === null) {
    return {
      anhXa,
      ok: false,
      lyDo: `${anhXa.maAgent} · ${anhXa.congCu}: khuôn dữ liệu trả về không đọc được thành bảng.`,
    };
  }
  return { anhXa, ok: true, banGhi, moTaNguon: nguon, thoiDiem: tra.thoi_diem_tra_loi };
}

// ─────────────────────────────────────────────────────────────
// Đi hỏi
// ─────────────────────────────────────────────────────────────

const LY_DO_GOI =
  "dựng bản nháp báo cáo tháng của BQLDA (PLAN-MAIN-AGENT mục 2 — 6 mục, 11 bảng)";

/**
 * Nguồn `main.*` và `core.*` là thứ Main tự biết (kỳ báo cáo, danh sách dự án,
 * số thứ tự) — không đi hỏi ai. `core.issue` thì đúng ra là sổ chung đọc thẳng
 * bằng SQL, nhưng kho chung PostgreSQL chưa dựng ở bản này nên vẫn phải hỏi
 * agent chủ; ghi rõ ở đây để sau này nối kho chung thì biết chỗ mà đổi.
 */
function khongCanHoi(a: AnhXaNguon): boolean {
  if (a.congCu === CC_VAN_DE_NOI_BAT) return false;
  return (
    a.congCu.startsWith("main.") ||
    a.congCu.startsWith("cai_dat.") ||
    a.congCu.startsWith("core.du_an")
  );
}

/**
 * ⭐ `core.issue` KHÔNG đi hỏi qua MCP.
 *
 * Khung khai nó là `main · core.issue`, tức Main hỏi chính mình — đó là vòng
 * gọi A→A, bị chặn ngay ở ma trận "Ai được gọi ai" (HOP-DONG-KET-NOI 6.2).
 * Kết quả: hai bảng issue của báo cáo tháng trống mà lý do lại là một câu về
 * ma trận, chẳng liên quan gì tới nghiệp vụ. Đo thật 05/09.
 *
 * Sổ Issue là SỔ CHUNG. Main đã có sẵn lớp `gomIssue()` đi hỏi từng agent
 * đang bật rồi gộp lại (dùng cho màn Cảnh báo) — dùng lại đúng lớp đó, đừng dựng
 * đường thứ hai. Khi kho chung PostgreSQL dựng xong thì đổi một hàm này sang
 * đọc thẳng `core.issue`, phần còn lại giữ nguyên.
 */
/** Ba mức của sổ Issue sang chữ đọc được — dùng chung cho cột Mức độ và Tình trạng */
function nhanMucDo(m: string): string {
  return m === "do" ? "🔴 nghiêm trọng" : m === "xanh" ? "🟢 nhẹ" : "🟡 đáng chú ý";
}

async function layIssueTaiCho(a: AnhXaNguon): Promise<KetQuaLuot> {
  const maDuAn =
    typeof a.thamSo.ma_du_an === "string"
      ? a.thamSo.ma_du_an
      : typeof a.thamSo.du_an === "string"
        ? a.thamSo.du_an
        : undefined;

  const { issue, chuaGom } = await gomIssue(maDuAn);
  if (issue.length === 0) {
    const vi = chuaGom.map((c) => `${c.ten}: ${c.lyDo}`).join(" · ");
    return {
      anhXa: a,
      ok: false,
      lyDo:
        `sổ Issue chung: không có issue nào đang mở cho dự án này` +
        (vi ? ` — ${vi}` : "."),
    };
  }

  // Mỗi issue thành MỘT bản ghi, khai đủ mọi tên trường mà hai bảng issue của
  // báo cáo tháng có thể đọc (tom_tat · tinh_trang · ghi_chu · vuong_mac · noi_dung).
  const banGhi = issue.map((i) => ({
    du_an: maDuAn ?? "",
    tom_tat: i.tieuDe,
    vuong_mac: i.tieuDe,
    noi_dung: i.moTa,
    ghi_chu: i.moTa,
    tinh_trang: `${nhanMucDo(i.mucDo)} · ${i.tenAgentChu}`,
    // Bảng 10 đọc khoá `muc_do` — thiếu nó thì cột Mức độ trống dù đã gom được issue
    muc_do: nhanMucDo(i.mucDo),
    ma_issue: i.id,
    // ⭐ 05/10 — agent chủ của issue: model.ts ghi lên ô (`agentGoc`) để Main lọc agent mật theo người xem
    agent_chu: i.agentChu,
    so_ngay_anh_huong: i.soNgayAnhHuong,
    nguon_du_lieu: i.nguonDuLieu,
  }));

  // Nguồn dẫn: gộp nguồn THẬT của từng issue, không bịa một câu chung chung.
  const nguon = Array.from(new Set(issue.map((i) => i.nguonDuLieu).filter((x) => x.trim() !== "")));
  if (nguon.length === 0) {
    return {
      anhXa: a,
      ok: false,
      lyDo:
        "sổ Issue chung: gom được issue nhưng KHÔNG issue nào dẫn được nguồn — theo luật A.4 điều 1 thì không được ghi số.",
    };
  }

  return {
    anhXa: a,
    ok: true,
    banGhi,
    moTaNguon: `sổ Issue chung (${issue.length} thẻ) · ${nguon.slice(0, 3).join(" | ")}`,
    thoiDiem: new Date().toISOString(),
  };
}

/** Mr. Đại chốt 13/10/2026: Bảng 10 giữ tối đa 10 vấn đề nặng nhất MỖI DỰ ÁN, còn lại một dòng đếm */
export const TRAN_VAN_DE_MOI_DU_AN = 10;

/** Mức độ bằng CHỮ — bản Word không in được 🔴🟡 (ra hình xám), và màu chỉ để nhấn chứ không mang nghĩa một mình */
function chuMucDo(m: VanDeSang["mucDo"]): string {
  return m === "do" ? "Nghiêm trọng" : m === "xanh" ? "Nhẹ" : "Đáng chú ý";
}

/** Tên một vấn đề: mã WBS kèm tên việc (luật 30) rồi tới tiêu đề */
function tenVanDe(v: VanDeSang): string {
  if (!v.wbs || v.tieuDe.includes(v.wbs)) return v.tieuDe;
  const ten = v.tenWbs ? rutGonTen(v.tenWbs) : "";
  // Tiêu đề đã mở đầu bằng chính tên việc thì chỉ thêm mã — đo 13/10: "6.1.4 Cung cấp Hub… · ⛓ Cung cấp Hub…" lặp hai lần
  const daCoTen = ten !== "" && v.tieuDe.toLowerCase().includes(ten.toLowerCase().slice(0, 18));
  return `${v.wbs}${ten && !daCoTen ? ` ${ten}` : ""} · ${v.tieuDe}`;
}

/**
 * BẢNG 10 cho MỘT dự án, từ kết quả gom của báo cáo sáng (cùng luật "làm chậm COD": trên đường găng · làm COD lùi ·
 * vượt mốc bắt buộc; đã gộp trùng, nặng trước). Hàm THUẦN — test được không cần agent.
 */
export function ketQuaVanDeNoiBat(a: AnhXaNguon, gom: KetQuaGomVanDe): KetQuaLuot {
  const ma = typeof a.thamSo.du_an === "string" ? a.thamSo.du_an : "";
  const soMo = gom.soTheMo[ma] ?? 0;
  if (soMo === 0) {
    // Không thẻ nào: do agent hỏng (thiếu sót không gắn dự án) hay do dự án chưa có gì?
    const hong = gom.thieuSot.filter((t) => !t.maDuAn && t.ten !== "Luật động");
    return hong.length > 0
      ? { anhXa: a, ok: false, lyDo: `Chưa gom được vấn đề: ${hong.map((t) => `${t.ten} — ${t.lyDo}`).join(" · ")}` }
      : { anhXa: a, ok: false, maLoi: "KHONG_CO_DU_LIEU", lyDo: "Không có vấn đề nào đang mở cho dự án này." };
  }
  const cua = gom.vanDe.filter((v) => v.maDuAn === ma);
  const top = cua.slice(0, TRAN_VAN_DE_MOI_DU_AN);
  const banGhi: Record<string, unknown>[] = top.map((v) => ({
    van_de: tenVanDe(v),
    muc_do: chuMucDo(v.mucDo),
    so_ngay_anh_huong: v.soNgayLuiCod,
    anh_huong: soAnhHuong(v),
    nguon_bao: [v.tenAgent, ...v.kem.map((k) => k.tenAgent)].filter((x, i, ds) => ds.indexOf(x) === i).join(" + "),
    // agent chủ của vấn đề — model.ts ghi lên ô để Main lọc agent mật theo người xem (05/10)
    agent_chu: v.agent,
    __ly_do: { so_ngay_anh_huong: "Agent chủ của vấn đề chưa quy ra số ngày lùi COD." },
  }));
  const conLai = Math.max(0, soMo - top.length);
  const doKhac = gom.viecDoKhac.filter((v) => v.maDuAn === ma).length;
  if (conLai > 0) {
    banGhi.push({
      __dem: true,
      van_de:
        (top.length === 0 ? "Không có vấn đề nào làm chậm COD. " : "") +
        `Còn ${fmtSo(conLai)} vấn đề khác đang mở` +
        (doKhac > 0 ? ` (trong đó ${fmtSo(doKhac)} việc đỏ không nằm trên đường tới COD)` : "") +
        " — xem ở màn Cảnh báo của Main.",
    });
  }
  const maThe = top
    .slice(0, 5)
    .map((v) => `${v.tenAgent}${v.idIssue ? ` ${v.idIssue}` : ""}`)
    .join(" | ");
  return {
    anhXa: a,
    ok: true,
    banGhi,
    moTaNguon:
      `sổ Issue của các agent — ${soMo} thẻ đang mở, ${cua.length} thẻ đạt luật "làm chậm COD" của báo cáo sáng` +
      (maThe ? ` · ${maThe}` : ""),
    thoiDiem: new Date().toISOString(),
  };
}

async function chayMotLuot(a: AnhXaNguon, gomVanDe: () => Promise<KetQuaGomVanDe>): Promise<KetQuaLuot> {
  if (a.congCu === "core.issue") return layIssueTaiCho(a);
  if (a.congCu === CC_VAN_DE_NOI_BAT) {
    try {
      return ketQuaVanDeNoiBat(a, await gomVanDe());
    } catch (e) {
      return { anhXa: a, ok: false, lyDo: `Chưa gom được vấn đề nổi bật: ${e instanceof Error ? e.message : "lỗi không rõ"}` };
    }
  }
  const tra = await hoiAgent(a.maAgent, a.congCu, LY_DO_GOI, { tham_so: a.thamSo });
  return doiThanhKetQua(a, tra);
}

export interface ThamSoDung {
  thang: number;
  nam: number;
  /** Bỏ trống thì lấy toàn bộ dự án chưa lưu trữ */
  duAn?: DuAnTrongBaoCao[];
  donViLap?: string;
  noiNhan?: string;
  /** Không đi hỏi agent nào — dùng cho màn "xem báo cáo này định lấy số ở đâu" */
  chiDungKhung?: boolean;
  /** Người bấm "Làm lại báo cáo" — ô Người lập (13/10) */
  nguoiLap?: string;
}

/**
 * DỰNG BẢN NHÁP BÁO CÁO THÁNG.
 *
 * Không bao giờ ném lỗi và không bao giờ trả về báo cáo thiếu bảng: agent chết
 * hết thì vẫn ra đủ 6 mục 11 bảng, mọi ô là "—" kèm lý do. Báo cáo trống mà
 * nói rõ vì sao thì còn sửa được; báo cáo đầy số bịa thì không.
 */
export async function dungBaoCaoThang(ts: ThamSoDung): Promise<BaoCaoThang> {
  const duAn = ts.duAn ?? danhSachDuAn();
  // 13/10: ba ô đầu báo cáo (Đơn vị lập · Nơi nhận · Người ký) khai một lần ở khối "Thông tin đầu báo cáo"
  const dau = docCaiDatDau();
  const khung = dungKhungBaoCao({
    ky: kyThang(ts.thang, ts.nam),
    duAn,
    donViLap: ts.donViLap || dau.donViLap || undefined,
    noiNhan: ts.noiNhan || dau.noiNhan || undefined,
    nguoiKy: dau.nguoiKy || undefined,
    nguoiLap: ts.nguoiLap,
    ngayLap: ngayHomNay(),
  });

  if (ts.chiDungKhung) return khung;

  const luot = cacLuotHoiCanThiet(khung).filter((a) => !khongCanHoi(a));

  // Bảng 10 của MỌI dự án dùng chung MỘT lượt gom (cùng bộ gom của báo cáo sáng) — gom một lần, chia theo dự án
  let dangGom: Promise<KetQuaGomVanDe> | null = null;
  const gomVanDe = () => (dangGom ??= gomVanDeChoBaoCaoThang());

  // Fan-out song song: 4 agent độc lập nhau, hỏi tuần tự thì một con chậm kéo
  // cả bản báo cáo. `hoiAgent` không bao giờ ném nên không cần bọc try/catch.
  const ketQua = await Promise.all(luot.map((a) => chayMotLuot(a, gomVanDe)));

  const bc = anDuAnImLang(dienBaoCao(khung, ketQua), ketQua);
  bc.agentKhongHoiDuoc = agentKhongHoiDuoc(khung);
  bc.canhBao = canhBaoChung(bc, ketQua);
  return bc;
}

function ngayHomNay(): string {
  const [nam, thang, ngay] = gioVn(new Date()).ngay.split("-");
  return `${ngay}/${thang}/${nam}`;
}

/**
 * Agent nào báo cáo cần mà Danh bạ không gọi được, kèm lý do nguyên văn.
 * Hiện ngay đầu báo cáo để người đọc biết bản nháp này thiếu phần nào và vì
 * sao — thay vì phải mò từng ô "—".
 */
export function agentKhongHoiDuoc(bc: BaoCaoThang): AgentKhongHoiDuoc[] {
  let danhBa;
  try {
    danhBa = docDanhBaAgent();
  } catch {
    return [
      {
        maAgent: "?",
        lyDo: "Chưa đọc được Danh bạ agent — vào Cài đặt khai địa chỉ các agent.",
      },
    ];
  }
  const can = new Set<string>();
  for (const b of moiBang(bc)) {
    for (const l of b.luotHoi) if (l.maAgent !== MA_AGENT.main) can.add(l.maAgent);
  }
  const ra: AgentKhongHoiDuoc[] = [];
  for (const ma of Array.from(can).sort()) {
    const vuong = lyDoKhongGoiDuoc(danhBa, ma);
    if (vuong) ra.push({ maAgent: ma, lyDo: vuong });
  }
  return ra;
}

function canhBaoChung(bc: BaoCaoThang, ketQua: KetQuaLuot[]): string[] {
  const ra: string[] = [];
  // 13/10: "không có dữ liệu" là agent CÓ thưa — không tính là lượt hỏng (trước cộng chung nên ra 126/152 "hỏng")
  // 18/10/2026: lượt của công cụ MỚI agent chưa mở (chưa dựng lại) không tính là hỏng — công cụ cũ đang lo phần đó
  const hong = ketQua.filter((k) => !k.ok && k.maLoi !== "KHONG_CO_DU_LIEU" && !laLuotMoiChuaMo(k.anhXa, k)).length;
  const khongCo = ketQua.filter((k) => !k.ok && k.maLoi === "KHONG_CO_DU_LIEU").length;
  if (hong > 0) {
    ra.push(
      `${hong}/${ketQua.length} lượt hỏi KHÔNG TRẢ LỜI ĐƯỢC (agent lỗi hoặc từ chối) — các ô liên quan để trống "—" kèm lý do, KHÔNG ước số.`,
    );
  }
  if (khongCo > 0) ra.push(`${khongCo}/${ketQua.length} lượt hỏi agent có thưa nhưng chưa có dữ liệu cho dự án đó.`);
  if ((bc.duAnAn ?? []).length > 0) {
    ra.push(
      `Đã ẩn ${bc.duAnAn!.length} dự án chưa có dữ liệu: ${bc.duAnAn!.map((d) => d.ten).join(", ")} — có dữ liệu thì tự hiện.`,
    );
  }
  const bangTrong = moiBang(bc).filter((b) => b.lyDoTrong).length;
  if (bangTrong > 0) {
    ra.push(
      `${bangTrong}/11 bảng chưa có dòng dữ liệu nào — bảng vẫn hiện kèm câu giải thích, không giấu bảng đi.`,
    );
  }
  const soAgentBat = (() => {
    try {
      return cacAgentDangBat(docDanhBaAgent()).filter((a) => laAgentNghiepVu(a.ma)).length;
    } catch {
      return 0;
    }
  })();
  ra.push(
    `Bản nháp dựng bằng cách hỏi ${soAgentBat} agent đang bật trong Danh bạ. ` +
      "Đây là BẢN NHÁP — người ký duyệt mới chốt, đặc biệt cột Kiến nghị.",
  );
  return ra;
}
