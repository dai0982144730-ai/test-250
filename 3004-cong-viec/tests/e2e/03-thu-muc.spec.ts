// Thư mục: cây 9 đơn vị, tải lên nhiều file, bản mới, xem trước Word, tải về, xóa/hoàn tác/thùng rác/khôi phục,
// thư mục con trong Dự án, tìm Ctrl+K, kéo thả, phân quyền theo vai, trang chi tiết tài liệu.
import fs from "node:fs";
import { test, expect, ND, MA_CHAY, MIME_DOCX, viDu, viDuDoiTen, dangNhapApi, tm } from "./co-so";

test.describe.configure({ mode: "serial" });

const A = `E2E_${MA_CHAY}_A.docx`;
const A2 = `E2E_${MA_CHAY}_A_v2.docx`;
const B = `E2E_${MA_CHAY}_B.docx`;
const VT = `E2E_${MA_CHAY}_VT.docx`;

test.describe("Thư mục", () => {
  test("cây 9 đơn vị, mặc định mở thư mục Đến của đơn vị mình", async ({ page, context }) => {
    await dangNhapApi(context, ND.quanTri);
    await page.goto("/thu-muc");
    await expect(page.getByRole("heading", { name: "Thư mục" })).toBeVisible();
    const cay = tm.cay(page);
    await expect(cay.getByRole("button", { name: /^Công ty CP SCI/ })).toBeVisible();
    await expect(cay.getByRole("button", { name: /^Đơn vị/ })).toBeVisible();
    for (const dv of [
      "Ban Tổng giám đốc",
      "Phòng Đầu tư và Pháp chế",
      "Phòng Kinh tế và Vận hành",
      "Phòng Tài chính Kế toán",
      "SCI PMC",
      "SCI E&C",
      "BQLDA Quảng Trị",
      "Nhà máy thủy điện Nậm Xe",
    ]) {
      await expect(cay.getByRole("button", { name: dv, exact: true })).toBeVisible();
    }
    await expect(cay.getByRole("button", { name: /Phòng Hành chính Tổng hợp.*của tôi/ })).toBeVisible();
    await expect(page).toHaveURL(/\/thu-muc\?tm=/);
    const nd = tm.noiDung(page);
    await expect(nd.getByText(/trưởng đơn vị: Nguyễn Thị Lan/)).toBeVisible();
    await expect(nd.getByRole("button", { name: "Tải lên" })).toBeEnabled();

    // Mở đơn vị khác: hiện các thư mục con mặc định
    await cay.getByRole("button", { name: "Nhà máy thủy điện Nậm Xe", exact: true }).click();
    for (const tm of ["Đến", "Đi", "Dự án", "Thùng rác"]) {
      await expect(nd.getByRole("button", { name: new RegExp(`^${tm}(\\s\\d+)?$`) }).first()).toBeVisible();
    }
  });

  test("tải lên nhiều file, xem trước Word, tải về", async ({ page, context }) => {
    await dangNhapApi(context, ND.quanTri);
    await page.goto("/thu-muc");
    const nd = tm.noiDung(page);
    await expect(nd.getByRole("button", { name: "Tải lên" })).toBeEnabled();
    await page.locator('main input[type="file"][multiple]').setInputFiles([
      viDuDoiTen("YKien_PhapLy_ThuVon.docx", A),
      viDuDoiTen("BaoCao_SaiMau.docx", B),
    ]);
    await expect(page.getByText("Đã tải lên 2 file vào Đến.")).toBeVisible();
    for (const ten of [A, B]) {
      const dong = tm.dong(page, ten);
      await expect(dong).toContainText("bản 1");
      await expect(dong).toContainText("Quản trị viên");
    }

    // Xem trước
    await tm.dong(page, A).getByRole("button", { name: "Xem trước" }).click();
    const hop = page.getByRole("dialog");
    await expect(hop).toContainText(A);
    await expect(hop.getByText("Ý KIẾN PHÁP LÝ VỀ THU VỐN ĐỢT 4", { exact: false })).toBeVisible({ timeout: 60_000 });
    await expect(hop.getByText(/Bản xem nhanh trên web: giữ chữ, bảng, định dạng chính/)).toBeVisible();

    // Tải về đúng tên file
    const [tai] = await Promise.all([page.waitForEvent("download"), hop.getByRole("link", { name: "Tải về" }).first().click()]);
    expect(tai.suggestedFilename()).toBe(A);
    await page.keyboard.press("Escape");
    await expect(hop).toBeHidden();
  });

  test("tải bản mới: bản cũ vẫn giữ, xem được từng bản và dòng thời gian", async ({ page, context }) => {
    await dangNhapApi(context, ND.quanTri);
    await page.goto("/thu-muc");
    const [chon] = await Promise.all([
      page.waitForEvent("filechooser"),
      tm.dong(page, A).getByRole("button", { name: "Tải bản mới (bản cũ vẫn giữ)" }).click(),
    ]);
    await chon.setFiles(viDuDoiTen("BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx", A2));
    await expect(page.getByText(`Đã tải bản 2 của ${A2}. Bản cũ vẫn giữ trong lịch sử.`)).toBeVisible();
    await expect(tm.dong(page, A2)).toContainText("bản 2");

    await tm.dong(page, A2).getByRole("button", { name: "Xem trước" }).click();
    const hop = page.getByRole("dialog");
    await expect(hop.getByRole("button", { name: /^Bản 2/ })).toBeVisible();
    await expect(hop.getByText("BQLDA QUẢNG TRỊ").first()).toBeVisible({ timeout: 60_000 });
    await hop.getByRole("button", { name: /^Bản 1/ }).click();
    await expect(hop.getByText("(bản cũ)")).toBeVisible();
    await expect(hop.getByText("Ý KIẾN PHÁP LÝ", { exact: false }).first()).toBeVisible({ timeout: 60_000 });

    await hop.getByRole("button", { name: "Lịch sử", exact: true }).click();
    await expect(hop.getByRole("heading", { name: `Dòng thời gian của ${A2}` })).toBeVisible();
    await expect(hop.getByText(/— Tải lên/)).toHaveCount(2);
    await expect(hop.getByText(/— Mở xem/).first()).toBeVisible();
    await expect(hop.getByRole("button", { name: "Mở bản 1" })).toBeVisible();
    await expect(hop.getByRole("button", { name: "Mở bản 2" })).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("xóa → hoàn tác → xóa lại → thùng rác → khôi phục", async ({ page, context }) => {
    await dangNhapApi(context, ND.quanTri);
    await page.goto("/thu-muc");
    await tm.dong(page, B).getByRole("button", { name: "Xóa" }).click();
    const toast = page.getByRole("status").filter({ hasText: "vào Thùng rác" });
    await expect(toast).toContainText(`Đã chuyển "${B}" vào Thùng rác. Lịch sử vẫn ghi: Quản trị viên xóa lúc`);
    await expect(tm.dong(page, B)).toHaveCount(0);
    await toast.getByRole("button", { name: "Hoàn tác" }).click();
    await expect(page.getByText("Đã khôi phục tài liệu về thư mục cũ.")).toBeVisible();
    await expect(tm.dong(page, B)).toHaveCount(1);

    await tm.dong(page, B).getByRole("button", { name: "Xóa" }).click();
    await expect(tm.dong(page, B)).toHaveCount(0);
    await tm.cay(page).getByRole("button", { name: /^Thùng rác/ }).first().click();
    const nd = tm.noiDung(page);
    for (const cot of ["Từ thư mục", "Người xóa", "Lúc xóa", "Giữ đến"]) await expect(nd.getByRole("columnheader", { name: cot })).toBeVisible();
    await expect(nd.getByText(/Thùng rác giữ 30 ngày rồi ẩn đi/)).toBeVisible();
    await expect(nd.getByRole("button", { name: "Tải lên" })).toHaveCount(0);
    await expect(tm.dong(page, B)).toContainText("Quản trị viên");
    await tm.dong(page, B).getByRole("button", { name: "Khôi phục" }).click();
    await expect(page.getByText("Đã khôi phục tài liệu về thư mục cũ.")).toBeVisible();
    await expect(tm.dong(page, B)).toHaveCount(0);
  });

  test("thư mục con chỉ tạo được trong nhánh Dự án, không trùng tên", async ({ page, context }) => {
    await dangNhapApi(context, ND.quanTri);
    await page.goto("/thu-muc");
    const nd = tm.noiDung(page);
    await expect(nd.getByRole("button", { name: "Thư mục mới" })).toHaveCount(0); // đang ở Đến
    await tm.cay(page).getByRole("button", { name: /^Dự án/ }).first().click();
    const ten = `E2E ${MA_CHAY}`;
    await nd.getByRole("button", { name: "Thư mục mới" }).click();
    await page.getByPlaceholder("Tên thư mục, vd: Thủy điện Nậm Xe 2").fill(ten);
    await page.getByRole("button", { name: "Tạo", exact: true }).click();
    await expect(nd.getByText("Thư mục trống. Kéo thả file vào đây hoặc bấm Tải lên.")).toBeVisible();
    await expect(tm.cay(page).getByRole("button", { name: ten })).toBeVisible();

    await tm.cay(page).getByRole("button", { name: /^Dự án/ }).first().click();
    await nd.getByRole("button", { name: "Thư mục mới" }).click();
    await page.getByPlaceholder("Tên thư mục, vd: Thủy điện Nậm Xe 2").fill(ten);
    await page.getByRole("button", { name: "Tạo", exact: true }).click();
    await expect(page.getByText(`Đã có thư mục "${ten}"`)).toBeVisible();
  });

  test("kéo thả file vào thư mục trống", async ({ page, context }) => {
    await dangNhapApi(context, ND.quanTri);
    await page.goto("/thu-muc");
    const cay = tm.cay(page);
    await cay.getByRole("button", { name: "SCI PMC", exact: true }).click();
    // Thư mục Đi của SCI PMC (đơn vị vừa mở là đơn vị cuối cùng được mở)
    await cay.getByRole("button", { name: /^Đi(\s\d+)?$/ }).last().click();
    const nd = tm.noiDung(page);
    await expect(nd.getByText("Thư mục trống. Kéo thả file vào đây hoặc bấm Tải lên.")).toBeVisible();
    const ten = `E2E_${MA_CHAY}_keo-tha.docx`;
    const b64 = fs.readFileSync(viDu("YKien_PhapLy_ThuVon.docx")).toString("base64");
    const dt = await page.evaluateHandle(
      ({ b64, ten, mime }) => {
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const d = new DataTransfer();
        d.items.add(new File([bytes], ten, { type: mime }));
        return d;
      },
      { b64, ten, mime: MIME_DOCX },
    );
    await nd.dispatchEvent("dragover", { dataTransfer: dt });
    await nd.dispatchEvent("drop", { dataTransfer: dt });
    await expect(page.getByText("Đã tải lên 1 file vào Đi.")).toBeVisible();
    await expect(tm.dong(page, ten)).toBeVisible();
  });

  test("tìm nhanh Ctrl+K theo tên tài liệu", async ({ page, context }) => {
    await dangNhapApi(context, ND.quanTri);
    await page.goto("/thu-muc");
    const o = page.getByPlaceholder("Tìm báo cáo của mọi đơn vị…");
    await expect(tm.noiDung(page).getByRole("button", { name: "Tải lên" })).toBeVisible();
    await page.keyboard.press("Control+k");
    await expect(o).toBeFocused();
    await o.fill(`E2E_${MA_CHAY}_A`);
    const kq = page.getByRole("button", { name: new RegExp(A2.replace(/[.]/g, "\\.")) }).filter({ hasText: "P.HCTH" });
    await expect(kq.first()).toBeVisible();
    await expect(kq.first()).toContainText("bản 2");
    await kq.first().click();
    await expect(tm.dong(page, A2)).toBeVisible();
    await o.fill("zzz-khong-co-tai-lieu-nay");
    await expect(page.getByText("Không thấy tài liệu nào.")).toBeVisible();
  });

  test("phân quyền: văn thư tải lên được nhưng không xóa file người khác", async ({ page, context }) => {
    await dangNhapApi(context, ND.vanThu);
    await page.goto("/thu-muc");
    const nd = tm.noiDung(page);
    await expect(nd.getByRole("button", { name: "Tải lên" })).toBeEnabled();
    await expect(tm.dong(page, A2).getByRole("button", { name: "Xóa" })).toBeDisabled();
    await page.locator('main input[type="file"][multiple]').setInputFiles([viDuDoiTen("YKien_PhapLy_ThuVon.docx", VT)]);
    await expect(page.getByText("Đã tải lên 1 file vào Đến.")).toBeVisible();
    await expect(tm.dong(page, VT).getByRole("button", { name: "Xóa" })).toBeEnabled();
  });

  test("phân quyền: trưởng P.HCTH xóa được file trong đơn vị mình nhưng không tải lên", async ({ page, context }) => {
    await dangNhapApi(context, ND.truongHcth);
    await page.goto("/thu-muc");
    const nd = tm.noiDung(page);
    await expect(nd.getByRole("button", { name: "Tải lên" })).toBeDisabled();
    await expect(nd.getByRole("button", { name: "Tải lên" })).toHaveAttribute("title", "Bạn không có quyền tải lên thư mục của đơn vị này");
    await expect(tm.dong(page, A2).getByRole("button", { name: "Xóa" })).toBeEnabled();
    await tm.dong(page, VT).getByRole("button", { name: "Xóa" }).click();
    await expect(tm.dong(page, VT)).toHaveCount(0);
    await tm.cay(page).getByRole("button", { name: /^Thùng rác/ }).first().click();
    await expect(tm.dong(page, VT).getByRole("button", { name: "Khôi phục" })).toBeEnabled();
  });

  test("phân quyền: nhân viên đơn vị khác chỉ xem, API từ chối tải lên", async ({ page, context }) => {
    await dangNhapApi(context, ND.hungTv);
    await page.goto("/thu-muc");
    const cay = tm.cay(page);
    await cay.getByRole("button", { name: /Phòng Hành chính Tổng hợp/ }).click();
    await cay.getByRole("button", { name: /^Đến(\s\d+)?$/ }).last().click();
    const nd = tm.noiDung(page);
    await expect(tm.dong(page, A2)).toBeVisible();
    await expect(nd.getByRole("button", { name: "Tải lên" })).toBeDisabled();
    await expect(tm.dong(page, A2).getByRole("button", { name: "Xóa" })).toBeDisabled();
    await expect(tm.dong(page, A2).getByRole("button", { name: "Xem trước" })).toBeEnabled();

    const url = new URL(page.url());
    const maTm = url.searchParams.get("tm")!;
    const r = await page.request.post("/api/tai-lieu", {
      multipart: { thu_muc_id: maTm, tep: { name: "x.docx", mimeType: MIME_DOCX, buffer: fs.readFileSync(viDu("BaoCao_SaiMau.docx")) } },
    });
    expect(r.status()).toBe(403);
    expect((await r.json()).loi).toBe(
      "Bạn chưa được cấp quyền tải tài liệu thẳng lên thư mục (không qua Soạn và gửi). Liên hệ quản trị để được cấp.",
    );
  });

  test("trang chi tiết tài liệu tải thẳng lên thư mục", async ({ page, context }) => {
    await dangNhapApi(context, ND.quanTri);
    await page.goto("/thu-muc");
    await tm.dong(page, A2).getByRole("link", { name: "Mở trang tài liệu" }).click();
    await expect(page).toHaveURL(/\/tai-lieu\//);
    await expect(page.getByRole("heading", { level: 1, name: A2 })).toBeVisible();
    const main = page.locator("main");
    await expect(main.getByText("Không theo mẫu")).toBeVisible();
    for (const h of ["Hộp xử lý tài liệu", "Cây hành trình", "Xem trước", "Dòng thời gian"]) {
      await expect(main.getByRole("heading", { level: 2, name: h })).toBeVisible();
    }
    await expect(main.getByText("Tài liệu chưa được gửi đi đâu.")).toBeVisible();
    await expect(main.getByText(/Bạn là người gửi tài liệu này, không còn bước nào chờ bạn xử lý/)).toBeVisible();
    await expect(main.getByText("BQLDA QUẢNG TRỊ").first()).toBeVisible({ timeout: 60_000 });

    await page.goto("/tai-lieu/khong-ton-tai");
    await expect(page.getByRole("alert").filter({ hasText: "Không có tài liệu này" })).toBeVisible();
  });
});
