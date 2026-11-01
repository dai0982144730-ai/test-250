// ============================================================
// cay-viec/issue/nguong-luu.ts — ĐỌC / GHI ngưỡng N·M·K xuống đĩa (chép lib/canh-bao/cau-hinh-luu.ts của agent Base).
// Một file chung cho mọi dự án (Base cũng một bộ ngưỡng chung): data/cay-viec/nguong-issue.json. CHỈ SERVER — node:fs (luật 10).
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { thuMucDuLieu } from "@/lib/ai/duong-dan";
import { soatNguong, soSanhNguong, tronNguong, type CauHinhNguong, type NguongIssue } from "./nguong";

const tep = () => thuMucDuLieu("cay-viec", "nguong-issue.json");

export function docNguong(): CauHinhNguong {
  try {
    const t = tep();
    if (!fs.existsSync(t)) return tronNguong(null);
    return tronNguong(JSON.parse(fs.readFileSync(t, "utf8")) as Partial<CauHinhNguong>);
  } catch {
    // File hỏng thì chạy bằng mặc định, KHÔNG chặn cả màn Issue
    return tronNguong(null);
  }
}

/** Lưu ngưỡng mới KÈM VẾT (máy tự so cũ ↔ mới). Giữ 200 dòng vết gần nhất. */
export function luuNguong(moi: NguongIssue, nguoi: string): { ok: true; ch: CauHinhNguong; soDoi: number } | { ok: false; loi: string } {
  const loi = soatNguong(moi);
  if (loi) return { ok: false, loi };
  const cu = docNguong();
  const doi = soSanhNguong(cu, moi);
  const luc = new Date().toISOString();
  const ch: CauHinhNguong = { N: moi.N, M: moi.M, K: moi.K, vet: [...cu.vet, ...doi.map((d) => ({ luc, nguoi, ...d }))].slice(-200) };
  const t = tep();
  fs.mkdirSync(path.dirname(t), { recursive: true });
  fs.writeFileSync(t, JSON.stringify(ch, null, 2) + "\n", "utf8");
  return { ok: true, ch, soDoi: doi.length };
}
