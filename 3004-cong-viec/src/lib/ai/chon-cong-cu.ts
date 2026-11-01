// ============================================================
// chon-cong-cu.ts — CHỌN CÔNG CỤ THEO CÂU HỎI (B4, tiết kiệm ngữ cảnh)
//
// Lấy nguyên cơ chế agent tiến độ: chỉ đưa vào prompt những công cụ dính tới
// câu hỏi. Ba lưới an toàn (thà tốn token còn hơn trợ lý mất công cụ):
//   ① nhóm LÕI luôn có mặt
//   ② chọn được quá ít (câu mơ hồ) → trả VỀ ĐỦ danh mục
//   ③ từ vòng 2 trở đi (đã có kết quả công cụ) → trả VỀ ĐỦ danh mục
// Model gọi tên ngoài danh sách vẫn chạy được, vì `runTool` tra bảng đầy đủ.
// SCI công việc: bộ công cụ nhỏ (13) nên TOI_THIEU thấp; lọc thêm theo quyền người hỏi.
//
// File THUẦN — không đụng fs, dùng được cả ở client.
// ============================================================

import { TOOL_SPECS, type ToolSpec } from "./chat-types";

/** Công cụ dùng ở hầu hết câu hỏi — luôn nằm trong prompt */
export const NHOM_LOI = ["socai.danh_sach_viec", "socai.chi_tiet_viec", "thumuc.liet_ke", "thumuc.doc", "mo_trang", "hoi_main"] as const;

/** Chọn được ít hơn ngần này thì coi như câu mơ hồ → đưa đủ danh mục */
const TOI_THIEU = 7;
/** Trần số công cụ đưa vào prompt khi lọc được */
const TRAN = 11;

/**
 * Bí danh cho cụm người dùng hay nói mà mô tả công cụ không có sẵn chữ đó.
 * KHOÁ PHẢI LÀ TÊN CÔNG CỤ THẬT — có bài kiểm chặn (tests/unit/ai-chon-cong-cu).
 */
export const BI_DANH: Record<string, string[]> = {
  "thumuc.cay": ["cau truc", "thu muc", "phong ban", "don vi nao", "cay"],
  "thumuc.liet_ke": ["bao cao tuan", "bao cao thang", "tai lieu", "file", "nhan duoc", "gui den", "o dau"],
  "thumuc.doc": ["tom tat", "noi dung", "doc giup", "bao cao"],
  "socai.danh_sach_viec": ["sap tre", "tre han", "qua han", "dang mo", "con may viec", "vuong", "co gi moi", "viec moi", "hom nay"],
  "socai.chi_tiet_viec": ["cv-", "vuong o dau", "chi tiet viec"],
  "socai.viec_cua_don_vi": ["viec cua", "cua toi", "phong", "con may viec"],
  "lichsu.tra_cuu_viec": ["da xong", "hoan thanh", "roi so cai", "tuan truoc", "lam duoc gi", "xong gi", "viec xong"],
  // test đêm 01/10: "nhà máy nào chưa nộp tuần 40", "PMC có nộp đúng hạn không", "tình hình Lào"
  "baocao.tinh_hinh_nop": ["chua nop", "da nop", "nop bao cao", "dung han", "nop muon", "tre han nop", "tinh hinh", "bao cao tuan"],
  "lichsu.doi_tuong": ["dong thoi gian", "qua trinh", "ai gui", "ai sua"],
  "lichsu.tim": ["lich su", "ai da", "hom qua", "thao tac"],
  "mau.danh_sach": ["mau", "form", "o bat buoc"],
  "mau.kiem_tra": ["kiem tra", "dung mau", "gop y", "thieu"],
  tim_kiem_web: ["internet", "tren mang", "quy dinh moi", "nghi dinh", "thong tu"],
};

export function boDau(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

/** Tách từ ≥4 ký tự — từ ngắn (và, cho, các…) không phân biệt được gì */
function tuKhoa(s: string): string[] {
  return boDau(s)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4);
}

function chamDiem(spec: ToolSpec, tuCauHoi: Set<string>, cauHoiPhang: string): number {
  let diem = 0;
  for (const bd of BI_DANH[spec.name] ?? []) {
    if (cauHoiPhang.includes(bd)) diem += 3;
  }
  // Tên công cụ tách dấu chấm/gạch dưới: "socai.danh_sach_viec" → socai, danh, sach, viec
  for (const t of boDau(spec.name).split(/[._]/)) {
    if (t.length >= 3 && tuCauHoi.has(t)) diem += 2;
  }
  for (const t of tuKhoa(spec.description)) {
    if (tuCauHoi.has(t)) diem += 1;
  }
  return diem;
}

/**
 * Danh mục công cụ cho một lượt hỏi.
 * @param duocDung tên công cụ người hỏi có quyền dùng (chat-tools.congCuDuocDung) — bỏ trống = tất cả
 * @param vongSau true khi đã sang vòng 2+ → đưa đủ (lưới an toàn ③)
 */
export function chonCongCu(cauHoi: string, duocDung?: string[], vongSau = false): ToolSpec[] {
  // Công cụ người này KHÔNG có quyền thì bỏ hẳn khỏi prompt
  const duocPhep = TOOL_SPECS.filter((s) => !duocDung || duocDung.includes(s.name));
  if (vongSau) return duocPhep;

  const cauHoiPhang = boDau(cauHoi);
  const tuCauHoi = new Set(tuKhoa(cauHoi));
  const cham = duocPhep
    .map((s) => ({ s, d: (NHOM_LOI as readonly string[]).includes(s.name) ? 99 : chamDiem(s, tuCauHoi, cauHoiPhang) }))
    .filter((x) => x.d > 0)
    .sort((a, b) => b.d - a.d);

  if (cham.length < TOI_THIEU) return duocPhep;
  const chon = cham.slice(0, TRAN).map((x) => x.s);
  // Giữ đúng thứ tự gốc cho prompt ổn định giữa các lượt
  return duocPhep.filter((s) => chon.includes(s));
}
