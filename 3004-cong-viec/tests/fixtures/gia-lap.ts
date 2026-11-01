// ============================================================
// tests/fixtures/gia-lap.ts — GIẢ LẬP hàm của module thu-muc và so-cai cho test của kiem-tra-gui.
// Dùng kiểu "bọc": gọi hàm thật trước; hàm thật còn ném "Chưa làm" thì mới dùng bản giả lập (SQL tối
// giản trên đúng bảng nền). Khi module kia xong, test tự chạy bằng hàm thật mà không phải sửa.
// `nhatKy` ghi mọi lần gọi (thật hay giả) để test kiểm tra; `thay` cho phép test ép kết quả một hàm.
// ============================================================
import type { Q } from "@/lib/db";
import type { DauVaoSoCai, DuDoanDong, KetQuaKiemTra, KyBaoCao } from "@/lib/types";
import { ghiTep, docTep } from "@/lib/luu-tru/kho";
import { ghiLichSu } from "@/lib/lich-su/ghi";
import { taoMa } from "@/lib/ma";

export const nhatKy: { ham: string; doi: unknown[]; gia_lap: boolean }[] = [];
export const thay: Record<string, ((...a: unknown[]) => unknown) | undefined> = {};
export const demGiaLap: Record<string, number> = {};

type Ham = (...a: never[]) => Promise<unknown>;

export function boc<T extends Record<string, unknown>>(that: T, giaLap: Record<string, Ham>): T {
  const kq: Record<string, unknown> = { ...that };
  for (const [k, f] of Object.entries(that)) {
    if (typeof f !== "function") continue;
    kq[k] = async (...a: unknown[]) => {
      const ep = thay[k];
      if (ep) {
        nhatKy.push({ ham: k, doi: a, gia_lap: true });
        return ep(...a);
      }
      try {
        const r = await (f as (...x: unknown[]) => Promise<unknown>)(...a);
        nhatKy.push({ ham: k, doi: a, gia_lap: false });
        return r;
      } catch (e) {
        if (e instanceof Error && e.message === "Chưa làm" && giaLap[k]) {
          demGiaLap[k] = (demGiaLap[k] ?? 0) + 1;
          nhatKy.push({ ham: k, doi: a, gia_lap: true });
          return (giaLap[k] as (...x: unknown[]) => Promise<unknown>)(...a);
        }
        throw e;
      }
    };
  }
  return kq as T;
}

export const goi = (ham: string) => nhatKy.filter((x) => x.ham === ham);

// ---------------- thu-muc (giả lập) ----------------

interface Tep {
  ten_tep: string;
  mime: string;
  noi_dung: Buffer;
}

async function thuMucCuaDonVi(q: Q, donViId: string, loai: string): Promise<string> {
  const co = await q.query<{ id: string }>("SELECT id FROM docflow.thu_muc WHERE don_vi_id = $1 AND loai = $2 ORDER BY tao_luc LIMIT 1", [donViId, loai]);
  if (co.rows[0]) return co.rows[0].id;
  let goc = (await q.query<{ id: string }>("SELECT id FROM docflow.thu_muc WHERE don_vi_id = $1 AND loai = 'goc' LIMIT 1", [donViId])).rows[0]?.id;
  if (!goc) {
    goc = `tm-${donViId}-goc`;
    await q.query("INSERT INTO docflow.thu_muc (id, don_vi_id, ten, loai) VALUES ($1,$2,$3,'goc') ON CONFLICT DO NOTHING", [goc, donViId, donViId]);
  }
  if (loai === "goc") return goc;
  const id = `tm-${donViId}-${loai}`;
  await q.query("INSERT INTO docflow.thu_muc (id, don_vi_id, cha_id, ten, loai) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING", [id, donViId, goc, loai, loai]);
  return id;
}

async function datVaoThuMuc(q: Q, v: { tai_lieu_id: string; thu_muc_id: string; vai: string; nguoi: string; nhan?: string | null }): Promise<string> {
  const co = await q.query<{ id: string }>("SELECT id FROM docflow.vi_tri WHERE tai_lieu_id = $1 AND thu_muc_id = $2 AND NOT da_xoa LIMIT 1", [v.tai_lieu_id, v.thu_muc_id]);
  if (co.rows[0]) return co.rows[0].id;
  const id = taoMa("vt");
  await q.query("INSERT INTO docflow.vi_tri (id, tai_lieu_id, thu_muc_id, vai, nhan, them_boi) VALUES ($1,$2,$3,$4,$5,$6)", [
    id,
    v.tai_lieu_id,
    v.thu_muc_id,
    v.vai,
    v.nhan ?? null,
    v.nguoi,
  ]);
  return id;
}

async function taoTaiLieu(
  q: Q,
  v: {
    ten: string;
    nguoi: string;
    don_vi_lap: string | null;
    thu_muc_id: string;
    tep: Tep;
    mau_ma?: string | null;
    ky_bao_cao?: KyBaoCao | null;
    ket_qua_kiem_tra?: KetQuaKiemTra | null;
    nguoi_gui_that?: string | null;
    lien_quan_den?: string | null;
  },
): Promise<{ tai_lieu_id: string; phien_ban: number }> {
  const id = taoMa("tl");
  const f = await ghiTep(v.tep.noi_dung);
  await q.query(
    `INSERT INTO docflow.tai_lieu (id, ten, mau_ma, don_vi_lap, nguoi_tao, nguoi_gui_that, ky_bao_cao, lien_quan_den)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [id, v.ten, v.mau_ma ?? null, v.don_vi_lap, v.nguoi, v.nguoi_gui_that ?? null, v.ky_bao_cao ? JSON.stringify(v.ky_bao_cao) : null, v.lien_quan_den ?? null],
  );
  await q.query(
    `INSERT INTO docflow.phien_ban_tep (tai_lieu_id, phien_ban, ten_tep, mime, kich_thuoc, sha256, khoa_luu, tai_len_boi, ket_qua_kiem_tra)
     VALUES ($1,1,$2,$3,$4,$5,$6,$7,$8)`,
    [id, v.tep.ten_tep, v.tep.mime, f.kich_thuoc, f.sha256, f.khoa, v.nguoi, v.ket_qua_kiem_tra ? JSON.stringify(v.ket_qua_kiem_tra) : null],
  );
  await datVaoThuMuc(q, { tai_lieu_id: id, thu_muc_id: v.thu_muc_id, vai: "goc", nguoi: v.nguoi });
  await ghiLichSu(q, { nguoi: v.nguoi, doi_tuong_loai: "tai_lieu", doi_tuong_id: id, hanh_dong: "tai_len", chi_tiet: { phien_ban: 1, sha256: f.sha256 } });
  return { tai_lieu_id: id, phien_ban: 1 };
}

async function themPhienBan(q: Q, taiLieuId: string, v: { nguoi: string; tep: Tep; ket_qua_kiem_tra?: KetQuaKiemTra | null; ky_bao_cao?: KyBaoCao | null }): Promise<number> {
  const f = await ghiTep(v.tep.noi_dung);
  const { rows } = await q.query<{ pb: number }>("SELECT COALESCE(max(phien_ban),0)::int + 1 AS pb FROM docflow.phien_ban_tep WHERE tai_lieu_id = $1", [taiLieuId]);
  const pb = Number(rows[0].pb);
  await q.query(
    `INSERT INTO docflow.phien_ban_tep (tai_lieu_id, phien_ban, ten_tep, mime, kich_thuoc, sha256, khoa_luu, tai_len_boi, ket_qua_kiem_tra)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [taiLieuId, pb, v.tep.ten_tep, v.tep.mime, f.kich_thuoc, f.sha256, f.khoa, v.nguoi, v.ket_qua_kiem_tra ? JSON.stringify(v.ket_qua_kiem_tra) : null],
  );
  await q.query("UPDATE docflow.tai_lieu SET phien_ban_hien_tai = $2, ky_bao_cao = COALESCE($3, ky_bao_cao) WHERE id = $1", [
    taiLieuId,
    pb,
    v.ky_bao_cao ? JSON.stringify(v.ky_bao_cao) : null,
  ]);
  await ghiLichSu(q, { nguoi: v.nguoi, doi_tuong_loai: "tai_lieu", doi_tuong_id: taiLieuId, hanh_dong: "tai_len", chi_tiet: { phien_ban: pb, sha256: f.sha256 } });
  return pb;
}

async function ganNhan(q: Q, v: { tai_lieu_id: string; thu_muc_id: string; nhan: string | null }): Promise<void> {
  await q.query("UPDATE docflow.vi_tri SET nhan = $3 WHERE tai_lieu_id = $1 AND thu_muc_id = $2 AND NOT da_xoa", [v.tai_lieu_id, v.thu_muc_id, v.nhan]);
}

async function docPhienBan(q: Q, taiLieuId: string, phienBan?: number) {
  const { rows } = await q.query<Record<string, unknown>>(
    `SELECT p.* FROM docflow.phien_ban_tep p JOIN docflow.tai_lieu t ON t.id = p.tai_lieu_id
     WHERE p.tai_lieu_id = $1 AND p.phien_ban = COALESCE($2, t.phien_ban_hien_tai)`,
    [taiLieuId, phienBan ?? null],
  );
  const r = rows[0];
  if (!r) throw new Error("Không có phiên bản");
  return {
    thong_tin: { ...r, phien_ban: Number(r.phien_ban), kich_thuoc: Number(r.kich_thuoc) } as never,
    noi_dung: await docTep(String(r.khoa_luu)),
  };
}

export const giaLapThuMuc: Record<string, Ham> = {
  thuMucCuaDonVi: thuMucCuaDonVi as Ham,
  taoTaiLieu: taoTaiLieu as Ham,
  themPhienBan: themPhienBan as Ham,
  datVaoThuMuc: datVaoThuMuc as Ham,
  ganNhan: ganNhan as Ham,
  docPhienBan: docPhienBan as Ham,
};

// ---------------- so-cai (giả lập) ----------------

function duDoan(dv: DauVaoSoCai): DuDoanDong[] {
  return dv.cong_viec.map((c, i) => (c.ma_viec ? { dong: i, hanh_dong: "de", cong_viec_id: c.ma_viec, ly_do: "cùng cấp, ngày sau" } : { dong: i, hanh_dong: "tao_moi" }));
}

export const giaLapSoCai: Record<string, Ham> = {
  xemTruocVaoSoCai: (async (_q: Q, dv: DauVaoSoCai) => duDoan(dv)) as Ham,
  ghiVaoSoCai: (async (_q: Q, dv: DauVaoSoCai) => duDoan(dv)) as Ham,
  danhDauChoSua: (async () => undefined) as Ham,
};

/** Tóm tắt để ghi vào báo cáo: hàm nào đã phải dùng bản giả lập. */
export function tomTatGiaLap(): string {
  const k = Object.entries(demGiaLap);
  return k.length ? k.map(([h, n]) => `${h}×${n}`).join(", ") : "không";
}
