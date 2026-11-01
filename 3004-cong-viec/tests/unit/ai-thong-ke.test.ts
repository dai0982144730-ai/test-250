// Thống kê dùng AI (Mr. Đại chốt 04/10/2026): múi Ngày/Tuần/Tháng, cộng token, phút ngừng, đọc giờ mở lại khi hết hạn mức,
// tìm tính năng từ ngăn xếp lời gọi. Hàm THUẦN — không mở CSDL, không đụng data/ thật.
import { describe, it, expect } from "vitest";
import { cacMui, gopKhoang, giaiGioMoLai, tinhThongKe, tenTinhNang, type LuotAi } from "@/lib/ai/thong-ke-ai";
import { locDongCu, maTinhNangTuNganXep, mocGiuSo } from "@/lib/ai/so-dung-ai";

const vn = (y: number, m: number, d: number, h = 0, p = 0) => Date.UTC(y, m - 1, d, h, p) - 7 * 3_600_000;
const luot = (o: Partial<LuotAi>): LuotAi => ({
  luc: new Date(vn(2026, 10, 4, 9)).toISOString(),
  tai_khoan: "tk1",
  tinh_nang: "lib/ai/chat-agent",
  nguoi: "u1",
  token_vao: 100,
  token_cache_doc: 1000,
  token_cache_ghi: 0,
  token_ra: 50,
  chay_ms: 60_000,
  cho_ms: 0,
  ket_qua: "ok",
  ...o,
});

describe("múi thống kê theo giờ Việt Nam", () => {
  it("Ngày = 24 múi giờ, bắt đầu 00:00 giờ VN", () => {
    const m = cacMui("ngay", "2026-10-04");
    expect(m).toHaveLength(24);
    expect(m[0].tuMs).toBe(vn(2026, 10, 4, 0));
    expect(m[23].nhanDay).toBe("23:00 – 23:59");
  });
  it("Tuần = 7 ngày từ Thứ Hai (04/10/2026 là Chủ Nhật → tuần 28/09–04/10)", () => {
    const m = cacMui("tuan", "2026-10-04");
    expect(m).toHaveLength(7);
    expect(m[0].ngay).toBe("2026-09-28");
    expect(m[0].nhan).toBe("T2 28/09");
    expect(m[6].ngay).toBe("2026-10-04");
  });
  it("Tháng = số ngày của tháng (tháng 2/2028 nhuận có 29)", () => {
    expect(cacMui("thang", "2026-10-04")).toHaveLength(31);
    expect(cacMui("thang", "2028-02-10")).toHaveLength(29);
  });
});

describe("tinhThongKe", () => {
  it("cộng token (vào gồm cache), theo tài khoản, lượt lỗi / hết hạn mức, phút chạy", () => {
    const tk = tinhThongKe({
      luot: [
        luot({}),
        luot({ tai_khoan: "tk2", ket_qua: "het_han_muc", token_vao: 0, token_cache_doc: 0, token_ra: 0, chay_ms: 3000 }),
        luot({ luc: new Date(vn(2026, 10, 4, 14)).toISOString(), nguoi: null, tinh_nang: "lib/bao-cao-tuan/do-kho" }),
        luot({ luc: new Date(vn(2026, 10, 5, 1)).toISOString() }), // ngày khác — không tính
      ],
      ngung: [],
      cheDo: "ngay",
      ngay: "2026-10-04",
      bayGio: vn(2026, 10, 4, 20),
    });
    expect(tk.tong.luot).toBe(3);
    expect(tk.tong.hetHanMuc).toBe(1);
    expect(tk.tong.tokenVao).toBe(2200);
    expect(tk.tong.tokenRa).toBe(100);
    expect(tk.mui[9].theoTk.tk1).toBe(1150);
    expect(tk.mui[9].luot).toBe(2);
    expect(tk.mui[9].phutChay).toBeCloseTo(1.05);
    expect(tk.mui[21].tuongLai).toBe(true);
    // việc nền ghi mã "" — tách khỏi người u1
    expect(tk.topNguoi.map((r) => r.ma).sort()).toEqual(["", "u1"]);
    expect(tk.tieuDe).toBe("Ngày 04/10/2026");
  });

  it("phút ngừng: gộp khoảng chồng nhau, cắt theo múi, không tính phần tương lai", () => {
    const tk = tinhThongKe({
      luot: [],
      ngung: [
        { tu: new Date(vn(2026, 10, 4, 9, 30)).toISOString(), den: new Date(vn(2026, 10, 4, 10, 30)).toISOString() },
        { tu: new Date(vn(2026, 10, 4, 10, 0)).toISOString(), den: new Date(vn(2026, 10, 4, 10, 45)).toISOString() },
        { tu: new Date(vn(2026, 10, 4, 19, 0)).toISOString(), den: new Date(vn(2026, 10, 4, 23, 0)).toISOString() },
      ],
      cheDo: "ngay",
      ngay: "2026-10-04",
      bayGio: vn(2026, 10, 4, 19, 20),
    });
    expect(tk.mui[9].phutNgung).toBeCloseTo(30);
    expect(tk.mui[10].phutNgung).toBeCloseTo(45);
    expect(tk.mui[19].phutNgung).toBeCloseTo(20);
    expect(tk.mui[20].phutNgung).toBe(0);
    expect(tk.tong.phutNgung).toBeCloseTo(95);
  });

  it("vệt thời gian (Mr. Đại 04/10): khoảng AI chạy = từ lúc ra khỏi hàng chờ, gộp chồng nhau, cắt trong kỳ; ngừng cắt tới bây giờ", () => {
    const tk = tinhThongKe({
      luot: [
        luot({ luc: new Date(vn(2026, 10, 4, 9)).toISOString(), cho_ms: 60_000, chay_ms: 120_000 }), // chạy 9:01–9:03
        luot({ luc: new Date(vn(2026, 10, 4, 9, 2)).toISOString(), cho_ms: 0, chay_ms: 180_000 }), // 9:02–9:05 chồng → gộp
        luot({ luc: new Date(vn(2026, 10, 4, 23, 59)).toISOString(), cho_ms: 0, chay_ms: 300_000 }), // vắt qua nửa đêm → cắt
      ],
      ngung: [{ tu: new Date(vn(2026, 10, 4, 19)).toISOString(), den: new Date(vn(2026, 10, 4, 23)).toISOString() }],
      cheDo: "ngay",
      ngay: "2026-10-04",
      bayGio: vn(2026, 10, 4, 19, 20),
    });
    expect(tk.vet.chay).toEqual([
      [vn(2026, 10, 4, 9, 1), vn(2026, 10, 4, 9, 5)],
      [vn(2026, 10, 4, 23, 59), vn(2026, 10, 5, 0, 0)],
    ]);
    expect(tk.vet.ngung).toEqual([[vn(2026, 10, 4, 19), vn(2026, 10, 4, 19, 20)]]);
    expect(tk.vet.tuMs).toBe(vn(2026, 10, 4, 0));
  });

  it("lượt sổ cũ KHÔNG vào bảng xếp hạng — tách thành ghi chú (Mr. Đại 04/10: 'chưa ghi người' đứng đầu bảng khó hiểu)", () => {
    const tk = tinhThongKe({
      luot: [luot({}), luot({ tinh_nang: "cu", nguoi: "?", token_vao: 5000, token_cache_doc: 0, token_ra: 0 })],
      ngung: [],
      cheDo: "ngay",
      ngay: "2026-10-04",
      bayGio: vn(2026, 10, 4, 20),
    });
    expect(tk.topNguoi.map((r) => r.ma)).toEqual(["u1"]);
    expect(tk.topTinhNang.map((r) => r.ma)).not.toContain("cu");
    expect(tk.soCu).toEqual({ luot: 1, token: 5000 });
    expect(tk.tong.luot).toBe(2); // tổng kỳ vẫn tính cả sổ cũ
  });

  it("gopKhoang gộp khoảng chồng và bỏ khoảng rỗng", () => {
    expect(gopKhoang([[5, 8], [1, 3], [2, 6], [9, 9]])).toEqual([[1, 8]]);
  });
});

describe("giờ mở lại khi hết hạn mức (sửa lỗi 04/10: trước luôn đoán 15 phút)", () => {
  const bayGio = vn(2026, 10, 4, 9); // 09:00 giờ VN
  it("mốc giây sau dấu |", () => {
    expect(giaiGioMoLai("Claude AI usage limit reached|1759380000", bayGio)).toBe(1759380000_000);
  });
  it('"resets 3pm" → 15:00 hôm nay giờ VN; giờ đã qua → ngày mai', () => {
    expect(giaiGioMoLai("5-hour limit reached ∙ resets 3pm", bayGio)).toBe(vn(2026, 10, 4, 15));
    expect(giaiGioMoLai("You've hit your limit · resets 7:30am (Asia/Saigon)", bayGio)).toBe(vn(2026, 10, 5, 7, 30));
  });
  it('"resets Oct 6, 3pm" → đúng ngày đó; múi giờ UTC thì đổi về giờ thật', () => {
    expect(giaiGioMoLai("weekly limit reached ∙ resets Oct 6, 3pm", bayGio)).toBe(vn(2026, 10, 6, 15));
    expect(giaiGioMoLai("limit reached · resets 3pm (UTC)", bayGio)).toBe(Date.UTC(2026, 9, 4, 15));
  });
  it("không có giờ → null (bên gọi tự đoán)", () => {
    expect(giaiGioMoLai("Tài khoản Claude đã dùng hết lượt cho giờ này.", bayGio)).toBeNull();
  });
});

describe("tính năng nào gọi AI", () => {
  it("lấy file đầu tiên trong src/ không thuộc lớp gọi AI", () => {
    const st = [
      "Error",
      "    at metaLuotHienTai (webpack-internal:///(rsc)/./src/lib/ai/so-dung-ai.ts:40:5)",
      "    at runCliPrompt (webpack-internal:///(rsc)/./src/lib/ai/providers.ts:700:3)",
      "    at chamDoKho (webpack-internal:///(rsc)/./src/lib/bao-cao-tuan/do-kho.ts:88:12)",
      "    at POST (webpack-internal:///(rsc)/./src/app/api/bao-cao-tuan/route.ts:20:3)",
    ].join("\n");
    expect(maTinhNangTuNganXep(st)).toBe("lib/bao-cao-tuan/do-kho");
    expect(maTinhNangTuNganXep("Error\n    at D:\\x\\src\\app\\api\\gui\\route.ts:10:2")).toBe("app/api/gui/route");
    expect(maTinhNangTuNganXep("Error\n    at chunk (.next/server/chunks/123.js:1:1)")).toBe("");
  });
  it("tên tiếng Việt, không để mã trần", () => {
    expect(tenTinhNang("lib/bao-cao-tuan/do-kho")).toBe("Báo cáo tuần: chấm độ khó");
    expect(tenTinhNang("")).toBe("Không rõ tính năng");
    expect(tenTinhNang("lib/la/hoac")).toContain("Tính năng khác");
  });
});

describe("giữ sổ 13 tháng (Mr. Đại duyệt 04/10)", () => {
  it("mốc = lùi 13 tháng lịch; bỏ dòng cũ hơn mốc, giữ dòng mới + dòng hỏng", () => {
    expect(new Date(mocGiuSo(Date.UTC(2027, 10, 15, 3))).toISOString()).toBe("2026-10-15T03:00:00.000Z");
    const moc = mocGiuSo(Date.UTC(2027, 10, 15));
    const so = [
      JSON.stringify({ luc: "2026-10-14T23:00:00.000Z", tai_khoan: "tk1" }),
      JSON.stringify({ luc: "2026-10-15T01:00:00.000Z", tai_khoan: "tk2" }),
      "{hỏng",
      "",
    ].join("\n");
    const { con, bo } = locDongCu(so, moc, (o) => o.luc);
    expect(bo).toBe(1);
    expect(con.trim().split("\n")).toEqual([JSON.stringify({ luc: "2026-10-15T01:00:00.000Z", tai_khoan: "tk2" }), "{hỏng"]);
    expect(locDongCu(JSON.stringify({ tu: "2025-01-01T00:00:00Z", den: "2026-12-01T00:00:00Z" }), moc, (o) => o.den).bo).toBe(0);
  });
});
