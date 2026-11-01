// HẠN NỘP BÁO CÁO TUẦN (Mr. Đại chốt 29/09/2026): ngày "thứ" của CHÍNH TUẦN BÁO CÁO, giờ theo Cài đặt — quá hạn mà
// chưa nộp thì biểu tượng sổ trên Sơ đồ tự hiện "!" (không cần ai bấm nhắc).
import { describe, it, expect } from "vitest";
import { bayGioVN, hanNopTheoCap, hanNopTuan, tuanCua } from "@/lib/phong/tuan";
import { MAC_DINH } from "@/lib/cau-hinh/mac-dinh";

describe("hạn nộp báo cáo tuần", () => {
  const t40 = tuanCua("2026-09-29"); // tuần 40: 28/09 – 04/10/2026

  it("thứ Bảy 10:00 (Cài đặt thật) → 03/10/2026 10:00, cùng tuần", () => {
    expect(t40.so).toBe(40);
    expect(hanNopTuan(t40, 6, "10:00")).toBe("2026-10-03T10:00");
  });

  it("thứ Hai → 28/09/2026; Chủ nhật → 04/10/2026", () => {
    expect(hanNopTuan(t40, 1, "10:00")).toBe("2026-09-28T10:00");
    expect(hanNopTuan(t40, 7, "08:00")).toBe("2026-10-04T08:00");
  });

  it("so với giờ Việt Nam: 03/10 09:59 chưa quá hạn, 10:01 đã quá hạn", () => {
    const han = hanNopTuan(t40, 6, "10:00");
    expect(bayGioVN(new Date("2026-10-03T02:59:00Z")) > han).toBe(false);
    expect(bayGioVN(new Date("2026-10-03T03:01:00Z")) > han).toBe(true);
  });

  it("hạn rơi ngày nghỉ → dời sang ngày làm việc kế tiếp (bỏ qua cả Chủ nhật)", () => {
    // tuần 18/2027: 26/04 – 02/05; thứ Sáu 30/04 và thứ Bảy 01/05 là ngày lễ → Chủ nhật 02/05 → thứ Hai 03/05
    const t18 = tuanCua("2027-04-28");
    expect(hanNopTuan(t18, 6, "10:00", ["2027-04-30", "2027-05-01"])).toBe("2027-05-03T10:00");
    expect(hanNopTuan(t18, 6, "10:00")).toBe("2027-05-01T10:00");
  });
});

describe("hạn nộp báo cáo tuần theo cấp (Mr. Đại chốt 30/09)", () => {
  it("mặc định tuần 40 (28/09 – 04/10/2026): cấp 1 thứ Hai tuần sau 10:00 · cấp 2 thứ Bảy 10:00 · cấp 3 thứ Bảy 08:00 · cấp 4 thứ Sáu 17:00", () => {
    const t40 = tuanCua("2026-09-30");
    const ch = MAC_DINH.ky_bao_cao.han_nop_theo_cap;
    expect(hanNopTheoCap(t40, 1, ch)).toBe("2026-10-05T10:00");
    expect(hanNopTheoCap(t40, 2, ch)).toBe("2026-10-03T10:00");
    expect(hanNopTheoCap(t40, 3, ch)).toBe("2026-10-03T08:00");
    expect(hanNopTheoCap(t40, 4, ch)).toBe("2026-10-02T17:00");
  });
  it("cấp 1 tuần sau rơi vào ngày nghỉ thì dời sang ngày làm việc kế tiếp", () => {
    const t40 = tuanCua("2026-09-30");
    expect(hanNopTheoCap(t40, 1, MAC_DINH.ky_bao_cao.han_nop_theo_cap, ["2026-10-05"])).toBe("2026-10-06T10:00");
  });
});
