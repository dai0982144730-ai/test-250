// Bỏ qua một issue (Mr. Đại chốt 06/10/2026: "Bỏ qua" thay "Xóa", "Hiện lại bỏ qua" thay "Xem đã xóa"). Thẻ GĂNG thì ghi luôn sổ
// "không cần giao" theo mã WBS của Cây việc — một sổ cho hai màn (trước đó Issue ghi cờ trên thẻ, Cây việc ghi tệp riêng → lệch).
// Offline: CSDL RAM + thư mục dữ liệu tạm; không gọi agent khác, không gọi AI.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tam = fs.mkdtempSync(path.join(os.tmpdir(), "bo-qua-gang-"));
process.env.DOCFLOW_DB = "memory";
process.env.DOCFLOW_AI_DATA = tam;

const ND = { id: "u-test", ten: "Người thử" };

describe("boQuaIssue — một sổ cho Issue và Cây việc", () => {
  let mod: typeof import("@/lib/cay-viec/issue/viec-cho-duyet");
  let so: typeof import("@/lib/cay-viec/issue/so-issue");
  let kcg: typeof import("@/lib/cay-viec/khong-can-giao");
  beforeAll(async () => {
    mod = await import("@/lib/cay-viec/issue/viec-cho-duyet");
    so = await import("@/lib/cay-viec/issue/so-issue");
    kcg = await import("@/lib/cay-viec/khong-can-giao");
    const the = (id: string, nguon: "gang" | "nguoi", wbs: string) => ({
      id, nguon, mucDo: "red", tieuDe: `thẻ ${id}`, phanTich: "", wbs, anhHuongCod: 0, nguonDuLieu: "", deXuat: "x",
      dieuKien: "dang-vi-pham", xuLy: "chua-ai-dong", ghiNhan: [], ngayMo: "2026-10-06",
    });
    so.ghiSo("TEST", { lanChayCuoi: "2026-10-06", the: [the("ISS-1", "gang", "7.2.3"), the("ISS-2", "nguoi", "2.4.7")] } as never);
  });
  afterAll(() => fs.rmSync(tam, { recursive: true, force: true }));

  it("Bỏ qua thẻ găng → cờ trên thẻ + mã WBS vào sổ không cần giao của Cây việc", () => {
    expect(mod.boQuaIssue("TEST", "ISS-1", false, ND).ok).toBe(true);
    expect(so.docSo("TEST").the.find((t) => t.id === "ISS-1")?.khongCanGiao?.nguoi).toBe("Người thử");
    expect(kcg.tapKhongCanGiao("TEST").has("7.2.3")).toBe(true);
  });

  it("Hiện lại bỏ qua → gỡ cả hai nơi", () => {
    expect(mod.boQuaIssue("TEST", "ISS-1", true, ND).ok).toBe(true);
    expect(so.docSo("TEST").the.find((t) => t.id === "ISS-1")?.khongCanGiao).toBeUndefined();
    expect(kcg.tapKhongCanGiao("TEST").has("7.2.3")).toBe(false);
  });

  it("Thẻ không phải găng → chỉ cờ trên thẻ, không đụng sổ Cây việc", () => {
    expect(mod.boQuaIssue("TEST", "ISS-2", false, ND).ok).toBe(true);
    expect(kcg.tapKhongCanGiao("TEST").has("2.4.7")).toBe(false);
  });
});
