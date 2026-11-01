// ============================================================
// so-cai/phu-thuoc.ts — NGÀY TÍNH THEO VIỆC KHÁC (bảng docflow.phu_thuoc_viec, db/45-phu-thuoc.sql).
//   Bắt đầu "sau khi xong X"      → bat_dau = ngày X xong (muộn nhất nếu nhiều việc) + so_ngay
//   Kết thúc "N ngày sau khi X"   → ket_thuc = ngày X xong + N; trước đó việc "chờ mốc", không tính quá hạn
// Việc mốc là một việc có mã (sự kiện như "làm việc với đối tác MAC" cũng là một việc).
// Việc mốc "xong" = hoàn thành hoặc đã đóng (rời sổ cái); ngày xong = ngày rời sổ cái (giờ Việt Nam).
// ============================================================
import type { Q } from "@/lib/db";
import type { DongCongViec, MocViec } from "@/lib/types";
import { ghiLichSu } from "@/lib/lich-su/ghi";
import { taoMa } from "@/lib/ma";
import { dauDonVi, taoThongBao } from "@/lib/thong-bao";
import { diemKhopTen, NGUONG_KHOP_MOC } from "./moc-viec";
import { congNgay, doGiongChuoi, ngayNgan } from "./tien-ich";

export type LoaiMoc = "bat_dau" | "ket_thuc";

/** Một dòng phụ thuộc để hiển thị (sổ cái, chi tiết việc). */
export interface PhuThuocUi {
  loai: LoaiMoc;
  viec_truoc_id: string | null;
  ten: string; // tên như ghi trong báo cáo
  ten_viec_truoc: string | null;
  xong: boolean;
  ngay_xong: string | null;
  so_ngay: number;
  goc: string | null;
  da_tinh: string | null;
}

// ---------------- Khớp việc mốc lúc kiểm tra báo cáo ----------------

/**
 * Tìm việc mốc cho các dòng có "sau …": mã việc (phải có trong sổ cái), dòng khác cùng báo cáo, hoặc việc trong sổ cái
 * khớp tên (ưu tiên cùng dự án). Ghi kết quả vào chính moc.viec (ma / bang + dong). Trả các thông điệp cho người gửi.
 */
export async function giaiMocBaoCao(
  q: Q,
  congViec: DongCongViec[],
): Promise<{ chi_so: number; loai: LoaiMoc; muc: "canh_bao" | "goi_y"; thong_diep: string }[]> {
  const kq: { chi_so: number; loai: LoaiMoc; muc: "canh_bao" | "goi_y"; thong_diep: string }[] = [];
  const coMoc = congViec.some((c) => c.bat_dau_sau || c.ket_thuc_sau);
  if (!coMoc) return kq;
  const { rows: soCai } = await q.query<{ id: string; ten: string; du_an: string | null; trang_thai: string }>(
    "SELECT id, ten, du_an, trang_thai FROM docflow.cong_viec WHERE trang_thai <> 'da_dong' OR dong_luc > now() - interval '180 days'",
  );
  const theoMa = new Map(soCai.map((v) => [v.id.toUpperCase(), v]));

  congViec.forEach((c, i) => {
    for (const loai of ["bat_dau", "ket_thuc"] as const) {
      const moc = loai === "bat_dau" ? c.bat_dau_sau : c.ket_thuc_sau;
      if (!moc) continue;
      const tim: string[] = [];
      for (const v of moc.viec) {
        if (v.ma) {
          const co = theoMa.get(v.ma.toUpperCase());
          if (co) {
            v.ma = co.id;
            tim.push(`${co.id} "${co.ten}"`);
          } else kq.push({ chi_so: i, loai, muc: "canh_bao", thong_diep: `"${c.ten}": mã việc mốc ${v.ma} không có trong sổ cái` });
          continue;
        }
        // Dòng khác của cùng báo cáo
        let totJ = -1;
        let totD = NGUONG_KHOP_MOC;
        for (let j = 0; j < congViec.length; j++) {
          if (j === i) continue;
          const d = diemKhopTen(v.ten, congViec[j].ten);
          if (d >= totD) [totJ, totD] = [j, d];
        }
        if (totJ >= 0) {
          const k = congViec[totJ];
          if (k.ma_viec) v.ma = k.ma_viec;
          v.bang = k.nguon_bang;
          v.dong = k.dong_so;
          tim.push(`dòng ${k.dong_so} "${k.ten}"`);
          continue;
        }
        // Việc trong sổ cái (cùng dự án được cộng điểm, khác hẳn dự án bị trừ)
        let s: (typeof soCai)[number] | undefined;
        let diem = NGUONG_KHOP_MOC;
        for (const x of soCai) {
          let d = diemKhopTen(v.ten, x.ten);
          if (c.du_an && x.du_an) {
            const g = doGiongChuoi(c.du_an, x.du_an);
            d = g >= 0.8 ? d + 0.05 : g < 0.4 ? d * 0.7 : d;
          }
          if (d >= diem) [s, diem] = [x, d];
        }
        if (s) {
          v.ma = s.id;
          tim.push(`${s.id} "${s.ten}"${s.trang_thai !== "dang_mo" ? " (đã xong)" : ""}`);
          continue;
        }
        kq.push({
          chi_so: i,
          loai,
          muc: "canh_bao",
          thong_diep: `"${c.ten}": không tìm thấy việc mốc "${v.ten}" — ghi mã việc (vd CV-2026-0012) hoặc tên đúng như một dòng trong báo cáo / sổ cái. Chưa tìm được thì ${loai === "bat_dau" ? "ngày bắt đầu" : "hạn"} chưa tự tính.`,
        });
      }
      if (tim.length)
        kq.push({
          chi_so: i,
          loai,
          muc: "goi_y",
          thong_diep: `"${c.ten}": ${loai === "bat_dau" ? "bắt đầu" : "kết thúc"} ${moc.so_ngay ? `${moc.so_ngay} ngày ` : ""}sau khi xong ${tim.join(", ")}`,
        });
    }
  });
  return kq;
}

// ---------------- Ghi + tự tính ngày ----------------

/**
 * Đặt lại phụ thuộc một loại của việc theo bản hiện hành (bản mới không có "sau …" thì xóa phụ thuộc cũ).
 * timDong: dòng khác cùng báo cáo (tag bảng + số dòng) → mã việc của dòng đó.
 */
export async function datPhuThuoc(
  q: Q,
  cvId: string,
  loai: LoaiMoc,
  moc: MocViec | undefined,
  timDong: (bang: string, dong: number) => string | undefined,
): Promise<void> {
  await q.query("DELETE FROM docflow.phu_thuoc_viec WHERE cong_viec_id = $1 AND loai = $2", [cvId, loai]);
  if (!moc) return;
  for (const v of moc.viec) {
    let truoc = v.ma ?? (v.bang && v.dong ? timDong(v.bang, v.dong) : undefined) ?? null;
    if (truoc) {
      const { rows } = await q.query("SELECT 1 FROM docflow.cong_viec WHERE id = $1", [truoc]);
      if (!rows.length) truoc = null;
    }
    if (truoc === cvId) continue; // không phụ thuộc chính mình
    await q.query(
      `INSERT INTO docflow.phu_thuoc_viec (id, cong_viec_id, loai, viec_truoc_id, ten, so_ngay, goc) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [taoMa("pt"), cvId, loai, truoc, v.ten, moc.so_ngay, moc.goc],
    );
  }
}

const SQL_PT = `SELECT p.cong_viec_id, p.loai, p.viec_truoc_id, p.ten, p.so_ngay, p.goc, p.da_tinh::text AS da_tinh,
  c.ten AS ten_viec_truoc, c.trang_thai AS tt_truoc,
  ((c.dong_luc AT TIME ZONE 'UTC') + interval '7 hours')::date::text AS ngay_xong
  FROM docflow.phu_thuoc_viec p LEFT JOIN docflow.cong_viec c ON c.id = p.viec_truoc_id`;

type HangPt = {
  cong_viec_id: string;
  loai: LoaiMoc;
  viec_truoc_id: string | null;
  ten: string;
  so_ngay: number;
  goc: string | null;
  da_tinh: string | null;
  ten_viec_truoc: string | null;
  tt_truoc: string | null;
  ngay_xong: string | null;
};

function sangUi(r: HangPt): PhuThuocUi {
  const xong = !!r.viec_truoc_id && (r.tt_truoc === "hoan_thanh" || r.tt_truoc === "da_dong") && !!r.ngay_xong;
  return {
    loai: r.loai,
    viec_truoc_id: r.viec_truoc_id,
    ten: r.ten,
    ten_viec_truoc: r.ten_viec_truoc,
    xong,
    ngay_xong: xong ? r.ngay_xong : null,
    so_ngay: Number(r.so_ngay ?? 0),
    goc: r.goc,
    da_tinh: r.da_tinh,
  };
}

/** Phụ thuộc của nhiều việc (để dựng sổ cái / chi tiết). */
export async function docPhuThuoc(q: Q, ids: string[]): Promise<Map<string, PhuThuocUi[]>> {
  const m = new Map<string, PhuThuocUi[]>();
  if (!ids.length) return m;
  const { rows } = await q.query<HangPt>(`${SQL_PT} WHERE p.cong_viec_id = ANY($1::text[]) ORDER BY p.loai, p.luc`, [ids]);
  for (const r of rows) m.set(r.cong_viec_id, [...(m.get(r.cong_viec_id) ?? []), sangUi(r)]);
  return m;
}

/** Ngày tính được của một loại: mọi việc mốc đã xong → ngày xong muộn nhất + số ngày; chưa đủ → null. */
export function ngayTheoMoc(ds: PhuThuocUi[]): string | null {
  if (!ds.length || ds.some((p) => !p.xong || !p.ngay_xong)) return null;
  return ds.map((p) => congNgay(p.ngay_xong as string, p.so_ngay)).sort().reverse()[0];
}

/** Tính lại ngày của một việc đang mở theo việc mốc. Chỉ ghi + báo khi ngày thay đổi. */
export async function tinhLaiNgay(q: Q, cvId: string, nguoi: string): Promise<void> {
  const { rows: cvR } = await q.query<{ ten: string; giao_boi: string | null; bat_dau: string | null; ket_thuc: string | null }>(
    "SELECT ten, giao_boi, bat_dau::text AS bat_dau, ket_thuc::text AS ket_thuc FROM docflow.cong_viec WHERE id = $1 AND trang_thai = 'dang_mo'",
    [cvId],
  );
  const cv = cvR[0];
  if (!cv) return;
  const ds = (await docPhuThuoc(q, [cvId])).get(cvId) ?? [];
  for (const loai of ["bat_dau", "ket_thuc"] as const) {
    const cua = ds.filter((p) => p.loai === loai);
    const ngay = ngayTheoMoc(cua);
    if (!ngay || cua.every((p) => p.da_tinh === ngay)) continue;
    if (loai === "bat_dau") {
      await q.query("UPDATE docflow.cong_viec SET bat_dau = $2 WHERE id = $1", [cvId, ngay]);
      await q.query("UPDATE docflow.phan_viec SET bat_dau = $2 WHERE cong_viec_id = $1 AND trang_thai = 'dang_lam' AND NOT da_bo", [cvId, ngay]);
    } else {
      await q.query("UPDATE docflow.cong_viec SET ket_thuc = $2, luon_mo = false WHERE id = $1", [cvId, ngay]);
      await q.query(
        "UPDATE docflow.phan_viec SET ket_thuc = $2, luon_mo = false WHERE cong_viec_id = $1 AND trang_thai = 'dang_lam' AND NOT da_bo",
        [cvId, ngay],
      );
    }
    await q.query("UPDATE docflow.phu_thuoc_viec SET da_tinh = $3 WHERE cong_viec_id = $1 AND loai = $2", [cvId, loai, ngay]);
    const theo = cua.map((p) => p.viec_truoc_id).filter(Boolean) as string[];
    await ghiLichSu(q, {
      nguoi,
      doi_tuong_loai: "cong_viec",
      doi_tuong_id: cvId,
      hanh_dong: "tu_tinh_ngay",
      chi_tiet: { loai, ngay, cu: loai === "bat_dau" ? cv.bat_dau : cv.ket_thuc, theo, so_ngay: cua[0]?.so_ngay ?? 0, goc: cua[0]?.goc ?? null },
    });
    const noiDung =
      loai === "bat_dau"
        ? `Việc ${cvId} · ${cv.ten}: việc trước (${theo.join(", ")}) đã xong — bắt đầu từ ${ngayNgan(ngay, true)}`
        : `Việc ${cvId} · ${cv.ten}: mốc (${theo.join(", ")}) đã xong — hạn ${ngayNgan(ngay, true)}`;
    const tb = { loai: "tu_tinh_ngay", noi_dung: noiDung, lien_ket: `/cong-viec/${cvId}` };
    const { rows: pv } = await q.query<{ phu_trach_loai: string; phu_trach_id: string }>(
      "SELECT DISTINCT phu_trach_loai, phu_trach_id FROM docflow.phan_viec WHERE cong_viec_id = $1 AND trang_thai = 'dang_lam' AND NOT da_bo",
      [cvId],
    );
    // Gom người nhận rồi mới gửi — một người vừa là người giao vừa là trưởng đơn vị làm từng nhận 2 tin giống hệt (test 02/10).
    // Phần của cả đơn vị: chỉ đầu đơn vị (chốt K2 02/10)
    const nhan = new Set<string>();
    for (const p of pv) {
      if (p.phu_trach_loai === "nguoi") nhan.add(p.phu_trach_id);
      else for (const id of await dauDonVi(q, p.phu_trach_id)) nhan.add(id);
    }
    if (cv.giao_boi) nhan.add(cv.giao_boi);
    for (const id of nhan) await taoThongBao(q, { ...tb, nguoi_nhan: id });
  }
}

/** Một việc vừa rời sổ cái (hoàn thành / đóng): tính lại ngày cho mọi việc đang chờ nó. */
export async function capNhatViecSau(q: Q, cvTruocId: string, nguoi: string): Promise<void> {
  const { rows } = await q.query<{ cong_viec_id: string }>(
    "SELECT DISTINCT cong_viec_id FROM docflow.phu_thuoc_viec WHERE viec_truoc_id = $1",
    [cvTruocId],
  );
  for (const r of rows) await tinhLaiNgay(q, r.cong_viec_id, nguoi);
}


