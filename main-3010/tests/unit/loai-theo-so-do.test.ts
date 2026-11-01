// Loại tài khoản theo sơ đồ tổ chức + theo dự án (LOI-DUNG-CHUNG 6g.6.13 — Mr. Đại chốt 03/10/2026 tối).
import { THU_MUC_SO_DO_TEST, TO_CHUC_THU } from "../ho-tro/so-do-du-lieu-rieng";
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { chiThuocNhaMay, dungBang, laTruong, loaiOMain, loaiTheoDuAn, thuocDuAn, thuocDuAnKeCapTren, type NguoiSoDo } from "@/lib/loai-theo-so-do";
import { boLocMatCuaNguoi, boLocMatTheoMaNguoi } from "@/lib/agent-mat-tren-main";
import { getUserByEmail, listUsers } from "@/lib/users";
import { canAccessProjectByEmail } from "@/lib/projects";
import { banDungChung } from "@/lib/he-thong-dung-chung";

const b = dungBang(TO_CHUC_THU);
const N = (id: string, donViId: string, vai: string[] = []): NguoiSoDo => ({ id, email: `${id}@x`, role: "engineer", donViId, vaiCongViec: vai });
const HV = { id: "huong-viet", donVi: ["bqlda-qt"], banDieuHanh: "bdh-hv" };
const IAD1 = { id: "ia-dreng-1", donVi: ["p-dtpc"] };

describe("hàm thuần", () => {
  // ⭐ Mr. Đại chốt 12/10/2026 (KE-HOACH/13 câu 3): BỎ luật «cấp trên» — chỉ người của CHÍNH đơn vị gắn (chính hoặc kiêm nhiệm)
  it("thuộc dự án = đơn vị của người LÀ đơn vị gắn; KHÔNG tính cấp trên, KHÔNG tính cấp dưới; kiêm nhiệm cũng tính", () => {
    expect(thuocDuAn(N("a", "bdh-hv"), HV, b)).toBe(true); // Ban điều hành
    expect(thuocDuAn(N("a", "bqlda-qt"), HV, b)).toBe(true); // Ban QLDA đứng đầu
    expect(thuocDuAn(N("a", "p-dtpc"), HV, b)).toBe(false); // cấp trên của BQLDA QT — trước 12/10 là true
    expect(thuocDuAn(N("a", "ban-tgd"), HV, b)).toBe(false); // cấp trên nữa — trước 12/10 là true
    expect(thuocDuAn(N("a", "p-dtpc"), IAD1, b)).toBe(true); // P.ĐT&PC là chính đơn vị gắn của IAD1
    expect(thuocDuAn(N("a", "bqlda-qt"), IAD1, b)).toBe(false); // cấp dưới của P.ĐT&PC — không tính (chốt IAD1)
    expect(thuocDuAn(N("a", "bdh-hv"), IAD1, b)).toBe(false);
    expect(thuocDuAn(N("u-kiem", "p-ktvh"), HV, b)).toBe(true); // kiêm nhiệm BĐH HV
    expect(thuocDuAn(N("a", "p-ktvh"), HV, b)).toBe(false);
  });

  it("phép cũ «kể cả cấp trên» còn nguyên — chỉ Main dùng cho việc của riêng nó (Main giữ như đang chạy)", () => {
    expect(thuocDuAnKeCapTren(N("a", "p-dtpc"), HV, b)).toBe(true);
    expect(thuocDuAnKeCapTren(N("a", "ban-tgd"), HV, b)).toBe(true);
    expect(thuocDuAnKeCapTren(N("a", "bqlda-qt"), IAD1, b)).toBe(false);
  });

  it("trưởng: vai trưởng ở đơn vị chưa có trưởng chính khác, hoặc là trưởng chính — trừ nhà máy", () => {
    expect(laTruong(N("u-tp", "p-dtpc", ["truong-don-vi"]), b)).toBe(true);
    expect(laTruong(N("u-truong1", "bqlda-qt", ["truong-don-vi"]), b)).toBe(false); // BQLDA QT đã có trưởng chính khác
    expect(laTruong(N("u-truong2", "bqlda-qt", ["nhan-vien"]), b)).toBe(true); // trưởng chính, không cần vai
    expect(laTruong(N("u-gdnm", "nm-cannan1", ["truong-don-vi"]), b)).toBe(false); // GĐ nhà máy không tính
  });

  it("Main: PM/Admin giữ · lãnh đạo + trưởng = Người dùng · còn lại Người xem", () => {
    expect(loaiOMain({ ...N("p", "ban-tgd"), role: "pm" }, b)).toBe("pm");
    expect(loaiOMain({ ...N("q", "ban-tgd"), role: "admin" }, b)).toBe("admin");
    expect(loaiOMain(N("u-tgd", "ban-tgd", ["lanh-dao"]), b)).toBe("engineer");
    expect(loaiOMain(N("u-tp", "p-dtpc", ["truong-don-vi"]), b)).toBe("engineer");
    expect(loaiOMain(N("u-nv", "bdh-hv", ["nhan-vien"]), b)).toBe("viewer");
    expect(loaiOMain(N("u-gdnm", "nm-cannan1", ["truong-don-vi"]), b)).toBe("viewer");
  });

  // ⭐ Mr. Đại chốt 12/10/2026 (KE-HOACH/13 câu 1, 2, 4): lãnh đạo không gắn dự án = Người xem; gắn bằng kiêm nhiệm; nhà máy = Người xem
  it("theo dự án: thuộc = Người dùng · MỌI người còn lại = Người xem (kể cả lãnh đạo chưa gắn dự án, người nhà máy)", () => {
    expect(loaiTheoDuAn(N("u-tgd", "ban-tgd", ["lanh-dao"]), HV, b)).toBe("viewer"); // trước 12/10: Người dùng mọi dự án
    expect(loaiTheoDuAn(N("u-tgd", "p-ktvh", ["lanh-dao"]), IAD1, b)).toBe("viewer");
    expect(loaiTheoDuAn(N("u-kiem", "ban-tgd", ["lanh-dao"]), HV, b)).toBe("engineer"); // lãnh đạo ĐƯỢC GẮN bằng kiêm nhiệm vào BĐH HV
    expect(loaiTheoDuAn(N("u-kiem", "ban-tgd", ["lanh-dao"]), IAD1, b)).toBe("viewer");
    expect(loaiTheoDuAn(N("u-nv", "bdh-hv"), HV, b)).toBe("engineer");
    expect(loaiTheoDuAn(N("u-nv", "bdh-hv"), IAD1, b)).toBe("viewer");
    expect(chiThuocNhaMay(N("u-nvnm", "nm-cannan1"), b)).toBe(true);
    expect(loaiTheoDuAn(N("u-nvnm", "nm-cannan1"), HV, b)).toBe("viewer"); // trước 12/10: null «không thấy dự án»
    expect(chiThuocNhaMay(N("u-kiem", "p-ktvh"), b)).toBe(false);
    // dự án chưa gắn đơn vị → chưa ai là người dự án
    expect(loaiTheoDuAn(N("u-nv", "bdh-hv"), { id: "moi" }, b)).toBe("viewer");
    expect(loaiTheoDuAn(N("u-tgd", "ban-tgd", ["lanh-dao"]), { id: "moi" }, b)).toBe("viewer");
  });
});

describe("nối vào Main", () => {
  it("chưa có tổ chức → giữ loại + danh sách dự án đã khai; có tổ chức → loại theo sơ đồ, nhà máy chỉ thấy dự án mình thuộc, giao kèm loại từng dự án", () => {
    expect(getUserByEmail("nv.bdh@scigroup.vn")?.role).toBe("engineer");
    expect(getUserByEmail("tp.dtpc@scigroup.vn")?.role).toBe("viewer");
    expect(canAccessProjectByEmail("nv.nm@scigroup.vn", "engineer", "huong-viet")).toBe(true);
    expect(banDungChung().nguoiDung.find((u) => u.email === "nv.bdh@scigroup.vn")).not.toHaveProperty("loaiTheoDuAn");

    fs.writeFileSync(path.join(THU_MUC_SO_DO_TEST, "to-chuc.json"), JSON.stringify(TO_CHUC_THU));
    expect(getUserByEmail("nv.bdh@scigroup.vn")).toMatchObject({ role: "viewer", theoSoDo: true });
    expect(getUserByEmail("tp.dtpc@scigroup.vn")?.role).toBe("engineer");
    expect(getUserByEmail("dainc@scigroup.vn")).toMatchObject({ role: "pm" });
    expect(getUserByEmail("dainc@scigroup.vn")).not.toHaveProperty("theoSoDo");
    expect(
      listUsers()
        .filter((u) => u.role === "engineer")
        .map((u) => u.email)
        .sort(),
    ).toEqual(["tgd@scigroup.vn", "tp.dtpc@scigroup.vn", "truong.qt@scigroup.vn"]);

    expect(canAccessProjectByEmail("nv.nm@scigroup.vn", "viewer", "huong-viet")).toBe(false);
    expect(canAccessProjectByEmail("nv.bdh@scigroup.vn", "viewer", "ia-dreng-1")).toBe(true); // mọi người thấy hết trừ nhà máy

    const giao = banDungChung().nguoiDung;
    expect(giao.find((u) => u.email === "nv.bdh@scigroup.vn")).toMatchObject({ role: "viewer", loaiTheoDuAn: { HV: "engineer", IAD1: "viewer" } });
    expect(giao.find((u) => u.email === "nv.nm@scigroup.vn")?.loaiTheoDuAn).toEqual({ HV: "viewer", IAD1: "viewer" }); // 12/10: nhà máy = Người xem (trước là null); khoá = mã ngắn
    // 12/10: lãnh đạo chưa gắn dự án = Người xem ở các agent theo dự án; ở Main vẫn là Người dùng (Main giữ như đang chạy)
    expect(giao.find((u) => u.email === "tgd@scigroup.vn")).toMatchObject({ role: "engineer", loaiTheoDuAn: { HV: "viewer", IAD1: "viewer" } });
    // 12/10: bỏ «cấp trên» — trưởng P.ĐT&PC chỉ còn là người của IAD1 (đơn vị gắn), không còn là người của HV
    expect(giao.find((u) => u.email === "tp.dtpc@scigroup.vn")?.loaiTheoDuAn).toEqual({ HV: "viewer", IAD1: "engineer" });

    // ⭐ 12/10/2026 — Main ẩn phần Pháp lý với người ngoài dự án, giống đang ẩn phần Hợp đồng (bộ lọc của từng người)
    const nv = boLocMatCuaNguoi("nv.bdh@scigroup.vn"); // người của HV
    expect([nv.thay("phaply", "huong-viet"), nv.thay("phaply", "HV"), nv.thay("phaply", "ia-dreng-1")]).toEqual([true, true, false]);
    expect([nv.thay("hopdong", "huong-viet"), nv.thay("hopdong", "ia-dreng-1"), nv.thay("tiendo", "ia-dreng-1")]).toEqual([true, false, true]);
    const tgd = boLocMatCuaNguoi("tgd@scigroup.vn"); // lãnh đạo chưa gắn dự án nào
    expect([tgd.thay("phaply", "huong-viet"), tgd.thay("hopdong", "huong-viet"), tgd.thay("hopdong", null)]).toEqual([false, false, false]);
    expect(tgd.thay("phaply", null)).toBe(true); // luật, mẫu biểu chung — ai cũng thấy
    const nm = boLocMatCuaNguoi("nv.nm@scigroup.vn"); // nhà máy
    expect([nm.thay("phaply", "huong-viet"), nm.thay("hopdong", "huong-viet")]).toEqual([false, false]);
    const pm = boLocMatCuaNguoi("dainc@scigroup.vn"); // PM: Pháp lý thấy mọi dự án; Hợp đồng chỉ dự án mình làm Giám đốc dự án
    expect([pm.thay("phaply", "huong-viet"), pm.thay("phaply", "ia-dreng-1")]).toEqual([true, true]);
    expect(pm.thay("hopdong", "huong-viet")).toBe(false); // dự án thử chưa khai Giám đốc dự án
    expect(boLocMatCuaNguoi("quantri@scigroup.vn").thayHet).toBe(true);
    expect(boLocMatCuaNguoi("khong-co@scigroup.vn").thay("phaply", "huong-viet")).toBe(false);
    // ⭐ 18/10/2026 (Q3): thẻ issue agent Công việc ẩn theo dự án của thẻ — PM thấy mọi dự án; người khác chỉ dự án mình thuộc;
    // thẻ không gắn dự án chỉ PM · Admin
    expect([nv.thay("base", "HV"), nv.thay("base", "huong-viet"), nv.thay("base", "ia-dreng-1"), nv.thay("base", null)]).toEqual([true, true, false, false]);
    expect([tgd.thay("base", "huong-viet"), tgd.thay("base", null), nm.thay("base", "huong-viet")]).toEqual([false, false, false]);
    expect([pm.thay("base", "huong-viet"), pm.thay("base", "ia-dreng-1"), pm.thay("base", null)]).toEqual([true, true, true]);
    expect(boLocMatCuaNguoi("khong-co@scigroup.vn").thay("base", "huong-viet")).toBe(false);
    expect([nv.thay("tiendo", "ia-dreng-1"), tgd.thay("tiendo", null)]).toEqual([true, true]); // agent khác không đổi
    // Trợ lý chat gửi ma_nguoi_dung = phần trước @
    expect([boLocMatTheoMaNguoi("nv.bdh").thay("base", "HV"), boLocMatTheoMaNguoi("nv.bdh").thay("base", "ia-dreng-1")]).toEqual([true, false]);
    expect(boLocMatTheoMaNguoi("nv.bdh@scigroup.vn").thay("base", "HV")).toBe(true);
    expect([boLocMatTheoMaNguoi("").thay("base", "HV"), boLocMatTheoMaNguoi("khong-co").thay("base", "HV")]).toEqual([false, false]);
    expect(giao.find((u) => u.email === "quantri@scigroup.vn")).not.toHaveProperty("loaiTheoDuAn");
    // users.json không bị ghi đè bằng loại hiệu lực
    const tho = JSON.parse(fs.readFileSync(path.join(THU_MUC_SO_DO_TEST, "users.json"), "utf8")) as { email: string; role: string }[];
    expect(tho.find((u) => u.email === "tp.dtpc@scigroup.vn")?.role).toBe("viewer");
  });
});
