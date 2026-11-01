// ============================================================
// email/bo-gui.ts — BỘ GỬI THƯ (CHỈ SERVER). Lấy thư trong docflow.hang_doi_email ra gửi.
// - Chạy định kỳ trong tiến trình (khoiDongBoGuiThu, mỗi 60 giây), chống bật trùng; tắt khi test/build/DOCFLOW_TAT_HEN_GIO=1.
// - Thử lại có giới hạn: lỗi thì hẹn lần sau (1, 5, 15, 60 phút...), quá DOCFLOW_EMAIL_SO_LAN_THU (mặc định 5) → 'loi'.
// - DOCFLOW_EMAIL_THU=1: ghi thư ra data/email-thu/*.eml thay vì gửi thật.
// - Chưa cấu hình SMTP: không gửi, không lỗi, trả trạng thái "chưa cấu hình email".
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { Q } from "@/lib/db";
import { layCauHinhGuiThu, type CauHinhGuiThu, type CheDoEmail } from "./cau-hinh";

export interface ThuGui {
  id?: number;
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string | null;
  loai?: string;
}

/** Hàm chuyển thư đi (thật: SMTP / ghi .eml; test: tự truyền vào). Lỗi = ném. */
export type BoChuyen = (thu: ThuGui) => Promise<void>;

const PHUT_CHO = [1, 5, 15, 60, 240];

export function soLanThuToiDa(): number {
  const n = Number(process.env.DOCFLOW_EMAIL_SO_LAN_THU);
  return Number.isInteger(n) && n > 0 ? n : 5;
}

function dinhDangNguoiGui(c: CauHinhGuiThu): string {
  const ten = c.ten_nguoi_gui.replace(/["\\\r\n]/g, "");
  return ten ? `"${ten}" <${c.dia_chi_gui}>` : c.dia_chi_gui;
}

type NodemailerMod = typeof import("nodemailer");
async function napNodemailer(): Promise<NodemailerMod> {
  const m = (await import("nodemailer")) as NodemailerMod & { default?: NodemailerMod };
  return (m.default ?? m) as NodemailerMod;
}

type G = typeof globalThis & {
  __docflowSmtp?: { khoa: string; tp: import("nodemailer").Transporter };
  __docflowBoGuiThu?: { timer: ReturnType<typeof setInterval>; dangChay: boolean; henSom: boolean; daBaoChuaCauHinh: boolean };
};

/** Soạn thư thành nội dung .eml (UTF-8, tiêu đề mã hóa đúng chuẩn MIME). */
export async function taoEml(thu: ThuGui): Promise<Buffer> {
  const nm = await napNodemailer();
  const tp = nm.createTransport({ streamTransport: true, buffer: true, newline: "windows" });
  const info = await tp.sendMail({
    from: thu.from,
    to: thu.to,
    subject: thu.subject,
    text: thu.text,
    ...(thu.html ? { html: thu.html } : {}),
    headers: thu.loai ? { "X-DocFlow-Loai": thu.loai } : undefined,
  });
  return info.message as Buffer;
}

/** Bộ chuyển mặc định theo cấu hình: ghi .eml (chế độ thử) hoặc gửi SMTP. */
export function boChuyenMacDinh(c: CauHinhGuiThu): BoChuyen {
  if (c.che_do === "thu") {
    return async (thu) => {
      const eml = await taoEml(thu);
      fs.mkdirSync(c.thu_muc_thu, { recursive: true });
      const luc = new Date().toISOString().replace(/[-:]/g, "").replace(/\..*$/, "").replace("T", "-");
      const ten = `${luc}-${thu.id ?? "thu"}-${createHash("sha1").update(eml).digest("hex").slice(0, 6)}.eml`;
      fs.writeFileSync(path.join(c.thu_muc_thu, ten), eml);
    };
  }
  if (c.che_do === "smtp") {
    return async (thu) => {
      const nm = await napNodemailer();
      const g = globalThis as G;
      const khoa = createHash("sha256").update([c.may_chu, c.cong, c.bao_mat, c.tai_khoan, c.mat_khau].join("|")).digest("hex");
      if (!g.__docflowSmtp || g.__docflowSmtp.khoa !== khoa) {
        g.__docflowSmtp?.tp.close();
        const tp = nm.createTransport({
          host: c.may_chu,
          port: c.cong,
          secure: c.bao_mat === "ssl",
          requireTLS: c.bao_mat === "starttls",
          ignoreTLS: c.bao_mat === "khong",
          auth: c.tai_khoan ? { user: c.tai_khoan, pass: c.mat_khau } : undefined,
          connectionTimeout: 15_000,
          greetingTimeout: 15_000,
          socketTimeout: 30_000,
        });
        g.__docflowSmtp = { khoa, tp };
      }
      await g.__docflowSmtp.tp.sendMail({
        from: thu.from,
        to: thu.to,
        subject: thu.subject,
        text: thu.text,
        ...(thu.html ? { html: thu.html } : {}),
        headers: thu.loai ? { "X-DocFlow-Loai": thu.loai } : undefined,
      });
    };
  }
  return async () => {
    throw new Error(c.mo_ta);
  };
}

export interface KetQuaGui {
  che_do: CheDoEmail;
  mo_ta: string;
  da_gui: number;
  loi: number; // lần này lỗi (còn thử lại hoặc hết lượt)
  het_luot: number; // chuyển sang 'loi'
  loi_cuoi?: string | null;
}

/**
 * Gửi các thư đến lượt trong hàng đợi. Chưa cấu hình email (và không truyền bộ chuyển riêng) → không làm gì.
 * `chi_id`: chỉ gửi đúng thư đó ngay (bỏ qua giờ hẹn) — dùng cho "gửi thư thử".
 */
export async function guiHangDoi(
  q: Q,
  tc: { gioi_han?: number; chuyen?: BoChuyen; bay_gio?: Date; chi_id?: number } = {},
): Promise<KetQuaGui> {
  const c = await layCauHinhGuiThu(q);
  const kq: KetQuaGui = { che_do: c.che_do, mo_ta: c.mo_ta, da_gui: 0, loi: 0, het_luot: 0 };
  if (c.che_do === "chua_cau_hinh" && !tc.chuyen) return kq;
  const chuyen = tc.chuyen ?? boChuyenMacDinh(c);
  const bayGio = (tc.bay_gio ?? new Date()).toISOString();
  const toiDa = soLanThuToiDa();

  // Thư kẹt 'dang_gui' quá 10 phút (tiến trình chết giữa chừng) → về hàng chờ
  await q.query(
    "UPDATE docflow.hang_doi_email SET trang_thai = 'cho' WHERE trang_thai = 'dang_gui' AND nhan_luc < $1::timestamptz - interval '10 minutes'",
    [bayGio],
  );
  const { rows } = await q.query<{ id: string; den: string; loai: string; tieu_de: string; van_ban: string; html: string | null; so_lan_thu: number }>(
    tc.chi_id !== undefined
      ? `UPDATE docflow.hang_doi_email SET trang_thai = 'dang_gui', nhan_luc = $1::timestamptz
          WHERE id = $2 AND trang_thai IN ('cho','loi') RETURNING id, den, loai, tieu_de, van_ban, html, so_lan_thu`
      : `UPDATE docflow.hang_doi_email SET trang_thai = 'dang_gui', nhan_luc = $1::timestamptz
          WHERE id IN (SELECT id FROM docflow.hang_doi_email WHERE trang_thai = 'cho' AND thu_lai_luc <= $1::timestamptz
                       ORDER BY id LIMIT $2 FOR UPDATE SKIP LOCKED)
          RETURNING id, den, loai, tieu_de, van_ban, html, so_lan_thu`,
    tc.chi_id !== undefined ? [bayGio, tc.chi_id] : [bayGio, Math.max(1, tc.gioi_han ?? 20)],
  );
  rows.sort((a, b) => Number(a.id) - Number(b.id));
  const from = c.dia_chi_gui ? dinhDangNguoiGui(c) : "docflow@localhost";
  for (const r of rows) {
    const id = Number(r.id);
    try {
      await chuyen({ id, from, to: r.den, subject: r.tieu_de, text: r.van_ban, html: r.html, loai: r.loai });
      await q.query(
        "UPDATE docflow.hang_doi_email SET trang_thai = 'da_gui', so_lan_thu = so_lan_thu + 1, loi_cuoi = NULL, da_gui_luc = $2::timestamptz WHERE id = $1",
        [id, bayGio],
      );
      kq.da_gui++;
    } catch (e) {
      const loi = (e instanceof Error ? e.message : String(e)).slice(0, 1000) || "Lỗi không rõ";
      const lan = r.so_lan_thu + 1;
      const het = lan >= toiDa;
      const phut = PHUT_CHO[Math.min(lan - 1, PHUT_CHO.length - 1)];
      await q.query(
        `UPDATE docflow.hang_doi_email SET trang_thai = $2, so_lan_thu = $3, loi_cuoi = $4,
                thu_lai_luc = $5::timestamptz + ($6::int * interval '1 minute') WHERE id = $1`,
        [id, het ? "loi" : "cho", lan, loi, bayGio, phut],
      );
      kq.loi++;
      if (het) kq.het_luot++;
      kq.loi_cuoi = loi;
    }
  }
  return kq;
}

// ---------------- Chạy định kỳ trong tiến trình ----------------

function biTat(): boolean {
  if (typeof window !== "undefined") return true;
  if (process.env.VITEST || process.env.NODE_ENV === "test") return true;
  if (process.env.NEXT_PHASE === "phase-production-build") return true;
  if (process.env.DOCFLOW_TAT_HEN_GIO === "1") return true;
  return false;
}

async function nhip(): Promise<void> {
  const st = (globalThis as G).__docflowBoGuiThu;
  if (!st || st.dangChay) return;
  st.dangChay = true;
  try {
    const { layQ } = await import("@/lib/db");
    const q = await layQ();
    // Gửi theo lô cho đến khi hết thư đến lượt (tối đa 10 lô mỗi nhịp)
    for (let i = 0; i < 10; i++) {
      const kq = await guiHangDoi(q, { gioi_han: 20 });
      if (kq.che_do === "chua_cau_hinh") {
        if (!st.daBaoChuaCauHinh) console.warn("[email]", kq.mo_ta);
        st.daBaoChuaCauHinh = true;
        break;
      }
      st.daBaoChuaCauHinh = false;
      if (kq.loi) console.error(`[email] ${kq.loi} thư lỗi, lỗi cuối: ${kq.loi_cuoi}`);
      if (kq.da_gui + kq.loi < 20) break;
    }
  } catch (e) {
    console.error("[email] bộ gửi thư lỗi:", e instanceof Error ? e.message : e);
  } finally {
    st.dangChay = false;
  }
}

function khongGiu(t: unknown): void {
  if (typeof t === "object" && t && "unref" in t) (t as { unref(): void }).unref();
}

/** Bật bộ gửi thư định kỳ (một bộ cho cả tiến trình). */
export function khoiDongBoGuiThu(): void {
  try {
    if (biTat()) return;
    const g = globalThis as G;
    if (g.__docflowBoGuiThu) return;
    const timer = setInterval(() => void nhip(), 60_000);
    khongGiu(timer);
    g.__docflowBoGuiThu = { timer, dangChay: false, henSom: false, daBaoChuaCauHinh: false };
    khongGiu(setTimeout(() => void nhip(), 20_000));
  } catch (e) {
    console.error("[email] không bật được bộ gửi thư:", e);
  }
}

/** Vừa xếp thư: nhắc bộ gửi chạy sớm (sau vài giây, khi giao dịch đã ghi xong). */
export function nhacGuiSom(): void {
  const st = (globalThis as G).__docflowBoGuiThu;
  if (!st || st.henSom) return;
  st.henSom = true;
  khongGiu(
    setTimeout(() => {
      st.henSom = false;
      void nhip();
    }, 3_000),
  );
}
