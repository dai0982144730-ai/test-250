// ============================================================
// ai/cua-thong-ke-ai.ts — CỬA "<mã>.thong_ke_ai" MỞ CHO AGENT QUAN SÁT (Quản lý token AI Đợt 3, Mr. Đại chốt 04/10/2026).
// CHỈ SERVER. Bản của agent Công việc — CÙNG KHUÔN TRẢ VỀ với bản Main · Tiến độ · Hợp đồng (khác: tên người tra CSDL theo mã
// người, sổ ở thuMucDuLieu, có sổ cũ trước 04/10).
//
// Agent quan sát gom thống kê dùng AI của 6 agent lên một màn + 🤖 nhận định đêm. Nó KHÔNG đọc đĩa agent khác — chỉ hỏi qua cổng
// MCP (luật 29), nên mỗi agent mở cửa này. Hai cách hỏi:
//   { che_do: ngay|tuan|thang, ngay?: YYYY-MM-DD } → đúng số của tab "📊 Thống kê dùng AI" (múi, tổng, 5 người, 5 tính năng, vệt)
//   { tu_luc, den_luc } (ISO, tối đa 8 ngày)      → TỔNG trong khoảng giờ bất kỳ + 5 người + 5 tính năng + khoảng ngừng + sự
//      kiện tài khoản (hết hạn mức / mất đăng nhập / mồi phiên) — cho nhận định đêm cắt số 07:45 (24 giờ qua; thứ Hai = 7 ngày qua)
// Luôn kèm `tai_khoan`: bật 2 tài khoản chưa, tài khoản nào đăng nhập riêng / hết hạn mức / mất đăng nhập, mấy người đã nối tài
// khoản cá nhân. KHÔNG có email tài khoản Claude, không có mã. Có TÊN người dùng (bảng 5 người) → chỉ quansat đọc được
// (xetLuatQuanSat ở lib/nhat-ky/cua-quan-sat.ts). Chỉ đọc, không LLM.
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { thanhCong, thatBai, type KhuonTra } from "@/lib/mcp/khuon";
import { thuMucDuLieu } from "@/lib/ai/duong-dan";
import { docLuot, docNgung } from "@/lib/ai/so-dung-ai";
import { thuMucCaNhan, tinhHinhTk } from "@/lib/ai/tai-khoan-claude";
import { cacMui, ngayHopLe, ngayVN, tenNguoiLuot, tenTinhNang, tinhThongKe, tongTrongKhoang, type CheDo, type DongXepHang } from "@/lib/ai/thong-ke-ai";

/** Khoảng dài nhất cho cách hỏi tu_luc / den_luc (7 ngày của báo cáo thứ Hai + biên) */
const KHOANG_TOI_DA_MS = 8 * 86_400_000;
const TRAN_SU_KIEN = 200;

/** Tên người theo mã người (identity.nguoi_dung) — thiếu thì để trống, không hỏng cả cửa */
async function bangTen(ids: string[]): Promise<Record<string, string>> {
  const bang: Record<string, string> = {};
  const can = Array.from(new Set(ids.filter((m) => m !== "" && m !== "?")));
  if (!can.length) return bang;
  try {
    const { layQ } = await import("@/lib/db");
    const q = await layQ();
    const r = await q.query<{ id: string; ten: string }>("SELECT id, ten FROM identity.nguoi_dung WHERE id = ANY($1)", [can]);
    for (const x of r.rows) bang[x.id] = x.ten;
  } catch {
    /* CSDL chưa mở — hiện mã */
  }
  return bang;
}

/** Gắn tên người + tên tính năng cho bảng 5 dòng (luật 30: không để mã trần) */
function ganTen(topNguoi: DongXepHang[], topTinhNang: DongXepHang[], bang: Record<string, string>) {
  return {
    topNguoi: topNguoi.map((r) => ({ ...r, ten: tenNguoiLuot(r.ma, bang) })),
    topTinhNang: topTinhNang.map((r) => ({ ...r, ten: tenTinhNang(r.ma) })),
  };
}

/** Tình hình tài khoản — không email, không mã */
async function tomTatTaiKhoan() {
  const th = await tinhHinhTk();
  let soCaNhan = 0;
  try {
    const goc = path.dirname(thuMucCaNhan("x"));
    for (const d of fs.readdirSync(goc)) if (fs.existsSync(path.join(goc, d, ".credentials.json"))) soCaNhan++;
  } catch {
    /* chưa ai nối */
  }
  return {
    hai_tai_khoan: th.hai_tai_khoan,
    dao_vai_24h: th.dao_vai_24h,
    moi_phien_bat: th.moi_phien_bat,
    moi_phien_gio: th.moi_phien_gio,
    chinh: th.chinh,
    tai_khoan: th.tai_khoan.map((t) => ({
      so: t.so,
      dang_nhap_rieng: t.dang_nhap_rieng,
      het_den: t.het_den,
      mat_dang_nhap: t.mat_dang_nhap,
      dang_chay: t.dang_chay,
    })),
    so_nguoi_noi_ca_nhan: soCaNhan,
  };
}

/** Sự kiện tài khoản trong khoảng (data/ai-tai-khoan.jsonl: hết hạn mức · mất đăng nhập · mồi phiên…), mới nhất trước */
function docSuKien(tuMs: number, denMs: number, bang: Record<string, string>): Record<string, unknown>[] {
  let s = "";
  try {
    s = fs.readFileSync(thuMucDuLieu("ai-tai-khoan.jsonl"), "utf8");
  } catch {
    return [];
  }
  const ra: Record<string, unknown>[] = [];
  for (const dong of s.split("\n")) {
    if (!dong.trim()) continue;
    try {
      const o = JSON.parse(dong) as Record<string, unknown>;
      const t = typeof o.luc === "string" ? Date.parse(o.luc) : NaN;
      if (t >= tuMs && t < denMs) {
        // mã người dùng tài khoản cá nhân → tên
        if (typeof o.nguoi === "string") o.nguoi = bang[o.nguoi] ?? o.nguoi;
        ra.push(o);
      }
    } catch {
      /* dòng hỏng bỏ qua */
    }
  }
  return ra.reverse().slice(0, TRAN_SU_KIEN);
}

/** Mã người xuất hiện trong sự kiện tài khoản cá nhân của khoảng (để tra tên một lượt) */
function nguoiSuKien(tuMs: number, denMs: number): string[] {
  return docSuKien(tuMs, denMs, {})
    .map((o) => o.nguoi)
    .filter((x): x is string => typeof x === "string");
}

const NGUON = (tenAgent: string, viTri: string) => [
  {
    loai: "so-dung-ai",
    ma: "ai.so_dung_ai",
    file_goc: "data/ai-so-dung.jsonl",
    vi_tri: viTri,
    thoi_diem_trich: new Date().toISOString(),
    trang_thai: `Sổ dùng AI của ${tenAgent} (mỗi lượt gọi AI một dòng) + data/ai-ngung.jsonl + data/ai-tai-khoan.jsonl`,
  },
];

export async function chayThongKeAi(thamSo: Record<string, unknown>, tenAgent: string): Promise<KhuonTra> {
  try {
    const bayGio = Date.now();
    const taiKhoan = await tomTatTaiKhoan();
    const tuLuc = thamSo.tu_luc;
    const denLuc = thamSo.den_luc;
    if (tuLuc !== undefined || denLuc !== undefined) {
      const tuMs = typeof tuLuc === "string" ? Date.parse(tuLuc) : NaN;
      const denMs = typeof denLuc === "string" ? Date.parse(denLuc) : NaN;
      if (!Number.isFinite(tuMs) || !Number.isFinite(denMs) || denMs <= tuMs) {
        return thatBai("KHONG_HIEU_YEU_CAU", "`tu_luc` và `den_luc` phải là thời điểm ISO, `den_luc` sau `tu_luc` (ví dụ 2026-10-04T00:45:00Z).");
      }
      if (denMs - tuMs > KHOANG_TOI_DA_MS) return thatBai("KHONG_HIEU_YEU_CAU", "Khoảng hỏi dài nhất 8 ngày — hỏi theo che_do tuan/thang cho kỳ dài hơn.");
      const kq = tongTrongKhoang({ luot: docLuot(tuMs, denMs).luot, ngung: docNgung(tuMs, denMs), tuMs, denMs, bayGio });
      const bang = await bangTen([...kq.topNguoi.map((r) => r.ma), ...nguoiSuKien(tuMs, denMs)]);
      return thanhCong(
        {
          kieu: "khoang",
          tu_luc: new Date(tuMs).toISOString(),
          den_luc: new Date(denMs).toISOString(),
          ...kq,
          ...ganTen(kq.topNguoi, kq.topTinhNang, bang),
          su_kien: docSuKien(tuMs, denMs, bang),
          tai_khoan: taiKhoan,
        },
        NGUON(tenAgent, `${kq.tong.luot.toLocaleString("vi-VN")} lượt trong khoảng`),
      );
    }
    const cd = thamSo.che_do;
    const cheDo: CheDo = cd === "tuan" || cd === "thang" ? cd : "ngay";
    const ngayHoi = thamSo.ngay;
    if (ngayHoi !== undefined && !ngayHopLe(ngayHoi)) return thatBai("KHONG_HIEU_YEU_CAU", "`ngay` ghi dạng năm-tháng-ngày, ví dụ 2026-10-04.");
    const ngay = (ngayHoi as string | undefined) ?? ngayVN(bayGio);
    const mui = cacMui(cheDo, ngay);
    const tu = mui[0].tuMs;
    const den = mui[mui.length - 1].denMs;
    const { luot, coSoCu } = docLuot(tu, den);
    const tk = tinhThongKe({ luot, ngung: docNgung(tu, den), cheDo, ngay, bayGio, coSoCu });
    return thanhCong(
      { kieu: "ky", ...tk, homNay: ngayVN(bayGio), ...ganTen(tk.topNguoi, tk.topTinhNang, await bangTen(tk.topNguoi.map((r) => r.ma))), tai_khoan: taiKhoan },
      NGUON(tenAgent, `${tk.tieuDe} · ${tk.tong.luot.toLocaleString("vi-VN")} lượt`),
    );
  } catch (e) {
    return thatBai("LOI_NOI_BO", `Không đọc được sổ dùng AI của ${tenAgent}: ${e instanceof Error ? e.message : String(e)}`);
  }
}
