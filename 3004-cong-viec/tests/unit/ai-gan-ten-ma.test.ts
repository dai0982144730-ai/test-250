// Lưới luật 30 cho câu trả lời trợ lý: mã việc đứng trần → gắn tên ngắn (test đêm 01/10, câu 1 Sonnet 5).
import { describe, it, expect } from "vitest";
import { ganSoNgay, ganTenChoMa, tenNgan } from "@/lib/ai/gan-ten-ma";

const TD = {
  "CV-2026-0053": "Giấy phép môi trường Ca Nan 1 & 2 — gia hạn",
  "CV-2026-0051": "HĐ khảo sát Nam Khiên 2&3 chưa ký",
  "CV-2026-0001": "GPMB Trụ T11",
};

describe("ganTenChoMa", () => {
  it("mã trần trong câu (cả dạng link) → gắn tên; mã lạ để nguyên", () => {
    const ra = ganTenChoMa("Nên xử lý sớm [CV-2026-0053](/so-do?viec=CV-2026-0053) và CV-2026-0051 vì quá hạn; CV-2026-9999 chưa rõ.", TD);
    expect(ra).toBe(
      "Nên xử lý sớm [CV-2026-0053](/so-do?viec=CV-2026-0053) Giấy phép môi trường Ca Nan 1 &… và CV-2026-0051 HĐ khảo sát Nam Khiên 2&3 chưa ký vì quá hạn; CV-2026-9999 chưa rõ.",
    );
  });
  it("đã có tên (sau · — : hoặc trong ngoặc sau tên), dòng bảng, mã trong đường dẫn → không đụng", () => {
    for (const s of [
      "CV-2026-0001 · GPMB Trụ T11 hạn 15/10",
      "**CV-2026-0001** — GPMB Trụ T11",
      "[CV-2026-0001](/so-do?viec=CV-2026-0001) GPMB Trụ T11",
      "việc GPMB Trụ T11 (CV-2026-0001) đang làm",
      "| [CV-2026-0053](/so-do?viec=CV-2026-0053) | 30/07 |",
      "mở /so-do?viec=CV-2026-0001 nhé",
    ])
      expect(ganTenChoMa(s, TD)).toBe(s);
  });
  it("mã in đậm → tên đặt sau dấu đóng đậm", () => {
    expect(ganTenChoMa("**CV-2026-0001** đang trễ", TD)).toBe("**CV-2026-0001** GPMB Trụ T11 đang trễ");
  });
  it("luật 31: khoảng ngày trơn → kèm số ngày; đã có thì để nguyên", () => {
    expect(ganSoNgay("| Tuần 39 | 21/09 – 27/09/2026 | 4 |")).toBe("| Tuần 39 | 7 ngày · 21/09 – 27/09/2026 | 4 |");
    expect(ganSoNgay("từ 28/12 - 03/01/2027")).toBe("từ 7 ngày · 28/12 - 03/01/2027");
    expect(ganSoNgay("hạn 01/10/2026 – 15/10/2026")).toBe("hạn 15 ngày · 01/10/2026 – 15/10/2026");
    const co = "tuần 40 (7 ngày · 28/09/2026 – 04/10/2026)";
    expect(ganSoNgay(co)).toBe(co);
  });
  it("tên dài rút ≤ 8 chữ", () => {
    expect(tenNgan("một hai ba bốn năm sáu bảy tám chín mười")).toBe("một hai ba bốn năm sáu bảy tám…");
  });
});

describe("thayMaMau — mã ô/bảng của mẫu Word → tên trên báo cáo (test đêm 02/10 X-7)", () => {
  it("thay mã trong dấu ` và mã trần; không đụng đường dẫn, chữ thường", async () => {
    const { thayMaMau } = await import("@/lib/ai/gan-ten-ma");
    const ten = new Map([["don_vi_lap", "Đơn vị lập"], ["bang_cong_viec", "Bảng công việc"], ["ten", "Công việc"]]);
    expect(thayMaMau("Ô `don_vi_lap` — \"PHÒNG CƠ ĐIỆN\"; bang_cong_viec dòng 1", ten)).toBe('Ô "Đơn vị lập" — "PHÒNG CƠ ĐIỆN"; "Bảng công việc" dòng 1');
    expect(thayMaMau("mở /so-do?viec=bang_cong_viec và tên việc", ten)).toBe("mở /so-do?viec=bang_cong_viec và tên việc");
  });
});
