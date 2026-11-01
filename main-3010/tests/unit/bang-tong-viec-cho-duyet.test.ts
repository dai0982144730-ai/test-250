// Đợt ④ (06/10/2026) — bảng tổng việc chờ duyệt ở Main: hai thay đổi ở khuôn chung viec-cong-viec-kieu.ts
//   ① nháp gom từ agent khác đã mang sẵn "Từ issue …" → ketQuaMacDinhNhap không ghép lần hai
//   ② cùng mã issue ở HAI agent khác nhau là hai việc khác nhau → locNhapHien không gộp
import { describe, expect, it } from "vitest";
import { ketQuaMacDinhNhap, locNhapHien } from "@/lib/chung/viec-cong-viec-kieu";

describe("bảng tổng việc chờ duyệt (đợt ④)", () => {
  it("không ghép lặp 'Từ issue' khi agent gốc đã ghép sẵn", () => {
    expect(ketQuaMacDinhNhap({ tuIssue: "ISS-1", moTa: "Từ issue ISS-1. Gọi nhà thầu bổ sung xe." })).toBe("Từ issue ISS-1. Gọi nhà thầu bổ sung xe.");
    expect(ketQuaMacDinhNhap({ tuIssue: "ISS-1", moTa: "Gọi nhà thầu bổ sung xe." })).toBe("Từ issue ISS-1. Gọi nhà thầu bổ sung xe.");
    expect(ketQuaMacDinhNhap({ tuIssue: "", moTa: "Việc từ câu nói" })).toBe("Việc từ câu nói");
  });

  it("cùng mã issue ở hai agent khác nhau không bị gộp; cùng agent thì giữ bản mới nhất", () => {
    const ds = [
      { ten: "Xử lý A", tuIssue: "ISS-9", agent: "tiendo" },
      { ten: "Xử lý B", tuIssue: "ISS-9", agent: "hopdong" },
      { ten: "Xử lý A bản cũ", tuIssue: "ISS-9", agent: "tiendo" },
    ];
    expect(locNhapHien(ds, []).map((n) => n.ten)).toEqual(["Xử lý A", "Xử lý B"]);
  });
});
