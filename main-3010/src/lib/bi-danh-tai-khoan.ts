// ============================================================
// bi-danh-tai-khoan.ts — BÍ DANH TÀI KHOẢN "email cũ → email mới" (LOI-DUNG-CHUNG 6g.6 Đợt 2, Mr. Đại chốt 03/10/2026). CHỈ SERVER.
//   · dai@sci.vn → dainc@scigroup.vn (T2 — cùng là Mr. Đại) · admin@sci.vn → quantri@scigroup.vn (tài khoản mẫu, chuyển chủ cho Admin)
//   · Bộ chuyển người (Đợt 2) ghi file data/bi-danh-tai-khoan.json; Main giao kèm `main.du_lieu_dung_chung` (bi_danh_tai_khoan).
//   · Agent nhận tự quyết cách dùng: Pháp lý đổi email hàng cũ (giữ id → văn bản, nhật ký chuyển theo);
//     Hợp đồng chỉ dùng để HIỆN tên đúng — chữ ký phiếu giá giữ nguyên email cũ (A11).
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { gocDuLieu } from "@/lib/goc-du-lieu";

export interface BiDanhTaiKhoan {
  email_cu: string;
  email_moi: string;
  /** "gop" = cùng một người · "chuyen_chu" = tài khoản mẫu, chuyển thứ đứng tên cho người khác */
  cach: "gop" | "chuyen_chu";
  ly_do: string;
}

const tep = () => path.join(gocDuLieu(), "bi-danh-tai-khoan.json");
const email = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase() : "");

/**
 * Chỉ giữ bí danh khớp danh sách người Main (soát vòng 2 · 03/10/2026): email MỚI phải là người Main đang hoạt động,
 * email CŨ không còn là người Main. Gõ sai một chữ mà vẫn giao → Pháp lý đổi hàng 21 văn bản sang email lạ rồi khoá luôn.
 * Dòng bị bỏ ghi nhật ký máy chủ.
 */
export function biDanhHopLe(ds: BiDanhTaiKhoan[], nguoi: { email: string; active: boolean }[]): BiDanhTaiKhoan[] {
  const co = new Set(nguoi.map((u) => email(u.email)));
  const dangDung = new Set(nguoi.filter((u) => u.active).map((u) => email(u.email)));
  return ds.filter((b) => {
    const loi = co.has(b.email_cu)
      ? `${b.email_cu} vẫn là người dùng của Main`
      : !dangDung.has(b.email_moi)
        ? `${b.email_moi} không phải người dùng đang hoạt động của Main`
        : null;
    if (loi) console.error(`[bi-danh] bỏ bí danh ${b.email_cu} → ${b.email_moi}: ${loi}`);
    return !loi;
  });
}

/**
 * Ghi thêm một bí danh khi Admin ĐỔI EMAIL ở Cài đặt → Người dùng (Mr. Đại chốt 04/10/2026). Dòng cũ đang trỏ tới email cũ
 * đổi sang trỏ email mới (dai@sci.vn → dainc → … luôn tới email đang dùng); dòng có email_cu = email mới bị bỏ (người đổi
 * ngược về email cũ). Agent nhận qua `main.du_lieu_dung_chung` rồi tự chuyển thứ đứng tên.
 */
export function themBiDanh(emailCu: string, emailMoi: string, lyDo: string): void {
  const cu = email(emailCu);
  const moi = email(emailMoi);
  let ds: Record<string, unknown>[] = [];
  try {
    const x: unknown = JSON.parse(fs.readFileSync(tep(), "utf8"));
    if (Array.isArray(x)) ds = x as Record<string, unknown>[];
  } catch {
    /* chưa có file */
  }
  const ra = ds
    .filter((b) => email(b?.email_cu) !== moi && email(b?.email_cu) !== cu)
    .map((b) => (email(b?.email_moi) === cu ? { ...b, email_moi: moi } : b));
  ra.push({ email_cu: cu, email_moi: moi, cach: "gop", ly_do: lyDo });
  fs.mkdirSync(path.dirname(tep()), { recursive: true });
  fs.writeFileSync(tep(), JSON.stringify(ra, null, 2) + "\n", "utf8");
}

/** Danh sách bí danh hợp lệ (file chưa có / hỏng → rỗng). Bỏ dòng thiếu email, trùng email cũ. */
export function docBiDanhTaiKhoan(): BiDanhTaiKhoan[] {
  try {
    const ds: unknown = JSON.parse(fs.readFileSync(tep(), "utf8"));
    if (!Array.isArray(ds)) return [];
    const daCo = new Set<string>();
    const kq: BiDanhTaiKhoan[] = [];
    for (const x of ds as Record<string, unknown>[]) {
      const cu = email(x?.email_cu);
      const moi = email(x?.email_moi);
      if (!cu || !moi || cu === moi || daCo.has(cu)) continue;
      daCo.add(cu);
      kq.push({ email_cu: cu, email_moi: moi, cach: x.cach === "chuyen_chu" ? "chuyen_chu" : "gop", ly_do: typeof x.ly_do === "string" ? x.ly_do : "" });
    }
    return kq;
  } catch {
    return [];
  }
}
