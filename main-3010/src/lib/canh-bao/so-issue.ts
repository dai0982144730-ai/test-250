// ============================================================
// SỔ ISSUE — LƯU BỀN theo dự án (`issues.json` trong thư mục dữ liệu dự án)
//
// Vì sao phải có: bản trước nút "Đã xử lý" là `useState`, trang tự ghi rõ
// "chỉ có hiệu lực trong phiên xem này" — tức là bấm xong tải lại trang là mất.
// PLAN-AGENT-TIEN-DO mục 11 đòi 'nút "Ghi nhận xử lý" LƯU VÀO CSDL'.
// Chưa có PostgreSQL nên lưu JSON theo đúng cách các phần khác đang làm
// (schedule.json, weekreport-*.json); khi lên `core.issue` chỉ đổi tầng đọc/ghi.
//
// Sổ chứa CẢ 5 nguồn. Nguồn 1–3 do máy sinh lại mỗi lần chạy — máy chỉ được
// đụng vào phần số liệu, KHÔNG được xóa ghi nhận xử lý của người (luật 8.3:
// hai trục độc lập).
// Server-only (dùng fs).
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { projectDataDir, resolveProjectId } from "@/lib/projects";
import { cuaAgentKhac, lyDoChanGhi } from "./quyen-issue";
import {
  AGENT_NAY,
  TEN_AGENT,
  bo_trung,
  dangMo,
  laNguonMay,
  tuNangMuc,
  type GhiNhanXuLy,
  type NguonIssue,
  type TheCanhBao,
  type TrangThaiXuLy,
} from "./model";

const TEN_FILE = "issues.json";

interface SoIssue {
  /** Lần chạy sinh cảnh báo gần nhất (ISO datetime) */
  lanChayCuoi: string;
  the: TheCanhBao[];
}

function duongDan(projectId?: string): string {
  return path.join(projectDataDir(resolveProjectId(projectId)), TEN_FILE);
}

export function docSo(projectId?: string): SoIssue {
  try {
    const fp = duongDan(projectId);
    if (!fs.existsSync(fp)) return { lanChayCuoi: "", the: [] };
    const j = JSON.parse(fs.readFileSync(fp, "utf8")) as SoIssue;
    return { lanChayCuoi: j.lanChayCuoi ?? "", the: Array.isArray(j.the) ? j.the : [] };
  } catch {
    return { lanChayCuoi: "", the: [] };
  }
}

export function ghiSo(so: SoIssue, projectId?: string): void {
  const fp = duongDan(projectId);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, JSON.stringify(so, null, 2), "utf8");
}

/**
 * Máy chạy xong thì HÒA vào sổ:
 *  • Nguồn 1–3: thay bằng lứa mới, nhưng qua `bo_trung` để giữ ngày mở + lịch
 *    sử ghi nhận của thẻ cùng đối tượng đang mở (luật 8.4①).
 *  • Thẻ máy cũ không còn trong lứa mới → điều kiện chuyển "hết vi phạm" rồi
 *    "chờ ổn định 2 tuần" (luật 8.4③ — đóng có thời gian quan sát), KHÔNG xóa.
 *  • Nguồn 4–5 (người/AI): máy KHÔNG đụng vào.
 */
export function hoaVaoSo(
  moiTuMay: TheCanhBao[],
  homNay: string,
  projectId?: string
): SoIssue {
  const so = docSo(projectId);
  const cuNguoi = so.the.filter((t) => !laNguonMay(t.nguon));
  const cuMay = so.the.filter((t) => laNguonMay(t.nguon));

  const khoa = (t: TheCanhBao): string => `${t.nguon}|${t.wbs ?? ""}`;
  // 6e.3 luật cứng 1: thẻ đã bị NGƯỜI XOÁ (issue sai) thì bộ sinh đêm sau
  // KHÔNG được sinh lại — không có lưới này thì đêm mai nó quay lại, người
  // xoá mãi không hết và mất lòng tin vào cả màn.
  const daBac = new Set(docSoDaBac(projectId).map((d) => d.khoa));
  const moiSauLoc = moiTuMay.filter((t) => !daBac.has(khoa(t)));
  const conViPham = new Set(moiSauLoc.map(khoa));

  // Thẻ máy cũ không còn vi phạm → hạ trục điều kiện theo bậc, không xóa ngay
  const cuDaHa = cuMay.map((t) => {
    if (conViPham.has(khoa(t))) return t;
    if (t.dieuKien === "dang-vi-pham") return { ...t, dieuKien: "het-vi-pham" as const };
    if (t.dieuKien === "het-vi-pham") return { ...t, dieuKien: "cho-on-dinh" as const };
    if (t.dieuKien === "cho-on-dinh") return { ...t, dieuKien: "da-dong" as const };
    return t;
  });

  const gop = bo_trung(cuDaHa, moiSauLoc).map((t) => tuNangMuc(t, homNay));
  const ra: SoIssue = {
    lanChayCuoi: homNay,
    the: [...gop, ...cuNguoi.map((t) => tuNangMuc(t, homNay))],
  };
  ghiSo(ra, projectId);
  return ra;
}

/**
 * CHỐT BC 04/09 — chặn GHI vào issue của agent khác.
 * "Tất cả các agent đều nhìn thấy issue của các agent còn lại và chỉ thêm sửa
 * xoá issue chính nó" (nguyên văn Mr. Đại, LOI-DUNG-CHUNG 6e.1).
 *
 * Đây là chốt ở TẦNG DỮ LIỆU, không phải ở nút bấm — giao diện có ẩn nút hay
 * không thì đường ghi vẫn phải bị chặn. Khi lên sổ chung `core.issue` trên
 * PostgreSQL, chốt này chuyển thành GRANT UPDATE + điều kiện chủ sở hữu; hàm
 * đây vẫn giữ làm lưới thứ hai.
 */
function chanGhiAgentKhac(t: TheCanhBao): string | null {
  if (!cuaAgentKhac(t)) return null;
  // Dùng ĐÚNG hàm màn hình dùng để làm mờ nút — hai bên không bao giờ lệch nhau
  return `Issue ${t.id}: ${lyDoChanGhi({ agent: t.agent, dieuKien: "dang-vi-pham" })}`;
}

/** Ghi nhận xử lý — CHỈ đổi trục 2, không đóng issue (luật 8.3) */
/**
 * Kết quả ghi nhận — phân biệt được BA tình huống.
 *
 * Trước 05/09 hàm này trả `null` cho cả "không tìm thấy" lẫn "bị chốt BC
 * chặn", nên người dùng bị báo sai là "Không tìm thấy issue" trong khi issue
 * vẫn nằm sờ sờ trên màn. Sai thông báo còn tệ hơn không có thông báo.
 */
export type KetQuaGhiNhan =
  | { ok: true; the: TheCanhBao }
  | { ok: false; loi: string; khongThay?: boolean };

export function ghiNhanXuLy(
  id: string,
  ghi: GhiNhanXuLy,
  projectId?: string
): KetQuaGhiNhan {
  const so = docSo(projectId);
  const t = so.the.find((x) => x.id === id);
  if (!t) return { ok: false, loi: "Không tìm thấy issue.", khongThay: true };
  const chan = chanGhiAgentKhac(t); // chốt BC — không ghi vào issue agent khác
  if (chan) return { ok: false, loi: chan };
  t.ghiNhan = [...(t.ghiNhan ?? []), ghi];
  t.xuLy = ghi.chuyenSang;
  ghiSo(so, projectId);
  return { ok: true, the: t };
}

/** Người thêm issue (nguồn 4) — VÀO SỔ NGAY, không cần ai duyệt (8.2c) */
export function themIssueNguoi(
  t: Omit<TheCanhBao, "id" | "nguon" | "dieuKien" | "xuLy" | "ghiNhan" | "soTuanMo">,
  projectId?: string
): TheCanhBao {
  const so = docSo(projectId);
  const the: TheCanhBao = {
    ...t,
    id: maIssueMoi(so.the, t.ngayMo),
    nguon: "nguoi",
    agent: AGENT_NAY, // chốt BC — issue mới luôn đứng tên agent này
    dieuKien: "dang-vi-pham",
    xuLy: "chua-ai-dong",
    ghiNhan: [],
  };
  so.the.push(the);
  ghiSo(so, projectId);
  return the;
}

/**
 * Đóng issue — CHỈ nguồn 4 (người mở thì người đóng). Nguồn 1–3 chỉ máy đóng
 * được, nên gọi vào đây sẽ bị từ chối (8.2c cột "Ai đóng được").
 */
export function dongIssue(id: string, projectId?: string): { ok: boolean; loi?: string } {
  const so = docSo(projectId);
  const t = so.the.find((x) => x.id === id);
  if (!t) return { ok: false, loi: "Không tìm thấy issue." };
  const chanD = chanGhiAgentKhac(t);
  if (chanD) return { ok: false, loi: chanD }; // chốt BC
  if (laNguonMay(t.nguon)) {
    return {
      ok: false,
      loi: "Issue do máy sinh thì CHỈ MÁY đóng được — hết vi phạm là máy tự hạ (PLAN-TONG-THE 8.2c).",
    };
  }
  t.dieuKien = "da-dong";
  ghiSo(so, projectId);
  return { ok: true };
}

/** Duyệt đề xuất AI (nguồn 5) → vào sổ, CHUYỂN SANG TAB 4 (luật 8.7) */
export function duyetDeXuatAi(
  id: string,
  nguoiDuyet: string,
  ngay: string,
  projectId?: string
): { ok: boolean; loi?: string } {
  const so = docSo(projectId);
  const t = so.the.find((x) => x.id === id);
  if (!t) return { ok: false, loi: "Không tìm thấy đề xuất." };
  // ⭐ VÁ 05/09/2026: hai hàm duyệt/bác bỏ TRƯỚC ĐÂY KHÔNG có chốt này, nên
  // agent này duyệt được cả đề xuất do agent khác sinh — đúng điều chốt BC cấm.
  const chanD = chanGhiAgentKhac(t);
  if (chanD) return { ok: false, loi: chanD };
  if (t.nguon !== "ai") return { ok: false, loi: "Thẻ này không phải đề xuất AI." };
  t.nguon = "nguoi";
  t.chuaVaoSo = false;
  t.id = maIssueMoi(so.the, ngay);
  t.nguoiMo = `AI đề xuất — ${nguoiDuyet} duyệt`;
  ghiSo(so, projectId);
  return { ok: true };
}

/** Bác bỏ đề xuất AI — BẮT ghi lý do, giữ lại để đo AI sai bao nhiêu (8.7) */
export function bacBoDeXuatAi(
  id: string,
  lyDo: string,
  projectId?: string
): { ok: boolean; loi?: string } {
  if (!lyDo || lyDo.trim().length < 3) {
    return { ok: false, loi: "Bác bỏ thì phải ghi lý do — lý do được lưu để đo AI sai bao nhiêu." };
  }
  const so = docSo(projectId);
  const t = so.the.find((x) => x.id === id);
  if (!t) return { ok: false, loi: "Không tìm thấy đề xuất." };
  const chanB = chanGhiAgentKhac(t); // ⭐ vá cùng lỗ với duyetDeXuatAi
  if (chanB) return { ok: false, loi: chanB };
  if (t.nguon !== "ai") return { ok: false, loi: "Thẻ này không phải đề xuất AI." };
  t.lyDoBacBo = lyDo.trim();
  t.dieuKien = "da-dong";
  ghiSo(so, projectId);
  return { ok: true };
}

// ============================================================
// BA NÚT TRÊN MỌI THẺ ISSUE — chốt AQ / LOI-DUNG-CHUNG 6e.3 (thêm 08/09)
// ẨN = issue ĐÚNG, xử sau, VẪN ĐẾM · XOÁ = issue SAI, bắt lý do, vào SỔ ĐÃ BÁC
// Sổ đã bác GIỮ NGUYÊN không dọn: vừa chặn bộ sinh đêm sinh lại, vừa là toàn
// bộ dữ liệu đo "AI/máy sai bao nhiêu" (6e.2).
// ============================================================

const TEN_SO_DA_BAC = "so-da-bac.jsonl";

export interface DongDaBac {
  /** khoá thẻ máy: `nguon|wbs` — trùng khoá này thì bộ sinh không sinh lại */
  khoa: string;
  id: string;
  tieuDe: string;
  nguon: NguonIssue;
  lyDo: string;
  nguoi: string;
  luc: string;
}

function duongDanDaBac(projectId?: string): string {
  return path.join(projectDataDir(resolveProjectId(projectId)), TEN_SO_DA_BAC);
}

export function docSoDaBac(projectId?: string): DongDaBac[] {
  try {
    const fp = duongDanDaBac(projectId);
    if (!fs.existsSync(fp)) return [];
    return fs
      .readFileSync(fp, "utf8")
      .split(String.fromCharCode(10))
      .filter((d) => d.trim() !== "")
      .map((d) => JSON.parse(d) as DongDaBac);
  } catch {
    return [];
  }
}

/** 🙈 Ẩn / 🙉 Bỏ ẩn — chỉ đổi cờ hiển thị, KHÔNG đổi trạng thái, KHÔNG trừ tổng */
export function anIssue(
  id: string,
  an: boolean,
  projectId?: string
): { ok: boolean; loi?: string } {
  const so = docSo(projectId);
  const t = so.the.find((x) => x.id === id);
  if (!t) return { ok: false, loi: "Không tìm thấy issue." };
  const chan = chanGhiAgentKhac(t);
  if (chan) return { ok: false, loi: chan }; // chốt BC
  if (t.dieuKien === "da-dong") return { ok: false, loi: "Issue đã đóng — chỉ đọc, không ẩn được." };
  t.an = an;
  ghiSo(so, projectId);
  return { ok: true };
}

/**
 * 🗑 Xoá — issue SAI (máy suy sai hoặc dữ liệu sai). Bắt ghi lý do, ghi vào
 * SỔ ĐÃ BÁC rồi mới rời sổ issue. Hai chỗ CỐ Ý không cho xoá (6e.3):
 *  • nguồn "ai" — đã có Bác bỏ, thêm nút thứ hai cùng việc là vẽ hai kiểu
 *  • issue đã đóng — xoá là xoá lịch sử; đỡ rối thì lọc, không xoá
 */
export function xoaIssue(
  id: string,
  lyDo: string,
  nguoi: string,
  projectId?: string
): { ok: boolean; loi?: string } {
  if (!lyDo || lyDo.trim().length < 3) {
    return { ok: false, loi: "Xoá thì phải ghi lý do — lý do vào Sổ đã bác để đo máy sai bao nhiêu." };
  }
  const so = docSo(projectId);
  const t = so.the.find((x) => x.id === id);
  if (!t) return { ok: false, loi: "Không tìm thấy issue." };
  const chan = chanGhiAgentKhac(t);
  if (chan) return { ok: false, loi: chan }; // chốt BC
  if (t.nguon === "ai") {
    return { ok: false, loi: "Tab 🤖 dùng nút Bác bỏ — Bác bỏ chính là xoá của tab này." };
  }
  if (t.dieuKien === "da-dong") {
    return { ok: false, loi: "Xoá issue đã đóng là xoá lịch sử — muốn đỡ rối thì lọc, không xoá." };
  }
  const dong: DongDaBac = {
    khoa: `${t.nguon}|${t.wbs ?? ""}`,
    id: t.id,
    tieuDe: t.tieuDe,
    nguon: t.nguon,
    lyDo: lyDo.trim(),
    nguoi,
    luc: new Date().toISOString(),
  };
  const fp = duongDanDaBac(projectId);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.appendFileSync(fp, JSON.stringify(dong) + String.fromCharCode(10), "utf8");
  so.the = so.the.filter((x) => x.id !== id);
  ghiSo(so, projectId);
  return { ok: true };
}

/** ISS-<năm>-<tuần ISO>-<số thứ tự trong tuần> */
export function maIssueMoi(daCo: TheCanhBao[], ngay: string): string {
  const d = new Date(ngay + "T00:00:00Z");
  const t = new Date(d);
  t.setUTCDate(t.getUTCDate() + 3 - ((t.getUTCDay() + 6) % 7));
  const dauNam = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  const tuan =
    1 +
    Math.round(
      ((t.getTime() - dauNam.getTime()) / 86400000 - 3 + ((dauNam.getUTCDay() + 6) % 7)) / 7
    );
  const tienTo = `ISS-${t.getUTCFullYear()}-${String(tuan).padStart(2, "0")}-`;
  // Lấy SỐ LỚN NHẤT đã dùng rồi +1, KHÔNG phải đếm bao nhiêu thẻ cùng tiền tố.
  // Đếm thì sai khi sổ có lỗ: bộ sinh cấp mã 001·002·003, `bo_trung` gộp 002 vào
  // một thẻ cũ (giữ mã cũ), sổ còn 001 và 003 → đếm ra 2 → mã mới là 003, ĐÂM
  // VÀO thẻ máy đang có. Người bấm "Đóng issue" liền bị từ chối vì máy tưởng
  // đang đóng thẻ của máy. Lộ ra 02/09 khi dữ liệu đổi làm sổ có lỗ.
  let max = 0;
  for (const x of daCo) {
    if (!x.id.startsWith(tienTo)) continue;
    const n = Number(x.id.slice(tienTo.length));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${tienTo}${String(max + 1).padStart(3, "0")}`;
}

/** Thẻ của một tab, đã lọc thẻ đã đóng và sắp xếp */
export function theTheoTab(the: TheCanhBao[], tab: NguonIssue): TheCanhBao[] {
  return the.filter((t) => t.nguon === tab && dangMo(t));
}

export type { SoIssue };
export type { TrangThaiXuLy };
