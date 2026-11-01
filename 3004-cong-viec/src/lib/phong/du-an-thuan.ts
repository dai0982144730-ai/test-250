// ============================================================
// phong/du-an-thuan.ts — MENU DỰ ÁN của giao diện căn phòng (Đợt 3, Mr. Đại chốt 28/09/2026). File thuần — client import được (luật 10).
// Thước: 0 Tài liệu thiết kế/demo-agent-cong-viec-pa2-cay.html, khung 'du-an' (BO_CUC['du-an'], ganNut, CAY_DA).
//   · việc → dự án: ô "Dự án" của việc trùng tên / tên gọi khác trong danh mục (Cài đặt → Danh mục dự án),
//     hoặc việc giao cho Ban điều hành tổng thầu của dự án.
//   · cây Dự án: "SCI đầu tư" → các BQLDA → dự án xếp dọc · "Loại khác" → dự án xếp 1 cột dọc (04/10; trước 2 cột).
//   · ô dự án (SCI đầu tư lẫn loại khác) cũng treo dưới đơn vị làm — SCI PMC / SCI E&C… — trên Sơ đồ tổ chức (id `<dự án>@<đơn vị>`).
// ============================================================
import type { CauHinh } from "@/lib/cau-hinh/mac-dinh";
import type { BoCuc, ViTri } from "@/components/phong/bo-cuc";

export type DuAn = CauHinh["du_an"][number];

const coDau = (s: string | null | undefined) => (s ?? "").normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
const khongDau = (s: string | null | undefined) =>
  coDau(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, "");

/**
 * Dự án ghi TRONG TÊN VIỆC (Mr. Đại chốt 03/10/2026 — việc ghi ô dự án "Công ty" mà tên là "…DA Hướng Việt…" vẫn về dự án).
 * Giữ dấu, bỏ tiền tố loại (TĐ, ĐG, Dự án…), tên ngắn < 5 ký tự bỏ qua (HV, NK1 dễ khớp nhầm). Nhiều dự án khớp → tên khớp dài nhất.
 */
export function duAnTrongTen<T extends { id: string; ten: string; ten_khac?: string[] }>(tenViec: string | null | undefined, ds: T[]): T | null {
  if (!tenViec) return null;
  const chuan = (s: string) => ` ${s.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `;
  const boTienTo = (s: string) => s.replace(/^ (dự án|da|thủy điện|thuỷ điện|tđ|điện gió|đg|nmđg|nmtđ|nhà máy) /u, " ");
  const t = chuan(tenViec);
  let tot: { d: T; dai: number } | null = null;
  for (const d of ds)
    for (const ten of [d.ten, ...(d.ten_khac ?? [])]) {
      const k = boTienTo(chuan(ten));
      if (k.trim().length < 5 || !t.includes(k)) continue;
      if (!tot || k.length > tot.dai) tot = { d, dai: k.length };
    }
  return tot?.d ?? null;
}

/**
 * Dự án của một việc. Khớp đúng tên ô dự án (giữ dấu); không khớp thì so bỏ dấu, chỉ nhận khi ra đúng MỘT dự án; rồi xét việc có
 * giao cho Ban điều hành của dự án không; cuối cùng dò tên dự án trong TÊN VIỆC (chốt 03/10).
 */
export function duAnCuaViec(duAnChu: string | null | undefined, phuTrachIds: string[], ds: DuAn[], tenViec?: string | null): string | null {
  const t = coDau(duAnChu);
  if (t) {
    const dung = ds.find((a) => [a.ten, ...a.ten_khac].some((x) => coDau(x) === t));
    if (dung) return dung.id;
    const k = khongDau(duAnChu);
    const gan = ds.filter((a) => [a.ten, ...a.ten_khac].some((x) => khongDau(x) === k));
    if (gan.length === 1) return gan[0].id;
  }
  const bdh = ds.find((a) => a.ban_dieu_hanh && phuTrachIds.includes(a.ban_dieu_hanh));
  if (bdh) return bdh.id;
  return duAnTrongTen(tenViec, ds)?.id ?? null;
}

/** Đơn vị LÀM cho dự án (SCI PMC thiết kế, SCI E&C thi công…): SCI đầu tư = các đơn vị sau Ban QLDA (don_vi[0]); Loại khác = tất cả. */
export const donViLam = (a: DuAn): string[] => (a.nhom === "sci" ? a.don_vi.slice(1) : a.don_vi);

/**
 * Ô dự án treo dưới đơn vị làm cho dự án đó trên Sơ đồ tổ chức (Mr. Đại chốt 03/10: một dự án hiện ở nhiều đơn vị, mỗi đơn vị
 * một mảng — PMC thiết kế, E&C thi công; BQLDA quản lý). Áp cho cả dự án SCI đầu tư lẫn Loại khác.
 */
export function nutDuAnDuoiDonVi(ds: DuAn[], coO: Set<string>): { id: string; da: string; cha: string; ten: string }[] {
  return ds.flatMap((a) => donViLam(a).filter((u) => coO.has(u)).map((u) => ({ id: `${a.id}@${u}`, da: a.id, cha: u, ten: a.ten })));
}
export const laNutDuAn = (id: string) => id.includes("@");

export const G_SCI = "g-sci";
export const G_KHAC = "g-khac";
/** Dự án SCI đầu tư Main mới khai, chưa chọn Ban QLDA ở Cài đặt (6g.6) — treo tạm dưới nút này */
export const G_CHUA_BAN = "g-chua-ban";

/**
 * Bố cục cây Dự án — tổng quát hoá đúng số đo demo: nhóm SCI đầu tư giữa các cột BQLDA (cách nhau BUOC_COT),
 * dự án xếp dọc dưới BQLDA (bước 48, trục bên trái lệch 85); Loại khác 1 cột dọc (bước 52, trục bên trái lệch 85 — Mr. Đại 04/10; trước 2 cột cách nhau 160, trục ở giữa).
 *
 * 04/10 (Mr. Đại: "tăng kích thước các đối tượng chữ nhật … bằng với so-do cùng cấp"): ô lấy ĐÚNG cỡ ô cùng cấp ở Sơ đồ
 * tổ chức (bo-cuc.ts: cấp 1 220×54 · cấp 2 150×48 · cấp 4 140×38) và cột BQLDA cách nhau 170 (trước 240). Đo 1600×1000
 * trước khi sửa: sân rộng 945 nên thu còn 0,92 trong khi Sơ đồ 1,16 → ô cấp 2 thấy 147 so với 174 px. Sân hẹp còn 725
 * thì thu ~1,17 — ô trên màn bằng Sơ đồ. Thêm Ban QLDA thì sân rộng thêm 170 và lại thu nhỏ theo khung.
 */
const O_CAP1 = { w: 220, h: 54 };
const O_CAP2 = { w: 150, h: 48 };
const O_CAP4 = { w: 140, h: 38 };
const BUOC_COT = 170;
/** Cột Loại khác dời sang phải thêm chừng này cho khỏi sát cột BQLDA/P.ĐT&PC (Mr. Đại chỉ 25/10/2026: vệt xanh → vệt đỏ ≈ 66 đơn vị) */
const DAN_KHAC = 66;
export function xepDuAn(ds: DuAn[]): BoCuc & { ten: Record<string, string> } {
  const VT: Record<string, ViTri> = {};
  const TRUC: Record<string, number> = {};
  const cap: Record<string, number> = {};
  const con: Record<string, string[]> = { [G_SCI]: [], [G_KHAC]: [] };
  const ten: Record<string, string> = { [G_SCI]: "SCI đầu tư", [G_KHAC]: "Loại khác", [G_CHUA_BAN]: "Chưa chọn Ban QLDA" };
  const sci = ds.filter((a) => a.nhom === "sci");
  const khac = ds.filter((a) => a.nhom !== "sci");
  const banCua = (a: DuAn) => a.don_vi[0] || G_CHUA_BAN;
  const bql = [...new Set(sci.map(banCua))].sort((a, b) => Number(a === G_CHUA_BAN) - Number(b === G_CHUA_BAN));
  bql.forEach((b, i) => {
    con[G_SCI].push(b);
    con[b] = sci.filter((a) => banCua(a) === b).map((a) => a.id);
    VT[b] = { x: 165 + i * BUOC_COT, y: 96, ...O_CAP2 };
    TRUC[b] = VT[b].x - 85;
    cap[b] = 2;
    con[b].forEach((id, j) => {
      VT[id] = { x: VT[b].x, y: 168 + j * 48, ...O_CAP4 };
      cap[id] = 4;
      con[id] = [];
    });
  });
  const xSci = bql.length ? (VT[bql[0]].x + VT[bql[bql.length - 1]].x) / 2 : 165;
  // 04/10 (Mr. Đại): dự án Loại khác xếp MỘT cột dọc ngay dưới ô "Loại khác" (trước 2 cột, trục ở giữa) — trục bên trái
  // lệch 85 như dự án dưới BQLDA. Cột Loại khác cách cột BQLDA cuối đúng một BUOC_COT (ô "SCI đầu tư" rộng 220 nằm giữa
  // các cột BQLDA nên không đè).
  const xKhac = (bql.length ? VT[bql[bql.length - 1]].x : 0) + BUOC_COT + DAN_KHAC;
  khac.forEach((a, i) => {
    con[G_KHAC].push(a.id);
    con[a.id] = [];
    VT[a.id] = { x: xKhac, y: 96 + i * 52, ...O_CAP4 };
    cap[a.id] = 4;
  });
  VT[G_SCI] = { x: xSci, y: 12, ...O_CAP1 };
  VT[G_KHAC] = { x: xKhac, y: 12, ...O_CAP1 };
  TRUC[G_KHAC] = xKhac - 85;
  cap[G_SCI] = cap[G_KHAC] = 1;
  ds.forEach((a) => (ten[a.id] = a.ten));
  // 04/10 (Mr. Đại: "di chuyển … cho cân đối"): lề trái = lề phải = 10, lề trên = lề dưới = 12. Trước đây mép trái
  // thật (trục BQLDA đầu, x 80) cách 0 tận 80 mà mép phải chỉ 10 → căn giữa theo W vẫn lệch phải, ô "Loại khác" sát mép sân.
  const trai = Math.min(...Object.values(VT).map((v) => v.x - v.w / 2), ...Object.values(TRUC));
  const dich = 10 - trai;
  for (const v of Object.values(VT)) v.x += dich;
  for (const k of Object.keys(TRUC)) TRUC[k] += dich;
  const W = Math.max(...Object.values(VT).map((v) => v.x + v.w / 2)) + 10;
  const H = Math.max(...Object.values(VT).map((v) => v.y + v.h)) + 12;
  return { W, H, Hcd: H, VT, TRUC, cap, con, goc: null, ten };
}
