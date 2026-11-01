// ============================================================
// email/cau-hinh.ts — CẤU HÌNH GỬI THƯ (CHỈ SERVER).
// Máy chủ/cổng/tài khoản: cấu hình thong_bao.smtp trong CSDL, biến môi trường SMTP_* đè lên.
// Mật khẩu CHỈ lấy từ biến môi trường SMTP_PASS (không lưu trong bảng cấu hình).
// DOCFLOW_EMAIL_THU=1 → chế độ thử: ghi thư ra data/email-thu/*.eml thay vì gửi.
// ============================================================
import { chuanHoaLink } from "@/lib/ai/trang-co-that";
import path from "node:path";
import type { Q } from "@/lib/db";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import type { CauHinh } from "@/lib/cau-hinh/mac-dinh";

export type CheDoEmail = "smtp" | "thu" | "chua_cau_hinh";

export interface CauHinhGuiThu {
  che_do: CheDoEmail;
  /** Mô tả trạng thái bằng tiếng Việt, vd "Chưa cấu hình email: thiếu máy chủ SMTP" */
  mo_ta: string;
  thieu: string[];
  may_chu: string;
  cong: number;
  bao_mat: "starttls" | "ssl" | "khong";
  tai_khoan: string;
  mat_khau: string;
  co_mat_khau: boolean;
  /** Địa chỉ người gửi (From) */
  dia_chi_gui: string;
  ten_nguoi_gui: string;
  thu_muc_thu: string;
}

const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export function laEmail(s: string | null | undefined): boolean {
  return !!s && EMAIL.test(s.trim());
}

/** Thư mục ghi thư ở chế độ thử. */
export function thuMucEmailThu(): string {
  return process.env.DOCFLOW_EMAIL_THU_THU_MUC?.trim() || path.join(process.cwd(), "data", "email-thu");
}

/** Liên kết tuyệt đối theo DOCFLOW_URL (mặc định https://docflow.scigroup.vn). */
export function lienKetTuyetDoi(lienKet: string | null | undefined): string {
  const goc = (process.env.DOCFLOW_URL?.trim() || "https://docflow.scigroup.vn").replace(/\/+$/, "");
  if (!lienKet) return goc + "/";
  if (/^https?:\/\//i.test(lienKet)) return lienKet;
  // Link cũ trong tin (/cong-viec/X, /tai-lieu/X) → màn mới, cùng một bộ chuẩn hoá với chuông + trợ lý (luật 7; test đêm 01/10:
  // thư email mở trang giao diện cũ trong khi chuông trên màn đã mở Sơ đồ / file)
  const moi = chuanHoaLink(lienKet) ?? lienKet;
  return goc + (moi.startsWith("/") ? "" : "/") + moi;
}

/** Tính cấu hình gửi thư từ nhóm thong_bao (đã đọc) + biến môi trường. Thuần, không truy vấn. */
export function tinhCauHinhGuiThu(tb: CauHinh["thong_bao"]): CauHinhGuiThu {
  const env = process.env;
  const smtp = tb.smtp ?? { may_chu: "", cong: 587, bao_mat: "starttls", tai_khoan: "" };
  const may_chu = (env.SMTP_HOST ?? "").trim() || (smtp.may_chu ?? "").trim();
  const congEnv = Number(env.SMTP_PORT);
  const baoMatEnv = (env.SMTP_SECURE ?? "").trim().toLowerCase();
  let bao_mat: CauHinhGuiThu["bao_mat"] = ["starttls", "ssl", "khong"].includes(smtp.bao_mat) ? smtp.bao_mat : "starttls";
  if (["ssl", "tls", "true", "1"].includes(baoMatEnv)) bao_mat = "ssl";
  else if (baoMatEnv === "starttls") bao_mat = "starttls";
  else if (["khong", "none", "false", "0"].includes(baoMatEnv)) bao_mat = "khong";
  const cong = Number.isInteger(congEnv) && congEnv > 0 ? congEnv : Number(smtp.cong) > 0 ? Number(smtp.cong) : bao_mat === "ssl" ? 465 : 587;
  const tai_khoan = (env.SMTP_USER ?? "").trim() || (smtp.tai_khoan ?? "").trim();
  const mat_khau = env.SMTP_PASS ?? "";
  const dia_chi_gui = [tb.email_gui, env.SMTP_FROM, tai_khoan].map((x) => (x ?? "").trim()).find((x) => laEmail(x)) ?? "";
  const ten_nguoi_gui = (tb.ten_nguoi_gui ?? "").trim() || "SCI công việc";
  const chung = { may_chu, cong, bao_mat, tai_khoan, mat_khau, co_mat_khau: !!mat_khau, ten_nguoi_gui, thu_muc_thu: thuMucEmailThu() };

  if (env.DOCFLOW_EMAIL_THU === "1") {
    return {
      ...chung,
      che_do: "thu",
      mo_ta: `Chế độ thử: thư được ghi ra ${chung.thu_muc_thu} (*.eml), không gửi thật`,
      thieu: [],
      dia_chi_gui: dia_chi_gui || "docflow@scigroup.vn",
    };
  }
  const thieu: string[] = [];
  if (!may_chu) thieu.push("máy chủ SMTP (SMTP_HOST hoặc thong_bao.smtp.may_chu)");
  if (tai_khoan && !mat_khau) thieu.push("mật khẩu SMTP (SMTP_PASS trong .env.local)");
  if (!dia_chi_gui) thieu.push("địa chỉ người gửi (thong_bao.email_gui hoặc SMTP_FROM)");
  if (thieu.length) return { ...chung, che_do: "chua_cau_hinh", mo_ta: `Chưa cấu hình email: thiếu ${thieu.join(", ")}`, thieu, dia_chi_gui };
  return {
    ...chung,
    che_do: "smtp",
    mo_ta: `Gửi qua ${may_chu}:${cong} (${bao_mat === "ssl" ? "SSL" : bao_mat === "starttls" ? "STARTTLS" : "không mã hóa"})${tai_khoan ? `, tài khoản ${tai_khoan}` : ""}`,
    thieu,
    dia_chi_gui,
  };
}

export async function layCauHinhGuiThu(q: Q): Promise<CauHinhGuiThu> {
  return tinhCauHinhGuiThu(await layCauHinh(q, "thong_bao"));
}

/** Trạng thái gửi thư để hiện cho quản trị (không lộ mật khẩu). */
export function trangThaiHienThi(c: CauHinhGuiThu) {
  return {
    che_do: c.che_do,
    da_cau_hinh: c.che_do !== "chua_cau_hinh",
    mo_ta: c.mo_ta,
    thieu: c.thieu,
    may_chu: c.may_chu || null,
    cong: c.cong,
    bao_mat: c.bao_mat,
    tai_khoan: c.tai_khoan || null,
    co_mat_khau: c.co_mat_khau,
    nguoi_gui: c.dia_chi_gui ? `${c.ten_nguoi_gui} <${c.dia_chi_gui}>` : null,
    thu_muc_thu: c.che_do === "thu" ? c.thu_muc_thu : null,
  };
}
