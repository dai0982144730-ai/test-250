// ============================================================
// gui/chung.ts — hàm dùng chung của module gửi (CHỈ SERVER): đọc bước/tài liệu, quyền, nơi nhận, thông báo.
// ============================================================
import type { Q } from "@/lib/db";
import type { KyBaoCao, NguoiDungPhien } from "@/lib/types";
import { LoiHttp } from "@/lib/phien";
import { coQuyen } from "@sci/identity";
import { layCayDonVi } from "@sci/identity/don-vi";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { taoThongBao, thongBaoDonVi } from "@/lib/thong-bao";
import { datVaoThuMuc, thuMucCuaDonVi } from "@/lib/thu-muc/dich-vu";

export type LoaiBuoc = "gui" | "chuyen_tiep" | "chuyen_tiep_kem" | "tra_lai" | "gui_lai" | "gui_moi" | "hoan_thanh";
export type TrangThaiBuoc = "cho_nhan" | "da_nhan" | "bi_tra_lai" | "da_xu_ly" | "hoan_thanh";

export interface HangBuoc {
  id: string;
  hanh_trinh_id: string;
  cha_id: string | null;
  loai: LoaiBuoc;
  tai_lieu_id: string;
  phien_ban: number;
  tep_kem: { tai_lieu_id: string; phien_ban: number }[];
  tu_don_vi: string | null;
  tu_nguoi: string;
  den_don_vi: string | null;
  den_nguoi: string | null;
  ly_do: string | null;
  trang_thai: TrangThaiBuoc;
  nhan_boi: string | null;
  nhan_luc: string | Date | null;
  luc: string | Date;
}

export interface HangTaiLieu {
  id: string;
  ten: string;
  mau_ma: string | null;
  don_vi_lap: string | null;
  nguoi_tao: string;
  nguoi_gui_that: string | null;
  phien_ban_hien_tai: number;
  ky_bao_cao: KyBaoCao | null;
  trang_thai: "nhap" | "da_gui" | "bi_tra_lai" | "hoan_thanh";
  lien_quan_den: string | null;
  tao_luc: string | Date;
}

export async function layBuoc(q: Q, id: string): Promise<HangBuoc> {
  const { rows } = await q.query<HangBuoc>("SELECT * FROM docflow.buoc_hanh_trinh WHERE id = $1", [id]);
  if (!rows[0]) throw new LoiHttp(404, "Không có bước hành trình này");
  const b = rows[0];
  if (typeof b.tep_kem === "string") b.tep_kem = JSON.parse(b.tep_kem);
  return b;
}

export async function layTaiLieu(q: Q, id: string): Promise<HangTaiLieu> {
  const { rows } = await q.query<HangTaiLieu>("SELECT * FROM docflow.tai_lieu WHERE id = $1", [id]);
  if (!rows[0]) throw new LoiHttp(404, "Không có tài liệu này");
  return rows[0];
}

export async function tenDonVi(q: Q, id: string | null): Promise<string> {
  if (!id) return "";
  const { rows } = await q.query<{ ten: string }>("SELECT ten FROM identity.don_vi WHERE id = $1", [id]);
  return rows[0]?.ten ?? id;
}

export async function tenNguoi(q: Q, id: string | null): Promise<string> {
  if (!id) return "";
  const { rows } = await q.query<{ ten: string }>("SELECT ten FROM identity.nguoi_dung WHERE id = $1", [id]);
  return rows[0]?.ten ?? id;
}

/** Có quyền "tai_lieu.gui" trên đối tượng (tài liệu của ai, thuộc đơn vị nào). */
export async function coQuyenGui(q: Q, nd: NguoiDungPhien, doiTuong: { chu_so_huu?: string | null; don_vi_id?: string | null }): Promise<boolean> {
  const cay = await layCayDonVi(q);
  return coQuyen(nd, "tai_lieu.gui", doiTuong, cay);
}

/** Người dùng là nơi nhận của bước (thành viên đơn vị nhận / đúng người nhận) và có quyền gửi ở đơn vị đó. */
export async function laNoiNhan(q: Q, nd: NguoiDungPhien, b: HangBuoc): Promise<boolean> {
  if (nd.la_quan_tri) return true;
  if (b.den_nguoi) return b.den_nguoi === nd.id;
  if (!b.den_don_vi || !nd.don_vi_ids.includes(b.den_don_vi)) return false;
  return coQuyenGui(q, nd, { don_vi_id: b.den_don_vi });
}

export async function batBuocNoiNhan(q: Q, nd: NguoiDungPhien, b: HangBuoc): Promise<void> {
  if (!(await laNoiNhan(q, nd, b))) throw new LoiHttp(403, "Bạn không phải nơi nhận của bước này hoặc không có quyền gửi, chuyển tiếp");
}

export interface NoiNhan {
  don_vi_id: string;
  nguoi_id: string | null;
  ten: string;
}

/** Nơi nhận: mã đơn vị, hoặc "nguoi:<id>" để gửi thẳng một người (vd Phó TGĐ phụ trách). */
export async function phanTichNoiNhan(q: Q, den: string[]): Promise<NoiNhan[]> {
  const kq: NoiNhan[] = [];
  for (const raw of den ?? []) {
    const d = String(raw ?? "").trim();
    if (!d) continue;
    if (d.startsWith("nguoi:")) {
      const id = d.slice(6).toLowerCase();
      const { rows } = await q.query<{ id: string; ten: string; don_vi_id: string | null; active: boolean }>(
        "SELECT id, ten, don_vi_id, active FROM identity.nguoi_dung WHERE id = $1",
        [id],
      );
      const u = rows[0];
      if (!u || !u.active) throw new LoiHttp(400, `Không có người nhận "${id}"`);
      if (!u.don_vi_id) throw new LoiHttp(400, `${u.ten} chưa được gán đơn vị nên chưa nhận được tài liệu`);
      if (!kq.some((x) => x.nguoi_id === u.id)) kq.push({ don_vi_id: u.don_vi_id, nguoi_id: u.id, ten: u.ten });
      continue;
    }
    const { rows } = await q.query<{ id: string; ten: string; active: boolean }>("SELECT id, ten, active FROM identity.don_vi WHERE id = $1", [d]);
    if (!rows[0] || !rows[0].active) throw new LoiHttp(400, `Không có đơn vị nhận "${d}"`);
    if (!kq.some((x) => x.don_vi_id === d && !x.nguoi_id)) kq.push({ don_vi_id: d, nguoi_id: null, ten: rows[0].ten });
  }
  return kq;
}

/** Cấu hình "ai được chuyển tiếp cho ai": từ đơn vị → danh sách nhận; '*' = mọi nơi / mặc định. */
export function duocChuyenTiep(bang: Record<string, string[]>, tu: string | null, den: string): boolean {
  const ds = (tu && bang[tu]) || bang["*"] || [];
  return ds.includes("*") || ds.includes(den);
}

/** Đặt tài liệu vào thư mục Đến / Đi của đơn vị. */
export async function vaoThuMuc(
  q: Q,
  donViId: string,
  loai: "den" | "di",
  taiLieuId: string,
  nguoi: string,
  nhan?: string | null,
): Promise<{ thu_muc_id: string; vi_tri_id: string }> {
  const thu_muc_id = await thuMucCuaDonVi(q, donViId, loai);
  // Chỉ truyền nhãn khi muốn đổi: datVaoThuMuc ghi đè nhãn của vị trí đã có
  const vi_tri_id = await datVaoThuMuc(q, { tai_lieu_id: taiLieuId, thu_muc_id, vai: loai, nguoi, ...(nhan !== undefined ? { nhan } : {}) });
  return { thu_muc_id, vi_tri_id };
}

export function dien(mau: string, v: Record<string, string | number | null | undefined>): string {
  return mau.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
}

export async function mauThongBao(q: Q, khoa: string, macDinh: string): Promise<string> {
  const ch = await layCauHinh(q, "thong_bao");
  return ch.mau?.[khoa] ?? macDinh;
}

/** Thông báo cho nơi nhận của một bước: đúng người nếu gửi thẳng, không thì mọi người của đơn vị. */
export async function baoNoiNhan(q: Q, nn: { don_vi_id: string | null; nguoi_id: string | null }, tb: { loai: string; noi_dung: string; lien_ket: string }) {
  if (nn.nguoi_id) await taoThongBao(q, { nguoi_nhan: nn.nguoi_id, ...tb });
  else if (nn.don_vi_id) await thongBaoDonVi(q, nn.don_vi_id, tb);
}

export function gioVN(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())} ${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Người chưa gán đơn vị: chặn gửi (mặc định) hoặc cho gửi với cấp thấp nhất — theo cấu hình nguoi_ngoai. */
export async function kiemNguoiChuaGanDonVi(q: Q, nd: NguoiDungPhien): Promise<void> {
  if (nd.don_vi_id) return;
  const ch = await layCauHinh(q, "nguoi_ngoai");
  if (ch.chua_gan_don_vi === "chan_gui" && !nd.la_quan_tri) {
    throw new LoiHttp(403, "Bạn chưa được gán đơn vị nên chưa gửi được tài liệu. Quản trị viên đã được báo để xếp bạn vào đơn vị.");
  }
}

/** Báo quản trị viên có người chưa được gán đơn vị (không lặp nếu còn thông báo chưa đọc). Gọi NGOÀI giao dịch bị hoàn lại. */
export async function baoChuaGanDonVi(q: Q, nd: NguoiDungPhien): Promise<void> {
  if (nd.don_vi_id) return;
  const noiDung = dien(await mauThongBao(q, "chua_gan_don_vi", "Có người dùng chưa được gán đơn vị: {ten}"), { ten: `${nd.ten} (${nd.email})` });
  const { rows } = await q.query("SELECT 1 FROM docflow.thong_bao WHERE nguoi_nhan = 'quan-tri' AND noi_dung = $1 AND NOT da_doc LIMIT 1", [noiDung]);
  if (rows.length === 0) await taoThongBao(q, { nguoi_nhan: "quan-tri", loai: "chua_gan_don_vi", noi_dung: noiDung, lien_ket: "/quan-tri" });
}
