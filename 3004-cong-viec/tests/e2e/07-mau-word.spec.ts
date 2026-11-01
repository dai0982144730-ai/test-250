// Mẫu Word: danh sách 9 mẫu, tải mẫu trắng / có ví dụ, sửa định nghĩa có phiên bản, kiểm lỗi,
// tải phiên bản file mẫu mới, thêm mẫu mới, người không có quyền chỉ xem.
import path from "node:path";
import { test, expect, ND, MA_CHAY, GOC, dangNhapApi, type Page } from "./co-so";

test.describe.configure({ mode: "serial" });

const dongMau = (page: Page, ma: string) => page.locator("main tr").filter({ has: page.getByText(ma, { exact: true }) });
const trangThai = (page: Page) => page.locator('[role="status"], [role="alert"]');

test.describe("Mẫu Word", () => {
  test("danh sách 9 mẫu và tải mẫu về", async ({ page, context }) => {
    await dangNhapApi(context, ND.hungTv);
    await page.goto("/mau-word");
    await expect(page.getByRole("heading", { level: 1, name: "Mẫu Word" })).toBeVisible();
    for (let i = 0; i <= 8; i++) await expect(dongMau(page, `form-${i}`)).toBeVisible();
    await expect(dongMau(page, "form-7")).toContainText("Báo cáo BQLDA Quảng Trị (Form 7)");
    await expect(dongMau(page, "form-6")).toContainText("Tháng");

    const [trang] = await Promise.all([page.waitForEvent("download"), dongMau(page, "form-7").getByRole("link", { name: "Tải mẫu", exact: true }).click()]);
    expect(trang.suggestedFilename()).toBe("form-7.docx");
    const [viDu] = await Promise.all([page.waitForEvent("download"), dongMau(page, "form-7").getByRole("link", { name: "Tải mẫu có ví dụ" }).click()]);
    expect(viDu.suggestedFilename()).toBe("form-7-co-vi-du.docx");
  });

  test("người không có quyền: nút Xem, ô bị khóa, không có Thêm mẫu mới", async ({ page, context }) => {
    await dangNhapApi(context, ND.hungTv);
    await page.goto("/mau-word");
    await expect(page.getByRole("button", { name: "Thêm mẫu mới" })).toHaveCount(0);
    await dongMau(page, "form-7").getByRole("button", { name: "Xem" }).click();
    await expect(page.getByText("Chỉ người có quyền Quản lý mẫu Word mới sửa được. Bạn vẫn xem và tải mẫu.")).toBeVisible();
    await expect(page.getByLabel("Tên mẫu")).toBeDisabled();
    await expect(page.getByRole("heading", { name: "Lịch sử mẫu" })).toHaveCount(0);
  });

  test("quản trị sửa định nghĩa: có phiên bản, ghi lịch sử, đổi lại được", async ({ page, context }) => {
    await dangNhapApi(context, ND.quanTri);
    await page.goto("/mau-word");
    await dongMau(page, "form-7").getByRole("button", { name: "Sửa" }).click();
    await expect(page.getByRole("heading", { name: "Báo cáo BQLDA Quảng Trị (Form 7) · form-7" })).toBeVisible();
    await page.getByLabel("Loại kỳ").selectOption({ label: "Tháng" });
    await page.getByRole("button", { name: "Lưu định nghĩa" }).click();
    await expect(trangThai(page).filter({ hasText: /Đã lưu mẫu Báo cáo BQLDA Quảng Trị \(Form 7\) \(phiên bản \d+\)/ })).toBeVisible();
    await expect(dongMau(page, "form-7")).toContainText("Tháng");
    await expect(page.getByRole("heading", { name: "Lịch sử mẫu" })).toBeVisible();
    await expect(page.getByText(/— Đổi cài đặt/).first()).toBeVisible();

    await page.getByLabel("Loại kỳ").selectOption({ label: "Tuần" });
    await page.getByRole("button", { name: "Lưu định nghĩa" }).click();
    await expect(dongMau(page, "form-7")).toContainText("Tuần");
  });

  test("kiểm lỗi định nghĩa: ô nhập thiếu tag, bảng sai tiền tố", async ({ page, context }) => {
    await dangNhapApi(context, ND.quanTri);
    await page.goto("/mau-word");
    await dongMau(page, "form-3").getByRole("button", { name: "Sửa" }).click();
    await page.getByRole("button", { name: "Thêm ô" }).click();
    await page.getByRole("button", { name: "Lưu định nghĩa" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /chỉ gồm chữ không dấu, số, gạch dưới/ })).toBeVisible();
    await page.getByRole("button", { name: "Xóa ô" }).last().click();
    await page.getByRole("button", { name: "Thêm bảng" }).click();
    await page.getByRole("button", { name: "Lưu định nghĩa" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /tag phải bắt đầu "bang_"/ })).toBeVisible();
  });

  test("tải phiên bản file mẫu mới; file không phải .docx bị từ chối", async ({ page, context }) => {
    await dangNhapApi(context, ND.quanTri);
    await page.goto("/mau-word");
    await dongMau(page, "form-7").getByRole("button", { name: "Sửa" }).click();
    const input = page.locator('main input[type=file][accept=".docx"]').first();
    await input.setInputFiles(path.join(GOC, "mau-word", "trang", "form-7.docx"));
    await expect(trangThai(page).filter({ hasText: /Đã tải lên file mẫu mới cho .* \(phiên bản \d+\)\. Bản cũ vẫn giữ trong lịch sử\./ })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("heading", { name: "Các phiên bản file mẫu" })).toBeVisible();

    // Trình sửa dựng lại sau khi tải file (khóa theo phiên bản) — chờ ô file có lại, không bấm "Sửa" (bấm là đóng)
    await expect(page.locator('main input[type=file][accept=".docx"]')).toHaveCount(2);
    await page.locator('main input[type=file][accept=".docx"]').first().setInputFiles({ name: "x.txt", mimeType: "text/plain", buffer: Buffer.from("khong phai word") });
    await expect(page.getByRole("alert").filter({ hasText: "File mẫu phải là Word .docx" })).toBeVisible();
  });

  test("thêm mẫu mới, đọc ô từ file Word, không trùng mã, ngừng dùng", async ({ page, context }) => {
    await dangNhapApi(context, ND.quanTri);
    await page.goto("/mau-word");
    const maMau = `e2e-${MA_CHAY}`;
    await page.getByRole("button", { name: "Thêm mẫu mới" }).click();
    await page.getByLabel("Mã mẫu").fill(maMau);
    await page.getByLabel("Tên", { exact: true }).fill(`Mẫu thử E2E ${MA_CHAY}`);
    await page.getByRole("button", { name: "Thêm", exact: true }).click();
    await expect(trangThai(page).filter({ hasText: `Đã thêm mẫu Mẫu thử E2E ${MA_CHAY}` })).toBeVisible();
    await expect(dongMau(page, maMau)).toContainText("chưa có file");
    await expect(page.getByText("Chưa có file.")).toBeVisible();

    // Đọc ô từ file Word: số dòng ô nhập tăng
    const bangO = page.locator("table").filter({ has: page.getByRole("columnheader", { name: "Tag" }) }).first();
    const truoc = await bangO.locator("tbody tr").count();
    await page.locator('main input[type=file][accept=".docx"]').nth(1).setInputFiles(path.join(GOC, "mau-word", "trang", "form-7.docx"));
    await expect.poll(() => bangO.locator("tbody tr").count(), { timeout: 30_000 }).toBeGreaterThan(truoc);

    // Trùng mã
    await page.getByRole("button", { name: "Thêm mẫu mới" }).click();
    await page.getByLabel("Mã mẫu").fill(maMau);
    await page.getByLabel("Tên", { exact: true }).fill("Trùng");
    await page.getByRole("button", { name: "Thêm", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: `Đã có mẫu "${maMau}"` })).toBeVisible();
    await page.getByRole("button", { name: "Thôi" }).click();

    // Ngừng dùng (mẫu không xóa được)
    // Nút "Sửa" bật/tắt trình sửa: chỉ bấm khi trình sửa của mẫu này chưa mở
    if (!(await page.getByRole("heading", { name: new RegExp(`· ${maMau}$`) }).isVisible())) {
      await dongMau(page, maMau).getByRole("button", { name: "Sửa" }).click();
    }
    await page.getByLabel("Đang dùng").uncheck();
    await page.getByRole("button", { name: "Lưu định nghĩa" }).click();
    await expect(dongMau(page, maMau)).toContainText("ngừng dùng");
  });
});
