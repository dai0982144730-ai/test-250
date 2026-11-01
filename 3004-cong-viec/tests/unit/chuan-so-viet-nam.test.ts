// CHUẨN SỐ VIỆT NAM ở agent Công việc — Mr. Đại chốt 12/10/2026 (KE-HOACH/10 chốt 130): thập phân dấu phẩy, nhóm ba chữ số dấu chấm.
// Bảng ví dụ chung của bộ đọc: tests/unit/doc-so.test.ts. Bộ đọc số của LUẬT: tests/unit/luat-loai-tay.test.ts. Tệp này khoá các
// chỗ RIÊNG của agent Công việc vừa chuyển về bộ đọc / hàm hiện số chung.
import { describe, expect, it } from "vitest";
import { fmtNum, fmtPct, fmtSo } from "@/lib/format";
import { coTep } from "@/lib/dinh-kem/chung";
import { kichThuoc } from "@/components/thu-muc/tien-ich";
import { docDoChac } from "@/lib/gan-wbs/thuan";
import { laDaXong } from "@/lib/kiem-tra/chuan-hoa";
import { docTraLoi5 } from "@/lib/cay-viec/issue/nhom5-thuan";

describe("số HIỆN RA", () => {
  it("lib/format: dấu phẩy thập phân, dấu chấm nhóm ba chữ số", () => {
    expect(fmtNum(1234.5, 1)).toBe("1.234,5");
    expect(fmtNum(1234.5)).toBe("1.235");
    expect(fmtPct(41.5)).toBe("41,5%");
    expect(fmtSo(3.2, 1)).toBe("3,2"); // «(3,2 giây)» — bản cũ in thẳng «3.2 giây»
    expect(fmtSo(41.5)).toBe("41,5");
    expect(fmtSo(12)).toBe("12");
    expect(fmtSo(166000000000)).toBe("166.000.000.000");
    expect(fmtSo(null)).toBe("—");
  });

  it("cỡ tệp: «2,5 MB» chứ không «2.5 MB»", () => {
    expect(coTep(512)).toBe("512 B");
    expect(coTep(820 * 1024)).toBe("820 KB");
    expect(coTep(1234567)).toBe("1,2 MB");
    expect(coTep(1023.9 * 1024 * 1024)).toBe("1.023,9 MB");
    expect(coTep(2.5 * 1024 ** 3)).toBe("2,50 GB");
    expect(kichThuoc(2.5 * 1024 * 1024)).toBe("2,5 MB"); // bản cũ: «2.5 MB»
    expect(kichThuoc(820 * 1024)).toBe("820 KB");
    expect(kichThuoc(0)).toBe("0 B");
    expect(kichThuoc(null)).toBe("");
  });
});

describe("số NHẬP VÀO — các chỗ riêng của agent Công việc", () => {
  it("độ chắc AI trả về (chữ MÁY viết): cú pháp máy hoặc chuẩn Việt Nam; rỗng = chưa đo", () => {
    expect(docDoChac(0.8)).toBe(0.8);
    expect(docDoChac("0.8")).toBe(0.8);
    expect(docDoChac("0,8")).toBe(0.8);
    expect(docDoChac("80")).toBe(0.8);
    expect(docDoChac("")).toBeNull(); // bản cũ: Number("") = 0 → độ chắc 0
    expect(docDoChac("cao")).toBeNull();
  });

  it("ô Tình trạng người gõ phần trăm: chỉ từ 100% mới là xong", () => {
    expect(laDaXong("100%")).toBe(true);
    expect(laDaXong("100,0%")).toBe(true);
    expect(laDaXong("99,5%")).toBe(false);
    expect(laDaXong("99.5%")).toBe(false); // gõ kiểu Anh, một cách hiểu
    expect(laDaXong("đạt 80%")).toBe(false);
  });

  it("số ngày chậm AI ghi dạng chữ trong JSON", () => {
    const doc = (soNgayCham: unknown) => docTraLoi5(JSON.stringify([{ cau: [1], tieuDe: "Chậm bàn giao mặt bằng", deXuat: "Họp với địa phương", soNgayCham }])).dong[0]?.soNgayCham;
    expect(doc(4)).toBe(4);
    expect(doc("4")).toBe(4);
    expect(doc("4,4")).toBe(4); // bản cũ: Number("4,4") = NaN → bỏ mất số ngày
    expect(doc("")).toBeUndefined();
    expect(doc("chưa rõ")).toBeUndefined();
  });
});
