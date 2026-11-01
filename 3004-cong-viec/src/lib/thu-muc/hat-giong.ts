// ============================================================
// thu-muc/hat-giong.ts — GIEO THƯ MỤC cho từng đơn vị (idempotent, gọi từ khoi-tao.ts).
// Mỗi đơn vị: một thư mục gốc (loai 'goc') + thư mục con theo cấu hình thu_muc.thu_muc_con_mac_dinh.
// ============================================================
import type { Q } from "@/lib/db";
import { taoMa } from "@/lib/ma";
import { layCauHinh } from "@/lib/cau-hinh/doc";

const LOAI_DAC_BIET = new Set(["goc", "den", "di", "du_an", "thung_rac"]);

async function timHoacTao(
  q: Q,
  v: { don_vi_id: string; cha_id: string | null; ten: string; loai: string },
): Promise<string> {
  const tim = async () => {
    const { rows } = LOAI_DAC_BIET.has(v.loai)
      ? await q.query<{ id: string }>("SELECT id FROM docflow.thu_muc WHERE don_vi_id = $1 AND loai = $2 LIMIT 1", [v.don_vi_id, v.loai])
      : await q.query<{ id: string }>(
          "SELECT id FROM docflow.thu_muc WHERE don_vi_id = $1 AND cha_id IS NOT DISTINCT FROM $2 AND loai = $3 AND ten = $4 LIMIT 1",
          [v.don_vi_id, v.cha_id, v.loai, v.ten],
        );
    return rows[0]?.id ?? null;
  };
  const co = await tim();
  if (co) return co;
  const { rows } = await q.query<{ id: string }>(
    `INSERT INTO docflow.thu_muc (id, don_vi_id, cha_id, ten, loai) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT DO NOTHING RETURNING id`,
    [taoMa("tm"), v.don_vi_id, v.cha_id, v.ten, v.loai],
  );
  if (rows[0]) return rows[0].id;
  const lai = await tim();
  if (!lai) throw new Error("Không tạo được thư mục " + v.ten);
  return lai;
}

/** Bảo đảm đơn vị có đủ thư mục gốc + thư mục con mặc định. Trả về id theo loại (loại 'khac' lấy cái đầu). */
export async function damBaoThuMucDonVi(q: Q, donViId: string): Promise<Record<string, string>> {
  const { rows } = await q.query<{ ten: string }>("SELECT ten FROM identity.don_vi WHERE id = $1", [donViId]);
  if (!rows[0]) throw new Error("Không có đơn vị " + donViId);
  const cfg = await layCauHinh(q, "thu_muc");
  const goc = await timHoacTao(q, { don_vi_id: donViId, cha_id: null, ten: rows[0].ten, loai: "goc" });
  const kq: Record<string, string> = { goc };
  for (const c of cfg.thu_muc_con_mac_dinh ?? []) {
    const id = await timHoacTao(q, { don_vi_id: donViId, cha_id: goc, ten: c.ten, loai: c.loai });
    if (!kq[c.loai]) kq[c.loai] = id;
  }
  return kq;
}

export async function hatGiong(q: Q): Promise<void> {
  const { rows } = await q.query<{ id: string }>("SELECT id FROM identity.don_vi WHERE active ORDER BY thu_tu, id");
  for (const d of rows) await damBaoThuMucDonVi(q, d.id);
}
