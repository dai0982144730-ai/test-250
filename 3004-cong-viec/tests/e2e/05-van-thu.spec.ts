// Sổ văn bản đến: văn thư vào sổ (giấy / email), chuyển đơn vị xử lý; đơn vị nhận xử lý; người khác chỉ xem.
import { test, expect, ND, MA_CHAY, viDuDoiTen, maTuUrl, type Page } from "./co-so";

test.describe.configure({ mode: "serial" });

const noiGui1 = `UBND huyện Hướng Hóa ${MA_CHAY}`;
const noiGui2 = `Công ty Điện lực Quảng Trị ${MA_CHAY}`;
let maTaiLieu1 = "";

const oNhap = (page: Page, nhan: string | RegExp) => page.locator("label").filter({ hasText: nhan }).locator("input, select, textarea").first();

async function vaoSo(page: Page, noiGui: string, trichYeu: string, tuy: { email?: boolean; chuyen?: string } = {}) {
  await oNhap(page, "Nơi gửi (cơ quan, đối tác)").fill(noiGui);
  await oNhap(page, "Số, ký hiệu").fill(`125/UBND-${MA_CHAY}`);
  await oNhap(page, "Trích yếu").fill(trichYeu);
  await oNhap(page, "Ngày văn bản").fill("02/08/2026"); // ô dd/mm/yyyy (E32) — giá trị gửi đi vẫn ISO 2026-08-02
  if (tuy.email) await page.getByRole("radio", { name: "Email" }).check();
  if (tuy.chuyen) await oNhap(page, "Chuyển đơn vị xử lý").selectOption({ label: tuy.chuyen });
  const [chon] = await Promise.all([page.waitForEvent("filechooser"), page.getByRole("button", { name: /Chọn file \(bản chụp giấy hoặc file email\)/ }).click()]);
  await chon.setFiles(viDuDoiTen("YKien_PhapLy_ThuVon.docx", `VanBanDen_${MA_CHAY}_${Date.now()}.docx`));
  await page.getByRole("button", { name: "Vào sổ", exact: true }).click();
}

test.describe("Sổ văn bản đến", () => {
  test("văn thư vào sổ văn bản giấy, rồi văn bản email có chuyển xử lý ngay", async ({ moTrang }) => {
    const page = await moTrang(ND.vanThu);
    await page.goto("/van-thu");
    await expect(page.getByRole("heading", { level: 1, name: "Sổ văn bản đến" })).toBeVisible();
    await expect(page.getByText("Vào sổ văn bản đến").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Vào sổ", exact: true })).toBeDisabled();

    await vaoSo(page, noiGui1, "V/v phương án bồi thường GPMB Trụ T11");
    await expect(page.getByText(/Đã vào sổ văn bản đến số \d+\/2026\./)).toBeVisible();
    const dong1 = page.locator("main tr").filter({ hasText: noiGui1 });
    await expect(dong1).toBeVisible();

    await vaoSo(page, noiGui2, "Lịch cắt điện đấu nối", { email: true, chuyen: "Phòng Kinh tế và Vận hành" });
    await expect(page.getByText(/Đã vào sổ văn bản đến số \d+\/2026 và chuyển đơn vị xử lý\./)).toBeVisible();
    await expect(page.locator("main tr").filter({ hasText: noiGui2 })).toContainText("Phòng Kinh tế và Vận hành");

    // Chuyển văn bản 1 cho P.ĐT&PC
    await dong1.locator("select").selectOption({ label: "Phòng Đầu tư và Pháp chế" });
    await dong1.getByRole("button", { name: "Chuyển xử lý" }).click();
    await expect(page.getByText(/Đã chuyển văn bản số \d+ cho Phòng Đầu tư và Pháp chế\./)).toBeVisible();
    maTaiLieu1 = maTuUrl(await dong1.getByRole("link").first().getAttribute("href"));

    // Tìm trong sổ
    await page.getByPlaceholder("Nơi gửi, số ký hiệu, trích yếu…").fill(MA_CHAY);
    await expect(page.locator("main tr").filter({ hasText: noiGui2 })).toBeVisible();
  });

  test("đơn vị nhận thấy văn bản từ bên ngoài, nhận rồi trả lại văn thư", async ({ moTrang }) => {
    const page = await moTrang(ND.truongDtpc);
    await page.goto(`/tai-lieu/${maTaiLieu1}`);
    const main = page.locator("main");
    await expect(main.getByText(new RegExp(`Sổ văn bản đến số \\d+/2026 · nơi gửi ${noiGui1}`))).toBeVisible({ timeout: 60_000 });
    await expect(main.getByText("Người gửi ngoài công ty").first()).toBeVisible();
    await expect(main.getByText(/văn thư Hoàng Thị Mai vào sổ văn bản đến thay nơi gửi/).first()).toBeVisible();
    await main.getByRole("button", { name: "Nhận", exact: true }).first().click();
    await expect(page.getByText(/Đã nhận\./)).toBeVisible();
  });

  test("nhân viên khác chỉ xem sổ, không có biểu mẫu vào sổ", async ({ moTrang }) => {
    const page = await moTrang(ND.hungTv);
    await page.goto("/van-thu");
    await expect(page.getByRole("heading", { level: 1, name: "Sổ văn bản đến" })).toBeVisible();
    await expect(page.locator("main tr").filter({ hasText: noiGui1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Vào sổ", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Chuyển xử lý" })).toHaveCount(0);
    // Yêu cầu đầy đủ (có file) để chắc bị chặn vì quyền chứ không vì thiếu dữ liệu
    const f = viDuDoiTen("YKien_PhapLy_ThuVon.docx", "x.docx");
    const r = await page.request.post("/api/van-thu", { multipart: { noi_gui: "x", trich_yeu: "y", hinh_thuc: "giay", tep: f } });
    expect(r.status()).toBe(403);
  });

  test("năm không có văn bản thì báo trống", async ({ moTrang }) => {
    const page = await moTrang(ND.vanThu);
    await page.goto("/van-thu");
    await page.getByLabel("Năm").fill("2020");
    await page.getByLabel("Năm").press("Enter");
    await expect(page.getByText("Chưa có văn bản đến nào trong năm 2020.")).toBeVisible();
  });
});
