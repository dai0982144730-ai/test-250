// Trợ lý chat Main — câu QUEN đi MỘT vòng mô hình (26/09, Mr. Đại chốt phần tốc độ):
// code tự hỏi sẵn công cụ đọc, mô hình chỉ viết trả lời; vòng chọn công cụ tắt nghĩ,
// vòng viết trả lời trần nghĩ 2.000 token. Không gọi agent thật: runTool là bản giả.
import { beforeEach, describe, expect, it, vi } from "vitest";

const loiGoiAI: Array<{ prompt: string; tuyChon?: { tokenNghi?: number } }> = [];
let traLoiAI: string[] = [];
vi.mock("@/lib/ai/providers", () => ({
  runAI: async (prompt: string, _s?: string, _k?: unknown, tuyChon?: { tokenNghi?: number; khiXong?: (d: { tokenRa: number | null; usd: number | null }) => void }) => {
    loiGoiAI.push({ prompt, tuyChon });
    tuyChon?.khiXong?.({ tokenRa: 100, usd: 0.01 });
    return traLoiAI.shift() ?? '{"reply":"xong","actions":[]}';
  },
}));
vi.mock("@/lib/skill/ky-nang", () => ({
  SKILL_CO_SCRIPT: [],
  docNoiDung: () => null,
  dongBoSandbox: () => "",
  layDanhSach: () => [],
}));
vi.mock("@/lib/ai/van-phong-luu", () => ({ docVanPhong: () => ({ noiDung: "" }) }));

const daGoiCongCu: Array<{ name: string; args: Record<string, unknown> }> = [];
vi.mock("@/lib/ai/chat-tools", async (goc) => ({
  ...((await goc()) as object),
  runTool: async (name: string, args: Record<string, unknown>) => {
    daGoiCongCu.push({ name, args });
    return { ok: true, summary: `Agent tiến độ trả lời tiendo.${name}.`, data: { cong_cu: name, so: 79 } };
  },
}));

import { runChatAgent, TOKEN_NGHI_CHON_CONG_CU, TOKEN_NGHI_VIET_TRA_LOI } from "@/lib/ai/chat-agent";
import { duAnTrongCau, khuonCauQuen, thayDoiTrongCau } from "@/lib/ai/chon-cong-cu";
import { chuanThayDoi } from "@/lib/ai/chat-tools";

const DU_AN = [
  { ma: "HV", name: "Điện gió Hướng Việt (HV — dữ liệu test)" },
  { ma: "N3A", name: "Nậm săm 3A" },
  { ma: "TT", name: "Tân Thành" },
  { ma: "BT", name: "Ba Tầng 1" },
];
const CAU_B = "HV đang chậm bao nhiêu ngày, nguyên nhân chính là gì, và nếu 6.1.4 xong sớm 10 ngày thì COD dự báo đổi thế nào?";

const vao = (message: string) => ({
  projectId: "default",
  email: "pm@sci.vn",
  role: "pm" as const,
  loai: "pm" as const,
  message,
  history: [],
  kenh: "web" as const,
});

beforeEach(() => {
  loiGoiAI.length = 0;
  daGoiCongCu.length = 0;
  traLoiAI = [];
});

describe("khuôn câu quen → công cụ tự hỏi sẵn", () => {
  it("câu B: tóm tắt + dự báo + đường găng + GIẢ ĐỊNH 6.1.4 sớm 10 + chi tiết 6.1.4, đúng dự án HV", () => {
    const ds = khuonCauQuen(CAU_B, DU_AN);
    expect(ds.map((d) => d.name)).toEqual(["tom_tat_du_an", "du_bao", "duong_gang", "gia_dinh_cod", "chi_tiet_dau_viec"]);
    expect(ds.every((d) => d.args.du_an === "HV")).toBe(true);
    expect(ds[3]!.args.thay_doi).toEqual([{ wbs: "6.1.4", loai: "xong_som", soNgay: 10 }]);
    expect(ds[4]!.args.ma_wbs).toBe("6.1.4");
  });

  it("nhận câu giả định: một WBS + sớm/muộn N ngày; không chắc thì để mô hình", () => {
    expect(thayDoiTrongCau("Nếu 7.6.2.6 chậm thêm 5 ngày thì sao?")).toEqual({ wbs: "7.6.2.6", loai: "xong_muon", soNgay: 5 });
    expect(thayDoiTrongCau("6.1.4 xong sớm hơn 30 ngày")).toEqual({ wbs: "6.1.4", loai: "xong_som", soNgay: 30 });
    expect(thayDoiTrongCau("Nếu 6.1.4 và 6.1.6 cùng sớm 10 ngày")).toBeNull(); // hai WBS
    expect(thayDoiTrongCau("Nếu 6.1.4 bắt đầu ngày 01/11/2026")).toBeNull(); // để mô hình dựng
    // Câu chỉ có "nếu … thì sao" (không nhắc COD) vẫn vào đường 1 vòng
    expect(khuonCauQuen("Nếu 7.6.2.6 chậm thêm 5 ngày thì sao?", DU_AN).map((d) => d.name)).toEqual([
      "duong_gang",
      "gia_dinh_cod",
      "chi_tiet_dau_viec",
    ]);
  });

  it("chuanThayDoi: nhận mảng, một object tầng ngoài, chuỗi JSON", () => {
    const mot = { wbs: "6.1.4", loai: "xong_som", soNgay: 10 };
    expect(chuanThayDoi({ thay_doi: [mot] })).toEqual([mot]);
    expect(chuanThayDoi({ ...mot, du_an: "HV" })).toEqual([mot]);
    expect(chuanThayDoi({ thay_doi: JSON.stringify([mot]) })).toEqual([mot]);
    expect(chuanThayDoi({ du_an: "HV" })).toBeUndefined();
  });

  it("câu A (COD): tóm tắt + dự báo", () => {
    expect(khuonCauQuen("COD dự báo của HV là ngày nào?", DU_AN).map((d) => d.name)).toEqual(["tom_tat_du_an", "du_bao"]);
  });

  it("hồ sơ thiếu / quá hạn → hỏi agent pháp lý / Base", () => {
    expect(khuonCauQuen("N3A còn thiếu hồ sơ gì?", DU_AN).map((d) => d.name)).toEqual(["phaply_ho_so_thieu"]);
    expect(khuonCauQuen("Việc nào quá hạn trên Base?", DU_AN).map((d) => d.name)).toEqual(["base_viec_qua_han"]);
  });

  it("câu lạ / xã giao → [] (đi đường cũ); nhắc 2 dự án → [] (để mô hình tự chia)", () => {
    expect(khuonCauQuen("Chào bạn, hôm nay thế nào?", DU_AN)).toEqual([]);
    expect(khuonCauQuen("Giao việc đổ bê tông cho thịnh", DU_AN)).toEqual([]);
    expect(khuonCauQuen("HV và N3A đang chậm bao nhiêu?", DU_AN)).toEqual([]);
  });

  it("nhận dự án theo mã HOA hoặc lõi tên; 3.3% không bị coi là mã WBS", () => {
    expect(duAnTrongCau("Hướng Việt chậm bao nhiêu", DU_AN)).toBe("HV");
    expect(duAnTrongCau("tt 10/2023 nói gì", DU_AN)).toBeUndefined(); // chữ thường "tt" không phải mã
    expect(duAnTrongCau("Dự án Tân Thành", DU_AN)).toBe("TT");
    const ds = khuonCauQuen("HV chậm bao nhiêu, thực tế 3.3% thôi", DU_AN);
    expect(ds.map((d) => d.name)).not.toContain("chi_tiet_dau_viec");
  });
});

describe("runChatAgent — đường MỘT vòng", () => {
  it("câu quen: code gọi sẵn 5 công cụ, mô hình chạy ĐÚNG 1 vòng, trần nghĩ 2.000", async () => {
    traLoiAI = ['{"reply":"HV chậm 79 ngày so với Tiến độ mục tiêu (nguồn: Agent tiến độ · tiendo.tom_tat_du_an)","actions":[]}'];
    const kq = await runChatAgent(vao(CAU_B));
    expect(daGoiCongCu.map((c) => c.name)).toEqual(["tom_tat_du_an", "du_bao", "duong_gang", "gia_dinh_cod", "chi_tiet_dau_viec"]);
    expect(loiGoiAI).toHaveLength(1);
    expect(loiGoiAI[0]!.tuyChon?.tokenNghi).toBe(TOKEN_NGHI_VIET_TRA_LOI);
    expect(loiGoiAI[0]!.prompt).toContain("TỰ HỎI SẴN");
    expect(loiGoiAI[0]!.prompt).toContain("tiendo.duong_gang");
    expect(kq.doLuong).toEqual({ soVongMoHinh: 1, tuHoiSan: ["tom_tat_du_an", "du_bao", "duong_gang", "gia_dinh_cod", "chi_tiet_dau_viec"], tokenRa: 100, usd: 0.01 });
    expect(kq.actions.map((a) => a.name)).toContain("duong_gang");
  });

  it("câu quen nhưng mô hình cần thêm → vẫn được vòng công cụ thứ hai", async () => {
    traLoiAI = [
      '{"reply":"","actions":[{"name":"nang_suat","args":{"du_an":"HV"}}]}',
      '{"reply":"đủ rồi","actions":[]}',
    ];
    const kq = await runChatAgent(vao("COD dự báo của HV là ngày nào?"));
    expect(loiGoiAI).toHaveLength(2);
    expect(daGoiCongCu.map((c) => c.name)).toEqual(["tom_tat_du_an", "du_bao", "nang_suat"]);
    // Vòng 2 vẫn thấy kết quả tự hỏi sẵn (gộp kết quả mọi vòng)
    expect(loiGoiAI[1]!.prompt).toContain("tom_tat_du_an");
    expect(kq.reply).toBe("đủ rồi");
  });

  it("câu lạ: không tự hỏi, vòng chọn công cụ TẮT nghĩ (0)", async () => {
    traLoiAI = ['{"reply":"Chào bạn!","actions":[]}'];
    const kq = await runChatAgent(vao("Chào bạn"));
    expect(daGoiCongCu).toHaveLength(0);
    expect(loiGoiAI[0]!.tuyChon?.tokenNghi).toBe(TOKEN_NGHI_CHON_CONG_CU);
    expect(kq.doLuong.tuHoiSan).toEqual([]);
  });
});
