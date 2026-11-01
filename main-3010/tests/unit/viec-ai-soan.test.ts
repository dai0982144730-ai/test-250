// VIỆC AI SOẠN SẴN (chung/viec-ai-soan.ts) — bóc nháp việc từ trả lời LLM.
// ⭐ 24/09: tách từ canh-bao-nhom5.test.ts — phần sinh-nhom5 (bộ sinh đề xuất
// AI trên BC tiến độ CHÉP) đã gỡ khỏi Main; phần nháp việc là của Main, giữ.
import { describe, it, expect } from "vitest";
import { docNhapTuTraLoi } from "@/lib/chung/viec-ai-soan";

describe("docNhapTuTraLoi — nháp việc AI soạn", () => {
  it("đủ ten+moTa thì nhận, hạn sai dạng thì bỏ hạn", () => {
    const n = docNhapTuTraLoi('{"ten":"Bổ sung 1 trạm trộn","moTa":"Vì chậm 38 ngày.","han":"05/09/2026"}');
    expect(n?.ten).toBe("Bổ sung 1 trạm trộn");
    expect(n?.han).toBe("05/09/2026");
    expect(docNhapTuTraLoi('{"ten":"x","moTa":"y","han":"mai"}')?.han).toBeUndefined();
  });
  it("thiếu tên/mô tả → null, không đoán", () => {
    expect(docNhapTuTraLoi('{"ten":"","moTa":"y"}')).toBeNull();
    expect(docNhapTuTraLoi("hỏng")).toBeNull();
  });
});
