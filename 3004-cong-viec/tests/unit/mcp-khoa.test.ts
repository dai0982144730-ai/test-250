// Cổng MCP sổ cái: xác thực khóa agent (đúng / sai / thu hồi / công cụ không được phép), lịch sử cấp–thu hồi,
// ghi lượt đọc GỘP. Chạy trên CSDL RAM thật; các hàm sổ cái được mock để không phụ thuộc module so-cai.
import { describe, it, expect, beforeAll, vi } from "vitest";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { query, tx, type Q } from "@/lib/db";

vi.mock("@/lib/so-cai/dich-vu", async (goc) => ({
  ...(await goc<typeof import("@/lib/so-cai/dich-vu")>()),
  danhSachSoCai: vi.fn(async () => []),
  viecDaXong: vi.fn(async () => []),
}));

import { bamKhoa, capKhoa, duocDungCongCu, ghiLuotDoc, khoaTuHeader, thuHoiKhoa, xacThucKhoa } from "@/lib/mcp/khoa-agent";
import { xuLyYeuCauMcp, xacThucRest } from "@/lib/mcp/cua-vao";

function hdr(khoa?: string) {
  const m = new Map<string, string>();
  if (khoa !== undefined) m.set("authorization", `Bearer ${khoa}`);
  return { get: (t: string) => m.get(t.toLowerCase()) ?? null };
}

let q: Q;
let khoaDu: { id: string; khoa: string };
let khoaHep: { id: string; khoa: string };

describe("khóa agent đọc sổ cái", () => {
  beforeAll(async () => {
    q = await csdlMoi();
    const qt = await nguoi("quantri@scigroup.vn");
    khoaDu = await tx((t) => capKhoa(t, qt, { ten: "Agent tiến độ", cong_cu: ["socai.*", "lichsu.*"] }));
    khoaHep = await tx((t) => capKhoa(t, qt, { ten: "Agent main", cong_cu: ["socai.chi_tiet_viec"] }));
  });

  it("khóa gốc không nằm trong CSDL, chỉ có sha256; lịch sử cấp khóa không lộ khóa", async () => {
    expect(khoaDu.khoa).toMatch(/^dfk_[A-Za-z0-9_-]{20,}$/);
    const { rows } = await query<{ khoa_hash: string }>("SELECT khoa_hash FROM docflow.khoa_agent WHERE id = $1", [khoaDu.id]);
    expect(rows[0]!.khoa_hash).toBe(bamKhoa(khoaDu.khoa));
    const ls = await query<{ hanh_dong: string; chi_tiet: unknown }>(
      "SELECT hanh_dong, chi_tiet FROM docflow.lich_su WHERE doi_tuong_loai = 'agent' AND doi_tuong_id = $1",
      [khoaDu.id],
    );
    expect(ls.rows.map((r) => r.hanh_dong)).toContain("cap_khoa_agent");
    expect(JSON.stringify(ls.rows)).not.toContain(khoaDu.khoa);
  });

  it("khóa đúng qua; khóa sai, thiếu khóa bị từ chối", async () => {
    expect((await xacThucKhoa(q, khoaDu.khoa)).ok).toBe(true);
    const sai = await xacThucKhoa(q, "dfk_sai_hoan_toan");
    expect(sai.ok).toBe(false);
    expect((await xacThucKhoa(q, "")).ok).toBe(false);
    expect(khoaTuHeader("Bearer abc ")).toBe("abc");
    expect(khoaTuHeader(null, "xyz")).toBe("xyz");

    const r401 = await xuLyYeuCauMcp(q, hdr("dfk_sai"), { cong_cu: "suc_khoe" });
    expect(r401.status).toBe(401);
    expect(r401.body).toMatchObject({ ok: false, ma_loi: "KHONG_CO_QUYEN" });
    const rpc401 = await xuLyYeuCauMcp(q, hdr(), { jsonrpc: "2.0", id: 7, method: "tools/list" });
    expect(rpc401.status).toBe(401);
    expect(rpc401.body).toMatchObject({ jsonrpc: "2.0", id: 7, error: { code: -32001 } });

    const ok = await xuLyYeuCauMcp(q, hdr(khoaDu.khoa), { cong_cu: "suc_khoe" });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ ok: true });
  });

  it("chỉ gọi được công cụ trong danh sách của khóa (hỗ trợ mẫu nhóm.*)", async () => {
    expect(duocDungCongCu(["socai.*"], "socai.danh_sach_viec")).toBe(true);
    expect(duocDungCongCu(["socai.*"], "lichsu.tra_cuu_viec")).toBe(false);
    expect(duocDungCongCu(["socai.chi_tiet_viec"], "tim_theo_ma")).toBe(true);
    expect(duocDungCongCu([], "nang_luc")).toBe(true);

    const bi = await xuLyYeuCauMcp(q, hdr(khoaHep.khoa), { cong_cu: "socai.danh_sach_viec", tham_so: {} });
    expect(bi.body).toMatchObject({ ok: false, ma_loi: "KHONG_CO_QUYEN" });
    const duoc = await xuLyYeuCauMcp(q, hdr(khoaDu.khoa), { cong_cu: "socai.danh_sach_viec", tham_so: {} });
    expect(duoc.body).toMatchObject({ ok: true, du_lieu: { tong: 0, viec: [] } });

    // tools/list chỉ bày công cụ khóa được gọi
    const ds = (await xuLyYeuCauMcp(q, hdr(khoaHep.khoa), { jsonrpc: "2.0", id: 1, method: "tools/list" })).body as {
      result: { tools: { name: string }[] };
    };
    const ten = ds.result.tools.map((t) => t.name);
    expect(ten).toContain("socai.chi_tiet_viec");
    expect(ten).not.toContain("socai.danh_sach_viec");

    const rest = await xacThucRest(q, hdr(khoaHep.khoa), "socai.danh_sach_viec");
    expect(rest).toMatchObject({ ok: false, status: 403 });
  });

  it("thu hồi khóa → bị từ chối ngay, lịch sử có thu_hoi_khoa_agent; thu hồi lần 2 báo lỗi", async () => {
    const qt = await nguoi("quantri@scigroup.vn");
    const k = await tx((t) => capKhoa(t, qt, { ten: "Agent báo cáo", cong_cu: ["socai.*"] }));
    expect((await xacThucKhoa(q, k.khoa)).ok).toBe(true);
    await tx((t) => thuHoiKhoa(t, qt, k.id, "thử"));
    const sau = await xacThucKhoa(q, k.khoa);
    expect(sau).toMatchObject({ ok: false });
    expect(sau.ok ? "" : sau.ly_do).toMatch(/thu hồi/);
    await expect(tx((t) => thuHoiKhoa(t, qt, k.id))).rejects.toThrow(/đã thu hồi/);
    const ls = await query("SELECT 1 FROM docflow.lich_su WHERE doi_tuong_id = $1 AND hanh_dong = 'thu_hoi_khoa_agent'", [k.id]);
    expect(ls.rows.length).toBe(1);
  });

  it("cấp khóa kiểm tra tên + công cụ", async () => {
    const qt = await nguoi("quantri@scigroup.vn");
    await expect(tx((t) => capKhoa(t, qt, { ten: "x", cong_cu: ["socai.*"] }))).rejects.toThrow(/Tên agent/);
    await expect(tx((t) => capKhoa(t, qt, { ten: "Agent lạ", cong_cu: ["xoa.tat_ca"] }))).rejects.toThrow(/Công cụ không có/);
    await expect(tx((t) => capKhoa(t, qt, { ten: "Agent rỗng", cong_cu: [] }))).rejects.toThrow(/ít nhất/);
  });

  it("lượt đọc được đếm, lịch sử agent_doc chỉ ghi lượt đầu mỗi ngày (gộp)", async () => {
    const k = { id: khoaDu.id, ten: "Agent tiến độ" };
    const a = await tx((t) => ghiLuotDoc(t, k, "socai.danh_sach_viec", "2026-09-20"));
    const b = await tx((t) => ghiLuotDoc(t, k, "socai.chi_tiet_viec", "2026-09-20"));
    const c = await tx((t) => ghiLuotDoc(t, k, "socai.chi_tiet_viec", "2026-09-20"));
    const d = await tx((t) => ghiLuotDoc(t, k, "socai.chi_tiet_viec", "2026-09-21"));
    expect([a.luot_dau_ngay, b.luot_dau_ngay, c.luot_dau_ngay, d.luot_dau_ngay]).toEqual([true, false, false, true]);
    const dem = await query<{ so_lan: number; cong_cu: Record<string, number> }>(
      "SELECT so_lan, cong_cu FROM docflow.khoa_agent_dung WHERE khoa_id = $1 AND ngay = '2026-09-20'",
      [k.id],
    );
    expect(dem.rows[0]!.so_lan).toBe(3);
    expect(dem.rows[0]!.cong_cu).toEqual({ "socai.danh_sach_viec": 1, "socai.chi_tiet_viec": 2 });
    const ls = await query<{ n: number }>(
      "SELECT count(*)::int n FROM docflow.lich_su WHERE hanh_dong = 'agent_doc' AND doi_tuong_id = $1 AND chi_tiet->>'ngay' IN ('2026-09-20','2026-09-21')",
      [k.id],
    );
    expect(ls.rows[0]!.n).toBe(2);
  });
});
