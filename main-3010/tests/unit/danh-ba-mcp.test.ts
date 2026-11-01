// ============================================================
// TEST CÔNG CỤ `main.danh_ba` — cửa giao danh bạ cho 4 con kia
//
// Đây là công cụ làm nên câu "khai một lần được tất cả agent". Trước ngày
// 06/09/2026 mỗi app giữ một bản `data/cai-dat-base.json` riêng: tắt một con
// ở Base mà quên tắt ở Main thì con quan sát thôi soi nó nhưng Main vẫn hỏi
// nó — hai bản lệch nhau mà không ai báo.
//
// Bốn điều đáng test, xếp theo mức thiệt hại nếu hỏng:
//   1. KHÔNG giao `thuMucCode`. Đó là đường dẫn ổ đĩa của máy chạy Main; giao
//      sang máy khác là sai, và tệ hơn là lộ cấu trúc thư mục máy chủ.
//   2. Danh bạ rỗng phải BÁO RÕ chứ không trả mảng rỗng — mảng rỗng làm bên
//      kia tưởng "hệ không có agent nào" rồi im lặng không hỏi ai.
//   3. `chi_dang_bat` lọc đúng, nhưng SỐ ĐẾM vẫn là số thật của cả danh bạ.
//   4. Trả về luôn kèm `nguon` không rỗng — luật HOP-DONG-KET-NOI §5.
// ============================================================

import { describe, expect, it, vi, beforeEach } from "vitest";
import type { KhaiAgent } from "@/lib/danh-ba-agent";

const danhBa = vi.hoisted(() => ({ ds: [] as KhaiAgent[] }));

vi.mock("@/lib/cai-dat-base", () => ({
  docDanhBaAgent: () => danhBa.ds,
}));

import { chayCongCu } from "@/lib/cau-hinh-chung/cong-mcp";
import type { KhuonTra } from "@/lib/mcp/khuon";

/**
 * Thu hẹp kiểu: `KhuonTra` là hợp của thành công / thất bại, nên `du_lieu`
 * chỉ tồn tại ở nhánh thành công. Hàm này vừa thu hẹp vừa làm luôn khẳng định
 * "phải ok" — hỏng thì test đứt ngay tại chỗ gọi, dễ đọc lỗi.
 */
function duLieu(r: KhuonTra): Record<string, unknown> {
  if (!r.ok) throw new Error(`Mong công cụ trả ok nhưng nó hỏng: ${JSON.stringify(r)}`);
  return r.du_lieu as Record<string, unknown>;
}

const NGU_CANH = {
  agentGoi: "base",
  lyDoGoi: "kiểm thử",
} as unknown as Parameters<typeof chayCongCu>[2];

function khai(p: Partial<KhaiAgent>): KhaiAgent {
  const ma = p.ma ?? "x";
  return {
    ma,
    ten: "Agent X",
    diaChi: "http://localhost:3999",
    // Suy theo mã cho giống thực tế — mọi agent đều mở cổng ở `/api/mcp/<mã>`.
    duongDanMcp: `/api/mcp/${ma}`,
    dangBat: true,
    ...p,
  };
}

const BA_CON: KhaiAgent[] = [
  khai({ ma: "base", ten: "Agent Base.vn", diaChi: "http://localhost:3011", thuMucCode: "D:/SCI-AI-AGENT/1-agent-base" }),
  khai({ ma: "tiendo", ten: "Agent Tiến độ", diaChi: "http://localhost:3003", thuMucCode: "D:/rieng/tu/cua/may-main" }),
  khai({ ma: "phaply", ten: "Agent Pháp lý", diaChi: "http://localhost:3013", dangBat: false, ghiChu: "đang bảo trì" }),
];

beforeEach(() => {
  danhBa.ds = BA_CON;
});

describe("main.danh_ba — giao đủ nhưng KHÔNG giao thừa", () => {
  it("giao đủ mã · tên · địa chỉ · đường dẫn MCP · bật/tắt", async () => {
    const r = await chayCongCu("main.danh_ba", {}, NGU_CANH);
    expect(r.ok).toBe(true);
    const ds = (duLieu(r) as { danh_ba: Record<string, unknown>[] }).danh_ba;
    expect(ds).toHaveLength(3);
    expect(ds[0]).toMatchObject({
      ma: "base",
      ten: "Agent Base.vn",
      dia_chi: "http://localhost:3011",
      duong_dan_mcp: "/api/mcp/base",
      dang_bat: true,
    });
  });

  it("TUYỆT ĐỐI không giao thuMucCode — đường dẫn ổ đĩa của máy Main", async () => {
    const r = await chayCongCu("main.danh_ba", {}, NGU_CANH);
    const tho = JSON.stringify(duLieu(r));
    expect(tho).not.toContain("thuMucCode");
    expect(tho).not.toContain("thu_muc_code");
    // Kiểm cả giá trị, phòng trường hợp đổi tên trường mà quên lọc.
    expect(tho).not.toContain("D:/rieng/tu/cua/may-main");
  });

  it("giữ ghi chú của người khai", async () => {
    const r = await chayCongCu("main.danh_ba", {}, NGU_CANH);
    const ds = (duLieu(r) as { danh_ba: { ma: string; ghi_chu?: string }[] }).danh_ba;
    expect(ds.find((x) => x.ma === "phaply")?.ghi_chu).toBe("đang bảo trì");
  });
});

describe("main.danh_ba — đếm thật, không làm tròn cho đẹp", () => {
  it("chi_dang_bat lọc danh sách nhưng SỐ ĐẾM vẫn của cả danh bạ", async () => {
    const r = await chayCongCu("main.danh_ba", { chi_dang_bat: true }, NGU_CANH);
    const d = duLieu(r) as unknown as { danh_ba: unknown[]; so_khai: number; so_dang_bat: number };
    expect(d.danh_ba).toHaveLength(2); // phaply đang tắt
    expect(d.so_khai).toBe(3); // vẫn nói thật là khai 3
    expect(d.so_dang_bat).toBe(2);
  });

  it("khai đủ nhưng KHÔNG con nào bật thì cảnh báo, không im lặng", async () => {
    danhBa.ds = [khai({ ma: "base", dangBat: false })];
    const r = await chayCongCu("main.danh_ba", { chi_dang_bat: true }, NGU_CANH);
    expect(r.ok).toBe(true);
    expect(((r.ok ? r.canh_bao : []) ?? []).join(" ")).toContain("không con nào đang bật");
  });
});

describe("main.danh_ba — danh bạ rỗng là LỖI CÓ LÝ DO, không phải mảng rỗng", () => {
  it("chưa khai con nào thì báo hỏng và chỉ đúng chỗ phải vào sửa", async () => {
    danhBa.ds = [];
    const r = await chayCongCu("main.danh_ba", {}, NGU_CANH);
    expect(r.ok).toBe(false);
    // Bên kia nhận mảng rỗng sẽ tưởng "hệ không có agent nào" rồi im lặng.
    expect(JSON.stringify(r)).toContain("Danh bạ agent");
  });
});

describe("main.danh_ba — luật chung của mọi công cụ MCP", () => {
  it("trả về luôn kèm nguồn KHÔNG rỗng", async () => {
    const r = await chayCongCu("main.danh_ba", {}, NGU_CANH);
    if (!r.ok) throw new Error("Mong ok");
    expect(r.nguon).toBeDefined();
    expect(r.nguon.length).toBeGreaterThan(0);
    expect(r.nguon[0].file_goc).toBe("data/cai-dat-base.json");
    // Vị trí phải nói được số thật, để truy ngược khi số trên màn khác đi.
    expect(r.nguon[0].vi_tri).toContain("3");
  });

  it("có mặt trong danh mục nang_luc để agent khác biết mà gọi", async () => {
    const r = await chayCongCu("nang_luc", {}, NGU_CANH);
    const ds = (duLieu(r) as unknown as { cong_cu: { ten: string; san_sang: boolean }[] }).cong_cu;
    const c = ds.find((x) => x.ten === "main.danh_ba");
    expect(c).toBeDefined();
    expect(c?.san_sang).toBe(true);
  });
});
