// ============================================================
// LỌC THÔNG TIN AGENT MẬT TRÊN MAIN — HÀM THUẦN (luật 10: không đụng node:fs)
//
// Mr. Đại chốt 05/10/2026 ("Theo luật mật"): thông tin của agent mật hiện trên Main
// theo ĐÚNG luật của chính agent đó (CHOT LOI-DUNG-CHUNG 6g.6.14):
//   · PM · Admin thấy hết
//   · Người dùng chỉ thấy thông tin của dự án mình THUỘC theo sơ đồ
//   · Người xem (không thuộc dự án nào) không thấy
// Vì sao phải lọc ở Main: đo 05/10 — Thùy Anh (Người xem, bị chặn ở Agent Hợp đồng) mở
// Main vẫn thấy HD-548 ở Bảng điều hành, 40 thẻ issue Hợp đồng kèm số tiền ở Báo cáo sáng,
// HD-548 + PG-548.03 ở Báo cáo tháng. Main thành cửa sau của agent mật.
//
// Bộ lọc CỦA TỪNG NGƯỜI dựng ở `agent-mat-tren-main.ts` (đọc phiên + sơ đồ tổ chức).
// ============================================================

import type { BaoCaoSang, DongBaoCao } from "@/lib/bao-cao-sang/model";
import type { VanDeSang } from "@/lib/bao-cao-sang/luat-cod";
import type { DuLieuKhoi, DuLieuKhoiDuAn } from "@/lib/bao-cao-sang/khoi-du-lieu";
import { oThieu, type Bang, type BaoCaoThang, type DongBang, type MaMuc, type OSo } from "@/lib/bao-cao-thang/model";
import type { KhoiMauThuan } from "@/lib/bang-dieu-hanh/mau-thuan-cheo";
import type { KhuonTra } from "@/lib/mcp/khuon";

/**
 * Agent mật đang áp trên Main.
 * ⭐ 12/10/2026 — Mr. Đại: «Main ẩn thẻ Pháp lý với người ngoài dự án, giống đang ẩn thẻ Hợp đồng» → thêm "phaply".
 * Hai agent KHÁC nhau ở phép xét người (dựng ở `agent-mat-tren-main.ts`): Hợp đồng — loại PM chỉ thấy dự án mình làm Giám đốc
 * dự án; Pháp lý — PM thấy mọi dự án. Phần KHÔNG gắn dự án của Pháp lý (luật, mẫu biểu) là kiến thức chung, ai cũng thấy.
 */
export const AGENT_MAT_TREN_MAIN: readonly string[] = ["hopdong", "phaply"];

/**
 * ⭐ 18/10/2026 (Q3 kiểm độc lập lần 7 — Mr. Đại gật «ok theo ý bạn»): agent KHÔNG mật nhưng THẺ ISSUE của nó có thể nói tới
 * tiền hợp đồng. Đo 18/10 màn Cảnh báo dự án HV: annv (chỉ thuộc Nam Khian 1) và hungnc (lãnh đạo chưa gắn dự án) thấy đủ 9 thẻ
 * của agent Công việc, trong đó ISS-2026-41-002 «Đợt 3 thanh toán EPC 38,2 tỷ đồng chậm giải ngân…». Thẻ issue của các agent
 * này ẩn THEO DỰ ÁN CỦA THẺ (phép xét người ở `agent-mat-tren-main.ts`):
 *   · PM · Admin thấy hết
 *   · người khác chỉ thấy thẻ của dự án mình THUỘC theo sơ đồ (chưa có sơ đồ → Người dùng trở lên, như luật cũ)
 *   · thẻ KHÔNG gắn dự án: chỉ PM · Admin (cách an toàn — không biết thẻ của dự án nào thì không đưa cho người ngoài)
 * Chỉ áp cho THẺ ISSUE (màn Cảnh báo, báo cáo sáng, báo cáo tháng, trợ lý chat). Agent vẫn KHÔNG mật: link, việc, sơ đồ… giữ nguyên.
 */
export const AGENT_THE_THEO_DU_AN: readonly string[] = ["base"];

/** Tên hiện của agent cần lọc — để nhận ra chỗ chỉ mang TÊN agent ("Agent Hợp đồng", "Hợp đồng · ISS-…") */
const TEN_AGENT_MAT: Record<string, string> = { hopdong: "Hợp đồng", phaply: "Pháp lý", base: "Công việc" };

export interface BoLocMat {
  /** PM · Admin — không phải lọc gì */
  thayHet: boolean;
  /**
   * Người này có được thấy thông tin của `agent` ở dự án `duAn` không. Agent không phải lọc → luôn true.
   * Agent «thẻ theo dự án» (`AGENT_THE_THEO_DU_AN`): chỉ hỏi cho THẺ ISSUE của nó.
   * `duAn` nhận mã nội bộ (slug) hoặc mã ngắn; null = dòng của cả hệ (không gắn dự án nào).
   */
  thay(agent: string | null | undefined, duAn: string | null | undefined): boolean;
}

/** Người không thấy gì phải lọc — dùng khi không biết ai đang xem (chat chung, lỗi đọc sơ đồ) */
export const AN_HET_MAT: BoLocMat = { thayHet: false, thay: (agent) => !canLocTheoNguoi(agent) };

export function laAgentMat(agent: string | null | undefined): boolean {
  return !!agent && AGENT_MAT_TREN_MAIN.includes(agent);
}

/** Agent không mật nhưng thẻ issue ẩn theo dự án của thẻ (18/10/2026) */
export function laAgentTheTheoDuAn(agent: string | null | undefined): boolean {
  return !!agent && AGENT_THE_THEO_DU_AN.includes(agent);
}

/** Agent có phần phải lọc theo người xem trên Main: agent mật + agent «thẻ theo dự án» */
export function canLocTheoNguoi(agent: string | null | undefined): boolean {
  return laAgentMat(agent) || laAgentTheTheoDuAn(agent);
}

export function tenAgentMat(agent: string): string {
  return `Agent ${TEN_AGENT_MAT[agent] ?? agent}`;
}

const CACH_MO = "Cần xem thì nhờ quản trị gắn bạn vào đơn vị của dự án ở sơ đồ tổ chức.";
/** Phạm vi thấy thẻ issue của agent «thẻ theo dự án» (18/10/2026) */
const PHAM_VI_THE = "chỉ thành viên dự án của thẻ xem được (thẻ có thể nói tới tiền hợp đồng).";

/** Câu thay cho chỗ bị ẩn — tiếng Việt, nói rõ cách mở */
export function cauAnMat(agent = "hopdong"): string {
  const dau =
    agent === "phaply"
      ? "Hồ sơ pháp lý của dự án chỉ thành viên dự án xem được (luật và mẫu biểu chung thì ai cũng xem được ở Agent Pháp lý). "
      : laAgentTheTheoDuAn(agent)
        ? `Thẻ issue của ${tenAgentMat(agent)} ${PHAM_VI_THE} `
        : `${tenAgentMat(agent)} là tài liệu mật — chỉ thành viên dự án xem được. `;
  return dau + CACH_MO;
}
/** «Agent Hợp đồng», «Agent Hợp đồng và Agent Pháp lý» — tên các agent mật trong một câu */
export function tenCacAgentMat(ds: readonly string[]): string {
  return ds.map(tenAgentMat).join(" và ");
}

/** Câu ngắn cho chỗ đã có tên agent đứng trước ("Agent Hợp đồng: ẩn — …") */
export const AN_NGAN = "ẩn — tài liệu mật, chỉ thành viên dự án xem được";

/** Mã agent mật từ một chuỗi bắt đầu bằng TÊN agent ("Agent Hợp đồng", "Hợp đồng · ISS-…"); không phải → null */
export function agentMatTuTen(chu: string | null | undefined): string | null {
  const s = (chu ?? "").trim().replace(/^agent\s+/i, "").toLowerCase();
  for (const ma of AGENT_MAT_TREN_MAIN) {
    const ten = TEN_AGENT_MAT[ma]?.toLowerCase();
    if (ten && s.startsWith(ten)) return ma;
  }
  return null;
}

/** Như `agentMatTuTen` nhưng nhận CẢ agent «thẻ theo dự án» ("Agent Công việc · ISS-…" → "base") — dùng cho dòng mang thẻ issue */
export function agentLocTuTen(chu: string | null | undefined): string | null {
  const mat = agentMatTuTen(chu);
  if (mat) return mat;
  const s = (chu ?? "").trim().replace(/^agent\s+/i, "").toLowerCase();
  for (const ma of AGENT_THE_THEO_DU_AN) {
    const ten = TEN_AGENT_MAT[ma]?.toLowerCase();
    if (ten && s.startsWith(ten)) return ma;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// Báo cáo sáng — vấn đề COD · việc đỏ khác · dòng lịch sử
// ─────────────────────────────────────────────────────────────

/**
 * Một nhóm vấn đề = dòng gốc + các dòng agent khác cùng mã WBS (`kem`). Bỏ dòng không được thấy;
 * dòng gốc bị bỏ thì dòng kèm đầu tiên lên thay. Nhóm mất dòng nào thì bỏ luôn 🤖 câu hỏi
 * (LLM viết câu đó khi nhìn CẢ nhóm — có thể nhắc tới phần bị ẩn).
 */
function locNhomVanDe(v: VanDeSang, loc: BoLocMat): VanDeSang[] {
  const ca = [v, ...v.kem];
  const giu = ca.filter((x) => loc.thay(x.agent, x.maDuAn));
  if (giu.length === ca.length) return [v];
  if (giu.length === 0) return [];
  const [dau, ...con] = giu;
  return [{ ...dau, kem: con.map((k) => ({ ...k, kem: [] })), cauHoi: null }];
}

export function locBaoCaoSang(bc: BaoCaoSang, loc: BoLocMat): BaoCaoSang {
  if (loc.thayHet) return bc;
  const maTheoTen = new Map((bc.duAn ?? []).map((d) => [d.ten, d.maDuAn]));
  const giuDong = (d: DongBaoCao): boolean => {
    // 18/10: dòng = một thẻ issue → nhận cả agent «thẻ theo dự án» (Agent Công việc · ISS-…)
    const agent = agentLocTuTen(d.nguon);
    return agent === null || loc.thay(agent, d.duAn === null ? null : (maTheoTen.get(d.duAn) ?? d.duAn));
  };
  return {
    ...bc,
    dong: bc.dong.filter(giuDong),
    ...(bc.vanDe ? { vanDe: bc.vanDe.flatMap((v) => locNhomVanDe(v, loc)) } : {}),
    ...(bc.viecDoKhac ? { viecDoKhac: bc.viecDoKhac.filter((v) => loc.thay(v.agent, v.maDuAn)) } : {}),
  };
}

/**
 * ⭐ 17/10/2026 — số các khối báo cáo sáng (KE-HOACH/23): khối tiền + phiếu giá theo quyền Hợp đồng, hồ sơ + hạn chủ
 * trương theo quyền Pháp lý của TỪNG dự án. Câu 🤖 TQ-5 viết từ số của mọi agent → thiếu một trong hai quyền thì ẩn cả câu.
 * Ô bị ẩn thành «ẩn — tài liệu mật…» (không phải «chưa có số» — để người đọc không tưởng là lỗi).
 */
export function locDuLieuKhoi(dl: DuLieuKhoi, loc: BoLocMat): DuLieuKhoi {
  if (loc.thayHet) return dl;
  const an = { ok: false as const, loi: AN_NGAN };
  const theoDuAn: Record<string, DuLieuKhoiDuAn> = {};
  for (const [ma, x] of Object.entries(dl.theoDuAn)) {
    const hd = loc.thay("hopdong", ma);
    const pl = loc.thay("phaply", ma);
    theoDuAn[ma] = {
      ...x,
      ...(x.tien && !hd ? { tien: an } : {}),
      ...(x.phieuGia && !hd ? { phieuGia: an } : {}),
      ...(x.hoSo && !pl ? { hoSo: an } : {}),
      ...(x.lichHoSo && !pl ? { lichHoSo: an } : {}),
      // cam kết nhân lực/máy theo hợp đồng thuộc quyền Hợp đồng; phần báo cáo nhà thầu (dong) không mật
      ...(x.nguonLuc && x.nguonLuc.ok && !hd ? { nguonLuc: { ok: true as const, so: { ...x.nguonLuc.so, camKet: null } } } : {}),
      ...(x.hanChuTruong && !pl ? { hanChuTruong: an } : {}),
      ...(x.cauAi && !(hd && pl) ? { cauAi: { cau: null, loi: AN_NGAN } } : {}),
    };
  }
  return { ...dl, theoDuAn };
}

// ─────────────────────────────────────────────────────────────
// Báo cáo tháng — ô · dòng · nhận xét 🤖 của mục
// ─────────────────────────────────────────────────────────────

/** Bản nháp dựng trước 05/10/2026 chưa ghi ô issue thuộc agent nào (`agentGoc`) */
function laBanCu(bc: BaoCaoThang): boolean {
  for (const b of [...bc.dauBaoCao, ...bc.muc.flatMap((m) => m.bang)]) {
    for (const d of b.dong) for (const o of Object.values(d.o)) if (o.agentGoc) return false;
  }
  return true;
}

const CAU_BAN_CU =
  "bản nháp dựng trước 05/10/2026 chưa ghi issue này thuộc agent nào — bấm «Dựng lại» để xem phần không mật.";

/**
 * Ô này mang thông tin của agent nào. Ô issue (`core.issue`) mang `agentGoc` — agent chủ của issue điền ô.
 * Bản cũ chưa có dấu → coi ô issue như của agent mật (thà ẩn nhầm còn hơn lộ).
 */
function agentCuaO(o: OSo, banCu: boolean): string | null {
  if (o.agentGoc) return o.agentGoc;
  if (laAgentMat(o.anhXa.maAgent)) return o.anhXa.maAgent;
  if (banCu && o.anhXa.congCu === "core.issue" && o.coSo) return AGENT_MAT_TREN_MAIN[0] ?? null;
  return null;
}

/** Lọc một bảng; trả số ô bị ẩn. `agentAn` gom mã các agent mật có ô bị ẩn (để câu báo gọi đúng tên) */
function locBang(b: Bang, loc: BoLocMat, banCu: boolean, agentAn?: Set<string>): number {
  let an = 0;
  const anTrongBang = new Set<string>();
  const giu: DongBang[] = [];
  for (const d of b.dong) {
    if (d.laDongGiuCho) {
      giu.push(d);
      continue;
    }
    const duAn = d.duAn ?? (d.o.du_an?.coSo ? String(d.o.du_an.giaTri) : null);
    let boDong = false;
    for (const c of b.cot) {
      const o = d.o[c.khoa];
      if (!o) continue;
      const agent = agentCuaO(o, banCu);
      if (agent === null || loc.thay(agent, duAn)) continue;
      an++;
      anTrongBang.add(agent);
      agentAn?.add(agent);
      // Ô định danh dòng (nhà thầu, tên vấn đề) có số → cả dòng là thông tin mật, bỏ hẳn
      if (c.laKhoa && o.coSo) {
        boDong = true;
        break;
      }
      const lyDo = banCu && !o.agentGoc && o.anhXa.congCu === "core.issue" ? `Ẩn — ${CAU_BAN_CU}` : `Ẩn — ${cauAnMat(agent)}`;
      d.o[c.khoa] = oThieu(o.anhXa, lyDo, o.donVi);
    }
    if (!boDong) giu.push(d);
  }
  // Đánh lại số thứ tự sau khi bỏ dòng
  let tt = 0;
  for (const d of giu) {
    if (d.laDongGiuCho) continue;
    tt++;
    const o = d.o.tt;
    if (o?.coSo) d.o.tt = { ...o, giaTri: tt };
  }
  if (giu.length === 0 && b.dong.length > 0) {
    const lyDo = `Ẩn cả bảng — ${cauAnMat(Array.from(anTrongBang)[0])}`;
    b.lyDoTrong = lyDo;
    const o: Record<string, OSo> = {};
    for (const c of b.cot) o[c.khoa] = oThieu(c.anhXa, lyDo, c.donVi);
    giu.push({ khoa: "__giu_cho__", o, laDongGiuCho: true });
  }
  b.dong = giu;
  return an;
}

/**
 * Lọc báo cáo tháng cho một người: ô của agent mật ở dự án người đó không thuộc → "Ẩn — …";
 * ô định danh dòng bị ẩn → bỏ cả dòng; mục có ô bị ẩn → ẩn luôn nhận xét 🤖 của mục
 * (LLM viết nhận xét khi nhìn cả mục, có thể nhắc phần mật). Không sửa bản gốc.
 */
export function locBaoCaoThang(bc: BaoCaoThang, loc: BoLocMat): BaoCaoThang {
  if (loc.thayHet) return bc;
  const ra = JSON.parse(JSON.stringify(bc)) as BaoCaoThang;
  const banCu = laBanCu(ra);
  for (const b of ra.dauBaoCao) locBang(b, loc, banCu);
  const mucCoAn = new Map<MaMuc, Set<string>>();
  for (const m of ra.muc) {
    const agentAn = new Set<string>();
    let an = 0;
    for (const b of m.bang) an += locBang(b, loc, banCu, agentAn);
    if (an > 0) mucCoAn.set(m.ma, agentAn);
  }
  for (const m of ra.muc) {
    const agentAn = mucCoAn.get(m.ma);
    if (agentAn && m.nhanXet) {
      // 18/10: câu chung cho cả agent mật lẫn thẻ issue agent Công việc (agent đó không phải «tài liệu mật»)
      m.nhanXet = `Ẩn nhận xét 🤖 của mục này — mục có thông tin của ${tenCacAgentMat(Array.from(agentAn))} mà chỉ thành viên dự án xem được.`;
    }
  }
  return ra;
}

/**
 * 🤖 Soạn nhận xét báo cáo tháng: LLM đọc CẢ bản nháp (mọi dự án, cả phần hợp đồng) rồi viết nhận xét dùng
 * chung cho mọi người đọc. Chỉ người thấy agent mật của MỌI dự án trong bản mới chạy — không để LLM đọc hộ
 * phần người bấm không được xem. Trả câu lý do khi bị chặn, null khi được chạy.
 */
export function lyDoChanSoanNhanXet(bc: Pick<BaoCaoThang, "duAn">, loc: BoLocMat): string | null {
  if (loc.thayHet) return null;
  const thieu = bc.duAn.filter((d) => AGENT_MAT_TREN_MAIN.some((a) => !loc.thay(a, d.ma)));
  if (thieu.length === 0) return null;
  return (
    `🤖 Soạn nhận xét đọc cả phần ${tenCacAgentMat(AGENT_MAT_TREN_MAIN)} của mọi dự án — bạn chưa thuộc ` +
    `${thieu.length} dự án trong bản (${thieu.map((d) => d.ten || d.ma).join(", ")}). Nhờ PM hoặc Admin bấm.`
  );
}

// ─────────────────────────────────────────────────────────────
// Màn Cảnh báo của Main
// ─────────────────────────────────────────────────────────────

interface DuLieuIssueToiThieu {
  /** `maDuAn` = dự án agent chủ ghi trên thẻ (agent Công việc ghi `ma_du_an`); thiếu → dự án đang xem */
  issue: { agentChu: string; maDuAn?: string | null }[];
  chuaGom: { ma: string; ten: string; lyDo: string }[];
  thieuThe: { ma: string }[];
  khongCoIssue: { ma: string; ten: string }[];
}

/**
 * Màn Cảnh báo xem theo MỘT dự án (`duAn`): bỏ thẻ của agent mật người xem không được thấy ở dự án này; thẻ của agent
 * «thẻ theo dự án» (agent Công việc — 18/10/2026) xét TỪNG thẻ theo dự án của thẻ. Báo một dòng "ẩn" ở khối chưa gom,
 * có tên agent đứng trước (trước 18/10 dòng chỉ ghi «ẩn — tài liệu mật…», không nói của agent nào).
 */
export function locManIssue<T extends DuLieuIssueToiThieu>(dat: T, loc: BoLocMat, duAn: string | null | undefined): T {
  if (loc.thayHet) return dat;
  const an = AGENT_MAT_TREN_MAIN.filter((a) => !loc.thay(a, duAn ?? null));
  /** Số thẻ bị ẩn của từng agent «thẻ theo dự án» */
  const anThe = new Map<string, number>();
  const issue = dat.issue.filter((i) => {
    if (an.includes(i.agentChu)) return false;
    if (!laAgentTheTheoDuAn(i.agentChu)) return true;
    const duAnThe = (i.maDuAn ?? "").trim() || duAn || null;
    if (loc.thay(i.agentChu, duAnThe)) return true;
    anThe.set(i.agentChu, (anThe.get(i.agentChu) ?? 0) + 1);
    return false;
  });
  if (an.length === 0 && anThe.size === 0) return dat;
  // Người không thấy thẻ của agent đó ở CHÍNH dự án đang xem → bỏ luôn dòng "còn N thẻ chưa lấy về" / "sổ trống" của nó
  const boCaAgent = [...an, ...AGENT_THE_THEO_DU_AN.filter((a) => !loc.thay(a, duAn ?? null))];
  return {
    ...dat,
    issue,
    thieuThe: dat.thieuThe.filter((t) => !boCaAgent.includes(t.ma)),
    khongCoIssue: dat.khongCoIssue.filter((k) => !boCaAgent.includes(k.ma)),
    chuaGom: [
      ...dat.chuaGom.filter((c) => !an.includes(c.ma)),
      ...an.map((a) => ({ ma: a, ten: tenAgentMat(a), lyDo: `${tenAgentMat(a)}: ${AN_NGAN}` })),
      ...Array.from(anThe, ([a, so]) => ({ ma: a, ten: tenAgentMat(a), lyDo: `${tenAgentMat(a)}: ẩn ${so} thẻ issue — ${PHAM_VI_THE} ${CACH_MO}` })),
    ],
  };
}

/**
 * ⭐ 18/10/2026 (phiên chính chốt): «⭐ Cần anh xem» — 5 việc LLM chọn được LƯU CHUNG cho cả dự án. Người không thấy hết thẻ
 * của dự án mà bấm thì bản chọn mới (chỉ từ phần người đó thấy) thay mất bản người thấy hết đang xem → chỉ người thấy HẾT
 * mới bấm được (cùng nếp «🤖 Soạn nhận xét» báo cáo tháng). Trả câu lý do khi bị chặn, null khi được chạy.
 */
export function lyDoChanChonCanXem(soTheAn: number): string | null {
  if (soTheAn <= 0) return null;
  return (
    `🤖 Chọn 5 việc dùng chung cho cả dự án — bạn chưa thấy ${soTheAn} thẻ của dự án này ` +
    "(thẻ Hợp đồng · Pháp lý · Công việc chỉ thành viên dự án xem được). Nhờ PM hoặc Admin bấm, để bản chọn không thay mất bản người thấy hết đang xem."
  );
}

/**
 * ⭐ 18/10/2026 — lưới cho lượt hỏi THAY MỘT NGƯỜI (`ma_nguoi_dung`, trợ lý chat web + Telegram): câu trả lời
 * `<agent>.danh_sach_issue` của agent «thẻ theo dự án» bỏ thẻ người đó không được thấy (dự án của thẻ = `ma_du_an` trên thẻ,
 * thiếu thì dự án đã hỏi). Có thẻ bị ẩn → `tom_tat` nói thẳng để trợ lý không đọc «ít thẻ» thành «ít vấn đề». Không sửa bản gốc.
 */
export function locTheIssueTrongKhuon(maAgent: string, kq: KhuonTra, loc: BoLocMat, maDuAnHoi: string | null): KhuonTra {
  if (loc.thayHet || !laAgentTheTheoDuAn(maAgent) || !kq.ok) return kq;
  const d = kq.du_lieu;
  const laMang = Array.isArray(d);
  const goc: unknown = laMang ? d : d && typeof d === "object" ? (d as Record<string, unknown>).issue : undefined;
  if (!Array.isArray(goc)) return kq;
  const giu = goc.filter((t) => {
    const o = (t ?? {}) as Record<string, unknown>;
    const ma = typeof o.ma_du_an === "string" && o.ma_du_an.trim() !== "" ? o.ma_du_an.trim() : maDuAnHoi;
    return loc.thay(maAgent, ma);
  });
  const soAn = goc.length - giu.length;
  if (soAn === 0) return kq;
  const cau = `Ẩn ${soAn}/${goc.length} thẻ issue — ${cauAnMat(maAgent)}`;
  // Cổng bên kia có thể bỏ trống `canh_bao` dù khuôn bắt có — không được ném lỗi ở đây
  const canh_bao = [...(Array.isArray(kq.canh_bao) ? kq.canh_bao : []), cau];
  if (laMang) return { ...kq, du_lieu: giu, canh_bao };
  // `so_the_dang_mo` đếm cả thẻ bị ẩn → bỏ, thay bằng số thẻ ẩn
  const { so_the_dang_mo: _boDem, ...con } = d as Record<string, unknown>;
  void _boDem;
  return {
    ...kq,
    du_lieu: { ...con, issue: giu, so_the_an: soAn, tom_tat: `${cau} Nói nguyên câu này với người dùng, không tự suy đoán nội dung thẻ bị ẩn.` },
    canh_bao,
  };
}

// ─────────────────────────────────────────────────────────────
// Bảng điều hành — khối "Chỗ hai agent nói khác nhau" (B11) + 🤖 nhận định đã viết
// ─────────────────────────────────────────────────────────────

/** Bỏ dòng mâu thuẫn có một bên là agent mật mà người xem không được thấy; nói một dòng ở "chưa hỏi được" */
export function locMauThuan(ket: KhoiMauThuan, loc: BoLocMat): KhoiMauThuan {
  if (loc.thayHet) return ket;
  const an = AGENT_MAT_TREN_MAIN.filter((a) => !loc.thay(a, ket.duAn));
  if (an.length === 0) return ket;
  const laAn = (ten: string) => {
    const a = agentMatTuTen(ten);
    return a !== null && an.includes(a);
  };
  return {
    ...ket,
    dong: ket.dong.filter((d) => !laAn(d.benA.agent) && !laAn(d.benB.agent)),
    chuaTraDuoc: ket.chuaTraDuoc.filter((c) => !laAn(c.lyDo)),
    chuaHoiDuoc: [...ket.chuaHoiDuoc.filter((c) => !laAn(c)), ...an.map((a) => `${tenAgentMat(a)}: ${AN_NGAN}`)],
  };
}

/** Loại mâu thuẫn có một bên là agent mật (khoá nhận định `<dự án>|<loại>|<wbs>`) */
const LOAI_CO_AGENT_MAT: Record<string, string> = { "nghiem-thu": "hopdong", "ho-so": "phaply" };

/** 🤖 nhận định đã viết: bỏ nhận định của loại mâu thuẫn có agent mật người xem không thấy */
export function locNhanDinhMauThuan<T>(nhanDinh: Record<string, T>, duAn: string, loc: BoLocMat): Record<string, T> {
  if (loc.thayHet) return nhanDinh;
  return Object.fromEntries(
    Object.entries(nhanDinh).filter(([k]) => loc.thay(LOAI_CO_AGENT_MAT[k.split("|")[1] ?? ""], duAn)),
  );
}

/** Loại mâu thuẫn này có cần thấy agent mật không — chặn nút 🤖 nhận định trước khi gọi LLM */
export function agentMatCuaLoaiMauThuan(loai: string): string | null {
  const a = LOAI_CO_AGENT_MAT[loai];
  return a && laAgentMat(a) ? a : null;
}
