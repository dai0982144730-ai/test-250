// Luật "mã kèm tên" (Mr. Đại chốt 26/09) — lưới an toàn bằng code.
// Bản giống hệt ở 4-agent-main · 5-Agent-tien-do · 1-agent-base.
import { describe, expect, it } from "vitest";
import {
  LUAT_MA_KEM_TEN,
  ganTenChoMa,
  ganTenTrongDuLieu,
  gopTuDien,
  laMaHopLe,
  rutGonTen,
  taoTuDien,
  tuDienTuDuLieu,
} from "@/lib/chung/ma-kem-ten";

const TD = taoTuDien([
  ["9.6.4", "Thử nghiệm tần số"],
  ["6.1.4", "Cung cấp Hub, Nacelle, Blade. Drive Train, Cooler Tops, Switchgear đến cảng Hòn La (Switchgear cần có để bắt đầu lắp đặt)"],
  ["6.1", "Cung cấp thiết bị tuabin"],
  ["4.6", "Đổ bê tông móng trụ"],
  ["P04", "Móng xong trước dựng cột"],
  ["K-09", "Văn bản chấp thuận chuyển mục đích sử dụng đất (đất rừng, đất lúa nếu có)"],
  ["TP-HV-03", "Công ty Sông Đà 8"],
  ["ISS-PL-0115", "COD dự báo vượt hạn theo chủ trương"],
  ["#58", "Thỏa thuận đấu nối"],
]);

describe("ganTenChoMa — chèn tên cho mã trơn", () => {
  it("câu mẫu của Mr. Đại", () => {
    expect(ganTenChoMa("nếu việc 9.6.4 xong sớm 30 ngày thì COD thế nào", TD)).toBe(
      "nếu việc 9.6.4 Thử nghiệm tần số xong sớm 30 ngày thì COD thế nào",
    );
  });

  it("mã cuối câu (có dấu chấm) vẫn được gắn tên", () => {
    expect(ganTenChoMa("Việc trễ nhất là 9.6.4.", TD)).toBe("Việc trễ nhất là 9.6.4 Thử nghiệm tần số.");
  });

  it("mã trong ngoặc", () => {
    expect(ganTenChoMa("COD lùi (9.6.4) 12 ngày", TD)).toBe("COD lùi (9.6.4 Thử nghiệm tần số) 12 ngày");
  });

  it("mã đã có tên liền kề — sau hoặc trước, có dấu hay không dấu — để yên", () => {
    const a = "9.6.4 Thử nghiệm tần số trễ 5 ngày";
    const b = "Thử nghiệm tần số (9.6.4) trễ 5 ngày";
    const c = "9.6.4 — thu nghiem tan so tre";
    const d = "**9.6.4** | Thử nghiệm tần số |";
    for (const s of [a, b, c, d]) expect(ganTenChoMa(s, TD)).toBe(s);
  });

  it("tên dài được rút ≤ 8 chữ, bỏ phần ngoặc", () => {
    expect(ganTenChoMa("6.1.4 chưa khởi công", TD)).toBe("6.1.4 Cung cấp Hub, Nacelle, Blade chưa khởi công");
    expect(ganTenChoMa("Tắc tại K-09 quá hạn", TD)).toBe(
      "Tắc tại K-09 Văn bản chấp thuận chuyển mục đích sử dụng đất quá hạn",
    );
  });

  it("mã quy tắc, thầu phụ, issue, hồ sơ số #", () => {
    expect(ganTenChoMa("Vi phạm P04 ở trụ 12", TD)).toBe("Vi phạm P04 Móng xong trước dựng cột ở trụ 12");
    expect(ganTenChoMa("TP-HV-03 báo chậm", TD)).toBe("TP-HV-03 Công ty Sông Đà 8 báo chậm");
    expect(ganTenChoMa("xem ISS-PL-0115", TD)).toBe("xem ISS-PL-0115 COD dự báo vượt hạn theo chủ trương");
    expect(ganTenChoMa("hồ sơ #58 thiếu", TD)).toBe("hồ sơ #58 Thỏa thuận đấu nối thiếu");
  });

  it("KHÔNG đụng số tiền, ngày, tỷ lệ, phiên bản, mã con/cha dài hơn", () => {
    const giu = [
      "Giá trị 3.181.440.000 đồng",
      "Ngày 04.06.2026 họp",
      "Đạt 100.0% kế hoạch",
      "Bản v6.1.4 đã cài",
      "Việc 6.1.4.2 đang làm",
      "Việc 16.1.4 đang làm",
      "Tỷ lệ 2.000 tấn",
      "Mã P045 không có",
      "Chuỗi AP04 lạ",
      "Link http://x/detail?wbs=6.1.4 mở",
      "Văn bản 1315/QĐ-UBND giữ nguyên",
    ];
    for (const s of giu) expect(ganTenChoMa(s, TD)).toBe(s);
  });

  it("mã dài khớp trước mã ngắn (6.1.4 không bị hiểu thành 6.1)", () => {
    expect(ganTenChoMa("6.1 chậm, riêng 6.1.4 trễ", TD)).toBe(
      "6.1 Cung cấp thiết bị tuabin chậm, riêng 6.1.4 Cung cấp Hub, Nacelle, Blade trễ",
    );
  });

  it("mã không có trong từ điển thì để yên; từ điển rỗng trả nguyên chữ", () => {
    expect(ganTenChoMa("Việc 7.7.7 chậm", TD)).toBe("Việc 7.7.7 chậm");
    expect(ganTenChoMa("Việc 9.6.4 chậm", new Map())).toBe("Việc 9.6.4 chậm");
    expect(ganTenChoMa("", TD)).toBe("");
  });

  it("nhiều lần xuất hiện — lần nào trơn thì gắn lần đó", () => {
    expect(ganTenChoMa("9.6.4 Thử nghiệm tần số trễ; dời 9.6.4 thì COD lùi", TD)).toBe(
      "9.6.4 Thử nghiệm tần số trễ; dời 9.6.4 Thử nghiệm tần số thì COD lùi",
    );
  });

  it("chạy trên cả khối nhiều dòng", () => {
    const vao = "1. 9.6.4: trễ 5 ngày\n2. P04 vi phạm";
    expect(ganTenChoMa(vao, TD)).toBe("1. 9.6.4 Thử nghiệm tần số: trễ 5 ngày\n2. P04 Móng xong trước dựng cột vi phạm");
  });
});

describe("rutGonTen", () => {
  it("giữ tên ngắn, cắt tên dài có dấu …", () => {
    expect(rutGonTen("Thử nghiệm tần số")).toBe("Thử nghiệm tần số");
    expect(rutGonTen("Lắp đặt hệ thống điều khiển giám sát và thu thập dữ liệu SCADA toàn nhà máy điện gió")).toBe(
      "Lắp đặt hệ thống điều khiển giám sát…",
    );
  });
  it("bỏ ký hiệu đầu dòng", () => {
    expect(rutGonTen("⛓ Cung cấp thiết bị")).toBe("Cung cấp thiết bị");
  });
});

describe("laMaHopLe / taoTuDien / tuDienTuDuLieu", () => {
  it("nhận đúng dạng mã", () => {
    for (const m of ["6.1.4", "9.6", "P04", "K-09", "TP-HV-03", "ISS-2026-39-140", "#58", "D06"]) expect(laMaHopLe(m)).toBe(true);
    for (const m of ["6", "abc", "Móng", "6.1.4 x", "HOÀNG", ""]) expect(laMaHopLe(m)).toBe(false);
  });

  it("quét dữ liệu công cụ lấy cặp mã–tên", () => {
    const d = tuDienTuDuLieu({
      ok: true,
      du_lieu: {
        tasks: [
          { wbs: "9.6.4", name: "Thử nghiệm tần số", pct: 0 },
          { wbs: "6", name: "Nhóm 6" },
        ],
        ho_so: [{ ma: "K-09", ten: "Văn bản chấp thuận" }],
        issue: [{ id: "s-muh73tzo", tieu_de: "không phải mã" }],
      },
    });
    expect(d.get("9.6.4")).toBe("Thử nghiệm tần số");
    expect(d.get("K-09")).toBe("Văn bản chấp thuận");
    expect(d.has("6")).toBe(false);
    expect(d.has("s-muh73tzo")).toBe(false);
  });

  it("gộp từ điển — cái trước thắng", () => {
    const g = gopTuDien(taoTuDien([["9.6.4", "A"]]), taoTuDien([["9.6.4", "B"], ["P04", "C"]]));
    expect(g.get("9.6.4")).toBe("A");
    expect(g.get("P04")).toBe("C");
  });

  it("câu luật có đủ ví dụ và khuôn", () => {
    expect(LUAT_MA_KEM_TEN).toContain("<mã> <tên ngắn>");
    expect(LUAT_MA_KEM_TEN).toContain("9.6.4 Thử nghiệm tần số");
  });
});

describe("ganTenTrongDuLieu — chạy lưới trên kết quả LLM đã bóc", () => {
  it("chèn tên vào chữ, KHÔNG đụng khoá mã và chuỗi chỉ là mã", () => {
    const vao = {
      wbs: "9.6.4",
      tieuDe: "9.6.4 trễ 5 ngày",
      lich: [{ wbs: "6.1.4", lyDo: "chờ 6.1.4 về cảng" }],
      nhan: ["P04"],
      so: 3,
    };
    const ra = ganTenTrongDuLieu(vao, TD);
    expect(ra.wbs).toBe("9.6.4");
    expect(ra.tieuDe).toBe("9.6.4 Thử nghiệm tần số trễ 5 ngày");
    expect(ra.lich[0].wbs).toBe("6.1.4");
    expect(ra.lich[0].lyDo).toBe("chờ 6.1.4 Cung cấp Hub, Nacelle, Blade về cảng");
    expect(ra.nhan[0]).toBe("P04");
    expect(ra.so).toBe(3);
    expect(vao.tieuDe).toBe("9.6.4 trễ 5 ngày"); // không sửa tại chỗ
  });

  it("choFile: tên chèn bỏ ký tự phá khuôn JSON/HTML", () => {
    const td = taoTuDien([["9.6.4", 'Thử "nghiệm" <tần> số']]);
    expect(ganTenChoMa('{"a":"việc 9.6.4 trễ"}', td, { choFile: true })).toBe('{"a":"việc 9.6.4 Thử nghiệm tần số trễ"}');
  });
});

describe("lưới mã kèm tên — lỗi Telegram 26/10", () => {
  it("bỏ ngoặc lồng nhau, không sót dấu ]", () => {
    expect(rutGonTen("[Điện gió Hướng Việt (HV — dữ liệu test)] Xử lý 6.1.4 — Cung cấp Hub, Nacelle, Blade. Drive Train")).toBe(
      "Xử lý 6.1.4 — Cung cấp Hub, Nacelle, Blade",
    );
  });
  it("AI viết tắt tên ngay sau mã thì không chèn thêm", () => {
    const td = taoTuDien([["1.1.9", "TKCS ĐG Hướng Việt bị Bộ Công Thương kéo dài thẩm định"]]);
    expect(ganTenChoMa("việc 1.1.9 TKCS bị kéo dài", td)).toBe("việc 1.1.9 TKCS bị kéo dài");
  });
  it("ưu tiên ten_gon khi dựng từ điển từ dữ liệu", () => {
    const td = tuDienTuDuLieu({ ma_wbs: "6.1.4", ten: "[HV (test)] Xử lý dài", ten_gon: "Xử lý gọn" });
    expect(td.get("6.1.4")).toBe("Xử lý gọn");
  });
});

describe("tên việc chứa chính mã — 26/10", () => {
  it("không chèn «Xử lý 6.1.4» sau mã 6.1.4", () => {
    const td = taoTuDien([["6.1.4", "Xử lý 6.1.4 — Cung cấp Hub, Nacelle, Blade"]]);
    expect(ganTenChoMa("| 6.1.4 — Cung cấp Hub, Nacelle, Blade |", td)).toBe("| 6.1.4 — Cung cấp Hub, Nacelle, Blade |");
    expect(ganTenChoMa("việc 6.1.4 đang găng", td)).toBe("việc 6.1.4 Cung cấp Hub, Nacelle, Blade đang găng");
  });
});

describe("kiểm độc lập đợt 0 (26/10) — AI-01…04", () => {
  const hub = "Xử lý 6.1.4 — Cung cấp Hub và Nacelle cho tuabin gió";
  it("a2: AI chép nguyên tên chứa mã thì để yên (không chèn bản thứ ba)", () => {
    const td = taoTuDien([["6.1.4", hub]]);
    const vao = "Việc 6.1.4 Xử lý 6.1.4 — Cung cấp Hub và Nacelle cho tuabin gió trễ";
    expect(ganTenChoMa(vao, td)).toBe(vao);
  });
  it("b1: tên «Hạng mục 6.1.4» không chèn (chỉ lặp mã)", () => {
    expect(ganTenChoMa("Việc 6.1.4 trễ", taoTuDien([["6.1.4", "Hạng mục 6.1.4"]]))).toBe("Việc 6.1.4 trễ");
  });
  it("c1: mã nằm sâu trong tên → dùng tên gốc, không cụt đầu", () => {
    const td = taoTuDien([["6.1.4", "Cung cấp thiết bị theo gói 6.1.4 cho trạm"]]);
    expect(ganTenChoMa("Việc 6.1.4 trễ", td)).toBe("Việc 6.1.4 Cung cấp thiết bị theo gói 6.1.4 cho trạm trễ");
  });
  it("c2: «16.1» trong tên không khớp mã 6.1", () => {
    const td = taoTuDien([["6.1", "Cung cấp 16.1 thiết bị tuabin"]]);
    expect(ganTenChoMa("Hạng 6.1 trễ", td)).toBe("Hạng 6.1 Cung cấp 16.1 thiết bị tuabin trễ");
  });
  it("AI-03: MỘT chữ thường trùng chữ đầu không tính là đã có tên (chỉ chữ viết tắt in hoa mới tính)", () => {
    const td = taoTuDien([["7.2.3.1", "Turbine số 01 lắp dựng"]]);
    expect(ganTenChoMa("7.2.3.1 turbine chậm", td)).toBe("7.2.3.1 Turbine số 01 lắp dựng turbine chậm");
  });
  it("g2–g5: số thập phân kèm đơn vị không bị chèn tên", () => {
    const td = taoTuDien([["4.6", "Đổ bê tông móng trụ"], ["6.1", "Cung cấp thiết bị tuabin"]]);
    for (const s of ["tăng 4.6% so với", "chậm 6.1 ngày", "6.1 tỷ đồng", "4.6 m3 bê tông"]) expect(ganTenChoMa(s, td)).toBe(s);
  });
  it("bất biến: chạy lưới hai lần như một", () => {
    const td = taoTuDien([["6.1.4", hub], ["9.6.4", "Thử nghiệm tần số"]]);
    const mot = ganTenChoMa("9.6.4 và 6.1.4 chậm", td);
    expect(ganTenChoMa(mot, td)).toBe(mot);
  });
});

describe("đợt 2 Main (27/10, VN-06) — tên ngắn ngay sau mã", () => {
  const TD2 = taoTuDien([["NT-03", "Công ty Cổ phần ENC"], ["NT-04", "Tổng công ty Lắp máy Việt Nam – CTCP"]]);
  it("«NT-03 ENC» đã có tên ngắn → không chèn (trước: «ENC ENC»)", () => {
    expect(ganTenChoMa("Soát phiếu giá NT-03 ENC ghi cao hơn", TD2)).toBe("Soát phiếu giá NT-03 ENC ghi cao hơn");
  });
  it("chữ sau mã không thuộc tên → vẫn chèn", () => {
    expect(ganTenChoMa("Phiếu NT-04 quá hạn 5 ngày", TD2)).toContain("NT-04 Tổng công ty");
  });
});

describe("đợt 3 Main (27/10) — lặp tên do bộ gắn tên", () => {
  it("TD-01: AI đã viết tên ngắn «6.1 Cung cấp turbine» → không chèn tên đầy đủ", () => {
    const td = taoTuDien([["6.1", "Hợp đồng cung cấp turbine"]]);
    expect(ganTenChoMa("hạng mục 6.1 Cung cấp turbine đang chậm 56 ngày", td)).toBe("hạng mục 6.1 Cung cấp turbine đang chậm 56 ngày");
  });
  it("NT-05: dòng cảnh báo có wbs + tieu_de → tiêu đề KHÔNG thành tên của mã WBS", () => {
    const td = tuDienTuDuLieu([{ id: "ISS-2026-40-014", wbs: "7.2.3.4", tieu_de: "Năng suất thấp — Turbine số 04" }, { wbs: "7.2.1.2", ten: "Nhà ở kho xưởng" }]);
    expect(td.has("7.2.3.4")).toBe(false);
    expect(td.get("7.2.1.2")).toBe("Nhà ở kho xưởng");
  });
});
