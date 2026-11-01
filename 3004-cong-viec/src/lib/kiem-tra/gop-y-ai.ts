// ============================================================
// kiem-tra/gop-y-ai.ts — AI GÓP Ý NỘI DUNG báo cáo trước khi gửi (kỹ năng /kiem-tra-mau). CHỈ SERVER.
// Đưa chữ của báo cáo (ô nhập, các mục, bảng gắn mã — đã cắt độ dài) + tên mẫu + danh bạ người/đơn vị
// cho AI, bắt AI trả JSON chặt: {"gop_y":[{vi_tri, loai, thong_diep}]}.
// Góp ý LUÔN mức "goi_y" — KHÔNG BAO GIỜ chặn gửi. AI lỗi / trả sai JSON → ném lỗi, nơi gọi tự bỏ qua.
// Chạy nền + lưu theo sha256: xem gop-y-luu.ts.
// ============================================================
import { laMotO } from "./vi-tri-o";
import fs from "node:fs";
import path from "node:path";
import type { LoiKiemTra, MauWord } from "@/lib/types";
import { runAIGan } from "@/lib/ai/providers";
import type { NoiDungWord } from "./doc-word";
import type { DanhBa } from "./phan-giai";
import { chuanHoaTieuDe } from "./chuan-hoa";

export const LOAI_GOP_Y = ["muc_trong", "mau_thuan", "chinh_ta_ten", "khac"] as const;
export type LoaiGopY = (typeof LOAI_GOP_Y)[number];

/** Một góp ý của AI — cùng dạng LoiKiemTra (luật noi_dung_ai, mức goi_y) để hiển thị chung. */
export interface GopYAi {
  luat: "noi_dung_ai";
  muc: "goi_y";
  loai: LoaiGopY;
  thong_diep: string;
  vi_tri?: LoiKiemTra["vi_tri"];
  cho?: string; // chỗ AI ghi (nguyên văn) khi không gắn được về tag/mục
  /** 🤖 chữ mới đề xuất cho CẢ ô ở vi_tri (chỉ khi vi_tri là một ô) — người nộp duyệt thì máy ghi vào file (chốt 29/09) */
  de_xuat?: string;
  /** Đã ghi đề xuất vào file ở bản sau (kết quả soát chép sang bản mới, không soát lại) */
  da_sua?: boolean;
}

/** Đọc chữ đề xuất AI trả (trường "sua") — chỉ giữ khi chỉ đúng một ô. */
export function docDeXuat(o: Record<string, unknown>, viTri: LoiKiemTra["vi_tri"] | undefined): string | undefined {
  const s = [o.sua, o.de_xuat].find((v) => typeof v === "string" && v.trim()) as string | undefined;
  return s && laMotO(viTri) ? s.trim().slice(0, 2000) : undefined;
}

/** Thời gian chờ AI tối đa cho một lần góp ý — tính từ lúc AI bắt đầu chạy. */
export const THOI_GIAN_CHO_GOP_Y_MS = 60_000;
/**
 * Lượt AI xếp hàng từng lượt một (providers.ts) — đồng hồ ngoài chờ gấp 3 hạn chạy (60 giây → 180 giây) để còn chỗ đứng chờ lượt trước,
 * để lượt soát không bị cắt khi AI còn chưa kịp bắt đầu (lỗi đo 29/09: 18/18 lượt góp ý bị cắt ở 60 giây).
 */
export const choCaHang = (ms: number) => ms * 3;
/** Giới hạn độ dài chữ đưa cho AI (ký tự). */
export const GIOI_HAN_CHU = { tong: 24_000, o: 600, muc: 5_000, bang: 4_000, danh_ba: 3_000 };
/** Số góp ý tối đa giữ lại. */
export const SO_GOP_Y_TOI_DA = 15;

export interface TuyChonGopYAi {
  danhBa?: DanhBa | null;
  model?: string;
  thoiGianChoMs?: number;
}

// ---------------- Dựng yêu cầu ----------------

const cat = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…(đã cắt)` : s);

/** Tên mục không kèm số La Mã ("IV. TIẾN ĐỘ THU VỐN" → "TIẾN ĐỘ THU VỐN") — cùng quy ước vi_tri "muc:<tên>" của kiem-tra.ts. */
export function tenMuc(tieuDe: string): string {
  return tieuDe.replace(/^\s*(?:[IVX]+|[A-Z]\d{0,2})\.\s*/, "");
}

/** Hướng dẫn của kỹ năng hệ thống /kiem-tra-mau (bỏ frontmatter). Không đọc được thì bỏ qua. */
function huongDanKyNang(): string {
  try {
    const goc = process.env.DOCFLOW_SKILLS_HE_THONG?.trim() || path.join(process.cwd(), "skills-he-thong");
    const t = fs.readFileSync(path.join(goc, "kiem-tra-mau", "SKILL.md"), "utf8");
    return cat(t.replace(/^---[\s\S]*?\n---\s*/, "").trim(), 6_000);
  } catch {
    return "";
  }
}

function dongDanhBa(db: DanhBa | null | undefined): string {
  if (!db) return "(không có)";
  const tenDv = new Map(db.don_vi.map((d) => [d.id, d.ten]));
  const dv = db.don_vi.map((d) => d.ten).join("; ");
  const ng = db.nguoi.map((n) => (n.don_vi_id && tenDv.get(n.don_vi_id) ? `${n.ten} (${tenDv.get(n.don_vi_id)})` : n.ten)).join("; ");
  return cat(`Đơn vị: ${dv}\nNgười: ${ng}`, GIOI_HAN_CHU.danh_ba);
}

export const HE_THONG_GOP_Y = `Bạn là người soát báo cáo của SCI công việc (kỹ năng /kiem-tra-mau), đang chạy TỰ ĐỘNG ngay sau khi người dùng tải báo cáo lên.
Hệ thống đã tự kiểm các luật bắt buộc (đúng mẫu, kỳ báo cáo, người lập, nơi nhận, ngày) — KHÔNG nhắc lại các luật đó.
Việc của bạn: góp ý NỘI DUNG mà luật máy không bắt được. Góp ý KHÔNG chặn gửi.
Loại góp ý:
- "muc_trong": mục/ô/cột số liệu còn trống hoặc còn "......" mà theo nội dung lẽ ra phải có số liệu.
- "mau_thuan": số liệu mâu thuẫn — % vượt 100, tổng không khớp các dòng, % tính sai so với hai số, cùng một số liệu ghi khác nhau ở hai mục, hạn đã qua mà báo đúng tiến độ.
- "chinh_ta_ten": tên người/đơn vị viết sai hoặc khác so với DANH BẠ (không nêu các cách viết tắt thông dụng như "SCI ENC" = "SCI E&C").
- "khac": điều đáng lưu ý khác về nội dung.
Luật cứng: không bịa — chỉ nêu điều thấy trong nội dung được đưa; nói rõ chỗ sai; tiếng Việt; ngày dd/mm/yyyy; mỗi thông điệp tối đa 200 ký tự; tối đa ${SO_GOP_Y_TOI_DA} góp ý, quan trọng trước.
CHỈ góp ý điều người nộp SỬA ĐƯỢC ngay trong báo cáo (số sai, mâu thuẫn, thiếu chữ, sai tên, ô bỏ trống…). KHÔNG nêu lời khuyên
quản lý chung chung ("nên theo dõi sát", "cần chú ý", "nên đẩy nhanh") — người nộp không có gì để sửa. KHÔNG nêu chỗ đã đúng / đã khớp.
Gọi bảng / cột / ô bằng TÊN hiện trên báo cáo, KHÔNG viết mã máy (bang_…, du_an, kl_…).
ĐỀ XUẤT SỬA (người nộp bấm Đồng ý là máy ghi thẳng vào file): góp ý nào chỉ vào ĐÚNG MỘT Ô thì ghi vi_tri đủ ô đó
("o:<mã ô>" hoặc "bang:<mã bảng>:<dòng>:<cột>") và PHẢI ghi "sua" = TOÀN BỘ chữ mới nên thay cho cả ô (giữ phần đúng, sửa phần sai),
trừ khi chữ đúng cần số liệu / tên / ngày mà báo cáo và danh bạ không có — khi đó bỏ "sua" (người nộp tự gõ). Không bịa.
ĐẦU RA: CHỈ MỘT đối tượng JSON, không markdown, không chữ nào khác:
{"gop_y":[{"vi_tri":"<một mã trong VỊ TRÍ HỢP LỆ>","loai":"muc_trong|mau_thuan|chinh_ta_ten|khac","thong_diep":"<góp ý>","sua":"<chữ mới cho cả ô — nếu có>"}]}
Không có gì cần góp ý → {"gop_y":[]}`;

/**
 * Chữ của báo cáo cho AI (dùng chung với luật AI — luat/ai/kiem.ts): danh sách VỊ TRÍ HỢP LỆ + các khối
 * ô nhập / mục / bảng gắn mã (đã cắt độ dài). `mau` chỉ cần nhãn ô và bảng.
 */
export function dungNoiDungBaoCao(
  noiDung: Pick<NoiDungWord, "o_nhap" | "bang" | "tieu_de" | "van_ban" | "muc">,
  mau: { dinh_nghia: Pick<MauWord["dinh_nghia"], "o_nhap" | "bang_cong_viec"> },
): { viTri: string[]; khoi: string[] } {
  const nhanO = new Map(mau.dinh_nghia.o_nhap.map((o) => [o.tag, o.nhan]));
  const nhanBang = new Map(mau.dinh_nghia.bang_cong_viec.map((b) => [b.tag, b.nhan]));
  const viTri: string[] = [];
  const oNhap: string[] = [];
  for (const [tag, v] of Object.entries(noiDung.o_nhap)) {
    if (tag === "mau_ma") continue;
    viTri.push(`- o:${tag} (ô ${nhanO.get(tag) ?? tag})`);
    oNhap.push(`${tag} (${nhanO.get(tag) ?? tag}): ${cat(v.replace(/\s*\n\s*/g, " / "), GIOI_HAN_CHU.o)}`);
  }
  const mucs = noiDung.muc?.length ? noiDung.muc : null;
  const phanMuc: string[] = [];
  if (mucs) {
    for (const m of mucs) {
      viTri.push(`- muc:${tenMuc(m.tieu_de)}`);
      phanMuc.push(`## ${m.tieu_de}\n${m.van_ban.trim() ? cat(m.van_ban.trim(), GIOI_HAN_CHU.muc) : "(không có chữ ngoài bảng gắn mã)"}`);
    }
  } else {
    for (const t of noiDung.tieu_de) viTri.push(`- muc:${tenMuc(t)}`);
    phanMuc.push(cat(noiDung.van_ban ?? "", GIOI_HAN_CHU.muc * 3));
  }
  const phanBang: string[] = [];
  for (const [tag, dong] of Object.entries(noiDung.bang)) {
    const cot = Array.from(new Set(dong.flatMap((r) => Object.keys(r))));
    viTri.push(`- bang:${tag}:<dòng 1..${dong.length}>[:<cột>] (bảng ${nhanBang.get(tag) ?? tag}; cột: ${cot.join(", ")})`);
    const chu = dong
      .map((r, i) => {
        const o = Object.entries(r).filter(([, v]) => v.trim() !== "");
        return o.length ? `dòng ${i + 1}: ${o.map(([k, v]) => `${k}=${v.replace(/\s*\n\s*/g, " / ")}`).join("; ")}` : `dòng ${i + 1}: (trống)`;
      })
      .join("\n");
    phanBang.push(`### ${tag} (${nhanBang.get(tag) ?? tag})\n${cat(chu, GIOI_HAN_CHU.bang)}`);
  }
  return {
    viTri,
    khoi: [
      `=== Ô NHẬP GẮN MÃ ===\n${oNhap.join("\n") || "(không có)"}`,
      `=== CÁC MỤC (chữ ngoài ô/bảng gắn mã) ===\n${phanMuc.join("\n\n") || "(không có)"}`,
      `=== BẢNG GẮN MÃ ===\n${phanBang.join("\n\n") || "(không có)"}`,
    ],
  };
}

/** Dựng system + prompt cho AI. Xuất ra để test / script chạy thử. */
export function dungYeuCauGopY(noiDung: NoiDungWord, mau: MauWord, danhBa?: DanhBa | null): { system: string; prompt: string } {
  const { viTri, khoi } = dungNoiDungBaoCao(noiDung, mau);
  const huongDan = huongDanKyNang();
  const system = huongDan ? `${HE_THONG_GOP_Y}\n\n=== HƯỚNG DẪN KỸ NĂNG /kiem-tra-mau (tham khảo; ĐẦU RA vẫn theo JSON ở trên) ===\n${huongDan}` : HE_THONG_GOP_Y;
  const prompt = cat(
    [
      `MẪU: ${mau.ten} (mã ${mau.ma})`,
      `VỊ TRÍ HỢP LỆ (vi_tri phải là một trong các mã này):\n${viTri.join("\n")}`,
      `DANH BẠ (tên người/đơn vị có thật trong hệ thống):\n${dongDanhBa(danhBa)}`,
      ...khoi,
      `Trả về JSON {"gop_y":[...]} như hướng dẫn.`,
    ].join("\n\n"),
    GIOI_HAN_CHU.tong,
  );
  return { system, prompt };
}

// ---------------- Phân tích câu trả lời ----------------

/** Gắn chỗ AI ghi về đúng tag ô / mục / bảng-dòng-cột của báo cáo. Không gắn được → undefined. */
export function ganViTri(cho: unknown, noiDung: NoiDungWord, mau: MauWord): LoiKiemTra["vi_tri"] | undefined {
  if (typeof cho !== "string" || !cho.trim()) return undefined;
  const s = cho.trim();
  const coO = (t: string) => t in noiDung.o_nhap || mau.dinh_nghia.o_nhap.some((o) => o.tag === t);
  let m = /^bang\s*:\s*([\w-]+)\s*(?::\s*(?:dòng|dong)?\s*(\d+))?\s*(?::\s*([\w-]+))?/i.exec(s);
  if (m && (m[1] in noiDung.bang || mau.dinh_nghia.bang_cong_viec.some((b) => b.tag === m![1]))) {
    const dong = m[2] ? Number(m[2]) : undefined;
    const hang = noiDung.bang[m[1]] ?? [];
    const cot = m[3] && hang.some((r) => m![3] in r) ? m[3] : undefined;
    return { bang: m[1], ...(dong && dong >= 1 && dong <= Math.max(hang.length, 1) ? { dong } : {}), ...(cot ? { cot } : {}) };
  }
  m = /^o\s*:\s*([\w-]+)/i.exec(s);
  if (m && coO(m[1])) return { tag: m[1] };
  if (/^[\w-]+$/.test(s) && coO(s)) return { tag: s };
  if (/^[\w-]+$/.test(s) && s in noiDung.bang) return { bang: s };
  // Mục: "muc:<tên>", "Mục IV", "IV. TIẾN ĐỘ THU VỐN…", hoặc một phần tên mục
  const x = s.replace(/^muc\s*:\s*/i, "").replace(/^mục\s+/i, "").trim();
  const dsMuc = (noiDung.muc?.length ? noiDung.muc.map((mm) => mm.tieu_de) : noiDung.tieu_de) ?? [];
  const soLaMa = /^([IVX]+)\b\.?/i.exec(x)?.[1]?.toUpperCase();
  const k = chuanHoaTieuDe(x);
  for (const t of dsMuc) {
    const ten = tenMuc(t);
    const kt = chuanHoaTieuDe(t);
    if (k && (k === kt || (k.length >= 4 && (kt.includes(k) || k.includes(kt))))) return { tag: `muc:${ten}` };
  }
  if (soLaMa) {
    const t = dsMuc.find((tt) => new RegExp(`^\\s*${soLaMa}\\.`, "i").test(tt));
    if (t) return { tag: `muc:${tenMuc(t)}` };
  }
  return undefined;
}

/** Lấy khối JSON trong câu trả lời (chịu được ```json … ``` và chữ thừa quanh). Không có → ném lỗi. */
export function layJson(text: string): unknown {
  const t = text.replace(/```(?:json)?/gi, "").trim();
  try {
    return JSON.parse(t);
  } catch {
    /* thử vớt khối JSON */
  }
  // Khối mở sớm nhất trước ("[{...}]" là mảng, không phải đối tượng đầu tiên bên trong)
  const kieu = ([["{", "}"], ["[", "]"]] as const).slice().sort((x, y) => {
    const a = t.indexOf(x[0]);
    const b = t.indexOf(y[0]);
    return (a < 0 ? Infinity : a) - (b < 0 ? Infinity : b);
  });
  for (const [mo, dong] of kieu) {
    const a = t.indexOf(mo);
    const b = t.lastIndexOf(dong);
    if (a >= 0 && b > a) {
      try {
        return JSON.parse(t.slice(a, b + 1));
      } catch {
        /* thử kiểu khác */
      }
    }
  }
  throw new Error("AI trả lời không đúng JSON");
}

/** Phân tích câu trả lời của AI → danh sách góp ý (mức goi_y). Sai định dạng tổng thể → ném lỗi; mục lẻ sai → bỏ mục đó. */
/** Câu AI tự kết luận là đúng / khớp — người nộp không có gì để sửa. */
const KHONG_CAN_SUA = /không (có )?(gì|điều gì) cần (sửa|góp ý|chỉnh)|không cần sửa|không có vấn đề/i;

export function phanTichGopY(text: string, noiDung: NoiDungWord, mau: MauWord): GopYAi[] {
  const j = layJson(text);
  const ds = Array.isArray(j) ? j : j && typeof j === "object" && Array.isArray((j as { gop_y?: unknown }).gop_y) ? (j as { gop_y: unknown[] }).gop_y : null;
  if (!ds) throw new Error('AI trả lời JSON thiếu mảng "gop_y"');
  const kq: GopYAi[] = [];
  const daCo = new Set<string>();
  for (const x of ds) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const td = [o.thong_diep, o.noi_dung, o.message].find((v) => typeof v === "string" && v.trim()) as string | undefined;
    if (!td) continue;
    const thongDiep = thayMaBangTen(td.trim().replace(/\s+/g, " "), mau).slice(0, 500);
    if (KHONG_CAN_SUA.test(thongDiep)) continue; // AI tự nói "khớp, không cần sửa" → không phải góp ý (soát 30/09)
    const loai: LoaiGopY = (LOAI_GOP_Y as readonly string[]).includes(String(o.loai)) ? (o.loai as LoaiGopY) : "khac";
    const cho = [o.vi_tri, o.muc, o.cho].find((v) => typeof v === "string" && v.trim()) as string | undefined;
    const viTri = ganViTri(cho, noiDung, mau);
    const khoa = `${loai}|${thongDiep}`;
    if (daCo.has(khoa)) continue;
    daCo.add(khoa);
    const deXuat = docDeXuat(o, viTri);
    kq.push({
      luat: "noi_dung_ai",
      muc: "goi_y",
      loai,
      thong_diep: thongDiep,
      ...(viTri ? { vi_tri: viTri } : cho ? { cho: cho.slice(0, 120) } : {}),
      ...(deXuat ? { de_xuat: deXuat } : {}),
    });
    if (kq.length >= SO_GOP_Y_TOI_DA) break;
  }
  return kq;
}

/**
 * Lưới an toàn luật 30 ("không bao giờ chỉ viết mã", soát 29/09): AI vẫn có lúc viết mã máy của bảng / cột / ô
 * ("Bảng bang_su_co", "cột mat_agc_tuan") → thay bằng tên hiện trên báo cáo. Chỉ thay mã có dấu gạch dưới (không đụng chữ thường).
 */
export function thayMaBangTen(chu: string, mau: MauWord): string {
  const dn = mau.dinh_nghia as unknown as { o_nhap?: { tag: string; nhan: string }[]; bang?: { tag: string; nhan: string; cot?: { tag: string; nhan: string }[] }[] };
  const ten = new Map<string, string>();
  for (const b of dn.bang ?? []) {
    ten.set(b.tag, b.nhan);
    for (const c of b.cot ?? []) if (!ten.has(c.tag)) ten.set(c.tag, c.nhan);
  }
  for (const o of dn.o_nhap ?? []) if (!ten.has(o.tag)) ten.set(o.tag, o.nhan);
  const ma = [...ten.keys()].filter((k) => /^[a-z0-9]+(?:_[a-z0-9]+)+$/.test(k)).sort((a, b) => b.length - a.length);
  if (!ma.length) return chu;
  const re = new RegExp(`(?<![A-Za-z0-9_])(${ma.join("|")})(?![A-Za-z0-9_])`, "g"); // mã chỉ gồm a-z 0-9 _
  // "du_an=\"NM 2\"" (AI chép kiểu máy) → "\"Dự án\" ghi \"NM 2\""
  const reGan = new RegExp(`(?<![A-Za-z0-9_])(${ma.join("|")})\\s*=\\s*(?=\\S)`, "g");
  return chu.replace(reGan, (_, k: string) => `"${ten.get(k)}" ghi `).replace(re, (k) => `"${ten.get(k)}"`);
}

// ---------------- Gọi AI ----------------

/** Chờ tối đa `ms`; quá hạn thì ném lỗi (lời hứa gốc vẫn chạy nhưng bị bỏ qua, không rò lỗi). */
export function coHan<T>(p: Promise<T>, ms: number, thongDiep: string): Promise<T> {
  p.catch(() => undefined);
  let hen: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    p,
    new Promise<never>((_, loi) => {
      hen = setTimeout(() => loi(new Error(thongDiep)), ms);
    }),
  ]).finally(() => clearTimeout(hen));
}

/** Gọi AI góp ý một báo cáo. Ném lỗi khi AI lỗi / quá thời gian / trả sai JSON — nơi gọi phải bắt. */
export async function gopYBangAi(noiDung: NoiDungWord, mau: MauWord, tuyChon: TuyChonGopYAi = {}): Promise<GopYAi[]> {
  const { system, prompt } = dungYeuCauGopY(noiDung, mau, tuyChon.danhBa);
  const ms = tuyChon.thoiGianChoMs ?? THOI_GIAN_CHO_GOP_Y_MS;
  const text = await coHan(
    runAIGan("lib/kiem-tra/gop-y-ai", prompt, system, undefined, tuyChon.model, ms, true),
    choCaHang(ms),
    `AI không trả lời sau ${Math.round((choCaHang(ms)) / 1000)} giây — bỏ qua góp ý`,
  );
  return phanTichGopY(text, noiDung, mau);
}
