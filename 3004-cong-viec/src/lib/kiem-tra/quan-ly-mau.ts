// ============================================================
// kiem-tra/quan-ly-mau.ts — QUẢN LÝ MẪU WORD (trang /mau-word). CHỈ SERVER.
// Quyền "mau.quan_ly" để sửa; ai cũng xem/tải mẫu. Thêm mẫu mới (Form 9…) không sửa code:
// định nghĩa mẫu (ô nhập, ô bắt buộc, nơi nhận mặc định, bảng sinh việc) là dữ liệu.
// Mọi thay đổi ghi lịch sử đối tượng 'mau' + bảng mau_word_phien_ban.
// ============================================================
import { kiemCauTruc, sinhTruongCu } from "./cau-truc";
import type { CauTrucMau } from "@/lib/types";
import type { Q } from "@/lib/db";
import type { DinhNghiaMau, MauWord, NguoiDungPhien } from "@/lib/types";
import { LoiHttp } from "@/lib/phien";
import { coQuyen } from "@sci/identity";
import { ghiLichSu } from "@/lib/lich-su/ghi";
import { docTep, ghiTep } from "@/lib/luu-tru/kho";
import { docWord, type NoiDungWord } from "./doc-word";
import { layMau } from "./kiem-tra";
import { PHIEN_BAN_VI_DU } from "./hat-giong";

export function batBuocQuanLyMau(nd: NguoiDungPhien) {
  if (!coQuyen(nd, "mau.quan_ly")) throw new LoiHttp(403, "Cần quyền Quản lý mẫu báo cáo");
}

const KIEU_O = new Set(["chu", "ngay", "chon", "don_vi"]);

/** Kiểm tra định nghĩa trước khi lưu: không cho lưu định nghĩa sai. Trả về bản đã làm sạch. */
export function kiemTraDinhNghia(dn: unknown): DinhNghiaMau & Record<string, unknown> {
  if (!dn || typeof dn !== "object") throw new LoiHttp(400, "Định nghĩa mẫu phải là một đối tượng");
  const d = dn as Record<string, unknown>;
  const oNhap = Array.isArray(d.o_nhap) ? d.o_nhap : null;
  if (!oNhap) throw new LoiHttp(400, "Định nghĩa thiếu danh sách ô nhập (o_nhap)");
  const tags = new Set<string>();
  const o = oNhap.map((x, i) => {
    const r = x as Record<string, unknown>;
    const tag = String(r.tag ?? "").trim();
    if (!/^[a-z0-9_]+$/i.test(tag)) throw new LoiHttp(400, `Ô nhập thứ ${i + 1}: tag "${tag}" chỉ gồm chữ không dấu, số, gạch dưới`);
    if (tags.has(tag)) throw new LoiHttp(400, `Ô nhập "${tag}" bị trùng`);
    tags.add(tag);
    const kieu = String(r.kieu ?? "chu");
    if (!KIEU_O.has(kieu)) throw new LoiHttp(400, `Ô "${tag}": kiểu "${kieu}" không hợp lệ (chu, ngay, chon, don_vi)`);
    return {
      tag,
      nhan: String(r.nhan ?? tag).trim() || tag,
      bat_buoc: !!r.bat_buoc,
      kieu: kieu as "chu",
      ...(Array.isArray(r.lua_chon) ? { lua_chon: r.lua_chon.map(String) } : {}),
      ...(r.luat ? { luat: String(r.luat) } : {}),
    };
  });
  if (!tags.has("mau_ma")) throw new LoiHttp(400, 'Mẫu phải có ô "mau_ma" để hệ thống nhận ra mẫu');
  const bang = (Array.isArray(d.bang_cong_viec) ? d.bang_cong_viec : []).map((x, i) => {
    const r = x as Record<string, unknown>;
    const tag = String(r.tag ?? "").trim();
    if (!/^bang_[a-z0-9_]+$/i.test(tag)) throw new LoiHttp(400, `Bảng sinh việc thứ ${i + 1}: tag phải bắt đầu "bang_"`);
    return { tag, nhan: String(r.nhan ?? tag), ...(r.la_quyet_dinh ? { la_quyet_dinh: true } : {}) };
  });
  const muc = (Array.isArray(d.muc_bat_buoc) ? d.muc_bat_buoc : []).map((x) => String(x).trim()).filter(Boolean);
  // Mẫu khai theo NGHĨA (Khai báo mẫu không cần sửa code, 01/10/2026): cau_truc là gốc — kiểm rồi SINH LẠI hai trường cũ
  if (d.cau_truc && typeof d.cau_truc === "object") {
    const ct = d.cau_truc as CauTrucMau;
    if (!Array.isArray(ct.chuong)) throw new LoiHttp(400, "Cấu trúc mẫu thiếu danh sách chương");
    const loiCt = kiemCauTruc(ct);
    if (loiCt.length) throw new LoiHttp(400, `Cấu trúc mẫu chưa hợp lệ: ${loiCt.join(" · ")}`);
    return { ...d, o_nhap: o, ...sinhTruongCu(ct), cau_truc: ct };
  }
  return { ...d, o_nhap: o, bang_cong_viec: bang, muc_bat_buoc: muc };
}

async function ghiPhienBanMau(q: Q, ma: string, nd: NguoiDungPhien, tenTep: string | null) {
  const { rows } = await q.query<{ khoa_luu: string | null; phien_ban: number; dinh_nghia: unknown }>(
    "SELECT khoa_luu, phien_ban, dinh_nghia FROM docflow.mau_word WHERE ma = $1",
    [ma],
  );
  const m = rows[0];
  if (!m?.khoa_luu) return;
  const buf = await docTep(m.khoa_luu).catch(() => null);
  if (!buf) return;
  const { sha256, kich_thuoc } = await ghiTep(buf);
  await q.query(
    `INSERT INTO docflow.mau_word_phien_ban (ma, phien_ban, ten_tep, khoa_luu, sha256, kich_thuoc, dinh_nghia, tai_len_boi)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
    [ma, m.phien_ban, tenTep ?? `${ma}.docx`, m.khoa_luu, sha256, kich_thuoc, JSON.stringify(m.dinh_nghia), nd.id],
  );
}

export interface SuaMau {
  ten?: string;
  don_vi_lap?: string | null;
  gui_den_mac_dinh?: string | null;
  loai_ky?: MauWord["loai_ky"];
  dinh_nghia?: unknown;
  active?: boolean;
}

async function kiemDonVi(q: Q, id: string | null | undefined, nhan: string) {
  if (!id) return;
  const { rows } = await q.query("SELECT 1 FROM identity.don_vi WHERE id = $1", [id]);
  if (!rows.length) throw new LoiHttp(400, `${nhan}: không có đơn vị "${id}"`);
}

export async function suaMau(q: Q, nd: NguoiDungPhien, ma: string, v: SuaMau): Promise<MauWord> {
  batBuocQuanLyMau(nd);
  const cu = await layMau(q, ma);
  if (!cu) throw new LoiHttp(404, "Không có mẫu này");
  if (v.loai_ky && !["tuan", "thang", "quy", "tu_do"].includes(v.loai_ky)) throw new LoiHttp(400, "Loại kỳ không hợp lệ");
  await kiemDonVi(q, v.don_vi_lap, "Đơn vị lập");
  await kiemDonVi(q, v.gui_den_mac_dinh, "Nơi nhận mặc định");
  const dn = v.dinh_nghia !== undefined ? kiemTraDinhNghia(v.dinh_nghia) : cu.dinh_nghia;
  const moi = {
    ten: v.ten?.trim() || cu.ten,
    don_vi_lap: v.don_vi_lap !== undefined ? v.don_vi_lap || null : cu.don_vi_lap,
    gui_den_mac_dinh: v.gui_den_mac_dinh !== undefined ? v.gui_den_mac_dinh || null : cu.gui_den_mac_dinh,
    loai_ky: v.loai_ky ?? cu.loai_ky,
    active: v.active ?? cu.active,
  };
  await q.query(
    `UPDATE docflow.mau_word SET ten=$2, don_vi_lap=$3, gui_den_mac_dinh=$4, loai_ky=$5, dinh_nghia=$6, active=$7,
       phien_ban = phien_ban + 1, sua_luc = now() WHERE ma = $1`,
    [ma, moi.ten, moi.don_vi_lap, moi.gui_den_mac_dinh, moi.loai_ky, JSON.stringify(dn), moi.active],
  );
  await ghiPhienBanMau(q, ma, nd, null);
  await ghiLichSu(q, {
    nguoi: nd.id,
    don_vi_id: nd.don_vi_id,
    doi_tuong_loai: "mau",
    doi_tuong_id: ma,
    hanh_dong: "sua_cau_hinh",
    chi_tiet: { truoc: { ...cu }, sau: { ...moi, dinh_nghia: dn } },
  });
  return (await layMau(q, ma))!;
}

/** Khung định nghĩa cho mẫu mới: các ô chung của các mẫu + bảng Công việc chuẩn. Mẫu bản 6 (29/09/2026) bỏ Người lập / Ngày lập / Người kiểm soát — máy ghi người nộp, ngày nộp. */
export function dinhNghiaKhung(): DinhNghiaMau {
  return {
    o_nhap: [
      { tag: "mau_ma", nhan: "Mã mẫu (dấu nhận mẫu ẩn ở tiêu đề)", bat_buoc: true, kieu: "chu" },
      { tag: "ky_bao_cao", nhan: "Kỳ báo cáo (☒ Tuần …/☐ Tháng …)", bat_buoc: true, kieu: "chu" },
    ],
    bang_cong_viec: [{ tag: "bang_cong_viec", nhan: "Công việc" }],
    muc_bat_buoc: ["Công việc"],
  };
}

export async function themMau(
  q: Q,
  nd: NguoiDungPhien,
  v: { ma: string; ten: string; don_vi_lap?: string | null; gui_den_mac_dinh?: string | null; loai_ky?: MauWord["loai_ky"]; dinh_nghia?: unknown },
): Promise<MauWord> {
  batBuocQuanLyMau(nd);
  const ma = (v.ma ?? "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(ma)) throw new LoiHttp(400, 'Mã mẫu chỉ gồm chữ thường không dấu, số, gạch ngang (vd "form-9")');
  if (!v.ten?.trim()) throw new LoiHttp(400, "Chưa đặt tên mẫu");
  if (await layMau(q, ma)) throw new LoiHttp(409, `Đã có mẫu "${ma}"`);
  await kiemDonVi(q, v.don_vi_lap, "Đơn vị lập");
  await kiemDonVi(q, v.gui_den_mac_dinh, "Nơi nhận mặc định");
  const dn = kiemTraDinhNghia(v.dinh_nghia ?? dinhNghiaKhung());
  await q.query(
    `INSERT INTO docflow.mau_word (ma, ten, don_vi_lap, gui_den_mac_dinh, loai_ky, dinh_nghia) VALUES ($1,$2,$3,$4,$5,$6)`,
    [ma, v.ten.trim(), v.don_vi_lap || null, v.gui_den_mac_dinh || null, v.loai_ky ?? "tuan", JSON.stringify(dn)],
  );
  await ghiLichSu(q, {
    nguoi: nd.id,
    don_vi_id: nd.don_vi_id,
    doi_tuong_loai: "mau",
    doi_tuong_id: ma,
    hanh_dong: "sua_cau_hinh",
    chi_tiet: { tao_moi: true, ten: v.ten.trim(), dinh_nghia: dn },
  });
  return (await layMau(q, ma))!;
}

/** Đọc thử file mẫu: các ô gắn mã, bảng gắn mã, tiêu đề mục tìm thấy — gợi ý khai báo định nghĩa. */
export async function docThuMau(buf: Buffer): Promise<{
  noi_dung: NoiDungWord;
  goi_y: { o_nhap: string[]; bang: { tag: string; cot: string[] }[]; tieu_de: string[] };
}> {
  const nd = await docWord(buf);
  return {
    noi_dung: nd,
    goi_y: {
      o_nhap: Object.keys(nd.o_nhap),
      bang: Object.entries(nd.bang).map(([tag, dong]) => ({ tag, cot: Array.from(new Set(dong.flatMap((d) => Object.keys(d)))) })),
      tieu_de: nd.tieu_de,
    },
  };
}

/** Tải lên phiên bản file mẫu mới. Bản cũ giữ trong mau_word_phien_ban. */
export async function taiLenTepMau(
  q: Q,
  nd: NguoiDungPhien,
  ma: string,
  tep: { ten_tep: string; noi_dung: Buffer },
): Promise<{ mau: MauWord; thieu_o: string[]; thieu_bang: string[]; tag_moi: string[] }> {
  batBuocQuanLyMau(nd);
  const cu = await layMau(q, ma);
  if (!cu) throw new LoiHttp(404, "Không có mẫu này");
  if (!/\.docx$/i.test(tep.ten_tep)) throw new LoiHttp(400, "File mẫu phải là Word .docx");
  let doc: NoiDungWord;
  try {
    doc = await docWord(tep.noi_dung);
  } catch (e) {
    throw new LoiHttp(400, e instanceof Error ? e.message : "Không đọc được file Word");
  }
  const { khoa, sha256, kich_thuoc } = await ghiTep(tep.noi_dung);
  await q.query("UPDATE docflow.mau_word SET khoa_luu = $2, phien_ban = phien_ban + 1, sua_luc = now() WHERE ma = $1", [ma, khoa]);
  const { rows } = await q.query<{ phien_ban: number }>("SELECT phien_ban FROM docflow.mau_word WHERE ma = $1", [ma]);
  await q.query(
    `INSERT INTO docflow.mau_word_phien_ban (ma, phien_ban, ten_tep, khoa_luu, sha256, kich_thuoc, dinh_nghia, tai_len_boi)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
    [ma, rows[0].phien_ban, tep.ten_tep, khoa, sha256, kich_thuoc, JSON.stringify(cu.dinh_nghia), nd.id],
  );
  const coTag = new Set(Object.keys(doc.o_nhap));
  const thieu_o = cu.dinh_nghia.o_nhap.filter((o) => !coTag.has(o.tag)).map((o) => o.tag);
  const thieu_bang = cu.dinh_nghia.bang_cong_viec.filter((b) => !(b.tag in doc.bang)).map((b) => b.tag);
  const daKhai = new Set(cu.dinh_nghia.o_nhap.map((o) => o.tag));
  const tag_moi = Array.from(coTag).filter((t) => !daKhai.has(t));
  await ghiLichSu(q, {
    nguoi: nd.id,
    don_vi_id: nd.don_vi_id,
    doi_tuong_loai: "mau",
    doi_tuong_id: ma,
    hanh_dong: "tai_len",
    chi_tiet: { ten_tep: tep.ten_tep, sha256, phien_ban: rows[0].phien_ban, mau_ma_trong_file: doc.mau_ma, thieu_o, thieu_bang, tag_moi },
  });
  return { mau: (await layMau(q, ma))!, thieu_o, thieu_bang, tag_moi };
}

/** Các phiên bản của bản chính (bản trắng); không gồm bản có ví dụ (phien_ban = 0). */
export async function lichSuPhienBanMau(q: Q, ma: string) {
  const { rows } = await q.query<{ phien_ban: number; ten_tep: string; sha256: string; kich_thuoc: string | number; tai_len_boi: string; tai_len_luc: string | Date }>(
    "SELECT phien_ban, ten_tep, sha256, kich_thuoc, tai_len_boi, tai_len_luc FROM docflow.mau_word_phien_ban WHERE ma = $1 AND phien_ban <> $2 ORDER BY phien_ban DESC",
    [ma, PHIEN_BAN_VI_DU],
  );
  return rows.map((r) => ({ ...r, kich_thuoc: Number(r.kich_thuoc), tai_len_luc: new Date(r.tai_len_luc).toISOString() }));
}

/** Bản file mẫu: "trang" — bản chính để tải về điền (mặc định); "vi_du" — bản có số liệu ví dụ để tham khảo. */
export type BanMau = "trang" | "vi_du";

/** Các mẫu có bản ví dụ (cho danh sách mẫu). */
export async function maCoBanViDu(q: Q): Promise<Set<string>> {
  const { rows } = await q.query<{ ma: string }>("SELECT ma FROM docflow.mau_word_phien_ban WHERE phien_ban = $1", [PHIEN_BAN_VI_DU]);
  return new Set(rows.map((r) => r.ma));
}

/** Nội dung file mẫu: bản chính hiện hành, một phiên bản cũ của bản chính, hoặc bản có ví dụ. */
export async function docTepMau(q: Q, ma: string, phienBan?: number, ban: BanMau = "trang"): Promise<{ ten_tep: string; noi_dung: Buffer } | null> {
  if (ban === "vi_du") phienBan = PHIEN_BAN_VI_DU;
  if (phienBan !== undefined) {
    const { rows } = await q.query<{ khoa_luu: string; ten_tep: string }>(
      "SELECT khoa_luu, ten_tep FROM docflow.mau_word_phien_ban WHERE ma = $1 AND phien_ban = $2",
      [ma, phienBan],
    );
    if (!rows[0]) return null;
    return { ten_tep: rows[0].ten_tep, noi_dung: await docTep(rows[0].khoa_luu) };
  }
  const { rows } = await q.query<{ khoa_luu: string | null }>("SELECT khoa_luu FROM docflow.mau_word WHERE ma = $1", [ma]);
  if (!rows[0]?.khoa_luu) return null;
  return { ten_tep: `${ma}.docx`, noi_dung: await docTep(rows[0].khoa_luu) };
}

/** Số báo cáo ĐÃ GỬI theo mẫu (không tính bản nháp) — có thì không xoá được mẫu, chỉ ngừng dùng. */
export async function soBaoCaoDaGui(q: Q, ma: string): Promise<number> {
  const { rows } = await q.query<{ n: number }>("SELECT count(*)::int AS n FROM docflow.tai_lieu WHERE mau_ma = $1 AND trang_thai <> 'nhap'", [ma]);
  return rows[0]?.n ?? 0;
}

/**
 * Xoá hẳn một mẫu CHƯA có báo cáo nào gửi theo (Mr. Đại chốt 01/10/2026 — chạy trên máy chủ không sửa được code).
 * Đã có báo cáo gửi → từ chối, chỉ ngừng dùng (báo cáo cũ cần định nghĩa mẫu để đọc lại, đối chiếu sổ cái).
 * Bản nháp theo mẫu → thành file thường; đơn vị gắn mẫu → bỏ gắn; luật kiểm tra áp riêng mẫu này → tắt, áp nhiều mẫu → gỡ mẫu này.
 */
export async function xoaMau(q: Q, nd: NguoiDungPhien, ma: string): Promise<{ luat_tat: number; ban_nhap: number }> {
  batBuocQuanLyMau(nd);
  const m = await layMau(q, ma);
  if (!m) throw new LoiHttp(404, "Không có mẫu này");
  const n = await soBaoCaoDaGui(q, ma);
  if (n) throw new LoiHttp(409, `Mẫu "${m.ten}" đã có ${n} báo cáo gửi theo — không xoá được vì báo cáo cũ cần mẫu để đọc lại. Bỏ tích "Đang dùng" để ngừng dùng.`);
  const banNhap = (await q.query("UPDATE docflow.tai_lieu SET mau_ma = NULL WHERE mau_ma = $1 RETURNING id", [ma])).rows.length;
  await q.query("UPDATE identity.don_vi SET mau_ma = NULL WHERE mau_ma = $1", [ma]);
  const { danhSachLuat, tatLuatChoMau } = await import("@/lib/luat/kho-luat");
  const luat = (await danhSachLuat(q))
    .filter((l) => !l.he_thong && Array.isArray(l.ap_dung) && l.ap_dung.includes(ma))
    .map((l) => ({ id: l.id, ma: l.ma, ten: l.ten, ly_do: "cả mẫu (mẫu đã bị xoá)", chi_mau_nay: (l.ap_dung as string[]).length === 1 }));
  if (luat.length) await tatLuatChoMau(q, nd, ma, luat);
  await q.query("DELETE FROM docflow.mau_word_phien_ban WHERE ma = $1", [ma]);
  await q.query("DELETE FROM docflow.mau_word WHERE ma = $1", [ma]);
  await ghiLichSu(q, {
    nguoi: nd.id,
    don_vi_id: nd.don_vi_id,
    doi_tuong_loai: "mau",
    doi_tuong_id: ma,
    hanh_dong: "sua_cau_hinh",
    chi_tiet: { xoa_mau: true, ten: m.ten, phien_ban: m.phien_ban, ban_nhap_thanh_file_thuong: banNhap, luat: luat.map((l) => l.ma) },
  });
  return { luat_tat: luat.length, ban_nhap: banNhap };
}
