// Nhãn «🛠 TIN HỆ THỐNG» đầu mọi tin máy tự gửi (Mr. Đại gật 26/10/2026) — kiểm độc lập lần 2 (C-1): bỏ nhãn trước đây
// không bài nào bắt. Câu nằm ở 3 nơi, 3 ngôn ngữ (Main TS · gác PowerShell · gui-telegram.py) — bài này giữ ba bản khớp từng ký tự.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { NHAN_TIN_HE_THONG, ganNhanHeThong } from "@/lib/bao-cao-sang/telegram";

// Hai tệp ngoài kho Main (ở gốc thư mục «SCI Tiến độ»): có thì so, không có (máy khác) thì bỏ qua
const GOC = path.resolve(process.cwd(), "..", "..");
const GAC = path.join(GOC, "GAC-5-AGENT.ps1");
const PY = path.join(GOC, "cong-cu-claude", "gui-telegram.py");

describe("nhãn tin hệ thống", () => {
  it("đúng câu đã chốt, đứng dòng đầu của tin", () => {
    expect(NHAN_TIN_HE_THONG).toBe("🛠 TIN HỆ THỐNG — không phải trả lời câu hỏi của anh");
    const t = ganNhanHeThong("🟡 Nhắc: Agent tiến độ đã có nháp báo cáo tuần.");
    expect(t.split("\n")[0]).toBe(NHAN_TIN_HE_THONG);
    expect(t.split("\n")[1]).toBe("🟡 Nhắc: Agent tiến độ đã có nháp báo cáo tuần.");
  });

  // MG-7 (kiểm lại 26/10 tối): hai bài dưới BỎ QUA khi chạy ở máy / thư mục không có tệp ngoài kho — vitest ghi «skipped», ghi rõ ở tên bài
  it.skipIf(!fs.existsSync(GAC))("kịch bản gác GAC-5-AGENT.ps1 dùng đúng câu đó và gắn vào mọi tin gửi (bỏ qua nếu thiếu tệp ngoài kho)", () => {
    const ps = fs.readFileSync(GAC, "utf8");
    expect(ps.match(/\$NHAN_TIN_HE_THONG = '([^']+)'/)?.[1]).toBe(NHAN_TIN_HE_THONG);
    expect(ps).toContain('text = "$NHAN_TIN_HE_THONG`n$chu"');
  });

  it.skipIf(!fs.existsSync(PY))("cong-cu-claude/gui-telegram.py dùng đúng câu đó và gắn vào mọi tin gửi (bỏ qua nếu thiếu tệp ngoài kho)", () => {
    const py = fs.readFileSync(PY, "utf8");
    expect(py.match(/^NHAN = "([^"]+)"/m)?.[1]).toBe(NHAN_TIN_HE_THONG);
    expect(py).toMatch(/noi_dung = f"\{NHAN\}\\n\{p\}" if len\(phan\) == 1 else f"\{NHAN\} \(\{i\}\/\{len\(phan\)\}\)\\n\{p\}"/);
  });
});
