// Luồng nghiệp vụ chính theo sơ đồ hoạt động, làm hoàn toàn trên giao diện:
// kiểm tra chặn đúng ô → tải bản sửa → gửi → nhận → sổ cái đè theo cấp/ngày → TGĐ quyết định giao việc →
// các bên Kết thúc phần việc → việc rời sổ cái. Nhánh 2: trả lại → gửi lại → chuyển tiếp / kèm file / gửi mới → hoàn thành.
import { test, expect, ND, viDu, viDuDoiTen, maTuUrl, type Page } from "./co-so";

const INPUT_BAN_DAU = 'input[type=file][accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"]';
const INPUT_BAN_SUA = 'input[type=file][accept=".docx"]';

/** Mở Soạn và gửi, tải file lên, chờ kết quả kiểm tra. */
async function taiLenKiemTra(page: Page, tep: string | ReturnType<typeof viDuDoiTen>) {
  await page.goto("/soan-gui");
  await expect(page.getByRole("heading", { level: 1, name: "Soạn và gửi" })).toBeVisible();
  await page.locator(INPUT_BAN_DAU).setInputFiles(typeof tep === "string" ? viDu(tep) : tep);
  await expect(page.getByText(/Đủ điều kiện bắt buộc — gửi được|Chưa đạt: \d+ lỗi chặn gửi/)).toBeVisible({ timeout: 90_000 });
}

/** Mỗi dòng "có vẻ trùng": bấm "Đúng là CV-…" một lần (nút bật/tắt, bấm xong vẫn còn) để sổ cái đè việc cũ. */
async function xacNhanTrung(page: Page) {
  for (const nut of await page.getByRole("button", { name: /^Đúng là CV-/ }).all()) await nut.click();
}

/** Xác nhận các dòng "có vẻ trùng" là đúng việc cũ (để sổ cái đè), rồi bấm Gửi; trả về mã tài liệu. */
async function xacNhanVaGui(page: Page, nutGui: string) {
  await xacNhanTrung(page);
  const nut = page.getByRole("button", { name: nutGui, exact: true });
  await expect(nut).toBeEnabled({ timeout: 60_000 });
  await nut.click();
  await expect(page.getByText(/^Đã gửi .*nơi nhận, mỗi nơi một trạng thái\)\. Sổ cái:/)).toBeVisible({ timeout: 60_000 });
  return maTuUrl(await page.getByRole("link", { name: "Mở tài liệu và cây hành trình" }).getAttribute("href"));
}

/** Dòng việc trên sổ cái chứa đoạn chữ. */
const dongSoCai = (page: Page, chu: string | RegExp) => page.locator("main tr").filter({ hasText: chu });

async function moSoCai(page: Page, tim?: string) {
  await page.goto("/so-cai");
  await expect(page.getByRole("heading", { level: 1, name: "Sổ cái" })).toBeVisible();
  await expect(page.getByText(/\d+ việc đang mở/)).toBeVisible({ timeout: 60_000 });
  if (tim) await page.getByPlaceholder("Lọc theo đơn vị, dự án, người…").fill(tim);
}

const ma: { t28?: string; t29?: string; f0?: string; cv?: string; enc?: string; pdtpcMoi?: string } = {};

test.describe.serial("Luồng 1: kiểm tra → gửi → sổ cái → TGĐ giao việc → kết thúc", () => {
  test("BQLDA gửi báo cáo tuần 28 (đạt kiểm tra) cho P.ĐT&PC", async ({ moTrang }) => {
    const page = await moTrang(ND.nvBqlda);
    await taiLenKiemTra(page, "BaoCao_Tuan28_BQLDA_QuangTri.docx");
    await expect(page.getByText("Đủ điều kiện bắt buộc — gửi được")).toBeVisible();
    await expect(page.getByText("Công việc trong báo cáo", { exact: false }).first()).toBeVisible();
    // Nơi nhận mặc định theo mẫu Form 7 là P.ĐT&PC
    await expect(page.locator('button[title="Phòng Đầu tư và Pháp chế"]')).toHaveAttribute("aria-pressed", "true");
    ma.t28 = await xacNhanVaGui(page, "Gửi Phòng Đầu tư và Pháp chế");
  });

  test("báo cáo tuần 29 bản 1 bị chặn đúng ô Người lập; tải bản sửa (bản 2) thì gửi được", async ({ moTrang }) => {
    const page = await moTrang(ND.nvBqlda);
    await taiLenKiemTra(page, "BaoCao_Tuan29_BQLDA_QuangTri_ban1.docx");
    await expect(page.getByText(/Chưa đạt: 1 lỗi chặn gửi/)).toBeVisible();
    await expect(page.getByText(/Vị trí: Ô "Người lập"|Ô Người lập \(nguoi_lap\)/).first()).toBeVisible();
    await expect(page.getByText(/Ô "Người lập" còn để "\.\.\.\.\.\.", cần điền/).first()).toBeVisible();
    await expect(page.getByText("Nút Gửi bị khóa: còn lỗi mức chặn.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Gửi Phòng Đầu tư và Pháp chế", exact: true })).toBeDisabled();
    // Kỳ báo cáo đọc đúng
    await expect(page.getByText(/Tuần 29\/2026 \(14\/07\/2026 – 20\/07\/2026\)/).first()).toBeVisible();

    // Tải lại bản đã sửa
    await page.locator(INPUT_BAN_SUA).first().setInputFiles(viDu("BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx"));
    await expect(page.getByText("Đủ điều kiện bắt buộc — gửi được")).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText(/bản 2/).first()).toBeVisible();
    await expect(page.getByText("Nút Gửi bị khóa: còn lỗi mức chặn.")).toBeHidden();
    // Việc không có ngày thì luôn mở
    await expect(page.getByText(/luôn mở/).first()).toBeVisible();
    ma.t29 = await xacNhanVaGui(page, "Gửi Phòng Đầu tư và Pháp chế");
  });

  test("Trưởng P.ĐT&PC thấy tài liệu trong Hộp Đến, bấm Nhận", async ({ moTrang }) => {
    const page = await moTrang(ND.truongDtpc);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Hộp Đến của tôi" })).toBeVisible();
    await expect(page.getByText(/\d+ tài liệu đang chờ nhận/)).toBeVisible();
    await expect(page.getByText("BaoCao_Tuan29_BQLDA_QuangTri", { exact: false }).first()).toBeVisible();

    await page.goto(`/tai-lieu/${ma.t29}`);
    const hop = page.locator("main");
    await expect(hop.getByText("Từ", { exact: false }).filter({ hasText: "BQLDA Quảng Trị" }).first()).toBeVisible({ timeout: 60_000 });
    await expect(hop.getByText("Chờ nhận").first()).toBeVisible();
    await hop.getByRole("button", { name: "Nhận", exact: true }).click();
    await expect(page.getByText(/Đã nhận\. BQLDA Quảng Trị thấy "đã nhận lúc/)).toBeVisible();
  });

  test("sổ cái: việc GPMB lấy hạn theo bản mới nhất, đè bản cũ", async ({ moTrang }) => {
    const page = await moTrang(ND.truongDtpc);
    await moSoCai(page, "GPMB");
    const dong = dongSoCai(page, "GPMB Trụ T11");
    await expect(dong.first()).toBeVisible();
    await expect(dong.first()).toContainText("05/08");
    await expect(dong.first()).toContainText(/nguồn: BQLDA Quảng Trị · Form 7 · tuần 29/);
    await expect(dong.first()).toContainText(/đã đè 1 bản/);
    await expect(dong.first()).toContainText("Quá hạn");
  });

  test("P.ĐT&PC gửi báo cáo tuần (Form 1) lên Ban TGĐ → việc GPMB lấy hạn của phòng (cấp cao hơn)", async ({ moTrang }) => {
    const page = await moTrang(ND.nvDtpc);
    await taiLenKiemTra(page, "BaoCao_Tuan29_PDTPC.docx");
    await expect(page.getByText("Đủ điều kiện bắt buộc — gửi được")).toBeVisible();
    await xacNhanVaGui(page, "Gửi Ban Tổng giám đốc");

    await moSoCai(page, "GPMB");
    const dong = dongSoCai(page, "GPMB Trụ T11").first();
    await expect(dong).toContainText("10/08");
    await expect(dong).toContainText(/nguồn: Phòng Đầu tư và Pháp chế · Form 1 · tuần 29/);
    await expect(dong).toContainText(/đã đè 2 bản/);
  });

  test("Phó TGĐ gửi báo cáo hợp nhất (Form 0): các dòng chờ TGĐ quyết định", async ({ moTrang }) => {
    const page = await moTrang(ND.phoTgd);
    await taiLenKiemTra(page, "BaoCao_HopNhat_Tuan30.docx");
    await expect(page.getByText("Đủ điều kiện bắt buộc — gửi được")).toBeVisible();
    await expect(page.getByText("Chờ TGĐ quyết định").first()).toBeVisible();
    ma.f0 = await xacNhanVaGui(page, "Gửi Ban Tổng giám đốc");

    // Người không phải TGĐ chỉ thấy "Chờ Tổng Giám đốc quyết định"
    await page.goto(`/tai-lieu/${ma.f0}`);
    await expect(page.getByText("Nội dung cần TGĐ quyết định")).toBeVisible({ timeout: 60_000 });
  });

  test("TGĐ quyết định, giao việc Chi trả GPMB Trụ T11 (đè việc GPMB đang mở)", async ({ moTrang }) => {
    const page = await moTrang(ND.tgd);
    await page.goto(`/tai-lieu/${ma.f0}`);
    await expect(page.getByText("Nội dung cần TGĐ quyết định")).toBeVisible({ timeout: 60_000 });
    const dong = page.locator("div.rounded-sm.border").filter({ hasText: "Chi trả GPMB Trụ T11" }).filter({ has: page.getByRole("button") }).last();
    await expect(dong).toContainText(/có vẻ trùng CV-/);
    await dong.getByRole("button", { name: "Quyết định, giao việc" }).click();

    const hop = page.locator('[role="dialog"], div.fixed.inset-0').filter({ hasText: "Phần việc (ngày trống = luôn mở)" }).last();
    await expect(hop).toBeVisible();
    await hop.getByLabel("Dự án").fill("ĐG Hướng Việt");
    // Việc trùng được chọn sẵn → giao lại, đè việc cũ
    const chonTrung = hop.locator("select").filter({ has: page.locator("option", { hasText: "Tạo việc mới" }) });
    await expect(chonTrung).not.toHaveValue("");
    // Phần việc: chọn sẵn BQLDA + P.ĐT&PC theo dòng quyết định; điền ngày cho mọi phần
    const chonPt = hop.locator("select").filter({ has: page.locator("option", { hasText: "— Chọn người / đơn vị —" }) });
    await expect(chonPt).toHaveCount(2);
    await expect(chonPt.nth(0)).toHaveValue("don_vi:bqlda-qt");
    await expect(chonPt.nth(1)).toHaveValue("don_vi:p-dtpc");
    await hop.getByPlaceholder("Nội dung phần việc (trống = tên việc)").nth(0).fill("Thỏa thuận với 3 hộ");
    await hop.getByPlaceholder("Nội dung phần việc (trống = tên việc)").nth(1).fill("Công văn gửi UBND huyện Hướng Hóa");
    for (const o of await hop.getByLabel("Bắt đầu").all()) await o.fill("2026-09-01");
    for (const o of await hop.getByLabel("Kết thúc").all()) await o.fill("2026-12-31");
    await hop.getByRole("button", { name: "Quyết định, giao việc" }).last().click();
    const bao = page.getByText(/Đã quyết định, giao việc CV-\d{4}-\d+/);
    await expect(bao).toBeVisible({ timeout: 30_000 });
    ma.cv = (await bao.textContent())!.match(/CV-\d{4}-\d+/)![0];
    await expect(page.getByText(`Đã giao · ${ma.cv}`)).toBeVisible();
  });

  test("sổ cái: việc do TGĐ giao (cấp 1), 2 phần việc, còn hạn", async ({ moTrang }) => {
    const page = await moTrang(ND.tgd);
    await moSoCai(page, ma.cv);
    const dong = dongSoCai(page, ma.cv!).first();
    await expect(dong).toBeVisible();
    await expect(dong).toContainText("0/2");
    await expect(dong).toContainText("31/12");
    await expect(dong).toContainText("Thỏa thuận với 3 hộ");
  });

  test("nhân viên phòng khác không có nút Kết thúc trên việc này", async ({ moTrang }) => {
    const page = await moTrang(ND.hungTv);
    await moSoCai(page, ma.cv);
    const dong = dongSoCai(page, ma.cv!).first();
    await expect(dong).toBeVisible();
    await expect(dong.getByRole("button", { name: "Kết thúc" })).toHaveCount(0);
  });

  test("GĐ BQLDA kết thúc phần của mình (1/2)", async ({ moTrang }) => {
    const page = await moTrang(ND.gdBqlda);
    await moSoCai(page, ma.cv);
    const dong = dongSoCai(page, ma.cv!).first();
    await dong.getByRole("button", { name: "Kết thúc" }).click();
    const hop = page.locator('[role="dialog"], div.fixed.inset-0').filter({ hasText: "Kết thúc phần việc" }).last();
    await hop.getByPlaceholder("Ví dụ: đã ký biên bản với 3 hộ").fill("Đã ký biên bản với 3 hộ");
    await hop.getByRole("button", { name: "Kết thúc phần của tôi" }).click();
    await expect(page.getByText(new RegExp(`BQLDA Quảng Trị đã kết thúc phần việc\\. ${ma.cv}: 1/2\\.`))).toBeVisible();
    await expect(dongSoCai(page, ma.cv!).first()).toContainText("1/2");
  });

  test("Trưởng P.ĐT&PC kết thúc phần còn lại → việc tự rời sổ cái vào lịch sử", async ({ moTrang }) => {
    const page = await moTrang(ND.truongDtpc);
    await moSoCai(page, ma.cv);
    await dongSoCai(page, ma.cv!).first().getByRole("button", { name: "Kết thúc" }).click();
    const hop = page.locator('[role="dialog"], div.fixed.inset-0').filter({ hasText: "Kết thúc phần việc" }).last();
    await hop.getByPlaceholder("Ví dụ: đã ký biên bản với 3 hộ").fill("Đã gửi công văn");
    await hop.getByRole("button", { name: "Kết thúc phần của tôi" }).click();
    await expect(page.getByText(new RegExp(`Đủ người kết thúc: ${ma.cv} tự rời sổ cái`))).toBeVisible();
    await expect(page.getByText("Vừa chuyển vào lịch sử")).toBeVisible();
    await expect(page.getByText(/hoàn thành, rời sổ cái/).first()).toBeVisible();

    await page.goto(`/cong-viec/${ma.cv}`);
    await expect(page.getByText(/Hoàn thành .*đã rời sổ cái/).first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("link", { name: "Sổ cái" }).first()).toBeVisible();
  });

  test("bộ lọc sổ cái: việc treo (chưa có hạn), quá hạn, không khớp", async ({ moTrang }) => {
    const page = await moTrang(ND.gdBqlda);
    await moSoCai(page);
    const chonHan = page.locator("main select").filter({ has: page.locator("option", { hasText: "Mọi hạn" }) });
    // Việc không có ngày kết thúc: "treo" (luôn mở) — lọc theo giá trị để không phụ thuộc cách gọi tên
    await chonHan.selectOption("treo");
    await expect(dongSoCai(page, "Chuyển mục đích đất rừng").first()).toBeVisible();
    await chonHan.selectOption("qua_han");
    await expect(dongSoCai(page, "Thi công móng trụ").first()).toBeVisible();
    await expect(dongSoCai(page, "Chuyển mục đích đất rừng")).toHaveCount(0);
    await page.getByPlaceholder("Lọc theo đơn vị, dự án, người…").fill("khong-co-viec-nao-nhu-the");
    await expect(page.getByText("Không có việc đang mở khớp bộ lọc.")).toBeVisible();
  });
});

test.describe.serial("Luồng 2: trả lại → gửi lại → chuyển tiếp, kèm file, gửi mới → hoàn thành", () => {
  test("SCI E&C gửi báo cáo tháng 7 cho P.ĐT&PC", async ({ moTrang }) => {
    const page = await moTrang(ND.nvEnc);
    await taiLenKiemTra(page, "BaoCao_Thang7_SCI_ENC.docx");
    await expect(page.getByText("Đủ điều kiện bắt buộc — gửi được")).toBeVisible();
    ma.enc = await xacNhanVaGui(page, "Gửi Phòng Đầu tư và Pháp chế");
  });

  test("P.ĐT&PC trả lại, lý do bắt buộc", async ({ moTrang }) => {
    const page = await moTrang(ND.truongDtpc);
    await page.goto(`/tai-lieu/${ma.enc}`);
    const main = page.locator("main");
    await main.getByRole("button", { name: "Trả lại", exact: true }).first().click();
    const lyDo = page.getByPlaceholder("vd thiếu số liệu thu vốn NK1");
    await expect(lyDo).toBeVisible();
    const xacNhan = main.getByRole("button", { name: "Trả lại", exact: true }).last();
    await expect(xacNhan).toBeDisabled();
    await lyDo.fill("thiếu số liệu thu vốn NK1");
    await xacNhan.click();
    await expect(page.getByText("Đã trả lại SCI E&C: “thiếu số liệu thu vốn NK1”.")).toBeVisible();
  });

  test("người gửi thấy Bị trả lại + lý do; chỉ còn Gửi lại hoặc Hoàn thành; gửi lại bản 2", async ({ moTrang }) => {
    const page = await moTrang(ND.nvEnc);
    await page.goto(`/tai-lieu/${ma.enc}`);
    const main = page.locator("main");
    await expect(main.getByText("Bị trả lại").first()).toBeVisible({ timeout: 60_000 });
    await expect(main.getByText(/Lý do: “thiếu số liệu thu vốn NK1”/).first()).toBeVisible();
    await expect(main.getByRole("button", { name: "Gửi lại bản đã sửa" })).toBeVisible();
    await expect(main.getByRole("button", { name: "Hoàn thành" })).toBeVisible();
    await expect(main.getByRole("button", { name: "Chuyển tiếp", exact: true })).toHaveCount(0);

    await main.getByRole("button", { name: "Gửi lại bản đã sửa" }).click();
    const [chon] = await Promise.all([page.waitForEvent("filechooser"), main.getByRole("button", { name: "Chọn bản đã sửa" }).click()]);
    await chon.setFiles(viDu("BaoCao_Thang7_SCI_ENC_ban2.docx"));
    const gl = main.getByRole("button", { name: "Gửi lại", exact: true });
    await expect(gl).toBeEnabled({ timeout: 90_000 });
    await xacNhanTrung(page);
    await gl.click();
    await expect(page.getByText("Đã gửi lại bản 2.")).toBeVisible({ timeout: 60_000 });
  });

  test("P.ĐT&PC nhận bản 2, chuyển tiếp nguyên văn, chuyển tiếp kèm file, gửi tài liệu mới", async ({ moTrang }) => {
    const page = await moTrang(ND.truongDtpc);
    await page.goto(`/tai-lieu/${ma.enc}`);
    const main = page.locator("main");
    await main.getByRole("button", { name: "Nhận", exact: true }).first().click();
    await expect(page.getByText(/Đã nhận\./)).toBeVisible();

    // Chuyển tiếp nguyên văn cho Ban TGĐ
    await main.getByRole("button", { name: "Chuyển tiếp", exact: true }).first().click();
    await expect(main.getByText("Gửi đúng tài liệu này, không thêm gì. Cùng hành trình; sổ cái không đổi.")).toBeVisible();
    await main.locator('button[title="Ban Tổng giám đốc"]').last().click();
    await main.getByRole("button", { name: "Chuyển tiếp", exact: true }).last().click();
    await expect(page.getByText("Đã chuyển tiếp nguyên văn.")).toBeVisible();

    // Chuyển tiếp + gửi kèm file thường cho P.TCKT
    await main.getByRole("button", { name: "Chuyển tiếp + gửi kèm" }).first().click();
    await main.locator('button[title="Phòng Tài chính Kế toán"]').last().click();
    const [chon] = await Promise.all([page.waitForEvent("filechooser"), main.getByRole("button", { name: "Chọn file gửi kèm" }).click()]);
    await chon.setFiles(viDu("YKien_PhapLy_ThuVon.docx"));
    await expect(main.getByText("file thường, không phải kiểm tra")).toBeVisible({ timeout: 60_000 });
    await main.getByRole("button", { name: "Chuyển tiếp kèm file" }).click();
    await expect(page.getByText(/Đã chuyển tiếp kèm YKien_PhapLy_ThuVon\.docx/)).toBeVisible();

    // Gửi tài liệu mới (liên quan) thẳng cho Phó TGĐ
    await main.getByRole("button", { name: "Gửi tài liệu mới" }).first().click();
    const [chon2] = await Promise.all([page.waitForEvent("filechooser"), main.getByRole("button", { name: "Chọn file tài liệu mới" }).click()]);
    await chon2.setFiles(viDuDoiTen("BaoCao_Tuan29_PDTPC.docx", "BaoCao_Tuan29_PDTPC_lienquan.docx"));
    await expect(main.getByText("Đủ điều kiện bắt buộc — gửi được")).toBeVisible({ timeout: 90_000 });
    const chip = main.locator('button[title="Ban Tổng giám đốc"]').last();
    if ((await chip.getAttribute("aria-pressed")) === "true") await chip.click();
    await main.locator("select").filter({ has: page.locator("option", { hasText: "Gửi thẳng một người…" }) }).last().selectOption(ND.phoTgd);
    await xacNhanTrung(page);
    await main.getByRole("button", { name: "Gửi tài liệu mới" }).last().click();
    await expect(page.getByText("Đã gửi tài liệu mới BaoCao_Tuan29_PDTPC_lienquan.docx.")).toBeVisible({ timeout: 60_000 });
  });

  test("P.TCKT hoàn thành nhánh của mình; cây hành trình ghi đủ", async ({ moTrang }) => {
    const page = await moTrang(ND.truongTckt);
    await page.goto(`/tai-lieu/${ma.enc}`);
    const main = page.locator("main");
    await main.getByRole("button", { name: "Hoàn thành" }).first().click();
    await expect(main.getByText("Nhận, lưu và dừng nhánh hành trình tại đây — không gửi đi đâu nữa.")).toBeVisible();
    await main.getByRole("button", { name: "Hoàn thành" }).last().click();
    await expect(page.getByText("Đã hoàn thành: nhánh hành trình dừng tại đây.")).toBeVisible({ timeout: 60_000 });

    const cay = main.locator("section, div").filter({ has: page.getByRole("heading", { name: "Cây hành trình" }) }).last();
    await expect(cay.getByText(/Dừng tại đây · hoàn thành bởi Vũ Đức Anh/)).toBeVisible();
    await expect(cay.getByText(/kèm YKien_PhapLy_ThuVon\.docx/).first()).toBeVisible();
    await expect(cay.getByText(/hành trình mới, liên quan tài liệu này/).first()).toBeVisible();
    await expect(cay.getByText("Bị trả lại").first()).toBeVisible();
    await expect(cay.getByText(/thiếu số liệu thu vốn NK1/).first()).toBeVisible();
  });
});

test.describe("Kiểm tra từ chối file sai", () => {
  test("file không theo mẫu nào", async ({ moTrang }) => {
    const page = await moTrang(ND.nvBqlda);
    await taiLenKiemTra(page, "BaoCao_SaiMau.docx");
    await expect(page.getByText(/Chưa đạt: \d+ lỗi chặn gửi/)).toBeVisible();
    await expect(page.getByText(/Không nhận ra mẫu/).first()).toBeVisible();
  });

  test("file mất ô nhập và thiếu mục bắt buộc", async ({ moTrang }) => {
    const page = await moTrang(ND.nvBqlda);
    await taiLenKiemTra(page, "BaoCao_Tuan29_BQLDA_MatO.docx");
    await expect(page.getByText(/Chưa đạt: \d+ lỗi chặn gửi/)).toBeVisible();
    await expect(page.getByText(/Thiếu mục/).first()).toBeVisible();
    await expect(page.getByText(/Mất ô nhập/).first()).toBeVisible();
  });

  test("người chưa gán đơn vị: kiểm tra thử được nhưng không gửi được", async ({ moTrang }) => {
    const page = await moTrang(ND.nguoiMoi);
    await page.goto("/soan-gui");
    await expect(page.getByText(/Bạn chưa được gán đơn vị nên chưa gửi được tài liệu/)).toBeVisible();
  });
});
