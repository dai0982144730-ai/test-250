// ============================================================
// cay-viec/issue/so-issue.ts — SỔ ISSUE lưu bền theo dự án (chép lib/canh-bao/so-issue.ts của agent Base, lưu file như Base).
//   data/cay-viec/issue/<dự án>.json          — sổ (mọi nguồn)
//   data/cay-viec/issue/<dự án>-da-bac.jsonl  — SỔ ĐÃ BÁC (issue người xoá vì SAI): chặn bộ sinh sinh lại + đo máy sai bao nhiêu
// Máy chỉ đụng phần số liệu của thẻ máy, KHÔNG xoá ghi nhận xử lý của người (hai trục độc lập).
// CHỈ SERVER — node:fs (luật 10). Ghi ngắn, đồng bộ; không giữ khoá CSDL nào.
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { thuMucDuLieu } from "@/lib/ai/duong-dan";
import { lyDoChanGhi } from "./quyen";
import {
  AGENT_NAY,
  bo_trung,
  khoaThe,
  laCuaAgentNay,
  laNguonMay,
  maIssueMoi,
  tuNangMuc,
  type GhiNhanXuLy,
  type NguonIssue,
  type SoIssue,
  type TheCanhBao,
} from "./model";

const tenTep = (duAn: string) => duAn.replace(/[^a-zA-Z0-9_-]/g, "_");
const duongSo = (duAn: string) => thuMucDuLieu("cay-viec", "issue", `${tenTep(duAn)}.json`);
const duongDaBac = (duAn: string) => thuMucDuLieu("cay-viec", "issue", `${tenTep(duAn)}-da-bac.jsonl`);

export function docSo(duAn: string): SoIssue {
  try {
    const t = duongSo(duAn);
    if (!fs.existsSync(t)) return { lanChayCuoi: "", the: [] };
    const j = JSON.parse(fs.readFileSync(t, "utf8")) as SoIssue;
    return { ...j, lanChayCuoi: j.lanChayCuoi ?? "", the: Array.isArray(j.the) ? j.the : [] };
  } catch {
    return { lanChayCuoi: "", the: [] };
  }
}

export function ghiSo(duAn: string, so: SoIssue): void {
  const t = duongSo(duAn);
  fs.mkdirSync(path.dirname(t), { recursive: true });
  fs.writeFileSync(t, JSON.stringify(so, null, 2) + "\n", "utf8");
}

export interface DongDaBac {
  khoa: string;
  id: string;
  tieuDe: string;
  nguon: NguonIssue;
  lyDo: string;
  nguoi: string;
  luc: string;
}

export function docSoDaBac(duAn: string): DongDaBac[] {
  try {
    const t = duongDaBac(duAn);
    if (!fs.existsSync(t)) return [];
    return fs
      .readFileSync(t, "utf8")
      .split("\n")
      .filter((d) => d.trim() !== "")
      .map((d) => JSON.parse(d) as DongDaBac);
  } catch {
    return [];
  }
}

/**
 * Máy chạy xong thì HOÀ vào sổ (y Base hoaVaoSo):
 *  • thẻ máy mới qua bo_trung → giữ mã, ngày mở, lịch sử xử lý của thẻ cùng đối tượng đang mở
 *  • thẻ máy cũ không còn vi phạm → hạ bậc "đang vi phạm → hết vi phạm → chờ ổn định → đã đóng", KHÔNG xoá
 *  • thẻ trong sổ đã bác → không sinh lại · thẻ người / 🤖: máy không đụng
 */
export function hoaVaoSo(duAn: string, moiTuMay: TheCanhBao[], homNay: string, phu: Pick<SoIssue, "ghiChu" | "doDuoc" | "dauViec">): SoIssue {
  const so = docSo(duAn);
  const cuNguoi = so.the.filter((t) => !laNguonMay(t.nguon));
  const cuMay = so.the.filter((t) => laNguonMay(t.nguon));
  const daBac = new Set(docSoDaBac(duAn).map((d) => d.khoa));
  const moiSauLoc = moiTuMay.filter((t) => !daBac.has(khoaThe(t)));
  // Cấp mã cho thẻ mới (thẻ trùng đối tượng đang mở sẽ được bo_trung giữ mã cũ)
  const daCo: Pick<TheCanhBao, "id">[] = [...so.the];
  for (const t of moiSauLoc) {
    t.id = maIssueMoi(daCo, homNay);
    daCo.push(t);
  }
  const conViPham = new Set(moiSauLoc.map(khoaThe));
  const cuDaHa = cuMay.map((t) => {
    if (conViPham.has(khoaThe(t))) return t;
    if (t.dieuKien === "dang-vi-pham") return { ...t, dieuKien: "het-vi-pham" as const };
    if (t.dieuKien === "het-vi-pham") return { ...t, dieuKien: "cho-on-dinh" as const };
    if (t.dieuKien === "cho-on-dinh") return { ...t, dieuKien: "da-dong" as const };
    return t;
  });
  const gop = bo_trung(cuDaHa, moiSauLoc).map((t) => tuNangMuc(t, homNay));
  const ra: SoIssue = { lanChayCuoi: homNay, the: [...gop, ...cuNguoi.map((t) => tuNangMuc(t, homNay))], ...phu };
  ghiSo(duAn, ra);
  return ra;
}

/**
 * Hoà ĐỀ XUẤT máy (tab 🤖, DX-BASE-…, chưa vào sổ) — y Base hoaDeXuatMay:
 * cùng đối tượng đang chờ → giữ; đã bị bác / trong sổ đã bác → không sinh lại; đối tượng hết vi phạm → đề xuất cũ đóng.
 */
export function hoaDeXuatMay(duAn: string, moi: TheCanhBao[]): SoIssue {
  const so = docSo(duAn);
  const khoa = (t: TheCanhBao) => `ai|${t.wbs ?? ""}`;
  const daBac = new Set(docSoDaBac(duAn).map((d) => d.khoa));
  const daTuChoi = new Set(so.the.filter((t) => t.nguon === "ai" && t.lyDoBacBo).map(khoa));
  const dangCho = new Map(so.the.filter((t) => t.nguon === "ai" && t.chuaVaoSo && t.dieuKien !== "da-dong").map((t) => [khoa(t), t]));
  const conMoi = new Set(moi.map(khoa));
  let max = 0;
  for (const t of so.the) {
    const m = /^DX-(?:BASE-)?(\d+)$/.exec(t.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  const them: TheCanhBao[] = [];
  for (const t of moi) {
    const k = khoa(t);
    if (daBac.has(k) || daTuChoi.has(k) || dangCho.has(k)) continue;
    max += 1;
    them.push({ ...t, id: `DX-BASE-${String(max).padStart(3, "0")}`, agent: AGENT_NAY });
  }
  const lienQuanMoi = new Map(moi.map((t) => [khoa(t), t.wbsLienQuan]));
  const the = so.the.map((t) => {
    if (t.nguon === "ai" && t.chuaVaoSo && t.dieuKien !== "da-dong" && !conMoi.has(khoa(t)) && t.id.startsWith("DX-BASE-")) {
      return { ...t, dieuKien: "da-dong" as const };
    }
    if (dangCho.get(khoa(t)) === t && lienQuanMoi.has(khoa(t))) {
      const lq = lienQuanMoi.get(khoa(t));
      if (lq && lq.length > 0) return { ...t, wbsLienQuan: lq };
      const { wbsLienQuan: _bo, ...conLai } = t;
      void _bo;
      return conLai;
    }
    return t;
  });
  const ra: SoIssue = { ...so, the: [...the, ...them] };
  ghiSo(duAn, ra);
  return ra;
}

export type KetQua = { ok: true; the?: TheCanhBao } | { ok: false; loi: string; khongThay?: boolean };

function timThe(so: SoIssue, id: string): { t?: TheCanhBao; loi?: KetQua } {
  const t = so.the.find((x) => x.id === id);
  if (!t) return { loi: { ok: false, loi: "Không tìm thấy issue.", khongThay: true } };
  const chan = lyDoChanGhi(t);
  if (chan) return { loi: { ok: false, loi: `Issue ${t.id}: ${chan}` } };
  return { t };
}

/** Ghi nhận xử lý — CHỈ đổi trục 2, không đóng issue (luật 8.3) */
export function ghiNhanXuLy(duAn: string, id: string, ghi: GhiNhanXuLy): KetQua {
  const so = docSo(duAn);
  const { t, loi } = timThe(so, id);
  if (!t) return loi!;
  t.ghiNhan = [...(t.ghiNhan ?? []), ghi];
  t.xuLy = ghi.chuyenSang;
  ghiSo(duAn, so);
  return { ok: true, the: t };
}

/** Người thêm issue (nguồn 4) — VÀO SỔ NGAY */
export function themIssueNguoi(duAn: string, t: Omit<TheCanhBao, "id" | "nguon" | "dieuKien" | "xuLy" | "ghiNhan" | "soTuanMo">): TheCanhBao {
  const so = docSo(duAn);
  const the: TheCanhBao = { ...t, id: maIssueMoi(so.the, t.ngayMo), nguon: "nguoi", agent: AGENT_NAY, dieuKien: "dang-vi-pham", xuLy: "chua-ai-dong", ghiNhan: [] };
  so.the.push(the);
  ghiSo(duAn, so);
  return the;
}

/** Đóng issue — CHỈ nguồn người (người mở thì người đóng); nguồn máy bị từ chối */
export function dongIssue(duAn: string, id: string): KetQua {
  const so = docSo(duAn);
  const { t, loi } = timThe(so, id);
  if (!t) return loi!;
  if (laNguonMay(t.nguon)) return { ok: false, loi: "Issue do máy sinh thì CHỈ MÁY đóng được — hết vi phạm là máy tự hạ qua các bậc." };
  t.dieuKien = "da-dong";
  ghiSo(duAn, so);
  return { ok: true };
}

/** Duyệt đề xuất 🤖 → vào sổ, CHUYỂN SANG TAB 👤 (mã DX- đổi thành ISS-) */
export function duyetDeXuat(duAn: string, id: string, nguoiDuyet: string, ngay: string): KetQua {
  const so = docSo(duAn);
  const { t, loi } = timThe(so, id);
  if (!t) return loi!;
  if (t.nguon !== "ai") return { ok: false, loi: "Thẻ này không phải đề xuất 🤖." };
  t.nguon = "nguoi";
  t.chuaVaoSo = false;
  t.id = maIssueMoi(so.the, ngay);
  t.nguoiMo = `AI đề xuất — ${nguoiDuyet} duyệt`;
  ghiSo(duAn, so);
  return { ok: true, the: t };
}

/** Bác bỏ đề xuất 🤖 — BẮT ghi lý do, giữ lại để đo AI sai bao nhiêu */
export function bacBoDeXuat(duAn: string, id: string, lyDo: string): KetQua {
  if (!lyDo || lyDo.trim().length < 3) return { ok: false, loi: "Bác bỏ thì phải ghi lý do — lý do được lưu để đo AI sai bao nhiêu." };
  const so = docSo(duAn);
  const { t, loi } = timThe(so, id);
  if (!t) return loi!;
  if (t.nguon !== "ai") return { ok: false, loi: "Thẻ này không phải đề xuất 🤖." };
  t.lyDoBacBo = lyDo.trim();
  t.dieuKien = "da-dong";
  ghiSo(duAn, so);
  return { ok: true };
}

/** 🙈 Ẩn / 🙉 Bỏ ẩn — chỉ đổi cờ hiển thị, VẪN ĐẾM vào tổng */
export function anIssue(duAn: string, id: string, an: boolean): KetQua {
  const so = docSo(duAn);
  const { t, loi } = timThe(so, id);
  if (!t) return loi!;
  t.an = an;
  ghiSo(duAn, so);
  return { ok: true };
}

/** Khối giao việc dưới thẻ: Bỏ qua = đánh dấu "không cần giao việc" (nhớ luôn) · bỏ đánh dấu → khối hiện lại. Không đổi trạng thái issue. */
export function khongCanGiaoIssue(duAn: string, id: string, danhDau: boolean, nguoi: string): KetQua {
  const so = docSo(duAn);
  const { t, loi } = timThe(so, id);
  if (!t) return loi!;
  if (danhDau) t.khongCanGiao = { nguoi, luc: new Date().toISOString() };
  else delete t.khongCanGiao;
  ghiSo(duAn, so);
  return { ok: true };
}

/**
 * Q2 (Mr. Đại chốt 07/10): issue NGƯỜI THÊM / 🤖 AI đề xuất đã giao việc (mã CV-… ở dòng ghi nhận) và việc đó đã XONG trong sổ cái →
 * máy đóng issue, ghi lý do (nút Đóng issue bỏ). Thẻ máy (luật 1·3·4) vẫn chỉ máy đóng theo dữ liệu.
 */
export function dongKhiViecXong(duAn: string, viecXong: ReadonlySet<string>, homNay: string): number {
  if (viecXong.size === 0) return 0;
  const so = docSo(duAn);
  let n = 0;
  for (const t of so.the) {
    if (t.dieuKien === "da-dong" || (t.nguon !== "nguoi" && t.nguon !== "ai") || !laCuaAgentNay(t)) continue;
    const ma = [...t.ghiNhan].reverse().map((g) => /CV-\d{4}-\d+/.exec(g.viecDaLam)?.[0]).find(Boolean);
    if (!ma || !viecXong.has(ma)) continue;
    t.dieuKien = "da-dong";
    t.ghiNhan = [...t.ghiNhan, { luc: `${homNay}T00:00:00.000Z`, nguoi: "Máy (đối chiếu sổ cái)", viecDaLam: `Việc ${ma} đã xong → máy đóng issue`, chuyenSang: t.xuLy }];
    n += 1;
  }
  if (n > 0) ghiSo(duAn, so);
  return n;
}

/** 🗑 Xoá — issue SAI: bắt lý do, ghi SỔ ĐÃ BÁC rồi mới rời sổ. Tab 🤖 dùng Bác bỏ; issue đã đóng không xoá (là lịch sử). */
export function xoaIssue(duAn: string, id: string, lyDo: string, nguoi: string): KetQua {
  if (!lyDo || lyDo.trim().length < 3) return { ok: false, loi: "Xoá thì phải ghi lý do — lý do vào Sổ đã bác để đo máy sai bao nhiêu." };
  const so = docSo(duAn);
  const { t, loi } = timThe(so, id);
  if (!t) return loi!;
  if (t.nguon === "ai") return { ok: false, loi: "Tab 🤖 dùng nút Bác bỏ — Bác bỏ chính là xoá của tab này." };
  const dong: DongDaBac = { khoa: khoaThe(t), id: t.id, tieuDe: t.tieuDe, nguon: t.nguon, lyDo: lyDo.trim(), nguoi, luc: new Date().toISOString() };
  const tp = duongDaBac(duAn);
  fs.mkdirSync(path.dirname(tp), { recursive: true });
  fs.appendFileSync(tp, JSON.stringify(dong) + "\n", "utf8");
  so.the = so.the.filter((x) => x.id !== id);
  ghiSo(duAn, so);
  return { ok: true };
}

/** Nối thẳng đề xuất 🤖 do AI đọc báo cáo (nhóm 5) vào sổ — không qua hoaVaoSo (máy không đụng nguồn 5) */
export function themDeXuatAi(duAn: string, moi: TheCanhBao[]): void {
  if (!moi.length) return;
  const so = docSo(duAn);
  so.the.push(...moi.map((t) => ({ ...t, agent: AGENT_NAY })));
  ghiSo(duAn, so);
}
