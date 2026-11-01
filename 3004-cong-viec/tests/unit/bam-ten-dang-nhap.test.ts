// Dữ liệu cũ có cả hai công tắc bật thì «bấm tên là đăng nhập luôn» không được có hiệu lực.
import { describe, it, expect } from "vitest";
import { bamLaDangNhapHieuLuc } from "@/lib/cau-hinh/dang-nhap";

describe("bấm tên là đăng nhập luôn — hiệu lực", () => {
  it("cả hai bật → không có hiệu lực", () => expect(bamLaDangNhapHieuLuc({ danh_sach_dang_nhap: true, bam_la_dang_nhap: true })).toBe(false));
  it("chỉ bấm tên bật → có", () => expect(bamLaDangNhapHieuLuc({ danh_sach_dang_nhap: false, bam_la_dang_nhap: true })).toBe(true));
  it("chỉ danh sách bật → không", () => expect(bamLaDangNhapHieuLuc({ danh_sach_dang_nhap: true, bam_la_dang_nhap: false })).toBe(false));
});
