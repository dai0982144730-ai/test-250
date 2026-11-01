// ============================================================
// MỐC GIỮ SỔ — PHẦN RIÊNG CỦA AGENT NHẬN (kéo từ Main).
// Hai mốc là cài đặt chung của hệ, khai ở Main (Cài đặt → 🔌 Kết nối). App này kéo
// về trong lượt `main.du_lieu_dung_chung` (lib/dong-bo-tu-main.ts, trường `giu_so`)
// và giữ bản sao ở `data/giu-so-tu-main.json`. Chưa kéo được lần nào / bản sao hỏng
// → mặc định của khuôn (10 · 35 ngày).
// `don-so.ts` chỉ nhìn `thuMucSo` + `docMocGiuSo` — tệp đó chép giống hệt 4 app Next.
// Server-only (node:fs).
//
// ⚠ AGENT CÔNG VIỆC (03/10/2026): app này CHƯA kéo cấu hình từ Main, nên chưa ai gọi
// `ghiMocGiuSoTuMain` → `docMocGiuSo` luôn trả mặc định 10 · 35 ngày. Giữ nguyên hàm để
// khi nối Main chỉ cần gọi một chỗ.
// ============================================================

import fs from "node:fs";
import path from "node:path";
// Agent Công việc: thư mục dữ liệu chung của app (đặt DOCFLOW_AI_DATA để test trỏ sang thư mục tạm)
import { thuMucDuLieu } from "@/lib/ai/duong-dan";
import { MOC_GIU_SO_MAC_DINH, kiemMocGiuSo, type MocGiuSo } from "./moc-giu-so";

const TEN_TEP = "giu-so-tu-main.json";

/** Thư mục chứa sổ hỏi–đáp + tệp trạng thái dọn sổ */
export function thuMucSo(): string {
  return thuMucDuLieu();
}

export function docMocGiuSo(): { moc: MocGiuSo; nguon: "main" | "mac-dinh" } {
  try {
    const k = kiemMocGiuSo(JSON.parse(fs.readFileSync(path.join(thuMucSo(), TEN_TEP), "utf8")));
    if (k.ok) return { moc: k.moc, nguon: "main" };
  } catch {
    /* chưa kéo lần nào */
  }
  return { moc: { ...MOC_GIU_SO_MAC_DINH }, nguon: "mac-dinh" };
}

/**
 * Ghi bản sao hai mốc Main gửi (`giu_so: {day_du, gon}`). Main bản cũ không gửi
 * (`undefined`) hoặc gửi mốc sai → KHÔNG ghi, giữ bản đang có, trả null.
 */
export function ghiMocGiuSoTuMain(tho: unknown): MocGiuSo | null {
  if (tho === undefined || tho === null) return null;
  const k = kiemMocGiuSo(tho);
  if (!k.ok) return null;
  const p = path.join(thuMucSo(), TEN_TEP);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify({ ...k.moc, luc: new Date().toISOString() }, null, 2), "utf8");
  return k.moc;
}
