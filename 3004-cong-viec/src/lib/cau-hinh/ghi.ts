// ============================================================
// cau-hinh/ghi.ts — GHI CẤU HÌNH: phiên bản, nhật ký, kiểm tra trước khi lưu, quay lại, xuất/nhập.
// Chủ module: identity-cau-hinh (giai đoạn 1). Chữ ký là hợp đồng.
// Phiên bản 0 = mặc định trong code (chưa ai sửa). Mỗi lần lưu +1, ghi docflow.cau_hinh_nhat_ky
// (giá trị cũ → mới) và lịch sử 'sua_cau_hinh'. Đọc bằng layCauHinh() nên hiệu lực ngay.
// ============================================================
import type { Q } from "@/lib/db";
import type { NguoiDungPhien } from "@/lib/types";
import { LoiHttp } from "@/lib/phien";
import { ghiLichSu } from "@/lib/lich-su/ghi";
import { MAC_DINH, NHOM_CAU_HINH, type CauHinh, type KhoaCauHinh } from "./mac-dinh";
import { layCauHinh } from "./doc";
import { kiemTra, tronMacDinh } from "./kiem-tra";
import { duocSuaNhom } from "./quyen";

/** Lỗi cấu hình sai: status 400, kèm danh sách lỗi. */
export class LoiCauHinh extends LoiHttp {
  constructor(public danhSach: string[]) {
    super(400, `Cấu hình chưa hợp lệ: ${danhSach.join("; ")}`);
  }
}

export const DINH_DANG_XUAT = "sci-docflow-cau-hinh";

/** Trả danh sách lỗi tiếng Việt; rỗng = hợp lệ (vd luồng báo cáo vòng tròn, đơn vị không có cấp). */
export async function kiemTraCauHinh<K extends KhoaCauHinh>(q: Q, khoa: K, giaTri: CauHinh[K]): Promise<string[]> {
  return kiemTra(q, khoa, giaTri);
}

/** Một thay đổi "từ gì sang gì" để ghi lịch sử và hiện nhật ký. */
export interface ThayDoi {
  truong: string;
  tu: unknown;
  sang: unknown;
}

/**
 * Chuỗi JSON KHÔNG phụ thuộc thứ tự trường. CSDL lưu jsonb tự xếp lại thứ tự khoá, nên so JSON.stringify thẳng thì giá trị đọc
 * từ CSDL luôn "khác" giá trị code dựng — mỗi lượt máy tự ghi sinh một phiên bản rỗng (đo 03/10: kéo dự án từ Main 3 lượt → 3 phiên bản).
 */
export function chuoiOnDinh(v: unknown): string {
  return JSON.stringify(v, (_k, x: unknown) =>
    x && typeof x === "object" && !Array.isArray(x)
      ? Object.fromEntries(Object.keys(x as Record<string, unknown>).sort().map((k) => [k, (x as Record<string, unknown>)[k]]))
      : x,
  );
}

/** So hai giá trị cấu hình, liệt kê trường đổi (đi sâu vào đối tượng; mảng so nguyên khối). */
export function soSanhCauHinh(cu: unknown, moi: unknown, duong = ""): ThayDoi[] {
  if (chuoiOnDinh(cu) === chuoiOnDinh(moi)) return [];
  const laDT = (v: unknown) => !!v && typeof v === "object" && !Array.isArray(v);
  if (laDT(cu) && laDT(moi)) {
    const a = cu as Record<string, unknown>;
    const b = moi as Record<string, unknown>;
    const khoa = Array.from(new Set([...Object.keys(a), ...Object.keys(b)]));
    return khoa.flatMap((k) => soSanhCauHinh(a[k], b[k], duong ? `${duong}.${k}` : k));
  }
  return [{ truong: duong || "(toàn bộ)", tu: cu ?? null, sang: moi ?? null }];
}

async function phienBanHienTai(q: Q, khoa: KhoaCauHinh): Promise<number> {
  const { rows } = await q.query<{ phien_ban: number }>("SELECT phien_ban FROM docflow.cau_hinh WHERE khoa = $1 FOR UPDATE", [khoa]);
  return rows[0]?.phien_ban ?? 0;
}

/** Kết quả phụ khi lưu (tham số ra tùy chọn): số việc đang mở đã đổi do áp dụng lại quy tắc đè. */
export interface KetQuaGhiThem {
  so_viec_ap_dung_lai?: number;
}

async function ghiNoiBo(
  q: Q,
  nd: NguoiDungPhien,
  khoa: KhoaCauHinh,
  giaTri: unknown,
  them: { quay_lai_tu?: number; nhap_tu_file?: boolean; thiet_bi?: string | null; bo_kiem_quyen?: boolean; ra?: KetQuaGhiThem } = {},
): Promise<number> {
  if (!(khoa in MAC_DINH)) throw new LoiHttp(400, `Không có nhóm cài đặt "${khoa}"`);
  if (!them.bo_kiem_quyen) {
    const pq = await layCauHinh(q, "phan_quyen_cau_hinh");
    if (!duocSuaNhom(nd, khoa, pq)) {
      const ten = NHOM_CAU_HINH.find((n) => n.khoa === khoa)?.ten ?? khoa;
      throw new LoiHttp(403, `Bạn không có quyền sửa nhóm cài đặt "${ten}"`);
    }
  }
  const loi = await kiemTra(q, khoa, giaTri);
  if (loi.length > 0) throw new LoiCauHinh(loi);
  const moi = tronMacDinh(khoa, giaTri as CauHinh[KhoaCauHinh]);
  const pb = await phienBanHienTai(q, khoa);
  const cu = await layCauHinh(q, khoa);
  // Đổi tên dự án: máy tự giữ tên cũ trong "tên gọi khác" — việc gán dự án THEO TÊN (báo cáo, ô "Thuộc dự án" khi giao)
  // không rơi khỏi menu Dự án (Mr. Đại chốt 28/09)
  if (khoa === "du_an") {
    const tenCu = new Map((cu as CauHinh["du_an"]).map((d) => [d.id, d.ten]));
    for (const d of moi as CauHinh["du_an"]) {
      const t = tenCu.get(d.id)?.trim();
      if (t && t !== d.ten.trim() && !d.ten_khac.some((x) => x.trim() === t)) d.ten_khac = [...d.ten_khac, t];
    }
  }
  const doi = soSanhCauHinh(cu, moi);
  if (doi.length === 0) return pb; // không đổi gì: giữ phiên bản
  const pbMoi = pb + 1;
  await q.query(
    `INSERT INTO docflow.cau_hinh (khoa, gia_tri, phien_ban, sua_boi, sua_luc) VALUES ($1,$2,$3,$4, now())
     ON CONFLICT (khoa) DO UPDATE SET gia_tri = EXCLUDED.gia_tri, phien_ban = EXCLUDED.phien_ban,
       sua_boi = EXCLUDED.sua_boi, sua_luc = now()`,
    [khoa, JSON.stringify(moi), pbMoi, nd.id],
  );
  await q.query(
    "INSERT INTO docflow.cau_hinh_nhat_ky (khoa, phien_ban, gia_tri_cu, gia_tri_moi, boi) VALUES ($1,$2,$3,$4,$5)",
    [khoa, pbMoi, JSON.stringify(cu), JSON.stringify(moi), nd.id],
  );
  // Móc so-cai: quy tắc đè đổi thứ tự + công tắc "Áp dụng lại cho việc đang mở" bật → áp dụng lại, CÙNG giao dịch.
  // Import động để tránh vòng import cau-hinh ↔ so-cai.
  let soViecApDungLai: number | undefined;
  if (khoa === "quy_tac_de") {
    const qtMoi = moi as CauHinh["quy_tac_de"];
    const qtCu = cu as CauHinh["quy_tac_de"];
    const adl = await import("@/lib/so-cai/ap-dung-lai");
    if (qtMoi.ap_dung_lai_khi_doi && adl.doiThuTuQuyTac(qtCu, qtMoi)) {
      const lyDo =
        them.quay_lai_tu !== undefined ? `quay lại phiên bản ${them.quay_lai_tu} của quy tắc đè`
        : them.nhap_tu_file ? "nhập cấu hình quy tắc đè từ file"
        : `đổi cài đặt quy tắc đè (phiên bản ${pbMoi})`;
      soViecApDungLai = (await adl.apDungLaiQuyTac(q, nd, lyDo, { cau_hinh_cu: qtCu, phien_ban: pbMoi })).so_viec;
      if (them.ra) them.ra.so_viec_ap_dung_lai = soViecApDungLai;
    }
  }
  await ghiLichSu(q, {
    nguoi: nd.id,
    don_vi_id: nd.don_vi_id,
    thiet_bi: them.thiet_bi ?? null,
    doi_tuong_loai: "cau_hinh",
    doi_tuong_id: khoa,
    hanh_dong: "sua_cau_hinh",
    chi_tiet: {
      phien_ban: pbMoi,
      phien_ban_truoc: pb,
      thay_doi: doi.slice(0, 50),
      ...(them.quay_lai_tu !== undefined ? { quay_lai_phien_ban: them.quay_lai_tu } : {}),
      ...(them.nhap_tu_file ? { nhap_tu_file: true } : {}),
      ...(soViecApDungLai !== undefined ? { ap_dung_lai_so_viec: soViecApDungLai } : {}),
    },
  });
  return pbMoi;
}

/** Lưu (sau khi kiểm tra), tăng phiên bản, ghi nhật ký + lịch sử 'sua_cau_hinh'. Hiệu lực ngay. */
export async function ghiCauHinh<K extends KhoaCauHinh>(
  q: Q,
  nd: NguoiDungPhien,
  khoa: K,
  giaTri: CauHinh[K],
  thietBi?: string | null,
  ra?: KetQuaGhiThem,
): Promise<number> {
  return ghiNoiBo(q, nd, khoa, giaTri, { thiet_bi: thietBi, ra });
}

/**
 * MÁY tự ghi — kéo danh mục dự án từ Main (LOI-DUNG-CHUNG 6g.6): bỏ kiểm quyền, người làm = "he-thong" (sổ hiện "Hệ thống").
 * Vẫn qua kiểm tra luật + nhật ký phiên bản + lịch sử như người sửa.
 */
export async function ghiCauHinhHeThong<K extends KhoaCauHinh>(q: Q, khoa: K, giaTri: CauHinh[K]): Promise<number> {
  return ghiNoiBo(q, { id: "he-thong", don_vi_id: null } as unknown as NguoiDungPhien, khoa, giaTri, { bo_kiem_quyen: true });
}

/** Giá trị của một phiên bản (0 = mặc định trong code). null nếu không có. */
export async function giaTriPhienBan(q: Q, khoa: KhoaCauHinh, phienBan: number): Promise<unknown | null> {
  if (phienBan === 0) return structuredClone(MAC_DINH[khoa]);
  const { rows } = await q.query<{ gia_tri_moi: unknown }>(
    "SELECT gia_tri_moi FROM docflow.cau_hinh_nhat_ky WHERE khoa = $1 AND phien_ban = $2 ORDER BY id DESC LIMIT 1",
    [khoa, phienBan],
  );
  return rows[0]?.gia_tri_moi ?? null;
}

/** Quay lại một phiên bản cũ: tạo phiên bản MỚI mang giá trị cũ (không xóa nhật ký). */
export async function quayLaiPhienBan(q: Q, nd: NguoiDungPhien, khoa: KhoaCauHinh, phienBan: number, thietBi?: string | null, ra?: KetQuaGhiThem): Promise<number> {
  const gt = await giaTriPhienBan(q, khoa, phienBan);
  if (gt === null) throw new LoiHttp(404, `Không có phiên bản ${phienBan} của "${khoa}"`);
  return ghiNoiBo(q, nd, khoa, gt, { quay_lai_tu: phienBan, thiet_bi: thietBi, ra });
}

export interface DongNhatKy {
  id: number;
  phien_ban: number;
  boi: string | null;
  boi_ten: string | null;
  luc: string;
  thay_doi: ThayDoi[];
}

/** Nhật ký phiên bản của một nhóm (mới nhất trước). */
export async function nhatKyCauHinh(q: Q, khoa: KhoaCauHinh, gioiHan = 50): Promise<DongNhatKy[]> {
  const { rows } = await q.query<{ id: string; phien_ban: number; boi: string | null; boi_ten: string | null; luc: string; gia_tri_cu: unknown; gia_tri_moi: unknown }>(
    `SELECT k.id, k.phien_ban, k.boi, n.ten AS boi_ten, to_char(k.luc AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS luc, k.gia_tri_cu, k.gia_tri_moi
     FROM docflow.cau_hinh_nhat_ky k LEFT JOIN identity.nguoi_dung n ON n.id = k.boi
     WHERE k.khoa = $1 ORDER BY k.id DESC LIMIT $2`,
    [khoa, gioiHan],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    phien_ban: r.phien_ban,
    boi: r.boi,
    boi_ten: r.boi_ten,
    luc: r.luc,
    thay_doi: soSanhCauHinh(r.gia_tri_cu, r.gia_tri_moi),
  }));
}

/** Toàn bộ cấu hình hiện hành (kể cả nhóm chưa sửa = mặc định) để chuyển sang máy khác. */
export async function xuatCauHinh(q: Q): Promise<Record<string, unknown>> {
  const { rows } = await q.query<{ khoa: string; phien_ban: number }>("SELECT khoa, phien_ban FROM docflow.cau_hinh");
  const cauHinh: Record<string, { phien_ban: number; gia_tri: unknown }> = {};
  for (const k of Object.keys(MAC_DINH) as KhoaCauHinh[]) {
    cauHinh[k] = { phien_ban: rows.find((r) => r.khoa === k)?.phien_ban ?? 0, gia_tri: await layCauHinh(q, k) };
  }
  return { dinh_dang: DINH_DANG_XUAT, phien_ban_dinh_dang: 1, xuat_luc: new Date().toISOString(), cau_hinh: cauHinh };
}

/**
 * Nhập cấu hình từ file xuất (hoặc bản rút gọn { khoa: giá_trị }). Kiểm tra TẤT CẢ trước; có lỗi thì không ghi gì
 * và trả danh sách lỗi. Hợp lệ thì ghi từng nhóm có thay đổi (mỗi nhóm tăng một phiên bản). Nên gọi trong tx().
 */
export async function nhapCauHinh(q: Q, nd: NguoiDungPhien, duLieu: Record<string, unknown>, ra?: KetQuaGhiThem): Promise<string[]> {
  if (!duLieu || typeof duLieu !== "object" || Array.isArray(duLieu)) return ["File không đúng định dạng cấu hình"];
  let ban: Record<string, unknown>;
  if ("cau_hinh" in duLieu) {
    if (duLieu.dinh_dang !== undefined && duLieu.dinh_dang !== DINH_DANG_XUAT) return [`File không phải cấu hình SCI công việc (định dạng "${String(duLieu.dinh_dang)}")`];
    const ch = duLieu.cau_hinh as Record<string, unknown>;
    if (!ch || typeof ch !== "object") return ["File thiếu phần cau_hinh"];
    ban = Object.fromEntries(
      Object.entries(ch).map(([k, v]) => [k, v && typeof v === "object" && "gia_tri" in (v as object) ? (v as { gia_tri: unknown }).gia_tri : v]),
    );
  } else ban = duLieu;
  const khoaNhap = Object.keys(ban);
  if (khoaNhap.length === 0) return ["File không có nhóm cài đặt nào"];
  const loi: string[] = [];
  const pq = await layCauHinh(q, "phan_quyen_cau_hinh");
  for (const k of khoaNhap) {
    const ten = NHOM_CAU_HINH.find((n) => n.khoa === k)?.ten ?? k;
    if (!(k in MAC_DINH)) {
      loi.push(`Không có nhóm cài đặt "${k}"`);
      continue;
    }
    if (!duocSuaNhom(nd, k as KhoaCauHinh, pq)) {
      loi.push(`${ten}: bạn không có quyền sửa nhóm này`);
      continue;
    }
    for (const l of await kiemTra(q, k, ban[k])) loi.push(`${ten}: ${l}`);
  }
  if (loi.length > 0) return loi;
  for (const k of khoaNhap) await ghiNoiBo(q, nd, k as KhoaCauHinh, ban[k], { nhap_tu_file: true, bo_kiem_quyen: true, ra });
  return [];
}
