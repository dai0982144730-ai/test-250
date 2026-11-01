// Kỹ năng AI: 5 kỹ năng hệ thống, viết kỹ năng riêng trên web, xem, xuất .skill, xóa, nạp lại từ file,
// kiểm đầu vào, "Nhờ AI sắp lại" khi AI tắt, quyền kho chung.
import { test, expect, ND, MA_CHAY, dangNhapApi, type Page } from "./co-so";

test.describe.configure({ mode: "serial" });

const SLUG = `e2e-${MA_CHAY}`;
const NOI_DUNG = `---\nname: ${SLUG}\ndescription: Kỹ năng thử e2e\n---\n# Hướng dẫn\nTóm tắt ngắn gọn báo cáo tuần.\n`;
// Chỉ có một khung viết kỹ năng trên trang; nút "Lưu kỹ năng" / "Nhờ AI sắp lại" cũng chỉ có một
const theViet = (page: Page) => page.locator("main");
const dongKn = (page: Page, slug: string) => page.locator("main tr").filter({ hasText: `/${slug}` });

async function moTrang(page: Page) {
  await page.goto("/ky-nang");
  await expect(page.getByRole("heading", { level: 1, name: "Kỹ năng AI" })).toBeVisible();
  await expect(page.getByText(/\d+ kỹ năng — hệ thống \+ kho chung \+ kho riêng của bạn/)).toBeVisible({ timeout: 30_000 });
}

test.describe("Kỹ năng AI", () => {
  test("5 kỹ năng hệ thống, không xóa được", async ({ page, context }) => {
    await dangNhapApi(context, ND.hungTv);
    await moTrang(page);
    for (const s of ["hoi-so-cai", "kiem-tra-mau", "tom-tat", "tong-hop-bao-cao", "trich-cong-viec"]) {
      const d = dongKn(page, s);
      await expect(d).toContainText("hệ thống");
      await expect(d.getByRole("button", { name: "Xoá" })).toHaveCount(0);
    }
    await expect(dongKn(page, "tom-tat").getByRole("link", { name: "▶ Chạy" })).toHaveAttribute("href", "/chat?skill=tom-tat");
  });

  test("viết kỹ năng riêng, xem, xuất .skill, xóa rồi nạp lại từ file", async ({ page, context }, info) => {
    await dangNhapApi(context, ND.hungTv);
    await moTrang(page);
    const the = theViet(page);
    await the.getByPlaceholder(/name: bao-cao-tuan/).fill(NOI_DUNG);
    await the.getByRole("button", { name: "Lưu kỹ năng" }).click();
    await expect(page.getByText(`Đã lưu kỹ năng "/${SLUG}" — gõ /${SLUG} trong khung chat để dùng.`)).toBeVisible();
    const d = dongKn(page, SLUG);
    await expect(d).toContainText("riêng — của tôi");

    await d.getByRole("button", { name: "Xem" }).click();
    await expect(page.locator("main pre").filter({ hasText: "# Hướng dẫn" })).toBeVisible();
    await d.getByRole("button", { name: "Thu" }).click();

    const [tai] = await Promise.all([page.waitForEvent("download"), d.getByRole("button", { name: "⬇ .skill" }).click()]);
    expect(tai.suggestedFilename()).toBe(`${SLUG}.skill`);
    const file = info.outputPath(`${SLUG}.skill`);
    await tai.saveAs(file);

    await d.getByRole("button", { name: "Xoá" }).click();
    await expect(page.getByText("Đã xoá kỹ năng.")).toBeVisible();
    await expect(dongKn(page, SLUG)).toHaveCount(0);

    await page.locator('input[type=file][accept=".skill,.zip"]').setInputFiles(file);
    await expect(page.getByText(new RegExp(`Đã nạp kỹ năng "/${SLUG}" \\(\\d+ KB\\)`))).toBeVisible();
    await expect(dongKn(page, SLUG)).toBeVisible();
  });

  test("kiểm đầu vào; Nhờ AI sắp lại báo AI đang tắt", async ({ page, context }) => {
    await dangNhapApi(context, ND.hungTv);
    await moTrang(page);
    const the = theViet(page);
    const o = the.getByPlaceholder(/name: bao-cao-tuan/);
    await o.fill("abc");
    await the.getByRole("button", { name: "Lưu kỹ năng" }).click();
    await expect(page.getByText(/Nội dung thiếu phần khai báo đầu file/)).toBeVisible();

    await o.fill("---\nname: tom-tat\ndescription: trùng\n---\nx");
    await the.getByRole("button", { name: "Lưu kỹ năng" }).click();
    await expect(page.getByText(/"tom-tat" là skill hệ thống/)).toBeVisible();

    await o.fill("abc");
    await the.getByRole("button", { name: "🤖 Nhờ AI sắp lại" }).click();
    await expect(page.getByText("Nội dung quá ngắn — dán phần hướng dẫn bạn muốn thành kỹ năng.")).toBeVisible();
    await o.fill("Mỗi tuần tóm tắt báo cáo của các đơn vị thành một trang, nêu việc trễ hạn.");
    await the.getByRole("button", { name: "🤖 Nhờ AI sắp lại" }).click();
    await expect(page.getByText(/Gọi AI thất bại: Kết nối AI đang TẮT/)).toBeVisible({ timeout: 30_000 });
  });

  test("quyền: nhân viên không thêm vào kho chung; quản trị thấy Kết nối AI và Văn phong", async ({ page, context, moTrang: moTheoVai }) => {
    await dangNhapApi(context, ND.hungTv);
    await moTrang(page);
    for (const n of await page.getByRole("button", { name: "chung — cả công ty" }).all()) await expect(n).toBeDisabled();
    await expect(page.getByRole("region", { name: "Kết nối AI" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Khóa cho agent đọc sổ cái" })).toHaveCount(0);

    const qt = await moTheoVai(ND.quanTri);
    await moTrang(qt);
    await expect(qt.getByRole("button", { name: "chung — cả công ty" }).first()).toBeEnabled();
    await expect(qt.getByRole("region", { name: "Kết nối AI" })).toBeVisible();
    await expect(qt.getByRole("link", { name: "Khóa cho agent đọc sổ cái" })).toBeVisible();
    await expect(qt.getByRole("button", { name: "Văn phong trả lời…" })).toBeVisible();
  });
});
