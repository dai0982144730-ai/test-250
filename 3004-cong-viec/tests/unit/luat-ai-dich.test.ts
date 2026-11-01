// Dịch câu luật tiếng Việt → đề xuất luật (ưu tiên dạng code, kiểm tham số, hỏi lại một lần, hạ xuống luật AI).
// runAI luôn là bản giả (vi.mock) — test không gọi AI thật.
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";

const aiGia = vi.hoisted(() => ({ runAI: vi.fn<(...a: unknown[]) => Promise<string>>(), mode: "claude-cli" as "claude-cli" | "api" | "off" }));

vi.mock("@/lib/ai/providers", async (goc) => {
  const that = (await goc()) as Record<string, unknown>;
  return {
    ...that,
    runAI: (...a: unknown[]) => aiGia.runAI(...a),
    // Quản lý token AI (04/10): chỗ gọi đi qua runAIGan(nhãn tính năng, …) — giả cả hàm này, không thì test gọi Claude THẬT
    runAIGan: (_ma: string, ...a: unknown[]) => aiGia.runAI(...a),
    getAIConfig: () => ({ mode: aiGia.mode, provider: "anthropic", apiKey: "", model: "", baseUrl: "" }),
  };
});

import { csdlMoi } from "../helpers/csdl";
import type { Q } from "@/lib/db";
import { dichCauLuat } from "@/lib/luat/kiem-ai";
import { dichKhongCanAi, docTraLoiDich } from "@/lib/luat/ai/dich";
import { napMauApDung } from "@/lib/luat/ai/mau";
import { kiemThamSo } from "@/lib/luat/loai-luat";

let q: Q;

/** Mẫu thử có bảng tiến độ gắn mã (cột % hoàn thành) — mẫu thật Form 5/7 chưa gắn mã bảng này. */
const MAU_THU = {
  o_nhap: [
    { tag: "mau_ma", nhan: "Mã mẫu", bat_buoc: true, kieu: "chu" },
    { tag: "nguoi_lap", nhan: "Người lập", bat_buoc: true, kieu: "chu" },
    { tag: "ngay_lap", nhan: "Ngày lập", bat_buoc: true, kieu: "ngay" },
  ],
  bang_cong_viec: [{ tag: "bang_cong_viec", nhan: "Công việc" }],
  muc_bat_buoc: ["TIẾN ĐỘ", "CÔNG VIỆC"],
  bang: [
    {
      tag: "bang_tien_do",
      nhan: "Tiến độ",
      cot: [
        { tag: "hang_muc", nhan: "Hạng mục" },
        { tag: "phan_tram_ht", nhan: "% hoàn thành" },
      ],
    },
    { tag: "bang_cong_viec", nhan: "Công việc", cot: [{ tag: "ten", nhan: "Công việc" }, { tag: "ket_thuc", nhan: "Kết thúc" }] },
  ],
};

const traLoi = (o: Record<string, unknown>) => "```json\n" + JSON.stringify(o) + "\n```";

beforeAll(async () => {
  q = await csdlMoi();
  await q.query(
    `INSERT INTO docflow.mau_word (ma, ten, loai_ky, dinh_nghia, phien_ban, active) VALUES ('form-thu', 'Mẫu thử tiến độ', 'tuan', $1::jsonb, 1, true)
     ON CONFLICT (ma) DO NOTHING`,
    [JSON.stringify(MAU_THU)],
  );
});

beforeEach(() => {
  aiGia.runAI.mockReset();
  aiGia.mode = "claude-cli";
});

describe("dịch câu luật sang dạng luật code", () => {
  it('"% hoàn thành không quá 100" → khoang_so đúng tham số, mức chặn, đọc ra lời', async () => {
    const ts = { tham_chieu: { bang: "bang_tien_do", cot: "phan_tram_ht" }, tu: 0, den: 100 };
    aiGia.runAI.mockResolvedValue(
      traLoi({ cach_kiem: "code", loai: "khoang_so", tham_so: ts, huong_dan_ai: "% hoàn thành mỗi hạng mục từ 0 đến 100", ten: "% hoàn thành ≤ 100", nhom: "Số liệu", ap_dung: ["form-thu"], muc: "chan", ly_do: "Cột % hoàn thành đã gắn mã", canh_bao: [] }),
    );
    const dx = await dichCauLuat(q, "% hoàn thành không quá 100", ["form-thu"]);
    expect(aiGia.runAI).toHaveBeenCalledTimes(1);
    const [prompt, system] = aiGia.runAI.mock.calls[0] as [string, string];
    expect(prompt).toContain("khoang_so");
    expect(prompt).toContain('phan_tram_ht="% hoàn thành"');
    expect(system).toContain('"cach_kiem"');
    expect(dx).toMatchObject({ cach_kiem: "code", loai: "khoang_so", tham_so: ts, muc_goi_y: "chan", ap_dung_goi_y: ["form-thu"], nhom_goi_y: "Số liệu", canh_bao: [] });
    expect(dx.ten_goi_y).toBe("% hoàn thành ≤ 100");
    expect(dx.giai_thich).toMatch(/hoàn thành/);
    expect(kiemThamSo("khoang_so", dx.tham_so!, (await napMauApDung(q, ["form-thu"]))[0])).toEqual([]);
  });

  it('"Rủi ro cao phải có kiến nghị" (Form 7) → neu_thi', async () => {
    const ts = {
      neu: { tham_chieu: { bang: "bang_kien_nghi", cot: "muc_do" }, phep: "bang", gia_tri: "Cao" },
      thi: { tham_chieu: { bang: "bang_kien_nghi", cot: "kien_nghi" }, phep: "co_gia_tri" },
    };
    aiGia.runAI.mockResolvedValue(
      traLoi({ cach_kiem: "code", loai: "neu_thi", tham_so: ts, huong_dan_ai: "Rủi ro mức Cao phải có kiến nghị", ten: "Rủi ro cao có kiến nghị", nhom: "Bảng Kiến nghị", ap_dung: "tat_ca", muc: "chan", ly_do: "Bảng kiến nghị có cột mức độ và kiến nghị", canh_bao: [] }),
    );
    const dx = await dichCauLuat(q, "Rủi ro cao phải có kiến nghị", ["form-7"]);
    expect(dx).toMatchObject({ cach_kiem: "code", loai: "neu_thi", tham_so: ts, ap_dung_goi_y: ["form-7"], muc_goi_y: "chan" });
    expect(aiGia.runAI).toHaveBeenCalledTimes(1);
  });

  it('"Nêu rõ nguyên nhân chậm tiến độ" → luật AI, chỉ cảnh báo', async () => {
    aiGia.runAI.mockResolvedValue(
      traLoi({ cach_kiem: "ai", loai: null, tham_so: null, huong_dan_ai: "Hạng mục chậm tiến độ phải nêu rõ nguyên nhân chậm", ten: "Nêu nguyên nhân chậm", nhom: "Nội dung", ap_dung: ["form-7"], muc: "chan", ly_do: "Cần đọc hiểu nội dung", canh_bao: [] }),
    );
    const dx = await dichCauLuat(q, "Nêu rõ nguyên nhân chậm tiến độ", ["form-7"]);
    expect(dx).toMatchObject({ cach_kiem: "ai", loai: null, tham_so: null, muc_goi_y: "canh_bao", huong_dan_ai: "Hạng mục chậm tiến độ phải nêu rõ nguyên nhân chậm" });
    expect(dx.giai_thich).toBe("Cần đọc hiểu nội dung");
  });

  it("AI trả tag sai → hỏi lại kèm lỗi → vẫn sai → hạ xuống luật AI kèm cảnh báo", async () => {
    const sai = traLoi({ cach_kiem: "code", loai: "khoang_so", tham_so: { tham_chieu: { bang: "bang_kpi", cot: "ty_le" }, tu: 0, den: 100 }, huong_dan_ai: "Tỷ lệ KPI từ 0 đến 100%", ten: "KPI ≤ 100%", nhom: "Số liệu", ap_dung: ["form-7"], muc: "chan", ly_do: "x", canh_bao: [] });
    aiGia.runAI.mockResolvedValue(sai);
    const dx = await dichCauLuat(q, "Tỷ lệ KPI không quá 100%", ["form-7"]);
    expect(aiGia.runAI).toHaveBeenCalledTimes(2);
    const prompt2 = aiGia.runAI.mock.calls[1][0] as string;
    expect(prompt2).toContain("LẦN TRƯỚC");
    expect(prompt2).toContain("bang_kpi");
    expect(dx).toMatchObject({ cach_kiem: "ai", loai: null, tham_so: null, huong_dan_ai: "Tỷ lệ KPI từ 0 đến 100%", muc_goi_y: "canh_bao", ap_dung_goi_y: ["form-7"] });
    expect(dx.canh_bao.join(" ")).toMatch(/Chưa dịch được sang luật code/);
    expect(dx.canh_bao.join(" ")).toMatch(/gắn mã/);
  });

  it("sai lần đầu, lần hỏi lại đúng → luật code; JSON hỏng lần đầu cũng được hỏi lại", async () => {
    aiGia.runAI
      .mockResolvedValueOnce(traLoi({ cach_kiem: "code", loai: "bang_toi_thieu", tham_so: { bang: "bang_viec" }, ten: "x" }))
      .mockResolvedValueOnce(traLoi({ cach_kiem: "code", loai: "bang_toi_thieu", tham_so: { bang: "bang_cong_viec", so_dong: 1 }, ten: "Bảng Công việc có ít nhất 1 việc", nhom: "Bảng Công việc", muc: "chan" }));
    const dx = await dichCauLuat(q, "Bảng Công việc phải có ít nhất một việc", ["form-5", "form-7"]);
    expect(aiGia.runAI).toHaveBeenCalledTimes(2);
    expect(dx).toMatchObject({ cach_kiem: "code", loai: "bang_toi_thieu", tham_so: { bang: "bang_cong_viec", so_dong: 1 }, ap_dung_goi_y: ["form-5", "form-7"] });

    aiGia.runAI.mockReset();
    aiGia.runAI
      .mockResolvedValueOnce("Em nghĩ đây là luật về bảng.")
      .mockResolvedValueOnce(traLoi({ cach_kiem: "code", loai: "cot_bat_buoc", tham_so: { bang: "bang_kien_nghi", cot: "kien_nghi" }, ten: "Kiến nghị phải ghi", muc: "canh_bao" }));
    const dx2 = await dichCauLuat(q, "Mỗi dòng rủi ro phải có kiến nghị", ["form-7"]);
    expect(aiGia.runAI).toHaveBeenCalledTimes(2);
    expect((aiGia.runAI.mock.calls[1][0] as string)).toContain("không phải JSON hợp lệ");
    expect(dx2).toMatchObject({ cach_kiem: "code", loai: "cot_bat_buoc", muc_goi_y: "canh_bao" });
  });

  it("AI gợi ý áp dụng quá rộng → thu hẹp trong lựa chọn của người dùng; mẫu lạ bị bỏ", async () => {
    aiGia.runAI.mockResolvedValue(traLoi({ cach_kiem: "code", loai: "cot_bat_buoc", tham_so: { bang: "bang_kien_nghi", cot: "kien_nghi" }, ap_dung: ["form-7", "form-99"], ten: "Kiến nghị" }));
    const dx = await dichCauLuat(q, "Rủi ro nào cũng phải có kiến nghị", "tat_ca");
    expect(dx.ap_dung_goi_y).toEqual(["form-7"]);
    expect(dx.cach_kiem).toBe("code");
  });

  it("AI tắt / AI lỗi → đề xuất luật AI thô kèm cảnh báo, không ném", async () => {
    aiGia.mode = "off";
    const a = await dichCauLuat(q, "Báo cáo phải nêu rõ khó khăn", ["form-7"]);
    expect(aiGia.runAI).not.toHaveBeenCalled();
    expect(a).toMatchObject({ cach_kiem: "ai", huong_dan_ai: "Báo cáo phải nêu rõ khó khăn", muc_goi_y: "canh_bao" });
    expect(a.canh_bao[0]).toMatch(/AI đang tắt/);

    aiGia.mode = "claude-cli";
    aiGia.runAI.mockRejectedValue(new Error("Claude CLI thoát với mã 1"));
    const b = await dichCauLuat(q, "Báo cáo phải nêu rõ khó khăn", ["form-7"]);
    expect(b.cach_kiem).toBe("ai");
    expect(b.canh_bao[0]).toMatch(/Claude CLI thoát/);
  });

  it("câu quá đơn giản → dịch thẳng không cần AI", async () => {
    // mẫu bản 6 bỏ Ngày lập / Người kiểm soát: dùng ô còn trên mẫu thật (Kỳ báo cáo, Tình trạng tổng thể của Form 7)
    const dx = await dichCauLuat(q, "Kỳ báo cáo phải có giá trị", ["form-5", "form-7"]);
    expect(aiGia.runAI).not.toHaveBeenCalled();
    expect(dx).toMatchObject({ cach_kiem: "code", loai: "o_co_gia_tri", tham_so: { o: "ky_bao_cao" }, ap_dung_goi_y: ["form-5", "form-7"], muc_goi_y: "chan" });
    const maus = await napMauApDung(q, ["form-7"]);
    expect(dichKhongCanAi("Tình trạng tổng thể không được để trống.", maus, ["form-7"])?.tham_so).toEqual({ o: "du_an_tinh_trang" });
    expect(dichKhongCanAi("Người kiểm soát không được để trống.", maus, ["form-7"])).toBeNull();
    expect(dichKhongCanAi("Nêu rõ nguyên nhân chậm tiến độ", maus, ["form-7"])).toBeNull();
    expect(dichKhongCanAi("Ô lạ phải có giá trị", maus, ["form-7"])).toBeNull();
  });

  it("đọc câu trả lời: chuẩn hóa kiểu, JSON hỏng thì ném", () => {
    const t = docTraLoiDich('Đây: {"cach_kiem":"code","loai":"khoang_so","tham_so":{"tu":0},"muc":"to","ap_dung":"tat_ca","canh_bao":["a",1]}');
    expect(t).toMatchObject({ cach_kiem: "code", loai: "khoang_so", muc: null, ap_dung: "tat_ca", canh_bao: ["a"] });
    expect(() => docTraLoiDich("không có JSON")).toThrow(/JSON/);
  });
});
