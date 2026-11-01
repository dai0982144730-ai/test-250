// ============================================================
// BÀI CANH NỘI DUNG KỊCH BẢN TEST
//
// Nền: thư mục src/lib/kiem-thu/ từng được chép nguyên từ bộ Agent Tiến độ
// sang cả 4 app mà không sửa ruột. Màn /kich-ban-test của Main vì thế bày 197
// bài về "Kho hồ sơ", "Cây thư mục", "Thả một báo cáo ngày" — những màn Main
// KHÔNG HỀ CÓ. Người test mở ra chấm những bài không tồn tại, tệ hơn cả không
// có màn test.
//
// Bài này đỏ ngay nếu nội dung Tiến độ bị chép ngược trở lại, hoặc nếu có bài
// thiếu Mong đợi / trùng mã — hai lỗi làm hỏng chính sổ kết quả (mã bài là
// khoá lưu, xem so-ket-qua.ts).
//
// Không đụng tới `data/` — chỉ đọc dữ liệu thuần trong src/lib/kiem-thu.
// ============================================================

import { describe, it, expect } from "vitest";
import { CAC_TAB, TONG_SO_BAI, timBai } from "@/lib/kiem-thu/kich-ban";

describe("kịch bản test — khuôn dữ liệu", () => {
  it("có tab, tab nào cũng có bài", () => {
    expect(CAC_TAB.length).toBeGreaterThan(0);
    for (const t of CAC_TAB) {
      expect(t.bai.length, `tab ${t.ma} rỗng`).toBeGreaterThan(0);
    }
  });

  it("mã tab không trùng nhau", () => {
    const ma = CAC_TAB.map((t) => t.ma);
    expect(new Set(ma).size).toBe(ma.length);
  });

  it("mã bài KHÔNG trùng nhau — mã là khoá lưu kết quả", () => {
    const ma = CAC_TAB.flatMap((t) => t.bai.map((b) => b.ma));
    const trung = ma.filter((m, i) => ma.indexOf(m) !== i);
    expect(trung, `mã bài bị trùng: ${trung.join(", ")}`).toEqual([]);
  });

  it("mọi bài đều có Mong đợi — không có thì bài test vô nghĩa", () => {
    const thieu: string[] = [];
    for (const t of CAC_TAB) {
      for (const b of t.bai) {
        if (b.mongDoi.trim().length < 10) thieu.push(b.ma);
      }
    }
    expect(thieu, `bài thiếu Mong đợi: ${thieu.join(", ")}`).toEqual([]);
  });

  it("mọi bài đều có tiêu đề và ít nhất một bước", () => {
    for (const t of CAC_TAB) {
      for (const b of t.bai) {
        expect(b.ten.trim().length, `bài ${b.ma} thiếu tiêu đề`).toBeGreaterThan(3);
        expect(b.buoc.length, `bài ${b.ma} không có bước nào`).toBeGreaterThan(0);
        for (const bc of b.buoc) {
          expect(bc.trim().length, `bài ${b.ma} có bước rỗng`).toBeGreaterThan(3);
        }
      }
    }
  });

  it("TONG_SO_BAI đếm từ dữ liệu, không gõ cứng", () => {
    expect(TONG_SO_BAI).toBe(CAC_TAB.reduce((s, t) => s + t.bai.length, 0));
  });

  it("timBai tra được bài có thật và trả null với mã lạ", () => {
    const mau = CAC_TAB[0].bai[0];
    expect(timBai(mau.ma)?.bai.ten).toBe(mau.ten);
    expect(timBai("KHONG-CO-MA-NAY-99")).toBeNull();
  });
});

describe("kịch bản test — đúng là của MAIN AGENT", () => {
  /**
   * Màn của bộ Agent Tiến độ đã bị chép nhầm sang đây. Main không có màn nào
   * trong số này (PLAN-MAIN-AGENT mục 1: Main KHÔNG giữ dữ liệu nghiệp vụ).
   */
  const CUA_AGENT_KHAC = [
    "Kho hồ sơ",
    "Cây thư mục",
    "Nạp hồ sơ qua AI",
    "báo cáo ngày",
    "Cửa kiểm 8 phép",
    "Lập tiến độ",
    "Ảnh hiện trường",
    "Soát phiếu giá",
    "Đường găng",
  ];

  const toanBoChu = CAC_TAB.flatMap((t) => [
    t.ten,
    t.dan,
    ...t.bai.flatMap((b) => [b.ten, b.mongDoi, ...b.buoc]),
  ])
    .join("\n")
    .toLowerCase();

  it.each(CUA_AGENT_KHAC)("không còn nhắc tới màn của agent khác: %s", (cum) => {
    // Tên tab và tiêu đề bài mới là chỗ cấm; câu Mong đợi được phép nhắc tên
    // màn của agent khác khi đang nói "Main KHÔNG có màn đó".
    const trongTieuDe = CAC_TAB.some(
      (t) =>
        t.ten.toLowerCase().includes(cum.toLowerCase()) ||
        t.bai.some((b) => b.ten.toLowerCase().includes(cum.toLowerCase())),
    );
    expect(trongTieuDe, `"${cum}" là màn của agent khác, không được làm tên tab/bài của Main`).toBe(
      false,
    );
  });

  it("có nhắc tới các màn RIÊNG của Main", () => {
    for (const man of [
      "báo cáo sáng",
      "báo cáo tháng",
      "hỏi vắt ngang các ban",
      "khai một lần",
      "ai được gọi ai",
      "danh bạ agent",
    ]) {
      expect(toanBoChu, `chưa có bài nào nhắc màn "${man}"`).toContain(man);
    }
  });

  it("có bài cho nút Chạy / Dừng agent (06/09); nhóm dữ liệu thử TẠM ẨN (Mr. Đại chốt 04/10)", async () => {
    expect(toanBoChu).toContain("chạy / dừng");
    const { TAB_TAM_AN } = await import("@/lib/kiem-thu/noi-dung-chung");
    expect(TAB_TAM_AN.map((t) => t.ma)).toEqual(["DLT"]);
    expect(CAC_TAB.some((t) => t.ma === "DLT")).toBe(false);
    expect(timBai("G-40")?.tab.ma).toBe("DLT"); // kết quả chấm cũ vẫn tra được tên
  });

  it("giữ được mã của BAI-TEST-NGUOI-DUNG.md — nhóm G, A và E", () => {
    const ma = new Set(CAC_TAB.flatMap((t) => t.bai.map((b) => b.ma)));
    for (let i = 1; i <= 16; i++) {
      expect(ma.has(`G-${String(i).padStart(2, "0")}`), `thiếu bài G-${i}`).toBe(true);
    }
    for (let i = 1; i <= 8; i++) {
      expect(ma.has(`A-${String(i).padStart(2, "0")}`), `thiếu bài A-${i}`).toBe(true);
    }
    for (let i = 1; i <= 5; i++) {
      expect(ma.has(`E-${String(i).padStart(2, "0")}`), `thiếu bài E-${i}`).toBe(true);
    }
  });
});
