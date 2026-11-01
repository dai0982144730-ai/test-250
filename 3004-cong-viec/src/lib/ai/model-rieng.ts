// ============================================================
// model-rieng.ts — MODEL TRỢ LÝ CỦA TỪNG NGƯỜI (chip model trong khung chat).
// Bản gốc ghi một model chung vào settings.json; SCI công việc: model MẶC ĐỊNH là cấu hình
// `ai.model_mac_dinh` (quản trị đổi ở Cài đặt), mỗi người chọn đè riêng cho mình ở
// chip model — lưu data/ai/model-rieng.json. Chọn "" = về mặc định cấu hình.
// Server-only.
// ============================================================

import fs from "node:fs";
import path from "node:path";
import type { Q } from "@/lib/db";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { thuMucDuLieu } from "./duong-dan";

function tep(): string {
  return thuMucDuLieu("ai", "model-rieng.json");
}

function docTatCa(): Record<string, string> {
  try {
    const j = JSON.parse(fs.readFileSync(tep(), "utf8")) as unknown;
    if (j === null || typeof j !== "object" || Array.isArray(j)) return {};
    const ra: Record<string, string> = {};
    for (const [k, v] of Object.entries(j as Record<string, unknown>)) if (typeof v === "string") ra[k] = v;
    return ra;
  } catch {
    return {};
  }
}

export function docModelRieng(nguoiId: string): string {
  return docTatCa()[nguoiId] ?? "";
}

export function ghiModelRieng(nguoiId: string, model: string): void {
  const ds = docTatCa();
  if (model.trim() === "") delete ds[nguoiId];
  else ds[nguoiId] = model.trim();
  fs.mkdirSync(path.dirname(tep()), { recursive: true });
  fs.writeFileSync(tep(), JSON.stringify(ds, null, 2), "utf8");
}

/** Model mặc định của trợ lý chat: ai.model_tro_ly, trống thì ai.model_mac_dinh */
export function modelTroLyMacDinh(ch: { model_mac_dinh?: string; model_tro_ly?: string }): string {
  return ch.model_tro_ly?.trim() || ch.model_mac_dinh || "";
}

/** Model hiệu lực cho một lượt: chọn riêng của người → cấu hình ai.model_tro_ly → ai.model_mac_dinh */
export async function modelHieuLuc(q: Q, nguoiId: string): Promise<{ model: string; nguon: "rieng" | "cau_hinh" }> {
  const rieng = docModelRieng(nguoiId);
  if (rieng !== "") return { model: rieng, nguon: "rieng" };
  return { model: modelTroLyMacDinh(await layCauHinh(q, "ai")), nguon: "cau_hinh" };
}
