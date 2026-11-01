// ============================================================
// du-an-main.ts — KÉO DANH MỤC DỰ ÁN TỪ MAIN (LOI-DUNG-CHUNG 6g.6, Đợt 1 — Mr. Đại chốt 03/10/2026). CHỈ SERVER.
//   · Gọi `main.du_lieu_dung_chung` qua hàm bọc ghi sổ (luật 29). Chỉ giữ phần `du_an` — gói Main trả còn có người dùng kèm
//     mật khẩu băm và khoá kết nối: KHÔNG đưa vào sổ, không lưu (phần người dùng là Đợt 2–3).
//   · Hỏi agent Tiến độ `tiendo.tom_tat_du_an` từng mã để biết dự án nào có cây WBS → điền `ma_tien_do` = mã ngắn.
//     Nhớ 6 giờ (đỡ ngập sổ); bấm ↻ thì hỏi lại hết.
//   · Gộp với trường riêng tại chỗ (du-an-main-thuan.ts), ghi Cài đặt "du_an" bằng ghiCauHinhHeThong (có kiểm tra + nhật ký
//     phiên bản) dưới danh nghĩa "he-thong" — chỉ ghi khi có thay đổi.
//   · Chế độ sống (luật 3): Main tắt → giữ nguyên bản đã kéo, ghi lỗi vào vết.
//   · Chạy nền: 20 giây sau khi bật, rồi 30 phút một lần.
// ============================================================
import fs from "node:fs";
import { thuMucDuLieu } from "@/lib/ai/duong-dan";
import { goiCoGhi } from "@/lib/nhat-ky/so";
import { headerChuoi } from "@/lib/nhat-ky/chuoi";
import { dauThuNoiBo } from "@/lib/mcp/khoa-chung";
import { diaChiMain } from "@/lib/chung/dia-chi-agent";
import { hoiTienDo, TEN_AGENT_NAY } from "@/lib/nguon-tien-do";
import { ketLuanCay, tronDuAn, type DuAnMain } from "./du-an-main-thuan";

const NHO_CAY_MS = 6 * 60 * 60_000;
const tepVet = () => thuMucDuLieu("dong-bo-tu-main.json");

export interface VetKeo {
  luc: string;
  ok: boolean;
  so_main: number;
  so_ghi: number;
  co_thay_doi: boolean;
  moi: string[];
  chi_tai_cho: string[];
  thieu_ban: string[];
  co_cay: string[];
  /** mã chưa hỏi được agent Tiến độ (tắt / chậm) — giữ nguyên "Mã bên Tiến độ" đang có */
  chua_biet_cay?: string[];
  /** ⭐ 6g.6 bước E: Main giữ Ban QLDA · đơn vị làm · Ban điều hành — Cài đặt ở đây chỉ hiện, sửa ở Main */
  don_vi_tu_main?: boolean;
  loi: string | null;
}

export function docVetKeo(): VetKeo | null {
  try {
    return JSON.parse(fs.readFileSync(tepVet(), "utf8")) as VetKeo;
  } catch {
    return null;
  }
}

function ghiVet(v: VetKeo): void {
  try {
    fs.writeFileSync(tepVet(), JSON.stringify(v, null, 2), "utf8");
  } catch (e) {
    console.error("[du-an-main] không ghi được vết:", e instanceof Error ? e.message : e);
  }
}


/** ⛔ Gọi thật ra ngoài — không export; đi qua keoDuAnTuMain để có vết sổ (luật 29) */
async function hoiMainTho(lyDo: string): Promise<{ ok: true; du_an: DuAnMain[] } | { ok: false; loi: string }> {
  try {
    const r = await fetch(`${diaChiMain()}/api/mcp/main`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headerChuoi(), ...dauThuNoiBo() }, // khoá nội bộ mọi lượt máy–máy (17/10)
      body: JSON.stringify({ cong_cu: "main.du_lieu_dung_chung", tham_so: {}, agent_goi: TEN_AGENT_NAY, ly_do_goi: lyDo }),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    const j = (await r.json().catch(() => null)) as { ok?: boolean; du_lieu?: { du_an?: DuAnMain[] }; loi?: { thong_diep?: string } | string } | null;
    if (!j?.ok || !Array.isArray(j.du_lieu?.du_an)) {
      const tl = typeof j?.loi === "string" ? j.loi : j?.loi?.thong_diep;
      return { ok: false, loi: tl || `Main trả HTTP ${r.status}` };
    }
    // CHỈ giữ dự án — bỏ người dùng (có mật khẩu băm) và kết nối (có khoá) ngay tại đây
    return { ok: true, du_an: j.du_lieu.du_an };
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    return { ok: false, loi: /abort|timeout/i.test(m) ? "Main không thưa trong 15 giây (đang tắt?)" : `không nối được Main (${m})` };
  }
}

interface TrangThai {
  dang: boolean;
  timer?: ReturnType<typeof setInterval>;
  cay: Map<string, { co: boolean; luc: number }>;
}
const KHOA = "__sci_keo_du_an_main__";
const tt = (): TrangThai => {
  const g = globalThis as unknown as Record<string, TrangThai>;
  return (g[KHOA] ??= { dang: false, cay: new Map() });
};

/** true/false = có/không có cây; null = chưa biết (Tiến độ tắt/chậm) — KHÔNG ghi nhớ kết luận chưa biết */
async function coCayWbs(ma: string, ep: boolean): Promise<boolean | null> {
  const nho = tt().cay.get(ma);
  if (!ep && nho && Date.now() - nho.luc < NHO_CAY_MS) return nho.co;
  const kq = (await hoiTienDo("tiendo.tom_tat_du_an", { ma_du_an: ma }, `Kéo danh mục dự án từ Main — dự án ${ma} có cây WBS bên agent Tiến độ không`)) as {
    ok?: boolean;
    ma_loi?: string;
    du_lieu?: { totalTasks?: number };
  };
  const co = ketLuanCay(kq, nho?.co);
  // Chỉ nhớ câu trả lời THẬT của lần này (có / không có dự án) — dùng lại bản nhớ cũ thì không làm mới giờ nhớ
  if (co !== null && (kq?.ok || kq?.ma_loi === "KHONG_CO_DU_LIEU")) tt().cay.set(ma, { co, luc: Date.now() });
  return co;
}

/** Kéo một lượt. `ep` = bấm ↻: hỏi lại Tiến độ hết, không dùng bản nhớ. */
export async function keoDuAnTuMain(lyDo: string, ep = false): Promise<VetKeo> {
  const st = tt();
  const truoc = docVetKeo();
  if (st.dang) return truoc ?? { luc: new Date().toISOString(), ok: false, so_main: 0, so_ghi: 0, co_thay_doi: false, moi: [], chi_tai_cho: [], thieu_ban: [], co_cay: [], loi: "Đang kéo — thử lại sau ít giây" };
  st.dang = true;
  const vet: VetKeo = { luc: new Date().toISOString(), ok: false, so_main: 0, so_ghi: 0, co_thay_doi: false, moi: [], chi_tai_cho: [], thieu_ban: [], co_cay: [], loi: null };
  try {
    const kq = await goiCoGhi(
      { agentTraLoi: "main", congCu: "main.du_lieu_dung_chung", thamSo: {}, lyDoGoi: lyDo, duong: "tay" },
      () => hoiMainTho(lyDo),
      (k) => ({ traLoiGon: k.ok ? `${k.du_an.length} dự án (chỉ giữ phần dự án)` : `lỗi: ${k.loi}`.slice(0, 200) }),
    );
    if (!kq.ok) {
      vet.loi = `${kq.loi} — giữ nguyên danh mục đã kéo lần trước`;
      return vet;
    }
    const dung = kq.du_an.filter((m) => m.ma?.trim() && !m.luuTru);
    vet.so_main = dung.length;
    const coCay = new Set<string>();
    const chuaBiet = new Set<string>();
    for (const m of dung) {
      const ma = m.ma.trim().toUpperCase();
      const co = await coCayWbs(ma, ep);
      if (co) coCay.add(ma);
      else if (co === null) chuaBiet.add(ma);
    }
    vet.co_cay = [...coCay];
    if (chuaBiet.size) vet.chua_biet_cay = [...chuaBiet];

    const { tx } = await import("@/lib/db");
    const { layCauHinh } = await import("@/lib/cau-hinh/doc");
    const { ghiCauHinhHeThong, chuoiOnDinh } = await import("@/lib/cau-hinh/ghi");
    // Đọc + so + ghi TRONG MỘT giao dịch (soát 03/10 điểm 5): người vừa bấm Lưu (chọn Ban QLDA) không bị lượt kéo ghi đè
    // bằng bản đọc trước đó. Hỏi Main + Tiến độ đã xong ở trên — trong giao dịch chỉ còn hàm trộn thuần.
    const kqGhi = await tx(async (q) => {
      const tai = await layCauHinh(q, "du_an");
      // Đơn vị để ghép Ban điều hành dự án Loại khác theo tên (Mr. Đại chốt 20/10/2026)
      const { rows: dv } = await q.query<{ id: string; ten: string; cha: string | null }>("SELECT id, ten, cha_id AS cha FROM identity.don_vi WHERE active");
      const t = tronDuAn(kq.du_an, tai, coCay, chuaBiet, dv);
      const doi = chuoiOnDinh(t.ds) !== chuoiOnDinh(tai);
      if (doi) await ghiCauHinhHeThong(q, "du_an", t.ds);
      return { t, doi };
    });
    const t = kqGhi.t;
    Object.assign(vet, { so_ghi: t.ds.length, moi: t.moi, chi_tai_cho: t.chiTaiCho, thieu_ban: t.thieuBan, co_thay_doi: kqGhi.doi, don_vi_tu_main: t.donViTuMain });
    vet.ok = true;
    return vet;
  } catch (e) {
    vet.loi = e instanceof Error ? e.message : String(e);
    console.error("[du-an-main] kéo lỗi:", vet.loi);
    return vet;
  } finally {
    ghiVet(vet);
    st.dang = false;
  }
}

export function batKeoDuAnNen(): void {
  const st = tt();
  if (st.timer) return;
  const chay = () => void keoDuAnTuMain("Tự kéo định kỳ danh mục dự án từ Main (bản gốc — LOI-DUNG-CHUNG 6g.6)").catch(() => undefined);
  st.timer = setInterval(chay, 30 * 60_000);
  if (typeof st.timer === "object" && "unref" in st.timer) st.timer.unref();
  const t0 = setTimeout(chay, 20_000);
  if (typeof t0 === "object" && "unref" in t0) t0.unref();
}
