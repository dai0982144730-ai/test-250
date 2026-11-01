// ============================================================
// TỪ ĐIỂN NGỮ CẢNH ĐẦY ĐỦ — bản các agent đọc (CHOT LOI-DUNG-CHUNG 6g.7 mục 5, Mr. Đại chốt 04/10/2026)
// Đọc hai ô gõ tay (Cài đặt) + danh mục dự án + sơ đồ tổ chức + người dùng của Main, ghép bằng lib/tu-dien-ghep.ts.
// Ghép lúc ĐỌC — đổi dự án / đơn vị / chức năng nhiệm vụ ở Main là bản agent đọc đổi theo, không phải gõ lại.
// CHỈ SERVER (đọc tệp).
// ============================================================
import { docCaiDat } from "@/lib/cai-dat-base";
import { listProjects } from "@/lib/projects";
import { docToChuc } from "@/lib/to-chuc";
import { danhSachNguoiDungDayDu } from "@/lib/users";
import { ghepTuDien } from "@/lib/tu-dien-ghep";

function gioVN(d: Date): string {
  const v = new Date(d.getTime() + 7 * 3600_000).toISOString();
  return `${v.slice(8, 10)}/${v.slice(5, 7)}/${v.slice(0, 4)} ${v.slice(11, 16)}`;
}

export function tuDienDayDu(): string {
  const caiDat = docCaiDat();
  const { toChuc } = docToChuc();
  return ghepTuDien({
    congTy: caiDat.tuDienCongTy,
    boSung: caiDat.tuDienBoSung,
    duAn: listProjects(),
    donVi: toChuc.don_vi,
    kiemNhiem: toChuc.kiem_nhiem,
    nguoi: danhSachNguoiDungDayDu().map((n) => ({
      id: n.id ?? n.email,
      name: n.name,
      donViId: n.donViId,
      chucVu: n.chucVu,
      vaiCongViec: n.vaiCongViec,
      active: n.active,
    })),
    luc: gioVN(new Date()),
  });
}
