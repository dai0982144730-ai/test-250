// Hạn 7 ngày của khoá Google Drive (chế độ Testing) — phép tính của CODE, cùng đầu vào phải ra cùng đáp số.

import { describe, expect, it } from "vitest";
import { cauHanKhoa, tinhHanKhoa } from "@/lib/drive/han-khoa";

const NGAY = 86_400_000;
const CAP = Date.UTC(2026, 8, 21, 3, 0, 0); // cấp 21/09 10:00 giờ VN

describe("hạn khoá Google Drive", () => {
  it("khoá nối trước 21/09 không có ngày cấp → không rõ, không bịa số ngày", () => {
    expect(tinhHanKhoa(undefined, CAP)).toEqual({ muc: "khong-ro", conNgay: null, hetNgay: null });
    expect(cauHanKhoa(tinhHanKhoa(null, CAP))).toBe("");
  });

  it("mới cấp → còn 7 ngày, chưa báo", () => {
    const h = tinhHanKhoa(CAP, CAP + 60_000);
    expect(h.muc).toBe("con-han");
    expect(h.conNgay).toBe(6); // làm tròn XUỐNG: còn 6,999 ngày ghi 6 — thà báo sớm
    expect(h.hetNgay).toBe("2026-09-28");
  });

  it("còn từ 2 ngày trở xuống → báo trước, câu có số ngày và ngày chết", () => {
    const h = tinhHanKhoa(CAP, CAP + 4.5 * NGAY);
    expect(h.muc).toBe("sap-het");
    expect(h.conNgay).toBe(2);
    expect(cauHanKhoa(h)).toContain("còn 2 ngày");
    expect(cauHanKhoa(h)).toContain("2026-09-28");
  });

  it("còn 3 ngày thì chưa báo", () => {
    expect(tinhHanKhoa(CAP, CAP + 3.5 * NGAY).muc).toBe("con-han");
  });

  it("quá 7 ngày → hết hạn", () => {
    const h = tinhHanKhoa(CAP, CAP + 7 * NGAY + 1);
    expect(h.muc).toBe("het-han");
    expect(cauHanKhoa(h)).toContain("Kết nối lại ở Main");
  });
});
