// Cây đơn vị có cấp: đọc, dựng cây, thêm, sửa, ngừng (CHỈ SERVER, trừ dungCay/taoVong thuần).
import type { Q } from "@/lib/db";
import type { DonVi } from "@/lib/types";
import { ghi, khacNhau, LoiIdentity, type NguCanh } from "./moi-truong";
import { taoMaTuTen } from "./chu";

export async function layCayDonVi(q: Q, caNgungHoatDong = false): Promise<DonVi[]> {
  const { rows } = await q.query<DonVi>(
    `SELECT id, ten, ten_ngan, cap, cha_id, loai, mau_ma, thu_tu, active FROM identity.don_vi
     ${caNgungHoatDong ? "" : "WHERE active"} ORDER BY thu_tu, ten`,
  );
  return rows;
}

export async function layDonVi(q: Q, id: string): Promise<DonVi | null> {
  const { rows } = await q.query<DonVi>(
    "SELECT id, ten, ten_ngan, cap, cha_id, loai, mau_ma, thu_tu, active FROM identity.don_vi WHERE id = $1",
    [id],
  );
  return rows[0] ?? null;
}

// ---------------- Cây đơn vị: dựng cây, thêm, sửa, ngừng ----------------

export const LOAI_DON_VI: Record<DonVi["loai"], string> = {
  ban_tgd: "Ban Tổng giám đốc",
  chuc_danh: "Chức danh lãnh đạo (hiện tên người)",
  phong: "Phòng",
  don_vi: "Đơn vị",
  rieng: "Đơn vị riêng",
  ca_nhan: "Nhóm cá nhân",
  ben_ngoai: "Bên ngoài",
};

export interface NutDonVi extends DonVi {
  con: NutDonVi[];
}

/** Danh sách phẳng → cây (gốc là đơn vị không có cha hoặc cha không nằm trong danh sách). */
export function dungCay(ds: DonVi[]): NutDonVi[] {
  const nut = new Map<string, NutDonVi>(ds.map((d) => [d.id, { ...d, con: [] }]));
  const goc: NutDonVi[] = [];
  for (const n of Array.from(nut.values())) {
    const cha = n.cha_id ? nut.get(n.cha_id) : undefined;
    if (cha) cha.con.push(n);
    else goc.push(n);
  }
  const xep = (a: NutDonVi[]) => {
    a.sort((x, y) => x.thu_tu - y.thu_tu || x.ten.localeCompare(y.ten, "vi"));
    a.forEach((n) => xep(n.con));
  };
  xep(goc);
  return goc;
}

/** Đặt `chaMoi` làm cha của `id` có tạo vòng không. */
export function taoVong(ds: Pick<DonVi, "id" | "cha_id">[], id: string, chaMoi: string | null): boolean {
  let hien = chaMoi;
  const daQua = new Set<string>();
  while (hien) {
    if (hien === id) return true;
    if (daQua.has(hien)) return true;
    daQua.add(hien);
    hien = ds.find((d) => d.id === hien)?.cha_id ?? null;
  }
  return false;
}

export interface DauVaoDonVi {
  id?: string;
  ten: string;
  ten_ngan?: string;
  cap: number;
  cha_id?: string | null;
  loai?: DonVi["loai"];
  mau_ma?: string | null;
  thu_tu?: number;
}

function kiemDonVi(v: Partial<DauVaoDonVi>): void {
  if (v.ten !== undefined && !v.ten.trim()) throw new LoiIdentity(400, "Tên đơn vị không được trống");
  if (v.cap !== undefined && (!Number.isInteger(v.cap) || v.cap < 0 || v.cap > 99))
    throw new LoiIdentity(400, "Cấp đơn vị phải là số nguyên từ 0 đến 99");
  if (v.loai !== undefined && !(v.loai in LOAI_DON_VI)) throw new LoiIdentity(400, `Loại đơn vị không hợp lệ: ${v.loai}`);
  if (v.thu_tu !== undefined && !Number.isFinite(v.thu_tu)) throw new LoiIdentity(400, "Thứ tự phải là số");
}

export async function themDonVi(q: Q, ng: NguCanh, v: DauVaoDonVi): Promise<DonVi> {
  kiemDonVi(v);
  if (v.cap === undefined || v.cap === null) throw new LoiIdentity(400, "Đơn vị phải có cấp");
  const tatCa = await layCayDonVi(q, true);
  let id = (v.id ?? "").trim() || taoMaTuTen(v.ten_ngan || v.ten);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new LoiIdentity(400, "Mã đơn vị chỉ gồm chữ thường không dấu, số và dấu gạch ngang");
  if (v.id && tatCa.some((d) => d.id === id)) throw new LoiIdentity(409, `Mã đơn vị ${id} đã có`);
  if (!v.id) {
    const goc = id || "don-vi";
    let i = 2;
    id = goc;
    while (tatCa.some((d) => d.id === id)) id = `${goc}-${i++}`;
  }
  const cha = v.cha_id ? tatCa.find((d) => d.id === v.cha_id) : null;
  if (v.cha_id && !cha) throw new LoiIdentity(400, `Không có đơn vị cha ${v.cha_id}`);
  const thuTu = v.thu_tu ?? Math.max(0, ...tatCa.map((d) => d.thu_tu)) + 1;
  const { rows } = await q.query<DonVi>(
    `INSERT INTO identity.don_vi (id, ten, ten_ngan, cap, cha_id, loai, mau_ma, thu_tu)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id, ten, ten_ngan, cap, cha_id, loai, mau_ma, thu_tu, active`,
    [id, v.ten.trim(), (v.ten_ngan || v.ten).trim(), v.cap, v.cha_id ?? null, v.loai ?? "don_vi", v.mau_ma || null, thuTu],
  );
  await ghi(q, ng, { loai: "don_vi", id, thao_tac: "them", chi_tiet: { sau: rows[0] } });
  return rows[0];
}

export async function suaDonVi(
  q: Q,
  ng: NguCanh,
  id: string,
  v: Partial<Omit<DauVaoDonVi, "id">> & { active?: boolean },
): Promise<DonVi> {
  kiemDonVi(v);
  const cu = await layDonVi(q, id);
  if (!cu) throw new LoiIdentity(404, `Không có đơn vị ${id}`);
  const tatCa = await layCayDonVi(q, true);
  if (v.cha_id !== undefined && v.cha_id !== cu.cha_id) {
    if (v.cha_id && !tatCa.some((d) => d.id === v.cha_id)) throw new LoiIdentity(400, `Không có đơn vị cha ${v.cha_id}`);
    if (taoVong(tatCa, id, v.cha_id)) throw new LoiIdentity(400, "Không đặt được: đơn vị cha nằm trong chính cây con của đơn vị này (vòng tròn)");
  }
  if (v.active === false && cu.active) await kiemNgung(q, id, tatCa);
  const moi: DonVi = {
    ...cu,
    ten: v.ten?.trim() ?? cu.ten,
    ten_ngan: v.ten_ngan?.trim() || cu.ten_ngan,
    cap: v.cap ?? cu.cap,
    cha_id: v.cha_id !== undefined ? v.cha_id : cu.cha_id,
    loai: v.loai ?? cu.loai,
    mau_ma: v.mau_ma !== undefined ? v.mau_ma || null : cu.mau_ma,
    thu_tu: v.thu_tu ?? cu.thu_tu,
    active: v.active ?? cu.active,
  };
  await q.query(
    `UPDATE identity.don_vi SET ten=$2, ten_ngan=$3, cap=$4, cha_id=$5, loai=$6, mau_ma=$7, thu_tu=$8, active=$9 WHERE id=$1`,
    [id, moi.ten, moi.ten_ngan, moi.cap, moi.cha_id, moi.loai, moi.mau_ma, moi.thu_tu, moi.active],
  );
  const d = khacNhau(cu as unknown as Record<string, unknown>, moi as unknown as Record<string, unknown>);
  if (Object.keys(d.sau).length > 0) {
    const thaoTac = v.active === false && cu.active ? "ngung" : v.active === true && !cu.active ? "mo_lai" : "sua";
    await ghi(q, ng, { loai: "don_vi", id, thao_tac: thaoTac, chi_tiet: d });
  }
  return moi;
}

async function kiemNgung(q: Q, id: string, tatCa: DonVi[]): Promise<void> {
  const con = tatCa.filter((d) => d.cha_id === id && d.active);
  if (con.length > 0) throw new LoiIdentity(409, `Còn ${con.length} đơn vị con đang hoạt động (${con.map((c) => c.ten_ngan).join(", ")}) — ngừng hoặc chuyển chúng trước`);
  const { rows } = await q.query<{ n: number }>(
    "SELECT count(*)::int AS n FROM identity.nguoi_dung WHERE active AND don_vi_id = $1",
    [id],
  );
  if (rows[0].n > 0) throw new LoiIdentity(409, `Còn ${rows[0].n} người dùng thuộc đơn vị này — chuyển họ sang đơn vị khác trước`);
}

/** Ngừng hoạt động (không xóa: lịch sử và thư mục cũ vẫn trỏ tới đơn vị). */
export async function ngungDonVi(q: Q, ng: NguCanh, id: string): Promise<DonVi> {
  return suaDonVi(q, ng, id, { active: false });
}
