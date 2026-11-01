// ============================================================
// so-cai/lanh-dao-phoi-hop.ts — MỖI VIỆC MỘT LÃNH ĐẠO PHỐI HỢP (Mr. Đại chốt 03/10/2026, db/82). CHỈ SERVER.
//   Việc vào sổ cái = MỘT đơn vị chủ trì (giao bởi trưởng đơn vị lập báo cáo) + MỘT lãnh đạo phối hợp.
//   · Vai ① của LLM: đọc tên việc + chủ trì + dự án (BQLDA nào) + phân công Ban lãnh đạo (ô chức năng nhiệm vụ, db/81)
//     → chọn MỘT lãnh đạo kèm lý do. Code kiểm mã có trong danh sách lãnh đạo; bịa thì bỏ, lượt sau xét lại.
//   · Gắn thẳng (chốt "AI gắn thẳng, sửa được"); người có quyền Sửa việc đổi ở cây bút ✏.
//   · Không gắn khi: việc đã có lãnh đạo phối hợp · lãnh đạo đang chủ trì · chưa ghi phân công lãnh đạo nào.
//   · Chạy nền 5 phút một lượt, mỗi lượt tối đa MOI_LO việc đang mở chưa xét (gắn lùi cả việc cũ — chốt 03/10).
//     AI chạy NGOÀI giao dịch (PGlite giữ khoá cả CSDL suốt tx); ghi mỗi việc một tx ngắn.
//   · Gắn lùi không bắn chuông "được thêm phối hợp" (tránh dồn hàng chục tin); lãnh đạo thấy ở nút "Việc cần phối hợp".
// ============================================================
import type { Q } from "@/lib/db";
import type { CauHinh } from "@/lib/cau-hinh/mac-dinh";
import { duAnCuaViec, duAnTrongTen } from "@/lib/phong/du-an-thuan";
import { docChucNang, type ChucNangDonVi } from "@/lib/chuc-nang-don-vi";
import { themLanhDaoPhoiHop } from "./dich-vu";
import { ghiLichSu } from "@/lib/lich-su/ghi";

export const MOI_LO = 12; // lô nhỏ + bật nghĩ: prompt bản 2 lô 25 không nghĩ còn sai 6/72 (đo 03/10)
const NGHI_KHI_LOI_MS = 30 * 60_000;

export type GoiAi = (prompt: string, system: string) => Promise<string>;
export type LayTx = <T>(fn: (q: Q) => Promise<T>) => Promise<T>;

export const HE_THONG_LANH_DAO =
  "Bạn chọn LÃNH ĐẠO PHỐI HỢP cho từng công việc của một công ty đầu tư, thiết kế, thi công, vận hành điện gió, thủy điện, điện mặt trời. " +
  "Mỗi việc chọn ĐÚNG MỘT lãnh đạo, theo đúng phân công Ban lãnh đạo đưa vào. Làm HAI BƯỚC cho từng việc:\n" +
  "BƯỚC 1 — xếp LOẠI VIỆC theo NỘI DUNG (không theo địa bàn, không theo đơn vị chủ trì): " +
  "phap_ly (thủ tục, giấy phép, chủ trương, thẩm định/phê duyệt của cơ quan nhà nước, đất đai, GPMB, đền bù, môi trường) · " +
  "hop_dong (soạn, đàm phán, rà soát, phụ lục, phạt hợp đồng mua bán thiết bị/EPC/tư vấn/giám sát) · " +
  "thi_cong (triển khai, giám sát, nghiệm thu, hoàn công, tiến độ thi công dự án) · " +
  "thiet_ke (thiết kế, bản vẽ, phương án kỹ thuật, đấu nối, cơ điện) · tai_chinh (vốn, vay, thanh toán, thuế, chi phí, ngân sách) · " +
  "van_hanh (sản lượng, bảo dưỡng, sửa chữa, thiết bị nhà máy đang chạy) · hanh_chinh (văn phòng, nhân sự, xe, mua sắm văn phòng).\n" +
  "BƯỚC 2 — xác định dự án/nhà máy thuộc BQLDA nào bằng bảng DỰ ÁN (khớp theo tên, tên khác), rồi chọn lãnh đạo có DÒNG PHÂN CÔNG " +
  "khớp đúng loại việc + địa bàn đó. Lãnh đạo phụ trách pháp lý của một BQLDA KHÔNG nhận việc thi công của BQLDA đó, và ngược lại. " +
  "Pháp lý không thuộc dự án của BQLDA nào (công ty, mỏ đá, nhà máy đang vận hành) hoặc hợp tác kinh doanh → Tổng Giám đốc. " +
  "Việc của một phòng mà không khớp dòng nào → lãnh đạo quản lý phòng đó. Đọc HẾT từng dòng phân công, kể cả danh sách nhà máy kể tên trong dòng. " +
  "Cột dự án của việc đã ghi BQLDA thì dùng đúng BQLDA đó. CHỈ dùng mã lãnh đạo có trong danh sách.\n" +
  'Trả DUY NHẤT một mảng JSON: [{"ma":"<mã việc>","loai":"<loại bước 1>","lanh_dao":"<mã lãnh đạo>","ly_do":"<loại việc> · <trích nguyên văn dòng phân công đã dùng>"}]. Không viết gì khác.';

export interface ViecCanXet {
  id: string;
  ten: string;
  chu_tri: string;
  du_an: string | null;
  bqlda: string | null;
}

export interface LanXet {
  so_xet: number;
  ai_gan: number;
  co_san: number;
  chu_tri_la_lanh_dao: number;
  bo_qua: number;
  thong_diep: string;
}

/** Việc đang mở chưa có dòng ở sổ xét (db/82) — kèm chủ trì, dự án, đơn vị chức danh lãnh đạo đang có ở phần việc */
async function viecChuaXet(q: Q, gioiHan: number) {
  const { rows } = await q.query<{
    id: string;
    ten: string;
    du_an: string | null;
    ct_loai: string | null;
    ct_id: string | null;
    ct_ten: string | null;
    ct_la_ld: boolean;
    ld_co: string | null;
    pt: string[] | null;
  }>(
    `SELECT c.id, c.ten, c.du_an,
            ct.phu_trach_loai AS ct_loai, ct.phu_trach_id AS ct_id,
            COALESCE(dct.ten, nct.ten) AS ct_ten,
            (dct.loai = 'chuc_danh'
              OR EXISTS (SELECT 1 FROM identity.don_vi d WHERE d.loai = 'chuc_danh' AND d.active AND ct.phu_trach_loai = 'nguoi'
                          AND (d.id = nct.don_vi_id OR d.id IN (SELECT don_vi_id FROM identity.kiem_nhiem WHERE nguoi_dung_id = ct.phu_trach_id)))) AS ct_la_ld,
            (SELECT p.phu_trach_id FROM docflow.phan_viec p JOIN identity.don_vi d ON d.id = p.phu_trach_id AND d.loai = 'chuc_danh'
              WHERE p.cong_viec_id = c.id AND NOT p.da_bo AND p.vai = 'phoi_hop' AND p.phu_trach_loai = 'don_vi' ORDER BY p.thu_tu LIMIT 1) AS ld_co,
            (SELECT array_agg(p.phu_trach_id) FROM docflow.phan_viec p WHERE p.cong_viec_id = c.id AND NOT p.da_bo) AS pt
       FROM docflow.cong_viec c
       LEFT JOIN LATERAL (SELECT p.* FROM docflow.phan_viec p WHERE p.cong_viec_id = c.id AND NOT p.da_bo AND p.vai = 'chu_tri' ORDER BY p.thu_tu LIMIT 1) ct ON true
       LEFT JOIN identity.don_vi dct ON ct.phu_trach_loai = 'don_vi' AND dct.id = ct.phu_trach_id
       LEFT JOIN identity.nguoi_dung nct ON ct.phu_trach_loai = 'nguoi' AND nct.id = ct.phu_trach_id
      WHERE c.trang_thai = 'dang_mo' AND NOT EXISTS (SELECT 1 FROM docflow.lanh_dao_phoi_hop l WHERE l.cong_viec_id = c.id)
      ORDER BY c.tao_luc DESC, c.id LIMIT $1`,
    [gioiHan],
  );
  return rows;
}

/** Đọc bảng JSON AI trả — chỉ giữ dòng có mã việc trong lô và mã lãnh đạo có thật */
export function docTraLoi(traLoi: string, maViec: Set<string>, maLanhDao: Set<string>): Map<string, { lanh_dao: string; ly_do: string }> {
  const ra = new Map<string, { lanh_dao: string; ly_do: string }>();
  const a = traLoi.indexOf("[");
  const b = traLoi.lastIndexOf("]");
  if (a < 0 || b <= a) return ra;
  let ds: unknown;
  try {
    ds = JSON.parse(traLoi.slice(a, b + 1));
  } catch {
    return ra;
  }
  if (!Array.isArray(ds)) return ra;
  for (const x of ds as { ma?: unknown; lanh_dao?: unknown; ly_do?: unknown }[]) {
    const ma = String(x?.ma ?? "").trim();
    const ld = String(x?.lanh_dao ?? "").trim();
    if (maViec.has(ma) && maLanhDao.has(ld) && !ra.has(ma)) ra.set(ma, { lanh_dao: ld, ly_do: String(x?.ly_do ?? "").trim().slice(0, 500) });
  }
  return ra;
}

/** Dò dự án trong tên việc — hàm chung ở phong/du-an-thuan.ts (menu Dự án, Sơ đồ, Cây việc cùng một luật) */
export { duAnTrongTen };

export function dungPrompt(lanhDao: ChucNangDonVi[], viec: ViecCanXet[], duAn: { ten: string; ten_khac: string[]; bqlda: string }[] = []): string {
  const motDong = (s: string) => s.replace(/\s*\n\s*/g, " ");
  return (
    `BAN LÃNH ĐẠO (mã | chức danh · tên | phân công — mỗi dòng phân công cách nhau bằng " / "):\n` +
    lanhDao.map((d) => `${d.id} | ${d.ten} | ${d.chuc_nang.split(/\s*\n\s*/).join(" / ")}`).join("\n") +
    (duAn.length
      ? `\n\nDỰ ÁN (tên | tên khác | đơn vị triển khai):\n` + duAn.map((d) => `${d.ten} | ${d.ten_khac.join(", ") || "—"} | ${d.bqlda || "—"}`).join("\n")
      : "") +
    `\n\nCÔNG VIỆC (mã | tên việc | đơn vị chủ trì | dự án — BQLDA triển khai):\n` +
    viec.map((v) => `${v.id} | ${v.ten.replace(/\s+/g, " ").slice(0, 300)} | ${v.chu_tri} | ${v.du_an ?? "—"}${v.bqlda ? ` — ${v.bqlda}` : ""}`).join("\n")
  );
}

/**
 * MỘT lượt: lấy tối đa MOI_LO việc chưa xét → ghi ngay ca không cần AI → hỏi AI một lần cho phần còn lại → ghi từng việc.
 * `q` chỉ để ĐỌC (ngoài giao dịch); `layTx` mở giao dịch ngắn để ghi.
 */
export async function xetMotLuot(q: Q, layTx: LayTx, dsDuAn: CauHinh["du_an"], goiAi: GoiAi): Promise<LanXet> {
  const kq: LanXet = { so_xet: 0, ai_gan: 0, co_san: 0, chu_tri_la_lanh_dao: 0, bo_qua: 0, thong_diep: "" };
  const lanhDao = (await docChucNang(q)).filter((d) => d.loai === "chuc_danh");
  if (!lanhDao.length) return { ...kq, thong_diep: "Chưa ghi phân công lãnh đạo nào (Cài đặt › Tổ chức & người dùng) — chưa gắn được" };
  const rows = await viecChuaXet(q, MOI_LO);
  kq.so_xet = rows.length;
  if (!rows.length) return { ...kq, thong_diep: "Không còn việc nào chưa xét" };

  const tenDv = new Map((await q.query<{ id: string; ten: string }>("SELECT id, ten FROM identity.don_vi")).rows.map((r) => [r.id, r.ten]));
  const canAi: ViecCanXet[] = [];
  for (const r of rows) {
    if (r.ld_co || r.ct_la_ld) {
      const nguon = r.ld_co ? "co_san" : "chu_tri_la_lanh_dao";
      await layTx(async (t) => {
        await t.query(
          "INSERT INTO docflow.lanh_dao_phoi_hop (cong_viec_id, don_vi_id, ly_do, nguon) VALUES ($1,$2,$3,$4) ON CONFLICT (cong_viec_id) DO NOTHING",
          [r.id, r.ld_co, r.ld_co ? "việc đã có lãnh đạo phối hợp" : "lãnh đạo đang chủ trì việc này", nguon],
        );
      });
      if (r.ld_co) kq.co_san++;
      else kq.chu_tri_la_lanh_dao++;
      continue;
    }
    const daId = duAnCuaViec(r.du_an, r.pt ?? [], dsDuAn, r.ten);
    const da = daId ? dsDuAn.find((d) => d.id === daId) : null;
    const bql = da?.don_vi.map((x) => tenDv.get(x) ?? x).join(", ") || null;
    canAi.push({ id: r.id, ten: r.ten, chu_tri: r.ct_ten ?? "—", du_an: da?.ten ?? r.du_an, bqlda: bql });
  }
  if (!canAi.length) return { ...kq, thong_diep: `Xét ${kq.so_xet} việc, không cần AI` };

  const bangDuAn = dsDuAn.map((d) => ({ ten: d.ten, ten_khac: d.ten_khac ?? [], bqlda: d.don_vi.map((x) => tenDv.get(x) ?? x).join(", ") }));
  const traLoi = await goiAi(dungPrompt(lanhDao, canAi, bangDuAn), HE_THONG_LANH_DAO);
  const chon = docTraLoi(traLoi, new Set(canAi.map((v) => v.id)), new Set(lanhDao.map((d) => d.id)));
  for (const v of canAi) {
    const c = chon.get(v.id);
    if (!c) {
      kq.bo_qua++; // AI không trả / trả mã lạ → lượt sau xét lại
      continue;
    }
    await layTx(async (t) => {
      // Việc có thể vừa đổi trong lúc AI chạy: đã có dòng xét thì thôi
      const da = await t.query("SELECT 1 FROM docflow.lanh_dao_phoi_hop WHERE cong_viec_id = $1", [v.id]);
      if (da.rows.length) return;
      await themLanhDaoPhoiHop(t, v.id, c.lanh_dao, v.ten);
      await t.query("INSERT INTO docflow.lanh_dao_phoi_hop (cong_viec_id, don_vi_id, ly_do, nguon) VALUES ($1,$2,$3,'ai')", [v.id, c.lanh_dao, c.ly_do]);
      await ghiLichSu(t, {
        nguoi: "he-thong",
        don_vi_id: null,
        doi_tuong_loai: "cong_viec",
        doi_tuong_id: v.id,
        hanh_dong: "lanh_dao_phoi_hop",
        chi_tiet: { lanh_dao: c.lanh_dao, ten: tenDv.get(c.lanh_dao) ?? c.lanh_dao, ly_do: `🤖 ${c.ly_do}` },
      });
    });
    kq.ai_gan++;
  }
  kq.thong_diep = `Xét ${kq.so_xet} việc: 🤖 gắn ${kq.ai_gan} · đã có ${kq.co_san} · lãnh đạo chủ trì ${kq.chu_tri_la_lanh_dao}${kq.bo_qua ? ` · ${kq.bo_qua} xét lại lượt sau` : ""}`;
  return kq;
}

/**
 * GỠ lựa chọn cũ của AI để xét lại (Mr. Đại duyệt 03/10: prompt bản 1 sai 11/72 → sửa prompt, chạy lại). Chạy MỘT lần theo `khoa`.
 * Chỉ gỡ dòng nguon='ai' mà phần phối hợp của lãnh đạo đó còn nguyên (đang làm, chưa kẹp file); người đã sửa (nguon='nguoi') giữ.
 */
export async function goLuaChonAi(q: Q, khoa: string): Promise<number> {
  if ((await q.query("SELECT 1 FROM docflow.luat_danh_dau WHERE khoa = $1", [khoa])).rows.length) return 0;
  const { rows } = await q.query<{ cong_viec_id: string; don_vi_id: string }>(
    "SELECT cong_viec_id, don_vi_id FROM docflow.lanh_dao_phoi_hop WHERE nguon = 'ai' AND don_vi_id IS NOT NULL",
  );
  let so = 0;
  for (const r of rows) {
    await q.query(
      `DELETE FROM docflow.phan_viec WHERE cong_viec_id = $1 AND phu_trach_loai = 'don_vi' AND phu_trach_id = $2 AND vai = 'phoi_hop'
          AND trang_thai = 'dang_lam' AND NOT da_bo AND tep_ket_qua = '[]'::jsonb
          AND NOT EXISTS (SELECT 1 FROM docflow.tep_dinh_kem t WHERE t.phan_viec_id = docflow.phan_viec.id)`,
      [r.cong_viec_id, r.don_vi_id],
    );
    await q.query("DELETE FROM docflow.lanh_dao_phoi_hop WHERE cong_viec_id = $1", [r.cong_viec_id]);
    so++;
  }
  await q.query("INSERT INTO docflow.luat_danh_dau (khoa, gia_tri, luc) VALUES ($1, $2::jsonb, now()) ON CONFLICT (khoa) DO NOTHING", [khoa, JSON.stringify({ da_go: so })]);
  return so;
}

// ---------------- Vòng nền ----------------

interface TrangThai {
  timer?: ReturnType<typeof setInterval>;
  dang: boolean;
  nghiDen: number;
  lanCuoi?: { luc: string; ket_qua?: LanXet; loi?: string };
}
const KHOA = "__sci_lanh_dao_phoi_hop__";
function trangThai(): TrangThai {
  const g = globalThis as unknown as Record<string, TrangThai>;
  return (g[KHOA] ??= { dang: false, nghiDen: 0 });
}

export async function xetLanhDaoNen(): Promise<LanXet | null> {
  const st = trangThai();
  if (st.dang || Date.now() < st.nghiDen) return null;
  st.dang = true;
  try {
    const { layQ, tx } = await import("@/lib/db");
    const { layCauHinh } = await import("@/lib/cau-hinh/doc");
    const { runAIGan } = await import("@/lib/ai/providers");
    const q = await layQ();
    const model = (await layCauHinh(q, "ai")).model_mac_dinh || undefined;
    const dsDuAn = await layCauHinh(q, "du_an");
    let tong: LanXet | null = null;
    // Gắn lùi: chạy liền các lô tới khi hết việc chưa xét (mỗi lô một lượt AI), dừng nếu một lô không gắn được gì
    for (let i = 0; i < 10; i++) {
      const kq = await xetMotLuot(q, tx, dsDuAn, (p, s) => runAIGan("lib/so-cai/lanh-dao-phoi-hop", p, s, undefined, model, 420_000));
      tong = kq;
      if (kq.ai_gan) console.log(`[lanh-dao-phoi-hop] ${kq.thong_diep}`);
      if (kq.so_xet < MOI_LO || (!kq.ai_gan && !kq.co_san && !kq.chu_tri_la_lanh_dao)) break;
    }
    st.lanCuoi = { luc: new Date().toISOString(), ket_qua: tong ?? undefined };
    return tong;
  } catch (e) {
    st.nghiDen = Date.now() + NGHI_KHI_LOI_MS;
    st.lanCuoi = { luc: new Date().toISOString(), loi: "🤖 AI chưa chạy được — xem nhật ký máy chủ" };
    console.error("[lanh-dao-phoi-hop] lỗi — nghỉ 30 phút:", e instanceof Error ? e.message : e);
    return null;
  } finally {
    st.dang = false;
  }
}

export function batLanhDaoNen(): void {
  const st = trangThai();
  if (st.timer) return;
  st.timer = setInterval(() => void xetLanhDaoNen(), 5 * 60_000);
  if (typeof st.timer === "object" && "unref" in st.timer) st.timer.unref();
  const t0 = setTimeout(() => void xetLanhDaoNen(), 90_000);
  if (typeof t0 === "object" && "unref" in t0) t0.unref();
}
