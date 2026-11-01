// Quản trị: người dùng (thêm, kiểm lỗi, khóa/mở khóa, đặt lại mật khẩu), đơn vị (gốc, con, ngừng),
// vai trò và ma trận quyền, nhập người dùng từ Excel; người không có quyền bị chặn.
import fs from "node:fs";
import * as XLSX from "xlsx";
import { test, expect, ND, MA_CHAY, dangNhapApi, type Page } from "./co-so";

test.describe.configure({ mode: "serial" });

const hop = (page: Page, tieuDe: string | RegExp) => page.locator("div.fixed.inset-0").filter({ hasText: tieuDe }).last();
/** Ô trong hộp thoại theo đúng nhãn (tránh "Đơn vị" khớp nhầm "Đơn vị cha"). */
const truong = (vung: ReturnType<typeof hop>, nhan: string) =>
  vung.locator("label").filter({ has: vung.page().locator("span", { hasText: new RegExp(`^${nhan.replace(/[()]/g, "\\$&")}$`) }) }).locator("input, select").first();

const EMAIL = `e2e.${MA_CHAY}@scigroup.vn`;
const TEN = `E2E Người ${MA_CHAY}`;
let matKhauTam = "";

async function moTab(page: Page, tab: "vai-tro" | "nguoi-dung" | "don-vi" | "nhap-excel") {
  await page.goto(`/quan-tri?tab=${tab}`);
  await expect(page.getByRole("heading", { level: 1, name: "Quản trị hệ thống" })).toBeVisible();
  await expect(page.getByText("Đang tải…")).toBeHidden({ timeout: 60_000 });
}

test.describe("Quản trị", () => {
  test("người không có quyền bị chặn cả trang và API", async ({ page, context }) => {
    await dangNhapApi(context, ND.hungTv);
    await page.goto("/quan-tri");
    await expect(page.getByText("Bạn không có quyền quản lý người dùng, đơn vị, vai trò. Liên hệ quản trị viên nếu cần.")).toBeVisible();
    await page.goto("/quan-tri/khoa-agent");
    await expect(page.getByText("Bạn chưa có quyền «Cấp khóa cho agent đọc sổ cái».")).toBeVisible();
    const r = await page.request.get("/api/quan-tri/nguoi-dung");
    expect(r.status()).toBe(403);
  });

  test("quản trị viên: 4 thẻ, đổi thẻ đổi URL", async ({ page, context }) => {
    await dangNhapApi(context, ND.quanTri);
    await moTab(page, "vai-tro");
    for (const t of ["Vai trò và quyền", "Người dùng", "Đơn vị", "Nhập từ Excel"]) await expect(page.getByRole("button", { name: t, exact: true })).toBeVisible();
    await expect(page.locator("main").getByRole("link", { name: "Khóa cho agent" })).toBeVisible();
    await page.getByRole("button", { name: "Người dùng", exact: true }).click();
    await expect(page).toHaveURL(/tab=nguoi-dung/);
    await expect(page.getByPlaceholder("Tìm tên, email, chức vụ…")).toBeVisible();
  });

  test("thêm người dùng: kiểm lỗi, mật khẩu tạm, đăng nhập được", async ({ page, context }) => {
    await dangNhapApi(context, ND.quanTri);
    await moTab(page, "nguoi-dung");

    // Email sai dạng
    await page.getByRole("button", { name: "Thêm người dùng" }).click();
    let h = hop(page, "Thêm người dùng");
    await truong(h, "Email (tên đăng nhập)").fill("abc");
    await truong(h, "Họ tên").fill("Thử");
    await h.getByRole("button", { name: "Lưu", exact: true }).click();
    await expect(h.getByText("Email không hợp lệ: abc")).toBeVisible();
    // Email đã có
    await truong(h, "Email (tên đăng nhập)").fill(ND.hungTv);
    await h.getByRole("button", { name: "Lưu", exact: true }).click();
    await expect(h.getByText(`Email ${ND.hungTv} đã có tài khoản`)).toBeVisible();
    await h.getByRole("button", { name: "Hủy" }).click();

    // Thêm đúng
    await page.getByRole("button", { name: "Thêm người dùng" }).click();
    h = hop(page, "Thêm người dùng");
    await truong(h, "Email (tên đăng nhập)").fill(EMAIL);
    await truong(h, "Họ tên").fill(TEN);
    await truong(h, "Đơn vị").selectOption({ value: "sci-enc" });
    await truong(h, "Chức vụ").fill("Nhân viên");
    await h.getByRole("checkbox", { name: /^Nhân viên/ }).check();
    await h.getByRole("button", { name: "Lưu", exact: true }).click();
    const mk = hop(page, "Mật khẩu mới");
    await expect(mk.getByText(new RegExp(`Mật khẩu của ${EMAIL.replace(/\./g, "\\.")} — chỉ hiện một lần`))).toBeVisible();
    matKhauTam = (await mk.locator("code").first().textContent())!.trim();
    expect(matKhauTam).toBe(EMAIL.toLowerCase()); // mật khẩu lần đầu = email (02/10)
    await mk.getByRole("button", { name: "Đã ghi lại" }).click();

    await page.getByPlaceholder("Tìm tên, email, chức vụ…").fill(MA_CHAY);
    const dong = page.locator("main tr").filter({ hasText: EMAIL });
    await expect(dong).toContainText("SCI E&C");
    await expect(dong).toContainText("Nhân viên");

    const r = await page.request.post("/api/auth/login", { data: { email: EMAIL, mat_khau: matKhauTam } });
    expect(r.ok()).toBeTruthy();
    await dangNhapApi(context, ND.quanTri);
  });

  test("khóa tài khoản → không đăng nhập được; mở khóa; đặt lại mật khẩu", async ({ page, context }) => {
    await dangNhapApi(context, ND.quanTri);
    await moTab(page, "nguoi-dung");
    await page.getByPlaceholder("Tìm tên, email, chức vụ…").fill(MA_CHAY);
    await page.locator("main tr").filter({ hasText: EMAIL }).getByRole("button", { name: "Sửa" }).click();
    let h = hop(page, `Sửa người dùng: ${TEN}`);
    page.once("dialog", (d) => void d.accept());
    await h.getByRole("button", { name: "Khóa", exact: true }).click();
    await expect(page.getByText(`Đã khóa ${TEN}`)).toBeVisible();

    const bi = await page.request.post("/api/auth/login", { data: { email: EMAIL, mat_khau: matKhauTam } });
    expect(bi.status()).toBe(401);
    expect((await bi.json()).loi).toBe("Tài khoản đã bị khóa, liên hệ quản trị viên");
    await dangNhapApi(context, ND.quanTri);

    await page.reload();
    await page.getByLabel("Hiện cả tài khoản bị khóa").check();
    await page.getByPlaceholder("Tìm tên, email, chức vụ…").fill(MA_CHAY);
    const dong = page.locator("main tr").filter({ hasText: EMAIL });
    await expect(dong).toContainText("ĐÃ KHÓA");
    await dong.getByRole("button", { name: "Sửa" }).click();
    h = hop(page, `Sửa người dùng: ${TEN}`);
    await h.getByRole("button", { name: "Mở khóa" }).click();
    await expect(page.getByText(`Đã mở khóa ${TEN}`)).toBeVisible();

    await page.locator("main tr").filter({ hasText: EMAIL }).getByRole("button", { name: "Sửa" }).click();
    h = hop(page, `Sửa người dùng: ${TEN}`);
    page.once("dialog", (d) => void d.accept());
    await h.getByRole("button", { name: "Đặt lại mật khẩu" }).click();
    const mk = hop(page, "Mật khẩu mới");
    const moi = (await mk.locator("code").first().textContent())!.trim();
    await mk.getByRole("button", { name: "Đã ghi lại" }).click();
    expect(moi).not.toBe(matKhauTam);
    expect((await page.request.post("/api/auth/login", { data: { email: EMAIL, mat_khau: matKhauTam } })).status()).toBe(401);
    expect((await page.request.post("/api/auth/login", { data: { email: EMAIL, mat_khau: moi } })).ok()).toBeTruthy();
    await dangNhapApi(context, ND.quanTri);
  });

  test("quản trị viên không tự khóa được mình", async ({ page, context }) => {
    await dangNhapApi(context, ND.quanTri);
    await moTab(page, "nguoi-dung");
    await page.getByPlaceholder("Tìm tên, email, chức vụ…").fill("quantri");
    await page.locator("main tr").filter({ hasText: ND.quanTri }).getByRole("button", { name: "Sửa" }).click();
    const h = hop(page, "Sửa người dùng: Quản trị viên");
    await expect(h.getByRole("button", { name: "Khóa", exact: true })).toHaveCount(0);
    await expect(h.getByRole("checkbox", { name: /Quản trị viên \(luôn có mọi quyền/ })).toBeDisabled();
    await h.getByRole("button", { name: "Hủy" }).click();
  });

  test("đơn vị: thêm đơn vị gốc, đơn vị con, không ngừng được khi còn đơn vị con, trùng mã bị chặn", async ({ page, context }) => {
    await dangNhapApi(context, ND.quanTri);
    await moTab(page, "don-vi");
    const maGoc = `e2e-${MA_CHAY}`;
    await page.getByRole("button", { name: "Đơn vị gốc" }).click();
    let h = hop(page, "Thêm đơn vị gốc");
    await truong(h, "Tên đơn vị").fill(`Văn phòng E2E ${MA_CHAY}`);
    await truong(h, "Tên ngắn").fill(`VP E2E ${MA_CHAY}`);
    await truong(h, "Mã (không bắt buộc)").fill(maGoc);
    await truong(h, "Cấp").fill("0");
    await h.getByRole("button", { name: "Lưu", exact: true }).click();
    await expect(page.getByText(`Đã thêm đơn vị Văn phòng E2E ${MA_CHAY} (mã ${maGoc})`)).toBeVisible();

    const dongGoc = page.locator("main tr").filter({ hasText: maGoc }).first();
    await dongGoc.getByTitle("Thêm đơn vị con").click();
    h = hop(page, `Thêm đơn vị con của Văn phòng E2E ${MA_CHAY}`);
    await expect(truong(h, "Cấp")).toHaveValue("1");
    await truong(h, "Tên đơn vị").fill(`Tổ E2E ${MA_CHAY}`);
    await truong(h, "Tên ngắn").fill(`To E2E ${MA_CHAY}`);
    await h.getByRole("button", { name: "Lưu", exact: true }).click();
    await expect(page.getByText(new RegExp(`Đã thêm đơn vị Tổ E2E ${MA_CHAY}`))).toBeVisible();

    page.once("dialog", (d) => void d.accept());
    await page.locator("main tr").filter({ hasText: maGoc }).first().getByTitle("Ngừng hoạt động").click();
    await expect(page.getByText(/Còn 1 đơn vị con đang hoạt động/)).toBeVisible();

    await page.getByRole("button", { name: "Đơn vị gốc" }).click();
    h = hop(page, "Thêm đơn vị gốc");
    await truong(h, "Tên đơn vị").fill("Trùng mã");
    await truong(h, "Tên ngắn").fill("TM");
    await truong(h, "Mã (không bắt buộc)").fill(maGoc);
    await truong(h, "Cấp").fill("0");
    await h.getByRole("button", { name: "Lưu", exact: true }).click();
    await expect(h.getByText(`Mã đơn vị ${maGoc} đã có`)).toBeVisible();
    await h.getByRole("button", { name: "Hủy" }).click();
  });

  test("vai trò: tạo vai trò mới, bật một quyền trong ma trận, gán cho người rồi mới thấy trang", async ({ page, context, moTrang }) => {
    await dangNhapApi(context, ND.quanTri);
    await moTab(page, "vai-tro");
    const tenVt = `Vai trò E2E ${MA_CHAY}`;
    await page.getByRole("button", { name: "Vai trò mới" }).click();
    let h = hop(page, "Vai trò mới");
    await truong(h, "Tên vai trò").fill(tenVt);
    await truong(h, "Chép quyền từ vai trò").selectOption({ label: "Nhân viên" });
    await h.getByRole("button", { name: "Lưu", exact: true }).click();
    await expect(page.getByText(`Đã tạo vai trò ${tenVt}. Bấm các ô trong cột mới để bật quyền.`)).toBeVisible();

    // Cột mới là cột cuối; bật agent.cap_khoa
    const dong = page.locator("tr").filter({ has: page.getByText("agent.cap_khoa", { exact: true }) });
    await dong.getByRole("button").last().click();
    await page.getByRole("button", { name: /^Lưu thay đổi \(1\)$/ }).click();
    await expect(page.getByText("Đã lưu 1 thay đổi quyền. Ghi vào nhật ký.")).toBeVisible();

    // Gán vai trò cho người dùng E2E rồi người đó vào được trang Khóa cho agent
    await moTab(page, "nguoi-dung");
    await page.getByPlaceholder("Tìm tên, email, chức vụ…").fill(MA_CHAY);
    await page.locator("main tr").filter({ hasText: EMAIL }).getByRole("button", { name: "Sửa" }).click();
    h = hop(page, `Sửa người dùng: ${TEN}`);
    await h.getByRole("checkbox", { name: new RegExp(`^${tenVt}`) }).check();
    await h.getByRole("button", { name: "Lưu", exact: true }).click();
    await expect(page.getByText(`Đã lưu ${TEN}`)).toBeVisible();

    // Vai trò đang gán thì không xóa được
    await moTab(page, "vai-tro");
    page.once("dialog", (d) => void d.accept());
    await page.getByRole("columnheader").filter({ hasText: tenVt }).getByTitle("Xóa vai trò").click();
    await expect(page.getByText(/Vai trò đang gán cho 1 người — gỡ khỏi họ trước khi xóa/)).toBeVisible();
    // Vai trò hệ thống không có nút xóa
    await expect(page.getByRole("columnheader").filter({ hasText: "Nhân viên" }).first().getByTitle("Xóa vai trò")).toHaveCount(0);
  });

  test("nhập người dùng từ Excel: file mẫu, xem trước, nhập, nhập lại thì cập nhật; file lỗi báo đúng dòng", async ({ page, context }, info) => {
    await dangNhapApi(context, ND.quanTri);
    await moTab(page, "nhap-excel");
    const [tai] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Tải file mẫu" }).click()]);
    const mau = info.outputPath("mau.xlsx");
    await tai.saveAs(mau);

    // Đổi email trong file mẫu cho không trùng giữa các lần chạy
    const wb = XLSX.read(fs.readFileSync(mau));
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
    const iEmail = rows.findIndex((r) => r.some((c) => String(c).includes("@")));
    const cotEmail = rows[iEmail].findIndex((c) => String(c).includes("@"));
    for (let i = iEmail; i < rows.length; i++) if (rows[i]?.[cotEmail]) rows[i][cotEmail] = String(rows[i][cotEmail]).replace("@", `.${MA_CHAY}@`);
    wb.Sheets[wb.SheetNames[0]] = XLSX.utils.aoa_to_sheet(rows);
    const file = info.outputPath("nhap.xlsx");
    fs.writeFileSync(file, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));

    const input = page.locator('input[type=file][accept=".xlsx,.xls"]');
    await input.setInputFiles(file);
    await expect(page.getByText(/2 dòng · 2 hợp lệ · không có lỗi/)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Tạo mới").first()).toBeVisible();
    await page.getByRole("button", { name: "Nhập 2 dòng hợp lệ" }).click();
    await expect(page.getByText("Đã nhập xong: 2 tạo mới · 0 cập nhật · 0 bỏ qua.")).toBeVisible();
    const [csv] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Tải mật khẩu tạm \(2\)/ }).click()]);
    expect(csv.suggestedFilename()).toBe("mat-khau-tam.csv");

    await input.setInputFiles(file);
    await expect(page.getByText("Cập nhật").first()).toBeVisible({ timeout: 30_000 });

    // File có dòng lỗi
    const loi = XLSX.utils.aoa_to_sheet([
      ["Họ tên", "Email", "Mã đơn vị hoặc tên đơn vị", "Chức vụ", "Vai trò"],
      ["Sai email", "bad", "p-dtpc", "", ""],
      ["Sai đơn vị", `x.${MA_CHAY}@scigroup.vn`, "zzz", "", ""],
      ["Trùng", `x.${MA_CHAY}@scigroup.vn`, "p-dtpc", "", ""],
    ]);
    const wb2 = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb2, loi, "Người dùng");
    const fileLoi = info.outputPath("loi.xlsx");
    fs.writeFileSync(fileLoi, XLSX.write(wb2, { type: "buffer", bookType: "xlsx" }));
    await input.setInputFiles(fileLoi);
    await expect(page.getByText("Email không hợp lệ: bad")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Không có đơn vị "zzz"/)).toBeVisible();
    await expect(page.getByText(/Email trùng với dòng/)).toBeVisible();
  });
});
