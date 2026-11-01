// ============================================================
// VIỆC CỦA TÔI — ĐỌC VÀ GIAO QUA AGENT CÔNG VIỆC (Mr. Đại chốt 04/10/2026 — CHOT LOI-DUNG-CHUNG 6g.7 mục 3)
//
// Thay lib/chung/viec.ts (Base.vn). Màn Việc của tôi thu gọn còn 2 khối:
//   ① Việc AI soạn chờ duyệt — NGƯỜI chọn người/đơn vị nhận rồi bấm Gửi → thành việc thật ở agent Công việc
//      (cửa /api/cay-viec/soan-giao, lệnh `giao`; như màn Duyệt giao việc của Pháp lý — "duyệt tại chỗ").
//   ② Việc của tôi đọc từ agent Công việc theo 3 nút của bên đó (công cụ `base.viec_cua_toi`):
//      Việc tôi giao · Việc tôi nhận · Việc cần phối hợp. Bấm một việc → mở ở agent Công việc.
// Mã nội bộ "base" = agent Công việc (giữ mã, Mr. Đại chốt 03/10). Server-only.
// Luật 29: mọi lượt gọi đi qua hàm bọc ghi sổ — hàm gọi thật `goiCuaGiaoTho` KHÔNG export.
// ============================================================

import { hoiAgent, noiGoi } from "@/lib/nguon/hoi-agent";
import { goiCoGhi } from "@/lib/nhat-ky/so";
import { headerChuoi } from "@/lib/nhat-ky/chuoi";
import { khoaNoiBo } from "@/lib/day-sang-agent";
import { docBiDanhTaiKhoan } from "@/lib/bi-danh-tai-khoan";
import { listProjects } from "@/lib/projects";
import { danhDauDaGiao, docNhapCua, nhapTheoThe, xoaNhap } from "@/lib/chung/viec-ai-soan";
import type { LoaiViecToi, NguoiNhanCV, NhapHien, TepCV, ViecCV, ViecCuaToiCV } from "@/lib/chung/viec-cong-viec-kieu";

const MA_AGENT_NAY = "main";
const HAN_CHO_MS = 15_000;

export type { ViecCV, LoaiViecToi, ViecCuaToiCV, NguoiNhanCV, NhapHien, TepCV } from "@/lib/chung/viec-cong-viec-kieu";

/** Địa chỉ agent Công việc để TRÌNH DUYỆT mở (127.0.0.1 → localhost: phiên đăng nhập bên đó gắn theo tên máy) */
export function gocCongViec(): string {
  const d = noiGoi("base").diaChi || "http://localhost:3004";
  return d.replace("//127.0.0.1", "//localhost");
}

const RONG: Record<LoaiViecToi, ViecCV[]> = { giao: [], nhan: [], phoi_hop: [] };

/** Việc của một người theo 3 nút (maDuAn rỗng = mọi dự án) */
export async function layViecCuaToiCV(email: string, maDuAn?: string): Promise<ViecCuaToiCV> {
  const kq = await hoiAgent(
    "base",
    "base.viec_cua_toi",
    `${email} mở màn Việc của tôi${maDuAn ? ` (dự án ${maDuAn})` : ""} — đọc việc của mình ở agent Công việc`,
    { tham_so: { nguoi: email, ...(maDuAn ? { ma_du_an: maDuAn } : {}) }, ma_nguoi_dung: email },
  );
  if (!kq.ok) return { ok: false, dem: { giao: 0, nhan: 0, phoi_hop: 0 }, ds: RONG, loi: kq.thong_diep };
  const d = kq.du_lieu as {
    dem?: Partial<Record<LoaiViecToi, number>>;
    viec_giao?: ViecCV[];
    viec_nhan?: ViecCV[];
    viec_phoi_hop?: ViecCV[];
    lam_xong?: { nhan?: string; giai_thich?: string; viec_giao?: ViecCV[]; viec_nhan?: ViecCV[]; viec_phoi_hop?: ViecCV[] };
  };
  const x = d.lam_xong;
  return {
    ok: true,
    dem: { giao: d.dem?.giao ?? 0, nhan: d.dem?.nhan ?? 0, phoi_hop: d.dem?.phoi_hop ?? 0 },
    ds: { giao: d.viec_giao ?? [], nhan: d.viec_nhan ?? [], phoi_hop: d.viec_phoi_hop ?? [] },
    ...(x?.nhan
      ? { lamXong: { nhan: x.nhan, giaiThich: x.giai_thich ?? "", ds: { giao: x.viec_giao ?? [], nhan: x.viec_nhan ?? [], phoi_hop: x.viec_phoi_hop ?? [] } } }
      : {}),
  };
}

// ─────────────────────────────────────────────────────────────
// Nháp AI soạn — của chính người xem, kể cả nháp đứng tên email cũ đã gộp (bí danh 6g.6)
// ─────────────────────────────────────────────────────────────

/** Các khoá "nguoi" của nháp thuộc về người này: phần trước @ của email + của mọi email cũ đã gộp/chuyển về */
export function khoaNhapCua(email: string): string[] {
  const e = email.trim().toLowerCase();
  const khoa = new Set([e.split("@")[0]]);
  for (const b of docBiDanhTaiKhoan()) if (b.email_moi === e) khoa.add(b.email_cu.split("@")[0]);
  return Array.from(khoa);
}

function maNganCua(projectId: string | undefined): string {
  if (!projectId) return "";
  return listProjects().find((p) => p.id === projectId)?.ma ?? "";
}

export function nhapCuaToi(email: string): NhapHien[] {
  // Thẻ đã giao (qua bất kỳ nháp nào của thẻ, của bất kỳ ai) → mọi nháp còn lại của thẻ đó là rác, ẩn (Mr. Đại bắt 04/10)
  const theDaGiao = new Set(Object.entries(nhapTheoThe(khoaNhapCua(email))).filter(([, v]) => v.maViec !== undefined).map(([k]) => k));
  return khoaNhapCua(email)
    .flatMap((k) => docNhapCua(k))
    .filter((n) => !n.tuIssue || !theDaGiao.has(n.tuIssue))
    .sort((a, b) => b.luc.localeCompare(a.luc))
    .map((n) => ({ ...n, maDuAn: maNganCua(n.projectId) }));
}

export function boNhapCuaToi(id: string, email: string): boolean {
  return khoaNhapCua(email).some((k) => xoaNhap(id, k));
}

/** Giao xong một nháp → ĐÁNH DẤU đã giao (kèm các bản trùng) thay vì xoá — giữ vết cho thẻ cảnh báo, máy khỏi soạn lại */
export function daGiaoNhapCuaToi(id: string, email: string, maViec: string | null): boolean {
  return khoaNhapCua(email).some((k) => danhDauDaGiao(id, k, maViec) > 0);
}

/** Thẻ cảnh báo nào đã có nháp của người này / đã giao — để ẩn nút "AI soạn việc giao" (Mr. Đại chốt 04/10) */
export function nhapTheoTheCuaToi(email: string): Record<string, { coNhap: boolean; maViec?: string | null }> {
  return nhapTheoThe(khoaNhapCua(email));
}

/** Dự án chọn được trong ô "Dự án" (chỉ dự án có mã ngắn — agent Công việc nhận theo mã) */
export function duAnChonDuoc(): { ma: string; ten: string }[] {
  return listProjects()
    .filter((p) => p.ma)
    .map((p) => ({ ma: p.ma!, ten: p.name }));
}

// ─────────────────────────────────────────────────────────────
// Cửa /api/cay-viec/soan-giao của agent Công việc
// ─────────────────────────────────────────────────────────────

/** Gọi thật — KHÔNG export (luật 29) */
async function goiCuaGiaoTho(than: Record<string, unknown>): Promise<Record<string, unknown>> {
  const noi = noiGoi("base");
  if (noi.loi) return { ok: false, ma_loi: "AGENT_KHONG_SAN_SANG", thong_diep: noi.loi };
  const ngat = new AbortController();
  const dongHo = setTimeout(() => ngat.abort(), HAN_CHO_MS);
  try {
    const r = await fetch(`${noi.diaChi}/api/cay-viec/soan-giao`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-sci-noi-bo": khoaNoiBo(), ...headerChuoi() },
      signal: ngat.signal,
      cache: "no-store",
      body: JSON.stringify({ agent_goi: MA_AGENT_NAY, ...than }),
    });
    const j = (await r.json().catch(() => null)) as Record<string, unknown> | null;
    if (!j) return { ok: false, ma_loi: "LOI_NOI_BO", thong_diep: `agent Công việc trả mã ${r.status}, không đọc được nội dung` };
    if (typeof j.ok !== "boolean") return { ok: false, ma_loi: "LOI_NOI_BO", thong_diep: String(j.loi ?? j.message ?? `mã ${r.status}`) };
    return j;
  } catch (e) {
    if (ngat.signal.aborted) return { ok: false, ma_loi: "HET_HAN_CHO", thong_diep: `agent Công việc không thưa trong ${HAN_CHO_MS / 1000} giây` };
    return { ok: false, ma_loi: "AGENT_KHONG_SAN_SANG", thong_diep: `Không nối được agent Công việc ở ${noi.diaChi}: ${e instanceof Error ? e.message : String(e)}` };
  } finally {
    clearTimeout(dongHo);
  }
}

const NHO_DS_MS = 10 * 60_000;
// Nhớ RIÊNG từng người bấm (như Pháp lý): người không có quyền Giao việc thấy ngay câu lý do, không ăn bản nhớ người khác
const nhoDs = new Map<string, { luc: number; ds: NguoiNhanCV }>();

/** Danh sách người + đơn vị nhận việc (lấy từ agent Công việc, theo quyền Giao việc của người bấm) */
export async function dsNguoiNhanCV(email: string): Promise<{ ok: true; ds: NguoiNhanCV } | { ok: false; loi: string }> {
  const nho = nhoDs.get(email);
  if (nho && Date.now() - nho.luc < NHO_DS_MS) return { ok: true, ds: nho.ds };
  const lyDo = `${email} cần chọn người/đơn vị nhận việc — lấy danh sách của agent Công việc`;
  const j = await goiCoGhi(
    { agentTraLoi: "base", congCu: "base.danh_sach_nguoi_nhan (cửa soan-giao)", thamSo: { nguoi_bam: email }, lyDoGoi: lyDo, duong: "A", nguoi: email },
    () => goiCuaGiaoTho({ ds_nguoi: true, nguoi_bam: email, ly_do_goi: lyDo }),
    (k) => ({
      traLoiGon: k.ok
        ? `${(k.nguoi as unknown[] | undefined)?.length ?? 0} người · ${(k.don_vi as unknown[] | undefined)?.length ?? 0} đơn vị`
        : String(k.thong_diep ?? "agent Công việc từ chối").slice(0, 160),
    }),
  );
  if (!j.ok) return { ok: false, loi: String(j.thong_diep ?? "agent Công việc từ chối") };
  const ds: NguoiNhanCV = {
    nguoi: Array.isArray(j.nguoi) ? (j.nguoi as NguoiNhanCV["nguoi"]) : [],
    don_vi: Array.isArray(j.don_vi) ? (j.don_vi as NguoiNhanCV["don_vi"]) : [],
    nhom: j.nhom && typeof j.nhom === "object" ? (j.nhom as NguoiNhanCV["nhom"]) : undefined,
    du_an: Array.isArray(j.du_an) ? (j.du_an as NonNullable<NguoiNhanCV["du_an"]>) : [],
    dinh_kem: j.dinh_kem && typeof j.dinh_kem === "object" ? (j.dinh_kem as NguoiNhanCV["dinh_kem"]) : undefined,
  };
  nhoDs.set(email, { luc: Date.now(), ds });
  return { ok: true, ds };
}

/** Hôm nay theo giờ Việt Nam, "yyyy-mm-dd" */
export function homNayIso(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
}

/** "dd/mm/yyyy" hoặc "yyyy-mm-dd" → "yyyy-mm-dd"; không hiểu → null */
export function hanIso(han: string | null | undefined): string | null {
  const s = (han ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : null;
}

/**
 * ⛔ CHỖ DUY NHẤT Main GHI VIỆC SANG AGENT CÔNG VIỆC — chỉ gọi sau cú bấm Gửi của người (chốt 2.3 + 6g.7).
 * `giaoCho` = mã người hoặc mã đơn vị của agent Công việc. `nguon` nói việc từ đâu ra để ghi sổ.
 */
export async function giaoSangCongViec(v: {
  email: string;
  /** Rỗng = việc không thuộc dự án nào (dự án không bắt buộc như ô "+" — Mr. Đại chốt 04/10 chiều) */
  maDuAn: string;
  ten: string;
  han: string | null;
  giaoCho: string;
  canCu: string;
  /** Kết quả cần có đúng như người đã sửa ở ô giao việc */
  ketQua?: string;
  /** Mã tệp đã chuyển sang kho đính kèm agent Công việc (taiTepSangCongViec) */
  dinhKem?: string[];
  nguon: string;
  /** Chữ do máy ghép (Bảng điều hành), không phải AI soạn — bên kia không gắn 🤖 */
  khongAi?: boolean;
  /** Mã WBS của issue nguồn (nháp soạn từ thẻ) — agent Công việc gắn mã cho việc, issue găng cùng mã bên đó biết đã có người giữ.
   *  04/10 kiểm lần 4: gửi rỗng → CV-2026-0132 (6.1.4) không gắn mã, màn Cảnh báo agent Công việc vẫn cho giao lần hai */
  maWbs?: string;
  tenWbs?: string;
}): Promise<{ ok: true; maViec: string | null } | { ok: false; loi: string }> {
  // KHÔNG GỬI VIỆC CÓ HẠN ĐÃ QUA (Mr. Đại chốt 04/10/2026 tối) — chặn ở máy chủ trước khi gọi agent Công việc
  // (nút Giao việc thẳng trên nháp, trợ lý chat, Bảng điều hành đều đi qua đây). Agent Công việc cũng chặn lần nữa.
  const hanGui = hanIso(v.han);
  if (hanGui && hanGui < homNayIso()) return { ok: false, loi: `Hạn ${hanGui.split("-").reverse().join("/")} đã qua — bấm Sửa chọn hạn từ hôm nay trở đi rồi mới giao.` };
  const lyDo = `NGƯỜI (${v.email}) bấm Gửi ở ${v.nguon} — duyệt tại chỗ ở Main (6g.7)`;
  const j = await goiCoGhi(
    {
      agentTraLoi: "base",
      congCu: "base.giao_viec (cửa soan-giao)", // không chứa "/" — chuanHoaBen gắn nhầm Base.vn (đo 04/10)
      thamSo: { ma_du_an: v.maDuAn, ma_wbs: v.maWbs ?? "", giao_cho: v.giaoCho, han: v.han },
      lyDoGoi: lyDo,
      duong: "A",
      duAn: v.maDuAn,
      nguoi: v.email,
    },
    () =>
      goiCuaGiaoTho({
        ...(v.maDuAn ? { du_an: v.maDuAn } : {}),
        nguoi_bam: v.email,
        ly_do_goi: lyDo,
        giao: {
          ma_wbs: v.maWbs ?? "",
          ...(v.tenWbs ? { ten_wbs: v.tenWbs } : {}),
          ten: v.ten,
          ten_day_du: v.ten,
          han: v.han ?? undefined,
          giao_cho: v.giaoCho,
          can_cu: v.canCu,
          ...(v.ketQua !== undefined ? { ket_qua: v.ketQua } : {}),
          ...(v.dinhKem?.length ? { dinh_kem: v.dinhKem } : {}),
          khong_ai: v.khongAi === true,
        },
      }),
    (k) => ({
      traLoiGon: k.ok ? `đã tạo việc ${String(k.ma_viec ?? "?")} · giao ${v.giaoCho}` : String(k.thong_diep ?? "agent Công việc từ chối").slice(0, 160),
    }),
  );
  if (!j.ok) return { ok: false, loi: String(j.thong_diep ?? "agent Công việc từ chối") };
  return { ok: true, maViec: typeof j.ma_viec === "string" ? j.ma_viec : null };
}

// ─────────────────────────────────────────────────────────────
// 📎 Chuyển một tệp kẹp sang kho đính kèm của agent Công việc (Mr. Đại chốt 04/10 chiều: ô giao việc "giống ô +" phải gửi
// được tệp). Trình duyệt không có phiên agent Công việc → Main nhận tệp rồi chuyển máy-máy (khoá nội bộ + email người bấm).
// ─────────────────────────────────────────────────────────────

/** Gọi thật — KHÔNG export (luật 29) */
async function taiTepTho(email: string, tep: File): Promise<Record<string, unknown>> {
  const noi = noiGoi("base");
  if (noi.loi) return { ok: false, ma_loi: "AGENT_KHONG_SAN_SANG", thong_diep: noi.loi };
  const fd = new FormData();
  fd.set("agent_goi", MA_AGENT_NAY);
  fd.set("nguoi_bam", email);
  fd.set("tep", tep, tep.name);
  const ngat = new AbortController();
  const dongHo = setTimeout(() => ngat.abort(), 60_000);
  try {
    const r = await fetch(`${noi.diaChi}/api/cay-viec/soan-giao/tep`, {
      method: "POST",
      headers: { "x-sci-noi-bo": khoaNoiBo(), ...headerChuoi() },
      signal: ngat.signal,
      cache: "no-store",
      body: fd,
    });
    const j = (await r.json().catch(() => null)) as Record<string, unknown> | null;
    if (!j || typeof j.ok !== "boolean") return { ok: false, ma_loi: "LOI_NOI_BO", thong_diep: `agent Công việc trả mã ${r.status}, không đọc được nội dung` };
    return j;
  } catch (e) {
    if (ngat.signal.aborted) return { ok: false, ma_loi: "HET_HAN_CHO", thong_diep: "agent Công việc không nhận xong tệp trong 60 giây" };
    return { ok: false, ma_loi: "AGENT_KHONG_SAN_SANG", thong_diep: `Không nối được agent Công việc ở ${noi.diaChi}: ${e instanceof Error ? e.message : String(e)}` };
  } finally {
    clearTimeout(dongHo);
  }
}

export async function taiTepSangCongViec(email: string, tep: File): Promise<{ ok: true; tep: TepCV } | { ok: false; loi: string }> {
  const lyDo = `${email} kẹp tệp "${tep.name}" ở ô giao việc của Main — chuyển sang kho đính kèm agent Công việc`;
  const j = await goiCoGhi(
    { agentTraLoi: "base", congCu: "base.tai_tep_giao_viec (cửa soan-giao)", thamSo: { ten_tep: tep.name, kich_thuoc: tep.size }, lyDoGoi: lyDo, duong: "A", nguoi: email },
    () => taiTepTho(email, tep),
    (k) => ({ traLoiGon: k.ok ? `đã nhận tệp ${tep.name}` : String(k.thong_diep ?? "agent Công việc từ chối").slice(0, 160) }),
  );
  if (!j.ok) return { ok: false, loi: String(j.thong_diep ?? "agent Công việc từ chối") };
  const t = (j.tep ?? {}) as { id?: string; ten_tep?: string; kich_thuoc?: number };
  if (!t.id) return { ok: false, loi: "agent Công việc không trả mã tệp" };
  return { ok: true, tep: { id: t.id, ten: t.ten_tep ?? tep.name, kich_thuoc: t.kich_thuoc ?? tep.size } };
}

