// ============================================================
// du-an-don-vi.ts — 3 TRƯỜNG GẮN ĐƠN VỊ CỦA DỰ ÁN ở Main (LOI-DUNG-CHUNG 6g.6 Đợt 2 bước E — Mr. Đại chốt 03/10/2026 "2a"). File THUẦN.
//   donVi: SCI đầu tư → phần tử đầu = Ban QLDA đứng đầu, sau là đơn vị làm (PMC thiết kế, E&C thi công…) · Loại khác → đơn vị làm
//   banDieuHanh: Ban điều hành tổng thầu (chỉ dự án SCI đầu tư)
//   Luật chép theo agent Công việc (src/lib/cau-hinh/kiem-tra.ts mục du_an) — trước đây sửa ở đó, nay sửa ở Main, agent kia chỉ hiện.
// ============================================================
import type { DonViToChuc } from "@/lib/to-chuc-kieu";

export interface DonViDuAn {
  donVi: string[];
  banDieuHanh: string | null;
}

/** Chuẩn hoá danh sách đơn vị: chuỗi, bỏ trống, bỏ trùng (giữ thứ tự). Không phải danh sách → undefined (= Main chưa quản) */
export function chuanDonViDuAn(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const kq: string[] = [];
  for (const x of v) if (typeof x === "string" && x.trim() !== "" && !kq.includes(x.trim())) kq.push(x.trim());
  return kq;
}

/** Kiểm 3 trường theo nhóm dự án và cây đơn vị ở Main. Trả câu lỗi tiếng Việt hoặc null. */
export function kiemDonViDuAn(nhom: "sci" | "khac" | undefined, v: { donVi: unknown; banDieuHanh: unknown }, cay: DonViToChuc[]): string | null {
  if (!Array.isArray(v.donVi)) return "Đơn vị của dự án phải là danh sách";
  const ds = v.donVi as unknown[];
  if (ds.some((x) => typeof x !== "string")) return "Mã đơn vị phải là chữ";
  const donVi = ds as string[];
  const bdh = typeof v.banDieuHanh === "string" && v.banDieuHanh.trim() !== "" ? v.banDieuHanh.trim() : null;
  if (!nhom && (donVi.length || bdh)) return "Chọn nhóm dự án (SCI đầu tư / Loại khác) trước rồi mới gắn đơn vị";
  if (new Set(donVi).size !== donVi.length) return "Một đơn vị chọn hai lần";
  if (nhom === "sci" && donVi.length && !donVi[0]) return "Chọn Ban QLDA trước rồi mới thêm đơn vị làm";
  if (nhom !== "sci" && bdh) return "Ban điều hành chỉ dùng cho dự án SCI đầu tư";
  const theoMa = new Map(cay.map((d) => [d.id, d]));
  for (const [ma, nhan] of [...donVi.map((x, i) => [x, nhom === "sci" && i === 0 ? "Ban QLDA" : "Đơn vị làm"] as const), ...(bdh ? [[bdh, "Ban điều hành"] as const] : [])]) {
    const d = theoMa.get(ma);
    if (!d) return `${nhan}: đơn vị "${ma}" không có trong tổ chức ở Main`;
    if (!d.active) return `${nhan}: đơn vị "${d.ten_ngan}" đã ngừng hoạt động`;
  }
  return null;
}

/**
 * Đổi nhóm dự án thì 3 trường đi theo (chép luật agent Công việc — soát 03/10 điểm 9):
 * SCI đầu tư → Loại khác: bỏ Ban QLDA đứng đầu, giữ đơn vị làm, bỏ Ban điều hành · Loại khác → SCI đầu tư: chưa có Ban QLDA → để trống.
 */
export function doiNhomDonVi(cu: DonViDuAn, nhomCu: "sci" | "khac" | undefined, nhomMoi: "sci" | "khac" | undefined): DonViDuAn {
  if (nhomCu === nhomMoi) return cu;
  if (nhomCu === "sci") return { donVi: cu.donVi.slice(1), banDieuHanh: null };
  if (nhomMoi === "sci") return { donVi: [], banDieuHanh: null };
  return cu;
}
