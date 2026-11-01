// Khung ứng dụng: thanh bên theo vai, mục đang mở, thu gọn, bật/tắt email, trang Tổng quan, Thông báo.
import { test, expect, ND, thanhBen, dangNhapApi } from "./co-so";

const MUC_CHUNG: [string, string][] = [
  ["Tổng quan", "/"],
  ["Thư mục", "/thu-muc"],
  ["Soạn và gửi", "/soan-gui"],
  ["Sổ cái", "/so-cai"],
  ["Sổ văn bản đến", "/van-thu"],
  ["Lịch sử", "/lich-su"],
  ["Mẫu Word", "/mau-word"],
  ["Luật kiểm tra", "/luat-kiem-tra"],
  ["Kỹ năng AI", "/ky-nang"],
];

test.describe("Thanh bên theo vai trò", () => {
  test("quản trị viên thấy đủ 11 mục, có Quản trị và Cài đặt", async ({ page, context }) => {
    await dangNhapApi(context, ND.quanTri);
    await page.goto("/");
    const tb = thanhBen(page);
    for (const [ten, href] of [...MUC_CHUNG, ["Quản trị", "/quan-tri"], ["Cài đặt", "/cai-dat"]] as [string, string][]) {
      await expect(tb.getByRole("link", { name: ten, exact: true })).toHaveAttribute("href", href);
    }
    for (const nhom of ["Làm việc", "Tra cứu"]) await expect(tb.getByText(nhom, { exact: true })).toBeVisible();
    // Chân thanh bên: tên, đơn vị · chức vụ
    await expect(tb.getByText("Quản trị viên", { exact: true })).toBeVisible();
    await expect(tb.getByText("P.HCTH · Quản trị hệ thống")).toBeVisible();
  });

  test("nhân viên không thấy Quản trị, Cài đặt", async ({ page, context }) => {
    await dangNhapApi(context, ND.hungTv);
    await page.goto("/");
    const tb = thanhBen(page);
    await expect(tb.getByText("Trần Văn Hùng")).toBeVisible();
    await expect(tb.getByText("P.KT&VH · Nhân viên")).toBeVisible();
    for (const [ten, href] of MUC_CHUNG) await expect(tb.getByRole("link", { name: ten, exact: true })).toHaveAttribute("href", href);
    await expect(tb.getByRole("link", { name: "Quản trị", exact: true })).toHaveCount(0);
    await expect(tb.getByRole("link", { name: "Cài đặt", exact: true })).toHaveCount(0);
  });

  test("trưởng P.ĐT&PC thấy Cài đặt (sửa được nhóm Luật kiểm tra) nhưng không thấy Quản trị", async ({ page, context }) => {
    await dangNhapApi(context, ND.truongDtpc);
    await page.goto("/");
    const tb = thanhBen(page);
    await expect(tb.getByRole("link", { name: "Cài đặt", exact: true })).toBeVisible();
    await expect(tb.getByRole("link", { name: "Quản trị", exact: true })).toHaveCount(0);
  });

  test("người chưa gán đơn vị: thấy cảnh báo trên Tổng quan và chân thanh bên", async ({ page, context }) => {
    await dangNhapApi(context, ND.nguoiMoi);
    await page.goto("/");
    await expect(page.getByText(/Bạn chưa được gán vào đơn vị nào nên chưa có hộp Đến/)).toBeVisible();
    await expect(thanhBen(page).getByText("Chưa gán đơn vị · Nhân viên")).toBeVisible();
  });

  test("mục đang mở được tô đậm, bấm mục thì chuyển trang", async ({ page, context }) => {
    await dangNhapApi(context, ND.hungTv);
    await page.goto("/so-cai");
    const tb = thanhBen(page);
    await expect(tb.getByRole("link", { name: "Sổ cái", exact: true })).toHaveClass(/font-bold/);
    await expect(tb.getByRole("link", { name: "Tổng quan", exact: true })).not.toHaveClass(/font-bold/);
    await tb.getByRole("link", { name: "Lịch sử", exact: true }).click();
    await expect(page).toHaveURL(/\/lich-su$/);
    await expect(page.getByRole("heading", { level: 1, name: "Lịch sử" })).toBeVisible();
    await expect(tb.getByRole("link", { name: "Lịch sử", exact: true })).toHaveClass(/font-bold/);
  });

  test("thu gọn / mở rộng thanh bên, nhớ sau khi tải lại", async ({ page, context }) => {
    await dangNhapApi(context, ND.hungTv);
    await page.goto("/");
    const tb = thanhBen(page);
    await expect(tb.getByText("SCI công việc")).toBeVisible();
    await tb.getByRole("button", { name: "Thu gọn thanh bên" }).click();
    await expect(tb.getByText("SCI công việc")).toBeHidden();
    await expect(tb.getByRole("link", { name: "Sổ cái" })).toBeVisible();
    // Có hiệu ứng co lại → chờ đến khi hẹp hẳn
    await expect.poll(async () => (await tb.boundingBox())!.width).toBeLessThan(80);
    await page.reload();
    await expect(tb.getByRole("button", { name: "Mở rộng thanh bên" })).toBeVisible();
    await tb.getByRole("button", { name: "Mở rộng thanh bên" }).click();
    await expect(tb.getByText("SCI công việc")).toBeVisible();
  });

  test("công tắc Nhận email thông báo", async ({ page, context }) => {
    await dangNhapApi(context, ND.gdEnc);
    await page.goto("/");
    const cong = thanhBen(page).getByRole("switch", { name: "Nhận email thông báo" });
    await expect(cong).toHaveAttribute("aria-checked", "true");
    await cong.click();
    await expect(page.getByText("Đã tắt nhận email thông báo — vẫn thấy thông báo trong ứng dụng")).toBeVisible();
    await expect(cong).toHaveAttribute("aria-checked", "false");
    await cong.click();
    await expect(page.getByText(`Đã bật nhận email thông báo (${ND.gdEnc})`)).toBeVisible();
    await expect(cong).toHaveAttribute("aria-checked", "true");
  });
});

test.describe("Tổng quan", () => {
  test("các thẻ số liệu và ba khối trống với người chưa có việc", async ({ page, context }) => {
    await dangNhapApi(context, ND.gdPmc);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Tổng quan" })).toBeVisible();
    await expect(page.getByText("Chào Ngô Văn Bình")).toBeVisible();
    for (const t of ["Tài liệu chờ nhận", "Phần việc đang làm", "Quá hạn", "Sắp đến hạn (≤ 3 ngày)"]) {
      await expect(page.locator("main").getByText(t, { exact: true })).toBeVisible();
    }
    await expect(page.getByRole("heading", { name: "Hộp Đến của tôi" })).toBeVisible();
    await expect(page.getByText("Không có tài liệu nào đang chờ đơn vị bạn nhận.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Phần việc của tôi" })).toBeVisible();
    await expect(page.getByText("Không có phần việc nào đang mở cho bạn hoặc đơn vị bạn.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Thông báo mới" })).toBeVisible();

    await page.getByRole("link", { name: /Tài liệu chờ nhận/ }).click();
    await expect(page).toHaveURL(/\/thu-muc/);
  });
});

test.describe("Thông báo", () => {
  test("người chưa gán đơn vị thử gửi → quản trị viên nhận thông báo, đánh dấu đã đọc", async ({ page, context, moTrang }) => {
    // Người mới gọi gửi (sẽ bị từ chối) — hệ thống vẫn báo quản trị viên có người chưa gán đơn vị
    const nguoiMoi = await moTrang(ND.nguoiMoi);
    await nguoiMoi.request.post("/api/gui", { data: { tai_lieu_id: "x", den: [] } });

    await dangNhapApi(context, ND.quanTri);
    await page.goto("/thong-bao");
    await expect(page.getByRole("heading", { level: 1, name: "Thông báo" })).toBeVisible();
    const noiDung = "Có người dùng chưa được gán đơn vị: Người mới (chưa gán đơn vị) (nguoimoi@scigroup.vn)";
    await expect(page.getByText(noiDung).first()).toBeVisible();

    // Chuông trên thanh bên có số chưa đọc
    const chuong = thanhBen(page).locator('a[href="/thong-bao"]');
    await expect(chuong).toHaveAttribute("title", /thông báo chưa đọc/);

    // Lọc chỉ chưa đọc rồi đánh dấu tất cả
    await page.getByLabel("Chỉ chưa đọc").check();
    await expect(page.getByText(noiDung).first()).toBeVisible();
    await page.getByRole("button", { name: "Đánh dấu tất cả đã đọc" }).click();
    await expect(page.getByText(/Đã đánh dấu \d+ thông báo là đã đọc/)).toBeVisible();
    await expect(page.getByText("Không còn thông báo chưa đọc.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Đánh dấu tất cả đã đọc" })).toBeDisabled();
    await expect(chuong).toHaveAttribute("title", "Thông báo");

    // Người khác không thấy thông báo dành cho quản trị
    const hung = await moTrang(ND.hungTv);
    await hung.goto("/thong-bao");
    await expect(hung.getByRole("heading", { level: 1, name: "Thông báo" })).toBeVisible();
    await expect(hung.getByText(noiDung)).toHaveCount(0);
  });
});
