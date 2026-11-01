// Lưới gọn chữ trợ lý trước khi gửi Telegram (Mr. Đại chốt 26/10/2026) — mẫu lấy từ câu trả lời thật 26/10
// + các ca kiểm độc lập đợt 0 (TG-05…TG-11, TG-16)
import { describe, expect, it } from "vitest";
import { gonChoTelegram } from "@/lib/telegram-tro-ly/thuan";

describe("gonChoTelegram", () => {
  it("bảng lớn → khối; cột # thành số thứ tự; mã CV- bỏ", () => {
    const vao = [
      "| # | Mã | Việc | Hạn | Quá hạn |",
      "|---|---|---|---|---:|",
      "| 3 | CV-2026-0130 | Hợp đồng tín dụng | 09/02/2026 | 259 ngày |",
    ].join("\n");
    expect(gonChoTelegram(vao)).toBe("3. **Hợp đồng tín dụng** — Hạn: 09/02/2026 · Quá hạn: 259 ngày");
  });
  it("TG-08: cột «Mã» mang mã quy tắc → ghép «mã + tên» đầu khối", () => {
    const vao = "| Mã | Quy tắc | Kết quả | Ghi chú |\n|---|---|---|---|\n| P02 | Móng xong trước dựng cột | Nghi vấn | trụ 06 |";
    expect(gonChoTelegram(vao)).toBe("• **P02 Móng xong trước dựng cột** — Kết quả: Nghi vấn · Ghi chú: trụ 06");
  });
  it("TG-07: ô đầu có **đậm** bên trong không ra đậm lồng", () => {
    const vao = "| Nghi vấn | A | B | C |\n|---|---|---|---|\n| Có **trụ 06** nhưng chỉ tới **trụ 05** | 1 | 2 | 3 |";
    expect(gonChoTelegram(vao)).toBe("• **Có trụ 06 nhưng chỉ tới trụ 05** — A: 1 · B: 2 · C: 3");
  });
  it("TG-11: bảng nhỏ ≤ 3 cột ô ngắn giữ nguyên dạng bảng", () => {
    const vao = "| Phòng | Quá hạn | Găng |\n|---|---:|---:|\n| Phòng Đầu tư và Pháp chế | 5 | 0 |";
    expect(gonChoTelegram(vao)).toBe(vao);
  });
  it("TG-05: bỏ tên công cụ máy dạng «·», dạng phẩy, dạng gạch dưới", () => {
    expect(gonChoTelegram("(nguồn: Agent Công việc · base.tai_viec_theo_nguoi | Agent tiến độ · tiendo.duong_gang)")).toBe(
      "(nguồn: Agent Công việc | Agent tiến độ)",
    );
    expect(gonChoTelegram("(nguồn: Agent tiến độ, tiendo.tom_tat_du_an)")).toBe("(nguồn: Agent tiến độ)");
    expect(gonChoTelegram("Theo nghiemthu_khoi_luong_da_nghiem_thu thì xong 80%")).toBe("Theo thì xong 80%");
  });
  it("TG-09: mã CV- bỏ gọn, không để câu cụt / ngoặc rỗng; người hỏi nêu mã thì giữ", () => {
    expect(gonChoTelegram("• Quá hạn dài nhất: 259 ngày (CV-2026-0130 — HV-09-01 Hợp đồng tín dụng)")).toBe(
      "• Quá hạn dài nhất: 259 ngày (HV-09-01 Hợp đồng tín dụng)",
    );
    expect(gonChoTelegram("Hợp đồng tín dụng (CV-2026-0130) quá hạn")).toBe("Hợp đồng tín dụng quá hạn");
    expect(gonChoTelegram("Hợp đồng tín dụng, mã việc là CV-2026-0130.")).toBe("Hợp đồng tín dụng.");
    expect(gonChoTelegram("Việc CV-2026-0130 quá hạn 259 ngày", "việc CV-2026-0130 thế nào")).toBe("Việc CV-2026-0130 quá hạn 259 ngày");
  });
  it("TG-06: câu sự việc có localhost giữ lại (cắt địa chỉ); dòng chỉ dẫn bỏ; đánh lại số", () => {
    const vao = [
      "Agent Công việc chưa có số liệu (không nối được tới http://127.0.0.1:3004/api/mcp/base)",
      "1. Vào http://localhost:3004 xem đã bật chưa",
      "2. Hỏi lại sau ít phút",
      "3. Kiểm tra Cài đặt > Kết nối",
    ].join("\n");
    expect(gonChoTelegram(vao)).toBe("Agent Công việc chưa có số liệu\n1. Hỏi lại sau ít phút");
  });
  it("TG-16: link [Cài đặt](/settings) thành chữ thường", () => {
    expect(gonChoTelegram("Xem ở [Cài đặt](/settings) của Main")).toBe("Xem ở Cài đặt của Main");
  });
  it("chữ thường không đụng", () => {
    expect(gonChoTelegram("**Lịch họp** thứ Ba 27/10 · 08:00 – 09:30")).toBe("**Lịch họp** thứ Ba 27/10 · 08:00 – 09:30");
  });
});

describe("dòng «Kỹ thuật:» (Mr. Đại chốt 26/10)", () => {
  it("giữ dòng Kỹ thuật, chỉ cắt địa chỉ", () => {
    expect(gonChoTelegram("Kỹ thuật: không nối được http://127.0.0.1:3004/api/mcp/base · ngắt mạch tới 17:23")).toBe(
      "Kỹ thuật: không nối được · ngắt mạch tới 17:23",
    );
  });
});

describe("kiểm độc lập đợt 1 NC-09 — địa chỉ nội bộ, đường dẫn, khoá", () => {
  it("cắt 127.0.0.1:3004, localhost:3004 không http, đường dẫn D:\…, sk-…", () => {
    const r = gonChoTelegram(String.raw`Kỹ thuật: cổng 127.0.0.1:3004 không thưa, xem D:\3 SETUP\log.txt, khoá sk-abcdefghijklmnop`);
    // BA-04: regex cũ `/…|D:\|sk-/` thoát mất dấu «|» nên không kiểm gì — tách từng điều kiện
    expect(r).not.toMatch(/127\.0\.0\.1/);
    expect(r).not.toMatch(/3004\//);
    expect(r).not.toMatch(/D:\\/);
    expect(r).not.toMatch(/SETUP|log\.txt/);
    expect(r).not.toMatch(/sk-/);
  });
  it("BA-04: đường dẫn nhiều thư mục có dấu cách bị cắt trọn, chữ sau vẫn giữ", () => {
    expect(gonChoTelegram(String.raw`Lỗi ở D:\3 SETUP\1 AI\SCI Tiến độ\data\so.json, thử lại sau`)).toBe("Lỗi ở , thử lại sau");
  });
});

describe("đợt 2 — đóng vai người dùng trên 40 câu thật", () => {
  it("TD-05: cột cùng giá trị mọi dòng nói một lần", () => {
    const vao = ["| Mã | Hạng mục | Loại | KL TK (m³) |", "|---|---|---|---|", "| A.1.7-02 | TB2 | Bê tông móng | 750 |", "| A.1.7-04 | TB2 | Bê tông móng | 942 |", "| A.2.7-02 | TB3 | Bê tông móng | 750 |"].join("\n");
    const r = gonChoTelegram(vao);
    expect(r.split("\n")[0]).toBe("Loại: Bê tông móng (mọi dòng)");
    expect(r.match(/Bê tông móng/g)!.length).toBe(1);
  });
  it("TD-08: tiêu đề trống cuối bài bị bỏ", () => {
    expect(gonChoTelegram("Chưa có số liệu nhật ký ngày 25/10/2026.\n\n**GỢI Ý TIẾP THEO**")).toBe("Chưa có số liệu nhật ký ngày 25/10/2026.");
    expect(gonChoTelegram("**A**\n**B**\nnội dung")).toBe("**B**\nnội dung");
  });
});

describe("đợt 2 — câu TD-14 thật không được thành tin rỗng", () => {
  it("dòng nội dung có link localhost: giữ chữ, cắt địa chỉ", () => {
    const r = gonChoTelegram("Báo cáo tuần được quản lý ở agent Tiến độ — bạn xem tại [Quản lý báo cáo](http://localhost:3003/report-mgmt).");
    expect(r).toBe("Báo cáo tuần được quản lý ở agent Tiến độ — bạn xem tại Quản lý báo cáo.");
  });
});

describe("đợt 2 — 50 câu chạy 27/10", () => {
  it("PL-06: <br> thành « · »", () => {
    expect(gonChoTelegram("Điều 24: A<br>Điều 25: B")).toBe("Điều 24: A · Điều 25: B");
  });
  it("CV-08: gạch đầu dòng rỗng bị bỏ", () => {
    expect(gonChoTelegram("**Chi tiết:**\n-\n- Hạn: 26/04/2027")).toBe("**Chi tiết:**\n\n- Hạn: 26/04/2027");
  });
  it("CV-05 + kiểm độc lập N4: cột chung toàn 0 → MỘT dòng «Không dòng nào có», không lặp từng dòng", () => {
    const vao = ["| Người | Đang mở | Quá hạn | Việc găng |", "|---|---|---|---|", "| A | 6 | 5 | 0 |", "| B | 5 | 5 | 0 |", "| C | 3 | 2 | 0 |"].join("\n");
    const r = gonChoTelegram(vao);
    expect(r.split("\n")[0]).toBe("Không dòng nào có: Việc găng");
    expect(r.match(/Việc găng/g)!.length).toBe(1);
  });
  it("kiểm độc lập M2-02: câu kết luận in đậm không bị nuốt thành tin rỗng", () => {
    expect(gonChoTelegram("**Không có việc nào quá hạn.**")).toBe("**Không có việc nào quá hạn.**");
    expect(gonChoTelegram("**Kết luận: dự án đúng hạn**\n**GỢI Ý TIẾP THEO**")).toBe("**Kết luận: dự án đúng hạn**");
  });
  it("link tương đối thành chữ thường", () => {
    expect(gonChoTelegram("Xem [Hợp đồng](/hop-dong) và [Cảnh báo](/alerts?x=1)")).toBe("Xem Hợp đồng và Cảnh báo");
  });
});

describe("đợt 2 — lượt chạy lại 17 câu 27/10", () => {
  it("CV-02: ô Mã còn sót chữ sau khi bỏ CV- (đã có trong tên) → không lặp", () => {
    const vao = ["| Mã | Việc | Hạn | Quá hạn |", "|---|---|---|---|", "| CV-2026-0130 Làm hồ sơ pháp lý | [HV] Làm hồ sơ pháp lý: Hợp đồng tín dụng | 09/02/2026 | 260 |"].join("\n");
    expect(gonChoTelegram(vao)).toBe("• **[HV] Làm hồ sơ pháp lý: Hợp đồng tín dụng** — Hạn: 09/02/2026 · Quá hạn: 260");
  });
  it("ô Mã là mã thật vẫn ghép mã + tên", () => {
    const vao = "| Mã | Hồ sơ | Quá hạn | Hạn |\n|---|---|---|---|\n| HV-K-09 | Phê duyệt ĐTM | 64 | 24/08/2026 |";
    expect(gonChoTelegram(vao)).toBe("• **HV-K-09 Phê duyệt ĐTM** — Quá hạn: 64 · Hạn: 24/08/2026");
  });
});

describe("Mr. Đại chốt 27/10 — bảng ≥ 6 dòng in tên cột MỘT lần, giữ đủ mục", () => {
  const dong = (i: number) => `| ISS-PL-0${i} | Hồ sơ ${i} | ${i % 2 ? "Vàng" : "Đỏ"} | ${100 + i} |`;
  const vao = ["| Mã | Tên | Mức độ | Quá hạn (ngày) |", "|---|---|---|---|", ...[1, 2, 3, 4, 5, 6].map(dong)].join("\n");
  it("đầu khối là dòng «Cột: …», mỗi dòng chỉ giá trị, đủ 6 dòng", () => {
    const r = gonChoTelegram(vao).split("\n");
    expect(r[0]).toBe("Cột: Mức độ · Quá hạn (ngày)");
    expect(r[1]).toBe("• **ISS-PL-01 Hồ sơ 1** — Vàng · 101");
    expect(r.length).toBe(7);
    expect(r.join("\n")).not.toMatch(/Mức độ: /);
  });
  it("ô trống giữ vị trí bằng «—»", () => {
    const v2 = vao.replace("| Đỏ | 102 |", "|  | 102 |");
    expect(gonChoTelegram(v2)).toContain("• **ISS-PL-02 Hồ sơ 2** — — · 102");
  });
  it("bảng 5 dòng giữ khuôn cũ (tên cột từng dòng)", () => {
    const v5 = ["| Mã | Tên | Mức độ | Quá hạn (ngày) |", "|---|---|---|---|", ...[1, 2, 3, 4, 5].map(dong)].join("\n");
    expect(gonChoTelegram(v5)).toContain("Mức độ: Vàng");
  });
});
