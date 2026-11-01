// Bảng điều hành — nhãn "N việc găng tới COD · M việc găng dự báo chậm so với Baseline" (Mr. Đại chốt 24/09; luật 36 14/10).
// Main chỉ hiển thị số cổng `tiendo.tom_tat_du_an` trả (so_viec_gang,
// so_viec_gang_dang_tre); cổng chưa trả thì nói thẳng, không thay 0.
// Chưa có Baseline đã duyệt (cham_ngay_so_baseline = null) → agent Tiến độ tạm so với bảng đang lập — phải nói đúng tên đó.
import { describe, expect, it } from "vitest";
import { nhanViecGang } from "@/lib/bang-dieu-hanh/gom";

describe("nhãn việc găng tới COD", () => {
  it("đủ hai số, có Baseline đã duyệt", () => {
    expect(nhanViecGang({ soViecGang: 17, soViecGangDangTre: 17, lechNgaySoBaseline: 44 })).toBe(
      "17 việc găng tới COD · 17 việc găng dự báo chậm so với Baseline"
    );
    expect(nhanViecGang({ soViecGang: 11, soViecGangDangTre: 0, lechNgaySoBaseline: 0 })).toBe(
      "11 việc găng tới COD · 0 việc găng dự báo chậm so với Baseline"
    );
  });
  it("chưa có Baseline đã duyệt → nói thẳng đang so với tiến độ đang lập", () => {
    expect(nhanViecGang({ soViecGang: 11, soViecGangDangTre: 2, lechNgaySoBaseline: null })).toBe(
      "11 việc găng tới COD · 2 việc găng dự báo chậm so với tiến độ đang lập (chưa duyệt Baseline)"
    );
  });
  it("cổng chưa trả trường → không đoán, không thay 0", () => {
    expect(nhanViecGang({ soViecGang: null, soViecGangDangTre: null, lechNgaySoBaseline: null })).toBe(
      "chưa lấy được số việc găng tới COD"
    );
    expect(nhanViecGang({ soViecGang: 5, soViecGangDangTre: null, lechNgaySoBaseline: 3 })).toBe(
      "5 việc găng tới COD · chưa lấy được số việc găng dự báo chậm"
    );
  });
});
