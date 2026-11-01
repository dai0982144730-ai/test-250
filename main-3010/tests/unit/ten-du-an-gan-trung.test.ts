// Một dự án không hai tên — chặn ngay lúc khai ở Main (soát độc lập 03/10/2026 điểm 2).
// Hàm chép y hệt agent Công việc (kiem-tra.ts duAnHaiTen) — bộ ví dụ giống tests/unit/du-an-mot-ten.test.ts bên đó.
import "../ho-tro/du-an-du-lieu-rieng";
import { describe, it, expect } from "vitest";
import { createProject, updateProject } from "@/lib/projects";
import { duAnHaiTen } from "@/lib/ten-du-an-gan-trung";

describe("tên dự án gần trùng (Main)", () => {
  it("Nam Khian 1 ~ Nậm Khiên 1 bị chặn; khác số (Nậm Mô 1 / Nậm Mô 2) không tính", () => {
    expect(duAnHaiTen([{ ten: "Nam Khian 1", ten_khac: [] }, { ten: "Nậm Khiên 1", ten_khac: [] }])).toHaveLength(1);
    expect(duAnHaiTen([{ ten: "Nậm Mô 1" }, { ten: "Nậm Mô 2" }])).toEqual([]);
  });
  it("xét cả tên gọi khác; bỏ tiền tố 'TĐ', 'Điện gió'", () => {
    expect(duAnHaiTen([{ ten: "Hướng Việt", ten_khac: ["ĐG Tân Thành"] }, { ten: "Tân Thành" }])).toHaveLength(1);
    expect(duAnHaiTen([{ ten: "TĐ Nam Lan 1" }, { ten: "Thủy điện Nam Lan 2" }])).toEqual([]);
  });

  it("khai ở Main: thêm dự án tên gần trùng bị chặn, khác số thì cho; sửa tên gọi khác thành gần trùng cũng chặn", () => {
    const a = createProject({ name: "Nậm Khiên 1", ma: "NKH1", createdBy: "test" });
    expect(a.ok).toBe(false);
    if (!a.ok) expect(a.error).toMatch(/gần trùng/);
    const b = createProject({ name: "Nậm Mô 2", ma: "NM2", createdBy: "test" });
    expect(b.ok).toBe(true);
    const c = updateProject("nam-mo-1", { tenKhac: ["Nam Khien 1"] });
    expect(c.ok).toBe(false);
    const d = updateProject("nam-mo-1", { tenKhac: ["TĐ Nậm Mô 1"] });
    expect(d.ok).toBe(true);
  });
});
