// Đăng nhập, chuyển hướng khi chưa đăng nhập, đăng xuất, đổi mật khẩu.
import { test, expect, ND, MAT_KHAU, thanhBen, dangNhapApi } from "./co-so";

test.describe("Đăng nhập và phiên", () => {
  test("chưa đăng nhập: trang về /login (giữ đường cần tới), API trả 401", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/thong-bao");
    await expect(page).toHaveURL(/\/login\?tiep=%2Fthong-bao$/);

    const r = await page.request.get("/api/toi");
    expect(r.status()).toBe(401);
    expect(await r.json()).toEqual({ loi: "Chưa đăng nhập hoặc phiên đã hết hạn" });
  });

  test("giao diện trang đăng nhập", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "SCI công việc" })).toBeVisible();
    await expect(page.getByText("Giao việc bằng tài liệu. Sổ cái biết việc nào đang chạy.")).toBeVisible();
    await expect(page.getByPlaceholder("ten@scigroup.vn")).toBeFocused();
    await expect(page.getByText("Quên mật khẩu? Liên hệ quản trị viên (Phòng HCTH) để đặt lại.")).toBeVisible();
  });

  test("sai mật khẩu thì báo lỗi, ở lại trang đăng nhập", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("ten@scigroup.vn").fill(ND.hungTv);
    await page.locator("input[type=password]").fill("sai-mat-khau");
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page.getByText("Email hoặc mật khẩu không đúng")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("đăng nhập bằng biểu mẫu rồi về đúng trang cần tới", async ({ page }) => {
    await page.goto("/thong-bao");
    await page.getByPlaceholder("ten@scigroup.vn").fill(ND.hungTv);
    await page.locator("input[type=password]").fill(MAT_KHAU);
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page).toHaveURL(/\/thong-bao$/);
    await expect(page.getByRole("heading", { level: 1, name: "Thông báo" })).toBeVisible();
  });

  test("bấm dòng tài khoản mẫu để điền nhanh (chỉ khi chạy dev)", async ({ page }) => {
    test.skip(process.env.E2E_CHE_DO !== "dev", "Bản production ẩn bảng tài khoản mẫu — chạy với E2E_CHE_DO=dev để test");
    await page.goto("/login");
    await expect(page.getByText(`Tài khoản mẫu · mật khẩu ${MAT_KHAU}`)).toBeVisible();
    await page.getByRole("row", { name: /hung\.tv@scigroup\.vn/ }).click();
    await expect(page.getByPlaceholder("ten@scigroup.vn")).toHaveValue(ND.hungTv);
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Tổng quan" })).toBeVisible();
    await expect(page.getByText("Chào Trần Văn Hùng")).toBeVisible();
  });

  test("đăng xuất xong không vào lại được", async ({ page, context }) => {
    await dangNhapApi(context, ND.hungTv);
    await page.goto("/");
    await thanhBen(page).getByRole("button", { name: "Đăng xuất" }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/so-cai");
    await expect(page).toHaveURL(/\/login\?tiep=%2Fso-cai/);
  });
});

test.describe("Đổi mật khẩu", () => {
  // Dùng tài khoản riêng (GĐ SCI PMC) để không ảnh hưởng test khác; cuối cùng đổi lại mật khẩu cũ
  const email = ND.gdPmc;
  const moi = "MatKhauMoi@2026";

  test("kiểm tra đầu vào và đổi thành công", async ({ page, context }) => {
    await dangNhapApi(context, email);
    await page.goto("/");
    const mo = async () => {
      await thanhBen(page).getByTitle("Đổi mật khẩu").click();
      return page.locator("div.fixed.inset-0").filter({ has: page.getByLabel("Mật khẩu hiện tại") });
    };

    let hop = await mo();
    const nut = hop.getByRole("button", { name: "Đổi mật khẩu", exact: true });
    await expect(nut).toBeDisabled();

    // Hai lần nhập không khớp (kiểm ở trình duyệt)
    await hop.getByLabel("Mật khẩu hiện tại").fill(MAT_KHAU);
    await hop.getByLabel("Mật khẩu mới", { exact: true }).fill("abcdef");
    await hop.getByLabel("Nhập lại mật khẩu mới").fill("abcdeg");
    await nut.click();
    await expect(hop.getByText("Hai lần nhập mật khẩu mới không khớp")).toBeVisible();

    // Sai mật khẩu cũ (máy chủ báo)
    await hop.getByLabel("Mật khẩu hiện tại").fill("khong-dung");
    await hop.getByLabel("Nhập lại mật khẩu mới").fill("abcdef");
    await nut.click();
    await expect(hop.getByText("Mật khẩu cũ không đúng")).toBeVisible();

    // Quá ngắn
    await hop.getByLabel("Mật khẩu hiện tại").fill(MAT_KHAU);
    await hop.getByLabel("Mật khẩu mới", { exact: true }).fill("abc");
    await hop.getByLabel("Nhập lại mật khẩu mới").fill("abc");
    await nut.click();
    await expect(hop.getByText("Mật khẩu phải có ít nhất 6 ký tự")).toBeVisible();

    // Trùng mật khẩu cũ
    await hop.getByLabel("Mật khẩu mới", { exact: true }).fill(MAT_KHAU);
    await hop.getByLabel("Nhập lại mật khẩu mới").fill(MAT_KHAU);
    await nut.click();
    await expect(hop.getByText("Mật khẩu mới phải khác mật khẩu cũ")).toBeVisible();

    // Hủy và Esc đều đóng hộp
    await hop.getByRole("button", { name: "Hủy" }).click();
    await expect(page.getByLabel("Mật khẩu hiện tại")).toBeHidden();
    hop = await mo();
    await page.keyboard.press("Escape");
    await expect(page.getByLabel("Mật khẩu hiện tại")).toBeHidden();

    // Đổi thật
    hop = await mo();
    await hop.getByLabel("Mật khẩu hiện tại").fill(MAT_KHAU);
    await hop.getByLabel("Mật khẩu mới", { exact: true }).fill(moi);
    await hop.getByLabel("Nhập lại mật khẩu mới").fill(moi);
    await hop.getByRole("button", { name: "Đổi mật khẩu", exact: true }).click();
    await expect(page.getByText("Đã đổi mật khẩu")).toBeVisible();
    await expect(page.getByLabel("Mật khẩu hiện tại")).toBeHidden();

    // Mật khẩu cũ hết dùng, mật khẩu mới dùng được
    const cu = await page.request.post("/api/auth/login", { data: { email, mat_khau: MAT_KHAU } });
    expect(cu.status()).toBe(401);
    const r = await page.request.post("/api/auth/login", { data: { email, mat_khau: moi } });
    expect(r.ok()).toBeTruthy();

    // Trả lại mật khẩu mẫu
    const tra = await page.request.post("/api/auth/doi-mat-khau", { data: { mat_khau_cu: moi, mat_khau_moi: MAT_KHAU } });
    expect(tra.ok()).toBeTruthy();
  });
});
