// ============================================================
// MỐC GIỮ SỔ — PHẦN RIÊNG CỦA MAIN (bản gốc của cả hệ).
// Main đọc thẳng cài đặt của chính nó (`data/cai-dat-base.json` → `giuSo`, sửa ở
// Cài đặt → 🔌 Kết nối); 4 agent kia có tệp cùng tên đọc bản kéo từ Main.
// `don-so.ts` chỉ nhìn hai hàm dưới — tệp đó chép giống hệt ở 4 app Next.
// Server-only (node:fs qua cai-dat-base).
// ============================================================

import { gocDuLieu } from "@/lib/goc-du-lieu";
import { docCaiDat } from "@/lib/cai-dat-base";
import { MOC_GIU_SO_MAC_DINH, kiemMocGiuSo, type MocGiuSo } from "./moc-giu-so";

/** Thư mục chứa sổ hỏi–đáp + tệp trạng thái dọn sổ */
export function thuMucSo(): string {
  return gocDuLieu();
}

export function docMocGiuSo(): { moc: MocGiuSo; nguon: "main" | "mac-dinh" } {
  const k = kiemMocGiuSo(docCaiDat().giuSo);
  return k.ok ? { moc: k.moc, nguon: "main" } : { moc: { ...MOC_GIU_SO_MAC_DINH }, nguon: "mac-dinh" };
}
