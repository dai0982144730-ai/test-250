// Bộ kéo sơ đồ tổ chức từ agent Công việc về Main (Mr. Đại chốt 12/10/2026 — câu 9: "30 phút + nút kéo" · "Báo + một nút tạo" · "Main tự khoá").
// Hai lớp: ① phần THUẦN (đọc khuôn, lập kế hoạch, chốt an toàn) · ② chạy thật trên thư mục dữ liệu RIÊNG, giả lời agent Công việc.
import { THU_MUC_SO_DO_TEST, TO_CHUC_THU } from "../ho-tro/so-do-du-lieu-rieng";
import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const gia = vi.hoisted(() => ({ hoi: vi.fn(), day: vi.fn(async () => [{ ma: "tiendo", ten: "Agent tiến độ", ok: true, tomTat: "đã kéo" }]) }));
vi.mock("@/lib/nguon/hoi-agent", () => ({ hoiAgent: (...a: unknown[]) => gia.hoi(...a) }));
vi.mock("@/lib/day-sang-agent", () => ({ dayChoCacAgent: (...a: unknown[]) => gia.day(...(a as [])) }));

import { docNhatKyKeo, docTrangThaiKeo, keoSoDo, taoTaiKhoanChuaCo } from "@/lib/so-do-keo";
import { denGioKeo, docSoDoKeoVe, lapKeHoach, xetAnToan, type NguoiMainGon, type SoDoKeoVe } from "@/lib/so-do-keo-thuan";
import { docToChuc } from "@/lib/to-chuc";
import { verifyUser } from "@/lib/users";
import type { ToChuc } from "@/lib/to-chuc-kieu";

const tepUsers = path.join(THU_MUC_SO_DO_TEST, "users.json");
const tepToChuc = path.join(THU_MUC_SO_DO_TEST, "to-chuc.json");
const USERS_GOC = fs.readFileSync(tepUsers, "utf8");
const UY_QUYEN = [{ nguoi_id: "u-truong2", loai_van_ban: "bien-ban-nghiem-thu", pham_vi: "HV", tu_ngay: "2026-10-01", den_ngay: null, nguoi_uy_quyen: "u-tgd", con_hieu_luc: true }];
const TO_CHUC_GOC = JSON.stringify({ ...TO_CHUC_THU, uy_quyen_ky: UY_QUYEN });

type NguoiTep = { id: string; email: string; name: string; role: string; active: boolean; passwordHash: string; salt: string; donViId?: string | null; chucVu?: string | null; vaiCongViec?: string[] };
const docUsers = (): NguoiTep[] => JSON.parse(fs.readFileSync(tepUsers, "utf8")) as NguoiTep[];
const nguoiTep = (email: string): NguoiTep => docUsers().find((u) => u.email === email)!;

/** Sơ đồ "agent Công việc gửi về" khớp đúng bản Main đang giữ — từng bài sửa một chỗ rồi kéo */
function soDoKhop(): { don_vi: Record<string, unknown>[]; kiem_nhiem: Record<string, unknown>[]; nguoi: Record<string, unknown>[] } {
  return {
    don_vi: TO_CHUC_THU.don_vi.map((d) => ({ ...d })),
    kiem_nhiem: TO_CHUC_THU.kiem_nhiem.map((k) => ({ ...k })),
    nguoi: (JSON.parse(USERS_GOC) as NguoiTep[]).map((u) => ({
      id: u.id,
      email: u.email,
      ten: u.name,
      don_vi_id: u.donViId ?? null,
      chuc_vu: null,
      cap_chuc_vu: null,
      active: true,
      vai: u.vaiCongViec ?? [],
    })),
  };
}
const traLoi = (du_lieu: unknown) => ({ ok: true, du_lieu, nguon: [{ ma: "so-do-to-chuc" }] });
const nguoiGonGoc = (): NguoiMainGon[] => (JSON.parse(USERS_GOC) as NguoiTep[]).map((u) => ({ id: u.id, email: u.email, name: u.name, role: u.role, active: u.active, donViId: u.donViId, vaiCongViec: u.vaiCongViec }));
const toChucGoc = (): ToChuc => JSON.parse(TO_CHUC_GOC) as ToChuc;
const doc = (v: unknown): SoDoKeoVe => {
  const k = docSoDoKeoVe(v);
  if (!k.soDo) throw new Error(k.loi.join(" · "));
  return k.soDo;
};

beforeEach(() => {
  fs.writeFileSync(tepUsers, USERS_GOC, "utf8");
  fs.writeFileSync(tepToChuc, TO_CHUC_GOC, "utf8");
  fs.rmSync(path.join(THU_MUC_SO_DO_TEST, "so-do-keo"), { recursive: true, force: true });
  gia.hoi.mockReset();
  gia.day.mockClear();
});

describe("phần thuần — đọc khuôn sơ đồ kéo về (sai một chỗ là từ chối cả bản)", () => {
  it("bản đúng khuôn thì nhận, vai trò được xếp lại thứ tự", () => {
    const s = soDoKhop();
    s.nguoi[0].vai = ["truong-don-vi", "lanh-dao"];
    const k = docSoDoKeoVe(s);
    expect(k.loi).toEqual([]);
    expect(k.soDo!.nguoi[0].vai).toEqual(["lanh-dao", "truong-don-vi"]);
    expect(k.soDo!.don_vi).toHaveLength(6);
  });
  it("thiếu danh sách · rỗng · đơn vị cha không có · kiêm nhiệm trỏ người lạ · trùng email → từ chối, nói lý do tiếng Việt", () => {
    expect(docSoDoKeoVe(null).soDo).toBeNull();
    expect(docSoDoKeoVe({ don_vi: [], kiem_nhiem: [] }).loi[0]).toContain("thiếu một trong ba danh sách");
    expect(docSoDoKeoVe({ don_vi: [], kiem_nhiem: [], nguoi: [] }).loi.join(" ")).toContain("không có đơn vị nào");
    const a = soDoKhop();
    a.don_vi[3].cha_id = "khong-co";
    expect(docSoDoKeoVe(a).loi.join(" ")).toContain("đơn vị cha khong-co không có");
    const b = soDoKhop();
    b.kiem_nhiem.push({ nguoi_id: "nguoi-la", don_vi_id: "bdh-hv", chuc_vu: null });
    expect(docSoDoKeoVe(b).loi.join(" ")).toContain("mã người nguoi-la không có");
    const c = soDoKhop();
    c.nguoi.push({ ...c.nguoi[2], id: "ma-khac" });
    expect(docSoDoKeoVe(c).loi.join(" ")).toContain("trùng mã hoặc trùng email");
    const d = soDoKhop();
    d.nguoi[1].don_vi_id = "don-vi-ma";
    expect(docSoDoKeoVe(d).soDo).toBeNull();
  });
});

describe("phần thuần — lập kế hoạch: đổi gì, khoá ai, báo ai chưa có tài khoản", () => {
  const banCu = () => ({ toChuc: toChucGoc(), nguoi: nguoiGonGoc() });

  it("hai bên khớp thì không có gì đổi; bảng ủy quyền ký của Main giữ nguyên", () => {
    const k = lapKeHoach(banCu(), doc(soDoKhop()));
    expect(k.coDoi).toBe(false);
    expect(k.dong).toEqual([]);
    expect(k.vaNguoi).toEqual({});
    expect(k.toChucMoi.uy_quyen_ky).toEqual(UY_QUYEN);
    expect(k.nguoiChuaCoTaiKhoan).toEqual([]);
  });

  it("thêm kiêm nhiệm + đổi đơn vị chính + đổi vai trò → dòng «đổi gì» có mã kèm tên", () => {
    const s = soDoKhop();
    s.kiem_nhiem.push({ nguoi_id: "u-tgd", don_vi_id: "bqlda-qt", chuc_vu: "Phụ trách dự án" });
    const nv = s.nguoi.find((p) => p.id === "u-nv")!;
    nv.don_vi_id = "p-ktvh";
    nv.vai = ["nhan-vien", "truong-don-vi"];
    nv.chuc_vu = "Trưởng nhóm";
    const k = lapKeHoach(banCu(), doc(s));
    expect(k.coDoi).toBe(true);
    expect(k.dong).toContain("Thêm kiêm nhiệm: tgd → bqlda-qt Ban QLDA Quảng Trị (Phụ trách dự án)");
    const dongNv = k.dong.find((d) => d.startsWith("nv.bdh:"))!;
    expect(dongNv).toContain("đơn vị chính bdh-hv Ban điều hành Hướng Việt → p-ktvh Phòng Kỹ thuật và Vận hành");
    expect(dongNv).toContain("vai trò +Trưởng đơn vị");
    expect(dongNv).toContain('chức vụ "—" → "Trưởng nhóm"');
    expect(k.vaNguoi["nv.bdh@scigroup.vn"]).toEqual({ donViId: "p-ktvh", chucVu: "Trưởng nhóm", capChucVu: null, vaiCongViec: ["nhan-vien", "truong-don-vi"] });
    expect(Object.keys(k.vaNguoi)).toEqual(["nv.bdh@scigroup.vn"]);
  });

  it("bị khoá / bị xoá bên agent Công việc → Main tự khoá; PM và Quản trị thì KHÔNG, chỉ báo", () => {
    const s = soDoKhop();
    s.nguoi.find((p) => p.id === "u-nv")!.active = false; // khoá
    s.nguoi = s.nguoi.filter((p) => p.id !== "u-nvnm"); // xoá
    s.nguoi.find((p) => p.id === "u-pm")!.active = false; // PM bị khoá bên kia
    const k = lapKeHoach(banCu(), doc(s));
    expect(k.khoa.map((x) => `${x.email}|${x.lyDo}`).sort()).toEqual(["nv.bdh@scigroup.vn|đã khoá ở agent Công việc", "nv.nm@scigroup.vn|đã xoá ở agent Công việc"]);
    expect(k.vaNguoi["nv.bdh@scigroup.vn"].active).toBe(false);
    expect(k.vaNguoi["nv.nm@scigroup.vn"].active).toBe(false);
    expect(k.khongKhoa).toHaveLength(1);
    expect(k.khongKhoa[0].email).toBe("dainc@scigroup.vn");
    expect(k.vaNguoi["dainc@scigroup.vn"]).toBeUndefined();
    expect(k.dong.some((d) => d.startsWith("Khoá tài khoản nv.nm (nv.nm@scigroup.vn)"))).toBe(true);
  });

  it("người tạo riêng ở Main (chưa từng chép từ agent Công việc) không bị khoá dù bên kia không có", () => {
    const b = banCu();
    b.nguoi.push({ id: "khach@x.vn", email: "khach@x.vn", name: "Khách", role: "viewer", active: true });
    const k = lapKeHoach(b, doc(soDoKhop()));
    expect(k.khoa).toEqual([]);
    expect(k.coDoi).toBe(false);
  });

  it("người mới bên agent Công việc → chỉ báo «chưa có tài khoản» (người đang khoá bên đó thì bỏ qua)", () => {
    const s = soDoKhop();
    s.nguoi.push({ id: "moi-1", email: "Moi@scigroup.vn", ten: "Người Mới", don_vi_id: "bdh-hv", chuc_vu: "Kỹ sư", cap_chuc_vu: 4, active: true, vai: ["nhan-vien"] });
    s.nguoi.push({ id: "moi-2", email: "nghi@scigroup.vn", ten: "Đã Nghỉ", don_vi_id: null, chuc_vu: null, cap_chuc_vu: null, active: false, vai: [] });
    const k = lapKeHoach(banCu(), doc(s));
    expect(k.nguoiChuaCoTaiKhoan).toEqual([{ id: "moi-1", email: "moi@scigroup.vn", ten: "Người Mới", donViId: "bdh-hv", donVi: "Ban điều hành Hướng Việt", chucVu: "Kỹ sư", capChucVu: 4, vai: ["nhan-vien"] }]);
    expect(k.coDoi).toBe(false); // người mới KHÔNG phải thay đổi để tự ghi
  });

  it("mở lại: chỉ tài khoản do CHÍNH bộ kéo khoá mới được tự mở", () => {
    const b = banCu();
    b.nguoi.find((u) => u.email === "nv.bdh@scigroup.vn")!.active = false;
    b.nguoi.find((u) => u.email === "nv.nm@scigroup.vn")!.active = false; // quản trị khoá tay ở Main
    const k = lapKeHoach(b, doc(soDoKhop()), ["nv.bdh@scigroup.vn"]);
    expect(k.moLai.map((m) => m.email)).toEqual(["nv.bdh@scigroup.vn"]);
    expect(k.vaNguoi["nv.bdh@scigroup.vn"].active).toBe(true);
    expect(k.vaNguoi["nv.nm@scigroup.vn"]).toBeUndefined();
  });

  it("cùng mã người mà email hai bên khác nhau → không đổi email, chỉ báo", () => {
    const s = soDoKhop();
    s.nguoi.find((p) => p.id === "u-kiem")!.email = "kiem.moi@scigroup.vn";
    const k = lapKeHoach(banCu(), doc(s));
    expect(k.emailLech).toEqual([{ ten: "kiem", emailMain: "kiem@scigroup.vn", emailCongViec: "kiem.moi@scigroup.vn" }]);
    expect(k.nguoiChuaCoTaiKhoan).toEqual([]);
    expect(k.coDoi).toBe(false);
  });
});

describe("phần thuần — chốt an toàn + nhịp", () => {
  const banCu = () => ({ toChuc: toChucGoc(), nguoi: nguoiGonGoc() });
  it("mất quá nhiều đơn vị → không tự ghi", () => {
    const s = soDoKhop();
    s.don_vi = s.don_vi.filter((d) => ["ban-tgd", "p-dtpc"].includes(d.id as string));
    s.kiem_nhiem = [];
    for (const p of s.nguoi) if (!["ban-tgd", "p-dtpc"].includes(p.don_vi_id as string)) p.don_vi_id = null;
    const b = banCu();
    const k = lapKeHoach(b, doc(s));
    expect(k.soDonViMat).toBe(4);
    const x = xetAnToan(b, k);
    expect(x.duoc).toBe(false);
    expect(!x.duoc && x.lyDo).toContain("MẤT 4 trên 6 đơn vị");
  });
  it("khoá quá nhiều người → không tự ghi; đổi ít thì cho qua", () => {
    const s = soDoKhop();
    for (const id of ["u-nv", "u-nvnm", "u-kiem", "u-gdnm"]) s.nguoi.find((p) => p.id === id)!.active = false;
    const b = banCu();
    const x = xetAnToan(b, lapKeHoach(b, doc(s)));
    expect(!x.duoc && x.lyDo).toContain("KHOÁ 4 trên 10 tài khoản");
    const s2 = soDoKhop();
    s2.nguoi.find((p) => p.id === "u-nv")!.active = false;
    s2.don_vi = s2.don_vi.filter((d) => d.id !== "nm-cannan1");
    for (const p of s2.nguoi) if (p.don_vi_id === "nm-cannan1") p.don_vi_id = "p-ktvh";
    expect(xetAnToan(b, lapKeHoach(b, doc(s2))).duoc).toBe(true);
  });
  it("nhịp 30 phút tính từ lần THỬ gần nhất", () => {
    const moc = Date.parse("2026-10-12T10:00:00Z");
    expect(denGioKeo(null, moc)).toBe(true);
    expect(denGioKeo("2026-10-12T09:31:00Z", moc)).toBe(false);
    expect(denGioKeo("2026-10-12T09:30:00Z", moc)).toBe(true);
    expect(denGioKeo("hỏng", moc)).toBe(true);
  });
});

describe("chạy thật trên thư mục dữ liệu riêng — giả lời agent Công việc", () => {
  it("hỏi đúng cửa, kèm khoá nội bộ, có lý do; hai bên khớp → không ghi gì, không đẩy agent", async () => {
    gia.hoi.mockResolvedValue(traLoi(soDoKhop()));
    const kq = await keoSoDo({ boi: "tu-dong" });
    expect(gia.hoi).toHaveBeenCalledTimes(1);
    const [agent, congCu, lyDo, tuyChon] = gia.hoi.mock.calls[0] as [string, string, string, { kemKhoaNoiBo?: boolean }];
    expect([agent, congCu]).toEqual(["base", "base.so_do_to_chuc"]);
    expect(lyDo.length).toBeGreaterThan(20);
    expect(tuyChon.kemKhoaNoiBo).toBe(true);
    expect(kq.trangThai.ketQua).toBe("khong-doi");
    expect(kq.trangThai.soDo).toEqual({ donVi: 6, kiemNhiem: 1, nguoi: 10 });
    expect(fs.readFileSync(tepUsers, "utf8")).toBe(USERS_GOC);
    expect(fs.readFileSync(tepToChuc, "utf8")).toBe(TO_CHUC_GOC);
    expect(gia.day).not.toHaveBeenCalled();
    expect(docNhatKyKeo()).toEqual([]);
  });

  it("có đổi → sao lưu, ghi sơ đồ + người, KHÔNG đụng mật khẩu / email / loại, đẩy agent, ghi nhật ký; người mới chỉ báo", async () => {
    const s = soDoKhop();
    s.kiem_nhiem.push({ nguoi_id: "u-tgd", don_vi_id: "bqlda-qt", chuc_vu: null });
    s.nguoi.find((p) => p.id === "u-nv")!.don_vi_id = "p-ktvh";
    s.nguoi.find((p) => p.id === "u-nvnm")!.active = false;
    s.nguoi.push({ id: "moi-1", email: "moi@scigroup.vn", ten: "Người Mới", don_vi_id: "bdh-hv", chuc_vu: "Kỹ sư", cap_chuc_vu: 4, active: true, vai: ["nhan-vien"] });
    gia.hoi.mockResolvedValue(traLoi(s));
    const truoc = new Map((JSON.parse(USERS_GOC) as NguoiTep[]).map((u) => [u.email, u]));

    const kq = await keoSoDo({ boi: "quantri@scigroup.vn" });
    expect(kq.trangThai.ketQua).toBe("da-ghi");
    expect(kq.trangThai.doiGiLanGhiCuoi).toHaveLength(3);
    expect(kq.trangThai.tuKhoa).toEqual(["nv.nm@scigroup.vn"]);
    expect(kq.trangThai.nguoiChuaCoTaiKhoan.map((p) => p.email)).toEqual(["moi@scigroup.vn"]);

    const tc = docToChuc();
    expect(tc.tinhTrang).toBe("ok");
    expect(tc.toChuc.kiem_nhiem).toHaveLength(2);
    expect(tc.toChuc.uy_quyen_ky).toEqual(UY_QUYEN);

    const sau = docUsers();
    expect(sau).toHaveLength(10); // người mới CHƯA được tạo
    for (const u of sau) {
      const t = truoc.get(u.email)!;
      expect([u.passwordHash, u.salt, u.role, u.name, u.id]).toEqual([t.passwordHash, t.salt, t.role, t.name, t.id]);
    }
    expect(nguoiTep("nv.bdh@scigroup.vn").donViId).toBe("p-ktvh");
    expect(nguoiTep("nv.nm@scigroup.vn").active).toBe(false);
    expect(verifyUser("nv.bdh@scigroup.vn", "Thu@2026")).not.toBeNull();

    expect(gia.day).toHaveBeenCalledTimes(1);
    const nk = docNhatKyKeo();
    expect(nk).toHaveLength(1);
    expect(nk[0].boi).toBe("quantri@scigroup.vn");
    expect(nk[0].vanGhi).toBe(false);
    const saoLuu = fs.readdirSync(path.join(THU_MUC_SO_DO_TEST, "so-do-keo")).filter((f) => f.startsWith("truoc-"));
    expect(saoLuu).toHaveLength(1);
    const banTruoc = fs.readFileSync(path.join(THU_MUC_SO_DO_TEST, "so-do-keo", saoLuu[0]), "utf8");
    expect(banTruoc).not.toContain("scrypt:");
    expect(banTruoc).not.toContain("passwordHash");
    expect(JSON.parse(banTruoc).toChucTho).toBe(TO_CHUC_GOC);

    // Lượt sau: agent Công việc mở lại người đó → Main tự mở (vì chính bộ kéo đã khoá)
    s.nguoi.find((p) => p.id === "u-nvnm")!.active = true;
    gia.hoi.mockResolvedValue(traLoi(s));
    const kq2 = await keoSoDo({ boi: "tu-dong" });
    expect(kq2.trangThai.ketQua).toBe("da-ghi");
    expect(nguoiTep("nv.nm@scigroup.vn").active).toBe(true);
    expect(kq2.trangThai.tuKhoa).toEqual([]);
  });

  it("một nút tạo tài khoản: giữ mã người bên agent Công việc, mật khẩu lần đầu = email, có đơn vị + vai trò", async () => {
    const s = soDoKhop();
    s.nguoi.push({ id: "moi-1", email: "moi@scigroup.vn", ten: "Người Mới", don_vi_id: "bdh-hv", chuc_vu: "Kỹ sư", cap_chuc_vu: 4, active: true, vai: ["nhan-vien"] });
    gia.hoi.mockResolvedValue(traLoi(s));
    await keoSoDo({ boi: "tu-dong" });
    expect(docUsers()).toHaveLength(10);

    const kq = await taoTaiKhoanChuaCo("quantri@scigroup.vn");
    expect(kq.tao).toEqual(["moi@scigroup.vn"]);
    expect(kq.boQua).toEqual([]);
    const moi = nguoiTep("moi@scigroup.vn");
    expect([moi.id, moi.name, moi.role, moi.active, moi.donViId, moi.chucVu, moi.vaiCongViec]).toEqual(["moi-1", "Người Mới", "engineer", true, "bdh-hv", "Kỹ sư", ["nhan-vien"]]);
    expect(verifyUser("moi@scigroup.vn", "moi@scigroup.vn")).not.toBeNull();
    expect(docTrangThaiKeo().nguoiChuaCoTaiKhoan).toEqual([]);
    expect(gia.day).toHaveBeenCalledTimes(1);
    expect(docNhatKyKeo()[0].dong[0]).toContain("Tạo tài khoản Người Mới (moi@scigroup.vn)");
    // bấm lần nữa: không còn ai để tạo
    expect((await taoTaiKhoanChuaCo("quantri@scigroup.vn")).tao).toEqual([]);
  });

  it("agent Công việc không thưa / chưa có cửa → báo lỗi tiếng Việt, sơ đồ Main giữ nguyên", async () => {
    gia.hoi.mockResolvedValue({ ok: false, ma_loi: "AGENT_KHONG_SAN_SANG", thong_diep: "Không nối được tới Agent Công việc." });
    const kq = await keoSoDo({ boi: "tu-dong" });
    expect(kq.trangThai.ketQua).toBe("loi");
    expect(kq.trangThai.thongDiep).toContain("Sơ đồ ở Main giữ nguyên");
    gia.hoi.mockResolvedValue({ ok: false, ma_loi: "KHONG_HIEU_YEU_CAU", thong_diep: 'agent Công việc (mã base) không có công cụ "base.so_do_to_chuc".' });
    expect((await keoSoDo({ boi: "tu-dong" })).trangThai.thongDiep).toContain("chưa có cửa sơ đồ tổ chức");
    expect(fs.readFileSync(tepUsers, "utf8")).toBe(USERS_GOC);
    expect(fs.readFileSync(tepToChuc, "utf8")).toBe(TO_CHUC_GOC);
    expect(docTrangThaiKeo().lanThuCuoi).not.toBeNull(); // lần hỏng cũng tính nhịp — không gọi dồn
  });

  it("sơ đồ sai khuôn → không ghi, không có nút «Vẫn ghi»", async () => {
    const s = soDoKhop();
    s.don_vi[3].cha_id = "khong-co";
    gia.hoi.mockResolvedValue(traLoi(s));
    const kq = await keoSoDo({ boi: "quantri@scigroup.vn", vanGhi: true });
    expect(kq.trangThai.ketQua).toBe("bi-chan");
    expect(kq.trangThai.biChan).toBeNull();
    expect(kq.trangThai.thongDiep).toContain("sai khuôn");
    expect(fs.readFileSync(tepToChuc, "utf8")).toBe(TO_CHUC_GOC);
  });

  it("mất quá nhiều đơn vị → báo đỏ, KHÔNG ghi; quản trị bấm «Vẫn ghi theo sơ đồ mới» thì ghi, nhật ký ghi rõ", async () => {
    const s = soDoKhop();
    s.don_vi = s.don_vi.filter((d) => ["ban-tgd", "p-dtpc"].includes(d.id as string));
    s.kiem_nhiem = [];
    for (const p of s.nguoi) if (!["ban-tgd", "p-dtpc"].includes(p.don_vi_id as string)) p.don_vi_id = null;
    gia.hoi.mockResolvedValue(traLoi(s));
    const kq = await keoSoDo({ boi: "tu-dong" });
    expect(kq.trangThai.ketQua).toBe("bi-chan");
    expect(kq.trangThai.biChan!.lyDo).toContain("MẤT 4 trên 6 đơn vị");
    expect(kq.trangThai.biChan!.dong.length).toBeGreaterThan(4);
    expect(fs.readFileSync(tepUsers, "utf8")).toBe(USERS_GOC);
    expect(fs.readFileSync(tepToChuc, "utf8")).toBe(TO_CHUC_GOC);
    expect(gia.day).not.toHaveBeenCalled();

    const kq2 = await keoSoDo({ boi: "quantri@scigroup.vn", vanGhi: true });
    expect(kq2.trangThai.ketQua).toBe("da-ghi");
    expect(kq2.trangThai.biChan).toBeNull();
    expect(docToChuc().toChuc.don_vi).toHaveLength(2);
    expect(docNhatKyKeo()[0].vanGhi).toBe(true);
  });

  it("tệp sơ đồ của Main chưa có → lượt kéo dựng lại", async () => {
    fs.rmSync(tepToChuc, { force: true });
    gia.hoi.mockResolvedValue(traLoi(soDoKhop()));
    const kq = await keoSoDo({ boi: "tu-dong" });
    expect(kq.trangThai.ketQua).toBe("da-ghi");
    expect(kq.trangThai.doiGiLanGhiCuoi[0]).toContain("chưa có — dựng lại");
    expect(docToChuc().toChuc.don_vi).toHaveLength(6);
  });
});
