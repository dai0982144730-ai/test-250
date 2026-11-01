// ============================================================
// DỰNG DỮ LIỆU CHO MÀN ISSUE CỦA MAIN  (server-only)
//
// Một chỗ duy nhất ghép ba mảnh, để trang và API không bao giờ dựng khác nhau:
//   ① gom issue (sổ nội bộ + agent đang bật)      — gom.ts
//   ② áp phân loại LLM đã lưu                      — luu.ts + phan-loai.ts
//   ③ áp 5 việc "Cần anh xem" LLM đã chọn          — luu.ts + phan-loai.ts
// ============================================================

import { gomIssue } from "./gom";
import { docSoIssueMain } from "./luu";
import { apDungCanAnhXem, apDungPhanLoai } from "./phan-loai";
import { maWbsHopLe, type IssueMain, type ThieuThe } from "./model";
import { layTuDienWbs } from "@/lib/chung/tu-dien-ma-du-an";
import { locManIssue, type BoLocMat } from "@/lib/agent-mat-loc";

export interface DuLieuManIssue {
  issue: IssueMain[];
  chuaGom: { ma: string; ten: string; lyDo: string }[];
  /** Con nào còn thẻ chưa lấy về (chạm trần cổng) — hiện kèm link sang màn Cảnh báo của nó */
  thieuThe: ThieuThe[];
  /** Con nào đã trả lời mà sổ không có thẻ đang mở — tin tốt, hiện chữ thường */
  khongCoIssue: { ma: string; ten: string }[];
  lanPhanLoaiCuoi: string;
  lanChonCuoi: string;
  /** A10a — tên việc theo mã WBS (Agent Tiến độ), CHỈ các mã đang có issue */
  tenWbs: Record<string, string>;
  /** Câu tiếng Việt khi chưa lấy được tên việc — `null` = lấy được hoặc không cần lấy */
  loiTenWbs: string | null;
}

/**
 * ⭐ A10a (25/09) — TÊN VIỆC cho tiêu đề khối ở chế độ "Xếp theo WBS".
 *
 * Issue của các agent chỉ mang MÃ WBS, không mang tên việc; Main không giữ cây
 * WBS (không giữ dữ liệu nghiệp vụ). Nên hỏi Agent Tiến độ MỘT lượt
 * `tiendo.tim_dau_viec` từ khoá rỗng (đo 25/09 HV: trả đủ 330/330 đầu việc
 * {wbs, name}) — đi qua `hoiTienDo` nên có vết trong sổ nhật ký (luật 29).
 * Chỉ hỏi khi có ít nhất một issue mang mã WBS; đệm 10 phút theo dự án để mở
 * lại trang không hỏi lại. Tiến độ không trả được thì khối chỉ hiện mã, không bịa tên.
 */
async function layTenWbs(
  projectId: string | undefined,
  issue: IssueMain[],
): Promise<{ tenWbs: Record<string, string>; loiTenWbs: string | null }> {
  const ma = Array.from(new Set(issue.map((i) => maWbsHopLe(i.wbs)).filter((x): x is string => x !== null)));
  if (ma.length === 0 || !projectId) return { tenWbs: {}, loiTenWbs: null };
  // 26/09: đệm + lời hỏi dời sang chung/tu-dien-ma-du-an.ts — dùng chung với lưới "mã kèm tên"
  const { ten, loi } = await layTuDienWbs(
    projectId,
    `Màn Cảnh báo của Main, chế độ Xếp theo WBS (A10a): lấy tên việc cho ${ma.length} mã WBS đang có issue`,
  );
  if (loi) return { tenWbs: {}, loiTenWbs: loi };
  return { tenWbs: Object.fromEntries(ma.filter((m) => ten[m]).map((m) => [m, ten[m]])), loiTenWbs: null };
}

/**
 * ⭐ 24/09: huy chương đỏ ở mục Cảnh báo trên menu trái trước đây đọc /api/canh-bao
 * — sổ issue CHÉP của bộ tính tiến độ trong Main (đã gỡ). Nay đếm từ LẦN GOM
 * GẦN NHẤT của chính màn Cảnh báo (issue thật của các agent, hỏi qua cổng). Menu
 * trái nạp lại mỗi lần chuyển trang nên KHÔNG được đi hỏi mạng — chỉ đọc số đệm.
 * Giữ trên globalThis để dev server nạp lại module không mất số.
 */
/** Một thẻ đỏ đang mở của lần gom gần nhất — chỉ đủ để lọc theo người xem (18/10/2026) */
interface TheDoNho {
  agentChu: string;
  maDuAn?: string;
}
const g = globalThis as unknown as { __demIssueDo2?: Map<string, { luc: string; the: TheDoNho[] }> };
const demIssueDo = (g.__demIssueDo2 ??= new Map());

/**
 * Số issue ĐỎ đang mở ở lần gom gần nhất — null khi chưa gom lần nào.
 * ⭐ 18/10/2026: chỉ đếm thẻ NGƯỜI XEM thấy được (cùng bộ lọc màn Cảnh báo — `locManIssue`). Trước đây menu đếm cả thẻ
 * Hợp đồng / Pháp lý / Công việc bị ẩn với người ngoài dự án.
 */
export function soIssueDoGanNhat(projectId: string, loc: BoLocMat): { luc: string; soDo: number } | null {
  const c = demIssueDo.get(projectId);
  if (!c) return null;
  return { luc: c.luc, soDo: locManIssue({ issue: c.the, chuaGom: [], thieuThe: [], khongCoIssue: [] }, loc, projectId).issue.length };
}

export async function duLieuManIssue(projectId?: string): Promise<DuLieuManIssue> {
  const { issue, chuaGom, thieuThe, khongCoIssue } = await gomIssue(projectId);
  demIssueDo.set(projectId ?? "", {
    luc: new Date().toISOString(),
    the: issue
      .filter((i) => i.mucDo === "do" && !i.daDong)
      .map((i) => ({ agentChu: i.agentChu, ...(i.maDuAn ? { maDuAn: i.maDuAn } : {}) })),
  });
  const so = docSoIssueMain(projectId);
  // Thứ tự: phân loại trước rồi mới tới chọn top 5 — bước chọn sắp lại thứ tự
  // mảng, nên chạy sau để thứ tự LLM chọn không bị bước kia xáo lại.
  const daXep = apDungPhanLoai(issue, so.phanLoai);
  const daChon = apDungCanAnhXem(daXep, so.canXem);
  const { tenWbs, loiTenWbs } = await layTenWbs(projectId, issue);
  return {
    issue: daChon,
    chuaGom,
    thieuThe,
    khongCoIssue,
    lanPhanLoaiCuoi: so.lanPhanLoaiCuoi,
    lanChonCuoi: so.lanChonCuoi,
    tenWbs,
    loiTenWbs,
  };
}
