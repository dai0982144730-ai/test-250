// ============================================================
// bao-cao-tuan/do-kho.ts — 🤖 AI CHẤM ĐỘ KHÓ TỪNG VIỆC (Mr. Đại chốt 30/09/2026, menu Báo cáo tuần).
// Vai ① của LLM: đọc tiếng người → phân loại, KÈM LÝ DO. Thang 1·2·4·8·13 (một việc rất khó nặng hơn 10 việc rất dễ).
// Code giữ cửa: chỉ nhận đúng 5 mức; người (Ban lãnh đạo) sửa thì thắng, AI không chấm lại.
// Chạy nền mỗi 2 phút, mỗi lượt tối đa 25 việc chưa có điểm (việc đang mở + việc xong trong 60 ngày). AI lỗi → nghỉ 30 phút.
// CHỈ SERVER.
// ============================================================
import type { Q } from "@/lib/db";
import { LoiHttp } from "@/lib/phien";
import type { NguoiDungPhien } from "@/lib/types";

export const MUC_DO_KHO = [1, 2, 4, 8, 13] as const;
export type DiemDoKho = (typeof MUC_DO_KHO)[number];
export interface DoKhoViec {
  diem: DiemDoKho;
  ly_do: string | null;
  nguon: "ai" | "nguoi";
  nguoi_sua: string | null;
}

const MOI_LUOT = 25;
const NGHI_KHI_LOI_MS = 30 * 60_000;

export async function docDoKho(q: Q): Promise<Record<string, DoKhoViec>> {
  const { rows } = await q.query<{ cong_viec_id: string } & DoKhoViec>("SELECT cong_viec_id, diem, ly_do, nguon, nguoi_sua FROM docflow.do_kho_viec");
  return Object.fromEntries(rows.map(({ cong_viec_id, ...d }) => [cong_viec_id, { ...d, diem: Number(d.diem) as DiemDoKho }]));
}

/** Người đang xem có thuộc Ban lãnh đạo không (Ban TGĐ hoặc một chức danh lãnh đạo, kể cả kiêm nhiệm). Độ khó chỉ BLĐ xem/sửa. */
export async function laBanLanhDao(q: Q, nd: NguoiDungPhien): Promise<boolean> {
  const ids = [...new Set([nd.don_vi_id, ...(nd.don_vi_ids ?? [])].filter((x): x is string => !!x))];
  const { rows } = await q.query(
    `SELECT 1 FROM identity.don_vi WHERE active AND loai IN ('ban_tgd','chuc_danh') AND (id = ANY($1::text[])
       OR id IN (SELECT don_vi_id FROM identity.kiem_nhiem WHERE nguoi_dung_id = $2)) LIMIT 1`,
    [ids, nd.id],
  );
  return rows.length > 0;
}

/** Ban lãnh đạo sửa điểm (một cú chọn). Người sửa thắng AI. */
export async function suaDoKho(q: Q, nd: NguoiDungPhien, cvId: string, diem: number): Promise<void> {
  if (!(await laBanLanhDao(q, nd))) throw new LoiHttp(403, "Chỉ Ban lãnh đạo được sửa độ khó của việc");
  if (!(MUC_DO_KHO as readonly number[]).includes(diem)) throw new LoiHttp(400, "Độ khó phải là 1, 2, 4, 8 hoặc 13");
  const co = await q.query("SELECT 1 FROM docflow.cong_viec WHERE id = $1", [cvId]);
  if (!co.rows.length) throw new LoiHttp(404, `Không có công việc ${cvId}`);
  await q.query(
    `INSERT INTO docflow.do_kho_viec (cong_viec_id, diem, ly_do, nguon, nguoi_sua) VALUES ($1,$2,NULL,'nguoi',$3)
     ON CONFLICT (cong_viec_id) DO UPDATE SET diem = EXCLUDED.diem, nguon = 'nguoi', nguoi_sua = EXCLUDED.nguoi_sua, luc = now()`,
    [cvId, diem, nd.id],
  );
}

export const HE_THONG_DO_KHO = `Bạn chấm ĐỘ KHÓ công việc của một công ty đầu tư, thiết kế, thi công và vận hành dự án điện gió, thủy điện, điện mặt trời.
Thang điểm (chỉ dùng đúng 5 mức): 1 = Rất dễ · 2 = Dễ · 4 = Vừa · 8 = Khó · 13 = Rất khó. Một việc 13 điểm nặng hơn 10 việc 1 điểm.
Chấm theo 3 tiêu chí, lấy tiêu chí nặng nhất:
- Phạm vi ảnh hưởng: nội bộ một phòng (1–2) · nhiều đơn vị / một hạng mục dự án (4) · cả dự án, đường găng (8) · cả công ty, nhiều dự án (13)
- Bên ngoài tham gia: không (1–2) · nhà thầu, đối tác (4–8) · cơ quan nhà nước cấp tỉnh, ngân hàng (8) · Bộ, Chính phủ, nước ngoài (13)
- Giá trị tiền, rủi ro: nhỏ (1–2) · vài trăm triệu tới vài tỷ (4) · chục tỷ (8) · trên 30 tỷ hoặc rủi ro pháp lý lớn (13)
Mốc tham khảo: đăng kiểm xe = 1 · tập huấn nội bộ = 2 · thanh toán vài hóa đơn nhà thầu = 4 · GPMB một đoạn tuyến = 8 · giải ngân EPC 38 tỷ qua ngân hàng = 13.
Việc có chữ "test"/"thử" = 1. Chỉ dựa vào tên việc, kết quả cần có, dự án, đơn vị. Không bịa. Trả lời DUY NHẤT một mảng JSON:
[{"ma":"<mã việc>","diem":<1|2|4|8|13>,"ly_do":"<một câu tiếng Việt, tối đa 15 chữ>"}]`;

/** Gọi AI chấm một lượt. `goiAi(prompt, system)` → text. Trả số việc đã chấm. */
export async function chamMotLuot(q: Q, goiAi: (prompt: string, system: string) => Promise<string>): Promise<number> {
  const { rows } = await q.query<{ id: string; ten: string; ket_qua_can_co: string | null; du_an: string | null; pt: string[] | null }>(
    `SELECT c.id, c.ten, c.ket_qua_can_co, c.du_an,
            (SELECT array_agg(p.phu_trach_id || ':' || COALESCE(p.vai, 'chu_tri')) FROM docflow.phan_viec p WHERE p.cong_viec_id = c.id AND NOT p.da_bo) AS pt
       FROM docflow.cong_viec c
      WHERE (c.trang_thai = 'dang_mo' OR (c.trang_thai = 'hoan_thanh' AND c.dong_luc > now() - interval '60 days'))
        AND NOT EXISTS (SELECT 1 FROM docflow.do_kho_viec d WHERE d.cong_viec_id = c.id)
      ORDER BY c.id LIMIT ${MOI_LUOT}`,
  );
  if (!rows.length) return 0;
  const dong = rows.map((r) => JSON.stringify({ ma: r.id, ten: r.ten, ket_qua_can_co: r.ket_qua_can_co ?? "", du_an: r.du_an ?? "", phu_trach: r.pt ?? [] })).join("\n");
  const text = await goiAi(`Chấm độ khó ${rows.length} việc sau (mỗi dòng một việc, JSON):\n${dong}`, HE_THONG_DO_KHO);
  const { layJson } = await import("@/lib/kiem-tra/gop-y-ai");
  const kq = layJson(text);
  if (!Array.isArray(kq)) throw new Error("AI không trả mảng JSON");
  const con = new Set(rows.map((r) => r.id));
  let n = 0;
  for (const x of kq as { ma?: string; diem?: number; ly_do?: string }[]) {
    // code giữ cửa: mã lạ / điểm ngoài 5 mức thì bỏ qua (lượt sau chấm lại)
    const d = Number(x?.diem);
    if (!x?.ma || !con.has(x.ma) || !(MUC_DO_KHO as readonly number[]).includes(d)) continue;
    await q.query(`INSERT INTO docflow.do_kho_viec (cong_viec_id, diem, ly_do, nguon) VALUES ($1,$2,$3,'ai') ON CONFLICT (cong_viec_id) DO NOTHING`, [
      x.ma,
      d,
      (x.ly_do ?? "").slice(0, 200) || null,
    ]);
    con.delete(x.ma);
    n++;
  }
  return n;
}

type TrangThaiNen = { dang: boolean; nghiDen: number; timer?: ReturnType<typeof setInterval> };
type G = typeof globalThis & { __chamDoKho?: TrangThaiNen };

/** Chạy nền một lượt (chống chạy chồng, nghỉ khi AI lỗi). */
export async function chamDoKhoNen(): Promise<number> {
  const g = globalThis as G;
  const st = (g.__chamDoKho ??= { dang: false, nghiDen: 0 });
  if (st.dang || Date.now() < st.nghiDen) return 0;
  st.dang = true;
  try {
    const { layQ } = await import("@/lib/db");
    const { layCauHinh } = await import("@/lib/cau-hinh/doc");
    const { runAIGan } = await import("@/lib/ai/providers");
    const q = await layQ();
    const ch = await layCauHinh(q, "bao_cao_tuan");
    if (!ch.bat) return 0;
    const model = ch.model_cham_do_kho || (await layCauHinh(q, "ai")).model_mac_dinh || undefined;
    const n = await chamMotLuot(q, (p, s) => runAIGan("lib/bao-cao-tuan/do-kho", p, s, undefined, model, 240_000, true));
    if (n) console.log(`[do-kho] 🤖 đã chấm độ khó ${n} việc`);
    return n;
  } catch (e) {
    st.nghiDen = Date.now() + NGHI_KHI_LOI_MS;
    console.error("[do-kho] AI chấm độ khó lỗi — nghỉ 30 phút:", e instanceof Error ? e.message : e);
    throw e;
  } finally {
    st.dang = false;
  }
}

/** Bật bộ chạy nền (gọi cùng bộ hẹn giờ sổ cái). */
export function batChamDoKhoNen(): void {
  const g = globalThis as G;
  const st = (g.__chamDoKho ??= { dang: false, nghiDen: 0 });
  if (st.timer) return;
  st.timer = setInterval(() => void chamDoKhoNen().catch(() => undefined), 120_000);
  if (typeof st.timer === "object" && "unref" in st.timer) st.timer.unref();
  const t0 = setTimeout(() => void chamDoKhoNen().catch(() => undefined), 70_000);
  if (typeof t0 === "object" && "unref" in t0) t0.unref();
}
