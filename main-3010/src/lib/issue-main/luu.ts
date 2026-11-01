// ============================================================
// SỔ KẾT QUẢ PHÂN LOẠI + CHỌN "CẦN ANH XEM"  (server-only — node:fs)
//
// Vì sao phải lưu: phân loại là lượt gọi LLM, tốn token và mất vài giây. Không
// lưu thì mỗi lần mở màn lại phải chạy lại — vừa đắt vừa cho ra thứ tự khác
// nhau giữa hai lần xem cùng một đống issue, lãnh đạo tưởng dữ liệu nhảy.
//
// Ở đây KHÔNG lưu bản sao issue — chỉ lưu MÃ issue kèm nhóm LLM xếp. Chép cả
// issue về là dựng bản số liệu thứ hai, đúng điều mục 1 cấm.
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { projectDataDir, resolveProjectId } from "@/lib/projects";
import type { DongCanXem, DongPhanLoai } from "./phan-loai";

const TEN_FILE = "issue-main.json";

export interface SoIssueMain {
  /** ISO datetime lượt phân loại gần nhất — "" nghĩa là chưa chạy lần nào */
  lanPhanLoaiCuoi: string;
  phanLoai: DongPhanLoai[];
  lanChonCuoi: string;
  canXem: DongCanXem[];
}

const RONG: SoIssueMain = {
  lanPhanLoaiCuoi: "",
  phanLoai: [],
  lanChonCuoi: "",
  canXem: [],
};

function duongDan(projectId?: string): string {
  return path.join(projectDataDir(resolveProjectId(projectId)), TEN_FILE);
}

export function docSoIssueMain(projectId?: string): SoIssueMain {
  try {
    const fp = duongDan(projectId);
    if (!fs.existsSync(fp)) return { ...RONG };
    const j = JSON.parse(fs.readFileSync(fp, "utf8")) as Partial<SoIssueMain>;
    return {
      lanPhanLoaiCuoi: typeof j.lanPhanLoaiCuoi === "string" ? j.lanPhanLoaiCuoi : "",
      phanLoai: Array.isArray(j.phanLoai) ? j.phanLoai : [],
      lanChonCuoi: typeof j.lanChonCuoi === "string" ? j.lanChonCuoi : "",
      canXem: Array.isArray(j.canXem) ? j.canXem : [],
    };
  } catch {
    // Sổ hỏng thì màn vẫn phải mở được — chỉ mất phần phân loại, issue còn nguyên
    return { ...RONG };
  }
}

export function ghiSoIssueMain(so: SoIssueMain, projectId?: string): void {
  const fp = duongDan(projectId);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, JSON.stringify(so, null, 2), "utf8");
}

/**
 * `giuIdAn` (18/10/2026): thẻ người bấm không được thấy nên không đưa AI — dòng phân loại cũ của chúng được giữ,
 * để người thấy hết không thấy thẻ rơi về 📁 Khác chỉ vì người ngoài dự án vừa bấm.
 */
export function luuPhanLoai(dong: DongPhanLoai[], projectId?: string, giuIdAn: readonly string[] = []): SoIssueMain {
  const so = docSoIssueMain(projectId);
  const an = new Set(giuIdAn);
  const moiId = new Set(dong.map((d) => d.id));
  const moi: SoIssueMain = {
    ...so,
    lanPhanLoaiCuoi: new Date().toISOString(),
    phanLoai: [...dong, ...so.phanLoai.filter((d) => an.has(d.id) && !moiId.has(d.id))],
  };
  ghiSoIssueMain(moi, projectId);
  return moi;
}

export function luuCanXem(dong: DongCanXem[], projectId?: string): SoIssueMain {
  const so = docSoIssueMain(projectId);
  const moi: SoIssueMain = {
    ...so,
    lanChonCuoi: new Date().toISOString(),
    canXem: dong,
  };
  ghiSoIssueMain(moi, projectId);
  return moi;
}
