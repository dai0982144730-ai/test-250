// ============================================================
// globalSetup của vitest — dựng bản sao `data/` trước khi chạy, dọn sau khi xong.
// Xem tests/ho-tro/thu-muc-du-lieu.ts để biết vì sao phải làm vậy.
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { THU_MUC_DU_LIEU_TEST, thuMucDuLieuThat } from "./thu-muc-du-lieu";

/** Lần chạy bị cắt ngang (Ctrl+C) không kịp teardown — dọn xác cũ hơn 6 giờ. */
const HAN_XAC_MS = 6 * 60 * 60 * 1000;

function dich(): string {
  return process.env.THU_MUC_DU_LIEU?.trim() || THU_MUC_DU_LIEU_TEST;
}

function donXacCu(den: string): void {
  const cha = path.dirname(den);
  if (!fs.existsSync(cha)) return;
  for (const ten of fs.readdirSync(cha)) {
    const p = path.join(cha, ten);
    if (p === den) continue;
    try {
      if (Date.now() - fs.statSync(p).mtimeMs > HAN_XAC_MS) {
        fs.rmSync(p, { recursive: true, force: true });
      }
    } catch {
      /* lần chạy song song đang dùng — kệ nó */
    }
  }
}

export function setup(): void {
  const den = dich();
  const that = thuMucDuLieuThat();
  fs.rmSync(den, { recursive: true, force: true });
  fs.mkdirSync(den, { recursive: true });
  donXacCu(den);
  // Chưa có `data/` (máy mới, CI) thì để trống — các bài chạy-thật tự skipIf,
  // đúng như hành vi cũ, không bịa dữ liệu để làm test xanh giả.
  if (fs.existsSync(that)) fs.cpSync(that, den, { recursive: true });
}

export function teardown(): void {
  fs.rmSync(dich(), { recursive: true, force: true });
}
