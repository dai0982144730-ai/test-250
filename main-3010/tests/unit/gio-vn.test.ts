// Giờ VN — phần duy nhất Main giữ lại từ bộ hẹn giờ tiến độ đã gỡ 24/09
import { describe, expect, it } from "vitest";
import { gioVn } from "@/lib/gio-vn";

describe("gioVn", () => {
  it("đổi UTC sang giờ VN đúng (23:30 UTC = 06:30 hôm sau VN)", () => {
    const v = gioVn(new Date("2026-09-03T23:30:00Z"));
    expect(v.ngay).toBe("2026-09-04");
    expect(v.gio).toBe("06:30");
  });
  it("thứ theo giờ VN (07/09/2026 05:01 VN là Thứ Hai)", () => {
    expect(gioVn(new Date("2026-09-06T22:01:00Z")).thu).toBe(1);
  });
});
