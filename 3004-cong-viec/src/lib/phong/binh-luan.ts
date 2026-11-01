// ============================================================
// phong/binh-luan.ts — BÌNH LUẬN VIỆC + gõ @ (Đợt 2, 28/09/2026). CHỈ SERVER.
// Luật người nhận (demo PA2, Mr. Đại chốt 27/09): người làm + người giao + người đã bình luận + người được @, trừ người viết.
//   · người làm = phần việc đang làm: giao cho người → người đó; giao cho đơn vị → trưởng đơn vị / lãnh đạo của đơn vị,
//     đơn vị chưa có ai giữ vai trò đó thì mọi người của đơn vị
//   · người giao = cong_viec.giao_boi (nếu là một tài khoản)
// MÁY tính hết — không LLM.
// ============================================================
import type { Q } from "@/lib/db";
import { coQuyen } from "@sci/identity";
import { layCayDonVi } from "@sci/identity/don-vi";
import { LoiHttp } from "@/lib/phien";
import { SQL_CHUC_DANH_CON, taoThongBao } from "@/lib/thong-bao";
import type { NguoiDungPhien } from "@/lib/types";
import type { TepDinhKem } from "@/lib/dinh-kem/chung";
import { dinhKemCuaViec, ganDinhKem } from "@/lib/dinh-kem/kho";
import { dauTheoVaiSql } from "@/lib/truong-tai";

export type LyDoNhan = "người làm" | "phối hợp" | "người giao" | "người phân công" | "đã bình luận" | "được @";

export interface BinhLuan {
  id: number;
  nguoi: string;
  ten: string;
  noi_dung: string;
  nhac: { id: string; ten: string }[];
  luc: string;
  /** File kẹp ở bình luận (Mr. Đại chốt 29/09) */
  tep: TepDinhKem[];
}

export interface NguoiGoiY {
  id: string;
  ten: string;
  chuc_vu: string | null;
  don_vi: string | null;
  /** người giao / người làm / phối hợp / đã bình luận — xếp lên đầu danh sách @ */
  trong_viec?: boolean;
}

const DAI_TOI_DA = 4000;

export async function danhSachNguoiGoiY(q: Q): Promise<NguoiGoiY[]> {
  return (
    await q.query<NguoiGoiY>(
      `SELECT n.id, n.ten, n.chuc_vu, d.ten_ngan AS don_vi FROM identity.nguoi_dung n
         LEFT JOIN identity.don_vi d ON d.id = n.don_vi_id WHERE n.active ORDER BY n.ten`,
    )
  ).rows;
}

export async function danhSachBinhLuan(q: Q, cvId: string): Promise<BinhLuan[]> {
  const { rows } = await q.query<{ id: string; nguoi: string; ten: string | null; noi_dung: string; nhac: string[]; luc: string }>(
    `SELECT b.id, b.nguoi, n.ten, b.noi_dung, b.nhac, to_char(b.luc AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS luc
       FROM docflow.binh_luan b LEFT JOIN identity.nguoi_dung n ON n.id = b.nguoi
      WHERE b.cong_viec_id = $1 ORDER BY b.id`,
    [cvId],
  );
  const ids = [...new Set(rows.flatMap((r) => r.nhac ?? []))];
  const ten = ids.length
    ? Object.fromEntries((await q.query<{ id: string; ten: string }>("SELECT id, ten FROM identity.nguoi_dung WHERE id = ANY($1::text[])", [ids])).rows.map((r) => [r.id, r.ten]))
    : {};
  const tep = (await dinhKemCuaViec(q, cvId)).filter((t) => t.noi === "binh_luan");
  return rows.map((r) => ({
    id: Number(r.id),
    nguoi: r.nguoi,
    ten: r.ten ?? r.nguoi,
    noi_dung: r.noi_dung,
    nhac: (r.nhac ?? []).map((id) => ({ id, ten: ten[id] ?? id })),
    luc: r.luc,
    tep: tep.filter((t) => t.binh_luan_id === Number(r.id)),
  }));
}

/**
 * NGƯỜI LIÊN QUAN một việc (Mr. Đại chốt 29/09): người giao · người được giao đích danh · MỌI người thuộc đơn vị chủ trì /
 * phối hợp CHƯA báo xong (kể cả kiêm nhiệm; Ban TGĐ gồm lãnh đạo chức danh) · người đã bình luận · người đã được @ ở việc này.
 * Dùng cho: danh sách gõ "@" (luôn mở cho mọi người) và "sàn" quyền bình luận.
 */
export async function nguoiLienQuan(q: Q, cvId: string): Promise<Set<string>> {
  const s = new Set<string>();
  const cv = (await q.query<{ giao_boi: string | null }>("SELECT giao_boi FROM docflow.cong_viec WHERE id = $1", [cvId])).rows[0];
  if (!cv) throw new LoiHttp(404, `Không có công việc ${cvId}`);
  if (cv.giao_boi) s.add(cv.giao_boi);
  // Người phân công (trưởng đơn vị) cũng là người liên quan → có trong danh sách "@" (test đêm 01/10 C-2: nhân viên gõ @ không thấy trưởng)
  const pc = await q.query<{ nguoi: string }>(
    "SELECT DISTINCT nguoi FROM docflow.lich_su WHERE doi_tuong_loai = 'cong_viec' AND doi_tuong_id = $1 AND hanh_dong = 'phan_cong'",
    [cvId],
  );
  pc.rows.forEach((r) => s.add(r.nguoi));
  const pv = (
    await q.query<{ phu_trach_loai: string; phu_trach_id: string }>(
      "SELECT phu_trach_loai, phu_trach_id FROM docflow.phan_viec WHERE cong_viec_id = $1 AND trang_thai = 'dang_lam' AND NOT da_bo",
      [cvId],
    )
  ).rows;
  for (const p of pv) {
    if (p.phu_trach_loai === "nguoi") {
      s.add(p.phu_trach_id);
      continue;
    }
    const { rows } = await q.query<{ id: string }>(
      `SELECT n.id FROM identity.nguoi_dung n
        WHERE n.active AND (n.don_vi_id = $1 OR n.id IN (SELECT nguoi_dung_id FROM identity.kiem_nhiem WHERE don_vi_id = $1)
           OR n.don_vi_id IN (${SQL_CHUC_DANH_CON}))`,
      [p.phu_trach_id],
    );
    rows.forEach((r) => s.add(r.id));
  }
  const bl = (await q.query<{ nguoi: string; nhac: string[] }>("SELECT nguoi, nhac FROM docflow.binh_luan WHERE cong_viec_id = $1", [cvId])).rows;
  for (const b of bl) {
    s.add(b.nguoi);
    (b.nhac ?? []).forEach((id) => s.add(id));
  }
  return s;
}

/**
 * Được viết bình luận ở việc này không (Mr. Đại chốt 29/09): người liên quan (kể cả đã được @) LUÔN được;
 * ngoài ra theo phạm vi quyền "Giao việc" — việc có đơn vị (giao / chủ trì / phối hợp) nằm trong phạm vi đó.
 * Không được → giao diện ẩn ô viết + nút 📎, chỉ đọc.
 */
export async function coTheBinhLuan(q: Q, nd: NguoiDungPhien, cvId: string): Promise<boolean> {
  if (nd.la_quan_tri) return true;
  if ((await nguoiLienQuan(q, cvId)).has(nd.id)) return true;
  const pv = nd.quyen["cong_viec.giao"];
  if (!pv || pv === "cua_minh") return false;
  if (pv === "toan_bo") return true;
  const { rows } = await q.query<{ dv: string }>(
    `SELECT don_vi_giao AS dv FROM docflow.cong_viec WHERE id = $1 AND don_vi_giao IS NOT NULL
     UNION SELECT phu_trach_id FROM docflow.phan_viec WHERE cong_viec_id = $1 AND NOT da_bo AND phu_trach_loai = 'don_vi'
     UNION SELECT n.don_vi_id FROM docflow.phan_viec p JOIN identity.nguoi_dung n ON n.id = p.phu_trach_id
      WHERE p.cong_viec_id = $1 AND NOT p.da_bo AND p.phu_trach_loai = 'nguoi' AND n.don_vi_id IS NOT NULL`,
    [cvId],
  );
  const cay = await layCayDonVi(q, true);
  return rows.some((r) => coQuyen(nd, "cong_viec.giao", { don_vi_id: r.dv }, cay));
}

/**
 * Danh sách tag (Mr. Đại chốt 29/09) — chỉ NGƯỜI:
 *  · gõ "@"  (moRong = false): chỉ người liên quan việc — mọi người đều có, không theo quyền
 *  · gõ "@@" (moRong = true) : mở rộng theo quyền "Tag tên" (cong_viec.tag_ten): Của mình = người liên quan ·
 *    Đơn vị / Mình + cấp dưới = + người thuộc các đơn vị đó · Toàn bộ = cả công ty · không có quyền = không mở rộng ([]).
 * Xếp: người liên quan → cùng đơn vị → còn lại (mỗi nhóm theo vần).
 */
export async function nguoiTagDuoc(q: Q, nd: NguoiDungPhien, cvId: string, moRong = false): Promise<NguoiGoiY[]> {
  const pv = nd.la_quan_tri ? "toan_bo" : nd.quyen["cong_viec.tag_ten"];
  if (moRong && !pv) return [];
  const lienQuan = await nguoiLienQuan(q, cvId);
  const { rows } = await q.query<NguoiGoiY & { dv: string[] }>(
    `SELECT n.id, n.ten, n.chuc_vu, d.ten_ngan AS don_vi,
            array_remove(array_cat(ARRAY[n.don_vi_id], ARRAY(SELECT k.don_vi_id FROM identity.kiem_nhiem k WHERE k.nguoi_dung_id = n.id)), NULL) AS dv
       FROM identity.nguoi_dung n LEFT JOIN identity.don_vi d ON d.id = n.don_vi_id
      WHERE n.active AND n.id <> $1 ORDER BY n.ten`,
    [nd.id],
  );
  const cay = moRong && (pv === "don_vi" || pv === "don_vi_va_cap_duoi") ? await layCayDonVi(q, true) : [];
  const duoc = (x: NguoiGoiY & { dv: string[] }) =>
    lienQuan.has(x.id) ||
    (moRong && (pv === "toan_bo" || (pv !== "cua_minh" && x.dv.some((d) => coQuyen(nd, "cong_viec.tag_ten", { don_vi_id: d }, cay)))));
  const cungDv = (x: NguoiGoiY & { dv: string[] }) => x.dv.some((d) => nd.don_vi_ids.includes(d));
  const hang = (x: NguoiGoiY & { dv: string[] }) => (lienQuan.has(x.id) ? 0 : cungDv(x) ? 1 : 2);
  return rows
    .filter(duoc)
    .sort((a, b) => hang(a) - hang(b))
    .map(({ dv: _dv, ...x }) => ({ ...x, ...(lienQuan.has(x.id) ? { trong_viec: true } : {}) }));
}

/** Người nhận tin khi `tacGia` bình luận (chưa tính người được @) — id → lý do. */
export async function nguoiNhanCoBan(q: Q, cvId: string, tacGia: string): Promise<Map<string, LyDoNhan[]>> {
  const m = new Map<string, LyDoNhan[]>();
  const them = (id: string | null | undefined, ly: LyDoNhan) => {
    if (!id || id === tacGia) return;
    const ds = m.get(id) ?? [];
    if (!ds.includes(ly)) ds.push(ly);
    m.set(id, ds);
  };
  const cv = (await q.query<{ giao_boi: string | null }>("SELECT giao_boi FROM docflow.cong_viec WHERE id = $1", [cvId])).rows[0];
  if (!cv) throw new LoiHttp(404, `Không có công việc ${cvId}`);
  const pv = (
    await q.query<{ phu_trach_loai: string; phu_trach_id: string; vai: string | null }>(
      "SELECT phu_trach_loai, phu_trach_id, vai FROM docflow.phan_viec WHERE cong_viec_id = $1 AND trang_thai = 'dang_lam' AND NOT da_bo",
      [cvId],
    )
  ).rows;
  const coTk = async (id: string) => (await q.query("SELECT 1 FROM identity.nguoi_dung WHERE id = $1 AND active", [id])).rows.length > 0;
  for (const p of pv) {
    const ly: LyDoNhan = p.vai === "phoi_hop" ? "phối hợp" : "người làm";
    if (p.phu_trach_loai === "nguoi") {
      if (await coTk(p.phu_trach_id)) them(p.phu_trach_id, ly);
      continue;
    }
    const thanhVien = (
      await q.query<{ id: string; dau: boolean }>(
        // "đầu" đơn vị = trưởng / lãnh đạo + người được ủy quyền trưởng (db/70) — Mr. Đại chốt 28/09: tin tới CẢ hai
        `SELECT n.id, (${dauTheoVaiSql("$1")}
                  OR EXISTS (SELECT 1 FROM identity.don_vi d WHERE d.id = $1 AND d.uy_quyen_truong = n.id)) AS dau
           FROM identity.nguoi_dung n
          WHERE n.active AND (n.don_vi_id = $1 OR n.id IN (SELECT nguoi_dung_id FROM identity.kiem_nhiem WHERE don_vi_id = $1)
             OR n.don_vi_id IN (${SQL_CHUC_DANH_CON}))`,
        [p.phu_trach_id],
      )
    ).rows;
    const dau = thanhVien.filter((t) => t.dau);
    (dau.length ? dau : thanhVien).forEach((t) => them(t.id, ly));
  }
  if (cv.giao_boi && (await coTk(cv.giao_boi))) them(cv.giao_boi, "người giao");
  // Người đã phân công phần việc cho nhân viên (trưởng đơn vị) — phân công ghi đè phần việc từ đơn vị sang người, nên trưởng
  // rơi khỏi "người làm" (test đêm 01/10: nhân viên bình luận chỉ báo TGĐ, trưởng phòng vừa phân công không biết)
  for (const r of (
    await q.query<{ nguoi: string }>(
      "SELECT DISTINCT nguoi FROM docflow.lich_su WHERE doi_tuong_loai = 'cong_viec' AND doi_tuong_id = $1 AND hanh_dong = 'phan_cong'",
      [cvId],
    )
  ).rows)
    if (await coTk(r.nguoi)) them(r.nguoi, "người phân công");
  for (const r of (await q.query<{ nguoi: string }>("SELECT DISTINCT nguoi FROM docflow.binh_luan WHERE cong_viec_id = $1", [cvId])).rows) them(r.nguoi, "đã bình luận");
  return m;
}

const rut = (s: string, n: number) => (s.length <= n ? s : s.slice(0, Math.max(s.lastIndexOf(" ", n), n - 10)) + "…");

/** Viết một bình luận: lưu, báo chuông cho người nhận. Trả bình luận + ai đã được báo. */
export async function vietBinhLuan(
  q: Q,
  nd: NguoiDungPhien,
  cvId: string,
  v: { noi_dung?: string; nhac?: string[]; dinh_kem?: string[] },
  /** người đã nhận chuông khác cho cùng lần bấm (vd Nhắc kèm ý kiến) — không báo "bình luận" lần hai */
  khongBao?: Set<string>,
): Promise<{ binh_luan: BinhLuan[]; da_bao: { id: string; ten: string; ly: LyDoNhan[] }[] }> {
  const coTep = (v.dinh_kem ?? []).length > 0;
  const noiDung = (v.noi_dung ?? "").trim() || (coTep ? "(gửi file)" : "");
  if (!noiDung) throw new LoiHttp(400, "Chưa có nội dung bình luận");
  if (noiDung.length > DAI_TOI_DA) throw new LoiHttp(400, `Bình luận dài quá ${DAI_TOI_DA.toLocaleString("vi-VN")} ký tự`);
  const cv = (await q.query<{ ten: string }>("SELECT ten FROM docflow.cong_viec WHERE id = $1", [cvId])).rows[0];
  if (!cv) throw new LoiHttp(404, `Không có công việc ${cvId}`);
  if (!(await coTheBinhLuan(q, nd, cvId)))
    throw new LoiHttp(403, `Bạn chỉ xem được việc ${cvId}: bình luận dành cho người liên quan việc và người có quyền "Giao việc" tới đơn vị làm việc này`);
  // Người được @: phải là tài khoản đang hoạt động VÀ "@Tên" còn trong nội dung (xoá chữ @ đi thì không báo)
  const ungVien = [...new Set(v.nhac ?? [])];
  // Máy chủ kiểm lại phạm vi "Tag tên" (giao diện chỉ gợi ý người được phép — chặn trường hợp gọi thẳng API)
  if (ungVien.length) {
    const duoc = new Set((await nguoiTagDuoc(q, nd, cvId, true)).map((n) => n.id));
    (await nguoiLienQuan(q, cvId)).forEach((id) => duoc.add(id));
    const ngoai = ungVien.filter((id) => id !== nd.id && !duoc.has(id));
    if (ngoai.length) throw new LoiHttp(403, `Bạn không tag được ${ngoai.length} người ngoài phạm vi quyền "Tag tên" (Cài đặt → Vai trò và quyền)`);
  }
  const nhac = ungVien.length
    ? (await q.query<{ id: string; ten: string }>("SELECT id, ten FROM identity.nguoi_dung WHERE active AND id = ANY($1::text[])", [ungVien])).rows.filter((n) =>
        noiDung.includes("@" + n.ten),
      )
    : [];
  const nhan = await nguoiNhanCoBan(q, cvId, nd.id);
  for (const n of nhac) {
    if (n.id === nd.id) continue;
    const ds = nhan.get(n.id) ?? [];
    if (!ds.includes("được @")) ds.push("được @");
    nhan.set(n.id, ds);
  }
  const blId = Number(
    (
      await q.query<{ id: string }>("INSERT INTO docflow.binh_luan (cong_viec_id, nguoi, noi_dung, nhac) VALUES ($1,$2,$3,$4) RETURNING id", [
        cvId,
        nd.id,
        noiDung,
        JSON.stringify(nhac.map((n) => n.id)),
      ])
    ).rows[0].id,
  );
  const tep = await ganDinhKem(q, nd, v.dinh_kem, { cong_viec_id: cvId, noi: "binh_luan", binh_luan_id: blId });
  const ten = nhan.size
    ? Object.fromEntries((await q.query<{ id: string; ten: string }>("SELECT id, ten FROM identity.nguoi_dung WHERE id = ANY($1::text[])", [[...nhan.keys()]])).rows.map((r) => [r.id, r.ten]))
    : {};
  const da_bao: { id: string; ten: string; ly: LyDoNhan[] }[] = [];
  for (const [id, ly] of nhan) {
    if (khongBao?.has(id)) continue;
    // Luật 30: mã việc luôn kèm tên ngắn
    await taoThongBao(q, {
      nguoi_nhan: id,
      loai: ly.includes("được @") ? "duoc_nhac" : "binh_luan",
      noi_dung: `${nd.ten} bình luận ở ${cvId} ${rut(cv.ten, 60)}: “${rut(noiDung, 120)}”${tep.length ? ` · kèm ${tep.length} file` : ""} · bạn là ${ly.join(", ")}`,
      lien_ket: `/cong-viec/${encodeURIComponent(cvId)}`,
      tep,
    });
    da_bao.push({ id, ten: ten[id] ?? id, ly });
  }
  return { binh_luan: await danhSachBinhLuan(q, cvId), da_bao };
}
