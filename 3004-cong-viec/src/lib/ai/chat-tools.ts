// ============================================================
// BỘ CÔNG CỤ CỦA TRỢ LÝ DOCFLOW — thực thi các công cụ khai báo trong TOOL_SPECS
// (src/lib/ai/chat-types.ts). Mô hình chỉ được trả TÊN + ARGS; toàn bộ việc đọc
// dữ liệu thật xảy ra ở đây, qua đúng HỢP ĐỒNG dịch vụ của các module (KIEN-TRUC.md):
//   thu-muc/dich-vu.docPhienBan · kiem-tra/doc-bao-cao.docBaoCao · kiem-tra/kiem-tra.*
//   so-cai/dich-vu.danhSachSoCai|chiTietViec|viecDaXong · lich-su/doc.*
//
// NGUYÊN TẮC (giữ nguyên bản gốc agent tiến độ):
// - KHÔNG BAO GIỜ throw: mọi lỗi (tên lạ, args sai, thiếu quyền, module khác
//   chưa làm xong — ném "Chưa làm") đều trả { ok:false, summary: "câu tiếng Việt" }.
// - CHỈ ĐỌC đúng phần người hỏi có quyền (quyen-doc.ts). Bộ công cụ hiện không
//   có công cụ GHI; lưới chặn công cụ ghi của bản gốc vẫn giữ cho về sau.
// - Công cụ điều hướng KHÔNG tự làm gì trên server, chỉ trả uiAction cho client.
// CHỈ chạy phía server — không import vào Client Component.
// ============================================================

import { chuyenCongCuQuaMain, hoiMainCauCheo } from "@/lib/ai/hoi-main";
import { layQ, tx, type Q } from "@/lib/db";
import type { DongLichSu, LoaiDoiTuong, NguoiDungPhien } from "@/lib/types";
import { HANH_DONG_LICH_SU } from "@/lib/types";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { ghiLichSu } from "@/lib/lich-su/ghi";
import { docPhienBan, docPhienBanDu } from "@/lib/thu-muc/dich-vu";
import { cheDoXemNoiDung } from "@/lib/bao-mat/quy-tac";
import { docBaoCao, laTepBaoCao } from "@/lib/kiem-tra/doc-bao-cao";
import { danhSachMau, kiemTraTaiLieu } from "@/lib/kiem-tra/kiem-tra";
import { chiTietViec, danhSachSoCai, viecDaXong, type DongSoCai, type LocSoCai } from "@/lib/so-cai/dich-vu";
import { lichSuDoiTuong, timLichSu } from "@/lib/lich-su/doc";
import { TOOL_SPECS, type UiAction } from "@/lib/ai/chat-types";
import { thayLichSu, thayThungRac, thayViec, xemDuocNoiDung } from "@/lib/ai/quyen-doc";
import { boDau, layCay, tenNguoi, timDonVi, timNguoi } from "@/lib/ai/tra-cuu";
import { timVaDocWeb } from "@/lib/ai/tim-web";
import { tenNha, xepKetQua } from "@/lib/ai/tim-web-chung";
import { bocChuTep, khoiKiemTra, khoiONhap } from "@/lib/tro-ly/dinh-kem";
import { chuanHoaLink, MO_TA_LINK } from "@/lib/ai/trang-co-that";
import { duLieuSoDo } from "@/lib/phong/so-do";
import { bayGioVN, khoangNgay } from "@/lib/phong/tuan";
import { homNayVN } from "@/lib/so-cai/tien-ich";
import { docSoMay } from "@/lib/chung/doc-so";

export interface ToolContext {
  /** Người đang hỏi — quyền của người này quyết định công cụ đọc được gì */
  nd: NguoiDungPhien;
  /**
   * TIN NHẮN CUỐI của chính người dùng (không phải dữ liệu hệ thống). Dùng để
   * chặn PROMPT INJECTION: công cụ GHI dữ liệu chỉ chạy khi người dùng thật sự
   * yêu cầu. Bỏ trống = coi như KHÔNG có yêu cầu ghi.
   */
  userMessage?: string;
  /** Người dùng có BẬT nút 🌐 tìm trên internet không (mặc định tắt) */
  timWebBat?: boolean;
  /** Thiết bị (IP + trình duyệt) — ghi kèm lịch sử 'mo_xem' khi trợ lý đọc tài liệu */
  thietBi?: string;
  /** Đối tượng truy vấn — để test truyền CSDL riêng; bỏ trống = layQ() */
  q?: Q;
}

export interface ToolResult {
  ok: boolean;
  /** Câu tiếng Việt hiển thị cho người dùng + đưa lại cho mô hình đọc */
  summary: string;
  /** Dữ liệu chi tiết đưa lại cho mô hình (KHÔNG hiện thẳng cho người dùng) */
  data?: unknown;
  /** Việc client phải làm sau khi nhận trả lời */
  uiAction?: UiAction;
}

// ===== Tiện ích đọc tham số (mô hình hay trả số dạng chuỗi) =====

function argStr(args: Record<string, unknown>, key: string): string {
  const v = args[key];
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "";
}

function argNum(args: Record<string, unknown>, key: string): number | null {
  const v = args[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = docSoMay(v); // chữ AI viết: cú pháp số của máy, không thì chuẩn số Việt Nam (lib/chung/doc-so — chốt 130)
    if (n !== null) return n;
  }
  return null;
}

function argBool(args: Record<string, unknown>, key: string): boolean | undefined {
  const v = args[key];
  if (typeof v === "boolean") return v;
  if (v === "true" || v === "1" || v === 1) return true;
  if (v === "false" || v === "0" || v === 0) return false;
  return undefined;
}

function gioiHan(args: Record<string, unknown>, macDinh: number, tran: number): number {
  const n = argNum(args, "gioi_han") ?? argNum(args, "limit") ?? macDinh;
  return Math.max(1, Math.min(tran, Math.round(n)));
}

const ISO_NGAY = /^\d{4}-\d{2}-\d{2}$/;

function ngayVN(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso);
}

/**
 * Gọi hàm dịch vụ của module khác. Module chưa làm xong ném Error("Chưa làm")
 * → câu tiếng Việt rõ ràng, trợ lý không sập, người dùng biết vì sao.
 */
class LoiDichVu extends Error {}
async function goi<T>(phan: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/chưa làm/i.test(msg)) {
      throw new LoiDichVu(`Phần ${phan} của SCI công việc đang được xây dựng, mình chưa đọc được dữ liệu này.`);
    }
    throw new LoiDichVu(`Không đọc được ${phan}: ${msg}`);
  }
}

// ===== Rút gọn dữ liệu cho mô hình (giữ prompt gọn) =====

function gonViec(v: DongSoCai) {
  return {
    ma_viec: v.id,
    ten: v.ten,
    du_an: v.du_an,
    hang_muc: v.hang_muc,
    luon_mo: v.luon_mo,
    bat_dau: v.bat_dau,
    ket_thuc: v.ket_thuc,
    trang_thai: v.trang_thai,
    tien_do: v.tien_do,
    canh_bao: v.canh_bao,
    cho_sua: v.cho_sua,
    nguon_hien_hanh: v.nguon_hien_hanh?.nhan ?? null,
    so_ban_da_de: v.so_ban_da_de,
    phan_viec: (v.phan_viec ?? []).map((p) => ({
      phu_trach: p.phu_trach_ten ?? p.phu_trach_id,
      noi_dung: p.noi_dung,
      trang_thai: p.trang_thai,
      ket_thuc: p.ket_thuc,
      luon_mo: p.luon_mo,
    })),
    link: `/cong-viec/${v.id}`,
  };
}

async function gonLichSu(q: Q, ds: DongLichSu[]) {
  const ten = await tenNguoi(q, ds.map((d) => d.nguoi));
  return ds.map((d) => ({
    luc: d.luc,
    nguoi: ten[d.nguoi] ?? d.nguoi,
    hanh_dong: HANH_DONG_LICH_SU[d.hanh_dong] ?? d.hanh_dong,
    doi_tuong: `${d.doi_tuong_loai}:${d.doi_tuong_id}`,
    chi_tiet: (() => {
      const s = JSON.stringify(d.chi_tiet ?? {});
      return s.length > 300 ? s.slice(0, 300) + "…" : d.chi_tiet;
    })(),
  }));
}

// ===== THƯ MỤC =====

interface DongThuMuc {
  id: string;
  don_vi_id: string;
  cha_id: string | null;
  ten: string;
  loai: string;
  so_tai_lieu: number;
  so_da_xoa: number;
}

async function toolCay(ctx: ToolContext, q: Q, args: Record<string, unknown>): Promise<ToolResult> {
  const cay = await layCay(q);
  const hoi = argStr(args, "don_vi") || argStr(args, "cong_ty");
  const loc = hoi === "" ? null : timDonVi(cay, hoi);
  if (hoi !== "" && !loc) {
    return { ok: false, summary: `Không nhận ra đơn vị "${hoi}". Các đơn vị: ${cay.map((d) => d.ten_ngan).join(", ")}.` };
  }
  const { rows } = await q.query<DongThuMuc>(
    `SELECT m.id, m.don_vi_id, m.cha_id, m.ten, m.loai,
            count(v.id) FILTER (WHERE NOT v.da_xoa)::int AS so_tai_lieu,
            count(v.id) FILTER (WHERE v.da_xoa)::int AS so_da_xoa
     FROM docflow.thu_muc m LEFT JOIN docflow.vi_tri v ON v.thu_muc_id = m.id
     GROUP BY m.id ORDER BY m.don_vi_id, m.ten`,
  );
  const dsDonVi = loc ? [loc] : cay;
  const ra = dsDonVi.map((d) => ({
    ma: d.id,
    ten: d.ten,
    ten_ngan: d.ten_ngan,
    cap: d.cap,
    thuoc: cay.find((c) => c.id === d.cha_id)?.ten_ngan ?? null,
    mau_bao_cao: d.mau_ma,
    thu_muc: rows
      .filter((r) => r.don_vi_id === d.id)
      .map((r) => ({
        id: r.id,
        ten: r.ten,
        loai: r.loai,
        so_tai_lieu: r.loai === "thung_rac" ? r.so_da_xoa : r.so_tai_lieu,
        ...(r.loai === "thung_rac" && !thayThungRac(ctx.nd, cay, d.id) ? { ghi_chu: "chỉ người có quyền khôi phục mới xem được bên trong" } : {}),
      })),
  }));
  return {
    ok: true,
    summary: loc ? `Đọc cây thư mục của ${loc.ten_ngan}.` : `Đọc cây ${cay.length} đơn vị và thư mục.`,
    data: { don_vi: ra, link: "/thu-muc" },
  };
}

interface DongTaiLieu {
  id: string;
  ten: string;
  mau_ma: string | null;
  ky_bao_cao: Record<string, unknown> | null;
  trang_thai: string;
  phien_ban_hien_tai: number;
  nguoi_tao: string;
  tao_luc: string;
  vai: string;
  nhan: string | null;
  da_xoa: boolean;
  them_luc: string;
  thu_muc_ten: string;
  thu_muc_loai: string;
  don_vi_id: string;
}

function kyChu(k: Record<string, unknown> | null): string | null {
  if (!k) return null;
  const loai = k.loai === "tuan" ? "tuần" : k.loai === "thang" ? "tháng" : k.loai === "quy" ? "quý" : "";
  const so = k.so !== undefined ? ` ${String(k.so)}` : "";
  const nam = k.nam !== undefined ? `/${String(k.nam)}` : "";
  return `${loai}${so}${nam}`.trim() || null;
}

const TU_CHUNG = new Set(["bao", "cao", "moi", "nhat", "gan", "day", "cua", "file", "tai", "lieu", "ban", "word", "docx", "cho", "va", "cac"]);

async function toolLietKe(ctx: ToolContext, q: Q, args: Record<string, unknown>): Promise<ToolResult> {
  const cay = await layCay(q);
  const hoi = argStr(args, "don_vi") || argStr(args, "cong_ty");
  const dv = hoi === "" ? null : timDonVi(cay, hoi);
  if (hoi !== "" && !dv) return { ok: false, summary: `Không nhận ra đơn vị "${hoi}".` };
  const loai = argStr(args, "loai") || "tat_ca";
  // "form-5" / "Form 5" / "form5" → "form-5" (trước 01/10 "form-5" bị đổi thành "form--5" → tìm theo mẫu không bao giờ khớp)
  const mau = argStr(args, "mau").toLowerCase().replace(/^form[\s_-]*/, "form-");
  const tuKhoa = boDau(argStr(args, "tu_khoa"));
  const n = gioiHan(args, 20, 50);

  const dk: string[] = [];
  const tham: unknown[] = [];
  if (dv) {
    tham.push(dv.id);
    dk.push(`m.don_vi_id = $${tham.length}`);
  }
  if (loai === "thung_rac") dk.push("v.da_xoa");
  else {
    dk.push("NOT v.da_xoa");
    if (["den", "di", "du_an", "khac", "goc"].includes(loai)) {
      tham.push(loai);
      dk.push(`m.loai = $${tham.length}`);
    }
  }
  if (mau !== "") {
    tham.push(mau);
    dk.push(`t.mau_ma = $${tham.length}`);
  }
  const { rows } = await q.query<DongTaiLieu>(
    `SELECT t.id, t.ten, t.mau_ma, t.ky_bao_cao, t.trang_thai, t.phien_ban_hien_tai, t.nguoi_tao, t.tao_luc,
            v.vai, v.nhan, v.da_xoa, v.them_luc, m.ten AS thu_muc_ten, m.loai AS thu_muc_loai, m.don_vi_id
     FROM docflow.vi_tri v
     JOIN docflow.tai_lieu t ON t.id = v.tai_lieu_id
     JOIN docflow.thu_muc m ON m.id = v.thu_muc_id
     ${dk.length > 0 ? "WHERE " + dk.join(" AND ") : ""}
     ORDER BY v.them_luc DESC LIMIT 500`,
    tham,
  );
  const locTu = (ds: DongTaiLieu[]) => ds
    .filter((r) => !r.da_xoa || thayThungRac(ctx.nd, cay, r.don_vi_id))
    .filter((r) => {
      // Khớp TỪNG TỪ, không đòi nguyên cụm: AI hay gõ "báo cáo tuần 40 mới nhất" — nguyên cụm thì trượt hết (đo 01/10:
      // SCI PMC có 2 báo cáo tuần 40 mà công cụ báo 0). Bỏ chữ chung không giúp lọc.
      if (tuKhoa === "") return true;
      const chu = boDau(`${r.ten} ${r.mau_ma ?? ""} ${kyChu(r.ky_bao_cao) ?? ""} ${r.thu_muc_ten ?? ""}`);
      return tuKhoa.split(/[\s,;/]+/).filter((w) => w && !TU_CHUNG.has(w)).every((w) => chu.includes(w));
    });
  let loc = locTu(rows);
  // Báo cáo DO đơn vị X lập nằm ở thư mục "đi" của X và "đến" của nơi nhận — AI hay tìm nhầm ở "đến" của X
  // (đo 01/10: hỏi báo cáo tuần 40 của SCI PMC, AI gọi loai="den" → 0, trong khi có 2 bản đã gửi). Không thấy theo
  // thư mục thì tìm theo ĐƠN VỊ LẬP báo cáo.
  if (loc.length === 0 && dv && loai !== "thung_rac") {
    const tham2: unknown[] = [dv.id];
    const dk2 = ["t.don_vi_lap = $1", "NOT v.da_xoa"];
    if (mau !== "") (tham2.push(mau), dk2.push(`t.mau_ma = $${tham2.length}`));
    const r2 = await q.query<DongTaiLieu>(
      `SELECT DISTINCT ON (t.id) t.id, t.ten, t.mau_ma, t.ky_bao_cao, t.trang_thai, t.phien_ban_hien_tai, t.nguoi_tao, t.tao_luc,
              v.vai, v.nhan, v.da_xoa, v.them_luc, m.ten AS thu_muc_ten, m.loai AS thu_muc_loai, m.don_vi_id
         FROM docflow.vi_tri v
         JOIN docflow.tai_lieu t ON t.id = v.tai_lieu_id
         JOIN docflow.thu_muc m ON m.id = v.thu_muc_id
        WHERE ${dk2.join(" AND ")}
        ORDER BY t.id, v.them_luc DESC LIMIT 500`,
      tham2,
    );
    loc = locTu(r2.rows.sort((a, b) => new Date(String(b.them_luc)).getTime() - new Date(String(a.them_luc)).getTime()));
  }
  const ten = await tenNguoi(q, loc.slice(0, n).map((r) => r.nguoi_tao));
  const ra = loc.slice(0, n).map((r) => ({
    tai_lieu_id: r.id,
    ten: r.ten,
    mau: r.mau_ma,
    ky_bao_cao: kyChu(r.ky_bao_cao),
    trang_thai: r.trang_thai,
    phien_ban: r.phien_ban_hien_tai,
    don_vi: cay.find((d) => d.id === r.don_vi_id)?.ten_ngan ?? r.don_vi_id,
    thu_muc: r.thu_muc_ten,
    nhan: r.nhan,
    da_xoa: r.da_xoa,
    nguoi_tai: ten[r.nguoi_tao] ?? r.nguoi_tao,
    luc: r.them_luc,
    link: `/tai-lieu/${r.id}`,
  }));
  if (loai === "thung_rac" && dv && !thayThungRac(ctx.nd, cay, dv.id)) {
    return { ok: false, summary: `Bạn không có quyền xem thùng rác của ${dv.ten_ngan}.` };
  }
  return {
    ok: true,
    summary: `Tìm thấy ${loc.length} tài liệu${dv ? ` ở ${dv.ten_ngan}` : ""}${loc.length > n ? ` (hiện ${n})` : ""}.`,
    data: { tai_lieu: ra, tong: loc.length },
  };
}

/** Thông tin để xét quyền xem nội dung một tài liệu */
async function thongTinTaiLieu(q: Q, id: string): Promise<{ ten: string; nguoi_tao: string; don_vi: string[]; don_vi_lap: string | null; mau_ma: string | null } | null> {
  const t = await q.query<{ ten: string; nguoi_tao: string; don_vi_lap: string | null; mau_ma: string | null }>(
    "SELECT ten, nguoi_tao, don_vi_lap, mau_ma FROM docflow.tai_lieu WHERE id = $1",
    [id],
  );
  if (!t.rows[0]) return null;
  const v = await q.query<{ don_vi_id: string }>(
    "SELECT DISTINCT m.don_vi_id FROM docflow.vi_tri v JOIN docflow.thu_muc m ON m.id = v.thu_muc_id WHERE v.tai_lieu_id = $1",
    [id],
  );
  const dv = new Set(v.rows.map((r) => r.don_vi_id));
  if (t.rows[0].don_vi_lap) dv.add(t.rows[0].don_vi_lap);
  return { ...t.rows[0], don_vi: Array.from(dv) };
}

async function kiemQuyenXem(ctx: ToolContext, q: Q, id: string): Promise<{ ok: true; ten: string; don_vi_lap: string | null } | { ok: false; summary: string }> {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return { ok: false, summary: "Mã tài liệu không hợp lệ." };
  const tl = await thongTinTaiLieu(q, id);
  if (!tl) return { ok: false, summary: `Không có tài liệu mã "${id}".` };
  // Q4 bảo mật tài chính: tài liệu khác (không theo mẫu mật) của phòng TCKT xét theo phân quyền
  const cheDo = cheDoXemNoiDung((await layCauHinh(q, "thu_muc")).xem_noi_dung_phong_khac, await layCauHinh(q, "bao_mat"), tl);
  const cay = await layCay(q);
  if (!xemDuocNoiDung(ctx.nd, cay, tl, cheDo)) {
    return { ok: false, summary: `Bạn không có quyền mở xem nội dung "${tl.ten}".` };
  }
  return { ok: true, ten: tl.ten, don_vi_lap: tl.don_vi_lap };
}

async function toolDoc(ctx: ToolContext, q: Q, args: Record<string, unknown>): Promise<ToolResult> {
  const id = argStr(args, "tai_lieu_id") || argStr(args, "id");
  if (id === "") return { ok: false, summary: "Thiếu tai_lieu_id (lấy từ thumuc.liet_ke)." };
  const quyen = await kiemQuyenXem(ctx, q, id);
  if (!quyen.ok) return quyen;
  const pb = argNum(args, "phien_ban") ?? undefined;
  // Đọc THAY người hỏi: báo cáo mẫu mật → người không có tên trong danh sách nhận bản đã cắt (có sẵn câu từ chối ở chỗ cắt)
  const { thong_tin, noi_dung } = await goi("thư mục (đọc phiên bản tài liệu)", () => docPhienBan(q, id, pb, ctx.nd));
  let vanBan = "";
  let cauTruc: string | null = null;
  // Báo cáo theo mẫu: Word (nộp trước 22/10/2026) hoặc Excel (từ 22/10) — cùng bộ đọc ô nhập
  if (laTepBaoCao(thong_tin.ten_tep, thong_tin.mime)) {
    try {
      const w = await docBaoCao(noi_dung);
      vanBan = w.van_ban;
      cauTruc = khoiONhap(w);
    } catch {
      // module đọc ô nhập chưa xong → đọc chữ thuần bằng mammoth
    }
  }
  if (vanBan.trim() === "") {
    const b = await bocChuTep(thong_tin.ten_tep, noi_dung);
    if (b.chu.trim() === "") return { ok: false, summary: b.ghiChu ?? `Không bóc được chữ từ ${thong_tin.ten_tep}.` };
    vanBan = b.chu;
  }
  // Lịch sử ghi đủ "ai mở xem" — trợ lý đọc thay người nào thì ghi người đó
  try {
    await tx((t) =>
      ghiLichSu(t, {
        nguoi: ctx.nd.id,
        doi_tuong_loai: "tai_lieu",
        doi_tuong_id: id,
        hanh_dong: "mo_xem",
        don_vi_id: ctx.nd.don_vi_id,
        thiet_bi: ctx.thietBi ?? null,
        chi_tiet: { phien_ban: thong_tin.phien_ban, qua: "tro-ly-ai" },
      }),
    );
  } catch {
    /* ghi lịch sử hỏng không chặn câu trả lời */
  }
  const TRAN = 9000;
  return {
    ok: true,
    summary: `Đọc "${quyen.ten}" bản ${thong_tin.phien_ban} (${Math.round(thong_tin.kich_thuoc / 1024)} KB).`,
    data: {
      tai_lieu_id: id,
      ten: quyen.ten,
      phien_ban: thong_tin.phien_ban,
      tai_len_luc: thong_tin.tai_len_luc,
      cau_truc: cauTruc,
      noi_dung: vanBan.length > TRAN ? vanBan.slice(0, TRAN) + "\n…(đã cắt phần cuối)" : vanBan,
      link: `/tai-lieu/${id}`,
    },
  };
}

// ===== SỔ CÁI =====

async function locSoCai(q: Q, args: Record<string, unknown>, ctx: ToolContext): Promise<{ loc: LocSoCai; moTa: string[] } | { loi: string }> {
  const cay = await layCay(q);
  const loc: LocSoCai = {};
  const moTa: string[] = [];
  const hoiDv = argStr(args, "don_vi") || argStr(args, "cong_ty");
  if (hoiDv !== "") {
    const dv = timDonVi(cay, hoiDv);
    if (!dv) return { loi: `Không nhận ra đơn vị "${hoiDv}". Các đơn vị: ${cay.map((d) => d.ten_ngan).join(", ")}.` };
    loc.don_vi_id = dv.id;
    moTa.push(dv.ten_ngan);
  }
  const hoiNguoi = argStr(args, "nguoi");
  if (hoiNguoi !== "") {
    if (/^(toi|tôi|minh|mình|me)$/i.test(hoiNguoi)) {
      loc.nguoi = ctx.nd.id;
      moTa.push(ctx.nd.ten);
    } else {
      const ng = await timNguoi(q, hoiNguoi);
      if (ng.length === 0) return { loi: `Không tìm thấy người "${hoiNguoi}".` };
      if (ng.length > 1) return { loi: `"${hoiNguoi}" khớp nhiều người: ${ng.map((x) => `${x.ten} (${x.email})`).join("; ")} — hỏi lại rõ tên.` };
      loc.nguoi = ng[0]!.id;
      moTa.push(ng[0]!.ten);
    }
  }
  const duAn = argStr(args, "du_an");
  if (duAn !== "") {
    loc.du_an = duAn;
    moTa.push(`dự án ${duAn}`);
  }
  const luonMo = argBool(args, "luon_mo");
  if (luonMo !== undefined) {
    loc.luon_mo = luonMo;
    moTa.push(luonMo ? "luôn mở" : "có hạn");
  }
  const cb = argStr(args, "canh_bao");
  if (cb === "qua_han" || cb === "sap_den_han") {
    loc.canh_bao = cb;
    moTa.push(cb === "qua_han" ? "quá hạn" : "sắp đến hạn");
  }
  const tk = argStr(args, "tu_khoa");
  if (tk !== "") {
    loc.tu_khoa = tk;
    moTa.push(`"${tk}"`);
  }
  return { loc, moTa };
}

function khongCoQuyenSoCai(nd: NguoiDungPhien): ToolResult | null {
  if (nd.la_quan_tri || nd.quyen["so_cai.xem"]) return null;
  return { ok: false, summary: "Bạn chưa được cấp quyền xem sổ cái — nhờ quản trị viên cấp quyền «Xem sổ cái»." };
}

async function toolDanhSachViec(ctx: ToolContext, q: Q, args: Record<string, unknown>, ten = "socai.danh_sach_viec"): Promise<ToolResult> {
  const cam = khongCoQuyenSoCai(ctx.nd);
  if (cam) return cam;
  const l = await locSoCai(q, args, ctx);
  if ("loi" in l) return { ok: false, summary: l.loi };
  if (ten === "socai.viec_cua_don_vi" && !l.loc.don_vi_id && !l.loc.nguoi) {
    return { ok: false, summary: "Cần nói rõ đơn vị (don_vi) hoặc người (nguoi) — vd don_vi=\"P.ĐT&PC\" hoặc nguoi=\"toi\"." };
  }
  const ds = await goi("sổ cái", () => danhSachSoCai(q, l.loc));
  const cay = await layCay(q);
  // moi_tu: chỉ việc VÀO SỔ từ ngày này (giờ VN) — câu "hôm nay / tuần này X có gì mới" (test đêm 02/10 bước 12: AI không
  // lọc được việc mới nên trả lời không có gì mới, trong khi có việc mới từ báo cáo Nậm Xe sáng nay)
  const moiTu = argStr(args, "moi_tu");
  if (moiTu !== "" && !ISO_NGAY.test(moiTu)) return { ok: false, summary: "moi_tu phải dạng yyyy-mm-dd." };
  const ngayVao = (v: DongSoCai) => (v.tao_luc ? bayGioVN(new Date(v.tao_luc)).slice(0, 10) : "");
  const thay = ds.filter((v) => thayViec(ctx.nd, cay, v) && (moiTu === "" || ngayVao(v) >= moiTu));
  if (moiTu !== "") l.moTa.push(`vào sổ từ ${ngayVN(moiTu)}`);
  const n = gioiHan(args, 30, 100);
  const quaHan = thay.filter((v) => v.canh_bao === "qua_han").length;
  const sapHan = thay.filter((v) => v.canh_bao === "sap_den_han").length;
  const luonMo = thay.filter((v) => v.luon_mo).length;
  // Việc đáng chú ý lên trước: quá hạn → sắp đến hạn → còn lại theo hạn
  const xep = thay.slice().sort((a, b) => {
    const h = (v: DongSoCai) => (v.canh_bao === "qua_han" ? 0 : v.canh_bao === "sap_den_han" ? 1 : 2);
    return h(a) - h(b) || String(a.ket_thuc ?? "9999").localeCompare(String(b.ket_thuc ?? "9999"));
  });
  return {
    ok: true,
    summary:
      `Sổ cái${l.moTa.length > 0 ? ` (${l.moTa.join(" · ")})` : ""}: ${thay.length} việc đang mở` +
      (quaHan + sapHan > 0 ? ` — ${quaHan} quá hạn, ${sapHan} sắp đến hạn` : "") +
      (thay.length > n ? ` (hiện ${n})` : "") +
      ".",
    data: {
      tong: thay.length,
      qua_han: quaHan,
      sap_den_han: sapHan,
      luon_mo: luonMo,
      an_do_quyen: ds.filter((v) => !thayViec(ctx.nd, cay, v)).length,
      viec: xep.slice(0, n).map((v) => ({ ...gonViec(v), vao_so: ngayVN(ngayVao(v) || null) })),
      link: "/so-do",
    },
  };
}

async function toolChiTietViec(ctx: ToolContext, q: Q, args: Record<string, unknown>): Promise<ToolResult> {
  const cam = khongCoQuyenSoCai(ctx.nd);
  if (cam) return cam;
  const ma = (argStr(args, "ma_viec") || argStr(args, "id")).toUpperCase();
  if (ma === "") return { ok: false, summary: "Thiếu ma_viec (vd CV-2026-0412)." };
  const v = await goi("sổ cái", () => chiTietViec(q, ma));
  if (!v) return { ok: false, summary: `Không có việc mã ${ma}.` };
  const cay = await layCay(q);
  if (!thayViec(ctx.nd, cay, v)) return { ok: false, summary: `Bạn không có quyền xem việc ${ma}.` };
  let quaTrinh: unknown[] = [];
  try {
    // Thấy được việc thì thấy được quá trình của việc đó (một phần của chi tiết việc)
    const ls = await lichSuDoiTuong(q, "cong_viec", ma);
    quaTrinh = await gonLichSu(q, ls.slice(-40));
  } catch {
    /* lịch sử chưa đọc được — vẫn trả chi tiết việc */
  }
  return {
    ok: true,
    summary: `Chi tiết ${ma}: ${v.ten} — tiến độ ${v.tien_do}${v.canh_bao === "qua_han" ? ", QUÁ HẠN" : v.canh_bao === "sap_den_han" ? ", sắp đến hạn" : ""}.`,
    data: {
      ...gonViec(v),
      ket_qua_can_co: v.ket_qua_can_co,
      cac_nguon: (v.cac_nguon ?? []).map((n) => ({ nhan: n.nhan, cap: n.cap, trang_thai: n.trang_thai, ly_do: n.ly_do, ngay_gui: n.ngay_gui })),
      qua_trinh: quaTrinh,
    },
  };
}

async function toolViecDaXong(ctx: ToolContext, q: Q, args: Record<string, unknown>): Promise<ToolResult> {
  const cam = khongCoQuyenSoCai(ctx.nd);
  if (cam) return cam;
  const l = await locSoCai(q, args, ctx);
  if ("loi" in l) return { ok: false, summary: l.loi };
  const tu = argStr(args, "tu");
  const den = argStr(args, "den");
  if ((tu !== "" && !ISO_NGAY.test(tu)) || (den !== "" && !ISO_NGAY.test(den))) {
    return { ok: false, summary: "Ngày phải dạng yyyy-mm-dd." };
  }
  const ds = await goi("lịch sử công việc", () => viecDaXong(q, { ...l.loc, ...(tu ? { tu } : {}), ...(den ? { den } : {}) }));
  const cay = await layCay(q);
  const thay = ds.filter((v) => thayViec(ctx.nd, cay, v));
  const n = gioiHan(args, 30, 100);
  return {
    ok: true,
    summary: `Đã xong${tu || den ? ` trong ${khoangNgay(tu || null, den || null)}` : ""}: ${thay.length} việc.`,
    data: {
      tong: thay.length,
      viec: thay.slice(0, n).map((v) => ({ ...gonViec(v), dong_luc: v.dong_luc, ly_do_dong: v.ly_do_dong })),
    },
  };
}

// ===== NỘP BÁO CÁO TUẦN =====

/** Thứ Hai của tuần ISO `so` năm `nam` (yyyy-mm-dd) */
function thuHaiTuanIso(so: number, nam: number): string {
  const jan4 = Date.UTC(nam, 0, 4);
  const thu = (new Date(jan4).getUTCDay() + 6) % 7;
  return new Date(jan4 - thu * 864e5 + (so - 1) * 7 * 864e5).toISOString().slice(0, 10);
}

/** Cùng dữ liệu với Sơ đồ tổ chức (MÁY tính) — đã nộp / chưa nộp / hạn nộp theo cấp của từng đơn vị trong một tuần. */
async function toolTinhHinhNop(q: Q, args: Record<string, unknown>): Promise<ToolResult> {
  const homNay = homNayVN();
  const hoiTuan = argStr(args, "tuan");
  let ngay = homNay;
  if (hoiTuan !== "") {
    const m = /^(\d{1,2})(?:\s*\/\s*(\d{4}))?$/.exec(hoiTuan.replace(/^tu[aầ]n\s*/i, "").trim());
    if (!m || Number(m[1]) < 1 || Number(m[1]) > 53) return { ok: false, summary: `Không hiểu tuần "${hoiTuan}" — ghi số tuần, vd 40 hoặc 40/2026.` };
    ngay = thuHaiTuanIso(Number(m[1]), m[2] ? Number(m[2]) : Number(homNay.slice(0, 4)));
  }
  const sd = await duLieuSoDo(q, ngay);
  let o = sd.o;
  const hoiDv = argStr(args, "don_vi");
  if (hoiDv !== "") {
    const dv = timDonVi(await layCay(q), hoiDv);
    if (!dv) return { ok: false, summary: `Không nhận ra đơn vị "${hoiDv}". Các đơn vị: ${sd.o.map((x) => x.ten_ngan).join(", ")}.` };
    // đơn vị đó + mọi ô gửi báo cáo lên nó (theo luồng báo cáo của sơ đồ)
    const lay = new Set([dv.id]);
    for (let them = true; them; ) {
      them = false;
      for (const x of sd.o) if (x.cha && lay.has(x.cha) && !lay.has(x.id)) (lay.add(x.id), (them = true));
    }
    o = sd.o.filter((x) => lay.has(x.id));
  }
  const gioVN = (s: string) => `${s.slice(11, 16)} ${ngayVN(s.slice(0, 10))}`;
  const dong = o.map((x) => {
    const bc = sd.bao_cao[x.id];
    const han = sd.han_nop[x.id];
    if (bc) {
      const luc = bayGioVN(new Date(bc.luc));
      return {
        don_vi: x.ten,
        ten_ngan: x.ten_ngan,
        da_nop: true,
        nop_luc: gioVN(luc),
        nguoi_nop: bc.nguoi_nop,
        dung_han: han ? luc <= han : null,
        han_nop: han ? gioVN(han) : null,
        ky: bc.ky,
        ten_tep: bc.ten_tep,
        tai_lieu_id: bc.tai_lieu_id,
        link: `/api/tai-lieu/${bc.tai_lieu_id}/tep`,
        may_kiem_tra: bc.dat === true ? "đạt" : bc.dat === false ? "không đạt" : "chưa rõ",
        so_viec_vao_so_cai: bc.so_viec,
      };
    }
    return { don_vi: x.ten, ten_ngan: x.ten_ngan, da_nop: false, han_nop: han ? gioVN(han) : null, da_qua_han_nop: sd.qua_han_nop.includes(x.id) };
  });
  const chiChua = argBool(args, "chi_chua_nop") === true;
  const ra = chiChua ? dong.filter((d) => !d.da_nop) : dong;
  const daNop = dong.filter((d) => d.da_nop).length;
  // Test đêm 01/10 câu 3: hỏi "tóm tắt báo cáo tuần 40 của X", Sonnet dừng ở tình hình nộp → chỉ đường đọc tiếp ngay trong kết quả
  const banDau = hoiDv !== "" ? dong.find((d) => d.da_nop && "tai_lieu_id" in d) : undefined;
  const docTiep = banDau && "tai_lieu_id" in banDau ? ` Cần NỘI DUNG (tóm tắt, kiến nghị, việc): gọi thumuc.doc với tai_lieu_id "${banDau.tai_lieu_id}" (bản đang dùng của ${banDau.ten_ngan}).` : "";
  return {
    ok: true,
    summary: `Tuần ${sd.tuan.so}/${sd.tuan.nam} (${khoangNgay(sd.tuan.tu, sd.tuan.den)}): ${daNop}/${dong.length} đơn vị đã nộp, ${dong.length - daNop} chưa nộp. Hạn nộp mỗi đơn vị KHÁC nhau theo cấp — chép đúng ô han_nop của từng dòng, không gộp.${docTiep}`,
    data: { tuan: { so: sd.tuan.so, nam: sd.tuan.nam, khoang: khoangNgay(sd.tuan.tu, sd.tuan.den) }, hom_nay: ngayVN(homNay), don_vi: ra },
  };
}

// ===== LỊCH SỬ =====

async function toolLichSuDoiTuong(ctx: ToolContext, q: Q, args: Record<string, unknown>): Promise<ToolResult> {
  const loaiRaw = argStr(args, "loai") || "tai_lieu";
  const loai: LoaiDoiTuong | null = loaiRaw === "cong_viec" || loaiRaw === "tai_lieu" ? loaiRaw : null;
  if (!loai) return { ok: false, summary: 'loai phải là "tai_lieu" hoặc "cong_viec".' };
  const id = argStr(args, "id") || argStr(args, "ma_viec") || argStr(args, "tai_lieu_id");
  if (id === "") return { ok: false, summary: "Thiếu id (mã tài liệu hoặc mã việc)." };
  if (!ctx.nd.la_quan_tri && !ctx.nd.quyen["lich_su.xem"]) {
    return { ok: false, summary: "Bạn chưa được cấp quyền xem lịch sử." };
  }
  const ds = await goi("lịch sử", () => lichSuDoiTuong(q, loai, loai === "cong_viec" ? id.toUpperCase() : id));
  const cay = await layCay(q);
  const thay = ds.filter((d) => thayLichSu(ctx.nd, cay, d));
  return {
    ok: true,
    summary: `Dòng thời gian ${id}: ${thay.length} sự kiện${ds.length > thay.length ? ` (${ds.length - thay.length} dòng ngoài phạm vi quyền của bạn)` : ""}.`,
    data: { su_kien: await gonLichSu(q, thay.slice(-60)) },
  };
}

async function toolTimLichSu(ctx: ToolContext, q: Q, args: Record<string, unknown>): Promise<ToolResult> {
  if (!ctx.nd.la_quan_tri && !ctx.nd.quyen["lich_su.xem"]) {
    return { ok: false, summary: "Bạn chưa được cấp quyền xem lịch sử." };
  }
  const cay = await layCay(q);
  const loc: Parameters<typeof timLichSu>[2] = { gioi_han: gioiHan(args, 30, 100) };
  const tu = argStr(args, "tu");
  const den = argStr(args, "den");
  if (tu !== "") loc.tu = tu;
  if (den !== "") loc.den = den;
  const hoiDv = argStr(args, "don_vi");
  if (hoiDv !== "") {
    const dv = timDonVi(cay, hoiDv);
    if (!dv) return { ok: false, summary: `Không nhận ra đơn vị "${hoiDv}".` };
    loc.don_vi_id = dv.id;
  }
  const hoiNguoi = argStr(args, "nguoi");
  if (hoiNguoi !== "") {
    const ng = /^(toi|tôi|minh|mình)$/i.test(hoiNguoi) ? [{ id: ctx.nd.id }] : await timNguoi(q, hoiNguoi);
    if (ng.length !== 1) return { ok: false, summary: ng.length === 0 ? `Không tìm thấy người "${hoiNguoi}".` : `"${hoiNguoi}" khớp nhiều người — hỏi lại rõ tên.` };
    loc.nguoi = ng[0]!.id;
  }
  const hd = argStr(args, "hanh_dong");
  if (hd !== "") loc.hanh_dong = hd;
  const tk = argStr(args, "tu_khoa");
  if (tk !== "") loc.tu_khoa = tk;
  const ds = await goi("lịch sử", () => timLichSu(q, ctx.nd, loc));
  const thay = ds.filter((d) => thayLichSu(ctx.nd, cay, d));
  return {
    ok: true,
    summary: `Lịch sử: ${thay.length} dòng khớp.`,
    data: { dong: await gonLichSu(q, thay) },
  };
}

// ===== MẪU WORD =====

async function toolDanhSachMau(_ctx: ToolContext, q: Q): Promise<ToolResult> {
  const ds = await goi("mẫu Word", () => danhSachMau(q));
  const cay = await layCay(q);
  const ten = (id: string | null) => (id ? cay.find((d) => d.id === id)?.ten_ngan ?? id : null);
  return {
    ok: true,
    summary: `${ds.length} mẫu Word đang dùng.`,
    data: {
      mau: ds.map((m) => ({
        ma: m.ma,
        ten: m.ten,
        don_vi_lap: ten(m.don_vi_lap),
        gui_den_mac_dinh: ten(m.gui_den_mac_dinh),
        ky: m.loai_ky,
        o_bat_buoc: m.dinh_nghia.o_nhap.filter((o) => o.bat_buoc).map((o) => o.nhan),
        bang_sinh_viec: m.dinh_nghia.bang_cong_viec.map((b) => b.nhan),
        muc_bat_buoc: m.dinh_nghia.muc_bat_buoc,
        phien_ban: m.phien_ban,
      })),
      link: "/mau-word",
    },
  };
}

async function toolKiemTraMau(ctx: ToolContext, q: Q, args: Record<string, unknown>): Promise<ToolResult> {
  const id = argStr(args, "tai_lieu_id") || argStr(args, "id");
  if (id === "") return { ok: false, summary: "Thiếu tai_lieu_id." };
  const quyen = await kiemQuyenXem(ctx, q, id);
  if (!quyen.ok) return quyen;
  const pb = argNum(args, "phien_ban") ?? undefined;
  const { thong_tin, noi_dung } = await goi("thư mục (đọc phiên bản tài liệu)", () => docPhienBanDu(q, id, pb, ctx.nd));
  const kq = await goi("kiểm tra theo mẫu", () => kiemTraTaiLieu(q, ctx.nd, noi_dung, thong_tin.ten_tep));
  const chan = kq.loi.filter((l) => l.muc === "chan").length;
  return {
    ok: true,
    summary: `Kiểm tra "${quyen.ten}": ${kq.dat ? "ĐẠT" : `KHÔNG ĐẠT (${chan} lỗi chặn gửi)`} · ${kq.cong_viec.length} việc đọc được.`,
    data: { ket_qua: khoiKiemTra(kq), link: `/tai-lieu/${id}` },
  };
}

// ===== ĐIỀU HƯỚNG + INTERNET =====

function toolMoTrang(args: Record<string, unknown>): ToolResult {
  let p = argStr(args, "path") || argStr(args, "duong_dan");
  if (p === "") return { ok: false, summary: "Thiếu đường dẫn trang cần mở." };
  if (p.indexOf("/") !== 0) p = `/${p}`;
  if (p.length > 1) p = p.replace(/\/+$/, "");
  const moi = chuanHoaLink(p);
  if (!moi || !moi.startsWith("/") || moi.startsWith("/api/")) {
    return { ok: false, summary: `Đường dẫn "${p}" không mở được. Chỉ mở được: ${MO_TA_LINK}.` };
  }
  p = moi;
  return { ok: true, summary: `Đã mở trang ${p}.`, data: { path: p }, uiAction: { type: "navigate", path: p } };
}

/**
 * TÌM TRÊN INTERNET — giữ nguyên hai chốt chặn của bản gốc:
 *  ① Chỉ chạy khi người dùng BẬT nút 🌐 (ctx.timWebBat).
 *  ② Không bao giờ ném ngoại lệ.
 */
async function toolTimKiemWeb(ctx: ToolContext, args: Record<string, unknown>): Promise<ToolResult> {
  if (ctx.timWebBat !== true) {
    return {
      ok: false,
      summary: "Chế độ tìm trên internet đang TẮT. Bấm nút 🌐 cạnh ô nhập để bật rồi hỏi lại — mình chỉ ra ngoài internet khi bạn cho phép.",
    };
  }
  const query = argStr(args, "query");
  if (query === "") return { ok: false, summary: "Thiếu từ khoá tìm kiếm." };
  const kq = await timVaDocWeb(query);
  if (kq.ketQua.length === 0) return { ok: false, summary: kq.loi ?? "Không tìm thấy kết quả nào trên internet." };
  return {
    ok: true,
    summary: `Đã tìm trên internet qua ${tenNha(kq.nha)}: ${kq.ketQua.length} kết quả cho "${query}".`,
    data: { nguon: tenNha(kq.nha), noiDung: xepKetQua(kq.ketQua), trang: kq.ketQua.map((k) => ({ tieuDe: k.tieuDe, link: k.link })) },
  };
}

// ===== Chống prompt injection cho công cụ GHI (giữ khung bản gốc) =====

/** Mẫu ý định ghi theo từng công cụ ghi. Bộ công cụ SCI công việc hiện chỉ đọc nên rỗng. */
const WRITE_INTENT: Record<string, RegExp[]> = {};

function userAskedForWrite(toolName: string, userMessage: string | undefined): boolean {
  const rules = WRITE_INTENT[toolName];
  if (!rules) return false; // công cụ ghi chưa khai mẫu ý định → KHÔNG chạy (an toàn hơn bản gốc)
  const msg = boDau(typeof userMessage === "string" ? userMessage : "");
  if (msg === "") return false;
  return rules.every((re) => re.test(msg));
}

// ===== Điều phối =====

/** Đợt 5 (KE-HOACH/31): hỏi chéo qua Main — xem lib/ai/hoi-main.ts */
async function toolHoiMain(ctx: ToolContext, args: Record<string, unknown>): Promise<ToolResult> {
  const cau = argStr(args, "cau_hoi");
  if (cau.length < 5) return { ok: false, summary: "Thiếu câu hỏi gửi Main." };
  // Đường «lai»: biết rõ công cụ thì Main chạy bằng code, không AI. Công việc không gắn dự án nên Main tự chọn dự án đầu tiên người hỏi vào được
  const congCu = argStr(args, "cong_cu");
  if (congCu !== "") {
    const thamSo = args.tham_so !== null && typeof args.tham_so === "object" && !Array.isArray(args.tham_so) ? (args.tham_so as Record<string, unknown>) : {};
    const kqCode = await chuyenCongCuQuaMain(congCu, thamSo, cau, ctx.nd.email, "");
    if (!kqCode.ok) return { ok: false, summary: `Main chưa chạy được ${congCu}: ${kqCode.loi}` };
    return { ok: true, summary: `Main trả (công cụ ${congCu}): ${kqCode.ketQua || "(trống)"}` + (kqCode.canhBao.length ? `\nLưu ý: ${kqCode.canhBao.join(" · ")}` : ""), data: kqCode.duLieu };
  }
  const kq = await hoiMainCauCheo(cau, ctx.nd.email);
  if (!kq.ok) return { ok: false, summary: `Main chưa trả lời được: ${kq.loi}` };
  return {
    ok: true,
    summary: `🤖 Main trả lời (hỏi chéo): ${kq.traLoi || "(trống)"}` + (kq.canhBao.length ? `
Lưu ý: ${kq.canhBao.join(" · ")}` : ""),
    data: { cong_cu_main_da_goi: kq.congCu },
  };
}

/**
 * Chạy 1 công cụ theo tên do mô hình đề xuất. KHÔNG throw trong mọi tình
 * huống — tên lạ, args sai kiểu, thiếu quyền, module chưa xong đều thành
 * { ok:false, summary }.
 */
/** Lọc link trong dữ liệu công cụ (đệ quy): trường link / lien_ket đổi sang dạng được dùng (lib/ai/trang-co-that.ts), không được
 *  dùng thì xoá — AI không còn thấy link lạ để chép vào câu trả lời (Mr. Đại 01/10: "loại bỏ hoàn toàn các link lạ"). */
function locLinkDuLieu(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(locLinkDuLieu);
  if (v === null || typeof v !== "object") return v;
  const ra: Record<string, unknown> = {};
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
    if ((k === "link" || k === "lien_ket") && typeof x === "string") {
      const moi = chuanHoaLink(x);
      if (moi) ra[k] = moi;
    } else ra[k] = locLinkDuLieu(x);
  }
  return ra;
}

export async function runTool(name: string, args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const kq = await runToolTho(name, args, ctx);
  return kq.data === undefined ? kq : { ...kq, data: locLinkDuLieu(kq.data) as ToolResult["data"] };
}

async function runToolTho(name: string, args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const safeArgs: Record<string, unknown> = args !== null && typeof args === "object" && !Array.isArray(args) ? args : {};

  const spec = TOOL_SPECS.find((s) => s.name === name);
  if (!spec) return { ok: false, summary: `Không có công cụ tên "${name}" — bỏ qua yêu cầu này.` };
  if (spec.writes === true && !userAskedForWrite(spec.name, ctx.userMessage)) {
    return {
      ok: false,
      summary: `Mình KHÔNG tự chạy "${spec.name}" vì tin nhắn cuối của bạn không yêu cầu rõ ràng việc ghi dữ liệu này.`,
    };
  }

  try {
    const q = ctx.q ?? (await layQ());
    switch (spec.name) {
      case "thumuc.cay":
        return await toolCay(ctx, q, safeArgs);
      case "thumuc.liet_ke":
        return await toolLietKe(ctx, q, safeArgs);
      case "thumuc.doc":
        return await toolDoc(ctx, q, safeArgs);
      case "socai.danh_sach_viec":
        return await toolDanhSachViec(ctx, q, safeArgs);
      case "socai.viec_cua_don_vi":
        return await toolDanhSachViec(ctx, q, safeArgs, "socai.viec_cua_don_vi");
      case "socai.chi_tiet_viec":
        return await toolChiTietViec(ctx, q, safeArgs);
      case "lichsu.tra_cuu_viec":
        return await toolViecDaXong(ctx, q, safeArgs);
      case "lichsu.doi_tuong":
        return await toolLichSuDoiTuong(ctx, q, safeArgs);
      case "lichsu.tim":
        return await toolTimLichSu(ctx, q, safeArgs);
      case "baocao.tinh_hinh_nop":
        return await toolTinhHinhNop(q, safeArgs);
      case "mau.danh_sach":
        return await toolDanhSachMau(ctx, q);
      case "mau.kiem_tra":
        return await toolKiemTraMau(ctx, q, safeArgs);
      case "mo_trang":
        return toolMoTrang(safeArgs);
      case "hoi_main":
        return await toolHoiMain(ctx, safeArgs);
      case "tim_kiem_web":
        return await toolTimKiemWeb(ctx, safeArgs);
      default:
        return { ok: false, summary: `Công cụ "${spec.name}" chưa được cài đặt.` };
    }
  } catch (e) {
    if (e instanceof LoiDichVu) return { ok: false, summary: e.message };
    // Lưới an toàn cuối cùng — không để lỗi lạ làm hỏng cả lượt chat
    return { ok: false, summary: `Lỗi khi chạy "${spec.name}": ${e instanceof Error ? e.message : String(e)}` };
  }
}

/** Danh mục công cụ người này dùng được (để lọc prompt) — hiện mọi công cụ đều chỉ đọc, tự kiểm quyền bên trong */
export function congCuDuocDung(nd: NguoiDungPhien): string[] {
  return TOOL_SPECS.filter((s) => {
    if (s.name.startsWith("socai.") || s.name === "lichsu.tra_cuu_viec") return nd.la_quan_tri || !!nd.quyen["so_cai.xem"];
    if (s.name === "lichsu.doi_tuong" || s.name === "lichsu.tim") return nd.la_quan_tri || !!nd.quyen["lich_su.xem"];
    return true;
  }).map((s) => s.name);
}

