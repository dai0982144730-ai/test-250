// ============================================================
// gan-wbs/gan-wbs.ts — GẮN VIỆC VÀO CÂY WBS CỦA AGENT TIẾN ĐỘ (Mr. Đại chốt 03/10/2026). CHỈ SERVER.
// Vai ① của LLM: đọc tên việc → đề xuất mã WBS KÈM LÝ DO + ĐỘ CHẮC; code kiểm mã có trong cây; người duyệt/sửa thì thắng.
// Mã WBS ghi trong tên việc chỉ là gợi ý cho AI (báo cáo đánh số riêng — đo 03/10), không bao giờ máy tự gắn.
// Chạy nền giống xếp giai đoạn (phong/giai-doan.ts): mỗi 5 phút, dự án nào có "Mã bên Tiến độ" thì lấy cây WBS (hỏi agent
// Tiến độ qua lớp ghi sổ — luật 29), gắn việc chưa có dòng. AI lỗi → nghỉ 30 phút.
// ============================================================
import type { Q } from "@/lib/db";
import { LoiHttp } from "@/lib/phien";
import type { NguoiDungPhien } from "@/lib/types";
import type { CauHinh } from "@/lib/cau-hinh/mac-dinh";
import { duAnCuaViec } from "@/lib/phong/du-an-thuan";
import { NGUONG_NGHI, aiTuDuyet, docDoChac, ganTenWbs, maTrongTen, type DauViecWbs, type WbsViec } from "./thuan";

const MOI_LO = 40;
const NGHI_KHI_LOI_MS = 30 * 60_000;

/** Lấy cây WBS của một dự án bên agent Tiến độ. Tiêm vào để test chạy offline; bản thật đi qua lớp ghi sổ. */
export type LayCay = (maTienDo: string, lyDo: string) => Promise<{ ok: true; tasks: DauViecWbs[] } | { ok: false; thong_diep: string }>;
export type GoiAi = (prompt: string, system: string) => Promise<string>;

export interface LanGan {
  du_an_id: string;
  so_xet: number;
  theo_ten: number;
  ai_de_xuat: number;
  ai_tu_duyet: number;
  loi: number;
  thong_diep: string;
}

export async function docGanWbs(q: Q, duAnId?: string): Promise<WbsViec[]> {
  const { rows } = await q.query<WbsViec>(
    `SELECT cong_viec_id, du_an_id, ma_wbs, ten_wbs, ly_do, do_chac::float AS do_chac, nguon, trang_thai, nguoi_duyet,
            luc_duyet::text AS luc_duyet, luc::text AS luc
       FROM docflow.wbs_viec ${duAnId ? "WHERE du_an_id = $1" : ""} ORDER BY cong_viec_id`,
    duAnId ? [duAnId] : [],
  );
  return rows;
}

/** Việc thuộc một dự án (đang mở + đã xong; việc đã huỷ không gắn) — cùng luật tra dự án với menu Dự án */
export async function viecCuaDuAn(q: Q, duAn: CauHinh["du_an"]): Promise<Map<string, { id: string; ten: string; ket_qua_can_co: string | null; du_an_id: string }>> {
  const { rows } = await q.query<{ id: string; ten: string; ket_qua_can_co: string | null; du_an: string | null; pt: string[] | null }>(
    `SELECT c.id, c.ten, c.ket_qua_can_co, c.du_an,
            (SELECT array_agg(p.phu_trach_id) FROM docflow.phan_viec p WHERE p.cong_viec_id = c.id AND NOT p.da_bo) AS pt
       FROM docflow.cong_viec c WHERE c.trang_thai IN ('dang_mo', 'hoan_thanh') ORDER BY c.id`,
  );
  const ra = new Map<string, { id: string; ten: string; ket_qua_can_co: string | null; du_an_id: string }>();
  for (const r of rows) {
    const da = duAnCuaViec(r.du_an, r.pt ?? [], duAn, r.ten);
    if (da) ra.set(r.id, { id: r.id, ten: r.ten, ket_qua_can_co: r.ket_qua_can_co, du_an_id: da });
  }
  return ra;
}

export const HE_THONG_GAN = `Bạn gắn công việc của một công ty đầu tư, thiết kế, thi công điện gió vào cây đầu việc (WBS) của dự án.
Chỉ dùng mã CÓ TRONG BẢNG. Việc không thuộc đầu việc thi công / hồ sơ / mua sắm nào của cây (họp nội bộ, hành chính, nhân sự…) thì "ma": null.
Ưu tiên đầu việc LÁ (mã dài nhất) khớp đúng nội dung; chỉ chọn mã cấp cha khi việc bao trùm cả nhóm.
Dòng có "tên ghi mã": báo cáo ghi mã theo cách đánh số RIÊNG, có thể KHÔNG trùng cây — chỉ nhận mã đó khi tên đầu việc của nó đúng nội dung việc; không khớp thì tìm mã đúng theo nội dung và nói rõ trong ly_do.
Với TỪNG việc chấm "do_chac" — độ chắc của chính bạn, số từ 0 đến 1:
0,9–1 = tên việc nêu thẳng hạng mục / vị trí trùng một dòng WBS; 0,7–0,89 = hợp lý nhưng có thể nhầm dòng lân cận; dưới 0,7 = đoán.
Trong "ly_do": một câu tiếng Việt ngắn; nhắc mã WBS thì luôn kèm tên ngắn (vd "7.2.3 Họp dân chi trả đền bù"), không bao giờ chỉ viết mã.
Không bịa thông tin. Trả lời DUY NHẤT một mảng JSON:
[{"ma_viec":"<mã việc>","ma":"<mã WBS>"|null,"ly_do":"…","do_chac":0.85}]`;

function bocMang(text: string): { ma_viec?: unknown; ma?: unknown; ly_do?: unknown; do_chac?: unknown }[] {
  const dau = text.indexOf("[");
  const cuoi = text.lastIndexOf("]");
  if (dau < 0 || cuoi <= dau) throw new Error("AI không trả mảng JSON");
  const v = JSON.parse(text.slice(dau, cuoi + 1));
  if (!Array.isArray(v)) throw new Error("AI không trả mảng JSON");
  return v;
}

/** Gắn một lượt cho MỘT dự án: mã trong tên trước (code), rồi AI theo lô. Trả số đo để hiện lên màn. */
export async function ganMotDuAn(
  q: Q,
  duAn: CauHinh["du_an"][number],
  viec: { id: string; ten: string; ket_qua_can_co: string | null }[],
  cay: DauViecWbs[],
  ch: CauHinh["gan_wbs"],
  goiAi: GoiAi,
): Promise<LanGan> {
  const kq: LanGan = { du_an_id: duAn.id, so_xet: viec.length, theo_ten: 0, ai_de_xuat: 0, ai_tu_duyet: 0, loi: 0, thong_diep: "" };
  if (!viec.length) return { ...kq, thong_diep: "Không còn việc mới nào chưa gắn" };
  const tenTheoMa = new Map(cay.filter((t) => t.wbs && t.name).map((t) => [t.wbs, t.name]));
  const maCo = new Set(tenTheoMa.keys());
  const ghi = (cv: string, ma: string | null, lyDo: string | null, doChac: number | null, nguon: "ai", daDuyet: boolean) =>
    q.query(
      `INSERT INTO docflow.wbs_viec (cong_viec_id, du_an_id, ma_wbs, ten_wbs, ly_do, do_chac, nguon, trang_thai, luc_duyet)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8, CASE WHEN $8 = 'da_duyet' THEN now() END) ON CONFLICT (cong_viec_id) DO NOTHING`,
      [cv, duAn.id, ma, ma ? tenTheoMa.get(ma) ?? null : null, lyDo, doChac, nguon, daDuyet ? "da_duyet" : "cho_duyet"],
    );

  // Mã ghi sẵn trong tên việc CHỈ LÀ GỢI Ý cho AI (đo 03/10 trên dữ liệu thật: CV-2026-0074 "Họp dân chi trả đền bù … (7.2.3)"
  // nhưng 7.2.3 trong cây Tiến độ là "Thi công san nền" — báo cáo đánh số theo cách riêng). AI so nội dung rồi mới nhận.
  const conLai = viec.map((v) => {
    const ma = maTrongTen(v.ten, maCo);
    if (ma) kq.theo_ten++;
    return { ...v, goi_y: ma ? `${ma} ${tenTheoMa.get(ma)}` : null };
  });

  // ② 🤖 AI theo lô — bảng WBS chỉ gồm mã + tên (metadata, không gửi cả cây chi tiết)
  const bang = cay.filter((t) => t.wbs && t.name).map((t) => `${t.wbs} — ${t.name}`).join("\n");
  for (let i = 0; i < conLai.length; i += MOI_LO) {
    const lo = conLai.slice(i, i + MOI_LO);
    const ds = lo
      .map((v) => `${v.id} | ${v.ten}${v.ket_qua_can_co ? ` | kết quả cần có: ${v.ket_qua_can_co}` : ""}${v.goi_y ? ` | tên ghi mã: ${v.goi_y}` : ""}`)
      .join("\n");
    const prompt = `BẢNG MÃ WBS CỦA DỰ ÁN ${duAn.ten} (mã — tên):\n${bang}\n\nCÁC VIỆC (mã việc | tên | kết quả cần có):\n${ds}\n\nGắn TỪNG việc vào một mã WBS phù hợp nhất, hoặc null nếu không thuộc.`;
    let mang: ReturnType<typeof bocMang>;
    try {
      mang = bocMang(await goiAi(prompt, HE_THONG_GAN));
    } catch (e) {
      kq.loi += lo.length;
      if (i === 0) throw e; // lô đầu lỗi = AI hỏng → để vòng nền nghỉ 30 phút
      continue;
    }
    const con = new Set(lo.map((v) => v.id));
    for (const x of mang) {
      const cv = String(x.ma_viec ?? "");
      if (!con.has(cv)) continue; // mã việc lạ → bỏ
      let ma = x.ma === null || x.ma === undefined || x.ma === "" ? null : String(x.ma).trim();
      let lyDo = ganTenWbs(String(x.ly_do ?? "").trim(), tenTheoMa).slice(0, 300);
      let doChac = docDoChac(x.do_chac);
      if (ma !== null && !maCo.has(ma)) {
        // AI bịa mã ngoài cây → không lưu bừa: ghi chờ người gắn
        lyDo = `AI trả mã "${ma}" không có trong cây — chờ người gắn`;
        ma = null;
        doChac = null;
      }
      const tu = aiTuDuyet(ch.che_do, ch.nguong_tu_duyet, doChac);
      await ghi(cv, ma, lyDo ? `🤖 ${lyDo}` : null, doChac, "ai", tu);
      kq.ai_de_xuat++;
      if (tu) kq.ai_tu_duyet++;
      con.delete(cv);
    }
    kq.loi += con.size; // AI quên trả lời → lượt sau hỏi lại
  }
  kq.thong_diep =
    `Xét ${kq.so_xet} việc (${kq.theo_ten} việc tên có ghi mã — AI kiểm lại): 🤖 AI đề xuất ${kq.ai_de_xuat}` +
    (ch.che_do === "ai_tu_duyet" ? ` (tự duyệt ${kq.ai_tu_duyet})` : " (chờ người duyệt)") +
    (kq.loi ? `, chưa trả lời ${kq.loi} (lượt sau hỏi lại)` : "");
  return kq;
}

/** Một lượt cho mọi dự án có "Mã bên Tiến độ". */
export async function ganMotLuot(q: Q, layCay: LayCay, goiAi: GoiAi, chiDuAn?: string): Promise<LanGan[]> {
  const { layCauHinh } = await import("@/lib/cau-hinh/doc");
  const ch = await layCauHinh(q, "gan_wbs");
  if (!ch.bat) return [];
  const dsDuAn = await layCauHinh(q, "du_an");
  const coCay = dsDuAn.filter((d) => d.ma_tien_do && (!chiDuAn || d.id === chiDuAn));
  if (!coCay.length) return [];
  const tatCa = await viecCuaDuAn(q, dsDuAn);
  const daCo = new Set((await q.query<{ cong_viec_id: string }>("SELECT cong_viec_id FROM docflow.wbs_viec")).rows.map((r) => r.cong_viec_id));
  const ra: LanGan[] = [];
  for (const d of coCay) {
    const viec = [...tatCa.values()].filter((v) => v.du_an_id === d.id && !daCo.has(v.id));
    if (!viec.length) {
      ra.push({ du_an_id: d.id, so_xet: 0, theo_ten: 0, ai_de_xuat: 0, ai_tu_duyet: 0, loi: 0, thong_diep: "Không còn việc mới nào chưa gắn" });
      continue;
    }
    const cay = await layCay(d.ma_tien_do as string, `Gắn ${viec.length} việc của dự án ${d.ten} vào cây WBS — cần bảng mã + tên đầu việc`);
    if (!cay.ok) {
      ra.push({ du_an_id: d.id, so_xet: viec.length, theo_ten: 0, ai_de_xuat: 0, ai_tu_duyet: 0, loi: 0, thong_diep: `Chưa lấy được cây WBS từ agent Tiến độ: ${cay.thong_diep}` });
      continue;
    }
    if (!cay.tasks.length) {
      ra.push({ du_an_id: d.id, so_xet: viec.length, theo_ten: 0, ai_de_xuat: 0, ai_tu_duyet: 0, loi: 0, thong_diep: "Cây WBS trả về 0 đầu việc" });
      continue;
    }
    ra.push(await ganMotDuAn(q, d, viec, cay.tasks, ch, goiAi));
  }
  return ra;
}

// ─────────────── Người duyệt / sửa ───────────────

/** Đơn vị chủ trì của việc — để xét phạm vi quyền "Duyệt gắn WBS" */
async function donViChuTri(q: Q, cvId: string): Promise<string | null> {
  const { rows } = await q.query<{ loai: string; id: string; dv: string | null }>(
    `SELECT p.phu_trach_loai AS loai, p.phu_trach_id AS id, n.don_vi_id AS dv
       FROM docflow.phan_viec p LEFT JOIN identity.nguoi_dung n ON p.phu_trach_loai = 'nguoi' AND n.id = p.phu_trach_id
      WHERE p.cong_viec_id = $1 AND NOT p.da_bo ORDER BY (p.vai = 'chu_tri') DESC, p.thu_tu LIMIT 1`,
    [cvId],
  );
  const r = rows[0];
  if (!r) return null;
  return r.loai === "don_vi" ? r.id : r.dv;
}

export async function duocDuyet(q: Q, nd: NguoiDungPhien, cvId: string): Promise<boolean> {
  const { coQuyen } = await import("@sci/identity");
  const dv = await donViChuTri(q, cvId);
  const { rows: cay } = await q.query<{ id: string; cha_id: string | null }>("SELECT id, cha_id FROM identity.don_vi");
  return coQuyen(nd, "wbs.duyet", { don_vi_id: dv }, cay);
}

/**
 * Người duyệt đề xuất (giữ mã AI) hoặc sửa sang mã khác / "không thuộc" (ma = null). Người thắng: nguon = 'nguoi' khi đổi mã.
 * `ma` undefined = duyệt nguyên đề xuất. Một cú bấm là áp dụng (luật bớt cú bấm).
 */
export async function duyetHoacSua(
  q: Q,
  nd: NguoiDungPhien,
  cvId: string,
  sua: { ma?: string | null; ten_wbs?: string | null; du_an_id?: string },
  maCo?: Map<string, string>,
): Promise<WbsViec> {
  if (!(await duocDuyet(q, nd, cvId))) throw new LoiHttp(403, "Bạn không có quyền \"Duyệt gắn WBS\" cho việc này (Cài đặt › Vai trò và quyền)");
  const { ghiLichSu } = await import("@/lib/lich-su/ghi");
  const cu = (await q.query<WbsViec>("SELECT * FROM docflow.wbs_viec WHERE cong_viec_id = $1", [cvId])).rows[0];
  const doiMa = sua.ma !== undefined;
  if (!cu && !doiMa) throw new LoiHttp(404, `Việc ${cvId} chưa có mã WBS nào để duyệt`);
  if (doiMa && sua.ma !== null && maCo && !maCo.has(sua.ma as string)) throw new LoiHttp(400, `Mã WBS "${sua.ma}" không có trong cây của dự án`);
  if (doiMa) {
    const duAnId = cu?.du_an_id ?? sua.du_an_id;
    if (!duAnId) throw new LoiHttp(400, "Thiếu dự án của việc");
    const ten = sua.ma ? (maCo?.get(sua.ma) ?? sua.ten_wbs ?? null) : null;
    await q.query(
      `INSERT INTO docflow.wbs_viec (cong_viec_id, du_an_id, ma_wbs, ten_wbs, ly_do, do_chac, nguon, trang_thai, nguoi_duyet, luc_duyet)
       VALUES ($1,$2,$3,$4,NULL,NULL,'nguoi','da_duyet',$5, now())
       ON CONFLICT (cong_viec_id) DO UPDATE SET ma_wbs = EXCLUDED.ma_wbs, ten_wbs = EXCLUDED.ten_wbs, ly_do = NULL, do_chac = NULL,
         nguon = 'nguoi', trang_thai = 'da_duyet', nguoi_duyet = EXCLUDED.nguoi_duyet, luc_duyet = now(), luc = now()`,
      [cvId, duAnId, sua.ma, ten, nd.id],
    );
  } else {
    await q.query("UPDATE docflow.wbs_viec SET trang_thai = 'da_duyet', nguoi_duyet = $2, luc_duyet = now() WHERE cong_viec_id = $1", [cvId, nd.id]);
  }
  const moi = (await q.query<WbsViec>("SELECT cong_viec_id, du_an_id, ma_wbs, ten_wbs, ly_do, do_chac::float AS do_chac, nguon, trang_thai, nguoi_duyet, luc_duyet::text AS luc_duyet, luc::text AS luc FROM docflow.wbs_viec WHERE cong_viec_id = $1", [cvId])).rows[0];
  await ghiLichSu(q, {
    nguoi: nd.id,
    don_vi_id: nd.don_vi_id,
    doi_tuong_loai: "cong_viec",
    doi_tuong_id: cvId,
    hanh_dong: doiMa ? "gan_wbs" : "duyet_wbs",
    chi_tiet: { truoc: cu ? { ma_wbs: cu.ma_wbs, ten_wbs: cu.ten_wbs, nguon: cu.nguon, trang_thai: cu.trang_thai } : null, sau: { ma_wbs: moi.ma_wbs, ten_wbs: moi.ten_wbs } },
  });
  return moi;
}

/**
 * DUYỆT CẢ LÔ (Mr. Đại chốt 03/10/2026): mọi đề xuất 🤖 chờ duyệt của MỘT dự án có độ chắc ≥ ngưỡng (0,7 = không "nghi") —
 * từng việc vẫn xét quyền "Duyệt gắn WBS" theo đơn vị chủ trì và ghi lịch sử như duyệt tay; việc nghi / chưa đo độ chắc phải
 * duyệt từng cái. Mỗi việc một giao dịch ngắn (không giữ khoá cả lô).
 */
export async function duyetCaLo(
  layTx: <T>(fn: (q: Q) => Promise<T>) => Promise<T>,
  nd: NguoiDungPhien,
  duAnId: string,
  nguong = NGUONG_NGHI,
): Promise<{ da_duyet: string[]; khong_quyen: string[] }> {
  const ds = await layTx((q) =>
    q.query<{ cong_viec_id: string }>(
      "SELECT cong_viec_id FROM docflow.wbs_viec WHERE du_an_id = $1 AND trang_thai = 'cho_duyet' AND do_chac IS NOT NULL AND do_chac >= $2 ORDER BY cong_viec_id",
      [duAnId, nguong],
    ),
  );
  const ra = { da_duyet: [] as string[], khong_quyen: [] as string[] };
  for (const { cong_viec_id: cv } of ds.rows) {
    const duoc = await layTx((q) => duocDuyet(q, nd, cv));
    if (!duoc) {
      ra.khong_quyen.push(cv);
      continue;
    }
    await layTx((q) => duyetHoacSua(q, nd, cv, {}));
    ra.da_duyet.push(cv);
  }
  return ra;
}

// ─────────────── Chạy nền ───────────────

type TrangThaiNen = { dang: boolean; nghiDen: number; timer?: ReturnType<typeof setInterval>; lanCuoi?: { luc: string; ket_qua: LanGan[]; loi?: string } };
type G = typeof globalThis & { __ganWbs?: TrangThaiNen };
const trangThai = (): TrangThaiNen => ((globalThis as G).__ganWbs ??= { dang: false, nghiDen: 0 });

export function lanChayCuoi(): TrangThaiNen["lanCuoi"] {
  return trangThai().lanCuoi;
}

/** Cây WBS thật — qua lớp hỏi agent Tiến độ có ghi sổ (luật 29), cắt trang + nhớ 10 phút */
export const layCayThat: LayCay = async (maTienDo, lyDo) => {
  const { layHetDauViec } = await import("@/lib/tien-do-dau-viec");
  const kq = await layHetDauViec(maTienDo, lyDo);
  if (!kq.ok) return { ok: false, thong_diep: kq.thong_diep ?? "agent Tiến độ không trả lời" };
  const tasks = ((kq.du_lieu as { tasks?: DauViecWbs[] } | undefined)?.tasks ?? []).filter((t) => t.wbs);
  return { ok: true, tasks };
};

/** Chạy một lượt (chống chạy chồng, nghỉ khi AI lỗi). `chiDuAn` = bấm "Gắn ngay" trên màn. */
export async function ganWbsNen(chiDuAn?: string, epChay = false): Promise<LanGan[]> {
  const st = trangThai();
  if (st.dang) return [];
  if (!epChay && Date.now() < st.nghiDen) return [];
  st.dang = true;
  try {
    const { layQ } = await import("@/lib/db");
    const { layCauHinh } = await import("@/lib/cau-hinh/doc");
    const { runAIGan } = await import("@/lib/ai/providers");
    const q = await layQ();
    const model = (await layCauHinh(q, "ai")).model_mac_dinh || undefined;
    const kq = await ganMotLuot(q, layCayThat, (p, s) => runAIGan("lib/gan-wbs/gan-wbs", p, s, undefined, model, 240_000), chiDuAn);
    st.lanCuoi = { luc: new Date().toISOString(), ket_qua: kq };
    const n = kq.reduce((a, x) => a + x.ai_de_xuat, 0);
    if (n) console.log(`[gan-wbs] gắn ${n} việc vào cây WBS`);
    return kq;
  } catch (e) {
    st.nghiDen = Date.now() + NGHI_KHI_LOI_MS;
    const goc = e instanceof Error ? e.message : String(e);
    // Chữ tới người dùng phải tiếng Việt (luật 4.1.1) — câu gốc của Claude CLI (tiếng Anh, JSON) chỉ ghi nhật ký máy chủ
    const loi = /claude cli|not logged in|is_error/i.test(goc)
      ? "🤖 AI chưa chạy được — Claude CLI trên máy chủ báo lỗi (có thể chưa đăng nhập hoặc hết lượt). Xem Cài đặt › Kết nối › AI"
      : /[a-z]{4,} [a-z]{4,} [a-z]{4,}/i.test(goc) && !/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(goc)
        ? "🤖 AI chưa chạy được — xem nhật ký máy chủ"
        : goc;
    st.lanCuoi = { luc: new Date().toISOString(), ket_qua: [], loi };
    console.error("[gan-wbs] lỗi — nghỉ 30 phút:", goc);
    throw e;
  } finally {
    st.dang = false;
  }
}

export function batGanWbsNen(): void {
  const st = trangThai();
  if (st.timer) return;
  st.timer = setInterval(() => void ganWbsNen().catch(() => undefined), 5 * 60_000);
  if (typeof st.timer === "object" && "unref" in st.timer) st.timer.unref();
  const t0 = setTimeout(() => void ganWbsNen().catch(() => undefined), 60_000);
  if (typeof t0 === "object" && "unref" in t0) t0.unref();
}
