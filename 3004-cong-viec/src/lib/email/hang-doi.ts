// ============================================================
// email/hang-doi.ts — XẾP THƯ VÀO HÀNG ĐỢI + tùy chọn nhận email từng người (CHỈ SERVER).
// Xếp thư chạy trong CÙNG giao dịch với thông báo (hoàn lại thì thư cũng mất). Bộ gửi: email/bo-gui.ts.
// Chưa cấu hình email → không xếp thư (tránh dồn thư cũ khi mới khai SMTP), không báo lỗi.
// ============================================================
import type { Q } from "@/lib/db";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { MAC_DINH, type CauHinh } from "@/lib/cau-hinh/mac-dinh";
import { ghiLichSu } from "@/lib/lich-su/ghi";
import { laEmail, tinhCauHinhGuiThu } from "./cau-hinh";
import { soanThu } from "./soan-thu";
import { nhacGuiSom } from "./bo-gui";

/** Loại nhắc hạn của sổ cái: kênh theo so_cai.kenh_nhac. */
export const LOAI_NHAC_HAN = new Set(["qua_han", "sap_den_han"]);

export interface KenhThongBao {
  trong_app: boolean;
  email: boolean;
  tieu_de: string;
  thong_bao: CauHinh["thong_bao"];
}

type DongLoai = { trong_app: boolean; email: boolean; tieu_de: string };

function dongHopLe(v: unknown): v is DongLoai {
  return !!v && typeof v === "object" && typeof (v as DongLoai).trong_app === "boolean" && typeof (v as DongLoai).email === "boolean";
}

/** Kênh của một loại thông báo theo cấu hình hiện hành. */
export async function kenhChoLoai(q: Q, loai: string): Promise<KenhThongBao> {
  const tb = await layCauHinh(q, "thong_bao");
  const bang = (tb.theo_loai && typeof tb.theo_loai === "object" ? tb.theo_loai : {}) as Record<string, unknown>;
  const md = MAC_DINH.thong_bao.theo_loai;
  const dong: DongLoai = [bang[loai], bang.khac, md[loai], md.khac].find(dongHopLe) as DongLoai;
  let { trong_app, email } = dong;
  if (LOAI_NHAC_HAN.has(loai)) {
    const kenh = (await layCauHinh(q, "so_cai")).kenh_nhac ?? [];
    trong_app = kenh.includes("trong_app");
    email = kenh.includes("email");
  }
  return { trong_app, email, tieu_de: typeof dong.tieu_de === "string" ? dong.tieu_de : "{noi_dung}", thong_bao: tb };
}

export interface ThuMoi {
  den: string;
  nguoi_nhan?: string | null;
  loai: string;
  tieu_de: string;
  van_ban: string;
  html?: string | null;
  thong_bao_id?: number | null;
}

/** Xếp một thư vào hàng đợi (không kiểm cấu hình). Trả id. */
export async function xepThu(q: Q, t: ThuMoi): Promise<number> {
  const { rows } = await q.query<{ id: string }>(
    `INSERT INTO docflow.hang_doi_email (nguoi_nhan, den, loai, tieu_de, van_ban, html, thong_bao_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [t.nguoi_nhan ?? null, t.den.trim(), t.loai, t.tieu_de, t.van_ban, t.html ?? null, t.thong_bao_id ?? null],
  );
  return Number(rows[0].id);
}

/**
 * Xếp thư cho một thông báo tới danh sách người nhận (id người dùng).
 * Bỏ qua: chưa cấu hình email, người bị khóa, không có email hợp lệ, người đã tắt nhận email. Trả số thư đã xếp.
 */
export async function xepThuThongBao(
  q: Q,
  nguoiNhan: string[],
  tb: { loai: string; noi_dung: string; lien_ket?: string | null; thong_bao_id?: number | null },
  kenh?: KenhThongBao,
): Promise<number> {
  const k = kenh ?? (await kenhChoLoai(q, tb.loai));
  if (!k.email || nguoiNhan.length === 0) return 0;
  if (tinhCauHinhGuiThu(k.thong_bao).che_do === "chua_cau_hinh") return 0;
  const { rows } = await q.query<{ id: string; email: string; ten: string }>(
    `SELECT n.id, n.email, n.ten FROM identity.nguoi_dung n
       LEFT JOIN docflow.tuy_chon_email t ON t.nguoi_dung_id = n.id
      WHERE n.id = ANY($1::text[]) AND n.active AND COALESCE(t.nhan_email, true)
      ORDER BY n.id`,
    [Array.from(new Set(nguoiNhan))],
  );
  const nhan = rows.filter((r) => laEmail(r.email));
  if (nhan.length === 0) return 0;
  const tenUngDung = (await layCauHinh(q, "giao_dien")).ten_ung_dung;
  for (const r of nhan) {
    const thu = soanThu({ ten_ung_dung: tenUngDung, ten_nguoi_nhan: r.ten, tieu_de_mau: k.tieu_de, noi_dung: tb.noi_dung, lien_ket: tb.lien_ket });
    await xepThu(q, { den: r.email, nguoi_nhan: r.id, loai: tb.loai, ...thu, thong_bao_id: tb.thong_bao_id ?? null });
  }
  nhacGuiSom();
  return nhan.length;
}

// ---------------- Tùy chọn cá nhân ----------------

export async function layNhanEmail(q: Q, nguoiDungId: string): Promise<boolean> {
  const { rows } = await q.query<{ nhan_email: boolean }>("SELECT nhan_email FROM docflow.tuy_chon_email WHERE nguoi_dung_id = $1", [nguoiDungId]);
  return rows[0]?.nhan_email ?? true;
}

/** Bật/tắt nhận email thông báo của chính mình (ghi lịch sử). */
export async function datNhanEmail(q: Q, nd: { id: string; don_vi_id?: string | null }, nhanEmail: boolean): Promise<boolean> {
  const cu = await layNhanEmail(q, nd.id);
  await q.query(
    `INSERT INTO docflow.tuy_chon_email (nguoi_dung_id, nhan_email, cap_nhat_luc) VALUES ($1,$2,now())
     ON CONFLICT (nguoi_dung_id) DO UPDATE SET nhan_email = EXCLUDED.nhan_email, cap_nhat_luc = now()`,
    [nd.id, nhanEmail],
  );
  if (cu !== nhanEmail) {
    await ghiLichSu(q, {
      nguoi: nd.id,
      don_vi_id: nd.don_vi_id ?? null,
      doi_tuong_loai: "nguoi_dung",
      doi_tuong_id: nd.id,
      hanh_dong: "sua_nguoi_dung",
      chi_tiet: { tuy_chon: "nhan_email", truoc: cu, sau: nhanEmail },
    });
  }
  return nhanEmail;
}

// ---------------- Xem hàng đợi (quản trị) ----------------

export interface DongHangDoi {
  id: number;
  nguoi_nhan: string | null;
  den: string;
  loai: string;
  tieu_de: string;
  trang_thai: "cho" | "dang_gui" | "da_gui" | "loi";
  so_lan_thu: number;
  loi_cuoi: string | null;
  thu_lai_luc: string;
  tao_luc: string;
  da_gui_luc: string | null;
}

const LUC = (c: string) => `to_char(${c} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;

export async function danhSachHangDoi(
  q: Q,
  loc: { trang_thai?: string | null; gioi_han?: number } = {},
): Promise<{ thu: DongHangDoi[]; dem: Record<string, number> }> {
  const ts: unknown[] = [];
  let sql = `SELECT id, nguoi_nhan, den, loai, tieu_de, trang_thai, so_lan_thu, loi_cuoi,
                    ${LUC("thu_lai_luc")} AS thu_lai_luc, ${LUC("tao_luc")} AS tao_luc, ${LUC("da_gui_luc")} AS da_gui_luc
               FROM docflow.hang_doi_email`;
  if (loc.trang_thai) {
    ts.push(loc.trang_thai);
    sql += ` WHERE trang_thai = $1`;
  }
  ts.push(Math.min(Math.max(loc.gioi_han ?? 100, 1), 500));
  sql += ` ORDER BY id DESC LIMIT $${ts.length}`;
  const { rows } = await q.query<DongHangDoi & { id: string }>(sql, ts);
  const d = await q.query<{ trang_thai: string; n: number }>("SELECT trang_thai, count(*)::int AS n FROM docflow.hang_doi_email GROUP BY trang_thai");
  const dem: Record<string, number> = { cho: 0, dang_gui: 0, da_gui: 0, loi: 0 };
  for (const r of d.rows) dem[r.trang_thai] = r.n;
  return { thu: rows.map((r) => ({ ...r, id: Number(r.id) })), dem };
}

/** Đưa thư lỗi (hết lượt) về hàng chờ, đếm lại số lần thử. */
export async function thuLaiThu(q: Q, ids: number[] | "tat_ca_loi"): Promise<number> {
  if (ids === "tat_ca_loi") {
    const { rows } = await q.query(
      "UPDATE docflow.hang_doi_email SET trang_thai = 'cho', so_lan_thu = 0, thu_lai_luc = now() WHERE trang_thai = 'loi' RETURNING id",
    );
    return rows.length;
  }
  const so = ids.map(Number).filter((n) => Number.isInteger(n));
  if (!so.length) return 0;
  const { rows } = await q.query(
    `UPDATE docflow.hang_doi_email SET trang_thai = 'cho', so_lan_thu = 0, thu_lai_luc = now()
      WHERE trang_thai IN ('loi','cho') AND id = ANY($1::bigint[]) RETURNING id`,
    [so],
  );
  return rows.length;
}
