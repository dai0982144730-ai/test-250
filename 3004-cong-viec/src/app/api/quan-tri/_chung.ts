// Dùng chung cho /api/quan-tri/* (không phải route): bắt buộc quyền quản lý người dùng + kiểm phạm vi.
import type { Q } from "@/lib/db";
import { layQ } from "@/lib/db";
import type { DonVi, NguoiDungPhien, PhamVi, Quyen } from "@/lib/types";
import { LoiHttp, batBuocDangNhap, thietBi } from "@/lib/phien";
import { coQuyen, duocQuanLyNguoi, duocTraoVaiTro, laQuanTriToanBo, layCayDonVi, danhSachVaiTro, type NguCanh } from "@sci/identity/server";
import { nguCanh } from "@/lib/cau-hinh/cau-noi-identity";

export interface PhienQuanTri {
  nd: NguoiDungPhien;
  q: Q;
  cay: DonVi[];
  ng: NguCanh;
}

/** Người đang đăng nhập phải có quyền nguoi_dung.quan_ly (ở phạm vi nào đó). */
export async function batBuocQuanTri(): Promise<PhienQuanTri> {
  const nd = await batBuocDangNhap();
  if (!coQuyen(nd, "nguoi_dung.quan_ly")) throw new LoiHttp(403, "Bạn không có quyền quản lý người dùng, đơn vị, vai trò");
  const q = await layQ();
  return { nd, q, cay: await layCayDonVi(q, true), ng: nguCanh(nd, thietBi()) };
}

export function kiemQuanLyDonVi(p: PhienQuanTri, donViId: string | null, viec: string): void {
  if (!duocQuanLyNguoi(p.nd, { don_vi_id: donViId }, p.cay)) {
    const ten = donViId ? p.cay.find((d) => d.id === donViId)?.ten_ngan ?? donViId : "người chưa gán đơn vị";
    throw new LoiHttp(403, `Bạn không có quyền ${viec} (${ten}) — ngoài phạm vi quản lý của bạn`);
  }
}

/** Việc ảnh hưởng toàn công ty (đơn vị gốc, cấp đơn vị): chỉ người quản lý toàn bộ người dùng. */
export function kiemToanBo(p: PhienQuanTri, viec: string): void {
  if (!laQuanTriToanBo(p.nd)) throw new LoiHttp(403, `Chỉ người quản lý toàn bộ người dùng mới ${viec}`);
}

/** Không ai trao được vai trò có quyền rộng hơn quyền mình đang có. */
export async function kiemTraoVaiTro(q: Q, nd: NguoiDungPhien, vaiTro: string[]): Promise<void> {
  const ds = await danhSachVaiTro(q);
  for (const id of vaiTro) {
    const v = ds.find((x) => x.id === id);
    if (v && !duocTraoVaiTro(nd, v.quyen)) throw new LoiHttp(403, `Bạn không trao được vai trò "${v.ten}" vì nó có quyền rộng hơn quyền của bạn`);
  }
}

/** Sửa ma trận vai trò × quyền: cần quản trị toàn bộ, và không nâng quyền nào vượt quyền của mình. */
export function kiemSuaVaiTro(nd: NguoiDungPhien, quyen?: Partial<Record<Quyen, PhamVi | null>>): void {
  if (!laQuanTriToanBo(nd)) throw new LoiHttp(403, "Chỉ người quản lý toàn bộ người dùng mới sửa được vai trò và quyền");
  if (!quyen) return;
  const moi = Object.fromEntries(Object.entries(quyen).filter(([, v]) => v)) as Partial<Record<Quyen, PhamVi>>;
  if (!duocTraoVaiTro(nd, moi)) throw new LoiHttp(403, "Không đặt được phạm vi rộng hơn quyền bạn đang có");
}
