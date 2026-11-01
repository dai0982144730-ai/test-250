// Trợ lý SCI công việc (khung chat) khi AI đang tắt: mở khung, gợi ý, gửi câu hỏi thì báo đúng lỗi, phiên được lưu,
// đổi tên / xóa phiên, kẹp file (bóc chữ không cần AI), gõ / để gọi kỹ năng, chọn model.
import { test, expect, ND, dangNhapApi } from "./co-so";

test.describe.configure({ mode: "serial" });

const BAO_TAT = "Kết nối AI chưa bật — quản trị viên bật ở Cài đặt → AI → Kết nối AI.";

test.describe("Trợ lý SCI công việc", () => {
  // Gửi câu hỏi khi AI tắt → API trả 400; trình duyệt ghi lỗi tải tài nguyên (đã bỏ qua trong co-so)
  test("mở khung chat nổi, gửi câu hỏi khi AI tắt thì báo rõ", async ({ page, context }) => {
    await dangNhapApi(context, ND.hungTv);
    await page.goto("/");
    await page.getByRole("button", { name: "Mở Trợ lý SCI công việc" }).click();
    await expect(page.getByText("Trợ lý SCI công việc — em giúp gì cho Trần Văn Hùng?")).toBeVisible();
    await expect(page.getByRole("button", { name: "Việc nào sắp trễ hạn?" })).toBeVisible();
    const o = page.locator('textarea[data-lenh="chat.goi-skill"]');
    await o.fill("Xin chào");
    await o.press("Enter");
    await expect(page.getByText(BAO_TAT)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Xin chào").first()).toBeVisible();
  });

  test("trang /chat: danh sách phiên, đổi tên, xóa phiên", async ({ page, context }) => {
    await dangNhapApi(context, ND.hungTv);
    await page.goto("/chat");
    await expect(page.getByText("Hôm nay")).toBeVisible({ timeout: 30_000 });
    const phien = page.getByRole("button", { name: "Xin chào" }).first();
    await expect(phien).toBeVisible();
    await phien.hover();
    await page.getByRole("button", { name: "Tùy chọn phiên" }).first().click();
    await page.getByRole("button", { name: "Đổi tên" }).click();
    await page.keyboard.press("Control+a");
    await page.keyboard.type("Phiên e2e");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Phiên e2e" }).first()).toBeVisible();

    await page.getByRole("button", { name: "Phiên e2e" }).first().hover();
    await page.getByRole("button", { name: "Tùy chọn phiên" }).first().click();
    await page.getByRole("button", { name: "Xóa", exact: true }).click();
    await expect(page.getByText("Xóa phiên này?")).toBeVisible();
    await page.getByTitle("Xác nhận xóa phiên").click();
    await expect(page.getByText("Chưa có phiên nào. Gửi câu hỏi đầu tiên để tạo phiên.")).toBeVisible();
  });

  test("kẹp file: đọc chữ trong file .txt, từ chối loại file không đọc được, bỏ file", async ({ page, context }) => {
    await dangNhapApi(context, ND.hungTv);
    await page.goto("/chat");
    const input = page.locator('input[type=file][accept=".docx,.xlsx,.xls,.csv,.txt,.md,.json,.pptx"]');
    await input.setInputFiles({ name: "a.txt", mimeType: "text/plain", buffer: Buffer.from("Nội dung thử") });
    await expect(page.getByText("a.txt", { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/đọc được 12 ký tự/)).toBeVisible();
    await input.setInputFiles({ name: "x.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
    await expect(page.getByText("x.pdf: trợ lý chưa đọc được loại file này")).toBeVisible();
    await page.getByRole("button", { name: "Bỏ file a.txt" }).click();
    await expect(page.getByText("a.txt", { exact: true })).toBeHidden();
  });

  test("gõ / hiện danh sách kỹ năng; chọn model chỉ còn mặc định khi AI tắt", async ({ page, context }) => {
    await dangNhapApi(context, ND.hungTv);
    await page.goto("/chat");
    const o = page.locator('textarea[data-lenh="chat.goi-skill"]');
    await o.fill("/");
    await expect(page.getByText("Kỹ năng gọi đích danh — chọn rồi gõ tiếp câu hỏi")).toBeVisible();
    await expect(page.getByText("/tom-tat").first()).toBeVisible();
    await o.fill("");

    await page.locator('[data-lenh="chat.doi-model.mo"]').click();
    await expect(page.getByText("Kết nối AI đang tắt.")).toBeVisible();
  });

  test("chat không mở trên trang đăng nhập; phím tắt Ctrl+K bật/tắt khung chat", async ({ page, context }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Mở Trợ lý SCI công việc" })).toHaveCount(0);
    await dangNhapApi(context, ND.hungTv);
    await page.goto("/so-cai");
    await expect(page.getByRole("button", { name: "Mở Trợ lý SCI công việc" })).toBeVisible();
    await page.keyboard.press("Control+k");
    await expect(page.locator('textarea[data-lenh="chat.goi-skill"]')).toBeVisible();
  });
});
