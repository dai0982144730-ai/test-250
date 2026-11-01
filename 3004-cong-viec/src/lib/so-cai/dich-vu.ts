// ============================================================
// so-cai/dich-vu.ts — LỚP 2: CÔNG VIỆC · PHẦN VIỆC · SỔ CÁI. Chủ module: so-cai (giai đoạn 4).
// Sổ cái = view docflow.so_cai (chỉ việc đang mở). Việc hoàn thành/đóng tự rời sổ cái, đủ quá trình trong lịch sử.
// Chữ ký là hợp đồng — module gui, ai, mcp gọi các hàm này.
// ============================================================
import type { Q } from "@/lib/db";
import type { CongViec, DauVaoSoCai, DongCongViec, DuDoanDong, NguonCongViec, NguoiDungPhien, PhanViec, PhuTrach } from "@/lib/types";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { duAnCuaViec } from "@/lib/phong/du-an-thuan";
import { ghiLichSu } from "@/lib/lich-su/ghi";
import { demTiep, taoMa } from "@/lib/ma";
import { dauDonVi, taoThongBao, tatChuongViecXong, thongBaoDauDonVi, type TepTB } from "@/lib/thong-bao";
import { dinhKemCuaViec, ganDinhKem } from "@/lib/dinh-kem/kho";
import { LoiHttp } from "@/lib/phien";
import { coQuyen, donViVaCapDuoi } from "@sci/identity";
import { layCayDonVi } from "@sci/identity/don-vi";
import { soSanhNguon, type KetQuaSoSanh } from "./quy-tac-de";
import { capNhatViecSau, datPhuThuoc, docPhuThuoc, tinhLaiNgay, type PhuThuocUi } from "./phu-thuoc";
import { chuanHoa, congNgay, dienTruocSo, dinhDangMaViec, doGiongViec, hamDuAnYeu, homNayVN, mauMaViec, ngayNgan, tienDo, tinhCanhBao } from "./tien-ich";
import { dauTheoVaiSql, truongTaiSql } from "@/lib/truong-tai";

// ---------------- Kiểu dòng đọc từ CSDL ----------------

/** Phần việc kèm các cột thêm (file kết quả, thứ tự). */
export type PhanViecDay = PhanViec & { tep_ket_qua: { tai_lieu_id: string }[]; thu_tu: number };

/** Nguồn kèm các cột thêm của module (db/40-so-cai.sql). */
export type NguonDay = NguonCongViec & { la_quyet_dinh: boolean; nguoi_gui: string | null; dong_so: number | null; luc: string };

const COT_CV = `c.id, c.ten, c.du_an, c.hang_muc, c.ket_qua_can_co, c.luon_mo, c.bat_dau::text AS bat_dau,
  c.ket_thuc::text AS ket_thuc, c.trang_thai, c.cho_sua, c.giao_boi, c.don_vi_giao, c.nguon_hien_hanh_id,
  c.tao_luc, c.dong_luc, c.ly_do_dong`;

const SQL_PV = `SELECT p.id, p.cong_viec_id, p.phu_trach_loai, p.phu_trach_id,
  COALESCE(d.ten, n.ten, p.phu_trach_id) AS phu_trach_ten, p.noi_dung, p.luon_mo,
  p.bat_dau::text AS bat_dau, p.ket_thuc::text AS ket_thuc, p.trang_thai, p.ket_thuc_boi, p.ket_thuc_luc,
  p.ghi_chu, p.tep_ket_qua, p.thu_tu, p.vai
  FROM docflow.phan_viec p
  LEFT JOIN identity.don_vi d ON p.phu_trach_loai = 'don_vi' AND d.id = p.phu_trach_id
  LEFT JOIN identity.nguoi_dung n ON p.phu_trach_loai = 'nguoi' AND n.id = p.phu_trach_id
  WHERE NOT p.da_bo`;

const SQL_NG = `SELECT g.id, g.cong_viec_id, g.tai_lieu_id, g.phien_ban, g.mau_ma, g.nhan, g.don_vi_id, g.cap,
  g.ky_bao_cao::text AS ky_bao_cao, g.ngay_gui, g.du_lieu, g.trang_thai, g.ly_do, g.la_quyet_dinh, g.nguoi_gui,
  g.dong_so, g.luc, (SELECT d.ten_ngan FROM identity.don_vi d WHERE d.id = g.don_vi_id) AS don_vi_ten FROM docflow.nguon_cong_viec g`;

function iso(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

function mapCv(r: Record<string, unknown>): CongViec {
  return {
    id: String(r.id),
    ten: String(r.ten),
    du_an: (r.du_an as string) ?? null,
    hang_muc: (r.hang_muc as string) ?? null,
    ket_qua_can_co: (r.ket_qua_can_co as string) ?? null,
    luon_mo: !!r.luon_mo,
    bat_dau: (r.bat_dau as string) ?? null,
    ket_thuc: (r.ket_thuc as string) ?? null,
    trang_thai: r.trang_thai as CongViec["trang_thai"],
    cho_sua: !!r.cho_sua,
    giao_boi: (r.giao_boi as string) ?? null,
    don_vi_giao: (r.don_vi_giao as string) ?? null,
    nguon_hien_hanh_id: (r.nguon_hien_hanh_id as string) ?? null,
    tao_luc: iso(r.tao_luc) ?? "",
    dong_luc: iso(r.dong_luc),
    ly_do_dong: (r.ly_do_dong as string) ?? null,
  };
}

function mapPv(r: Record<string, unknown>): PhanViecDay {
  return {
    id: String(r.id),
    cong_viec_id: String(r.cong_viec_id),
    phu_trach_loai: r.phu_trach_loai as PhanViec["phu_trach_loai"],
    phu_trach_id: String(r.phu_trach_id),
    phu_trach_ten: String(r.phu_trach_ten ?? r.phu_trach_id),
    noi_dung: String(r.noi_dung),
    luon_mo: !!r.luon_mo,
    bat_dau: (r.bat_dau as string) ?? null,
    ket_thuc: (r.ket_thuc as string) ?? null,
    trang_thai: r.trang_thai as PhanViec["trang_thai"],
    ket_thuc_boi: (r.ket_thuc_boi as string) ?? null,
    ket_thuc_luc: iso(r.ket_thuc_luc),
    ghi_chu: (r.ghi_chu as string) ?? null,
    tep_ket_qua: (r.tep_ket_qua as { tai_lieu_id: string }[]) ?? [],
    thu_tu: Number(r.thu_tu ?? 0),
    vai: r.vai === "phoi_hop" ? "phoi_hop" : "chu_tri",
  };
}

function mapNg(r: Record<string, unknown>): NguonDay {
  return {
    id: String(r.id),
    cong_viec_id: String(r.cong_viec_id),
    tai_lieu_id: (r.tai_lieu_id as string) ?? null,
    phien_ban: r.phien_ban === null || r.phien_ban === undefined ? null : Number(r.phien_ban),
    mau_ma: (r.mau_ma as string) ?? null,
    nhan: String(r.nhan),
    don_vi_id: (r.don_vi_id as string) ?? null,
    don_vi_ten: (r.don_vi_ten as string) ?? null,
    cap: Number(r.cap),
    ky_bao_cao: (r.ky_bao_cao as string) ?? null,
    ngay_gui: iso(r.ngay_gui) ?? "",
    du_lieu: (typeof r.du_lieu === "string" ? JSON.parse(r.du_lieu) : r.du_lieu) as DongCongViec,
    trang_thai: r.trang_thai as NguonCongViec["trang_thai"],
    ly_do: (r.ly_do as string) ?? null,
    la_quyet_dinh: !!r.la_quyet_dinh,
    nguoi_gui: (r.nguoi_gui as string) ?? null,
    dong_so: r.dong_so === null || r.dong_so === undefined ? null : Number(r.dong_so),
    luc: iso(r.luc) ?? "",
  };
}

async function layViec(q: Q, id: string): Promise<CongViec | null> {
  const { rows } = await q.query(`SELECT ${COT_CV} FROM docflow.cong_viec c WHERE c.id = $1`, [id]);
  return rows[0] ? mapCv(rows[0]) : null;
}

async function layPhanViec(q: Q, congViecIds: string[]): Promise<PhanViecDay[]> {
  if (!congViecIds.length) return [];
  const { rows } = await q.query(`${SQL_PV} AND p.cong_viec_id = ANY($1::text[]) ORDER BY p.thu_tu, p.id`, [congViecIds]);
  return rows.map(mapPv);
}

async function layMotPhanViec(q: Q, id: string): Promise<PhanViecDay | null> {
  const { rows } = await q.query(`${SQL_PV} AND p.id = $1`, [id]);
  return rows[0] ? mapPv(rows[0]) : null;
}

async function layNguon(q: Q, id: string | null): Promise<NguonDay | null> {
  if (!id) return null;
  const { rows } = await q.query(`${SQL_NG} WHERE g.id = $1`, [id]);
  return rows[0] ? mapNg(rows[0]) : null;
}

async function tenDonVi(q: Q, id: string | null | undefined): Promise<string | null> {
  if (!id) return null;
  const { rows } = await q.query<{ ten: string }>("SELECT ten FROM identity.don_vi WHERE id = $1", [id]);
  return rows[0]?.ten ?? null;
}

async function tenPhuTrach(q: Q, loai: "nguoi" | "don_vi", id: string): Promise<string> {
  const { rows } = await q.query<{ ten: string }>(
    loai === "don_vi" ? "SELECT ten FROM identity.don_vi WHERE id = $1" : "SELECT ten FROM identity.nguoi_dung WHERE id = $1",
    [id],
  );
  return rows[0]?.ten ?? id;
}

// ---------------- Thông báo ----------------

/** Luật 30: mã việc luôn kèm tên ngắn (≤ 8 chữ) — "CV-2026-0019 Hệ thống điều tốc TM1 & TM2" (soát 30/09: chuông chỉ có mã). */
function maKemTen(ma: string, ten: string | null | undefined): string {
  const chu = (ten ?? "").trim().split(/\s+/).filter(Boolean);
  return chu.length ? `${ma} ${chu.slice(0, 8).join(" ")}${chu.length > 8 ? "…" : ""}` : ma;
}

function dienMau(mau: string, gt: Record<string, string>): string {
  return mau.replace(/\{(\w+)\}/g, (m, k: string) => gt[k] ?? m);
}

async function baoPhuTrach(q: Q, p: { phu_trach_loai: string; phu_trach_id: string }, tb: { loai: string; noi_dung: string; lien_ket: string; tep?: TepTB[] }) {
  if (p.phu_trach_loai === "nguoi") await taoThongBao(q, { ...tb, nguoi_nhan: p.phu_trach_id });
  // Phần của CẢ đơn vị: chỉ đầu đơn vị (trưởng + ủy quyền) nhận — Mr. Đại chốt K2 02/10; nhân viên nhận khi được phân công
  else await thongBaoDauDonVi(q, p.phu_trach_id, tb);
}

// ---------------- Quyền ----------------

/** Người này có bấm Kết thúc được phần việc này không (phần của mình / đơn vị mình). */
export function coTheKetThuc(nd: NguoiDungPhien, p: { phu_trach_loai: string; phu_trach_id: string; trang_thai: string }): boolean {
  if (p.trang_thai !== "dang_lam") return false;
  if (p.phu_trach_loai === "nguoi") return p.phu_trach_id === nd.id;
  // Phần giao cho cả đơn vị: trưởng đơn vị hoặc người thuộc đơn vị được phân công bấm thay
  return nd.don_vi_ids.includes(p.phu_trach_id);
}

/**
 * NGƯỜI GIAO của việc lấy từ báo cáo = TRƯỞNG ĐƠN VỊ LẬP báo cáo (Mr. Đại chốt 28/09), không phải người bấm gửi — người bấm gửi
 * thường là nhân viên soạn báo cáo. Trưởng = người của đơn vị (đơn vị chính trước, rồi kiêm nhiệm) có vai trò trưởng đơn vị
 * hoặc lãnh đạo. Đơn vị chưa có trưởng / không có đơn vị lập → giữ người gửi.
 * Đơn vị đã chọn TRƯỞNG CHÍNH (cột uy_quyen_truong — chốt 03/10/2026) → trưởng chính đứng trước.
 */
export async function nguoiGiaoTuBaoCao(q: Q, donViId: string | null | undefined, nguoiGui: string): Promise<string> {
  if (!donViId) return nguoiGui;
  const uq = await q.query<{ id: string }>(
    `SELECT n.id FROM identity.don_vi d JOIN identity.nguoi_dung n ON n.id = d.uy_quyen_truong AND n.active WHERE d.id = $1`,
    [donViId],
  );
  if (uq.rows[0]) return uq.rows[0].id;
  const { rows } = await q.query<{ id: string }>(
    `SELECT n.id FROM identity.nguoi_dung n
      WHERE n.active AND (n.don_vi_id = $1 OR n.id IN (SELECT nguoi_dung_id FROM identity.kiem_nhiem WHERE don_vi_id = $1))
        AND ${dauTheoVaiSql("$1")}
      ORDER BY (n.don_vi_id = $1) DESC, n.id LIMIT 1`,
    [donViId],
  );
  return rows[0]?.id ?? nguoiGui;
}

/**
 * Phương án A (Mr. Đại duyệt 29/10/2026) — quyền của TRƯỞNG ĐƠN VỊ CHỦ TRÌ:
 *   · việc do máy sinh (lọc từ báo cáo) hoặc người giao không còn (không có / đã nghỉ): trưởng đơn vị đang chủ trì sửa, hủy, mở lại được
 *     (coTheSua trả true — đi cùng mọi thao tác dùng quyền sửa)
 *   · việc do người khác giao: chỉ GIA HẠN phần việc của đơn vị mình (truongDonViCuaPhan) — không sửa tên, không hủy.
 * Đơn vị "mình làm trưởng" = đơn vị có quyền trưởng (don_vi_dau / don_vi_truong) cùng mọi đơn vị cấp dưới.
 */
function donViToiLamTruong(nd: NguoiDungPhien): string[] {
  return nd.don_vi_dau ?? nd.don_vi_truong ?? (nd.vai_tro.includes("truong-don-vi") ? nd.don_vi_ids : []);
}
async function phamViTruong(q: Q, nd: NguoiDungPhien): Promise<Set<string>> {
  const truong = donViToiLamTruong(nd);
  if (!truong.length) return new Set();
  const cay = await layCayDonVi(q, true);
  return new Set(truong.flatMap((d) => [...donViVaCapDuoi(cay, d)]));
}
async function phanThuocPhamVi(q: Q, p: { phu_trach_loai: string; phu_trach_id: string }, pv: Set<string>): Promise<boolean> {
  if (p.phu_trach_loai === "don_vi") return pv.has(p.phu_trach_id);
  const { rows } = await q.query<{ id: string }>(
    "SELECT don_vi_id AS id FROM identity.nguoi_dung WHERE id = $1 AND don_vi_id IS NOT NULL UNION SELECT don_vi_id FROM identity.kiem_nhiem WHERE nguoi_dung_id = $1",
    [p.phu_trach_id],
  );
  return rows.some((r) => pv.has(r.id));
}
/** Phần việc CHỦ TRÌ đang làm của đơn vị mình làm trưởng (hoặc của người thuộc đơn vị đó) — mã phần việc */
export async function phanDonViMinhTruong(q: Q, nd: NguoiDungPhien, cv: CongViec, phan?: PhanViec[]): Promise<string[]> {
  // Quyền cơ sở "cong_viec.sua" (ma trận Cài đặt) vẫn bắt buộc — kiểm độc lập 29/10: thiếu dòng này thì gia hạn / nút Gia hạn lọt qua
  if (!nd.la_quan_tri && !nd.quyen["cong_viec.sua"]) return [];
  const pv = await phamViTruong(q, nd);
  if (!pv.size) return [];
  const kq: string[] = [];
  for (const p of (phan ?? (await layPhanViec(q, [cv.id]))).filter((x) => x.vai !== "phoi_hop" && x.trang_thai === "dang_lam")) if (await phanThuocPhamVi(q, p, pv)) kq.push(p.id);
  return kq;
}
/** Việc không có người giao đang hoạt động, hoặc do máy lọc từ báo cáo (không phải giao tay / quyết định TGĐ) */
async function laViecMaySinhHoacMoCoi(q: Q, cv: CongViec): Promise<boolean> {
  if (!cv.giao_boi) return true;
  const u = await q.query<{ active: boolean }>("SELECT active FROM identity.nguoi_dung WHERE id = $1", [cv.giao_boi]);
  if (!u.rows[0]?.active) return true;
  return laViecTuBaoCao(q, cv.id);
}

/**
 * Người này có sửa được việc không (gia hạn, thêm/đổi/bớt người, hủy việc) — theo quyền "cong_viec.sua" ở ma trận
 * Cài đặt → Vai trò và quyền (Mr. Đại chốt 29/09: khai ở phân quyền, không cố định trong code). Mặc định: Lãnh đạo toàn bộ,
 * Trưởng đơn vị + Nhân viên "của mình" (= việc mình giao) → chỉ người giao + lãnh đạo sửa được.
 * Phạm vi Đơn vị / Mình + cấp dưới tính theo đơn vị CHỦ TRÌ — đứng phối hợp không bao giờ cho quyền sửa
 * (phối hợp chỉ được biết, bấm Xong phần mình, bình luận). Công tắc cũ so_cai.chi_nguoi_giao_duoc_sua không còn dùng.
 */
export async function coTheSua(
  q: Q,
  nd: NguoiDungPhien,
  cv: CongViec,
  phan?: PhanViec[],
  quyen: "cong_viec.sua" | "cong_viec.sua_viec" = "cong_viec.sua",
): Promise<boolean> {
  if (nd.la_quan_tri) return true;
  const pv = nd.quyen[quyen];
  if (!pv) return false;
  if (pv === "toan_bo") return true;
  if (cv.giao_boi && cv.giao_boi === nd.id) return true;
  // Việc máy sinh / người giao không còn → trưởng đơn vị đang chủ trì sửa, hủy được (phương án A, 29/10/2026)
  // donViToiLamTruong không truy vấn: người không làm trưởng ở đâu thì khỏi tốn 2–3 truy vấn mỗi việc (danh sách ~500 việc)
  // Chỉ khi MỌI phần chủ trì đang làm đều thuộc đơn vị mình làm trưởng: việc nhiều đơn vị chủ trì thì không được sửa / hủy phần của đơn vị khác (kiểm độc lập 29/10)
  if (donViToiLamTruong(nd).length && (await laViecMaySinhHoacMoCoi(q, cv))) {
    const dsCt = (phan ?? (await layPhanViec(q, [cv.id]))).filter((x) => x.vai !== "phoi_hop" && x.trang_thai === "dang_lam");
    const mine = await phanDonViMinhTruong(q, nd, cv, phan);
    if (mine.length > 0 && mine.length === dsCt.length) return true;
  }
  if (pv === "cua_minh") return false;
  const cay = await layCayDonVi(q, true);
  const ds = (phan ?? (await layPhanViec(q, [cv.id]))).filter((p) => p.vai !== "phoi_hop");
  for (const p of ds) {
    const dv =
      p.phu_trach_loai === "don_vi"
        ? [p.phu_trach_id]
        : (await q.query<{ id: string }>("SELECT don_vi_id AS id FROM identity.nguoi_dung WHERE id = $1 AND don_vi_id IS NOT NULL", [p.phu_trach_id])).rows.map((r) => r.id);
    if (dv.some((d) => coQuyen(nd, quyen, { don_vi_id: d }, cay))) return true;
  }
  return false;
}

/**
 * Các đơn vị người này được GIAO việc chủ trì tới, theo phạm vi quyền "Giao việc" (Mình + cấp dưới…); "tat_ca" = toàn bộ.
 * Mr. Đại bắt 28/09: trưởng phòng giao được việc cho TGĐ — trước đây chỉ kiểm có quyền, không kiểm nơi nhận.
 */
export async function phamViGiao(q: Q, nd: NguoiDungPhien): Promise<"tat_ca" | string[]> {
  if (nd.la_quan_tri || nd.quyen["cong_viec.giao"] === "toan_bo") return "tat_ca";
  if (!nd.quyen["cong_viec.giao"]) return [];
  const cay = await layCayDonVi(q, true);
  return cay.filter((d) => coQuyen(nd, "cong_viec.giao", { don_vi_id: d.id }, cay)).map((d) => d.id);
}

/**
 * Đơn vị NGOÀI SCI mà người này không được giao chủ trì ĐÍCH DANH CÁ NHÂN trong đó: SCI PMC, SCI E&C là công ty SCI có cổ phần,
 * ban điều hành tổng thầu — cột don_vi.ngoai_sci, kèm mọi đơn vị con. Bỏ cụm người này đang thuộc (giao trong công ty mình),
 * và cụm `choPhep` (việc sinh từ báo cáo CỦA CHÍNH đơn vị đó — nội bộ công ty họ).
 * Mr. Đại sửa lại 10/10/2026 chiều (bản `4e4bb8c` hiểu sai, chặn cả đơn vị): GIAO CHO TỔ CHỨC THÌ ĐƯỢC — việc tới công ty đó rồi
 * giao cho ai là việc của người đứng đầu công ty đó (giao chuyển tiếp). Chỉ không giao thẳng cho một cá nhân của họ.
 */
export async function donViNgoaiSciCam(q: Q, nd: NguoiDungPhien, choPhep?: string | null): Promise<Set<string>> {
  const cay = await layCayDonVi(q, true);
  const bo = new Set<string>();
  for (const cum of await cumNgoaiSci(q, cay))
    if (!nd.don_vi_ids.some((d) => cum.has(d)) && !(choPhep && cum.has(choPhep))) cum.forEach((d) => bo.add(d));
  return bo;
}

/**
 * Người (id) mà người này KHÔNG giao chủ trì đích danh được vì thuộc đơn vị ngoài SCI: mọi đơn vị của họ (chính + kiêm nhiệm) đều
 * nằm trong cụm cấm. Màn dùng để bỏ tên khỏi danh sách gõ "@"; máy chủ kiểm lại ở batBuocTrongPhamVi.
 */
export async function nguoiNgoaiSciCam(q: Q, nd: NguoiDungPhien): Promise<string[]> {
  const cam = await donViNgoaiSciCam(q, nd);
  if (!cam.size) return [];
  const { rows } = await q.query<{ id: string; dv: string[] }>(
    `SELECT n.id, array_remove(array_cat(ARRAY[n.don_vi_id], COALESCE((SELECT array_agg(k.don_vi_id) FROM identity.kiem_nhiem k WHERE k.nguoi_dung_id = n.id), '{}')), NULL) AS dv
       FROM identity.nguoi_dung n WHERE n.active`,
  );
  return rows.filter((r) => r.id !== nd.id && r.dv.length > 0 && r.dv.every((d) => cam.has(d))).map((r) => r.id);
}

/**
 * Nơi CHỦ TRÌ phải nằm trong phạm vi giao việc. Phối hợp không kiểm (chỉ để biết, không hạn riêng). Tự giao cho mình luôn được.
 * Đơn vị ngoài SCI (donViNgoaiSciCam): giao cho ĐƠN VỊ thì được, giao đích danh CÁ NHÂN (người, hoặc ô chức danh một người) thì không.
 */
async function batBuocTrongPhamVi(q: Q, nd: NguoiDungPhien, p: { loai: PhuTrach["loai"]; id: string; ten?: string }, choPhep?: string | null): Promise<void> {
  if (p.loai === "nguoi" && p.id === nd.id) return;
  const cam = await donViNgoaiSciCam(q, nd, choPhep);
  if (cam.size) {
    // Ô chức danh (đơn vị một người) trong công ty ngoài SCI cũng là giao cho cá nhân
    const laChucDanh =
      p.loai === "don_vi" && cam.has(p.id) && (await q.query<{ loai: string }>("SELECT loai FROM identity.don_vi WHERE id = $1", [p.id])).rows[0]?.loai === "chuc_danh";
    const dvNhan =
      p.loai === "don_vi"
        ? laChucDanh
          ? [p.id]
          : []
        : (
            await q.query<{ id: string }>(
              `SELECT don_vi_id AS id FROM identity.nguoi_dung WHERE id = $1 AND don_vi_id IS NOT NULL
               UNION SELECT don_vi_id FROM identity.kiem_nhiem WHERE nguoi_dung_id = $1`,
              [p.id],
            )
          ).rows.map((r) => r.id);
    if (dvNhan.length && dvNhan.every((d) => cam.has(d))) {
      const ten = p.ten || (await tenPhuTrach(q, p.loai, p.id));
      throw new LoiHttp(
        403,
        `Không giao đích danh được cho ${ten}: SCI PMC, SCI E&C là công ty SCI có cổ phần — giao cho cả đơn vị đó, người đứng đầu đơn vị sẽ giao tiếp cho nhân viên của họ`,
      );
    }
  }
  const pv = await phamViGiao(q, nd);
  if (pv === "tat_ca") return;
  const dv =
    p.loai === "don_vi"
      ? [p.id]
      : (
          await q.query<{ id: string }>(
            `SELECT don_vi_id AS id FROM identity.nguoi_dung WHERE id = $1 AND don_vi_id IS NOT NULL
             UNION SELECT don_vi_id FROM identity.kiem_nhiem WHERE nguoi_dung_id = $1`,
            [p.id],
          )
        ).rows.map((r) => r.id);
  // Giao ĐÍCH DANH (Mr. Đại chốt 30/09): trưởng phòng chỉ giao cho nhân viên PHÒNG MÌNH; đơn vị cấp dưới thì giao cho cả
  // đơn vị — trưởng đơn vị đó tự phân công cho người của họ (thao tác "phân công").
  if (p.loai === "nguoi" && !dv.some((d) => nd.don_vi_ids.includes(d))) {
    const ten = p.ten || (await tenPhuTrach(q, p.loai, p.id));
    throw new LoiHttp(
      403,
      `Không giao đích danh được cho ${ten}: bạn chỉ giao cho từng nhân viên phòng mình. Đơn vị cấp dưới thì giao cho cả đơn vị — trưởng đơn vị đó tự phân công`,
    );
  }
  if (!dv.some((d) => pv.includes(d))) {
    const ten = p.ten || (await tenPhuTrach(q, p.loai, p.id));
    throw new LoiHttp(
      403,
      pv.length
        ? `Không giao được cho ${ten}: nằm ngoài phạm vi giao việc của bạn (đơn vị mình và cấp dưới). Việc cần cấp trên giao — bạn vẫn mời ${ten} phối hợp được.`
        : "Bạn không có quyền giao việc",
    );
  }
}

/** Cây bút ✏ "Sửa việc" (Mr. Đại chốt 29/09) — quyền riêng "cong_viec.sua_viec", phạm vi tính như quyền sửa. */
export const coTheSuaViec = (q: Q, nd: NguoiDungPhien, cv: CongViec, phan?: PhanViec[]) => coTheSua(q, nd, cv, phan, "cong_viec.sua_viec");

/**
 * Thêm ĐƠN VỊ PHỐI HỢP (Mr. Đại duyệt K5 02/10/2026): ngoài người sửa được việc, trưởng đơn vị CẤP TRÊN của bên chủ trì (đơn vị chủ
 * trì nằm trong phạm vi "Giao việc" của mình: đơn vị mình + cấp dưới) cũng mời phối hợp được. Không mở gia hạn / hủy / đổi chủ trì.
 */
export async function coTheThemPhoiHop(q: Q, nd: NguoiDungPhien, cv: CongViec, phan?: PhanViec[], pvSan?: "tat_ca" | string[], daKiemSua = false): Promise<boolean> {
  if (!daKiemSua && (await coTheSua(q, nd, cv, phan))) return true;
  const pv = pvSan ?? (await phamViGiao(q, nd));
  if (pv === "tat_ca") return true;
  if (!pv.length) return false;
  const chuTri = (phan ?? (await layPhanViec(q, [cv.id]))).filter((p) => p.vai !== "phoi_hop");
  if (!chuTri.length) return false; // chưa có chủ trì → phần thêm vào thành chủ trì = giao việc, không phải phối hợp
  for (const p of chuTri) {
    const dv =
      p.phu_trach_loai === "don_vi"
        ? [p.phu_trach_id]
        : (await q.query<{ id: string }>("SELECT don_vi_id AS id FROM identity.nguoi_dung WHERE id = $1 AND don_vi_id IS NOT NULL", [p.phu_trach_id])).rows.map((r) => r.id);
    if (dv.some((d) => pv.includes(d))) return true;
  }
  return false;
}

/**
 * Chặn chữ VỠ PHÔNG (ký tự thay thế "�") — P2 Mr. Đại duyệt 02/10: CV-2026-0072 "test c�y b�t d� s?a" (gõ từ công cụ sai mã chữ)
 * lọt vào câu trả lời AI. Chữ đã vỡ thì không khôi phục được → bắt người giao gõ lại.
 */
function kiemChuVo(chu: string, nhan: string): void {
  if (chu.includes("\uFFFD")) throw new LoiHttp(400, `${nhan} có ký tự lỗi phông (�) — chữ tiếng Việt bị vỡ khi gửi lên. Gõ lại ${nhan.toLowerCase()} rồi lưu`);
}

async function batBuocSua(q: Q, nd: NguoiDungPhien, cv: CongViec): Promise<void> {
  if (!(await coTheSua(q, nd, cv))) throw new LoiHttp(403, `Chỉ người giao việc ${cv.id} hoặc lãnh đạo mới được gia hạn, thêm/đổi người, hủy việc`);
}

async function viecDangMo(q: Q, id: string): Promise<CongViec> {
  const cv = await layViec(q, id);
  if (!cv) throw new LoiHttp(404, `Không có công việc ${id}`);
  if (cv.trang_thai !== "dang_mo") throw new LoiHttp(409, `Công việc ${id} đã rời sổ cái (${cv.trang_thai === "hoan_thanh" ? "hoàn thành" : "đã đóng"})`);
  return cv;
}

// ---------------- Ghi: mã việc, nguồn, phần việc, hoàn thành ----------------

/** Cấp mã việc theo nguyên tắc trong Cài đặt (năm / tháng / đơn vị / dự án). Mỗi tiền tố một dãy số riêng. */
async function capMaViec(q: Q, ngayGui: string, ngCanh: { don_vi_id?: string | null; du_an?: string | null } = {}): Promise<string> {
  const ch = await layCauHinh(q, "so_cai");
  const mau = mauMaViec(ch);
  const luc = new Date(ngayGui || Date.now());
  const ngay = homNayVN(Number.isNaN(luc.getTime()) ? new Date() : luc);
  const nam = Number(ngay.slice(0, 4)) || new Date().getFullYear();
  const them = { thang: Number(ngay.slice(5, 7)) || 1, don_vi: ngCanh.don_vi_id ?? null, du_an: ngCanh.du_an ?? null };
  // Mẫu chỉ theo năm giữ khóa bộ đếm cũ ('cong_viec:2026') để số tiếp nối
  const khoaDem = /\{(thang|don_vi|du_an)\}/.test(mau) ? `cong_viec:${dienTruocSo(mau, nam, them)}` : `cong_viec:${nam}`;
  for (;;) {
    const so = await demTiep(q, khoaDem);
    const ma = dinhDangMaViec(mau, nam, so, them);
    const { rows } = await q.query("SELECT 1 FROM docflow.cong_viec WHERE id = $1", [ma]);
    if (!rows.length) return ma;
  }
}

interface ThongTinNguon {
  tai_lieu_id: string | null;
  phien_ban: number | null;
  mau_ma: string | null;
  nhan: string;
  don_vi_id: string | null;
  cap: number;
  ky_bao_cao_den: string | null;
  ngay_gui: string;
  nguoi_gui: string;
  la_quyet_dinh: boolean;
}

async function themNguon(
  q: Q,
  cvId: string,
  n: ThongTinNguon,
  dong: DongCongViec,
  trangThai: NguonCongViec["trang_thai"],
  lyDo: string | null,
): Promise<string> {
  const id = taoMa("ng");
  await q.query(
    `INSERT INTO docflow.nguon_cong_viec (id, cong_viec_id, tai_lieu_id, phien_ban, mau_ma, nhan, don_vi_id, cap, ky_bao_cao,
       ngay_gui, du_lieu, trang_thai, ly_do, la_quyet_dinh, nguoi_gui, dong_so)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
    [
      id, cvId, n.tai_lieu_id, n.phien_ban, n.mau_ma, n.nhan, n.don_vi_id, n.cap, n.ky_bao_cao_den?.slice(0, 10) || null,
      n.ngay_gui, JSON.stringify(dong), trangThai, lyDo, n.la_quyet_dinh, n.nguoi_gui, dong.dong_so ?? null,
    ],
  );
  return id;
}

type PhuTrachNgay = PhuTrach & { bat_dau?: string | null; ket_thuc?: string | null };

function khoa(p: { loai?: string; phu_trach_loai?: string; id?: string; phu_trach_id?: string }): string {
  return `${p.loai ?? p.phu_trach_loai}:${p.id ?? p.phu_trach_id}`;
}

async function themMotPhanViec(q: Q, cvId: string, p: PhuTrachNgay, noiDung: string, thuTu: number): Promise<string> {
  const id = taoMa("pv");
  const kt = p.ket_thuc || null;
  await q.query(
    `INSERT INTO docflow.phan_viec (id, cong_viec_id, phu_trach_loai, phu_trach_id, noi_dung, luon_mo, bat_dau, ket_thuc, thu_tu)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [id, cvId, p.loai, p.id, noiDung, !kt, p.bat_dau || null, kt, thuTu],
  );
  await chuanHoaVai(q, cvId);
  return id;
}

/**
 * 🤖 Gắn LÃNH ĐẠO PHỐI HỢP (db/82, chốt 03/10) — thêm một phần phối hợp cho đơn vị chức danh lãnh đạo, xếp cuối để không bao giờ
 * lên chủ trì. Đã có phần đang làm của đơn vị đó thì thôi. Trả true nếu thêm mới.
 */
export async function themLanhDaoPhoiHop(q: Q, cvId: string, donViId: string, tenViec: string): Promise<boolean> {
  const co = await q.query("SELECT 1 FROM docflow.phan_viec WHERE cong_viec_id = $1 AND phu_trach_loai = 'don_vi' AND phu_trach_id = $2 AND NOT da_bo", [cvId, donViId]);
  if (co.rows.length) return false;
  const tt = (await q.query<{ m: number }>("SELECT COALESCE(max(thu_tu), 0)::int AS m FROM docflow.phan_viec WHERE cong_viec_id = $1", [cvId])).rows[0].m;
  const id = taoMa("pv");
  await q.query(
    `INSERT INTO docflow.phan_viec (id, cong_viec_id, phu_trach_loai, phu_trach_id, noi_dung, luon_mo, thu_tu, vai)
     VALUES ($1,$2,'don_vi',$3,$4,true,$5,'phoi_hop')`,
    [id, cvId, donViId, tenViec, tt + 1],
  );
  await chuanHoaVai(q, cvId);
  return true;
}

/**
 * Giữ bất biến CHỦ TRÌ / PHỐI HỢP (Mr. Đại chốt 28/09, db/68-vai-phan-viec.sql): mỗi việc đúng MỘT phần chủ trì còn hiệu lực —
 * không còn thì bên đứng đầu (thu_tu nhỏ nhất) lên chủ trì; dòng mới chưa có vai là phối hợp; phối hợp không mang hạn riêng.
 */
export async function chuanHoaVai(q: Q, cvId: string): Promise<void> {
  await q.query(
    `UPDATE docflow.phan_viec SET vai = 'chu_tri' WHERE id = (
       SELECT x.id FROM docflow.phan_viec x WHERE x.cong_viec_id = $1 AND NOT x.da_bo
          AND NOT EXISTS (SELECT 1 FROM docflow.phan_viec y WHERE y.cong_viec_id = $1 AND NOT y.da_bo AND y.vai = 'chu_tri')
        ORDER BY x.thu_tu, x.id LIMIT 1)`,
    [cvId],
  );
  await q.query("UPDATE docflow.phan_viec SET vai = 'phoi_hop' WHERE cong_viec_id = $1 AND vai IS NULL", [cvId]);
  await q.query(
    `UPDATE docflow.phan_viec SET ket_thuc = NULL, luon_mo = true
      WHERE cong_viec_id = $1 AND vai = 'phoi_hop' AND NOT da_bo AND trang_thai = 'dang_lam' AND (ket_thuc IS NOT NULL OR NOT luon_mo)`,
    [cvId],
  );
}

/**
 * Đặt lại phần việc theo danh sách phụ trách mới. Giữ nguyên phần đã kết thúc;
 * phần đang làm không còn trong danh sách thì đánh dấu bỏ (không xóa dòng).
 */
async function datPhanViec(q: Q, cvId: string, tenViecCu: string, tenViec: string, ds: PhuTrachNgay[], lyDoBo: string) {
  const cu = await layPhanViec(q, [cvId]);
  const theoKhoa = new Map(cu.map((p) => [khoa(p), p]));
  const moi = new Set(ds.map(khoa));
  // Lãnh đạo phối hợp do máy gắn (db/82) không nằm trong báo cáo — bản mới của báo cáo không được bỏ đi
  const ld = (await q.query<{ id: string }>("SELECT don_vi_id AS id FROM docflow.lanh_dao_phoi_hop WHERE cong_viec_id = $1 AND don_vi_id IS NOT NULL", [cvId])).rows[0]?.id;
  if (ld) moi.add(`don_vi:${ld}`);
  const thayDoi: { them: string[]; bo: string[] } = { them: [], bo: [] };
  for (const p of cu) {
    if (p.trang_thai === "dang_lam" && !moi.has(khoa(p))) {
      await q.query("UPDATE docflow.phan_viec SET da_bo = true, bo_ly_do = $2 WHERE id = $1", [p.id, lyDoBo]);
      thayDoi.bo.push(p.phu_trach_ten ?? p.phu_trach_id);
    }
  }
  let thuTu = cu.reduce((m, p) => Math.max(m, p.thu_tu), 0);
  for (const pt of ds) {
    const co = theoKhoa.get(khoa(pt));
    const kt = pt.ket_thuc || null;
    if (co) {
      if (co.trang_thai === "da_ket_thuc") continue; // giữ phần đã kết thúc
      const noiDung = pt.noi_dung?.trim() || (co.noi_dung === tenViecCu ? tenViec : co.noi_dung);
      await q.query(
        "UPDATE docflow.phan_viec SET noi_dung = $2, bat_dau = $3, ket_thuc = $4, luon_mo = $5 WHERE id = $1",
        [co.id, noiDung, pt.bat_dau || null, kt, !kt],
      );
    } else {
      await themMotPhanViec(q, cvId, pt, pt.noi_dung?.trim() || tenViec, ++thuTu);
      thayDoi.them.push(pt.ten);
    }
  }
  await chuanHoaVai(q, cvId);
  return thayDoi;
}

/** Hết phần việc đang làm (và có ít nhất một phần đã kết thúc) → việc hoàn thành, rời sổ cái. */
export async function kiemTraHoanThanh(
  q: Q,
  cvId: string,
  nguoi: string,
  chiTiet: Record<string, unknown> = {},
  /** Lời báo xong của phần cuối (ai bấm · ghi chú · file) — gộp vào tin "hoàn thành" để người giao nhận MỘT tin, không hai */
  baoXong?: { chu: string; tep: TepTB[] },
): Promise<{ tien_do: string; hoan_thanh: boolean }> {
  const ds = await layPhanViec(q, [cvId]);
  const td = tienDo(ds);
  // Việc xong khi phần CHỦ TRÌ kết thúc; phối hợp không chặn (Mr. Đại chốt 28/09)
  const chuTri = ds.filter((p) => p.vai !== "phoi_hop");
  const conLam = chuTri.some((p) => p.trang_thai === "dang_lam");
  if (!conLam && chuTri.length > 0) {
    const r = await q.query(
      "UPDATE docflow.cong_viec SET trang_thai = 'hoan_thanh', dong_luc = now() WHERE id = $1 AND trang_thai = 'dang_mo' RETURNING id",
      [cvId],
    );
    if (r.rows.length) {
      await tatChuongViecXong(q, cvId); // 3b (Mr. Đại duyệt 08/10): chuông nhắc / giao / bình luận của việc thành đã đọc, tin "xong" vẫn tới người giao
      await ghiLichSu(q, {
        nguoi,
        doi_tuong_loai: "cong_viec",
        doi_tuong_id: cvId,
        hanh_dong: "cong_viec_hoan_thanh",
        chi_tiet: { tien_do: td, so_phan_viec: ds.length, ...chiTiet },
      });
      const cv = await layViec(q, cvId);
      // Tin "hoàn thành" kèm mọi file báo xong còn hạn lưu (Mr. Đại chốt 29/09: mọi tin chuông có link xem/tải)
      const tep: TepTB[] = (await dinhKemCuaViec(q, cvId)).filter((t) => t.noi === "bao_xong" && !t.xoa_luc).map((t) => ({ id: t.id, ten: t.ten_tep }));
      for (const t of baoXong?.tep ?? []) if (!tep.some((x) => x.id === t.id)) tep.push(t);
      // Phần phối hợp tự đóng theo chủ trì, bên phối hợp được báo việc đã xong
      for (const p of ds.filter((x) => x.vai === "phoi_hop" && x.trang_thai === "dang_lam")) {
        await q.query(
          "UPDATE docflow.phan_viec SET trang_thai = 'da_ket_thuc', ket_thuc_boi = 'he-thong', ket_thuc_luc = now(), ghi_chu = COALESCE(ghi_chu, 'Tự đóng theo chủ trì') WHERE id = $1",
          [p.id],
        );
        await baoPhuTrach(q, p, {
          loai: "cong_viec_hoan_thanh",
          noi_dung: `Việc ${cvId} · ${cv?.ten ?? ""} (bạn phối hợp) đã hoàn thành`,
          lien_ket: `/cong-viec/${cvId}`,
          tep,
        });
      }
      if (cv?.giao_boi && cv.giao_boi !== nguoi) {
        await taoThongBao(q, {
          nguoi_nhan: cv.giao_boi,
          loai: "cong_viec_hoan_thanh",
          noi_dung: `Việc ${cvId} · ${cv.ten} đã hoàn thành (${td}), rời sổ cái${baoXong ? ` — ${baoXong.chu}` : ""}`,
          lien_ket: `/cong-viec/${cvId}`,
          tep,
        });
      }
      // Việc đang chờ việc này ("sau khi xong …"): tính ngày bắt đầu / hạn
      await capNhatViecSau(q, cvId, nguoi);
    }
    return { tien_do: td, hoan_thanh: true };
  }
  return { tien_do: td, hoan_thanh: false };
}

// ---------------- Lõi vào sổ cái (xem trước + ghi dùng chung) ----------------

function phuTrachCuaDong(d: DongCongViec, dv: DauVaoSoCai, tenDonViGui: string | null): PhuTrachNgay[] {
  const ds = (d.phu_trach ?? []).filter((p) => p && p.id);
  if (ds.length) return ds.map((p) => ({ ...p, bat_dau: d.bat_dau ?? null, ket_thuc: d.ket_thuc ?? null }));
  // Phụ trách trống → gán đơn vị lập báo cáo (hoặc người gửi nếu không có đơn vị)
  if (dv.don_vi_id) return [{ loai: "don_vi", id: dv.don_vi_id, ten: tenDonViGui ?? dv.don_vi_id, bat_dau: d.bat_dau ?? null, ket_thuc: d.ket_thuc ?? null }];
  return [{ loai: "nguoi", id: dv.nguoi_gui, ten: dv.nguoi_gui, bat_dau: d.bat_dau ?? null, ket_thuc: d.ket_thuc ?? null }];
}

/** Người/đơn vị gửi có phải người phụ trách/đơn vị thực hiện của việc không → trả các phần việc của họ. */
function phanCuaNguoiBao(ds: PhanViecDay[], dv: DauVaoSoCai): PhanViecDay[] {
  return ds.filter(
    (p) =>
      p.trang_thai === "dang_lam" &&
      ((p.phu_trach_loai === "nguoi" && p.phu_trach_id === dv.nguoi_gui) || (p.phu_trach_loai === "don_vi" && p.phu_trach_id === dv.don_vi_id)),
  );
}

async function bangQuyetDinh(q: Q, mauMa: string | null): Promise<Set<string>> {
  const tags = new Set<string>(["bang_quyet_dinh"]);
  if (!mauMa) return tags;
  const { rows } = await q.query<{ dinh_nghia: { bang_cong_viec?: { tag: string; la_quyet_dinh?: boolean }[] } }>(
    "SELECT dinh_nghia FROM docflow.mau_word WHERE ma = $1",
    [mauMa],
  );
  for (const b of rows[0]?.dinh_nghia?.bang_cong_viec ?? []) if (b.la_quyet_dinh) tags.add(b.tag);
  return tags;
}

interface ViecMo {
  id: string;
  ten: string;
  du_an: string | null;
  hang_muc: string | null;
  /** Tên việc ở các bản nguồn đã ghi (việc có thể đã đổi tên, vd TGĐ quyết định "Chi trả GPMB Trụ T11") */
  ten_cu?: string[] | null;
  /** Việc đã xong / đã đóng: ngày rời sổ cái (yyyy-mm-dd); null = đang mở */
  xong_ngay?: string | null;
  /** Việc đã xong do một BẢN BÁO CÁO báo xong: cấp + nhãn bản đó (để biết người nộp có được mở lại không) */
  xong_cap?: number | null;
  xong_nhan?: string | null;
}

/** Việc để so trùng: ĐANG MỞ + ĐÃ XONG / ĐÃ ĐÓNG gần đây (Mr. Đại bắt lỗi 02/10: chỉ so việc đang mở thì báo cáo ghi lại
 *  "Thi công móng trụ T5–T8 — Đã xong" lần hai không thấy CV-2026-0003 đã đóng → sinh việc mới CV-2026-0098). */
async function viecDeSoTrung(q: Q): Promise<ViecMo[]> {
  const { rows } = await q.query<ViecMo>(
    `SELECT s.id, s.ten, s.du_an, s.hang_muc,
            COALESCE((SELECT array_agg(DISTINCT n.du_lieu->>'ten') FROM docflow.nguon_cong_viec n WHERE n.cong_viec_id = s.id), '{}') AS ten_cu,
            CASE WHEN s.trang_thai = 'dang_mo' THEN NULL ELSE ((COALESCE(s.dong_luc, s.tao_luc) + interval '7 hours')::date)::text END AS xong_ngay,
            n.cap AS xong_cap, n.nhan AS xong_nhan
       FROM docflow.cong_viec s
       LEFT JOIN docflow.nguon_cong_viec n ON n.id = s.nguon_hien_hanh_id AND s.trang_thai <> 'dang_mo' AND (n.du_lieu->>'da_xong')::boolean
      WHERE s.trang_thai = 'dang_mo' OR COALESCE(s.dong_luc, s.tao_luc) > now() - make_interval(days => $1)
      ORDER BY s.id`,
    [NGAY_SO_VIEC_DA_XONG],
  );
  return rows;
}

export type UngVienTrung = { cong_viec_id: string; ten: string; do_giong: number; da_xong: string | null };

/** Ứng viên trùng MÁY thấy cho từng dòng (cùng cách so của lúc ghi sổ) — để AI bước 4 soát lại từng ứng viên. */
export async function ungVienTrung(q: Q, ds: Pick<DongCongViec, "ten" | "du_an" | "hang_muc">[]): Promise<UngVienTrung[][]> {
  const ch = await layCauHinh(q, "quy_tac_de");
  const viec = await viecDeSoTrung(q);
  const duAnYeu = hamDuAnYeu((await q.query<{ ten: string; ten_ngan: string | null }>("SELECT ten, ten_ngan FROM identity.don_vi")).rows);
  const duAnId = await hamDuAnId(q);
  return ds.map((d) =>
    viec
      .map((v) => ({ cong_viec_id: v.id, ten: v.ten, do_giong: doGiongVoiViecMo(d, v, duAnYeu, duAnId), da_xong: v.xong_ngay ?? null }))
      .filter((g) => g.do_giong >= ch.nguong_goi_y_trung)
      .sort((a, b) => b.do_giong - a.do_giong)
      .slice(0, 5),
  );
}

/** Số ngày việc đã xong vẫn được đưa ra so trùng (báo cáo kỳ sau còn ghi lại việc đã xong — chuỗi theo dõi việc 01/10) */
const NGAY_SO_VIEC_DA_XONG = 120;

/** Dòng việc KHÔNG vào sổ cái (báo đã xong mà sổ chưa từng có · người nộp chọn không vào sổ) — ghi lại để Rà soát không
 *  coi là "thiếu" rồi tự bổ sung ngược lại (db/79). */
async function ghiKhongVaoSo(q: Q, dv: DauVaoSoCai, d: DongCongViec, lyDo: string): Promise<void> {
  if (!dv.tai_lieu_id || dv.phien_ban === null) return;
  await q.query(
    `INSERT INTO docflow.viec_bi_bo (tai_lieu_id, phien_ban, nguon_bang, dong_so, y_so, ten, nguoi, ly_do) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (tai_lieu_id, phien_ban, nguon_bang, dong_so, y_so) DO UPDATE SET ly_do = EXCLUDED.ly_do`,
    [dv.tai_lieu_id, dv.phien_ban, d.nguon_bang, d.dong_so, d.y_so ? Number(d.y_so) : 1, d.ten, dv.nguoi_gui, lyDo],
  );
}

// ---------------- Lần nạp đầu: dòng đã xong cũng vào sổ (Mr. Đại nêu 08/10, gật 18/10/2026) ----------------
// Tuần đầu lên hosting sổ trống → khối xanh "Việc làm xong: Tuần N−1 và N" (họp giao ban) không có gì, vì luật 02/10 "việc đã xong
// không vào sổ — chỉ dùng để đóng việc đang mở". Ngoại lệ: bản ĐẦU TIÊN của một đơn vị lập + một mẫu báo cáo thì dòng báo đã xong
// vào sổ ở trạng thái ĐÃ XONG (không sinh việc đang mở, không chuông giao việc). Từ kỳ sau, đã xong chỉ dùng để đóng việc như cũ.

/**
 * Bản này có phải LẦN NẠP ĐẦU của (đơn vị lập + mẫu báo cáo) không: sổ cái chưa có dòng nguồn nào, cũng chưa có dòng "không vào sổ"
 * nào (docflow.viec_bi_bo), đến từ một TÀI LIỆU KHÁC cùng đơn vị lập, cùng mẫu. Gửi lại bản mới của chính tài liệu đó vẫn là lần đầu
 * (cùng kỳ). Đơn vị lập trống → tính theo người gửi. Không phải lần đầu khi: tài liệu không theo mẫu · ghi không có tài liệu (giao
 * tay) · chính bản này đã có dòng trong sổ (Rà soát chạy lại một bản cũ — không ghi ngược việc đã xong vào quá khứ).
 */
export async function laLanNapDau(
  q: Q,
  dv: Pick<DauVaoSoCai, "tai_lieu_id" | "phien_ban" | "mau_ma" | "don_vi_id" | "nguoi_gui">,
  ghi: boolean,
): Promise<boolean> {
  if (!dv.mau_ma) return false;
  if (ghi && !dv.tai_lieu_id) return false;
  const { rows } = await q.query<{ co: boolean }>(
    `SELECT (
       EXISTS (SELECT 1 FROM docflow.nguon_cong_viec n
                WHERE NOT n.la_quyet_dinh AND n.mau_ma = $2 AND ($1::text IS NULL OR n.tai_lieu_id IS DISTINCT FROM $1)
                  AND CASE WHEN $3::text IS NULL THEN n.don_vi_id IS NULL AND n.nguoi_gui = $4 ELSE n.don_vi_id = $3 END)
       OR EXISTS (SELECT 1 FROM docflow.viec_bi_bo b JOIN docflow.tai_lieu t ON t.id = b.tai_lieu_id
                   WHERE t.mau_ma = $2 AND ($1::text IS NULL OR b.tai_lieu_id <> $1)
                     AND CASE WHEN $3::text IS NULL THEN t.don_vi_lap IS NULL AND b.nguoi = $4 ELSE t.don_vi_lap = $3 END)
       OR ($1::text IS NOT NULL AND EXISTS (SELECT 1 FROM docflow.nguon_cong_viec g WHERE g.tai_lieu_id = $1 AND g.phien_ban IS NOT DISTINCT FROM $5::int))
     ) AS co`,
    [dv.tai_lieu_id, dv.mau_ma, dv.don_vi_id, dv.nguoi_gui, dv.phien_ban],
  );
  return !rows[0]?.co;
}

/**
 * Ngày xong của dòng đã xong vào sổ lần nạp đầu (yyyy-mm-dd): cột Kết thúc của dòng; trống thì ngày cuối kỳ báo cáo; không có kỳ thì
 * ngày nộp. Không bao giờ sau ngày nộp (đã báo xong thì xong trước lúc nộp) — vd hạn 30/10 mà nộp 15/10 báo "Đã xong" → 15/10.
 */
export function ngayXongLanDau(d: Pick<DongCongViec, "ket_thuc">, dv: Pick<DauVaoSoCai, "ky_bao_cao_den" | "ngay_gui">): string {
  const iso = (s?: string | null) => (s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null);
  const g = Date.parse(dv.ngay_gui);
  const nop = homNayVN(Number.isFinite(g) ? new Date(g) : new Date());
  const chon = iso(d.ket_thuc) ?? iso(dv.ky_bao_cao_den) ?? nop;
  return chon > nop ? nop : chon;
}

/** Lúc xong (giờ VN 12:00 của ngày xong, không quá lúc nộp) — cột dong_luc; khối "Việc làm xong" đọc ngày theo giờ VN */
function lucXongLanDau(ngay: string, ngayGui: string): string {
  const t = Date.parse(`${ngay}T12:00:00+07:00`);
  const g = Date.parse(ngayGui);
  return new Date(Number.isFinite(g) && g < t ? g : t).toISOString();
}

/**
 * Dòng này của ĐÚNG bản này đã có quyết định "không vào sổ" (viec_bi_bo): người nộp BỎ ở bước Duyệt, chọn "Không vào sổ", hoặc máy ghi
 * "đã xong, sổ chưa từng có". Trả lý do để hiện; null = chưa có. Rà soát ghi lại cả bản không được đè lựa chọn của người (Mr. Đại
 * duyệt 18/10/2026 — đo trước khi sửa: dòng đã Bỏ bị tạo lại thành 1 việc đang mở).
 */
async function quyetDinhKhongVaoSo(q: Q, dv: DauVaoSoCai, d: DongCongViec): Promise<string | null> {
  if (!dv.tai_lieu_id || dv.phien_ban === null) return null;
  const { rows } = await q.query<{ ly_do: string | null }>(
    "SELECT ly_do FROM docflow.viec_bi_bo WHERE tai_lieu_id = $1 AND phien_ban = $2 AND nguon_bang = $3 AND dong_so = $4 AND y_so = $5",
    [dv.tai_lieu_id, dv.phien_ban, d.nguon_bang, d.dong_so, d.y_so ? Number(d.y_so) : 1],
  );
  if (!rows[0]) return null;
  return rows[0].ly_do ? `đã quyết không vào sổ từ trước: ${rows[0].ly_do}` : "người nộp đã bỏ dòng này ở bước Duyệt việc — không vào sổ cái";
}

/**
 * Ghi một dòng báo đã xong vào sổ ở trạng thái HOÀN THÀNH (lần nạp đầu): việc + nguồn hiện hành (tệp, dòng) + các phần việc đã kết
 * thúc + lịch sử. Không sinh việc đang mở, không chuông giao việc / hoàn thành (việc đã xong từ trước khi vào sổ). Trả mã việc.
 */
async function taoViecXongLanDau(q: Q, dv: DauVaoSoCai, d: DongCongViec, nguon: ThongTinNguon, tenDvGui: string | null, ngayXong: string, ghiChu: string): Promise<string> {
  const ma = await capMaViec(q, dv.ngay_gui, { don_vi_id: dv.don_vi_id, du_an: d.du_an });
  const luc = lucXongLanDau(ngayXong, dv.ngay_gui);
  // Ô Bắt đầu trống = ngày nộp, có thể sau ngày xong → bỏ ngày bắt đầu (không biết) để không thành "hạn trước ngày bắt đầu"
  const bd = d.bat_dau && d.bat_dau.slice(0, 10) <= ngayXong ? d.bat_dau : null;
  await q.query(
    `INSERT INTO docflow.cong_viec (id, ten, du_an, hang_muc, ket_qua_can_co, luon_mo, bat_dau, ket_thuc, giao_boi, don_vi_giao, bat_dau_kieu, trang_thai, dong_luc)
     VALUES ($1,$2,$3,$4,$5,false,$6,$7,$8,$9,$10,'hoan_thanh',$11)`,
    [ma, d.ten.trim(), d.du_an ?? null, d.hang_muc ?? null, d.ket_qua_can_co ?? null, bd, d.ket_thuc || null, await nguoiGiaoTuBaoCao(q, dv.don_vi_id, dv.nguoi_gui), dv.don_vi_id, bd ? (d.bat_dau_kieu ?? null) : null, luc],
  );
  const ngId = await themNguon(q, ma, nguon, d, "hien_hanh", null);
  await q.query("UPDATE docflow.cong_viec SET nguon_hien_hanh_id = $2 WHERE id = $1", [ma, ngId]);
  const pt = phuTrachCuaDong(d, dv, tenDvGui);
  let tt = 0;
  for (const p of pt) await themMotPhanViec(q, ma, p, p.noi_dung?.trim() || d.ten.trim(), ++tt);
  await q.query(
    `UPDATE docflow.phan_viec SET trang_thai = 'da_ket_thuc', ket_thuc_boi = $2, ket_thuc_luc = $3, ghi_chu = $4 WHERE cong_viec_id = $1 AND NOT da_bo`,
    [ma, dv.nguoi_gui, luc, `Báo đã xong trong ${dv.nhan} — lần nạp đầu`],
  );
  const chung = { tu: dv.nhan, nguon_id: ngId, tai_lieu_id: dv.tai_lieu_id, phien_ban: dv.phien_ban, lan_nap_dau: true, da_xong: true, ngay_xong: ngayXong };
  await ghiLichSu(q, {
    nguoi: dv.nguoi_gui,
    don_vi_id: dv.don_vi_id,
    doi_tuong_loai: "cong_viec",
    doi_tuong_id: ma,
    hanh_dong: "vao_so_cai",
    chi_tiet: { ...chung, don_vi_id: dv.don_vi_id, cap: dv.cap, ky_bao_cao: dv.ky_bao_cao_den ?? null, ten: d.ten, han: d.ket_thuc || null, phan_viec: pt.map((p) => p.ten), tien_do: `${pt.length}/${pt.length}`, lan_dau: true, ghi_chu: ghiChu },
  });
  await ghiLichSu(q, {
    nguoi: dv.nguoi_gui,
    don_vi_id: dv.don_vi_id,
    doi_tuong_loai: "cong_viec",
    doi_tuong_id: ma,
    hanh_dong: "cong_viec_hoan_thanh",
    chi_tiet: { ...chung, tien_do: `${pt.length}/${pt.length}`, so_phan_viec: pt.length },
  });
  return ma;
}

/** Độ giống một dòng với việc đang mở: so cả tên hiện tại lẫn các tên cũ của việc. */
export function doGiongVoiViecMo(d: { ten: string; du_an?: string | null; hang_muc?: string | null }, v: ViecMo, duAnYeu?: (s: string) => boolean, duAnId?: (s: string) => string | null): number {
  return Math.max(doGiongViec(d, v, duAnYeu, duAnId), ...(v.ten_cu ?? []).filter((t) => t && t !== v.ten).map((t) => doGiongViec(d, { ...v, ten: t }, duAnYeu, duAnId)));
}

/** Tra mã dự án theo danh mục dự án ở Cài đặt (cùng hàm menu Dự án dùng) — cho gợi ý trùng việc (K10). */
export async function hamDuAnId(q: Q): Promise<(s: string) => string | null> {
  const ds = await layCauHinh(q, "du_an");
  return (s: string) => duAnCuaViec(s, [], ds);
}

/** Cập nhật việc theo bản thắng: tên, ngày, phần việc theo bản mới. */
async function apDungBanMoi(
  q: Q,
  cv: CongViec,
  d: DongCongViec,
  pt: PhuTrachNgay[],
  nguonId: string,
  lyDoBo: string,
  giaoBoi: string,
  donViGiao: string | null,
) {
  const kt = d.ket_thuc || null;
  await q.query(
    `UPDATE docflow.cong_viec SET ten = $2, du_an = $3, hang_muc = $4, ket_qua_can_co = $5, bat_dau = $6, ket_thuc = $7,
       luon_mo = $8, nguon_hien_hanh_id = $9, cho_sua = false, giao_boi = $10, don_vi_giao = $11, bat_dau_kieu = $12 WHERE id = $1`,
    [cv.id, d.ten, d.du_an ?? cv.du_an, d.hang_muc ?? cv.hang_muc, d.ket_qua_can_co ?? cv.ket_qua_can_co, d.bat_dau || null, kt, !kt && !d.ket_thuc_sau, nguonId, giaoBoi, donViGiao, d.bat_dau_kieu ?? null],
  );
  return datPhanViec(q, cv.id, cv.ten, d.ten, pt, lyDoBo);
}

async function loi(q: Q, dv: DauVaoSoCai, ghi: boolean): Promise<DuDoanDong[]> {
  const ch = await layCauHinh(q, "quy_tac_de");
  const capBenNgoai = (await layCauHinh(q, "nguoi_ngoai")).cap_ben_ngoai;
  const mauTb = (await layCauHinh(q, "thong_bao")).mau;
  const tagQd = await bangQuyetDinh(q, dv.mau_ma);
  const tenDvGui = await tenDonVi(q, dv.don_vi_id);
  const moRows = await viecDeSoTrung(q);
  const duAnYeu = hamDuAnYeu((await q.query<{ ten: string; ten_ngan: string | null }>("SELECT ten, ten_ngan FROM identity.don_vi")).rows);
  const duAnId = await hamDuAnId(q);
  const nguonMoi: ThongTinNguon = {
    tai_lieu_id: dv.tai_lieu_id,
    phien_ban: dv.phien_ban,
    mau_ma: dv.mau_ma,
    nhan: dv.nhan,
    don_vi_id: dv.don_vi_id,
    cap: dv.cap,
    ky_bao_cao_den: dv.ky_bao_cao_den ?? null,
    ngay_gui: dv.ngay_gui,
    nguoi_gui: dv.nguoi_gui,
    la_quyet_dinh: false,
  };
  const ssMoi = { cap: dv.cap, ky_bao_cao: dv.ky_bao_cao_den ?? null, ngay_gui: dv.ngay_gui };
  const kq: DuDoanDong[] = [];
  // Lần nạp đầu của đơn vị lập + mẫu (tính MỘT lần, trước khi ghi dòng nào): dòng báo đã xong vào sổ ở trạng thái đã xong
  const lanDau = await laLanNapDau(q, dv, ghi);
  const LOI_LAN_DAU = "lần nạp đầu (đơn vị lập và mẫu báo cáo này chưa có kỳ trước trong sổ)";

  for (let i = 0; i < dv.cong_viec.length; i++) {
    const d = dv.cong_viec[i];
    if (!d || !d.ten?.trim()) {
      kq.push({ dong: i, hanh_dong: "khong_dung", ly_do: "dòng không có tên việc" });
      continue;
    }
    if (tagQd.has(d.nguon_bang)) {
      kq.push({ dong: i, hanh_dong: "khong_dung", ly_do: "nội dung chờ Tổng Giám đốc quyết định, giao việc ở trang tài liệu" });
      continue;
    }

    // Đã vào sổ cái rồi (gọi lại cùng tài liệu, cùng phiên bản, cùng dòng) → không ghi lần hai
    if (dv.tai_lieu_id && dv.phien_ban !== null) {
      const { rows } = await q.query<{ cong_viec_id: string }>(
        `SELECT cong_viec_id FROM docflow.nguon_cong_viec WHERE tai_lieu_id = $1 AND phien_ban = $2 AND dong_so = $3
           AND du_lieu->>'nguon_bang' = $4 AND COALESCE(du_lieu->>'y_so', '1') = $5 AND NOT la_quyet_dinh LIMIT 1`,
        [dv.tai_lieu_id, dv.phien_ban, d.dong_so, d.nguon_bang, String(d.y_so ?? 1)],
      );
      if (rows[0]) {
        kq.push({ dong: i, hanh_dong: "khong_dung", cong_viec_id: rows[0].cong_viec_id, ly_do: "dòng này đã vào sổ cái trước đó" });
        continue;
      }
      // Dòng của bản này đã có quyết định không vào sổ (người nộp Bỏ / chọn "Không vào sổ") → giữ, kể cả khi Rà soát ghi lại cả bản
      const daBo = await quyetDinhKhongVaoSo(q, dv, d);
      if (daBo) {
        kq.push({ dong: i, hanh_dong: "khong_dung", ly_do: daBo });
        continue;
      }
    }

    // ---- Tìm việc trùng ----
    let dich: CongViec | null = null;
    let ghiChuMa: string | null = null;
    // "xong" = người nộp chọn "Vào sổ — đã xong (lần nạp đầu)" ở bước 4; ngoài ra như chưa chọn
    const chonXong = dv.xac_nhan_trung?.[i] === "xong";
    const xac = chonXong ? undefined : dv.xac_nhan_trung?.[i];
    if (xac === "khong") {
      const lyDo = d.da_xong ? "báo đã xong — người nộp chọn không đưa vào sổ cái" : "người nộp chọn không đưa vào sổ cái";
      if (ghi) await ghiKhongVaoSo(q, dv, d, lyDo);
      kq.push({ dong: i, hanh_dong: "khong_dung", ly_do: lyDo });
      continue;
    }

    if (d.ma_viec?.trim()) {
      dich = await layViec(q, d.ma_viec.trim());
      if (!dich) ghiChuMa = `mã ${d.ma_viec} không có trong sổ cái`;
    }
    if (!dich && xac && xac !== "moi") {
      dich = await layViec(q, xac);
      if (!dich) throw new LoiHttp(400, `Dòng ${i + 1}: không có việc ${xac} để gộp`);
    }
    if (!dich && xac !== "moi" && dv.tai_lieu_id && dv.phien_ban !== null) {
      // Cùng tài liệu gửi lại bản mới → khớp dòng cùng tên của bản trước
      const { rows } = await q.query<{ cong_viec_id: string; ten: string }>(
        `SELECT cong_viec_id, du_lieu->>'ten' AS ten FROM docflow.nguon_cong_viec
          WHERE tai_lieu_id = $1 AND phien_ban < $2 ORDER BY phien_ban DESC, luc DESC`,
        [dv.tai_lieu_id, dv.phien_ban],
      );
      const khop = rows.find((r) => chuanHoa(r.ten) === chuanHoa(d.ten));
      if (khop) {
        dich = await layViec(q, khop.cong_viec_id);
      }
    }

    // Chưa có mã: so tên + dự án + hạng mục với việc đang mở VÀ việc đã xong gần đây → gợi ý, KHÔNG tự gộp
    const goiY = dich || xac === "moi"
      ? []
      : moRows
          .map((v) => ({
            cong_viec_id: v.id,
            ten: v.ten,
            do_giong: doGiongVoiViecMo(d, v, duAnYeu, duAnId),
            da_xong: v.xong_ngay ?? null,
            ...(v.xong_ngay && v.xong_cap != null && dv.cap > v.xong_cap ? { cap_tren_xong: v.xong_nhan ?? "cấp trên" } : {}),
          }))
          .filter((g) => g.do_giong >= ch.nguong_goi_y_trung)
          .sort((a, b) => b.do_giong - a.do_giong || Number(!!a.da_xong) - Number(!!b.da_xong))
          .slice(0, 5);

    // DÒNG BÁO ĐÃ XONG (Mr. Đại chốt 02/10/2026): "mọi việc xong, 100%, đạt, kết thúc … thì không được vào sổ" — việc xong rồi thì
    // không giao. Chỉ dùng để ĐÓNG đúng việc đang có; đã ghi xong từ trước thì thôi; sổ chưa từng có thì không vào sổ.
    // Ngoại lệ LẦN NẠP ĐẦU (18/10/2026, laLanNapDau): sổ chưa từng có → vào sổ ở trạng thái đã xong.
    if (!dich && d.da_xong) {
      const mo = goiY.filter((g) => !g.da_xong);
      const xongTruoc = goiY.find((g) => g.da_xong && g.do_giong >= 0.9);
      if (!mo.length && xongTruoc) dich = await layViec(q, xongTruoc.cong_viec_id); // → nhánh "đã rời sổ cái" bên dưới
      else {
        const ngayXong = lanDau ? ngayXongLanDau(d, dv) : null;
        if (mo.length && !ghi && !(lanDau && (chonXong || xac === "moi"))) {
          kq.push({
            dong: i,
            hanh_dong: "goi_y_trung",
            ly_do: lanDau
              ? `báo đã xong — có vẻ là ${maKemTen(mo[0].cong_viec_id, mo[0].ten)}: chọn đúng việc để đóng, vào sổ ở trạng thái đã xong (${LOI_LAN_DAU}), hoặc không vào sổ`
              : `báo đã xong — có vẻ là ${maKemTen(mo[0].cong_viec_id, mo[0].ten)}: chọn đúng việc để đóng, hoặc không vào sổ`,
            goi_y: mo,
          });
          continue;
        }
        // LẦN NẠP ĐẦU (Mr. Đại gật 18/10/2026): vào sổ ở trạng thái đã xong, không sinh việc đang mở. Có việc đang mở giống mà người
        // nộp chưa chọn (vd mọi ứng viên 🤖 AI cho là khác việc) → vẫn ghi đã xong, việc đang mở giữ nguyên (không tự đóng).
        if (ngayXong) {
          const vi = d.da_xong_ai ? `🤖 AI đọc tình trạng "${d.tinh_trang ?? ""}" là đã xong (${d.da_xong_ai}) — ` : "";
          const chuaChon = mo.length && !chonXong && xac !== "moi" ? ` — có vẻ là ${maKemTen(mo[0].cong_viec_id, mo[0].ten)} nhưng người nộp chưa chọn: việc đó vẫn mở` : "";
          const lyDo = `${vi}${LOI_LAN_DAU}: vào sổ ở trạng thái đã xong ngày ${ngayNgan(ngayXong, true)}, không giao việc${chuaChon}`;
          if (!ghi) {
            kq.push({ dong: i, hanh_dong: "vao_so_xong", ly_do: lyDo });
            continue;
          }
          const ma = await taoViecXongLanDau(q, dv, d, nguonMoi, tenDvGui, ngayXong, lyDo);
          kq.push({ dong: i, hanh_dong: "vao_so_xong", cong_viec_id: ma, ly_do: lyDo });
          continue;
        }
        const vi = d.da_xong_ai ? `🤖 AI đọc tình trạng "${d.tinh_trang ?? ""}" là đã xong (${d.da_xong_ai}) — ` : "";
        const lyDo = vi + (mo.length
          ? `báo đã xong, có vẻ là ${maKemTen(mo[0].cong_viec_id, mo[0].ten)} nhưng người nộp chưa xác nhận — không vào sổ cái`
          : "việc đã xong, sổ cái chưa từng có — không vào sổ (việc xong rồi thì không giao)");
        if (ghi) await ghiKhongVaoSo(q, dv, d, lyDo);
        kq.push({ dong: i, hanh_dong: "khong_dung", ly_do: lyDo });
        continue;
      }
    }

    if (!dich) {
      if (goiY.length && !ghi) {
        const g0 = goiY[0];
        kq.push({
          dong: i,
          hanh_dong: "goi_y_trung",
          ly_do: g0.da_xong ? `có vẻ là ${g0.cong_viec_id} (đã xong ${ngayNgan(g0.da_xong, true)}): chọn mở lại hoặc tạo việc mới` : `có vẻ trùng ${g0.cong_viec_id}: xác nhận gộp hoặc tạo việc mới`,
          goi_y: goiY,
        });
        continue;
      }
      const lyDoTao = [ghiChuMa, goiY.length ? "có vẻ trùng nhưng chưa xác nhận: tạo việc mới, không gộp" : null].filter(Boolean).join("; ") || undefined;
      if (!ghi) {
        kq.push({ dong: i, hanh_dong: "tao_moi", ly_do: lyDoTao ?? (d.ket_thuc ? undefined : d.ket_thuc_sau ? "hạn tính khi xong việc mốc" : "không có hạn: việc treo") });
        continue;
      }
      // Tạo việc mới
      const ma = await capMaViec(q, dv.ngay_gui, { don_vi_id: dv.don_vi_id, du_an: d.du_an });
      const kt = d.ket_thuc || null;
      // Hạn tính theo việc mốc ("N ngày sau khi X"): chưa có hạn nhưng không phải việc treo
      await q.query(
        `INSERT INTO docflow.cong_viec (id, ten, du_an, hang_muc, ket_qua_can_co, luon_mo, bat_dau, ket_thuc, giao_boi, don_vi_giao, bat_dau_kieu)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [ma, d.ten.trim(), d.du_an ?? null, d.hang_muc ?? null, d.ket_qua_can_co ?? null, !kt && !d.ket_thuc_sau, d.bat_dau || null, kt, await nguoiGiaoTuBaoCao(q, dv.don_vi_id, dv.nguoi_gui), dv.don_vi_id, d.bat_dau_kieu ?? null],
      );
      const ngId = await themNguon(q, ma, nguonMoi, d, "hien_hanh", null);
      await q.query("UPDATE docflow.cong_viec SET nguon_hien_hanh_id = $2 WHERE id = $1", [ma, ngId]);
      const pt = phuTrachCuaDong(d, dv, tenDvGui);
      let tt = 0;
      for (const p of pt) await themMotPhanViec(q, ma, p, p.noi_dung?.trim() || d.ten.trim(), ++tt);
      await ghiLichSu(q, {
        nguoi: dv.nguoi_gui,
        don_vi_id: dv.don_vi_id,
        doi_tuong_loai: "cong_viec",
        doi_tuong_id: ma,
        hanh_dong: "vao_so_cai",
        chi_tiet: {
          tu: dv.nhan,
          nguon_id: ngId,
          tai_lieu_id: dv.tai_lieu_id,
          phien_ban: dv.phien_ban,
          don_vi_id: dv.don_vi_id,
          cap: dv.cap,
          ky_bao_cao: dv.ky_bao_cao_den ?? null,
          ten: d.ten,
          han: kt,
          luon_mo: !kt,
          phan_viec: pt.map((p) => p.ten),
          tien_do: `0/${pt.length}`,
          lan_dau: true,
          ...(lyDoTao ? { ghi_chu: lyDoTao } : {}),
        },
      });
      for (const p of pt) {
        if (p.loai === "don_vi" && p.id === dv.don_vi_id) continue;
        if (p.loai === "nguoi" && p.id === dv.nguoi_gui) continue;
        await baoPhuTrach(q, { phu_trach_loai: p.loai, phu_trach_id: p.id }, {
          loai: "giao_viec",
          noi_dung: `Việc mới ${ma} · ${d.ten} (từ ${dv.nhan})${kt ? `, hạn ${ngayNgan(kt, true)}` : ", luôn mở"}`,
          lien_ket: `/cong-viec/${ma}`,
        });
      }
      kq.push({ dong: i, hanh_dong: "tao_moi", cong_viec_id: ma, ly_do: lyDoTao, goi_y: goiY.length ? goiY : undefined });
      continue;
    }

    // ---- Trùng việc đã có ----
    let moLai = false;
    if (dich.trang_thai !== "dang_mo") {
      const ngayXong = dich.dong_luc ? ngayNgan(dich.dong_luc, true) : "";
      const tt = dich.trang_thai === "hoan_thanh" ? `đã xong${ngayXong ? ` ngày ${ngayXong}` : ""}` : `đã đóng${ngayXong ? ` ngày ${ngayXong}` : ""}`;
      // Việc do bản CẤP CAO HƠN báo xong (Mr. Đại chốt 02/10 chiều): cấp dưới ghi "chưa xong" thì KHÔNG mở lại — giữ đã xong, ghi
      // bản này là ý kiến khác và báo người giao biết để tự quyết (vd CV-0001 GPMB T11: P.ĐT&PC cấp 2 báo xong, BQLDA QT cấp 3 ghi đang làm)
      const nguonXong = await layNguon(q, dich.nguon_hien_hanh_id);
      const capTren = !d.da_xong && nguonXong?.du_lieu?.da_xong && nguonXong.cap != null && dv.cap > nguonXong.cap ? nguonXong : null;
      if (capTren && (xac === dich.id || ghi)) {
        const lyDo = `${capTren.nhan} (cấp trên) đã báo xong — bản này ghi "${d.tinh_trang?.trim() || "chưa xong"}": giữ đã xong, báo người giao`;
        if (ghi) {
          await themNguon(q, dich.id, nguonMoi, d, "khong_dung", lyDo);
          await ghiLichSu(q, {
            nguoi: dv.nguoi_gui,
            don_vi_id: dv.don_vi_id,
            doi_tuong_loai: "cong_viec",
            doi_tuong_id: dich.id,
            hanh_dong: "y_kien_khac",
            chi_tiet: { tu: dv.nhan, ly_do: lyDo, tinh_trang: d.tinh_trang ?? null, da_bao_xong_boi: capTren.nhan, tai_lieu_id: dv.tai_lieu_id, phien_ban: dv.phien_ban },
          });
          if (dich.giao_boi && dich.giao_boi !== dv.nguoi_gui)
            await taoThongBao(q, {
              nguoi_nhan: dich.giao_boi,
              loai: "y_kien_khac",
              noi_dung: `${dv.nhan} ghi việc ${maKemTen(dich.id, dich.ten)} còn "${d.tinh_trang?.trim() || "chưa xong"}" — trái với ${capTren.nhan} đã báo xong. Việc vẫn để đã xong; cần thì mở lại.`,
              lien_ket: `/cong-viec/${dich.id}`,
            });
        }
        kq.push({ dong: i, hanh_dong: "khong_dung", cong_viec_id: dich.id, ly_do: lyDo });
        continue;
      }
      // Báo cáo ghi CHƯA xong mà việc đã rời sổ: người nộp chọn "Đúng là CV-… (đã xong) — mở lại" (Mr. Đại chốt 02/10)
      if (!d.da_xong && xac === dich.id) {
        if (!ghi) {
          kq.push({ dong: i, hanh_dong: "de", cong_viec_id: dich.id, ly_do: `mở lại việc ${tt} — báo cáo ghi chưa xong` });
          continue;
        }
        await moLaiLoi(q, dich, { id: dv.nguoi_gui, ten: dv.nhan, don_vi_id: dv.don_vi_id }, `${dv.nhan} ghi việc chưa xong — người nộp chọn mở lại`, null);
        dich = (await layViec(q, dich.id))!;
        moLai = true;
      } else if (!d.da_xong && !ghi && !xac) {
        kq.push({
          dong: i,
          hanh_dong: "goi_y_trung",
          ly_do: `${maKemTen(dich.id, dich.ten)} ${tt} — báo cáo ghi chưa xong: chọn mở lại hoặc tạo việc mới`,
          goi_y: [{ cong_viec_id: dich.id, ten: dich.ten, do_giong: 1, da_xong: dich.dong_luc ? dich.dong_luc.slice(0, 10) : "" }],
        });
        continue;
      }
    }
    if (dich.trang_thai !== "dang_mo") {
      const ngayXong = dich.dong_luc ? ngayNgan(dich.dong_luc, true) : "";
      const lyDo = d.da_xong
        ? `đã ghi xong ở ${maKemTen(dich.id, dich.ten)}${ngayXong ? ` ngày ${ngayXong}` : ""} — không vào sổ lần nữa`
        : `việc ${dich.id} đã rời sổ cái (${dich.trang_thai === "hoan_thanh" ? "hoàn thành" : "đã đóng"})`;
      if (ghi) {
        await themNguon(q, dich.id, nguonMoi, d, "khong_dung", lyDo);
        await ghiLichSu(q, {
          nguoi: dv.nguoi_gui,
          don_vi_id: dv.don_vi_id,
          doi_tuong_loai: "cong_viec",
          doi_tuong_id: dich.id,
          hanh_dong: "khong_dung",
          chi_tiet: { tu: dv.nhan, ly_do: lyDo, da_xong: !!d.da_xong, tai_lieu_id: dv.tai_lieu_id, phien_ban: dv.phien_ban },
        });
      }
      kq.push({ dong: i, hanh_dong: "khong_dung", cong_viec_id: dich.id, ly_do: lyDo });
      continue;
    }

    const cu = await layNguon(q, dich.nguon_hien_hanh_id);
    const phan = await layPhanViec(q, [dich.id]);
    let ss: KetQuaSoSanh;
    if (!cu) ss = { thang: "moi", ly_do: "chưa có nguồn hiện hành" };
    // Chỉ khi bản ĐANG DÙNG là của chính tài liệu này (bản trước) — đo 30/09: bản 1 báo cáo nhà máy đã "không dùng" vì thua
    // cấp P.KT&VH, gửi lại bản 2 thì lọt qua nhánh "cùng tài liệu" và đè bản cấp trên. Bản đang dùng của nơi khác → so cấp như thường.
    else if (moLai) ss = { thang: "moi", ly_do: "mở lại theo báo cáo" };
    else if (cu.tai_lieu_id && cu.tai_lieu_id === dv.tai_lieu_id && (cu.phien_ban ?? 0) < (dv.phien_ban ?? 0))
      ss = { thang: "moi", ly_do: "bản mới của cùng tài liệu đè bản trước" };
    else ss = soSanhNguon({ cap: cu.cap, ky_bao_cao: cu.ky_bao_cao, ngay_gui: cu.ngay_gui, la_quyet_dinh: cu.la_quyet_dinh }, ssMoi, ch, capBenNgoai);

    // "Đã xong" từ người phụ trách / đơn vị thực hiện: đóng phần của họ, không xét cấp
    const phanNguoiBao = d.da_xong && ch.da_xong_luon_ghi_nhan ? phanCuaNguoiBao(phan, dv) : [];
    if (d.da_xong && (ss.thang === "moi" || phanNguoiBao.length)) {
      const dongHet = ss.thang === "moi";
      const canDong = dongHet ? phan.filter((p) => p.trang_thai === "dang_lam") : phanNguoiBao;
      const lyDo = dongHet ? `báo đã xong (${ss.ly_do})` : "người phụ trách báo đã xong: ghi nhận, không xét cấp";
      if (ghi) {
        const ngId = await themNguon(q, dich.id, nguonMoi, d, dongHet ? "hien_hanh" : "khong_dung", dongHet ? null : `${lyDo}; nội dung khác giữ theo bản hiện hành (${ss.ly_do})`);
        if (dongHet) {
          if (cu) await q.query("UPDATE docflow.nguon_cong_viec SET trang_thai = 'bi_de', ly_do = $2 WHERE id = $1", [cu.id, `${ss.ly_do} · bởi ${dv.nhan}`]);
          await q.query("UPDATE docflow.cong_viec SET nguon_hien_hanh_id = $2 WHERE id = $1", [dich.id, ngId]);
        }
        for (const p of canDong) {
          await q.query(
            `UPDATE docflow.phan_viec SET trang_thai = 'da_ket_thuc', ket_thuc_boi = $2, ket_thuc_luc = now(), ghi_chu = $3 WHERE id = $1`,
            [p.id, dv.nguoi_gui, `Báo đã xong trong ${dv.nhan}`],
          );
          await ghiLichSu(q, {
            nguoi: dv.nguoi_gui,
            don_vi_id: dv.don_vi_id,
            doi_tuong_loai: "cong_viec",
            doi_tuong_id: dich.id,
            hanh_dong: "ket_thuc_phan_viec",
            chi_tiet: { tu: dv.nhan, phan_viec_id: p.id, noi_dung: p.noi_dung, phu_trach: p.phu_trach_ten, ly_do: lyDo, tu_bao_cao: true },
          });
        }
        await kiemTraHoanThanh(q, dich.id, dv.nguoi_gui, { tu: dv.nhan });
      }
      kq.push({ dong: i, hanh_dong: "dong_viec", cong_viec_id: dich.id, ly_do: lyDo });
      continue;
    }

    if (ss.thang === "moi") {
      if (ghi) {
        const ngId = await themNguon(q, dich.id, nguonMoi, d, "hien_hanh", null);
        if (cu) await q.query("UPDATE docflow.nguon_cong_viec SET trang_thai = 'bi_de', ly_do = $2 WHERE id = $1", [cu.id, `${ss.ly_do} · bởi ${dv.nhan}`]);
        const pt = phuTrachCuaDong(d, dv, tenDvGui);
        const td = await apDungBanMoi(q, dich, d, pt, ngId, `không còn trong ${dv.nhan}`, await nguoiGiaoTuBaoCao(q, dv.don_vi_id, dv.nguoi_gui), dv.don_vi_id);
        await ghiLichSu(q, {
          nguoi: dv.nguoi_gui,
          don_vi_id: dv.don_vi_id,
          doi_tuong_loai: "cong_viec",
          doi_tuong_id: dich.id,
          hanh_dong: "bi_de",
          chi_tiet: {
            tu: dv.nhan,
            bi_de: cu?.nhan ?? null,
            nguon_id: ngId,
            nguon_bi_de_id: cu?.id ?? null,
            ly_do: ss.ly_do,
            tai_lieu_id: dv.tai_lieu_id,
            phien_ban: dv.phien_ban,
            cap: dv.cap,
            ky_bao_cao: dv.ky_bao_cao_den ?? null,
            han_cu: dich.ket_thuc,
            han_moi: d.ket_thuc || null,
            ten_cu: dich.ten !== d.ten ? dich.ten : undefined,
            ten_moi: dich.ten !== d.ten ? d.ten : undefined,
            them_phan_viec: td.them.length ? td.them : undefined,
            bo_phan_viec: td.bo.length ? td.bo : undefined,
          },
        });
        if (cu?.nguoi_gui && cu.nguoi_gui !== dv.nguoi_gui && ch.bao_nguoi_gui_khi_khong_dung) {
          await taoThongBao(q, {
            nguoi_nhan: cu.nguoi_gui,
            loai: "bi_de",
            noi_dung: `Bản của bạn cho việc ${maKemTen(dich.id, dich.ten)} (${cu.nhan}) đã bị đè bởi ${dv.nhan}: ${ss.ly_do}`,
            lien_ket: `/cong-viec/${dich.id}`,
          });
        }
      }
      kq.push({ dong: i, hanh_dong: "de", cong_viec_id: dich.id, ly_do: ss.ly_do });
      continue;
    }

    // Bản mới thua → không dùng, vẫn lưu để so sánh
    if (ghi) {
      await themNguon(q, dich.id, nguonMoi, d, "khong_dung", ss.ly_do);
      await ghiLichSu(q, {
        nguoi: dv.nguoi_gui,
        don_vi_id: dv.don_vi_id,
        doi_tuong_loai: "cong_viec",
        doi_tuong_id: dich.id,
        hanh_dong: "khong_dung",
        chi_tiet: { tu: dv.nhan, ly_do: ss.ly_do, hien_hanh: cu?.nhan ?? null, han_de_xuat: d.ket_thuc || null, tai_lieu_id: dv.tai_lieu_id, phien_ban: dv.phien_ban },
      });
      if (ch.bao_nguoi_gui_khi_khong_dung) {
        await taoThongBao(q, {
          nguoi_nhan: dv.nguoi_gui,
          loai: "ban_khong_dung",
          noi_dung: `${dienMau(mauTb.ban_khong_dung ?? "Bản của bạn cho việc {ma_viec} không được dùng: {ly_do}", { ma_viec: maKemTen(dich.id, dich.ten), ly_do: ss.ly_do })}${cu ? ` (đang dùng: ${cu.nhan})` : ""}`,
          lien_ket: `/cong-viec/${dich.id}`,
        });
      }
    }
    kq.push({ dong: i, hanh_dong: "khong_dung", cong_viec_id: dich.id, ly_do: ss.ly_do });
  }

  // Lần nạp đầu: mọi dòng mang ngày xong dự kiến — bước 4 cần cho dòng 🤖 AI đọc là đã xong (xem trước chạy trước lượt AI)
  if (lanDau)
    for (const r of kq) {
      const d = dv.cong_viec[r.dong];
      if (d?.ten?.trim() && !tagQd.has(d.nguon_bang)) r.xong_lan_dau = ngayXongLanDau(d, dv);
    }

  // Ngày theo việc khác: ghi phụ thuộc cho việc lấy theo bản này (tạo mới / đè), rồi tính ngay nếu việc mốc đã xong
  if (ghi) {
    const maCuaDong = (bang: string, dongSo: number) => {
      const j = dv.cong_viec.findIndex((c) => c?.nguon_bang === bang && c.dong_so === dongSo);
      return kq.find((x) => x.dong === j)?.cong_viec_id;
    };
    for (const r of kq) {
      if (!r.cong_viec_id || (r.hanh_dong !== "tao_moi" && r.hanh_dong !== "de")) continue;
      const d = dv.cong_viec[r.dong];
      await datPhuThuoc(q, r.cong_viec_id, "bat_dau", d.bat_dau_sau, maCuaDong);
      await datPhuThuoc(q, r.cong_viec_id, "ket_thuc", d.ket_thuc_sau, maCuaDong);
      await tinhLaiNgay(q, r.cong_viec_id, dv.nguoi_gui);
    }
  }
  return kq;
}

/** Xem trước (không ghi): mỗi dòng sẽ tạo mới / đè / không được dùng / đóng việc / gợi ý trùng. */
export async function xemTruocVaoSoCai(q: Q, dv: DauVaoSoCai): Promise<DuDoanDong[]> {
  return loi(q, dv, false);
}

/** Ghi các dòng việc của tài liệu vào sổ cái theo quy tắc đè. Ghi lịch sử từng việc. */
export async function ghiVaoSoCai(q: Q, dv: DauVaoSoCai): Promise<DuDoanDong[]> {
  return loi(q, dv, true);
}

/** Tài liệu nguồn bị trả lại (cho_sua=true) hoặc đã gửi lại (false): đánh dấu việc lấy từ tài liệu này. */
export async function danhDauChoSua(q: Q, taiLieuId: string, choSua: boolean, nguoi: string): Promise<void> {
  if (choSua && !(await layCauHinh(q, "gui")).tra_lai_tam_dung_viec) return;
  const { rows } = await q.query<{ id: string }>(
    `UPDATE docflow.cong_viec c SET cho_sua = $2
      WHERE c.trang_thai = 'dang_mo' AND c.cho_sua <> $2 AND c.nguon_hien_hanh_id IN
        (SELECT id FROM docflow.nguon_cong_viec WHERE tai_lieu_id = $1)
      RETURNING c.id`,
    [taiLieuId, choSua],
  );
  for (const r of rows) {
    await ghiLichSu(q, {
      nguoi,
      doi_tuong_loai: "cong_viec",
      doi_tuong_id: r.id,
      hanh_dong: "cho_sua",
      chi_tiet: { tai_lieu_id: taiLieuId, cho_sua: choSua, ghi_chu: choSua ? "tài liệu nguồn bị trả lại, chờ sửa" : "tài liệu nguồn đã gửi lại" },
    });
  }
}

// ---------------- Giao việc, kết thúc, gia hạn, đổi người, thêm/bớt, đóng ----------------

export interface DauVaoGiaoViec {
  ten: string;
  du_an?: string | null;
  hang_muc?: string | null;
  ket_qua_can_co?: string | null;
  bat_dau?: string | null;
  ket_thuc?: string | null;
  phan_viec: (PhuTrach & { bat_dau?: string | null; ket_thuc?: string | null })[];
  cong_viec_id?: string | null; // giao lại / đè việc đã có
  tu_tai_lieu?: { tai_lieu_id: string; phien_ban: number; dong_so: number; nhan: string } | null;
  la_quyet_dinh?: boolean; // quyết định TGĐ trong Form 0 → cấp 1, đè mọi bản khác
  dinh_kem?: string[]; // mã file đã tải lên /api/dinh-kem (noi = giao_viec)
}

/** Giao việc tay hoặc từ quyết định TGĐ trong Form 0. Trả mã việc. */
export async function giaoViec(q: Q, nd: NguoiDungPhien, v: DauVaoGiaoViec): Promise<string> {
  if (!nd.la_quan_tri && !nd.quyen["cong_viec.giao"]) throw new LoiHttp(403, "Bạn không có quyền giao việc");
  const laQd = !!v.la_quyet_dinh;
  if (laQd && !nd.la_quan_tri && nd.quyen["cong_viec.giao"] !== "toan_bo" && nd.cap > 1)
    throw new LoiHttp(403, "Chỉ Ban Tổng giám đốc được giao việc theo quyết định (Form 0)");
  const ten = v.ten?.trim();
  if (!ten) throw new LoiHttp(400, "Chưa có tên việc");
  kiemChuVo(ten, "Tên việc");
  if (v.ket_qua_can_co) kiemChuVo(v.ket_qua_can_co, "Kết quả cần có");
  const dsPv = (v.phan_viec ?? []).filter((p) => p && p.id);
  if (!dsPv.length) throw new LoiHttp(400, "Cần ít nhất một phần việc (người hoặc đơn vị phụ trách)");
  for (const p of dsPv) {
    if (p.bat_dau && p.ket_thuc && p.bat_dau > p.ket_thuc) throw new LoiHttp(400, `Phần việc của ${p.ten}: ngày bắt đầu sau ngày kết thúc`);
    p.ten = p.ten || (await tenPhuTrach(q, p.loai, p.id));
  }
  // Phần đầu = chủ trì: phải trong phạm vi giao việc (quyết định TGĐ đã đòi quyền toàn bộ ở trên)
  // Việc sinh từ báo cáo: báo cáo của CHÍNH đơn vị ngoài SCI thì giao trong nội bộ công ty đó vẫn được (Mr. Đại chốt 10/10)
  const dvLapBc = v.tu_tai_lieu
    ? ((await q.query<{ d: string | null }>("SELECT don_vi_lap AS d FROM docflow.tai_lieu WHERE id = $1", [v.tu_tai_lieu.tai_lieu_id])).rows[0]?.d ?? null)
    : null;
  await batBuocTrongPhamVi(q, nd, dsPv[0], dvLapBc);
  // Giao trong phòng mình: bắt buộc chọn MỘT nhân viên làm chủ trì, không giao cho cả phòng (Mr. Đại chốt 30/09)
  if (!laQd && !v.tu_tai_lieu && dsPv[0].loai === "don_vi" && nd.don_vi_ids.includes(dsPv[0].id) && (await phamViGiao(q, nd)) !== "tat_ca")
    throw new LoiHttp(400, `Giao việc trong ${dsPv[0].ten || "phòng mình"}: chọn một nhân viên làm chủ trì`);

  if (v.tu_tai_lieu) {
    const { rows } = await q.query<{ cong_viec_id: string }>(
      `SELECT cong_viec_id FROM docflow.nguon_cong_viec WHERE tai_lieu_id = $1 AND phien_ban = $2 AND dong_so = $3 AND la_quyet_dinh = $4 LIMIT 1`,
      [v.tu_tai_lieu.tai_lieu_id, v.tu_tai_lieu.phien_ban, v.tu_tai_lieu.dong_so, laQd],
    );
    if (rows[0]) throw new LoiHttp(409, `Dòng ${v.tu_tai_lieu.dong_so} của tài liệu này đã được giao: ${rows[0].cong_viec_id}`);
  }

  // Ngày của việc: theo đầu vào, không có thì lấy từ phần CHỦ TRÌ (dòng đầu); phối hợp không mang hạn riêng (db/68)
  const ngayPv = dsPv.map((p, i) =>
    i === 0 ? { ...p, bat_dau: p.bat_dau ?? v.bat_dau ?? null, ket_thuc: p.ket_thuc ?? v.ket_thuc ?? null } : { ...p, bat_dau: null, ket_thuc: null },
  );
  const batDau = v.bat_dau || ngayPv.map((p) => p.bat_dau).filter(Boolean).sort()[0] || null;
  const ketThuc = v.ket_thuc || ngayPv.map((p) => p.ket_thuc).filter(Boolean).sort().reverse()[0] || null;
  if (!ketThuc && !(await layCauHinh(q, "quy_tac_de")).viec_khong_ngay_luon_mo) throw new LoiHttp(400, "Việc phải có ngày kết thúc (hạn)");
  // KHÔNG GỬI VIỆC CÓ HẠN ĐÃ QUA (Mr. Đại chốt 04/10/2026 tối) — việc sinh ra đã quá hạn từ ngày đầu. Áp mọi đường giao mới
  // (ô "+", Cây việc, Issue, agent khác gửi sang); trừ việc ghi từ văn bản đã ký (Form 0, báo cáo) và giao lại việc đã có.
  if (ketThuc && !v.tu_tai_lieu && !v.cong_viec_id && ketThuc < homNayVN())
    throw new LoiHttp(400, `Hạn ${ngayNgan(ketThuc, true)} đã qua — chọn hạn từ hôm nay trở đi rồi mới giao`);

  let kyDen: string | null = null;
  let mauMa: string | null = null;
  if (v.tu_tai_lieu) {
    const { rows } = await q.query<{ den: string | null; mau_ma: string | null }>(
      "SELECT ky_bao_cao->>'den' AS den, mau_ma FROM docflow.tai_lieu WHERE id = $1",
      [v.tu_tai_lieu.tai_lieu_id],
    );
    if (!rows[0]) throw new LoiHttp(404, "Không có tài liệu nguồn");
    kyDen = rows[0].den ?? null;
    mauMa = rows[0].mau_ma ?? null;
  }
  const nguon: ThongTinNguon = {
    tai_lieu_id: v.tu_tai_lieu?.tai_lieu_id ?? null,
    phien_ban: v.tu_tai_lieu?.phien_ban ?? null,
    mau_ma: mauMa,
    nhan: v.tu_tai_lieu?.nhan || `${laQd ? "Quyết định" : "Giao việc"} · ${nd.ten}`,
    don_vi_id: nd.don_vi_id,
    cap: laQd ? 1 : nd.cap,
    ky_bao_cao_den: kyDen,
    ngay_gui: new Date().toISOString(),
    nguoi_gui: nd.id,
    la_quyet_dinh: laQd,
  };
  // Đơn vị của nguồn quyết định: đơn vị cấp 1 trong cây (Ban TGĐ)
  if (laQd) {
    const { rows } = await q.query<{ id: string }>("SELECT id FROM identity.don_vi WHERE cap = 1 AND active ORDER BY thu_tu LIMIT 1");
    nguon.don_vi_id = nd.don_vi_ids.find((x) => x === rows[0]?.id) ?? rows[0]?.id ?? nd.don_vi_id;
  }
  const dong: DongCongViec = {
    ten,
    du_an: v.du_an ?? undefined,
    hang_muc: v.hang_muc ?? undefined,
    phu_trach: dsPv.map((p) => ({ loai: p.loai, id: p.id, ten: p.ten, noi_dung: p.noi_dung })),
    bat_dau: batDau ?? undefined,
    ket_thuc: ketThuc ?? undefined,
    ket_qua_can_co: v.ket_qua_can_co ?? undefined,
    nguon_bang: laQd ? "bang_quyet_dinh" : "giao_tay",
    dong_so: v.tu_tai_lieu?.dong_so ?? 0,
  };
  const chiTietPv = ngayPv.map((p) => ({ phu_trach: p.ten, noi_dung: p.noi_dung?.trim() || ten, ket_thuc: p.ket_thuc }));

  if (v.cong_viec_id) {
    const cv = await viecDangMo(q, v.cong_viec_id);
    if (!laQd) await batBuocSua(q, nd, cv);
    const cu = await layNguon(q, cv.nguon_hien_hanh_id);
    const lyDo = laQd ? "quyết định của Tổng Giám đốc đè tất cả" : `giao lại bởi ${nd.ten}`;
    const ngId = await themNguon(q, cv.id, nguon, dong, "hien_hanh", null);
    if (cu) await q.query("UPDATE docflow.nguon_cong_viec SET trang_thai = 'bi_de', ly_do = $2 WHERE id = $1", [cu.id, `${lyDo} · bởi ${nguon.nhan}`]);
    await q.query(
      `UPDATE docflow.cong_viec SET ten = $2, du_an = $3, hang_muc = $4, ket_qua_can_co = $5, bat_dau = $6, ket_thuc = $7, luon_mo = $8,
         nguon_hien_hanh_id = $9, giao_boi = $10, don_vi_giao = $11, cho_sua = false WHERE id = $1`,
      [cv.id, ten, v.du_an ?? cv.du_an, v.hang_muc ?? cv.hang_muc, v.ket_qua_can_co ?? cv.ket_qua_can_co, batDau, ketThuc, !ketThuc, ngId, nd.id, nguon.don_vi_id],
    );
    const td = await datPhanViec(q, cv.id, cv.ten, ten, ngayPv, `không còn trong ${nguon.nhan}`);
    const ds = await layPhanViec(q, [cv.id]);
    await ghiLichSu(q, {
      nguoi: nd.id,
      don_vi_id: nd.don_vi_id,
      doi_tuong_loai: "cong_viec",
      doi_tuong_id: cv.id,
      hanh_dong: "bi_de",
      chi_tiet: { tu: nguon.nhan, bi_de: cu?.nhan ?? null, ly_do: lyDo, nguon_id: ngId, nguon_bi_de_id: cu?.id ?? null, cap: nguon.cap, han_cu: cv.ket_thuc, han_moi: ketThuc, la_quyet_dinh: laQd },
    });
    await ghiLichSu(q, {
      nguoi: nd.id,
      don_vi_id: nd.don_vi_id,
      doi_tuong_loai: "cong_viec",
      doi_tuong_id: cv.id,
      hanh_dong: "giao_viec",
      chi_tiet: { tu: nguon.nhan, la_quyet_dinh: laQd, han: ketThuc, phan_viec: chiTietPv, tien_do: tienDo(ds), giao_lai: true, them: td.them, bo: td.bo },
    });
    for (const [i, p] of ngayPv.entries()) {
      await baoPhuTrach(q, { phu_trach_loai: p.loai, phu_trach_id: p.id }, {
        loai: "giao_viec",
        noi_dung:
          i === 0
            ? `${nd.ten} giao việc ${cv.id} · ${ten}${p.ket_thuc ? `, hạn ${ngayNgan(p.ket_thuc, true)}` : ", luôn mở"}`
            : `${nd.ten} mời bạn phối hợp việc ${cv.id} · ${ten} — chủ trì: ${ngayPv[0].ten}${ngayPv[0].ket_thuc ? `, hạn ${ngayNgan(ngayPv[0].ket_thuc, true)}` : ""} (bạn nắm thông tin và hỗ trợ khi cần)`,
        lien_ket: `/cong-viec/${cv.id}`,
      });
    }
    await kiemTraHoanThanh(q, cv.id, nd.id);
    return cv.id;
  }

  const ma = await capMaViec(q, nguon.ngay_gui, { don_vi_id: nguon.don_vi_id, du_an: v.du_an });
  await q.query(
    `INSERT INTO docflow.cong_viec (id, ten, du_an, hang_muc, ket_qua_can_co, luon_mo, bat_dau, ket_thuc, giao_boi, don_vi_giao)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [ma, ten, v.du_an ?? null, v.hang_muc ?? null, v.ket_qua_can_co ?? null, !ketThuc, batDau, ketThuc, nd.id, nguon.don_vi_id],
  );
  const ngId = await themNguon(q, ma, nguon, dong, "hien_hanh", null);
  await q.query("UPDATE docflow.cong_viec SET nguon_hien_hanh_id = $2 WHERE id = $1", [ma, ngId]);
  let tt = 0;
  for (const p of ngayPv) await themMotPhanViec(q, ma, p, p.noi_dung?.trim() || ten, ++tt);
  await ghiLichSu(q, {
    nguoi: nd.id,
    don_vi_id: nd.don_vi_id,
    doi_tuong_loai: "cong_viec",
    doi_tuong_id: ma,
    hanh_dong: "giao_viec",
    chi_tiet: {
      tu: nguon.nhan,
      nguon_id: ngId,
      la_quyet_dinh: laQd,
      cap: nguon.cap,
      tai_lieu_id: nguon.tai_lieu_id,
      phien_ban: nguon.phien_ban,
      han: ketThuc,
      luon_mo: !ketThuc,
      phan_viec: chiTietPv,
      tien_do: `0/${ngayPv.length}`,
      lan_dau: true,
    },
  });
  // File kẹp khi giao việc (Mr. Đại chốt 29/09) — gắn vào việc + đính kèm tin chuông của người nhận
  const tep = await ganDinhKem(q, nd, v.dinh_kem, { cong_viec_id: ma, noi: "giao_viec" });
  for (const [i, p] of ngayPv.entries()) {
    if (p.loai === "nguoi" && p.id === nd.id) continue;
    // Dòng đầu = CHỦ TRÌ; các dòng sau = PHỐI HỢP, chỉ để biết, không hạn riêng (chốt 28/09). Test đêm 01/10: bên phối hợp
    // nhận câu "giao việc …, luôn mở" như chủ trì → đọc thành việc của mình không hạn. Nay nói rõ vai + ai chủ trì + hạn chủ trì.
    const chuTri = ngayPv[0];
    const kemTep = tep.length ? ` · kèm ${tep.length} file` : "";
    await baoPhuTrach(q, { phu_trach_loai: p.loai, phu_trach_id: p.id }, {
      loai: "giao_viec",
      noi_dung:
        i === 0
          ? `${nd.ten} giao việc ${ma} · ${p.noi_dung?.trim() || ten}${p.ket_thuc ? `, hạn ${ngayNgan(p.ket_thuc, true)}` : ", luôn mở"}${kemTep}`
          : `${nd.ten} mời bạn phối hợp việc ${ma} · ${p.noi_dung?.trim() || ten} — chủ trì: ${chuTri.ten}${chuTri.ket_thuc ? `, hạn ${ngayNgan(chuTri.ket_thuc, true)}` : ""} (bạn nắm thông tin và hỗ trợ khi cần)${kemTep}`,
      lien_ket: `/cong-viec/${ma}`,
      tep,
    });
  }
  return ma;
}

/**
 * Báo cấp trên của bộ phận vừa đóng việc: đơn vị cha (BQLDA/PMC/E&C → P.ĐT&PC; nhà máy → P.KT&VH).
 * Đơn vị cha là Ban TGĐ (các phòng) hoặc không có cha → mọi người trong Ban lãnh đạo (vai trò lanh-dao).
 */
async function baoCapTren(q: Q, donViId: string | null, tb: { noi_dung: string; lien_ket: string; tep?: TepTB[] }, boQua: string[] = []): Promise<void> {
  if (!donViId) return;
  const { rows } = await q.query<{ loai: string; cha_id: string | null; cha_cap: number | null; cha_loai: string | null }>(
    `SELECT d.loai, d.cha_id, c.cap AS cha_cap, c.loai AS cha_loai FROM identity.don_vi d LEFT JOIN identity.don_vi c ON c.id = d.cha_id WHERE d.id = $1`,
    [donViId],
  );
  const r = rows[0];
  if (!r) return;
  const thongBao = { loai: "dong_viec_cap_duoi", ...tb };
  // Ban lãnh đạo (chức danh trong Ban TGĐ) là cấp cao nhất: đóng việc thì mọi phòng bên dưới cùng biết — nhưng CHỈ trưởng phòng
  // (+ ủy quyền), Mr. Đại chốt 02/10: trước gửi mọi nhân viên mọi phòng (đo 12/14 tin "đơn vị dưới xong" nhân viên nhận là từ đây)
  if (r.loai === "chuc_danh" || r.loai === "ban_tgd") {
    const { rows: phong } = await q.query<{ id: string }>("SELECT id FROM identity.don_vi WHERE active AND loai = 'phong'");
    const da = new Set(boQua);
    for (const p of phong)
      for (const id of await dauDonVi(q, p.id)) {
        if (da.has(id)) continue;
        da.add(id);
        await taoThongBao(q, { ...thongBao, nguoi_nhan: id });
      }
  } else if (r.cha_id && r.cha_loai !== "ban_tgd" && Number(r.cha_cap) > 1) {
    // Mr. Đại chốt 02/10: tin "đơn vị dưới xong việc" CHỈ gửi trưởng (và người được uỷ quyền trưởng) của đơn vị cấp trên —
    // trước đây gửi cả phòng (đo: SCI E&C xong việc → mọi nhân viên P.ĐT&PC nhận)
    for (const id of await truongCuaDonVi(q, r.cha_id)) if (!boQua.includes(id)) await taoThongBao(q, { ...thongBao, nguoi_nhan: id });
    return;
  }
  const { rows: bld } = await q.query<{ id: string }>(
    `SELECT DISTINCT n.id FROM identity.nguoi_dung n JOIN identity.gan_vai_tro g ON g.nguoi_dung_id = n.id
      WHERE n.active AND g.vai_tro_id = 'lanh-dao'`,
  );
  for (const n of bld) if (!boQua.includes(n.id)) await taoThongBao(q, { ...thongBao, nguoi_nhan: n.id });
}

/**
 * Báo người đã PHÂN CÔNG phần việc cho nhân viên (trưởng đơn vị). Phân công đè phần việc từ đơn vị sang người, nên trưởng
 * rơi khỏi mọi danh sách nhận tin — test đêm 01/10 D-1: nhân viên báo xong / được gia hạn, trưởng phòng vừa phân công không biết.
 */
async function baoNguoiPhanCong(
  q: Q,
  cvId: string,
  phanViecId: string,
  tb: { loai: string; noi_dung: string; lien_ket: string; tep?: TepTB[] },
  boQua: string[],
): Promise<void> {
  const { rows } = await q.query<{ nguoi: string }>(
    `SELECT DISTINCT l.nguoi FROM docflow.lich_su l JOIN identity.nguoi_dung n ON n.id = l.nguoi AND n.active
      WHERE l.doi_tuong_loai = 'cong_viec' AND l.doi_tuong_id = $1 AND l.hanh_dong = 'phan_cong' AND l.chi_tiet->>'phan_viec_id' = $2`,
    [cvId, phanViecId],
  );
  for (const r of rows) if (!boQua.includes(r.nguoi)) await taoThongBao(q, { ...tb, nguoi_nhan: r.nguoi });
}

/** Người đã phân công phần việc này (để khỏi báo trùng). */
async function nguoiDaPhanCong(q: Q, cvId: string, phanViecId: string): Promise<string[]> {
  const { rows } = await q.query<{ nguoi: string }>(
    `SELECT DISTINCT nguoi FROM docflow.lich_su WHERE doi_tuong_loai = 'cong_viec' AND doi_tuong_id = $1 AND hanh_dong = 'phan_cong' AND chi_tiet->>'phan_viec_id' = $2`,
    [cvId, phanViecId],
  );
  return rows.map((r) => r.nguoi);
}

/**
 * TRƯỞNG đơn vị của người vừa báo xong (Mr. Đại chốt K4 02/10: "lãnh đạo giao thủ công cho một đơn vị thì khi nhân viên xong việc
 * báo xong thì trưởng bộ phận đó được thông báo"). Trưởng = người được ủy quyền trưởng, hoặc người có vai trò trưởng đơn vị thuộc
 * đơn vị (chính hoặc kiêm nhiệm). Trước đây lãnh đạo giao thẳng cho nhân viên / nhân viên tự bấm Xong phần của cả phòng thì
 * trưởng phòng không biết.
 */
async function truongCuaDonVi(q: Q, donViId: string): Promise<string[]> {
  const { rows } = await q.query<{ id: string }>(
    `SELECT n.id FROM identity.don_vi d JOIN identity.nguoi_dung n ON n.id = d.uy_quyen_truong AND n.active WHERE d.id = $1
     UNION
     SELECT n.id FROM identity.nguoi_dung n
      WHERE n.active AND (n.don_vi_id = $1 OR n.id IN (SELECT nguoi_dung_id FROM identity.kiem_nhiem WHERE don_vi_id = $1))
        AND EXISTS (SELECT 1 FROM identity.gan_vai_tro g WHERE g.nguoi_dung_id = n.id AND g.vai_tro_id = 'truong-don-vi') AND ${truongTaiSql("$1")}`,
    [donViId],
  );
  return rows.map((r) => r.id);
}

/**
 * Việc LỌC RA TỪ BÁO CÁO (không phải giao tay, không phải TGĐ quyết định ở Form 0) — nhóm việc mà nút "Không nhận thông báo xong
 * việc của Nhân viên" ở chuông tắt tin cấp trên (Mr. Đại chốt K4 02/10).
 */
async function laViecTuBaoCao(q: Q, cvId: string): Promise<boolean> {
  const { rows } = await q.query(
    `SELECT 1 FROM docflow.cong_viec c JOIN docflow.nguon_cong_viec g ON g.id = c.nguon_hien_hanh_id
      WHERE c.id = $1 AND g.tai_lieu_id IS NOT NULL AND COALESCE(g.du_lieu->>'nguon_bang', '') NOT IN ('giao_tay', 'bang_quyet_dinh')`,
    [cvId],
  );
  return rows.length > 0;
}

/** Người đã bật "Không nhận thông báo xong việc của Nhân viên" ở chuông. */
async function nguoiTatTinXong(q: Q): Promise<string[]> {
  const { rows } = await q.query<{ id: string }>("SELECT nguoi_dung_id AS id FROM docflow.tuy_chon_giao_dien WHERE tat_tin_xong_nhan_vien");
  return rows.map((r) => r.id);
}

/** Người phụ trách bấm Kết thúc phần của mình. Phần cuối kết thúc → việc hoàn thành, rời sổ cái. */
export async function ketThucPhanViec(
  q: Q,
  nd: NguoiDungPhien,
  phanViecId: string,
  v: { ghi_chu?: string | null; tep_ket_qua?: { tai_lieu_id: string }[]; dinh_kem?: string[] },
): Promise<{ tien_do: string; hoan_thanh: boolean }> {
  const p = await layMotPhanViec(q, phanViecId);
  if (!p) throw new LoiHttp(404, "Không có phần việc này");
  const cv = await viecDangMo(q, p.cong_viec_id);
  if (p.trang_thai !== "dang_lam") throw new LoiHttp(409, "Phần việc này đã kết thúc");
  if (!coTheKetThuc(nd, p))
    throw new LoiHttp(403, p.phu_trach_loai === "nguoi" ? "Chỉ người phụ trách mới bấm Kết thúc được phần này" : `Chỉ trưởng đơn vị hoặc người thuộc ${p.phu_trach_ten} mới bấm Kết thúc được phần này`);
  const tep = (v.tep_ket_qua ?? []).filter((t) => t && t.tai_lieu_id);
  await q.query(
    `UPDATE docflow.phan_viec SET trang_thai = 'da_ket_thuc', ket_thuc_boi = $2, ket_thuc_luc = now(), ghi_chu = $3, tep_ket_qua = $4 WHERE id = $1`,
    [p.id, nd.id, v.ghi_chu?.trim() || null, JSON.stringify(tep)],
  );
  const ds = await layPhanViec(q, [cv.id]);
  const td = tienDo(ds);
  await ghiLichSu(q, {
    nguoi: nd.id,
    don_vi_id: nd.don_vi_id,
    doi_tuong_loai: "cong_viec",
    doi_tuong_id: cv.id,
    hanh_dong: "ket_thuc_phan_viec",
    chi_tiet: {
      phan_viec_id: p.id,
      noi_dung: p.noi_dung,
      phu_trach: p.phu_trach_ten,
      bam_boi: nd.ten,
      thay_don_vi: p.phu_trach_loai === "don_vi" ? p.phu_trach_ten : null,
      truong_don_vi: p.phu_trach_loai === "don_vi" ? (nd.don_vi_truong ?? (nd.vai_tro.includes("truong-don-vi") ? nd.don_vi_ids : [])).includes(p.phu_trach_id) : undefined,
      ghi_chu: v.ghi_chu?.trim() || null,
      tep_ket_qua: tep,
      tien_do: td,
    },
  });
  // Báo xong bằng lời + kẹp file (Mr. Đại chốt 29/09): người giao nhận tin ở chuông kèm link xem / tải file
  const dk = await ganDinhKem(q, nd, v.dinh_kem, { cong_viec_id: cv.id, noi: "bao_xong", phan_viec_id: p.id });
  const baoCao = `${v.ghi_chu?.trim() ? `: "${v.ghi_chu.trim()}"` : ""}${dk.length ? ` · kèm ${dk.length} file` : ""}`;
  const aiBam = p.phu_trach_loai === "don_vi" ? `${nd.ten} (${p.phu_trach_ten})` : p.phu_trach_ten;
  // Phần chủ trì cuối cùng → việc sẽ hoàn thành ngay sau đây: người giao chỉ nhận tin "đã hoàn thành" (kèm lời báo xong), không
  // nhận thêm tin "kết thúc phần" (Mr. Đại chốt 02/10 — trước: 2 tin cho một lần bấm Xong)
  const seXong = p.vai !== "phoi_hop" && !ds.some((x) => x.vai !== "phoi_hop" && x.trang_thai === "dang_lam");
  if (cv.giao_boi && cv.giao_boi !== nd.id && !seXong) {
    await taoThongBao(q, {
      nguoi_nhan: cv.giao_boi,
      loai: "ket_thuc_phan_viec",
      // Phần của cả đơn vị: ghi rõ AI bấm (test đêm 01/10 — "Phòng Kinh tế và Vận hành kết thúc…" không biết ai báo)
      noi_dung: `${aiBam} kết thúc phần "${p.noi_dung}" của việc ${cv.id} (${td})${baoCao}`,
      lien_ket: `/cong-viec/${cv.id}`,
      tep: dk,
    });
  }
  await baoNguoiPhanCong(
    q,
    cv.id,
    p.id,
    { loai: "ket_thuc_phan_viec", noi_dung: `${p.phu_trach_ten} (bạn phân công) đã xong phần "${p.noi_dung}" của việc ${cv.id} (${td})${baoCao}`, lien_ket: `/cong-viec/${cv.id}`, tep: dk },
    [nd.id, cv.giao_boi ?? ""],
  );
  const donViDong = p.phu_trach_loai === "don_vi" ? p.phu_trach_id : nd.don_vi_id;
  // Trưởng đơn vị của người báo xong (chốt K4 02/10) — trừ người bấm, người giao, người đã phân công (đã có tin riêng)
  const daBao = [nd.id, cv.giao_boi ?? "", ...(await nguoiDaPhanCong(q, cv.id, p.id))];
  if (donViDong) {
    const tenDv = await tenDonVi(q, donViDong);
    for (const t of await truongCuaDonVi(q, donViDong)) {
      if (daBao.includes(t)) continue;
      daBao.push(t);
      await taoThongBao(q, {
        nguoi_nhan: t,
        loai: "ket_thuc_phan_viec",
        noi_dung: `${nd.ten}${tenDv ? ` (${tenDv})` : ""} đã xong ${p.vai === "phoi_hop" ? "phần phối hợp" : "việc"} ${maKemTen(cv.id, cv.ten)} (${td})${baoCao}`,
        lien_ket: `/cong-viec/${cv.id}`,
        tep: dk,
      });
    }
  }
  // Cấp trên của bộ phận vừa đóng việc cũng được báo (kèm báo cáo ngắn). Việc lọc ra từ báo cáo: người bật "Không nhận thông báo
  // xong việc của Nhân viên" ở chuông không nhận tin này (chốt K4 02/10)
  const tat = (await laViecTuBaoCao(q, cv.id)) ? await nguoiTatTinXong(q) : [];
  await baoCapTren(
    q,
    donViDong,
    { noi_dung: `${p.phu_trach_ten} đã xong việc ${cv.id} · ${cv.ten} (${td})${baoCao}`, lien_ket: `/cong-viec/${cv.id}`, tep: dk },
    [...daBao, ...tat],
  );
  return kiemTraHoanThanh(q, cv.id, nd.id, {}, seXong ? { chu: `${aiBam} báo xong${baoCao}`, tep: dk } : undefined);
}

export async function giaHan(
  q: Q,
  nd: NguoiDungPhien,
  v: { cong_viec_id: string; phan_viec_id?: string; ket_thuc: string | null; ly_do?: string },
  tuSuaViec = false, // gọi từ suaViec: quyền "Sửa việc" đã kiểm
): Promise<void> {
  const cv = await viecDangMo(q, v.cong_viec_id);
  if (!tuSuaViec && !(await coTheSua(q, nd, cv))) {
    // Trưởng đơn vị chủ trì gia hạn được PHẦN VIỆC của đơn vị mình dù việc do người khác giao (phương án A, 29/10/2026)
    const mine = v.phan_viec_id ? await phanDonViMinhTruong(q, nd, cv) : [];
    if (!v.phan_viec_id || !mine.includes(v.phan_viec_id)) await batBuocSua(q, nd, cv);
  }
  const moi = v.ket_thuc?.slice(0, 10) || null;
  if (!moi && !(await layCauHinh(q, "quy_tac_de")).viec_khong_ngay_luon_mo) throw new LoiHttp(400, "Phải có ngày kết thúc mới: việc không được để không có hạn");
  const ds = await layPhanViec(q, [cv.id]);
  if (v.phan_viec_id) {
    const p = ds.find((x) => x.id === v.phan_viec_id);
    if (!p) throw new LoiHttp(404, "Phần việc không thuộc việc này");
    if (p.trang_thai !== "dang_lam") throw new LoiHttp(409, "Phần việc đã kết thúc");
    if (moi && p.bat_dau && p.bat_dau > moi) throw new LoiHttp(400, "Hạn mới trước ngày bắt đầu");
    await q.query("UPDATE docflow.phan_viec SET ket_thuc = $2, luon_mo = $3 WHERE id = $1", [p.id, moi, !moi]);
    if (moi && cv.ket_thuc && moi > cv.ket_thuc) await q.query("UPDATE docflow.cong_viec SET ket_thuc = $2 WHERE id = $1", [cv.id, moi]);
    await ghiLichSu(q, {
      nguoi: nd.id,
      don_vi_id: nd.don_vi_id,
      doi_tuong_loai: "cong_viec",
      doi_tuong_id: cv.id,
      hanh_dong: "gia_han",
      chi_tiet: { phan_viec_id: p.id, phu_trach: p.phu_trach_ten, noi_dung: p.noi_dung, han_cu: p.ket_thuc, han_moi: moi, ly_do: v.ly_do?.trim() || null },
    });
    await baoPhuTrach(q, p, { loai: "gia_han", noi_dung: `Việc ${cv.id}: phần "${p.noi_dung}" ${moi ? `gia hạn đến ${ngayNgan(moi, true)}` : "chuyển thành luôn mở"}`, lien_ket: `/cong-viec/${cv.id}` });
    await baoNguoiPhanCong(
      q,
      cv.id,
      p.id,
      { loai: "gia_han", noi_dung: `${nd.ten} gia hạn việc ${cv.id}, phần "${p.noi_dung}" của ${p.phu_trach_ten} (bạn phân công): ${moi ? `hạn mới ${ngayNgan(moi, true)}` : "chuyển thành luôn mở"}`, lien_ket: `/cong-viec/${cv.id}` },
      [nd.id, p.phu_trach_id],
    );
    return;
  }
  if (moi && cv.bat_dau && cv.bat_dau > moi) throw new LoiHttp(400, "Hạn mới trước ngày bắt đầu");
  await q.query("UPDATE docflow.cong_viec SET ket_thuc = $2, luon_mo = $3 WHERE id = $1", [cv.id, moi, !moi]);
  // Phần việc đang làm theo hạn chung của việc (hoặc vượt hạn mới) chuyển theo hạn mới
  for (const p of ds) {
    if (p.trang_thai !== "dang_lam") continue;
    if (p.ket_thuc === cv.ket_thuc || (moi && p.ket_thuc && p.ket_thuc > moi)) {
      await q.query("UPDATE docflow.phan_viec SET ket_thuc = $2, luon_mo = $3 WHERE id = $1", [p.id, moi, !moi]);
      await baoPhuTrach(q, p, { loai: "gia_han", noi_dung: `Việc ${cv.id} · ${cv.ten}: ${moi ? `hạn mới ${ngayNgan(moi, true)}` : "chuyển thành luôn mở"}`, lien_ket: `/cong-viec/${cv.id}` });
      await baoNguoiPhanCong(
        q,
        cv.id,
        p.id,
        { loai: "gia_han", noi_dung: `${nd.ten} gia hạn việc ${cv.id} · ${cv.ten} (phần của ${p.phu_trach_ten}, bạn phân công): ${moi ? `hạn mới ${ngayNgan(moi, true)}` : "chuyển thành luôn mở"}`, lien_ket: `/cong-viec/${cv.id}` },
        [nd.id, p.phu_trach_id],
      );
    }
  }
  await ghiLichSu(q, {
    nguoi: nd.id,
    don_vi_id: nd.don_vi_id,
    doi_tuong_loai: "cong_viec",
    doi_tuong_id: cv.id,
    hanh_dong: "gia_han",
    chi_tiet: { han_cu: cv.ket_thuc, han_moi: moi, luon_mo: !moi, ly_do: v.ly_do?.trim() || null },
  });
}

export async function doiNguoi(
  q: Q,
  nd: NguoiDungPhien,
  v: { phan_viec_id: string; phu_trach: PhuTrach; ly_do?: string },
  tuSuaViec = false, // gọi từ suaViec: quyền "Sửa việc" đã kiểm
): Promise<void> {
  const p = await layMotPhanViec(q, v.phan_viec_id);
  if (!p) throw new LoiHttp(404, "Không có phần việc này");
  const cv = await viecDangMo(q, p.cong_viec_id);
  if (!tuSuaViec) await batBuocSua(q, nd, cv);
  if (p.trang_thai !== "dang_lam") throw new LoiHttp(409, "Phần việc đã kết thúc, không đổi người được");
  if (!v.phu_trach?.id) throw new LoiHttp(400, "Chưa chọn người phụ trách mới");
  // Đổi CHỦ TRÌ = giao việc (Mr. Đại chốt 10/10/2026 tối): chọn một NGƯỜI thì đúng luật giao chuyển tiếp (cùng danh sách ô "Giao cho…");
  // chọn cả đơn vị thì theo phạm vi giao như trước
  if (p.vai !== "phoi_hop") {
    if (v.phu_trach.loai === "nguoi" && v.phu_trach.id !== nd.id) {
      if (!(await nguoiNhanChuyenTiep(q, nd)).has(v.phu_trach.id))
        throw new LoiHttp(
          403,
          `Không đổi chủ trì sang ${v.phu_trach.ten || (await tenPhuTrach(q, "nguoi", v.phu_trach.id))} được: ngoài phạm vi giao việc của bạn, hoặc thuộc đơn vị ngoài SCI (SCI PMC, SCI E&C)`,
        );
    } else await batBuocTrongPhamVi(q, nd, v.phu_trach);
  }
  const tenMoi = await tenPhuTrach(q, v.phu_trach.loai, v.phu_trach.id);
  const noiDung = v.phu_trach.noi_dung?.trim() || p.noi_dung;
  // Đổi người phụ trách = giao cho người mới → ghi lúc giao (nút Việc của tôi của người đó phát sáng — Mr. Đại chốt 08/10)
  await q.query(
    `UPDATE docflow.phan_viec SET phu_trach_loai = $2, phu_trach_id = $3, noi_dung = $4,
            tao_luc = CASE WHEN phu_trach_loai IS DISTINCT FROM $2 OR phu_trach_id IS DISTINCT FROM $3 THEN now() ELSE tao_luc END
      WHERE id = $1`,
    [p.id, v.phu_trach.loai, v.phu_trach.id, noiDung],
  );
  await ghiLichSu(q, {
    nguoi: nd.id,
    don_vi_id: nd.don_vi_id,
    doi_tuong_loai: "cong_viec",
    doi_tuong_id: cv.id,
    hanh_dong: "doi_nguoi",
    chi_tiet: { phan_viec_id: p.id, noi_dung: noiDung, cu: p.phu_trach_ten, moi: tenMoi, ly_do: v.ly_do?.trim() || null },
  });
  await baoPhuTrach(q, { phu_trach_loai: v.phu_trach.loai, phu_trach_id: v.phu_trach.id }, {
    loai: "giao_viec",
    noi_dung: `${nd.ten} chuyển cho bạn phần "${noiDung}" của việc ${cv.id}`,
    lien_ket: `/cong-viec/${cv.id}`,
  });
}

/**
 * GIAO CHUYỂN TIẾP (Mr. Đại chốt 30/09, mở rộng 09/10/2026): người đang nhận một phần việc — giao đích danh cho mình, hoặc giao cho
 * cả đơn vị mình thuộc (chính / kiêm nhiệm) — giao tiếp phần đó cho MỘT người cụ thể, THEO QUYỀN "Giao việc" CỦA CHÍNH MÌNH, tính
 * trên mọi đơn vị mình giữ (kiêm nhiệm cũng tính):
 *   · Lãnh đạo (toàn bộ): mọi nhân viên, trưởng phòng, nhân sự đơn vị trực thuộc SCI.
 *   · Trưởng phòng / bộ phận / đơn vị (mình + cấp dưới): nhân viên đơn vị mình + nhân sự đơn vị con trực thuộc SCI.
 *   · Không ai giao xuống nhân sự đơn vị NGOÀI SCI (cột don_vi.ngoai_sci: SCI PMC, SCI E&C là công ty SCI có cổ phần; ban điều hành
 *     tổng thầu) — đơn vị trực thuộc chỉ có các BQL và các nhà máy. Người thuộc chính công ty đó thì vẫn giao trong công ty mình:
 *     việc giao cho CẢ công ty đó (được — chốt lại 10/10 chiều) thì người đứng đầu công ty đó giao chuyển tiếp cho nhân viên của họ.
 * Ví dụ gốc: việc giao cho chức danh "PTGĐ · Nguyễn Chính Đại" (đơn vị 1 người) trước đây chỉ chọn được chính anh.
 */
export async function coThePhanCong(q: Q, nd: NguoiDungPhien, p: { phu_trach_loai: string; phu_trach_id: string; trang_thai: string }, nhanSan?: Map<string, string>): Promise<boolean> {
  if (p.trang_thai !== "dang_lam") return false;
  const cuaMinh = p.phu_trach_loai === "nguoi" ? p.phu_trach_id === nd.id : nd.don_vi_ids.includes(p.phu_trach_id);
  if (!cuaMinh) return false;
  return (nhanSan ?? (await nguoiNhanChuyenTiep(q, nd))).size > 0;
}

/** Đơn vị ngoài SCI (cột ngoai_sci) cùng mọi đơn vị con của nó, gom theo từng gốc. */
async function cumNgoaiSci(q: Q, cay: Awaited<ReturnType<typeof layCayDonVi>>): Promise<Set<string>[]> {
  const { rows } = await q.query<{ id: string }>("SELECT id FROM identity.don_vi WHERE ngoai_sci");
  return rows.map((r) => donViVaCapDuoi(cay, r.id));
}

/** Những người mà nd giao chuyển tiếp được — luật ở coThePhanCong. Không gồm chính mình. */
export async function nguoiNhanChuyenTiep(q: Q, nd: NguoiDungPhien): Promise<Map<string, string>> {
  const pv = await phamViGiao(q, nd);
  if (pv !== "tat_ca" && !pv.length) return new Map();
  const cay = await layCayDonVi(q, true);
  // Bỏ cụm ngoài SCI — trừ cụm chính nd đang thuộc (GĐ SCI E&C vẫn giao cho nhân viên E&C)
  const bo = await donViNgoaiSciCam(q, nd);
  // Giao chuyển tiếp là giao XUỐNG: không giao ngược lên ô Ban TGĐ / chức danh lãnh đạo (người kiêm trưởng phòng vẫn nhận qua phòng đó)
  for (const d of cay) if (d.loai === "ban_tgd" || (d.loai === "chuc_danh" && d.cap === 1)) bo.add(d.id);
  const duoc = new Set((pv === "tat_ca" ? cay.map((d) => d.id) : pv).filter((d) => !bo.has(d)));
  const { rows } = await q.query<{ id: string; dv: string; chinh: boolean }>(
    `SELECT n.id, n.don_vi_id AS dv, true AS chinh FROM identity.nguoi_dung n WHERE n.active AND n.don_vi_id IS NOT NULL
     UNION ALL SELECT k.nguoi_dung_id, k.don_vi_id, false FROM identity.kiem_nhiem k JOIN identity.nguoi_dung n ON n.id = k.nguoi_dung_id AND n.active`,
  );
  // Giao XUỐNG, không ngang/ngược (kiểm độc lập 10/10: Hương, Hằng, Thanh thấy anh Đại — PTGĐ kiêm trưởng chính P.ĐT&PC):
  //   · người mang vai Lãnh đạo không bao giờ là người nhận giao chuyển tiếp
  //   · người giao không phải lãnh đạo → bỏ người đang làm trưởng (vai Trưởng ở đơn vị "làm trưởng ở" — db/86 — hoặc trưởng chính)
  //     ở chính đơn vị của người giao
  //   · tài khoản Quản trị viên GIỮ trong danh sách (Mr. Đại chốt 10/10)
  const vai = await q.query<{ id: string; vai: string[]; chinh: string[]; truong_tai: string[] }>(
    `SELECT n.id, COALESCE(array_agg(DISTINCT g.vai_tro_id) FILTER (WHERE g.vai_tro_id IS NOT NULL), '{}') AS vai,
            COALESCE((SELECT array_agg(d.id) FROM identity.don_vi d WHERE d.uy_quyen_truong = n.id), '{}') AS chinh,
            COALESCE((SELECT array_agg(t.don_vi_id) FROM identity.truong_tai t WHERE t.nguoi_dung_id = n.id), '{}') AS truong_tai
       FROM identity.nguoi_dung n LEFT JOIN identity.gan_vai_tro g ON g.nguoi_dung_id = n.id WHERE n.active GROUP BY n.id`,
  );
  const dvCua = new Map<string, string[]>();
  for (const r of rows) dvCua.set(r.id, [...(dvCua.get(r.id) ?? []), r.dv]);
  const bo2 = new Set<string>();
  for (const r of vai.rows) {
    if (r.vai.includes("lanh-dao")) bo2.add(r.id);
    else if (pv !== "tat_ca") {
      const cuaNguoi = dvCua.get(r.id) ?? [];
      const vaiO = r.truong_tai.length ? cuaNguoi.filter((d) => r.truong_tai.includes(d)) : cuaNguoi;
      const truongO = [...(r.vai.includes("truong-don-vi") ? vaiO : []), ...r.chinh];
      if (truongO.some((d) => nd.don_vi_ids.includes(d))) bo2.add(r.id);
    }
  }
  // id người → đơn vị để XẾP NHÓM ở ô chọn (đơn vị chính nếu nằm trong phạm vi, không thì đơn vị kiêm nhiệm đầu tiên)
  const kq = new Map<string, string>();
  for (const r of rows.sort((a, b) => Number(b.chinh) - Number(a.chinh)))
    if (r.id !== nd.id && !bo2.has(r.id) && duoc.has(r.dv) && !kq.has(r.id)) kq.set(r.id, r.dv);
  // «Phòng ảo» hỗ trợ Ban lãnh đạo (Mr. Đại chốt 29/10/2026): quản trị chọn ở Cài đặt (giao_viec.ho_tro_ban_lanh_dao); lãnh đạo giao chuyển
  // tiếp được cho họ dù họ không là nhân viên đơn vị nào (trợ lý Chủ tịch, trưởng BP kiểm soát nội bộ — ô chức danh bị bỏ ở trên)
  if (pv === "tat_ca" || vai.rows.find((r) => r.id === nd.id)?.vai.includes("lanh-dao")) {
    const ht = (await layCauHinh(q, "giao_viec")).ho_tro_ban_lanh_dao ?? [];
    if (ht.length) {
      const { rows: con } = await q.query<{ id: string }>("SELECT id FROM identity.nguoi_dung WHERE active AND id = ANY($1::text[])", [ht]);
      for (const r of con) if (r.id !== nd.id) kq.set(r.id, DON_VI_HO_TRO_BLD);
    }
  }
  return kq;
}

/** Mã nhóm ảo «Hỗ trợ Ban lãnh đạo» trong ô Giao cho… (không phải đơn vị thật, không có trên sơ đồ) */
export const DON_VI_HO_TRO_BLD = "@ho-tro-bld";

/**
 * Nơi MỜI PHỐI HỢP được (Mr. Đại chốt 10/10/2026 tối): người / đơn vị NGANG CẤP và CẤP DƯỚI của mình. Nguyên văn:
 *   "trưởng phòng gọi được các phòng, toàn bộ nhân sự các phòng, toàn bộ đơn vị con, toàn bộ nhân sự con — trừ E&C và PMC chỉ gọi đơn vị"
 *   "nhân viên chỉ tag nhân viên và hệ thống nhân sự ở dưới đơn vị con, riêng PMC và E&C chỉ gọi được đơn vị"
 * Ba bậc người mời:
 *   · LÃNH ĐẠO (quản trị / quyền giao toàn bộ / thuộc ô cấp 1): mọi đơn vị, mọi người, cả các ô chức danh lãnh đạo khác.
 *   · TRƯỞNG (giữ quyền trưởng ở ít nhất một đơn vị — don_vi_truong): đơn vị có cấp ≥ cấp đơn vị mình làm trưởng + mọi người trong đó.
 *   · NHÂN VIÊN: đơn vị CẤP DƯỚI đơn vị mình (cấp >) + mọi người trong đó; ở đơn vị ngang cấp chỉ mời NHÂN VIÊN (không mời trưởng,
 *     không mời cả phòng).
 * Mọi bậc: bỏ chính mình; cá nhân của đơn vị ngoài SCI (SCI PMC, SCI E&C, ban điều hành — nguoiNgoaiSciCam) không mời đích danh,
 * chỉ mời cả đơn vị; người mang vai Lãnh đạo chỉ lãnh đạo mời được. Ô chức danh / Ban TGĐ không nằm trong don_vi.
 *   don_vi — đơn vị mời được · lanh_dao — ô chức danh lãnh đạo cấp 1 (chỉ bậc lãnh đạo) · nguoi — id người → id đơn vị để xếp nhóm
 */
export async function noiPhoiHop(q: Q, nd: NguoiDungPhien): Promise<{ don_vi: Set<string>; lanh_dao: Set<string>; nguoi: Map<string, string> }> {
  const cay = await layCayDonVi(q);
  const capCua = new Map(cay.map((d) => [d.id, d.cap ?? 99]));
  const capThap = (ds: readonly string[]) => Math.min(99, ...ds.map((d) => capCua.get(d) ?? 99));
  const capChung = capThap(nd.don_vi_ids);
  const laLanhDao = nd.la_quan_tri || nd.quyen["cong_viec.giao"] === "toan_bo" || capChung === 1;
  const truongO = nd.don_vi_dau ?? nd.don_vi_truong ?? [];
  const laTruong = !laLanhDao && truongO.length > 0;
  const capToi = laLanhDao ? 1 : laTruong ? capThap(truongO) : capChung;
  const nguoi = new Map<string, string>();
  if (capToi >= 99) return { don_vi: new Set(), lanh_dao: new Set(), nguoi };
  const thuong = cay.filter((d) => d.loai !== "chuc_danh" && d.loai !== "ban_tgd");
  // Đơn vị để lấy NGƯỜI: ngang cấp + cấp dưới. Đơn vị mời CẢ ĐƠN VỊ: như trên, riêng nhân viên chỉ cấp dưới.
  const dvNguoi = new Set(thuong.filter((d) => (d.cap ?? 99) >= capToi).map((d) => d.id));
  const don_vi = laLanhDao || laTruong ? dvNguoi : new Set(thuong.filter((d) => (d.cap ?? 99) > capToi).map((d) => d.id));
  const lanh_dao = new Set(laLanhDao ? cay.filter((d) => d.loai === "chuc_danh" && (d.cap ?? 99) === 1).map((d) => d.id) : []);
  const cam = new Set(await nguoiNgoaiSciCam(q, nd));
  const { rows } = await q.query<{ id: string; dv: string; chinh: boolean; ld: boolean; truong: boolean }>(
    `SELECT n.id, x.dv, x.chinh,
            EXISTS (SELECT 1 FROM identity.gan_vai_tro g WHERE g.nguoi_dung_id = n.id AND g.vai_tro_id = 'lanh-dao') AS ld,
            (${dauTheoVaiSql("x.dv")} OR EXISTS (SELECT 1 FROM identity.don_vi d WHERE d.id = x.dv AND d.uy_quyen_truong = n.id)) AS truong
       FROM identity.nguoi_dung n
       JOIN LATERAL (SELECT n.don_vi_id AS dv, true AS chinh WHERE n.don_vi_id IS NOT NULL
                     UNION ALL SELECT k.don_vi_id, false FROM identity.kiem_nhiem k WHERE k.nguoi_dung_id = n.id) x ON true
      WHERE n.active`,
  );
  // Nhân viên không mời TRƯỞNG của đơn vị ngang cấp — kể cả khi người đó còn kiêm nhiệm ở một đơn vị cấp dưới
  // (đo 10/10: trưởng P.ĐT&PC, trưởng P.KT&VH kiêm BQLDA QT từng lọt vào nhóm BQLDA QT của nhân viên)
  const truongNgangCap = new Set(!laLanhDao && !laTruong ? rows.filter((r) => r.truong && (capCua.get(r.dv) ?? 99) <= capToi).map((r) => r.id) : []);
  for (const r of rows.sort((a, b) => Number(b.chinh) - Number(a.chinh))) {
    if (r.id === nd.id || cam.has(r.id) || nguoi.has(r.id) || !dvNguoi.has(r.dv)) continue;
    if (r.ld && !laLanhDao) continue;
    if (truongNgangCap.has(r.id)) continue;
    nguoi.set(r.id, r.dv);
  }
  return { don_vi, lanh_dao, nguoi };
}

export async function phanCong(q: Q, nd: NguoiDungPhien, v: { phan_viec_id: string; nguoi_id: string }): Promise<void> {
  const p = await layMotPhanViec(q, v.phan_viec_id);
  if (!p) throw new LoiHttp(404, "Không có phần việc này");
  const cv = await viecDangMo(q, p.cong_viec_id);
  const nhan = await nguoiNhanChuyenTiep(q, nd);
  if (!(await coThePhanCong(q, nd, p, nhan)))
    throw new LoiHttp(403, `Chỉ người đang nhận phần việc này (${p.phu_trach_ten}) và có quyền Giao việc mới giao chuyển tiếp được`);
  const tuNhan = v.nguoi_id === nd.id; // tự nhận phần việc của đơn vị mình (Mr. Đại chốt 29/10/2026) — đã qua coThePhanCong: có quyền Giao việc và thuộc đơn vị
  if (tuNhan && p.phu_trach_loai !== "don_vi") throw new LoiHttp(400, "Phần việc này đang là của bạn");
  const tenMoi = await tenPhuTrach(q, "nguoi", v.nguoi_id);
  if (!tuNhan && !nhan.has(v.nguoi_id))
    throw new LoiHttp(403, `Không giao chuyển tiếp được cho ${tenMoi}: ngoài phạm vi giao việc của bạn, hoặc thuộc đơn vị ngoài SCI (SCI PMC, SCI E&C)`);
  // Phân công đích danh = giao cho người đó → ghi lúc giao (nút Việc của tôi phát sáng — Mr. Đại chốt 08/10)
  await q.query("UPDATE docflow.phan_viec SET phu_trach_loai = 'nguoi', phu_trach_id = $2, tao_luc = now() WHERE id = $1", [p.id, v.nguoi_id]);
  await ghiLichSu(q, {
    nguoi: nd.id,
    don_vi_id: nd.don_vi_id,
    doi_tuong_loai: "cong_viec",
    doi_tuong_id: cv.id,
    hanh_dong: "phan_cong",
    chi_tiet: { phan_viec_id: p.id, noi_dung: p.noi_dung, cu: p.phu_trach_ten, moi: tenMoi },
  });
  if (!tuNhan) await baoPhuTrach(q, { phu_trach_loai: "nguoi", phu_trach_id: v.nguoi_id }, {
    loai: "giao_viec",
    noi_dung: `${nd.ten} phân công bạn làm việc ${maKemTen(cv.id, cv.ten)} (phần của ${p.phu_trach_ten})`,
    lien_ket: `/cong-viec/${cv.id}`,
  });
}

export async function themPhanViec(
  q: Q,
  nd: NguoiDungPhien,
  v: { cong_viec_id: string; phu_trach: PhuTrach; bat_dau?: string | null; ket_thuc?: string | null },
  tuSuaViec = false, // gọi từ suaViec: quyền "Sửa việc" đã kiểm
): Promise<string> {
  const cv = await viecDangMo(q, v.cong_viec_id);
  if (!tuSuaViec && !(await coTheThemPhoiHop(q, nd, cv)))
    throw new LoiHttp(403, `Chỉ người giao việc ${cv.id}, lãnh đạo hoặc trưởng đơn vị cấp trên của bên chủ trì mới thêm phối hợp được`);
  if (!v.phu_trach?.id) throw new LoiHttp(400, "Chưa chọn người phụ trách");
  const batDau = v.bat_dau === undefined ? cv.bat_dau : v.bat_dau;
  const ketThuc = v.ket_thuc === undefined ? cv.ket_thuc : v.ket_thuc;
  if (batDau && ketThuc && batDau > ketThuc) throw new LoiHttp(400, "Ngày bắt đầu sau ngày kết thúc");
  const ds = await layPhanViec(q, [cv.id]);
  // Việc chưa còn chủ trì → phần thêm vào sẽ thành CHỦ TRÌ (chuanHoaVai) = giao việc → kiểm phạm vi
  if (!ds.some((p) => p.vai === "chu_tri")) await batBuocTrongPhamVi(q, nd, v.phu_trach);
  // Mời PHỐI HỢP (Mr. Đại chốt 10/10/2026 tối): người / đơn vị NGANG CẤP và CẤP DƯỚI của mình — luật ở noiPhoiHop
  else {
    const np = await noiPhoiHop(q, nd);
    const duoc = v.phu_trach.loai === "nguoi" ? np.nguoi.has(v.phu_trach.id) : np.don_vi.has(v.phu_trach.id) || np.lanh_dao.has(v.phu_trach.id);
    if (!duoc)
      throw new LoiHttp(
        403,
        `Không mời ${v.phu_trach.ten || (await tenPhuTrach(q, v.phu_trach.loai, v.phu_trach.id))} phối hợp được: chỉ mời người / đơn vị ngang cấp và cấp dưới của bạn; SCI PMC, SCI E&C chỉ mời cả đơn vị`,
      );
  }
  const ten = await tenPhuTrach(q, v.phu_trach.loai, v.phu_trach.id);
  const noiDung = v.phu_trach.noi_dung?.trim() || cv.ten;
  const id = await themMotPhanViec(q, cv.id, { ...v.phu_trach, bat_dau: batDau, ket_thuc: ketThuc }, noiDung, ds.reduce((m, p) => Math.max(m, p.thu_tu), 0) + 1);
  if (ketThuc && cv.ket_thuc && ketThuc > cv.ket_thuc) await q.query("UPDATE docflow.cong_viec SET ket_thuc = $2 WHERE id = $1", [cv.id, ketThuc]);
  await ghiLichSu(q, {
    nguoi: nd.id,
    don_vi_id: nd.don_vi_id,
    doi_tuong_loai: "cong_viec",
    doi_tuong_id: cv.id,
    hanh_dong: "them_phan_viec",
    chi_tiet: { phan_viec_id: id, phu_trach: ten, noi_dung: noiDung, bat_dau: batDau, ket_thuc: ketThuc, tien_do: tienDo(await layPhanViec(q, [cv.id])) },
  });
  // Việc đã có chủ trì → phần mới là PHỐI HỢP (chuanHoaVai), chỉ để biết, không hạn riêng
  const laPhoiHop = (await q.query<{ vai: string }>("SELECT vai FROM docflow.phan_viec WHERE id = $1", [id])).rows[0]?.vai === "phoi_hop";
  await baoPhuTrach(q, { phu_trach_loai: v.phu_trach.loai, phu_trach_id: v.phu_trach.id }, {
    loai: "giao_viec",
    noi_dung: laPhoiHop
      ? `${nd.ten} mời bạn phối hợp việc ${cv.id}: ${noiDung} (chủ trì giữ hạn, bạn nắm thông tin và hỗ trợ khi cần)`
      : `${nd.ten} thêm bạn vào việc ${cv.id}: ${noiDung}${ketThuc ? `, hạn ${ngayNgan(ketThuc, true)}` : ", luôn mở"}`,
    lien_ket: `/cong-viec/${cv.id}`,
  });
  return id;
}

export async function botPhanViec(
  q: Q,
  nd: NguoiDungPhien,
  v: { phan_viec_id: string; ly_do: string },
  tuSuaViec = false, // gọi từ suaViec: quyền "Sửa việc" đã kiểm
): Promise<void> {
  if (!v.ly_do?.trim()) throw new LoiHttp(400, "Bớt phần việc phải ghi lý do");
  const p = await layMotPhanViec(q, v.phan_viec_id);
  if (!p) throw new LoiHttp(404, "Không có phần việc này");
  const cv = await viecDangMo(q, p.cong_viec_id);
  if (!tuSuaViec) await batBuocSua(q, nd, cv);
  if (p.trang_thai !== "dang_lam") throw new LoiHttp(409, "Phần việc đã kết thúc, không bớt được");
  const ds = await layPhanViec(q, [cv.id]);
  if (ds.length <= 1) throw new LoiHttp(409, "Không bớt được phần việc duy nhất; muốn dừng hãy hủy việc (có lý do)");
  await q.query("UPDATE docflow.phan_viec SET da_bo = true, bo_ly_do = $2 WHERE id = $1", [p.id, v.ly_do.trim()]);
  await chuanHoaVai(q, cv.id); // bớt chủ trì → bên đứng đầu còn lại lên chủ trì
  const con = ds.filter((x) => x.id !== p.id);
  await ghiLichSu(q, {
    nguoi: nd.id,
    don_vi_id: nd.don_vi_id,
    doi_tuong_loai: "cong_viec",
    doi_tuong_id: cv.id,
    hanh_dong: "bot_phan_viec",
    chi_tiet: { phan_viec_id: p.id, phu_trach: p.phu_trach_ten, noi_dung: p.noi_dung, ly_do: v.ly_do.trim(), tien_do: tienDo(con) },
  });
  await baoPhuTrach(q, p, { loai: "bot_phan_viec", noi_dung: `Phần "${p.noi_dung}" của việc ${cv.id} đã được bớt: ${v.ly_do.trim()}`, lien_ket: `/cong-viec/${cv.id}` });
  await kiemTraHoanThanh(q, cv.id, nd.id);
}

/**
 * Cây bút ✏ "Sửa việc" (Mr. Đại chốt 29/09): sửa một lượt tên, kết quả cần có, ngày bắt đầu, hạn, chủ trì, phối hợp.
 * Quyền riêng "cong_viec.sua_viec" (Cài đặt → Vai trò và quyền). Đổi hạn KHÔNG bắt ghi lý do (khác nút Gia hạn).
 * Đổi hạn / chủ trì / phối hợp đi qua đúng hàm của từng thao tác (kiểm phạm vi giao, báo người, ghi lịch sử) — không chép lại luật.
 */
export async function suaViec(
  q: Q,
  nd: NguoiDungPhien,
  v: {
    cong_viec_id: string;
    ten: string;
    ket_qua_can_co?: string | null;
    bat_dau?: string | null;
    ket_thuc?: string | null;
    chu_tri?: PhuTrach | null;
    phoi_hop?: PhuTrach[];
  },
): Promise<{ thay: string[] }> {
  const cv = await viecDangMo(q, v.cong_viec_id);
  if (!(await coTheSuaViec(q, nd, cv)))
    throw new LoiHttp(403, `Bạn không có quyền sửa việc ${cv.id} (quyền "Sửa việc" ở Cài đặt → Vai trò và quyền)`);
  const ten = (v.ten ?? "").replace(/\s+/g, " ").trim();
  if (!ten) throw new LoiHttp(400, "Tên việc không được để trống");
  kiemChuVo(ten, "Tên việc");
  if (v.ket_qua_can_co) kiemChuVo(v.ket_qua_can_co, "Kết quả cần có");
  const kq = v.ket_qua_can_co === undefined ? cv.ket_qua_can_co : v.ket_qua_can_co?.trim() || null;
  const bd = v.bat_dau === undefined ? cv.bat_dau : v.bat_dau?.slice(0, 10) || null;
  const kt = v.ket_thuc === undefined ? cv.ket_thuc : v.ket_thuc?.slice(0, 10) || null;
  if (!kt && !(await layCauHinh(q, "quy_tac_de")).viec_khong_ngay_luon_mo) throw new LoiHttp(400, "Việc phải có hạn (ngày kết thúc)");
  if (bd && kt && bd > kt) throw new LoiHttp(400, `Ngày bắt đầu ${ngayNgan(bd, true)} sau hạn ${ngayNgan(kt, true)}`);

  const thay: string[] = [];
  if (ten !== cv.ten) thay.push(`tên "${cv.ten}" → "${ten}"`);
  if ((kq ?? "") !== (cv.ket_qua_can_co ?? "")) thay.push(`kết quả cần có → "${kq ?? "(trống)"}"`);
  if ((bd ?? "") !== (cv.bat_dau ?? "")) thay.push(`bắt đầu ${cv.bat_dau ? ngayNgan(cv.bat_dau, true) : "(trống)"} → ${bd ? ngayNgan(bd, true) : "(trống)"}`);
  const doiNd = thay.length > 0;
  if (doiNd) {
    await q.query("UPDATE docflow.cong_viec SET ten = $2, ket_qua_can_co = $3, bat_dau = $4 WHERE id = $1", [cv.id, ten, kq, bd]);
    // Phần việc mang đúng tên cũ / ngày bắt đầu cũ của việc thì đi theo
    if (ten !== cv.ten) await q.query("UPDATE docflow.phan_viec SET noi_dung = $3 WHERE cong_viec_id = $1 AND noi_dung = $2", [cv.id, cv.ten, ten]);
    if ((bd ?? "") !== (cv.bat_dau ?? ""))
      await q.query(
        "UPDATE docflow.phan_viec SET bat_dau = $3 WHERE cong_viec_id = $1 AND trang_thai = 'dang_lam' AND NOT da_bo AND bat_dau IS NOT DISTINCT FROM $2::date",
        [cv.id, cv.bat_dau, bd],
      );
  }
  if ((kt ?? "") !== (cv.ket_thuc ?? "")) {
    await giaHan(q, nd, { cong_viec_id: cv.id, ket_thuc: kt, ly_do: "Sửa việc (cây bút)" }, true);
    thay.push(`hạn ${cv.ket_thuc ? ngayNgan(cv.ket_thuc, true) : "(trống)"} → ${kt ? ngayNgan(kt, true) : "(trống)"}`);
  }
  const dang = (await layPhanViec(q, [cv.id])).filter((p) => p.trang_thai === "dang_lam");
  const khoa = (p: { loai: string; id: string }) => `${p.loai}:${p.id}`;
  const khoaPv = (p: PhanViec) => `${p.phu_trach_loai}:${p.phu_trach_id}`;
  const chuTri = dang.find((p) => p.vai !== "phoi_hop");
  if (v.chu_tri?.id && chuTri && khoa(v.chu_tri) !== khoaPv(chuTri)) {
    await doiNguoi(q, nd, { phan_viec_id: chuTri.id, phu_trach: { ...v.chu_tri, noi_dung: chuTri.noi_dung } }, true);
    thay.push(`chủ trì ${chuTri.phu_trach_ten} → ${v.chu_tri.ten || v.chu_tri.id}`);
  }
  if (v.phoi_hop) {
    const ctMoi = v.chu_tri?.id ? khoa(v.chu_tri) : chuTri ? khoaPv(chuTri) : "";
    const moi = new Map(v.phoi_hop.filter((x) => x?.id && khoa(x) !== ctMoi).map((x) => [khoa(x), x]));
    const cu = dang.filter((p) => p.vai === "phoi_hop");
    for (const p of cu) {
      if (moi.has(khoaPv(p))) continue;
      await botPhanViec(q, nd, { phan_viec_id: p.id, ly_do: `${nd.ten} bỏ phối hợp khi sửa việc` }, true);
      thay.push(`bỏ phối hợp ${p.phu_trach_ten}`);
    }
    const daCo = new Set(cu.map(khoaPv));
    for (const [k, x] of moi) {
      if (daCo.has(k)) continue;
      await themPhanViec(q, nd, { cong_viec_id: cv.id, phu_trach: x, bat_dau: homNayVN(), ket_thuc: null }, true);
      thay.push(`thêm phối hợp ${x.ten || x.id}`);
    }
    // Lãnh đạo phối hợp (db/82): người sửa thắng máy — ghi lại lãnh đạo đang có để vòng nền không gắn lại, bản báo cáo mới không bỏ
    const ldNay = (
      await q.query<{ id: string }>(
        `SELECT p.phu_trach_id AS id FROM docflow.phan_viec p JOIN identity.don_vi d ON d.id = p.phu_trach_id AND d.loai = 'chuc_danh'
          WHERE p.cong_viec_id = $1 AND NOT p.da_bo AND p.vai = 'phoi_hop' AND p.phu_trach_loai = 'don_vi' ORDER BY p.thu_tu LIMIT 1`,
        [cv.id],
      )
    ).rows[0]?.id ?? null;
    await q.query(
      `INSERT INTO docflow.lanh_dao_phoi_hop (cong_viec_id, don_vi_id, ly_do, nguon) VALUES ($1,$2,$3,'nguoi')
       ON CONFLICT (cong_viec_id) DO UPDATE SET don_vi_id = EXCLUDED.don_vi_id, ly_do = EXCLUDED.ly_do, nguon = 'nguoi', luc = now()`,
      [cv.id, ldNay, `${nd.ten} sửa việc`],
    );
  }
  if (!thay.length) throw new LoiHttp(400, "Chưa đổi gì để lưu");
  await ghiLichSu(q, {
    nguoi: nd.id,
    don_vi_id: nd.don_vi_id,
    doi_tuong_loai: "cong_viec",
    doi_tuong_id: cv.id,
    hanh_dong: "sua_viec",
    chi_tiet: { thay, sua_boi: nd.ten },
  });
  // Tên / kết quả / ngày bắt đầu đổi → người đang làm được báo (hạn, người mới đã có tin riêng của từng thao tác)
  if (doiNd) {
    const noiDung = thay.filter((t) => /^(tên|kết quả|bắt đầu) /.test(t)).join("; ");
    for (const p of (await layPhanViec(q, [cv.id])).filter((x) => x.trang_thai === "dang_lam"))
      await baoPhuTrach(q, p, { loai: "sua_viec", noi_dung: `${nd.ten} sửa việc ${cv.id} · ${ten}: ${noiDung}`, lien_ket: `/cong-viec/${cv.id}` });
  }
  return { thay };
}

/** Người giao việc đóng việc, BẮT BUỘC lý do. */
export async function dongViec(q: Q, nd: NguoiDungPhien, v: { cong_viec_id: string; ly_do: string }): Promise<void> {
  if (!v.ly_do?.trim()) throw new LoiHttp(400, "Hủy việc bắt buộc ghi lý do");
  const cv = await viecDangMo(q, v.cong_viec_id);
  await batBuocSua(q, nd, cv);
  const ds = await layPhanViec(q, [cv.id]);
  await q.query("UPDATE docflow.cong_viec SET trang_thai = 'da_dong', dong_luc = now(), ly_do_dong = $2 WHERE id = $1", [cv.id, v.ly_do.trim()]);
  await tatChuongViecXong(q, cv.id); // 3b (Mr. Đại duyệt 08/10)
  await ghiLichSu(q, {
    nguoi: nd.id,
    don_vi_id: nd.don_vi_id,
    doi_tuong_loai: "cong_viec",
    doi_tuong_id: cv.id,
    hanh_dong: "dong_viec",
    chi_tiet: { ly_do: v.ly_do.trim(), tien_do: tienDo(ds), dong_boi: nd.ten },
  });
  for (const p of ds.filter((x) => x.trang_thai === "dang_lam")) {
    await baoPhuTrach(q, p, { loai: "dong_viec", noi_dung: `Việc ${cv.id} · ${cv.ten} đã đóng: ${v.ly_do.trim()}`, lien_ket: `/cong-viec/${cv.id}` });
  }
  // Việc chờ việc này không bị treo mãi: đóng cũng tính là xong mốc
  await capNhatViecSau(q, cv.id, nd.id);
}

/**
 * MỞ LẠI việc đã xong / đã hủy (Mr. Đại duyệt K1 02/10/2026): người giao + người có quyền sửa (mặc định lãnh đạo), BẮT BUỘC lý do.
 * Việc quay về sổ cái (đang mở), phần CHỦ TRÌ và phần phối hợp tự đóng theo chủ trì quay về "đang làm". Hạn mới không bắt buộc
 * (để trống = giữ hạn cũ; hạn cũ đã qua thì việc hiện quá hạn ngay). Báo người làm + người đã phân công.
 */
export async function moLaiViec(q: Q, nd: NguoiDungPhien, v: { cong_viec_id: string; ly_do: string; ket_thuc?: string | null }): Promise<void> {
  if (!v.ly_do?.trim()) throw new LoiHttp(400, "Mở lại việc bắt buộc ghi lý do");
  const cv = await layViec(q, v.cong_viec_id);
  if (!cv) throw new LoiHttp(404, `Không có công việc ${v.cong_viec_id}`);
  if (cv.trang_thai === "dang_mo") throw new LoiHttp(409, `Việc ${cv.id} đang mở, không cần mở lại`);
  if (!(await coTheSua(q, nd, cv))) throw new LoiHttp(403, `Chỉ người giao việc ${cv.id} hoặc lãnh đạo mới mở lại được việc`);
  const moi = v.ket_thuc?.slice(0, 10) || null;
  if (moi && cv.bat_dau && cv.bat_dau > moi) throw new LoiHttp(400, "Hạn mới trước ngày bắt đầu");
  await moLaiLoi(q, cv, nd, v.ly_do.trim(), moi);
}

/** Lõi mở lại việc: việc về sổ cái, phần chủ trì (+ phối hợp tự đóng theo) về "đang làm", lịch sử, báo người làm. */
async function moLaiLoi(q: Q, cv: CongViec, nd: { id: string; ten: string; don_vi_id: string | null }, lyDo: string, moi: string | null): Promise<void> {
  const v = { ly_do: lyDo };
  const ds = await layPhanViec(q, [cv.id]);
  const moLai = ds.filter((p) => p.vai !== "phoi_hop" || p.ket_thuc_boi === "he-thong");
  await q.query("UPDATE docflow.cong_viec SET trang_thai = 'dang_mo', dong_luc = NULL, ly_do_dong = NULL, ket_thuc = COALESCE($2, ket_thuc) WHERE id = $1", [cv.id, moi]);
  for (const p of moLai) {
    await q.query(
      "UPDATE docflow.phan_viec SET trang_thai = 'dang_lam', ket_thuc_boi = NULL, ket_thuc_luc = NULL, ket_thuc = COALESCE($2, ket_thuc), luon_mo = CASE WHEN $2::date IS NULL THEN luon_mo ELSE false END WHERE id = $1",
      [p.id, moi],
    );
  }
  await ghiLichSu(q, {
    nguoi: nd.id,
    don_vi_id: nd.don_vi_id,
    doi_tuong_loai: "cong_viec",
    doi_tuong_id: cv.id,
    hanh_dong: "mo_lai_viec",
    chi_tiet: { ly_do: v.ly_do.trim(), trang_thai_cu: cv.trang_thai, han_moi: moi, mo_boi: nd.ten, so_phan_viec: moLai.length },
  });
  const han = moi ? `, hạn mới ${ngayNgan(moi, true)}` : "";
  for (const p of moLai) {
    if (p.phu_trach_loai === "nguoi" && p.phu_trach_id === nd.id) continue;
    await baoPhuTrach(q, p, { loai: "mo_lai_viec", noi_dung: `${nd.ten} mở lại việc ${maKemTen(cv.id, cv.ten)}${han}: ${v.ly_do.trim()}`, lien_ket: `/cong-viec/${cv.id}` });
    await baoNguoiPhanCong(
      q,
      cv.id,
      p.id,
      { loai: "mo_lai_viec", noi_dung: `${nd.ten} mở lại việc ${maKemTen(cv.id, cv.ten)} (phần của ${p.phu_trach_ten}, bạn phân công)${han}: ${v.ly_do.trim()}`, lien_ket: `/cong-viec/${cv.id}` },
      [nd.id, p.phu_trach_id],
    );
  }
  if (cv.giao_boi && cv.giao_boi !== nd.id && !moLai.some((p) => p.phu_trach_loai === "nguoi" && p.phu_trach_id === cv.giao_boi)) {
    await taoThongBao(q, { nguoi_nhan: cv.giao_boi, loai: "mo_lai_viec", noi_dung: `${nd.ten} mở lại việc ${maKemTen(cv.id, cv.ten)} bạn giao${han}: ${v.ly_do.trim()}`, lien_ket: `/cong-viec/${cv.id}` });
  }
}

// ---------------- Đọc ----------------

export interface LocSoCai {
  don_vi_id?: string;
  nguoi?: string;
  du_an?: string;
  luon_mo?: boolean;
  treo?: boolean;
  canh_bao?: "qua_han" | "sap_den_han";
  tu_khoa?: string;
  hom_nay?: string; // yyyy-mm-dd; mặc định hôm nay giờ Việt Nam (để test/agent hỏi theo ngày)
}

export interface DongSoCai extends CongViec {
  phan_viec: PhanViec[];
  tien_do: string; // '1/2'
  canh_bao: "qua_han" | "sap_den_han" | null;
  /** Việc treo: đang mở, không có hạn và không chờ mốc nào — giữ nguyên nhưng luôn cảnh báo */
  treo: boolean;
  /** Ngày theo việc khác: "bắt đầu / kết thúc sau khi xong …" */
  phu_thuoc: PhuThuocUi[];
  nguon_hien_hanh: NguonCongViec | null;
  so_ban_da_de: number;
}

/** Dựng các dòng sổ cái cho một tập việc (đọc phần việc, nguồn hiện hành, số bản đã đè trong 3 truy vấn). */
async function dungDong(q: Q, ds: CongViec[], homNay: string): Promise<DongSoCai[]> {
  if (!ds.length) return [];
  const ids = ds.map((c) => c.id);
  const sapN = (await layCauHinh(q, "so_cai")).sap_den_han_ngay;
  const pv = await layPhanViec(q, ids);
  const ngIds = ds.map((c) => c.nguon_hien_hanh_id).filter((x): x is string => !!x);
  const ng = ngIds.length ? (await q.query(`${SQL_NG} WHERE g.id = ANY($1::text[])`, [ngIds])).rows.map(mapNg) : [];
  const { rows: de } = await q.query<{ cong_viec_id: string; n: number }>(
    "SELECT cong_viec_id, count(*)::int AS n FROM docflow.nguon_cong_viec WHERE trang_thai = 'bi_de' AND cong_viec_id = ANY($1::text[]) GROUP BY cong_viec_id",
    [ids],
  );
  const pvTheoViec = new Map<string, PhanViecDay[]>();
  for (const p of pv) pvTheoViec.set(p.cong_viec_id, [...(pvTheoViec.get(p.cong_viec_id) ?? []), p]);
  const ngTheoId = new Map(ng.map((n) => [n.id, n]));
  const deTheoViec = new Map(de.map((r) => [r.cong_viec_id, Number(r.n)]));
  const pt = await docPhuThuoc(q, ids);
  return ds.map((c) => {
    const phan = pvTheoViec.get(c.id) ?? [];
    const phuThuoc = pt.get(c.id) ?? [];
    return {
      ...c,
      phan_viec: phan,
      tien_do: tienDo(phan),
      canh_bao: tinhCanhBao(c, phan, homNay, sapN),
      treo: c.trang_thai === "dang_mo" && !c.ket_thuc && !phuThuoc.some((p) => p.loai === "ket_thuc"),
      phu_thuoc: phuThuoc,
      nguon_hien_hanh: (c.nguon_hien_hanh_id && ngTheoId.get(c.nguon_hien_hanh_id)) || null,
      so_ban_da_de: deTheoViec.get(c.id) ?? 0,
    };
  });
}

async function locDong(q: Q, ds: DongSoCai[], loc: LocSoCai): Promise<DongSoCai[]> {
  let kq = ds;
  if (loc.don_vi_id) {
    // Một hoặc nhiều bộ phận, cách nhau dấu phẩy (bấm nhãn nhóm "Nhà máy" = mọi nhà máy)
    const ids = loc.don_vi_id.split(",").map((x) => x.trim()).filter(Boolean);
    const coDv = new Set(ids);
    // Việc giao đích danh người: người có đơn vị CHÍNH ở đây thì tính; người chỉ KIÊM NHIỆM ở đây thì chỉ tính khi việc gắn với đơn
    // vị này (lấy từ báo cáo của đơn vị này). Đo 02/10: lọc "BQLDA Quảng Trị" trả lẫn 2 việc Nậm Xe giao anh Sơn (TP KT&VH kiêm BQLDA QT)
    const { rows: chinh } = await q.query<{ id: string }>("SELECT id FROM identity.nguoi_dung WHERE don_vi_id = ANY($1::text[])", [ids]);
    const { rows: kiem } = await q.query<{ id: string }>("SELECT nguoi_dung_id AS id FROM identity.kiem_nhiem WHERE don_vi_id = ANY($1::text[])", [ids]);
    const nguoiChinh = new Set(chinh.map((r) => r.id));
    const nguoiKiem = new Set(kiem.map((r) => r.id));
    kq = kq.filter((c) => {
      const ganDv = (!!c.don_vi_giao && coDv.has(c.don_vi_giao)) || (!!c.nguon_hien_hanh?.don_vi_id && coDv.has(c.nguon_hien_hanh.don_vi_id));
      return (
        (!!c.don_vi_giao && coDv.has(c.don_vi_giao)) ||
        c.phan_viec.some((p) =>
          p.phu_trach_loai === "don_vi" ? coDv.has(p.phu_trach_id) : nguoiChinh.has(p.phu_trach_id) || (ganDv && nguoiKiem.has(p.phu_trach_id)),
        )
      );
    });
  }
  if (loc.nguoi) {
    const { rows } = await q.query<{ id: string }>(
      "SELECT don_vi_id AS id FROM identity.nguoi_dung WHERE id = $1 AND don_vi_id IS NOT NULL UNION SELECT don_vi_id FROM identity.kiem_nhiem WHERE nguoi_dung_id = $1",
      [loc.nguoi],
    );
    const dvNguoi = new Set(rows.map((r) => r.id));
    kq = kq.filter((c) => c.phan_viec.some((p) => (p.phu_trach_loai === "nguoi" ? p.phu_trach_id === loc.nguoi : dvNguoi.has(p.phu_trach_id))));
  }
  if (loc.du_an) {
    const k = chuanHoa(loc.du_an);
    kq = kq.filter((c) => chuanHoa(c.du_an).includes(k));
  }
  if (loc.luon_mo !== undefined) kq = kq.filter((c) => c.luon_mo === loc.luon_mo);
  if (loc.treo !== undefined) kq = kq.filter((c) => c.treo === loc.treo);
  if (loc.canh_bao) kq = kq.filter((c) => c.canh_bao === loc.canh_bao);
  if (loc.tu_khoa?.trim()) {
    const k = chuanHoa(loc.tu_khoa);
    kq = kq.filter((c) =>
      chuanHoa(
        [c.id, c.ten, c.du_an, c.hang_muc, c.nguon_hien_hanh?.nhan, ...c.phan_viec.flatMap((p) => [p.noi_dung, p.phu_trach_ten])].join(" "),
      ).includes(k),
    );
  }
  return kq;
}

/** Việc đang mở trong sổ cái. */
export async function danhSachSoCai(q: Q, loc: LocSoCai = {}): Promise<DongSoCai[]> {
  const { rows } = await q.query(`SELECT ${COT_CV} FROM docflow.so_cai c ORDER BY c.ket_thuc NULLS LAST, c.id`);
  const ds = await dungDong(q, rows.map(mapCv), loc.hom_nay ?? homNayVN());
  const kq = await locDong(q, ds, loc);
  // Quá hạn lên đầu, rồi sắp đến hạn, rồi theo hạn
  const hang = (c: DongSoCai) => (c.canh_bao === "qua_han" ? 0 : c.canh_bao === "sap_den_han" ? 1 : c.treo ? 2 : 3);
  return kq.sort((a, b) => hang(a) - hang(b) || (a.ket_thuc ?? "9999").localeCompare(b.ket_thuc ?? "9999") || a.id.localeCompare(b.id));
}

/** Chi tiết một việc (đang mở hoặc đã xong) kèm mọi nguồn (hiện hành + đã bị đè). */
export async function chiTietViec(q: Q, congViecId: string): Promise<(DongSoCai & { cac_nguon: NguonCongViec[] }) | null> {
  const cv = await layViec(q, congViecId);
  if (!cv) return null;
  const [dong] = await dungDong(q, [cv], homNayVN());
  const { rows } = await q.query(`${SQL_NG} WHERE g.cong_viec_id = $1 ORDER BY g.ngay_gui, g.luc`, [congViecId]);
  return { ...dong, cac_nguon: rows.map(mapNg) };
}

/** Việc đã xong (đã rời sổ cái). */
export async function viecDaXong(q: Q, loc: LocSoCai & { tu?: string; den?: string } = {}): Promise<DongSoCai[]> {
  const dk: string[] = ["c.trang_thai IN ('hoan_thanh','da_dong')"];
  const ts: unknown[] = [];
  if (loc.tu) {
    ts.push(loc.tu.slice(0, 10));
    dk.push(`((c.dong_luc AT TIME ZONE 'UTC') + interval '7 hours')::date >= $${ts.length}::date`);
  }
  if (loc.den) {
    ts.push(loc.den.slice(0, 10));
    dk.push(`((c.dong_luc AT TIME ZONE 'UTC') + interval '7 hours')::date <= $${ts.length}::date`);
  }
  const { rows } = await q.query(`SELECT ${COT_CV} FROM docflow.cong_viec c WHERE ${dk.join(" AND ")} ORDER BY c.dong_luc DESC NULLS LAST LIMIT 500`, ts);
  const ds = await dungDong(q, rows.map(mapCv), loc.hom_nay ?? homNayVN());
  const { canh_bao: _bo, ...conLai } = loc;
  return locDong(q, ds, conLai);
}

/** Quét quá hạn / sắp đến hạn: tạo thông báo cho người phụ trách + người giao. Gọi bởi bộ hẹn giờ. */
/** Nội dung phần việc trùng tên việc (bỏ dấu cách thừa, hoa thường) → tin chuông chỉ ghi tên 1 lần (Mr. Đại 10/10/2026) */
function laCungTen(noiDung: string | null | undefined, ten: string | null | undefined): boolean {
  const g = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  return !g(noiDung) || g(noiDung) === g(ten);
}

export async function quetHan(q: Q, homNay: string): Promise<{ qua_han: number; sap_den_han: number }> {
  const ngay = homNay.slice(0, 10);
  const chSc = await layCauHinh(q, "so_cai");
  const mau = (await layCauHinh(q, "thong_bao")).mau;
  const moc = congNgay(ngay, chSc.sap_den_han_ngay);
  const { rows } = await q.query<{
    pv_id: string;
    cong_viec_id: string;
    ten: string;
    giao_boi: string | null;
    phu_trach_loai: string;
    phu_trach_id: string;
    noi_dung: string;
    ket_thuc: string;
  }>(
    `SELECT p.id AS pv_id, c.id AS cong_viec_id, c.ten, c.giao_boi, p.phu_trach_loai, p.phu_trach_id, p.noi_dung, p.ket_thuc::text AS ket_thuc
       FROM docflow.phan_viec p JOIN docflow.so_cai c ON c.id = p.cong_viec_id
      WHERE NOT p.da_bo AND p.trang_thai = 'dang_lam' AND NOT p.luon_mo AND NOT c.luon_mo AND p.ket_thuc IS NOT NULL
        AND p.ket_thuc <= $1::date
      ORDER BY c.id, p.thu_tu`,
    [moc],
  );
  let quaHan = 0;
  let sapDen = 0;
  for (const r of rows) {
    const qua = r.ket_thuc < ngay;
    if (qua) quaHan++;
    else sapDen++;
    const loai = qua ? "qua_han" : "sap_den_han";
    const moi = await q.query("INSERT INTO docflow.nhac_han (phan_viec_id, loai, ngay) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING phan_viec_id", [
      r.pv_id,
      loai,
      qua ? ngay : r.ket_thuc,
    ]);
    if (!moi.rows.length) continue; // đã nhắc hôm nay / đã nhắc mốc hạn này
    const tenPt = await tenPhuTrach(q, r.phu_trach_loai as "nguoi" | "don_vi", r.phu_trach_id);
    if (qua) {
      await ghiLichSu(q, {
        nguoi: "he-thong",
        doi_tuong_loai: "cong_viec",
        doi_tuong_id: r.cong_viec_id,
        hanh_dong: "qua_han",
        chi_tiet: { phan_viec_id: r.pv_id, phu_trach: tenPt, noi_dung: r.noi_dung, han: r.ket_thuc, ngay },
      });
    }
    // Kênh (trong app / email) do taoThongBao tự chia theo cấu hình — chỉ bỏ qua khi tắt nhắc hoặc không chọn kênh nào
    if (!chSc.nhac_qua_han || chSc.kenh_nhac.length === 0) continue;
    const nd = `${dienMau(mau[loai] ?? (qua ? "Việc {ma_viec} đã quá hạn {han}" : "Việc {ma_viec} sắp đến hạn {han}"), {
      ma_viec: r.cong_viec_id,
      han: ngayNgan(r.ket_thuc, true),
    })}: ${r.ten} · ${tenPt}${laCungTen(r.noi_dung, r.ten) ? "" : ` · ${r.noi_dung}`}`; // tên việc chỉ ghi 1 lần (Mr. Đại 10/10/2026)
    const tb = { loai, noi_dung: nd, lien_ket: `/cong-viec/${r.cong_viec_id}` };
    await baoPhuTrach(q, r, tb);
    if (r.giao_boi && !(r.phu_trach_loai === "nguoi" && r.phu_trach_id === r.giao_boi)) await taoThongBao(q, { ...tb, nguoi_nhan: r.giao_boi });
  }
  return { qua_han: quaHan, sap_den_han: sapDen };
}
