// /lam-bao-cao — áp lời người vào bản nháp (test đêm 01/10):
//  L-3 "giu nguyen het" → việc mang sang phải thành "Đang làm" (trước chỉ đánh dấu đã nói, ô tình trạng trống → hỏi lại mãi)
//  L-2 "việc 2 dừng vì chờ vốn" → ô ghi "Dừng: chờ vốn" (trước chép cả câu)
import { describe, it, expect } from "vitest";
import { apDung } from "@/lib/tro-ly/lam-bao-cao";

type Ban = Parameters<typeof apDung>[0];
const viec = (ten: string, tinh_trang = "") => ({ ten, du_an: "", bat_dau: "", ket_thuc: "", ket_qua_can_co: "", tinh_trang, phu_trach: "", nguon: "cu" as const, da_noi: false });
const ban = (): Ban =>
  ({ phien: 1, don_vi: "nm-namxe", ten_don_vi: "NM Nậm Xe", mau_ma: "form-8", ky: { loai: "tuan", so: 40, nam: 2026, tu: "2026-09-28", den: "2026-10-04" }, nguon: null, o: {}, tag_viec: "bang_cong_viec", cot_viec: [], viec: [viec("Thay relay R21"), viec("Nạo vét cửa nhận nước", "Vướng: chờ nước rút")], bang_khac: {}, da_hoi_bang_khac: true, bang_khac_xong: false }) as unknown as Ban;

describe("apDung", () => {
  it("giữ nguyên / như cũ → việc mang sang chưa có tình trạng thành Đang làm; việc đã có tình trạng giữ nguyên", () => {
    const b = ban();
    const ghi = apDung(b, { con_lai_nhu_cu: true, bang_khac: "giu_nguyen" });
    expect(b.viec.map((v) => v.tinh_trang)).toEqual(["Đang làm", "Vướng: chờ nước rút"]);
    expect(b.viec.every((v) => v.da_noi)).toBe(true);
    expect(ghi.join("\n")).toMatch(/1 việc chưa nói tới → Đang làm/);
  });
  it("dừng: chỉ ghi lý do, bỏ phần dẫn 'việc 2 dừng vì'", () => {
    const b = ban();
    apDung(b, { bo: [{ so: 1, ly_do: "việc 1 dừng vì chờ vốn" }, { so: 2, ly_do: "tạm dừng do mưa lũ" }] });
    expect(b.viec.map((v) => v.tinh_trang)).toEqual(["Dừng: chờ vốn", "Dừng: mưa lũ"]);
  });
});

describe("boDongGoiY — file AI làm ra không còn dòng gợi ý xám của mẫu trắng", () => {
  it("Form 8 trắng: bỏ đúng 2 dòng gợi ý, giữ chữ khác; file vẫn đọc được", async () => {
    const fs = await import("node:fs");
    const JSZip = (await import("jszip")).default;
    const { boDongGoiY } = await import("@/lib/tro-ly/lam-bao-cao");
    const goc = fs.readFileSync("mau-word/trang/form-8.docx");
    const chu = async (b: Buffer) => (await (await JSZip.loadAsync(b)).file("word/document.xml")!.async("string")).replace(/<[^>]+>/g, " ");
    expect(await chu(goc)).toContain("Ghi tên công ty đang vận hành nhà máy vào đây");
    const ra = await boDongGoiY(goc, "form-8");
    const t = await chu(ra);
    expect(t).not.toContain("Ghi tên công ty đang vận hành nhà máy vào đây");
    expect(t).not.toContain("Ghi tên nhà máy, vd");
    expect(t).toContain("BÁO CÁO TUẦN");
    expect(t).toContain("Kỳ báo cáo");
    // mẫu không có gợi ý (Form 1) → trả nguyên
    const f1 = fs.readFileSync("mau-word/trang/form-1.docx");
    expect(await boDongGoiY(f1, "form-1")).toBe(f1);
  });
});

// Mr. Đại 02/10: "/lam-bao-cao tuần 41 cho phòng hành chính. các công việc trong chương II đã xong, mở thêm việc 1 ký hợp đồng
// claude … kết thúc trong 16/10 …" — máy chỉ đổi kỳ, bỏ mất phần cập nhật, không ra file.
describe("kyTrongCau — CODE đọc kỳ có số trước khi mở bản nháp", () => {
  it("tuần 41 / tuần 41/2026 / tháng 9; không đọc 'tuần tới' trong lời kể việc", async () => {
    const { kyTrongCau } = await import("@/lib/tro-ly/lam-bao-cao");
    expect(kyTrongCau("tuần 41 cho phòng hành chính. các công việc …", "tuan", "2026-10-02")).toMatchObject({ so: 41, nam: 2026, tu: "2026-10-05", den: "2026-10-11" });
    expect(kyTrongCau("tuan 40/2026", "tuan", "2026-10-02")).toMatchObject({ so: 40, tu: "2026-09-28" });
    expect(kyTrongCau("báo cáo tháng 9", "thang", "2026-10-02")).toMatchObject({ so: 9, tu: "2026-09-01", den: "2026-09-30" });
    expect(kyTrongCau("kế hoạch việc tuần tới: họp giao ban", "tuan", "2026-10-02")).toBeNull();
    expect(kyTrongCau("tháng 9", "tuan", "2026-10-02")).toBeNull(); // mẫu tuần: không đọc kỳ tháng
  });
});

describe("apDung — việc mới thiếu ngày bắt đầu / người làm; xoá dòng kiến nghị", () => {
  it("việc mới chỉ có ngày kết thúc → máy điền bắt đầu = hôm nay, người làm = đơn vị, Đang làm — và ghi rõ đã tự điền", () => {
    const b = ban();
    (b as unknown as { cot_viec: string[] }).cot_viec = ["ten", "du_an", "phu_trach", "bat_dau", "ket_thuc", "ket_qua_can_co", "tinh_trang"];
    const ghi = apDung(b, { them: [{ ten: "Ký hợp đồng Claude", ket_thuc: "16/10/2026", ket_qua_can_co: "Tài khoản cho BLĐ" }] });
    const v = b.viec[2];
    expect(v.bat_dau).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(v.phu_trach).toBe("NM Nậm Xe");
    expect(v.tinh_trang).toBe("Đang làm");
    expect(ghi.join("\n")).toMatch(/máy tự điền vì anh\/chị chưa nói/);
  });
  it("xoá dòng bảng khác từ dưới lên, đánh lại STT, ghi chú bằng tên bảng (không hiện mã máy)", () => {
    const b = ban();
    b.bang_khac = { bang_kien_nghi: [{ stt: "1", van_de: "A" }, { stt: "2", van_de: "B" }, { stt: "3", van_de: "C" }] };
    const ghi = apDung(b, { xoa_dong_bang_khac: [{ bang: "bang_kien_nghi", dong: 1 }, { bang: "bang_kien_nghi", dong: 3 }] });
    expect(b.bang_khac.bang_kien_nghi).toEqual([{ stt: "1", van_de: "B" }]);
    expect(ghi.join("\n")).toContain("bảng Kiến nghị");
    expect(ghi.join("\n")).not.toContain("bang_kien_nghi");
  });
});

describe("dienCongTy — K8: dòng CÔNG TY ...... của Form 8 nhận tên công ty khai ở Cài đặt", () => {
  it("Form 8 trắng → CÔNG TY CỔ PHẦN THỦY ĐIỆN NẬM XE; Form 1 (không có dòng chấm) giữ nguyên", async () => {
    const fs = await import("node:fs");
    const JSZip = (await import("jszip")).default;
    const { dienCongTy } = await import("@/lib/tro-ly/lam-bao-cao");
    const chu = async (b: Buffer) => (await (await JSZip.loadAsync(b)).file("word/document.xml")!.async("string")).replace(/<[^>]+>/g, "");
    const goc = fs.readFileSync("mau-word/trang/form-8.docx");
    expect(await chu(goc)).toContain("CÔNG TY ......");
    const ra = await chu(await dienCongTy(goc, "Công ty Cổ phần Thủy điện Nậm Xe"));
    expect(ra).toContain("CÔNG TY CỔ PHẦN THỦY ĐIỆN NẬM XE");
    expect(ra).not.toContain("CÔNG TY ......");
    const f1 = fs.readFileSync("mau-word/trang/form-1.docx");
    expect(await dienCongTy(f1, "X")).toBe(f1);
  });
});
