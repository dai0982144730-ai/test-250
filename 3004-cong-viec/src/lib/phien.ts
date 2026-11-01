// ============================================================
// phien.ts — NGƯỜI ĐANG ĐĂNG NHẬP (CHỈ SERVER). Mọi API route dùng:
//   const nd = await batBuocDangNhap();          // 401 nếu chưa đăng nhập
//   if (!coQuyen(nd, "tai_lieu.xoa", {...})) ... // @sci/identity
// Lỗi nghiệp vụ ném LoiHttp; bọc handler bằng xuLy() để trả JSON {loi} tiếng Việt.
// ============================================================

import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import type { Q } from "@/lib/db";
import { layQ } from "@/lib/db";
import { COOKIE_CHUNG, SESSION_COOKIE, kiemPhien, kiemPhienChungEdge } from "@/lib/auth-token";
import { phamViRongHon } from "@sci/identity";
import type { NguoiDungPhien, PhamVi, Quyen } from "@/lib/types";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { chayVoiNguCanh, ganNguoiNguCanh } from "@/lib/ngu-canh";

export class LoiHttp extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Nạp đủ thông tin + quyền của một người dùng theo id. null nếu không có / bị khóa. */
export async function napNguoiDung(q: Q, id: string): Promise<NguoiDungPhien | null> {
  const { rows } = await q.query<{
    id: string;
    email: string;
    ten: string;
    don_vi_id: string | null;
    chuc_vu: string | null;
    cap_chuc_vu: number | null;
    la_quan_tri: boolean;
    active: boolean;
    cap_don_vi: number | null;
  }>(
    `SELECT n.*, d.cap AS cap_don_vi FROM identity.nguoi_dung n
     LEFT JOIN identity.don_vi d ON d.id = n.don_vi_id WHERE n.id = $1`,
    [id],
  );
  const u = rows[0];
  if (!u || !u.active) return null;
  const kn = await q.query<{ don_vi_id: string }>("SELECT don_vi_id FROM identity.kiem_nhiem WHERE nguoi_dung_id = $1", [id]);
  const donViIds = [...(u.don_vi_id ? [u.don_vi_id] : []), ...kn.rows.map((r) => r.don_vi_id)];
  // ⭐ TRƯỞNG CHÍNH (Mr. Đại chốt 03/10/2026 — thay "ủy quyền trưởng" db/70): người được chọn làm trưởng chính một đơn vị giữ
  // quyền trưởng ĐÚNG đơn vị đó (trước đây cộng vai trưởng cho MỌI đơn vị của người đó — Hương mang quyền trưởng sang BQLDA QT).
  // ⭐ TRƯỞNG PHỤ (Mr. Đại chốt lại 08/10/2026 — đảo phần "mất quyền trưởng" của chốt 03/10): người mang vai Trưởng ở đơn vị đã có
  // trưởng chính KHÁC vẫn ĐỦ quyền trưởng ở đó (giao việc cho nhân viên, chuyển tiếp việc của phòng, Xong việc · Gia hạn · Phối hợp…).
  // Trưởng phụ chỉ khác trưởng chính 3 điểm, đều đọc thẳng cột uy_quyen_truong ở nơi dùng — không đi qua bảng quyền này:
  //   ① đứng tên người giao khi máy tự giao (so-cai/dich-vu.ts) · ② người mặc định nhận việc giao cho cả phòng (so-cai/dich-vu.ts)
  //   ③ tên trưởng ở Thư mục (thu-muc/truy-van.ts)
  const chinh = await q.query<{ id: string }>("SELECT id FROM identity.don_vi WHERE uy_quyen_truong = $1 AND active", [id]);
  const laTruongChinh = chinh.rows.map((r) => r.id);
  const vt = await q.query<{ vai_tro_id: string; quyen: Quyen | null; pham_vi: PhamVi | null }>(
    `SELECT g.vai_tro_id, qv.quyen, qv.pham_vi FROM (
       SELECT vai_tro_id FROM identity.gan_vai_tro WHERE nguoi_dung_id = $1
       UNION SELECT 'truong-don-vi' WHERE $2::boolean
     ) g
     LEFT JOIN identity.quyen_vai_tro qv ON qv.vai_tro_id = g.vai_tro_id`,
    [id, laTruongChinh.length > 0],
  );
  const coVaiTruong = (await q.query("SELECT 1 FROM identity.gan_vai_tro WHERE nguoi_dung_id = $1 AND vai_tro_id = 'truong-don-vi'", [id])).rows.length > 0;
  const quyen: NguoiDungPhien["quyen"] = {};
  const quyenThanhVien: NguoiDungPhien["quyen"] = {};
  const quyenTruong: NguoiDungPhien["quyen"] = {};
  for (const r of vt.rows) {
    if (!r.quyen || !r.pham_vi) continue;
    quyen[r.quyen] = phamViRongHon(quyen[r.quyen], r.pham_vi);
    if (r.vai_tro_id === "truong-don-vi") quyenTruong[r.quyen] = phamViRongHon(quyenTruong[r.quyen], r.pham_vi);
    else quyenThanhVien[r.quyen] = phamViRongHon(quyenThanhVien[r.quyen], r.pham_vi);
  }
  // Ở đơn vị người này KHÔNG giữ quyền trưởng (trưởng chính không mang vai Trưởng, kiêm nơi khác) vẫn là THÀNH VIÊN — có sẵn
  // quyền mức Nhân viên (vai Trưởng bao trùm vai Nhân viên; nhiều trưởng chỉ gán vai Trưởng, không gán thêm Nhân viên)
  if (coVaiTruong || laTruongChinh.length) {
    const nv = await q.query<{ quyen: Quyen; pham_vi: PhamVi }>("SELECT quyen, pham_vi FROM identity.quyen_vai_tro WHERE vai_tro_id = 'nhan-vien'");
    for (const r of nv.rows) quyenThanhVien[r.quyen] = phamViRongHon(quyenThanhVien[r.quyen], r.pham_vi);
  }
  const duyNhat = (a: string[]) => Array.from(new Set(a));
  // Trưởng phụ giữ quyền trưởng như trưởng chính (chốt 08/10) → nơi giữ quyền trưởng = nơi nhận chuông như trưởng.
  // "Làm trưởng ở" (db/86, chốt 10/10): người đã khai thì vai Trưởng chỉ áp ở đúng các đơn vị đã khai — anh Sơn kiêm BQLDA QT
  // làm nhân viên không còn mang quyền trưởng sang đó; anh Thanh chỉ trưởng ở ô Trợ lý CT. Chưa khai → mọi đơn vị như cũ.
  const truongTai = (await q.query<{ don_vi_id: string }>("SELECT don_vi_id FROM identity.truong_tai WHERE nguoi_dung_id = $1", [id])).rows.map((r) => r.don_vi_id);
  const vaiTruongO = truongTai.length ? donViIds.filter((d) => truongTai.includes(d)) : donViIds;
  const donViTruong = duyNhat([...(coVaiTruong ? vaiTruongO : []), ...laTruongChinh]);
  const donViDau = donViTruong;
  // Chỉ tách bảng quyền khi người này mang quyền trưởng mà KHÔNG giữ được ở mọi đơn vị của mình (trưởng chính không mang vai
  // Trưởng mà còn thuộc đơn vị khác — vd Hương kiêm nơi khác)
  const tach = (coVaiTruong || laTruongChinh.length > 0) && donViIds.some((d) => !donViTruong.includes(d));
  // Cấp của người chưa gán đơn vị: lấy từ cấu hình hiện hành (đổi trên trang Cài đặt có hiệu lực ngay)
  const capThapNhat = (await layCauHinh(q, "nguoi_ngoai")).cap_thap_nhat;
  return {
    id: u.id,
    email: u.email,
    ten: u.ten,
    don_vi_id: u.don_vi_id,
    don_vi_ids: donViIds,
    chuc_vu: u.chuc_vu,
    cap: u.cap_chuc_vu ?? u.cap_don_vi ?? capThapNhat,
    la_quan_tri: u.la_quan_tri,
    vai_tro: Array.from(new Set(vt.rows.map((r) => r.vai_tro_id))),
    quyen,
    don_vi_dau: donViDau,
    ...(tach ? { don_vi_truong: donViTruong, quyen_thanh_vien: quyenThanhVien, quyen_truong: quyenTruong } : {}),
  };
}

export async function layNguoiDung(): Promise<NguoiDungPhien | null> {
  // Phiên chung do Main cấp (25/10/2026) ƯU TIÊN: đổi người ở Main thì 3004 đổi theo. Cookie chỉ mang email → tìm người theo cột
  // email (mã tài khoản có thể khác email — [[tai-khoan-that-3004]]). Không có phiên chung mới xét phiên riêng của 3004.
  let id: string | null = null;
  const c = await kiemPhienChungEdge(cookies().get(COOKIE_CHUNG)?.value);
  if (c) {
    const { rows } = await (await layQ()).query<{ id: string }>("SELECT id FROM identity.nguoi_dung WHERE lower(email) = $1 AND active LIMIT 1", [c.email]);
    id = rows[0]?.id ?? null;
  }
  if (!id) id = (await kiemPhien(cookies().get(SESSION_COOKIE)?.value))?.id ?? null;
  if (!id) return null;
  const nd = await napNguoiDung(await layQ(), id);
  if (nd) ganNguoiNguCanh(nd.id); // ngữ cảnh yêu cầu biết người đang làm
  return nd;
}

export async function batBuocDangNhap(): Promise<NguoiDungPhien> {
  const nd = await layNguoiDung();
  if (!nd) throw new LoiHttp(401, "Chưa đăng nhập hoặc phiên đã hết hạn");
  return nd;
}

/** Thông tin thiết bị ghi vào lịch sử. */
export function thietBi(): string {
  const h = headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "";
  return `${ip} ${h.get("user-agent") ?? ""}`.trim().slice(0, 300);
}

/** Thiết bị của yêu cầu hiện tại; null khi không có header (gọi ngoài yêu cầu). */
function thietBiAnToan(): string | null {
  try {
    return thietBi() || null;
  } catch {
    return null;
  }
}

/**
 * Bọc handler API: LoiHttp → JSON {loi}, lỗi khác → 500.
 * Handler chạy trong ngữ cảnh yêu cầu (ngu-canh.ts) có thiết bị → mọi dòng lịch sử ghi trong đó tự có thiet_bi.
 */
export async function xuLy(fn: () => Promise<Response | unknown>): Promise<Response> {
  try {
    const kq = await chayVoiNguCanh({ thiet_bi: thietBiAnToan() }, fn);
    return kq instanceof Response ? kq : NextResponse.json(kq);
  } catch (e) {
    if (e instanceof LoiHttp) return NextResponse.json({ loi: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ loi: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
