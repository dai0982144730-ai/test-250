// Khóa cho agent: cấp khóa trên giao diện rồi gọi cổng MCP /api/mcp/socai và REST /api/v1/so-cai bằng khóa đó
// (không cookie), khóa giới hạn công cụ, thu hồi là chặn ngay.
import { request as taoRequest, type APIRequestContext } from "@playwright/test";
import { test, expect, ND, MA_CHAY, dangNhapApi, type Page } from "./co-so";

test.describe.configure({ mode: "serial" });

let khoaDayDu = "";
let khoaLichSu = "";
let api: APIRequestContext;

test.beforeAll(async ({}, info) => {
  api = await taoRequest.newContext({ baseURL: info.project.use.baseURL });
});
test.afterAll(async () => {
  await api?.dispose();
});

const bearer = (k: string) => ({ Authorization: `Bearer ${k}` });
const rpc = (method: string, params?: unknown, id: number | null = 1) => ({ jsonrpc: "2.0", ...(id === null ? {} : { id }), method, ...(params ? { params } : {}) });

async function capKhoa(page: Page, ten: string, chiLichSu = false) {
  await page.goto("/quan-tri/khoa-agent");
  await expect(page.getByRole("heading", { level: 1, name: "Khóa cho agent" })).toBeVisible();
  const nut = page.getByRole("button", { name: "Cấp khóa" });
  await expect(nut).toBeDisabled();
  await page.getByPlaceholder("vd Agent tiến độ").fill(ten);
  if (chiLichSu) {
    await page.locator("label").filter({ has: page.locator("code", { hasText: /^socai\.\*$/ }) }).locator("input").uncheck();
  }
  await nut.click();
  await expect(page.getByText(`Khóa mới cho «${ten}» — CHÉP NGAY, khóa này chỉ hiện một lần`)).toBeVisible();
  const khoa = (await page.locator("code").filter({ hasText: /^dfk_/ }).first().innerText()).trim();
  expect(khoa).toMatch(/^dfk_[A-Za-z0-9_-]{20,}$/);
  await page.getByRole("button", { name: "Đã chép, ẩn khóa" }).click();
  return khoa;
}

test.describe("Khóa cho agent và cổng đọc sổ cái", () => {
  test("cấp khóa đầy đủ trên giao diện", async ({ page, context }) => {
    await dangNhapApi(context, ND.quanTri);
    khoaDayDu = await capKhoa(page, `Agent e2e ${MA_CHAY}`);
    await expect(page.locator("main tr").filter({ hasText: `Agent e2e ${MA_CHAY}` })).toBeVisible();
  });

  test("MCP JSON-RPC: initialize, tools/list, tools/call, ping, notifications, lỗi phương thức", async () => {
    const init = await api.post("/api/mcp/socai", { headers: bearer(khoaDayDu), data: rpc("initialize", {}) });
    expect(init.status()).toBe(200);
    const j = await init.json();
    expect(j.result.serverInfo).toMatchObject({ name: "docflow-socai" });

    const ds = await (await api.post("/api/mcp/socai", { headers: bearer(khoaDayDu), data: rpc("tools/list") })).json();
    const ten = ds.result.tools.map((t: { name: string }) => t.name);
    for (const t of ["nang_luc", "suc_khoe", "socai.danh_sach_viec", "socai.chi_tiet_viec", "socai.viec_cua_don_vi", "lichsu.tra_cuu_viec"]) {
      expect(ten).toContain(t);
    }

    const sk = await (await api.post("/api/mcp/socai", { headers: bearer(khoaDayDu), data: rpc("tools/call", { name: "suc_khoe", arguments: {} }) })).json();
    expect(sk.result.isError).toBe(false);

    const ping = await (await api.post("/api/mcp/socai", { headers: bearer(khoaDayDu), data: rpc("ping") })).json();
    expect(ping.result).toEqual({});

    const tb = await api.post("/api/mcp/socai", { headers: bearer(khoaDayDu), data: rpc("notifications/initialized", undefined, null) });
    expect(tb.status()).toBe(202);

    const la = await (await api.post("/api/mcp/socai", { headers: bearer(khoaDayDu), data: rpc("khong-co") })).json();
    expect(la.error.code).toBe(-32601);
  });

  test("gọi kiểu SCI: danh sách việc có dữ liệu thật từ luồng nghiệp vụ; tham số sai bị báo", async () => {
    const r = await api.post("/api/mcp/socai", { headers: bearer(khoaDayDu), data: { cong_cu: "socai.danh_sach_viec", tham_so: { gioi_han: 50 } } });
    expect(r.status()).toBe(200);
    const j = await r.json();
    expect(j.ok).toBe(true);
    expect(typeof j.du_lieu.tong).toBe("number");
    expect(Array.isArray(j.du_lieu.viec)).toBe(true);
    expect(j.nguon.length).toBeGreaterThan(0);

    const sai = await (await api.post("/api/mcp/socai", { headers: bearer(khoaDayDu), data: { cong_cu: "socai.danh_sach_viec", tham_so: { canh_bao: "x" } } })).json();
    expect(sai).toMatchObject({ ok: false, ma_loi: "KHONG_HIEU_YEU_CAU" });

    const khong = await (await api.post("/api/mcp/socai", { headers: bearer(khoaDayDu), data: { cong_cu: "khong.co" } })).json();
    expect(khong.ok).toBe(false);
  });

  test("REST /api/v1/so-cai: đọc được, tham số sai 400, mã việc không có 404, x-api-key cũng dùng được", async () => {
    const ok = await api.get("/api/v1/so-cai?gioi_han=3", { headers: bearer(khoaDayDu) });
    expect(ok.status()).toBe(200);
    expect((await ok.json()).ok).toBe(true);
    expect((await api.get("/api/v1/so-cai?don_vi=khong-co", { headers: bearer(khoaDayDu) })).status()).toBe(400);
    const khong = await api.get("/api/v1/so-cai/CV-2000-9999", { headers: bearer(khoaDayDu) });
    expect(khong.status()).toBe(404);
    expect((await khong.json()).ma_loi).toBe("KHONG_CO_DU_LIEU");
    expect((await api.get("/api/v1/so-cai?gioi_han=1", { headers: { "x-api-key": khoaDayDu } })).status()).toBe(200);
  });

  test("không có khóa / khóa sai → 401", async () => {
    const khong = await api.get("/api/v1/so-cai");
    expect(khong.status()).toBe(401);
    const sai = await api.get("/api/v1/so-cai", { headers: bearer("dfk_sai") });
    expect(sai.status()).toBe(401);
    expect((await sai.json()).loi).toBe("Khóa agent không đúng.");
    const mcp = await api.post("/api/mcp/socai", { data: { cong_cu: "suc_khoe" } });
    expect(mcp.status()).toBe(401);
    expect((await mcp.json()).ma_loi).toBe("KHONG_CO_QUYEN");
  });

  test("khóa chỉ được đọc lịch sử thì không đọc được sổ cái", async ({ page, context }) => {
    await dangNhapApi(context, ND.quanTri);
    khoaLichSu = await capKhoa(page, `Agent lichsu ${MA_CHAY}`, true);
    const ds = await (await api.post("/api/mcp/socai", { headers: bearer(khoaLichSu), data: rpc("tools/list") })).json();
    const ten = ds.result.tools.map((t: { name: string }) => t.name);
    expect(ten).toContain("lichsu.tra_cuu_viec");
    expect(ten).not.toContain("socai.danh_sach_viec");
    const r = await api.get("/api/v1/so-cai", { headers: bearer(khoaLichSu) });
    expect(r.status()).toBe(403);
    expect((await r.json()).loi).toBe(`Khóa "Agent lichsu ${MA_CHAY}" không được gọi socai.danh_sach_viec.`);
  });

  test("lượt đọc hiện trên trang; thu hồi khóa là bị chặn ngay", async ({ page, context }) => {
    await dangNhapApi(context, ND.quanTri);
    await page.goto("/quan-tri/khoa-agent");
    const dong = page.locator("main tr").filter({ hasText: `Agent e2e ${MA_CHAY}` });
    await expect(dong).toContainText(/\d+ lượt/);
    await dong.getByRole("button", { name: "Thu hồi" }).click();
    await dong.getByRole("button", { name: "Thu hồi thật" }).click();
    await expect(page.getByText("Đã thu hồi khóa — agent dùng khóa này sẽ bị từ chối ngay.")).toBeVisible();
    await expect(dong).toContainText("đã thu hồi");
    const r = await api.get("/api/v1/so-cai", { headers: bearer(khoaDayDu) });
    expect(r.status()).toBe(401);
    expect((await r.json()).loi).toBe("Khóa agent này đã bị thu hồi.");
  });
});
