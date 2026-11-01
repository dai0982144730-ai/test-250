// Lịch sử: chỉ ghi thêm, chuỗi băm toàn vẹn, lọc theo từ khóa / hành động / người, phạm vi theo vai, dòng thời gian đối tượng.
import { test, expect, ND, MA_CHAY, viDuDoiTen, dangNhapApi, tm } from "./co-so";

test.describe.configure({ mode: "serial" });

const TEN = `E2E_${MA_CHAY}_lichsu.docx`;

test.describe("Lịch sử", () => {
  test("chuẩn bị: quản trị viên tải lên rồi xóa một tài liệu", async ({ page, context }) => {
    await dangNhapApi(context, ND.quanTri);
    await page.goto("/thu-muc");
    await expect(tm.noiDung(page).getByRole("button", { name: "Tải lên" })).toBeEnabled();
    await page.locator('main input[type="file"][multiple]').setInputFiles([viDuDoiTen("YKien_PhapLy_ThuVon.docx", TEN)]);
    await expect(page.getByText("Đã tải lên 1 file vào Đến.")).toBeVisible();
    await tm.dong(page, TEN).getByRole("button", { name: "Xóa" }).click();
    await expect(page.getByRole("status").filter({ hasText: "vào Thùng rác" })).toBeVisible();
  });

  test("quản trị viên xem toàn bộ, lọc từ khóa và hành động, mở dòng thời gian", async ({ page, context }) => {
    await dangNhapApi(context, ND.quanTri);
    await page.goto("/lich-su");
    await expect(page.getByRole("heading", { level: 1, name: "Lịch sử" })).toBeVisible();
    await expect(page.getByText(/Chỉ được ghi thêm, không ai sửa hay xóa được, kể cả quản trị viên\. Bạn đang xem: toàn bộ\./)).toBeVisible();
    await expect(page.getByText(/\d+ dòng/).first()).toBeVisible({ timeout: 60_000 });
    for (const cot of ["Lúc", "Người", "Hành động", "Đối tượng", "Chi tiết", "Mã băm"]) {
      await expect(page.getByRole("columnheader", { name: cot, exact: true })).toBeVisible();
    }

    await page.getByPlaceholder("Tên tài liệu, mã việc, tên file, lý do…").fill(TEN);
    await page.getByRole("button", { name: "Tìm", exact: true }).click();
    await expect(page).toHaveURL(/tu_khoa=/);
    const bang = page.locator("main table");
    await expect(bang.getByText("Tải lên", { exact: true }).first()).toBeVisible();
    await expect(bang.getByText("Xóa (vào thùng rác)").first()).toBeVisible();

    await page.locator("main form select").nth(2).selectOption("xoa");
    await page.getByRole("button", { name: "Tìm", exact: true }).click();
    await expect(bang.getByText("Xóa (vào thùng rác)").first()).toBeVisible();
    await expect(bang.getByText("Tải lên", { exact: true })).toHaveCount(0);

    // Mở dòng thời gian của đối tượng
    await bang.getByRole("button", { name: TEN }).first().click();
    const hop = page.getByRole("dialog");
    await expect(hop.getByText(`Tài liệu: ${TEN}`)).toBeVisible();
    await expect(hop.getByRole("heading", { name: `Dòng thời gian của ${TEN}` })).toBeVisible();
    await expect(hop.getByRole("link", { name: "Mở trang tài liệu" })).toBeVisible();
    await expect(page).toHaveURL(/loai=tai_lieu&id=/);
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Bỏ lọc" }).click();
    await expect(page.getByPlaceholder("Tên tài liệu, mã việc, tên file, lý do…")).toHaveValue("");
  });

  test("kiểm tra toàn vẹn chuỗi băm", async ({ page, context }) => {
    await dangNhapApi(context, ND.quanTri);
    await page.goto("/lich-su");
    await page.getByRole("button", { name: "Kiểm tra toàn vẹn" }).first().click();
    await expect(page.getByText(/Nguyên vẹn: [\d.]+ dòng, chuỗi băm khớp/)).toBeVisible({ timeout: 60_000 });
  });

  test("lọc theo người", async ({ page, context }) => {
    await dangNhapApi(context, ND.quanTri);
    await page.goto("/lich-su");
    await page.getByPlaceholder("Tên hoặc email").fill(ND.vanThu);
    await page.getByRole("button", { name: "Tìm", exact: true }).click();
    await expect(page).toHaveURL(/nguoi=/);
    const nguoi = page.locator("main table tbody tr td:nth-child(2)");
    // Chờ kết quả lọc về: mọi dòng đều là văn thư
    await expect
      .poll(async () => {
        const ds = await nguoi.allTextContents();
        return ds.length > 0 && ds.every((t) => t.includes("Hoàng Thị Mai"));
      }, { timeout: 30_000 })
      .toBe(true);
  });

  test("phạm vi theo vai: nhân viên chỉ thấy việc của mình, trưởng đơn vị thấy đơn vị và cấp dưới", async ({ moTrang }) => {
    const nv = await moTrang(ND.hungTv);
    await nv.goto("/lich-su");
    await expect(nv.getByText(/Bạn đang xem: việc của mình và tài liệu, công việc của mình\./)).toBeVisible();
    await nv.getByPlaceholder("Tên tài liệu, mã việc, tên file, lý do…").fill(TEN);
    await nv.getByRole("button", { name: "Tìm", exact: true }).click();
    await expect(nv.getByText("Không có dòng lịch sử nào khớp bộ lọc.")).toBeVisible();

    const truong = await moTrang(ND.truongHcth);
    await truong.goto("/lich-su");
    await expect(truong.getByText(/Bạn đang xem: đơn vị mình và cấp dưới\./)).toBeVisible();
  });

  test("API lịch sử chỉ ghi thêm: không có đường sửa hay xóa", async ({ page, context }) => {
    await dangNhapApi(context, ND.quanTri);
    for (const m of ["DELETE", "PUT", "PATCH"] as const) {
      const r = await page.request.fetch("/api/lich-su", { method: m });
      expect(r.status(), `${m} /api/lich-su`).toBeGreaterThanOrEqual(400);
    }
  });
});
