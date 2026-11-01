// Kiểm LUẬT AI trên một báo cáo: một lượt AI cho nhiều luật; JSON hỏng / quá giờ → dat null, không ném.
// runAI luôn là bản giả (vi.mock) — test không gọi AI thật.
import { describe, it, expect, beforeEach, vi } from "vitest";

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

import { kiemLuatAi } from "@/lib/luat/kiem-ai";
import { dauLuat, dungYeuCauGop } from "@/lib/luat/ai/kiem";
import { mauGia } from "@/lib/luat/ai/mau";
import type { LuatKiemTra } from "@/lib/luat/types";

function luatAi(id: string, huongDan: string, them: Partial<LuatKiemTra> = {}): LuatKiemTra {
  return {
    id,
    ma: id,
    ten: `Luật ${id}`,
    cau_luat: huongDan,
    mo_ta: null,
    he_thong: false,
    cach_kiem: "ai",
    loai: null,
    tham_so: null,
    huong_dan_ai: huongDan,
    ap_dung: "tat_ca",
    muc: "canh_bao",
    khi_ai_loi: "cho_gui",
    bat: true,
    nhom: "Nội dung",
    thu_tu: 0,
    phien_ban: 1,
    tao_boi: null,
    tao_luc: "",
    sua_boi: null,
    sua_luc: "",
    da_xoa: false,
    ...them,
  };
}

const BC = {
  o_nhap: { mau_ma: "form-7", nguoi_lap: "Nguyễn Văn A", ngay_lap: "20/07/2026" },
  bang: {
    bang_kien_nghi: [
      { stt: "1", noi_dung: "Chậm GPMB", muc_do: "Cao", kien_nghi: "Đề nghị UBND hỗ trợ" },
      { stt: "2", noi_dung: "Thiếu vật tư", muc_do: "Cao", kien_nghi: "" },
    ],
  },
  tieu_de: ["I. TIẾN ĐỘ TỔNG THỂ", "II. RỦI RO & KIẾN NGHỊ PHÒNG ĐT&PC"],
  muc: [
    { tieu_de: "I. TIẾN ĐỘ TỔNG THỂ", van_ban: "Hạng mục đường dây chậm 10 ngày." },
    { tieu_de: "II. RỦI RO & KIẾN NGHỊ PHÒNG ĐT&PC", van_ban: "" },
  ],
  van_ban: "TIẾN ĐỘ TỔNG THỂ\nHạng mục đường dây chậm 10 ngày.",
};

const L = [
  luatAi("l-nguyen-nhan", "Hạng mục chậm tiến độ phải nêu rõ nguyên nhân"),
  luatAi("l-kien-nghi", "Rủi ro mức Cao phải có kiến nghị", { cach_kiem: "ca_hai" }),
  luatAi("l-ky", "Báo cáo phải có chữ ký"),
];

beforeEach(() => {
  aiGia.runAI.mockReset();
  aiGia.mode = "claude-cli";
});

describe("kiemLuatAi — một lượt AI cho nhiều luật", () => {
  it("nhiều luật → MỘT lần gọi AI; mỗi luật {dat, thong_diep, vi_tri}; luật bị bỏ sót → dat null", async () => {
    aiGia.runAI.mockResolvedValue(
      JSON.stringify({
        luat: [
          { id: "L1", dat: false, thong_diep: "Đường dây chậm 10 ngày nhưng không nêu nguyên nhân", vi_tri: "muc:TIẾN ĐỘ TỔNG THỂ" },
          { id: "L2", dat: false, thong_diep: "Dòng 2 mức Cao chưa có kiến nghị", vi_tri: "bang:bang_kien_nghi:2:kien_nghi" },
        ],
      }),
    );
    const kq = await kiemLuatAi(L, BC, "form-7", { thoiGianChoMs: 1000, model: "claude-x" });
    expect(aiGia.runAI).toHaveBeenCalledTimes(1);
    const [prompt, system, , model, ms] = aiGia.runAI.mock.calls[0] as [string, string, unknown, string, number];
    expect(prompt).toContain("id=L1");
    expect(prompt).toContain("id=L3");
    expect(prompt).toContain("Rủi ro mức Cao phải có kiến nghị");
    expect(prompt).toContain("bang:bang_kien_nghi");
    expect(system).toContain('"luat"');
    expect(model).toBe("claude-x");
    expect(ms).toBe(1000); // thời gian chờ truyền vào runAI để dừng hẳn tiến trình
    expect(kq).toHaveLength(3);
    expect(kq[0]).toMatchObject({ luat_id: "l-nguyen-nhan", dat: false, vi_tri: { tag: "muc:TIẾN ĐỘ TỔNG THỂ" } });
    expect(kq[1]).toMatchObject({ luat_id: "l-kien-nghi", dat: false, vi_tri: { bang: "bang_kien_nghi", dong: 2, cot: "kien_nghi" } });
    expect(kq[2]).toMatchObject({ luat_id: "l-ky", dat: null });
  });

  it("JSON hỏng → mọi luật dat null + thông điệp lỗi, không ném", async () => {
    aiGia.runAI.mockResolvedValue("Xin lỗi, em không đọc được báo cáo.");
    const kq = await kiemLuatAi(L, BC, "form-7");
    expect(kq.map((k) => k.dat)).toEqual([null, null, null]);
    expect(kq[0].thong_diep).toMatch(/JSON/);
  });

  it("quá thời gian chờ → dat null, không treo; AI ném lỗi → dat null", async () => {
    aiGia.runAI.mockImplementation(() => new Promise(() => undefined));
    const kq = await kiemLuatAi(L, BC, "form-7", { thoiGianChoMs: 30 });
    expect(kq.every((k) => k.dat === null && /không trả lời/.test(k.thong_diep))).toBe(true);
    aiGia.runAI.mockRejectedValue(new Error("Claude CLI bận"));
    expect((await kiemLuatAi(L, BC, "form-7"))[1]).toMatchObject({ dat: null, thong_diep: expect.stringMatching(/Claude CLI bận/) });
  });

  it("không có luật AI / AI tắt → không gọi AI", async () => {
    expect(await kiemLuatAi([luatAi("x", "y", { cach_kiem: "code" })], BC, "form-7")).toEqual([]);
    aiGia.mode = "off";
    const kq = await kiemLuatAi(L, BC, "form-7");
    expect(kq.every((k) => k.dat === null)).toBe(true);
    expect(aiGia.runAI).not.toHaveBeenCalled();
  });

  it("dấu bộ luật: đổi nội dung / thêm luật → đổi dấu; đổi mức, đổi thứ tự → giữ dấu", () => {
    const d = dauLuat(L);
    expect(dauLuat([L[2], L[0], L[1]])).toBe(d);
    expect(dauLuat(L.map((l) => ({ ...l, muc: "chan" as const })))).toBe(d);
    expect(dauLuat([...L.slice(0, 2), { ...L[2], huong_dan_ai: "Báo cáo phải có chữ ký trưởng đơn vị" }])).not.toBe(d);
    expect(dauLuat(L.slice(0, 2))).not.toBe(d);
  });

  it("yêu cầu gộp góp ý + luật: một prompt, đầu ra có cả gop_y lẫn luat", () => {
    const { system, prompt } = dungYeuCauGop(L, { mau_ma: "form-7", ...BC }, mauGia(null, "form-7"), null);
    expect(system).toContain('"gop_y"');
    expect(system).toContain('"luat"');
    expect(prompt).toContain("id=L2");
  });
});
