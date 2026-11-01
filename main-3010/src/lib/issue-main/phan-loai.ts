// ============================================================
// PHÂN LOẠI LẠI + CHỌN 5 VIỆC "CẦN ANH XEM" — phần THUẦN
// Nguồn: PLAN-MAIN-AGENT 8b.1 (tab Phân loại lại) · 8b.3 (chốt BD) · 8b.3b
//
// PHÂN VAI, nguyên văn Mr. Đại 04/09: "nó cần sử dụng LLM chứ không phải code
// để phân. Chỉ LLM mới phân tích phân nhóm và đánh giá được."
//   · Xếp vào nhóm nào     → LLM (đọc nội dung viết bằng tiếng người)
//   · Con số từng issue    → CODE, và là số agent chủ ĐÃ tính, Main lấy nguyên
//   · Xếp ai trước ai sau  → LLM, kèm LÝ DO, không có công thức quy đổi
//
// File này giữ phần code làm được và kiểm được: dựng câu hỏi, bóc câu trả lời,
// áp kết quả vào đống issue. Bản thân lời gọi LLM nằm ở `chay-llm.ts` vì nó
// đụng máy chủ.
//
// File THUẦN — không đụng node:fs, màn hình client import được (luật 10).
// ============================================================

import {
  MOI_NHOM,
  NHAN_NHOM,
  MO_TA_NHOM,
  SO_VIEC_CAN_XEM,
  TAM_NHOM,
  laNhomHopLe,
  locIssue,
  type IssueMain,
  type NhomChuDe,
} from "./model";
import { LUAT_MA_KEM_TEN } from "@/lib/chung/ma-kem-ten";
import { LUAT_NHANH_CHAM_THEO_NGAY } from "@/lib/chung/luat-nhanh-cham";
import { fmtSo } from "@/lib/format"; // chuẩn số Việt Nam (chốt 130): số đưa AI đọc viết «1.200.000.000», «1,5»

interface Tho {
  [k: string]: unknown;
}

function chuoi(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Bóc mảng JSON ra khỏi câu trả lời LLM (nó hay bọc trong ```json …```) */
function bocMang(raw: string): unknown[] | null {
  const s = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const dau = s.indexOf("[");
  const cuoi = s.lastIndexOf("]");
  if (dau < 0 || cuoi <= dau) return null;
  try {
    const v: unknown = JSON.parse(s.slice(dau, cuoi + 1));
    return Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// A. PHÂN LOẠI LẠI — xếp đống issue lẫn lộn vào 8 nhóm
// ─────────────────────────────────────────────────────────────

export const HE_THONG_PHAN_LOAI =
  "Bạn xếp issue của một ban quản lý dự án điện vào các nhóm chủ đề mà lãnh đạo quan tâm. " +
  "Chỉ trả về JSON, không giải thích thêm. Không bịa issue không có trong danh sách. " +
  "Không tự thêm nhóm mới ngoài danh sách được cho. " +
  LUAT_MA_KEM_TEN;

/** Câu hỏi gửi LLM — liệt kê issue kèm tám nhóm và định nghĩa từng nhóm */
export function dungPromptPhanLoai(ds: IssueMain[]): string {
  const nhom = TAM_NHOM.map(
    (n, k) => `${k + 1}. "${n}" — ${NHAN_NHOM[n]}: ${MO_TA_NHOM[n]}`
  ).join("\n");
  const dong = locIssue(ds)
    .nhan.map(
      (i) =>
        `- id=${i.id} | agent=${i.tenAgentChu} | ${i.tieuDe}${i.moTa ? ` — ${i.moTa}` : ""}`
    )
    .join("\n");
  return (
    `TÁM NHÓM CHỦ ĐỀ:\n${nhom}\n` +
    `Không hợp nhóm nào thì ghi "khac" — KHÔNG tự đặt nhóm mới.\n\n` +
    `ĐỐNG ISSUE CẦN XẾP:\n${dong}\n\n` +
    `Trả về đúng khuôn JSON, MỘT issue một dòng, mỗi issue CHỈ MỘT nhóm chính:\n` +
    `[{"id":"ISS-…","nhomChinh":"cod","nhomPhu":["duong-gang"],"ghiChu":"một câu vì sao xếp thế"}]\n` +
    `"nhomPhu" là nhóm mà lãnh đạo mở tab đó cũng cần thấy issue này; để mảng rỗng nếu không có.`
  );
}

export interface DongPhanLoai {
  id: string;
  nhomChinh: NhomChuDe;
  nhomPhu: NhomChuDe[];
  ghiChu: string;
}

/**
 * Bóc câu trả lời phân loại.
 *
 * Dòng thiếu `id` thì bỏ — không biết xếp cho ai. Nhóm lạ (LLM tự đặt tên
 * nhóm thứ chín) thì về "khac", vì mục 8b.3 chốt: AI KHÔNG tự thêm nhóm.
 */
export function docTraLoiPhanLoai(raw: string): DongPhanLoai[] {
  const mang = bocMang(raw);
  if (mang === null) return [];
  const ra: DongPhanLoai[] = [];
  for (const x of mang) {
    if (x === null || typeof x !== "object") continue;
    const o = x as Tho;
    const id = chuoi(o.id);
    if (id === "") continue;
    const chinh: NhomChuDe = laNhomHopLe(o.nhomChinh) ? o.nhomChinh : "khac";
    const phu: NhomChuDe[] = [];
    if (Array.isArray(o.nhomPhu)) {
      for (const p of o.nhomPhu) {
        // Nhóm phụ trùng nhóm chính là thừa — thẻ đã nằm sẵn ở tab đó rồi
        if (laNhomHopLe(p) && p !== chinh && !phu.includes(p)) phu.push(p);
      }
    }
    ra.push({ id, nhomChinh: chinh, nhomPhu: phu, ghiChu: chuoi(o.ghiChu) });
  }
  return ra;
}

/**
 * Áp kết quả phân loại vào đống issue.
 *
 * Issue LLM không nhắc tới thì GIỮ NGUYÊN nhóm cũ (nếu đã có) — chạy lại phân
 * loại mà LLM trả thiếu vài dòng thì không được vì thế mà xoá trắng công phân
 * loại lần trước.
 */
export function apDungPhanLoai(ds: IssueMain[], dong: DongPhanLoai[]): IssueMain[] {
  const bang = new Map<string, DongPhanLoai>();
  for (const d of dong) bang.set(d.id, d);
  return ds.map((i) => {
    const d = bang.get(i.id);
    if (!d) return i;
    return { ...i, nhomChinh: d.nhomChinh, nhomPhu: d.nhomPhu };
  });
}

/** Issue chưa được LLM xếp lần nào — số này hiện trên tab Phân loại lại */
export function chuaPhanLoai(ds: IssueMain[]): IssueMain[] {
  return locIssue(ds).nhan.filter((i) => !i.daDong && !laNhomHopLe(i.nhomChinh));
}

// ─────────────────────────────────────────────────────────────
// B. TAB ⭐ "CẦN ANH XEM" — 5 việc, mỗi việc MỘT CÂU lý do
// ─────────────────────────────────────────────────────────────

export const HE_THONG_CAN_XEM =
  "Bạn chọn ra việc mà Giám đốc Ban quản lý dự án phải tự xem, trong một đống issue. " +
  "⛔ TUYỆT ĐỐI KHÔNG chấm điểm, không cho thang 0–100, không xếp hạng bằng số. " +
  "Mỗi việc chỉ kèm MỘT CÂU nói vì sao nó đáng xem. Chỉ trả về JSON. " +
  LUAT_MA_KEM_TEN +
  " " +
  LUAT_NHANH_CHAM_THEO_NGAY;

/** Câu hỏi chọn 5 việc — nói rõ ba loại lý do thường dùng (mục 8b.3b) */
export function dungPromptCanAnhXem(ds: IssueMain[], gioiHan = SO_VIEC_CAN_XEM): string {
  const dong = locIssue(ds)
    .nhan.filter((i) => !i.daDong)
    .map(
      (i) =>
        `- id=${i.id} | ${i.tieuDe} | số ngày ảnh hưởng: ${
          i.soNgayAnhHuong === null ? "chưa có số liệu" : fmtSo(i.soNgayAnhHuong)
        } | tiền: ${i.tienAnhHuongVnd === null ? "chưa có số liệu" : fmtSo(i.tienAnhHuongVnd)} | nguồn: ${i.nguonDuLieu}`
    )
    .join("\n");
  return (
    `ĐỐNG ISSUE ĐANG MỞ:\n${dong}\n\n` +
    `Chọn ĐÚNG ${gioiHan} việc nặng nhất xuyên suốt các nhóm chủ đề.\n` +
    `Ba loại lý do hay dùng: ① ngày mất không lấy lại được, tiền thì còn thu hồi được; ` +
    `② đây là gốc của chuỗi, gỡ nó thì mấy cái kia tự tắt; ③ chỉ cấp Ban mới quyết được.\n` +
    `Không có số liệu thì nói "chưa có số liệu", KHÔNG được ước số.\n` +
    `Trả về JSON: [{"id":"ISS-…","lyDo":"một câu vì sao nó đứng đây"}]\n` +
    `⛔ Không thêm trường điểm số / thứ hạng / phần trăm dưới bất kỳ tên nào.`
  );
}

export interface DongCanXem {
  id: string;
  lyDo: string;
}

/**
 * Bóc câu trả lời chọn top 5.
 *
 * ⭐ CỐ Ý chỉ lấy `id` và `lyDo`. LLM có trả kèm `diem: 87` hay `thuHang: 1`
 * thì những trường ấy BỊ VỨT ngay tại đây, không đi tiếp một bước nào — mục
 * 8b.3b cấm chấm điểm, và cách chặn chắc nhất là dữ liệu không tồn tại chứ
 * không phải màn hình nhớ đừng vẽ.
 *
 * Dòng không có lý do cũng bị bỏ: đứng ở tab ⭐ thì phải nói được vì sao.
 */
export function docTraLoiCanAnhXem(raw: string, gioiHan = SO_VIEC_CAN_XEM): DongCanXem[] {
  const mang = bocMang(raw);
  if (mang === null) return [];
  const ra: DongCanXem[] = [];
  const daCo = new Set<string>();
  for (const x of mang) {
    if (x === null || typeof x !== "object") continue;
    const o = x as Tho;
    const id = chuoi(o.id);
    const lyDo = chuoi(o.lyDo);
    if (id === "" || lyDo === "" || daCo.has(id)) continue;
    daCo.add(id);
    ra.push({ id, lyDo });
    if (ra.length >= gioiHan) break;
  }
  return ra;
}

/**
 * Gắn lý do LLM vào issue và trả về đống issue mới, THEO THỨ TỰ LLM đưa ra.
 *
 * Issue LLM chọn mà không có trong sổ thì bỏ — nó bịa mã, không được để mã bịa
 * lọt lên màn của Giám đốc Ban.
 */
export function apDungCanAnhXem(ds: IssueMain[], dong: DongCanXem[]): IssueMain[] {
  const bang = new Map<string, string>();
  for (const d of dong) bang.set(d.id, d.lyDo);
  const thuTu = dong.map((d) => d.id);
  const daGan = ds.map((i) => {
    const lyDo = bang.get(i.id);
    if (lyDo === undefined) {
      // Lượt chọn mới thì lý do lượt cũ hết hiệu lực — nếu không, tab ⭐ sẽ
      // đầy dần lên quá 5 việc sau vài lần chạy
      const { lyDoChon: _bo, ...conLai } = i;
      return conLai as IssueMain;
    }
    return { ...i, lyDoChon: lyDo };
  });
  // Đưa đúng thứ tự LLM chọn lên đầu — thứ tự, KHÔNG phải hạng có số
  const theoMa = new Map<string, IssueMain>();
  for (const i of daGan) theoMa.set(i.id, i);
  const dau: IssueMain[] = [];
  for (const ma of thuTu) {
    const i = theoMa.get(ma);
    if (i) {
      dau.push(i);
      theoMa.delete(ma);
    }
  }
  return [...dau, ...Array.from(theoMa.values())];
}

/** Nhóm nào LLM chưa từng đụng tới — dùng cho câu nhắc ở tab Phân loại lại */
export function nhomChuaCoIssue(ds: IssueMain[]): NhomChuDe[] {
  const co = new Set<NhomChuDe>();
  for (const i of locIssue(ds).nhan) {
    if (laNhomHopLe(i.nhomChinh)) co.add(i.nhomChinh);
  }
  return MOI_NHOM.filter((n) => !co.has(n));
}
