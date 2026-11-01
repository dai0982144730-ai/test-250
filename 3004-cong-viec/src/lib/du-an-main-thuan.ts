// ============================================================
// du-an-main-thuan.ts — DANH MỤC DỰ ÁN KÉO TỪ MAIN (LOI-DUNG-CHUNG 6g.6, Đợt 1 — Mr. Đại chốt 03/10/2026). File THUẦN (luật 10).
//   · Main là gốc: mã ngắn (HV · TT · BT · N3A · NK1…) · tên · tên gọi khác · nhóm (SCI đầu tư / Loại khác).
//   · Agent Công việc giữ tại chỗ, gắn theo mã ngắn: loại (Điện gió/Thủy điện…), Ban QLDA đứng đầu + đơn vị làm, Ban điều hành
//     (6g.6.1: chuyển lên Main sau Đợt 2 khi Main có cây đơn vị).
//   · `ma_tien_do` không còn khai tay: máy điền = mã ngắn khi agent Tiến độ có cây WBS (tổng đầu việc > 0).
//     Tiến độ tắt / chậm / đang ngắt mạch → "chưa biết": GIỮ NGUYÊN mã đang có (soát 03/10 điểm 1 — trước đây ghi nhớ
//     "không có cây" 6 giờ, Cây việc + gắn WBS + bộ sinh issue của HV, N3A dừng theo).
//   · Dự án chỉ có tại chỗ (Main chưa khai) KHÔNG xoá — giữ nguyên, báo tên (luật 6).
// ============================================================
import type { CauHinh } from "@/lib/cau-hinh/mac-dinh";

type DuAn = CauHinh["du_an"][number];

/** Mã cũ agent Công việc tự đặt → mã ngắn Main (bảng Mr. Đại duyệt 03/10; IAD1 = "IA Dreng 1") */
export const MA_CU: Record<string, string> = {
  "da-hv": "HV",
  "da-tt": "TT",
  "da-bt1": "BT",
  "da-ns3a": "N3A",
  "da-nk1": "NK1",
  "da-nkh1": "NK1",
  "da-nk2": "NK2",
  "da-nk3": "NK3",
  "da-nn": "NNHL",
  "da-nl1": "NL1",
  "da-nl2": "NL2",
  "da-nm1": "NM1",
  "da-nm2": "NM2",
  "da-hp1": "HP1",
  "da-moda": "MDDT",
  "da-16": "IAD1",
};

/** Link cũ (/cay-viec?du_an=da-hv) vẫn mở đúng dự án */
export const doiMaCu = (id: string | null | undefined): string => (id ? (MA_CU[id] ?? id) : "");

/** Một dự án như Main trả ở `main.du_lieu_dung_chung` */
export interface DuAnMain {
  id: string;
  ma: string;
  ten: string;
  tenKhac?: string[];
  nhom?: "sci" | "khac";
  /** ⭐ 6g.6 Đợt 2 bước E: Main giữ 3 trường gắn đơn vị — có (dù rỗng) = Main quản; không có = giữ bản tại chỗ */
  donVi?: string[];
  banDieuHanh?: string | null;
  luuTru?: boolean;
}

/**
 * Kết luận "dự án có cây WBS không" từ câu trả lời `tiendo.tom_tat_du_an`. `null` = CHƯA BIẾT (Tiến độ tắt, quá hạn chờ,
 * ngắt mạch, lỗi nội bộ) — chỉ `KHONG_CO_DU_LIEU` mới là "không có dự án này bên Tiến độ".
 * `nho` = kết luận đã nhớ của lần hỏi trước (nếu có): chưa biết thì dùng lại nó.
 */
export function ketLuanCay(kq: { ok?: boolean; ma_loi?: string; du_lieu?: { totalTasks?: number } } | null | undefined, nho?: boolean): boolean | null {
  if (kq?.ok) return (kq.du_lieu?.totalTasks ?? 0) > 0;
  if (kq?.ma_loi === "KHONG_CO_DU_LIEU") return false;
  return nho ?? null;
}

export interface KetQuaTron {
  ds: CauHinh["du_an"];
  /** mã dự án Main có mà tại chỗ chưa có */
  moi: string[];
  /** tên dự án tại chỗ mà Main chưa khai (giữ nguyên — luật 6) */
  chiTaiCho: string[];
  /** mã dự án nhóm SCI đầu tư chưa chọn Ban QLDA */
  thieuBan: string[];
  /** Main đã giữ 3 trường gắn đơn vị (bước E) — Cài đặt ở đây chỉ hiện */
  donViTuMain: boolean;
}

/**
 * Gộp danh mục Main với các trường riêng tại chỗ. `coCay` = các mã ngắn mà agent Tiến độ đang có cây WBS;
 * `chuaBiet` = mã chưa hỏi được Tiến độ — giữ nguyên `ma_tien_do` đang có.
 * Main: bỏ dự án lưu trữ và dự án không có mã ngắn (vd "Dự án demo").
 */
export function tronDuAn(
  main: DuAnMain[],
  tai: CauHinh["du_an"],
  coCay: Set<string>,
  chuaBiet: Set<string> = new Set(),
  donVi: DonViGhep[] = [],
): KetQuaTron {
  const taiTheoMa = new Map(tai.map((d) => [doiMaCu(d.id), d]));
  const dungMain = main.filter((m) => m.ma?.trim() && !m.luuTru);
  const maMain = new Set(dungMain.map((m) => m.ma.trim().toUpperCase()));
  const moi: string[] = [];
  const thieuBan: string[] = [];
  // ⭐ 6g.6 Đợt 2 bước E (Mr. Đại chốt 03/10 "2a"): Main đã giữ 3 trường gắn đơn vị (Ban QLDA · đơn vị làm · BĐH) thì lấy theo Main
  // cho MỌI dự án, ở đây chỉ hiện. Chưa có dự án nào mang trường này (Main bản cũ / chưa chạy bộ chuyển) → giữ bản tại chỗ như Đợt 1.
  const donViTuMain = dungMain.some((m) => Array.isArray(m.donVi));
  const tuMain: DuAn[] = dungMain.map((m) => {
    const ma = m.ma.trim().toUpperCase();
    const l = taiTheoMa.get(ma);
    if (!l) moi.push(ma);
    const ten = m.ten.trim();
    const nhom = m.nhom ?? l?.nhom ?? "khac";
    // Main đổi nhóm (soát 03/10 điểm 9): SCI đầu tư → Loại khác thì bỏ Ban QLDA đứng đầu, giữ đơn vị làm, bỏ BĐH;
    // Loại khác → SCI đầu tư thì chưa có Ban QLDA → để trống, nằm dưới "Chưa chọn Ban QLDA" chờ người chọn.
    let donVi = l?.don_vi ?? [];
    let bdh = l?.ban_dieu_hanh;
    // Dự án Main chưa mang trường (bộ chuyển chưa ghép được mã) → giữ bản tại chỗ như Đợt 1, không xoá trắng
    if (donViTuMain && Array.isArray(m.donVi)) (donVi = m.donVi.filter((x) => typeof x === "string" && x)), (bdh = m.banDieuHanh ?? null);
    else if (l && l.nhom === "sci" && nhom !== "sci") (donVi = donVi.slice(1)), (bdh = null);
    else if (l && l.nhom !== "sci" && nhom === "sci") donVi = [];
    if (nhom === "sci" && !donVi[0]) thieuBan.push(ma);
    const seen = new Set([ten.toLowerCase()]);
    const tenKhac = (m.tenKhac ?? []).map((x) => x.trim()).filter((x) => x && !seen.has(x.toLowerCase()) && (seen.add(x.toLowerCase()), true));
    return {
      id: ma,
      ten,
      loai: l?.loai ?? "",
      nhom,
      don_vi: donVi,
      ...(bdh ? { ban_dieu_hanh: bdh } : {}),
      ten_khac: tenKhac,
      ...(coCay.has(ma) ? { ma_tien_do: ma } : chuaBiet.has(ma) && l?.ma_tien_do ? { ma_tien_do: l.ma_tien_do } : {}),
    };
  });
  const chiTai = tai.filter((d) => !maMain.has(doiMaCu(d.id)));
  // Giữ thứ tự tại chỗ cho dự án đã có (cây Dự án không nhảy chỗ), dự án mới của Main nối cuối
  const thuTu = new Map(tai.map((d, i) => [doiMaCu(d.id), i]));
  tuMain.sort((a, b) => (thuTu.get(a.id) ?? 1e6) - (thuTu.get(b.id) ?? 1e6));
  return { ds: ghepBdhLoaiKhac([...tuMain, ...chiTai], donVi), moi, chiTaiCho: chiTai.map((d) => d.ten), thieuBan, donViTuMain };
}

export interface DonViGhep {
  id: string;
  ten: string;
  cha: string | null;
}

/** «Ban điều hành dự án Nậm Mô 1» / «BĐH Nậm Mô 1» → «nậm mô 1» (viết thường, NFC, gộp khoảng trắng) */
const tenLoi = (s: string) =>
  s
    .normalize("NFC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(ban điều hành|bđh)( dự án)?\s+/, "");

/**
 * Dự án LOẠI KHÁC chưa gắn Ban điều hành → tự ghép theo TÊN (Mr. Đại chốt 20/10/2026: «Ban điều hành dưới SCI E&C chính là dự án
 * Loại khác»). Main không cho gắn BĐH cho dự án Loại khác (`4-agent-main/src/lib/du-an-don-vi.ts:32`), nên ghép ở đây — một chỗ,
 * mọi nơi đọc `ban_dieu_hanh` (sơ đồ 7b, 4 nhóm Cần BLĐ ra quyết định, việc giao thẳng cho BĐH ra đúng dự án) dùng chung.
 * Ứng viên: đơn vị con của một đơn vị làm dự án (SCI E&C, SCI PMC), tên bỏ chữ «Ban điều hành (dự án)» trùng tên hoặc tên gọi khác
 * của dự án. Chỉ ghép khi đúng MỘT ứng viên và ban đó chưa là BĐH của dự án khác. Dự án SCI đầu tư không đụng (Main giữ).
 */
export function ghepBdhLoaiKhac(ds: CauHinh["du_an"], donVi: DonViGhep[]): CauHinh["du_an"] {
  if (!donVi.length) return ds;
  const daDung = new Set(ds.map((a) => a.ban_dieu_hanh).filter(Boolean));
  return ds.map((a) => {
    if (a.nhom === "sci" || a.ban_dieu_hanh) return a;
    const ten = new Set([a.ten, ...(a.ten_khac ?? [])].map(tenLoi));
    const ung = donVi.filter((u) => u.cha && a.don_vi.includes(u.cha) && !daDung.has(u.id) && /^(ban điều hành|bđh)/i.test(u.ten.trim()) && ten.has(tenLoi(u.ten)));
    if (ung.length !== 1) return a;
    daDung.add(ung[0].id);
    return { ...a, ban_dieu_hanh: ung[0].id };
  });
}
