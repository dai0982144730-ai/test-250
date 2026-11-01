// Các lỗi tìm thấy khi bấm thử giao diện quản trị (25/09/2026) — mỗi lỗi một test để không quay lại.
import { describe, it, expect, beforeAll } from "vitest";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { layQ, tx } from "@/lib/db";
import { MAC_DINH } from "@/lib/cau-hinh/mac-dinh";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { ghiCauHinh, kiemTraCauHinh, nhapCauHinh, xuatCauHinh } from "@/lib/cau-hinh/ghi";
import { tronMacDinh } from "@/lib/cau-hinh/kiem-tra";
import { nhanLoiCauHinh, nhanTruong } from "@/lib/cau-hinh/bieu-mau";
import { xuLyIdentity } from "@/lib/cau-hinh/cau-noi-identity";
import { layNguCanh } from "@/lib/ngu-canh";
import { LoiIdentity, danhSachNguoiDung, themNguoiDung } from "@sci/identity/server";
import { config as cauHinhMiddleware } from "@/middleware";

describe("identity — sửa lỗi bấm thử giao diện", () => {
  beforeAll(async () => {
    process.env.AUTH_SECRET ??= "khoa-thu-nghiem-cho-test-it-nhat-32-ky-tu!!";
    await csdlMoi();
  });

  it("middleware chạy cho mọi trang (dấu chấm trong matcher phải escape) → chưa đăng nhập về /login?tiep=", () => {
    const m = cauHinhMiddleware.matcher[0];
    expect(m).not.toContain(".*..*"); // lỗi cũ: ".*..*" khớp mọi đường dẫn nên middleware không bao giờ chạy
    const re = new RegExp(`^${m}$`);
    for (const p of ["/quan-tri", "/cai-dat", "/thu-muc", "/api/toi", "/api/quan-tri/nguoi-dung"]) expect(re.test(p), p).toBe(true);
    for (const p of ["/login", "/api/auth/login", "/api/mcp/socai", "/api/v1/so-cai", "/favicon.ico", "/_next/static/a.js", "/logo.png"]) expect(re.test(p), p).toBe(false);
  });

  it("tìm người dùng không phân biệt dấu, xếp tên theo tiếng Việt", async () => {
    const q = await layQ();
    await tx((t) => themNguoiDung(t, { nguoi: "he-thong" }, { email: "moi.test@scigroup.vn", ten: "Nguyễn Văn Mới", don_vi_id: "p-ktvh", mat_khau: "Sci@2026" }));
    expect((await danhSachNguoiDung(q, { tim: "nguyen van moi" })).map((n) => n.id)).toEqual(["moi.test@scigroup.vn"]);
    expect((await danhSachNguoiDung(q, { tim: "NGUYỄN VĂN" })).map((n) => n.id)).toContain("moi.test@scigroup.vn");
    const ten = (await danhSachNguoiDung(q)).map((n) => n.ten);
    expect(ten).toEqual([...ten].sort((a, b) => a.localeCompare(b, "vi")));
  });

  it("xuLyIdentity chạy trong ngữ cảnh yêu cầu (lịch sử tự có thiết bị) và đổi LoiIdentity thành mã HTTP", async () => {
    let nc: unknown = "chua";
    const ok = await xuLyIdentity(async () => {
      nc = layNguCanh();
      return { ok: true };
    });
    expect(ok.status).toBe(200);
    expect(nc).toBeDefined();
    const loi = await xuLyIdentity(async () => {
      throw new LoiIdentity(409, "Email đã có tài khoản");
    });
    expect(loi.status).toBe(409);
    expect(await loi.json()).toEqual({ loi: "Email đã có tài khoản" });
  });

  it("lỗi kiểu cấu hình ghi nhãn tiếng Việt, không chỉ tên trường", async () => {
    const loi = await kiemTraCauHinh(await layQ(), "so_cai", { ...MAC_DINH.so_cai, sap_den_han_ngay: -2 });
    expect(loi).toEqual(["sap_den_han_ngay: không được là số âm (-2)"]); // API giữ nguyên dạng cũ
    expect(nhanLoiCauHinh("so_cai", loi[0])).toBe('Còn bao nhiêu ngày thì là "sắp đến hạn" (sap_den_han_ngay): không được là số âm (-2)');
    expect(nhanLoiCauHinh("thong_bao", "smtp.cong: phải là số, đang là chữ")).toBe("Cổng SMTP (smtp.cong): phải là số, đang là chữ");
    expect(nhanLoiCauHinh("so_cai", "Dạng mã việc phải có {so}")).toBe("Dạng mã việc phải có {so}");
    expect(nhanTruong("thong_bao", "theo_loai.giao_viec.email")).toBe("Kênh theo loại thông báo › Được giao việc › Email");
    expect(nhanTruong("thong_bao", "smtp.cong")).toBe("Cổng SMTP");
  });

  it("thông báo: thêm loại mới trong theo_loai không bị báo trường lạ; loại thiếu trường lấy mặc định", async () => {
    const q = await layQ();
    const tb = structuredClone(MAC_DINH.thong_bao);
    const theo = { ...tb.theo_loai, loai_moi: { trong_app: true, email: true, tieu_de: "Loại mới: {noi_dung}" } } as typeof tb.theo_loai;
    expect(await kiemTraCauHinh(q, "thong_bao", { ...tb, theo_loai: theo })).toEqual([]);
    // dòng thiếu tieu_de → trộn từ mặc định của chính loại đó
    const thieu = { ...tb, theo_loai: { giao_viec: { trong_app: false, email: true } } } as unknown as typeof tb;
    const tron = tronMacDinh("thong_bao", thieu);
    expect(tron.theo_loai.giao_viec).toEqual({ trong_app: false, email: true, tieu_de: MAC_DINH.thong_bao.theo_loai.giao_viec.tieu_de });
    expect(tron.theo_loai.khac).toEqual(MAC_DINH.thong_bao.theo_loai.khac);
    expect(await kiemTraCauHinh(q, "thong_bao", thieu)).toEqual([]);
    // luật nghiệp vụ SMTP
    const sai = await kiemTraCauHinh(q, "thong_bao", { ...tb, smtp: { ...tb.smtp, cong: 70000, bao_mat: "abc" as "ssl" } });
    expect(sai.join(" | ")).toMatch(/Cổng SMTP/);
    expect(sai.join(" | ")).toMatch(/Bảo mật SMTP/);
  });

  it("nhập file cấu hình xuất từ bản cũ (thiếu trường mới của thong_bao) → trộn mặc định, không báo thiếu trường", async () => {
    const q = await layQ();
    const qt = await nguoi("quantri@scigroup.vn");
    const file = (await xuatCauHinh(q)) as { cau_hinh: Record<string, { gia_tri?: unknown } | unknown> };
    // Giả lập bản cũ: thong_bao chỉ có email_gui + mau, smtp thiếu tai_khoan
    const cu = { email_gui: "docflow@scigroup.vn", mau: MAC_DINH.thong_bao.mau, smtp: { may_chu: "smtp.scigroup.vn", cong: 587, bao_mat: "starttls" } };
    const boc = file.cau_hinh.thong_bao as { gia_tri?: unknown };
    if (boc && typeof boc === "object" && "gia_tri" in boc) boc.gia_tri = cu;
    else file.cau_hinh.thong_bao = cu;
    const loi = await tx((t) => nhapCauHinh(t, qt, file as unknown as Record<string, unknown>));
    expect(loi).toEqual([]);
    const tb = await layCauHinh(q, "thong_bao");
    expect(tb.email_gui).toBe("docflow@scigroup.vn");
    expect(tb.smtp).toEqual({ may_chu: "smtp.scigroup.vn", cong: 587, bao_mat: "starttls", tai_khoan: "" });
    expect(tb.theo_loai.khac).toBeDefined();
    expect(tb.ten_nguoi_gui).toBe(MAC_DINH.thong_bao.ten_nguoi_gui);
    // lưu tiếp bằng biểu mẫu vẫn được
    expect(await ghiCauHinh(q, qt, "thong_bao", { ...tb, ten_nguoi_gui: "SCI công việc SCI" })).toBeGreaterThan(0);
  });
});
