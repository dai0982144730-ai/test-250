// Cài đặt: sửa nhóm → phiên bản mới + nhật ký, quay lại bản cũ / mặc định (hộp confirm), kiểm lỗi,
// JSON nâng cao, xuất / nhập cấu hình, email chế độ thử, quyền theo nhóm (trưởng P.ĐT&PC, nhân viên).
import fs from "node:fs";
import { test, expect, ND, MA_CHAY, dangNhapApi, type Page } from "./co-so";

test.describe.configure({ mode: "serial" });

async function moNhom(page: Page, nhom?: string) {
  await page.goto(nhom ? `/cai-dat?nhom=${nhom}` : "/cai-dat");
  await expect(page.getByRole("heading", { level: 1, name: "Cài đặt" })).toBeVisible();
  await expect(page.getByText(/Đang (mở Cài đặt|tải)…/).first()).toBeHidden({ timeout: 60_000 });
}

const nutLuu = (page: Page) => page.getByRole("button", { name: /^Lưu( và áp dụng lại.*)?$/ });

test.describe("Cài đặt", () => {
  test("sửa nhóm Quy tắc đè → phiên bản mới, nhật ký ghi thay đổi", async ({ page, context }) => {
    await dangNhapApi(context, ND.quanTri);
    await moNhom(page);
    const cong = page.getByRole("switch", { name: "Việc không có ngày thì luôn mở" });
    const truoc = await cong.getAttribute("aria-checked");
    await cong.click();
    await expect(page.getByRole("button", { name: "Bỏ thay đổi" })).toBeVisible();
    await nutLuu(page).click();
    await expect(page.getByText(/Đã lưu "Quy tắc đè, luôn mở" → phiên bản \d+\. Có hiệu lực ngay\./)).toBeVisible();
    await expect(page.getByText("Nhật ký phiên bản")).toBeVisible();
    await expect(page.getByText(/Việc không có ngày thì luôn mở: (bật|tắt)/).first()).toBeVisible();

    // Quay về mặc định (hộp confirm của trình duyệt)
    page.once("dialog", (d) => {
      expect(d.message()).toBe("Quay về giá trị mặc định ban đầu?");
      void d.accept();
    });
    await page.getByRole("button", { name: "Quay về mặc định" }).click();
    await expect(page.getByText(/Đã quay lại mặc định → phiên bản \d+\. Có hiệu lực ngay\./)).toBeVisible();
    await expect(cong).toHaveAttribute("aria-checked", truoc!);
  });

  test("quay lại một phiên bản cũ; bấm Hủy trên hộp confirm thì không đổi gì", async ({ page, context }) => {
    await dangNhapApi(context, ND.quanTri);
    await moNhom(page, "so_cai");
    const cong = page.getByRole("switch", { name: "Nhắc khi quá hạn" });
    await cong.click();
    await expect(nutLuu(page)).toBeEnabled();
    await nutLuu(page).click();
    await expect(page.getByText(/Đã lưu "Sổ cái, nhắc việc" → phiên bản 1\./)).toBeVisible();
    await expect(page.getByRole("button", { name: "Bỏ thay đổi" })).toBeHidden();
    await expect(page.getByText(/phiên bản 1 ·/).first()).toBeVisible();
    await cong.click();
    await expect(nutLuu(page)).toBeEnabled();
    await nutLuu(page).click();
    await expect(page.getByText(/Đã lưu "Sổ cái, nhắc việc" → phiên bản 2\./)).toBeVisible();

    const ban1 = page.locator("li").filter({ hasText: /^Phiên bản 1/ });
    page.once("dialog", (d) => void d.dismiss());
    await ban1.getByRole("button", { name: "Quay lại bản này" }).click();
    await expect(page.getByText(/phiên bản 2 ·/).first()).toBeVisible();

    page.once("dialog", (d) => {
      expect(d.message()).toBe("Quay lại phiên bản 1? Hệ thống tạo phiên bản mới mang giá trị cũ.");
      void d.accept();
    });
    await ban1.getByRole("button", { name: "Quay lại bản này" }).click();
    await expect(page.getByText("Đã quay lại phiên bản 1 → phiên bản 3. Có hiệu lực ngay.")).toBeVisible();
  });

  test("kiểm lỗi giá trị và JSON nâng cao", async ({ page, context }) => {
    await dangNhapApi(context, ND.quanTri);
    await moNhom(page);
    await page.getByRole("button", { name: /^Giao diện, sao lưu/ }).click();
    await expect(page).toHaveURL(/nhom=giao_dien/);
    const ten = page.locator("div.grid").filter({ hasText: "Tên ứng dụng" }).locator("input").first();
    await ten.fill("");
    await nutLuu(page).click();
    await expect(page.getByText("Chưa lưu được — cấu hình chưa hợp lệ:")).toBeVisible();
    await expect(page.getByText("Tên ứng dụng không được trống")).toBeVisible();
    await page.getByRole("button", { name: "Bỏ thay đổi" }).click();

    await page.getByRole("button", { name: "JSON nâng cao" }).click();
    await page.locator("main textarea").first().fill("{");
    await nutLuu(page).click();
    await expect(page.getByText(/JSON sai cú pháp/)).toBeVisible();
    await page.getByRole("button", { name: "Về biểu mẫu" }).click().catch(() => undefined);
  });

  test("xuất cấu hình rồi nhập lại (có hộp xác nhận), nhập file sai bị từ chối", async ({ page, context }, info) => {
    await dangNhapApi(context, ND.quanTri);
    await moNhom(page);
    const [tai] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Xuất cấu hình" }).click()]);
    expect(tai.suggestedFilename()).toMatch(/^cau-hinh-docflow-\d{4}-\d{2}-\d{2}\.json$/);
    const duongDan = info.outputPath("cau-hinh.json");
    await tai.saveAs(duongDan);
    const cfg = JSON.parse(fs.readFileSync(duongDan, "utf8"));
    expect(cfg.dinh_dang).toBe("sci-docflow-cau-hinh");
    expect(Object.keys(cfg.cau_hinh).length).toBe(13);

    const tenMoi = `SCI công việc E2E ${MA_CHAY}`;
    cfg.cau_hinh.giao_dien.gia_tri.ten_ung_dung = tenMoi;
    const input = page.locator('input[type=file][accept=".json,application/json"]');
    page.once("dialog", (d) => {
      expect(d.message()).toContain('Nhập cấu hình từ "cau-hinh.json"?');
      void d.accept();
    });
    await input.setInputFiles({ name: "cau-hinh.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(cfg)) });
    await expect(page.getByText("Đã nhập cấu hình. Có hiệu lực ngay.")).toBeVisible();
    await page.getByRole("button", { name: /^Giao diện, sao lưu/ }).click();
    await expect(page.locator("div.grid").filter({ hasText: "Tên ứng dụng" }).locator("input").first()).toHaveValue(tenMoi);

    await input.setInputFiles({ name: "sai.json", mimeType: "application/json", buffer: Buffer.from("khong phai json") });
    await expect(page.getByText("File không phải JSON hợp lệ")).toBeVisible();

    page.once("dialog", (d) => void d.accept());
    await input.setInputFiles({ name: "la.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ khong_co: {} })) });
    const hop = page.locator("div.fixed.inset-0").filter({ hasText: "Không nhập được cấu hình" });
    await expect(hop.getByText(/Không có nhóm cài đặt "khong_co"/)).toBeVisible();
    await hop.getByRole("button", { name: "Đóng", exact: true }).last().click();
  });

  test("email ở chế độ thử: gửi thư thử ghi ra thư mục, hàng đợi ghi Đã gửi", async ({ page, context }) => {
    await dangNhapApi(context, ND.quanTri);
    await moNhom(page, "thong_bao");
    await expect(page.getByText("Chế độ thử (không gửi thật)")).toBeVisible();
    await page.getByRole("button", { name: "Gửi thư thử tới tôi" }).click();
    await expect(page.getByText(`Đã gửi thư thử tới ${ND.quanTri} (chế độ thử: thư ghi ra thư mục, không gửi thật)`)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Hàng đợi thư")).toBeVisible();
  });

  test("trưởng P.ĐT&PC chỉ sửa được nhóm Luật kiểm tra", async ({ page, context }) => {
    await dangNhapApi(context, ND.truongDtpc);
    await moNhom(page);
    await expect(page.getByRole("link", { name: "Xuất cấu hình" })).toBeVisible();
    await expect(page.getByText("chỉ xem").first()).toBeVisible();
    await expect(nutLuu(page)).toHaveCount(0);

    await page.getByRole("button", { name: /^Luật kiểm tra/ }).click();
    await page.getByPlaceholder("Thêm chuỗi…").fill(`xxx${MA_CHAY}`);
    await page.getByRole("button", { name: "Thêm", exact: true }).click();
    await nutLuu(page).click();
    await expect(page.getByText(/Đã lưu "Luật kiểm tra" → phiên bản \d+/)).toBeVisible();
  });

  test("nhân viên: mọi nhóm chỉ xem, không xuất được cấu hình", async ({ page, context }) => {
    await dangNhapApi(context, ND.hungTv);
    await moNhom(page);
    await expect(page.getByText("chỉ xem").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Xuất cấu hình" })).toHaveCount(0);
    await expect(nutLuu(page)).toHaveCount(0);
    const r = await page.request.get("/api/cai-dat/xuat");
    expect(r.status()).toBe(403);
    expect((await r.json()).loi).toBe("Bạn không có quyền xuất cấu hình");
    const r2 = await page.request.get("/api/email/hang-doi");
    expect(r2.status()).toBe(403);
  });

  test("thẻ Kết nối AI khi AI đang tắt", async ({ page, context }) => {
    await dangNhapApi(context, ND.quanTri);
    await moNhom(page, "ai");
    const the = page.getByRole("region", { name: "Kết nối AI" });
    await expect(the.getByText(/Chưa bật — AI đang tắt/)).toBeVisible({ timeout: 30_000 });
    await expect(the.getByRole("button", { name: "Tắt AI" })).toHaveCount(0);
    await expect(the.getByRole("button", { name: "Làm mới" })).toBeVisible();
  });
});
