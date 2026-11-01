// ============================================================
// Khoá nội bộ x-sci-noi-bo trên MỌI lượt agent Công việc gửi sang agent khác (17/10/2026).
// Cổng Tiến độ (17/10, kiểm độc lập lần 7 🔴3) bỏ phần tiền của lượt máy–máy thiếu khoá; các cổng khác dùng khoá cho bài đo
// và cửa riêng. Bốn chỗ gửi: hỏi Tiến độ (nguon-tien-do) · hỏi trùng 4 agent (luật 33) · kéo ma trận + kéo dự án từ Main.
// Công thức MỘT chỗ (lib/mcp/khoa-chung.ts) — bên nhận coKhoaNoiBo và bên gửi phải khớp nhau.
// fetch giả, sổ hỏi–đáp ghi vào thư mục tạm — không gọi agent thật.
// ============================================================
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from "vitest";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "cv-khoa-noi-bo-"));
process.env.DOCFLOW_AI_DATA = TMP;
const KHOA_CHUNG = "khoa-chung-bai-kiem-goi-di-17-10";
const BAM = crypto.createHash("sha256").update("noi-bo:" + KHOA_CHUNG).digest("hex");

const goi: { url: string; noiBo: string | null }[] = [];
const TRA_LOI_OK = () => ({ ok: true, du_lieu: {}, nguon: [], canh_bao: [], thoi_diem_tra_loi: "" });
let traLoi: (url: string) => unknown = TRA_LOI_OK;

function dauThuCua(init: { headers?: HeadersInit } | undefined): string | null {
  const h = init?.headers;
  if (!h) return null;
  if (h instanceof Headers) return h.get("x-sci-noi-bo");
  if (Array.isArray(h)) return h.find(([k]) => k.toLowerCase() === "x-sci-noi-bo")?.[1] ?? null;
  return (h as Record<string, string>)["x-sci-noi-bo"] ?? null;
}

beforeEach(() => {
  process.env.AUTH_SECRET_CHUNG = KHOA_CHUNG;
  goi.length = 0;
  traLoi = TRA_LOI_OK;
  vi.stubGlobal("fetch", async (url: string, init?: { headers?: HeadersInit }) => {
    goi.push({ url, noiBo: dauThuCua(init) });
    return { status: 200, json: async () => traLoi(url) } as unknown as Response;
  });
});
afterEach(() => vi.unstubAllGlobals());
afterAll(() => {
  delete process.env.AUTH_SECRET_CHUNG;
  delete process.env.DOCFLOW_AI_DATA;
  fs.rmSync(TMP, { recursive: true, force: true });
});

describe("mọi lượt gửi sang agent khác kèm x-sci-noi-bo", () => {
  it("hỏi agent Tiến độ (hoiTienDo)", async () => {
    vi.resetModules();
    const { hoiTienDo } = await import("@/lib/nguon-tien-do");
    await hoiTienDo("tiendo.tom_tat_du_an", { ma_du_an: "HV" }, "bài kiểm khoá nội bộ");
    expect(goi).toHaveLength(1);
    expect(goi[0]!.noiBo).toBe(BAM);
  });

  it("hỏi trùng (luật 33) sang Tiến độ · Hợp đồng · Pháp lý · Main", async () => {
    const { goiHoiTrungQuaSo } = await import("@/lib/cay-viec/hoi-trung-hoi");
    traLoi = () => ({ ok: true, du_lieu: { trung: false, cach_phan: "khong_ung_vien", so_ung_vien: 0 } });
    const hoi = goiHoiTrungQuaSo({ noi_dung: "Xử lý 6.1.4 — bài kiểm", ly_do: "bài kiểm", ma_du_an: "HV" }, { duong: "tay" });
    for (const ma of ["tiendo", "hopdong", "phaply", "main"]) await hoi(ma, 0);
    expect(goi).toHaveLength(4);
    expect(goi.every((g) => g.noiBo === BAM)).toBe(true);
  });

  it("kéo ma trận Ai được gọi ai từ Main", async () => {
    const { layBanMaTran } = await import("@/lib/mcp/ma-tran-cong");
    traLoi = () => ({ ok: true, du_lieu: { goi_toi: [] } });
    await layBanMaTran();
    const main = goi.filter((g) => g.url.includes("/api/mcp/main"));
    expect(main.length).toBeGreaterThan(0);
    expect(main.every((g) => g.noiBo === BAM)).toBe(true);
  });

  it("kéo danh mục dự án từ Main", async () => {
    const { keoDuAnTuMain } = await import("@/lib/du-an-main");
    traLoi = () => ({ ok: false, ma_loi: "KHONG_CO_DU_LIEU", thong_diep: "bài kiểm — không trả dự án" });
    await keoDuAnTuMain("bài kiểm khoá nội bộ");
    const main = goi.filter((g) => g.url.includes("/api/mcp/main"));
    expect(main).toHaveLength(1);
    expect(main[0]!.noiBo).toBe(BAM);
  });

  it("chưa khai khoá chung → không gửi đầu thư (lượt vẫn đi, không lỗi)", async () => {
    delete process.env.AUTH_SECRET_CHUNG;
    vi.resetModules();
    const { hoiTienDo } = await import("@/lib/nguon-tien-do");
    const kq = await hoiTienDo("tiendo.tom_tat_du_an", { ma_du_an: "HV" }, "bài kiểm khoá nội bộ");
    expect(kq.ok).toBe(true);
    expect(goi[0]!.noiBo).toBeNull();
  });

  it("bên nhận (coKhoaNoiBo) nhận đúng đầu thư bên gửi tạo — một công thức", async () => {
    vi.resetModules();
    const { hoiTienDo } = await import("@/lib/nguon-tien-do");
    const { coKhoaNoiBo } = await import("@/lib/mcp/khoa-chung");
    await hoiTienDo("tiendo.tom_tat_du_an", { ma_du_an: "HV" }, "bài kiểm khoá nội bộ");
    expect(coKhoaNoiBo({ headers: new Headers({ "x-sci-noi-bo": goi[0]!.noiBo ?? "" }) })).toBe(true);
    expect(coKhoaNoiBo({ headers: new Headers({ "x-sci-noi-bo": "sai" }) })).toBe(false);
  });
});
