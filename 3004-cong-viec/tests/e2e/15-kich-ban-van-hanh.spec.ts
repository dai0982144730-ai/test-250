// KỊCH BẢN VẬN HÀNH MỘT TUẦN BÁO CÁO — mỗi bước một người đăng nhập đúng vai, làm trên giao diện.
// Đặc tả: tests/e2e/KICH-BAN-VAN-HANH.md. Báo cáo sinh ngay khi chạy theo ngày hôm nay
// (scripts/tao-bao-cao-kich-ban.mjs) nên trạng thái hạn trên sổ cái luôn như kịch bản.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { request as taoRequest } from "@playwright/test";
import { test, expect, ND, MA_CHAY, GOC, viDuDoiTen, maTuUrl, thanhBen } from "./co-so";
import { DAT, INPUT_BAN_SUA, bamGui, dongSoCai, ketThucPhan, moSoCai, moTaiLieu, ngayNgan, nhan, quyetDinhTrung, taiLenKiemTra } from "./nghiep-vu";
import { taoBoBaoCao, type KichBan } from "../../scripts/tao-bao-cao-kich-ban.mjs";

test.describe.configure({ mode: "serial" });

let kb: KichBan;
let thuMuc = "";
const tep = (ten: string) => path.join(thuMuc, ten);
const bc = (ma: string) => kb.baoCao.find((b) => b.ma === ma)!;

/** Mã tài liệu / mã việc sinh ra trong kịch bản, truyền giữa các bước. */
const ma: Record<string, string> = {};

test.beforeAll(async () => {
  const r = await taoBoBaoCao(path.join(os.tmpdir(), `docflow-kich-ban-${MA_CHAY}`));
  kb = r.kb;
  thuMuc = r.thuMuc;
});

test.describe("Kịch bản vận hành một tuần báo cáo", () => {
  // ───────────── Buổi sáng: các đơn vị cấp 3 gửi báo cáo lên phòng quản lý ─────────────

  test("1. Lý Thị Nga (NV BQLDA): quên ô Người lập bị chặn → tải bản sửa → gửi P.ĐT&PC", async ({ moTrang }) => {
    const page = await moTrang(ND.nvBqlda);
    await taiLenKiemTra(page, tep(kb.banPhu.bqldaThieuNguoiLap.tep));
    await expect(page.getByText(/Chưa đạt: 1 lỗi chặn gửi/)).toBeVisible();
    await expect(page.getByText(/Ô "Người lập" còn để "\.\.\.\.\.\.", cần điền/).first()).toBeVisible();
    await expect(page.getByText("Nút Gửi bị khóa: còn lỗi mức chặn.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Gửi Phòng Đầu tư và Pháp chế", exact: true })).toBeDisabled();

    await page.locator(INPUT_BAN_SUA).first().setInputFiles(tep(bc("form-7").tep));
    await expect(page.getByText(DAT)).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText(new RegExp(`Tuần ${kb.tuan}/${kb.nam}`)).first()).toBeVisible();
    // Báo cáo đầu của đơn vị: mọi việc là việc mới (dù sổ cái có việc cũ na ná tên)
    ma.bqlda = await bamGui(page, "Gửi Phòng Đầu tư và Pháp chế", []);
  });

  test("2. Ngô Văn Bình (GĐ SCI PMC): gửi báo cáo có một việc đã quá hạn → P.ĐT&PC", async ({ moTrang }) => {
    const page = await moTrang(ND.gdPmc);
    await taiLenKiemTra(page, tep(bc("form-5").tep));
    await expect(page.getByText(DAT)).toBeVisible();
    // Việc quá hạn: hệ thống chỉ nhắc (không chặn)
    await expect(page.getByText(/phải sau hoặc bằng ô "Ngày lập"/).first()).toBeVisible();
    ma.pmc = await bamGui(page, "Gửi Phòng Đầu tư và Pháp chế", []);
  });

  test("3. Đặng Thị Hoa (NV SCI E&C): gửi báo cáo tháng → P.ĐT&PC", async ({ moTrang }) => {
    const page = await moTrang(ND.nvEnc);
    await taiLenKiemTra(page, tep(bc("form-6").tep));
    await expect(page.getByText(DAT)).toBeVisible();
    ma.enc = await bamGui(page, "Gửi Phòng Đầu tư và Pháp chế", []);
  });

  test("4. Mai Văn Sơn (GĐ NM Nậm Xe): gửi báo cáo → P.KT&VH", async ({ moTrang }) => {
    const page = await moTrang(ND.gdNamXe);
    await taiLenKiemTra(page, tep(bc("form-8").tep));
    await expect(page.getByText(DAT)).toBeVisible();
    await expect(page.locator('button[title="Phòng Kinh tế và Vận hành"]')).toHaveAttribute("aria-pressed", "true");
    ma.namxe = await bamGui(page, "Gửi Phòng Kinh tế và Vận hành", []);
  });

  test("5. Hoàng Thị Mai (Văn thư): vào sổ công văn UBND huyện, chuyển P.ĐT&PC xử lý", async ({ moTrang }) => {
    const page = await moTrang(ND.vanThu);
    await page.goto("/van-thu");
    const o = (nhan: string) => page.locator("label").filter({ hasText: nhan }).locator("input, select, textarea").first();
    await o("Nơi gửi (cơ quan, đối tác)").fill(`UBND huyện Hướng Hóa (${MA_CHAY})`);
    await o("Số, ký hiệu").fill("215/UBND-TNMT");
    await o("Trích yếu").fill("V/v đơn giá bồi thường GPMB Trụ T11");
    await o("Ngày văn bản").fill(`${kb.h(-2).slice(6)}-${kb.h(-2).slice(3, 5)}-${kb.h(-2).slice(0, 2)}`);
    await o("Chuyển đơn vị xử lý").selectOption({ label: "Phòng Đầu tư và Pháp chế" });
    const [chon] = await Promise.all([page.waitForEvent("filechooser"), page.getByRole("button", { name: /Chọn file \(bản chụp giấy hoặc file email\)/ }).click()]);
    await chon.setFiles(viDuDoiTen("YKien_PhapLy_ThuVon.docx", `CongVan_215_UBND_${MA_CHAY}.docx`));
    await page.getByRole("button", { name: "Vào sổ", exact: true }).click();
    await expect(page.getByText(/Đã vào sổ văn bản đến số \d+\/\d{4} và chuyển đơn vị xử lý\./)).toBeVisible();
    const dong = page.locator("main tr").filter({ hasText: `UBND huyện Hướng Hóa (${MA_CHAY})` });
    ma.congVan = maTuUrl(await dong.getByRole("link").first().getAttribute("href"));
  });

  // ───────────── Trưởng phòng xử lý hộp Đến ─────────────

  test("6. Lê Minh Tuấn (Trưởng P.ĐT&PC): Hộp Đến có 4 tài liệu; nhận 3, trả lại báo cáo SCI E&C", async ({ moTrang }) => {
    const page = await moTrang(ND.truongDtpc);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Hộp Đến của tôi" })).toBeVisible();
    // 3 báo cáo (theo tên file) + công văn văn thư chuyển (theo trích yếu)
    const hopDen = page.locator("main");
    for (const t of [bc("form-7").tep, bc("form-5").tep, bc("form-6").tep, "V/v đơn giá bồi thường GPMB Trụ T11"]) {
      await expect(hopDen.getByText(t, { exact: true }).first()).toBeVisible();
    }
    await expect(hopDen.getByText(/Chuyển tiếp nguyên văn · Hoàng Thị Mai \(P\.HCTH\) → P\.ĐT&PC/)).toBeVisible();

    await nhan(page, ma.bqlda);
    await nhan(page, ma.pmc);
    await nhan(page, ma.congVan);

    const main = await moTaiLieu(page, ma.enc);
    await main.getByRole("button", { name: "Trả lại", exact: true }).first().click();
    await page.getByPlaceholder("vd thiếu số liệu thu vốn NK1").fill("Thiếu số liệu thu vốn đợt 5 — bổ sung biên bản nghiệm thu");
    await main.getByRole("button", { name: "Trả lại", exact: true }).last().click();
    await expect(page.getByText("Đã trả lại SCI E&C: “Thiếu số liệu thu vốn đợt 5 — bổ sung biên bản nghiệm thu”.")).toBeVisible();
  });

  test("7. Đặng Thị Hoa: nhận thông báo Bị trả lại, sổ cái tạm dừng việc; gửi lại bản 2", async ({ moTrang }) => {
    const page = await moTrang(ND.nvEnc);
    await page.goto("/thong-bao");
    await expect(page.getByText(/Bị trả lại/).first()).toBeVisible();

    await moSoCai(page, "Đập chính Nậm Mô 1 đạt 90%");
    await expect(dongSoCai(page, "Đập chính Nậm Mô 1 đạt 90%").first()).toContainText("Chờ sửa: tài liệu nguồn bị trả lại");

    const main = await moTaiLieu(page, ma.enc);
    await expect(main.getByText(/Lý do: “Thiếu số liệu thu vốn đợt 5/).first()).toBeVisible();
    await expect(main.getByRole("button", { name: "Chuyển tiếp", exact: true })).toHaveCount(0);
    await main.getByRole("button", { name: "Gửi lại bản đã sửa" }).click();
    const [chon] = await Promise.all([page.waitForEvent("filechooser"), main.getByRole("button", { name: "Chọn bản đã sửa" }).click()]);
    await chon.setFiles(tep(kb.banPhu.encBan2.tep));
    const gl = main.getByRole("button", { name: "Gửi lại", exact: true });
    await expect(gl).toBeEnabled({ timeout: 90_000 });
    // Bản 2 đè đúng các việc của chính bản 1
    await quyetDinhTrung(main, ["Đập chính Nậm Mô 1 đạt 90%", "Thu vốn đợt 5", "Lắp đặt turbine tổ máy 1"]);
    await gl.click();
    await expect(page.getByText("Đã gửi lại bản 2.")).toBeVisible({ timeout: 60_000 });
  });

  test("8. Lê Minh Tuấn: nhận bản 2 của SCI E&C → việc hết tạm dừng", async ({ moTrang }) => {
    const page = await moTrang(ND.truongDtpc);
    await nhan(page, ma.enc);
    await moSoCai(page, "Đập chính Nậm Mô 1 đạt 90%");
    await expect(dongSoCai(page, "Đập chính Nậm Mô 1 đạt 90%").first()).not.toContainText("Chờ sửa");
  });

  test("9. Đỗ Quang Vinh (Trưởng P.KT&VH): nhận báo cáo Nậm Xe, chuyển tiếp nguyên văn lên Ban TGĐ", async ({ moTrang }) => {
    const page = await moTrang(ND.truongKtvh);
    await nhan(page, ma.namxe);
    const main = page.locator("main");
    await main.getByRole("button", { name: "Chuyển tiếp", exact: true }).first().click();
    await main.locator('button[title="Ban Tổng giám đốc"]').last().click();
    await main.getByRole("button", { name: "Chuyển tiếp", exact: true }).last().click();
    await expect(page.getByText("Đã chuyển tiếp nguyên văn.")).toBeVisible();
  });

  // ───────────── Buổi chiều: các phòng gửi báo cáo lên Ban TGĐ (sổ cái đè theo cấp) ─────────────

  test("10. Phạm Thu Hà (NV P.ĐT&PC): gửi báo cáo phòng — việc GPMB đè bản của BQLDA", async ({ moTrang }) => {
    const page = await moTrang(ND.nvDtpc);
    await taiLenKiemTra(page, tep(bc("form-1").tep));
    await expect(page.getByText(DAT)).toBeVisible();
    ma.pdtpc = await bamGui(page, "Gửi Ban Tổng giám đốc", ["GPMB Trụ T11"]);
  });

  test("11. Trần Văn Hùng (NV P.KT&VH): gửi báo cáo phòng — việc relay R21 đè bản của nhà máy", async ({ moTrang }) => {
    const page = await moTrang(ND.hungTv);
    await taiLenKiemTra(page, tep(bc("form-2").tep));
    await expect(page.getByText(DAT)).toBeVisible();
    ma.pktvh = await bamGui(page, "Gửi Ban Tổng giám đốc", ["Thay relay bảo vệ R21"]);
  });

  test("12. Hoàng Thị Mai (Văn thư P.HCTH): gửi báo cáo P.HCTH", async ({ moTrang }) => {
    const page = await moTrang(ND.vanThu);
    await taiLenKiemTra(page, tep(bc("form-3").tep));
    await expect(page.getByText(DAT)).toBeVisible();
    ma.phcth = await bamGui(page, "Gửi Ban Tổng giám đốc", []);
  });

  test("13. Vũ Đức Anh (KTT P.TCKT): gửi báo cáo P.TCKT — việc thu vốn đè bản của SCI E&C", async ({ moTrang }) => {
    const page = await moTrang(ND.truongTckt);
    await taiLenKiemTra(page, tep(bc("form-4").tep));
    await expect(page.getByText(DAT)).toBeVisible();
    ma.ptckt = await bamGui(page, "Gửi Ban Tổng giám đốc", ["Thu vốn đợt 5"]);
  });

  test("14. Tổng Giám đốc xem sổ cái: nguồn hiện hành là bản của cấp cao hơn, đủ các trạng thái hạn", async ({ moTrang }) => {
    const page = await moTrang(ND.tgd);
    await moSoCai(page, "GPMB Trụ T11");
    const gpmb = dongSoCai(page, "GPMB Trụ T11").first();
    await expect(gpmb).toContainText(/nguồn: Phòng Đầu tư và Pháp chế · Form 1/);
    await expect(gpmb).toContainText(ngayNgan(kb.h(20)));
    await expect(gpmb).toContainText(/đã đè 1 bản/);

    await moSoCai(page, "relay R21");
    const relay = dongSoCai(page, "Thay relay bảo vệ R21").first();
    await expect(relay).toContainText(/nguồn: Phòng Kinh tế và Vận hành · Form 2/);
    await expect(relay).toContainText(ngayNgan(kb.h(13)));

    await moSoCai(page, "Thu vốn đợt 5");
    const thuVon = dongSoCai(page, "Thu vốn đợt 5").first();
    await expect(thuVon).toContainText(/nguồn: Phòng Tài chính Kế toán · Form 4/);
    await expect(thuVon).toContainText(ngayNgan(kb.h(17)));

    // Lọc theo hạn
    await moSoCai(page);
    const chonHan = page.locator("main select").filter({ has: page.locator("option", { hasText: "Mọi hạn" }) });
    await chonHan.selectOption("qua_han");
    await expect(dongSoCai(page, "Nghiệm thu đập chính Nậm Khiên 1").first()).toBeVisible();
    await chonHan.selectOption("sap_den_han");
    await expect(dongSoCai(page, "Thi công móng trụ T5–T8").first()).toBeVisible();
    await chonHan.selectOption("treo");
    await expect(dongSoCai(page, "Chuyển mục đích đất rừng T14–T16").first()).toBeVisible();
    await expect(dongSoCai(page, "Mua sắm thiết bị văn phòng").first()).toBeVisible();
  });

  // ───────────── Ban TGĐ: tổng hợp và quyết định ─────────────

  test("15. Phó TGĐ: gửi báo cáo hợp nhất (Form 0) có nội dung cần TGĐ quyết định", async ({ moTrang }) => {
    const page = await moTrang(ND.phoTgd);
    await taiLenKiemTra(page, tep(bc("form-0").tep));
    await expect(page.getByText(DAT)).toBeVisible();
    await expect(page.getByText("Chờ TGĐ quyết định").first()).toBeVisible();
    ma.f0 = await bamGui(page, "Gửi Ban Tổng giám đốc", []);
  });

  test("16. Tổng Giám đốc: nhận các báo cáo phòng, quyết định giao việc GPMB (cấp 1, đè việc đang mở)", async ({ moTrang }) => {
    const page = await moTrang(ND.tgd);
    for (const id of [ma.pdtpc, ma.pktvh, ma.phcth, ma.ptckt]) await nhan(page, id);

    await moTaiLieu(page, ma.f0);
    await expect(page.getByText("Nội dung cần TGĐ quyết định")).toBeVisible({ timeout: 60_000 });
    const dong = page.locator("div.rounded-sm.border").filter({ hasText: "Chi trả GPMB Trụ T11" }).filter({ has: page.getByRole("button") }).last();
    await expect(dong).toContainText(/có vẻ trùng CV-/);
    await dong.getByRole("button", { name: "Quyết định, giao việc" }).click();

    const hop = page.locator('[role="dialog"], div.fixed.inset-0').filter({ hasText: "Phần việc (ngày trống = luôn mở)" }).last();
    await hop.getByLabel("Dự án").fill("ĐG Hướng Việt");
    await expect(hop.locator("select").filter({ has: page.locator("option", { hasText: "Tạo việc mới" }) })).not.toHaveValue("");
    const chonPt = hop.locator("select").filter({ has: page.locator("option", { hasText: "— Chọn người / đơn vị —" }) });
    await expect(chonPt).toHaveCount(2);
    await hop.getByPlaceholder("Nội dung phần việc (trống = tên việc)").nth(0).fill("Chi trả bồi thường cho 3 hộ theo đơn giá mới");
    await hop.getByPlaceholder("Nội dung phần việc (trống = tên việc)").nth(1).fill("Trình UBND huyện phương án bồi thường");
    const iso = (dmy: string) => `${dmy.slice(6)}-${dmy.slice(3, 5)}-${dmy.slice(0, 2)}`;
    for (const o of await hop.getByLabel("Bắt đầu").all()) await o.fill(iso(kb.h(0)));
    for (const o of await hop.getByLabel("Kết thúc").all()) await o.fill(iso(kb.h(15)));
    await hop.getByRole("button", { name: "Quyết định, giao việc" }).last().click();
    const bao = page.getByText(/Đã quyết định, giao việc CV-\d{4}-\d+/);
    await expect(bao).toBeVisible({ timeout: 30_000 });
    ma.cvGpmb = (await bao.textContent())!.match(/CV-\d{4}-\d+/)![0];

    await moSoCai(page, ma.cvGpmb);
    const d = dongSoCai(page, ma.cvGpmb).first();
    await expect(d).toContainText("0/2");
    await expect(d).toContainText(ngayNgan(kb.h(15)));
  });

  // ───────────── Thực hiện và kết thúc việc ─────────────

  test("17. Trịnh Văn Dũng (GĐ BQLDA): thấy việc trên Tổng quan, kết thúc phần của BQLDA (1/2)", async ({ moTrang }) => {
    const page = await moTrang(ND.gdBqlda);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Phần việc của tôi" })).toBeVisible();
    await expect(page.locator("main").getByText(/GPMB Trụ T11/).first()).toBeVisible();
    await ketThucPhan(page, ma.cvGpmb, "Đã chi trả cho 3 hộ, có biên bản ký nhận");
    await expect(page.getByText(new RegExp(`BQLDA Quảng Trị đã kết thúc phần việc\\. ${ma.cvGpmb}: 1/2\\.`))).toBeVisible();
  });

  test("18. Trần Văn Hùng (NV phòng khác): không có quyền kết thúc việc của đơn vị khác", async ({ moTrang }) => {
    const page = await moTrang(ND.hungTv);
    await moSoCai(page, ma.cvGpmb);
    await expect(dongSoCai(page, ma.cvGpmb).first()).toBeVisible();
    await expect(dongSoCai(page, ma.cvGpmb).first().getByRole("button", { name: "Kết thúc" })).toHaveCount(0);
  });

  test("19. Lê Minh Tuấn: kết thúc phần còn lại → việc tự rời sổ cái vào lịch sử", async ({ moTrang }) => {
    const page = await moTrang(ND.truongDtpc);
    await ketThucPhan(page, ma.cvGpmb, "UBND huyện đã phê duyệt phương án");
    await expect(page.getByText(new RegExp(`Đủ người kết thúc: ${ma.cvGpmb} tự rời sổ cái`))).toBeVisible();
    await expect(page.getByText("Vừa chuyển vào lịch sử")).toBeVisible();
    await page.goto(`/cong-viec/${ma.cvGpmb}`);
    await expect(page.getByText(/Hoàn thành .*đã rời sổ cái/).first()).toBeVisible({ timeout: 60_000 });
  });

  // ───────────── Cuối ngày: kiểm soát của quản trị ─────────────

  test("20. Cây hành trình báo cáo Nậm Xe ghi đủ đường đi: nhà máy → P.KT&VH → Ban TGĐ", async ({ moTrang }) => {
    const page = await moTrang(ND.gdNamXe);
    const main = await moTaiLieu(page, ma.namxe);
    const cay = main.locator("section, div").filter({ has: page.getByRole("heading", { name: "Cây hành trình" }) }).last();
    await expect(cay.getByText("Phòng Kinh tế và Vận hành").first()).toBeVisible();
    await expect(cay.getByText("Ban Tổng giám đốc").first()).toBeVisible();
    await expect(cay.getByText("Chuyển tiếp nguyên văn").first()).toBeVisible();
  });

  test("21. Quản trị viên: lịch sử toàn vẹn, ghi đủ quá trình việc GPMB", async ({ moTrang }) => {
    const page = await moTrang(ND.quanTri);
    await page.goto("/lich-su");
    await page.getByPlaceholder("Tên tài liệu, mã việc, tên file, lý do…").fill(ma.cvGpmb);
    await page.getByRole("button", { name: "Tìm", exact: true }).click();
    await expect(page.locator("main table tbody tr").first()).toBeVisible({ timeout: 30_000 });
    expect(await page.locator("main table tbody tr").count()).toBeGreaterThanOrEqual(3);
    await page.getByRole("button", { name: "Kiểm tra toàn vẹn" }).first().click();
    await expect(page.getByText(/Nguyên vẹn: [\d.]+ dòng, chuỗi băm khớp/)).toBeVisible({ timeout: 60_000 });
  });

  test("22. Quản trị viên: thông báo email của cả ngày nằm trong hàng đợi, bấm Gửi ngay thì ghi ra file thư", async ({ moTrang }) => {
    const page = await moTrang(ND.quanTri);
    const hd = await (await page.request.get("/api/email/hang-doi?gioi_han=200&trang_thai=")).json();
    const tong = (hd.dem?.cho ?? 0) + (hd.dem?.da_gui ?? 0) + (hd.dem?.dang_gui ?? 0) + (hd.dem?.loi ?? 0);
    expect(tong, "các thao tác trong ngày phải sinh thư thông báo").toBeGreaterThan(0);

    await page.goto("/cai-dat?nhom=thong_bao");
    await expect(page.getByText("Chế độ thử (không gửi thật)")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Gửi ngay" }).click();
    await expect(page.getByText("Đã chạy bộ gửi một lượt")).toBeVisible();
    // Thư thử của máy chủ đang chạy kịch bản (mỗi cổng một thư mục tạm, xem may-chu.mjs)
    const cong = new URL(test.info().project.use.baseURL!).port;
    const thuMucThu = path.join(GOC, "tests", "e2e", ".tam", cong, "email-thu");
    await expect.poll(() => (fs.existsSync(thuMucThu) ? fs.readdirSync(thuMucThu).filter((f) => f.endsWith(".eml")).length : 0), { timeout: 30_000 }).toBeGreaterThan(0);
  });

  test("23. Agent tiến độ đọc sổ cái bằng khóa riêng: thấy việc thu vốn theo nguồn P.TCKT, việc GPMB đã rời sổ", async ({ moTrang }, info) => {
    const page = await moTrang(ND.quanTri);
    await page.goto("/quan-tri/khoa-agent");
    await page.getByPlaceholder("vd Agent tiến độ").fill(`Agent tiến độ ${MA_CHAY}`);
    await page.getByRole("button", { name: "Cấp khóa" }).click();
    const khoa = (await page.locator("code").filter({ hasText: /^dfk_/ }).first().innerText()).trim();

    const api = await taoRequest.newContext({ baseURL: info.project.use.baseURL });
    const goi = async (tham_so: Record<string, unknown>) =>
      (await api.post("/api/mcp/socai", { headers: { Authorization: `Bearer ${khoa}` }, data: { cong_cu: "socai.danh_sach_viec", tham_so } })).json();
    const thuVon = await goi({ tu_khoa: "Thu vốn đợt 5", gioi_han: 10 });
    expect(thuVon.ok).toBe(true);
    expect(thuVon.du_lieu.viec.length).toBeGreaterThan(0);
    expect(JSON.stringify(thuVon.du_lieu.viec[0].nguon_hien_hanh)).toContain("Tài chính");
    const gpmb = await goi({ tu_khoa: ma.cvGpmb, gioi_han: 10 });
    expect(gpmb.du_lieu.viec.filter((v: { ma_viec: string }) => v.ma_viec === ma.cvGpmb)).toHaveLength(0);
    await api.dispose();
  });

  test("24. Mỗi vai chỉ thấy đúng phần của mình trên thanh bên", async ({ moTrang }) => {
    for (const [email, thayQuanTri] of [
      [ND.quanTri, true],
      [ND.tgd, false],
      [ND.nvBqlda, false],
    ] as const) {
      const page = await moTrang(email);
      await page.goto("/");
      await expect(thanhBen(page).getByRole("link", { name: "Sổ cái", exact: true })).toBeVisible();
      await expect(thanhBen(page).getByRole("link", { name: "Quản trị", exact: true })).toHaveCount(thayQuanTri ? 1 : 0);
    }
  });
});
