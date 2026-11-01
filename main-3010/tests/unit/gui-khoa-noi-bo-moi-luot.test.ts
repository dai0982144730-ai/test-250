// Mr. Đại chốt 17/10/2026 tối (kiểm độc lập lần 7 🔴3): cổng Tiến độ lọc phần tiền của lượt máy–máy KHÔNG kèm khoá nội bộ.
// Main gọi 4 công cụ có tiền 86 lượt / 7 ngày không kèm khoá → nay MỌI lượt Main gửi sang agent khác đều mang `x-sci-noi-bo`,
// ở cả hai đường gọi: hoiAgent (mọi agent) và hoiTienDo (đường riêng của Tiến độ). Giả fetch — không gọi cổng thật.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { hoiAgent } from "@/lib/nguon/hoi-agent";
import { hoiTienDo } from "@/lib/nguon-tien-do";
import { khoaNoiBo } from "@/lib/day-sang-agent";

const headerGui: Record<string, string>[] = [];

function giaFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      headerGui.push({ ...(init?.headers as Record<string, string>) });
      return new Response(JSON.stringify({ ok: true, du_lieu: {}, nguon: [], thoi_diem_tra_loi: new Date().toISOString(), canh_bao: [] }), {
        headers: { "content-type": "application/json" },
      });
    }),
  );
}

const KHOA_CU = process.env.AUTH_SECRET;
beforeAll(() => {
  process.env.AUTH_SECRET = KHOA_CU || "khoa-bai-kiem-gui-khoa-noi-bo";
});

afterEach(() => {
  vi.unstubAllGlobals();
  headerGui.length = 0;
});

describe("Main gửi khoá nội bộ ở MỌI lượt gọi agent khác", () => {
  it("khoá là chuỗi sha256 (64 ký tự hex) — cùng công thức bên nhận", () => {
    expect(khoaNoiBo()).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hoiAgent (không yêu cầu khoá) vẫn kèm x-sci-noi-bo", async () => {
    process.env.URL_AGENT_TIENDO = "http://127.0.0.1:59991";
    giaFetch();
    await hoiAgent("tiendo", "tiendo.san_luong_hop_dong", `kiểm gửi khoá ${Date.now()}`, { tham_so: { ma_du_an: "HV" }, boQuaMaTran: true });
    expect(headerGui.length).toBeGreaterThan(0);
    expect(headerGui[0]!["x-sci-noi-bo"]).toBe(khoaNoiBo());
  });

  it("hoiTienDo (đường riêng của Tiến độ) cũng kèm x-sci-noi-bo", async () => {
    process.env.URL_AGENT_TIEN_DO = "http://127.0.0.1:59992";
    giaFetch();
    await hoiTienDo("tiendo.so_tuan", { ma_du_an: "HV" }, `kiểm gửi khoá Tiến độ ${Date.now()}`);
    expect(headerGui.length).toBeGreaterThan(0);
    expect(headerGui[0]!["x-sci-noi-bo"]).toBe(khoaNoiBo());
  });
});

describe("thiếu AUTH_SECRET thì lượt hỏi vẫn đi, chỉ không kèm khoá", () => {
  it("không ném lỗi, không có header khoá", async () => {
    const giu = process.env.AUTH_SECRET;
    delete process.env.AUTH_SECRET;
    process.env.URL_AGENT_TIEN_DO = "http://127.0.0.1:59993";
    giaFetch();
    const kq = await hoiTienDo("tiendo.so_tuan", { ma_du_an: "NK1" }, `kiểm thiếu khoá ${Date.now()}`);
    process.env.AUTH_SECRET = giu;
    expect(kq.ok).toBe(true);
    expect(headerGui[0]!["x-sci-noi-bo"]).toBeUndefined();
  });
});

// ⭐ 17/10/2026 (đo ở Pháp lý 08:35–16:26): bộ đệm dev hỏng → cổng trả TRANG HTML 404. Trước đây res.json() ném lỗi và lượt bị
// xếp nhầm «không nối được» — nay nói đúng: cổng có trả lời nhưng là trang 404.
describe("cổng trả trang HTML 404 thì nói đúng chuyện đó", () => {
  function giaFetchHtml404() {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<!DOCTYPE html><title>404</title>", { status: 404, headers: { "content-type": "text/html; charset=utf-8" } })),
    );
  }
  it("hoiAgent", async () => {
    process.env.URL_AGENT_PHAPLY = "http://127.0.0.1:59994";
    giaFetchHtml404();
    const kq = await hoiAgent("phaply", "phaply.ho_so_thieu", `kiểm trang 404 ${Date.now()}`, { tham_so: { ma_du_an: "HV" }, boQuaMaTran: true });
    expect(kq.ok).toBe(false);
    if (!kq.ok) {
      expect(kq.thong_diep).toContain("404");
      expect(kq.thong_diep).not.toContain("Không nối được");
    }
  });
  it("hoiTienDo", async () => {
    process.env.URL_AGENT_TIEN_DO = "http://127.0.0.1:59995";
    giaFetchHtml404();
    const kq = await hoiTienDo("tiendo.so_tuan", { ma_du_an: "TRANG404" }, `kiểm trang 404 Tiến độ ${Date.now()}`);
    expect(kq.ok).toBe(false);
    if (!kq.ok) expect(kq.thong_diep).toContain("404");
  });
});
