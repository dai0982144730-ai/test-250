// ============================================================
// 🤖 NHẬN ĐỊNH CHỖ HAI AGENT NÓI KHÁC NHAU — J12 (Mr. Đại chốt 22/09/2026)
// (server-only — đụng node:fs, mạng, LLM)
//
// Khối B11 (mau-thuan-cheo.ts) chỉ NÊU. Nút "🤖 Nhận định" trên từng dòng cho
// LLM (Sonnet 5, khoá/CLI AI của Main) đọc câu trả lời + nguồn của hai bên,
// gọi thêm HAI công cụ đọc qua hoiAgent (luật 29 — có vết trong sổ) để lấy chi
// tiết, rồi viết 3–5 câu: tin bên nào, vì sao, cần ai làm gì.
//
// ⛔ Phân vai LLM ↔ Code (06/09): LLM chỉ đọc số → viết tiếng người. KHÔNG sửa
//    số của bên nào, KHÔNG bịa số ngoài dữ liệu đưa vào. Câu hiện sau 🤖.
// ⛔ Chi phí: ƯỚC trước khi chạy (hiện trên nút), ghi THẬT sau khi chạy (CLI tự
//    báo total_cost_usd; đường API nhân giá niêm yết) — vào sổ nhật ký + sổ
//    data/bdh-nhan-dinh.json để mở lại không tốn lượt nữa.
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { gocDuLieu } from "@/lib/goc-du-lieu";
import { getAIConfig, isAIConfigured, runAIDo, GIA_MODEL_USD, type KetQuaDo } from "@/lib/ai/providers";
import { goiCoGhi } from "@/lib/nhat-ky/so";
import { hoiAgent } from "@/lib/nguon/hoi-agent";
import { hoiTienDo } from "@/lib/nguon-tien-do";
import type { KhuonTra } from "@/lib/mcp/khuon";
import { gomMauThuanCheo, type DongMauThuan } from "./mau-thuan-cheo";
import { LUAT_MA_KEM_TEN, taoTuDien } from "@/lib/chung/ma-kem-ten";
import { ganTenLlm } from "@/lib/chung/tu-dien-ma-du-an";
import { fmtNum, fmtSo } from "@/lib/format";

/** Mr. Đại chốt Sonnet 5 cho việc này — không đổi model chung ở Cài đặt */
export const MODEL_NHAN_DINH = "claude-sonnet-5";
/** Trần chữ mỗi câu trả lời công cụ đưa vào prompt — giữ chi phí có trần */
const TRAN_KY_TU_MOI_NGUON = 2500;

/**
 * ƯỚC chi phí một lượt.
 *  · Đường API (khoá Anthropic): hằng số có trần tính từ khuôn prompt —
 *    vào ≈ 2 nguồn × 2.500 ký tự + dòng mâu thuẫn + hướng dẫn ≈ 6.500 ký tự
 *    ÷ 2,5 ký tự/token (tiếng Việt có dấu) ≈ 2.600 token; ra ≈ 5 câu ≈ 600 token.
 *  · Đường Claude CLI (Main đang dùng): KHÔNG ước theo khuôn được — CLI tự nạp
 *    prompt hệ thống của nó (~23.000–34.000 token ghi bộ nhớ đệm mỗi lượt).
 *    ĐO 23/09: ước theo khuôn $0,0092 mà thật $0,0998 (lệch ~11 lần) → đường CLI
 *    ước bằng TRUNG BÌNH chi phí thật các lượt đã chạy (sổ bdh-nhan-dinh.json),
 *    chưa có lượt nào thì lấy số đo đầu tiên.
 */
const UOC_TOKEN_VAO = 2600;
const UOC_TOKEN_RA = 600;
/** Số đo thật lượt đầu qua CLI 23/09 (HV WBS 1.1.2) — chỗ lui khi sổ còn trống */
const USD_DO_DAU_CLI = 0.0998;

export interface UocChiPhi {
  duocChay: boolean;
  /** Vì sao nút mờ (AI tắt, chưa khoá…) */
  lyDoChan: string | null;
  model: string;
  usd: number | null;
  ghiChu: string;
}

export function uocChiPhiNhanDinh(): UocChiPhi {
  const cfg = getAIConfig();
  if (!isAIConfigured(cfg)) {
    return {
      duocChay: false,
      lyDoChan: "Main chưa bật kết nối AI — vào Cài đặt → Kết nối AI.",
      model: MODEL_NHAN_DINH,
      usd: null,
      ghiChu: "",
    };
  }
  if (cfg.mode === "api" && cfg.provider !== "anthropic") {
    return {
      duocChay: true,
      lyDoChan: null,
      model: cfg.model || cfg.provider,
      usd: null,
      ghiChu: `Kết nối AI đang là ${cfg.provider} — không ép được Sonnet 5, không có bảng giá để ước.`,
    };
  }
  if (cfg.mode === "claude-cli") {
    const that = Object.values(docSo())
      .filter((n) => n.nguonUsd === "cli-bao" && typeof n.usd === "number")
      .sort((a, b) => b.luc.localeCompare(a.luc))
      .slice(0, 5)
      .map((n) => n.usd as number);
    const usd = that.length > 0 ? that.reduce((a, x) => a + x, 0) / that.length : USD_DO_DAU_CLI;
    return {
      duocChay: true,
      lyDoChan: null,
      model: MODEL_NHAN_DINH,
      usd,
      ghiChu:
        (that.length > 0
          ? `ước = trung bình chi phí thật ${that.length} lượt gần nhất`
          : "ước = số đo thật lượt đầu 23/09") +
        " · đi qua Claude CLI của Main (CLI tự nạp ~23–34 nghìn token prompt hệ thống mỗi lượt, phần lớn chi phí nằm ở đó)",
    };
  }
  const gia = GIA_MODEL_USD[MODEL_NHAN_DINH]!;
  const usd = (UOC_TOKEN_VAO * gia.vao + UOC_TOKEN_RA * gia.ra) / 1e6;
  return {
    duocChay: true,
    lyDoChan: null,
    model: MODEL_NHAN_DINH,
    usd,
    ghiChu:
      `ước ~${UOC_TOKEN_VAO.toLocaleString("vi-VN")} token vào + ${UOC_TOKEN_RA} token ra × giá ${MODEL_NHAN_DINH} ` +
      `($${fmtSo(gia.vao)}/$${fmtSo(gia.ra)} mỗi triệu token) · đi qua khoá API của Main`,
  };
}

// ── Sổ nhận định đã viết ──────────────────────────────────────

export interface NhanDinh {
  khoa: string;
  /** Câu LLM viết — hiện sau 🤖 */
  cau: string;
  luc: string;
  model: string;
  tokenVao: number | null;
  tokenRa: number | null;
  usd: number | null;
  nguonUsd: KetQuaDo["nguonUsd"];
  /** Chi phí ước lúc bấm — để so ước ↔ thật */
  usdUoc: number | null;
  /** Hai câu của hai bên lúc viết — dòng đổi nội dung thì nhận định cũ đánh dấu cũ */
  van: string;
  /** Công cụ đã gọi thêm (luật 29 — đã có vết trong sổ) */
  congCuThem: string[];
  /** CLI: tiền theo từng model trong lượt (có thể có Haiku phụ) */
  chiTietModel?: string;
}

const tepSo = (): string => path.join(gocDuLieu(), "bdh-nhan-dinh.json");

function docSo(): Record<string, NhanDinh> {
  try {
    const p = tepSo();
    if (!fs.existsSync(p)) return {};
    return JSON.parse(fs.readFileSync(p, "utf8")) as Record<string, NhanDinh>;
  } catch {
    return {};
  }
}

function ghiSo(so: Record<string, NhanDinh>): void {
  try {
    fs.mkdirSync(gocDuLieu(), { recursive: true });
    fs.writeFileSync(tepSo(), JSON.stringify(so, null, 2) + "\n", "utf8");
  } catch {
    /* sổ hỏng không được làm hỏng câu trả lời */
  }
}

export const khoaDong = (duAn: string, d: Pick<DongMauThuan, "loai" | "wbs">): string => `${duAn}|${d.loai}|${d.wbs}`;
export const vanDong = (d: DongMauThuan): string => `${d.benA.noiDung} ‖ ${d.benB.noiDung}`;

/** Nhận định đã có cho các dòng của một dự án — màn đọc để hiện lại không tốn lượt */
export function nhanDinhDaCo(duAn: string): Record<string, NhanDinh> {
  const so = docSo();
  const ra: Record<string, NhanDinh> = {};
  for (const [k, v] of Object.entries(so)) if (k.startsWith(duAn + "|")) ra[k] = v;
  return ra;
}

// ── Gom chứng cứ + gọi LLM ────────────────────────────────────

function gon(k: KhuonTra): string {
  if (!k.ok) return `LỖI ${k.ma_loi}: ${k.thong_diep}`;
  const s = JSON.stringify({ du_lieu: k.du_lieu, nguon: k.nguon, canh_bao: k.canh_bao });
  return s.length > TRAN_KY_TU_MOI_NGUON ? s.slice(0, TRAN_KY_TU_MOI_NGUON) + " …(cắt bớt)" : s;
}

const HE_THONG =
  "Bạn là trợ lý của Ban quản lý dự án điện gió. Hai agent (hai phần mềm của hai ban) đang nói khác nhau " +
  "về cùng một mã WBS. Đọc câu trả lời và nguồn của HAI BÊN rồi viết 3–5 câu tiếng Việt, văn xuôi, không gạch " +
  "đầu dòng, không tiêu đề: (1) nên tin bên nào lúc này, hoặc nói thẳng là chưa đủ căn cứ để tin bên nào; " +
  "(2) vì sao — dẫn đúng nguồn (mã hồ sơ, mã việc, số hiệu văn bản) có trong dữ liệu; (3) cần AI/ban nào làm " +
  "gì để hai bên khớp lại. TUYỆT ĐỐI không bịa số, tên người, mã hồ sơ không có trong dữ liệu; không sửa số " +
  "của bên nào. Mỗi câu ngắn, dưới 40 chữ. Chỉ trả về đoạn văn, không lời chào. " +
  LUAT_MA_KEM_TEN;

export interface KetQuaNhanDinh {
  ok: boolean;
  nhanDinh: NhanDinh | null;
  loi: string | null;
}

export async function nhanDinhMotDong(
  duAn: string,
  loai: DongMauThuan["loai"],
  wbs: string,
  nguoi?: string,
): Promise<KetQuaNhanDinh> {
  const uoc = uocChiPhiNhanDinh();
  if (!uoc.duocChay) return { ok: false, nhanDinh: null, loi: uoc.lyDoChan };

  // Lấy đúng dòng đang hiện (bản nhớ 10 phút của khối B11 — không hỏi lại 60 lượt)
  const khoi = await gomMauThuanCheo(duAn);
  const dong = khoi.dong.find((d) => d.loai === loai && d.wbs === wbs);
  if (!dong) {
    return {
      ok: false,
      nhanDinh: null,
      loi: `Dòng ${wbs} không còn trong khối "hai agent nói khác nhau" — bấm Soát lại rồi thử.`,
    };
  }

  // Hai công cụ ĐỌC thêm — mỗi loại lấy chi tiết của đúng hai bên đang cãi nhau
  const lyDo = `Bảng điều hành Main — 🤖 nhận định mâu thuẫn WBS ${wbs} (J12) dự án ${duAn}`;
  let congCuThem: string[];
  let chungCu: [string, KhuonTra][];
  if (loai === "ho-so") {
    congCuThem = ["base.co_viec_cho_ma_khong", "phaply.ho_so_cua_wbs"];
    chungCu = await Promise.all([
      hoiAgent("base", "base.co_viec_cho_ma_khong", lyDo, { tham_so: { ma_he_thong: wbs, ma_du_an: duAn } }).then(
        (k): [string, KhuonTra] => ["Agent Công việc — base.co_viec_cho_ma_khong", k],
      ),
      hoiAgent("phaply", "phaply.ho_so_cua_wbs", lyDo, { tham_so: { ma_wbs: wbs, ma_du_an: duAn } }).then(
        (k): [string, KhuonTra] => ["Agent Pháp lý — phaply.ho_so_cua_wbs", k],
      ),
    ]);
  } else {
    congCuThem = ["tiendo.chi_tiet_dau_viec", "nghiemthu.da_nghiem_thu_chua"];
    chungCu = await Promise.all([
      hoiTienDo("tiendo.chi_tiet_dau_viec", { ma_du_an: duAn, ma_wbs: wbs }, lyDo).then(
        (k): [string, KhuonTra] => ["Agent tiến độ — tiendo.chi_tiet_dau_viec", k],
      ),
      // 20/10/2026: agent Nghiệm thu ghép 4 trạng thái một chỗ (tự hỏi Hợp đồng vế có hợp đồng) — PLAN Nghiệm thu §12 P2 + P3
      hoiAgent("nghiemthu", "nghiemthu.da_nghiem_thu_chua", lyDo, { tham_so: { ma_du_an: duAn, ma_wbs: wbs } }).then(
        (k): [string, KhuonTra] => ["Agent Nghiệm thu — đã nghiệm thu chưa", k],
      ),
    ]);
  }

  const prompt =
    `Dự án: ${duAn}\nMã WBS: ${wbs}${dong.tenWbs ? ` — ${dong.tenWbs}` : ""}${dong.gang ? " (trên đường găng)" : ""}\n` +
    `Loại: ${loai === "ho-so" ? "Agent Công việc báo việc XONG ↔ Pháp lý báo hồ sơ CÒN THIẾU" : "Tiến độ báo 100% ↔ Nghiệm thu báo CHƯA nghiệm thu xong"}\n\n` +
    `BÊN A — ${dong.benA.agent}: ${dong.benA.noiDung}\n  nguồn: ${dong.benA.nguon}\n` +
    `BÊN B — ${dong.benB.agent}: ${dong.benB.noiDung}\n  nguồn: ${dong.benB.nguon}\n\n` +
    `CHI TIẾT HAI BÊN (JSON nguyên văn cổng trả, có thể bị cắt bớt):\n` +
    chungCu.map(([ten, k]) => `### ${ten}\n${gon(k)}`).join("\n\n");

  let kq: KetQuaDo;
  try {
    kq = await goiCoGhi(
      {
        agentHoi: "main",
        agentTraLoi: "llm",
        congCu: "bdh.nhan_dinh_mau_thuan",
        thamSo: { duAn, loai, wbs, model: MODEL_NHAN_DINH },
        lyDoGoi: `Người bấm 🤖 Nhận định trên dòng mâu thuẫn WBS ${wbs} — LLM đọc hai bên, viết tin bên nào / vì sao / ai làm gì`,
        duong: "tay",
        duAn,
        nguoi,
      },
      () => runAIDo(prompt, HE_THONG, MODEL_NHAN_DINH),
      (r) => ({
        soToken: r.tokenVao !== null && r.tokenRa !== null ? r.tokenVao + r.tokenRa : undefined,
        traLoiGon:
          `${r.text.trim().slice(0, 120)}… · ${r.model} · ` +
          (r.usd !== null ? `$${fmtNum(r.usd, 4)}` : "chi phí không đo được"),
      }),
    );
  } catch (e) {
    return { ok: false, nhanDinh: null, loi: e instanceof Error ? e.message : "Lỗi không rõ khi gọi LLM." };
  }

  // Lưới an toàn "mã kèm tên" (26/09) — mã WBS của dòng mâu thuẫn đứng đầu từ điển
  const cau = await ganTenLlm(kq.text.trim().replace(/^["“]|["”]$/g, ""), duAn, taoTuDien([[dong.wbs, dong.tenWbs]]));
  if (cau.length < 20) {
    return { ok: false, nhanDinh: null, loi: "LLM trả về câu rỗng hoặc quá ngắn — không hiện gì bịa." };
  }
  const nd: NhanDinh = {
    khoa: khoaDong(duAn, dong),
    cau,
    luc: new Date().toISOString(),
    model: kq.model,
    tokenVao: kq.tokenVao,
    tokenRa: kq.tokenRa,
    usd: kq.usd,
    nguonUsd: kq.nguonUsd,
    usdUoc: uoc.usd,
    van: vanDong(dong),
    congCuThem,
    chiTietModel: kq.chiTietModel,
  };
  const so = docSo();
  so[nd.khoa] = nd;
  ghiSo(so);
  return { ok: true, nhanDinh: nd, loi: null };
}
