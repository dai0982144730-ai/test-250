// ============================================================
// luat/ai/dich.ts — DỊCH CÂU LUẬT tiếng Việt → đề xuất luật (DeXuatLuat). CHỈ SERVER.
// Ưu tiên DẠNG LUẬT CODE (LOAI_LUAT): AI chọn dạng + điền tham số theo định nghĩa mẫu, kiểm lại bằng
// kiemThamSo; sai → hỏi lại AI một lần kèm lỗi; vẫn sai → hạ xuống LUẬT AI kèm cảnh báo.
// Câu quá đơn giản ("Ngày lập phải có giá trị") dịch thẳng, không cần AI. Không bao giờ ném lỗi.
// ============================================================
import type { Q } from "@/lib/db";
import { getAIConfig, runAIGan } from "@/lib/ai/providers";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { coHan, layJson } from "@/lib/kiem-tra/gop-y-ai";
import { docThanhLoi, kiemThamSo, LOAI_LUAT } from "../loai-luat";
import type { CachKiem, DeXuatLuat, MucLuat, ThamSoDinhNghia } from "../types";
import type { DinhNghiaMauRutGon } from "../types-them";
import { dongMau, napMauApDung } from "./mau";

/** Thời gian chờ tối đa cho MỘT lượt hỏi AI khi dịch (dịch có thể hỏi 2 lượt). */
export const THOI_GIAN_CHO_DICH_MS = 60_000;
const CACH_KIEM: CachKiem[] = ["code", "ai", "ca_hai"];
const MUC: MucLuat[] = ["chan", "canh_bao", "goi_y"];

export const HE_THONG_DICH = `Bạn là bộ DỊCH LUẬT KIỂM TRA của SCI công việc. Người dùng viết MỘT luật kiểm tra báo cáo bằng câu tiếng Việt.
Việc của bạn: dịch câu đó sang MỘT DẠNG LUẬT CODE có sẵn (chạy chắc, không tốn AI, được chặn gửi) nếu được.
Chỉ khi không dạng nào diễn đạt đúng, hoặc dữ liệu cần kiểm KHÔNG nằm trong ô / bảng / cột ĐÃ GẮN MÃ của mẫu, mới giữ làm LUẬT AI (AI đọc báo cáo và phán; chỉ cảnh báo).
Quy tắc:
- Chỉ dùng mã dạng luật, mã ô, mã bảng, mã cột, tiêu đề mục CÓ TRONG danh sách được đưa. Tuyệt đối không bịa mã.
- Tham số kiểu "o": tag ô (chuỗi). "bang": tag bảng. "cot": tag cột thuộc bảng ở tham số theo_bang. "so": số. "chu": chuỗi. "bool": true/false.
  "danh_sach": mảng chuỗi. "muc": tiêu đề mục đúng chữ trong danh sách. "phep_so": một trong "=", "!=", "<", "<=", ">", ">=".
  "tham_chieu": {"o":"<tag ô>"} | {"bang":"<tag bảng>","cot":"<tag cột>"} | {"ky":"tu"|"den"|"nop"} (ngày đầu / cuối kỳ báo cáo; ngày nộp báo cáo do máy ghi — mẫu không còn ô Ngày lập).
  "dieu_kien": {"tham_chieu":<tham chiếu>,"phep":"co_gia_tri|trong|bang|khac|chua|khong_chua|=|!=|<|<=|>|>=","gia_tri":<chuỗi hoặc số nếu phép cần>}.
- Dữ liệu nằm ở chỗ CHƯA gắn mã (vd bảng số liệu viết tự do trong một mục) → chọn "ai" và ghi vào canh_bao lý do, vd
  "Bảng KPI chưa được gắn mã trong mẫu nên code không đọc được — gắn mã bảng rồi dịch lại để chặn gửi được".
- Giữ đúng nghĩa câu luật: KHÔNG chuyển sang bảng / cột khác chỗ câu luật nói tới (vd câu nói về kiến nghị thì không kiểm bảng Công việc thay);
  chỗ đó chưa có cột gắn mã thì chọn "ai" và nói rõ cần gắn mã cột nào trong canh_bao.
- Phép tính giữa các số (Lệch = TH − KH, % = A ÷ B, Tổng = A + B + C, lũy kế ≥ kỳ) → "tinh_toan": phep_tinh là một trong
  "hieu","tong","tich","thuong","phan_tram","chi_a"; A/B là tham chiếu ("a","b") HOẶC số ("a_so","b_so"), không cả hai;
  cột thứ ba trở đi của phép tổng ghi vào "them" (mảng tag cột cùng bảng); "so_sanh" (phep_so) khi câu nói "không nhỏ hơn / không vượt".
  Ví dụ "Cột Lệch bằng TH trừ KH": {"ket_qua":{"bang":"bang_tien_do","cot":"lech"},"phep_tinh":"hieu","a":{"bang":"bang_tien_do","cot":"th_luy_ke"},"b":{"bang":"bang_tien_do","cot":"kh_luy_ke"},"sai_so":0.1}.
  Dòng TỔNG bằng tổng các dòng → "dong_tong": {"bang":"<tag bảng>","cot":["<tag cột>",…],"nhan":["TỔNG"]}. Luật tính toán chọn muc "canh_bao" trừ khi câu nói rõ phải chặn.
- Luật cần đọc hiểu nghĩa (nêu rõ nguyên nhân, viết hợp lý, đủ ý…) → "ai". "ca_hai": code kiểm được một phần, phần còn lại phải đọc hiểu (hiếm dùng).
- huong_dan_ai: LUÔN ghi — câu luật viết lại rõ ràng cho AI kiểm: xem chỗ nào, thế nào là đạt / không đạt.
- ap_dung: mảng mã mẫu mà luật có nghĩa (trong các mẫu được đưa), hoặc "tat_ca" nếu đúng cho mọi mẫu được đưa. Thu hẹp về các mẫu có đủ ô/bảng/cột cần dùng.
- muc: luật code → "chan" nếu vi phạm là sai rõ ràng, "canh_bao" nếu chỉ nên lưu ý; luật AI → "canh_bao".
- ten: tên ngắn (≤ 60 ký tự). nhom: nhóm hiển thị, vd "Ô chung", "Bảng Công việc", "Bảng Kiến nghị", "Số liệu", "Nội dung".
- ly_do: một câu vì sao chọn dạng này (tiếng Việt).
ĐẦU RA: CHỈ MỘT đối tượng JSON, không markdown, không chữ nào khác:
{"cach_kiem":"code|ai|ca_hai","loai":"<mã dạng luật>"|null,"tham_so":{...}|null,"huong_dan_ai":"...","ten":"...","nhom":"...","ap_dung":["form-…"]|"tat_ca","muc":"chan|canh_bao|goi_y","ly_do":"...","canh_bao":["..."]}`;

/** Câu trả lời của AI (đã chuẩn hóa kiểu). */
export interface TraLoiDich {
  cach_kiem: CachKiem | null;
  loai: string | null;
  tham_so: Record<string, unknown> | null;
  huong_dan_ai: string | null;
  ten: string | null;
  nhom: string | null;
  ap_dung: string[] | "tat_ca" | null;
  muc: MucLuat | null;
  ly_do: string | null;
  canh_bao: string[];
}

const chuoi = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const catChu = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function dongThamSo(t: ThamSoDinhNghia): string {
  const kieu = t.kieu === "cot" && t.theo_bang ? `cot của tham số ${t.theo_bang}` : t.kieu;
  return `${t.khoa} (${kieu}${t.bat_buoc ? ", bắt buộc" : ""})${t.nhan ? ` — ${t.nhan}` : ""}${t.goi_y ? `; gợi ý: ${t.goi_y}` : ""}`;
}

/** Danh sách dạng luật code cho AI (mã, mô tả, ví dụ, tham số). */
export function dongLoaiLuat(): string {
  const ds = Object.values(LOAI_LUAT);
  if (!ds.length) return "(chưa có dạng luật code nào — chọn \"ai\")";
  return ds
    .map((d) => `- ${d.ma} — ${d.ten}: ${d.mo_ta}${d.vi_du ? ` Ví dụ: "${d.vi_du}".` : ""}\n    Tham số: ${d.tham_so.map(dongThamSo).join(" | ") || "(không có)"}`)
    .join("\n");
}

export function dungYeuCauDich(cau: string, maus: DinhNghiaMauRutGon[], apDung: string[] | "tat_ca"): { system: string; prompt: string } {
  const prompt = [
    `CÂU LUẬT: "${cau}"`,
    `NGƯỜI DÙNG CHỌN ÁP DỤNG CHO: ${apDung === "tat_ca" ? "tất cả mẫu" : apDung.join(", ")}`,
    `=== CÁC DẠNG LUẬT CODE ===\n${dongLoaiLuat()}`,
    `=== ĐỊNH NGHĨA CÁC MẪU ÁP DỤNG (chỉ những ô/bảng/cột dưới đây là code đọc được) ===\n${maus.map(dongMau).join("\n\n") || "(không có mẫu)"}`,
    `Trả về JSON như hướng dẫn.`,
  ].join("\n\n");
  return { system: HE_THONG_DICH, prompt };
}

/** Đọc câu trả lời của AI. JSON hỏng → ném lỗi. */
export function docTraLoiDich(text: string): TraLoiDich {
  const j = layJson(text);
  if (!j || typeof j !== "object" || Array.isArray(j)) throw new Error("AI trả lời không phải một đối tượng JSON");
  const o = j as Record<string, unknown>;
  const ck = chuoi(o.cach_kiem) as CachKiem | null;
  const ad = o.ap_dung;
  return {
    cach_kiem: ck && CACH_KIEM.includes(ck) ? ck : null,
    loai: chuoi(o.loai),
    tham_so: o.tham_so && typeof o.tham_so === "object" && !Array.isArray(o.tham_so) ? (o.tham_so as Record<string, unknown>) : null,
    huong_dan_ai: chuoi(o.huong_dan_ai),
    ten: chuoi(o.ten),
    nhom: chuoi(o.nhom),
    ap_dung: ad === "tat_ca" ? "tat_ca" : Array.isArray(ad) ? ad.filter((x): x is string => typeof x === "string") : null,
    muc: MUC.includes(o.muc as MucLuat) ? (o.muc as MucLuat) : null,
    ly_do: chuoi(o.ly_do),
    canh_bao: Array.isArray(o.canh_bao) ? o.canh_bao.map(chuoi).filter((x): x is string => !!x).slice(0, 6) : [],
  };
}

/** Mẫu áp dụng cuối cùng: gợi ý của AI thu hẹp trong lựa chọn của người dùng. */
function chonApDung(goiY: string[] | "tat_ca" | null, nguoiDung: string[] | "tat_ca", maus: DinhNghiaMauRutGon[]): string[] | "tat_ca" {
  const coThat = new Set(maus.map((m) => m.ma));
  if (!goiY || goiY === "tat_ca") return nguoiDung;
  const ds = goiY.filter((m) => coThat.has(m) && (nguoiDung === "tat_ca" || nguoiDung.includes(m)));
  return ds.length ? Array.from(new Set(ds)) : nguoiDung;
}

const mauCua = (apDung: string[] | "tat_ca", maus: DinhNghiaMauRutGon[]) => (apDung === "tat_ca" ? maus : maus.filter((m) => apDung.includes(m.ma)));

/** Kiểm phần code của đề xuất. `nem` = kiemThamSo ném lỗi (không nên hỏi lại AI). */
export function kiemPhanCode(loai: string | null, thamSo: Record<string, unknown> | null, maus: DinhNghiaMauRutGon[]): { loi: string[]; nem: boolean } {
  if (!loai) return { loi: ["Thiếu mã dạng luật (loai)"], nem: false };
  if (!LOAI_LUAT[loai]) return { loi: [`Không có dạng luật "${loai}" — chỉ dùng mã trong danh sách`], nem: false };
  if (!thamSo) return { loi: ["Thiếu tham số (tham_so)"], nem: false };
  const loi: string[] = [];
  try {
    if (!maus.length) loi.push(...kiemThamSo(loai, thamSo, null));
    for (const m of maus) for (const e of kiemThamSo(loai, thamSo, m)) loi.push(maus.length > 1 ? `Mẫu ${m.ma}: ${e}` : e);
  } catch (e) {
    return { loi: [`Không kiểm được tham số: ${e instanceof Error ? e.message : String(e)}`], nem: true };
  }
  return { loi: Array.from(new Set(loi)), nem: false };
}

function docLoi(loai: string, thamSo: Record<string, unknown>, mau: DinhNghiaMauRutGon | null): string | null {
  try {
    return docThanhLoi(loai, thamSo, mau) || null;
  } catch {
    return null;
  }
}

/** Đề xuất LUẬT AI (không dịch được sang code / AI lỗi). */
function deXuatAi(cau: string, t: TraLoiDich | null, apDung: string[] | "tat_ca", canhBao: string[], giaiThich?: string): DeXuatLuat {
  return {
    cach_kiem: "ai",
    loai: null,
    tham_so: null,
    huong_dan_ai: t?.huong_dan_ai || cau,
    ten_goi_y: catChu(t?.ten || cau, 80),
    nhom_goi_y: t?.nhom ?? "Nội dung",
    ap_dung_goi_y: apDung,
    muc_goi_y: t?.muc === "goi_y" ? "goi_y" : "canh_bao",
    giai_thich: giaiThich || t?.ly_do || "Luật cần đọc hiểu nội dung nên để AI kiểm (chỉ cảnh báo, không chặn gửi).",
    canh_bao: Array.from(new Set(canhBao)),
  };
}

/** Đề xuất từ câu trả lời hợp lệ của AI. */
function deXuatTu(cau: string, t: TraLoiDich, apDung: string[] | "tat_ca", maus: DinhNghiaMauRutGon[]): DeXuatLuat {
  if (t.cach_kiem === "ai" || !t.cach_kiem) return deXuatAi(cau, t, apDung, t.canh_bao);
  const loai = t.loai as string;
  const ts = t.tham_so as Record<string, unknown>;
  const loi = docLoi(loai, ts, mauCua(apDung, maus)[0] ?? null);
  const giaiThich = [loi, t.ly_do].filter(Boolean).join(" — ") || `Dạng luật code "${LOAI_LUAT[loai]?.ten ?? loai}"`;
  return {
    cach_kiem: t.cach_kiem,
    loai,
    tham_so: ts,
    huong_dan_ai: t.cach_kiem === "ca_hai" ? t.huong_dan_ai || cau : t.huong_dan_ai,
    ten_goi_y: catChu(t.ten || cau, 80),
    nhom_goi_y: t.nhom,
    ap_dung_goi_y: apDung,
    muc_goi_y: t.muc ?? "chan",
    giai_thich: giaiThich,
    canh_bao: t.canh_bao,
  };
}

// ---------------- Đường không cần AI ----------------

const bo = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/["“”'‘’]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const MAU_PHAI_CO = /^(?:o |muc )?(.+?) (?:phai co gia tri|phai co noi dung|phai co|phai duoc dien|phai dien|bat buoc phai co|bat buoc phai dien|bat buoc|khong duoc de trong|khong duoc bo trong)$/;
const MAU_PHAI_DIEN = /^(?:phai|bat buoc) (?:co|dien|ghi) (?:o |muc )?(.+)$/;

/** Tham số đơn (một chỗ) của một dạng luật; dạng có tham số bắt buộc khác → null. */
function thamSoDon(loai: string, kieu: ThamSoDinhNghia["kieu"][], giaTri: (k: ThamSoDinhNghia["kieu"]) => unknown): Record<string, unknown> | null {
  const d = LOAI_LUAT[loai];
  if (!d) return null;
  const p = d.tham_so.find((t) => kieu.includes(t.kieu));
  if (!p || d.tham_so.some((t) => t !== p && t.bat_buoc)) return null;
  return { [p.khoa]: giaTri(p.kieu) };
}

/**
 * Câu kiểu "<ô / mục> phải có giá trị" → o_co_gia_tri / muc_co_noi_dung, không gọi AI.
 * Không chắc (không khớp đúng nhãn, dạng luật chưa có, kiểm tham số lỗi) → null để hỏi AI.
 */
export function dichKhongCanAi(cau: string, maus: DinhNghiaMauRutGon[], apDung: string[] | "tat_ca"): DeXuatLuat | null {
  const s = bo(cau).replace(/[.!;:]+$/, "").trim();
  if (!s || s.split(" ").length > 12 || !maus.length) return null;
  const m = MAU_PHAI_CO.exec(s) ?? MAU_PHAI_DIEN.exec(s);
  if (!m) return null;
  const chu = m[1].trim();
  // Ô nhập: khớp đúng nhãn hoặc tag (một tag duy nhất)
  const theoO = maus.flatMap((mm) => mm.o_nhap.filter((o) => bo(o.nhan) === chu || o.tag === chu).map((o) => ({ mau: mm.ma, tag: o.tag, nhan: o.nhan })));
  const theoMuc = maus.flatMap((mm) => mm.muc_bat_buoc.filter((t) => bo(t) === chu).map((t) => ({ mau: mm.ma, t })));
  let loai: string;
  let ts: Record<string, unknown> | null;
  let dsMau: string[];
  let ten: string;
  let nhom: string;
  if (theoO.length && new Set(theoO.map((x) => x.tag)).size === 1) {
    const tag = theoO[0].tag;
    loai = "o_co_gia_tri";
    ts = thamSoDon(loai, ["o", "tham_chieu"], (k) => (k === "o" ? tag : { o: tag }));
    dsMau = Array.from(new Set(theoO.map((x) => x.mau)));
    ten = `${theoO[0].nhan} phải có giá trị`;
    nhom = "Ô chung";
  } else if (!theoO.length && theoMuc.length && new Set(theoMuc.map((x) => x.t)).size === 1) {
    loai = "muc_co_noi_dung";
    ts = thamSoDon(loai, ["muc"], () => theoMuc[0].t);
    dsMau = Array.from(new Set(theoMuc.map((x) => x.mau)));
    ten = `Mục "${theoMuc[0].t}" phải có nội dung`;
    nhom = "Nội dung";
  } else return null;
  if (!ts) return null;
  const ad: string[] | "tat_ca" = dsMau.length === maus.length ? apDung : dsMau;
  const kiem = kiemPhanCode(loai, ts, mauCua(ad, maus));
  if (kiem.loi.length) return null;
  return {
    cach_kiem: "code",
    loai,
    tham_so: ts,
    huong_dan_ai: null,
    ten_goi_y: catChu(ten, 80),
    nhom_goi_y: nhom,
    ap_dung_goi_y: ad,
    muc_goi_y: "chan",
    giai_thich: `${docLoi(loai, ts, mauCua(ad, maus)[0] ?? null) ?? ten} — câu đơn giản, dịch thẳng không cần AI.`,
    canh_bao: ad !== apDung ? [`Chỉ áp dụng cho mẫu có chỗ này: ${(ad as string[]).join(", ")}`] : [],
  };
}

// ---------------- Dịch ----------------

export interface TuyChonDich {
  model?: string;
  thoiGianChoMs?: number;
}

async function hoi(prompt: string, system: string, tuy: TuyChonDich): Promise<string> {
  const ms = tuy.thoiGianChoMs ?? THOI_GIAN_CHO_DICH_MS;
  return coHan(runAIGan("lib/luat/ai/dich", prompt, system, undefined, tuy.model, ms), ms, `AI không trả lời sau ${Math.round(ms / 1000)} giây`);
}

/** Dịch với danh sách mẫu đã nạp (thuần phần gọi AI — test / script dùng thẳng). */
export async function dichVoiMau(cau: string, maus: DinhNghiaMauRutGon[], apDung: string[] | "tat_ca", tuy: TuyChonDich = {}): Promise<DeXuatLuat> {
  const nhanh = dichKhongCanAi(cau, maus, apDung);
  if (nhanh) return nhanh;
  if (getAIConfig().mode === "off") return deXuatAi(cau, null, apDung, ["Kết nối AI đang tắt nên chưa dịch được sang luật code — tạm giữ làm luật AI (chỉ cảnh báo)"]);

  const { system, prompt } = dungYeuCauDich(cau, maus, apDung);
  let t: TraLoiDich | null = null;
  let loi: string[] = [];
  let apDungCuoi = apDung;
  for (let lan = 0; lan < 2; lan++) {
    let traLoi: string;
    try {
      const p =
        lan === 0
          ? prompt
          : `${prompt}\n\n=== LẦN TRƯỚC ===\nBạn đã trả lời: ${t ? JSON.stringify(t) : "(không phải JSON hợp lệ)"}\nKIỂM TRA BÁO LỖI:\n${loi
              .slice(0, 12)
              .map((e) => `- ${e}`)
              .join("\n")}\nHãy sửa: chỉ dùng mã có trong danh sách, thu hẹp ap_dung về các mẫu có đủ ô/bảng/cột. Nếu dữ liệu không nằm trong ô/bảng/cột gắn mã thì chọn "ai" và giải thích trong canh_bao. Trả về đúng JSON như hướng dẫn.`;
      traLoi = await hoi(p, system, tuy);
    } catch (e) {
      const ly = e instanceof Error ? e.message : String(e);
      return deXuatAi(cau, t, apDungCuoi, [`Không gọi được AI để dịch (${ly}) — tạm giữ làm luật AI (chỉ cảnh báo)`]);
    }
    try {
      t = docTraLoiDich(traLoi);
    } catch (e) {
      t = null;
      loi = [e instanceof Error ? e.message : String(e)];
      continue;
    }
    apDungCuoi = chonApDung(t.ap_dung, apDung, maus);
    if (t.cach_kiem === "ai" || !t.cach_kiem) return deXuatTu(cau, { ...t, cach_kiem: "ai" }, apDungCuoi, maus);
    const kiem = kiemPhanCode(t.loai, t.tham_so, mauCua(apDungCuoi, maus));
    if (!kiem.loi.length) return deXuatTu(cau, t, apDungCuoi, maus);
    loi = kiem.loi;
    if (kiem.nem) break;
  }
  const dang = t?.loai && LOAI_LUAT[t.loai] ? ` "${LOAI_LUAT[t.loai].ten}"` : "";
  return deXuatAi(
    cau,
    t,
    apDungCuoi,
    [
      `Chưa dịch được sang luật code${dang}: ${loi.slice(0, 4).join("; ")}${loi.length > 4 ? "; …" : ""}`,
      "Thường do ô / bảng / cột cần kiểm chưa được gắn mã trong mẫu nên code không đọc được — tạm giữ làm luật AI (chỉ cảnh báo).",
      ...(t?.canh_bao ?? []),
    ],
    "Không dịch được sang dạng luật code nên giữ làm luật AI: AI đọc báo cáo và phán đạt / không đạt (mặc định chỉ cảnh báo).",
  );
}

/** Hợp đồng: dịch câu luật (nạp mẫu áp dụng + model từ cấu hình). Không ném. */
export async function dichCau(q: Q, cau: string, apDung: string[] | "tat_ca"): Promise<DeXuatLuat> {
  const c = (cau ?? "").trim();
  const ad: string[] | "tat_ca" = apDung === "tat_ca" || !Array.isArray(apDung) || !apDung.length ? "tat_ca" : apDung;
  try {
    const maus = await napMauApDung(q, ad);
    let model: string | undefined;
    try {
      model = (await layCauHinh(q, "ai")).model_mac_dinh || undefined;
    } catch {
      model = undefined;
    }
    return await dichVoiMau(c, maus, ad, { model });
  } catch (e) {
    return deXuatAi(c, null, ad, [`Lỗi khi dịch (${e instanceof Error ? e.message : String(e)}) — tạm giữ làm luật AI`]);
  }
}
