// Câu tổng của màn Cảnh báo — áp cùng khuôn màn Phân tích năng suất
// (Mr. Đại chốt 06/09 "ok áp").
//
// Ca quan trọng nhất là ca KHÔNG CỘNG DỒN: nếu ai đó sửa thành phép cộng thì
// con số đưa lên họp sẽ to gấp mấy lần sự thật.

import { describe, expect, it } from "vitest";
import { tongCanhBao, type TheCanhBao } from "@/lib/canh-bao/model";

function t(o: Partial<TheCanhBao>): TheCanhBao {
  return {
    id: "ISS-1",
    nguon: "gang",
    mucDo: "red",
    tieuDe: "Việc chậm",
    phanTich: "—",
    anhHuongCod: 0,
    nguonDuLieu: "—",
    deXuat: "—",
    dieuKien: "dang-vi-pham",
    xuLy: "chua-ai-dong",
    ghiNhan: [],
    ngayMo: "2026-09-01",
    soTuanMo: 0,
    ...o,
  } as TheCanhBao;
}

describe("câu tổng màn Cảnh báo", () => {
  it("đếm đúng issue đang mở, bỏ qua issue đã đóng", () => {
    const kq = tongCanhBao([
      t({ id: "a" }),
      t({ id: "b", mucDo: "yellow" }),
      t({ id: "c", dieuKien: "da-dong" }),
    ]);
    expect(kq.soDangMo).toBe(2);
    expect(kq.soDo).toBe(1);
    expect(kq.soVang).toBe(1);
  });

  it("KHÔNG cộng dồn ảnh hưởng COD — lấy thẻ nặng nhất", () => {
    const kq = tongCanhBao([
      t({ id: "a", anhHuongCod: 5 }),
      t({ id: "b", anhHuongCod: 12, tieuDe: "Turbine 04 chậm" }),
      t({ id: "c", anhHuongCod: 3 }),
    ]);
    expect(kq.codNangNhat).toBe(12); // không phải 5 + 12 + 3 = 20
    expect(kq.theNangNhat?.tieuDe).toBe("Turbine 04 chậm");
  });

  it("thẻ nằm trong chuỗi của thẻ khác thì KHÔNG được chọn làm nặng nhất", () => {
    const kq = tongCanhBao([
      t({ id: "trum", anhHuongCod: 9, tieuDe: "Chuỗi gốc" }),
      // Thẻ này ghi 30 ngày nhưng là phần nằm trong chuỗi của "trum"
      t({ id: "con", anhHuongCod: 30, trungChuoiVoi: "trum", tieuDe: "Đoạn con" }),
    ]);
    expect(kq.codNangNhat).toBe(9);
    expect(kq.theNangNhat?.id).toBe("trum");
  });

  it("đếm issue chưa ai nhận xử lý", () => {
    const kq = tongCanhBao([
      t({ id: "a", xuLy: "chua-ai-dong" }),
      t({ id: "b", xuLy: "da-tiep-nhan" }),
    ]);
    expect(kq.soChuaAiDong).toBe(1);
  });

  it("đếm issue để quá 3 tuần", () => {
    const kq = tongCanhBao([
      t({ id: "a", soTuanMo: 3 }),
      t({ id: "b", soTuanMo: 5 }),
      t({ id: "c", soTuanMo: 1 }),
    ]);
    expect(kq.soDeLau).toBe(2);
  });

  it("sổ rỗng thì trả 0 và null, không nổ", () => {
    const kq = tongCanhBao([]);
    expect(kq.soDangMo).toBe(0);
    expect(kq.codNangNhat).toBe(0);
    expect(kq.theNangNhat).toBeNull();
  });
});
