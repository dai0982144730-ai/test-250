// Kiểm độc lập lần 8 (26/10/2026) MC-01/03/08: câu báo khi agent không thưa — nói đúng nguyên nhân, không in địa chỉ máy,
// «không có quyền» không khoá agent đang sống. Giả fetch — không gọi cổng thật.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cauKhongNoiDuoc, cauNgatMach, lyDoTuMaLoi } from "@/lib/nguon/cau-ngat-mach";
import { hoiAgent, xoaNgatMach } from "@/lib/nguon/hoi-agent";

const ngaMang = () =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new TypeError("fetch failed");
    }),
  );
const traVe = (than: unknown) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(than), { headers: { "content-type": "application/json" } })),
  );
const hoi = (i: number) => hoiAgent("phaply", "phaply.ho_so_thieu", `kiểm câu ngắt mạch ${i} ${Date.now()}`, { tham_so: { ma_du_an: "HV" }, boQuaMaTran: true, khongThuLai: true });

beforeEach(() => {
  process.env.URL_AGENT_PHAPLY = "http://127.0.0.1:59981";
  xoaNgatMach();
});
afterEach(() => vi.unstubAllGlobals());

describe("câu thuần", () => {
  it("ba nguyên nhân, ba câu; giờ thử lại theo giờ VN", () => {
    const luc = Date.UTC(2026, 9, 26, 14, 5); // 21:05 VN
    expect(cauNgatMach("Agent Pháp lý", "khong_noi_duoc", 3, luc)).toBe(
      "Agent Pháp lý đang tắt hoặc đang được khởi động lại (không nối được 3 lần liên tiếp). Máy tự thử lại sau 21:05 — hỏi lại sau giờ đó.",
    );
    expect(cauNgatMach("Agent Pháp lý", "cham", 3, luc)).toContain("không trả lời kịp 3 lần liên tiếp");
    expect(cauNgatMach("Agent Pháp lý", "loi", 3, luc)).toContain("trả lỗi 3 lần liên tiếp");
    expect([lyDoTuMaLoi("AGENT_KHONG_SAN_SANG"), lyDoTuMaLoi("HET_HAN_CHO"), lyDoTuMaLoi("LOI_NOI_BO")]).toEqual(["khong_noi_duoc", "cham", "loi"]);
    expect(cauKhongNoiDuoc("Agent Tiến độ")).not.toMatch(/127\.0\.0\.1|http|Đã bật chưa/);
  });
});

describe("hoiAgent", () => {
  it("agent tắt: lượt 1 không in địa chỉ máy; lượt 4 nói «đang tắt hoặc đang được khởi động lại» kèm giờ thử lại", async () => {
    ngaMang();
    const lan1 = await hoi(1);
    expect(!lan1.ok && lan1.thong_diep).toContain("đang tắt hoặc đang được khởi động lại");
    expect(!lan1.ok && lan1.thong_diep).not.toMatch(/127\.0\.0\.1|http/);
    await hoi(2);
    await hoi(3);
    const lan4 = await hoi(4);
    expect(!lan4.ok && lan4.thong_diep).toMatch(/đang tắt hoặc đang được khởi động lại \(không nối được 3 lần liên tiếp\)\. Máy tự thử lại sau \d{2}:\d{2}/);
  });
  it("«không có quyền» 3 lần liền không mở ngắt mạch — agent vẫn đang sống", async () => {
    traVe({ ok: false, ma_loi: "KHONG_CO_QUYEN", thong_diep: "Người này không có quyền xem" });
    for (let i = 0; i < 4; i++) await hoi(i);
    traVe({ ok: true, du_lieu: {}, nguon: [], thoi_diem_tra_loi: new Date().toISOString(), canh_bao: [] });
    expect((await hoi(9)).ok).toBe(true);
  });
});
