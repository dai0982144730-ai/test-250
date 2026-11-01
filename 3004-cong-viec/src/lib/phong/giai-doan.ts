// ============================================================
// phong/giai-doan.ts — 🤖 XẾP VIỆC VÀO 5 GIAI ĐOẠN PMP (Đợt 3, Mr. Đại chốt 28/09: tự xếp khi việc vào sổ + người sửa).
// Vai ① của LLM: đọc tiếng người → phân loại, KÈM LÝ DO; code kiểm mã giai đoạn; người sửa thì thắng và AI không xếp lại.
// Chạy nền: mỗi 2 phút lấy tối đa 25 việc đang mở THUỘC DỰ ÁN chưa có giai đoạn, gọi AI một lượt. AI lỗi → nghỉ 30 phút rồi thử lại.
// CHỈ SERVER.
// ============================================================
import type { Q } from "@/lib/db";
import { LoiHttp } from "@/lib/phien";
import type { NguoiDungPhien } from "@/lib/types";
import { MA_GIAI_DOAN, type GiaiDoanViec } from "./giai-doan-thuan";
import { duAnCuaViec } from "./du-an-thuan";

const MOI_LUOT = 25;
const NGHI_KHI_LOI_MS = 30 * 60_000;

export async function docGiaiDoan(q: Q): Promise<Record<string, GiaiDoanViec>> {
  const { rows } = await q.query<{ cong_viec_id: string } & GiaiDoanViec>("SELECT cong_viec_id, giai_doan, ly_do, nguon, nguoi_sua FROM docflow.giai_doan_viec");
  return Object.fromEntries(rows.map(({ cong_viec_id, ...g }) => [cong_viec_id, g]));
}

/** Người sửa giai đoạn (một cú chọn). Ai xem được sổ cái đều sửa được; máy ghi người sửa. */
export async function suaGiaiDoan(q: Q, nd: NguoiDungPhien, cvId: string, gd: string): Promise<void> {
  if (!MA_GIAI_DOAN.has(gd)) throw new LoiHttp(400, "Giai đoạn không hợp lệ");
  const co = await q.query("SELECT 1 FROM docflow.cong_viec WHERE id = $1", [cvId]);
  if (!co.rows.length) throw new LoiHttp(404, `Không có công việc ${cvId}`);
  await q.query(
    `INSERT INTO docflow.giai_doan_viec (cong_viec_id, giai_doan, ly_do, nguon, nguoi_sua) VALUES ($1,$2,NULL,'nguoi',$3)
     ON CONFLICT (cong_viec_id) DO UPDATE SET giai_doan = EXCLUDED.giai_doan, ly_do = NULL, nguon = 'nguoi', nguoi_sua = EXCLUDED.nguoi_sua, luc = now()`,
    [cvId, gd, nd.id],
  );
}

export const HE_THONG_XEP = `Bạn phân loại công việc của một công ty đầu tư, thiết kế, thi công và vận hành dự án điện gió, thủy điện, điện mặt trời.
Xếp MỖI việc vào đúng 1 trong 6 nhóm quy trình quản lý dự án:
- khoi-tao: Khởi tạo — chủ trương đầu tư (xin, theo dõi xét duyệt chủ trương — kể cả phía Lào), khảo sát ban đầu, lập/duyệt báo cáo nghiên cứu khả thi (FS, mọi phần của FS), quyền phát triển, pháp lý mở dự án
- thiet-ke: Thiết kế — CHỈ việc thuộc chuyên môn thiết kế hoặc xuất bản một bộ hồ sơ thiết kế: thiết kế cơ sở (TKCS), thiết kế kỹ thuật (TKKT), bản vẽ thi công, bản vẽ tổng mặt bằng, thuyết minh thiết kế, phương án đấu nối, khảo sát phục vụ thiết kế, rà soát / thẩm định / phê duyệt hồ sơ thiết kế.
  Việc có "nguon" là "Tiến độ chi tiết công tác thiết kế" thường là thiết kế, NHƯNG chủ trương đầu tư và báo cáo FS vẫn xếp khoi-tao (Mr. Đại chốt 01/10).
- ke-hoach: Lập kế hoạch — dự toán, kế hoạch đấu thầu, kế hoạch tiến độ, hồ sơ xin phép (không phải hồ sơ thiết kế)
- thuc-thi: Thực thi — thi công, mua sắm, lắp đặt, GPMB, ký và thực hiện hợp đồng
- giam-sat: Giám sát & Kiểm soát — theo dõi tiến độ, thanh toán/giải ngân, nghiệm thu từng phần, vận hành, sự cố, bảo dưỡng, gia hạn giấy phép
- ket-thuc: Kết thúc — nghiệm thu hoàn thành, COD, quyết toán, bàn giao, đóng hồ sơ
Chỉ dựa vào tên việc, kết quả cần có, nguồn và ghi chú. Không bịa thông tin. Trả lời DUY NHẤT một mảng JSON:
[{"ma":"<mã việc>","giai_doan":"<một trong 6 mã>","ly_do":"<một câu tiếng Việt, tối đa 20 chữ>"}]`;

/** Gọi AI xếp một lượt việc. `goiAi(prompt, system)` → text. Trả số việc đã xếp. */
export async function xepMotLuot(q: Q, goiAi: (prompt: string, system: string) => Promise<string>): Promise<number> {
  // Chỉ xếp việc THUỘC DỰ ÁN (menu Dự án là nơi duy nhất dùng giai đoạn) — đo 28/09: 25/60 việc đang mở thuộc dự án,
  // xếp cả việc "Công ty", nhà máy… là tốn lượt AI vô ích. Danh mục dự án sửa ở Cài đặt → việc mới khớp sẽ được xếp lượt sau.
  const { layCauHinh } = await import("@/lib/cau-hinh/doc");
  const dsDuAn = await layCauHinh(q, "du_an");
  const { rows: tatCa } = await q.query<{ id: string; ten: string; ket_qua_can_co: string | null; du_an: string | null; pt: string[] | null; tu_tien_do_tk: boolean; ghi_chu: string | null }>(
    `SELECT c.id, c.ten, c.ket_qua_can_co, c.du_an,
            (SELECT array_agg(p.phu_trach_id) FROM docflow.phan_viec p WHERE p.cong_viec_id = c.id AND NOT p.da_bo) AS pt,
            -- việc từng vào sổ từ chương "Tiến độ chi tiết công tác thiết kế" (Form 5) → LLM xếp Thiết kế (Mr. Đại 01/10)
            EXISTS (SELECT 1 FROM docflow.nguon_cong_viec n WHERE n.cong_viec_id = c.id AND n.du_lieu->>'nguon_bang' = 'bang_tien_do_tk') AS tu_tien_do_tk,
            (SELECT n.du_lieu->'cot_khac'->>'ghi_chu' FROM docflow.nguon_cong_viec n WHERE n.cong_viec_id = c.id AND n.trang_thai = 'hien_hanh' LIMIT 1) AS ghi_chu
       FROM docflow.cong_viec c
      -- cả việc đã hoàn thành: menu Dự án hiện việc xong (nút Xong) theo nhóm giai đoạn (01/10)
      WHERE c.trang_thai IN ('dang_mo', 'hoan_thanh') AND NOT EXISTS (SELECT 1 FROM docflow.giai_doan_viec g WHERE g.cong_viec_id = c.id) ORDER BY c.id`,
  );
  const rows = tatCa.filter((r) => duAnCuaViec(r.du_an, r.pt ?? [], dsDuAn, r.ten)).slice(0, MOI_LUOT);
  if (!rows.length) return 0;
  const dong = rows
    .map((r) =>
      JSON.stringify({
        ma: r.id,
        ten: r.ten,
        ket_qua_can_co: r.ket_qua_can_co ?? "",
        du_an: r.du_an ?? "",
        ...(r.tu_tien_do_tk ? { nguon: "Tiến độ chi tiết công tác thiết kế" } : {}),
        ...(r.ghi_chu ? { ghi_chu: r.ghi_chu } : {}),
      }),
    )
    .join("\n");
  const text = await goiAi(`Xếp ${rows.length} việc sau (mỗi dòng một việc, JSON):\n${dong}`, HE_THONG_XEP);
  const { layJson } = await import("@/lib/kiem-tra/gop-y-ai");
  const kq = layJson(text);
  if (!Array.isArray(kq)) throw new Error("AI không trả mảng JSON");
  const con = new Set(rows.map((r) => r.id));
  let n = 0;
  for (const x of kq as { ma?: string; giai_doan?: string; ly_do?: string }[]) {
    // code giữ cửa: mã việc lạ / giai đoạn lạ thì bỏ qua
    if (!x?.ma || !con.has(x.ma) || !x.giai_doan || !MA_GIAI_DOAN.has(x.giai_doan)) continue;
    await q.query(`INSERT INTO docflow.giai_doan_viec (cong_viec_id, giai_doan, ly_do, nguon) VALUES ($1,$2,$3,'ai') ON CONFLICT (cong_viec_id) DO NOTHING`, [
      x.ma,
      x.giai_doan,
      (x.ly_do ?? "").slice(0, 200) || null,
    ]);
    con.delete(x.ma);
    n++;
  }
  return n;
}

type TrangThaiNen = { dang: boolean; nghiDen: number; timer?: ReturnType<typeof setInterval> };
type G = typeof globalThis & { __xepGiaiDoan?: TrangThaiNen };

/** Chạy nền một lượt (chống chạy chồng, nghỉ khi AI lỗi). */
export async function xepGiaiDoanNen(): Promise<number> {
  const g = globalThis as G;
  const st = (g.__xepGiaiDoan ??= { dang: false, nghiDen: 0 });
  if (st.dang || Date.now() < st.nghiDen) return 0;
  st.dang = true;
  try {
    const { layQ } = await import("@/lib/db");
    const { layCauHinh } = await import("@/lib/cau-hinh/doc");
    const { runAIGan } = await import("@/lib/ai/providers");
    const q = await layQ();
    const model = (await layCauHinh(q, "ai")).model_mac_dinh || undefined;
    const n = await xepMotLuot(q, (p, s) => runAIGan("lib/phong/giai-doan", p, s, undefined, model, 240_000));
    if (n) console.log(`[giai-doan] 🤖 đã xếp ${n} việc vào giai đoạn PMP`);
    return n;
  } catch (e) {
    st.nghiDen = Date.now() + NGHI_KHI_LOI_MS;
    console.error("[giai-doan] AI xếp giai đoạn lỗi — nghỉ 30 phút:", e instanceof Error ? e.message : e);
    throw e;
  } finally {
    st.dang = false;
  }
}

/** Bật bộ chạy nền (gọi cùng bộ hẹn giờ sổ cái). */
export function batXepGiaiDoanNen(): void {
  const g = globalThis as G;
  const st = (g.__xepGiaiDoan ??= { dang: false, nghiDen: 0 });
  if (st.timer) return;
  st.timer = setInterval(() => void xepGiaiDoanNen().catch(() => undefined), 120_000);
  if (typeof st.timer === "object" && "unref" in st.timer) st.timer.unref();
  const t0 = setTimeout(() => void xepGiaiDoanNen().catch(() => undefined), 40_000);
  if (typeof t0 === "object" && "unref" in t0) t0.unref();
}
