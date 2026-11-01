// Bộ chuyển người + tổ chức lên Main (LOI-DUNG-CHUNG 6g.6 Đợt 2 — 03/10/2026): hàm thuần dungBanMain.
import { describe, it, expect } from "vitest";
import { dungBanMain, inBang } from "../../scripts/chuyen-len-main.mjs";

const BAM = "a".repeat(64);
const nguoi = (id: string, email: string, them: Record<string, unknown> = {}) => ({
  id, email, ten: `Tên ${email}`, mat_khau_hash: BAM, salt: "b".repeat(32), don_vi_id: "p-hcth", chuc_vu: "Nhân viên", cap_chuc_vu: null, la_quan_tri: false, active: true, tao_luc: "2026-09-29T01:00:00Z", ...them,
});
const NGUON = {
  nguoi: [
    nguoi("quantri@scigroup.vn", "quantri@scigroup.vn", { la_quan_tri: true }),
    nguoi("ptgd.dai@scigroup.vn", "dainc@scigroup.vn", { don_vi_id: "bld-ptgd-dai", chuc_vu: "Phó Tổng Giám đốc" }),
    nguoi("nv.hcth@scigroup.vn", "nv.hcth@scigroup.vn"),
  ],
  donVi: [
    { id: "ban-tgd", ten: "Ban TGĐ", ten_ngan: "Ban TGĐ", cap: 1, cha_id: null, loai: "ban_tgd", thu_tu: 0, active: true, chuc_danh: null, chuc_danh_ngan: null, chuc_nang: null, uy_quyen_truong: null, mau_ma: "form-0" },
    { id: "p-hcth", ten: "Phòng HCTH", ten_ngan: "P.HCTH", cap: 2, cha_id: "ban-tgd", loai: "phong", thu_tu: 1, active: true, chuc_danh: null, chuc_danh_ngan: null, chuc_nang: "Hành chính", uy_quyen_truong: "nv.hcth@scigroup.vn" },
    { id: "bld-ptgd-dai", ten: "Phó TGĐ · Nguyễn Chính Đại", ten_ngan: "PTGĐ", cap: 1, cha_id: "ban-tgd", loai: "chuc_danh", thu_tu: 2, active: true, chuc_danh: "Phó Tổng Giám đốc", chuc_danh_ngan: "PTGĐ", chuc_nang: null, uy_quyen_truong: null },
  ],
  kiemNhiem: [{ nguoi_dung_id: "ptgd.dai@scigroup.vn", don_vi_id: "p-hcth", chuc_vu: "kiêm" }],
};
const MAU = (email: string, them: Record<string, unknown> = {}) => ({ email, name: email, role: "engineer", passwordHash: "x", salt: "y", active: true, createdAt: "2026-08-11T00:00:00Z", ...them });
const MAIN = {
  users: [MAU("dai@sci.vn", { role: "pm", telegramChatId: "1966969513", baseUsername: "dainc" }), MAU("admin@sci.vn", { role: "admin" }), MAU("nguoidung@sci.vn"), MAU("xem@sci.vn", { role: "viewer" })],
  projects: { projects: [{ id: "hv", giamDoc: "dai@sci.vn", createdBy: "dai@sci.vn" }, { id: "tt", giamDoc: "khac@scigroup.vn" }] },
  phienTelegram: { "dai@sci.vn": { projectId: "hv", sessionId: "s-1" } },
};

describe("bộ chuyển người lên Main", () => {
  it("lần đầu: loại tài khoản T3, mã giữ nguyên, băm scrypt có tiền tố, tổ chức đủ, bỏ 4 tài khoản mẫu", () => {
    const kq = dungBanMain(NGUON, MAIN);
    const theo = (e: string) => kq.users.find((u) => u.email === e)!;
    expect(kq.users.map((u) => u.email)).toEqual(["quantri@scigroup.vn", "dainc@scigroup.vn", "nv.hcth@scigroup.vn"]);
    expect([theo("quantri@scigroup.vn").role, theo("dainc@scigroup.vn").role, theo("nv.hcth@scigroup.vn").role]).toEqual(["admin", "pm", "engineer"]);
    expect(theo("dainc@scigroup.vn")).toMatchObject({ id: "ptgd.dai@scigroup.vn", passwordHash: `scrypt:${"b".repeat(32)}:${BAM}`, salt: "b".repeat(32), donViId: "bld-ptgd-dai", chucVu: "Phó Tổng Giám đốc", createdAt: "2026-09-29T01:00:00.000Z" });
    expect(kq.bang.boMau).toEqual(["dai@sci.vn", "admin@sci.vn", "nguoidung@sci.vn", "xem@sci.vn"]);
    expect(kq.toChuc.don_vi).toHaveLength(3);
    expect(kq.toChuc.don_vi[0]).not.toHaveProperty("mau_ma"); // mẫu báo cáo là nghiệp vụ riêng agent Công việc (6g.6.1)
    expect(kq.toChuc.don_vi[1]).toMatchObject({ chuc_nang: "Hành chính", uy_quyen_truong: "nv.hcth@scigroup.vn" });
    expect(kq.toChuc.kiem_nhiem).toEqual([{ nguoi_id: "ptgd.dai@scigroup.vn", don_vi_id: "p-hcth", chuc_vu: "kiêm" }]);
    expect(kq.toChuc.uy_quyen_ky).toEqual([]);
    expect(kq.canhBao).toEqual([]);
  });

  it("gộp dai@sci.vn → dainc (T2): Telegram + Giám đốc dự án + phiên bot chuyển; tên Base KHÔNG mang (chốt 03/10); người tạo dự án giữ nguyên (A11)", () => {
    const kq = dungBanMain(NGUON, MAIN);
    const dai = kq.users.find((u) => u.email === "dainc@scigroup.vn")!;
    expect(dai.telegramChatId).toBe("1966969513");
    expect(dai.baseUsername).toBeUndefined();
    expect(kq.projects!.projects).toEqual([{ id: "hv", giamDoc: "dainc@scigroup.vn", createdBy: "dai@sci.vn" }, { id: "tt", giamDoc: "khac@scigroup.vn" }]);
    expect(kq.phienTelegram).toEqual({ "dainc@scigroup.vn": { projectId: "hv", sessionId: "s-1" } });
    expect(kq.biDanh.map((b) => `${b.email_cu}>${b.email_moi}:${b.cach}`)).toEqual(["dai@sci.vn>dainc@scigroup.vn:gop", "admin@sci.vn>quantri@scigroup.vn:chuyen_chu"]);
  });

  it("chạy lại: người đã có ở Main giữ mật khẩu, Telegram, loại tài khoản, dự án được vào; người chỉ có ở Main giữ nguyên", () => {
    const lan1 = dungBanMain(NGUON, MAIN);
    const daDoi = lan1.users.map((u) => (u.email === "nv.hcth@scigroup.vn" ? { ...u, passwordHash: "scrypt:moi:moi", role: "viewer" as const, projectIds: ["hv"] } : u));
    const lan2 = dungBanMain(NGUON, { users: [...daDoi, MAU("moi.tai.main@scigroup.vn")], projects: lan1.projects, phienTelegram: lan1.phienTelegram });
    const nv = lan2.users.find((u) => u.email === "nv.hcth@scigroup.vn")!;
    expect(nv).toMatchObject({ passwordHash: "scrypt:moi:moi", role: "viewer", projectIds: ["hv"] });
    expect(lan2.users.find((u) => u.email === "dainc@scigroup.vn")?.telegramChatId).toBe("1966969513");
    expect(lan2.users.some((u) => u.email === "moi.tai.main@scigroup.vn")).toBe(true);
    expect(lan2.bang).toMatchObject({ matKhauMoi: 0, giuMatKhauMain: 3, giamDoc: 0, doiPhienBot: false, boMau: [] });
  });

  it("cảnh báo: băm sai khuôn, quản trị ngoài quantri, thiếu Admin / PM, đơn vị chính không có trong cây", () => {
    const kq = dungBanMain(
      { ...NGUON, nguoi: [nguoi("x@scigroup.vn", "x@scigroup.vn", { mat_khau_hash: "ngan", la_quan_tri: true, don_vi_id: "khong-co" })] },
      { users: [], projects: null, phienTelegram: null },
    );
    const cb = kq.canhBao.join("\n");
    expect(cb).toMatch(/băm mật khẩu .* sai khuôn/);
    expect(cb).toMatch(/là quản trị ở agent Công việc/);
    expect(cb).toMatch(/KHÔNG có tài khoản Admin/);
    expect(cb).toMatch(/KHÔNG có PM/);
    expect(cb).toMatch(/đơn vị chính khong-co không có/);
    expect(inBang(kq)).toMatch(/CẢNH BÁO:/);
  });

  it("6g.6.13 + bước E: chép vai trò (bản chép) và đơn vị gắn dự án theo mã ngắn; dự án Main đã có donVi thì giữ; mã lạ báo", () => {
    const nguon = {
      ...NGUON,
      vai: [
        { nguoi_dung_id: "ptgd.dai@scigroup.vn", vai_tro_id: "lanh-dao" },
        { nguoi_dung_id: "nv.hcth@scigroup.vn", vai_tro_id: "truong-don-vi" },
        { nguoi_dung_id: "nv.hcth@scigroup.vn", vai_tro_id: "nhan-vien" },
      ],
      duAn: [
        { id: "HV", don_vi: ["p-hcth"], ban_dieu_hanh: "ban-tgd" },
        { id: "TT", don_vi: ["p-hcth"] },
        { id: "NM1", don_vi: ["khong-co"] },
      ],
    };
    const main = {
      ...MAIN,
      projects: {
        projects: [
          { id: "huong-viet", ma: "hv" },
          { id: "tan-thanh", ma: "TT", donVi: ["ban-tgd"] }, // đã sửa ở Main → giữ
          { id: "nam-mo-1", ma: "NM1" },
          { id: "ba-tang", ma: "BT" }, // agent Công việc không có
          { id: "default" }, // không mã
        ],
      },
    };
    const kq = dungBanMain(nguon, main);
    expect(kq.users.find((u) => u.email === "dainc@scigroup.vn")?.vaiCongViec).toEqual(["lanh-dao"]);
    expect(kq.users.find((u) => u.email === "nv.hcth@scigroup.vn")?.vaiCongViec).toEqual(["nhan-vien", "truong-don-vi"]);
    expect(kq.users.find((u) => u.email === "quantri@scigroup.vn")?.vaiCongViec).toEqual([]);
    const pj = kq.projects!.projects as Record<string, unknown>[];
    expect(pj[0]).toEqual({ id: "huong-viet", ma: "hv", donVi: ["p-hcth"], banDieuHanh: "ban-tgd" });
    expect(pj[1]).toEqual({ id: "tan-thanh", ma: "TT", donVi: ["ban-tgd"] });
    expect(pj[2]).toMatchObject({ donVi: ["khong-co"] });
    expect(pj[3]).not.toHaveProperty("donVi");
    expect(pj[4]).toEqual({ id: "default" });
    expect(kq.bang.donViDuAn).toEqual({ ghi: ["HV", "NM1"], giuMain: ["TT"], khongKhop: ["BT"] });
    expect(kq.canhBao.join("\n")).toMatch(/dự án NM1: đơn vị gắn "khong-co" không có/);
    expect(inBang(kq)).toMatch(/1 người vai Lãnh đạo · 1 người vai Trưởng/);
    // chạy lại: dự án đã chép → giữ bản Main
    expect(dungBanMain(nguon, { ...main, projects: kq.projects }).bang.donViDuAn.ghi).toEqual([]);
  });
});
