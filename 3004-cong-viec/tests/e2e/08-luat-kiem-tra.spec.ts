// Luật kiểm tra: danh sách + lọc, thêm luật từ câu tiếng Việt (câu đơn giản dịch thẳng, không cần AI),
// sửa có phiên bản, quay lại bản cũ, bật/tắt, đổi mức, xóa; AI tắt → luật AI chỉ cảnh báo; luật hệ thống; quyền xem.
import { test, expect, ND, MA_CHAY, dangNhapApi, type Page } from "./co-so";

test.describe.configure({ mode: "serial" });

async function moTrangLuat(page: Page) {
  await page.goto("/luat-kiem-tra");
  await expect(page.getByRole("heading", { level: 1, name: "Luật kiểm tra" })).toBeVisible();
  await expect(page.getByText(/\d+ \/ \d+ luật/)).toBeVisible({ timeout: 60_000 });
}

const ngan = (page: Page) => page.getByRole("dialog").filter({ has: page.getByLabel("Đóng (Esc)") });

const TEN = "Ngày lập phải có giá trị";

test.describe("Luật kiểm tra", () => {
  test("danh sách, thẻ thống kê, lọc theo mẫu và tìm kiếm", async ({ page, context }) => {
    await dangNhapApi(context, ND.quanTri);
    await moTrangLuat(page);
    for (const t of ["Tổng số luật", "Đang bật", "Chặn gửi", "Có phần AI"]) await expect(page.getByRole("button", { name: new RegExp(t) }).first()).toBeVisible();
    await expect(page.getByRole("region", { name: "Nhóm Luật hệ thống" })).toBeVisible();
    await expect(page.getByText("Người lập, người kiểm soát đã điền")).toBeVisible();

    await page.getByRole("group", { name: "Lọc theo mẫu" }).getByRole("button", { name: /^Form 7/ }).click();
    await expect(page.getByRole("button", { name: /Luật của Form 7/ })).toBeVisible();
    await page.getByLabel("Tìm luật").fill("zzz-khong-co-luat");
    await expect(page.getByText("Không có luật nào khớp bộ lọc")).toBeVisible();
    await page.getByRole("button", { name: "Bỏ mọi bộ lọc" }).click();
    await expect(page.getByLabel("Tìm luật")).toHaveValue("");
  });

  test("thêm luật từ câu đơn giản: dịch thẳng thành luật code không cần AI", async ({ page, context }) => {
    await dangNhapApi(context, ND.quanTri);
    await moTrangLuat(page);
    await page.getByRole("button", { name: "Thêm luật" }).click();
    const n = ngan(page);
    await expect(n.getByText("Thêm luật kiểm tra")).toBeVisible();
    await n.getByLabel("Câu luật").fill(TEN);
    await n.getByRole("button", { name: "AI đề xuất cách chạy" }).click();
    await expect(n.getByText(/câu đơn giản, dịch thẳng không cần AI\./)).toBeVisible({ timeout: 30_000 });
    await expect(n.getByLabel("Tên luật")).toHaveValue(TEN);
    await expect(n.getByLabel("Dạng luật code")).toHaveValue("o_co_gia_tri");
    await expect(n.getByLabel("Ô cần điền")).toHaveValue("ngay_lap");

    // Chạy thử trên báo cáo đã có (các test trước đã tải báo cáo lên)
    await n.getByRole("button", { name: "Chạy thử trên báo cáo đã có" }).click();
    // Kết quả nằm ở nhiều thẻ con ("3 báo cáo · 0 đạt · 3 không đạt · 0 bỏ qua") → so trên cả ngăn kéo
    await expect(n).toContainText(/\d+ báo cáo\s*·\s*\d+ đạt\s*·\s*\d+ không đạt|Chưa có báo cáo nào trong hệ thống để chạy thử/, { timeout: 60_000 });

    await n.getByRole("button", { name: "Lưu luật" }).click();
    await expect(page.getByText(`Đã lưu luật “${TEN}” — phiên bản 1`)).toBeVisible();
    await expect(page.getByRole("region", { name: "Nhóm Ô chung" }).getByText(TEN).first()).toBeVisible();
  });

  test("sửa mức → phiên bản 2; xem lịch sử; quay lại phiên bản 1", async ({ page, context }) => {
    await dangNhapApi(context, ND.quanTri);
    await moTrangLuat(page);
    await page.getByRole("button", { name: `Thao tác với ${TEN}` }).click();
    await page.getByRole("menuitem", { name: "Sửa luật" }).click();
    const n = ngan(page);
    await expect(n.getByRole("button", { name: "Lưu thay đổi" })).toBeDisabled();
    await n.getByRole("radiogroup", { name: "Mức" }).getByRole("radio", { name: /^Cảnh báo/ }).click();
    await n.getByRole("button", { name: "Lưu thay đổi" }).click();
    await expect(page.getByText(`Đã lưu luật “${TEN}” — phiên bản 2`)).toBeVisible();

    await page.getByRole("button", { name: `Thao tác với ${TEN}` }).click();
    await page.getByRole("menuitem", { name: "Lịch sử phiên bản" }).click();
    const hop = page.locator("div.fixed.inset-0").filter({ hasText: `Lịch sử phiên bản · ${TEN}` }).last();
    await expect(hop.getByText("Phiên bản 2")).toBeVisible();
    await expect(hop.getByText("Mức: Chặn gửi → Cảnh báo")).toBeVisible();
    await hop.locator("li, div").filter({ hasText: /^Phiên bản 1/ }).getByRole("button", { name: "Quay lại bản này" }).last().click();
    await hop.getByRole("button", { name: "Đồng ý" }).click();
    await expect(page.getByText(`Đã quay lại phiên bản 1 của “${TEN}”`)).toBeVisible();
  });

  test("bật/tắt và đổi mức ngay trên danh sách", async ({ page, context }) => {
    await dangNhapApi(context, ND.quanTri);
    await moTrangLuat(page);
    await page.getByRole("switch", { name: `Bật luật ${TEN}` }).click();
    await expect(page.getByText(new RegExp(`Đã tắt “${TEN}” — phiên bản \\d+`))).toBeVisible();
    await page.getByRole("button", { name: `Đổi mức của ${TEN}` }).click();
    await page.getByRole("menuitem", { name: "Gợi ý" }).click();
    await expect(page.getByText(new RegExp(`“${TEN}” → Gợi ý — phiên bản \\d+`))).toBeVisible();
  });

  test("xóa luật riêng (có hộp xác nhận)", async ({ page, context }) => {
    await dangNhapApi(context, ND.quanTri);
    await moTrangLuat(page);
    await page.getByRole("button", { name: `Thao tác với ${TEN}` }).click();
    await page.getByRole("menuitem", { name: "Xóa luật" }).click();
    await expect(page.getByText(`Xóa luật “${TEN}”?`)).toBeVisible();
    await page.locator("div.fixed.inset-0").filter({ hasText: `Xóa luật “${TEN}”?` }).getByRole("button", { name: "Xóa luật" }).click();
    await expect(page.getByText(`Đã xóa luật “${TEN}”. Lịch sử phiên bản vẫn được giữ.`)).toBeVisible();
    await expect(page.getByRole("switch", { name: `Bật luật ${TEN}` })).toHaveCount(0);
  });

  test("AI đang tắt: câu cần đọc hiểu được giữ làm luật AI chỉ cảnh báo", async ({ page, context }) => {
    await dangNhapApi(context, ND.quanTri);
    await moTrangLuat(page);
    const cau = `Kiến nghị phải nêu rõ ai quyết việc gì ${MA_CHAY}`;
    await page.getByRole("button", { name: "Thêm luật" }).click();
    const n = ngan(page);
    await n.getByLabel("Câu luật").fill(cau);
    await n.getByRole("button", { name: "AI đề xuất cách chạy" }).click();
    await expect(n.getByText(/Kết nối AI đang tắt nên chưa dịch được sang luật code/)).toBeVisible({ timeout: 30_000 });
    await expect(n.getByLabel("Hướng dẫn cho AI")).toHaveValue(cau);
    await n.getByRole("button", { name: "Lưu luật" }).click();
    await expect(page.getByText(new RegExp(`Đã lưu luật “.*” — phiên bản 1`))).toBeVisible();
    await expect(page.getByRole("region", { name: "Nhóm Nội dung" }).getByText(cau).first()).toBeVisible();
  });

  test("kiểm đầu vào khi thêm luật; đóng khi có thay đổi thì hỏi lại", async ({ page, context }) => {
    await dangNhapApi(context, ND.quanTri);
    await moTrangLuat(page);
    await page.getByRole("button", { name: "Thêm luật" }).click();
    const n = ngan(page);
    await n.getByRole("button", { name: "AI đề xuất cách chạy" }).click();
    await expect(n.getByText("Viết câu luật trước đã — ví dụ bấm một câu gợi ý bên dưới.")).toBeVisible();
    await n.getByRole("button", { name: "Tự chọn dạng luật" }).click();
    await n.getByRole("button", { name: "Lưu luật" }).click();
    await expect(n.getByText("Còn thiếu thông tin — điền các ô viền đỏ:")).toBeVisible();

    await n.getByLabel("Câu luật").fill("x");
    await n.getByRole("button", { name: "Hủy" }).click();
    const hoi = page.getByRole("alertdialog", { name: "Bỏ thay đổi?" });
    await expect(hoi).toBeVisible();
    await hoi.getByRole("button", { name: "Bỏ thay đổi" }).click();
    await expect(n).toBeHidden();
  });

  test("luật hệ thống: không xóa được, chỉ bật/tắt, đổi mức", async ({ page, context }) => {
    await dangNhapApi(context, ND.quanTri);
    await moTrangLuat(page);
    await page.getByRole("button", { name: "Thao tác với Có nơi nhận" }).click();
    await expect(page.getByRole("menuitem", { name: "Bật/tắt, đổi mức" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Lịch sử phiên bản" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Xóa luật" })).toHaveCount(0);
    await page.keyboard.press("Escape");
  });

  test("trưởng P.ĐT&PC được sửa luật (phân quyền theo nhóm cài đặt)", async ({ page, context }) => {
    await dangNhapApi(context, ND.truongDtpc);
    await moTrangLuat(page);
    await expect(page.getByRole("button", { name: "Thêm luật" })).toBeVisible();
    await expect(page.getByText("Chỉ xem", { exact: true })).toHaveCount(0);
  });

  test("nhân viên chỉ xem: không thêm, công tắc bị khóa, không chạy thử được", async ({ page, context }) => {
    await dangNhapApi(context, ND.hungTv);
    await moTrangLuat(page);
    await expect(page.getByText("Chỉ xem", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Thêm luật" })).toHaveCount(0);
    await expect(page.getByRole("switch", { name: "Bật luật Có nơi nhận" })).toBeDisabled();
    await page.getByRole("button", { name: "Thao tác với Có nơi nhận" }).click();
    await expect(page.getByRole("menuitem", { name: "Xóa luật" })).toHaveCount(0);
    await page.getByRole("menuitem", { name: "Xem chi tiết" }).click();
    const n = ngan(page);
    await expect(n.getByText("Bạn chỉ có quyền xem luật.")).toBeVisible();
    await n.getByRole("button", { name: "Đóng", exact: true }).click();

    const r = await page.request.post("/api/luat", { data: { ten: "x" } });
    expect(r.status()).toBe(403);
  });
});
