// Việc từ các bảng phụ (Kiến nghị / Sự cố / Cảnh báo hồ sơ / GPMB / Tiến độ thiết kế): sổ cái ghi HẾT việc của báo cáo.
// Người làm theo đơn vị được nhắc, bắt đầu = ngày lập, hạn đọc từ chữ; dòng trùng việc đã có trong báo cáo thì bỏ.
import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { csdlMoi, nguoi } from "../helpers/csdl";
import type { Q } from "@/lib/db";
import { kiemTraDayDu } from "@/lib/kiem-tra/kiem-tra";
import { cungMotViec, docHanTrongChu } from "@/lib/kiem-tra/viec-tu-kien-nghi";

describe("đọc hạn trong chữ", () => {
  const lap = "2026-07-21";
  it("ngày cụ thể, tháng, T10/2026; bỏ ngày đã qua và 'Trụ T11'", () => {
    expect(docHanTrongChu("chuẩn bị hồ sơ trước 15/08/2026 để kịp ký", lap, 2026)).toBe("2026-08-15");
    expect(docHanTrongChu("dự kiến lắp đặt và test trong T8", lap, 2026)).toBe("2026-08-31");
    expect(docHanTrongChu("kiểm tra trong đợt bảo dưỡng T10/2026", lap, 2026)).toBe("2026-10-31");
    expect(docHanTrongChu("phát hiện khi kiểm tra 20/07", lap, 2026)).toBeUndefined();
    expect(docHanTrongChu("GPMB Trụ T11 chậm", lap, 2026)).toBeUndefined();
    // Mã WBS không phải ngày (đo 28/09: "gia hạn hạng mục 7.5.1" từng ra 07/05)
    expect(docHanTrongChu("ký phụ lục gia hạn hạng mục 7.5.1 hoặc thêm mũi thi công", lap, 2026)).toBeUndefined();
    expect(docHanTrongChu("gia hạn hạng mục 7.5.1, hạn 15/08/2026", lap, 2026)).toBe("2026-08-15");
    // "tuần tới" = Chủ nhật tuần sau (Mr. Đại chốt 28/09): lập thứ Ba 21/07 → CN tuần này 26/07 → CN tuần sau 02/08
    expect(docHanTrongChu("xử lý trong tuần tới", lap, 2026)).toBe("2026-08-02");
    // "tuần này / trong tuần / cuối tuần" = Chủ nhật của tuần lập (Mr. Đại chốt 28/09): lập thứ Ba 21/07 → CN 26/07; lập CN → chính ngày đó
    expect(docHanTrongChu("Phòng soạn thảo, trình ký ngay tuần này", lap, 2026)).toBe("2026-07-26");
    expect(docHanTrongChu("hoàn thiện hồ sơ trong tuần", lap, 2026)).toBe("2026-07-26");
    expect(docHanTrongChu("gửi bản cuối tuần", "2026-10-04", 2026)).toBe("2026-10-04");
    // Không ghi năm: năm gần ngày lập nhất — báo cáo 25/09 ghi "trước 31/07" là hạn đã qua (việc quá hạn), không phải năm sau
    expect(docHanTrongChu("trình phương án trước 31/07", "2026-09-25", 2026)).toBe("2026-07-31");
    expect(docHanTrongChu("thay trong T8", "2026-09-25", 2026)).toBe("2026-08-31");
    expect(docHanTrongChu("gia hạn trước 15/01", "2026-12-20", 2026)).toBe("2027-01-15");
  });
});

describe("việc từ bảng Kiến nghị / Sự cố", () => {
  let q: Q;
  beforeAll(async () => {
    q = await csdlMoi();
  });

  it("Form 8 gốc (không có chương việc): bảng Sự cố / Kiến nghị KHÔNG sinh việc", async () => {
    const nd = await nguoi("gd.namxe@scigroup.vn");
    const tep = "OK_Form8_NhaMayNamXe_Sua lan 2.docx";
    const buf = fs.readFileSync(path.join(process.cwd(), "mau-word", "goc", tep));
    const kq = await kiemTraDayDu(q, nd, buf, tep);
    expect(kq.mau_ma).toBe("form-8");
    expect(kq.cong_viec).toEqual([]);
  });

  it("bảng Công việc có điền: chỉ việc của chương việc, không lấy thêm ở Kiến nghị / GPMB", async () => {
    const nd = await nguoi("nv.bqlda@scigroup.vn");
    const buf = fs.readFileSync(path.join(process.cwd(), "mau-word", "vi-du", "BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx"));
    const kq = await kiemTraDayDu(q, nd, buf, "ban2.docx", { bo_qua_so_cai: true });
    expect(kq.cong_viec.map((c) => c.nguon_bang)).toEqual(["bang_cong_viec", "bang_cong_viec", "bang_cong_viec"]);
    expect(kq.loi.some((l) => l.thong_diep.includes("không tạo việc thứ hai"))).toBe(false);
  });

  it("so trùng: mã / số hiệu khác là việc khác; giữ dấu nên Nậm ≠ năm", () => {
    const v = (ten: string, chu = "") => ({ ten, chu });
    expect(cungMotViec(v("GPMB T11 (cụm Nam A): 3 hộ khiếu nại"), v("GPMB Trụ T11"))).toBe(true);
    expect(cungMotViec(v("GPMB Trụ T12–T18 DA Hướng Việt chưa xong"), v("GPMB Trụ T11"))).toBe(false);
    expect(cungMotViec(v("Thu vốn đợt 5 Nậm Khiên 1"), v("Theo dõi thu vốn đợt 4 Nậm Khiên 1"))).toBe(false);
    expect(cungMotViec(v("Giấy phép môi trường Ca Nan 1 & 2 — gia hạn", "mất doanh thu cả năm"), v("Gia hạn GPXD Nậm Khiên 1"))).toBe(false);
    expect(cungMotViec(v("Giấy phép XD Nậm Khiên 1 — gia hạn (hết hạn 31/12/2026)"), v("Gia hạn GPXD Nậm Khiên 1"))).toBe(true);
    expect(
      cungMotViec(
        v("TKCS ĐG Hướng Việt bị Bộ Công Thương kéo dài thẩm định (77 ngày > KH 60 ngày) Nguy cơ ảnh hưởng tiến độ phê duyệt toàn dự án"),
        v("TKCS DA Hướng Phùng 1 chưa được Bộ Công Thương phê duyệt sau ~2 tháng nộp hồ sơ Toàn bộ tiến độ thi công chính bị ảnh hưởng nặng"),
      ),
    ).toBe(false);
  });

  it("Form 5 gốc: hạng mục Tiến độ thiết kế là việc (dự án theo ô gộp, hạn = ngày kế hoạch, 100% = đã xong)", async () => {
    const nd = await nguoi("gd.pmc@scigroup.vn");
    const tep = "OK_Form5_SCI_PMC_Sua lan 2.docx";
    const kq = await kiemTraDayDu(q, nd, fs.readFileSync(path.join(process.cwd(), "mau-word", "goc", tep)), tep, { bo_qua_so_cai: true });
    const tk = kq.cong_viec.filter((c) => c.nguon_bang === "bang_tien_do_tk");
    expect(tk).toHaveLength(15);
    expect(tk[1]).toMatchObject({ ten: "Phương án đấu nối 110kV (bổ sung theo y/c Cục ĐTĐL)", du_an: "ĐG Hướng Việt", ket_thuc: "2026-08-05" });
    expect(tk.filter((c) => c.da_xong).map((c) => c.ten)).toEqual(["Khảo sát địa hình, địa chất", "Tiền MB + lập Thuyết minh Bản vẽ (TMB) — nộp tỉnh Quảng Trị"]);
    // Cùng tên ở hai dự án là hai việc
    expect(tk.filter((c) => c.ten === "Khảo sát thủy văn, đo lưu lượng thực tế").map((c) => c.du_an)).toEqual(["TĐ Nam Khiên 1", "TĐ Nam Khiên 2"]);
    // Ngày kế hoạch "—" → không có hạn
    expect(tk.find((c) => c.ten.startsWith("Theo dõi xét duyệt chủ trương"))?.ket_thuc).toBeUndefined();
  });

  it("Form 1 gốc: bảng Cảnh báo KHÔNG sinh việc", async () => {
    const nd = await nguoi("nv.dtpc@scigroup.vn");
    const tep = "OK_Form1_PhongDauTuPhapChe_Sua lan 2.docx";
    const kq = await kiemTraDayDu(q, nd, fs.readFileSync(path.join(process.cwd(), "mau-word", "goc", tep)), tep, { bo_qua_so_cai: true });
    expect(kq.cong_viec.filter((c) => c.nguon_bang === "bang_canh_bao")).toEqual([]);
  });

  it("Form 0 (tổng hợp) không lấy bảng Cảnh báo — việc đã vào sổ từ báo cáo gốc", async () => {
    const nd = await nguoi("photgd@scigroup.vn");
    const tep = "OK_Form0_BaoCaoHopNhat_Sua lan 2.docx";
    const kq = await kiemTraDayDu(q, nd, fs.readFileSync(path.join(process.cwd(), "mau-word", "goc", tep)), tep, { bo_qua_so_cai: true });
    expect(kq.cong_viec.every((c) => c.nguon_bang === "bang_quyet_dinh")).toBe(true);
  });
});

describe("Tiến độ chi tiết thiết kế — chương sinh việc (Mr. Đại 01/10)", () => {
  it("hạng mục thiết kế không bị gộp vào việc chương IV chỉ vì tên na ná; trùng tên như hệt mới gộp", async () => {
    const { dongViecTuBangPhu } = await import("@/lib/kiem-tra/viec-tu-kien-nghi");
    const bang: Record<string, Record<string, string>[]> = {
      bang_tien_do_tk: [
        { du_an: "ĐG Hướng Việt (48 MW)", hang_muc: "Thiết kế bản vẽ thi công móng trụ T9–T12", ngay_ke_hoach: "15/10/2026", pt_ht: "60%", ghi_chu: "Đang hoàn thiện bản vẽ cốt thép" },
        { du_an: "ĐG Hướng Việt (48 MW)", hang_muc: "Rà soát bản vẽ thi công móng trụ T9–T12", ngay_ke_hoach: "09/10/2026", pt_ht: "10%" },
      ],
    };
    const kq = dongViecTuBangPhu(bang, { don_vi: [], nguoi: [] } as never, "2026-09-30", 2026, {
      chiBang: ["bang_tien_do_tk"],
      viecChinh: [{ ten: "Rà soát bản vẽ thi công móng trụ T9–T12", chu: "Biên bản rà soát bản vẽ" }],
    });
    const ten = kq.bang.flatMap((b) => b.dong.map((d) => d.ten)).filter(Boolean);
    expect(ten).toEqual(["Thiết kế bản vẽ thi công móng trụ T9–T12"]);
    expect(kq.trung.map((t) => t.ten)).toEqual(["Rà soát bản vẽ thi công móng trụ T9–T12"]);
    const d = kq.bang[0].dong[0];
    expect(d.tien_do).toBe("60%");
    expect(d.ghi_chu).toBe("Đang hoàn thiện bản vẽ cốt thép");
  });
});
