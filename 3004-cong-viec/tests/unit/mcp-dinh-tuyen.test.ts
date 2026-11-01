// Định tuyến công cụ cổng socai.* — hàm sổ cái được MOCK (vi.mock) để test độc lập module so-cai.
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { csdlMoi } from "../helpers/csdl";
import { tx, type Q } from "@/lib/db";
import type { DongSoCai } from "@/lib/so-cai/dich-vu";
import type { DongSoCaiAgent } from "@/lib/so-cai/dinh-dang-agent";

vi.mock("@/lib/so-cai/dich-vu", async (goc) => ({
  ...(await goc<typeof import("@/lib/so-cai/dich-vu")>()),
  danhSachSoCai: vi.fn(),
  viecDaXong: vi.fn(),
  chiTietViec: vi.fn(),
}));
vi.mock("@/lib/so-cai/dinh-dang-agent", async (goc) => ({
  ...(await goc<typeof import("@/lib/so-cai/dinh-dang-agent")>()),
  dongChoAgent: vi.fn(),
}));

import { danhSachSoCai, viecDaXong } from "@/lib/so-cai/dich-vu";
import { dongChoAgent } from "@/lib/so-cai/dinh-dang-agent";
import { chayCongCu, DANH_MUC_CONG_CU } from "@/lib/mcp/cong-socai";
import { xuLyYeuCauMcp } from "@/lib/mcp/cua-vao";
import { capKhoa } from "@/lib/mcp/khoa-agent";
import { nguoi } from "../helpers/csdl";

const mDanhSach = vi.mocked(danhSachSoCai);
const mDaXong = vi.mocked(viecDaXong);
const mDong = vi.mocked(dongChoAgent);

function viec(id: string, canh_bao: DongSoCai["canh_bao"] = null): DongSoCai {
  return { id, canh_bao } as unknown as DongSoCai;
}

function dong(id: string): DongSoCaiAgent {
  return {
    ma_viec: id,
    ten_viec: `Việc ${id}`,
    du_an: "ĐG Hướng Việt",
    nguon_hien_hanh: { bao_cao: "Form 7 · tuần 29", don_vi: "BQLDA Quảng Trị", cap: 3 },
    da_de: [],
    luon_mo: false,
    bat_dau: "2026-07-28",
    ket_thuc: "2026-08-05",
    phan_viec: [{ phu_trach: "BQLDA Quảng Trị", vai: "chủ trì", noi_dung: "Thỏa thuận 3 hộ", trang_thai: "dang_lam", ket_thuc: null }],
    tien_do: "0/1",
    canh_bao: null,
    trang_thai: "dang_mo",
    qua_trinh: [],
  };
}

let q: Q;

describe("cổng MCP socai — định tuyến công cụ", () => {
  beforeAll(async () => {
    q = await csdlMoi();
  });
  beforeEach(() => {
    mDanhSach.mockReset();
    mDaXong.mockReset();
    mDong.mockReset();
    mDong.mockImplementation(async (_q, id) => dong(id));
  });

  it("nang_luc / suc_khoe luôn có nguồn, danh mục đủ 4 công cụ nghiệp vụ", async () => {
    const nl = await chayCongCu(q, "nang_luc", {});
    expect(nl.ok).toBe(true);
    const ten = DANH_MUC_CONG_CU.map((c) => c.ten);
    for (const t of ["socai.danh_sach_viec", "socai.chi_tiet_viec", "socai.viec_cua_don_vi", "lichsu.tra_cuu_viec"]) expect(ten).toContain(t);
    expect((await chayCongCu(q, "suc_khoe", {})).ok).toBe(true);
  });

  it("socai.danh_sach_viec: tên đơn vị gõ tự do → mã đơn vị, trả DongSoCaiAgent, đếm cảnh báo", async () => {
    mDanhSach.mockResolvedValue([viec("CV-2026-0001", "qua_han"), viec("CV-2026-0002", "sap_den_han"), viec("CV-2026-0003")]);
    const kq = await chayCongCu(q, "socai.danh_sach_viec", { don_vi: "SCI E&C", luon_mo: false, canh_bao: "qua_han", du_an: "Nậm Mô" });
    expect(mDanhSach).toHaveBeenCalledWith(q, { don_vi_id: "sci-enc", luon_mo: false, canh_bao: "qua_han", du_an: "Nậm Mô" });
    expect(kq.ok).toBe(true);
    if (!kq.ok) return;
    const d = kq.du_lieu as { tong: number; qua_han: number; sap_den_han: number; viec: DongSoCaiAgent[] };
    expect(d).toMatchObject({ tong: 3, qua_han: 1, sap_den_han: 1 });
    expect(d.viec.map((v) => v.ma_viec)).toEqual(["CV-2026-0001", "CV-2026-0002", "CV-2026-0003"]);
    expect(Object.keys(d.viec[0]!).sort()).toEqual(
      ["bat_dau", "canh_bao", "da_de", "du_an", "ket_thuc", "luon_mo", "ma_viec", "nguon_hien_hanh", "phan_viec", "qua_trinh", "ten_viec", "tien_do", "trang_thai"].sort(),
    );
    // Danh sách không kèm quá trình (gọn), chi tiết mới kèm
    expect(mDong).toHaveBeenCalledWith(q, "CV-2026-0001", false);
    expect(kq.nguon[0]).toMatchObject({ loai: "so-cai" });
  });

  it("đơn vị lạ / cảnh báo sai → KHONG_HIEU_YEU_CAU kèm gợi ý mã", async () => {
    const la = await chayCongCu(q, "socai.danh_sach_viec", { don_vi: "Phòng Không Tồn Tại" });
    expect(la).toMatchObject({ ok: false, ma_loi: "KHONG_HIEU_YEU_CAU" });
    expect(la.ok ? "" : la.thong_diep).toContain("p-dtpc");
    expect(await chayCongCu(q, "socai.danh_sach_viec", { canh_bao: "tre" })).toMatchObject({ ok: false, ma_loi: "KHONG_HIEU_YEU_CAU" });
    expect(mDanhSach).not.toHaveBeenCalled();
  });

  it("socai.viec_cua_don_vi bắt buộc đơn vị hoặc người; nhận email người", async () => {
    expect(await chayCongCu(q, "socai.viec_cua_don_vi", {})).toMatchObject({ ok: false, ma_loi: "KHONG_HIEU_YEU_CAU" });
    mDanhSach.mockResolvedValue([]);
    const kq = await chayCongCu(q, "socai.viec_cua_don_vi", { nguoi: "hung.tv@scigroup.vn" });
    expect(kq.ok).toBe(true);
    expect(mDanhSach).toHaveBeenCalledWith(q, { nguoi: "hung.tv@scigroup.vn" });
  });

  it("socai.chi_tiet_viec / tim_theo_ma: có quá trình; không có → KHONG_CO_DU_LIEU", async () => {
    const kq = await chayCongCu(q, "socai.chi_tiet_viec", { ma_viec: "cv-2026-0412" });
    expect(mDong).toHaveBeenCalledWith(q, "CV-2026-0412", true);
    expect(kq).toMatchObject({ ok: true, du_lieu: { ma_viec: "CV-2026-0412" } });
    mDong.mockResolvedValueOnce(null);
    expect(await chayCongCu(q, "tim_theo_ma", { ma: "CV-2026-9999" })).toMatchObject({ ok: false, ma_loi: "KHONG_CO_DU_LIEU" });
    expect(await chayCongCu(q, "socai.chi_tiet_viec", {})).toMatchObject({ ok: false, ma_loi: "KHONG_HIEU_YEU_CAU" });
  });

  it("lichsu.tra_cuu_viec: lọc ngày, ngày sai dạng bị chặn", async () => {
    mDaXong.mockResolvedValue([viec("CV-2026-0401")]);
    const kq = await chayCongCu(q, "lichsu.tra_cuu_viec", { tu: "2026-07-01", den: "2026-07-31", don_vi: "p-hcth" });
    expect(mDaXong).toHaveBeenCalledWith(q, { don_vi_id: "p-hcth", tu: "2026-07-01", den: "2026-07-31" });
    expect(kq).toMatchObject({ ok: true, du_lieu: { tong: 1 } });
    expect(await chayCongCu(q, "lichsu.tra_cuu_viec", { tu: "01/07/2026" })).toMatchObject({ ok: false, ma_loi: "KHONG_HIEU_YEU_CAU" });
  });

  it("module sổ cái chưa xong (ném 'Chưa làm') → AGENT_KHONG_SAN_SANG, lỗi lạ → LOI_NOI_BO, không ném ra ngoài", async () => {
    mDanhSach.mockRejectedValueOnce(new Error("Chưa làm"));
    expect(await chayCongCu(q, "socai.danh_sach_viec", {})).toMatchObject({ ok: false, ma_loi: "AGENT_KHONG_SAN_SANG" });
    mDanhSach.mockRejectedValueOnce(new Error("hỏng ổ đĩa"));
    expect(await chayCongCu(q, "socai.danh_sach_viec", {})).toMatchObject({ ok: false, ma_loi: "LOI_NOI_BO" });
    expect(await chayCongCu(q, "socai.xoa_viec", {})).toMatchObject({ ok: false, ma_loi: "KHONG_HIEU_YEU_CAU" });
  });

  it("trần 100 bản ghi, vượt trần có cảnh báo", async () => {
    mDanhSach.mockResolvedValue(Array.from({ length: 130 }, (_, i) => viec(`CV-2026-${String(i).padStart(4, "0")}`)));
    const kq = await chayCongCu(q, "socai.danh_sach_viec", {});
    expect(kq.ok).toBe(true);
    if (!kq.ok) return;
    expect((kq.du_lieu as { viec: unknown[]; tong: number }).viec.length).toBe(100);
    expect((kq.du_lieu as { tong: number }).tong).toBe(130);
    expect(kq.nguon.length).toBeLessThanOrEqual(100);
    expect(kq.canh_bao.join(" ")).toMatch(/130/);
  });

  it("JSON-RPC: initialize, tools/call trả structuredContent đúng khuôn, phương thức lạ -32601", async () => {
    const qt = await nguoi("quantri@scigroup.vn");
    const k = await tx((t) => capKhoa(t, qt, { ten: "Agent tiến độ", cong_cu: ["socai.*", "lichsu.*"] }));
    const h = { get: (t: string) => (t === "authorization" ? `Bearer ${k.khoa}` : null) };
    const init = await xuLyYeuCauMcp(q, h, { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26" } });
    expect(init.body).toMatchObject({ result: { serverInfo: { name: "docflow-socai" }, capabilities: { tools: {} } } });
    mDanhSach.mockResolvedValue([viec("CV-2026-0412", "sap_den_han")]);
    const goi = (await xuLyYeuCauMcp(q, h, {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "socai.danh_sach_viec", arguments: { don_vi: "bqlda-qt" } },
    })).body as { result: { isError: boolean; structuredContent: { ok: boolean }; content: { text: string }[] } };
    expect(goi.result.isError).toBe(false);
    expect(goi.result.structuredContent.ok).toBe(true);
    expect(JSON.parse(goi.result.content[0]!.text)).toEqual(goi.result.structuredContent);
    const la = await xuLyYeuCauMcp(q, h, { jsonrpc: "2.0", id: 3, method: "resources/list" });
    expect(la.body).toMatchObject({ error: { code: -32601 } });
    const tb = await xuLyYeuCauMcp(q, h, { jsonrpc: "2.0", method: "notifications/initialized" });
    expect(tb.status).toBe(202);
  });
});
