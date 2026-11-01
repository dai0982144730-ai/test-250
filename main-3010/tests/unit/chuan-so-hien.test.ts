// CHUẨN SỐ VIỆT NAM — số HIỆN RA ở Main (Mr. Đại chốt 12/10/2026, KE-HOACH/10 chốt 130): thập phân dấu phẩy, nhóm ba chữ số
// dấu chấm. Bảng ví dụ số ĐỌC VÀO nằm ở doc-so.test.ts (chép nguyên từ agent Tiến độ); tệp này khoá cách HIỆN của Main.
import { describe, expect, it } from "vitest";
import { DASH, fmtCoTep, fmtNum, fmtPct, fmtSo } from "@/lib/format";
import { chuGiaTri, hienO, oCoSo, type AnhXaNguon, type VetNguon } from "@/lib/bao-cao-thang/model";
import { hienSo as hienSoSang } from "@/lib/bao-cao-sang/model";
import { dongDauDuAn, type DauDuAn } from "@/lib/bao-cao-sang/luat-cod";
import { hienSo as hienSoIssue, hienTien } from "@/lib/issue-main/model";

describe("lib/format — bốn hàm hiện số", () => {
  it("fmtNum: đúng số chữ số lẻ, nhóm ba bằng dấu chấm", () => {
    expect(fmtNum(1234.5, 1)).toBe("1.234,5");
    expect(fmtNum(1234.5)).toBe("1.235");
    expect(fmtNum(166_000_000_000)).toBe("166.000.000.000");
    expect(fmtNum(0.0123, 4)).toBe("0,0123");
    expect(fmtNum(null)).toBe(DASH);
    expect(fmtNum(Number.NaN)).toBe(DASH);
  });
  it("fmtPct: «41,5%» — bản cũ ra «41.5%»", () => {
    expect(fmtPct(41.5)).toBe("41,5%");
    expect(fmtPct(100)).toBe("100,0%");
    expect(fmtPct(undefined)).toBe(DASH);
  });
  it("fmtSo: giữ tới ba số lẻ, không thêm số 0 thừa", () => {
    expect(fmtSo(1234.5)).toBe("1.234,5");
    expect(fmtSo(12)).toBe("12");
    expect(fmtSo(69.812)).toBe("69,812");
    expect(fmtSo(-3.2)).toBe("-3,2");
    expect(fmtSo(3.2, 1)).toBe("3,2");
  });
  it("fmtCoTep: cỡ tệp", () => {
    expect(fmtCoTep(820 * 1024)).toBe("820 KB");
    expect(fmtCoTep(1.5 * 1024 ** 2)).toBe("1,5 MB");
    expect(fmtCoTep(2.3 * 1024 ** 3)).toBe("2,3 GB");
  });
});

describe("báo cáo tháng — ô SỐ viết theo chuẩn, ô CHỮ giữ nguyên văn", () => {
  const ANH_XA: AnhXaNguon = { maAgent: "tiendo", congCu: "tiendo.khoi_luong_hang_muc", thamSo: {} };
  const VET: VetNguon = { moTa: "BC tuần 2026-W40", thoiDiem: "2026-10-05T00:00:00.000Z" };
  it("số lẻ, số lớn, phần trăm, tiền", () => {
    expect(chuGiaTri(1384.3)).toBe("1.384,3");
    expect(hienO(oCoSo(1384.3, ANH_XA, VET, "m"))).toBe("1.384,3 m");
    expect(hienO(oCoSo(41.5, ANH_XA, VET, "%"))).toBe("41,5 %");
    expect(hienO(oCoSo(1018.517, ANH_XA, VET, "tỷ đ"))).toBe("1.018,517 tỷ đ");
    expect(hienO(oCoSo(185, ANH_XA, VET, "người"))).toBe("185 người");
  });
  it("chữ agent gửi (mã WBS, tên) KHÔNG bị đổi dấu", () => {
    expect(hienO(oCoSo("7.2.2", ANH_XA, VET))).toBe("7.2.2");
    expect(chuGiaTri("1315/QĐ-UBND")).toBe("1315/QĐ-UBND");
  });
});

describe("báo cáo sáng · màn Issue — số ngày, tiền", () => {
  it("số ngày từ 1.000 trở lên có dấu chấm ngăn nhóm; số nhỏ giữ như cũ", () => {
    expect(hienSoSang(6)).toBe("6");
    expect(hienSoSang(1200)).toBe("1.200");
    expect(hienSoIssue(12, "ngày")).toBe("12 ngày");
    const dau: DauDuAn = {
      maDuAn: "x", ten: "X", coTienDo: true, codDuBao: "2031-01-10", codMucTieu: "2027-10-21",
      chamNgay: 1177, soHomQua: 3, lyDoKhongSo: null, loi: null,
    };
    expect(dongDauDuAn(dau)).toContain("chậm 1.177 ngày so với Tiến độ mục tiêu");
  });
  it("tiền gọn theo tỷ / triệu — «1,20 tỷ», bản cũ «1.20 tỷ»", () => {
    expect(hienTien(1_200_000_000)).toBe("1,20 tỷ");
    expect(hienTien(1_018_517_000_000)).toBe("1.018,52 tỷ");
  });
});
