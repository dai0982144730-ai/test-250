// Thao tác nghiệp vụ dùng chung cho các test e2e: soạn–kiểm tra–gửi, xử lý tài liệu đến, sổ cái.
import { expect, maTuUrl, type Locator, type Page } from "./co-so";

export const INPUT_BAN_DAU = 'input[type=file][accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"]';
export const INPUT_BAN_SUA = 'input[type=file][accept=".docx"]';
export const DAT = "Đủ điều kiện bắt buộc — gửi được";

/** Mở Soạn và gửi, tải file, chờ kết quả kiểm tra (đạt hoặc chưa đạt). */
export async function taiLenKiemTra(page: Page, tep: string) {
  await page.goto("/soan-gui");
  await expect(page.getByRole("heading", { level: 1, name: "Soạn và gửi" })).toBeVisible();
  await page.locator(INPUT_BAN_DAU).setInputFiles(tep);
  await expect(page.getByText(new RegExp(`${DAT}|Chưa đạt: \\d+ lỗi chặn gửi`))).toBeVisible({ timeout: 90_000 });
}

/**
 * Với mỗi dòng việc "có vẻ trùng": nếu tên việc nằm trong danh sách `dungLa` thì bấm "Đúng là CV-…" (sổ cái đè việc cũ),
 * ngược lại bấm "Việc mới". Không truyền gì = xác nhận mọi dòng trùng là cùng việc.
 */
export async function quyetDinhTrung(vung: Page | Locator, dungLa?: string[]) {
  const page = "page" in vung ? vung.page() : vung;
  const dong = vung.locator("tr").filter({ has: page.getByRole("button", { name: /^Đúng là CV-/ }) });
  for (const d of await dong.all()) {
    const chu = await d.innerText();
    if (!dungLa || dungLa.some((t) => chu.includes(t))) await d.getByRole("button", { name: /^Đúng là CV-/ }).click();
    else await d.getByRole("button", { name: "Việc mới", exact: true }).click();
  }
}

/** Bấm nút "Gửi …" trên Soạn và gửi, chờ báo đã gửi; trả về mã tài liệu. */
export async function bamGui(page: Page, nutGui: string, dungLa?: string[]) {
  await quyetDinhTrung(page, dungLa);
  const nut = page.getByRole("button", { name: nutGui, exact: true });
  await expect(nut).toBeEnabled({ timeout: 60_000 });
  await nut.click();
  await expect(page.getByText(/^Đã gửi .*nơi nhận, mỗi nơi một trạng thái\)\. Sổ cái:/)).toBeVisible({ timeout: 60_000 });
  return maTuUrl(await page.getByRole("link", { name: "Mở tài liệu và cây hành trình" }).getAttribute("href"));
}

/** Mở trang tài liệu và chờ hộp xử lý dựng xong. */
export async function moTaiLieu(page: Page, id: string) {
  await page.goto(`/tai-lieu/${encodeURIComponent(id)}`);
  await expect(page.getByRole("heading", { level: 2, name: "Hộp xử lý tài liệu" })).toBeVisible({ timeout: 60_000 });
  return page.locator("main");
}

/** Bấm "Nhận" trên bước đang chờ của mình. */
export async function nhan(page: Page, id: string) {
  const main = await moTaiLieu(page, id);
  await main.getByRole("button", { name: "Nhận", exact: true }).first().click();
  await expect(page.getByText(/Đã nhận\./)).toBeVisible();
}

/** Mở Sổ cái (tùy chọn gõ ô lọc). */
export async function moSoCai(page: Page, tim?: string) {
  await page.goto("/so-cai");
  await expect(page.getByRole("heading", { level: 1, name: "Sổ cái" })).toBeVisible();
  await expect(page.getByText(/\d+ việc đang mở/)).toBeVisible({ timeout: 60_000 });
  if (tim) await page.getByPlaceholder("Lọc theo đơn vị, dự án, người…").fill(tim);
}

/** Dòng việc trên sổ cái chứa đoạn chữ. */
export const dongSoCai = (page: Page, chu: string | RegExp) => page.locator("main tr").filter({ hasText: chu });

/** "dd/mm/yyyy" → "dd/mm" (sổ cái hiện hạn dạng ngắn). */
export const ngayNgan = (dmy: string) => dmy.slice(0, 5);

/** Kết thúc phần việc của mình trên dòng sổ cái có mã việc cho sẵn. */
export async function ketThucPhan(page: Page, maViec: string, ketQua: string) {
  await moSoCai(page, maViec);
  await dongSoCai(page, maViec).first().getByRole("button", { name: "Kết thúc" }).first().click();
  const hop = page.locator('[role="dialog"], div.fixed.inset-0').filter({ hasText: "Kết thúc phần việc" }).last();
  await hop.getByPlaceholder("Ví dụ: đã ký biên bản với 3 hộ").fill(ketQua);
  await hop.getByRole("button", { name: "Kết thúc phần của tôi" }).click();
}
