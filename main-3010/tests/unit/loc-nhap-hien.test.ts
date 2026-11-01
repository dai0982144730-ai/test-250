// ============================================================
// TEST: LỌC NHÁP "VIỆC AI SOẠN CHỜ DUYỆT" (src/lib/chung/viec-cong-viec-kieu.ts locNhapHien — Mr. Đại bắt 04/10/2026:
// "nếu đã giao rồi thì ẩn đi, không hiển thị nữa thành rác thông tin")
// Mẫu lấy từ đo thật 04/10: AI soạn 2 bản cho ISS-2026-36-001, một bản đã giao thành CV-2026-0128.
// Thuần — không đọc tệp, không gọi agent. Bản gốc ở Main, chép nguyên sang Tiến độ · Hợp đồng.
// ============================================================
import { describe, expect, it } from "vitest";
import { locNhapHien } from "@/lib/chung/viec-cong-viec-kieu";

const n = (id: string, ten: string, tuIssue = "") => ({ id, ten, tuIssue });

describe("locNhapHien", () => {
  it("ẩn nháp đã có việc cùng tên trong Việc tôi giao (bỏ tiền tố [dự án]) — và mọi nháp khác của cùng thẻ", () => {
    const ds = [
      n("a", "Bổ sung khối lượng thiết kế vào tiến độ WBS 1.1.4", "ISS-2026-36-001"),
      n("b", "Lập hồ sơ BCNCKT + bổ sung khối lượng thiết kế WBS 1.1.4", "ISS-2026-36-001"),
      n("c", "Bổ sung khối lượng thiết kế PCCC vào tiến độ WBS 1.1.7", "ISS-2026-36-007"),
    ];
    const giao = [{ ten: "[Điện gió Hướng Việt (HV — dữ liệu test)] Bổ sung khối lượng thiết kế vào tiến độ WBS 1.1.4" }];
    expect(locNhapHien(ds, giao).map((x) => x.id)).toEqual(["c"]);
  });

  it("một thẻ chỉ giữ bản MỚI NHẤT (danh sách vào đã sắp mới trước)", () => {
    const ds = [n("moi", "Khởi công 6.1.4 Cung cấp Hub, Nacelle — bản 2", "ISS-2026-39-140"), n("cu", "Khởi công 6.1.4 Cung cấp Hub — bản 1", "ISS-2026-39-140")];
    expect(locNhapHien(ds, []).map((x) => x.id)).toEqual(["moi"]);
  });

  it("nháp từ câu nói (không thẻ): chỉ gộp khi trùng tên, tên ngắn chỉ khớp khi bằng hẳn", () => {
    const ds = [n("1", "Test tiến độ"), n("2", "Test  tiến độ"), n("3", "Test phần mềm agent tiến độ")];
    // "Test tiến độ" (12 ký tự) KHÔNG bị ẩn chỉ vì có việc "Test tiến độ móng T1" — tên ngắn phải bằng hẳn
    expect(locNhapHien(ds, [{ ten: "Test tiến độ móng T1" }]).map((x) => x.id)).toEqual(["1", "3"]);
    expect(locNhapHien(ds, [{ ten: "Test tiến độ" }]).map((x) => x.id)).toEqual(["3"]);
  });
});
