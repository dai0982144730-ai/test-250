// ============================================================
// DÒNG TÓM TẮT 🤖 CỦA BẢNG ĐIỀU HÀNH  (server-only — đụng LLM + node:fs)
// ⭐ 01/11/2026: nay là BỐN dòng có nhãn + máy soát từng dòng — khung và máy soát ở tom-tat-bon-dong.ts.
//
// Demo nguồn: demo-agent-main.html màn "bdh" khối ② — dòng có icon 🤖, viết
// kiểu BẮC CẦU giữa các ban, không phải ráp số:
//   «Hướng Việt chậm 14 ngày so cam kết CĐT, gốc là GPMB T11 — ba hộ khiếu nại,
//    quá hạn 32 ngày, kéo theo cáp ngầm không vào được mặt bằng.»
//
// Mr. Đại chốt 10/09/2026: làm ĐÚNG DEMO — để LLM viết, có icon 🤖. Câu ráp số
// mà code tự nối đã bày lại ở các khối bên dưới rồi, không thêm gì.
//
// ⛔ PHÂN VAI (chốt 06/09): LLM ở đây làm vai ② — ĐỌC SỐ, VIẾT TIẾNG NGƯỜI.
//    Nó chỉ được dùng những con số code đưa vào prompt. Cấm bịa số ngoài khung;
//    thiếu thì ghi "chưa có số liệu". Mọi số trong câu đều truy được về cổng.
//
// ⛔ LUẬT 3 (HOP-DONG-KET-NOI): màn hình KHÔNG BAO GIỜ chờ. Màn dựng xong ngay
//    với câu code ghép; câu 🤖 tới sau qua /api/bang-dieu-hanh/tom-tat.
//
// ⭐ QS-077 (27/09) — đo 26/09 21:37: hai lượt viết CÙNG dự án CÙNG giây (React dev
//    chạy hiệu ứng hai lần → hai yêu cầu), xếp hàng sau nhau trong hàng đợi Claude
//    CLI → 1 phút 52 và 2 phút 56 giây. Nay:
//      · MỘT lượt đang bay mỗi dự án (globalThis) — yêu cầu thứ hai chờ chung lượt đó
//      · nhớ câu theo DẤU VÂN CHÍNH BỘ SỐ GỬI LLM (băm prompt) — số không đổi thì
//        không viết lại, hạn 24 giờ
//      · tắt suy nghĩ ngầm (MAX_THINKING_TOKENS=0) — viết 1–2 câu không cần nghĩ
//      · rút gọn prompt (đo trước/sau ở bài kiểm tom-tat-ai.test.ts)
//      · hạn chờ 90 giây: quá hạn thì trả "🤖 đang viết" — lượt viết vẫn chạy tiếp
//        và ghi vào bộ nhớ, màn hỏi lại sau vài giây là có câu (không gọi LLM lần hai)
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { runAI } from "@/lib/ai/providers";
import { gocDuLieu } from "@/lib/goc-du-lieu";
import { goiCoGhi } from "@/lib/nhat-ky/so";
import type { DuLieuBdh } from "./gom";
import { LUAT_MA_KEM_TEN } from "@/lib/chung/ma-kem-ten";
import { LUAT_NHANH_CHAM_THEO_NGAY } from "@/lib/chung/luat-nhanh-cham";
import { ganTenLlm } from "@/lib/chung/tu-dien-ma-du-an";
import { dungKhungBonDong, soatDong, type DongTomTat } from "./tom-tat-bon-dong";

// Đi qua cửa gocDuLieu() — chạy test thì trỏ sang bản sao, không ghi vào data/ thật.
// Hàm chứ không hằng: THU_MUC_DU_LIEU phải được đọc lúc gọi, không lúc nạp module.
const thuMuc = (): string => gocDuLieu();
const tep = (): string => path.join(thuMuc(), "bdh-tom-tat.json");

/** Câu đã viết còn dùng được bao lâu khi bộ số KHÔNG đổi */
export const HAN_CAU_MS = 24 * 60 * 60 * 1000;
/** Hạn chờ một lượt viết — quá thì màn nhận "đang viết", lượt viết vẫn chạy tiếp */
export const HAN_VIET_MS = 90_000;

export interface CauTomTat {
  /** Các dòng AI viết đã qua máy soát (01/11) — ghép lại thành `cau` */
  cau: string;
  /** Bốn dòng như màn hiện: dòng AI qua soát (laAi) hoặc câu máy ghép thay chỗ */
  dong?: DongTomTat[];
  /** Dòng AI viết bị máy soát loại và lý do — để soi, không hiện cho người đọc */
  truot?: { khoa: string; chu: string; lyDo: string }[];
  /** Dấu vân của bộ số đã dùng để viết câu này */
  van: string;
  /** Ngày viết (YYYY-MM-DD) — giữ cho bản ghi cũ */
  ngay: string;
  /** Lúc viết (ISO) — từ 27/09; bản ghi cũ không có thì so theo `ngay` */
  luc?: string;
}

type So = Record<string, CauTomTat>;

function docSo(): So {
  try {
    if (!fs.existsSync(tep())) return {};
    return JSON.parse(fs.readFileSync(tep(), "utf8")) as So;
  } catch {
    return {};
  }
}

function ghiSo(so: So): void {
  try {
    fs.mkdirSync(thuMuc(), { recursive: true });
    fs.writeFileSync(tep(), JSON.stringify(so, null, 2) + "\n", "utf8");
  } catch {
    // Không ghi được thì thôi — lần sau gọi lại, không được làm hỏng màn
  }
}

// ⭐ 01/11/2026 (Mr. Đại chốt «cách 1»): bốn dòng ngắn có nhãn thay MỘT câu dài — khung + máy soát ở tom-tat-bon-dong.ts
export const HE_THONG =
  "Viết lại từng dòng tình hình một dự án năng lượng cho Giám đốc BQLDA đọc lướt trên điện thoại. " +
  "Tôi đưa các dòng có MÃ (goc, thu_hai, phap_ly, tuan) và số liệu của từng dòng. Mỗi dòng bạn viết MỘT câu ngắn, tối đa 30 từ, chỉ nói về số liệu CỦA CHÍNH DÒNG ĐÓ. " +
  "⛔ CHỈ dùng con số có trong số liệu của dòng đó — không bịa, không ước, không lấy số của dòng khác, không tính số mới. " +
  "⛔ Số «COD sớm hơn N ngày» của một hạng mục là phần COD lùi do RIÊNG hạng mục đó: không gọi là chậm của cả dự án, không gắn «so với Baseline», không cộng dồn hay nói «thêm» giữa các hạng mục. " +
  "⛔ Chỉ nói «chưa giao việc» cho hồ sơ số liệu ghi «chưa giao việc»; hồ sơ ghi «đã thành việc» thì không nói chưa rõ ai làm. " +
  "⛔ Dòng tuần: mỗi «chậm N ngày» kèm «so với Baseline» hoặc «so với Tiến độ mục tiêu» đúng như số liệu. " +
  "⛔ Không chấm điểm, không khuyên phải làm gì. " +
  'Trả ĐÚNG một khối JSON, không chữ nào khác: {"goc":"…","thu_hai":"…","phap_ly":"…","tuan":"…"} — chỉ có khoá của dòng tôi đưa. ' +
  LUAT_MA_KEM_TEN +
  " " +
  LUAT_NHANH_CHAM_THEO_NGAY;

/** Dựng câu hỏi từ khung bốn dòng — số của đúng các khối trên màn đang bày, không thêm gì khác */
export function dungPrompt(b: DuLieuBdh): string {
  const chon = b.duAn.find((x) => x.ma === b.dangChon);
  const k = dungKhungBonDong(b);
  return `Dự án: ${chon?.ten ?? b.dangChon}\n` + k.map((x) => `[${x.khoa}] ${x.nhan}: ${x.duLieu}`).join("\n");
}

/** Dấu vân = băm CHÍNH bộ số gửi LLM — đổi bất kỳ số nào thì câu cũ hết hiệu lực */
function vanTay(prompt: string): string {
  return createHash("sha1").update(prompt).digest("hex").slice(0, 16);
}

export interface KetQuaTomTat {
  ok: boolean;
  /** Các dòng AI viết đã qua soát, ghép «Nhãn: chữ» — báo cáo sáng dùng; rỗng khi chưa viết được */
  cau: string;
  /** Bốn dòng cho màn Bảng điều hành */
  dong?: DongTomTat[];
  /** Vì sao chưa có câu (LLM tắt, mạng hỏng…) — nói thẳng, không giấu */
  loi: string | null;
  /** true = lấy lại câu đã viết, không tốn lượt gọi nào */
  tuBoNho: boolean;
  /** true = lượt viết còn đang chạy quá hạn chờ — màn hỏi lại sau vài giây */
  dangViet?: boolean;
}

/** Lượt viết đang bay — MỘT lượt mỗi dự án, trên globalThis (dev nạp lại route không mất) */
const g = globalThis as unknown as { __sciBdhTomTatDangViet?: Map<string, Promise<KetQuaTomTat>> };
const dangViet = (g.__sciBdhTomTatDangViet ??= new Map());

/** Dùng trong test */
export function xoaDangVietTomTat(): void {
  dangViet.clear();
}

function conHan(cu: CauTomTat, van: string, bay: number): boolean {
  if (cu.van !== van || !cu.dong) return false;
  if (cu.luc) return bay - Date.parse(cu.luc) < HAN_CAU_MS;
  return cu.ngay === new Date(bay).toISOString().slice(0, 10);
}

/** Viết thật một lượt (ghi sổ) rồi nhớ lại — không ném lỗi */
async function vietMoi(b: DuLieuBdh, prompt: string, van: string, nguoi?: string): Promise<KetQuaTomTat> {
  let raw = "";
  try {
    raw = String(
      await goiCoGhi(
        {
          agentHoi: "main",
          agentTraLoi: "llm",
          congCu: "bdh.tom_tat_tinh_hinh",
          thamSo: { duAn: b.dangChon, vanSo: van, doDaiYeuCau: prompt.length },
          lyDoGoi:
            "Bảng điều hành: viết bốn dòng tóm tắt (kéo lùi COD nhiều nhất · thứ hai · pháp lý · tuần) cho lãnh đạo đọc lướt",
          // "tay" = người mở màn Bảng điều hành mới sinh lượt gọi này; không có
          // kịch bản nền nào tự chạy nó (sổ nhật ký chỉ có A · B · tay).
          duong: "tay",
          duAn: b.dangChon,
          nguoi,
        },
        // Viết bốn dòng ngắn từ số có sẵn: không cần suy nghĩ ngầm (đường CLI) — nhanh hơn
        () => runAI(prompt, HE_THONG, undefined, { tokenNghi: 0 })
      )
    );
  } catch (e) {
    return {
      ok: false,
      cau: "",
      loi: e instanceof Error ? e.message : "Lỗi không rõ khi gọi LLM.",
      tuBoNho: false,
    };
  }

  // 01/11: AI trả JSON bốn dòng → máy soát từng dòng; dòng trượt thay bằng câu máy ghép (không 🤖)
  const khung = dungKhungBonDong(b);
  let tho: Record<string, unknown> = {};
  try {
    const m = /\{[\s\S]*\}/.exec(raw);
    tho = m ? (JSON.parse(m[0]) as Record<string, unknown>) : {};
  } catch {
    tho = {};
  }
  const dong: DongTomTat[] = [];
  const truot: { khoa: string; chu: string; lyDo: string }[] = [];
  for (const k of khung) {
    const goc = typeof tho[k.khoa] === "string" ? String(tho[k.khoa]).trim().replace(/^["“]|["”]$/g, "") : "";
    // Lưới «mã kèm tên» (26/09): AI quên tên việc thì code chèn — chạy TRƯỚC khi soát để soát đúng chữ sẽ hiện
    const chu = goc ? await ganTenLlm(goc, b.dangChon) : "";
    const lyDo = chu ? soatDong(chu, k) : "AI không trả dòng này";
    if (lyDo === null) dong.push({ khoa: k.khoa, nhan: k.nhan, neo: k.neo, chu, laAi: true });
    else {
      truot.push({ khoa: k.khoa, chu, lyDo });
      dong.push({ khoa: k.khoa, nhan: k.nhan, neo: k.neo, chu: k.cauMay, laAi: false });
    }
  }
  const cau = dong.filter((d) => d.laAi).map((d) => `${d.nhan}: ${d.chu}`).join(" ");
  if (!dong.some((d) => d.laAi)) {
    return {
      ok: false,
      cau: "",
      dong,
      loi: `AI chưa viết được dòng nào qua máy soát (${truot.map((t) => t.lyDo).join("; ") || "trả rỗng"}) — đang hiện câu máy ghép.`,
      tuBoNho: false,
    };
  }

  const bay = new Date();
  const so = docSo();
  so[b.dangChon] = { cau, dong, truot, van, ngay: bay.toISOString().slice(0, 10), luc: bay.toISOString() };
  ghiSo(so);
  return { ok: true, cau, dong, loi: null, tuBoNho: false };
}

/**
 * Lấy câu tóm tắt cho dự án đang chọn.
 *
 * Đọc bộ nhớ trước; trùng dấu vân bộ số và chưa quá 24 giờ thì trả luôn. Khác thì
 * gọi LLM MỘT lượt (lượt đang bay thì chờ chung), ghi sổ nhật ký, rồi nhớ lại.
 */
export async function layTomTatAi(
  b: DuLieuBdh,
  nguoi?: string,
  /** false = tài khoản không qua cửa "ghi" (Người xem): chỉ trả câu đã có, không gọi LLM */
  duocGoiMoi = true,
  hanChoMs = HAN_VIET_MS
): Promise<KetQuaTomTat> {
  if (!b.dangChon) {
    return { ok: false, cau: "", loi: "Chưa chọn dự án nào.", tuBoNho: false };
  }
  const prompt = dungPrompt(b);
  const van = vanTay(prompt);
  const cu = docSo()[b.dangChon];
  if (cu && conHan(cu, van, Date.now())) {
    return { ok: true, cau: cu.cau, dong: cu.dong, loi: null, tuBoNho: true };
  }

  let p = dangViet.get(b.dangChon);
  if (!p) {
    if (!duocGoiMoi) {
      return {
        ok: false,
        cau: "",
        loi: "số đã đổi từ lần viết trước mà tài khoản Người xem không chạy AI — câu sẽ có khi Người dùng trở lên mở màn.",
        tuBoNho: false,
      };
    }
    const moi = vietMoi(b, prompt, van, nguoi);
    dangViet.set(b.dangChon, moi);
    void moi.finally(() => {
      if (dangViet.get(b.dangChon) === moi) dangViet.delete(b.dangChon);
    });
    p = moi;
  }

  let hetGio: ReturnType<typeof setTimeout> | undefined;
  const choQua = new Promise<KetQuaTomTat>((giai) => {
    hetGio = setTimeout(
      () =>
        giai({
          ok: false,
          cau: "",
          loi: `AI chưa viết xong sau ${Math.round(hanChoMs / 1000)} giây (máy AI có thể đang xếp hàng việc khác) — câu sẽ tự hiện khi viết xong.`,
          tuBoNho: false,
          dangViet: true,
        }),
      hanChoMs
    );
  });
  try {
    return await Promise.race([p, choQua]);
  } finally {
    if (hetGio) clearTimeout(hetGio);
  }
}
